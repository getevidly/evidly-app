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
  let isClaimPath = false; // true when activating a pre-provisioned user

  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return json({ error: "token and password are required" }, 400, headers);
    }
    if (String(password).length < 12) {
      return json({ error: "Password must be at least 12 characters" }, 400, headers);
    }

    // ── 1. Validate invite ──────────────────────────────────
    const { data: invite, error: invErr } = await supabase
      .from("evidly_client_invites")
      .select("id, organization_id, contact_name, email, phone, client_role, status, expires_at")
      .eq("token", token)
      .single();

    if (invErr || !invite) return json({ error: "Invalid invite link" }, 404, headers);
    if (!invite.organization_id) {
      return json({ error: "This invite is not linked to an organization" }, 400, headers);
    }
    if (invite.status === "accepted") {
      return json({ error: "This invite has already been used" }, 409, headers);
    }
    if (invite.status !== "pending") {
      return json({ error: `This invite is ${invite.status}` }, 410, headers);
    }
    if (new Date(invite.expires_at) < new Date()) {
      await supabase.from("evidly_client_invites").update({ status: "expired" }).eq("id", invite.id);
      return json({ error: "This invite has expired" }, 410, headers);
    }

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

        // Set password on existing auth user
        const { error: updateErr } = await supabase.auth.admin.updateUserById(
          authUserId,
          { password, email_confirm: true },
        );
        if (updateErr) {
          logger.error("[accept-client-invite] updateUser failed", updateErr);
          return json({ error: "Could not set password" }, 500, headers);
        }

        // Activate profile
        const { error: profErr } = await supabase
          .from("user_profiles")
          .update({
            status: "active",
            full_name: invite.contact_name,
            phone: invite.phone || null,
            role: invite.client_role || "owner_operator",
          })
          .eq("id", authUserId);
        if (profErr) throw new Error("profile update failed: " + profErr.message);

        // Ensure per-location access rows exist (idempotent)
        const { data: orgLocs } = await supabase
          .from("locations")
          .select("id")
          .eq("organization_id", invite.organization_id);

        if (orgLocs && orgLocs.length > 0) {
          for (const loc of orgLocs) {
            await supabase
              .from("user_location_access")
              .upsert(
                {
                  user_id: authUserId,
                  organization_id: invite.organization_id,
                  location_id: loc.id,
                  role: invite.client_role || "owner_operator",
                },
                { onConflict: "user_id,organization_id,location_id" },
              );
          }
        }
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
        user_metadata: { full_name: invite.contact_name },
      });

      if (userErr) {
        const is422 =
          userErr.status === 422 ||
          String(userErr.message ?? "").includes("already been registered") ||
          String(userErr.message ?? "").includes("already registered");

        if (is422) {
          // ── ADOPT PATH: auth user exists but no claimable profile ──
          const { data: existingUid, error: lookupErr } = await supabase.rpc(
            "auth_uid_by_email",
            { p_email: invite.email },
          );
          if (lookupErr || !existingUid) {
            logger.error("[accept-client-invite] adopt lookup failed", lookupErr);
            return json({ error: "Could not create account" }, 500, headers);
          }
          authUserId = existingUid;

          const { error: adoptErr } = await supabase.auth.admin.updateUserById(
            authUserId,
            { password, email_confirm: true, user_metadata: { full_name: invite.contact_name } },
          );
          if (adoptErr) {
            logger.error("[accept-client-invite] adopt updateUser failed", adoptErr);
            return json({ error: "Could not set password" }, 500, headers);
          }
        } else {
          logger.error("[accept-client-invite] createUser failed", userErr);
          return json({ error: "Could not create account" }, 500, headers);
        }
      } else if (created?.user) {
        authUserId = created.user.id;
      } else {
        return json({ error: "Could not create account" }, 500, headers);
      }

      // Profile with status='active' — upsert handles adopt path
      const { error: profErr } = await supabase
        .from("user_profiles")
        .upsert({
          id: authUserId,
          full_name: invite.contact_name,
          email: invite.email,
          phone: invite.phone || null,
          organization_id: invite.organization_id,
          role: invite.client_role || "owner_operator",
          status: "active",
        }, { onConflict: "id" });
      if (profErr) throw new Error("profile upsert failed: " + profErr.message);

      // Per-location access grants — upsert handles adopt path
      const { data: orgLocs } = await supabase
        .from("locations")
        .select("id")
        .eq("organization_id", invite.organization_id);

      if (orgLocs && orgLocs.length > 0) {
        for (const loc of orgLocs) {
          await supabase
            .from("user_location_access")
            .upsert(
              {
                user_id: authUserId!,
                organization_id: invite.organization_id,
                location_id: loc.id,
                role: invite.client_role || "owner_operator",
              },
              { onConflict: "user_id,organization_id,location_id" },
            );
        }
      } else {
        // Fallback: org-wide access (no location_id)
        await supabase
          .from("user_location_access")
          .upsert(
            {
              user_id: authUserId!,
              organization_id: invite.organization_id,
              role: invite.client_role || "owner_operator",
            },
            { onConflict: "user_id,organization_id,location_id" },
          );
      }
    }

    // ── 5. Mark accepted ────────────────────────────────────
    const { error: markErr } = await supabase.from("evidly_client_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    if (markErr) {
      logger.error("[accept-client-invite] status update failed", markErr);
    }

    // ── 6. Write-back contact to org (if empty) ───────────
    await supabase.from("organizations")
      .update({
        primary_contact_name: invite.contact_name,
        primary_contact_email: invite.email,
      })
      .eq("id", invite.organization_id)
      .is("primary_contact_name", null);

    return json({
      success: true,
      organization_id: invite.organization_id,
      email: invite.email,
    }, 200, headers);

  } catch (err) {
    logger.error("[accept-client-invite] chain failed — rolling back", err);
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
