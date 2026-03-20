/**
 * MyTasksToday.jsx — TASK-ASSIGN-01
 *
 * Compact task list (max 5 items) for dashboard embedding.
 * Shows user's tasks for today. Empty state in demo mode.
 */

import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useTaskInstances } from '../../../hooks/useTaskInstances';
import { useDemo } from '../../../contexts/DemoContext';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, TEXT_TERTIARY } from './constants';

const STATUS_ICON = {
  pending: { icon: Clock, color: '#6B7F96' },
  in_progress: { icon: Clock, color: '#1E2D4D' },
  completed: { icon: CheckCircle2, color: '#166534' },
  overdue: { icon: AlertTriangle, color: '#991B1B' },
  escalated: { icon: AlertTriangle, color: '#991B1B' },
};

export function MyTasksToday() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { myTasks, loading } = useTaskInstances();

  // In demo mode show empty state
  if (isDemoMode) {
    return (
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
      >
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4" style={{ color: '#1E2D4D' }} />
          <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>My Tasks Today</h3>
        </div>
        <p className="text-xs" style={{ color: TEXT_TERTIARY }}>
          No tasks assigned. Task Manager will generate tasks from active templates.
        </p>
      </div>
    );
  }

  const visibleTasks = myTasks
    .filter((t) => t.status !== 'completed' && t.status !== 'skipped')
    .slice(0, 5);

  const completedCount = myTasks.filter((t) => t.status === 'completed').length;

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4" style={{ color: '#1E2D4D' }} />
          <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>My Tasks Today</h3>
        </div>
        {myTasks.length > 0 && (
          <span className="text-xs font-medium" style={{ color: '#166534' }}>
            {completedCount}/{myTasks.length} done
          </span>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-[var(--bg-panel)]" />
          ))}
        </div>
      ) : visibleTasks.length === 0 ? (
        <p className="text-xs" style={{ color: TEXT_TERTIARY }}>
          {myTasks.length > 0 ? 'All tasks completed!' : 'No tasks assigned for today.'}
        </p>
      ) : (
        <div className="space-y-1.5">
          {visibleTasks.map((task) => {
            const si = STATUS_ICON[task.status] || STATUS_ICON.pending;
            const Icon = si.icon;
            const dueTime = new Date(task.due_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            return (
              <div
                key={task.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-panel)] cursor-pointer transition-colors"
                onClick={() => navigate('/tasks')}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: si.color }} />
                <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">{task.title}</span>
                <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{dueTime}</span>
              </div>
            );
          })}
        </div>
      )}

      {myTasks.length > 5 && (
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-1 mt-2 text-xs font-medium hover:underline"
          style={{ color: '#1E2D4D' }}
        >
          View All <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
