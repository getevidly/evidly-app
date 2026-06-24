/**
 * OperationalDrift — Operational Intelligence scaffold
 *
 * Pillar-split open drift summary. Full detail page is Prompt 4.
 * Food Safety and Fire Safety are NEVER blended — two separate sections.
 */

import { useOpenDriftCounts } from '../../hooks/useOpenDriftCounts';
import { useDashboardLocation } from '../../contexts/DashboardLocationContext';

export function OperationalDrift() {
  const { selectedLocationId } = useDashboardLocation();
  const { foodCount, fireCount, loading } = useOpenDriftCounts(selectedLocationId);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Operational Intelligence</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Open drift across your operations — Food Safety and Fire Safety tracked separately.
      </p>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading drift data…</p>
      ) : (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{
            flex: '1 1 340px',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 8,
            padding: 24,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Food Safety</h2>
            <p style={{ fontSize: 32, fontWeight: 700, color: foodCount > 0 ? 'var(--coral, #ef4444)' : 'var(--green, #16a34a)' }}>
              {foodCount === 0 ? 'Clear' : foodCount}
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {foodCount === 0 ? 'No open food safety drift' : `${foodCount} open food safety drift item${foodCount !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div style={{
            flex: '1 1 340px',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 8,
            padding: 24,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Fire Safety</h2>
            <p style={{ fontSize: 32, fontWeight: 700, color: fireCount > 0 ? 'var(--coral, #ef4444)' : 'var(--green, #16a34a)' }}>
              {fireCount === 0 ? 'Clear' : fireCount}
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {fireCount === 0 ? 'No open fire safety drift' : `${fireCount} open fire safety drift item${fireCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
