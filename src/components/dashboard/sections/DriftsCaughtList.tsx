/**
 * DriftsCaughtList — C12
 *
 * Shared list container for drift catch cards.
 * Shows section header with count chip, catch list, and empty state.
 */

import { useDriftCatches } from '../../../hooks/useDriftCatches';
import { DriftCatchCard } from './DriftCatchCard';

interface DriftsCaughtListProps {
  variant: 'standard' | 'audit';
  pillarFilter?: 'food_safety' | 'fire_safety';
}

const PILLAR_EMPTY: Record<string, string> = {
  food_safety: 'No food safety drifts caught in 90 days. EvidLY is watching.',
  fire_safety: 'No fire safety drifts caught in 90 days. EvidLY is watching.',
};

export function DriftsCaughtList({ variant, pillarFilter }: DriftsCaughtListProps) {
  const { catches, totalSaved, loading, error, acknowledge } = useDriftCatches({ pillarFilter });

  if (loading) {
    return (
      <div className="catches">
        <div className="catch">
          <div className="skeleton" style={{ width: '100%', height: 72, borderRadius: 8 }} />
        </div>
        <div className="catch">
          <div className="skeleton" style={{ width: '100%', height: 72, borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  if (error) return null;

  const count = catches.length;
  const chipText = count > 0
    ? `${count} in last 90 days${totalSaved > 0 ? ` · $${totalSaved.toLocaleString()} saved` : ''}`
    : '';

  return (
    <div>
      <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Drifts EvidLY caught</span>
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
      <div className="catches">
        {count === 0 ? (
          <div className="catch" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 0' }}>
              {pillarFilter ? PILLAR_EMPTY[pillarFilter] : 'No drifts caught in the last 90 days. EvidLY is watching.'}
            </p>
          </div>
        ) : (
          catches.map(drift => (
            <DriftCatchCard
              key={drift.id}
              drift={drift}
              variant={variant}
              onAcknowledge={acknowledge}
            />
          ))
        )}
      </div>
    </div>
  );
}
