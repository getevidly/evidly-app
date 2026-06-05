/**
 * OverdueItems — C14 dispatcher
 *
 * Kitchen_manager only — overdue tasks, corrective actions, and expired documents.
 */

import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { useRole } from '../../../contexts/RoleContext';
import { useOverdueItems } from '../../../hooks/useOverdueItems';
import { OverdueRow } from './OverdueRow';

export function OverdueItems() {
  const { selectedLocationId } = useDashboardLocation();
  const { userRole } = useRole();
  const { items, totalCount, loading } = useOverdueItems({ locationIdFilter: selectedLocationId || undefined });

  if (userRole !== 'kitchen_manager') return null;

  if (loading) {
    return (
      <div>
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>What&apos;s overdue</span>
        </div>
        <div className="overdue">
          <div className="ov-row">
            <div className="skeleton" style={{ width: '100%', height: 40, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  const chipText = totalCount > 0 ? `${totalCount} item${totalCount === 1 ? '' : 's'}` : '';

  return (
    <div>
      <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>What&apos;s overdue</span>
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
      <div className="overdue">
        {items.length === 0 ? (
          <div className="ov-row" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 0' }}>
              Nothing overdue. Team is on track.
            </p>
          </div>
        ) : (
          items.map(item => (
            <OverdueRow key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
}
