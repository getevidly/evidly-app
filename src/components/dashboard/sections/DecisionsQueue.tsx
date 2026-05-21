/**
 * DecisionsQueue — C13a dispatcher
 *
 * owner_operator, executive → all open decisions
 * facilities_manager → fire-scoped decisions
 * compliance_manager, chef, kitchen_manager, kitchen_staff → null
 */

import { useRole } from '../../../contexts/RoleContext';
import type { DashboardRole } from '../../../constants/dashboardComposition';
import { useDecisionsQueue } from '../../../hooks/useDecisionsQueue';
import { DecisionRow } from './DecisionRow';
import { DecisionsEmptyState } from './DecisionsEmptyState';

const HEADING: Record<string, string> = {
  owner_operator: 'Decisions awaiting your call',
  executive: 'Decisions awaiting your call \u00B7 Portfolio',
  facilities_manager: 'Facility decisions awaiting you',
};

export function DecisionsQueue() {
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;
  const { decisions, openCount, loading } = useDecisionsQueue();

  const heading = HEADING[role];
  if (!heading) return null;

  if (loading) {
    return (
      <div>
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>{heading}</span>
        </div>
        <div className="decisions">
          <div className="dec-row">
            <div className="skeleton" style={{ width: '100%', height: 56, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  const chipText = openCount > 0 ? `${openCount} open` : '';

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
      <div className="decisions">
        {openCount === 0 ? (
          <DecisionsEmptyState />
        ) : (
          decisions.slice(0, 10).map(d => (
            <DecisionRow key={d.id} decision={d} />
          ))
        )}
      </div>
    </div>
  );
}
