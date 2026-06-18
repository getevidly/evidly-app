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
// seal-inspection-report — Phase 1 Step 2: Evidentiary Seal
//
// Creates a fully-sealed inspection_reports row. The seal is "authentic at birth":
//   • sealed_by    = auth.uid() from the verified JWT (server-extracted, never client-supplied)
//   • sealed_at    = server's now(), truncated to whole seconds, canonical UTC format
//   • content_hash = SHA-256 over: document bytes + canonical authority JSON + sealed_at
//                    + sealed_by + predecessor hash
//
// The hash binds the document file, the authority facts, the actor, the timestamp,
// and the predecessor hash (empty string for originals) into a single tamper-evident seal.
//
// Canonicalization logic lives in _shared/seal-canonicalization.ts — the SINGLE
// source of truth shared by this function, the verify function (Step 5), and
// the G4 test script.
//
// This is an edge function (not a DB function) because hashing requires downloading
// the document bytes from Supabase Storage — something PL/pgSQL cannot do.
//
// This function creates ORIGINAL seals only. Corrections (supersessions) must use
// correct-inspection-report, which atomically creates the new sealed record AND
// logs the supersession. Do NOT pass supersedes_id to this function.
//
// REQUIRED INPUT FIELDS (contract for the Phase 2 upload path):
//   organization_id, location_id, jurisdiction_id  (uuids)
//   pillar, inspection_date, inspection_type,      (required authority + classification)
//   raw_result, raw_result_type                    (required authority result)
//   source_file_bucket, source_file_path           (storage reference)
// NULLABLE INPUT FIELDS:
//   numeric_equivalent, violations (jsonb), critical_violations,
//   non_critical_violations, inspector_name         (nullable authority details)
//   captured_lat, captured_lng, captured_address    (geo, where available)
//
// NOTE: inspection_type is NOT NULL on the table. The Phase 2 upload path MUST
// supply it (e.g. 'routine', 'follow_up', 'complaint', 'reinspection').
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
    // ── STEP 1: AUTHENTICATE ──────────────────────────────────────────────
    // Extract auth.uid() from the caller's JWT. The client CANNOT supply
    // sealed_by — it comes only from the verified token.
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

    // Service-role client for all DB + Storage operations
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Parse body ────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    const {
      // Required
      organization_id,
      location_id,
      jurisdiction_id,
      pillar,
      inspection_date,
      inspection_type,
      raw_result,
      raw_result_type,
      source_file_bucket,
      source_file_path,
      // Nullable authority fields
      numeric_equivalent,
      violations,
      critical_violations,
      non_critical_violations,
      inspector_name,
      // Optional geo
      captured_lat,
      captured_lng,
      captured_address,
    } = body as Record<string, any>;

    // Validate required fields
    const requiredFields: Record<string, unknown> = {
      organization_id,
      location_id,
      jurisdiction_id,
      pillar,
      inspection_date,
      inspection_type,
      raw_result,
      raw_result_type,
      source_file_bucket,
      source_file_path,
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

    // Corrections must go through correct-inspection-report (which logs to supersession_log)
    if ((body as Record<string, any>).supersedes_id) {
      return jsonResponse(
        {
          error:
            "supersedes_id is not accepted by seal-inspection-report; " +
            "use correct-inspection-report for corrections",
        },
        400,
        corsHeaders,
      );
    }

    // Verify user belongs to organization_id
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

    // ── STEP 2: SERVER TIMESTAMP ──────────────────────────────────────────
    // Server's now(), truncated to whole seconds, canonical UTC format.
    // canonicalTimestamp() produces exactly "YYYY-MM-DDTHH:MM:SSZ" (20 chars).
    // This EXACT string is what gets hashed AND what gets stored in sealed_at.
    // The verifier reads sealed_at back, parses to Date, re-canonicalizes,
    // and gets the identical string (because the stored value has zero
    // fractional seconds).
    const sealedAtCanonical = canonicalTimestamp(new Date());

    // ── STEP 3: FETCH DOCUMENT BYTES ──────────────────────────────────────
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

    // ── STEP 4: PREDECESSOR HASH ───────────────────────────────────────────
    // Original seals have no predecessor — empty string is hashed.
    // Corrections (with predecessor chain-link) use correct-inspection-report.
    const predecessorHash = "";

    // ── STEP 5: CANONICAL AUTHORITY JSON ──────────────────────────────────
    // Uses the shared buildCanonicalAuthorityJson() from seal-canonicalization.ts.
    // Fixed 9-field key order. Null-normalized. Violations with sorted keys.
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

    // ── STEP 6: COMPUTE HASH ──────────────────────────────────────────────
    // Uses the shared buildSealHashInput() from seal-canonicalization.ts.
    // See that module for the exact byte layout and separator contract.
    const hashInput = buildSealHashInput(
      documentBytes,
      canonicalJson,
      sealedAtCanonical,
      sealedBy,
      predecessorHash,
    );

    const contentHash = await sha256(hashInput.buffer as ArrayBuffer);

    // ── STEP 7: RETENTION LOOKUP ──────────────────────────────────────────
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
        {
          error:
            "No retention policy found for ehd_inspection_report — cannot seal without retention assignment",
        },
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

    // ── STEP 8: INSERT ────────────────────────────────────────────────────
    const sourceFileUrl = `${source_file_bucket}:${source_file_path}`;

    const { data: inserted, error: insertErr } = await supabase
      .from("inspection_reports")
      .insert({
        organization_id,
        location_id,
        jurisdiction_id,
        pillar,
        inspection_date,
        inspection_type,
        raw_result,
        raw_result_type,
        numeric_equivalent: numeric_equivalent ?? null,
        violations: violations ?? null,
        critical_violations: critical_violations ?? null,
        non_critical_violations: non_critical_violations ?? null,
        inspector_name: inspector_name ?? null,
        source: "evidentiary_seal",
        source_file_url: sourceFileUrl,
        sealed_by: sealedBy,
        sealed_at: sealedAtCanonical,
        content_hash: contentHash,
        captured_lat: captured_lat ?? null,
        captured_lng: captured_lng ?? null,
        captured_address: captured_address ?? null,
        lifecycle_state: "live",
        retention_until: retentionUntil.toISOString(),
      })
      .select("id, content_hash, sealed_at, retention_until")
      .single();

    if (insertErr) {
      return jsonResponse(
        { error: "Insert failed", detail: insertErr.message },
        500,
        corsHeaders,
      );
    }

    // ── STEP 9: RETURN ────────────────────────────────────────────────────
    return jsonResponse(
      {
        id: inserted.id,
        content_hash: inserted.content_hash,
        sealed_at: inserted.sealed_at,
        retention_until: inserted.retention_until,
      },
      201,
      corsHeaders,
    );
  } catch (err) {
    console.error("seal-inspection-report unhandled error:", err);
    return jsonResponse(
      { error: "Internal error", detail: (err as Error).message },
      500,
      corsHeaders,
    );
  }
});
