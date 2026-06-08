import { useEffect, useState } from 'react';
import { useAdvisorBriefings } from '../../../hooks/useAdvisorBriefings';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { supabase } from '../../../lib/supabase';
import { BriefCard } from './BriefCard';

export function AdvisorSingleFood() {
  const { selectedLocationId } = useDashboardLocation();
  const { food_safety, staleness } = useAdvisorBriefings(
    selectedLocationId ? { locationIdFilter: selectedLocationId } : undefined,
  );
  const { timezone } = useOrgSummary();

  const [countyDept, setCountyDept] = useState<string | undefined>();
  useEffect(() => {
    if (!selectedLocationId) { setCountyDept(undefined); return; }
    let cancelled = false;
    supabase
      .from('locations')
      .select('jurisdictions(county, agency_name)')
      .eq('id', selectedLocationId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.jurisdictions) {
          const j = data.jurisdictions as { county: string; agency_name: string };
          setCountyDept(j.agency_name || `${j.county} County`);
        }
      });
    return () => { cancelled = true; };
  }, [selectedLocationId]);

  return (
    <div className="advisor-single">
      <BriefCard variant="food_safety" briefing={food_safety} timezone={timezone} showItems isStale={staleness.food_safety} countyDepartment={countyDept} />
    </div>
  );
}
