import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, ChevronRight, X, Sparkles, Lock, Pencil,
  User, Users, Truck, Thermometer, FileText, Send,
  Wrench, FileSearch, Heart, Calendar, PartyPopper,
  Copy, ExternalLink, MapPin, Bot, Map,
  ShieldCheck, Leaf, GraduationCap, Wifi,
} from 'lucide-react';
import { BODY_TEXT, FONT } from './constants';
import { useOnboardingChecklist } from '../../../hooks/useOnboardingChecklist';
import { Modal } from '../../ui/Modal';

const ACCENT_GOLD = '#A08C5A';
const MIDNIGHT_NAVY = '#1E2D4D';
const GREEN = '#3B6D11';

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
  ai_document_routing: Sparkles,
  request_documents: FileSearch,
  sb1383_setup: Leaf,
  k12_setup: GraduationCap,
  iot_readiness: Wifi,
  take_tour: Map,
  k2c_referral: Heart,
  schedule_consultation: Calendar,
  setup_complete: PartyPopper,
};

// Conditional badge labels
const COND_BADGES: Record<string, string> = {
  sb1383_setup: 'SB 1383',
  k12_setup: 'K-12',
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
    <Modal isOpen={true} onClose={onClose} size="md" className="overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #E8EDF5' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart size={20} style={{ color: '#e11d48' }} />
              <h3 className="text-lg font-semibold tracking-tight" style={{ color: MIDNIGHT_NAVY }}>
                Kitchen to Community
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 -m-1 rounded hover:bg-black/5 transition-colors"
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
    </Modal>
  );
}

// ── Main Component ───────────────────────────────────────

