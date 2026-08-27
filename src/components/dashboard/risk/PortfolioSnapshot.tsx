/**
 * PortfolioSnapshot — the org layer, three zones.
 *
 * Open items by band, kitchens by standing, next due portfolio-wide.
 * Counts only: the bands are never summed into one figure, because "7 open"
 * would flatten a Critical and six Lows into the same sentence.
 */

import { SEVERITY_ASC, SEVERITY_COLORS, type Severity } from '../../../lib/severityEngine';
import type { LocationRisk } from '../../../hooks/useRiskFeed';

const NAVY = '#1E2D4D';
const MUTED = '#6B7F96';
const LINE = 'rgba(30,45,77,0.10)';
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

interface Props {
  counts: Record<Severity, number>;
  byLocation: LocationRisk[];
  nextDue: string | null;
}

const zoneLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: MUTED,
  marginBottom: 8,
};

function formatDue(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "2 at Critical — Downtown, Airport" */
function standingLine(byLocation: LocationRisk[], band: Severity): string | null {
  const at = byLocation.filter(l => l.worst === band);
  if (at.length === 0) return null;
  return `${at.length} at ${band} — ${at.map(l => l.locationName).join(', ')}`;
}

export function PortfolioSnapshot({ counts, byLocation, nextDue }: Props) {
  const bands = [...SEVERITY_ASC].reverse();
  const clear = byLocation.filter(l => l.openCount === 0);

  return (
    <div className="bg-white border rounded-xl p-4 sm:p-5" style={{ borderColor: LINE }}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Zone 1 — open items by band */}
        <div>
          <p style={zoneLabel}>Open items by band</p>
          <div className="flex flex-wrap gap-4">
            {bands.map(band => (
              <div key={band}>
                <span
                  style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: SEVERITY_COLORS[band] }}
                >
                  {counts[band]}
                </span>
                <span className="block text-[11px]" style={{ color: MUTED }}>{band}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zone 2 — kitchens by standing */}
        <div style={{ borderLeft: `1px solid ${LINE}`, paddingLeft: 16 }}>
          <p style={zoneLabel}>Kitchens by standing</p>
          {byLocation.length === 0 ? (
            <p className="text-[12.5px]" style={{ color: MUTED }}>No kitchens yet.</p>
          ) : (
            <div className="space-y-1">
              {bands.map(band => {
                const line = standingLine(byLocation, band);
                if (!line) return null;
                return (
                  <p key={band} className="text-[12.5px]" style={{ color: NAVY }}>
                    <span
                      className="inline-block rounded-full mr-1.5"
                      style={{ width: 7, height: 7, backgroundColor: SEVERITY_COLORS[band] }}
                      aria-hidden="true"
                    />
                    {line}
                  </p>
                );
              })}
              {clear.length > 0 && (
                <p className="text-[12.5px]" style={{ color: MUTED }}>
                  {clear.length} clear — {clear.map(l => l.locationName).join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Zone 3 — next due portfolio-wide */}
        {nextDue && (
          <div style={{ borderLeft: `1px solid ${LINE}`, paddingLeft: 16 }}>
            <p style={zoneLabel}>Next due</p>
            <p style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: NAVY }}>
              {formatDue(nextDue)}
            </p>
            <p className="text-[11px]" style={{ color: MUTED }}>Across the portfolio</p>
          </div>
        )}
      </div>
    </div>
  );
}
