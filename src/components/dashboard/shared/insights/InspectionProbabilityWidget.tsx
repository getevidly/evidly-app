import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../constants';

export interface InspectionEstimate {
  name: string;
  lastInspectionDate: string;
  frequencyDays: number;
  jurisdictionName: string;
}

interface Props {
  locations: InspectionEstimate[];
}

function getBarColor(pct: number): string {
  if (pct >= 75) return '#dc2626';
  if (pct >= 50) return '#f59e0b';
  return '#22c55e';
}

function daysBetween(a: string, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - new Date(a).getTime()) / 86_400_000));
}

export function InspectionProbabilityWidget({ locations }: Props) {
  const now = new Date();

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        boxShadow: CARD_SHADOW,
      }}
    >
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>
          Upcoming Inspection Probability
        </h3>
      </div>

      {locations.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-xs" style={{ color: MUTED }}>No inspection data available</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {locations.map((loc) => {
            const daysSince = daysBetween(loc.lastInspectionDate, now);
            const probability = Math.min(100, Math.round((daysSince / loc.frequencyDays) * 100));
            const barColor = getBarColor(probability);

            const estDaysLeft = Math.max(0, loc.frequencyDays - daysSince);
            const windowLabel = estDaysLeft === 0
              ? 'Due any day'
              : estDaysLeft <= 30
                ? `Within ${estDaysLeft} days`
                : `~${Math.round(estDaysLeft / 30)} months`;

            return (
              <div key={loc.name} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] font-medium" style={{ color: BODY_TEXT }}>
                    {loc.name}
                  </p>
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: barColor }}
                  >
                    {probability}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${probability}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px]" style={{ color: MUTED }}>
                    {loc.jurisdictionName}
                  </p>
                  <p className="text-[11px]" style={{ color: MUTED }}>
                    {windowLabel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
