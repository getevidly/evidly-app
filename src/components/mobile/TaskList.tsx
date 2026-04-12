import { useState } from 'react';
import { TaskCard } from './TaskCard';
import type { MobileTask } from '../../data/mobileDemoData';

interface TaskListProps {
  tasks: MobileTask[];
  onTaskPress?: (task: MobileTask) => void;
  isLoading?: boolean;
}

export function TaskList({ tasks, onTaskPress, isLoading }: TaskListProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="px-4 space-y-2 pb-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-4 min-h-[72px] bg-white border border-gray-100 animate-pulse"
          >
            <div className="w-11 h-11 flex-shrink-0 rounded-full bg-[#1E2D4D]/8" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[#1E2D4D]/8 rounded w-3/4" />
              <div className="h-3 bg-[#1E2D4D]/5 rounded w-1/2" />
              <div className="h-3 bg-[#1E2D4D]/5 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="px-4 pb-4">
        <div className="rounded-2xl bg-white border border-gray-100 px-6 py-10 text-center">
          <span className="text-3xl block mb-3">📋</span>
          <p className="text-[14px] font-semibold text-[#1E2D4D]">No tasks scheduled today</p>
          <p className="text-[12px] text-[#6B7280] mt-1 leading-snug">
            Set up checklists and schedules to see your daily tasks here.
          </p>
        </div>
      </div>
    );
  }

  const dueTasks = tasks.filter(t => t.status === 'due');
  const upcomingTasks = tasks.filter(t => t.status === 'upcoming');
  const dueNotCompleted = dueTasks.filter(t => !completed.has(t.id)).length;
  const upcomingNotCompleted = upcomingTasks.filter(t => !completed.has(t.id)).length;

  const handleToggle = (task: MobileTask) => {
    if (onTaskPress) {
      onTaskPress(task);
    } else {
      toggle(task.id);
    }
  };

  return (
    <div className="px-4 space-y-4 pb-4">
      {/* Due Now section */}
      {dueTasks.length > 0 && (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[1px] text-[#DC2626] mb-2">
            Due Now — {dueNotCompleted} task{dueNotCompleted !== 1 ? 's' : ''}
          </p>
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {dueTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                isCompleted={onTaskPress ? false : completed.has(task.id)}
                onToggle={() => handleToggle(task)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming section */}
      {upcomingTasks.length > 0 && (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[1px] text-[#6B7280] mb-2">
            Upcoming — {upcomingNotCompleted} task{upcomingNotCompleted !== 1 ? 's' : ''}
          </p>
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {upcomingTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                isCompleted={onTaskPress ? false : completed.has(task.id)}
                onToggle={() => handleToggle(task)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Re-export for main page to count
export function countDueTasks(tasks: MobileTask[]): number {
  return tasks.filter(t => t.status === 'due').length;
}
