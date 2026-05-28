/**
 * DriftsCaughtList — C12
 *
 * Shared list container for drift catch cards.
 * Shows section header with count chip, catch list, and empty state.
 */

import { useDriftCatches } from '../../../hooks/useDriftCatches';
import { DriftCatchCard } from './DriftCatchCard';
import { WeeklyDriftReport } from './WeeklyDriftReport';

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

  if (error) {
    console.error('[DriftsCaughtList] failed to load:', error);
    return (
      <div className="catches" style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: 12 }}>
        Unable to load drift catches. Try refreshing.
      </div>
    );
  }

  const count = catches.length;
  const chipText = count > 0
    ? `${count} in last 90 days${totalSaved > 0 ? ` · $${totalSaved.toLocaleString()} saved` : ''}`
    : '';

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="section-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Drifts EvidLY caught</span>
        {chipText && (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
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
      <WeeklyDriftReport />
    </div>
  );
}
