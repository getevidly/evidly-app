/**
 * ComplianceBriefing — C18 Phase 3
 *
 * Single-location mode: unchanged.
 * All mode: citation shows "across N counties" when multi-county.
 */

import { useAdvisorBriefings } from '../../../hooks/useAdvisorBriefings';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { BriefCard } from './BriefCard';

export function ComplianceBriefing() {
  const { compliance_officer, staleness } = useAdvisorBriefings();
  const { timezone, countyCount } = useOrgSummary();
  const { selectedLocationId, isMultiLocation } = useDashboardLocation();

  const isAllMode = isMultiLocation && selectedLocationId === null;
  const scopeLine = isAllMode && countyCount > 1
    ? `across ${countyCount} counties`
    : undefined;

  return (
    <div>
      <div className="compliance-row">
        <BriefCard variant="compliance_officer" briefing={compliance_officer} timezone={timezone} showItems={false} isStale={staleness.compliance_officer} />
      </div>
      {scopeLine && (
        <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', margin: '-14px 0 18px', fontStyle: 'italic' }}>
          Compliance read {scopeLine}
        </p>
      )}
    </div>
  );
}
