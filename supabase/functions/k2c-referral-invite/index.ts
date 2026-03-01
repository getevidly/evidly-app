import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      contactName,
      businessName,
      email,
      phone,
      role,
      referralCode,
      message,
      referrerName,
      referrerOrgId,
    } = await req.json();

    if (!contactName || !email || !referralCode) {
      return jsonResponse(
        { success: false, error: "contactName, email, and referralCode are required" },
        400
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert referral record
    if (referrerOrgId) {
      const { error: insertError } = await supabase
        .from("k2c_referrals")
        .insert({
          referrer_org_id: referrerOrgId,
          referrer_code: referralCode,
          contact_name: contactName,
          business_name: businessName,
          email,
          phone: phone || null,
          role: role || null,
          message: message || null,
          status: "invited",
        });

      if (insertError) {
        logger.error("[K2C-INVITE] DB insert failed:", insertError);
      }
    }

    // Build and send email
    const referralUrl = `https://getevidly.com/ref/${referralCode}`;
    const senderName = referrerName || "A fellow kitchen operator";

    const bodyHtml = `
      <p>${senderName} thinks you'd love EvidLY — the food safety compliance platform that helps kitchens stay inspection-ready.</p>
      ${message ? `<div style="background: #f8fafc; border-left: 3px solid #A08C5A; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; font-size: 13px; color: #374151; font-style: italic;">"${message.substring(0, 500)}"</p></div>` : ""}
      <p>Here's the best part: for every kitchen that joins, EvidLY donates <strong style="color: #A08C5A;">12 meals to No Kid Hungry</strong>. It's compliance that feeds the community.</p>
      <p>Your referral code is: <strong style="font-family: monospace; color: #A08C5A; letter-spacing: 1px;">${referralCode}</strong></p>
    `;

    const html = buildEmailHtml({
      recipientName: contactName,
      bodyHtml,
      ctaText: "Get Started with EvidLY",
      ctaUrl: referralUrl,
      footerNote: `Referred by ${senderName} · Kitchen to Community Program`,
    });

    const emailResult = await sendEmail({
      to: email,
      subject: `${senderName} invited you to EvidLY — feed kids while staying compliant`,
      html,
      replyTo: "hello@getevidly.com",
    });

    logger.info("[K2C-INVITE] Processed", email, businessName, emailResult?.id);

    return jsonResponse({
      success: true,
      emailId: emailResult?.id || null,
    });
  } catch (err) {
    logger.error("[K2C-INVITE] Error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
