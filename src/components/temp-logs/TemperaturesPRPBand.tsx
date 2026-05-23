import type { TemperaturesPRPStats } from '../../hooks/temperatures/useTemperaturesPRPStats';

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
        style={{ borderTop: '3px solid #c2731a' }}
      >
        <div className={PILLAR_LABEL} style={{ color: '#c2731a' }}>PREDICT</div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Risk signals</div>
        {loading ? (
          <div className="h-8 w-16 mt-2 rounded bg-[#1E2D4D]/5 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold mt-2" style={{ color: '#c2731a' }}>
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
        style={{ borderTop: '3px solid #8A93A6' }}
      >
        <div className={PILLAR_LABEL} style={{ color: '#8A93A6' }}>REDUCE</div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Exposure range</div>
        <div
          className="mt-2 font-normal"
          style={{ color: '#8A93A6', fontSize: '18px', fontFamily: 'Inter, sans-serif' }}
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
        style={{ borderTop: '3px solid #2f7a4d' }}
      >
        <div className={PILLAR_LABEL} style={{ color: '#2f7a4d' }}>PROVE</div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Current status</div>
        {loading ? (
          <div className="h-8 w-16 mt-2 rounded bg-[#1E2D4D]/5 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold mt-2" style={{ color: '#2f7a4d' }}>
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
