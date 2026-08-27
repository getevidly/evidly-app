/**
 * KitchenOverviewCards — one card per kitchen, coloured by its worst open item.
 *
 * The whole card navigates; "View kitchen" is the visible affordance for the
 * same action. A kitchen with nothing open gets its own designed state rather
 * than an empty card, because "nothing open" is a result worth stating.
 */

import { SEVERITY_ASC, SEVERITY_COLORS, type Severity } from '../../../lib/severityEngine';
import type { LocationRisk } from '../../../hooks/useRiskFeed';

const NAVY = '#1E2D4D';
const MUTED = '#6B7F96';
const LINE = 'rgba(30,45,77,0.10)';
const GREEN = '#166534';
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

interface Props {
  byLocation: LocationRisk[];
  onViewKitchen: (locationId: string) => void;
}

function formatDue(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full text-[11px] font-semibold"
      style={{ color: '#FFFFFF', backgroundColor: color, padding: '2px 9px' }}
    >
      {label}
    </span>
  );
}

export function KitchenOverviewCards({ byLocation, onViewKitchen }: Props) {
  if (byLocation.length === 0) return null;

  const bands = [...SEVERITY_ASC].reverse();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {byLocation.map(loc => {
        const clear = loc.openCount === 0;
        const edge = clear ? GREEN : SEVERITY_COLORS[loc.worst as Severity];

        return (
          <button
            key={loc.locationId}
            type="button"
            onClick={() => onViewKitchen(loc.locationId)}
            className="bg-white border rounded-xl text-left w-full"
            style={{ borderColor: LINE, borderLeft: `3px solid ${edge}`, padding: '14px 16px' }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[14px] font-semibold truncate" style={{ color: NAVY }}>
                {loc.locationName}
              </span>
              <Pill label={clear ? 'All clear' : (loc.worst as Severity)} color={edge} />
            </div>

            {clear ? (
              <p className="text-[12.5px] leading-relaxed" style={{ color: MUTED }}>
                Records current — nothing open. EvidLY is watching the schedule.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 mb-2">
                  {bands.map(band =>
                    loc.counts[band] > 0 ? (
                      <span key={band} className="text-[11px]" style={{ color: MUTED }}>
                        <span style={{ fontFamily: MONO, fontWeight: 600, color: SEVERITY_COLORS[band] }}>
                          {loc.counts[band]}
                        </span>{' '}
                        {band}
                      </span>
                    ) : null,
                  )}
                </div>
                {loc.topItem && (
                  <>
                    <p className="text-[13px] font-medium truncate" style={{ color: NAVY }}>
                      {loc.topItem.title}
                    </p>
                    <p className="text-[11.5px] truncate" style={{ color: MUTED }}>
                      {loc.topItem.reason}
                    </p>
                  </>
                )}
              </>
            )}

            {loc.nextDue && (
              <p className="text-[11px] mt-2" style={{ color: MUTED }}>
                Next due <span style={{ fontFamily: MONO }}>{formatDue(loc.nextDue)}</span>
              </p>
            )}

            <span className="inline-block text-[12px] font-semibold mt-3" style={{ color: NAVY }}>
              View kitchen →
            </span>
          </button>
        );
      })}
    </div>
  );
}
