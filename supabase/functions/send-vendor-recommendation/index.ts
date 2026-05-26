// ============================================================
// Send Vendor Recommendation — email to founders@getevidly.com
// ============================================================
// Receives recommendation_id, queries the row + org name,
// builds branded email with full recommendation details,
// sends via Resend.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface RecommendationRequest {
  recommendation_id: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { recommendation_id }: RecommendationRequest = await req.json();

    if (!recommendation_id) {
      return new Response(
        JSON.stringify({ error: "recommendation_id is required" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // Fetch recommendation with org name
    const { data: rec, error: recErr } = await supabase
      .from("vendor_recommendations")
      .select("*, organizations(name)")
      .eq("id", recommendation_id)
      .single();

    if (recErr || !rec) {
      return new Response(
        JSON.stringify({ error: "Recommendation not found", details: recErr?.message }),
        { status: 404, headers: jsonHeaders },
      );
    }

    // Get submitter name
    let submitterName = "Unknown";
    if (rec.submitted_by) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name")
        .eq("id", rec.submitted_by)
        .single();
      if (profile?.full_name) submitterName = profile.full_name;
    }

    const orgName = rec.organizations?.name || "Unknown Organization";

    const html = buildEmailHtml({
      recipientName: "Partner Recruitment",
      bodyHtml: `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1e293b;">New Vendor Recommendation</h2>
          <table style="width: 100%; font-size: 14px; color: #334155; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; font-weight: 600; width: 160px;">Vendor Name</td><td style="padding: 6px 0;">${rec.vendor_name}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: 600;">Services</td><td style="padding: 6px 0;">${(rec.services || []).join(", ")}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: 600;">Contact Name</td><td style="padding: 6px 0;">${rec.contact_name}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: 600;">Email</td><td style="padding: 6px 0;"><a href="mailto:${rec.contact_email}">${rec.contact_email}</a></td></tr>
            ${rec.contact_phone ? `<tr><td style="padding: 6px 0; font-weight: 600;">Phone</td><td style="padding: 6px 0;">${rec.contact_phone}</td></tr>` : ""}
            <tr><td style="padding: 6px 0; font-weight: 600;">Counties Served</td><td style="padding: 6px 0;">${(rec.counties_served || []).join(", ")}</td></tr>
            ${rec.years_working_together ? `<tr><td style="padding: 6px 0; font-weight: 600;">Years Together</td><td style="padding: 6px 0;">${rec.years_working_together}</td></tr>` : ""}
            ${rec.approx_visit_count ? `<tr><td style="padding: 6px 0; font-weight: 600;">Approx. Visits</td><td style="padding: 6px 0;">${rec.approx_visit_count}</td></tr>` : ""}
          </table>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="font-weight: 600; margin: 0 0 8px 0;">Why Recommended</p>
            <p style="color: #475569; margin: 0; line-height: 1.5;">${rec.why_recommended}</p>
          </div>
        </div>
        <p style="color: #64748b; font-size: 13px;">Submitted by <strong>${submitterName}</strong> at <strong>${orgName}</strong></p>
      `,
      ctaText: "Review in Admin \u2192",
      ctaUrl: "https://app.getevidly.com/admin/vendor-recommendations",
    });

    const result = await sendEmail({
      to: "founders@getevidly.com",
      subject: `Vendor recommendation: ${rec.vendor_name} from ${orgName}`,
      html,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: result ? "Recommendation email sent" : "Recommendation logged (email service unavailable)",
        emailId: result?.id || null,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
