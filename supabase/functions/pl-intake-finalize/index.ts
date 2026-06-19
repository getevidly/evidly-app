import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { logEvent } from "../_shared/events.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";

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
      .select("source, phone_verified_at, agent_email_verified_at, policy_pdf_path, referral_code, business_name, contact_name, contact_email, contact_phone, zip, created_at, agent_email, agent_name")
      .eq("id", intake_id)
      .single();

    if (fetchErr || !intake) {
      return json({ error: "Intake not found" }, 400, headers);
    }

    // Reject if verification timestamp is null
    const verified =
      intake.source === "in_app"
        ? true
        : intake.source === "prospect"
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

    // Set policy_pdf_path + advance status to 'review'
    const pdfPath = `${intake_id}/policy.pdf`;
    const { error: updateErr } = await supabase
      .from("policy_lens_intakes")
      .update({ policy_pdf_path: pdfPath, status: "review" })
      .eq("id", intake_id);

    if (updateErr) {
      logger.error("[pl-intake-finalize] Update failed", updateErr);
      return json({ error: "Failed to finalize intake" }, 500, headers);
    }

    // ── Fire pl-extract chain (async, non-blocking) ──────────
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/pl-extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ intake_id }),
    }).catch((e) => logger.error("[pl-intake-finalize] pl-extract fire failed", e));

    // ── Log uploaded event ────────────��─────────────────────
    await logEvent(supabase, {
      event_type: "uploaded",
      intake_id,
      referral_code: intake.referral_code || undefined,
      metadata: { status_advanced: "review", pdf_path: pdfPath },
    });

    // ── After-finalize confirmation email (non-blocking) ────
    const userEmail = intake.contact_email || intake.agent_email;
    const userName = intake.contact_name || intake.agent_name || "there";
    if (userEmail) {
      try {
        await sendEmail({
          to: userEmail,
          subject: "Your documents are in — Policy Lens review underway",
          html: buildEmailHtml({
            recipientName: userName,
            bodyHtml: `
              <p>Your documents are uploaded and your Policy Lens review is underway. Our team is reading your policy now — identifying the provisions that govern your kitchen, and flagging anything missing or overdue.</p>
              <p>We'll send your results when the review is complete. Need to add anything in the meantime? Just reply.</p>
              <p>— Arthur Haggerty, Founder &amp; CEO<br>EvidLY</p>`,
          }),
        });
      } catch (confirmErr) {
        logger.error("[pl-intake-finalize] Confirmation email failed", confirmErr);
      }
    }

    // ── Fetch authorization status for notification ────────
    let authStatus = "none";
    if (intake.source === "agent") {
      const { data: authRow } = await supabase
        .from("policy_lens_authorizations")
        .select("status")
        .eq("intake_id", intake_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (authRow) authStatus = authRow.status;
    }

    // ── Notification email to founders (non-blocking) ─────
    try {
      const contactLabel = intake.contact_name || intake.business_name || "Unknown";
      const door = intake.source === "prospect" ? "Prospect" : "Agent";
      const createdDate = intake.created_at
        ? new Date(intake.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";

      const lines = [
        `<p><strong>Contact:</strong> ${contactLabel}</p>`,
        `<p><strong>Company:</strong> ${intake.business_name || "—"}</p>`,
        `<p><strong>Email:</strong> ${intake.contact_email || "—"}</p>`,
        `<p><strong>Phone:</strong> ${intake.contact_phone || "—"}</p>`,
        `<p><strong>ZIP:</strong> ${intake.zip || "—"}</p>`,
        `<p><strong>Door:</strong> ${door}</p>`,
        `<p><strong>Authorization:</strong> ${authStatus}</p>`,
        `<p><strong>Intake created:</strong> ${createdDate}</p>`,
        `<p><strong>PDF location:</strong> policy-lens-uploads/${pdfPath}</p>`,
      ].join("\n");

      await sendEmail({
        to: "founders@getevidly.com",
        subject: `Policy Lens intake — ${contactLabel} (${door})`,
        html: `<div style="font-family:sans-serif;font-size:14px;color:#1E2D4D;">\n${lines}\n</div>`,
      });
    } catch (emailErr) {
      logger.error("[pl-intake-finalize] Notification email failed", emailErr);
    }

    return json({ success: true, referral_code: intake.referral_code || null }, 200, headers);
  } catch (err) {
    logger.error("[pl-intake-finalize] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
