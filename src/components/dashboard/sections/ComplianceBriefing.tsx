import { useAdvisorBriefings } from '../../../hooks/useAdvisorBriefings';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { BriefCard } from './BriefCard';

export function ComplianceBriefing() {
  const { compliance_officer, staleness } = useAdvisorBriefings();
  const { timezone } = useOrgSummary();
  return (
    <div className="compliance-row">
      <BriefCard variant="compliance_officer" briefing={compliance_officer} timezone={timezone} showItems={false} isStale={staleness.compliance_officer} />
    </div>
  );
}
