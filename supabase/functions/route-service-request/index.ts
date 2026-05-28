/**
 * route-service-request — SERVICE-REQUEST-02
 *
 * Routes a submitted service request based on vendor type and service code:
 *   CPP vendor + KEC-stack service → evidly_admin queue (pending_evidly_admin)
 *   All other combinations → vendor message thread (pending_vendor)
 *
 * Detects regulatory floor breaches at routing time by comparing
 * proposed_cadence_days against service_type_definitions.regulatory_floor_days.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { createNotification, createOrgNotification } from "../_shared/notify.ts";
import { ensureThread, recordMessage } from "../_shared/threadMessage.ts";
import { buildReplyAddress } from "../_shared/replyAddress.ts";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://app.getevidly.com";

/** KEC-stack codes: KEC itself + children (FPM, GFX, RGC) */
const KEC_STACK_CODES = new Set(["KEC", "FPM", "GFX", "RGC"]);

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: request_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 1. Fetch the service request ─────────────────────────────
    const { data: sr, error: srErr } = await supabase
      .from("service_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (srErr || !sr) {
      return new Response(
        JSON.stringify({ error: "Service request not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Guard: already routed
    if (sr.routing_target) {
      return new Response(
        JSON.stringify({
          request_id,
          routing_target: sr.routing_target,
          already_routed: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 2. Fetch vendor for CPP check ────────────────────────────
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id, company_name, email, contact_name, is_cleaning_pros_plus")
      .eq("id", sr.vendor_id)
      .single();

    const isCpp = vendor?.is_cleaning_pros_plus === true;

    // ── 3. Fetch service type definition for floor check ─────────
    const serviceCode: string | null =
      sr.service_code || sr.service_type || null;
    let isKecStack = false;
    let regulatoryFloorDays: number | null = null;

    if (serviceCode) {
      const { data: std } = await supabase
        .from("service_type_definitions")
        .select("code, parent_code, regulatory_floor_days")
        .eq("code", serviceCode)
        .single();

      if (std) {
        isKecStack = KEC_STACK_CODES.has(std.code);
        regulatoryFloorDays = std.regulatory_floor_days;
      }
    }

    // ── 4. Regulatory floor breach detection ─────────────────────
    // Breach = proposed cadence exceeds regulatory floor
    // (longer interval = less frequent = exceeds minimum frequency)
    let isFloorBreach = false;
    if (
      regulatoryFloorDays != null &&
      sr.proposed_cadence_days != null &&
      sr.proposed_cadence_days > regulatoryFloorDays
    ) {
      isFloorBreach = true;
    }

    // ── 5. Resolve org + location names (both paths need these) ──
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", sr.organization_id)
      .single();
    const orgName = org?.name || "A client";

    let locationName = "";
    if (sr.location_id) {
      const { data: loc } = await supabase
        .from("locations")
        .select("name")
        .eq("id", sr.location_id)
        .single();
      locationName = loc?.name || "";
    }

    const subtypeLabel = sr.request_subtype
      ? sr.request_subtype.replace(/_/g, " ")
      : "service request";

    // ── 6. Routing decision ──────────────────────────────────────
    const routeToCppAdmin = isCpp && isKecStack;
    const routingTarget = routeToCppAdmin ? "evidly_admin" : "vendor_thread";
    const newStatus = routeToCppAdmin
      ? "pending_evidly_admin"
      : sr.status || "pending_vendor";
    const now = new Date().toISOString();

    // Update the service request with routing decision + floor breach
    const { error: updateErr } = await supabase
      .from("service_requests")
      .update({
        routing_target: routingTarget,
        routing_decided_at: now,
        is_floor_breach: isFloorBreach,
        status: newStatus,
      })
      .eq("id", request_id);

    if (updateErr) {
      logger.error("[ROUTE-SR] Update failed", updateErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to update routing" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 6a. CPP + KEC-stack → EvidLY admin queue ─────────────────
    if (routeToCppAdmin) {
      await createOrgNotification({
        supabase,
        organizationId: sr.organization_id,
        roleFilter: ["platform_admin"],
        type: "service_request_pending_admin",
        category: "vendors",
        title: "CPP Service Request \u2014 Awaiting Review",
        body: `${orgName}${locationName ? ` / ${locationName}` : ""}: ${serviceCode} ${subtypeLabel}${isFloorBreach ? " \u2014 floor breach detected" : ""}`,
        actionUrl: `/admin/service-requests/${request_id}`,
        actionLabel: "Review Request",
        priority: isFloorBreach ? "high" : "medium",
        severity: isFloorBreach ? "advisory" : "info",
        sourceType: "service_request",
        sourceId: request_id,
      });

      logger.info(
        "[ROUTE-SR] Routed to evidly_admin",
        request_id,
        serviceCode
      );

      return new Response(
        JSON.stringify({
          request_id,
          routing_target: "evidly_admin",
          status: "pending_evidly_admin",
          is_floor_breach: isFloorBreach,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 6b. All others → vendor message thread ───────────────────
    if (!vendor || !vendor.email) {
      logger.warn(
        "[ROUTE-SR] No vendor email \u2014 routed but email skipped",
        request_id
      );
      return new Response(
        JSON.stringify({
          request_id,
          routing_target: "vendor_thread",
          status: newStatus,
          is_floor_breach: isFloorBreach,
          email_sent: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Ensure thread
    const thread = await ensureThread({
      supabase,
      organizationId: sr.organization_id,
      entityType: "service_request",
      entityId: request_id,
      subject: `Service Request: ${serviceCode || sr.service_type}`,
    });

    const replyTo = thread ? buildReplyAddress(thread.id) : undefined;

    // Build vendor email
    let bodyDetails = `<p><strong>${orgName}</strong> has submitted a <strong>${subtypeLabel}</strong> request for <strong>${serviceCode || sr.service_type}</strong>${locationName ? ` at <strong>${locationName}</strong>` : ""}.</p>`;

    if (sr.proposed_cadence_days) {
      bodyDetails += `<p>Proposed cadence: every <strong>${sr.proposed_cadence_days} days</strong></p>`;
    }
    if (sr.proposed_visit_date) {
      const pvd = new Date(sr.proposed_visit_date);
      bodyDetails += `<p>Proposed visit date: <strong>${pvd.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong></p>`;
    }
    if (sr.notes) {
      bodyDetails += `<p>Notes: ${sr.notes}</p>`;
    }
    if (isFloorBreach) {
      bodyDetails += `<p style="color: #dc2626; font-weight: 600;">This request exceeds the regulatory service frequency floor.</p>`;
    }

    const emailHtml = buildEmailHtml({
      recipientName: vendor.contact_name || vendor.company_name,
      bodyHtml: bodyDetails,
      ctaText: "View in EvidLY",
      ctaUrl: `${APP_URL}/vendors?tab=requests`,
      footerNote: "Reply directly to this email to respond.",
    });

    const emailSubject = `Service Request: ${serviceCode || sr.service_type} \u2014 ${orgName}`;
    const emailResult = await sendEmail({
      to: vendor.email,
      subject: emailSubject,
      html: emailHtml,
      replyTo,
    });

    // Record outbound message in thread
    if (thread && emailResult) {
      await recordMessage({
        supabase,
        threadId: thread.id,
        organizationId: sr.organization_id,
        channel: "email",
        direction: "outbound",
        senderType: "system",
        senderIdentifier: "noreply@getevidly.com",
        subject: emailSubject,
        bodyHtml: emailHtml,
        providerMessageId: emailResult.id,
      });
    }

    // Notify submitter that request was routed to vendor
    if (sr.submitted_by_user_id) {
      await createNotification({
        supabase,
        organizationId: sr.organization_id,
        userId: sr.submitted_by_user_id,
        type: "service_request_routed",
        category: "vendors",
        title: "Service Request Sent to Vendor",
        body: `Your ${serviceCode || sr.service_type} request has been sent to ${vendor.company_name}.`,
        actionUrl: "/vendors?tab=requests",
        priority: "low",
        severity: "info",
        sourceType: "service_request",
        sourceId: request_id,
      });
    }

    logger.info(
      "[ROUTE-SR] Routed to vendor_thread",
      request_id,
      serviceCode,
      emailResult ? "email_sent" : "email_failed"
    );

    return new Response(
      JSON.stringify({
        request_id,
        routing_target: "vendor_thread",
        status: newStatus,
        is_floor_breach: isFloorBreach,
        email_sent: !!emailResult,
        thread_id: thread?.id || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    logger.error("[ROUTE-SR] Unhandled error", (err as Error).message);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          ...getCorsHeaders(null),
          "Content-Type": "application/json",
        },
      }
    );
  }
});
