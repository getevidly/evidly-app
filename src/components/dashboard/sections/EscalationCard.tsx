/**
 * EscalationCard — C15 dispatcher
 *
 * Kitchen_staff only — shows kitchen_manager as escalation contact.
 */

import { useRole } from '../../../contexts/RoleContext';
import { useEscalationContact } from '../../../hooks/useEscalationContact';

export function EscalationCard() {
  const { userRole } = useRole();

  if (userRole !== 'kitchen_staff') return null;

  return <EscalationCardInner />;
}

function EscalationCardInner() {
  const { manager, loading, error } = useEscalationContact();

  if (loading) {
    return (
      <div>
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Need help?</span>
        </div>
        <div className="escalation">
          <div className="skeleton" style={{ width: '100%', height: 44, borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  if (error || !manager) return null;

  return (
    <div>
      <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Need help?</span>
      </div>
      <div className="escalation">
        <div className="esc-h">
          <i className="fa-solid fa-headset" />
          <span>{manager.role_label}</span>
        </div>
        <div className="esc-b">
          <strong>{manager.full_name}</strong>
          {manager.phone && (
            <a href={`tel:${manager.phone}`} className="esc-phone">
              <i className="fa-solid fa-phone" style={{ fontSize: 11, marginRight: 4 }} />
              {manager.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
