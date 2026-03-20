// ── process-service-request — SERVICE-REQUEST-01 ─────────────────
// Handles operator submitting a service request from the app.
// CPP vendors: auto-confirm from available slots.
// Non-CPP vendors: create request, generate token, email vendor.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { createNotification } from "../_shared/notify.ts";
import { logger } from "../_shared/logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://app.getevidly.com";

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Authenticate the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the caller
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      organization_id,
      location_id,
      vendor_id,
      service_type,
      request_type = "scheduled",
      urgency = "normal",
      notes,
      proposed_slots = [],
    } = body;

    if (!organization_id || !vendor_id || !service_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: organization_id, vendor_id, service_type" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch vendor to check CPP status
    const { data: vendor, error: vendorErr } = await supabaseUser
      .from("vendors")
      .select("id, company_name, email, contact_name, is_cpp_vendor")
      .eq("id", vendor_id)
      .single();

    if (vendorErr || !vendor) {
      return new Response(
        JSON.stringify({ error: "Vendor not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch location name if provided
    let locationName = "";
    if (location_id) {
      const { data: loc } = await supabaseUser
        .from("locations")
        .select("name")
        .eq("id", location_id)
        .single();
      locationName = loc?.name || "";
    }

    // Fetch org name
    const { data: org } = await supabaseUser
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();
    const orgName = org?.name || "Your Client";

    // ── CPP VENDOR PATH ──────────────────────────────────────────
    if (vendor.is_cpp_vendor && proposed_slots.length === 1) {
      // Check if the selected slot is available
      const { data: slot } = await supabaseUser
        .from("cpp_availability_slots")
        .select("*")
        .eq("vendor_id", vendor_id)
        .eq("slot_datetime", proposed_slots[0])
        .eq("is_available", true)
        .maybeSingle();

      // Insert service request
      const { data: request, error: insertErr } = await supabaseUser
        .from("service_requests")
        .insert({
          organization_id,
          location_id: location_id || null,
          vendor_id,
          requested_by: user.id,
          service_type,
          request_type,
          urgency,
          notes,
          proposed_slot_1: proposed_slots[0],
          confirmed_datetime: slot ? proposed_slots[0] : null,
          confirmed_by: slot ? "auto" : null,
          status: slot ? "confirmed" : "pending_vendor",
        })
        .select("id, status")
        .single();

      if (insertErr) {
        logger.error("[SERVICE-REQUEST] Insert failed", insertErr);
        return new Response(
          JSON.stringify({ error: "Failed to create service request" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Claim the slot if available
      if (slot) {
        await supabaseUser
          .from("cpp_availability_slots")
          .update({ is_available: false, claimed_by_request_id: request.id })
          .eq("id", slot.id);

        // Create calendar event
        const slotDate = new Date(proposed_slots[0]);
        await supabaseUser.from("calendar_events").insert({
          organization_id,
          location_id: location_id || null,
          title: `${service_type} — ${vendor.company_name}`,
          type: "vendor",
          category: service_type,
          date: slotDate.toISOString().slice(0, 10),
          start_time: slotDate.toTimeString().slice(0, 5),
          end_time: new Date(slotDate.getTime() + (slot.duration_minutes || 120) * 60000)
            .toTimeString().slice(0, 5),
          vendor_id,
          vendor_name: vendor.company_name,
          service_request_id: request.id,
          created_by: user.id,
        });

        // Notify operator
        await createNotification({
          supabase: supabaseUser,
          organizationId: organization_id,
          userId: user.id,
          type: "service_request_confirmed",
          category: "vendors",
          title: "Service Confirmed",
          body: `${vendor.company_name} ${service_type} confirmed for ${slotDate.toLocaleDateString()}.`,
          actionUrl: "/vendors?tab=requests",
          priority: "medium",
          severity: "info",
          sourceType: "service_request",
          sourceId: request.id,
        });
      }

      return new Response(
        JSON.stringify({ request_id: request.id, status: request.status }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── NON-CPP VENDOR PATH ──────────────────────────────────────
    // Insert service request
    const { data: request, error: insertErr } = await supabaseUser
      .from("service_requests")
      .insert({
        organization_id,
        location_id: location_id || null,
        vendor_id,
        requested_by: user.id,
        service_type,
        request_type,
        urgency,
        notes,
        proposed_slot_1: proposed_slots[0] || null,
        proposed_slot_2: proposed_slots[1] || null,
        proposed_slot_3: proposed_slots[2] || null,
        status: "pending_vendor",
      })
      .select("id")
      .single();

    if (insertErr) {
      logger.error("[SERVICE-REQUEST] Insert failed", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to create service request" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate vendor scheduling token (14-day expiry)
    // Reuse vendor_service_tokens table pattern
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // We need a service_record_id for vendor_service_tokens FK — create a placeholder
    // or use the service_request_id if the table allows null service_record_id
    // Since vendor_service_tokens requires service_record_id NOT NULL,
    // we'll use vendor_secure_tokens instead (more flexible)
    const { data: tokenRow, error: tokenErr } = await supabaseUser
      .from("vendor_secure_tokens")
      .insert({
        vendor_id,
        organization_id,
        token,
        document_type: "service_schedule",
        expires_at: expiresAt,
        upload_context: "auto_request",
      })
      .select("id")
      .single();

    if (tokenErr) {
      logger.error("[SERVICE-REQUEST] Token creation failed", tokenErr);
      // Request was created but token failed — still return success
      return new Response(
        JSON.stringify({ request_id: request.id, status: "pending_vendor", token_error: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update service_request with token reference
    await supabaseUser
      .from("service_requests")
      .update({ schedule_token_id: tokenRow.id })
      .eq("id", request.id);

    // Send email to vendor
    const scheduleUrl = `${APP_URL}/vendor/schedule/${token}`;
    const slotsHtml = proposed_slots
      .filter(Boolean)
      .map((s: string, i: number) => {
        const d = new Date(s);
        return `<li style="margin: 6px 0; font-weight: 600;">${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</li>`;
      })
      .join("");

    const urgencyLabel: Record<string, string> = {
      normal: "",
      soon: " (Within 1-2 weeks)",
      urgent: " (Urgent)",
      emergency: " (Emergency — ASAP)",
    };

    const emailHtml = buildEmailHtml({
      recipientName: vendor.contact_name || vendor.company_name,
      bodyHtml: `
        <p><strong>${orgName}</strong> has requested <strong>${service_type}</strong> service${locationName ? ` at <strong>${locationName}</strong>` : ""}${urgencyLabel[urgency] || ""}.</p>
        <p>They have proposed the following dates:</p>
        <ol style="padding-left: 20px;">${slotsHtml}</ol>
        <p>Please select one of these dates, or propose alternative times that work better for your schedule.</p>
      `,
      ctaText: "Respond to Schedule Request",
      ctaUrl: scheduleUrl,
      footerNote: "This link expires in 14 days. If you have questions, please contact your client directly.",
    });

    const urgencyBanner = urgency === "emergency"
      ? { text: "EMERGENCY SERVICE REQUEST", color: "#dc2626" }
      : urgency === "urgent"
        ? { text: "URGENT SERVICE REQUEST", color: "#ea580c" }
        : undefined;

    if (urgencyBanner) {
      // Rebuild with urgency banner
      const urgentEmailHtml = buildEmailHtml({
        recipientName: vendor.contact_name || vendor.company_name,
        bodyHtml: `
          <p><strong>${orgName}</strong> has requested <strong>${service_type}</strong> service${locationName ? ` at <strong>${locationName}</strong>` : ""}${urgencyLabel[urgency] || ""}.</p>
          <p>They have proposed the following dates:</p>
          <ol style="padding-left: 20px;">${slotsHtml}</ol>
          <p>Please select one of these dates, or propose alternative times that work better for your schedule.</p>
        `,
        ctaText: "Respond to Schedule Request",
        ctaUrl: scheduleUrl,
        urgencyBanner,
        footerNote: "This link expires in 14 days. If you have questions, please contact your client directly.",
      });

      await sendEmail({
        to: vendor.email,
        subject: `${urgencyBanner.text}: ${service_type} — ${orgName}`,
        html: urgentEmailHtml,
      });
    } else {
      await sendEmail({
        to: vendor.email,
        subject: `Service Request: ${service_type} — ${orgName}`,
        html: emailHtml,
      });
    }

    // Notify operator that request was sent
    await createNotification({
      supabase: supabaseUser,
      organizationId: organization_id,
      userId: user.id,
      type: "service_request_sent",
      category: "vendors",
      title: "Service Request Sent",
      body: `Your ${service_type} request has been sent to ${vendor.company_name}. They will respond within 14 days.`,
      actionUrl: "/vendors?tab=requests",
      priority: "low",
      severity: "info",
      sourceType: "service_request",
      sourceId: request.id,
    });

    return new Response(
      JSON.stringify({ request_id: request.id, status: "pending_vendor" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("[SERVICE-REQUEST] Unhandled error", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
