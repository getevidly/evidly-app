/**
 * CountyReadiness — C13a dispatcher
 *
 * owner_operator, executive → all counties
 * compliance_manager → same data, advisory header
 */

import { useRole } from '../../../contexts/RoleContext';
import type { DashboardRole } from '../../../constants/dashboardComposition';
import { useCountyReadiness } from '../../../hooks/useCountyReadiness';
import { CountyReadinessCard } from './CountyReadinessCard';

export function CountyReadiness() {
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;
  const { counties, totalLocations, totalCounties, loading } = useCountyReadiness();

  if (role !== 'owner_operator' && role !== 'executive' && role !== 'compliance_manager') {
    return null;
  }

  const heading = role === 'compliance_manager'
    ? 'County compliance posture'
    : 'Inspection-readiness by county';

  if (loading) {
    return (
      <div>
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>{heading}</span>
        </div>
        <div className="cnty-grid">
          <div className="cnty">
            <div className="skeleton" style={{ width: '100%', height: 80, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  const chipText = totalCounties > 0
    ? `${totalLocations} location${totalLocations === 1 ? '' : 's'} · ${totalCounties} count${totalCounties === 1 ? 'y' : 'ies'}`
    : '';

  return (
    <div>
      <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>{heading}</span>
        {chipText && (
          <span style={{
            fontSize: 11,
            color: 'var(--muted)',
            background: 'var(--cream)',
            border: '0.5px solid var(--line)',
            borderRadius: 10,
            padding: '2px 8px',
          }}>
            {chipText}
          </span>
        )}
      </div>
      {totalCounties === 0 ? (
        <div className="cnty-grid">
          <div className="cnty" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 0' }}>
              No counties configured. Add locations to begin tracking.
            </p>
          </div>
        </div>
      ) : (
        <div className="cnty-grid">
          {counties.map(c => (
            <CountyReadinessCard key={`${c.county}-${c.state}-${c.jurisdiction_layer}`} county={c} />
          ))}
        </div>
      )}
    </div>
  );
}
