// ═══════════════════════════════════════════════════════════
// hoodops-webhook — HOODOPS-SERVICES-01 + AUDIT-FIX-07 / H-3, H-4
//                   + RESCHEDULE-EVIDLY-01
//
// Receives webhook events from HoodOps platform:
//   - service.completed → upsert vendor_service_records + upsert schedule
//   - service.scheduled → upsert location_service_schedules
//   - reschedule.confirmed → confirm pending reschedule + update schedule
//   - reschedule.declined  → decline pending reschedule
//   - reschedule.updated   → vendor proposes alternative date
//
// H-3: Idempotency via event_id (deterministic if not provided by HoodOps)
// H-4: All calls logged to platform_audit_log
// No JWT verification — external webhook. Uses shared secret.
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOrgNotification } from "../_shared/notify.ts";

const VALID_SERVICE_CODES = ["KEC", "FPM", "GFX", "RGC", "FS"];

// Maps HoodOps service_type_code → PSE safeguard_type (null = not a PSE safeguard)
const SERVICE_CODE_TO_SAFEGUARD: Record<string, string | null> = {
  KEC: "hood_cleaning",
  FS:  "fire_suppression",
  FPM: null,
  GFX: null,
  RGC: null,
};

const FREQUENCY_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  semi_annual: 180,
  annual: 365,
};

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

  // Verify shared secret
  const secret = Deno.env.get("HOODOPS_WEBHOOK_SECRET");
  const authHeader = req.headers.get("x-webhook-secret");
  if (secret && authHeader !== secret) {
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
    body = await req.json();
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

  if (!VALID_SERVICE_CODES.includes(service_type_code)) {
    return new Response(
      JSON.stringify({ error: `Invalid service_type_code: ${service_type_code}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // AUDIT-FIX-07 / H-3: Deterministic event_id for idempotency
  const effectiveDate = service_date || new Date().toISOString().split("T")[0];
  const eventId = data.event_id ||
    `${organization_id}-${location_id}-${service_type_code}-${effectiveDate}`;

  // AUDIT-FIX-07 / H-4: Audit logging helper
  const logAudit = async (success: boolean, errorMessage?: string) => {
    await supabase.from("platform_audit_log").insert({
      action: "edge_fn.hoodops_webhook",
      resource_type: "vendor_service_record",
      resource_id: eventId,
      success,
      error_message: errorMessage || null,
      metadata: {
        event,
        service_type_code,
        location_id,
        organization_id,
      },
    }).catch(() => {});
  };

  try {
    if (event === "service.completed") {
      // AUDIT-FIX-07 / H-3: Upsert with event_id for idempotency (was insert)
      const safeguardType = SERVICE_CODE_TO_SAFEGUARD[service_type_code] ?? null;
      const { error: upsertRecordError } = await supabase
        .from("vendor_service_records")
        .upsert({
          event_id: eventId,
          organization_id,
          location_id,
          service_type_code,
          safeguard_type: safeguardType,
          service_type: data.service_name || service_type_code,
          vendor_name: vendor_name || "HoodOps Partner",
          technician_name: technician_name || null,
          service_date: effectiveDate,
          price_charged: price_charged || null,
          certificate_url: certificate_url || null,
          notes: notes || null,
          source: "hoodops_webhook",
          webhook_payload: body,
        }, { onConflict: "event_id" });

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

      const { error: upsertError } = await supabase
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
        );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        await logAudit(false, upsertError.message);
        return new Response(
          JSON.stringify({ error: "Failed to upsert schedule", detail: upsertError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

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
