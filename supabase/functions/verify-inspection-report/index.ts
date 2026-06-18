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
// verify-inspection-report — Phase 1 Step 5: Seal Verification
//
// Given an inspection_report_id, independently recomputes the seal hash from
// stored data + document bytes and reports whether the record is unaltered.
//
// READ-ONLY: this function NEVER writes to inspection_reports.
//
// Uses the SAME shared canonicalization module as seal-inspection-report (Step 2)
// and correct-inspection-report (Step 3). The hash recomputation is identical
// to the G4 proof script (reproduce-seal-hash.ts).
//
// Three possible outcomes:
//   "verified"              — hash match, document and record are genuine
//   "tampered"              — hash mismatch, record or document has been altered
//   "document_unavailable"  — source file missing from storage, cannot verify
//
// Input: { inspection_report_id: uuid }
// Auth:  JWT required, caller must belong to the record's organization.
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

    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Parse body ────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    const { inspection_report_id } = body as Record<string, any>;
    if (!inspection_report_id) {
      return jsonResponse(
        { error: "Missing required field: inspection_report_id" },
        400,
        corsHeaders,
      );
    }

    // ── STEP 2: FETCH THE SEALED ROW ──────────────────────────────────────
    const { data: row, error: rowErr } = await supabase
      .from("inspection_reports")
      .select(
        "organization_id, pillar, inspection_date, raw_result, raw_result_type, " +
        "numeric_equivalent, violations, critical_violations, non_critical_violations, " +
        "inspector_name, source_file_url, sealed_at, sealed_by, content_hash, " +
        "supersedes_id, lifecycle_state, retention_until",
      )
      .eq("id", inspection_report_id)
      .single();

    if (rowErr || !row) {
      return jsonResponse(
        { error: "Inspection report not found" },
        404,
        corsHeaders,
      );
    }

    // Verify caller belongs to the record's organization
    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return jsonResponse(
        { error: "User profile not found" },
        403,
        corsHeaders,
      );
    }
    if (profile.organization_id !== row.organization_id) {
      return jsonResponse(
        { error: "User does not belong to this organization" },
        403,
        corsHeaders,
      );
    }

    // Verify record is sealed
    if (!row.content_hash || !row.sealed_at || !row.sealed_by) {
      return jsonResponse(
        { error: "Record is not sealed — nothing to verify" },
        422,
        corsHeaders,
      );
    }

    // ── STEP 3: RESOLVE PREDECESSOR HASH ──────────────────────────────────
    let predecessorHash = "";
    if (row.supersedes_id) {
      const { data: pred } = await supabase
        .from("inspection_reports")
        .select("content_hash")
        .eq("id", row.supersedes_id)
        .single();

      if (pred?.content_hash) {
        predecessorHash = pred.content_hash;
      }
      // If predecessor missing or unsealed, predecessorHash stays "" —
      // this will cause a hash mismatch (correctly reported as tampered).
    }

    // ── STEP 4: FETCH DOCUMENT BYTES ──────────────────────────────────────
    let documentBytes: ArrayBuffer | null = null;
    let documentFound = false;

    const colonIdx = (row.source_file_url as string).indexOf(":");
    if (colonIdx > 0) {
      const bucket = (row.source_file_url as string).slice(0, colonIdx);
      const filePath = (row.source_file_url as string).slice(colonIdx + 1);

      const { data: fileData, error: fileErr } = await supabase.storage
        .from(bucket)
        .download(filePath);

      if (!fileErr && fileData) {
        documentBytes = await fileData.arrayBuffer();
        documentFound = true;
      }
    }

    // ── STEPS 5+6: RECOMPUTE HASH AND COMPARE ────────────────────────────
    let hashMatch: boolean | null = null;
    let recomputedHash: string | null = null;
    let sealStatus: string;

    if (!documentFound || !documentBytes) {
      // Document missing — cannot verify, but this is NOT "tampered"
      sealStatus = "document_unavailable";
    } else {
      const sealedAtCanonical = canonicalTimestamp(new Date(row.sealed_at));

      const canonicalJson = buildCanonicalAuthorityJson({
        pillar: row.pillar,
        inspection_date: row.inspection_date,
        raw_result: row.raw_result,
        raw_result_type: row.raw_result_type,
        numeric_equivalent: row.numeric_equivalent ?? null,
        violations: row.violations ?? null,
        critical_violations: row.critical_violations ?? null,
        non_critical_violations: row.non_critical_violations ?? null,
        inspector_name: row.inspector_name ?? null,
      });

      const hashInput = buildSealHashInput(
        documentBytes,
        canonicalJson,
        sealedAtCanonical,
        row.sealed_by,
        predecessorHash,
      );

      recomputedHash = await sha256(hashInput.buffer as ArrayBuffer);
      hashMatch = recomputedHash === row.content_hash;
      sealStatus = hashMatch ? "verified" : "tampered";
    }

    // ── STEP 7: FETCH ENGINE_A VERIFICATION LOG ───────────────────────────
    const { data: engineLog } = await supabase
      .from("inspection_verification_log")
      .select("result, discrepancy_summary, engine_version, run_at")
      .eq("inspection_report_id", inspection_report_id)
      .eq("engine_name", "engine_a")
      .order("run_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ── Check supersession status ─────────────────────────────────────────
    const { data: supersessionEntry } = await supabase
      .from("supersession_log")
      .select("superseding_id")
      .eq("superseded_id", inspection_report_id)
      .maybeSingle();

    // ── STEP 8: RETURN VERIFICATION REPORT ────────────────────────────────
    return jsonResponse(
      {
        inspection_report_id,
        seal_status: sealStatus,
        hash_match: hashMatch,
        stored_hash: row.content_hash,
        recomputed_hash: recomputedHash,
        sealed_at: row.sealed_at,
        sealed_by: row.sealed_by,
        sealed_at_to_the_second: true,
        document_found: documentFound,
        lifecycle_state: row.lifecycle_state,
        retention_until: row.retention_until,
        superseded: !!supersessionEntry,
        superseded_by: supersessionEntry?.superseding_id ?? null,
        verification_engine: engineLog
          ? {
              result: engineLog.result,
              discrepancy_summary: engineLog.discrepancy_summary,
              engine_version: engineLog.engine_version,
              run_at: engineLog.run_at,
            }
          : null,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("verify-inspection-report unhandled error:", err);
    return jsonResponse(
      { error: "Internal error", detail: (err as Error).message },
      500,
      corsHeaders,
    );
  }
});
