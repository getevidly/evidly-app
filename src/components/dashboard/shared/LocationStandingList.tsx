/**
 * LocationStandingList — Renders locations with jurisdiction-native grade displays
 *
 * When jurisdiction data is available (scoring_type + gradeDisplay), shows
 * the result EXACTLY as the jurisdiction produces it via JurisdictionResult.
 * Falls back to generic status dots when jurisdiction config is not loaded.
 */

import type { NavigateFunction } from 'react-router-dom';
import { BODY_TEXT, NAVY } from './constants';
import type { LocationStanding, StandingLevel } from '../../../hooks/useDashboardStanding';
import { JurisdictionResult } from '../../jurisdiction/JurisdictionResult';

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

const FACILITY_STATUS_STYLE = {
  passing: { bg: '#DCFCE7', text: '#166534' },
  failing: { bg: '#FEE2E2', text: '#991B1B' },
} as const;

function FallbackPill({ pillar, level, reason }: { pillar: string; level: StandingLevel; reason: string | null }) {
  const config = STANDING_CONFIG[level];
  const displayText = level === 'action' && reason ? reason : config.label;

  return (
    <div className="flex items-center gap-1.5" title={reason || config.label}>
      <span
        className="shrink-0 rounded-full"
        style={{ width: 6, height: 6, backgroundColor: config.dot }}
      />
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6B7F96' }}>
        {pillar}
      </span>
      <span className="text-xs font-medium truncate max-w-[140px]" style={{ color: config.textColor }}>
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
              <p className="text-sm font-semibold mb-1.5" style={{ color: BODY_TEXT }}>{s.locationName}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {/* Food Safety — jurisdiction-native result or fallback */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6B7F96' }}>
                    Food
                  </span>
                  {s.foodScoringType && s.foodGradeDisplay ? (
                    <JurisdictionResult
                      scoringType={s.foodScoringType}
                      gradeDisplay={s.foodGradeDisplay}
                      status={s.foodStatus ?? 'unknown'}
                      compact
                    />
                  ) : (
                    <FallbackPill pillar="" level={s.foodSafety} reason={s.foodSafetyReason} />
                  )}
                </div>
                {/* Facility Safety — pass/fail badge */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6B7F96' }}>
                    Facility
                  </span>
                  {s.facilityGradeDisplay && s.facilityStatus ? (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: FACILITY_STATUS_STYLE[s.facilityStatus].bg,
                        color: FACILITY_STATUS_STYLE[s.facilityStatus].text,
                      }}
                    >
                      {s.facilityGradeDisplay}
                    </span>
                  ) : (
                    <FallbackPill pillar="" level={s.facilitySafety} reason={s.facilitySafetyReason} />
                  )}
                </div>
              </div>
              {/* Authority attribution line */}
              {s.foodAuthority && (
                <div className="mt-1 text-xs text-[#1E2D4D]/30 truncate">
                  {s.foodAuthority}{s.facilityAuthority ? ` · ${s.facilityAuthority}` : ''}
                </div>
              )}
            </div>
            {s.openItemCount > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
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
