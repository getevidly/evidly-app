/**
 * TodayList — C13b dispatcher
 *
 * owner_operator, executive → all tasks today
 * compliance_manager → all tasks today (portfolio tone)
 * facilities_manager → fire_safety pillar only
 * chef → food_safety pillar only
 * kitchen_manager → all tasks today (location scope deferred)
 * kitchen_staff → user-scoped tasks only
 */

import { Link } from 'react-router-dom';
import { useRole } from '../../../contexts/RoleContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import type { DashboardRole } from '../../../constants/dashboardComposition';
import { useTodayList } from '../../../hooks/useTodayList';
import { useChecklistStatus } from '../../../hooks/useChecklistStatus';
import { TodayListRow } from './TodayListRow';
import { TasksEmptyState } from './TasksEmptyState';

interface RoleConfig {
  heading: string;
  pillarFilter?: 'food_safety' | 'fire_safety';
  useUserId?: boolean;
  showChecklistFooter?: boolean;
}

const ROLE_CONFIG: Record<string, RoleConfig> = {
  owner_operator: { heading: 'Today across your kitchens', showChecklistFooter: true },
  executive: { heading: 'Today across your kitchens', showChecklistFooter: true },
  compliance_manager: { heading: 'Today across the portfolio', showChecklistFooter: true },
  facilities_manager: { heading: 'Today — fire pillar', pillarFilter: 'fire_safety' },
  chef: { heading: 'Today — food pillar', pillarFilter: 'food_safety' },
  kitchen_manager: { heading: 'Today across your kitchens' },
  kitchen_staff: { heading: 'Today — your tasks', useUserId: true },
};

export function TodayList() {
  const { userRole } = useRole();
  const { profile } = useAuth();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;

  const config = ROLE_CONFIG[role];
  if (!config) return null;

  const userId = config.useUserId ? profile?.id : undefined;
  const { selectedLocationId } = useDashboardLocation();

  return <TodayListInner heading={config.heading} pillarFilter={config.pillarFilter} userIdFilter={userId} locationIdFilter={selectedLocationId || undefined} showChecklistFooter={config.showChecklistFooter} />;
}

function TodayListInner({ heading, pillarFilter, userIdFilter, locationIdFilter, showChecklistFooter }: {
  heading: string;
  pillarFilter?: 'food_safety' | 'fire_safety';
  userIdFilter?: string;
  locationIdFilter?: string;
  showChecklistFooter?: boolean;
}) {
  const { items, totalToday, doneToday, loading } = useTodayList({ pillarFilter, userIdFilter, locationIdFilter });
  const { summary, loading: clLoading } = useChecklistStatus({ locationIdFilter });

  if (loading) {
    return (
      <div>
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>{heading}</span>
        </div>
        <div className="tdc">
          <div className="tdr">
            <div className="skeleton" style={{ width: '100%', height: 40, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  const chipText = totalToday > 0 ? `${doneToday}/${totalToday} done` : '';

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
      <div className="tdc">
        {items.length === 0 ? (
          <TasksEmptyState />
        ) : (
          items.map(item => (
            <TodayListRow key={item.id} item={item} />
          ))
        )}
      </div>
      {showChecklistFooter && !clLoading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 0',
          marginTop: 4,
          borderTop: '0.5px solid var(--line, #E5E2DA)',
          fontSize: 12,
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="cl-chip">Daily {summary.dailyDone}/{summary.dailyTotal}</span>
            <span className="cl-chip">Weekly {summary.weeklyDone}/{summary.weeklyTotal}</span>
            {summary.monthlyTotal > 0 && <span className="cl-chip">Monthly {summary.monthlyDone}/{summary.monthlyTotal}</span>}
            {summary.overdueCount > 0 && <span className="cl-badge overdue">{summary.overdueCount} overdue</span>}
            {summary.dueCount > 0 && <span className="cl-badge due">{summary.dueCount} due soon</span>}
          </div>
          <Link to="/checklists" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--navy, #1E2D4D)', textDecoration: 'none', flexShrink: 0 }}>
            <i className="ti ti-external-link" style={{ fontSize: 14 }} />
            Open checklists
          </Link>
        </div>
      )}
    </div>
  );
}
