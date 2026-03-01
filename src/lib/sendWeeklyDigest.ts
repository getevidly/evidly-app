/**
 * Weekly Digest email sender
 *
 * Generates a TABLE-BASED HTML email (no flexbox/grid — inline styles only)
 * and sends via Resend API through a Supabase Edge Function or /api/send-digest.
 */

export interface DigestLocationScore {
  name: string;
  overall: number;
  trend: number; // +/- vs last week
  foodSafety: number;
  facilitySafety: number;
  status: 'Inspection Ready' | 'Needs Attention' | 'Critical';
}

export interface DigestTempStats {
  total: number;
  onTimePercent: number;
  outOfRange: number;
  weekOverWeek: number; // +/- %
}

export interface DigestChecklistStats {
  completed: number;
  required: number;
  percent: number;
  weekOverWeek: number; // +/- %
}

export interface DigestActionItem {
  priority: 'high' | 'medium' | 'low';
  title: string;
  assignee: string;
  dueDate: string;
}

export interface DigestVendorUpdate {
  serviceType: string;
  vendorName: string;
  lastService: string;
  nextDue: string;
  status: 'current' | 'upcoming' | 'overdue';
}

export interface DigestMissedItem {
  item: string;
  location: string;
  detail: string;
}

export interface DigestData {
  orgName: string;
  weekStart: string;
  weekEnd: string;
  foodSafetyScore: number;
  facilitySafetyScore: number;
  scoreTrend: number;
  locations: DigestLocationScore[];
  highlights: string[];
  concerns: string[];
  tempStats: DigestTempStats;
  checklistStats: DigestChecklistStats;
  missedItems: DigestMissedItem[];
  actionItems: DigestActionItem[];
  vendorUpdates: DigestVendorUpdate[];
}

function statusColor(status: string): string {
  if (status === 'Inspection Ready' || status === 'current') return '#22c55e';
  if (status === 'Needs Attention' || status === 'upcoming') return '#eab308';
  return '#ef4444';
}

function priorityColor(p: string): string {
  if (p === 'high') return '#dc2626';
  if (p === 'medium') return '#d4af37';
  return '#6b7280';
}

function trendArrow(v: number): string {
  if (v > 0) return `<span style="color:#22c55e;">&#9650; +${v}</span>`;
  if (v < 0) return `<span style="color:#dc2626;">&#9660; ${v}</span>`;
  return `<span style="color:#94a3b8;">&#8212; 0</span>`;
}

