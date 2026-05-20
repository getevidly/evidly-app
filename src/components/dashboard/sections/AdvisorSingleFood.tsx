import { useAdvisorBriefings } from '../../../hooks/useAdvisorBriefings';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { BriefCard } from './BriefCard';

export function AdvisorSingleFood() {
  const { food_safety, staleness } = useAdvisorBriefings();
  const { timezone } = useOrgSummary();
  return (
    <div className="advisor-single">
      <BriefCard variant="food_safety" briefing={food_safety} timezone={timezone} showItems isStale={staleness.food_safety} />
    </div>
  );
}
