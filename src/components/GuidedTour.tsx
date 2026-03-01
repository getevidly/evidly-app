import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'sidebar-nav',
    title: 'Navigation',
    content: 'Your main navigation. Access all modules from here — temperatures, checklists, documents, vendors, and more.',
    placement: 'right',
  },
  {
    target: 'compliance-score',
    title: 'Compliance Score',
    content: 'Your compliance scores across 2 independent pillars: Food Safety and Facility Safety. Click either pillar to see what\'s driving the score.',
    placement: 'bottom',
  },
  {
    target: 'temp-logs-nav',
    title: 'Temperature Logs',
    content: 'Log temperatures for all your equipment. Set schedules, get alerts for missed checks, and track FDA-compliant cooldown monitoring.',
    placement: 'right',
  },
  {
    target: 'checklists-nav',
    title: 'Daily Checklists',
    content: 'Opening/closing checklists, receiving logs, and custom checklists. Templates are pre-loaded for your industry type.',
    placement: 'right',
  },
  {
    target: 'ai-advisor-nav',
    title: 'AI Compliance Advisor',
    content: 'Ask any compliance question — FDA regulations, HACCP requirements, health code interpretations. Trained on food safety and facility safety standards.',
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
    const tooltipW = 340, tooltipH = 180;

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
        className="fixed z-[99999] w-[340px] bg-white rounded-xl shadow-sm border border-gray-200 animate-slide-up"
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
          <span className="text-xs text-gray-400">{currentStep + 1} of {TOUR_STEPS.length}</span>
          <div className="flex items-center gap-2">
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
