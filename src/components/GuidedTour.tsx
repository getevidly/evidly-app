import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  // ── Top Menu Bar (Steps 1–6) ──
  {
    target: 'tour-search',
    title: 'Search',
    content: 'Quickly find facilities, documents, tasks, and compliance records across your account.',
    placement: 'bottom',
  },
  {
    target: 'tour-alerts',
    title: 'Alerts',
    content: 'View notifications about compliance deadlines, out-of-range readings, and action items.',
    placement: 'bottom',
  },
  {
    target: 'tour-language',
    title: 'Language',
    content: 'Switch the interface language to match your preference.',
    placement: 'bottom',
  },
  {
    target: 'tour-help-topbar',
    title: 'Help',
    content: 'Access help articles, FAQs, and support resources.',
    placement: 'bottom',
  },
  {
    target: 'tour-settings',
    title: 'Settings',
    content: 'Manage your account settings, notification preferences, and system configuration.',
    placement: 'bottom',
  },
  {
    target: 'tour-user',
    title: 'User Info',
    content: 'View your profile, change your password, adjust settings, or sign out.',
    placement: 'bottom',
  },
  // ── Sidebar Menu (Steps 7–14) ──
  {
    target: 'tour-dashboard',
    title: 'Dashboard',
    content: 'Your compliance overview \u2014 see scores, alerts, and key metrics at a glance.',
    placement: 'right',
  },
  {
    target: 'tour-section-daily',
    title: 'Daily Operations',
    content: 'Manage daily food safety tasks including temperature logs, checklists, and receiving.',
    placement: 'right',
  },
  {
    target: 'tour-section-compliance',
    title: 'Compliance',
    content: 'Track your compliance status across Food Safety and Facility Safety requirements.',
    placement: 'right',
  },
  {
    target: 'tour-section-insights',
    title: 'Insights',
    content: 'View reports, trends, and analytics on your compliance performance.',
    placement: 'right',
  },
  {
    target: 'tour-section-tools',
    title: 'Tools',
    content: 'Access tools like the calendar, vendor management, training records, and document storage.',
    placement: 'right',
  },
  {
    target: 'tour-section-administration',
    title: 'Administration',
    content: 'Manage team members, facilities, roles, and system settings.',
    placement: 'right',
  },
  {
    target: 'tour-section-help',
    title: 'Help',
    content: 'Find guides, tutorials, and contact support from within the app.',
    placement: 'right',
  },
  {
    target: 'tour-logout',
    title: 'Log Out',
    content: 'Sign out of your EvidLY account.',
    placement: 'right',
  },
];

interface GuidedTourProps {
  onComplete?: () => void;
  onActiveChange?: (active: boolean) => void;
}

export function GuidedTour({ onComplete, onActiveChange }: GuidedTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive, onActiveChange]);

  const positionTooltip = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    setHighlightRect({ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 });

    const placement = step.placement || 'bottom';
    let top = 0, left = 0;
    const tooltipW = 360, tooltipH = 180;

    switch (placement) {
      case 'bottom':
        top = rect.bottom + 12;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        break;
      case 'top':
        top = rect.top - tooltipH - 12;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.right + 12;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.left - tooltipW - 12;
        break;
    }

    // Keep on screen
    top = Math.max(8, Math.min(top, window.innerHeight - tooltipH - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipW - 8));

    setTooltipPosition({ top, left });
  }, [currentStep]);

  useEffect(() => {
    if (isActive) {
      positionTooltip();
      const el = document.querySelector(`[data-tour="${TOUR_STEPS[currentStep].target}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, currentStep, positionTooltip]);

  useEffect(() => {
    if (isActive) {
      window.addEventListener('resize', positionTooltip);
      return () => window.removeEventListener('resize', positionTooltip);
    }
  }, [isActive, positionTooltip]);

  const next = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      endTour();
    }
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const endTour = () => {
    setIsActive(false);
    setCurrentStep(0);
    onComplete?.();
  };

  const startTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  if (!isActive) {
    return (
      <button
        onClick={startTour}
        className="fixed z-[1040] flex items-center gap-2 px-4 py-3 bg-[#1e4d6b] text-white rounded-full shadow-sm hover:bg-[#163a52] transition-all hover:scale-105"
        style={{ bottom: '80px', right: '88px' }}
        title="Start guided tour"
      >
        <HelpCircle className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Tour</span>
      </button>
    );
  }

  const step = TOUR_STEPS[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[99990]" onClick={endTour}>
        <div className="absolute inset-0 bg-black/50" />
        {/* Spotlight cutout */}
        <div
          className="absolute border-2 border-[#d4af37] rounded-lg"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5), 0 0 15px rgba(212,175,55,0.5)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Tooltip */}
      <div
        className="fixed z-[99999] w-[360px] max-h-[70vh] overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-200 animate-slide-up"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
            <button onClick={endTour} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{step.content}</p>
        </div>
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 rounded-b-xl border-t border-gray-100">
          <span className="text-xs text-gray-400">Step {currentStep + 1} of {TOUR_STEPS.length}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={endTour}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip Tour
            </button>
            {currentStep > 0 && (
              <button onClick={prev} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-[#1e4d6b] rounded-lg hover:bg-[#163a52] transition-colors"
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
              {currentStep < TOUR_STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
