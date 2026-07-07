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
// seal-service-record — Fire Step 2: Evidentiary Seal for Service Records
//
// Creates a fully-sealed vendor_service_records row. The seal is
// "authentic at birth":
//   • sealed_by    = auth.uid() from the verified JWT
//   • sealed_at    = server's now(), truncated to whole seconds, canonical UTC
//   • content_hash = SHA-256 over: document bytes + canonical service JSON
//                    + sealed_at + sealed_by + predecessor hash
//
// Canonicalization logic lives in _shared/seal-canonicalization.ts — shared
// with the verify function and test scripts.
//
// This function creates ORIGINAL seals only. Corrections (supersessions) must
// use correct-service-record, which atomically creates the new sealed record
// AND logs the supersession. Do NOT pass supersedes_id to this function.
//
// REQUIRED INPUT FIELDS:
//   organization_id, location_id          (uuids)
//   safeguard_type, service_type_code     (required classification)
//   vendor_name, service_date, cert_number(required authority)
//   source_file_bucket, source_file_path  (storage reference)
// NULLABLE INPUT FIELDS:
//   vendor_id, technician_name            (nullable authority)
//   captured_lat, captured_lng, captured_address  (geo, where available)
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
    const sealedBy: string = user.id;

    // Service-role client for all DB + Storage operations
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── STEP 2: PARSE + VALIDATE ────────────────────────────────────────
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
      safeguard_type,
      service_type_code,
      vendor_name,
      service_date,
      cert_number,
      source_file_bucket,
      source_file_path,
      // Nullable authority fields
      vendor_id,
      technician_name,
      // Optional geo
      captured_lat,
      captured_lng,
      captured_address,
      // Optional metadata (non-canonical — not part of content_hash)
      price_charged,
      notes,
    } = body as Record<string, any>;

    const requiredFields: Record<string, unknown> = {
      organization_id,
      location_id,
      safeguard_type,
      service_type_code,
      vendor_name,
      service_date,
      cert_number,
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

    // Corrections must go through correct-service-record
    if ((body as Record<string, any>).supersedes_id) {
      return jsonResponse(
        {
          error:
            "supersedes_id is not accepted by seal-service-record; " +
            "use correct-service-record for corrections",
        },
        400,
        corsHeaders,
      );
    }

    // ── STEP 3: VERIFY ORG MEMBERSHIP ───────────────────────────────────
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

    // ── STEP 4: SERVER TIMESTAMP ────────────────────────────────────────
    const sealedAtCanonical = canonicalTimestamp(new Date());

    // ── STEP 5: FETCH DOCUMENT BYTES ────────────────────────────────────
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

    // ── STEP 6: PREDECESSOR HASH ────────────────────────────────────────
    // Original seals have no predecessor — empty string is hashed.
    // Corrections use correct-service-record.
    const predecessorHash = "";

    // ── STEP 7: CANONICAL SERVICE JSON ──────────────────────────────────
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

    // ── STEP 8: COMPUTE HASH ────────────────────────────────────────────
    const hashInput = buildSealHashInput(
      documentBytes,
      canonicalJson,
      sealedAtCanonical,
      sealedBy,
      predecessorHash,
    );

    const contentHash = await sha256(hashInput.buffer as ArrayBuffer);

    // ── STEP 9: RETENTION LOOKUP ────────────────────────────────────────
    const recordType = "fire_service_record";

    const { data: retPolicy } = await supabase
      .from("retention_policies")
      .select("retention_years, clock_start")
      .eq("record_type", recordType)
      .is("jurisdiction_id", null)
      .maybeSingle();

    if (!retPolicy) {
      return jsonResponse(
        {
          error:
            "No retention policy found for fire_service_record — cannot seal without retention assignment",
        },
        422,
        corsHeaders,
      );
    }

    // clock_start = 'sealed_at' for fire (confirmed in live schema)
    const clockDate = new Date(sealedAtCanonical);
    const retentionYears = Number(retPolicy.retention_years);
    const retentionUntil = new Date(clockDate);
    retentionUntil.setFullYear(retentionUntil.getFullYear() + retentionYears);

    // ── STEP 10: INSERT ─────────────────────────────────────────────────
    // ── Configured cadence lookup (drives next_due_date) ──
    let nextDueDate: string | null = null;
    const { data: lssRow } = await supabase
      .from("location_service_schedules")
      .select("frequency_interval_days")
      .eq("organization_id", organization_id)
      .eq("location_id", location_id)
      .eq("service_type_code", service_type_code)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lssRow?.frequency_interval_days != null) {
      const due = new Date(`${service_date}T00:00:00Z`);
      due.setUTCDate(due.getUTCDate() + lssRow.frequency_interval_days);
      nextDueDate = due.toISOString().slice(0, 10);
    }

    const certificateUrl = `${source_file_bucket}:${source_file_path}`;

    const { data: inserted, error: insertErr } = await supabase
      .from("vendor_service_records")
      .insert({
        organization_id,
        location_id,
        safeguard_type,
        service_type_code,
        vendor_name,
        service_date,
        cert_number,
        vendor_id: vendor_id ?? null,
        technician_name: technician_name ?? null,
        certificate_url: certificateUrl,
        next_due_date: nextDueDate,
        source: "evidentiary_seal",
        sealed_by: sealedBy,
        sealed_at: sealedAtCanonical,
        content_hash: contentHash,
        captured_lat: captured_lat ?? null,
        captured_lng: captured_lng ?? null,
        captured_address: captured_address ?? null,
        price_charged: price_charged ?? null,
        notes: notes ?? null,
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

    // ── STEP 10b: UPDATE SCHEDULE ───────────────────────────────────────
    // Advance last_service_date + next_due_date on the schedule so the
    // Fire Protection page reflects the seal immediately. Mirrors the
    // hoodops-webhook and confirm-seal-service pattern.
    if (lssRow) {
      await supabase
        .from("location_service_schedules")
        .update({
          last_service_date: service_date as string,
          next_due_date: nextDueDate,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organization_id)
        .eq("location_id", location_id)
        .eq("service_type_code", service_type_code)
        .eq("is_active", true);
    }

    // ── STEP 11: RETURN ─────────────────────────────────────────────────
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
    console.error("seal-service-record unhandled error:", err);
    return jsonResponse(
      { error: "Internal error", detail: (err as Error).message },
      500,
      corsHeaders,
    );
  }
});
