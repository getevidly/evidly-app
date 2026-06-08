/**
 * AdvisorPair — C18 Phase 3
 *
 * Single-location mode: unchanged — cites location's EHD/AHJ.
 * All mode: each advisor aggregates its own pillar across locations.
 * Citation line shows "across N counties" when multi-county.
 */

import { useEffect, useState } from 'react';
import { useAdvisorBriefings } from '../../../hooks/useAdvisorBriefings';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { supabase } from '../../../lib/supabase';
import { BriefCard } from './BriefCard';

interface JurisdictionDepts {
  food: string;
  fire: string;
}

export function AdvisorPair() {
  const { selectedLocationId, isMultiLocation } = useDashboardLocation();
  const { food_safety, fire_safety, staleness, regenFailed } = useAdvisorBriefings(
    selectedLocationId ? { locationIdFilter: selectedLocationId } : undefined,
  );
  const { timezone, countyCount } = useOrgSummary();

  // Fetch selected location's jurisdiction county/department names
  const [depts, setDepts] = useState<JurisdictionDepts | null>(null);
  useEffect(() => {
    if (!selectedLocationId) { setDepts(null); return; }
    let cancelled = false;
    supabase
      .from('locations')
      .select('jurisdictions(county, agency_name, fire_ahj_name)')
      .eq('id', selectedLocationId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.jurisdictions) {
          const j = data.jurisdictions as { county: string; agency_name: string; fire_ahj_name: string | null };
          setDepts({ food: j.agency_name || `${j.county} County`, fire: j.fire_ahj_name || `${j.county} County` });
        }
      });
    return () => { cancelled = true; };
  }, [selectedLocationId]);

  const isAllMode = isMultiLocation && selectedLocationId === null;
  const scopeLine = isAllMode && countyCount > 1
    ? `across ${countyCount} counties`
    : undefined;

  return (
    <div>
      <div className="advisor-row">
        <BriefCard variant="food_safety" briefing={food_safety} timezone={timezone} showItems showConsult isStale={staleness.food_safety} countyDepartment={depts?.food} regenFailed={regenFailed} />
        <BriefCard variant="fire_safety" briefing={fire_safety} timezone={timezone} showItems showConsult isStale={staleness.fire_safety} countyDepartment={depts?.fire} regenFailed={regenFailed} />
      </div>
      {scopeLine && (
        <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', margin: '-14px 0 18px', fontStyle: 'italic' }}>
          {scopeLine}
        </p>
      )}
    </div>
  );
}
