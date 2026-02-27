import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, ChevronRight, X, Sparkles,
  User, MapPin, Building2, Users,
  FileText, Truck, Thermometer,
} from 'lucide-react';
import { BODY_TEXT, FONT } from './constants';
import { useOnboardingChecklist } from '../../../hooks/useOnboardingChecklist';
import { useConfetti } from '../../../hooks/useConfetti';

const ACCENT_GOLD = '#A08C5A';
const MIDNIGHT_NAVY = '#1E2D4D';
const GREEN = '#16a34a';
const STEP_BG_ACTIVE = '#FFFDF5';
const STEP_BORDER_ACTIVE = ACCENT_GOLD;

// Step icons keyed by step id
const STEP_ICONS: Record<string, typeof User> = {
  profile: User,
  first_location: MapPin,
  add_locations: Building2,
  invite_team: Users,
  upload_documents: FileText,
  add_vendors: Truck,
  register_equipment: Thermometer,
};

export function OnboardingChecklistCard() {
  const navigate = useNavigate();
  const {
    steps, completedCount, totalCount,
    isAllComplete, isDismissed, loading,
    currentStepIndex, completeStep, skipStep, goToStep,
    dismiss,
  } = useOnboardingChecklist();
  const { triggerConfetti } = useConfetti();

  const [confettiFired, setConfettiFired] = useState(false);

  // Fire confetti once when all steps complete
  if (isAllComplete && !confettiFired) {
    setConfettiFired(true);
    setTimeout(() => triggerConfetti('onboarding-checklist-complete'), 300);
  }

  if (isDismissed || loading || totalCount === 0) return null;

  // ── All-complete badge ────────────────────────────────
  if (isAllComplete) {
    return (
      <div
        className="bg-white rounded-lg flex items-center justify-between px-4 py-3"
        style={{ border: '1px solid #e5e7eb', ...FONT }}
      >
        <div className="flex items-center gap-2">
          <Check size={16} style={{ color: GREEN }} />
          <span className="text-sm font-semibold" style={{ color: MIDNIGHT_NAVY }}>
            Setup Complete — You're all set!
          </span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded hover:bg-black/5 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} style={{ color: '#9CA3AF' }} />
        </button>
      </div>
    );
  }

  const progressPct = Math.round((completedCount / totalCount) * 100);
  const currentStep = steps[currentStepIndex];
  const StepIcon = currentStep ? STEP_ICONS[currentStep.id] || Sparkles : Sparkles;

  return (
    <div
      className="bg-white rounded-lg overflow-hidden"
      style={{ border: '1px solid #D1D9E6', ...FONT }}
    >
      {/* Gold accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT_GOLD}, #C4AE7A, ${ACCENT_GOLD})` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: ACCENT_GOLD }} />
            <h3 className="text-sm font-semibold" style={{ color: MIDNIGHT_NAVY }}>
              Getting Started with EvidLY
            </h3>
          </div>
          <p className="text-xs mt-0.5 ml-6" style={{ color: '#6B7F96' }}>
            Step {currentStepIndex + 1} of {totalCount} — {completedCount} completed
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded hover:bg-black/5 transition-colors"
          aria-label="Dismiss setup wizard"
        >
          <X size={14} style={{ color: '#9CA3AF' }} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#E8EDF5' }}>
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, backgroundColor: ACCENT_GOLD }}
          />
        </div>
      </div>

      {/* Step progress dots (mini stepper) */}
      <div className="px-4 py-3 flex items-center gap-1" style={{ borderBottom: '1px solid #F0F0F0' }}>
        {steps.map((step, i) => {
          const isCompleted = step.completed;
          const isCurrent = i === currentStepIndex;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(i)}
              className="flex items-center gap-1 transition-all"
              title={step.label}
              aria-label={`Go to step ${i + 1}: ${step.label}`}
            >
              {/* Dot / check */}
              <div
                className="flex items-center justify-center rounded-full transition-all"
                style={{
                  width: isCurrent ? 24 : 20,
                  height: isCurrent ? 24 : 20,
                  backgroundColor: isCompleted ? GREEN : isCurrent ? ACCENT_GOLD : '#E8EDF5',
                  border: isCurrent && !isCompleted ? `2px solid ${ACCENT_GOLD}` : 'none',
                }}
              >
                {isCompleted ? (
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: isCurrent ? '#FFFFFF' : '#9CA3AF' }}
                  >
                    {i + 1}
                  </span>
                )}
              </div>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  className="h-[2px] transition-all"
                  style={{
                    width: 12,
                    backgroundColor: isCompleted ? GREEN : '#E8EDF5',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Current step detail panel */}
      {currentStep && (
        <div
          className="mx-3 my-3 p-4 rounded-lg transition-all"
          style={{
            backgroundColor: STEP_BG_ACTIVE,
            borderLeft: `3px solid ${STEP_BORDER_ACTIVE}`,
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${ACCENT_GOLD}15` }}
            >
              <StepIcon size={20} style={{ color: ACCENT_GOLD }} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold" style={{ color: MIDNIGHT_NAVY }}>
                {currentStep.label}
              </h4>
              <p className="text-xs mt-1" style={{ color: '#3D5068' }}>
                {currentStep.description}
              </p>
              <p className="text-[11px] mt-1.5 italic" style={{ color: '#6B7F96' }}>
                {currentStep.hint}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 ml-[52px]">
            <button
              type="button"
              onClick={() => {
                completeStep(currentStep.id);
                navigate(currentStep.route);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: ACCENT_GOLD }}
            >
              Let's Do This
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={skipStep}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-black/5"
              style={{ color: '#6B7F96' }}
            >
              I'll do this later
            </button>
          </div>
        </div>
      )}

      {/* Completed / remaining steps (collapsed) */}
      <div className="px-3 pb-3">
        {steps.map((step, i) => {
          if (i === currentStepIndex) return null; // current step shown above
          const Icon = STEP_ICONS[step.id] || Sparkles;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(i)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-gray-50 text-left"
            >
              {/* Status indicator */}
              <div
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: step.completed ? GREEN : '#FFFFFF',
                  border: step.completed ? 'none' : '2px solid #D1D9E6',
                }}
              >
                {step.completed ? (
                  <Check size={10} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <span className="text-[9px] font-bold" style={{ color: '#9CA3AF' }}>{i + 1}</span>
                )}
              </div>

              {/* Icon + label */}
              <Icon size={14} style={{ color: step.completed ? '#9CA3AF' : '#6B7F96' }} className="shrink-0" />
              <span
                className={`text-xs font-medium flex-1 ${step.completed ? 'line-through' : ''}`}
                style={{ color: step.completed ? '#9CA3AF' : BODY_TEXT }}
              >
                {step.label}
              </span>

              {/* Chevron for incomplete */}
              {!step.completed && (
                <ChevronRight size={12} style={{ color: '#9CA3AF' }} className="shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
