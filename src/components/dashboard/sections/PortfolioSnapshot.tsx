/**
 * PortfolioSnapshot — C14 dispatcher
 *
 * Executive only — per-location rollup of logs, actions, docs, and status.
 *
 * Status column now derived from canonical posture via PortfolioDataContext
 * (usePortfolioData) instead of the independent doc/task derivation in
 * usePortfolioSnapshot.  Display data (logs, actions, docs) still comes
 * from usePortfolioSnapshot.
 */

import { useRole } from '../../../contexts/RoleContext';
import { usePortfolioSnapshot } from '../../../hooks/usePortfolioSnapshot';
import { usePortfolioDataContext, worstPosture } from '../../../contexts/PortfolioDataContext';
import { PortfolioRow } from './PortfolioRow';
import type { PortfolioRow as PortfolioRowType } from '../../../hooks/usePortfolioSnapshot';
import type { PostureStatus } from '../../../hooks/usePortfolioData';

/** Map canonical posture → PortfolioRow status vocabulary. */
function postureToStatus(posture: PostureStatus): 'ready' | 'watch' | 'alarm' {
  if (posture === 'alarm') return 'alarm';
  if (posture === 'watch') return 'watch';
  return 'ready'; // solid → ready
}

export function PortfolioSnapshot() {
  const { userRole } = useRole();
  const role = userRole === 'platform_admin' ? 'executive' : userRole;
  const { rows, loading } = usePortfolioSnapshot();
  const { locations: portfolioLocs, loading: portfolioLoading } = usePortfolioDataContext();

  if (role !== 'executive') return null;

  if (loading || portfolioLoading) {
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

  // Override status with canonical posture from usePortfolioData
  const postureByLoc = new Map<string, PostureStatus>();
  for (const loc of portfolioLocs) {
    postureByLoc.set(loc.id, worstPosture(loc.foodStatus, loc.fireStatus));
  }

  const enrichedRows: PortfolioRowType[] = rows.map(row => {
    const posture = postureByLoc.get(row.location_id);
    if (!posture) return row;
    return { ...row, status: postureToStatus(posture) };
  });

  return (
    <div>
      <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Portfolio snapshot</span>
        {enrichedRows.length > 0 && (
          <span style={{
            fontSize: 11,
            color: 'var(--muted)',
            background: 'var(--cream)',
            border: '0.5px solid var(--line)',
            borderRadius: 10,
            padding: '2px 8px',
          }}>
            {enrichedRows.length} location{enrichedRows.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {enrichedRows.length === 0 ? (
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
          {enrichedRows.map(r => (
            <PortfolioRow key={r.location_id} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}
