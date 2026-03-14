/**
 * UnassignedPanel — Slide-in side panel listing jobs not yet assigned to a technician.
 * Jobs are draggable onto the calendar or technician columns.
 */
import { useState, useMemo } from 'react';
import { X, Search, ArrowUpDown, GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ScheduledJob } from '../../hooks/api/useSchedule';
import { NAVY, CARD_BG, CARD_BORDER, TEXT_TERTIARY, MUTED } from '@shared/components/dashboard/shared/constants';

type SortKey = 'date' | 'priority' | 'customer';

interface UnassignedPanelProps {
  jobs: ScheduledJob[];
  onClose: () => void;
  onJobClick?: (job: ScheduledJob) => void;
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export function UnassignedPanel({ jobs, onClose, onJobClick }: UnassignedPanelProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');

  const filtered = useMemo(() => {
    let list = jobs;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        j.customerName.toLowerCase().includes(q) ||
        j.locationName.toLowerCase().includes(q) ||
        j.serviceTypes.some(s => s.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'date') return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
      if (sortBy === 'priority') return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      return a.customerName.localeCompare(b.customerName);
    });
  }, [jobs, search, sortBy]);

  const nextSort = () => {
    const order: SortKey[] = ['date', 'priority', 'customer'];
    const idx = order.indexOf(sortBy);
    setSortBy(order[(idx + 1) % order.length]);
  };

  return (
    <div
      className="w-72 flex-shrink-0 border-l flex flex-col ml-4"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: CARD_BORDER }}>
        <div>
          <h3 className="text-sm font-bold" style={{ color: NAVY }}>Unassigned Jobs</h3>
          <p className="text-[10px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} pending assignment
          </p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
        </button>
      </div>

      {/* Search + Sort */}
      <div className="px-3 py-2 space-y-2 border-b" style={{ borderColor: CARD_BORDER }}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border"
            style={{ borderColor: CARD_BORDER, color: NAVY }}
          />
        </div>
        <button
          onClick={nextSort}
          className="flex items-center gap-1.5 text-[10px] font-semibold hover:bg-gray-50 px-2 py-1 rounded"
          style={{ color: TEXT_TERTIARY }}
        >
          <ArrowUpDown className="w-3 h-3" />
          Sort: {sortBy === 'date' ? 'Date' : sortBy === 'priority' ? 'Priority' : 'Customer'}
        </button>
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs font-medium" style={{ color: NAVY }}>
              {jobs.length === 0 ? 'No unassigned jobs' : 'No matches'}
            </p>
            <p className="text-[10px] mt-1" style={{ color: MUTED }}>
              {jobs.length === 0
                ? 'All jobs have been assigned to technicians.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          filtered.map(job => (
            <DraggableUnassignedJob key={job.id} job={job} onClick={onJobClick} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableUnassignedJob({ job, onClick }: { job: ScheduledJob; onClick?: (j: ScheduledJob) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  } : undefined;

  const priorityColor = job.priority === 'urgent' ? '#DC2626'
    : job.priority === 'high' ? '#EA580C'
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderColor: CARD_BORDER }}
      className="rounded-lg border p-2.5 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow bg-white"
      onClick={() => onClick?.(job)}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: CARD_BORDER }} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate" style={{ color: NAVY }}>{job.customerName}</p>
          <p className="text-[10px] truncate" style={{ color: TEXT_TERTIARY }}>{job.locationName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-medium" style={{ color: TEXT_TERTIARY }}>
              {job.date} · {job.startTime}–{job.endTime}
            </span>
          </div>
          {job.serviceTypes.length > 0 && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: TEXT_TERTIARY }}>
              {job.serviceTypes.join(', ')}
            </p>
          )}
          {priorityColor && (
            <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: `${priorityColor}15`, color: priorityColor }}>
              {job.priority.toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
