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
import { NAVY, BODY_TEXT, FONT } from './shared/constants';

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
  const { data } = useDashboardData();
  const tasks = data.tasks ?? [];
  const deadlines = data.deadlines ?? [];

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const overdueCount = tasks.filter(t => t.status === 'overdue').length;
  const urgentDeadlines = deadlines.filter(d => d.severity === 'critical' || d.severity === 'warning');

  return (
    <div className="max-w-4xl mx-auto space-y-5" style={{ ...FONT }}>
      {/* Date header — centered */}
      <div className="text-center mb-4">
        <span className="font-semibold" style={{ color: '#1E2D4D' }}>Today</span>
        <span className="mx-2 text-gray-300">&middot;</span>
        <span className="text-gray-500">{todayStr}</span>
      </div>

      {/* Summary strip — centered */}
      <div className="grid grid-cols-3 gap-3">
        {/* Tasks Today */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('todays-tasks');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="rounded-xl border-l-4 border-l-[#A08C5A] bg-gradient-to-br from-white to-[#A08C5A]/5 p-4 text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 relative overflow-hidden text-left"
          style={{ border: '1px solid #e5e7eb', borderLeftWidth: '4px', borderLeftColor: '#A08C5A' }}
        >
          <div className="absolute top-3 right-3 opacity-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A08C5A" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1 text-center">Tasks Today</p>
          <p className="text-2xl font-bold text-center" style={{ color: NAVY }}>{tasks.length}</p>
          <p className="text-xs text-center">
            {doneCount === 0 && tasks.length === 0
              ? <span className="text-sm text-green-600 font-medium">All clear</span>
              : <span className="text-green-600">{doneCount} completed</span>
            }
          </p>
        </button>

        {/* Overdue */}
        <button
          type="button"
          onClick={() => navigate('/corrective-actions')}
          className={`rounded-xl border-l-4 p-4 text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 relative overflow-hidden text-left ${
            overdueCount > 0
              ? 'border-l-red-500 bg-gradient-to-br from-white to-red-50'
              : 'border-l-green-500 bg-gradient-to-br from-white to-green-50'
          }`}
          style={{
            border: '1px solid #e5e7eb',
            borderLeftWidth: '4px',
            borderLeftColor: overdueCount > 0 ? '#ef4444' : '#22c55e',
          }}
        >
          <div className="absolute top-3 right-3 opacity-10">
            {overdueCount === 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            )}
          </div>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1 text-center">Overdue</p>
          <p className="text-2xl font-bold text-center" style={{ color: overdueCount > 0 ? '#dc2626' : NAVY }}>{overdueCount}</p>
          <p className="text-xs text-center">
            {overdueCount > 0
              ? <span className="text-sm text-red-600 font-medium animate-pulse">Needs attention</span>
              : <span className="text-sm text-green-600 font-medium">All on track</span>
            }
          </p>
        </button>

        {/* Upcoming */}
        <button
          type="button"
          onClick={() => navigate('/calendar')}
          className="rounded-xl border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50 p-4 text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 relative overflow-hidden text-left"
          style={{ border: '1px solid #e5e7eb', borderLeftWidth: '4px', borderLeftColor: '#3b82f6' }}
        >
          <div className="absolute top-3 right-3 opacity-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1 text-center">Upcoming</p>
          <p className="text-2xl font-bold text-center" style={{ color: urgentDeadlines.length > 0 ? '#d97706' : NAVY }}>{urgentDeadlines.length}</p>
          <p className="text-xs text-gray-500 text-center">deadlines this week</p>
        </button>
      </div>

      {/* Today's Tasks */}
      <div id="todays-tasks" className="bg-white rounded-xl" style={{ border: '1px solid #e5e7eb' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Today's Tasks</h3>
          <span className="text-xs font-medium" style={{ color: NAVY }}>{doneCount}/{tasks.length} complete</span>
        </div>
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🎯</div>
            <p className="font-semibold text-lg" style={{ color: '#1E2D4D' }}>You're all caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No tasks scheduled for today. Enjoy the calm.</p>
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

      {/* Quick links — centered, clickable, with colored icons and hover animations */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: 'Checklists', icon: ClipboardCheck, route: '/checklists', iconBg: 'rgba(160,140,90,0.08)', iconColor: '#A08C5A' },
          { label: 'Calendar', icon: CalendarDays, route: '/calendar', iconBg: '#eff6ff', iconColor: '#3b82f6' },
          { label: 'Temp Logs', icon: Thermometer, route: '/temp-logs', iconBg: '#fef2f2', iconColor: '#ef4444' },
        ] as const).map(link => (
          <button
            key={link.route}
            type="button"
            onClick={() => navigate(link.route)}
            className="group bg-white rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 transition-all duration-200"
            style={{ border: '1px solid #e5e7eb' }}
          >
            <div className="p-2 rounded-lg" style={{ backgroundColor: link.iconBg, color: link.iconColor }}>
              <link.icon size={18} />
            </div>
            <span className="text-sm font-medium" style={{ color: BODY_TEXT }}>{link.label}</span>
            <ChevronRight
              size={14}
              className="ml-auto text-gray-300 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
