/**
 * DashboardToday — "Today" tab content for Dashboard.
 *
 * Shows a quick summary of today's scheduled tasks, upcoming deadlines,
 * and module statuses. Pulls from existing useDashboardData() hook.
 */

import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Clock, AlertTriangle, ChevronRight,
  CalendarDays, ClipboardCheck, Thermometer,
} from 'lucide-react';
import { useDashboardData, type TaskItem, type DeadlineItem } from '../../hooks/useDashboardData';
import { NAVY, GOLD, BODY_TEXT, FONT } from './shared/constants';

const STATUS_COLORS: Record<TaskItem['status'], { dot: string; text: string }> = {
  done: { dot: '#16a34a', text: '#16a34a' },
  in_progress: { dot: '#2563eb', text: '#2563eb' },
  pending: { dot: '#6b7280', text: '#6b7280' },
  overdue: { dot: '#dc2626', text: '#dc2626' },
};

const STATUS_LABELS: Record<TaskItem['status'], string> = {
  done: 'Done',
  in_progress: 'In Progress',
  pending: 'Pending',
  overdue: 'Overdue',
};

function TaskRow({ task, navigate }: { task: TaskItem; navigate: (path: string) => void }) {
  const c = STATUS_COLORS[task.status];
  return (
    <button
      type="button"
      onClick={() => navigate(task.route)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
      style={{ borderBottom: '1px solid #F0F0F0' }}
    >
      {task.status === 'done' ? (
        <CheckCircle2 size={16} style={{ color: c.dot }} className="shrink-0" />
      ) : task.status === 'overdue' ? (
        <AlertTriangle size={16} style={{ color: c.dot }} className="shrink-0" />
      ) : (
        <Clock size={16} style={{ color: c.dot }} className="shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: BODY_TEXT }}>{task.label}</p>
        <p className="text-xs" style={{ color: '#6b7280' }}>{task.time}{task.reading ? ` · ${task.reading}` : ''}</p>
      </div>
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ color: c.text, backgroundColor: `${c.dot}15` }}
      >
        {STATUS_LABELS[task.status]}
      </span>
    </button>
  );
}

function DeadlineRow({ item, navigate }: { item: DeadlineItem; navigate: (path: string) => void }) {
  const color = item.severity === 'critical' ? '#dc2626' : item.severity === 'warning' ? '#d97706' : '#6b7280';
  return (
    <button
      type="button"
      onClick={() => navigate(item.route)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
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
  const { tasks, deadlines } = useDashboardData();

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const overdueCount = tasks.filter(t => t.status === 'overdue').length;
  const urgentDeadlines = deadlines.filter(d => d.severity === 'critical' || d.severity === 'warning');

  return (
    <div className="space-y-5" style={{ ...FONT }}>
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #e5e7eb' }}>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Tasks Today</p>
          <p className="text-2xl font-bold" style={{ color: NAVY }}>{tasks.length}</p>
          <p className="text-xs" style={{ color: '#16a34a' }}>{doneCount} completed</p>
        </div>
        <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #e5e7eb' }}>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Overdue</p>
          <p className="text-2xl font-bold" style={{ color: overdueCount > 0 ? '#dc2626' : NAVY }}>{overdueCount}</p>
          <p className="text-xs" style={{ color: overdueCount > 0 ? '#dc2626' : '#6b7280' }}>
            {overdueCount > 0 ? 'Needs attention' : 'All on track'}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #e5e7eb' }}>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Upcoming</p>
          <p className="text-2xl font-bold" style={{ color: urgentDeadlines.length > 0 ? '#d97706' : NAVY }}>{urgentDeadlines.length}</p>
          <p className="text-xs" style={{ color: '#6b7280' }}>deadlines this week</p>
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="bg-white rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Today's Tasks</h3>
          <span className="text-xs font-medium" style={{ color: NAVY }}>{doneCount}/{tasks.length} complete</span>
        </div>
        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500">No tasks scheduled for today.</p>
          </div>
        ) : (
          <div>
            {tasks.map(task => (
              <TaskRow key={task.id} task={task} navigate={navigate} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Deadlines */}
      {deadlines.length > 0 && (
        <div className="bg-white rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
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

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Checklists', icon: ClipboardCheck, route: '/checklists' },
          { label: 'Calendar', icon: CalendarDays, route: '/calendar' },
          { label: 'Temp Logs', icon: Thermometer, route: '/temp-logs' },
        ].map(link => (
          <button
            key={link.route}
            type="button"
            onClick={() => navigate(link.route)}
            className="bg-white rounded-lg p-4 flex items-center gap-3 transition-colors hover:bg-gray-50"
            style={{ border: '1px solid #e5e7eb' }}
          >
            <link.icon size={18} style={{ color: NAVY }} />
            <span className="text-sm font-medium" style={{ color: BODY_TEXT }}>{link.label}</span>
            <ChevronRight size={14} style={{ color: '#9ca3af' }} className="ml-auto" />
          </button>
        ))}
      </div>
    </div>
  );
}
