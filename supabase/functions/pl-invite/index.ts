import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";
import {
  buildCompanyInviteEmail,
  buildAgentInviteEmail,
  buildInsuranceProInviteEmail,
  buildPolicyholderInviteEmail,
} from "../_shared/invites.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { logEvent } from "../_shared/events.ts";
import { logger } from "../_shared/logger.ts";
import { generateTrackToken } from "../_shared/disclosure.ts";
import type { TrackKind } from "../_shared/disclosure.ts";

/** Sender address for agent-led policyholder mail. Verified with Resend. */
const NOREPLY_ADDRESS = "noreply@getevidly.com";

/**
 * Build a pl-track URL. Open pixels are action o; clicks are action c
 * and carry their final destination in `to`, which pl-track validates
 * against its own host allowlist before redirecting.
 */
async function trackUrl(
  agentId: string | null,
  intakeId: string | null,
  kind: TrackKind,
  destination?: string,
): Promise<string> {
  const token = await generateTrackToken({
    agent_id: agentId,
    intake_id: intakeId,
    kind,
  });
  const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1/pl-track`;
  return destination
    ? `${base}?a=c&t=${encodeURIComponent(token)}&to=${encodeURIComponent(destination)}`
    : `${base}?a=o&t=${encodeURIComponent(token)}`;
}

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
    const {
      intake_id,
      agent_id,
      recipient_name,
      recipient_email,
      door,
      // Internal: the caller owns the pl_send_events write for this send.
      skip_send_event,
    } = body;

    if (!recipient_name || !recipient_email || !door) {
      return json(
        { error: "recipient_name, recipient_email, and door required" },
        400,
        headers,
      );
    }

    // Exactly one source of identity — an intake, or an agent.
    if (!intake_id && !agent_id) {
      return json(
        { error: "one of intake_id or agent_id required" },
        400,
        headers,
      );
    }
    if (intake_id && agent_id) {
      return json(
        { error: "intake_id and agent_id are mutually exclusive" },
        400,
        headers,
      );
    }

    const DOORS = ["company", "agent", "insurance_pro", "policyholder"];
    if (!DOORS.includes(door)) {
      return json(
        { error: `door must be one of: ${DOORS.join(", ")}` },
        400,
        headers,
      );
    }

    // Only the two agent-facing doors can be driven from a pl_agents row.
    // company/agent stay intake-only — their copy quotes intake fields.
    const AGENT_DOORS = ["insurance_pro", "policyholder"];
    if (agent_id && !AGENT_DOORS.includes(door)) {
      return json(
        { error: `agent_id is only valid for doors: ${AGENT_DOORS.join(", ")}` },
        400,
        headers,
      );
    }

    // ── Resolve identity: intake row, or pl_agents row ───────
    // senderName/senderOrg feed the intake-door templates; agentName/
    // agencyName feed the policyholder template; refCode builds the link.
    let refCode: string;
    let contactName = "";
    let businessName = "";
    let agentName = "";
    let agencyName = "";
    let agentEmail: string | null = null;
    let rateLimitKey: string;

    if (agent_id) {
      const { data: agent, error: agentErr } = await supabase
        .from("pl_agents")
        .select("id, name, agency, email, ref_code")
        .eq("id", agent_id)
        .single();

      if (agentErr || !agent) {
        return json({ error: "Agent not found" }, 404, headers);
      }
      if (!agent.ref_code) {
        return json({ error: "Agent has no referral code" }, 400, headers);
      }

      refCode = agent.ref_code;
      agentName = agent.name || "Your agent";
      agencyName = agent.agency || "";
      agentEmail = agent.email || null;
      rateLimitKey = `pl_invite:agent:${agent_id}`;
    } else {
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

      refCode = intake.referral_code;
      contactName = intake.contact_name || "";
      businessName = intake.business_name || "";
      agentName = intake.agent_name || "";
      agencyName = intake.agency_name || "";
      rateLimitKey = `pl_invite:${intake_id}`;
    }

    // ── Rate limit ───────────────────────────────────────────
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
    const referralLink = `${publicBase}/policy-lens/review?ref=${refCode}`;

    // ── pl-track wrapping (both PL doors, either source) ─────
    // The token carries whichever identifier this send has: agent_id
    // for an agent-led send, intake_id for an intake-sourced one.
    // company/agent doors are never wrapped.
    let ctaUrl: string | undefined;
    let pixelUrl: string | undefined;
    if (door === "insurance_pro" || door === "policyholder") {
      const clickKind: TrackKind = door === "policyholder" ? "client_clicked" : "invite_clicked";
      const openKind: TrackKind = door === "policyholder" ? "client_opened" : "invite_opened";
      const destination = door === "policyholder"
        ? referralLink
        : `https://getevidly.com/policy-lens/sample-agent?ref=${encodeURIComponent(refCode)}`;
      const tokenAgentId = agent_id ?? null;
      const tokenIntakeId = intake_id ?? null;
      ctaUrl = await trackUrl(tokenAgentId, tokenIntakeId, clickKind, destination);
      pixelUrl = await trackUrl(tokenAgentId, tokenIntakeId, openKind);
    }

    let emailContent: { subject: string; html: string };
    if (door === "company") {
      emailContent = buildCompanyInviteEmail({
        senderName: contactName || businessName || "A kitchen leader",
        senderOrg: businessName,
        recipientName: recipient_name,
        referralLink,
      });
    } else if (door === "agent") {
      emailContent = buildAgentInviteEmail({
        senderName: agentName || "An agent",
        senderOrg: agencyName,
        recipientName: recipient_name,
        referralLink,
      });
    } else if (door === "insurance_pro") {
      emailContent = buildInsuranceProInviteEmail({
        recipientName: recipient_name,
        ctaUrl,
        pixelUrl,
      });
    } else {
      // policyholder — sent on an agent's request. The agent identity comes
      // from pl_agents when agent_id was supplied, else off the intake.
      emailContent = buildPolicyholderInviteEmail({
        recipientName: recipient_name,
        agentName: agentName || "Your agent",
        agencyName,
        entryLink: referralLink,
        ctaUrl,
        pixelUrl,
      });
    }

    // ── Blocking send ────────────────────────────────────────
    // Agent-led policyholder mail carries the agent's name in the From
    // display and their address as Reply-To, so a reply reaches the
    // agent, not us. The envelope address stays the verified noreply.
    const agentLed = Boolean(agent_id) && door === "policyholder";
    const sendResult = await sendEmail({
      to: recipient_email,
      subject: emailContent.subject,
      html: emailContent.html,
      from: agentLed && agentName
        ? `${agentName} via EvidLY <${NOREPLY_ADDRESS}>`
        : undefined,
      replyTo: agentLed && agentEmail ? agentEmail : undefined,
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
    // On the agent branch intake_id is null by design — attribution for
    // those sends lives in pl_send_events, not here. No new columns.
    await supabase.from("policy_lens_invites").insert({
      intake_id: intake_id ?? null,
      referral_code: refCode,
      recipient_name,
      recipient_email,
      channel: "email",
    });

    // ── Log event (non-blocking) ─────────────────────────────
    await logEvent(supabase, {
      event_type: "invite_sent",
      intake_id: intake_id ?? undefined,
      referral_code: refCode,
      metadata: { recipient_email, door },
    });

    // ── Agent attribution (pl_send_events) ───────────────────
    // Only the agent branch carries an agent_id to attribute to. The
    // caller can own this write instead by passing skip_send_event —
    // pl-agent-request does, so client_sent is logged once, by it.
    if (agent_id && !skip_send_event) {
      // Best-effort attribution. An internal service-role call has no
      // user behind it, so sent_by stays null there.
      let sentBy: string | null = null;
      const authHeader = req.headers.get("authorization");
      const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      if (bearer && bearer !== serviceKey.trim()) {
        try {
          const { data: { user } } = await supabase.auth.getUser(bearer);
          sentBy = user?.id ?? null;
        } catch {
          sentBy = null;
        }
      }

      const { error: sendEventErr } = await supabase
        .from("pl_send_events")
        .insert({
          agent_id,
          intake_id: intake_id ?? null,
          kind: door === "policyholder" ? "client_sent" : "invite_sent",
          recipient_name,
          recipient_email,
          sent_by: sentBy,
        });
      if (sendEventErr) {
        logger.error("[pl-invite] Send event insert failed", sendEventErr);
      }
    }

    return json({ success: true }, 200, headers);
  } catch (err) {
    logger.error("[pl-invite] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
