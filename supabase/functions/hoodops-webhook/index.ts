// ═══════════════════════════════════════════════════════════
// hoodops-webhook — HOODOPS-SERVICES-01 + AUDIT-FIX-07 / H-3, H-4
//                   + RESCHEDULE-EVIDLY-01
//                   + DOCUMENT-BRIDGE-01
//
// Receives webhook events from HoodOps platform:
//   - service.completed → upsert vendor_service_records + upsert schedule
//   - service.scheduled → upsert location_service_schedules
//   - reschedule.confirmed → confirm pending reschedule + update schedule
//   - reschedule.declined  → decline pending reschedule
//   - reschedule.updated   → vendor proposes alternative date
//   - document.report      → fetch PDF, create compliance_documents, seal
//   - document.cert        → same, chained from report via supersedes_id
//
// H-3: Idempotency via event_id (deterministic if not provided by HoodOps)
// H-4: All calls logged to platform_audit_log
// No JWT verification — external webhook. Uses HMAC-SHA256 signature.
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOrgNotification } from "../_shared/notify.ts";
import {
  canonicalTimestamp,
  buildCanonicalServiceJson,
  buildSealHashInput,
  sha256,
} from "../_shared/seal-canonicalization.ts";

// Maps HoodOps service_type_code → PSE safeguard_type
const SERVICE_CODE_TO_SAFEGUARD: Record<string, string> = {
  KEC: "hood_cleaning",
  FPM: "hood_cleaning",
  GFX: "hood_cleaning",
  RGC: "hood_cleaning",
  // FS removed — fire suppression integrates via future dedicated app
};

const FREQUENCY_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  semi_annual: 180,
  annual: 365,
};

/** Constant-time string comparison to prevent timing side-channels. */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  let result = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

