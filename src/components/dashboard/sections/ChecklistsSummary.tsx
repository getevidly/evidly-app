/**
 * ChecklistsSummary — C11
 *
 * Rolled-up 1-card view for owner_operator, executive, compliance_manager.
 * Shows cadence chips (Daily n/N, Weekly n/N, Monthly n/N),
 * overdue/due badges, and link to /checklists.
 */

import { Link } from 'react-router-dom';
import { useChecklistStatus } from '../../../hooks/useChecklistStatus';

export function ChecklistsSummary() {
  const { summary, loading } = useChecklistStatus();

  if (loading) {
    return (
      <div className="cl-card">
        <div className="cl-h">
          <span className="cl-h-label">Checklists</span>
        </div>
        <div className="cl-summary-row">
          <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 12 }} />
          <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  const { dailyDone, dailyTotal, weeklyDone, weeklyTotal, monthlyDone, monthlyTotal, overdueCount, dueCount } = summary;
  const showMonthly = monthlyTotal > 0;

  return (
    <div className="cl-card">
      <div className="cl-h">
        <span className="cl-h-label">Checklists</span>
      </div>
      <div className="cl-summary-row">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="cl-chip">Daily {dailyDone}/{dailyTotal}</span>
          <span className="cl-chip">Weekly {weeklyDone}/{weeklyTotal}</span>
          {showMonthly && <span className="cl-chip">Monthly {monthlyDone}/{monthlyTotal}</span>}
          {overdueCount > 0 && (
            <span className="cl-badge overdue">{overdueCount} overdue</span>
          )}
          {dueCount > 0 && (
            <span className="cl-badge due">{dueCount} due soon</span>
          )}
        </div>
        <Link to="/checklists" className="cl-link">
          <i className="ti ti-external-link" style={{ fontSize: 14 }} />
          Open checklists
        </Link>
      </div>
    </div>
  );
}
