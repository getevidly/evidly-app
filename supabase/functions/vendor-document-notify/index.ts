/**
 * Vendor Document Upload Notification
 *
 * Sends a branded, email-safe HTML notification when a vendor uploads
 * documents via a secure link.  Payload contract defined by
 * vendor-secure-upload.
 *
 * Firing model: fires on UPLOAD (status = pending_review).
 * Copy says "received / pending your review," never "sealed" or "on file."
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sendEmail } from "../_shared/email.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const corsHeaders = getCorsHeaders(null);

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Payload types ─────────────────────────────────────────────── */

interface DocRecord {
  display_name: string;
  group: string;
  category: string;
  maps_to: string | null;
  cadence: string | null;
}

interface Standing {
  pillar_label: string;
  on_file: number;
  total: number;
  pending: number;
}

interface Payload {
  recipientEmail: string;
  recipientName: string;
  vendor_name: string;
  org_name: string;
  doc_count: number;
  records: DocRecord[];
  standing: Standing | null;
  action_url: string;
  uploaded_by?: { type: "vendor" | "user" | "mixed"; name: string };
}

/* ── Design tokens ─────────────────────────────────────────────── */

const NAVY    = "#1E2D4D";
const CREAM   = "#FAF7F0";
const EMBER   = "#B24A2E";
const AMBER   = "#8a5a12";
const AMBERBG = "#FEF3C7";
const LINE    = "#EEE7D9";
const MUTED   = "#5F6875";
const OUTER   = "#F5F0E8";

/* ── Subject ───────────────────────────────────────────────────── */

function getSubject(p: Payload): string {
  const w = p.doc_count === 1 ? "document" : "documents";
  if (p.uploaded_by?.type === "mixed") {
    return `${p.doc_count} ${w} pending review \u00b7 ${p.org_name}`;
  }
  const actor = p.uploaded_by?.name || p.vendor_name;
  return `${actor} uploaded ${p.doc_count} ${w} \u00b7 ${p.org_name} \u2014 pending review`;
}

/* ── Record row (table-based, email-safe) ──────────────────────── */

function recordRow(r: DocRecord, vendorName: string): string {
  const isSvc  = r.category === "service";
  const bg     = isSvc ? EMBER : NAVY;
  const letter = isSvc ? "S" : "B";
  const tag    = isSvc
    ? vendorName
      ? `${esc(r.group)} &middot; ${esc(r.cadence || vendorName)}`
      : `${esc(r.group)}${r.cadence ? ` &middot; ${esc(r.cadence)}` : ""}`
    : vendorName
      ? `${esc(r.group)} &middot; ${esc(vendorName)}`
      : esc(r.group);
  const maps   = r.maps_to
    ? `<div style="font-size:11px;color:${AMBER};margin-top:4px;">Maps to ${esc(r.maps_to)}</div>`
    : "";

  return `<tr><td style="padding:16px;border-bottom:1px solid ${LINE};">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
<td width="36" valign="top" style="padding-right:12px;">
<div style="width:32px;height:32px;background:${bg};border-radius:6px;text-align:center;line-height:32px;color:#ffffff;font-size:14px;font-weight:700;">${letter}</div>
</td>
<td valign="top">
<div style="font-size:14px;font-weight:600;color:${NAVY};">${esc(r.display_name)}</div>
<div style="font-size:12px;color:${MUTED};margin-top:2px;">${tag}</div>
${maps}
</td>
<td width="110" align="right" valign="top">
<div style="display:inline-block;background:${AMBERBG};color:${AMBER};font-size:10px;font-weight:600;padding:4px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:0.03em;white-space:nowrap;">Pending review</div>
</td>
</tr></table></td></tr>`;
}

/* ── Standing block (progress bar + note) ──────────────────────── */

