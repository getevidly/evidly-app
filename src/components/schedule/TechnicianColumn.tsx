/**
 * TechnicianColumn — Column header for Day view showing technician info + capacity.
 */
import { useDroppable } from '@dnd-kit/core';
import { User, Clock, CheckCircle2 } from 'lucide-react';
import type { ScheduledJob, Technician } from '../../hooks/api/useSchedule';
import { NAVY, CARD_BORDER, TEXT_TERTIARY } from '../dashboard/shared/constants';

interface TechnicianColumnProps {
  technician: Technician;
  jobs: ScheduledJob[];
}

const STATUS_DOT: Record<string, string> = {
  available: '#16A34A',
  busy: '#D97706',
  off: '#9CA3AF',
};

export function TechnicianColumn({ technician, jobs }: TechnicianColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `tech-${technician.id}` });

  const totalMinutes = jobs.reduce((sum, j) => sum + j.durationMinutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const capacityPct = Math.min(100, Math.round((totalMinutes / 480) * 100)); // 8hr = 480min

  return (
    <div
      ref={setNodeRef}
      className="px-3 py-2.5 text-center border-r last:border-r-0"
      style={{
        borderColor: CARD_BORDER,
        background: isOver ? '#EFF6FF' : 'transparent',
      }}
    >
      {/* Avatar + Name */}
      <div className="flex items-center justify-center gap-2 mb-1.5">
        {technician.avatarUrl ? (
          <img
            src={technician.avatarUrl}
            alt={technician.name}
            loading="lazy"
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: '#1E2D4D' }}
          >
            {technician.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="text-left min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: NAVY }}>{technician.name}</p>
          <div className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: STATUS_DOT[technician.status] || STATUS_DOT.available }}
            />
            <span className="text-[11px] capitalize" style={{ color: TEXT_TERTIARY }}>
              {technician.status}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-center gap-3 text-xs" style={{ color: TEXT_TERTIARY }}>
        <span className="flex items-center gap-0.5">
          <Clock className="w-3 h-3" />
          {hours}h{mins > 0 ? ` ${mins}m` : ''}
        </span>
        <span className="flex items-center gap-0.5">
          <CheckCircle2 className="w-3 h-3" />
          {completedCount}/{jobs.length}
        </span>
      </div>

      {/* Capacity bar */}
      <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: `${CARD_BORDER}80` }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${capacityPct}%`,
            background: capacityPct > 90 ? '#DC2626' : capacityPct > 70 ? '#D97706' : '#16A34A',
          }}
        />
      </div>
    </div>
  );
}
