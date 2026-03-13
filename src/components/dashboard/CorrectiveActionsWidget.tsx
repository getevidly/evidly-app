import { useMemo } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { DEMO_CORRECTIVE_ACTIONS, isOverdue } from '../../data/correctiveActionsDemoData';
import { NAVY, BODY_TEXT } from './shared/constants';

interface Props {
  navigate: (path: string) => void;
}

export function CorrectiveActionsWidget({ navigate }: Props) {
  const stats = useMemo(() => {
    const open = DEMO_CORRECTIVE_ACTIONS.filter(
      i => i.status === 'reported' || i.status === 'assigned' || i.status === 'in_progress',
    );
    const overdueCount = DEMO_CORRECTIVE_ACTIONS.filter(i => isOverdue(i)).length;
    const now = new Date();
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const dueThisWeek = DEMO_CORRECTIVE_ACTIONS.filter(i => {
      if (['resolved', 'verified'].includes(i.status)) return false;
      const due = new Date(i.dueDate);
      return due >= now && due <= weekFromNow;
    }).length;

    return { openCount: open.length, overdueCount, dueThisWeek };
  }, []);

  if (stats.openCount === 0 && stats.overdueCount === 0) return null;

  return (
    <div className="bg-white rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #F0F0F0' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🔧</span>
          <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>
            Corrective Actions
          </h3>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            color: stats.overdueCount > 0 ? '#991b1b' : NAVY,
            backgroundColor: stats.overdueCount > 0 ? '#fef2f2' : '#eef4f8',
          }}
        >
          {stats.openCount} open
        </span>
      </div>

      {/* Metrics row */}
      <div className="px-4 py-3 flex items-center gap-4 text-xs">
        {stats.overdueCount > 0 && (
          <span className="flex items-center gap-1 text-red-600 font-semibold">
            <AlertTriangle size={12} />
            {stats.overdueCount} Overdue
          </span>
        )}
        {stats.dueThisWeek > 0 && (
          <span className="text-amber-600 font-medium">
            {stats.dueThisWeek} Due This Week
          </span>
        )}
        {stats.overdueCount === 0 && stats.dueThisWeek === 0 && (
          <span className="text-gray-500">No urgent items</span>
        )}
      </div>

      {/* View all link */}
      <button
        type="button"
        onClick={() => navigate('/corrective-actions')}
        className="w-full px-4 py-3 text-center text-xs font-semibold transition-colors hover:bg-gray-50"
        style={{ color: NAVY, borderTop: '1px solid #F0F0F0' }}
      >
        View All <ChevronRight size={12} className="inline" />
      </button>
    </div>
  );
}
