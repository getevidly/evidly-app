import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronDown, ChevronUp, X } from 'lucide-react';
import { BODY_TEXT, FONT } from './constants';
import { useOnboardingChecklist } from '../../../hooks/useOnboardingChecklist';
import { useConfetti } from '../../../hooks/useConfetti';

const ACCENT_GOLD = '#A08C5A';
const MIDNIGHT_NAVY = '#1E2D4D';

export function OnboardingChecklistCard() {
  const navigate = useNavigate();
  const {
    sections, completedCount, totalCount,
    isAllComplete, isDismissed, loading,
    toggleStep, dismiss,
  } = useOnboardingChecklist();
  const { triggerConfetti } = useConfetti();

  const [collapsed, setCollapsed] = useState(false);
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
          <Check size={16} style={{ color: '#16a34a' }} />
          <span className="text-sm font-semibold" style={{ color: MIDNIGHT_NAVY }}>
            Setup Complete
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

  return (
    <div
      className="bg-white rounded-lg overflow-hidden"
      style={{ border: '1px solid #e5e7eb', ...FONT }}
    >
      {/* Gold accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT_GOLD}, #C4AE7A, ${ACCENT_GOLD})` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold" style={{ color: MIDNIGHT_NAVY }}>
            Getting Started with EvidLY
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#6B7F96' }}>
            {completedCount} of {totalCount} steps complete
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded hover:bg-black/5 transition-colors"
            aria-label={collapsed ? 'Expand checklist' : 'Collapse checklist'}
          >
            {collapsed
              ? <ChevronDown size={16} style={{ color: '#9CA3AF' }} />
              : <ChevronUp size={16} style={{ color: '#9CA3AF' }} />}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="p-1 rounded hover:bg-black/5 transition-colors"
            aria-label="Dismiss checklist"
          >
            <X size={14} style={{ color: '#9CA3AF' }} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2" style={{ borderBottom: collapsed ? undefined : '1px solid #F0F0F0' }}>
        <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#E8EDF5' }}>
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, backgroundColor: ACCENT_GOLD }}
          />
        </div>
      </div>

      {/* Step list (collapsible) */}
      {!collapsed && sections.map(section => (
        <div key={section.id}>
          {/* Section header */}
          <div className="px-4 py-2" style={{ backgroundColor: '#F9FAFB' }}>
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: ACCENT_GOLD, letterSpacing: '0.08em' }}
            >
              {section.label}
            </span>
          </div>

          {/* Steps */}
          {section.steps.map(step => (
            <div
              key={step.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
              style={{ borderBottom: '1px solid #F0F0F0' }}
            >
              {/* Checkbox circle */}
              <button
                type="button"
                onClick={() => toggleStep(step.id)}
                className="shrink-0"
                aria-label={step.completed ? `Mark "${step.label}" incomplete` : `Mark "${step.label}" complete`}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: step.completed ? ACCENT_GOLD : '#FFFFFF',
                    border: step.completed ? 'none' : '2px solid #D1D9E6',
                  }}
                >
                  {step.completed && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                </div>
              </button>

              {/* Label + description — clicking navigates */}
              <button
                type="button"
                onClick={() => navigate(step.route)}
                className="flex-1 min-w-0 text-left"
              >
                <p
                  className={`text-[13px] font-medium ${step.completed ? 'line-through' : ''}`}
                  style={{ color: step.completed ? '#9CA3AF' : BODY_TEXT }}
                >
                  {step.label}
                </p>
                {!step.completed && (
                  <p className="text-[11px] mt-0.5" style={{ color: '#6B7F96' }}>
                    {step.description}
                  </p>
                )}
              </button>

              {/* Chevron for incomplete */}
              {!step.completed && (
                <ChevronRight size={14} style={{ color: '#9CA3AF' }} className="shrink-0" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
