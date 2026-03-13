/**
 * ScheduleDndContext — Wraps schedule views in @dnd-kit provider.
 * Handles drag start, over, and end events for job rescheduling/reassignment.
 */
import { useState, useCallback } from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { JobBlock } from './JobBlock';
import type { ScheduledJob } from '../../hooks/api/useSchedule';

interface ScheduleDndContextProps {
  children: React.ReactNode;
  jobs: ScheduledJob[];
  onReschedule?: (jobId: string, date: string, technicianId?: string) => void;
  onAssign?: (jobId: string, technicianId: string) => void;
}

export function ScheduleDndContext({ children, jobs, onReschedule, onAssign }: ScheduleDndContextProps) {
  const [activeJob, setActiveJob] = useState<ScheduledJob | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const job = jobs.find(j => j.id === event.active.id);
    setActiveJob(job || null);
  }, [jobs]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveJob(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const overId = String(over.id);

    // If dropped on a date cell
    if (overId.startsWith('date-')) {
      const date = overId.replace('date-', '');
      onReschedule?.(String(active.id), date);
    }

    // If dropped on a technician column
    if (overId.startsWith('tech-')) {
      const techId = overId.replace('tech-', '');
      onAssign?.(String(active.id), techId);
    }
  }, [onReschedule, onAssign]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay>
        {activeJob ? (
          <div className="opacity-80 shadow-xl rotate-2">
            <JobBlock job={activeJob} compact />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
