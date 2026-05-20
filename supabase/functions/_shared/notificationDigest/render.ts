/**
 * renderDigestEmail — Builds the HTML + plain-text daily digest email.
 *
 * Brand-aligned: navy header (#1E2D4D), gold accent (#A08C5A), cream body.
 * Footer links to /settings/notifications for opt-out.
 */

// ── Types ────────────────────────────────────────────────────────

export interface DigestEvent {
  id: string;
  title: string;
  body: string | null;
  action_url: string | null;
  severity: string; // 'urgent' | 'advisory' | 'info'
  category: string;
  created_at: string;
}

export interface DigestRenderInput {
  recipientName: string;
  orgName: string;
  events: DigestEvent[];
  timezone: string;
}

export interface DigestRenderOutput {
  subject: string;
  html: string;
  text: string;
}

// ── Severity display config ──────────────────────────────────────

const SEVERITY_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  urgent:   { label: 'Urgent',   color: '#dc2626', bg: '#fef2f2', dot: '🔴' },
  advisory: { label: 'Advisory', color: '#d97706', bg: '#fffbeb', dot: '🟡' },
  info:     { label: 'Info',     color: '#6B7F96', bg: '#f8fafc', dot: '🔵' },
};

// ── Render ────────────────────────────────────────────────────────

export function renderDigestEmail(input: DigestRenderInput): DigestRenderOutput {
  const { recipientName, orgName, events, timezone } = input;

  // Group by severity (ordered: urgent → advisory → info)
  const grouped: Record<string, DigestEvent[]> = { urgent: [], advisory: [], info: [] };
  for (const ev of events) {
    const sev = ev.severity in grouped ? ev.severity : 'info';
    grouped[sev].push(ev);
  }

  const urgentCount = grouped.urgent.length;
  const totalCount = events.length;

  // Subject line
  const subject = urgentCount > 0
    ? `EvidLY daily digest — ${urgentCount} urgent, ${totalCount} total`
    : `EvidLY daily digest — ${totalCount} item${totalCount === 1 ? '' : 's'}`;

  // Format local date for header
  let dateStr: string;
  try {
    dateStr = new Date().toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  // Build severity sections HTML
  const sectionsHtml = ['urgent', 'advisory', 'info']
    .filter(sev => grouped[sev].length > 0)
    .map(sev => {
      const meta = SEVERITY_META[sev];
      const rows = grouped[sev].map(ev => {
        const actionLink = ev.action_url
          ? `<a href="https://app.getevidly.com${ev.action_url}" style="color: #1E2D4D; font-size: 12px; text-decoration: underline;">View →</a>`
          : '';
        const bodyLine = ev.body
          ? `<p style="color: #6B7F96; font-size: 13px; margin: 2px 0 0;">${escapeHtml(ev.body)}</p>`
          : '';
        return `
          <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 14px; color: #1E2D4D; font-weight: 500;">${escapeHtml(ev.title)}</p>
              ${bodyLine}
              ${actionLink}
            </td>
          </tr>`;
      }).join('');

      return `
        <div style="margin-bottom: 20px;">
          <div style="background: ${meta.bg}; padding: 8px 16px; border-left: 3px solid ${meta.color}; border-radius: 4px;">
            <span style="font-size: 13px; font-weight: 700; color: ${meta.color};">${meta.label} (${grouped[sev].length})</span>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            ${rows}
          </table>
        </div>`;
    }).join('');

  // Full HTML
  const html = `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: #1E2D4D; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
      <span style="color: #ffffff;">Evid</span><span style="color: #A08C5A;">LY</span>
    </h1>
  </div>
  <div style="padding: 24px 32px;">
    <p style="color: #1E2D4D; font-size: 15px; margin: 0 0 4px;">Hi ${escapeHtml(recipientName)},</p>
    <p style="color: #6B7F96; font-size: 13px; margin: 0 0 20px;">
      Your daily digest for <strong>${escapeHtml(orgName)}</strong> — ${dateStr}
    </p>
    ${sectionsHtml}
    <div style="text-align: center; margin: 28px 0 16px;">
      <a href="https://app.getevidly.com/dashboard" style="background: #1E2D4D; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 14px;">
        Open Dashboard
      </a>
    </div>
  </div>
  <div style="background: #FAF7F0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0 0 8px 0;">&copy; 2026 EvidLY &mdash; Lead with Confidence &mdash; Know Where You Stand</p>
    <p style="margin: 0 0 4px 0; font-size: 11px; color: #999;">
      <a href="https://app.getevidly.com/settings/notifications" style="color: #999; text-decoration: underline;">Manage digest preferences</a>
      &nbsp;&bull;&nbsp;
      <a href="https://app.getevidly.com/settings/notifications" style="color: #999; text-decoration: underline;">Unsubscribe from digest</a>
    </p>
    <p style="margin: 4px 0 0 0; font-size: 10px; color: #b0b8c4;">
      EvidLY LLC &bull; Merced County, CA
    </p>
  </div>
</div>`;

  // Plain text fallback
  const textSections = ['urgent', 'advisory', 'info']
    .filter(sev => grouped[sev].length > 0)
    .map(sev => {
      const meta = SEVERITY_META[sev];
      const lines = grouped[sev].map(ev => {
        const url = ev.action_url ? ` → https://app.getevidly.com${ev.action_url}` : '';
        return `  ${meta.dot} ${ev.title}${ev.body ? ` — ${ev.body}` : ''}${url}`;
      }).join('\n');
      return `${meta.label.toUpperCase()} (${grouped[sev].length}):\n${lines}`;
    }).join('\n\n');

  const text = `EvidLY Daily Digest — ${dateStr}
Hi ${recipientName},

Your daily digest for ${orgName}:

${textSections}

Open Dashboard: https://app.getevidly.com/dashboard
Manage preferences: https://app.getevidly.com/settings/notifications

© 2026 EvidLY — Lead with Confidence — Know Where You Stand`;

  return { subject, html, text };
}

// ── HTML escape helper ───────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
