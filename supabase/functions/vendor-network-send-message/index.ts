/**
 * vendor-network-send-message — VENDOR-NETWORK-01
 *
 * Sends an outbound message from an operator to a vendor network directory entry.
 * Creates/upserts thread, records outbound message, sends email via Resend
 * with dynamic reply-to for threaded inbound routing.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { ensureThread, recordMessage } from "../_shared/threadMessage.ts";
import { buildReplyAddress } from "../_shared/replyAddress.ts";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { vendorNetworkId, subject, body, organizationId } = await req.json();

    if (!vendorNetworkId || !subject || !body || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify org membership
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || profile.organization_id !== organizationId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up vendor from network directory
    const { data: vendor, error: vendorErr } = await supabase
      .from("vendor_network")
      .select("id, name, contact_name, email")
      .eq("id", vendorNetworkId)
      .eq("is_active", true)
      .single();

    if (vendorErr || !vendor) {
      return new Response(
        JSON.stringify({ error: "Vendor not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch org name
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();
    const orgName = org?.name || "An EvidLY customer";

    // Ensure thread
    const thread = await ensureThread({
      supabase,
      organizationId,
      entityType: "vendor_network_contact",
      entityId: vendorNetworkId,
      subject,
    });

    if (!thread) {
      return new Response(
        JSON.stringify({ error: "Failed to create message thread" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const replyTo = buildReplyAddress(thread.id);

    // Send email
    const emailHtml = buildEmailHtml({
      recipientName: vendor.contact_name || vendor.name,
      bodyHtml: `<p>${body.replace(/\n/g, "<br>")}</p>`,
      footerNote: `Sent by ${profile.full_name || "an operator"} at ${orgName} via EvidLY. Reply directly to this email.`,
    });

    const emailResult = await sendEmail({
      to: vendor.email,
      subject,
      html: emailHtml,
      replyTo,
    });

    if (!emailResult) {
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record outbound message
    const msg = await recordMessage({
      supabase,
      threadId: thread.id,
      organizationId,
      channel: "email",
      direction: "outbound",
      senderType: "operator",
      senderIdentifier: user.email || "operator",
      subject,
      bodyText: body,
      bodyHtml: emailHtml,
      providerMessageId: emailResult.id,
    });

    return new Response(
      JSON.stringify({ success: true, thread_id: thread.id, message_id: msg?.id || null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("[VENDOR-NETWORK-SEND] Unhandled error", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(null), "Content-Type": "application/json" } }
    );
  }
});
