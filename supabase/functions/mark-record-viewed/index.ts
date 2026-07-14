import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * mark-record-viewed
 *
 * Fires on an INTERACTIVE signal (password field focus) — never on page load.
 * Corporate email scanners prefetch every link; page-load firing would produce
 * false positives seconds after sending.
 *
 * Supports two actions:
 *   "viewed"  → stamps journey_stages.record_viewed_at, advances to 'record_viewed'
 *               (only if current_stage is 'invited' — never moves a stage backwards)
 *   "shared"  → logs to marketing_sends (the only send ledger)
 */
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { token, action } = body;

    if (!token || !action) {
      return json({ error: "token and action are required" }, 400, headers);
    }

    // ── Validate invite ───────────────────────────────────────
    const { data: invite, error: invErr } = await supabase
      .from("evidly_client_invites")
      .select("id, organization_id, status, contact_name")
      .eq("token", token)
      .single();

    if (invErr || !invite) {
      return json({ error: "Invalid token" }, 404, headers);
    }

    // ── action: viewed ────────────────────────────────────────
    if (action === "viewed") {
      if (invite.status !== "pending") {
        return json({ ok: true, skipped: true }, 200, headers);
      }

      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from("journey_stages")
        .update({
          record_viewed_at: now,
          current_stage: "record_viewed",
          updated_at: now,
        })
        .eq("organization_id", invite.organization_id)
        .eq("current_stage", "invited");

      if (updateErr) {
        logger.error("[mark-record-viewed] journey_stages update failed", updateErr);
        // Don't fail — the view was still real
      }

      return json({ ok: true }, 200, headers);
    }

    // ── action: shared ────────────────────────────────────────
    if (action === "shared") {
      const { recipient, send_type } = body;

      const { error: sendErr } = await supabase
        .from("marketing_sends")
        .insert({
          door: "join",
          send_type: send_type || "copy_link",
          recipient: recipient || null,
          token,
          status: "sent",
          sent_by: invite.contact_name,
          sent_at: new Date().toISOString(),
          account_id: invite.organization_id,
        });

      if (sendErr) {
        logger.error("[mark-record-viewed] marketing_sends insert failed", sendErr);
      }

      return json({ ok: true }, 200, headers);
    }

    return json({ error: "Unknown action" }, 400, headers);
  } catch (err) {
    logger.error("[mark-record-viewed] unexpected error", err);
    return json({ error: "Internal error" }, 500, headers);
  }
});
