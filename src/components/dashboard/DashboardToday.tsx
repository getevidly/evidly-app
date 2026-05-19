/**
 * DashboardToday — "Today" tab content for Dashboard.
 *
 * Shows a quick summary of today's scheduled tasks, upcoming deadlines,
 * and module statuses. Pulls from existing useDashboardData() hook.
 */

import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
} from 'lucide-react';
import { useDashboardData, type DeadlineItem } from '../../hooks/useDashboardData';
import { BODY_TEXT, FONT } from './shared/constants';

function DeadlineRow({ item, navigate }: { item: DeadlineItem; navigate: (path: string) => void }) {
  const color = item.severity === 'critical' ? '#dc2626' : item.severity === 'warning' ? '#d97706' : '#6b7280';
  return (
    <button
      type="button"
      onClick={() => navigate(item.route)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FAF7F0]"
      style={{ borderBottom: '1px solid #F0F0F0' }}
    >
      <CalendarDays size={16} style={{ color }} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: BODY_TEXT }}>{item.label}</p>
        <p className="text-xs" style={{ color: '#6b7280' }}>{item.location} · Due {item.dueDate}</p>
      </div>
      <span className="text-xs font-semibold shrink-0" style={{ color }}>
        {item.daysLeft}d
      </span>
    </button>
  );
}

export function DashboardToday() {
  const navigate = useNavigate();
  const { data } = useDashboardData();
  const deadlines = data.deadlines ?? [];
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5" style={{ ...FONT }}>
      {/* Date header — centered */}
      <div className="text-center mb-4">
        <span className="font-semibold" style={{ color: '#1E2D4D' }}>Today</span>
        <span className="mx-2 text-[#1E2D4D]/30">&middot;</span>
        <span className="text-[#1E2D4D]/50">{todayStr}</span>
      </div>

      {/* Upcoming Deadlines */}
      {deadlines.length > 0 && (
        <div className="bg-white rounded-xl" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Upcoming Deadlines</h3>
          </div>
          <div>
            {deadlines.map(item => (
              <DeadlineRow key={item.id} item={item} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
