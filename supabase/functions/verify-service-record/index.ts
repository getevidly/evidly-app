import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  canonicalTimestamp,
  buildCanonicalServiceJson,
  buildSealHashInput,
  sha256,
} from '../_shared/seal-canonicalization.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// verify-service-record — Fire Step 5: Seal Verification
//
// Given a vendor_service_records id, independently recomputes the seal hash
// from stored data + certificate document bytes and reports whether the
// record is unaltered.
//
// READ-ONLY: this function NEVER writes to vendor_service_records.
//
// Uses the SAME shared canonicalization module as seal-service-record (Step 2)
// and correct-service-record (Step 3).
//
// Three possible outcomes:
//   "verified"              — hash match, document and record are genuine
//   "tampered"              — hash mismatch, record or document has been altered
//   "document_unavailable"  — certificate file missing from storage, cannot verify
//
// Input: { service_record_id: uuid }
// Auth:  JWT required, caller must belong to the record's organization.
//
// NOTE: Unlike food's verify-inspection-report, fire has NO verification_engine
// block. Fire's compliance standing is cadence-based (computed elsewhere), not
// a per-record grade consistency check like food's engine_a.
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

    const { service_record_id } = body as Record<string, any>;
    if (!service_record_id) {
      return jsonResponse(
        { error: "Missing required field: service_record_id" },
        400,
        corsHeaders,
      );
    }

    // ── STEP 2: FETCH THE SEALED ROW ──────────────────────────────────────
    const { data: row, error: rowErr } = await supabase
      .from("vendor_service_records")
      .select(
        "organization_id, location_id, safeguard_type, service_type_code, " +
        "vendor_name, vendor_id, technician_name, cert_number, service_date, " +
        "certificate_url, sealed_at, sealed_by, content_hash, " +
        "supersedes_id, lifecycle_state, retention_until",
      )
      .eq("id", service_record_id)
      .single();

    if (rowErr || !row) {
      return jsonResponse(
        { error: "Service record not found" },
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
        .from("vendor_service_records")
        .select("content_hash")
        .eq("id", row.supersedes_id)
        .single();

      if (pred?.content_hash) {
        predecessorHash = pred.content_hash;
      }
    }

    // ── STEP 4: FETCH CERTIFICATE DOCUMENT BYTES ──────────────────────────
    let documentBytes: ArrayBuffer | null = null;
    let documentFound = false;

    const colonIdx = (row.certificate_url as string).indexOf(":");
    if (colonIdx > 0) {
      const bucket = (row.certificate_url as string).slice(0, colonIdx);
      const filePath = (row.certificate_url as string).slice(colonIdx + 1);

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
      sealStatus = "document_unavailable";
    } else {
      const sealedAtCanonical = canonicalTimestamp(new Date(row.sealed_at));

      const canonicalJson = buildCanonicalServiceJson({
        location_id: row.location_id,
        safeguard_type: row.safeguard_type,
        service_type_code: row.service_type_code,
        vendor_name: row.vendor_name,
        vendor_id: row.vendor_id ?? null,
        technician_name: row.technician_name ?? null,
        cert_number: row.cert_number,
        service_date: row.service_date,
        organization_id: row.organization_id,
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

    // ── STEP 7: CHECK SUPERSESSION STATUS ─────────────────────────────────
    const { data: supersessionEntry } = await supabase
      .from("service_supersession_log")
      .select("superseding_id")
      .eq("superseded_id", service_record_id)
      .maybeSingle();

    // ── STEP 8: RETURN VERIFICATION REPORT ────────────────────────────────
    return jsonResponse(
      {
        service_record_id,
        seal_status: sealStatus,
        hash_match: hashMatch,
        stored_hash: row.content_hash,
        recomputed_hash: recomputedHash,
        sealed_at: row.sealed_at,
        sealed_by: row.sealed_by,
        document_found: documentFound,
        lifecycle_state: row.lifecycle_state,
        retention_until: row.retention_until,
        superseded: !!supersessionEntry,
        superseded_by: supersessionEntry?.superseding_id ?? null,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("verify-service-record unhandled error:", err);
    return jsonResponse(
      { error: "Internal error", detail: (err as Error).message },
      500,
      corsHeaders,
    );
  }
});
