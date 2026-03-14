/**
 * WeekView — 7-column week grid with job pills per day.
 */
import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format, addDays, startOfWeek, isToday, isSameDay } from 'date-fns';
import { JobBlock } from './JobBlock';
import type { ScheduledJob, Technician } from '../../hooks/api/useSchedule';
import { NAVY, CARD_BG, CARD_BORDER, TEXT_TERTIARY } from '@shared/components/dashboard/shared/constants';

const MAX_VISIBLE = 3;

interface WeekViewProps {
  date: Date;
  jobs: ScheduledJob[];
  technicians: Technician[];
  onJobClick?: (job: ScheduledJob) => void;
}

export function WeekView({ date, jobs, technicians, onJobClick }: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const jobsByDay = useMemo(() => {
    const map = new Map<string, ScheduledJob[]>();
    days.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []));
    jobs.forEach(j => {
      const dayKey = j.date;
      if (map.has(dayKey)) map.get(dayKey)!.push(j);
    });
    return map;
  }, [days, jobs]);

  if (jobs.length === 0) {
    return (
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: CARD_BORDER }}>
          {days.map(d => (
            <div key={d.toISOString()} className="px-2 py-3 text-center border-r last:border-r-0" style={{ borderColor: CARD_BORDER }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: TEXT_TERTIARY }}>{format(d, 'EEE')}</p>
              <p className={`text-lg font-bold ${isToday(d) ? 'text-white' : ''}`} style={{
                color: isToday(d) ? undefined : NAVY,
                background: isToday(d) ? '#1e4d6b' : 'transparent',
                borderRadius: isToday(d) ? '50%' : undefined,
                width: isToday(d) ? 32 : undefined,
                height: isToday(d) ? 32 : undefined,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {format(d, 'd')}
              </p>
            </div>
          ))}
        </div>
        <div className="text-center py-16">
          <p className="text-sm font-medium" style={{ color: NAVY }}>No jobs this week</p>
          <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>Create jobs or drag unassigned jobs to schedule them.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: CARD_BORDER }}>
        {days.map(d => (
          <div key={d.toISOString()} className="px-2 py-3 text-center border-r last:border-r-0" style={{ borderColor: CARD_BORDER }}>
            <p className="text-[10px] font-semibold uppercase" style={{ color: TEXT_TERTIARY }}>{format(d, 'EEE')}</p>
            <p className={`text-lg font-bold mt-0.5`} style={{
              color: isToday(d) ? 'white' : NAVY,
              background: isToday(d) ? '#1e4d6b' : 'transparent',
              borderRadius: '50%',
              width: 32, height: 32,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {format(d, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7" style={{ minHeight: 400 }}>
        {days.map(d => {
          const dayKey = format(d, 'yyyy-MM-dd');
          const dayJobs = jobsByDay.get(dayKey) || [];
          const isExpanded = expandedDay === dayKey;
          const visibleJobs = isExpanded ? dayJobs : dayJobs.slice(0, MAX_VISIBLE);
          const overflow = dayJobs.length - MAX_VISIBLE;

          return (
            <WeekDayCell
              key={dayKey}
              dayKey={dayKey}
              jobs={visibleJobs}
              overflow={overflow}
              isToday={isToday(d)}
              isWeekend={d.getDay() === 0 || d.getDay() === 6}
              onJobClick={onJobClick}
              onShowMore={() => setExpandedDay(isExpanded ? null : dayKey)}
              isExpanded={isExpanded}
            />
          );
        })}
      </div>
    </div>
  );
}

function WeekDayCell({ dayKey, jobs, overflow, isToday: today, isWeekend, onJobClick, onShowMore, isExpanded }: {
  dayKey: string; jobs: ScheduledJob[]; overflow: number; isToday: boolean; isWeekend: boolean;
  onJobClick?: (j: ScheduledJob) => void; onShowMore: () => void; isExpanded: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `date-${dayKey}` });

  return (
    <div
      ref={setNodeRef}
      className="border-r border-b last:border-r-0 p-1.5 space-y-1"
      style={{
        borderColor: CARD_BORDER,
        background: isOver ? '#EFF6FF' : isWeekend ? '#F9FAFB' : today ? '#F0F7FF' : 'transparent',
        minHeight: 120,
      }}
    >
      {jobs.map(job => (
        <JobBlock key={job.id} job={job} compact onClick={onJobClick} />
      ))}
      {overflow > 0 && !isExpanded && (
        <button onClick={onShowMore} className="w-full text-center text-[10px] font-semibold py-0.5 rounded hover:bg-gray-100" style={{ color: '#1e4d6b' }}>
          +{overflow} more
        </button>
      )}
      {isExpanded && overflow > 0 && (
        <button onClick={onShowMore} className="w-full text-center text-[10px] font-semibold py-0.5 rounded hover:bg-gray-100" style={{ color: TEXT_TERTIARY }}>
          Show less
        </button>
      )}
    </div>
  );
}
