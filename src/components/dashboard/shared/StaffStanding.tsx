/**
 * StaffStanding — Kitchen staff progress ring + task counts
 *
 * Shows a circular progress indicator with completed/total/overdue counts.
 */

import { GOLD, BODY_TEXT, KEYFRAMES } from './constants';

interface StaffStandingProps {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export function StaffStanding({ totalTasks, completedTasks, overdueTasks }: StaffStandingProps) {
  const pct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const remaining = totalTasks - completedTasks;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  const ringColor = overdueTasks > 0 ? '#dc2626' : pct >= 100 ? '#16a34a' : GOLD;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div className="bg-white rounded-lg px-4 py-5" style={{ border: '1px solid #e5e7eb' }}>
        <div className="flex items-center gap-5">
          {/* Progress ring */}
          <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
            <svg width={96} height={96} viewBox="0 0 96 96">
              <circle cx={48} cy={48} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
              <circle
                cx={48} cy={48} r={r}
                fill="none"
                stroke={ringColor}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform="rotate(-90 48 48)"
                style={
                  { '--circ': circ, '--off': offset } as React.CSSProperties
                }
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold" style={{ color: BODY_TEXT }}>{completedTasks}/{totalTasks}</span>
              <span className="text-[10px] text-gray-500">tasks</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Shift Progress</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-500">Completed</span>
                <span className="font-semibold text-green-600">{completedTasks}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-500">Remaining</span>
                <span className="font-semibold" style={{ color: BODY_TEXT }}>{remaining}</span>
              </div>
              {overdueTasks > 0 && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">Overdue</span>
                  <span className="font-semibold text-red-600">{overdueTasks}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
