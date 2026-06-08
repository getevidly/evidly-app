import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { logEvent } from "../_shared/events.ts";

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

    // ── Auth: verify caller is platform admin ──────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401, headers);
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401, headers);
    }

    const isAdmin =
      user.email?.endsWith("@getevidly.com") ||
      false;

    // Also check profile role
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

    const body = await req.json();
    const { action, intake_id } = body;

    if (!action || !intake_id) {
      return json({ error: "action and intake_id required" }, 400, headers);
    }

    // ── ACTION: signed_url ─────────────────────────────────
    if (action === "signed_url") {
      const { data: intake } = await supabase
        .from("policy_lens_intakes")
        .select("policy_pdf_path")
        .eq("id", intake_id)
        .single();

      if (!intake?.policy_pdf_path) {
        return json({ error: "No PDF uploaded for this intake" }, 404, headers);
      }

      const { data: urlData, error: urlErr } = await supabase.storage
        .from("policy-lens-uploads")
        .createSignedUrl(intake.policy_pdf_path, 3600);

      if (urlErr || !urlData?.signedUrl) {
        logger.error("[pl-admin] Signed URL failed", urlErr);
        return json({ error: "Failed to create signed URL" }, 500, headers);
      }

      return json({ signed_url: urlData.signedUrl }, 200, headers);
    }

    // ── ACTION: mark_report_sent ───────────────────────────
    if (action === "mark_report_sent") {
      const { data: intake } = await supabase
        .from("policy_lens_intakes")
        .select("source, status")
        .eq("id", intake_id)
        .single();

      if (!intake) {
        return json({ error: "Intake not found" }, 404, headers);
      }

      const now = new Date().toISOString();
      const updateFields: Record<string, unknown> = {
        status: "report_sent",
        report_sent_to_prospect_at: now,
      };
      if (intake.source === "agent") {
        updateFields.report_sent_to_agent_at = now;
      }

      const { error: updateErr } = await supabase
        .from("policy_lens_intakes")
        .update(updateFields)
        .eq("id", intake_id);

      if (updateErr) {
        logger.error("[pl-admin] Mark report sent failed", updateErr);
        return json({ error: "Failed to update intake" }, 500, headers);
      }

      await logEvent(supabase, {
        event_type: "report_sent",
        intake_id,
        metadata: { marked_by: user.email, source: intake.source },
      });

      return json({ success: true }, 200, headers);
    }

    return json({ error: `Unknown action: ${action}` }, 400, headers);
  } catch (err) {
    logger.error("[pl-admin] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
