import { useNavigate } from 'react-router-dom';
import type { MobileQuickAction } from '../../data/mobileDemoData';

interface MobileQuickActionsProps {
  actions: MobileQuickAction[];
}

export function MobileQuickActions({ actions }: MobileQuickActionsProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-4 gap-2 px-4">
      {actions.map(action => (
        <button
          key={action.id}
          onClick={() => navigate(action.path)}
          className="flex flex-col items-center justify-center bg-white rounded-xl py-4 min-h-[72px] md:min-h-[80px] active:scale-95 transition-transform cursor-pointer"
          style={{ boxShadow: '0 1px 3px rgba(30,45,77,0.08), 0 1px 2px rgba(30,45,77,0.06)' }}
        >
          <span className="text-[22px] mb-1">{action.icon}</span>
          <span className="text-xs font-bold text-[#1E2D4D]">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
