/**
 * SchedulePage — Main schedule/calendar with day/week/month views,
 * technician filter, unassigned panel, and drag-drop scheduling.
 * Route: /schedule
 */
import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Calendar, Users, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useSchedule, useUnassignedJobs, useScheduleTechnicians, useRescheduleJob, useAssignJob } from '../../hooks/api/useSchedule';
import type { ScheduleView, ScheduledJob } from '../../hooks/api/useSchedule';
import { ScheduleDndContext } from '../../components/schedule/ScheduleDndContext';
import { DayView } from '../../components/schedule/DayView';
import { WeekView } from '../../components/schedule/WeekView';
import { MonthView } from '../../components/schedule/MonthView';
import { UnassignedPanel } from '../../components/schedule/UnassignedPanel';
import { JobDetailPanel } from '../../components/schedule/JobDetailPanel';
import { RescheduleModal } from '../../components/schedule/RescheduleModal';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY, MUTED } from '@shared/components/dashboard/shared/constants';

export function SchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = (searchParams.get('view') as ScheduleView) || 'week';
  const dateParam = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const techParam = searchParams.get('tech') || '';

  const currentDate = new Date(dateParam + 'T00:00:00');
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ScheduledJob | null>(null);
  const [rescheduleJob, setRescheduleJob] = useState<ScheduledJob | null>(null);

  const { data: jobs, isLoading } = useSchedule({ date: dateParam, view: viewParam, technicianId: techParam || undefined });
  const { data: unassigned } = useUnassignedJobs();
  const { data: technicians } = useScheduleTechnicians();
  const { mutate: doReschedule } = useRescheduleJob();
  const { mutate: doAssign } = useAssignJob();

  const allJobs = jobs || [];
  const unassignedJobs = unassigned || [];
  const techs = technicians || [];

  const setParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, val);
    setSearchParams(next, { replace: true });
  };

  const navigate = useCallback((dir: 'prev' | 'next' | 'today') => {
    let d: Date;
    if (dir === 'today') d = new Date();
    else if (viewParam === 'day') d = dir === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1);
    else if (viewParam === 'week') d = dir === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
    else d = dir === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
    setParam('date', format(d, 'yyyy-MM-dd'));
  }, [viewParam, currentDate, searchParams]);

  const dateLabel = useMemo(() => {
    if (viewParam === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
    if (viewParam === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  }, [viewParam, currentDate]);

  const handleReschedule = useCallback((jobId: string, date: string, technicianId?: string) => {
    const job = allJobs.find(j => j.id === jobId);
    if (!job) return;
    doReschedule({ jobId, date, startTime: job.startTime, endTime: job.endTime, technicianId });
  }, [allJobs, doReschedule]);

  const handleAssign = useCallback((jobId: string, technicianId: string) => {
    doAssign({ jobId, technicianId });
  }, [doAssign]);

  return (
    <div className="flex h-full">
      <div className="flex-1 space-y-4 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Schedule</h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>Manage jobs, assignments, and routes.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUnassigned(!showUnassigned)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50 transition-colors relative"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              {showUnassigned ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              Unassigned
              {unassignedJobs.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unassignedJobs.length}
                </span>
              )}
            </button>
            <button
              onClick={() => alert('New job (demo)')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg"
              style={{ background: '#1e4d6b' }}
            >
              <Plus className="w-4 h-4" /> New Job
            </button>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('prev')} className="p-1.5 rounded-lg border hover:bg-gray-50" style={{ borderColor: CARD_BORDER }}>
              <ChevronLeft className="w-4 h-4" style={{ color: NAVY }} />
            </button>
            <button
              onClick={() => navigate('today')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border hover:bg-gray-50"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              Today
            </button>
            <button onClick={() => navigate('next')} className="p-1.5 rounded-lg border hover:bg-gray-50" style={{ borderColor: CARD_BORDER }}>
              <ChevronRight className="w-4 h-4" style={{ color: NAVY }} />
            </button>
            <h2 className="text-base font-bold ml-2" style={{ color: NAVY }}>{dateLabel}</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Technician filter */}
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
              <select
                value={techParam}
                onChange={e => setParam('tech', e.target.value)}
                className="px-2 py-1.5 text-sm rounded-lg border"
                style={{ borderColor: CARD_BORDER, color: NAVY }}
              >
                <option value="">All Technicians</option>
                {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: CARD_BORDER }}>
              {(['day', 'week', 'month'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setParam('view', v)}
                  className="px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
                  style={{
                    background: viewParam === v ? '#1e4d6b' : CARD_BG,
                    color: viewParam === v ? 'white' : TEXT_TERTIARY,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar content */}
        <ScheduleDndContext jobs={[...allJobs, ...unassignedJobs]} onReschedule={handleReschedule} onAssign={handleAssign}>
          <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
            {isLoading ? (
              <CalendarSkeleton view={viewParam} />
            ) : (
              <>
                {viewParam === 'day' && (
                  <DayView date={currentDate} jobs={allJobs} technicians={techs} onJobClick={setSelectedJob} />
                )}
                {viewParam === 'week' && (
                  <WeekView date={currentDate} jobs={allJobs} technicians={techs} onJobClick={setSelectedJob} />
                )}
                {viewParam === 'month' && (
                  <MonthView date={currentDate} jobs={allJobs} onJobClick={setSelectedJob} />
                )}
              </>
            )}
          </div>
        </ScheduleDndContext>
      </div>

      {/* Side panels */}
      {showUnassigned && (
        <UnassignedPanel
          jobs={unassignedJobs}
          onClose={() => setShowUnassigned(false)}
          onJobClick={setSelectedJob}
        />
      )}

      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onReschedule={() => { setRescheduleJob(selectedJob); setSelectedJob(null); }}
          onAssign={(techId) => handleAssign(selectedJob.id, techId)}
        />
      )}

      {rescheduleJob && (
        <RescheduleModal
          job={rescheduleJob}
          technicians={techs}
          onClose={() => setRescheduleJob(null)}
          onSave={(data) => { doReschedule(data); setRescheduleJob(null); }}
        />
      )}
    </div>
  );
}

function CalendarSkeleton({ view }: { view: string }) {
  return (
    <div className="p-4 animate-pulse">
      {view === 'month' ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      )}
    </div>
  );
}
