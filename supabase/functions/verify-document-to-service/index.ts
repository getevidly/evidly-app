import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// verify-document-to-service — B1-A Bridge
//
// Client verifies a fire-safety compliance document (uploaded by vendor via
// secure link). Creates a vendor_service_record + updates the schedule so
// the document flows to the Fire Protection page.
//
// Model: vendors upload certs → AI extracts advisory metadata → client VERIFIES.
// Human (client) verify = the gate. No AI writes compliance.
//
// Dedup: deterministic event_id = org-location-code-date.
//        UNIQUE constraint on vendor_service_records.event_id prevents duplicates.
//        Immutability trigger blocks UPDATE, so we INSERT-or-skip (not UPSERT).
//        A later HoodOps webhook for the same service shares the event_id pattern,
//        so it will also be deduped (its insert will conflict and it handles errors).
//
// INPUT:
//   document_id       — compliance_documents.id to verify
//   service_type_code — fire code: KEC | FS | FA | SP | FE
//   service_date      — YYYY-MM-DD confirmed by client
//   vendor_id         — optional override; falls back to doc.vendor_id
//
// RETURNS: { vsr_id, event_id, schedule, next_due_date }
// ═══════════════════════════════════════════════════════════════════════════════

const FIRE_CODES = new Set(["KEC", "FS", "FA", "SP", "FE"]);

