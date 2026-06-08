import { useEffect, useState } from 'react';
import { useAdvisorBriefings } from '../../../hooks/useAdvisorBriefings';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { supabase } from '../../../lib/supabase';
import { BriefCard } from './BriefCard';

export function AdvisorSingleFire() {
  const { selectedLocationId } = useDashboardLocation();
  const { fire_safety, staleness } = useAdvisorBriefings(
    selectedLocationId ? { locationIdFilter: selectedLocationId } : undefined,
  );
  const { timezone } = useOrgSummary();

  const [countyDept, setCountyDept] = useState<string | undefined>();
  useEffect(() => {
    if (!selectedLocationId) { setCountyDept(undefined); return; }
    let cancelled = false;
    supabase
      .from('locations')
      .select('jurisdictions(county, fire_ahj_name)')
      .eq('id', selectedLocationId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.jurisdictions) {
          const j = data.jurisdictions as { county: string; fire_ahj_name: string | null };
          setCountyDept(j.fire_ahj_name || `${j.county} County`);
        }
      });
    return () => { cancelled = true; };
  }, [selectedLocationId]);

  return (
    <div className="advisor-single">
      <BriefCard variant="fire_safety" briefing={fire_safety} timezone={timezone} showItems isStale={staleness.fire_safety} countyDepartment={countyDept} />
    </div>
  );
}
