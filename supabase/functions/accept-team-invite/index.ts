import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let authUserId: string | null = null;
  let isClaimPath = false;

  try {
    const body = await req.json();
    const { token, password, full_name } = body;

    if (!token) {
      return json({ error: "token is required" }, 400, headers);
    }

    // ── 1. Validate invite ──────────────────────────────────
    const { data: invite, error: invErr } = await supabase
      .from("user_invitations")
      .select("id, organization_id, email, full_name, phone, role, status, location_ids, expires_at")
      .eq("token", token)
      .single();

    if (invErr || !invite) return json({ error: "Invalid invite link" }, 404, headers);
    if (invite.status === "accepted") {
      return json({ error: "This invite has already been used" }, 409, headers);
    }
    if (invite.status !== "pending") {
      return json({ error: `This invite is ${invite.status}` }, 410, headers);
    }
    if (new Date(invite.expires_at) < new Date()) {
      await supabase.from("user_invitations").update({ status: "expired" }).eq("id", invite.id);
      return json({ error: "This invite has expired" }, 410, headers);
    }

    // ── VALIDATE-ONLY mode: return invite details for the UI ──
    if (!password) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", invite.organization_id)
        .maybeSingle();

      return json({
        valid: true,
        email: invite.email,
        full_name: invite.full_name,
        role: invite.role,
        organization_name: org?.name || null,
      }, 200, headers);
    }

    // ── ACCEPT mode ─────────────────────────────────────────
    if (String(password).length < 12) {
      return json({ error: "Password must be at least 12 characters" }, 400, headers);
    }

    const displayName = full_name || invite.full_name || invite.email.split("@")[0];

    // ── 2. Check for pre-provisioned (invited) user ─────────
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id, status, organization_id")
      .eq("email", invite.email)
      .maybeSingle();

    if (existingProfile) {
      if (
        existingProfile.status === "invited" &&
        existingProfile.organization_id === invite.organization_id
      ) {
        // ── CLAIM PATH: activate the pre-provisioned user ───
        isClaimPath = true;
        authUserId = existingProfile.id;

        const { error: updateErr } = await supabase.auth.admin.updateUserById(
          authUserId,
          { password, email_confirm: true, user_metadata: { full_name: displayName } },
        );
        if (updateErr) {
          logger.error("[accept-team-invite] updateUser failed", updateErr);
          return json({ error: "Could not set password" }, 500, headers);
        }

        // Activate profile with explicit status='active' (P4)
        const { error: profErr } = await supabase
          .from("user_profiles")
          .update({
            status: "active",
            full_name: displayName,
            phone: invite.phone || null,
            role: invite.role.toLowerCase(),
          })
          .eq("id", authUserId);
        if (profErr) throw new Error("profile update failed: " + profErr.message);

        // Ensure per-location access rows exist (P1 — scoped to invited locations)
        await ensureLocationAccess(supabase, authUserId, invite);

      } else {
        // Active / suspended / locked user, or different org
        return json(
          { error: "An account already exists for this email — please sign in." },
          409,
          headers,
        );
      }
    } else {
      // ── FRESH PATH: no existing profile — create from scratch ──
      const { data: created, error: userErr } = await supabase.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });

      if (userErr) {
        const is422 =
          userErr.status === 422 ||
          String(userErr.message ?? "").includes("already been registered") ||
          String(userErr.message ?? "").includes("already registered");

        if (is422) {
          // ── ADOPT PATH: auth user exists but no profile (orphan / cross-system) ──
          const { data: existingUid, error: lookupErr } = await supabase.rpc(
            "auth_uid_by_email",
            { p_email: invite.email },
          );
          if (lookupErr || !existingUid) {
            logger.error("[accept-team-invite] adopt lookup failed", lookupErr);
            return json({ error: "Could not create account" }, 500, headers);
          }
          authUserId = existingUid;

          // Set password + confirm on the existing auth user
          const { error: adoptErr } = await supabase.auth.admin.updateUserById(
            authUserId,
            { password, email_confirm: true, user_metadata: { full_name: displayName } },
          );
          if (adoptErr) {
            logger.error("[accept-team-invite] adopt updateUser failed", adoptErr);
            return json({ error: "Could not set password" }, 500, headers);
          }
        } else {
          logger.error("[accept-team-invite] createUser failed", userErr);
          return json({ error: "Could not create account" }, 500, headers);
        }
      } else if (created?.user) {
        authUserId = created.user.id;
      } else {
        return json({ error: "Could not create account" }, 500, headers);
      }

      // Profile with explicit status='active' (P4)
      const { error: profErr } = await supabase
        .from("user_profiles")
        .upsert({
          id: authUserId,
          full_name: displayName,
          email: invite.email,
          phone: invite.phone || null,
          organization_id: invite.organization_id,
          role: invite.role.toLowerCase(),
          status: "active",
        }, { onConflict: "id" });
      if (profErr) throw new Error("profile insert failed: " + profErr.message);

      // Per-location access grants (P1 — scoped to invited locations)
      await ensureLocationAccess(supabase, authUserId, invite);
    }

    // ── 3. Mark accepted ────────────────────────────────────
    const { error: markErr } = await supabase.from("user_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    if (markErr) {
      logger.error("[accept-team-invite] status update failed", markErr);
    }

    // ── 4. Backfill onboarding_team_invited ─────────────────
    try {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("onboarding_team_invited")
        .eq("id", invite.organization_id)
        .maybeSingle();

      if (orgData?.onboarding_team_invited) {
        const entries = orgData.onboarding_team_invited as Array<Record<string, unknown>>;
        let changed = false;
        const updated = entries.map((entry) => {
          if (
            entry.choice === "invite" &&
            entry.invite_role === invite.role.toLowerCase() &&
            !entry.assigned_to_user_id
          ) {
            changed = true;
            return {
              ...entry,
              assigned_to_user_id: authUserId,
              assigned_to_name: displayName,
            };
          }
          return entry;
        });

        if (changed) {
          await supabase
            .from("organizations")
            .update({ onboarding_team_invited: updated })
            .eq("id", invite.organization_id);
        }
      }
    } catch (backfillErr) {
      logger.error("[accept-team-invite] onboarding backfill error", backfillErr);
    }

    return json({
      success: true,
      organization_id: invite.organization_id,
      email: invite.email,
    }, 200, headers);

  } catch (err) {
    logger.error("[accept-team-invite] chain failed — rolling back", err);
    if (authUserId) {
      if (isClaimPath) {
        // Revert provisioned user back to invited — don't delete
        await supabase.from("user_profiles")
          .update({ status: "invited" })
          .eq("id", authUserId)
          .catch(() => {});
      } else {
        // Fresh path — full rollback
        await supabase.from("user_location_access").delete().eq("user_id", authUserId).catch(() => {});
        await supabase.from("user_profiles").delete().eq("id", authUserId).catch(() => {});
        await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
      }
    }
    return json({ error: "Could not complete signup — please try again." }, 500, headers);
  }
});

