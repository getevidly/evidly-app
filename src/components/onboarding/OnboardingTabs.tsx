export type OnboardingTabId = 'responsibilities' | 'work' | 'summary';

interface OnboardingTabsProps {
  activeTab: OnboardingTabId;
  onTabChange: (tab: OnboardingTabId) => void;
}

export function OnboardingTabs({ activeTab, onTabChange }: OnboardingTabsProps) {
  return (
    <div className="flex border-b border-[#E2DDD4]">
      <TabButton label="Responsibilities" isActive={activeTab === 'responsibilities'} onClick={() => onTabChange('responsibilities')} />
      <TabButton label="Work" isActive={activeTab === 'work'} onClick={() => onTabChange('work')} />
      <TabButton label="Summary" isActive={activeTab === 'summary'} onClick={() => onTabChange('summary')} />
    </div>
  );
}

function TabButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all relative ${
        isActive ? 'text-[#1E2D4D]' : 'text-[#8A93A6] hover:text-[#1E2D4D]/70'
      }`}
    >
      {label}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E2D4D]" />
      )}
    </button>
  );
}
