/**
 * MetricCards — C18 Phase 3 (relocated to quiet "On record" tier)
 *
 * Shows only live-data cards: Documents current + Renewal <30d.
 * Q3 2026 promise cards (Residual risk, Inspection-ready) removed;
 * replaced by a single italic roadmap whisper line.
 */

import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { useRole } from '../../../contexts/RoleContext';
import { useDocumentsSummary } from '../../../hooks/useDocumentsSummary';
import type { DashboardRole } from '../../../constants/dashboardComposition';

export function MetricCards() {
  const { selectedLocationId } = useDashboardLocation();
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;
  const { current, total, expiringWithin30Days, nextRenewals, loading } = useDocumentsSummary({ locationIdFilter: selectedLocationId || undefined });

  if (role === 'facilities_manager' || role === 'chef' || role === 'kitchen_manager' || role === 'kitchen_staff') {
    return null;
  }

  let expiryFooter: string;
  if (total === 0) {
    expiryFooter = 'No documents on file yet.';
  } else if (expiringWithin30Days > 0) {
    expiryFooter = `${expiringWithin30Days} expire within 30 days`;
  } else if (current === total) {
    expiryFooter = 'All documents current.';
  } else {
    expiryFooter = `${total - current} need attention`;
  }

  let renewalFooter: string;
  if (total === 0) {
    renewalFooter = 'No documents on file yet.';
  } else if (expiringWithin30Days === 0) {
    renewalFooter = 'Nothing expiring in the next 30 days.';
  } else {
    renewalFooter = nextRenewals.map(r => `Day ${r.daysUntilExpiry} (${r.name})`).join(' · ');
  }

  const docsLabel = role === 'executive'
    ? 'Docs current portfolio'
    : role === 'compliance_manager'
      ? 'Evidence on record'
      : 'Documents current';

  const docsTooltip = role === 'compliance_manager'
    ? 'Counts active documents with full chain-of-custody on record. Excludes archived or replaced documents.'
    : role === 'executive'
      ? 'Counts active documents on file across all portfolio locations that have not expired. Excludes archived, replaced, or deleted documents.'
      : 'Counts active documents on file that have not expired. Excludes archived, replaced, or deleted documents. Documents within 30 days of expiration are surfaced in the Renewal card alongside this count.';

  const docsFooter = role === 'compliance_manager'
    ? 'All inspection-traceable'
    : role === 'executive'
      ? (loading ? '' : `${expiringWithin30Days} expire <30d`)
      : (loading ? '' : expiryFooter);

  const showRenewal = role === 'owner_operator';

  return (
    <div>
      <div className="met-row" style={{ gridTemplateColumns: showRenewal ? 'repeat(2, 1fr)' : '1fr' }}>
        <div className="met teal">
          <div className="met-top">
            <i className="ti ti-file-check" />
            <span>{docsLabel}</span>
            <span className="info" title={docsTooltip}>
              <i className="ti ti-info-circle" />
            </span>
          </div>
          <p className="met-num">{loading ? '—' : `${current} of ${total}`}</p>
          <p className="met-foot detail">{docsFooter}</p>
        </div>
        {showRenewal && (
          <div className="met purple">
            <div className="met-top">
              <i className="ti ti-clock" />
              <span>Renewal &lt;30d</span>
              <span className="info" title="Documents with an expiration date within the next 30 calendar days, regardless of pillar (food or fire). Tap any item in the dashboard to open the document and start a renewal.">
                <i className="ti ti-info-circle" />
              </span>
            </div>
            <p className="met-num">{loading ? '—' : String(expiringWithin30Days)}</p>
            <p className="met-foot">{loading ? '' : renewalFooter}</p>
          </div>
        )}
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', margin: '4px 0 18px', textAlign: 'center' }}>
        Per-county risk and inspection readiness launch Q3 2026.
      </p>
    </div>
  );
}
