/**
 * JobBlock — Reusable job display for all schedule views.
 * Draggable via @dnd-kit, click to open detail panel.
 */
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, MapPin, User, Wrench } from 'lucide-react';
import type { ScheduledJob, JobStatus } from '../../hooks/api/useSchedule';
import { NAVY, TEXT_TERTIARY } from '../dashboard/shared/constants';

const STATUS_COLORS: Record<JobStatus, { bg: string; border: string; dot: string }> = {
  scheduled: { bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' },
  confirmed: { bg: '#EEF2FF', border: '#C7D2FE', dot: '#6366F1' },
  en_route: { bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' },
  in_progress: { bg: '#FFF7ED', border: '#FED7AA', dot: '#EA580C' },
  completed: { bg: '#F0FFF4', border: '#BBF7D0', dot: '#16A34A' },
  cancelled: { bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626' },
};

interface JobBlockProps {
  job: ScheduledJob;
  compact?: boolean;
  onClick?: (job: ScheduledJob) => void;
}

export function JobBlock({ job, compact, onClick }: JobBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  } : undefined;

  const colors = STATUS_COLORS[job.status] || STATUS_COLORS.scheduled;
  const isCancelled = job.status === 'cancelled';

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: colors.bg, borderColor: colors.border }}
      className={`rounded-xl border px-2.5 py-2 cursor-pointer transition-shadow ${compact ? 'text-xs' : 'text-xs'}`}
      onClick={() => onClick?.(job)}
      {...attributes}
      {...listeners}
    >
      {/* Status dot + time */}
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.dot }} />
        <span className="font-semibold" style={{ color: NAVY, textDecoration: isCancelled ? 'line-through' : 'none' }}>
          {job.startTime}{!compact && ` – ${job.endTime}`}
        </span>
      </div>

      {/* Customer */}
      <p className="font-medium truncate" style={{ color: NAVY, textDecoration: isCancelled ? 'line-through' : 'none' }}>
        {job.customerName}
      </p>

      {!compact && (
        <>
          {/* Location */}
          <div className="flex items-center gap-1 mt-0.5" style={{ color: TEXT_TERTIARY }}>
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{job.locationName}</span>
          </div>

          {/* Service types */}
          {job.serviceTypes.length > 0 && (
            <div className="flex items-center gap-1 mt-1" style={{ color: TEXT_TERTIARY }}>
              <Wrench className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{job.serviceTypes.join(', ')}</span>
            </div>
          )}

          {/* Technician */}
          {job.technicianName && (
            <div className="flex items-center gap-1 mt-0.5" style={{ color: TEXT_TERTIARY }}>
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{job.technicianName}</span>
            </div>
          )}
        </>
      )}

      {/* Priority indicator */}
      {job.priority === 'urgent' && (
        <div className="mt-1">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">URGENT</span>
        </div>
      )}
      {job.priority === 'high' && (
        <div className="mt-1">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">HIGH</span>
        </div>
      )}
    </div>
  );
}
