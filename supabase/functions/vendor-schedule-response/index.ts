// ── vendor-schedule-response — SERVICE-REQUEST-01 ────────────────
// Handles vendor response to a scheduling request.
// Actions: select_slot, propose_alternatives, decline.

import { createClient } from "npm:@supabase/supabase-js@2";
import { createNotification } from "../_shared/notify.ts";
import { logger } from "../_shared/logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // GET = validate token, POST = submit response
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const endpoint = pathParts[pathParts.length - 1]; // "validate" or "respond"

  try {
    // ── VALIDATE endpoint ────────────────────────────────────
    if (req.method === "POST" && endpoint === "validate") {
      const { token } = await req.json();
      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, error: "No token provided" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Look up token in vendor_secure_tokens
      const { data: tokenRow, error: tokenErr } = await supabase
        .from("vendor_secure_tokens")
        .select("id, vendor_id, organization_id, expires_at, used_at, upload_context")
        .eq("token", token)
        .eq("upload_context", "auto_request")
        .maybeSingle();

      if (tokenErr || !tokenRow) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid link" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (tokenRow.used_at) {
        return new Response(
          JSON.stringify({ valid: false, error: "This link has already been used" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (new Date(tokenRow.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ valid: false, error: "This link has expired" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find the service request linked to this token
      const { data: request } = await supabase
        .from("service_requests")
        .select("*")
        .eq("schedule_token_id", tokenRow.id)
        .maybeSingle();

      if (!request) {
        return new Response(
          JSON.stringify({ valid: false, error: "Service request not found" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Fetch vendor, org, location names
      const { data: vendor } = await supabase
        .from("vendors")
        .select("company_name, email")
        .eq("id", request.vendor_id)
        .single();

      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", request.organization_id)
        .single();

      let locationName = "";
      if (request.location_id) {
        const { data: loc } = await supabase
          .from("locations")
          .select("name")
          .eq("id", request.location_id)
          .single();
        locationName = loc?.name || "";
      }

      const proposedSlots = [
        request.proposed_slot_1,
        request.proposed_slot_2,
        request.proposed_slot_3,
      ].filter(Boolean);

      return new Response(
        JSON.stringify({
          valid: true,
          request_id: request.id,
          vendor_name: vendor?.company_name || "",
          service_type: request.service_type,
          service_name: request.service_type,
          location_name: locationName,
          organization_name: org?.name || "",
          urgency: request.urgency,
          proposed_slots: proposedSlots,
          notes: request.notes,
          expires_at: tokenRow.expires_at,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── RESPOND endpoint ─────────────────────────────────────
    if (req.method === "POST" && endpoint === "respond") {
      const {
        token,
        action,
        selected_slot,
        alternative_slots,
        notes,
      } = await req.json();

      if (!token || !action) {
        return new Response(
          JSON.stringify({ error: "Missing token or action" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate token
      const { data: tokenRow } = await supabase
        .from("vendor_secure_tokens")
        .select("id, vendor_id, organization_id, expires_at, used_at")
        .eq("token", token)
        .eq("upload_context", "auto_request")
        .maybeSingle();

      if (!tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired link" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find service request
      const { data: request } = await supabase
        .from("service_requests")
        .select("*")
        .eq("schedule_token_id", tokenRow.id)
        .single();

      if (!request) {
        return new Response(
          JSON.stringify({ error: "Service request not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Fetch vendor name for notifications
      const { data: vendor } = await supabase
        .from("vendors")
        .select("company_name")
        .eq("id", request.vendor_id)
        .single();
      const vendorName = vendor?.company_name || "Vendor";

      // ── SELECT SLOT ──
      if (action === "select_slot") {
        if (!selected_slot) {
          return new Response(
            JSON.stringify({ error: "No slot selected" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const slotDate = new Date(selected_slot);

        // Update service request
        await supabase
          .from("service_requests")
          .update({
            confirmed_datetime: selected_slot,
            confirmed_by: "vendor",
            status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", request.id);

        // Mark token used
        await supabase
          .from("vendor_secure_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("id", tokenRow.id);

        // Create calendar event
        const { data: calEvent } = await supabase.from("calendar_events").insert({
          organization_id: request.organization_id,
          location_id: request.location_id,
          title: `${request.service_type} — ${vendorName}`,
          type: "vendor",
          category: request.service_type,
          date: slotDate.toISOString().slice(0, 10),
          start_time: slotDate.toTimeString().slice(0, 5),
          end_time: new Date(slotDate.getTime() + 120 * 60000).toTimeString().slice(0, 5),
          vendor_id: request.vendor_id,
          vendor_name: vendorName,
          service_request_id: request.id,
        }).select("id").single();

        if (calEvent) {
          await supabase
            .from("service_requests")
            .update({ calendar_event_id: calEvent.id })
            .eq("id", request.id);
        }

        // Notify operator
        await createNotification({
          supabase,
          organizationId: request.organization_id,
          userId: request.requested_by || undefined,
          type: "service_request_confirmed",
          category: "vendors",
          title: "Service Date Confirmed",
          body: `${vendorName} confirmed ${request.service_type} for ${slotDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.`,
          actionUrl: "/vendors?tab=requests",
          priority: "medium",
          severity: "info",
          sourceType: "service_request",
          sourceId: request.id,
        });

        return new Response(
          JSON.stringify({ success: true, status: "confirmed", confirmed_datetime: selected_slot }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // ── PROPOSE ALTERNATIVES ──
      if (action === "propose_alternatives") {
        if (!alternative_slots || alternative_slots.length === 0) {
          return new Response(
            JSON.stringify({ error: "No alternative slots provided" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        await supabase
          .from("service_requests")
          .update({
            vendor_alt_slot_1: alternative_slots[0] || null,
            vendor_alt_slot_2: alternative_slots[1] || null,
            vendor_alt_slot_3: alternative_slots[2] || null,
            vendor_response_notes: notes || null,
            status: "vendor_proposed_alt",
            updated_at: new Date().toISOString(),
          })
          .eq("id", request.id);

        // Mark token used
        await supabase
          .from("vendor_secure_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("id", tokenRow.id);

        // Notify operator
        await createNotification({
          supabase,
          organizationId: request.organization_id,
          userId: request.requested_by || undefined,
          type: "service_request_alternatives",
          category: "vendors",
          title: "Vendor Proposed Alternative Dates",
          body: `${vendorName} proposed alternative dates for your ${request.service_type} request. Please review and select.`,
          actionUrl: "/vendors?tab=requests",
          priority: "high",
          severity: "advisory",
          sourceType: "service_request",
          sourceId: request.id,
        });

        return new Response(
          JSON.stringify({ success: true, status: "vendor_proposed_alt" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // ── DECLINE ──
      if (action === "decline") {
        await supabase
          .from("service_requests")
          .update({
            status: "canceled",
            vendor_response_notes: notes || "Vendor declined",
            updated_at: new Date().toISOString(),
          })
          .eq("id", request.id);

        // Mark token used
        await supabase
          .from("vendor_secure_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("id", tokenRow.id);

        // Notify operator
        await createNotification({
          supabase,
          organizationId: request.organization_id,
          userId: request.requested_by || undefined,
          type: "service_request_declined",
          category: "vendors",
          title: "Vendor Declined Request",
          body: `${vendorName} declined your ${request.service_type} request.${notes ? ` Reason: ${notes}` : ""}`,
          actionUrl: "/vendors?tab=requests",
          priority: "high",
          severity: "advisory",
          sourceType: "service_request",
          sourceId: request.id,
        });

        return new Response(
          JSON.stringify({ success: true, status: "canceled" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Invalid action. Use select_slot, propose_alternatives, or decline" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Use POST /validate or POST /respond" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("[VENDOR-SCHEDULE-RESPONSE] Unhandled error", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
