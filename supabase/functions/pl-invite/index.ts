import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";
import {
  buildCompanyInviteEmail,
  buildAgentInviteEmail,
} from "../_shared/invites.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { logEvent } from "../_shared/events.ts";
import { logger } from "../_shared/logger.ts";

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

async function decrementRateLimit(
  supabase: ReturnType<typeof createClient>,
  key: string,
): Promise<void> {
  try {
    const { data: bucket } = await supabase
      .from("rate_limit_buckets")
      .select("count")
      .eq("key", key)
      .single();
    if (bucket && bucket.count > 0) {
      await supabase
        .from("rate_limit_buckets")
        .update({ count: bucket.count - 1 })
        .eq("key", key);
    }
  } catch {
    // Best-effort
  }
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
    const { intake_id, recipient_name, recipient_email, door } = body;

    if (!intake_id || !recipient_name || !recipient_email || !door) {
      return json(
        {
          error:
            "intake_id, recipient_name, recipient_email, and door required",
        },
        400,
        headers,
      );
    }

    if (!["company", "agent"].includes(door)) {
      return json(
        { error: 'door must be "company" or "agent"' },
        400,
        headers,
      );
    }

    // ── Fetch intake ─────────────────────────────────────────
    const { data: intake, error: fetchErr } = await supabase
      .from("policy_lens_intakes")
      .select(
        "referral_code, contact_name, business_name, agent_name, agency_name",
      )
      .eq("id", intake_id)
      .single();

    if (fetchErr || !intake) {
      return json({ error: "Intake not found" }, 404, headers);
    }

    if (!intake.referral_code) {
      return json({ error: "Intake has no referral code" }, 400, headers);
    }

    // ── Rate limit ───────────────────────────────────────────
    const rateLimitKey = `pl_invite:${intake_id}`;
    const limit = await checkRateLimit({
      key: rateLimitKey,
      maxRequests: 10,
      windowSeconds: 86400,
      supabase,
    });
    if (!limit.allowed) {
      return json(
        { error: "Too many invites — try again tomorrow" },
        429,
        headers,
      );
    }

    // ── Build email ──────────────────────────────────────────
    const publicBase =
      Deno.env.get("PL_PUBLIC_BASE") || "https://getevidly.com";
    const referralLink = `${publicBase}/policy-lens/review?ref=${intake.referral_code}`;

    let emailContent: { subject: string; html: string };
    if (door === "company") {
      emailContent = buildCompanyInviteEmail({
        senderName:
          intake.contact_name || intake.business_name || "A kitchen leader",
        senderOrg: intake.business_name || "",
        recipientName: recipient_name,
        referralLink,
      });
    } else {
      emailContent = buildAgentInviteEmail({
        senderName: intake.agent_name || "An agent",
        senderOrg: intake.agency_name || "",
        recipientName: recipient_name,
        referralLink,
      });
    }

    // ── Blocking send ────────────────────────────────────────
    const sendResult = await sendEmail({
      to: recipient_email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (!sendResult) {
      await decrementRateLimit(supabase, rateLimitKey);
      return json(
        {
          error:
            "We couldn't send the invite — please check the email address and try again.",
        },
        502,
        headers,
      );
    }

    // ── Log invite row ───────────────────────────────────────
    await supabase.from("policy_lens_invites").insert({
      intake_id,
      referral_code: intake.referral_code,
      recipient_name,
      recipient_email,
      channel: "email",
    });

    // ── Log event (non-blocking) ─────────────────────────────
    await logEvent(supabase, {
      event_type: "invite_sent",
      intake_id,
      referral_code: intake.referral_code,
      metadata: { recipient_email, door },
    });

    return json({ success: true }, 200, headers);
  } catch (err) {
    logger.error("[pl-invite] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
