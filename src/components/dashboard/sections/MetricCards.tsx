import { useRole } from '../../../contexts/RoleContext';
import { useDocumentsSummary } from '../../../hooks/useDocumentsSummary';
import type { DashboardRole } from '../../../constants/dashboardComposition';

export function MetricCards() {
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;
  const { current, total, expiringWithin30Days, nextRenewals, loading } = useDocumentsSummary();

  if (role === 'facilities_manager' || role === 'chef' || role === 'kitchen_manager' || role === 'kitchen_staff') {
    return null;
  }

  // Fix 2: contextual documents footer
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

  // Fix 3: contextual renewal footer
  let renewalFooter: string;
  if (total === 0) {
    renewalFooter = 'No documents on file yet.';
  } else if (expiringWithin30Days === 0) {
    renewalFooter = 'Nothing expiring in the next 30 days.';
  } else {
    renewalFooter = nextRenewals.map(r => `Day ${r.daysUntilExpiry} (${r.name})`).join(' · ');
  }

  if (role === 'owner_operator') {
    return (
      <div className="met-row">
        <div className="met amber">
          <div className="met-top">
            <i className="ti ti-alert-triangle" />
            <span>Residual risk · monitored</span>
            <span className="info" title="How this is calculated: Sum of estimated dollar exposure across all currently-monitored compliance items (food + fire) minus dollar value already mitigated. Full method launches Q3 2026 with per-county fine schedules and insurer-specific disclaimer math.">
              <i className="ti ti-info-circle" />
            </span>
          </div>
          <p className="met-num">&mdash;</p>
          <p className="met-foot timeline">Full per-county calculation launches Q3 2026.</p>
        </div>
        <div className="met teal">
          <div className="met-top">
            <i className="ti ti-shield-check" />
            <span>Inspection-ready</span>
            <span className="info" title="How this is calculated: Each location is scored per the inspection methodology of its own county or jurisdiction (CalCode, FDA Food Code, NFPA, etc.) and displayed exactly as that jurisdiction produces it. EvidLY never blends or converts. Live per-county wiring lands Q3 2026.">
              <i className="ti ti-info-circle" />
            </span>
          </div>
          <p className="met-num">&mdash;</p>
          <p className="met-foot">Per-county readiness wiring launches Q3 2026.</p>
        </div>
        <div className="met teal">
          <div className="met-top">
            <i className="ti ti-file-check" />
            <span>Documents current</span>
            <span className="info" title="Counts active documents on file that have not expired. Excludes archived, replaced, or deleted documents. Documents within 30 days of expiration are surfaced in the Renewal card alongside this count.">
              <i className="ti ti-info-circle" />
            </span>
          </div>
          <p className="met-num">{loading ? '—' : `${current} of ${total}`}</p>
          <p className="met-foot detail">{loading ? '' : expiryFooter}</p>
        </div>
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
      </div>
    );
  }

  if (role === 'executive') {
    return (
      <div className="met-row">
        <div className="met amber">
          <div className="met-top"><i className="ti ti-alert-triangle" /><span>Residual risk · portfolio</span></div>
          <p className="met-num">&mdash;</p>
          <p className="met-foot timeline">Per-county calc Q3 2026</p>
        </div>
        <div className="met teal">
          <div className="met-top"><i className="ti ti-shield-check" /><span>Portfolio inspection-ready</span></div>
          <p className="met-num">&mdash;</p>
          <p className="met-foot">Q3 2026</p>
        </div>
        <div className="met teal">
          <div className="met-top"><i className="ti ti-file-check" /><span>Docs current portfolio</span></div>
          <p className="met-num">{loading ? '—' : `${current} of ${total}`}</p>
          <p className="met-foot detail">{loading ? '' : `${expiringWithin30Days} expire <30d`}</p>
        </div>
        <div className="met purple">
          <div className="met-top"><i className="ti ti-clock" /><span>Decisions waiting</span></div>
          <p className="met-num">&mdash;</p>
          <p className="met-foot">Decisions queue lands C13</p>
        </div>
      </div>
    );
  }

  if (role === 'compliance_manager') {
    return (
      <div className="met-row">
        <div className="met amber">
          <div className="met-top"><i className="ti ti-alert-triangle" /><span>Residual risk · monitored</span></div>
          <p className="met-num">&mdash;</p>
          <p className="met-foot timeline">Per-county calc Q3 2026</p>
        </div>
        <div className="met teal">
          <div className="met-top"><i className="ti ti-file-check" /><span>Evidence on record</span></div>
          <p className="met-num">{loading ? '—' : `${current} of ${total}`}</p>
          <p className="met-foot detail">All inspection-traceable</p>
        </div>
        <div className="met purple">
          <div className="met-top"><i className="ti ti-calendar" /><span>Inspection windows opening</span></div>
          <p className="met-num">&mdash;</p>
          <p className="met-foot">County readiness lands C13</p>
        </div>
        <div className="met teal">
          <div className="met-top"><i className="ti ti-eye-check" /><span>Drifts caught QTD</span></div>
          <p className="met-num">&mdash;</p>
          <p className="met-foot">Live wiring lands C12</p>
        </div>
      </div>
    );
  }

  return null;
}
