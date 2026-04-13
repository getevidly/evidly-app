/**
 * TodaysOperations — Today's tasks list extracted from OwnerOperatorDashboard
 *
 * Renders task items with status icons (done/in_progress/pending/overdue).
 * Empty state shows "No tasks assigned for today".
 */

import type { NavigateFunction } from 'react-router-dom';
import { CheckCircle2, Hammer, AlertCircle } from 'lucide-react';
import { GOLD, BODY_TEXT, NAVY } from './constants';
import type { TaskItem } from '../../../hooks/useDashboardStanding';

interface TodaysOperationsProps {
  tasks: TaskItem[];
  navigate: NavigateFunction;
  maxVisible?: number;
}

export function TodaysOperations({ tasks, navigate, maxVisible = 6 }: TodaysOperationsProps) {
  const done = tasks.filter(t => t.status === 'done').length;
  const visible = tasks.slice(0, maxVisible);
  const hasMore = tasks.length > maxVisible;

  return (
    <div className="bg-white rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Today's Tasks</h3>
        <span className="text-xs font-medium" style={{ color: NAVY }}>{done}/{tasks.length} complete</span>
      </div>
      <div>
        {tasks.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-[13px] font-medium" style={{ color: BODY_TEXT, margin: '0 0 4px' }}>
              No operations logged today yet
            </p>
            <p className="text-xs" style={{ color: '#6B7F96', margin: 0, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>
              Your team's temperature logs, checklist completions, and corrective actions will appear here throughout the day.
            </p>
          </div>
        )}
        {visible.map(task => {
          const isOverdue = task.status === 'overdue';
          const isDone = task.status === 'done';
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => navigate(task.route)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              style={{
                borderBottom: '1px solid #F0F0F0',
                backgroundColor: isOverdue ? '#fef2f2' : undefined,
              }}
            >
              {isDone && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
              {task.status === 'in_progress' && <Hammer size={16} className="shrink-0" style={{ color: GOLD }} />}
              {task.status === 'pending' && <span className="shrink-0 w-4 h-4 rounded-full border-2 border-gray-300" />}
              {isOverdue && <AlertCircle size={16} className="text-red-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {task.label}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-[11px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                  {task.time}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => navigate('/checklists')}
          className="w-full px-4 py-3 text-center text-xs font-semibold transition-colors hover:bg-gray-50"
          style={{ color: NAVY }}
        >
          View all {tasks.length} tasks &rarr;
        </button>
      )}
    </div>
  );
}
