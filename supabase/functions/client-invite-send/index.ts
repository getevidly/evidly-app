/**
 * SERVICE-PROVIDER-1 — Client Invitation Email
 *
 * Sends a branded invitation email from a service provider to a prospective client.
 * Called from the ClientInviteModal and BulkClientImport components.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildEmailHtml, sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvitePayload {
  vendorName: string;
  contactName: string;
  businessName: string;
  email: string;
  inviteLink: string;
  message: string;
  senderName?: string;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: InvitePayload = await req.json();
    const {
      vendorName,
      contactName,
      businessName,
      email,
      inviteLink,
      message,
    } = payload;

    if (!email || !vendorName || !inviteLink) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const subject = `${vendorName} has invited you to EvidLY`;

    const htmlBody = buildEmailHtml({
      preheader: `${vendorName} wants to connect with ${businessName} on EvidLY`,
      heading: `You've been invited to EvidLY`,
      body: `
        <p>Hi ${contactName || "there"},</p>
        <p><strong>${vendorName}</strong> has invited <strong>${businessName}</strong> to join EvidLY — the compliance platform for commercial kitchens.</p>
        ${message ? `<div style="background:#f9fafb;border-left:3px solid #d4af37;padding:12px 16px;margin:16px 0;border-radius:4px;font-size:14px;color:#374151;white-space:pre-line">${message}</div>` : ""}
        <p>When you sign up, ${vendorName} will be automatically linked as your vendor with their COI and certifications shared to your account.</p>
      `,
      ctaLabel: "Sign Up Free",
      ctaUrl: inviteLink,
      footer: `This invitation was sent by ${vendorName} through EvidLY. If you did not expect this email, you can safely ignore it.`,
    });

    await sendEmail({
      to: email,
      subject,
      html: htmlBody,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("client-invite-send error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send invitation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
