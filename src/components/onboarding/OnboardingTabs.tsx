import { Lock } from 'lucide-react';

export type OnboardingTabId = 'responsibilities' | 'work' | 'summary';

interface OnboardingTabsProps {
  activeTab: OnboardingTabId;
  onTabChange: (tab: OnboardingTabId) => void;
  workLocked: boolean;
}

const TABS: { id: OnboardingTabId; label: string; lockable: boolean }[] = [
  { id: 'responsibilities', label: 'Responsibilities', lockable: false },
  { id: 'work', label: 'Work', lockable: true },
  { id: 'summary', label: 'Summary', lockable: false },
];

export function OnboardingTabs({ activeTab, onTabChange, workLocked }: OnboardingTabsProps) {
  return (
    <div className="flex border-b border-[#E2DDD4]">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        const isLocked = tab.lockable && workLocked;
        const isDisabled = isLocked;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => !isDisabled && onTabChange(tab.id)}
            disabled={isDisabled}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all relative ${
              isActive
                ? 'text-[#1E2D4D]'
                : isDisabled
                ? 'text-[#8A93A6]/50 cursor-not-allowed'
                : 'text-[#8A93A6] hover:text-[#1E2D4D]/70'
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              {tab.label}
              {isLocked && <Lock size={10} className="text-[#8A93A6]/50" />}
            </span>
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E2D4D]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
