// ═══════════════════════════════════════════════════════════
// hoodops-webhook — HOODOPS-SERVICES-01
//
// Receives webhook events from HoodOps platform:
//   - service.completed → insert vendor_service_records + upsert schedule
//   - service.scheduled → upsert location_service_schedules
//
// No JWT verification — external webhook. Uses shared secret.
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

  try {
    if (event === "service.completed") {
      // Insert vendor_service_records
      const safeguardType = SERVICE_CODE_TO_SAFEGUARD[service_type_code] ?? null;
      const { error: insertError } = await supabase
        .from("vendor_service_records")
        .insert({
          organization_id,
          location_id,
          service_type_code,
          safeguard_type: safeguardType,
          service_type: data.service_name || service_type_code,
          vendor_name: vendor_name || "HoodOps Partner",
          technician_name: technician_name || null,
          service_date: service_date || new Date().toISOString().split("T")[0],
          price_charged: price_charged || null,
          certificate_url: certificate_url || null,
          notes: notes || null,
          source: "hoodops_webhook",
          webhook_payload: body,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to insert service record", detail: insertError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      // Upsert schedule
      const effectiveDate = service_date || new Date().toISOString().split("T")[0];
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

      return new Response(
        JSON.stringify({ ok: true, event: "service.completed", next_due: nextDue }),
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
        return new Response(
          JSON.stringify({ error: "Failed to upsert schedule", detail: upsertError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, event: "service.scheduled", next_due: nextDue }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown event: ${event}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
