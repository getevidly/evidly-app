import type { ReceivingTabSignals } from '../../hooks/temperatures/useReceivingTabSignals';

interface ReceivingTabSignalStripProps {
  signals: ReceivingTabSignals;
}

export function ReceivingTabSignalStrip({ signals }: ReceivingTabSignalStripProps) {
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
      {/* PREDICT */}
      <div
        className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
        style={{ backgroundColor: 'rgba(194,115,26,0.08)', color: '#c2731a', border: '0.5px solid rgba(194,115,26,0.2)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#c2731a' }} />
        {signals.predictCount > 0
          ? `${signals.predictCount} incoming`
          : 'No delivery data'}
      </div>

      {/* REDUCE */}
      <div
        className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
        style={{
          backgroundColor: signals.reduceCount > 0 ? 'rgba(179,38,30,0.08)' : 'rgba(138,147,166,0.08)',
          color: signals.reduceCount > 0 ? '#b3261e' : '#8A93A6',
          border: signals.reduceCount > 0 ? '0.5px solid rgba(179,38,30,0.2)' : '0.5px solid rgba(138,147,166,0.15)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: signals.reduceCount > 0 ? '#b3261e' : '#8A93A6' }} />
        {signals.reduceCount} flagged this week
      </div>

      {/* PROVE */}
      <div
        className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
        style={{
          backgroundColor: signals.proveCount > 0 ? 'rgba(47,122,77,0.08)' : 'rgba(138,147,166,0.08)',
          color: signals.proveCount > 0 ? '#2f7a4d' : '#8A93A6',
          border: signals.proveCount > 0 ? '0.5px solid rgba(47,122,77,0.2)' : '0.5px solid rgba(138,147,166,0.15)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: signals.proveCount > 0 ? '#2f7a4d' : '#8A93A6' }} />
        {signals.proveCount} logged today
      </div>
    </div>
  );
}
