import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { verifySignToken } from "../_shared/disclosure.ts";
import { logger } from "../_shared/logger.ts";
import { stampJourneyStage } from "../_shared/journeyStamp.ts";

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { token, signature_name } = body;

    if (!token || !signature_name) {
      return json({ error: "token and signature_name required" }, 400, headers);
    }

    // ── Verify HMAC token ────────────────────────────────────
    let tokenPayload: { aid: string; exp: number };
    try {
      tokenPayload = await verifySignToken(token);
    } catch {
      return json(
        { error: "Invalid or expired authorization link" },
        403,
        headers,
      );
    }

    // ── Fetch authorization ──────────────────────────────────
    const { data: auth, error: authErr } = await supabase
      .from("policy_lens_authorizations")
      .select("id, intake_id, status, client_name")
      .eq("id", tokenPayload.aid)
      .single();

    if (authErr || !auth) {
      return json({ error: "Authorization not found" }, 400, headers);
    }

    if (auth.status !== "requested") {
      return json(
        { error: "This authorization has already been completed" },
        409,
        headers,
      );
    }

    // ── Fetch intake for agent details ───────────────────────
    const { data: intake } = await supabase
      .from("policy_lens_intakes")
      .select("agent_email, agent_name")
      .eq("id", auth.intake_id)
      .single();

    if (!intake) {
      return json({ error: "Intake not found" }, 400, headers);
    }

    const now = new Date().toISOString();
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // ── Update authorization → signed ────────────────────────
    const { error: updateErr } = await supabase
      .from("policy_lens_authorizations")
      .update({
        status: "signed",
        signature_name,
        signed_at: now,
        sign_ip: clientIp,
        sign_user_agent: userAgent,
      })
      .eq("id", auth.id);

    if (updateErr) {
      logger.error("[pl-authorize-sign] Update failed", updateErr);
      return json({ error: "Failed to record signature" }, 500, headers);
    }

    // Journey stage: loa_signed — resolve org from intake
    try {
      const { data: intakeOrg } = await supabase
        .from("policy_lens_intakes")
        .select("organization_id")
        .eq("id", auth.intake_id)
        .maybeSingle();
      if (intakeOrg?.organization_id) {
        await stampJourneyStage(supabase, intakeOrg.organization_id, "loa_signed");
      }
    } catch (e) {
      logger.error("[pl-authorize-sign] loa_signed stamp failed", e);
    }

    // ── Log event ────────────────────────────────────────────
    await supabase.from("policy_lens_events").insert({
      event_type: "authorization_signed",
      intake_id: auth.intake_id,
      metadata: { authorization_id: auth.id, method: "esign" },
    });

    // ── Email agent "ready to upload" (blocking-send) ────────
    const publicBase =
      Deno.env.get("PL_PUBLIC_BASE") || "https://getevidly.com";
    const resumeLink = `${publicBase}/policy-lens/review?intake=${auth.intake_id}`;

    const agentEmailResult = await sendEmail({
      to: intake.agent_email,
      subject: "Client signed — ready to upload policy",
      html: buildEmailHtml({
        recipientName: intake.agent_name || "Agent",
        bodyHtml: `
          <p><strong>${auth.client_name}</strong> has signed the authorization
          for their policy review.</p>
          <p>You can now continue by uploading the policy document.</p>`,
        ctaText: "Continue Upload",
        ctaUrl: resumeLink,
      }),
    });

    if (!agentEmailResult) {
      return json(
        {
          error:
            "Signature recorded but we couldn't notify the agent — they can check status manually.",
        },
        502,
        headers,
      );
    }

    return json({ success: true, status: "signed" }, 200, headers);
  } catch (err) {
    logger.error("[pl-authorize-sign] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
