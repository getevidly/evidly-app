import { useState } from 'react';
import { TaskCard } from './TaskCard';
import type { MobileTask } from '../../data/mobileDemoData';

interface TaskListProps {
  tasks: MobileTask[];
}

export function TaskList({ tasks }: TaskListProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const dueTasks = tasks.filter(t => t.status === 'due');
  const upcomingTasks = tasks.filter(t => t.status === 'upcoming');
  const dueNotCompleted = dueTasks.filter(t => !completed.has(t.id)).length;
  const upcomingNotCompleted = upcomingTasks.filter(t => !completed.has(t.id)).length;

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
                isCompleted={completed.has(task.id)}
                onToggle={() => toggle(task.id)}
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
                isCompleted={completed.has(task.id)}
                onToggle={() => toggle(task.id)}
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
