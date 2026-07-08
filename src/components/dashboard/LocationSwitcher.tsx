/**
 * LocationSwitcher — C18 Phase 3
 *
 * Header location selector for multi-location orgs.
 * "All locations (N)" + individual location pills with health dots.
 * Single-location orgs: renders nothing.
 *
 * Health dots now derived from canonical posture via PortfolioDataContext
 * instead of independent useLocationHealthData computation.
 */

import { useDashboardLocation } from '../../contexts/DashboardLocationContext';
import { usePortfolioDataContext, worstPosture, postureToHealth, type HealthState } from '../../contexts/PortfolioDataContext';

const DOT_COLORS: Record<HealthState, string> = {
  coral: '#C75543',
  teal: '#2C8C99',
  green: '#2E7D5B',
};

function HealthDot({ health }: { health: HealthState }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: DOT_COLORS[health],
      flexShrink: 0,
    }} />
  );
}

export function LocationSwitcher() {
  const { selectedLocationId, setSelectedLocationId, locations, locationCount, isMultiLocation } = useDashboardLocation();
  const { locations: portfolioLocs } = usePortfolioDataContext();

  if (!isMultiLocation) return null;

  // Build health lookup from canonical posture
  const healthMap = new Map<string, HealthState>();
  for (const loc of portfolioLocs) {
    healthMap.set(loc.id, postureToHealth(worstPosture(loc.foodStatus, loc.fireStatus)));
  }

  const isAll = selectedLocationId === null;

  return (
    <div className="loc-switcher">
      <button
        type="button"
        className={`loc-pill${isAll ? ' active' : ''}`}
        onClick={() => setSelectedLocationId(null)}
      >
        All locations ({locationCount})
      </button>
      {locations.map(loc => {
        const isActive = selectedLocationId === loc.id;
        const health = healthMap.get(loc.id) || 'green';
        return (
          <button
            key={loc.id}
            type="button"
            className={`loc-pill${isActive ? ' active' : ''}`}
            onClick={() => setSelectedLocationId(loc.id)}
          >
            <HealthDot health={health} />
            {loc.name}
          </button>
        );
      })}
    </div>
  );
}
