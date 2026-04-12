import { CARD_BG, CARD_BORDER, BODY_TEXT, NAVY } from '../constants';

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
      style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Jurisdiction Benchmark</h3>
        <p className="text-xs text-gray-500 mt-0.5">Your score vs. jurisdiction average</p>
      </div>
      <div className="divide-y divide-gray-100">
        {benchmarks.map(b => {
          const isPositive = b.delta >= 0;
          return (
            <div key={b.locationName} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{b.locationName}</p>
                  <p className="text-xs text-gray-500">{b.jurisdictionName}</p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: isPositive ? '#f0fdf4' : '#fef2f2',
                    color: isPositive ? '#166534' : '#991b1b',
                  }}
                >
                  {isPositive ? '+' : ''}{b.delta}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7F96' }}>You</span>
                    <span className="text-xs font-bold" style={{ color: NAVY }}>{b.yourScore}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${b.yourScore}%`, backgroundColor: '#1E2D4D' }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7F96' }}>Avg</span>
                    <span className="text-xs font-bold" style={{ color: '#6B7F96' }}>{b.jurisdictionAvg}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${b.jurisdictionAvg}%`, backgroundColor: '#94a3b8' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
