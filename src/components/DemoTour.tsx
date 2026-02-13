import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';

interface TourStep {
  target: string | null; // data-tour attribute value, null for centered overlay
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const SCORE_SEQUENCE = [0, 15, 35, 50, 65, 80, 92];

export function DemoTour() {
  const { tourStep, setTourStep, completeTour, firstName, companyName } = useDemo();
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const scoreTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const TOUR_STEPS: TourStep[] = [
    {
      target: 'compliance-score',
      title: `Welcome to ${companyName}!`,
      content: `Great to have you, ${firstName}! This is your compliance score — a real-time snapshot across Operational, Equipment, and Documentation pillars. Let's take a quick look around.`,
      placement: 'bottom',
    },
    {
      target: 'temp-logs-nav',
      title: 'Temperature Monitoring',
      content: 'Track every cooler, freezer, and hot hold in real-time. Staff log temps from their phone, and out-of-range readings trigger instant alerts.',
      placement: 'right',
    },
    {
      target: 'checklists-nav',
      title: 'Daily Checklists',
      content: 'Never miss an opening or closing task. Custom checklists per location, role, and shift — with real-time completion tracking for managers.',
      placement: 'right',
    },
    {
      target: 'documents-nav',
      title: 'Documents & Compliance',
      content: 'All your records in one place — permits, certifications, vendor COIs, and inspection reports. Organized, searchable, and always up to date.',
      placement: 'right',
    },
    {
      target: 'ai-advisor-nav',
      title: 'AI Compliance Advisor',
      content: 'Get instant answers to compliance questions — FDA regulations, HACCP requirements, health code interpretations. Trained on food safety standards.',
      placement: 'right',
    },
    {
      target: null,
      title: 'You\'re Inspection Ready!',
      content: '',
      placement: 'bottom',
    },
  ];

  const step = TOUR_STEPS[tourStep];
  const isCelebration = tourStep === TOUR_STEPS.length - 1;

  // Score animation for celebration step
  useEffect(() => {
    if (isCelebration) {
      setAnimatedScore(0);
      setShowCelebration(false);
      scoreTimerRef.current.forEach(clearTimeout);
      scoreTimerRef.current = [];

      SCORE_SEQUENCE.forEach((score, i) => {
        const timer = setTimeout(() => {
          setAnimatedScore(score);
          if (i === SCORE_SEQUENCE.length - 1) {
            setTimeout(() => setShowCelebration(true), 300);
          }
        }, i * 350);
        scoreTimerRef.current.push(timer);
      });

      return () => {
        scoreTimerRef.current.forEach(clearTimeout);
      };
    }
  }, [isCelebration]);

  const positionTooltip = useCallback(() => {
    if (!step || !step.target) return;

    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    setHighlightRect({ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 });

    const placement = step.placement || 'bottom';
    let top = 0, left = 0;
    const tooltipW = 360, tooltipH = 200;

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

    top = Math.max(8, Math.min(top, window.innerHeight - tooltipH - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipW - 8));

    setTooltipPosition({ top, left });
  }, [step]);

  useEffect(() => {
    if (!isCelebration) {
      positionTooltip();
      const el = step?.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [tourStep, positionTooltip, isCelebration, step]);

  useEffect(() => {
    if (!isCelebration) {
      window.addEventListener('resize', positionTooltip);
      return () => window.removeEventListener('resize', positionTooltip);
    }
  }, [isCelebration, positionTooltip]);

  const next = () => {
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(tourStep + 1);
    } else {
      completeTour();
    }
  };

  const prev = () => {
    if (tourStep > 0) setTourStep(tourStep - 1);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 70) return '#eab308';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Inspection Ready';
    if (score >= 70) return 'Needs Attention';
    return 'Critical';
  };

  // Celebration step - centered overlay
  if (isCelebration) {
    return (
      <>
        <div className="fixed inset-0 z-[99990] bg-black/60 flex items-center justify-center">
          <div
            className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              {/* Score circle */}
              <div className="relative w-40 h-40 mx-auto mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="64" cy="64" r="56" fill="none"
                    stroke={getScoreColor(animatedScore)}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(animatedScore / 100) * 352} 352`}
                    style={{ transition: 'stroke-dasharray 0.3s ease-out, stroke 0.3s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-4xl font-extrabold transition-all duration-300"
                    style={{ color: getScoreColor(animatedScore) }}
                  >
                    {animatedScore}%
                  </span>
                </div>
              </div>

              {/* Badge */}
              {showCelebration && (
                <div className="animate-fade-in">
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold text-sm mb-4"
                    style={{ backgroundColor: getScoreColor(animatedScore) }}
                  >
                    <Sparkles className="w-4 h-4" />
                    {getScoreLabel(animatedScore)}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {companyName} is Inspection Ready!
                  </h2>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                    With EvidLY, this is your score on day one. Every temperature logged, every checklist completed, every document organized — all verified and audit-ready.
                  </p>
                </div>
              )}

              {/* Sparkle decorations */}
              {showCelebration && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: i % 2 === 0 ? '#d4af37' : '#1e4d6b',
                        top: `${15 + Math.random() * 70}%`,
                        left: `${10 + Math.random() * 80}%`,
                        animation: `sparkle ${1 + Math.random()}s ease-in-out ${Math.random() * 0.5}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={completeTour}
                className="px-8 py-3 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ backgroundColor: '#1e4d6b' }}
              >
                Start Exploring
              </button>
              <p className="text-xs text-gray-400 mt-3">
                You now have full access to explore every feature
              </p>
            </div>
          </div>
        </div>

        {/* Sparkle keyframe animation */}
        <style>{`
          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
            50% { opacity: 1; transform: scale(1) rotate(180deg); }
          }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }
        `}</style>
      </>
    );
  }

  // Regular tour steps with spotlight
  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[99990]" onClick={completeTour}>
        <div className="absolute inset-0 bg-black/50" />
        {step?.target && (
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
        )}
      </div>

      {/* Tooltip */}
      <div
        className="fixed z-[99999] w-[360px] bg-white rounded-xl shadow-sm border border-gray-200"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">{step?.title}</h3>
            <button onClick={completeTour} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{step?.content}</p>
        </div>

        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 rounded-b-xl border-t border-gray-100">
          <div className="flex items-center gap-3">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === tourStep ? 'bg-[#1e4d6b] w-4' :
                    i < tourStep ? 'bg-[#d4af37]' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={completeTour}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip Tour
            </button>
            {tourStep > 0 && (
              <button onClick={prev} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-[#1e4d6b] rounded-lg hover:bg-[#163a52] transition-colors"
            >
              {tourStep === TOUR_STEPS.length - 2 ? 'See Your Score' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
