import type { ReheatingTabSignals } from '../../hooks/temperatures/useReheatingTabSignals';
import { prp } from '../../lib/designSystem';

interface ReheatingTabSignalStripProps {
  signals: ReheatingTabSignals;
}

export function ReheatingTabSignalStrip({ signals }: ReheatingTabSignalStripProps) {
  if (signals.loading) {
    return (
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-8 rounded-lg bg-[#1E2D4D]/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {/* PREDICT — checks due */}
      <div
        className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
        style={{
          backgroundColor: signals.checksDue > 0 ? 'rgba(186,117,23,0.08)' : 'rgba(138,147,166,0.08)',
          color: signals.checksDue > 0 ? prp.predict.accent : '#8A93A6',
          border: signals.checksDue > 0 ? '0.5px solid rgba(186,117,23,0.2)' : '0.5px solid rgba(138,147,166,0.15)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: signals.checksDue > 0 ? prp.predict.accent : '#8A93A6' }}
        />
        {signals.checksDue > 0 ? `${signals.checksDue} checks due` : 'All units current'}
      </div>

      {/* REDUCE — items at risk */}
      <div
        className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
        style={{
          backgroundColor: signals.itemsAtRisk > 0 ? 'rgba(24,95,165,0.08)' : 'rgba(138,147,166,0.08)',
          color: signals.itemsAtRisk > 0 ? prp.reduce.accent : '#8A93A6',
          border: signals.itemsAtRisk > 0 ? '0.5px solid rgba(24,95,165,0.2)' : '0.5px solid rgba(138,147,166,0.15)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: signals.itemsAtRisk > 0 ? prp.reduce.accent : '#8A93A6' }}
        />
        {signals.itemsAtRisk > 0 ? `${signals.itemsAtRisk} below 165°F` : '0 at risk'}
      </div>

      {/* PROVE — in range today */}
      <div
        className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
        style={{
          backgroundColor: signals.inRangeToday > 0 ? 'rgba(15,110,86,0.08)' : 'rgba(138,147,166,0.08)',
          color: signals.inRangeToday > 0 ? prp.prove.accent : '#8A93A6',
          border: signals.inRangeToday > 0 ? '0.5px solid rgba(15,110,86,0.2)' : '0.5px solid rgba(138,147,166,0.15)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: signals.inRangeToday > 0 ? prp.prove.accent : '#8A93A6' }}
        />
        {signals.inRangeToday} verified today
      </div>
    </div>
  );
}
