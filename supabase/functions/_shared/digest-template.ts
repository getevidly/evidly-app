/**
 * _shared/digest-template.ts — Polished weekly digest email template
 *
 * Ported from src/lib/sendWeeklyDigest.ts for use by ai-weekly-digest edge function.
 * Table-based HTML with inline styles (no flexbox/grid — email-client compatible).
 */

export interface DigestLocationScore {
  name: string;
  status: "Inspection Ready" | "Needs Attention" | "Critical";
}

export interface DigestTempStats {
  total: number;
  onTimePercent: number;
  outOfRange: number;
  weekOverWeek: number;
}

export interface DigestChecklistStats {
  completed: number;
  required: number;
  percent: number;
  weekOverWeek: number;
}

export interface DigestData {
  orgName: string;
  weekStart: string;
  weekEnd: string;
  locations: DigestLocationScore[];
  highlights: string[];
  concerns: string[];
  tempStats: DigestTempStats;
  checklistStats: DigestChecklistStats;
  aiSummary?: string;
  aiRecommendation?: string;
  upcoming?: string[];
}

function statusColor(status: string): string {
  if (status === "Inspection Ready" || status === "current") return "#22c55e";
  if (status === "Needs Attention" || status === "upcoming") return "#eab308";
  return "#ef4444";
}

function trendArrow(v: number): string {
  if (v > 0) return `<span style="color:#22c55e;">&#9650; +${v}</span>`;
  if (v < 0) return `<span style="color:#dc2626;">&#9660; ${v}</span>`;
  return `<span style="color:#94a3b8;">&#8212; 0</span>`;
}

