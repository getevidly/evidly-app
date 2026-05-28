import type { TemperaturesPRPStats } from '../../hooks/temperatures/useTemperaturesPRPStats';
import { prp } from '../../lib/designSystem';

const PILLAR_LABEL = 'text-[10px] uppercase font-bold tracking-[0.12em]';

interface TemperaturesPRPBandProps {
  stats: TemperaturesPRPStats;
  loading: boolean;
}

export function TemperaturesPRPBand({ stats, loading }: TemperaturesPRPBandProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* PREDICT */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: `3px solid ${prp.predict.accent}` }}
      >
        <div className="flex items-center gap-1.5">
          <span className={PILLAR_LABEL} style={{ color: prp.predict.text }}>PREDICT</span>
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${prp.predict.accent}20`, color: prp.predict.accent }}>LIVE</span>
        </div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Risk signals</div>
        {loading ? (
          <div className="h-8 w-16 mt-2 rounded bg-[#1E2D4D]/5 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold mt-2" style={{ color: prp.predict.accent }}>
            {stats.predictCount}
          </div>
        )}
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          {loading ? (
            <div className="h-3 w-40 rounded bg-[#1E2D4D]/5 animate-pulse" />
          ) : (
            <p className="text-[11px] text-[#6B7F96] leading-relaxed">
              {stats.failingCount > 0 && (
                <span>{stats.failingCount} unit{stats.failingCount !== 1 ? 's' : ''} out of range. </span>
              )}
              {stats.overdueCount > 0 && (
                <span>{stats.overdueCount} reading{stats.overdueCount !== 1 ? 's' : ''} overdue. </span>
              )}
              {stats.driftingCount > 0 && (
                <span>{stats.driftingCount} unit{stats.driftingCount !== 1 ? 's' : ''} drifting toward limit. </span>
              )}
              {stats.predictCount === 0 && 'No active risk signals.'}
            </p>
          )}
        </div>
      </div>

      {/* REDUCE */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: `3px solid ${prp.reduce.accent}` }}
      >
        <div className="flex items-center gap-1.5">
          <span className={PILLAR_LABEL} style={{ color: prp.reduce.text }}>REDUCE</span>
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${prp.reduce.accent}20`, color: prp.reduce.accent }}>LIVE</span>
        </div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Exposure range</div>
        <div
          className="mt-2 font-normal"
          style={{ color: prp.reduce.accent, fontSize: '18px', fontFamily: 'Inter, sans-serif' }}
        >
          Exposure pending
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          <p className="text-[11px] text-[#6B7F96] leading-relaxed">
            Temperature exposure scoring is not yet available. When enabled,
            this card will show the estimated liability window for out-of-range units.
          </p>
        </div>
      </div>

      {/* PROVE */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: `3px solid ${prp.prove.accent}` }}
      >
        <div className="flex items-center gap-1.5">
          <span className={PILLAR_LABEL} style={{ color: prp.prove.text }}>PROVE</span>
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${prp.prove.accent}20`, color: prp.prove.accent }}>LIVE</span>
        </div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Current status</div>
        {loading ? (
          <div className="h-8 w-16 mt-2 rounded bg-[#1E2D4D]/5 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold mt-2" style={{ color: prp.prove.accent }}>
            {stats.proveTotal > 0
              ? `${stats.proveInRange} of ${stats.proveTotal}`
              : '\u2014'}
          </div>
        )}
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          {loading ? (
            <div className="h-3 w-40 rounded bg-[#1E2D4D]/5 animate-pulse" />
          ) : (
            <p className="text-[11px] text-[#6B7F96] leading-relaxed">
              {stats.proveTotal > 0
                ? `${stats.proveInRange} unit${stats.proveInRange !== 1 ? 's' : ''} in range.${stats.foodHeldCount > 0 ? ` ${stats.foodHeldCount} food item${stats.foodHeldCount !== 1 ? 's' : ''} held.` : ''}`
                : 'No equipment configured yet.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
