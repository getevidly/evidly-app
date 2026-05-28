import type { CooldownTabSignals } from '../../hooks/temperatures/useCooldownTabSignals';
import { prp } from '../../lib/designSystem';

interface CooldownTabSignalStripProps {
  signals: CooldownTabSignals;
}

export function CooldownTabSignalStrip({ signals }: CooldownTabSignalStripProps) {
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
      {/* PREDICT — in progress */}
      <div
        className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
        style={{
          backgroundColor: signals.inProgress > 0 ? 'rgba(186,117,23,0.08)' : 'rgba(138,147,166,0.08)',
          color: signals.inProgress > 0 ? prp.predict.accent : '#8A93A6',
          border: signals.inProgress > 0 ? '0.5px solid rgba(186,117,23,0.2)' : '0.5px solid rgba(138,147,166,0.15)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: signals.inProgress > 0 ? prp.predict.accent : '#8A93A6' }}
        />
        {signals.inProgress > 0 ? `${signals.inProgress} in progress` : 'No active cooldowns'}
      </div>

      {/* REDUCE — at risk */}
      <div
        className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
        style={{
          backgroundColor: signals.atRisk > 0 ? 'rgba(24,95,165,0.08)' : 'rgba(138,147,166,0.08)',
          color: signals.atRisk > 0 ? prp.reduce.accent : '#8A93A6',
          border: signals.atRisk > 0 ? '0.5px solid rgba(24,95,165,0.2)' : '0.5px solid rgba(138,147,166,0.15)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: signals.atRisk > 0 ? prp.reduce.accent : '#8A93A6' }}
        />
        {signals.atRisk > 0 ? `${signals.atRisk} at risk` : '0 at risk'}
      </div>

      {/* PROVE — completed today */}
      <div
        className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
        style={{
          backgroundColor: signals.completedToday > 0 ? 'rgba(15,110,86,0.08)' : 'rgba(138,147,166,0.08)',
          color: signals.completedToday > 0 ? prp.prove.accent : '#8A93A6',
          border: signals.completedToday > 0 ? '0.5px solid rgba(15,110,86,0.2)' : '0.5px solid rgba(138,147,166,0.15)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: signals.completedToday > 0 ? prp.prove.accent : '#8A93A6' }}
        />
        {signals.completedToday} completed today
      </div>
    </div>
  );
}