export function generateDigestHtml(data: DigestData, dashboardUrl: string = 'https://app.getevidly.com/dashboard'): string {
  const locationRows = data.locations
    .map(
      (loc) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#1e4d6b;">${loc.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">
          <span style="display:inline-block;background:${statusColor(loc.status)};color:#fff;border-radius:20px;padding:2px 10px;font-size:13px;font-weight:700;">${loc.overall}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${trendArrow(loc.trend)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${loc.foodSafety}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${loc.facilitySafety}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">
          <span style="display:inline-block;background:${statusColor(loc.status)}22;color:${statusColor(loc.status)};border-radius:12px;padding:2px 10px;font-size:12px;font-weight:600;">${loc.status}</span>
        </td>
      </tr>`
    )
    .join('');

  const highlightItems = data.highlights
    .map((h) => `<tr><td style="padding:6px 0;color:#15803d;font-size:14px;">&#10003; ${h}</td></tr>`)
    .join('');

  const concernItems = data.concerns
    .map((c) => `<tr><td style="padding:6px 0;color:#dc2626;font-size:14px;">&#9888; ${c}</td></tr>`)
    .join('');

  const missedRows = data.missedItems
    .map(
      (m) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #fde68a;font-size:13px;">${m.item}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #fde68a;font-size:13px;">${m.location}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #fde68a;font-size:13px;">${m.detail}</td>
      </tr>`
    )
    .join('');

  const actionRows = data.actionItems
    .map(
      (a) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${priorityColor(a.priority)};margin-right:8px;"></span>
          <span style="font-size:13px;font-weight:500;">${a.title}</span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">${a.assignee}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">${a.dueDate}</td>
      </tr>`
    )
    .join('');

  const vendorRows = data.vendorUpdates
    .map(
      (v) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${v.serviceType}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:500;">${v.vendorName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">${v.lastService}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">${v.nextDue}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">
          <span style="display:inline-block;background:${statusColor(v.status)}22;color:${statusColor(v.status)};border-radius:12px;padding:2px 10px;font-size:12px;font-weight:600;text-transform:capitalize;">${v.status}</span>
        </td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Weekly Compliance Digest — ${data.orgName}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
<tr><td align="center" style="padding:24px 8px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- HEADER -->
<tr><td style="background:#1e4d6b;padding:28px 32px;">
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
  <div style="font-size:20px;font-weight:700;color:#1e4d6b;">Weekly Compliance Digest</div>
  <div style="font-size:14px;color:#6b7280;margin-top:4px;">${data.orgName} &mdash; ${data.weekStart} to ${data.weekEnd}</div>
</td></tr>

<!-- PILLAR SCORES -->
<tr><td style="padding:16px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
  <tr>
    <td style="padding:20px 24px;text-align:center;width:120px;">
      <div style="width:80px;height:80px;border-radius:50%;border:5px solid ${data.foodSafetyScore >= 90 ? '#22c55e' : data.foodSafetyScore >= 70 ? '#eab308' : '#ef4444'};display:inline-block;line-height:70px;text-align:center;">
        <span style="font-size:28px;font-weight:800;color:#1e4d6b;">${data.foodSafetyScore}</span>
      </div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Food Safety</div>
    </td>
    <td style="padding:20px 24px;text-align:center;width:120px;">
      <div style="width:80px;height:80px;border-radius:50%;border:5px solid ${data.facilitySafetyScore >= 90 ? '#22c55e' : data.facilitySafetyScore >= 70 ? '#eab308' : '#ef4444'};display:inline-block;line-height:70px;text-align:center;">
        <span style="font-size:28px;font-weight:800;color:#1e4d6b;">${data.facilitySafetyScore}</span>
      </div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Facility Safety</div>
    </td>
    <td style="padding:20px 24px;">
      <div style="font-size:16px;font-weight:600;color:#1e4d6b;">Compliance Scores</div>
      <div style="font-size:14px;color:#6b7280;margin-top:4px;">vs last week: ${trendArrow(data.scoreTrend)}</div>
    </td>
  </tr>
  </table>
</td></tr>

<!-- LOCATION SCORES -->
<tr><td style="padding:16px 32px;">
  <div style="font-size:16px;font-weight:700;color:#1e4d6b;margin-bottom:12px;">Location Scores</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <tr style="background:#f8fafc;">
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Location</th>
    <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">Score</th>
    <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">Trend</th>
    <th style="padding:10px 8px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;">Food</th>
    <th style="padding:10px 8px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;">Fire</th>
    <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">Status</th>
  </tr>
  ${locationRows}
  </table>
</td></tr>

<!-- HIGHLIGHTS & CONCERNS -->
<tr><td style="padding:16px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td width="48%" valign="top" style="padding-right:12px;">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;">
        <div style="font-size:14px;font-weight:700;color:#15803d;margin-bottom:8px;">&#127942; Highlights</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${highlightItems}</table>
      </div>
    </td>
    <td width="48%" valign="top" style="padding-left:12px;">
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;">
        <div style="font-size:14px;font-weight:700;color:#dc2626;margin-bottom:8px;">&#9888; Concerns</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${concernItems}</table>
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
        <div style="font-size:14px;font-weight:700;color:#1e4d6b;margin-bottom:12px;">&#127777; Temperature Checks</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Total Checks</td><td style="font-size:15px;font-weight:700;color:#1e4d6b;text-align:right;">${data.tempStats.total}</td></tr>
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">On-Time Rate</td><td style="font-size:15px;font-weight:700;color:${data.tempStats.onTimePercent >= 95 ? '#22c55e' : '#d4af37'};text-align:right;">${data.tempStats.onTimePercent}%</td></tr>
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Out of Range</td><td style="font-size:15px;font-weight:700;color:${data.tempStats.outOfRange > 0 ? '#dc2626' : '#22c55e'};text-align:right;">${data.tempStats.outOfRange}</td></tr>
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Week-over-Week</td><td style="font-size:13px;text-align:right;">${trendArrow(data.tempStats.weekOverWeek)}</td></tr>
        </table>
      </div>
    </td>
    <td width="48%" valign="top" style="padding-left:12px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
        <div style="font-size:14px;font-weight:700;color:#1e4d6b;margin-bottom:12px;">&#9745; Checklists</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Completed</td><td style="font-size:15px;font-weight:700;color:#1e4d6b;text-align:right;">${data.checklistStats.completed}/${data.checklistStats.required}</td></tr>
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Completion Rate</td><td style="font-size:15px;font-weight:700;color:${data.checklistStats.percent >= 95 ? '#22c55e' : '#d4af37'};text-align:right;">${data.checklistStats.percent}%</td></tr>
          <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Week-over-Week</td><td style="font-size:13px;text-align:right;">${trendArrow(data.checklistStats.weekOverWeek)}</td></tr>
        </table>
      </div>
    </td>
  </tr>
  </table>
</td></tr>

<!-- MISSED / LATE ITEMS -->
${data.missedItems.length > 0 ? `
<tr><td style="padding:16px 32px;">
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;">
    <div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:12px;">&#9888; Missed / Late Items</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr style="background:#fef3c7;">
      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#92400e;font-weight:600;">Item</th>
      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#92400e;font-weight:600;">Location</th>
      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#92400e;font-weight:600;">Detail</th>
    </tr>
    ${missedRows}
    </table>
  </div>
</td></tr>` : ''}

<!-- ACTION ITEMS -->
${data.actionItems.length > 0 ? `
<tr><td style="padding:16px 32px;">
  <div style="font-size:16px;font-weight:700;color:#1e4d6b;margin-bottom:12px;">Action Items</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <tr style="background:#f8fafc;">
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Item</th>
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Assignee</th>
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Due Date</th>
  </tr>
  ${actionRows}
  </table>
</td></tr>` : ''}

<!-- VENDOR UPDATES -->
${data.vendorUpdates.length > 0 ? `
<tr><td style="padding:16px 32px;">
  <div style="font-size:16px;font-weight:700;color:#1e4d6b;margin-bottom:12px;">Vendor Service Updates</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <tr style="background:#f8fafc;">
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Service</th>
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Vendor</th>
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Last</th>
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Next Due</th>
    <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">Status</th>
  </tr>
  ${vendorRows}
  </table>
</td></tr>` : ''}

<!-- CTA -->
<tr><td style="padding:24px 32px;" align="center">
  <a href="${dashboardUrl}" style="display:inline-block;background:#1e4d6b;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">View Full Dashboard</a>
</td></tr>

<!-- FOOTER -->
<tr><td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e5e7eb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center">
    <div style="font-size:16px;font-weight:800;color:#1e4d6b;">Evid<span style="color:#d4af37;">LY</span></div>
    <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Lead with Confidence</div>
    <div style="margin-top:12px;font-size:12px;color:#94a3b8;">
      <a href="${dashboardUrl}/weekly-digest" style="color:#1e4d6b;text-decoration:underline;">Manage Preferences</a>
      &nbsp;&bull;&nbsp;
      <a href="${dashboardUrl}/weekly-digest" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
    </div>
    <div style="font-size:11px;color:#cbd5e1;margin-top:8px;">&copy; ${new Date().getFullYear()} EvidLY. All rights reserved.</div>
  </td></tr>
  </table>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

/**
 * Send the weekly digest email via the Resend Edge Function.
 * In production, this calls the Supabase Edge Function or /api/send-digest.
 */
export async function sendWeeklyDigest(
  recipients: string[],
  data: DigestData,
): Promise<{ success: boolean; error?: string }> {
  const html = generateDigestHtml(data);
  const subject = `Weekly Compliance Digest — ${data.orgName} — ${data.weekStart} to ${data.weekEnd}`;

  try {
    const response = await fetch('/api/send-digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipients,
        from: 'EvidLY Digest <digest@getevidly.com>',
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err?.error || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}
