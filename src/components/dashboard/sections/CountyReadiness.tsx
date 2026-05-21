/**
 * CountyReadiness — C13a dispatcher
 *
 * compliance_manager only — advisory detail view.
 *
 * owner_operator + executive intentionally excluded — the Inspection-ready metric card at the
 * top of the dashboard is the at-a-glance surface for these roles. CountyReadiness was a
 * duplicate. Compliance_manager keeps the section as an advisory detail view.
 */

import { useRole } from '../../../contexts/RoleContext';
import { useCountyReadiness } from '../../../hooks/useCountyReadiness';
import { CountyReadinessCard } from './CountyReadinessCard';

export function CountyReadiness() {
  const { userRole } = useRole();

  if (userRole !== 'compliance_manager') {
    return null;
  }

  return <CountyReadinessInner />;
}

function CountyReadinessInner() {
  const { counties, totalLocations, totalCounties, loading } = useCountyReadiness();

  const heading = 'County compliance posture';

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
