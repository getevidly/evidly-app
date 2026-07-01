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

  // Rollback ledger — unwind in reverse on any mid-chain failure
  let authUserId: string | null = null;
  let orgId: string | null = null;

  try {
    const body = await req.json();
    const { token, password, business_name, address, city, state, zip } = body;

    if (!token || !password) {
      return json({ error: "token and password are required" }, 400, headers);
    }
    if (String(password).length < 12) {
      return json({ error: "Password must be at least 12 characters" }, 400, headers);
    }

    // ── 1. Validate invite ──────────────────────────────────
    const { data: invite, error: invErr } = await supabase
      .from("evidly_client_invites")
      .select("id, business_name, contact_name, email, phone, client_role, status, expires_at")
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
      await supabase.from("evidly_client_invites")
        .update({ status: "expired" }).eq("id", invite.id);
      return json({ error: "This invite has expired" }, 410, headers);
    }

    // Guard: email already has an auth user
    const { data: existing } = await supabase
      .from("user_profiles").select("id").eq("email", invite.email).maybeSingle();
    if (existing) {
      return json({ error: "An account already exists for this email — please sign in." }, 409, headers);
    }

    // ── 2. Create auth user (email pre-verified via invite) ──
    const { data: created, error: userErr } = await supabase.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: invite.contact_name },
    });
    if (userErr || !created?.user) {
      logger.error("[accept-client-invite] createUser failed", userErr);
      return json({ error: "Could not create account" }, 500, headers);
    }
    authUserId = created.user.id;

    // ── 3. Organization ─────────────────────────────────────
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        name: (business_name && String(business_name).trim()) || invite.business_name,
        primary_contact_name: invite.contact_name,
        state: state || null,
        onboarding_completed: false,
      })
      .select("id")
      .single();
    if (orgErr || !org) throw new Error("org insert failed: " + (orgErr?.message ?? ""));
    orgId = org.id;

    // ── 4. Location ─────────────────────────────────────────
    const { data: loc, error: locErr } = await supabase
      .from("locations")
      .insert({
        organization_id: org.id,
        name: invite.business_name,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        business_hours_timezone: "America/Los_Angeles",
        site_contact_name: invite.contact_name,
      })
      .select("id")
      .single();
    if (locErr || !loc) throw new Error("location insert failed: " + (locErr?.message ?? ""));

    // ── 5. Access grant ─────────────────────────────────────
    const { error: accErr } = await supabase
      .from("user_location_access")
      .insert({
        user_id: authUserId,
        organization_id: org.id,
        location_id: loc.id,
        role: "owner",
      });
    if (accErr) throw new Error("access insert failed: " + accErr.message);

    // ── 5b. User profile (role from invite) ─────────────────
    const { error: profErr } = await supabase
      .from("user_profiles")
      .insert({
        id: authUserId,
        full_name: invite.contact_name,
        phone: invite.phone || null,
        organization_id: org.id,
        role: invite.client_role || "owner_operator",
      });
    if (profErr) throw new Error("profile insert failed: " + profErr.message);

    // ── 6. Mark accepted ────────────────────────────────────
    await supabase.from("evidly_client_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return json({
      success: true,
      organization_id: org.id,
      location_id: loc.id,
      email: invite.email,
    }, 200, headers);

  } catch (err) {
    logger.error("[accept-client-invite] chain failed — rolling back", err);
    if (orgId) {
      if (authUserId) await supabase.from("user_profiles").delete().eq("id", authUserId).catch(() => {});
      await supabase.from("user_location_access").delete().eq("organization_id", orgId).catch(() => {});
      await supabase.from("locations").delete().eq("organization_id", orgId).catch(() => {});
      await supabase.from("organizations").delete().eq("id", orgId).catch(() => {});
    }
    if (authUserId) {
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
    }
    return json({ error: "Could not complete signup — please try again." }, 500, headers);
  }
});
