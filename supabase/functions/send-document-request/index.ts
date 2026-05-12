import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

interface DocumentRequestPayload {
  vendorEmail: string;
  vendorName: string;
  documentType: string;
  uploadUrl: string;
  coverMessage: string;
  orgName: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { vendorEmail, vendorName, documentType, uploadUrl, coverMessage, orgName }: DocumentRequestPayload = await req.json();

    const escapedMessage = coverMessage.replace(/\n/g, '<br>');

    const html = buildEmailHtml({
      recipientName: vendorName,
      bodyHtml: `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0 0 8px 0;">${orgName} is requesting your ${documentType}</p>
          <p style="color: #475569; font-size: 14px; margin: 0;">${escapedMessage}</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">Click the button below to securely upload your document. No account needed — the link expires in 5 days.</p>
      `,
      ctaText: "Upload Document →",
      ctaUrl: uploadUrl,
      footerNote: "This is a secure, one-time upload link sent by a verified EvidLY customer. If you did not expect this request, you can safely ignore it.",
    });

    const result = await sendEmail({
      to: vendorEmail,
      subject: `${orgName} has requested your ${documentType}`,
      html,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: result ? "Document request email sent" : "Request logged (email service unavailable)",
        emailId: result?.id || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending document request email:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
