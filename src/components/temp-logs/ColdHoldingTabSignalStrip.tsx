import type { ColdHoldingTabSignals } from '../../hooks/temperatures/useColdHoldingTabSignals';

interface ColdHoldingTabSignalStripProps {
  signals: ColdHoldingTabSignals;
}

export function ColdHoldingTabSignalStrip({ signals }: ColdHoldingTabSignalStripProps) {
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
          backgroundColor: signals.checksDue > 0 ? 'rgba(194,115,26,0.08)' : 'rgba(138,147,166,0.08)',
          color: signals.checksDue > 0 ? '#c2731a' : '#8A93A6',
          border: signals.checksDue > 0 ? '0.5px solid rgba(194,115,26,0.2)' : '0.5px solid rgba(138,147,166,0.15)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: signals.checksDue > 0 ? '#c2731a' : '#8A93A6' }}
        />
        {signals.checksDue > 0 ? `${signals.checksDue} checks due` : 'All units current'}
      </div>

      {/* REDUCE — items at risk */}
      <div
        className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
        style={{
          backgroundColor: signals.itemsAtRisk > 0 ? 'rgba(179,38,30,0.08)' : 'rgba(138,147,166,0.08)',
          color: signals.itemsAtRisk > 0 ? '#b3261e' : '#8A93A6',
          border: signals.itemsAtRisk > 0 ? '0.5px solid rgba(179,38,30,0.2)' : '0.5px solid rgba(138,147,166,0.15)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: signals.itemsAtRisk > 0 ? '#b3261e' : '#8A93A6' }}
        />
        {signals.itemsAtRisk > 0 ? `${signals.itemsAtRisk} at risk` : '0 at risk'}
      </div>

      {/* PROVE — in range today */}
      <div
        className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
        style={{
          backgroundColor: signals.inRangeToday > 0 ? 'rgba(47,122,77,0.08)' : 'rgba(138,147,166,0.08)',
          color: signals.inRangeToday > 0 ? '#2f7a4d' : '#8A93A6',
          border: signals.inRangeToday > 0 ? '0.5px solid rgba(47,122,77,0.2)' : '0.5px solid rgba(138,147,166,0.15)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: signals.inRangeToday > 0 ? '#2f7a4d' : '#8A93A6' }}
        />
        {signals.inRangeToday} in range today
      </div>
    </div>
  );
}
