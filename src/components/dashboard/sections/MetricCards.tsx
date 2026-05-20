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

  const expiryFooter = expiringWithin30Days > 0
    ? `${expiringWithin30Days} expire within 30 days`
    : 'All documents current';

  const renewalFooter = nextRenewals.length > 0
    ? nextRenewals.map(r => `Day ${r.daysUntilExpiry} (${r.name})`).join(' · ')
    : 'None upcoming';

  if (role === 'owner_operator') {
    return (
      <div className="met-row">
        <div className="met amber">
          <div className="met-top">
            <i className="ti ti-alert-triangle" />
            <span>Residual risk · monitored</span>
            <span className="info">ℹ
              <span className="tip">Residual risk is the exposure remaining <strong>after</strong> EvidLY's Predict/Reduce cycle. Per-county calculation launches Q3 2026 once jurisdiction scoring is live.</span>
            </span>
          </div>
          <p className="met-num tbd">TBD</p>
          <p className="met-foot timeline">Per-county calc launches Q3 2026</p>
        </div>
        <div className="met teal">
          <div className="met-top"><i className="ti ti-shield-check" /><span>Inspection-ready</span></div>
          <p className="met-num tbd">TBD</p>
          <p className="met-foot">Per-county wiring Q3 2026</p>
        </div>
        <div className="met teal">
          <div className="met-top"><i className="ti ti-file-check" /><span>Documents current</span></div>
          <p className="met-num">{loading ? '—' : `${current} of ${total}`}</p>
          <p className="met-foot detail">{loading ? '' : expiryFooter}</p>
        </div>
        <div className="met purple">
          <div className="met-top"><i className="ti ti-clock" /><span>Renewal &lt;30d</span></div>
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
          <p className="met-num tbd">TBD</p>
          <p className="met-foot timeline">Per-county calc Q3 2026</p>
        </div>
        <div className="met teal">
          <div className="met-top"><i className="ti ti-shield-check" /><span>Portfolio inspection-ready</span></div>
          <p className="met-num tbd">TBD</p>
          <p className="met-foot">Q3 2026</p>
        </div>
        <div className="met teal">
          <div className="met-top"><i className="ti ti-file-check" /><span>Docs current portfolio</span></div>
          <p className="met-num">{loading ? '—' : `${current} of ${total}`}</p>
          <p className="met-foot detail">{loading ? '' : `${expiringWithin30Days} expire <30d`}</p>
        </div>
        <div className="met purple">
          <div className="met-top"><i className="ti ti-clock" /><span>Decisions waiting</span></div>
          <p className="met-num tbd">TBD</p>
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
          <p className="met-num tbd">TBD</p>
          <p className="met-foot timeline">Per-county calc Q3 2026</p>
        </div>
        <div className="met teal">
          <div className="met-top"><i className="ti ti-file-check" /><span>Evidence on record</span></div>
          <p className="met-num">{loading ? '—' : `${current} of ${total}`}</p>
          <p className="met-foot detail">All inspection-traceable</p>
        </div>
        <div className="met purple">
          <div className="met-top"><i className="ti ti-calendar" /><span>Inspection windows opening</span></div>
          <p className="met-num tbd">TBD</p>
          <p className="met-foot">County readiness lands C13</p>
        </div>
        <div className="met teal">
          <div className="met-top"><i className="ti ti-eye-check" /><span>Drifts caught QTD</span></div>
          <p className="met-num tbd">TBD</p>
          <p className="met-foot">Live wiring lands C12</p>
        </div>
      </div>
    );
  }

  return null;
}
