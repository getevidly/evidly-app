// src/components/setup/WizardShell.tsx
import { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const PRIMARY = '#1E2D4D';
const GOLD = '#A08C5A';
const CREAM = '#F8F4ED';
const STEP_INACTIVE_BG = '#F1EFE8';
const STEP_INACTIVE_TEXT = '#888780';
const STEP_TRACK = '#E5E2D5';
const TEXT_MUTED = '#5F5E5A';
const BORDER_SUBTLE = 'rgba(0,0,0,0.08)';

const FONT: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export interface WizardShellProps {
  eyebrow: string;
  title: string;
  currentStep: number;
  totalSteps: number;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onSaveExit: () => void;
  isNextDisabled?: boolean;
  isBackHidden?: boolean;
  nextLabel?: string;
  onStepClick?: (step: number) => void;
}

export function WizardShell({
  eyebrow,
  title,
  currentStep,
  totalSteps,
  children,
  onBack,
  onNext,
  onSaveExit,
  isNextDisabled = false,
  isBackHidden = false,
  nextLabel = 'Next',
  onStepClick,
}: WizardShellProps) {
  const stepNumbers = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="min-h-screen w-full" style={{ ...FONT, background: CREAM }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div
          className="rounded-2xl bg-white px-5 sm:px-7 py-6 sm:py-7"
          style={{ border: `0.5px solid ${BORDER_SUBTLE}` }}
        >
          <header className="flex items-start justify-between gap-4 mb-1">
            <div>
              <div
                className="text-xs font-medium uppercase mb-1.5"
                style={{ color: TEXT_MUTED, letterSpacing: '0.04em' }}
              >
                {eyebrow}
              </div>
              <h1 className="text-lg sm:text-xl font-medium" style={{ color: PRIMARY }}>
                {title}
              </h1>
            </div>
            <div className="text-sm whitespace-nowrap" style={{ color: TEXT_MUTED }}>
              Step {currentStep} of {totalSteps}
            </div>
          </header>

          <nav
            aria-label="Wizard progress"
            className="mt-4 flex items-center gap-1.5 sm:gap-2"
          >
            {stepNumbers.map((n, i) => (
              <div
                key={n}
                className="flex items-center gap-1.5 sm:gap-2 flex-1 last:flex-none"
              >
                <button
                  type="button"
                  onClick={onStepClick ? () => onStepClick(n) : undefined}
                  disabled={!onStepClick}
                  className="rounded-full flex items-center justify-center font-medium flex-shrink-0 transition-opacity disabled:cursor-default enabled:hover:opacity-80 enabled:cursor-pointer"
                  style={{
                    width: 26,
                    height: 26,
                    fontSize: 12,
                    background: n === currentStep ? GOLD : STEP_INACTIVE_BG,
                    color: n === currentStep ? 'white' : STEP_INACTIVE_TEXT,
                    border: 'none',
                    padding: 0,
                  }}
                  aria-current={n === currentStep ? 'step' : undefined}
                  aria-label={`Go to step ${n}${n === currentStep ? ' (current)' : ''}`}
                >
                  {n}
                </button>
                {i < stepNumbers.length - 1 && (
                  <div className="flex-1 h-0.5" style={{ background: STEP_TRACK }} />
                )}
              </div>
            ))}
          </nav>

          <section className="mt-7">{children}</section>

          <footer
            className="mt-6 pt-4 flex items-center justify-between gap-4 flex-wrap"
            style={{ borderTop: `0.5px solid ${BORDER_SUBTLE}` }}
          >
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onBack}
                disabled={isBackHidden || !onBack}
                className="flex items-center gap-1 text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: TEXT_MUTED, background: 'transparent' }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <button
                type="button"
                onClick={onSaveExit}
                className="text-sm py-2 underline-offset-2 hover:underline"
                style={{ color: TEXT_MUTED, background: 'transparent' }}
              >
                Save and exit
              </button>
            </div>

            <button
              type="button"
              onClick={onNext}
              disabled={isNextDisabled || !onNext}
              className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: PRIMARY }}
            >
              {nextLabel}
              <ArrowRight size={14} />
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
