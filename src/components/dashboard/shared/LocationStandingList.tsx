/**
 * LocationStandingList — Renders locations with two-pillar standing pills
 *
 * Each location shows Food Safety + Facility Safety standing as colored pills.
 * Clicking a location navigates to its detail view.
 */

import type { NavigateFunction } from 'react-router-dom';
import { BODY_TEXT, NAVY } from './constants';
import type { LocationStanding, StandingLevel } from '../../../hooks/useDashboardStanding';

interface LocationStandingListProps {
  standings: LocationStanding[];
  navigate: NavigateFunction;
}

const STANDING_CONFIG: Record<StandingLevel, { dot: string; label: string; textColor: string }> = {
  ok:      { dot: '#16a34a', label: 'Covered',   textColor: '#166534' },
  action:  { dot: '#dc2626', label: 'Action',    textColor: '#991b1b' },
  pending: { dot: '#94a3b8', label: 'Pending',   textColor: '#64748b' },
  unknown: { dot: '#94a3b8', label: '—',     textColor: '#94a3b8' },
};

function StandingPill({ pillar, level, reason }: { pillar: string; level: StandingLevel; reason: string | null }) {
  const config = STANDING_CONFIG[level];
  const displayText = level === 'action' && reason ? reason : config.label;

  return (
    <div className="flex items-center gap-1.5" title={reason || config.label}>
      <span
        className="shrink-0 rounded-full"
        style={{ width: 6, height: 6, backgroundColor: config.dot }}
      />
      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#6B7F96' }}>
        {pillar}
      </span>
      <span className="text-[11px] font-medium truncate max-w-[140px]" style={{ color: config.textColor }}>
        {displayText}
      </span>
    </div>
  );
}

export function LocationStandingList({ standings, navigate }: LocationStandingListProps) {
  if (standings.length === 0) return null;

  return (
    <div className="bg-white rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Location Standing</h3>
      </div>
      <div>
        {standings.map(s => (
          <button
            key={s.locationId}
            type="button"
            onClick={() => navigate(`/dashboard?location=${s.locationId}`)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            style={{ borderBottom: '1px solid #F0F0F0' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-1" style={{ color: BODY_TEXT }}>{s.locationName}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <StandingPill pillar="Food" level={s.foodSafety} reason={s.foodSafetyReason} />
                <StandingPill pillar="Facility" level={s.facilitySafety} reason={s.facilitySafetyReason} />
              </div>
            </div>
            {s.openItemCount > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                {s.openItemCount} open
              </span>
            )}
            <span className="text-xs font-medium shrink-0" style={{ color: NAVY }}>View &rarr;</span>
          </button>
        ))}
      </div>
    </div>
  );
}
