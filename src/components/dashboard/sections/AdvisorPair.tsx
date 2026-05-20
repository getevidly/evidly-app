import { useAdvisorBriefings } from '../../../hooks/useAdvisorBriefings';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { BriefCard } from './BriefCard';

export function AdvisorPair() {
  const { food_safety, fire_safety, staleness } = useAdvisorBriefings();
  const { timezone } = useOrgSummary();
  return (
    <div className="advisor-row">
      <BriefCard variant="food_safety" briefing={food_safety} timezone={timezone} showItems showConsult isStale={staleness.food_safety} />
      <BriefCard variant="fire_safety" briefing={fire_safety} timezone={timezone} showItems showConsult isStale={staleness.fire_safety} />
    </div>
  );
}
