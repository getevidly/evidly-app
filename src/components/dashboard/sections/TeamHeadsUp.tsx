/**
 * TeamHeadsUp — C15 dispatcher
 *
 * Kitchen_staff only — today's notifications (assigned / info / alert).
 */

import { useRole } from '../../../contexts/RoleContext';
import { useTeamHeadsUp, type HeadsUpItem } from '../../../hooks/useTeamHeadsUp';

export function TeamHeadsUp() {
  const { userRole } = useRole();

  if (userRole !== 'kitchen_staff') return null;

  return <TeamHeadsUpInner />;
}

function TeamHeadsUpInner() {
  const { items, loading, error } = useTeamHeadsUp();

  if (loading) {
    return (
      <div>
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Heads up</span>
        </div>
        <div className="tdr-list">
          <div className="skeleton" style={{ width: '100%', height: 48, borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  if (error) {
    console.error('[TeamHeadsUp] failed to load:', error);
    return (
      <div className="tdr-list" style={{ padding: '14px 18px', color: 'var(--muted)', fontSize: 12 }}>
        Unable to load. Try refreshing.
      </div>
    );
  }

  const chipText = items.length > 0 ? `${items.length}` : '';

  return (
    <div>
      <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Heads up</span>
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
      <div className="tdr-list">
        {items.length === 0 ? (
          <div style={{ padding: '16px 18px', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              No notifications today.
            </p>
          </div>
        ) : (
          items.map((item: HeadsUpItem) => (
            <div className="tdr-row" key={item.id}>
              <span className={`tdr-dot ${item.kind}`} />
              <div className="tdr-body">
                <p className="tdr-label">{item.label}</p>
                {item.detail && <p className="tdr-detail">{item.detail}</p>}
              </div>
              <span className="tdr-time">{item.time_ago}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
