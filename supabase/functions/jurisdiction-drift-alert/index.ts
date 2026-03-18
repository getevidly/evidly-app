/**
 * JURISDICTION-DRIFT-MONITOR-02 — Drift alert email sender.
 *
 * Called by the fn_jurisdiction_config_drift_check() trigger via net.http_post.
 * Sends an email to the admin team when jurisdiction config drift is detected.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

const ALERT_RECIPIENT = "arthur@getevidly.com";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    logger.info("[DRIFT-ALERT] Received:", payload.jurisdiction_name, payload.config_changed || payload.alert_type);

    const isNoBaseline = payload.alert_type === "NO_BASELINE";
    const configChanged = payload.config_changed || "unknown";
    const changedBy = payload.changed_by || "unknown";
    const jurisdictionName = payload.jurisdiction_name || "Unknown Jurisdiction";
    const ticketNumber = payload.ticket_number || "Generating...";
    const ticketId = payload.ticket_id || "";

    // Build hash comparison rows
    const hashRows = isNoBaseline
      ? `
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Alert Type</td>
          <td style="padding:8px; border:1px solid #ddd; font-family:monospace;">NO BASELINE</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">New Grading Hash</td>
          <td style="padding:8px; border:1px solid #ddd; font-family:monospace; font-size:11px; word-break:break-all;">${payload.new_grading_hash || "n/a"}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">New Fire Hash</td>
          <td style="padding:8px; border:1px solid #ddd; font-family:monospace; font-size:11px; word-break:break-all;">${payload.new_fire_hash || "n/a"}</td>
        </tr>`
      : `
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Config Changed</td>
          <td style="padding:8px; border:1px solid #ddd;">${configChanged}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Old Hash</td>
          <td style="padding:8px; border:1px solid #ddd; font-family:monospace; font-size:11px; word-break:break-all;">${payload.old_hash || "none"}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">New Hash</td>
          <td style="padding:8px; border:1px solid #ddd; font-family:monospace; font-size:11px; word-break:break-all;">${payload.new_hash || "none"}</td>
        </tr>`;

    const ticketSection = ticketId
      ? `
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Support Ticket</td>
          <td style="padding:8px; border:1px solid #ddd; font-family:monospace;">${ticketNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Changed By</td>
          <td style="padding:8px; border:1px solid #ddd;">${changedBy}</td>
        </tr>`
      : "";

    const detectedAt = payload.detected_at
      ? new Date(payload.detected_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
      : new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });

    const bodyHtml = `
      <div style="background:#fff3f3; border:2px solid #d32f2f; border-radius:8px; padding:16px; margin-bottom:16px;">
        <h2 style="color:#d32f2f; margin:0 0 8px 0; font-size:18px;">
          ${isNoBaseline ? "⚠ NO BASELINE" : "🚨 JURISDICTION CONFIG DRIFT DETECTED"}
        </h2>
        <p style="margin:0; color:#333;">
          <strong>${jurisdictionName}</strong> — ${isNoBaseline
            ? "jurisdiction was updated but has no audit baseline."
            : `unauthorized change to <code>${configChanged}</code>.`}
        </p>
      </div>

      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Jurisdiction</td>
          <td style="padding:8px; border:1px solid #ddd;">${jurisdictionName}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Detected At</td>
          <td style="padding:8px; border:1px solid #ddd;">${detectedAt} PT</td>
        </tr>
        ${hashRows}
        ${ticketSection}
      </table>

      <hr />
      <p style="color:#d32f2f; font-weight:bold;">
        Support ticket ${ticketNumber} has been auto-created with CRITICAL priority.
      </p>
      <p>
        <strong>Next steps:</strong><br/>
        1. Review the change details above<br/>
        2. If unauthorized — revert immediately and update the ticket<br/>
        3. If authorized — update the baseline and resolve the ticket as false_alarm<br/>
        4. Ticket status: open → investigating → resolved OR false_alarm
      </p>
      <p style="color:#888; font-size:12px;">This alert was generated by EvidLY Jurisdiction Drift Monitor. Do not reply to this email.</p>
    `;

    const subject = isNoBaseline
      ? `[DRIFT] No baseline — ${jurisdictionName}`
      : `[DRIFT] ${jurisdictionName} — ${configChanged} changed (${ticketNumber})`;

    const html = buildEmailHtml({
      recipientName: "Arthur",
      bodyHtml,
      urgencyBanner: {
        text: isNoBaseline
          ? "JURISDICTION DRIFT: NO BASELINE FOUND"
          : "JURISDICTION DRIFT: UNAUTHORIZED CONFIG CHANGE DETECTED",
        color: "#d32f2f",
      },
    });

    await sendEmail({
      to: ALERT_RECIPIENT,
      subject,
      html,
    });

    logger.info("[DRIFT-ALERT] Email sent for", jurisdictionName, ticketNumber);

    return new Response(JSON.stringify({ ok: true, ticket_number: ticketNumber }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error("[DRIFT-ALERT] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
