import { useAdvisorBriefings } from '../../../hooks/useAdvisorBriefings';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { BriefCard } from './BriefCard';

export function AdvisorSingleFire() {
  const { fire_safety } = useAdvisorBriefings();
  const { timezone } = useOrgSummary();
  return (
    <div className="advisor-single">
      <BriefCard variant="fire_safety" briefing={fire_safety} timezone={timezone} showItems />
    </div>
  );
}
