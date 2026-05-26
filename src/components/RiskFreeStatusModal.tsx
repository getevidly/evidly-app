import { X, CheckCircle2, AlertTriangle, Clock, MapPin, CalendarCheck } from 'lucide-react';
import { Modal } from './ui/Modal';
import type { RiskFreeEligibility } from '../hooks/api/useRiskFreeEligibility';

interface RiskFreeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  eligibility: RiskFreeEligibility | null;
}

function StatusBadge({ status }: { status: 'pending' | 'met' | 'forfeited' }) {
  if (status === 'met') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="h-3 w-3" /> Met
      </span>
    );
  }
  if (status === 'forfeited') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
        <AlertTriangle className="h-3 w-3" /> Forfeited
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <Clock className="h-3 w-3" /> In Progress
    </span>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-2 bg-[#1E2D4D]/10 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          backgroundColor: pct >= 100 ? '#059669' : '#A08C5A',
        }}
      />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function PendingContent({ e }: { e: RiskFreeEligibility }) {
  return (
    <>
      {/* Window progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-[#1E2D4D]/60">
            Day {e.days_elapsed} of 45
          </span>
          <span className="text-xs font-medium text-[#1E2D4D]/60">
            {e.days_remaining} days remaining
          </span>
        </div>
        <ProgressBar value={e.days_elapsed} max={45} />
      </div>

      {/* Criterion A — Locations */}
      <div className="rounded-lg border border-[#E5E0D8] p-4 mb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#1E2D4D]/50" />
            <span className="text-sm font-semibold text-[#1E2D4D]">Location Setup</span>
          </div>
          <StatusBadge status={e.criterion_a_status} />
        </div>
        <p className="text-xs text-[#1E2D4D]/60 mb-2">
          Enter all declared locations within 15 days of signup.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#1E2D4D]/70">
            {e.locations_entered} of {e.locations_required} location{e.locations_required !== 1 ? 's' : ''} entered
          </span>
          <span className="text-xs text-[#1E2D4D]/50">
            Deadline: {formatDate(e.setup_deadline)}
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={e.locations_entered} max={e.locations_required} />
        </div>
      </div>

      {/* Criterion B — Activity */}
      <div className="rounded-lg border border-[#E5E0D8] p-4 mb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-[#1E2D4D]/50" />
            <span className="text-sm font-semibold text-[#1E2D4D]">Food Safety Activity</span>
          </div>
          <StatusBadge status={e.criterion_b_status} />
        </div>
        <p className="text-xs text-[#1E2D4D]/60 mb-2">
          Log food safety activity on at least {e.criterion_b_required_days} days within the 45-day window.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#1E2D4D]/70">
            {e.criterion_b_activity_days} of {e.criterion_b_required_days} days logged
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={e.criterion_b_activity_days} max={e.criterion_b_required_days} />
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-[#eef4f8] p-3 text-xs text-[#3a6d8a]">
        Meet both criteria and remain dissatisfied? You can request a full refund of subscription fees at any time within the 45-day window.
      </div>
    </>
  );
}

function EligibleContent({ e }: { e: RiskFreeEligibility }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1E2D4D]">Both criteria met</p>
          <p className="text-xs text-[#1E2D4D]/60">Locations setup complete. Activity threshold reached.</p>
        </div>
      </div>

      <div className="rounded-lg bg-[#eef4f8] p-4 mb-4 text-sm text-[#1E2D4D]/80 leading-relaxed">
        You're fully eligible. Your Money-Back Guarantee is active through{' '}
        <strong>{formatDate(e.guarantee_window_end)}</strong>. If EvidLY isn't right for you,
        you can request a full refund of subscription fees at any
        time before {formatDate(e.guarantee_window_end)}. Otherwise, no action needed — keep
        using the system.
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            // onClose is handled by parent — this is the primary CTA
            const closeBtn = document.querySelector('[data-rfm-close]') as HTMLButtonElement;
            closeBtn?.click();
          }}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#1E2D4D] text-white hover:bg-[#162340] transition-colors"
        >
          Continue using EvidLY
        </button>
        <a
          href="mailto:support@getevidly.com?subject=Risk-Free%20Guarantee%20Refund%20Request"
          className="text-xs font-medium text-[#1E2D4D]/50 hover:text-[#1E2D4D]/70 underline transition-colors"
        >
          Request refund
        </a>
      </div>
    </>
  );
}

function ForfeitedContent({ e }: { e: RiskFreeEligibility }) {
  const forfeitedCriterion =
    e.criterion_a_status === 'forfeited' && e.criterion_b_status === 'forfeited'
      ? 'both criteria'
      : e.criterion_a_status === 'forfeited'
        ? 'location setup (not completed within 15 days)'
        : 'food safety activity (fewer than ' + e.criterion_b_required_days + ' days logged)';

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1E2D4D]">Guarantee forfeited</p>
          <p className="text-xs text-[#1E2D4D]/60">
            Forfeited due to {forfeitedCriterion}.
          </p>
        </div>
      </div>

      {/* Criterion cards for reference */}
      <div className="space-y-2 mb-4">
        <div className="rounded-lg border border-[#E5E0D8] p-3 flex items-center justify-between">
          <span className="text-xs text-[#1E2D4D]/70">Location Setup</span>
          <StatusBadge status={e.criterion_a_status} />
        </div>
        <div className="rounded-lg border border-[#E5E0D8] p-3 flex items-center justify-between">
          <span className="text-xs text-[#1E2D4D]/70">Food Safety Activity ({e.criterion_b_activity_days}/{e.criterion_b_required_days} days)</span>
          <StatusBadge status={e.criterion_b_status} />
        </div>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
        You can continue using EvidLY or cancel your subscription at any time via Billing Settings. Standard cancellation terms apply — no refund available outside the Risk-Free window.
      </div>

      <div className="mt-3 text-center">
        <a
          href="mailto:support@getevidly.com?subject=Risk-Free%20Guarantee%20Question"
          className="text-xs font-medium text-[#1E2D4D]/50 hover:text-[#1E2D4D]/70 underline transition-colors"
        >
          Questions? Contact support@getevidly.com
        </a>
      </div>
    </>
  );
}

export function RiskFreeStatusModal({ isOpen, onClose, eligibility }: RiskFreeStatusModalProps) {
  if (!eligibility) return null;

  const headerText =
    eligibility.overall_status === 'eligible'
      ? 'Risk-Free Guarantee — Active'
      : eligibility.overall_status === 'forfeited'
        ? 'Risk-Free Guarantee — No Longer Available'
        : 'Your Risk-Free Guarantee Status';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight text-[#1E2D4D]">{headerText}</h2>
          <button
            type="button"
            data-rfm-close
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#1E2D4D]/5 transition-colors"
          >
            <X className="h-5 w-5 text-[#1E2D4D]/40" />
          </button>
        </div>

        {eligibility.overall_status === 'pending' && <PendingContent e={eligibility} />}
        {eligibility.overall_status === 'eligible' && <EligibleContent e={eligibility} />}
        {eligibility.overall_status === 'forfeited' && <ForfeitedContent e={eligibility} />}
      </div>
    </Modal>
  );
}
