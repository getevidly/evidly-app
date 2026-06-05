import { useAdvisorBriefings } from '../../../hooks/useAdvisorBriefings';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { BriefCard } from './BriefCard';

export function AdvisorSingleFire() {
  const { selectedLocationId } = useDashboardLocation();
  const { fire_safety, staleness } = useAdvisorBriefings(
    selectedLocationId ? { locationIdFilter: selectedLocationId } : undefined,
  );
  const { timezone } = useOrgSummary();
  return (
    <div className="advisor-single">
      <BriefCard variant="fire_safety" briefing={fire_safety} timezone={timezone} showItems isStale={staleness.fire_safety} />
    </div>
  );
}
