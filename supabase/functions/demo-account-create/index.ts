import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = getCorsHeaders(null);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * demo-account-create — Creates a real Supabase auth account + org + locations
 * for a prospect demo. Profile data writes to DB from day one.
 *
 * Auth: Only EvidLY admin users (@getevidly.com).
 *
 * Creates:
 *   1. Auth user (email + temp password, auto-confirmed)
 *   2. Organization (is_demo = true, demo_started_at, demo_expires_at)
 *   3. Location(s)
 *   4. User profile (role = owner_operator)
 *   5. User location access (links user to org)
 *   6. Updates demo_sessions row if demo_session_id provided
 *
 * Returns: { success, auth_user_id, organization_id, credentials }
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── Auth: admin only ──────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify caller is EvidLY admin
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
  } = await userClient.auth.getUser();

  if (!caller?.email?.endsWith("@getevidly.com")) {
    return jsonResponse({ error: "Unauthorized — admin only" }, 403);
  }

  // Service-role client for admin operations
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── Parse body ────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const {
    prospect_name,
    prospect_email,
    prospect_phone,
    company_name,
    company_type,
    operation_type,
    address,
    city,
    county,
    state,
    zip_code,
    health_authority,
    fire_authority,
    num_locations,
    demo_duration_days,
    demo_session_id,
  } = body as Record<string, string | number | undefined>;

  // Validate required fields
  if (!prospect_name || !prospect_email || !company_name || !address || !city || !state || !zip_code) {
    return jsonResponse({ error: "Missing required fields" }, 400);
  }

  // ── Competitor email check ────────────────────────────
  const emailDomain = (prospect_email as string).split("@")[1]?.toLowerCase();
  if (emailDomain) {
    const { data: blocked } = await supabase
      .from("competitor_blocked_domains")
      .select("domain, company_name")
      .or(`domain.eq.${emailDomain}`);

    if (blocked && blocked.length > 0) {
      return jsonResponse(
        { error: "Blocked: competitor email domain detected.", domain: emailDomain },
        403,
      );
    }
  }

  // ── Generate temp password ────────────────────────────
  const tempPassword = crypto.randomUUID().slice(0, 12);

  let authUserId: string | null = null;

  try {
    // ── 1. Create auth user ─────────────────────────────
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: prospect_email as string,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: prospect_name,
          company_name: company_name,
          is_demo: true,
        },
      });

    if (authError || !authData.user) {
      return jsonResponse(
        { error: authError?.message || "Failed to create auth user" },
        500,
      );
    }

    authUserId = authData.user.id;

    // ── 2. Create organization ──────────────────────────
    // PROFILE DATA — writes to DB in all modes
    const durationDays = (demo_duration_days as number) || 14;
    const demoStartedAt = new Date().toISOString();
    const demoExpiresAt = new Date(
      Date.now() + durationDays * 86400000,
    ).toISOString();

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: company_name,
        industry_type: company_type || "restaurant",
        is_demo: true,
        demo_started_at: demoStartedAt,
        demo_expires_at: demoExpiresAt,
      })
      .select("id")
      .single();

    if (orgError || !org) {
      throw new Error(`Organization insert failed: ${orgError?.message}`);
    }

    // ── 3. Create location(s) ───────────────────────────
    // PROFILE DATA — writes to DB in all modes
    const locationCount = Math.min((num_locations as number) || 1, 10);
    const locationInserts = [];

    for (let i = 0; i < locationCount; i++) {
      locationInserts.push({
        organization_id: org.id,
        name:
          locationCount === 1
            ? `${company_name} — ${city}`
            : `${company_name} — Location ${i + 1}`,
        address: i === 0 ? address : `${address} (Location ${i + 1})`,
        city: city,
        state: state,
        zip: zip_code,
        status: "active",
      });
    }

    const { data: locations, error: locError } = await supabase
      .from("locations")
      .insert(locationInserts)
      .select("id");

    if (locError || !locations) {
      throw new Error(`Location insert failed: ${locError?.message}`);
    }

    // ── 4. Create user profile ──────────────────────────
    // PROFILE DATA — writes to DB in all modes
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: authUserId,
        full_name: prospect_name,
        email: prospect_email,
        phone: prospect_phone || null,
        role: "owner_operator",
        organization_id: org.id,
        organization_name: company_name,
      });

    if (profileError) {
      throw new Error(`Profile insert failed: ${profileError.message}`);
    }

    // ── 5. Create user location access ──────────────────
    // PROFILE DATA — writes to DB in all modes
    const accessInserts = locations.map((loc: { id: string }) => ({
      user_id: authUserId!,
      organization_id: org.id,
      location_id: loc.id,
      role: "owner",
    }));

    const { error: accessError } = await supabase
      .from("user_location_access")
      .insert(accessInserts);

    if (accessError) {
      throw new Error(
        `User location access insert failed: ${accessError.message}`,
      );
    }

    // ── 6. Update demo_sessions row (if linked) ─────────
    if (demo_session_id) {
      await supabase
        .from("demo_sessions")
        .update({
          auth_user_id: authUserId,
          organization_id: org.id,
          demo_credentials: { email: prospect_email, temp_password: tempPassword },
          status: "ready",
          expires_at: demoExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", demo_session_id);
    }

    // ── Success ─────────────────────────────────────────
    return jsonResponse({
      success: true,
      auth_user_id: authUserId,
      organization_id: org.id,
      location_ids: locations.map((l: { id: string }) => l.id),
      credentials: {
        email: prospect_email,
        temp_password: tempPassword,
      },
      demo_expires_at: demoExpiresAt,
    });
  } catch (err) {
    // ── Cleanup: delete orphaned auth user on failure ────
    if (authUserId) {
      console.error(
        `[demo-account-create] Cleaning up auth user ${authUserId} after failure`,
      );
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
    }

    console.error("[demo-account-create] Error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  }
});