function standingHtml(s: Standing, serviceLabel: string): string {
  if (s.total <= 0) return "";
  const onPct = Math.round((s.on_file / s.total) * 100);
  const pPct  = Math.round((s.pending / s.total) * 100);
  const rPct  = Math.max(0, 100 - onPct - pPct);
  const proj  = s.on_file + s.pending;

  let cells = "";
  if (onPct > 0) cells += `<td style="width:${onPct}%;background:${EMBER};height:8px;font-size:0;line-height:0;" width="${onPct}%">&nbsp;</td>`;
  if (pPct > 0)  cells += `<td style="width:${pPct}%;background:#D4A574;height:8px;font-size:0;line-height:0;" width="${pPct}%">&nbsp;</td>`;
  if (rPct > 0)  cells += `<td style="width:${rPct}%;background:${LINE};height:8px;font-size:0;line-height:0;" width="${rPct}%">&nbsp;</td>`;

  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px;border:1px solid ${LINE};border-radius:6px;">
<tr><td style="padding:20px;">
<div style="font-size:13px;font-weight:700;color:${NAVY};margin-bottom:12px;">${esc(s.pillar_label)} &mdash; ${s.on_file} of ${s.total} on file</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>${cells}</tr></table>
<div style="font-size:12px;color:${MUTED};margin-top:10px;">Accepting the ${esc(serviceLabel)} moves this to ${proj} of ${s.total}.</div>
</td></tr></table>`;
}

/* ── Full email HTML ───────────────────────────────────────────── */

function buildHtml(p: Payload): string {
  const yr   = new Date().getFullYear();
  const w    = p.doc_count === 1 ? "document" : "documents";
  const isMixed = p.uploaded_by?.type === "mixed";
  const vn   = isMixed ? "" : esc(p.uploaded_by?.name || p.vendor_name);
  const on   = esc(p.org_name);
  const rows = p.records.map((r) => recordRow(r, p.vendor_name)).join("");
  const svc  = p.records.find((r) => r.category === "service")?.display_name || w;
  const stand = p.standing ? standingHtml(p.standing, svc) : "";

  const h1 = isMixed
    ? `${p.doc_count} ${w} pending review.`
    : `${vn} uploaded ${p.doc_count} ${w}.`;
  const sub = isMixed
    ? `${on} &middot; just now. Review to add them to your record.`
    : `for ${on} &middot; just now. Review to add them to your record.`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${OUTER};font-family:'Inter',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${OUTER};">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

<!-- HEADER -->
<tr><td style="background:${NAVY};padding:28px 32px;border-radius:8px 8px 0 0;">
<span style="font-family:'Montserrat',Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.02em;"><span style="color:${EMBER};">E</span><span style="color:#ffffff;">vid</span><span style="color:${EMBER};">LY</span></span>
</td></tr>

<!-- BODY -->
<tr><td style="background:${CREAM};padding:32px;">

<table cellpadding="0" cellspacing="0" role="presentation"><tr>
<td style="background:${AMBERBG};border-radius:20px;padding:6px 14px;">
<span style="color:${AMBER};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">&#9201;&#xFE0E; Received &middot; pending your review</span>
</td></tr></table>

<h1 style="font-family:'Inter',Arial,sans-serif;font-size:22px;font-weight:700;color:${NAVY};margin:16px 0 4px 0;">${h1}</h1>
<p style="font-size:14px;color:${MUTED};margin:0 0 24px 0;line-height:1.5;">${sub}</p>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid ${LINE};border-radius:6px;">
${rows}
</table>

${stand}

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;">
<tr><td align="center">
<a href="${p.action_url}" target="_blank" style="display:inline-block;background:${EMBER};color:#ffffff;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;text-decoration:none;">Review documents &#8594;</a>
</td></tr></table>

</td></tr>

<!-- FOOTER -->
<tr><td style="background:${NAVY};padding:28px 32px;border-radius:0 0 8px 8px;">
<div style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.6;">You&rsquo;re receiving this because you manage compliance records for ${on} on EvidLY.</div>
<div style="margin-top:16px;font-size:11px;color:rgba(255,255,255,0.4);"><span style="font-weight:700;"><span style="color:${EMBER};">E</span><span style="color:rgba(255,255,255,0.7);">vid</span><span style="color:${EMBER};">LY</span></span> &nbsp;&middot;&nbsp; Commercial Kitchen Risk Management</div>
<div style="margin-top:8px;font-size:11px;"><a href="https://getevidly.com" style="color:rgba(255,255,255,0.5);text-decoration:underline;">getevidly.com</a> &nbsp;&middot;&nbsp; <a href="https://app.getevidly.com/settings/notifications" style="color:rgba(255,255,255,0.5);text-decoration:underline;">Notification settings</a> &nbsp;&middot;&nbsp; <a href="https://getevidly.com/privacy" style="color:rgba(255,255,255,0.5);text-decoration:underline;">Privacy</a></div>
<div style="margin-top:12px;font-size:10px;color:rgba(255,255,255,0.3);">&copy; ${yr} EvidLY &middot; a Cleaning Pros Plus, LLC Company</div>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

/* ── Handler ───────────────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const p: Payload = await req.json();

    if (!p.recipientEmail || (!p.vendor_name && !p.uploaded_by?.name)) {
      return json(
        { error: "Missing required fields: recipientEmail, vendor_name or uploaded_by" },
        400,
      );
    }

    const result = await sendEmail({
      to: p.recipientEmail,
      subject: getSubject(p),
      html: buildHtml(p),
    });

    return json({ success: true, emailId: result?.id || null });
  } catch (error) {
    console.error("Error in vendor-document-notify:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
