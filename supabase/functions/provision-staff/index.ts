import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

interface ProvisionRequest {
  email: string;
  full_name?: string;
  role: string;
  perms: Record<string, boolean>;
  mode: "provision" | "invite";
}

function json(
  data: unknown,
  status: number,
  headers: Record<string, string>,
) {
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

  try {
    // ── Verify caller JWT ──────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401, headers);
    }
    const token = authHeader.slice(7);
    const {
      data: { user: caller },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !caller) {
      return json({ error: "Unauthorized" }, 401, headers);
    }

    // ── Load caller profile & check permissions ───────────
    const { data: callerProfile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("id, evidly_staff_role, perm_staff_manage")
      .eq("id", caller.id)
      .single();

    if (profileErr || !callerProfile) {
      return json({ error: "Caller profile not found" }, 403, headers);
    }

    const hasRole =
      callerProfile.evidly_staff_role === "super_admin" ||
      callerProfile.evidly_staff_role === "admin";
    const hasPerm = callerProfile.perm_staff_manage === true;

    if (!hasRole && !hasPerm) {
      return json(
        { error: "Forbidden — staff management access required" },
        403,
        headers,
      );
    }

    // ── Parse input ───────────────────────────────────────
    const body: ProvisionRequest = await req.json();
    const { email, full_name, role, perms, mode } = body;

    if (!email || !role || !mode) {
      return json(
        { error: "Missing required fields: email, role, mode" },
        400,
        headers,
      );
    }
    if (mode !== "provision" && mode !== "invite") {
      return json(
        { error: "mode must be 'provision' or 'invite'" },
        400,
        headers,
      );
    }

    let userId: string | null = null;
    let actionLink: string | null = null;

    // ── MODE: provision ───────────────────────────────────
    if (mode === "provision") {
      const { data: createResult, error: createErr } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: full_name || email.split("@")[0],
          },
        });

      if (createErr) {
        if (
          createErr.status === 422 ||
          createErr.message?.includes("already")
        ) {
          // User already exists — look up their id
          const { data: existing } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          userId = existing?.id || null;
        } else {
          logger.error("[provision-staff] createUser failed", createErr);
          return json(
            { error: createErr.message || "Failed to create user" },
            500,
            headers,
          );
        }
      } else {
        userId = createResult.user.id;
      }

      // Generate recovery link so admin can share it
      const { data: linkData, error: linkErr } =
        await supabase.auth.admin.generateLink({
          type: "recovery",
          email,
        });

      if (linkErr) {
        logger.warn(
          "[provision-staff] generateLink(recovery) failed",
          linkErr,
        );
      } else {
        actionLink = linkData?.properties?.action_link || null;
        if (!userId) userId = linkData?.user?.id || null;
      }
    }

    // ── MODE: invite ──────────────────────────────────────
    if (mode === "invite") {
      const { data: inviteData, error: inviteErr } =
        await supabase.auth.admin.inviteUserByEmail(email);

      if (!inviteErr && inviteData?.user) {
        // Invite email sent successfully
        userId = inviteData.user.id;
      } else {
        // SMTP may be unset, or user already exists — fall back to generateLink
        logger.warn(
          "[provision-staff] inviteUserByEmail failed, falling back to generateLink",
          inviteErr,
        );

        const { data: linkData, error: linkErr } =
          await supabase.auth.admin.generateLink({
            type: "invite",
            email,
          });

        if (!linkErr && linkData) {
          userId = linkData.user?.id || null;
          actionLink = linkData.properties?.action_link || null;
        } else {
          // Possibly "already exists" — look up profile
          if (
            linkErr &&
            (linkErr.status === 422 ||
              linkErr.message?.includes("already"))
          ) {
            const { data: existing } = await supabase
              .from("user_profiles")
              .select("id")
              .eq("email", email)
              .maybeSingle();
            userId = existing?.id || null;
          }
          if (!userId) {
            const msg =
              (linkErr || inviteErr)?.message || "Failed to invite user";
            logger.error("[provision-staff] invite path failed", msg);
            return json({ error: msg }, 500, headers);
          }
        }
      }
    }

    if (!userId) {
      return json(
        { error: "Could not determine user ID after auth operation" },
        500,
        headers,
      );
    }

    // ── Upsert user_profiles ──────────────────────────────
    const profileData: Record<string, unknown> = {
      id: userId,
      email,
      full_name: full_name || email.split("@")[0],
      evidly_staff_role: role,
    };

    if (perms && typeof perms === "object") {
      for (const key of Object.keys(perms)) {
        if (key.startsWith("perm_")) {
          profileData[key] = !!perms[key];
        }
      }
    }

    const { error: upsertErr } = await supabase
      .from("user_profiles")
      .upsert(profileData, { onConflict: "id" });

    if (upsertErr) {
      logger.error("[provision-staff] profile upsert failed", upsertErr);
      return json(
        { error: upsertErr.message || "Failed to update profile" },
        500,
        headers,
      );
    }

    logger.info(
      "[provision-staff]",
      `${mode} completed for user ${userId}`,
    );

    return json({ ok: true, userId, actionLink }, 200, headers);
  } catch (error) {
    logger.error("[provision-staff] Unhandled error", error);
    return json({ error: (error as Error).message }, 500, headers);
  }
});