// ── Helper: insert per-location access rows ─────────────────
// P1: use invitation.location_ids when non-empty; fallback to all org
// locations; last resort: org-wide row (no location_id).
async function ensureLocationAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  invite: { organization_id: string; role: string; location_ids: string[] | null },
) {
  const role = invite.role.toLowerCase();

  if (invite.location_ids && invite.location_ids.length > 0) {
    // Scoped: exactly the invited locations
    for (const locId of invite.location_ids) {
      await supabase
        .from("user_location_access")
        .upsert(
          { user_id: userId, organization_id: invite.organization_id, location_id: locId, role },
          { onConflict: "user_id,organization_id,location_id" },
        );
    }
  } else {
    // No specific locations — grant all org locations
    const { data: orgLocs } = await supabase
      .from("locations")
      .select("id")
      .eq("organization_id", invite.organization_id);

    if (orgLocs && orgLocs.length > 0) {
      for (const loc of orgLocs) {
        await supabase
          .from("user_location_access")
          .upsert(
            { user_id: userId, organization_id: invite.organization_id, location_id: loc.id, role },
            { onConflict: "user_id,organization_id,location_id" },
          );
      }
    } else {
      // Org-wide fallback (no locations exist yet)
      await supabase
        .from("user_location_access")
        .upsert(
          { user_id: userId, organization_id: invite.organization_id, role },
          { onConflict: "user_id,organization_id,location_id" },
        );
    }
  }
}
