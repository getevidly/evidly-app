import type { DeficienciesPRPStats } from '../../hooks/deficiencies/useDeficienciesPRPStats';
import { prp } from '../../lib/designSystem';

const PILLAR_LABEL = 'text-[10px] uppercase font-bold tracking-[0.12em]';

interface DeficienciesPRPBandProps {
  stats: DeficienciesPRPStats;
  loading: boolean;
  onFilterPredict?: () => void;
  onFilterProve?: () => void;
}

export function DeficienciesPRPBand({
  stats,
  loading,
  onFilterPredict,
  onFilterProve,
}: DeficienciesPRPBandProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* PREDICT */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: `3px solid ${prp.predict.accent}` }}
      >
        <div className={PILLAR_LABEL} style={{ color: prp.predict.text }}>PREDICT</div>
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
            <>
              <div className="space-y-0.5">
                {stats.approachingCount > 0 && (
                  <p className="text-[11px] text-[#6B7F96]">
                    {stats.approachingCount} approaching or past correction deadline.
                  </p>
                )}
                {stats.recurringCodeCount > 0 && (
                  <p className="text-[11px] text-[#6B7F96]">
                    {stats.recurringCodeCount} recurring violation{stats.recurringCodeCount !== 1 ? 's' : ''} flagged.
                  </p>
                )}
                {stats.predictCount === 0 && (
                  <p className="text-[11px] text-[#6B7F96]">No active risk signals.</p>
                )}
              </div>
              {onFilterPredict && stats.predictCount > 0 && (
                <button
                  onClick={onFilterPredict}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-white px-3 py-1 rounded-full"
                  style={{ backgroundColor: prp.predict.accent }}
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
        style={{ borderTop: `3px solid ${prp.reduce.accent}` }}
      >
        <div className={PILLAR_LABEL} style={{ color: prp.reduce.text }}>REDUCE</div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Exposure range</div>
        <div
          className="mt-2 font-normal"
          style={{ color: prp.reduce.accent, fontSize: '18px', fontFamily: 'Inter, sans-serif' }}
        >
          Exposure pending
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          <p className="text-[11px] text-[#6B7F96] leading-relaxed">
            Deficiency-level exposure scoring is not yet available. When enabled,
            this card will show the estimated liability window for open deficiencies.
          </p>
        </div>
      </div>

      {/* PROVE */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: `3px solid ${prp.prove.accent}` }}
      >
        <div className={PILLAR_LABEL} style={{ color: prp.prove.text }}>PROVE</div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Corrected this period</div>
        {loading ? (
          <div className="h-8 w-16 mt-2 rounded bg-[#1E2D4D]/5 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold mt-2" style={{ color: prp.prove.accent }}>
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
                Corrected with documentation attached, ready for re-inspection.
                {stats.avgTimeToCorrect > 0 && (
                  <> Avg time to correct: {stats.avgTimeToCorrect}d.</>
                )}
              </p>
              {onFilterProve && stats.proveTotal > 0 && (
                <button
                  onClick={onFilterProve}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-white px-3 py-1 rounded-full"
                  style={{ backgroundColor: prp.prove.accent }}
                >
                  View re-inspection packets →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
