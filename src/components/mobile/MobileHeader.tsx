import { Bell } from 'lucide-react';
import { getGreeting } from '../../data/mobileDemoData';

interface MobileHeaderProps {
  roleLabel: string;
  firstName: string;
  tasksDueCount: number;
  totalTasks: number;
}

export function MobileHeader({ roleLabel, firstName, tasksDueCount, totalTasks }: MobileHeaderProps) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div
      className="px-4 pt-[max(env(safe-area-inset-top),16px)] pb-4"
      style={{ background: '#1E2D4D' }}
    >
      {/* Top row: brand + role + bell */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[1.2px]" style={{ color: '#A08C5A' }}>
            EVIDLY
          </span>
          <span className="text-xs text-white/50">—</span>
          <span className="text-xs text-white/70">{roleLabel}</span>
        </div>
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
          onClick={() => {/* notification bell - demo */}}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Greeting */}
      <h1 className="text-[22px] font-bold text-white mb-3">
        {getGreeting(firstName)}
      </h1>

      {/* Stats bar */}
      <div className="rounded-xl bg-white/10 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm text-white/80">{dateStr}</p>
          <p className="text-[12px] text-white/50 mt-0.5">
            {tasksDueCount} due now &middot; {totalTasks} total
          </p>
        </div>
        <div className="text-right">
          <span
            className="text-[28px] font-bold leading-none"
            style={{ color: tasksDueCount > 3 ? '#F59E0B' : '#A08C5A' }}
          >
            {tasksDueCount}
          </span>
          <p
            className="text-xs font-bold uppercase tracking-wide mt-0.5"
            style={{ color: tasksDueCount > 3 ? '#F59E0B' : '#A08C5A' }}
          >
            DUE
          </p>
        </div>
      </div>
    </div>
  );
}
