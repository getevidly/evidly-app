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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { intake_id } = await req.json();
    if (!intake_id) {
      return json({ error: "intake_id required" }, 400, headers);
    }

    // Fetch intake
    const { data: intake, error: fetchErr } = await supabase
      .from("policy_lens_intakes")
      .select("source, phone_verified_at, agent_email_verified_at, policy_pdf_path, referral_code")
      .eq("id", intake_id)
      .single();

    if (fetchErr || !intake) {
      return json({ error: "Intake not found" }, 400, headers);
    }

    // Reject if verification timestamp is null
    const verified =
      intake.source === "prospect"
        ? intake.phone_verified_at
        : intake.agent_email_verified_at;

    if (!verified) {
      return json({ error: "Verification required" }, 403, headers);
    }

    // ── Authorization gate (agent door) ───────────────────────
    if (intake.source === "agent") {
      const { data: auth } = await supabase
        .from("policy_lens_authorizations")
        .select("status")
        .eq("intake_id", intake_id)
        .in("status", ["signed", "attested"])
        .limit(1)
        .single();

      if (!auth) {
        return json({ error: "Client authorization required" }, 403, headers);
      }
    }

    // Check object exists in storage
    const { data: files, error: listErr } = await supabase.storage
      .from("policy-lens-uploads")
      .list(intake_id);

    const pdfFile = files?.find(
      (f: { name: string }) => f.name === "policy.pdf",
    );
    if (listErr || !pdfFile) {
      return json({ error: "No PDF uploaded" }, 400, headers);
    }

    // Verify file constraints
    if (
      pdfFile.metadata?.mimetype &&
      pdfFile.metadata.mimetype !== "application/pdf"
    ) {
      return json({ error: "Uploaded file must be a PDF" }, 400, headers);
    }
    if (pdfFile.metadata?.size && pdfFile.metadata.size > 26214400) {
      return json({ error: "PDF must be 25 MB or smaller" }, 400, headers);
    }

    // Set policy_pdf_path — status stays 'received'
    const { error: updateErr } = await supabase
      .from("policy_lens_intakes")
      .update({ policy_pdf_path: `${intake_id}/policy.pdf` })
      .eq("id", intake_id);

    if (updateErr) {
      logger.error("[pl-intake-finalize] Update failed", updateErr);
      return json({ error: "Failed to finalize intake" }, 500, headers);
    }

    // ── Log uploaded event ──────────────────────────────────
    await logEvent(supabase, {
      event_type: "uploaded",
      intake_id,
      referral_code: intake.referral_code || undefined,
    });

    return json({ success: true, referral_code: intake.referral_code || null }, 200, headers);
  } catch (err) {
    logger.error("[pl-intake-finalize] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
