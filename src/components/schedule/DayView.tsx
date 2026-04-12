/**
 * DayView — Vertical timeline (6am-10pm) with technician columns.
 */
import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format, isToday } from 'date-fns';
import { JobBlock } from './JobBlock';
import { TechnicianColumn } from './TechnicianColumn';
import type { ScheduledJob, Technician } from '../../hooks/api/useSchedule';
import { NAVY, CARD_BORDER, TEXT_TERTIARY } from '../dashboard/shared/constants';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm
const HOUR_HEIGHT = 60; // px per hour

interface DayViewProps {
  date: Date;
  jobs: ScheduledJob[];
  technicians: Technician[];
  onJobClick?: (job: ScheduledJob) => void;
}

export function DayView({ date, jobs, technicians, onJobClick }: DayViewProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayJobs = jobs.filter(j => j.date === dateStr);
  const showToday = isToday(date);

  // Group jobs by technician
  const jobsByTech = useMemo(() => {
    const map = new Map<string, ScheduledJob[]>();
    if (technicians.length === 0) {
      map.set('all', dayJobs);
    } else {
      technicians.forEach(t => map.set(t.id, []));
      map.set('unassigned', []);
      dayJobs.forEach(j => {
        const key = j.technicianId || 'unassigned';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(j);
      });
    }
    return map;
  }, [dayJobs, technicians]);

  // Current time position
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - 360) / 60) * HOUR_HEIGHT; // 360 = 6*60

  if (dayJobs.length === 0 && technicians.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm font-medium" style={{ color: NAVY }}>No jobs on this day</p>
        <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>Drag jobs here or create a new job.</p>
      </div>
    );
  }

  const columns = technicians.length > 0
    ? technicians.map(t => ({ id: t.id, label: t.name, jobs: jobsByTech.get(t.id) || [] }))
    : [{ id: 'all', label: 'All Jobs', jobs: dayJobs }];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Technician headers */}
        {technicians.length > 0 && (
          <div className="flex border-b" style={{ borderColor: CARD_BORDER }}>
            <div className="w-16 flex-shrink-0" />
            {technicians.map(t => (
              <div key={t.id} className="flex-1 min-w-[160px]">
                <TechnicianColumn technician={t} jobs={jobsByTech.get(t.id) || []} />
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        <div className="flex relative">
          {/* Hour labels */}
          <div className="w-16 flex-shrink-0">
            {HOURS.map(h => (
              <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-2.5 right-2 text-xs font-medium" style={{ color: TEXT_TERTIARY }}>
                  {format(new Date(2000, 0, 1, h), 'h a')}
                </span>
              </div>
            ))}
          </div>

          {/* Columns */}
          {columns.map(col => (
            <DayColumn
              key={col.id}
              columnId={col.id}
              jobs={col.jobs}
              dateStr={dateStr}
              onJobClick={onJobClick}
            />
          ))}

          {/* Current time line */}
          {showToday && nowTop > 0 && nowTop < HOURS.length * HOUR_HEIGHT && (
            <div
              className="absolute left-16 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ top: nowTop }}
            >
              <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayColumn({ columnId, jobs, dateStr, onJobClick }: {
  columnId: string; jobs: ScheduledJob[]; dateStr: string; onJobClick?: (job: ScheduledJob) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `tech-${columnId}` });

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-[160px] relative"
      style={{
        borderLeft: `1px solid ${CARD_BORDER}`,
        background: isOver ? '#EFF6FF' : 'transparent',
      }}
    >
      {/* Hour grid lines */}
      {HOURS.map(h => (
        <div key={h} className="border-b" style={{ height: HOUR_HEIGHT, borderColor: `${CARD_BORDER}60` }} />
      ))}

      {/* Job blocks positioned by time */}
      {jobs.map(job => {
        const [sh, sm] = job.startTime.split(':').map(Number);
        const [eh, em] = job.endTime.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const top = ((startMin - 360) / 60) * HOUR_HEIGHT;
        const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 30);

        return (
          <div key={job.id} className="absolute left-1 right-1 z-5" style={{ top, height }}>
            <JobBlock job={job} onClick={onJobClick} />
          </div>
        );
      })}
    </div>
  );
}
