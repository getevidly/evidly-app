import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../constants';

export interface BenchmarkItem {
  locationName: string;
  yourScore: number;
  jurisdictionAvg: number;
  jurisdictionName: string;
  delta: number;
}

interface Props {
  benchmarks: BenchmarkItem[];
}

export function JurisdictionBenchmarkWidget({ benchmarks }: Props) {
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
          Benchmark vs. Jurisdiction Average
        </h3>
      </div>

      {benchmarks.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-xs" style={{ color: MUTED }}>No benchmark data available</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {benchmarks.map((b) => {
            const isAbove = b.delta >= 0;
            const deltaColor = isAbove ? '#16a34a' : '#dc2626';
            const deltaLabel = isAbove ? `+${b.delta}` : `${b.delta}`;

            return (
              <div key={b.locationName} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: BODY_TEXT }}>
                    {b.locationName}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                    {b.jurisdictionName}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-lg font-bold tabular-nums" style={{ color: BODY_TEXT }}>
                    {b.yourScore}
                  </span>
                  <span className="text-[11px] ml-1" style={{ color: MUTED }}>
                    vs {b.jurisdictionAvg} avg
                  </span>
                </div>

                <span
                  className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full tabular-nums"
                  style={{
                    color: deltaColor,
                    backgroundColor: isAbove ? '#f0fdf4' : '#fef2f2',
                  }}
                >
                  {deltaLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
