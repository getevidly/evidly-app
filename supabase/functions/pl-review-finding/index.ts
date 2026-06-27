// supabase/functions/pl-review-finding/index.ts
// Admin-only: record a reviewer's verdict on a single Policy Lens finding.
// Writes review_state + reviewed_by (admin user.id) + reviewed_at (now), and on
// a 'correct' action stores the {body, risk, reason} edit in reviewer_corrected.
//
// This is the function the ExtractionDetail "Mark Reviewed / Accept / Correct /
// Flag" actions call. Setting reviewed_by/reviewed_at is what satisfies the
// provenance guard in pl-release-report (a genuine UI review stamps these;
// raw SQL setting review_state alone does not).
//
// Input:  { finding_id: uuid, action: 'accept'|'correct'|'flag', corrected?: {body,risk}, reason?: code, notes?: string }
// Output: { ok: true, finding: { id, review_state, reviewed_by, reviewed_at, reviewer_corrected, flag_detail } }
// Auth:   admin JWT (same model as pl-release-report).
// Deploy: supabase functions deploy pl-review-finding --project-ref irxgmhxhmxtzfwuieblc

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Auth: admin (same model as pl-release-report) ──────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, error: "Unauthorized" }, 401, headers);
    }
    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ ok: false, error: "Unauthorized" }, 401, headers);
    }
    const isAdmin = user.email?.endsWith("@getevidly.com") || false;
    if (!isAdmin) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "platform_admin") {
        return json({ ok: false, error: "Admin access required" }, 403, headers);
      }
    }

    // ── Parse body ─────────────────────────────────────────────
    const body = await req.json();
    const { finding_id, action, corrected, reason, notes } = body as {
      finding_id?: string;
      action?: string;
      corrected?: { body?: string; risk?: string };
      reason?: string;   // dropdown reason CODE (correct + flag)
      notes?: string;    // optional free-text elaboration
    };

    if (!finding_id) {
      return json({ ok: false, error: "finding_id required" }, 400, headers);
    }
    if (action !== "accept" && action !== "correct" && action !== "flag") {
      return json(
        { ok: false, error: "action must be accept, correct, or flag" },
        400,
        headers,
      );
    }
    if (action === "correct") {
      if (!corrected || typeof corrected !== "object") {
        return json(
          { ok: false, error: "corrected payload required for action=correct" },
          400,
          headers,
        );
      }
    }
    // reason (dropdown code) is required on BOTH correct and flag — accept is silent.
    if (action === "correct" || action === "flag") {
      if (typeof reason !== "string" || reason.trim() === "") {
        return json(
          { ok: false, error: `reason code is required for action=${action}` },
          400,
          headers,
        );
      }
    }

    // ── Confirm the finding exists ─────────────────────────────
    const { data: existing, error: exErr } = await supabase
      .from("pl_findings")
      .select("id, run_id")
      .eq("id", finding_id)
      .single();
    if (exErr || !existing) {
      return json({ ok: false, error: "Finding not found" }, 404, headers);
    }

    // ── Build the update ───────────────────────────────────────
    const now = new Date().toISOString();
    const review_state = action === "flag" ? "flagged" : "accepted";

    const update: Record<string, unknown> = {
      review_state,
      reviewed_by: user.id,   // UUID — satisfies the provenance guard
      reviewed_at: now,
    };

    // Only 'correct' writes reviewer_corrected. accept/flag leave it untouched.
    if (action === "correct") {
      update.reviewer_corrected = {
        body: corrected!.body ?? null,
        risk: corrected!.risk ?? null,
        reason_code: reason!,
        notes: (typeof notes === "string" && notes.trim() !== "") ? notes : null,
      };
    }
    // Only 'flag' writes flag_detail (workflow data — never sealed; flags block release).
    if (action === "flag") {
      update.flag_detail = {
        reason_code: reason!,
        notes: (typeof notes === "string" && notes.trim() !== "") ? notes : null,
      };
    }

    const { data: updated, error: upErr } = await supabase
      .from("pl_findings")
      .update(update)
      .eq("id", finding_id)
      .select("id, review_state, reviewed_by, reviewed_at, reviewer_corrected, flag_detail")
      .single();

    if (upErr || !updated) {
      return json(
        { ok: false, error: "Failed to record verdict", detail: upErr?.message },
        500,
        headers,
      );
    }

    return json({ ok: true, finding: updated }, 200, headers);
  } catch (err) {
    return json(
      { ok: false, error: "Internal server error", detail: (err as Error).message },
      500,
      headers,
    );
  }
});
