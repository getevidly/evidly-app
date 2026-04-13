/**
 * MonthView — Traditional calendar grid with job indicators.
 */
import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameMonth, isToday } from 'date-fns';
import { JobBlock } from './JobBlock';
import type { ScheduledJob } from '../../hooks/api/useSchedule';
import { NAVY, CARD_BORDER, TEXT_TERTIARY } from '../dashboard/shared/constants';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_VISIBLE = 3;

interface MonthViewProps {
  date: Date;
  jobs: ScheduledJob[];
  onJobClick?: (job: ScheduledJob) => void;
}

export function MonthView({ date, jobs, onJobClick }: MonthViewProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const days: Date[] = [];
    let current = calStart;
    while (days.length < 42) {
      days.push(current);
      current = addDays(current, 1);
      if (days.length >= 35 && current > monthEnd && current.getDay() === 1) break;
    }
    return days;
  }, [date]);

  const jobsByDay = useMemo(() => {
    const map = new Map<string, ScheduledJob[]>();
    calendarDays.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []));
    jobs.forEach(j => {
      if (map.has(j.date)) map.get(j.date)!.push(j);
    });
    return map;
  }, [calendarDays, jobs]);

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: CARD_BORDER }}>
        {WEEKDAYS.map(d => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase border-r last:border-r-0" style={{ color: TEXT_TERTIARY, borderColor: CARD_BORDER }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map(d => {
          const dayKey = format(d, 'yyyy-MM-dd');
          const dayJobs = jobsByDay.get(dayKey) || [];
          const isCurrentMonth = isSameMonth(d, date);
          const today = isToday(d);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const isExpanded = expandedDay === dayKey;
          const visibleJobs = isExpanded ? dayJobs : dayJobs.slice(0, MAX_VISIBLE);
          const overflow = dayJobs.length - MAX_VISIBLE;

          return (
            <MonthDayCell
              key={dayKey}
              dayKey={dayKey}
              dayNumber={format(d, 'd')}
              jobs={visibleJobs}
              overflow={overflow}
              isCurrentMonth={isCurrentMonth}
              isToday={today}
              isWeekend={isWeekend}
              isExpanded={isExpanded}
              onJobClick={onJobClick}
              onToggleExpand={() => setExpandedDay(isExpanded ? null : dayKey)}
            />
          );
        })}
      </div>
    </div>
  );
}

function MonthDayCell({ dayKey, dayNumber, jobs, overflow, isCurrentMonth, isToday: today, isWeekend, isExpanded, onJobClick, onToggleExpand }: {
  dayKey: string; dayNumber: string; jobs: ScheduledJob[]; overflow: number;
  isCurrentMonth: boolean; isToday: boolean; isWeekend: boolean; isExpanded: boolean;
  onJobClick?: (j: ScheduledJob) => void; onToggleExpand: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `date-${dayKey}` });

  return (
    <div
      ref={setNodeRef}
      className="border-r border-b last:border-r-0 p-1.5"
      style={{
        borderColor: CARD_BORDER,
        minHeight: 100,
        background: isOver ? '#EFF6FF' : !isCurrentMonth ? '#F9FAFB' : isWeekend ? '#FAFBFC' : today ? '#F0F7FF' : 'transparent',
        opacity: isCurrentMonth ? 1 : 0.5,
      }}
    >
      {/* Day number */}
      <div className="mb-1">
        <span className={`text-xs font-bold inline-flex items-center justify-center`} style={{
          color: today ? 'white' : isCurrentMonth ? NAVY : TEXT_TERTIARY,
          background: today ? '#1E2D4D' : 'transparent',
          borderRadius: '50%',
          width: today ? 22 : undefined,
          height: today ? 22 : undefined,
        }}>
          {dayNumber}
        </span>
      </div>

      {/* Job indicators */}
      <div className="space-y-0.5">
        {jobs.map(job => (
          <JobBlock key={job.id} job={job} compact onClick={onJobClick} />
        ))}
        {overflow > 0 && !isExpanded && (
          <button onClick={onToggleExpand} className="w-full text-xs font-semibold py-0.5 rounded hover:bg-[#1E2D4D]/5" style={{ color: '#1E2D4D' }}>
            +{overflow} more
          </button>
        )}
      </div>
    </div>
  );
}
