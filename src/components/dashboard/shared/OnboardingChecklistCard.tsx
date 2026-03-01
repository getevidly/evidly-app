import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, ChevronRight, X, Sparkles, Lock, Pencil,
  User, Users, Truck, Thermometer, FileText, Send,
  Wrench, FileSearch, Heart, Calendar, PartyPopper,
  Copy, ExternalLink, MapPin, Bot, Map,
} from 'lucide-react';
import { BODY_TEXT, FONT } from './constants';
import { useOnboardingChecklist } from '../../../hooks/useOnboardingChecklist';
import { useConfetti } from '../../../hooks/useConfetti';

const ACCENT_GOLD = '#A08C5A';
const MIDNIGHT_NAVY = '#1E2D4D';
const GREEN = '#16a34a';
const STEP_BG_ACTIVE = '#FFFDF5';
const STEP_BG_COMPLETED = '#F0FDF4';
const STEP_BORDER_ACTIVE = ACCENT_GOLD;
const STEP_BORDER_COMPLETED = GREEN;
const LOCKED_BG = '#F8F9FB';
const SKIPPED_COLOR = '#B0B8C5';
const DEP_WARNING_BG = '#FEF3CD';
const DEP_WARNING_TEXT = '#856404';

// Step icons keyed by step id
const STEP_ICONS: Record<string, typeof User> = {
  profile: User,
  setup_locations: MapPin,
  add_team: Users,
  invite_team: Send,
  add_vendors: Truck,
  invite_vendors: Send,
  add_vendor_services: Wrench,
  register_equipment: Thermometer,
  upload_documents: FileText,
  ai_document_routing: Bot,
  request_documents: FileSearch,
  take_tour: Map,
  k2c_referral: Heart,
  schedule_consultation: Calendar,
  setup_complete: PartyPopper,
};

// ── K2C Referral Modal ───────────────────────────────────
function K2CReferralModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const referralLink = 'https://evidly.com/refer?code=K2C-DEMO';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* fallback: ignore */ });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={FONT}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #E8EDF5' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart size={20} style={{ color: '#e11d48' }} />
              <h3 className="text-lg font-semibold" style={{ color: MIDNIGHT_NAVY }}>
                Kitchen to Community
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-black/5 transition-colors"
              aria-label="Close"
            >
              <X size={16} style={{ color: '#9CA3AF' }} />
            </button>
          </div>
          <p className="text-sm mt-2" style={{ color: '#3D5068' }}>
            Share EvidLY with a fellow restaurant operator and you both earn a free month of service.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="space-y-4">
            {/* Referral link */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B7F96' }}>
                Your referral link
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 px-3 py-2 rounded-md text-sm truncate"
                  style={{ backgroundColor: '#F4F6FA', color: MIDNIGHT_NAVY, border: '1px solid #D1D9E6' }}
                >
                  {referralLink}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: copied ? GREEN : ACCENT_GOLD,
                    color: '#FFFFFF',
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Benefits */}
            <div className="rounded-lg p-3" style={{ backgroundColor: '#FFFDF5', border: `1px solid ${ACCENT_GOLD}30` }}>
              <p className="text-xs font-semibold mb-2" style={{ color: ACCENT_GOLD }}>How it works</p>
              <ul className="space-y-1.5 text-xs" style={{ color: '#3D5068' }}>
                <li className="flex items-start gap-2">
                  <span style={{ color: ACCENT_GOLD }}>1.</span>
                  Share your unique link with a restaurant operator
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: ACCENT_GOLD }}>2.</span>
                  When they sign up and activate, you both get a free month
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: ACCENT_GOLD }}>3.</span>
                  No limit on referrals — keep sharing, keep earning
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-black/5"
            style={{ color: '#6B7F96' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onComplete();
              onClose();
            }}
            className="px-4 py-2 rounded-md text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: ACCENT_GOLD }}
          >
            Done — I shared it!
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────

