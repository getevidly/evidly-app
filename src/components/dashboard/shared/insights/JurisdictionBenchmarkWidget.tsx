import { Lock } from 'lucide-react';
import { CARD_BG, CARD_BORDER, BODY_TEXT } from '../constants';

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

export function JurisdictionBenchmarkWidget({ benchmarks: _benchmarks }: Props) {
  return (
    <div
      className="rounded-lg overflow-hidden relative"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        opacity: 0.55,
        pointerEvents: 'none',
      }}
      title="Unlocks as your kitchen builds history."
    >
      {/* Lock overlay */}
      <div className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#A08C5A20' }}>
        <Lock size={14} style={{ color: '#A08C5A' }} />
      </div>

      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Jurisdiction Benchmark</h3>
        <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Public inspection activity in your county</p>
      </div>

      {/* Placeholder content */}
      <div className="px-4 py-6 space-y-4">
        {[1, 2].map(i => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="h-3 rounded" style={{ width: '35%', backgroundColor: '#E8EDF5' }} />
              <div className="h-3 w-10 rounded" style={{ backgroundColor: '#E8EDF5' }} />
            </div>
            <div className="flex gap-4">
              <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#E8EDF5' }} />
              <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#E8EDF5' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
