import { useAdvisorBriefings } from '../../../hooks/useAdvisorBriefings';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { BriefCard } from './BriefCard';

export function AdvisorSingleFood() {
  const { selectedLocationId } = useDashboardLocation();
  const { food_safety, staleness } = useAdvisorBriefings(
    selectedLocationId ? { locationIdFilter: selectedLocationId } : undefined,
  );
  const { timezone } = useOrgSummary();
  return (
    <div className="advisor-single">
      <BriefCard variant="food_safety" briefing={food_safety} timezone={timezone} showItems isStale={staleness.food_safety} />
    </div>
  );
}
