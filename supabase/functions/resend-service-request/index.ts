// ── resend-service-request ────────────────────────────────────────
// Re-fires the vendor notification for an expired service request.
// Resets status to pending_vendor, clears confirmation fields,
// regenerates token if expired, re-sends vendor email.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { createNotification } from "../_shared/notify.ts";
import { ensureThread, recordMessage } from "../_shared/threadMessage.ts";
import { buildReplyAddress } from "../_shared/replyAddress.ts";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://app.getevidly.com";

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

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

    // Verify caller
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

    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(
        JSON.stringify({ error: "requestId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the request
    const { data: request, error: fetchErr } = await supabase
      .from("service_requests")
      .select("*, vendors:vendor_id(id, company_name, email, contact_name)")
      .eq("id", requestId)
      .single();

    if (fetchErr || !request) {
      return new Response(
        JSON.stringify({ error: "Service request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify org membership
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.organization_id !== request.organization_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reset request to pending_vendor
    const { data: updated, error: updateErr } = await supabase
      .from("service_requests")
      .update({
        status: "pending_vendor",
        confirmed_datetime: null,
        confirmed_by: null,
        calendar_event_id: null,
        vendor_response_notes: null,
        vendor_alt_slot_1: null,
        vendor_alt_slot_2: null,
        vendor_alt_slot_3: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select("id, status")
      .single();

    if (updateErr) {
      logger.error("[RESEND-REQUEST] Update failed", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update service request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve or regenerate schedule token
    let scheduleUrl = "";
    const vendor = request.vendors as Record<string, unknown> | null;
    const vendorEmail = vendor?.email as string | undefined;

    if (vendorEmail) {
      // Ensure message thread
      const thread = await ensureThread({
        supabase,
        organizationId: request.organization_id,
        entityType: "service_request",
        entityId: requestId,
        subject: `Service Request: ${request.service_type}`,
      });
      const replyTo = thread ? buildReplyAddress(thread.id) : undefined;

      let tokenStr = "";

      if (request.schedule_token_id) {
        const { data: existingToken } = await supabase
          .from("vendor_secure_tokens")
          .select("token, expires_at")
          .eq("id", request.schedule_token_id)
          .single();

        if (existingToken && new Date(existingToken.expires_at) > new Date()) {
          tokenStr = existingToken.token;
        }
      }

      // Generate new token if needed
      if (!tokenStr) {
        const newToken = generateToken();
        const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

        const { data: tokenRow } = await supabase
          .from("vendor_secure_tokens")
          .insert({
            vendor_id: vendor?.id || request.vendor_id,
            organization_id: request.organization_id,
            token: newToken,
            document_type: "service_schedule",
            expires_at: expiresAt,
            upload_context: "auto_request",
          })
          .select("id")
          .single();

        if (tokenRow) {
          await supabase
            .from("service_requests")
            .update({ schedule_token_id: tokenRow.id })
            .eq("id", requestId);
          tokenStr = newToken;
        }
      }

      if (tokenStr) {
        scheduleUrl = `${APP_URL}/vendor/schedule/${tokenStr}`;
      }

      // Fetch org name
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", request.organization_id)
        .single();
      const orgName = org?.name || "Your Client";

      // Fetch location name
      let locationName = "";
      if (request.location_id) {
        const { data: loc } = await supabase
          .from("locations")
          .select("name")
          .eq("id", request.location_id)
          .single();
        locationName = loc?.name || "";
      }

      // Build proposed slots HTML
      const slots = [request.proposed_slot_1, request.proposed_slot_2, request.proposed_slot_3].filter(Boolean);
      const slotsHtml = slots
        .map((s: string) => {
          const d = new Date(s);
          return `<li style="margin: 6px 0; font-weight: 600;">${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</li>`;
        })
        .join("");

      const vendorContactName = (vendor?.contact_name as string) || (vendor?.company_name as string) || "there";

      const emailHtml = buildEmailHtml({
        recipientName: vendorContactName,
        bodyHtml: `
          <p><strong>${orgName}</strong> is re-sending their request for <strong>${request.service_type}</strong> service${locationName ? ` at <strong>${locationName}</strong>` : ""}.</p>
          ${slotsHtml ? `<p>Their proposed dates:</p><ol style="padding-left: 20px;">${slotsHtml}</ol>` : ""}
          <p>Please select one of these dates, or propose alternative times that work better for your schedule.</p>
        `,
        ctaText: scheduleUrl ? "Respond to Schedule Request" : undefined,
        ctaUrl: scheduleUrl || undefined,
        footerNote: "This link expires in 14 days. If you have questions, please contact your client directly.",
      });

      const emailResult = await sendEmail({
        to: vendorEmail,
        subject: `Service Request (Resent): ${request.service_type} — ${orgName}`,
        html: emailHtml,
        replyTo,
      });

      // Record outbound message
      if (thread && emailResult) {
        await recordMessage({
          supabase,
          threadId: thread.id,
          organizationId: request.organization_id,
          channel: "email",
          direction: "outbound",
          senderType: "system",
          senderIdentifier: "noreply@getevidly.com",
          subject: `Service Request (Resent): ${request.service_type} — ${orgName}`,
          bodyHtml: emailHtml,
          providerMessageId: emailResult.id,
        });
      }
    }

    // Notify operator
    await createNotification({
      supabase,
      organizationId: request.organization_id,
      userId: user.id,
      type: "service_request_resent",
      category: "vendors",
      title: "Service Request Resent",
      body: `Your ${request.service_type} request has been resent to ${(vendor?.company_name as string) || "the vendor"}.`,
      actionUrl: "/vendors?tab=requests",
      priority: "low",
      severity: "info",
      sourceType: "service_request",
      sourceId: requestId,
      deduplicate: false,
    });

    return new Response(
      JSON.stringify({ success: true, request: updated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("[RESEND-REQUEST] Unhandled error", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(null), "Content-Type": "application/json" } }
    );
  }
});
