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
// correct-service-record — Fire Step 3: Correction via Supersession
//
// Creates a NEW sealed vendor_service_records row that corrects a predecessor,
// plus an atomic service_supersession_log entry. The original is NEVER modified.
//
// Input contract (extends seal-service-record):
//   All fields from seal-service-record PLUS:
//   supersedes_id    (uuid, REQUIRED — the record being corrected)
//   reason           (text, REQUIRED — why the correction was made)
//
// Atomicity: uses create_service_correction_with_log() Postgres RPC so the
// new sealed record INSERT and service_supersession_log INSERT are in one txn.
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
      organization_id, location_id,
      safeguard_type, service_type_code,
      vendor_name, service_date, cert_number,
      source_file_bucket, source_file_path,
      vendor_id, technician_name,
      supersedes_id, reason,
      captured_lat, captured_lng, captured_address,
    } = body as Record<string, any>;

    // ── Validate required fields ────────────────────────────────────
    const requiredFields: Record<string, unknown> = {
      organization_id, location_id,
      safeguard_type, service_type_code,
      vendor_name, service_date, cert_number,
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

    // ── Verify predecessor exists and is sealed ─────────────────────
    const { data: predecessor, error: predErr } = await supabase
      .from("vendor_service_records")
      .select("content_hash")
      .eq("id", supersedes_id)
      .single();

    if (predErr || !predecessor) {
      return jsonResponse(
        { error: "supersedes_id references a non-existent service record" },
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

    // ── Verify predecessor not already superseded ────────────────────
    const { data: alreadySuperseded } = await supabase
      .from("service_supersession_log")
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

    // ── Canonical service JSON ──────────────────────────────────────
    const canonicalJson = buildCanonicalServiceJson({
      location_id,
      safeguard_type,
      service_type_code,
      vendor_name,
      vendor_id: vendor_id ?? null,
      technician_name: technician_name ?? null,
      cert_number,
      service_date,
      organization_id,
    });

    // ── Compute hash (predecessor hash = chain-link) ────────────────
    const hashInput = buildSealHashInput(
      documentBytes,
      canonicalJson,
      sealedAtCanonical,
      sealedBy,
      predecessorHash,
    );

    const contentHash = await sha256(hashInput.buffer as ArrayBuffer);

    // ── Retention lookup ────────────────────────────────────────────
    const { data: retPolicy } = await supabase
      .from("retention_policies")
      .select("retention_years, clock_start")
      .eq("record_type", "fire_service_record")
      .is("jurisdiction_id", null)
      .maybeSingle();

    if (!retPolicy) {
      return jsonResponse(
        { error: "No retention policy found for fire_service_record" },
        422,
        corsHeaders,
      );
    }

    const clockDate = new Date(sealedAtCanonical);
    const retentionYears = Number(retPolicy.retention_years);
    const retentionUntil = new Date(clockDate);
    retentionUntil.setFullYear(retentionUntil.getFullYear() + retentionYears);

    // ── Atomic correction: RPC does both INSERTs in one txn ─────────
    const certificateUrl = `${source_file_bucket}:${source_file_path}`;

    const { data: result, error: rpcErr } = await supabase.rpc(
      "create_service_correction_with_log",
      {
        p_organization_id: organization_id,
        p_location_id: location_id,
        p_safeguard_type: safeguard_type,
        p_service_type_code: service_type_code,
        p_vendor_name: vendor_name,
        p_service_date: service_date,
        p_cert_number: cert_number,
        p_certificate_url: certificateUrl,
        p_sealed_by: sealedBy,
        p_sealed_at: sealedAtCanonical,
        p_content_hash: contentHash,
        p_supersedes_id: supersedes_id,
        p_retention_until: retentionUntil.toISOString(),
        p_reason: reason,
        p_vendor_id: vendor_id ?? null,
        p_technician_name: technician_name ?? null,
        p_captured_lat: captured_lat ?? null,
        p_captured_lng: captured_lng ?? null,
        p_captured_address: captured_address ?? null,
      },
    );

    if (rpcErr) {
      if (rpcErr.message?.includes("uq_service_superseded_once")) {
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
    console.error("correct-service-record unhandled error:", err);
    return jsonResponse(
      { error: "Internal error", detail: (err as Error).message },
      500,
      corsHeaders,
    );
  }
});
