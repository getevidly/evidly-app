// supabase/functions/pl-review-finding/index.ts
// Admin-only: accept / correct / flag a single pl_findings row.
// Writes via service-role client; reviewed_by comes from the verified session.
// Deploy: supabase functions deploy pl-review-finding --project-ref irxgmhxhmxtzfwuieblc

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

const VALID_ACTIONS = ["accept", "correct", "flag"] as const;
type Action = (typeof VALID_ACTIONS)[number];

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
    const { finding_id, action, corrected } = body as {
      finding_id?: string;
      action?: string;
      corrected?: Record<string, unknown>;
    };

    if (!finding_id || !action) {
      return json({ error: "finding_id and action required" }, 400, headers);
    }
    if (!VALID_ACTIONS.includes(action as Action)) {
      return json(
        { error: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
        400,
        headers,
      );
    }

    // ── Build update payload ───────────────────────────────
    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      reviewed_by: user.email,
      reviewed_at: now,
    };

    if (action === "accept") {
      update.review_state = "accepted";
    } else if (action === "flag") {
      update.review_state = "flagged";
    } else if (action === "correct") {
      if (!corrected || typeof corrected !== "object") {
        return json(
          { error: "corrected (jsonb) required for action=correct" },
          400,
          headers,
        );
      }
      update.review_state = "corrected";
      // Append-only: store reviewer's value; agent_payload untouched.
      update.reviewer_corrected = corrected;
    }

    // ── Write + confirm ────────────────────────────────────
    const { data: row, error: updateErr } = await supabase
      .from("pl_findings")
      .update(update)
      .eq("id", finding_id)
      .select(
        "id, review_state, reviewed_by, reviewed_at, reviewer_corrected, flag, part, finding_key",
      )
      .single();

    if (updateErr || !row) {
      logger.error("[pl-review-finding] Update failed", updateErr);
      return json(
        { error: "Failed to update finding", detail: updateErr?.message },
        500,
        headers,
      );
    }

    logger.info("[pl-review-finding] Verdict recorded", {
      finding_id,
      action,
      reviewer: user.email,
    });

    return json({ ok: true, finding: row }, 200, headers);
  } catch (err) {
    logger.error("[pl-review-finding] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
