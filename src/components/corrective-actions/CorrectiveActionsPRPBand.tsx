import type { CAPRPStats } from '../../hooks/corrective-actions/useCorrectiveActionsPRPStats';

const PILLAR_LABEL = 'text-[10px] uppercase font-bold tracking-[0.12em]';

interface CorrectiveActionsPRPBandProps {
  stats: CAPRPStats;
  loading: boolean;
  onFilterPredict?: () => void;
  onFilterProve?: () => void;
}

export function CorrectiveActionsPRPBand({
  stats,
  loading,
  onFilterPredict,
  onFilterProve,
}: CorrectiveActionsPRPBandProps) {
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
            <>
              <p className="text-[11px] text-[#6B7F96]">
                {stats.overdueCount} overdue. {stats.dueSoonCount} due within 48h.{' '}
                {stats.patternCount} recurring root cause{stats.patternCount !== 1 ? 's' : ''} flagged.
              </p>
              {onFilterPredict && stats.predictCount > 0 && (
                <button
                  onClick={onFilterPredict}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-white px-3 py-1 rounded-full"
                  style={{ backgroundColor: '#c2731a' }}
                >
                  Review signals →
                </button>
              )}
            </>
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
            Action-level exposure scoring is not yet available. When enabled,
            this card will show the estimated liability window for open actions.
          </p>
        </div>
      </div>

      {/* PROVE */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: '3px solid #2f7a4d' }}
      >
        <div className={PILLAR_LABEL} style={{ color: '#2f7a4d' }}>PROVE</div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Verified this week</div>
        {loading ? (
          <div className="h-8 w-16 mt-2 rounded bg-[#1E2D4D]/5 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold mt-2" style={{ color: '#2f7a4d' }}>
            {stats.proveTotal > 0
              ? `${stats.proveCount} of ${stats.proveTotal}`
              : '\u2014'}
          </div>
        )}
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          {loading ? (
            <div className="h-3 w-40 rounded bg-[#1E2D4D]/5 animate-pulse" />
          ) : (
            <>
              <p className="text-[11px] text-[#6B7F96]">
                Actions verified and documented this week.
              </p>
              {onFilterProve && stats.proveTotal > 0 && (
                <button
                  onClick={onFilterProve}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-white px-3 py-1 rounded-full"
                  style={{ backgroundColor: '#2f7a4d' }}
                >
                  View proof packets →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
