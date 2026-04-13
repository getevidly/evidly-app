import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface WelcomeRequest {
  email: string;
  ownerName: string;
  organizationName: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, ownerName, organizationName }: WelcomeRequest =
      await req.json();

    const loginUrl = "https://app.getevidly.com/login";

    const html = buildEmailHtml({
      recipientName: ownerName || email.split("@")[0],
      bodyHtml: `
        <p>Welcome to <strong>EvidLY</strong>! Your organization <strong>${organizationName}</strong> has been set up and is ready to go.</p>
        <p>Here are your account details:</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0 0 4px 0;">Email: ${email}</p>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Please set your password using the link below.</p>
        </div>
        <p>Click the button below to log in and set your password. If you have any questions, reply to this email — it goes straight to our founders.</p>
      `,
      ctaText: "Log In & Set Your Password",
      ctaUrl: loginUrl,
      footerNote:
        "You're receiving this because an EvidLY account was created for you. If you did not expect this, please ignore this email.",
    });

    const result = await sendEmail({
      to: email,
      subject: "Your EvidLY account is ready",
      html,
      from: "EvidLY Founders <founders@getevidly.com>",
      replyTo: "founders@getevidly.com",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: result
          ? "Welcome email sent"
          : "Welcome logged (email service unavailable)",
        emailId: result?.id || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
