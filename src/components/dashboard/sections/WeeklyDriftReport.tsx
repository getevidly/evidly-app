/**
 * WeeklyDriftReport — C12
 *
 * Role-keyed weekly drift report status card.
 * Shows last sent info or next scheduled date.
 */

import { useRole } from '../../../contexts/RoleContext';
import type { DashboardRole } from '../../../constants/dashboardComposition';
import { useWeeklyDriftReport } from '../../../hooks/useWeeklyDriftReport';

const HEADING: Record<string, string> = {
  owner_operator: 'Weekly drift report — Mondays 7 AM PT',
  executive: 'Weekly drift report — Mondays 7 AM PT',
  compliance_manager: 'Weekly drift report — Mondays 7 AM PT (full evidence trail)',
  facilities_manager: 'Weekly drift report — Mondays 7 AM PT (fire pillar)',
  chef: 'Weekly drift report — Mondays 7 AM PT (food pillar)',
};

const BODY_PREFIX: Record<string, string> = {
  owner_operator: 'All caught drifts delivered to your inbox + in-app.',
  executive: 'Portfolio rollup.',
  compliance_manager: 'Full evidence trail delivered.',
  facilities_manager: 'Fire-only catches delivered to you.',
  chef: 'Food-only catches delivered to you.',
};

function fmtDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch { return ''; }
}

function fmtTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' }).format(new Date(iso));
  } catch { return ''; }
}

export function WeeklyDriftReport() {
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;
  const { lastReport, nextScheduled, loading } = useWeeklyDriftReport();

  const heading = HEADING[role];
  if (!heading) return null;

  if (loading) {
    return (
      <div className="report-card">
        <div className="report-icon"><i className="ti ti-mail" /></div>
        <div>
          <div className="skeleton" style={{ width: 200, height: 14, borderRadius: 6, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 160, height: 12, borderRadius: 6 }} />
        </div>
      </div>
    );
  }

  const prefix = BODY_PREFIX[role] || '';

  let delivery = '';
  if (lastReport) {
    if (lastReport.delivery_status === 'sent' && lastReport.delivered_at) {
      delivery = ` Last sent: ${fmtDateShort(lastReport.generated_at)} · delivered ${fmtTime(lastReport.delivered_at)} PT.`;
    } else {
      delivery = ` Generated ${fmtDateShort(lastReport.generated_at)} · delivery ${lastReport.delivery_status}.`;
    }
  } else {
    delivery = ` First report scheduled for ${nextScheduled}.`;
  }

  return (
    <div className="report-card">
      <div className="report-icon"><i className="ti ti-mail" /></div>
      <div>
        <p className="report-h">{heading}</p>
        <p className="report-meta">{prefix}{delivery}</p>
      </div>
    </div>
  );
}
