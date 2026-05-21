/**
 * TeamGrid — C13b dispatcher
 *
 * owner_operator, executive, compliance_manager → org-wide team view
 * kitchen_manager → location-scoped team view (deferred — shows org-wide for now)
 * All others → null
 */

import { useRole } from '../../../contexts/RoleContext';
import type { DashboardRole } from '../../../constants/dashboardComposition';
import { useTeamGrid } from '../../../hooks/useTeamGrid';
import { TeamCard } from './TeamCard';
import { TeamEmptyState } from './TeamEmptyState';

const HEADING: Record<string, string> = {
  owner_operator: 'Where your team stands',
  executive: 'Where your team stands',
  compliance_manager: 'Where your team stands',
  kitchen_manager: 'Your team this week',
};

export function TeamGrid() {
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;
  const { members, loading } = useTeamGrid();

  const heading = HEADING[role];
  if (!heading) return null;

  if (loading) {
    return (
      <div>
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>{heading}</span>
        </div>
        <div className="team-grid">
          <div className="team-card">
            <div className="skeleton" style={{ width: '100%', height: 66, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>{heading}</span>
        {members.length > 0 && (
          <span style={{
            fontSize: 11,
            color: 'var(--muted)',
            background: 'var(--cream)',
            border: '0.5px solid var(--line)',
            borderRadius: 10,
            padding: '2px 8px',
          }}>
            This week
          </span>
        )}
      </div>
      {members.length === 0 ? (
        <TeamEmptyState />
      ) : (
        <div className="team-grid">
          {members.map(m => (
            <TeamCard key={m.id} member={m} />
          ))}
        </div>
      )}
    </div>
  );
}
