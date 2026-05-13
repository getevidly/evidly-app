import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { Info } from 'lucide-react';

export type OnboardingTabId = 'responsibilities' | 'work' | 'summary';

interface OnboardingTabsProps {
  activeTab: OnboardingTabId;
  onTabChange: (tab: OnboardingTabId) => void;
  responsibilitiesLocked: boolean;
  viewMode?: 'owner' | 'invitee';
}

export function OnboardingTabs({ activeTab, onTabChange, responsibilitiesLocked, viewMode = 'owner' }: OnboardingTabsProps) {
  const isInvitee = viewMode === 'invitee';
  const workTooltip = isInvitee
    ? 'Complete the items assigned to you'
    : responsibilitiesLocked
      ? 'Execute the items you\u2019ve committed to'
      : 'Preview what EvidLY will help you handle once responsibilities are locked';

  return (
    <div className="flex border-b border-[#E2DDD4]">
      {!isInvitee && (
        <TabButton
          label="Responsibilities"
          isActive={activeTab === 'responsibilities'}
          onClick={() => onTabChange('responsibilities')}
          tooltip="Decide who owns each item before EvidLY starts working"
        />
      )}
      <TabButton
        label="Work"
        isActive={activeTab === 'work'}
        onClick={() => onTabChange('work')}
        tooltip={workTooltip}
      />
      {!isInvitee && (
        <TabButton
          label="Summary"
          isActive={activeTab === 'summary'}
          onClick={() => onTabChange('summary')}
          tooltip="See every decision and its current state in one place"
        />
      )}
    </div>
  );
}

function TabButton({ label, isActive, onClick, tooltip }: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipId = useId();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!showTooltip) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (iconRef.current && !iconRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showTooltip]);

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => setShowTooltip(true), 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all relative ${
        isActive ? 'text-[#1E2D4D]' : 'text-[#8A93A6] hover:text-[#1E2D4D]/70'
      }`}
    >
      <span className="flex items-center justify-center gap-1">
        {label}
        <span
          ref={iconRef}
          className="relative inline-flex"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onClick={(e) => { e.stopPropagation(); setShowTooltip(v => !v); }}
        >
          <Info
            size={12}
            className="text-[#8A93A6] hover:text-[#1E2D4D] transition-colors"
          />
          {showTooltip && (
            <span
              id={tooltipId}
              role="tooltip"
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none whitespace-normal text-left"
              style={{
                maxWidth: 240,
                width: 'max-content',
                backgroundColor: '#1E2D4D',
                color: '#FAF7F0',
                fontSize: 11,
                padding: 8,
                borderRadius: 4,
                zIndex: 9999,
                lineHeight: '1.4',
              }}
            >
              {tooltip}
              <span
                className="absolute top-full left-1/2 -translate-x-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid #1E2D4D',
                }}
              />
            </span>
          )}
        </span>
      </span>
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E2D4D]" />
      )}
    </button>
  );
}