export function generateDigestHtml(
  data: DigestData,
  dashboardUrl = "https://app.getevidly.com/dashboard",
): string {
  const locationRows = data.locations
    .map(
      (loc) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#1E2D4D;">${loc.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">
          <span style="display:inline-block;background:${statusColor(loc.status)}22;color:${statusColor(loc.status)};border-radius:12px;padding:2px 10px;font-size:12px;font-weight:600;">${loc.status}</span>
        </td>
      </tr>`,
    )
    .join("");

  const highlightItems = data.highlights
    .map(
      (h) =>
        `<tr><td style="padding:6px 0;color:#15803d;font-size:14px;">&#10003; ${h}</td></tr>`,
    )
    .join("");

  const concernItems = data.concerns
    .map(
      (c) =>
        `<tr><td style="padding:6px 0;color:#dc2626;font-size:14px;">&#9888; ${c}</td></tr>`,
    )
    .join("");

  const upcomingBlock =
    data.upcoming && data.upcoming.length > 0
      ? `<tr><td style="padding:16px 32px;">
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;">
        <div style="font-size:14px;font-weight:700;color:#1e40af;margin-bottom:8px;">&#128197; Upcoming Deadlines</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${data.upcoming.map((u) => `<tr><td style="padding:6px 0;color:#1e40af;font-size:14px;">&#8226; ${u}</td></tr>`).join("")}
        </table>
      </div>
    </td></tr>`
      : "";

  const summaryBlock = data.aiSummary
    ? `<tr><td style="padding:16px 32px;">
      <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;">
        <div style="font-size:14px;font-weight:700;color:#7c3aed;margin-bottom:8px;">&#129302; AI Summary</div>
        <p style="font-size:14px;color:#1E2D4D;line-height:1.5;margin:0;">${data.aiSummary}</p>
        ${data.aiRecommendation ? `<p style="font-size:13px;color:#6b7280;margin:12px 0 0;"><strong>Recommendation:</strong> ${data.aiRecommendation}</p>` : ""}
      </div>
    </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Weekly Compliance Digest — ${data.orgName}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
<tr><td align="center" style="padding:24px 8px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- HEADER -->
<tr><td style="background:#1E2D4D;padding:28px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td><span style="color:#d4af37;font-size:28px;font-weight:800;">&#9989;</span></td>
    <td style="padding-left:12px;">
      <div style="font-size:22px;font-weight:800;color:#ffffff;">Evid<span style="color:#d4af37;">LY</span></div>
      <div style="font-size:10px;color:rgba(255,255,255,0.6);letter-spacing:1px;">LEAD WITH CONFIDENCE</div>
    </td>
    <td align="right" style="color:rgba(255,255,255,0.7);font-size:12px;">Weekly Digest</td>
  </tr>
  </table>
</td></tr>

<!-- TITLE -->
<tr><td style="padding:24px 32px 8px;">
  <div style="font-size:20px;font-weight:700;color:#1E2D4D;">Weekly Compliance Digest</div>
  <div style="font-size:14px;color:#6b7280;margin-top:4px;">${data.orgName} &mdash; ${data.weekStart} to ${data.weekEnd}</div>
</td></tr>

<!-- AI SUMMARY -->
${summaryBlock}

<!-- LOCATION STATUS -->
${data.locations.length > 0 ? `<tr><td style="padding:16px 32px;">
  <div style="font-size:16px;font-weight:700;color:#1E2D4D;margin-bottom:12px;">Location Status</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <tr style="background:#f8fafc;">
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Location</th>
    <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">Status</th>
  </tr>
  ${locationRows}
  </table>
</td></tr>` : ""}

<!-- HIGHLIGHTS & CONCERNS -->
<tr><td style="padding:16px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td width="48%" valign="top" style="padding-right:12px;">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;">
        <div style="font-size:14px;font-weight:700;color:#15803d;margin-bottom:8px;">&#127942; Highlights</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${highlightItems || '<tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;">No highlights this week</td></tr>'}</table>
      </div>
    </td>
    <td width="48%" valign="top" style="padding-left:12px;">
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;">
        <div style="font-size:14px;font-weight:700;color:#dc2626;margin-bottom:8px;">&#9888; Concerns</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${concernItems || '<tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;">No concerns this week</td></tr>'}</table>
      </div>
    </td>
  </tr>
  </table>
</td></tr>

<!-- TEMP CHECKS & CHECKLISTS -->
<tr><td style="padding:16px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td width="48%" valign="top" style="padding-right:12px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
        <div style="font-size:14px;font-weight:700;color:#1E2D4D;margin-bottom:12px;">&#127777; Temperature Readings</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Total Checks</td><td style="font-size:15px;font-weight:700;color:#1E2D4D;text-align:right;">${data.tempStats.total}</td></tr>
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">On-Time Rate</td><td style="font-size:15px;font-weight:700;color:${data.tempStats.onTimePercent >= 95 ? "#22c55e" : "#d4af37"};text-align:right;">${data.tempStats.onTimePercent}%</td></tr>
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Out of Range</td><td style="font-size:15px;font-weight:700;color:${data.tempStats.outOfRange > 0 ? "#dc2626" : "#22c55e"};text-align:right;">${data.tempStats.outOfRange}</td></tr>
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Week-over-Week</td><td style="font-size:13px;text-align:right;">${trendArrow(data.tempStats.weekOverWeek)}</td></tr>
        </table>
      </div>
    </td>
    <td width="48%" valign="top" style="padding-left:12px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
        <div style="font-size:14px;font-weight:700;color:#1E2D4D;margin-bottom:12px;">&#9745; Checklists</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Completed</td><td style="font-size:15px;font-weight:700;color:#1E2D4D;text-align:right;">${data.checklistStats.completed}/${data.checklistStats.required}</td></tr>
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Completion Rate</td><td style="font-size:15px;font-weight:700;color:${data.checklistStats.percent >= 95 ? "#22c55e" : "#d4af37"};text-align:right;">${data.checklistStats.percent}%</td></tr>
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Week-over-Week</td><td style="font-size:13px;text-align:right;">${trendArrow(data.checklistStats.weekOverWeek)}</td></tr>
        </table>
      </div>
    </td>
  </tr>
  </table>
</td></tr>

<!-- UPCOMING DEADLINES -->
${upcomingBlock}

<!-- CTA -->
<tr><td style="padding:24px 32px;" align="center">
  <a href="${dashboardUrl}" style="display:inline-block;background:#1E2D4D;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">View Full Dashboard</a>
</td></tr>

<!-- FOOTER -->
<tr><td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e5e7eb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center">
    <div style="font-size:16px;font-weight:800;color:#1E2D4D;">Evid<span style="color:#d4af37;">LY</span></div>
    <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Lead with Confidence</div>
    <div style="margin-top:12px;font-size:12px;color:#94a3b8;">
      <a href="https://app.getevidly.com/settings/notifications" style="color:#1E2D4D;text-decoration:underline;">Manage Preferences</a>
      &nbsp;&bull;&nbsp;
      <a href="https://app.getevidly.com/settings/notifications" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
    </div>
    <div style="font-size:11px;color:#cbd5e1;margin-top:8px;">&copy; 2026 EvidLY. All rights reserved.</div>
  </td></tr>
  </table>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}
