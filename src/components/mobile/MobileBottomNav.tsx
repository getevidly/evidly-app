import { useNavigate, useLocation } from 'react-router-dom';
import type { MobileNavTab } from '../../data/mobileDemoData';

interface MobileBottomNavProps {
  tabs: MobileNavTab[];
  onMorePress?: () => void;
}

export function MobileBottomNav({ tabs, onMorePress }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handlePress = (tab: MobileNavTab) => {
    if (tab.path === '#more') {
      onMorePress?.();
      return;
    }
    navigate(tab.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#1E2D4D]/10 z-50 lg:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
    >
      <div className="grid grid-cols-4 h-14">
        {tabs.map(tab => {
          const isActive = tab.path !== '#more' && location.pathname === tab.path;
          return (
            <button
              key={tab.id}
              onClick={() => handlePress(tab)}
              className="flex flex-col items-center justify-center gap-0.5 min-h-[56px] cursor-pointer transition-opacity"
            >
              <span
                className={`text-lg leading-none ${isActive ? 'opacity-100' : 'opacity-40'}`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-xs font-semibold ${
                  isActive ? 'text-[#1E2D4D]' : 'text-[#6B7280]'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <div className="w-4 h-0.5 rounded-full mt-0.5" style={{ background: '#A08C5A' }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
