import type { PRPStats } from '../../hooks/documents/usePRPStats';
import { prp } from '../../lib/designSystem';

interface PRPBandProps {
  stats: PRPStats;
  onPredictClick: () => void;
  onSendToThirdParty: () => void;
}

const PILLAR_LABEL = 'text-[10px] uppercase font-bold tracking-[0.12em]';

export function PRPBand({ stats, onPredictClick, onSendToThirdParty }: PRPBandProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* ── PREDICT ────────────────────────────────────── */}
      <button
        type="button"
        onClick={onPredictClick}
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card-md"
        style={{ borderTop: `3px solid ${prp.predict.accent}` }}
      >
        <div className={PILLAR_LABEL} style={{ color: prp.predict.text }}>
          PREDICT
        </div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Renewal Radar</div>
        <div className="text-2xl font-bold mt-2" style={{ color: prp.predict.accent }}>
          {stats.predict.total}
        </div>

        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          <p className="text-[11px] text-[#6B7F96]">
            {stats.predict.expiringIn30Days} document{stats.predict.expiringIn30Days !== 1 ? 's' : ''} expiring in next 30 days
          </p>
          {stats.predict.requiredNotOnFile != null && stats.predict.requiredNotOnFile > 0 && (
            <p className="text-[11px] text-[#6B7F96] mt-1">
              {stats.predict.requiredNotOnFile} required document{stats.predict.requiredNotOnFile !== 1 ? 's' : ''} not yet on file
            </p>
          )}
        </div>
      </button>

      {/* ── REDUCE (pending state) ─────────────────────── */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left pending"
        style={{ borderTop: `3px solid ${prp.reduce.accent}` }}
      >
        <div className={PILLAR_LABEL} style={{ color: prp.reduce.text }}>
          REDUCE
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
            Range will appear once your county's citation sources are verified for your record types.
            We don't show a number we can't back.
          </p>
        </div>
      </div>

      {/* ── PROVE ──────────────────────────────────────── */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card-md"
        style={{ borderTop: `3px solid ${prp.prove.accent}` }}
      >
        <div className={PILLAR_LABEL} style={{ color: prp.prove.text }}>
          PROVE
        </div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Ready to Send</div>
        <div className="text-2xl font-bold mt-2" style={{ color: prp.prove.accent }}>
          {stats.prove.currentCount}
        </div>

        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          <p className="text-[11px] text-[#6B7F96]">
            Current records ready for inspector, insurer, or third party.
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSendToThirdParty(); }}
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: prp.prove.accent }}
          >
            Send selection {'\u2192'}
          </button>
        </div>
      </div>
    </div>
  );
}
