import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sendEmail } from "../_shared/email.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { to, subject, html }: SendEmailRequest = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await sendEmail({ to, subject, html });

    return new Response(
      JSON.stringify({
        success: !!result,
        message: result ? "Email sent" : "Email service unavailable",
        emailId: result?.id || null,
      }),
      {
        status: result ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in send-email:", error);
    return new Response(
      JSON.stringify({ success: false, message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
