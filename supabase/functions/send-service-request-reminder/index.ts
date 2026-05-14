// ── send-service-request-reminder ─────────────────────────────────
// Fires a reminder email/notification to the vendor for a pending request.
// Increments reminders_count and sets last_reminder_at.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { createNotification } from "../_shared/notify.ts";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://app.getevidly.com";

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

    const vendor = request.vendors as Record<string, unknown> | null;
    const vendorEmail = vendor?.email as string | undefined;

    if (vendorEmail) {
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

      // Resolve schedule URL from existing token
      let scheduleUrl = "";
      if (request.schedule_token_id) {
        const { data: tokenRow } = await supabase
          .from("vendor_secure_tokens")
          .select("token, expires_at")
          .eq("id", request.schedule_token_id)
          .single();

        if (tokenRow && new Date(tokenRow.expires_at) > new Date()) {
          scheduleUrl = `${APP_URL}/vendor/schedule/${tokenRow.token}`;
        }
      }

      const vendorContactName = (vendor?.contact_name as string) || (vendor?.company_name as string) || "there";
      const reminderNumber = (request.reminders_count || 0) + 1;

      const emailHtml = buildEmailHtml({
        recipientName: vendorContactName,
        bodyHtml: `
          <p>This is a friendly reminder that <strong>${orgName}</strong> is still waiting for a response to their <strong>${request.service_type}</strong> service request${locationName ? ` at <strong>${locationName}</strong>` : ""}.</p>
          <p>The original request was sent on ${new Date(request.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>
          <p>Please respond at your earliest convenience.</p>
        `,
        ctaText: scheduleUrl ? "Respond to Schedule Request" : undefined,
        ctaUrl: scheduleUrl || undefined,
        footerNote: `Reminder ${reminderNumber}. This link expires 14 days from the original request. If you have questions, please contact your client directly.`,
      });

      await sendEmail({
        to: vendorEmail,
        subject: `Reminder: ${request.service_type} — ${orgName}`,
        html: emailHtml,
      });
    }

    // Increment reminders_count and set last_reminder_at
    const { data: updated, error: updateErr } = await supabase
      .from("service_requests")
      .update({
        reminders_count: (request.reminders_count || 0) + 1,
        last_reminder_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select("id, reminders_count, last_reminder_at")
      .single();

    if (updateErr) {
      logger.error("[REMINDER] Update failed", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update reminder count" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Notify operator
    await createNotification({
      supabase,
      organizationId: request.organization_id,
      userId: user.id,
      type: "service_request_reminder_sent",
      category: "vendors",
      title: "Reminder Sent",
      body: `Reminder sent to ${(vendor?.company_name as string) || "the vendor"} for ${request.service_type}.`,
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
    logger.error("[REMINDER] Unhandled error", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(null), "Content-Type": "application/json" } }
    );
  }
});
