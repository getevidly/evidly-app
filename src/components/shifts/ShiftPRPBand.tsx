import type { ShiftPRPMetrics } from '../../hooks/useShiftPRPMetrics';

type PRPVariant = 'handoff' | 'live';

interface ShiftPRPBandProps {
  metrics: ShiftPRPMetrics;
  loading: boolean;
  variant?: PRPVariant;
}

const PILLAR_LABEL = 'text-[10px] uppercase font-bold tracking-[0.12em]';

const COPY: Record<PRPVariant, {
  predictSub: string;
  predictBody: (m: ShiftPRPMetrics) => string;
  reduceSub: string;
  reduceBody: (m: ShiftPRPMetrics) => string;
  proveSub: string;
  proveBody: (m: ShiftPRPMetrics) => string;
}> = {
  live: {
    predictSub: 'Due this shift',
    predictBody: (m) =>
      `${m.predict} task${m.predict !== 1 ? 's' : ''} due in the next 4 hours.`,
    reduceSub: 'Overdue right now',
    reduceBody: (m) =>
      m.reduce > 0
        ? `${m.reduce} overdue item${m.reduce !== 1 ? 's' : ''} requiring attention.`
        : 'No overdue items this shift.',
    proveSub: 'Shift tasks completed',
    proveBody: (m) =>
      m.prove.total > 0
        ? `${m.prove.ready} of ${m.prove.total} tasks completed this shift.`
        : 'No tasks scheduled for this shift.',
  },
  handoff: {
    predictSub: 'Coming due soon',
    predictBody: (m) =>
      `${m.predict} item${m.predict !== 1 ? 's' : ''} coming due in the next 14 hours.`,
    reduceSub: 'Open corrective actions',
    reduceBody: (m) =>
      m.reduce > 0
        ? `${m.reduce} active corrective action${m.reduce !== 1 ? 's' : ''} unresolved.`
        : 'No open corrective actions.',
    proveSub: 'Documents current',
    proveBody: (m) =>
      m.prove.total > 0
        ? `${m.prove.ready} of ${m.prove.total} documents current (${m.prove.pct}%).`
        : 'No documents tracked yet.',
  },
};

export function ShiftPRPBand({ metrics, loading, variant = 'handoff' }: ShiftPRPBandProps) {
  const copy = COPY[variant];

  const reduceColor = '#b3261e';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* PREDICT */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: '3px solid #c2731a' }}
      >
        <div className={PILLAR_LABEL} style={{ color: '#c2731a' }}>PREDICT</div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">{copy.predictSub}</div>
        {loading ? (
          <div className="h-8 w-16 mt-2 rounded bg-[#1E2D4D]/5 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold mt-2" style={{ color: '#c2731a' }}>
            {metrics.predict}
          </div>
        )}
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          {loading ? (
            <div className="h-3 w-40 rounded bg-[#1E2D4D]/5 animate-pulse" />
          ) : (
            <p className="text-[11px] text-[#6B7F96]">{copy.predictBody(metrics)}</p>
          )}
        </div>
      </div>

      {/* REDUCE */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: `3px solid ${reduceColor}` }}
      >
        <div className={PILLAR_LABEL} style={{ color: reduceColor }}>REDUCE</div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">{copy.reduceSub}</div>
        {loading ? (
          <div className="h-8 w-16 mt-2 rounded bg-[#1E2D4D]/5 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold mt-2" style={{ color: reduceColor }}>
            {metrics.reduce}
          </div>
        )}
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          {loading ? (
            <div className="h-3 w-40 rounded bg-[#1E2D4D]/5 animate-pulse" />
          ) : (
            <p className="text-[11px] text-[#6B7F96]">{copy.reduceBody(metrics)}</p>
          )}
        </div>
      </div>

      {/* PROVE */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: '3px solid #2f7a4d' }}
      >
        <div className={PILLAR_LABEL} style={{ color: '#2f7a4d' }}>PROVE</div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">{copy.proveSub}</div>
        {loading ? (
          <div className="h-8 w-16 mt-2 rounded bg-[#1E2D4D]/5 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold mt-2" style={{ color: '#2f7a4d' }}>
            {metrics.prove.total > 0
              ? `${metrics.prove.ready} of ${metrics.prove.total}`
              : '\u2014'}
          </div>
        )}
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          {loading ? (
            <div className="h-3 w-40 rounded bg-[#1E2D4D]/5 animate-pulse" />
          ) : (
            <p className="text-[11px] text-[#6B7F96]">{copy.proveBody(metrics)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
