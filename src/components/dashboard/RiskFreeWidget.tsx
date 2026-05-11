import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useRiskFreeEligibility } from '../../hooks/api/useRiskFreeEligibility';
import { RiskFreeStatusModal } from '../RiskFreeStatusModal';

/**
 * RiskFreeWidget — slim banner at the top of Dashboard.
 * ~50px tall. Only renders when overall_status === 'pending'.
 * Format: "Day X of 60 — [Criterion summary] · View details →"
 */
export function RiskFreeWidget() {
  const { data: eligibility, isLoading } = useRiskFreeEligibility();
  const [showModal, setShowModal] = useState(false);

  // Only show for pending status during the 60-day window
  if (isLoading || !eligibility || eligibility.overall_status !== 'pending') return null;

  const aLabel =
    eligibility.criterion_a_status === 'met'
      ? `Locations ${eligibility.locations_entered}/${eligibility.locations_required}`
      : eligibility.criterion_a_status === 'forfeited'
        ? 'Setup missed'
        : `Locations ${eligibility.locations_entered}/${eligibility.locations_required}`;

  const bLabel = `Activity ${eligibility.criterion_b_activity_days}/${eligibility.criterion_b_required_days} days`;

  return (
    <>
      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-lg"
        style={{
          backgroundColor: '#eef4f8',
          border: '1px solid #b8d4e8',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="h-4 w-4 text-[#3a6d8a] flex-shrink-0" />
          <span className="text-xs font-medium text-[#1E2D4D]/70 truncate">
            <span className="font-semibold text-[#1E2D4D]">Day {eligibility.days_elapsed} of 60</span>
            {' '}&mdash;{' '}
            {aLabel} &middot; {bLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="text-xs font-semibold text-[#3a6d8a] hover:text-[#1E2D4D] transition-colors flex-shrink-0 ml-3"
        >
          View details &rarr;
        </button>
      </div>

      <RiskFreeStatusModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        eligibility={eligibility}
      />
    </>
  );
}
