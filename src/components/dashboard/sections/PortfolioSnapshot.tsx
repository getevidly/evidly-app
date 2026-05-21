/**
 * PortfolioSnapshot — C14 dispatcher
 *
 * Executive only — per-location rollup of logs, actions, docs, and status.
 */

import { useRole } from '../../../contexts/RoleContext';
import { usePortfolioSnapshot } from '../../../hooks/usePortfolioSnapshot';
import { PortfolioRow } from './PortfolioRow';

export function PortfolioSnapshot() {
  const { userRole } = useRole();
  const role = userRole === 'platform_admin' ? 'executive' : userRole;
  const { rows, loading } = usePortfolioSnapshot();

  if (role !== 'executive') return null;

  if (loading) {
    return (
      <div>
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Portfolio snapshot</span>
        </div>
        <div className="portfolio">
          <div className="port-row" style={{ gridTemplateColumns: '1fr' }}>
            <div className="skeleton" style={{ width: '100%', height: 40, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Portfolio snapshot</span>
        {rows.length > 0 && (
          <span style={{
            fontSize: 11,
            color: 'var(--muted)',
            background: 'var(--cream)',
            border: '0.5px solid var(--line)',
            borderRadius: 10,
            padding: '2px 8px',
          }}>
            {rows.length} location{rows.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="portfolio">
          <div className="port-row" style={{ gridTemplateColumns: '1fr', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 0' }}>
              No locations configured.
            </p>
          </div>
        </div>
      ) : (
        <div className="portfolio">
          <div className="port-row">
            <div>Location</div>
            <div>Logs done today</div>
            <div>Open actions</div>
            <div>Doc current</div>
            <div>Status</div>
          </div>
          {rows.map(r => (
            <PortfolioRow key={r.location_id} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}
