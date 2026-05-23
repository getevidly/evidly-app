import { Sparkles, Check, RefreshCw } from 'lucide-react';
import type { DeficiencyResolutionPlan, ResolutionPlanStep } from '../../hooks/deficiencies/useDeficiencyResolutionPlan';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

const ACTION_LABELS: Record<string, string> = {
  log_result: 'Log result →',
  add_temp_log_task: '+ Add temp log task',
  schedule_service: '+ Schedule service',
  view_packet: 'View packet →',
  generic: 'Mark done',
};

interface AIResolutionPlanProps {
  plan: DeficiencyResolutionPlan | null;
  generating: boolean;
  onGenerate: () => void;
  onAccept: () => void;
  onCompleteStep: (stepId: string) => void;
  onRegenerate: () => void;
}

function StepRow({
  step,
  index,
  onComplete,
  accepted,
}: {
  step: ResolutionPlanStep;
  index: number;
  onComplete: () => void;
  accepted: boolean;
}) {
  const completed = !!step.completed_at;
  const actionLabel = step.action_label || ACTION_LABELS[step.action_type] || 'Mark done';
  // Only certain action types have real targets — others disabled with tooltip
  const hasTarget = step.action_type === 'generic' || step.action_type === 'log_result';

  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold"
        style={{
          backgroundColor: completed ? '#2f7a4d' : NAVY,
          color: '#FAF7F0',
          fontFamily: 'Montserrat, system-ui',
        }}
      >
        {completed ? <Check size={12} /> : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px]"
          style={{
            color: completed ? '#8A93A6' : NAVY,
            textDecoration: completed ? 'line-through' : 'none',
          }}
        >
          {step.text}
        </p>
        {step.meta && (
          <p className="text-[11px] text-[#8A93A6] mt-0.5">{step.meta}</p>
        )}
      </div>
      {!accepted && !completed && (
        <button
          onClick={onComplete}
          disabled={!hasTarget}
          className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap disabled:opacity-40"
          style={{
            backgroundColor: step.action_type === 'add_temp_log_task' ? NAVY : 'transparent',
            color: step.action_type === 'add_temp_log_task' ? 'white' : NAVY,
            border: step.action_type === 'add_temp_log_task' ? 'none' : `1px solid ${NAVY}20`,
          }}
          title={!hasTarget ? 'Feature coming in next sprint' : undefined}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function AIResolutionPlan({
  plan,
  generating,
  onGenerate,
  onAccept,
  onCompleteStep,
  onRegenerate,
}: AIResolutionPlanProps) {
  const accepted = !!plan?.accepted_at;

  return (
    <div
      className="rounded-[10px] p-5"
      style={{
        background: 'linear-gradient(135deg, #fdfaf4 0%, white 100%)',
        border: `1px solid ${GOLD}`,
        borderLeft: `4px solid ${GOLD}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3
            className="text-[17px] font-bold"
            style={{ color: NAVY, fontFamily: 'Montserrat, system-ui' }}
          >
            <Sparkles className="inline w-4 h-4 mr-1" style={{ color: GOLD }} />
            Resolution plan
          </h3>
          <span
            className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: GOLD, color: 'white' }}
          >
            AI Drafted
          </span>
        </div>
        {accepted ? (
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(47,122,77,0.12)', color: '#2f7a4d' }}
          >
            Accepted · CA created
          </span>
        ) : plan ? (
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(194,115,26,0.12)', color: '#c2731a' }}
          >
            Awaiting your review
          </span>
        ) : null}
      </div>

      {/* No plan state */}
      {!plan && !generating && (
        <div className="text-center py-6">
          <p className="text-[13px] text-[#6B7F96] mb-4">
            Generate a step-by-step correction plan grounded in the cited code section
            and your recent service history.
          </p>
          <button
            onClick={onGenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: GOLD }}
          >
            <Sparkles size={14} />
            Generate resolution plan
          </button>
        </div>
      )}

      {/* Loading state */}
      {generating && (
        <div className="space-y-3 py-4">
          <div className="h-4 w-3/4 rounded bg-[#1E2D4D]/5 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-[#1E2D4D]/5 animate-pulse" />
          <div className="h-20 w-full rounded bg-[#1E2D4D]/5 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-[#1E2D4D]/5 animate-pulse" />
          <p className="text-[11px] text-[#8A93A6] text-center mt-2">
            Analyzing code citation and service history...
          </p>
        </div>
      )}

      {/* Plan drafted / accepted */}
      {plan && !generating && (
        <>
          {/* (a) Drafted CA preview */}
          <div className="bg-white rounded-lg border border-[#E2DDD4] p-4 mb-4">
            <p
              className="text-[10px] uppercase font-bold tracking-[0.12em] mb-2"
              style={{ color: GOLD }}
            >
              {accepted ? 'CORRECTIVE ACTION CREATED' : 'DRAFTED CORRECTIVE ACTION · NOT YET CREATED'}
            </p>
            <p className="text-sm font-semibold" style={{ color: NAVY }}>
              {plan.drafted_ca_title}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-[10px] text-[#8A93A6] uppercase">Severity</p>
                <p className="text-[12px] font-medium" style={{ color: NAVY }}>
                  {plan.drafted_ca_severity}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#8A93A6] uppercase">Category</p>
                <p className="text-[12px] font-medium" style={{ color: NAVY }}>
                  {plan.drafted_ca_category}
                </p>
              </div>
              {plan.drafted_ca_due_date && (
                <div>
                  <p className="text-[10px] text-[#8A93A6] uppercase">Due date</p>
                  <p className="text-[12px] font-medium" style={{ color: NAVY }}>
                    {new Date(plan.drafted_ca_due_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* (b) Step-by-step plan */}
          <div className="mb-4">
            <p
              className="text-[10px] uppercase font-bold tracking-[0.12em] mb-2"
              style={{ color: '#8A93A6' }}
            >
              Step-by-step correction
            </p>
            <div className="divide-y divide-[#E2DDD4]">
              {plan.steps.map((step, i) => (
                <StepRow
                  key={step.id}
                  step={step}
                  index={i}
                  onComplete={() => onCompleteStep(step.id)}
                  accepted={accepted}
                />
              ))}
            </div>
          </div>

          {/* (c) AI disclaimer */}
          <div
            className="rounded-lg p-3 mb-4"
            style={{
              backgroundColor: '#fdfaf4',
              borderLeft: `3px solid ${GOLD}`,
            }}
          >
            <p className="text-[11px] text-[#6B7F96] leading-relaxed">
              <span className="font-semibold" style={{ color: GOLD }}>SUGGESTED PLAN</span> ·
              Generated from the cited code section and your kitchen&apos;s recent service history.
              Final correction must satisfy the inspecting authority. Review and edit before accepting.
            </p>
          </div>

          {/* (d) Action buttons */}
          {!accepted && (
            <div className="flex items-center gap-3">
              <button
                onClick={onAccept}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: GOLD }}
              >
                <Check size={14} />
                Accept & create corrective action
              </button>
              <button
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-[#8A93A6] border border-[#E2DDD4]"
              >
                <RefreshCw size={14} />
                Regenerate plan
              </button>
            </div>
          )}

          {/* Accepted link */}
          {accepted && plan.created_corrective_action_id && (
            <a
              href={`/corrective-actions/${plan.created_corrective_action_id}`}
              className="text-[12px] font-semibold"
              style={{ color: '#2f7a4d' }}
            >
              View corrective action →
            </a>
          )}
        </>
      )}
    </div>
  );
}
