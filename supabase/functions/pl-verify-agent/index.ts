import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { logEvent } from "../_shared/events.ts";
import { getProvider } from "./provider.ts";
import type { NormalizedProviderResult } from "./provider.ts";

// Everything routes to human review at launch.
const LAUNCH_AUTO_VERIFY = false;

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

/** Case/space-insensitive name comparison. */
function namesMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  return normalize(a) === normalize(b);
}

/** Check if any license type string indicates Property & Casualty authority. */
function hasPcAuthority(licenseTypes: string[]): boolean {
  const PC_PATTERNS = [
    /property/i,
    /casualty/i,
    /p\s*&\s*c/i,
    /p\/c/i,
    /fire/i,
  ];
  return licenseTypes.some((lt) => PC_PATTERNS.some((p) => p.test(lt)));
}

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

    // ── Auth: verify caller is platform admin ──────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401, headers);
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401, headers);
    }

    const isAdmin =
      user.email?.endsWith("@getevidly.com") ||
      false;

    if (!isAdmin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "platform_admin") {
        return json({ error: "Admin access required" }, 403, headers);
      }
    }

    // ── Parse input ────────────────────────────────────────
    const body = await req.json();
    const {
      intake_id,
      license_number: bodyLicenseNumber,
      npn: bodyNpn,
      state = "CA",
      fcra_permissible_purpose,
    } = body;

    if (!intake_id) {
      return json({ error: "intake_id required" }, 400, headers);
    }
    if (!fcra_permissible_purpose || !String(fcra_permissible_purpose).trim()) {
      return json({ error: "fcra_permissible_purpose required" }, 400, headers);
    }

    // ── Load intake ────────────────────────────────────────
    const { data: intake, error: fetchErr } = await supabase
      .from("policy_lens_intakes")
      .select("id, agent_name, agency_name, agent_license_number, agent_email")
      .eq("id", intake_id)
      .single();

    if (fetchErr || !intake) {
      return json({ error: "Intake not found" }, 404, headers);
    }

    const licenseNumber = intake.agent_license_number || bodyLicenseNumber || null;
    const npn = bodyNpn || null;

    if (!licenseNumber && !npn) {
      return json(
        { error: "license_number or npn required (not found on intake, not provided in body)" },
        400,
        headers,
      );
    }

    // ── Call provider adapter ──────────────────────────────
    const providerName = (Deno.env.get("PROVIDER") || "stub").toLowerCase();
    const provider = getProvider();

    let providerResult: NormalizedProviderResult | null = null;
    let providerError: string | null = null;

    try {
      providerResult = await provider.verify({
        licenseNumber: licenseNumber || undefined,
        npn: npn || undefined,
        state,
      });
    } catch (err) {
      providerError = err instanceof Error ? err.message : String(err);
      logger.error("[pl-verify-agent] Provider error", providerError);
    }

    // ── Compute checks ────────────────────────────────────
    let overallResult: string;
    let reviewRequired: boolean;

    const checks = {
      name_match: false,
      active: false,
      has_pc_authority: false,
      not_expired: false,
      has_regulatory_actions: false,
    };

    if (providerError || !providerResult) {
      // Provider threw or returned nothing
      overallResult = "provider_error";
      reviewRequired = true;
    } else if (!providerResult.found) {
      overallResult = "not_found";
      reviewRequired = true;
    } else {
      // Compute individual checks
      checks.name_match = namesMatch(providerResult.licensee_name, intake.agent_name);

      checks.active = providerResult.license_status?.toLowerCase() === "active";

      checks.has_pc_authority = providerResult.has_pc_authority || hasPcAuthority(providerResult.license_types);

      const today = new Date().toISOString().split("T")[0];
      checks.not_expired = providerResult.license_expiration_date
        ? providerResult.license_expiration_date >= today
        : true; // No expiration date = assume not expired

      checks.has_regulatory_actions = (providerResult.regulatory_actions?.length ?? 0) > 0;

      // Determine overall result
      if (!checks.active || !checks.not_expired || !checks.has_pc_authority || !checks.name_match) {
        overallResult = "failed";
      } else if (checks.has_regulatory_actions) {
        overallResult = "verified_with_flags";
      } else {
        overallResult = "verified";
      }

      // Launch gate: force human review on everything
      reviewRequired = LAUNCH_AUTO_VERIFY ? overallResult !== "verified" : true;
    }

    // ── INSERT pl_agent_verifications ──────────────────────
    const now = new Date().toISOString();
    const verificationRow = {
      intake_id,
      source: providerName,
      checked_at: now,
      query_license_number: licenseNumber,
      query_npn: npn,
      query_state: state,
      licensee_name: providerResult?.licensee_name || null,
      license_status: providerResult?.license_status || null,
      license_types: providerResult?.license_types || [],
      has_pc_authority: checks.has_pc_authority,
      license_issue_date: providerResult?.license_issue_date || null,
      license_expiration_date: providerResult?.license_expiration_date || null,
      regulatory_actions: providerResult?.regulatory_actions || [],
      npn: providerResult?.npn || npn,
      name_match: checks.name_match,
      active: checks.active,
      not_expired: checks.not_expired,
      has_regulatory_actions: checks.has_regulatory_actions,
      overall_result: overallResult,
      review_required: reviewRequired,
      fcra_permissible_purpose: String(fcra_permissible_purpose).trim(),
      raw_response: providerResult?.raw || (providerError ? { error: providerError } : null),
      verified_by: user.email,
    };

    const { data: verification, error: insertErr } = await supabase
      .from("pl_agent_verifications")
      .insert(verificationRow)
      .select("id")
      .single();

    if (insertErr) {
      logger.error("[pl-verify-agent] Insert verification failed", insertErr);
      return json({ error: "Failed to store verification" }, 500, headers);
    }

    // ── UPDATE policy_lens_intakes ─────────────────────────
    const intakeUpdate: Record<string, unknown> = {
      agent_license_status: overallResult,
      agent_license_source: providerName,
    };
    if (providerResult?.npn) {
      intakeUpdate.agent_npn = providerResult.npn;
    }
    if (overallResult === "verified" || overallResult === "verified_with_flags") {
      intakeUpdate.agent_license_verified_at = now;
    }

    const { error: updateErr } = await supabase
      .from("policy_lens_intakes")
      .update(intakeUpdate)
      .eq("id", intake_id);

    if (updateErr) {
      logger.error("[pl-verify-agent] Intake update failed", updateErr);
      // Non-fatal: verification row was already stored
    }

    // ── Log event ──────────────────────────────────────────
    await logEvent(supabase, {
      event_type: "agent_license_verified",
      intake_id,
      metadata: {
        verification_id: verification.id,
        overall_result: overallResult,
        review_required: reviewRequired,
        provider: providerName,
        verified_by: user.email,
      },
    });

    return json(
      {
        verification_id: verification.id,
        overall_result: overallResult,
        checks,
        review_required: reviewRequired,
      },
      200,
      headers,
    );
  } catch (err) {
    logger.error("[pl-verify-agent] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
