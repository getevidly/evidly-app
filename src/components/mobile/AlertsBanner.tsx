import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { MobileAlert } from '../../data/mobileDemoData';

const TYPE_STYLES: Record<MobileAlert['type'], { bg: string; icon: string }> = {
  critical: { bg: 'bg-red-50 border-red-200', icon: '🔴' },
  warning:  { bg: 'bg-amber-50 border-amber-200', icon: '🟡' },
  success:  { bg: 'bg-green-50 border-green-200', icon: '🟢' },
  info:     { bg: 'bg-blue-50 border-blue-200', icon: '🔵' },
};

interface AlertsBannerProps {
  alerts: MobileAlert[];
}

export function AlertsBanner({ alerts }: AlertsBannerProps) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  if (alerts.length === 0) return null;

  const visible = showAll ? alerts : alerts.slice(0, 3);

  return (
    <div className="px-4 space-y-2">
      {visible.map(alert => {
        const style = TYPE_STYLES[alert.type];
        return (
          <button
            key={alert.id}
            onClick={() => navigate(alert.path)}
            className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 min-h-[44px] text-left active:scale-[0.98] transition-transform cursor-pointer ${style.bg}`}
          >
            <span className="text-sm flex-shrink-0">{style.icon}</span>
            <span className="text-[12px] font-semibold text-[#1E2D4D] flex-1 leading-tight">
              {alert.text}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </button>
        );
      })}
      {alerts.length > 3 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[12px] font-semibold text-[#1E2D4D] underline underline-offset-2 py-1 cursor-pointer"
        >
          View all {alerts.length} alerts
        </button>
      )}
    </div>
  );
}
