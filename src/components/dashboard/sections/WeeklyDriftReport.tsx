/**
 * WeeklyDriftReport — C12
 *
 * Thin footer line rendered below drift catch cards inside DriftsCaughtList.
 * Shows schedule + last delivery status (succeeded / failed / no prior delivery).
 */

import { useRole } from '../../../contexts/RoleContext';
import type { DashboardRole } from '../../../constants/dashboardComposition';
import { useWeeklyDriftReport } from '../../../hooks/useWeeklyDriftReport';

const VISIBLE_ROLES: Record<string, boolean> = {
  owner_operator: true,
  executive: true,
  compliance_manager: true,
  facilities_manager: true,
  chef: true,
};

function fmtDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch { return ''; }
}

export function WeeklyDriftReport() {
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;
  const { lastReport, loading } = useWeeklyDriftReport();

  if (!VISIBLE_ROLES[role]) return null;
  if (loading) return null;

  const isFailed = lastReport && lastReport.delivery_status !== 'sent';
  const isDelivered = lastReport && lastReport.delivery_status === 'sent' && lastReport.delivered_at;

  return (
    <div className="report-footer">
      <div className="report-footer-left">
        <i className="ti ti-mail" />
        <span>Weekly drift report · Mondays 7 AM PT</span>
      </div>
      {isFailed && lastReport && (
        <span className="report-footer-right failed">
          <i className="ti ti-alert-circle" />
          {fmtDateShort(lastReport.generated_at)} delivery failed
        </span>
      )}
      {isDelivered && lastReport && lastReport.delivered_at && (
        <span className="report-footer-right">
          Delivered {fmtDateShort(lastReport.delivered_at)}
        </span>
      )}
    </div>
  );
}
