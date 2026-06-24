// supabase/functions/pl-release-report/index.ts
// Admin-only: release a reviewed extraction run to the agent.
// 1. Re-checks all findings are reviewed (server-side guard).
// 2. Mints a raw token, stores SHA-256 hash in pl_report_grants.
// 3. Sets pl_extraction_runs.release_status = 'released'.
// 4. Returns BOTH the confirmed grant AND run update; fails if either misses.
// Deploy: supabase functions deploy pl-release-report --project-ref irxgmhxhmxtzfwuieblc

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { logEvent } from "../_shared/events.ts";

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

// SHA-256 hex — same algo as pl-get-findings (token verification side)
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Grant TTL: 30 days. No existing convention — flagged for Arthur.
const GRANT_TTL_DAYS = 30;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Auth: verify caller is platform admin ──────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401, headers);
    }
    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401, headers);
    }

    const isAdmin = user.email?.endsWith("@getevidly.com") || false;

    if (!isAdmin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "platform_admin") {
        return json({ error: "Admin access required" }, 403, headers);
      }
    }

    // ── Parse body ─────────────────────────────────────────
    const body = await req.json();
    const { run_id, intake_id, recipient_party_id } = body as {
      run_id?: string;
      intake_id?: string;
      recipient_party_id?: string;
    };

    if (!run_id || !intake_id) {
      return json({ error: "run_id and intake_id required" }, 400, headers);
    }
    if (!recipient_party_id) {
      return json({ error: "recipient_party_id required — no grant minted without identifying the receiving broker" }, 400, headers);
    }

    // ── Resolve the authorizing org (insured) from the intake ───────
    const { data: intakeCheck, error: intakeErr } = await supabase
      .from("policy_lens_intakes")
      .select("organization_id")
      .eq("id", intake_id)
      .single();

    if (intakeErr || !intakeCheck) {
      return json({ error: "Intake not found" }, 404, headers);
    }
    const grantedByOrgId = intakeCheck.organization_id; // may be null for prospect intakes

    // ── Verify recipient broker exists ───────────────────────────
    const { data: recipientCheck, error: recipientErr } = await supabase
      .from("external_parties")
      .select("id, party_type")
      .eq("id", recipient_party_id)
      .single();

    if (recipientErr || !recipientCheck) {
      return json({ error: "Recipient party not found" }, 404, headers);
    }

    // ── Guard: verify the run exists and is not already released ────
    const { data: runCheck, error: runCheckErr } = await supabase
      .from("pl_extraction_runs")
      .select("id, status, release_status")
      .eq("id", run_id)
      .eq("intake_id", intake_id)
      .single();

    if (runCheckErr || !runCheck) {
      return json({ error: "Run not found" }, 404, headers);
    }
    if (runCheck.release_status === "released") {
      return json({ error: "Run already released" }, 409, headers);
    }

    // ── Guard: re-check ALL findings reviewed (server-side) ────────
    const { data: pendingFindings, error: pendErr } = await supabase
      .from("pl_findings")
      .select("id")
      .eq("run_id", run_id)
      .eq("review_state", "pending");

    if (pendErr) {
      logger.error("[pl-release-report] Pending check failed", pendErr);
      return json({ error: "Failed to verify findings" }, 500, headers);
    }
    if (pendingFindings && pendingFindings.length > 0) {
      return json(
        {
          error: `${pendingFindings.length} finding(s) still pending review`,
          pending_count: pendingFindings.length,
        },
        422,
        headers,
      );
    }

    // ── Mint token + hash ──────────────────────────────────
    const rawToken = crypto.randomUUID();
    const tokenHash = await sha256Hex(rawToken);
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + GRANT_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    // ── Insert grant (consent bound to both ends) ──────────
    const { data: grant, error: grantErr } = await supabase
      .from("pl_report_grants")
      .insert({
        intake_id,
        run_id,
        token_hash: tokenHash,
        door: "agent",
        expires_at: expiresAt.toISOString(),
        granted_by_org_id: grantedByOrgId,
        recipient_party_id,
        consent_type: "per_report",
      })
      .select("id, intake_id, run_id, door, expires_at, granted_by_org_id, recipient_party_id, consent_type, created_at")
      .single();

    if (grantErr || !grant) {
      logger.error("[pl-release-report] Grant insert failed", grantErr);
      return json(
        { error: "Failed to create report grant", detail: grantErr?.message },
        500,
        headers,
      );
    }

    // ── Update run release_status ──────────────────────────
    const { data: runUpdate, error: runUpErr } = await supabase
      .from("pl_extraction_runs")
      .update({
        release_status: "released",
        released_at: now.toISOString(),
        released_by: user.email,
      })
      .eq("id", run_id)
      .select("id, release_status, released_at, released_by")
      .single();

    if (runUpErr || !runUpdate) {
      // Grant was inserted but run update failed — log critically.
      // The grant is orphaned but harmless (run isn't released so
      // pl-get-findings will reject it). Don't report success.
      logger.error("[pl-release-report] Run update failed after grant insert", runUpErr);
      return json(
        { error: "Grant created but run update failed — contact support", detail: runUpErr?.message },
        500,
        headers,
      );
    }

    // ── Both confirmed — log event and return ──────────────
    await logEvent(supabase, {
      event_type: "report_sent",
      intake_id,
      metadata: {
        run_id,
        door: "agent",
        released_by: user.email,
        grant_id: grant.id,
        expires_at: expiresAt.toISOString(),
        granted_by_org_id: grantedByOrgId,
        recipient_party_id,
        consent_type: "per_report",
      },
    });

    logger.info("[pl-release-report] Released", {
      run_id,
      intake_id,
      grant_id: grant.id,
    });

    return json(
      {
        ok: true,
        grant,
        run: runUpdate,
        raw_token: rawToken,
      },
      200,
      headers,
    );
  } catch (err) {
    logger.error("[pl-release-report] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
