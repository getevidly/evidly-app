import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InviteRequest {
  email: string;
  inviteUrl: string;
  role: string;
  inviterName: string;
  organizationName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, inviteUrl, role, inviterName, organizationName }: InviteRequest = await req.json();

    const orgLabel = organizationName || "their team";

    const html = buildEmailHtml({
      recipientName: email.split("@")[0],
      bodyHtml: `
        <p><strong>${inviterName}</strong> has invited you to join <strong>${orgLabel}</strong> on EvidLY as <strong>${role}</strong>.</p>
        <p>EvidLY helps commercial kitchens lead with confidence through integrated food safety and facility safety management with real-time monitoring, smart checklists, and automated documentation.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0 0 4px 0;">Your role: ${role}</p>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Invited by: ${inviterName}</p>
        </div>
      `,
      ctaText: "Accept Invitation →",
      ctaUrl: inviteUrl,
      footerNote: "This invitation link is unique to you. If you did not expect this invite, you can safely ignore this email.",
    });

    const result = await sendEmail({
      to: email,
      subject: `You've been invited to join ${orgLabel} on EvidLY as ${role}`,
      html,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: result ? "Invitation email sent" : "Invitation logged (email service unavailable)",
        emailId: result?.id || null,
        inviteUrl,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending invite email:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
