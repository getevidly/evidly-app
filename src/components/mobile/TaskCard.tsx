import { Check } from 'lucide-react';
import type { MobileTask } from '../../data/mobileDemoData';

interface TaskCardProps {
  task: MobileTask;
  isCompleted: boolean;
  onToggle: () => void;
}

export function TaskCard({ task, isCompleted, onToggle }: TaskCardProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 rounded-2xl px-4 py-4 min-h-[72px] text-left active:scale-[0.98] transition-all cursor-pointer border ${
        isCompleted
          ? 'bg-green-50 border-green-200 opacity-70'
          : 'bg-white border-gray-100'
      }`}
      style={isCompleted ? undefined : { boxShadow: '0 1px 3px rgba(30,45,77,0.06), 0 1px 2px rgba(30,45,77,0.04)' }}
    >
      {/* Check circle */}
      <div
        className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full transition-colors ${
          isCompleted
            ? 'bg-[#16A34A] text-white'
            : 'border-2 border-gray-300 text-gray-400'
        }`}
      >
        {isCompleted ? (
          <Check className="h-5 w-5" strokeWidth={3} />
        ) : (
          <span className="text-lg">{task.icon}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-semibold text-[#1E2D4D] leading-tight ${isCompleted ? 'line-through' : ''}`}>
          {task.title}
        </p>
        <p className="text-[12px] text-[#6B7280] mt-0.5 leading-tight truncate">
          {task.subtitle}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-[#6B7280]">{task.time}</span>
          {task.status === 'due' && !isCompleted && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#DC2626] text-white">
              Due Now
            </span>
          )}
          {task.status === 'upcoming' && !isCompleted && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#16A34A]/10 text-[#16A34A]">
              Upcoming
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <div className="flex-shrink-0 text-gray-300">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
