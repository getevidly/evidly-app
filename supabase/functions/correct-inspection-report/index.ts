import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  canonicalTimestamp,
  buildCanonicalAuthorityJson,
  buildSealHashInput,
  sha256,
} from '../_shared/seal-canonicalization.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// correct-inspection-report — Phase 1 Step 3: Correction via Supersession
//
// Creates a NEW sealed inspection_reports row that corrects a predecessor,
// plus an atomic supersession_log entry. The original record is NEVER modified.
//
// Input contract (extends seal-inspection-report):
//   All fields from seal-inspection-report PLUS:
//   supersedes_id    (uuid, REQUIRED — the record being corrected)
//   reason           (text, REQUIRED — why the correction was made)
//
// Atomicity: uses the create_correction_with_log() Postgres RPC so the
// new sealed record INSERT and supersession_log INSERT are in one transaction.
// ═══════════════════════════════════════════════════════════════════════════════

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // ── AUTHENTICATE ────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return jsonResponse(
        { error: "Unauthorized — valid JWT required" },
        401,
        corsHeaders,
      );
    }
    const sealedBy: string = user.id;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Parse body ──────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    const {
      organization_id, location_id, jurisdiction_id,
      pillar, inspection_date, inspection_type,
      raw_result, raw_result_type,
      source_file_bucket, source_file_path,
      numeric_equivalent, violations, critical_violations,
      non_critical_violations, inspector_name,
      supersedes_id, reason,
      captured_lat, captured_lng, captured_address,
    } = body as Record<string, any>;

    // ── Validate required fields ────────────────────────────────────
    const requiredFields: Record<string, unknown> = {
      organization_id, location_id, jurisdiction_id,
      pillar, inspection_date, inspection_type,
      raw_result, raw_result_type,
      source_file_bucket, source_file_path,
      supersedes_id, reason,
    };
    for (const [key, val] of Object.entries(requiredFields)) {
      if (val === undefined || val === null || val === "") {
        return jsonResponse(
          { error: `Missing required field: ${key}` },
          400,
          corsHeaders,
        );
      }
    }

    // ── Verify user belongs to organization ─────────────────────────
    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", sealedBy)
      .single();

    if (profileErr || !profile) {
      return jsonResponse(
        { error: "User profile not found" },
        403,
        corsHeaders,
      );
    }
    if (profile.organization_id !== organization_id) {
      return jsonResponse(
        { error: "User does not belong to this organization" },
        403,
        corsHeaders,
      );
    }

    // ── Verify predecessor exists and has a content_hash ────────────
    const { data: predecessor, error: predErr } = await supabase
      .from("inspection_reports")
      .select("content_hash")
      .eq("id", supersedes_id)
      .single();

    if (predErr || !predecessor) {
      return jsonResponse(
        { error: "supersedes_id references a non-existent inspection record" },
        422,
        corsHeaders,
      );
    }
    if (!predecessor.content_hash) {
      return jsonResponse(
        { error: "supersedes_id references an unsealed record (no content_hash)" },
        422,
        corsHeaders,
      );
    }
    const predecessorHash: string = predecessor.content_hash;

    // ── Verify predecessor is not already superseded ────────────────
    const { data: alreadySuperseded } = await supabase
      .from("supersession_log")
      .select("superseding_id")
      .eq("superseded_id", supersedes_id)
      .maybeSingle();

    if (alreadySuperseded) {
      return jsonResponse(
        {
          error: "This record has already been superseded",
          superseding_id: alreadySuperseded.superseding_id,
        },
        409,
        corsHeaders,
      );
    }

    // ── Server timestamp ────────────────────────────────────────────
    const sealedAtCanonical = canonicalTimestamp(new Date());

    // ── Fetch document bytes ────────────────────────────────────────
    const { data: fileData, error: fileErr } = await supabase.storage
      .from(source_file_bucket as string)
      .download(source_file_path as string);

    if (fileErr || !fileData) {
      return jsonResponse(
        {
          error: "Cannot seal: document not found in storage",
          detail: fileErr?.message || "File download returned null",
        },
        422,
        corsHeaders,
      );
    }

    const documentBytes = await fileData.arrayBuffer();

    // ── Canonical authority JSON ────────────────────────────────────
    const canonicalJson = buildCanonicalAuthorityJson({
      pillar,
      inspection_date,
      raw_result,
      raw_result_type,
      numeric_equivalent: numeric_equivalent ?? null,
      violations: violations ?? null,
      critical_violations: critical_violations ?? null,
      non_critical_violations: non_critical_violations ?? null,
      inspector_name: inspector_name ?? null,
    });

    // ── Compute hash (includes predecessor hash as chain-link) ──────
    const hashInput = buildSealHashInput(
      documentBytes,
      canonicalJson,
      sealedAtCanonical,
      sealedBy,
      predecessorHash,
    );

    const contentHash = await sha256(hashInput.buffer as ArrayBuffer);

    // ── Retention lookup ────────────────────────────────────────────
    const recordType = "ehd_inspection_report";

    const { data: retJurisdiction } = await supabase
      .from("retention_policies")
      .select("retention_years, clock_start")
      .eq("record_type", recordType)
      .eq("jurisdiction_id", jurisdiction_id)
      .maybeSingle();

    let retentionPolicy = retJurisdiction;

    if (!retentionPolicy) {
      const { data: retDefault } = await supabase
        .from("retention_policies")
        .select("retention_years, clock_start")
        .eq("record_type", recordType)
        .is("jurisdiction_id", null)
        .maybeSingle();
      retentionPolicy = retDefault;
    }

    if (!retentionPolicy) {
      return jsonResponse(
        { error: "No retention policy found — cannot seal without retention assignment" },
        422,
        corsHeaders,
      );
    }

    let clockDate: Date;
    if (retentionPolicy.clock_start === "inspection_date") {
      clockDate = new Date(inspection_date + "T00:00:00Z");
    } else {
      clockDate = new Date(sealedAtCanonical);
    }

    const retentionYears = Number(retentionPolicy.retention_years);
    const retentionUntil = new Date(clockDate);
    retentionUntil.setFullYear(retentionUntil.getFullYear() + retentionYears);

    // ── Atomic correction: RPC does both INSERTs in one transaction ──
    const sourceFileUrl = `${source_file_bucket}:${source_file_path}`;

    const { data: result, error: rpcErr } = await supabase.rpc(
      "create_correction_with_log",
      {
        p_organization_id: organization_id,
        p_location_id: location_id,
        p_jurisdiction_id: jurisdiction_id,
        p_pillar: pillar,
        p_inspection_date: inspection_date,
        p_inspection_type: inspection_type,
        p_raw_result: raw_result,
        p_raw_result_type: raw_result_type,
        p_numeric_equivalent: numeric_equivalent ?? null,
        p_violations: violations ?? null,
        p_critical_violations: critical_violations ?? null,
        p_non_critical_violations: non_critical_violations ?? null,
        p_inspector_name: inspector_name ?? null,
        p_source_file_url: sourceFileUrl,
        p_sealed_by: sealedBy,
        p_sealed_at: sealedAtCanonical,
        p_content_hash: contentHash,
        p_supersedes_id: supersedes_id,
        p_retention_until: retentionUntil.toISOString(),
        p_captured_lat: captured_lat ?? null,
        p_captured_lng: captured_lng ?? null,
        p_captured_address: captured_address ?? null,
        p_reason: reason,
      },
    );

    if (rpcErr) {
      // Check for "already superseded" from UNIQUE constraint
      if (rpcErr.message?.includes("uq_superseded_once")) {
        return jsonResponse(
          { error: "This record has already been superseded (concurrent correction)" },
          409,
          corsHeaders,
        );
      }
      return jsonResponse(
        { error: "Correction failed", detail: rpcErr.message },
        500,
        corsHeaders,
      );
    }

    return jsonResponse(result as Record<string, unknown>, 201, corsHeaders);
  } catch (err) {
    console.error("correct-inspection-report unhandled error:", err);
    return jsonResponse(
      { error: "Internal error", detail: (err as Error).message },
      500,
      corsHeaders,
    );
  }
});