export function OnboardingChecklistCard() {
  const navigate = useNavigate();
  const {
    steps, completedCount, totalCount,
    isAllComplete, isDismissed, loading,
    currentStepIndex, isStepUnlocked, getMissingDeps,
    completeStep, skipStep, goToStep,
    unskipStep, dismiss,
  } = useOnboardingChecklist();
  const { triggerConfetti } = useConfetti();

  const [confettiFired, setConfettiFired] = useState(false);
  const [showK2CModal, setShowK2CModal] = useState(false);

  // Fire confetti once when all steps complete
  if (isAllComplete && !confettiFired) {
    setConfettiFired(true);
    setTimeout(() => triggerConfetti('onboarding-checklist-complete'), 300);
  }

  if (isDismissed || loading || totalCount === 0) return null;

  // ── All-complete badge with Edit links ─────────────────
  if (isAllComplete) {
    return (
      <div
        className="bg-white rounded-lg overflow-hidden"
        style={{ border: '1px solid #e5e7eb', ...FONT }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <PartyPopper size={16} style={{ color: ACCENT_GOLD }} />
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
        <div className="px-3 pb-3" style={{ borderTop: '1px solid #F0F0F0' }}>
          {steps.filter(s => s.stepType !== 'celebration').map((step) => {
            const Icon = STEP_ICONS[step.id] || Sparkles;
            return (
              <div
                key={step.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md"
              >
                <div
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: GREEN }}
                >
                  <Check size={10} color="#FFFFFF" strokeWidth={3} />
                </div>
                <Icon size={14} style={{ color: '#9CA3AF' }} className="shrink-0" />
                <span className="text-xs font-medium flex-1 line-through" style={{ color: '#9CA3AF' }}>
                  {step.label}
                </span>
                {step.route && step.stepType !== 'modal' && step.stepType !== 'external' && (
                  <button
                    type="button"
                    onClick={() => navigate(step.route)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors hover:bg-gray-100"
                    style={{ color: '#6B7F96' }}
                  >
                    <Pencil size={10} />
                    Edit
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Count actionable steps for progress ─────────────────
  const actionableSteps = steps.filter(s => s.stepType !== 'celebration');
  const actionableTotal = actionableSteps.length;
  const progressPct = actionableTotal > 0 ? Math.round((completedCount / actionableTotal) * 100) : 0;
  const currentStep = steps[currentStepIndex];
  const StepIcon = currentStep ? STEP_ICONS[currentStep.id] || Sparkles : Sparkles;

  // ── Action handler for the current step ─────────────────
  const handleStepAction = (step: typeof currentStep) => {
    if (!step) return;
    const type: string = step.stepType || 'navigate';
    switch (type) {
      case 'modal':
        if (step.id === 'k2c_referral') setShowK2CModal(true);
        break;
      case 'external':
        if (step.externalUrl) window.open(step.externalUrl, '_blank', 'noopener');
        break;
      case 'tour':
        window.dispatchEvent(new CustomEvent('evidly:start-guided-tour'));
        completeStep(step.id);
        break;
      case 'celebration':
        completeStep(step.id);
        navigate(step.route);
        break;
      default:
        navigate(step.route);
    }
  };

  return (
    <>
      {showK2CModal && (
        <K2CReferralModal
          onClose={() => setShowK2CModal(false)}
          onComplete={() => completeStep('k2c_referral')}
        />
      )}

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
        <div className="px-4 py-3 flex items-center gap-1 flex-wrap" style={{ borderBottom: '1px solid #F0F0F0' }}>
          {steps.map((step, i) => {
            const isCompleted = step.completed;
            const isSkipped = step.skipped && !isCompleted;
            const isCurrent = i === currentStepIndex;
            const unlocked = isStepUnlocked(i);
            const isLocked = !unlocked && !isCompleted;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (!isCompleted && unlocked) goToStep(i);
                }}
                className={`flex items-center gap-1 transition-all ${
                  isCompleted ? 'cursor-default' : isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
                title={isCompleted ? `${step.label} — completed` : isLocked ? 'Complete previous steps first' : step.label}
                aria-label={isCompleted ? `Step ${i + 1}: ${step.label} (completed)` : isLocked ? `Step ${i + 1}: ${step.label} (locked)` : `Go to step ${i + 1}: ${step.label}`}
                disabled={isLocked}
              >
                <div
                  className="flex items-center justify-center rounded-full transition-all"
                  style={{
                    width: isCurrent ? 24 : 20,
                    height: isCurrent ? 24 : 20,
                    backgroundColor: isCompleted
                      ? GREEN
                      : isSkipped
                        ? SKIPPED_COLOR
                        : isCurrent
                          ? ACCENT_GOLD
                          : '#E8EDF5',
                    border: isCurrent && !isCompleted ? `2px solid ${ACCENT_GOLD}` : 'none',
                    opacity: isLocked ? 0.5 : 1,
                  }}
                >
                  {isCompleted ? (
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  ) : isSkipped ? (
                    <ChevronRight size={10} color="#FFFFFF" strokeWidth={3} />
                  ) : isLocked ? (
                    <Lock size={9} color="#9CA3AF" />
                  ) : (
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: isCurrent ? '#FFFFFF' : '#9CA3AF' }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="h-[2px] transition-all"
                    style={{
                      width: 8,
                      backgroundColor: isCompleted ? GREEN : isSkipped ? SKIPPED_COLOR : '#E8EDF5',
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
              backgroundColor: currentStep.completed ? STEP_BG_COMPLETED : STEP_BG_ACTIVE,
              borderLeft: `3px solid ${currentStep.completed ? STEP_BORDER_COMPLETED : STEP_BORDER_ACTIVE}`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: currentStep.completed ? `${GREEN}15` : `${ACCENT_GOLD}15` }}
              >
                {currentStep.completed ? (
                  <Check size={20} style={{ color: GREEN }} />
                ) : (
                  <StepIcon size={20} style={{ color: ACCENT_GOLD }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold" style={{ color: MIDNIGHT_NAVY }}>
                  {currentStep.label}
                  {currentStep.completed && (
                    <span className="ml-2 text-[11px] font-normal" style={{ color: GREEN }}>Done</span>
                  )}
                </h4>
                <p className="text-xs mt-1" style={{ color: '#3D5068' }}>
                  {currentStep.description}
                </p>
                {!currentStep.completed && (
                  <p className="text-[11px] mt-1.5 italic" style={{ color: '#6B7F96' }}>
                    {currentStep.hint}
                  </p>
                )}
              </div>
            </div>

            {/* Dependency warning — show for locked steps that have explicit deps */}
            {!isStepUnlocked(currentStepIndex) && getMissingDeps(currentStepIndex).length > 0 && (
              <div
                className="mt-3 ml-[52px] px-3 py-2 rounded-md text-xs"
                style={{ backgroundColor: DEP_WARNING_BG, color: DEP_WARNING_TEXT }}
              >
                <Lock size={10} className="inline mr-1.5" style={{ color: DEP_WARNING_TEXT }} />
                Complete first: {getMissingDeps(currentStepIndex).join(', ')}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3 ml-[52px] flex-wrap">
              {currentStep.completed ? (
                /* Completed: Edit button only (for navigate steps) */
                currentStep.route && currentStep.stepType !== 'modal' && currentStep.stepType !== 'external' && currentStep.stepType !== 'celebration' ? (
                  <button
                    type="button"
                    onClick={() => navigate(currentStep.route)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-gray-100"
                    style={{ color: '#6B7F96', border: '1px solid #D1D9E6' }}
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                ) : null
              ) : (
                /* Pending / Skipped: action button + mark done + skip */
                <>
                  <button
                    type="button"
                    onClick={() => handleStepAction(currentStep)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: ACCENT_GOLD }}
                  >
                    {currentStep.actionLabel}
                    {currentStep.stepType === 'external' ? (
                      <ExternalLink size={14} />
                    ) : currentStep.stepType === 'celebration' ? (
                      <PartyPopper size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>
                  {currentStep.stepType !== 'celebration' && (
                    <button
                      type="button"
                      onClick={() => completeStep(currentStep.id)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-green-50"
                      style={{ color: GREEN }}
                    >
                      Mark Done
                    </button>
                  )}
                  {!currentStep.skipped && currentStep.stepType !== 'celebration' && (
                    <button
                      type="button"
                      onClick={() => skipStep(currentStep.id)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-black/5"
                      style={{ color: '#6B7F96' }}
                    >
                      I'll do this later
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Completed / remaining / locked steps (collapsed list) */}
        <div className="px-3 pb-3">
          {steps.map((step, i) => {
            if (i === currentStepIndex) return null;
            const Icon = STEP_ICONS[step.id] || Sparkles;
            const unlocked = isStepUnlocked(i);
            const isLocked = !unlocked && !step.completed;
            const isSkipped = step.skipped && !step.completed;
            const missingDeps = getMissingDeps(i);
            const hasDeps = isLocked && missingDeps.length > 0;

            return (
              <div
                key={step.id}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                  isLocked ? 'cursor-not-allowed' : ''
                }`}
                style={isLocked ? { backgroundColor: LOCKED_BG } : undefined}
                title={hasDeps ? `Requires: ${missingDeps.join(', ')}` : undefined}
              >
                {/* Status indicator */}
                <div
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: step.completed
                      ? GREEN
                      : isSkipped
                        ? SKIPPED_COLOR
                        : isLocked
                          ? '#E8EDF5'
                          : '#FFFFFF',
                    border: step.completed || isSkipped || isLocked ? 'none' : '2px solid #D1D9E6',
                    opacity: isLocked ? 0.5 : 1,
                  }}
                >
                  {step.completed ? (
                    <Check size={10} color="#FFFFFF" strokeWidth={3} />
                  ) : isSkipped ? (
                    <ChevronRight size={8} color="#FFFFFF" strokeWidth={3} />
                  ) : isLocked ? (
                    <Lock size={8} color="#9CA3AF" />
                  ) : (
                    <span className="text-[9px] font-bold" style={{ color: '#9CA3AF' }}>{i + 1}</span>
                  )}
                </div>

                {/* Icon + label */}
                <Icon
                  size={14}
                  style={{ color: step.completed || isLocked ? '#9CA3AF' : isSkipped ? SKIPPED_COLOR : '#6B7F96' }}
                  className="shrink-0"
                />
                <span
                  className={`text-xs font-medium flex-1 ${step.completed ? 'line-through' : ''}`}
                  style={{
                    color: step.completed ? '#9CA3AF' : isLocked ? '#B0B8C5' : isSkipped ? SKIPPED_COLOR : BODY_TEXT,
                  }}
                >
                  {step.label}
                  {isSkipped && (
                    <span className="ml-1.5 text-[10px] font-normal" style={{ color: SKIPPED_COLOR }}>
                      (skipped)
                    </span>
                  )}
                </span>

                {/* Action: Edit for completed, Start for skipped, chevron/lock for others */}
                {step.completed ? (
                  step.route && step.stepType !== 'modal' && step.stepType !== 'external' && step.stepType !== 'celebration' ? (
                    <button
                      type="button"
                      onClick={() => navigate(step.route)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors hover:bg-gray-100 shrink-0"
                      style={{ color: '#6B7F96' }}
                    >
                      <Pencil size={10} />
                      Edit
                    </button>
                  ) : null
                ) : isSkipped ? (
                  <button
                    type="button"
                    onClick={() => { unskipStep(step.id); goToStep(i); }}
                    className="px-2 py-1 rounded text-[11px] font-semibold transition-colors hover:bg-amber-50 shrink-0"
                    style={{ color: ACCENT_GOLD }}
                  >
                    Start
                  </button>
                ) : isLocked ? (
                  <Lock size={12} style={{ color: '#D1D9E6' }} className="shrink-0" />
                ) : (
                  <button
                    type="button"
                    onClick={() => goToStep(i)}
                    className="shrink-0 p-0.5 rounded hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight size={12} style={{ color: '#9CA3AF' }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
