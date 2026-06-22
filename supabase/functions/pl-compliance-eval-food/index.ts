import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── JSON response helper ─────────────────────────────────
function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

// ── Main handler ─────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Auth: test secret, service_role bearer, OR platform_admin JWT ──
    const testSecret = Deno.env.get("PL_TEST_SECRET");
    const testHeader = req.headers.get("x-pl-test-secret");
    const isTestAuth = testSecret && testSecret.length > 0 && testHeader === testSecret;

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const isServiceRole = token !== null && token.trim() === serviceKey.trim();

    if (!isTestAuth && !isServiceRole) {
      if (!token) {
        return json({ error: "Unauthorized" }, 401, headers);
      }
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) {
        return json({ error: "Unauthorized" }, 401, headers);
      }

      let isAdmin = user.email?.endsWith("@getevidly.com") || false;
      if (!isAdmin) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role !== "platform_admin") {
          return json({ error: "Admin access required" }, 403, headers);
        }
      }
    }

    // ── Parse body ───────────────────────────────────────
    const { location_id } = await req.json();
    if (!location_id) {
      return json({ error: "location_id required" }, 400, headers);
    }

    // ── Resolve location → org_id ────────────────────────
    const { data: loc, error: locErr } = await supabase
      .from("locations")
      .select("id, organization_id")
      .eq("id", location_id)
      .single();

    if (locErr || !loc) {
      return json({ error: "Location not found" }, 404, headers);
    }

    const orgId = loc.organization_id;

    // ── Load active temperature logs for this location ───
    // facility_id = locations.id (FK: temperature_logs_facility_id_fkey)
    // Active set: superseded_by_log_id IS NULL
    //   — override rows (is_override=true) are active if not themselves superseded
    //   — the original they override has superseded_by_log_id set, so excluded
    // No is_sample column exists on this table
    const { data: logs, error: logErr } = await supabase
      .from("temperature_logs")
      .select("id, temp_pass, is_override, overrides_log_id")
      .eq("facility_id", location_id)
      .is("superseded_by_log_id", null);

    if (logErr) {
      return json(
        { error: "Failed to load temperature logs: " + logErr.message },
        500,
        headers,
      );
    }

    const activeLogs = logs ?? [];

    // ── Per-location rollup ──────────────────────────────
    // temp_pass already encodes required_min/max comparison — no re-derivation
    let passing = 0;
    let failing = 0;

    for (const log of activeLogs) {
      if (log.temp_pass === true) passing++;
      else if (log.temp_pass === false) failing++;
      // null temp_pass = not yet evaluated, skip count
    }

    const total = passing + failing;

    let alignment: "unaligned" | "aligned" | "not_monitored";
    let severity: "high" | "low";
    let expectedValue: string;
    let actualValue: string;

    if (total === 0) {
      alignment = "not_monitored";
      severity = "low";
      expectedValue = "active temperature readings present";
      actualValue = "no active readings";
    } else if (failing > 0) {
      alignment = "unaligned";
      severity = "high";
      expectedValue = "all readings in range";
      actualValue = `${failing} of ${total} readings failing`;
    } else {
      alignment = "aligned";
      severity = "low";
      expectedValue = "all readings in range";
      actualValue = `${passing} of ${total} readings passing`;
    }

    // ── Idempotent drift_catches write ───────────────────
    // Delete existing row for this location + pillar + dimension, then insert
    await supabase
      .from("drift_catches")
      .delete()
      .eq("location_id", location_id)
      .eq("pillar", "food_safety")
      .eq("dimension", "reading_compliance");

    const { error: insErr } = await supabase
      .from("drift_catches")
      .insert({
        org_id: orgId,
        location_id,
        pillar: "food_safety",
        drift_type: "compliance",
        dimension: "reading_compliance",
        detected_at: new Date().toISOString(),
        source_table: "temperature_logs",
        requirement_source: "jurisdiction",
        expected_value: expectedValue,
        actual_value: actualValue,
        severity,
        status: "open",
      });

    if (insErr) {
      return json(
        { error: "Failed to write drift_catches: " + insErr.message },
        500,
        headers,
      );
    }

    return json(
      {
        location_id,
        alignment,
        passing,
        failing,
        total,
        expected_value: expectedValue,
        actual_value: actualValue,
      },
      200,
      headers,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500, headers);
  }
});
