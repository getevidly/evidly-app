import type { TodayChecklist } from '../../hooks/checklists';
import { prp } from '../../lib/designSystem';

const PILLAR_LABEL = 'text-[10px] uppercase font-bold tracking-[0.12em]';

interface ChecklistsPRPBandProps {
  todayChecklists: TodayChecklist[];
  loading: boolean;
}

export function ChecklistsPRPBand({ todayChecklists, loading }: ChecklistsPRPBandProps) {
  // Derive counts from today's checklists
  const dueCount = todayChecklists.filter(tc => tc.isDue).length;
  const completedCount = todayChecklists.filter(
    tc => tc.latestCompletionStatus === 'completed',
  ).length;
  const inProgressCount = todayChecklists.filter(
    tc => tc.latestCompletionStatus === 'in_progress',
  ).length;
  const totalScheduled = todayChecklists.length;
  const notStartedCount = dueCount - inProgressCount;
  const remaining = totalScheduled - completedCount;
  const pct = totalScheduled > 0 ? Math.round((completedCount / totalScheduled) * 100) : 0;

  // Detail line for PREDICT
  let predictDetail: string;
  if (dueCount === 0 && totalScheduled === 0) {
    predictDetail = 'No active routines. Adopt from library to start.';
  } else if (dueCount === 0) {
    predictDetail = 'All checklists completed for this period.';
  } else {
    const parts: string[] = [];
    if (notStartedCount > 0) parts.push(`${notStartedCount} due this shift`);
    if (inProgressCount > 0) parts.push(`${inProgressCount} in progress`);
    if (completedCount > 0) parts.push(`${completedCount} completed`);
    predictDetail = parts.join(' \u00B7 ');
  }

  // Detail line for PROVE
  let proveDetail: string;
  if (totalScheduled === 0) {
    proveDetail = 'No checklists scheduled today.';
  } else if (completedCount >= totalScheduled) {
    proveDetail = 'All checklists completed.';
  } else {
    proveDetail = `${pct}% complete \u00B7 ${remaining} remaining for today.`;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* PREDICT */}
      <div
        className="bg-white border border-[#E2DDD4] rounded-lg p-4 text-left"
        style={{ borderTop: `3px solid ${prp.predict.accent}` }}
      >
        <div className="flex items-center gap-1.5">
          <span className={PILLAR_LABEL} style={{ color: prp.predict.text }}>PREDICT</span>
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${prp.predict.accent}20`, color: prp.predict.accent }}
          >
            LIVE
          </span>
        </div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Checklists due today</div>
        {loading ? (
          <div className="h-8 w-16 mt-2 rounded bg-[#1E2D4D]/5 animate-pulse" />
        ) : (
          <div
            className="mt-2 font-extrabold"
            style={{ color: prp.predict.accent, fontSize: '32px', fontFamily: "'Montserrat', sans-serif" }}
          >
            {dueCount}
          </div>
        )}
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          {loading ? (
            <div className="h-3 w-40 rounded bg-[#1E2D4D]/5 animate-pulse" />
          ) : (
            <p className="text-[11px] text-[#6B7F96] leading-relaxed">{predictDetail}</p>
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
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${prp.reduce.accent}20`, color: prp.reduce.accent }}
          >
            LIVE
          </span>
        </div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Exposure range</div>
        <div
          className="mt-2 font-semibold"
          style={{ color: prp.reduce.accent, fontSize: '18px', fontFamily: 'Inter, sans-serif' }}
        >
          Exposure pending
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          <p className="text-[11px] text-[#6B7F96] leading-relaxed">
            Range appears once citation sources are verified.
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
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${prp.prove.accent}20`, color: prp.prove.accent }}
          >
            LIVE
          </span>
        </div>
        <div className="text-[11px] text-[#8A93A6] mt-0.5">Completed today</div>
        {loading ? (
          <div className="h-8 w-16 mt-2 rounded bg-[#1E2D4D]/5 animate-pulse" />
        ) : (
          <div
            className="mt-2 font-extrabold"
            style={{ color: prp.prove.accent, fontSize: '32px', fontFamily: "'Montserrat', sans-serif" }}
          >
            {totalScheduled > 0 ? `${completedCount} of ${totalScheduled}` : '\u2014'}
          </div>
        )}
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2DDD4' }}>
          {loading ? (
            <div className="h-3 w-40 rounded bg-[#1E2D4D]/5 animate-pulse" />
          ) : (
            <p className="text-[11px] text-[#6B7F96] leading-relaxed">{proveDetail}</p>
          )}
        </div>
      </div>
    </div>
  );
}
