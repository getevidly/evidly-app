/**
 * LocationSwitcher — C18 Phase 3
 *
 * Header location selector for multi-location orgs.
 * "All locations (N)" + individual location pills with health dots.
 * Single-location orgs: renders nothing.
 */

import { useDashboardLocation } from '../../contexts/DashboardLocationContext';
import { useLocationHealthData, type HealthState } from '../../hooks/useLocationHealthData';

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
  const { selectedLocationId, setSelectedLocationId, locationCount, isMultiLocation } = useDashboardLocation();
  const { data: healthData } = useLocationHealthData();

  if (!isMultiLocation) return null;

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
      {healthData.map(loc => {
        const isActive = selectedLocationId === loc.locationId;
        return (
          <button
            key={loc.locationId}
            type="button"
            className={`loc-pill${isActive ? ' active' : ''}`}
            onClick={() => setSelectedLocationId(loc.locationId)}
          >
            <HealthDot health={loc.health} />
            {loc.locationName}
          </button>
        );
      })}
    </div>
  );
}