/** Compute HMAC-SHA256 and return lowercase hex digest. */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function calculateNextDue(serviceDate: string, frequency: string): string {
  const days = FREQUENCY_DAYS[frequency] || 90;
  const d = new Date(serviceDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify HMAC-SHA256 signature — fail CLOSED: reject if secret is missing
  const secret = Deno.env.get("HOODOPS_WEBHOOK_SECRET");
  if (!secret) {
    console.error("[hoodops-webhook] HOODOPS_WEBHOOK_SECRET is not configured — rejecting request");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Read raw body BEFORE parsing — HMAC must match the exact bytes HoodOps signed
  const rawBody = await req.text();

  const signatureHeader = req.headers.get("x-hoodops-signature");
  if (!signatureHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const expectedSignature = await hmacSha256Hex(secret, rawBody);
  if (!timingSafeEqual(expectedSignature, signatureHeader)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { event, data } = body;
  if (!event || !data) {
    return new Response(
      JSON.stringify({ error: "Missing event or data" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── DOCUMENT-BRIDGE-01: Document events route to dedicated handler ──
  if (event === "document.report" || event === "document.cert") {
    return await handleDocumentEvent(supabase, body, event);
  }

  const {
    organization_id,
    location_id,
    service_type_code,
    vendor_name,
    frequency,
    service_date,
    technician_name,
    price_charged,
    certificate_url,
    notes,
  } = data;

  // Validate required fields
  if (!organization_id || !location_id || !service_type_code) {
    return new Response(
      JSON.stringify({ error: "Missing organization_id, location_id, or service_type_code" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // AUDIT-FIX-07 / H-3: Deterministic event_id for idempotency
  const effectiveDate = service_date || new Date().toISOString().split("T")[0];
  const eventId = data.event_id ||
    `${organization_id}-${location_id}-${service_type_code}-${effectiveDate}`;

  // H-4: Audit logging helper — routes through log_audit_event RPC
  const logAudit = async (success: boolean, errorMessage?: string) => {
    const { error } = await supabase.rpc("log_audit_event", {
      p_action: "edge_fn.hoodops_webhook",
      p_organization_id: organization_id,
      p_resource_type: "vendor_service_record",
      p_resource_id: eventId,
      p_success: success,
      p_error_message: errorMessage || null,
      p_metadata: {
        event,
        service_type_code,
        location_id,
      },
    });
    if (error) {
      console.error("[hoodops-webhook] Audit log failed:", error.message);
    }
  };

  try {
    if (event === "service.completed") {
      // Unmapped codes: log and acknowledge with 200 (never 4xx) to prevent retry loop
      const safeguardType = SERVICE_CODE_TO_SAFEGUARD[service_type_code];
      if (safeguardType === undefined) {
        console.log(
          `[hoodops-webhook] Unmapped service_type_code: ${service_type_code}. ` +
          `Acknowledging with 200 to prevent retry loop. Event will not be persisted.`
        );
        await logAudit(false, `Unmapped service_type_code: ${service_type_code}`);
        return new Response(
          JSON.stringify({ received: true, processed: false, reason: "unmapped_service_type_code" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      // AUDIT-FIX-07 / H-3: Upsert with event_id for idempotency (was insert)
      const { data: serviceRecord, error: upsertRecordError } = await supabase
        .from("vendor_service_records")
        .upsert({
          event_id: eventId,
          organization_id,
          location_id,
          service_type_code,
          safeguard_type: safeguardType,
          vendor_name: vendor_name || "HoodOps Partner",
          technician_name: technician_name || null,
          service_date: effectiveDate,
          price_charged: price_charged || null,
          certificate_url: certificate_url || null,
          notes: notes || null,
          source: "hoodops",
          webhook_payload: body,
        }, { onConflict: "event_id" })
        .select("id")
        .single();

      if (upsertRecordError) {
        console.error("Upsert record error:", upsertRecordError);
        await logAudit(false, upsertRecordError.message);
        return new Response(
          JSON.stringify({ error: "Failed to upsert service record", detail: upsertRecordError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      // Upsert schedule
      const nextDue = calculateNextDue(effectiveDate, frequency || "quarterly");

      const { error: upsertError } = await supabase
        .from("location_service_schedules")
        .upsert(
          {
            organization_id,
            location_id,
            service_type_code,
            vendor_name: vendor_name || "HoodOps Partner",
            frequency: frequency || "quarterly",
            last_service_date: effectiveDate,
            next_due_date: nextDue,
            negotiated_price: price_charged || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,location_id,service_type_code" },
        );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      }

      // M4: Notify client that service was completed
      await createOrgNotification({
        supabase,
        organizationId: organization_id,
        type: "service_completed",
        category: "vendors",
        title: `Service completed — ${service_type_code}`,
        body: `${vendor_name || "Vendor"} completed ${service_type_code} service on ${effectiveDate}.${certificate_url ? " Certificate available." : ""}`,
        actionUrl: "/services",
        actionLabel: "View Record",
        priority: "high",
        severity: "info",
        sourceType: "vendor_service_record",
        sourceId: serviceRecord?.id || undefined,
        roleFilter: ["owner_operator", "compliance_manager", "facilities_manager"],
      }).catch(() => {});

      await logAudit(true);
      return new Response(
        JSON.stringify({ ok: true, event: "service.completed", event_id: eventId, next_due: nextDue }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (event === "service.scheduled") {
      const nextDue = data.scheduled_date || calculateNextDue(
        new Date().toISOString().split("T")[0],
        frequency || "quarterly",
      );

      const { data: schedule, error: upsertError } = await supabase
        .from("location_service_schedules")
        .upsert(
          {
            organization_id,
            location_id,
            service_type_code,
            vendor_name: vendor_name || "HoodOps Partner",
            frequency: frequency || "quarterly",
            next_due_date: nextDue,
            negotiated_price: price_charged || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,location_id,service_type_code" },
        )
        .select("id")
        .single();

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        await logAudit(false, upsertError.message);
        return new Response(
          JSON.stringify({ error: "Failed to upsert schedule", detail: upsertError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      // M2: Notify client that service is booked/confirmed
      await createOrgNotification({
        supabase,
        organizationId: organization_id,
        type: "service_scheduled",
        category: "vendors",
        title: `Service scheduled — ${service_type_code}`,
        body: `${vendor_name || "Vendor"} confirmed ${service_type_code} service for ${nextDue}.`,
        actionUrl: "/services",
        actionLabel: "View Schedule",
        priority: "high",
        severity: "info",
        sourceType: "service_schedule",
        sourceId: schedule?.id || undefined,
        roleFilter: ["owner_operator", "compliance_manager", "facilities_manager"],
      }).catch(() => {});

      await logAudit(true);
      return new Response(
        JSON.stringify({ ok: true, event: "service.scheduled", event_id: eventId, next_due: nextDue }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── RESCHEDULE-EVIDLY-01: Reschedule lifecycle events ──────

    if (event === "reschedule.confirmed") {
      // Find pending reschedule for this service at this location
      const { data: pending, error: findErr } = await supabase
        .from("service_reschedule_requests")
        .select("id, requested_date, service_type_code")
        .eq("organization_id", organization_id)
        .eq("location_id", location_id)
        .eq("service_type_code", service_type_code)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (findErr || !pending) {
        await logAudit(false, findErr?.message || "No pending reschedule found");
        return new Response(
          JSON.stringify({ error: "No pending reschedule found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      const confirmedDate = data.confirmed_date || pending.requested_date;

      // Update reschedule request
      await supabase
        .from("service_reschedule_requests")
        .update({
          status: "confirmed",
          confirmed_by: "webhook",
          vendor_confirmed_date: confirmedDate,
          vendor_response_notes: data.response_notes || null,
        })
        .eq("id", pending.id);

      // Update the service schedule's next_due_date
      await supabase
        .from("location_service_schedules")
        .update({
          next_due_date: confirmedDate,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organization_id)
        .eq("location_id", location_id)
        .eq("service_type_code", service_type_code);

      // Notification
      await createOrgNotification({
        supabase,
        organizationId: organization_id,
        type: "service_reschedule_confirmed",
        category: "vendors",
        title: `Service rescheduled — ${service_type_code} confirmed for ${confirmedDate}`,
        body: `Vendor confirmed the reschedule for ${confirmedDate}.`,
        actionUrl: "/services",
        actionLabel: "View Services",
        priority: "high",
        severity: "info",
        sourceType: "reschedule_request",
        sourceId: pending.id,
        roleFilter: ["owner_operator", "compliance_manager", "facilities_manager"],
      }).catch(() => {});

      await logAudit(true);
      return new Response(
        JSON.stringify({ ok: true, event: "reschedule.confirmed", reschedule_id: pending.id, confirmed_date: confirmedDate }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (event === "reschedule.declined") {
      const { data: pending, error: findErr } = await supabase
        .from("service_reschedule_requests")
        .select("id, service_type_code")
        .eq("organization_id", organization_id)
        .eq("location_id", location_id)
        .eq("service_type_code", service_type_code)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (findErr || !pending) {
        await logAudit(false, findErr?.message || "No pending reschedule found");
        return new Response(
          JSON.stringify({ error: "No pending reschedule found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      await supabase
        .from("service_reschedule_requests")
        .update({
          status: "declined",
          vendor_response_notes: data.response_notes || null,
        })
        .eq("id", pending.id);

      await createOrgNotification({
        supabase,
        organizationId: organization_id,
        type: "service_reschedule_declined",
        category: "vendors",
        title: `Reschedule declined — ${service_type_code}`,
        body: data.response_notes || "Vendor declined the reschedule request.",
        actionUrl: "/services",
        actionLabel: "View Services",
        priority: "medium",
        severity: "advisory",
        sourceType: "reschedule_request",
        sourceId: pending.id,
        roleFilter: ["owner_operator", "compliance_manager", "facilities_manager"],
      }).catch(() => {});

      await logAudit(true);
      return new Response(
        JSON.stringify({ ok: true, event: "reschedule.declined", reschedule_id: pending.id }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (event === "reschedule.updated") {
      const { data: pending, error: findErr } = await supabase
        .from("service_reschedule_requests")
        .select("id, service_type_code")
        .eq("organization_id", organization_id)
        .eq("location_id", location_id)
        .eq("service_type_code", service_type_code)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (findErr || !pending) {
        await logAudit(false, findErr?.message || "No pending reschedule found");
        return new Response(
          JSON.stringify({ error: "No pending reschedule found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      const proposedDate = data.proposed_date || null;

      await supabase
        .from("service_reschedule_requests")
        .update({
          vendor_confirmed_date: proposedDate,
          vendor_response_notes: data.response_notes || null,
        })
        .eq("id", pending.id);

      await createOrgNotification({
        supabase,
        organizationId: organization_id,
        type: "service_reschedule_updated",
        category: "vendors",
        title: `Vendor proposed new date for ${service_type_code}`,
        body: proposedDate
          ? `Vendor proposed ${proposedDate} instead.`
          : "Vendor sent updated information.",
        actionUrl: "/services",
        actionLabel: "View Services",
        priority: "medium",
        severity: "info",
        sourceType: "reschedule_request",
        sourceId: pending.id,
        roleFilter: ["owner_operator", "compliance_manager", "facilities_manager"],
      }).catch(() => {});

      await logAudit(true);
      return new Response(
        JSON.stringify({ ok: true, event: "reschedule.updated", reschedule_id: pending.id, proposed_date: proposedDate }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    await logAudit(false, `Unknown event: ${event}`);
    return new Response(
      JSON.stringify({ error: `Unknown event: ${event}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Webhook error:", err);
    await logAudit(false, String(err));
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT-BRIDGE-01 — Handle document.report and document.cert events
//
// Flow: sync gate → find-or-create org → find-or-create location →
//       dedup check → fetch PDF → upload to storage → create compliance_documents →
//       seal vendor_service_records → update schedule → return IDs
//
// Seal path: DIRECT INLINE — same SHA-256 algorithm as seal-service-record but
// without JWT auth (webhook uses shared secret). sealed_by = platform_admin UUID.
//
// Idempotency: compliance_documents UNIQUE(external_source, external_id).
// Replaying the same event returns 200 with idempotent=true.
//
// Cert chaining: document.cert finds the report's sealed vendor_service_records
// row via compliance_documents.bridged_service_id, uses its content_hash as
// predecessor hash, and sets supersedes_id to create a cryptographic chain.
// ═══════════════════════════════════════════════════════════════════════════════

function jsonResp(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleDocumentEvent(
  supabase: ReturnType<typeof createClient>,
  body: { event: string; data: Record<string, any> },
  event: string,
): Promise<Response> {
  const { data } = body;

  const {
    evidly_operator_id,
    evidly_location_id,
    hoodops_client_id,
    hoodops_location_id,
    sync_enabled,
    client_name,
    client_phone,
    client_email,
    location_name,
    location_address,
    location_city,
    location_state,
    location_zip,
    service_type_code,
    service_date,
    next_service_due,
    vendor_name,
    technician_name,
    cert_number,
    document_url,
    hoodops_document_id,
    report_document_id,
    frequency,
  } = data;

  // ── 1. Sync gate ─────────────────────────────────────────────
  if (sync_enabled === false) {
    return jsonResp({
      received: true,
      processed: false,
      reason: "sync_disabled",
    }, 200);
  }

  // ── 2. Validate required fields ──────────────────────────────
  if (!hoodops_client_id || !hoodops_location_id || !service_date || !document_url || !hoodops_document_id) {
    return jsonResp({
      error: "Missing required fields: hoodops_client_id, hoodops_location_id, service_date, document_url, hoodops_document_id",
    }, 400);
  }

  const effectiveServiceCode = service_type_code || "KEC";

  // Document-specific audit logger (org resolved later)
  let resolvedOrgId: string | null = null;
  const logDocAudit = async (success: boolean, errorMessage?: string) => {
    await supabase.rpc("log_audit_event", {
      p_action: `edge_fn.hoodops_webhook.${event}`,
      p_organization_id: resolvedOrgId,
      p_resource_type: "compliance_document",
      p_resource_id: hoodops_document_id,
      p_success: success,
      p_error_message: errorMessage || null,
      p_metadata: { event, hoodops_client_id, hoodops_location_id, service_type_code: effectiveServiceCode },
    }).catch((e: any) => console.error("[hoodops-webhook] Audit log failed:", e.message));
  };

  try {
    // ── 3. Find-or-create organization ───────────────────────────
    let orgId: string | null = evidly_operator_id || null;

    if (orgId) {
      // Verify it exists
      const { data: org } = await supabase
        .from("organizations").select("id").eq("id", orgId).maybeSingle();
      if (!org) orgId = null; // fall through to lookup
    }

    if (!orgId) {
      // Lookup by external identity
      const { data: extOrg } = await supabase
        .from("organizations").select("id")
        .eq("external_source", "hoodops")
        .eq("external_id", hoodops_client_id)
        .maybeSingle();

      if (extOrg) {
        orgId = extOrg.id;
      }
    }

    // Fallback: adopt existing unlinked org by primary_contact_email
    if (!orgId && client_email) {
      const { data: emailOrg } = await supabase
        .from("organizations").select("id")
        .ilike("primary_contact_email", client_email.trim())
        .is("external_source", null)
        .limit(1)
        .maybeSingle();

      if (emailOrg) {
        orgId = emailOrg.id;
        console.log(`[hoodops-webhook] Adopted existing org ${orgId} via primary_contact_email match`);
      }
    }

    if (!orgId) {
      // Auto-create — no existing org matched
      const { data: newOrg, error: orgErr } = await supabase
        .from("organizations")
        .insert({
          name: client_name || `HoodOps Client ${hoodops_client_id}`,
          industry_type: "Restaurant",
          external_source: "hoodops",
          external_id: hoodops_client_id,
          primary_contact_phone: client_phone || null,
          primary_contact_email: client_email || null,
        })
        .select("id")
        .single();

      if (orgErr || !newOrg) {
        await logDocAudit(false, orgErr?.message || "Org creation failed");
        return jsonResp({ error: "Failed to create organization", detail: orgErr?.message }, 500);
      }
      orgId = newOrg.id;
    }

    // Backfill external identity if org existed but lacked it
    await supabase
      .from("organizations")
      .update({ external_source: "hoodops", external_id: hoodops_client_id })
      .eq("id", orgId)
      .is("external_source", null);

    resolvedOrgId = orgId;

    // ── 4. Find-or-create location ───────────────────────────────
    let locId: string | null = evidly_location_id || null;

    if (locId) {
      const { data: loc } = await supabase
        .from("locations").select("id").eq("id", locId).maybeSingle();
      if (!loc) locId = null;
    }

    if (!locId) {
      const { data: extLoc } = await supabase
        .from("locations").select("id")
        .eq("external_source", "hoodops")
        .eq("external_id", hoodops_location_id)
        .maybeSingle();

      if (extLoc) {
        locId = extLoc.id;
      }
    }

    // Fallback: adopt existing unlinked location by address within the resolved org
    if (!locId && location_address) {
      const { data: addrLoc } = await supabase
        .from("locations").select("id")
        .eq("organization_id", orgId)
        .ilike("address", location_address.trim())
        .is("external_source", null)
        .limit(1)
        .maybeSingle();

      if (addrLoc) {
        locId = addrLoc.id;
        console.log(`[hoodops-webhook] Adopted existing location ${locId} via address match within org ${orgId}`);
      }
    }

    if (!locId) {
      // Derive jurisdiction from city → county lookup
      const locCity = (location_city || "").trim();
      const locState = location_state || "CA";
      let derivedJurisdictionId: string | null = null;

      if (locCity && locState) {
        // Try city-level jurisdiction first, fall back to county-level
        const { data: cityJ } = await supabase
          .from("jurisdictions")
          .select("id")
          .eq("state", locState)
          .ilike("city", locCity)
          .limit(1)
          .maybeSingle();

        if (cityJ) {
          derivedJurisdictionId = cityJ.id;
        } else {
          // County-level: look up county from city name pattern in jurisdictions
          const { data: countyJ } = await supabase
            .from("jurisdictions")
            .select("id, county")
            .eq("state", locState)
            .is("city", null)
            .order("county");

          // Zip-prefix county mapping for known CA regions
          const zipCountyMap: Record<string, string> = {
            "936": "Fresno", "937": "Fresno",
            "933": "Kern",
            "953": "Merced", "954": "Merced",
            "952": "Stanislaus",
            "951": "Madera",
            "934": "San Luis Obispo",
            "935": "Tulare",
          };
          const zip3 = (location_zip || "").substring(0, 3);
          const countyFromZip = zipCountyMap[zip3];

          if (countyFromZip && countyJ) {
            const match = countyJ.find((j: { county: string }) =>
              j.county?.toLowerCase() === countyFromZip.toLowerCase()
            );
            if (match) derivedJurisdictionId = match.id;
          }
        }
      }

      const insertPayload: Record<string, unknown> = {
        organization_id: orgId,
        name: location_name || "Main Kitchen",
        address: location_address || null,
        city: location_city || null,
        state: locState,
        zip: location_zip || null,
        external_source: "hoodops",
        external_id: hoodops_location_id,
        status: "active",
      };
      if (derivedJurisdictionId) {
        insertPayload.jurisdiction_id = derivedJurisdictionId;
      }

      const { data: newLoc, error: locErr } = await supabase
        .from("locations")
        .insert(insertPayload)
        .select("id")
        .single();

      if (locErr || !newLoc) {
        await logDocAudit(false, locErr?.message || "Location creation failed");
        return jsonResp({ error: "Failed to create location", detail: locErr?.message }, 500);
      }
      locId = newLoc.id;

      // Seed location_jurisdictions rows if jurisdiction was derived
      if (derivedJurisdictionId) {
        await supabase.from("location_jurisdictions").insert([
          { location_id: locId, jurisdiction_id: derivedJurisdictionId, jurisdiction_layer: "food_safety", auto_detected: true },
          { location_id: locId, jurisdiction_id: derivedJurisdictionId, jurisdiction_layer: "fire_safety", auto_detected: true },
        ]);
      }
    }

    // Backfill external identity on location if missing
    await supabase
      .from("locations")
      .update({ external_source: "hoodops", external_id: hoodops_location_id })
      .eq("id", locId)
      .is("external_source", null);

    // ── 4b. Find-or-create vendor ────────────────────────────────
    //    Normalized lookup (trim + case-insensitive) so "Cleaning Pros Plus"
    //    and "CLEANING PROS PLUS" resolve to the same row.
    //    MUST happen before step 8 (compliance_documents) and step 9 (seal)
    //    because vendor_id is part of the seal's canonical JSON — resolving
    //    it after sealing would break the hash, and the immutability trigger
    //    blocks updates on sealed records.
    let vendorId: string | null = null;
    const rawVendorName = (vendor_name || "").trim();

    if (rawVendorName) {
      const { data: existingVendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("organization_id", orgId)
        .ilike("company_name", rawVendorName)
        .maybeSingle();

      if (existingVendor) {
        vendorId = existingVendor.id;
      } else {
        const { data: newVendor, error: vendorErr } = await supabase
          .from("vendors")
          .insert({
            organization_id: orgId,
            company_name: rawVendorName,
            category: "hood_cleaning",
            status: "active",
          })
          .select("id")
          .single();

        if (vendorErr || !newVendor) {
          console.error("[hoodops-webhook] Vendor creation failed:", vendorErr?.message);
          // Non-fatal: proceed without vendor_id — seal still valid, just no FK join
        } else {
          vendorId = newVendor.id;
        }
      }
    }

    // ── 5. Idempotency check ─────────────────────────────────────
    const externalDocId = `${event}:${hoodops_document_id}`;
    const { data: existingDoc } = await supabase
      .from("compliance_documents").select("id")
      .eq("external_source", "hoodops")
      .eq("external_id", externalDocId)
      .maybeSingle();

    if (existingDoc) {
      return jsonResp({
        ok: true,
        event,
        idempotent: true,
        organization_id: orgId,
        location_id: locId,
        document_id: existingDoc.id,
      }, 200);
    }

    // ── 6. Fetch PDF from HoodOps ────────────────────────────────
    let pdfBytes: ArrayBuffer;
    try {
      const pdfRes = await fetch(document_url, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!pdfRes.ok) {
        await logDocAudit(false, `PDF fetch failed: HTTP ${pdfRes.status}`);
        return jsonResp({ error: "Failed to fetch document", http_status: pdfRes.status }, 502);
      }
      pdfBytes = await pdfRes.arrayBuffer();
    } catch (fetchErr: any) {
      await logDocAudit(false, `PDF fetch error: ${fetchErr.message}`);
      return jsonResp({ error: "Document fetch failed", detail: fetchErr.message }, 502);
    }

    // ── 7. Upload to Supabase storage ────────────────────────────
    const storageBucket = "documents";
    const storagePath = `hoodops/${orgId}/${externalDocId}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from(storageBucket)
      .upload(storagePath, new Uint8Array(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      await logDocAudit(false, `Storage upload failed: ${uploadErr.message}`);
      return jsonResp({ error: "Failed to upload document", detail: uploadErr.message }, 500);
    }

    // ── 8. Create compliance_documents row ────────────────────────
    const docLabel = event === "document.cert" ? "Certificate" : "Report";
    const effectiveCertNumber = cert_number || "NONE";

    const { data: compDoc, error: docErr } = await supabase
      .from("compliance_documents")
      .insert({
        organization_id: orgId,
        location_id: locId,
        category: "service",
        type: "KEC",
        name: `Hood Cleaning ${docLabel} — ${service_date}`,
        status: "current",
        service_type_code: effectiveServiceCode,
        storage_path: `${storageBucket}/${storagePath}`,
        mime_type: "application/pdf",
        file_size_bytes: pdfBytes.byteLength,
        issued_date: service_date,
        expiry_date: next_service_due || null,
        vendor_id: vendorId,
        import_source: "api",
        import_source_metadata: { source: "hoodops_webhook", hoodops_document_id, event, document_url },
        external_source: "hoodops",
        external_id: externalDocId,
      })
      .select("id")
      .single();

    if (docErr || !compDoc) {
      await logDocAudit(false, docErr?.message || "Document creation failed");
      return jsonResp({ error: "Failed to create document", detail: docErr?.message }, 500);
    }

    // ── 9. Seal — direct inline (same algorithm as seal-service-record) ──
    const safeguardType = SERVICE_CODE_TO_SAFEGUARD[effectiveServiceCode] || "hood_cleaning";
    const sealedAtCanonical = canonicalTimestamp(new Date());

    // sealed_by = platform_admin (FK to auth.users required)
    const { data: sysUser } = await supabase
      .from("user_profiles").select("id")
      .eq("role", "platform_admin")
      .limit(1)
      .maybeSingle();

    if (!sysUser) {
      await logDocAudit(false, "No platform_admin user found for seal");
      return jsonResp({ error: "Cannot seal: no platform_admin user" }, 500);
    }
    const sealedBy = sysUser.id;

    // Predecessor hash — cert chains from report
    let predecessorHash = "";
    let supersedesId: string | null = null;

    if (event === "document.cert" && report_document_id) {
      const reportExtId = `document.report:${report_document_id}`;
      const { data: reportDoc } = await supabase
        .from("compliance_documents").select("bridged_service_id")
        .eq("external_source", "hoodops")
        .eq("external_id", reportExtId)
        .maybeSingle();

      if (reportDoc?.bridged_service_id) {
        const { data: reportSeal } = await supabase
          .from("vendor_service_records").select("id, content_hash")
          .eq("id", reportDoc.bridged_service_id)
          .maybeSingle();

        if (reportSeal?.content_hash) {
          predecessorHash = reportSeal.content_hash;
          supersedesId = reportSeal.id;
        }
      }
    }

    // Canonical JSON (9-field immutable key order)
    const canonicalJson = buildCanonicalServiceJson({
      location_id: locId,
      safeguard_type: safeguardType,
      service_type_code: effectiveServiceCode,
      vendor_name: vendor_name || "HoodOps Partner",
      vendor_id: vendorId,
      technician_name: technician_name || null,
      cert_number: effectiveCertNumber,
      service_date,
      organization_id: orgId,
    });

    // SHA-256 hash
    const hashInput = buildSealHashInput(
      pdfBytes,
      canonicalJson,
      sealedAtCanonical,
      sealedBy,
      predecessorHash,
    );
    const contentHash = await sha256(hashInput.buffer as ArrayBuffer);

    // Retention lookup
    const { data: retPolicy } = await supabase
      .from("retention_policies").select("retention_years")
      .eq("record_type", "fire_service_record")
      .is("jurisdiction_id", null)
      .maybeSingle();

    const retentionYears = retPolicy?.retention_years ? Number(retPolicy.retention_years) : 3;
    const clockDate = new Date(sealedAtCanonical);
    const retentionUntil = new Date(clockDate);
    retentionUntil.setFullYear(retentionUntil.getFullYear() + retentionYears);

    // Next due date
    const nextDueDate = next_service_due || calculateNextDue(service_date, frequency || "quarterly");

    // INSERT sealed vendor_service_records (not upsert — immutable trigger blocks updates)
    const { data: sealedRecord, error: sealErr } = await supabase
      .from("vendor_service_records")
      .insert({
        organization_id: orgId,
        location_id: locId,
        safeguard_type: safeguardType,
        service_type_code: effectiveServiceCode,
        vendor_name: vendor_name || "HoodOps Partner",
        vendor_id: vendorId,
        technician_name: technician_name || null,
        cert_number: effectiveCertNumber,
        service_date,
        certificate_url: `${storageBucket}:${storagePath}`,
        next_due_date: nextDueDate,
        source: "evidentiary_seal",
        sealed_by: sealedBy,
        sealed_at: sealedAtCanonical,
        content_hash: contentHash,
        lifecycle_state: "live",
        retention_until: retentionUntil.toISOString(),
        supersedes_id: supersedesId,
        notes: `HoodOps ${docLabel} — sealed automatically on receipt`,
        webhook_payload: body,
      })
      .select("id, content_hash, sealed_at")
      .single();

    if (sealErr || !sealedRecord) {
      await logDocAudit(false, sealErr?.message || "Seal insert failed");
      return jsonResp({ error: "Failed to seal record", detail: sealErr?.message }, 500);
    }

    // Link compliance_documents → sealed record
    await supabase
      .from("compliance_documents")
      .update({
        bridged_service_id: sealedRecord.id,
        metadata: { seal_record_id: sealedRecord.id, sealed_at: sealedRecord.sealed_at },
      })
      .eq("id", compDoc.id);

    // ── 10. Update service schedule ──────────────────────────────
    await supabase
      .from("location_service_schedules")
      .upsert({
        organization_id: orgId,
        location_id: locId,
        service_type_code: effectiveServiceCode,
        vendor_name: vendor_name || "HoodOps Partner",
        frequency: frequency || "quarterly",
        last_service_date: service_date,
        next_due_date: nextDueDate,
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id,location_id,service_type_code" });

    // ── 11. Notify client (in-app only — no email, no user provisioning) ──
    const notifyResult = await createOrgNotification({
      supabase,
      organizationId: orgId,
      type: "document_received",
      category: "vendors",
      title: `Hood Cleaning ${docLabel} received and sealed`,
      body: `${vendor_name || "Vendor"} ${docLabel.toLowerCase()} for ${service_date} has been sealed with evidentiary hash.`,
      actionUrl: "/services",
      actionLabel: "View Record",
      priority: "high",
      severity: "info",
      sourceType: "compliance_document",
      sourceId: compDoc.id,
      roleFilter: ["owner_operator", "compliance_manager", "facilities_manager"],
    }).catch((err: any) => {
      console.error(`[hoodops-webhook] Notification failed for org ${orgId}:`, err?.message || err);
      return { count: 0, emailCount: 0 };
    });

    if (notifyResult.count === 0) {
      console.warn(`[hoodops-webhook] Notification resolved to zero recipients for org ${orgId}`);
    }

    await logDocAudit(true);

    return jsonResp({
      ok: true,
      event,
      organization_id: orgId,
      location_id: locId,
      document_id: compDoc.id,
      sealed_record_id: sealedRecord.id,
      content_hash: sealedRecord.content_hash,
      sealed_at: sealedRecord.sealed_at,
    }, 201);
  } catch (err: any) {
    console.error(`[hoodops-webhook] ${event} error:`, err);
    await logDocAudit(false, err.message || String(err));
    return jsonResp({ error: "Internal error", detail: err.message }, 500);
  }
}
