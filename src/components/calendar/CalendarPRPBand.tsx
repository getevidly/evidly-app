import type { CalendarPRPStats } from '../../hooks/calendar/useCalendarPRPStats';

interface CalendarPRPBandProps {
  stats: CalendarPRPStats;
}

const PILLAR_LABEL = 'text-[10px] uppercase font-bold tracking-[0.12em]';

export function CalendarPRPBand({ stats }: CalendarPRPBandProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* PREDICT */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: '3px solid #B45309' }}
      >
        <div className={PILLAR_LABEL} style={{ color: '#B45309' }}>PREDICT</div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Services due, not scheduled</div>
        <div className="text-2xl font-bold mt-2" style={{ color: '#B45309' }}>
          {stats.predictCount}
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          <p className="text-[11px] text-[#6B7F96]">
            {stats.predictCount} service{stats.predictCount !== 1 ? 's' : ''} past cadence with no upcoming appointment.
          </p>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-white cursor-not-allowed"
            style={{ backgroundColor: '#B45309', opacity: 0.5 }}
          >
            Schedule from list {'\u2192'}
          </button>
        </div>
      </div>

      {/* REDUCE (pending) */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: '3px solid #8A93A6' }}
      >
        <div className={PILLAR_LABEL} style={{ color: '#8A93A6' }}>REDUCE</div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Exposure range</div>
        <div className="mt-2 font-normal" style={{ color: '#8A93A6', fontSize: '18px' }}>
          Exposure pending
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          <p className="text-[11px] text-[#6B7F96] leading-relaxed">
            Range will appear once your county&rsquo;s citation sources are verified
            for your service types. We don&rsquo;t show a number we can&rsquo;t back.
          </p>
        </div>
      </div>

      {/* PROVE */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: '3px solid #2E7D32' }}
      >
        <div className={PILLAR_LABEL} style={{ color: '#2E7D32' }}>PROVE</div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Completed with records</div>
        <div className="text-2xl font-bold mt-2" style={{ color: '#2E7D32' }}>
          {stats.proveCount} of {stats.proveTotal}
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          <p className="text-[11px] text-[#6B7F96]">
            Every completed service this month has documentation attached.
          </p>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-white cursor-not-allowed"
            style={{ backgroundColor: '#2E7D32', opacity: 0.5 }}
          >
            View proof packets {'\u2192'}
          </button>
        </div>
      </div>
    </div>
  );
}
