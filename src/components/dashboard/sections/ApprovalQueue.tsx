/**
 * ApprovalQueue — C14 dispatcher
 *
 * Kitchen_manager only — items awaiting PIC verification/sign-off.
 */

import { useRole } from '../../../contexts/RoleContext';
import { useApprovalQueue } from '../../../hooks/useApprovalQueue';
import { ApprovalRow } from './ApprovalRow';

export function ApprovalQueue() {
  const { userRole } = useRole();
  const { items, loading } = useApprovalQueue();

  if (userRole !== 'kitchen_manager') return null;

  if (loading) {
    return (
      <div>
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Your team needs you to</span>
        </div>
        <div className="approval">
          <div className="appr-row">
            <div className="skeleton" style={{ width: '100%', height: 60, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  const chipText = items.length > 0 ? `${items.length} pending` : '';

  return (
    <div>
      <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Your team needs you to</span>
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
      <div className="approval">
        {items.length === 0 ? (
          <div className="appr-row" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 0' }}>
              No items awaiting your approval. Team is current.
            </p>
          </div>
        ) : (
          items.map(item => (
            <ApprovalRow key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
}
