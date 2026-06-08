/**
 * LocationHeatMap — C18 Phase 3
 *
 * All-locations mode only. One tile per location showing health state,
 * three mini-numbers (signals/open/drift), and expandable detail.
 *
 * Health state:
 *   coral  = drift > 0 OR critical unread > 0
 *   teal   = open work or unread (non-critical)
 *   green  = clean
 *
 * Tile tap expands inline detail with Predict/Reduce/Prove/Temperature rows
 * and "Open this location" button.
 */

import { useState } from 'react';
import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { useLocationHealthData, type LocationHealth, type HealthState } from '../../../hooks/useLocationHealthData';

const HEALTH_LABELS: Record<HealthState, string> = {
  coral: 'needs attention',
  teal: 'watching',
  green: 'all clear',
};

const HEALTH_COLORS: Record<HealthState, { tileBg: string; text: string }> = {
  coral: { tileBg: '#F9ECE8', text: '#C75543' },
  teal: { tileBg: '#E9F3F4', text: '#2C8C99' },
  green: { tileBg: '#EAF3EE', text: '#2E7D5B' },
};

function MiniNum({ value, label }: { value: number; label: string }) {
  return (
    <span className="hm-mini">
      <span className="hm-mini-num">{value}</span>
      <span className="hm-mini-label">{label}</span>
    </span>
  );
}

function HeatMapTile({ loc, isExpanded, onToggle, onSelect }: {
  loc: LocationHealth;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const colors = HEALTH_COLORS[loc.health];

  return (
    <div
      className={`hm-tile${isExpanded ? ' expanded' : ''}`}
      style={{ background: colors.tileBg, ...(isExpanded ? { borderColor: 'var(--navy, #1E2D4D)', borderWidth: '1.5px' } : {}) }}
    >
      <button type="button" className="hm-tile-head" onClick={onToggle}>
        <div className="hm-tile-left">
          <span className="hm-dot" style={{ background: colors.text }} />
          <span className="hm-name">{loc.locationName}</span>
        </div>
        <span className="hm-health-word" style={{ color: colors.text }}>
          {HEALTH_LABELS[loc.health]}
        </span>
      </button>
      <div className="hm-mini-row">
        <MiniNum value={loc.signalCount} label="signals" />
        <MiniNum value={loc.openTasks} label="open" />
        <MiniNum value={loc.driftCount} label="temp" />
      </div>
      {isExpanded && (
        <div className="hm-detail">
          <div className="hm-detail-row">
            <span className="hm-detail-label">What's coming</span>
            <span className="hm-detail-val" style={loc.signalCount === 0 ? { color: '#2E7D5B' } : undefined}>{loc.signalCount === 0 ? 'nothing new' : `${loc.signalCount} unread`}</span>
          </div>
          <div className="hm-detail-row">
            <span className="hm-detail-label">What's handled</span>
            <span className="hm-detail-val">{loc.openTasks === 0 ? 'none open' : `${loc.openTasks} open`}</span>
          </div>
          <div className="hm-detail-row">
            <span className="hm-detail-label">Temperature</span>
            <span className="hm-detail-val" style={{ color: loc.driftCount > 0 ? '#C75543' : '#2E7D5B' }}>
              {loc.driftCount === 0 ? 'in range' : `${loc.driftCount} out of range`}
            </span>
          </div>
          <button type="button" className="hm-open-btn" onClick={onSelect}>
            Open this location &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

export function LocationHeatMap() {
  const { selectedLocationId, setSelectedLocationId, isMultiLocation } = useDashboardLocation();
  const { data: healthData, loading } = useLocationHealthData();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Only render in All mode for multi-location orgs
  if (!isMultiLocation || selectedLocationId !== null) return null;

  if (loading) {
    return (
      <div>
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Locations</span>
        </div>
        <div className="hm-grid">
          <div className="hm-tile">
            <div className="skeleton" style={{ width: '100%', height: 48, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Locations</span>
        <span style={{
          fontSize: 11,
          color: 'var(--muted)',
          background: 'var(--cream)',
          border: '0.5px solid var(--line)',
          borderRadius: 10,
          padding: '2px 8px',
        }}>
          {healthData.length} location{healthData.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="hm-grid">
        {healthData.map(loc => (
          <HeatMapTile
            key={loc.locationId}
            loc={loc}
            isExpanded={expandedId === loc.locationId}
            onToggle={() => setExpandedId(expandedId === loc.locationId ? null : loc.locationId)}
            onSelect={() => setSelectedLocationId(loc.locationId)}
          />
        ))}
      </div>
    </div>
  );
}
