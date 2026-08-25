/**
 * PL Agent Request — public backend for the agent's "request a read for
 * a client" form and the ref-keyed sample page.
 *
 *   POST { action: "lookup",  ref_code }
 *     -> { name, agency, license, email, phone }   404 on unknown code
 *
 *   POST { action: "request", ref_code, client_name, client_email }
 *     -> { ok: true }                              404 / 400 / 429
 *
 * Public by design (verify_jwt = false): an agent follows a ref link and
 * fills the form without an account. The ref_code is the only key, so
 * both actions are rate limited — lookups per IP, requests per agent.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/logger.ts";

const LOOKUP_MAX = 30;
const LOOKUP_WINDOW = 3600; // 1 hour
const REQUEST_MAX = 10;
const REQUEST_WINDOW = 86400; // 1 day

/** Deliberately permissive — a plausible address, not RFC 5322. */
const EMAIL_RE = /^[^\s@]+@[^\s@,]+\.[^\s@,]{2,}$/;

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

/** First hop in x-forwarded-for is the client; fall back to a shared bucket. */
function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    if (req.method !== "POST") {
      return json({ error: "POST only" }, 405, headers);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, headers);
    }

    const action = typeof body.action === "string" ? body.action : "";
    const refCode = typeof body.ref_code === "string" ? body.ref_code.trim() : "";

    if (action !== "lookup" && action !== "request") {
      return json({ error: 'action must be "lookup" or "request"' }, 400, headers);
    }
    if (!refCode) {
      return json({ error: "ref_code required" }, 400, headers);
    }

    // ── action: lookup ───────────────────────────────────────
    if (action === "lookup") {
      const limit = await checkRateLimit({
        key: `pl_agent_lookup:${clientIp(req)}`,
        maxRequests: LOOKUP_MAX,
        windowSeconds: LOOKUP_WINDOW,
        supabase,
      });
      if (!limit.allowed) {
        return json({ error: "Too many lookups — try again later" }, 429, headers);
      }

      const { data: agent, error: agentErr } = await supabase
        .from("pl_agents")
        .select("name, agency, license, email, phone")
        .eq("ref_code", refCode)
        .maybeSingle();

      if (agentErr) {
        logger.error("[pl-agent-request] Agent lookup failed", agentErr);
        return json({ error: "Lookup failed" }, 500, headers);
      }
      if (!agent) {
        return json({ error: "Unknown ref code" }, 404, headers);
      }

      return json(agent, 200, headers);
    }

    // ── action: request ──────────────────────────────────────
    const clientName =
      typeof body.client_name === "string" ? body.client_name.trim() : "";
    const clientEmail =
      typeof body.client_email === "string" ? body.client_email.trim() : "";

    if (!clientName) {
      return json({ error: "client_name required" }, 400, headers);
    }
    if (!EMAIL_RE.test(clientEmail)) {
      return json({ error: "A valid client_email is required" }, 400, headers);
    }

    // The code identifies the agent — resolve before spending the budget.
    const { data: agent, error: agentErr } = await supabase
      .from("pl_agents")
      .select("id, name, agency, ref_code")
      .eq("ref_code", refCode)
      .maybeSingle();

    if (agentErr) {
      logger.error("[pl-agent-request] Agent lookup failed", agentErr);
      return json({ error: "Lookup failed" }, 500, headers);
    }
    if (!agent) {
      return json({ error: "Unknown ref code" }, 404, headers);
    }

    const limit = await checkRateLimit({
      key: `pl_agent_request:${agent.id}`,
      maxRequests: REQUEST_MAX,
      windowSeconds: REQUEST_WINDOW,
      supabase,
    });
    if (!limit.allowed) {
      return json(
        { error: "Too many requests for this agent today" },
        429,
        headers,
      );
    }

    // ── The agent asked. Recorded whether or not the send lands. ──
    const { error: requestedErr } = await supabase
      .from("pl_send_events")
      .insert({
        agent_id: agent.id,
        kind: "client_requested",
        recipient_name: clientName,
        recipient_email: clientEmail,
      });
    if (requestedErr) {
      logger.error("[pl-agent-request] client_requested insert failed", requestedErr);
    }

    // ── Internal service-role call to pl-invite, policyholder door ──
    // skip_send_event: pl-invite must not write client_sent as well —
    // this function owns that row, with the recipient fields.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let inviteOk = false;
    let inviteError = "invite call failed";
    try {
      const inviteResp = await fetch(`${supabaseUrl}/functions/v1/pl-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          agent_id: agent.id,
          door: "policyholder",
          recipient_name: clientName,
          recipient_email: clientEmail,
          skip_send_event: true,
        }),
      });
      inviteOk = inviteResp.ok;
      if (!inviteOk) {
        const detail = await inviteResp.json().catch(() => null);
        inviteError = detail?.error || `pl-invite ${inviteResp.status}`;
        logger.error("[pl-agent-request] pl-invite rejected", {
          status: inviteResp.status,
          error: inviteError,
        });
      }
    } catch (inviteErr) {
      logger.error("[pl-agent-request] pl-invite call threw", inviteErr);
    }

    if (!inviteOk) {
      // client_requested stands — the ask happened. No client_sent row,
      // because nothing was sent.
      return json({ error: inviteError }, 502, headers);
    }

    const { error: sentErr } = await supabase.from("pl_send_events").insert({
      agent_id: agent.id,
      kind: "client_sent",
      recipient_name: clientName,
      recipient_email: clientEmail,
    });
    if (sentErr) {
      logger.error("[pl-agent-request] client_sent insert failed", sentErr);
    }

    return json({ ok: true }, 200, headers);
  } catch (err) {
    logger.error("[pl-agent-request] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
