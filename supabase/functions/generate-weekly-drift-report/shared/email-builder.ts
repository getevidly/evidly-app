// generate-weekly-drift-report — role-filtered email HTML builder
// Uses _shared/email.ts buildEmailHtml for branded wrapper.

import { buildEmailHtml } from '../../_shared/email.ts';
import type { CatchRow } from './aggregate.ts';

// Drift type → human-readable label (matches C2 types.ts DRIFT_TYPE_LABELS)
const DRIFT_LABELS: Record<string, string> = {
  temperature_out_of_range: 'Temperature Out of Range',
  temperature_trend_drift: 'Temperature Trend Drift',
  missed_checklist: 'Missed Checklist',
  document_expiration: 'Document Expiration',
  receiving_log_missing: 'Receiving Log Missing',
  allergen_training_overdue: 'Allergen Training Overdue',
  hood_cleaning_approaching: 'Hood Cleaning Approaching',
  suppression_semi_annual_due: 'Suppression Semi-Annual Due',
  extinguisher_monthly_missed: 'Extinguisher Monthly Missed',
  vendor_coi_expiring: 'Vendor COI Expiring',
  inspection_readiness_gap: 'Inspection Readiness Gap',
  team_miss_clustering: 'Team Miss Clustering',
  streak_break: 'Evidence Streak Break',
};

// Role → which pillars they see
const FULL_PORTFOLIO_ROLES = ['owner_operator', 'executive', 'compliance_manager'];
const FIRE_ONLY_ROLES = ['facilities_manager'];
const FOOD_ONLY_ROLES = ['chef'];

export type PillarFilter = 'full' | 'food_only' | 'fire_only';

export function getPillarFilter(role: string): PillarFilter {
  if (FULL_PORTFOLIO_ROLES.includes(role)) return 'full';
  if (FIRE_ONLY_ROLES.includes(role)) return 'fire_only';
  if (FOOD_ONLY_ROLES.includes(role)) return 'food_only';
  return 'full';
}

export function filterCatchesByPillar(catches: CatchRow[], filter: PillarFilter): CatchRow[] {
  if (filter === 'full') return catches;
  if (filter === 'food_only') return catches.filter((c) => c.pillar === 'food_safety');
  if (filter === 'fire_only') return catches.filter((c) => c.pillar === 'fire_safety');
  return catches;
}

export function buildSubjectLine(
  count: number,
  orgName: string,
  filter: PillarFilter,
): string {
  if (filter === 'food_only') return `Last week EvidLY caught ${count} food safety drifts at ${orgName}`;
  if (filter === 'fire_only') return `Last week EvidLY caught ${count} fire safety drifts at ${orgName}`;
  return `Last week EvidLY caught ${count} drifts at ${orgName}`;
}

function statusLabel(c: CatchRow): string {
  if (c.status === 'reduced') return 'Predicted & Reduced';
  if (c.status === 'proven') return 'Predicted & Proven';
  if (c.status === 'resolved' && c.resolution_type === 'auto_cleared') return 'Auto-cleared';
  if (c.status === 'resolved') return 'Resolved';
  if (c.status === 'acknowledged') return 'Acknowledged';
  return 'Open';
}

function statusColor(c: CatchRow): string {
  if (c.status === 'reduced' || c.status === 'proven') return '#16a34a';
  if (c.status === 'resolved') return '#22c55e';
  if (c.status === 'acknowledged') return '#eab308';
  return '#ef4444';
}

export function buildReportEmail(
  recipientName: string,
  orgName: string,
  weekStart: string,
  weekEnd: string,
  catches: CatchRow[],
  locationMap: Map<string, string>,
  filter: PillarFilter,
): string {
  const count = catches.length;
  const pillarQualifier =
    filter === 'food_only' ? ' in food safety' :
    filter === 'fire_only' ? ' in fire safety' : '';

  const rows = catches.map((c) => {
    const label = DRIFT_LABELS[c.drift_type] || c.drift_type;
    const loc = locationMap.get(c.location_id) || 'Unknown';
    const badge = statusLabel(c);
    const color = statusColor(c);
    return `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${label}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${loc}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px;">
        <span style="color: ${color}; font-weight: 600;">${badge}</span>
      </td>
    </tr>`;
  }).join('\n');

  const bodyHtml = `
    <p style="font-size: 15px; color: #334155;">
      Here's your weekly summary for <strong>${weekStart}</strong> – <strong>${weekEnd}</strong>.
    </p>
    <p style="font-size: 15px; color: #334155;">
      EvidLY caught <strong>${count} drift${count !== 1 ? 's' : ''}</strong> last week${pillarQualifier}.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #64748b;">Drift</th>
          <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #64748b;">Location</th>
          <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #64748b;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;

  return buildEmailHtml({
    recipientName,
    bodyHtml,
    ctaText: 'View Dashboard',
    ctaUrl: 'https://app.getevidly.com/dashboard',
  });
}
