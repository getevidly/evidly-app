/**
 * AdvisorPair — C18 Phase 3
 *
 * Single-location mode: unchanged — cites location's EHD/AHJ.
 * All mode: each advisor aggregates its own pillar across locations.
 * Citation line shows "across N counties" when multi-county.
 */

import { useAdvisorBriefings } from '../../../hooks/useAdvisorBriefings';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { BriefCard } from './BriefCard';

export function AdvisorPair() {
  const { selectedLocationId, isMultiLocation } = useDashboardLocation();
  const { food_safety, fire_safety, staleness } = useAdvisorBriefings(
    selectedLocationId ? { locationIdFilter: selectedLocationId } : undefined,
  );
  const { timezone, countyCount } = useOrgSummary();

  const isAllMode = isMultiLocation && selectedLocationId === null;
  const scopeLine = isAllMode && countyCount > 1
    ? `across ${countyCount} counties`
    : undefined;

  return (
    <div>
      <div className="advisor-row">
        <BriefCard variant="food_safety" briefing={food_safety} timezone={timezone} showItems showConsult isStale={staleness.food_safety} />
        <BriefCard variant="fire_safety" briefing={fire_safety} timezone={timezone} showItems showConsult isStale={staleness.fire_safety} />
      </div>
      {scopeLine && (
        <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', margin: '-14px 0 18px', fontStyle: 'italic' }}>
          {scopeLine}
        </p>
      )}
    </div>
  );
}