export function OnboardingChecklistCard() {
  const navigate = useNavigate();
  const {
    steps, completedCount, totalCount,
    isAllComplete, isDismissed, loading,
    currentStepIndex, isStepUnlocked, getMissingDeps,
    completeStep, goToStep,
    dismiss,
  } = useOnboardingChecklist();

  const [showK2CModal, setShowK2CModal] = useState(false);

  if (isDismissed || loading || totalCount === 0) return null;

  // When all steps complete, hide entirely (per spec 5e)
  if (isAllComplete) return null;

  // ── Count actionable steps for progress ─────────────────
  const actionableSteps = steps.filter(s => s.stepType !== 'celebration');
  const actionableTotal = actionableSteps.length;
  const progressPct = actionableTotal > 0 ? Math.round((completedCount / actionableTotal) * 100) : 0;
  const currentStep = steps[currentStepIndex];

  // ── Dynamic display numbering (1-indexed, gaps removed) ──
  const displayNumbers = new Map<string, number>();
  steps.forEach((step, i) => { displayNumbers.set(step.id, i + 1); });

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
        className="bg-white overflow-hidden"
        style={{ border: '0.5px solid #D1D9E6', borderRadius: 14, ...FONT }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${ACCENT_GOLD}12` }}
            >
              <ShieldCheck size={18} style={{ color: ACCENT_GOLD }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold" style={{ color: MIDNIGHT_NAVY }}>
                Getting started with EvidLY
              </h3>
              <p className="text-xs mt-0.5" style={{ color: '#6B7F96' }}>
                Step {displayNumbers.get(currentStep?.id || '') || 1} of {totalCount} &mdash; {completedCount} completed
              </p>
            </div>
          </div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
            style={{ backgroundColor: `${ACCENT_GOLD}15`, color: ACCENT_GOLD }}
          >
            {progressPct}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="px-4 py-1.5">
          <div className="w-full h-[3px] rounded-full" style={{ backgroundColor: '#E8EDF5' }}>
            <div
              className="h-[3px] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: ACCENT_GOLD }}
            />
          </div>
        </div>

        {/* Step rows */}
        <div className="px-3 pt-1 pb-2">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[step.id] || Sparkles;
            const unlocked = isStepUnlocked(i);
            const isLocked = !unlocked && !step.completed;
            const isCurrent = i === currentStepIndex;
            const condBadge = COND_BADGES[step.id];
            const num = displayNumbers.get(step.id) || i + 1;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (!step.completed && unlocked) goToStep(i);
                }}
                disabled={isLocked}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isCurrent && !step.completed ? '' : ''
                } ${isLocked ? 'cursor-not-allowed' : step.completed ? 'cursor-default' : 'cursor-pointer hover:bg-[#1E2D4D]/[0.02]'}`}
                style={isCurrent && !step.completed ? { backgroundColor: 'rgba(160,140,90,0.06)' } : undefined}
              >
                {/* Number circle */}
                <div
                  className="shrink-0 flex items-center justify-center rounded-full"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: step.completed
                      ? GREEN
                      : isCurrent
                        ? `${ACCENT_GOLD}20`
                        : '#E8EDF5',
                    opacity: isLocked ? 0.45 : 1,
                  }}
                >
                  {step.completed ? (
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  ) : isLocked ? (
                    <Lock size={9} color="#9CA3AF" />
                  ) : (
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: isCurrent ? ACCENT_GOLD : '#9CA3AF' }}
                    >
                      {num}
                    </span>
                  )}
                </div>

                {/* Step icon */}
                <Icon
                  size={20}
                  className="shrink-0"
                  style={{
                    color: step.completed
                      ? '#9CA3AF'
                      : isCurrent
                        ? ACCENT_GOLD
                        : isLocked
                          ? '#D1D9E6'
                          : 'rgba(30,45,77,0.55)',
                  }}
                />

                {/* Step name */}
                <span
                  className={`text-xs font-medium flex-1 ${step.completed ? 'line-through' : ''}`}
                  style={{
                    color: step.completed ? '#9CA3AF' : isLocked ? '#B0B8C5' : BODY_TEXT,
                  }}
                >
                  {step.label}
                </span>

                {/* Conditional badge */}
                {condBadge && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: `${ACCENT_GOLD}15`, color: ACCENT_GOLD }}
                  >
                    {condBadge}
                  </span>
                )}

                {/* Chevron */}
                {!step.completed && !isLocked && (
                  <ChevronRight size={14} style={{ color: '#D1D9E6' }} className="shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active step CTA panel */}
        {currentStep && !currentStep.completed && (
          <div
            className="mx-3 mb-3 p-4 rounded-xl"
            style={{
              backgroundColor: `${ACCENT_GOLD}08`,
              borderTop: `2px solid ${ACCENT_GOLD}30`,
            }}
          >
            <div className="flex items-start gap-3">
              {(() => {
                const ActiveIcon = STEP_ICONS[currentStep.id] || Sparkles;
                return (
                  <div
                    className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${ACCENT_GOLD}15` }}
                  >
                    <ActiveIcon size={20} style={{ color: ACCENT_GOLD }} />
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold" style={{ color: MIDNIGHT_NAVY }}>
                  {currentStep.label}
                </h4>
                <p className="text-xs mt-1" style={{ color: '#3D5068' }}>
                  {currentStep.description}
                </p>

                {/* Dependency warning */}
                {!isStepUnlocked(currentStepIndex) && getMissingDeps(currentStepIndex).length > 0 && (
                  <div
                    className="mt-2 px-3 py-2 rounded-md text-xs"
                    style={{ backgroundColor: '#FEF3CD', color: '#856404' }}
                  >
                    <Lock size={10} className="inline mr-1.5" style={{ color: '#856404' }} />
                    Complete first: {getMissingDeps(currentStepIndex).join(', ')}
                  </div>
                )}

                {/* CTA buttons — only Continue + Mark done */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {currentStep.stepType !== 'celebration' && (
                    <button
                      type="button"
                      onClick={() => handleStepAction(currentStep)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors hover:opacity-90"
                      style={{ backgroundColor: ACCENT_GOLD }}
                    >
                      Continue
                      {currentStep.stepType === 'external' ? (
                        <ExternalLink size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                  )}
                  {currentStep.stepType !== 'celebration' && (
                    <button
                      type="button"
                      onClick={() => completeStep(currentStep.id)}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-green-50"
                      style={{ color: GREEN }}
                    >
                      Mark done
                    </button>
                  )}
                  {currentStep.stepType === 'celebration' && (
                    <button
                      type="button"
                      onClick={() => handleStepAction(currentStep)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors hover:opacity-90"
                      style={{ backgroundColor: ACCENT_GOLD }}
                    >
                      {currentStep.actionLabel}
                      <PartyPopper size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