const CODE_TO_SAFEGUARD: Record<string, string> = {
  KEC: "hood_cleaning",
  FS: "fire_suppression",
  FA: "fire_alarm",
  SP: "sprinklers",
  FE: "fire_extinguisher",
};

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
    // ── AUTH ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return jsonResponse({ error: "Unauthorized — valid JWT required" }, 401, corsHeaders);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // ── PARSE INPUT ──────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    const {
      document_id,
      service_type_code,
      service_date,
      vendor_id,
    } = body as Record<string, string>;

    if (!document_id) {
      return jsonResponse({ error: "Missing required field: document_id" }, 400, corsHeaders);
    }
    if (!service_type_code) {
      return jsonResponse({ error: "Missing required field: service_type_code" }, 400, corsHeaders);
    }
    if (!service_date || !/^\d{4}-\d{2}-\d{2}$/.test(service_date)) {
      return jsonResponse({ error: "service_date must be YYYY-MM-DD" }, 400, corsHeaders);
    }

    // ── GUARD: fire service types only ───────────────────────────────────
    if (!FIRE_CODES.has(service_type_code)) {
      return jsonResponse(
        {
          error: `service_type_code '${service_type_code}' is not a fire service type`,
          allowed: [...FIRE_CODES],
        },
        400,
        corsHeaders,
      );
    }

    const safeguard_type = CODE_TO_SAFEGUARD[service_type_code];

    // ── FETCH DOCUMENT ───────────────────────────────────────────────────
    const { data: doc, error: docErr } = await supabase
      .from("compliance_documents")
      .select(
        "id, organization_id, location_id, category, status, storage_path, " +
        "vendor_id, metadata, bridged_service_id",
      )
      .eq("id", document_id)
      .single();

    if (docErr || !doc) {
      return jsonResponse({ error: "Document not found" }, 404, corsHeaders);
    }

    // ── ORG MEMBERSHIP ───────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.organization_id !== doc.organization_id) {
      return jsonResponse({ error: "You do not have access to this document" }, 403, corsHeaders);
    }

    // ── DOCUMENT GUARDS ──────────────────────────────────────────────────
    if (doc.category !== "vendor_service") {
      return jsonResponse(
        { error: "Only vendor_service documents can be verified to fire service records" },
        400,
        corsHeaders,
      );
    }
    if (!doc.location_id) {
      return jsonResponse({ error: "Document has no location_id; cannot bridge" }, 400, corsHeaders);
    }
    if (!doc.storage_path) {
      return jsonResponse({ error: "Document has no uploaded file" }, 400, corsHeaders);
    }
    if (doc.bridged_service_id) {
      return jsonResponse(
        { error: "Already bridged", bridged_service_id: doc.bridged_service_id },
        409,
        corsHeaders,
      );
    }

    // ── RESOLVE VENDOR NAME ──────────────────────────────────────────────
    const effectiveVendorId = vendor_id || doc.vendor_id;
    let vendorName = "Vendor";
    if (effectiveVendorId) {
      const { data: v } = await supabase
        .from("vendors")
        .select("company_name")
        .eq("id", effectiveVendorId)
        .maybeSingle();
      if (v?.company_name) vendorName = v.company_name;
    }

    // ── CERT NUMBER FROM AI METADATA (advisory, client-confirmed) ────────
    const extraction = (doc.metadata as Record<string, unknown>)?.service_extraction as
      Record<string, unknown> | undefined;
    const certNumber: string | null = (extraction?.cert_number as string) || null;

    // ── DETERMINISTIC EVENT ID (same pattern as hoodops-webhook) ─────────
    const eventId = `${doc.organization_id}-${doc.location_id}-${service_type_code}-${service_date}`;

    // ── CADENCE LOOKUP (same as seal-service-record) ─────────────────────
    let nextDueDate: string | null = null;
    const { data: lssRow } = await supabase
      .from("location_service_schedules")
      .select("id, frequency_interval_days")
      .eq("organization_id", doc.organization_id)
      .eq("location_id", doc.location_id)
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

    // ── INSERT VSR (dedup via event_id UNIQUE constraint) ────────────────
    // We use INSERT, not UPSERT, because the immutability trigger on
    // vendor_service_records blocks UPDATE. If event_id already exists the
    // UNIQUE constraint rejects the insert and we fall back to SELECT.
    const certificateUrl = `documents:${doc.storage_path}`;

    let vsrId: string;

    const { data: inserted, error: insertErr } = await supabase
      .from("vendor_service_records")
      .insert({
        event_id: eventId,
        organization_id: doc.organization_id,
        location_id: doc.location_id,
        safeguard_type,
        service_type_code,
        vendor_name: vendorName,
        vendor_id: effectiveVendorId || null,
        service_date,
        cert_number: certNumber,
        certificate_url: certificateUrl,
        next_due_date: nextDueDate,
        source: "document_bridge",
        notes: `Verified from compliance document ${doc.id}`,
      })
      .select("id")
      .single();

    if (insertErr) {
      // UNIQUE constraint on event_id → VSR already exists for this service event
      if (
        insertErr.code === "23505" ||
        insertErr.message?.includes("unique") ||
        insertErr.message?.includes("duplicate")
      ) {
        const { data: existing } = await supabase
          .from("vendor_service_records")
          .select("id")
          .eq("event_id", eventId)
          .single();
        if (!existing) {
          return jsonResponse(
            { error: "VSR insert failed and no existing row found", detail: insertErr.message },
            500,
            corsHeaders,
          );
        }
        vsrId = existing.id;
      } else {
        return jsonResponse(
          { error: "VSR insert failed", detail: insertErr.message },
          500,
          corsHeaders,
        );
      }
    } else {
      vsrId = inserted.id;
    }

    // ── UPDATE SCHEDULE ──────────────────────────────────────────────────
    // Mirror hoodops-webhook + confirm-seal-service: advance last/next dates.
    let scheduleStatus = "no_schedule";
    if (lssRow) {
      const { error: schedErr } = await supabase
        .from("location_service_schedules")
        .update({
          last_service_date: service_date,
          next_due_date: nextDueDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lssRow.id);

      scheduleStatus = schedErr ? "update_failed" : "updated";
      if (schedErr) {
        console.error("[verify-document-to-service] schedule update failed:", schedErr.message);
      }
    }

    // ── WRITE BACK TO DOCUMENT ───────────────────────────────────────────
    await supabase
      .from("compliance_documents")
      .update({
        service_type_code,
        bridged_service_id: vsrId,
        status: "current",
      })
      .eq("id", doc.id);

    // ── ACTIVITY LOG ─────────────────────────────────────────────────────
    try {
      await supabase.from("compliance_document_activity_log").insert({
        organization_id: doc.organization_id,
        document_id: doc.id,
        event_type: "verified_to_service",
        actor_user_id: user.id,
        actor_label: "Client verified",
        metadata: {
          service_type_code,
          service_date,
          vendor_name: vendorName,
          vsr_id: vsrId,
          event_id: eventId,
          schedule: scheduleStatus,
        },
      });
    } catch {
      // Non-critical — log failure does not block verification
    }

    // ── RETURN ───────────────────────────────────────────────────────────
    return jsonResponse(
      {
        success: true,
        vsr_id: vsrId,
        event_id: eventId,
        schedule: scheduleStatus,
        next_due_date: nextDueDate,
      },
      201,
      corsHeaders,
    );
  } catch (err) {
    console.error("verify-document-to-service unhandled error:", err);
    return jsonResponse(
      { error: "Internal error", detail: (err as Error).message },
      500,
      corsHeaders,
    );
  }
});
