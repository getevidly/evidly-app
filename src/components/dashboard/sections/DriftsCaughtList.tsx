/**
 * DriftsCaughtList — C12
 *
 * Shared list container for drift catch cards.
 * Shows section header with count chip, catch list, and empty state.
 */

import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { useDriftCatches } from '../../../hooks/useDriftCatches';
import { DriftCatchCard } from './DriftCatchCard';

interface DriftsCaughtListProps {
  variant: 'standard' | 'audit';
  pillarFilter?: 'food_safety' | 'fire_safety';
}

const PILLAR_EMPTY: Record<string, string> = {
  food_safety: 'Nothing caught in the last 90 days.',
  fire_safety: 'Nothing caught in the last 90 days.',
};

export function DriftsCaughtList({ variant, pillarFilter }: DriftsCaughtListProps) {
  const { selectedLocationId } = useDashboardLocation();
  const { catches, totalSaved, loading, error, acknowledge } = useDriftCatches({ pillarFilter, locationIdFilter: selectedLocationId || undefined });

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
        Unable to load catches. Try refreshing.
      </div>
    );
  }

  const openCatches = catches.filter(c => c.status === 'open' && !c.userHasAcked);
  if (openCatches.length === 0) return null;

  const count = openCatches.length;
  const openSaved = openCatches.reduce((sum, c) => sum + c.estimated_savings_cents, 0) / 100;
  const chipText = `${count} open${openSaved > 0 ? ` · $${openSaved.toLocaleString()} at risk` : ''}`;

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="section-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Caught before it cost you</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {chipText}
        </span>
      </div>
      <div className="catches">
        {openCatches.map(drift => (
          <DriftCatchCard
            key={drift.id}
            drift={drift}
            variant={variant}
            onAcknowledge={acknowledge}
          />
        ))}
      </div>
    </div>
  );
}
