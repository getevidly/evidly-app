/**
 * PrpHeader — C18 Phase 3
 *
 * Live PRP spine: three stat tiles + temperature drift numeral.
 * Multi-location aware via DashboardLocationContext.
 *
 * All mode: aggregate numerals with "across N locations" scope labels.
 *   Prove = earliest location's days since go-live.
 * Single-location mode: filter hooks by selected locationId.
 * Single-location org: identical to pre-Phase 3 behavior.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { useOpenDriftCounts } from '../../../hooks/useOpenDriftCounts';
import { useUpcomingServices } from '../../../hooks/useUpcomingServices';
import { useDriftCatches } from '../../../hooks/useDriftCatches';
import { useTodayList } from '../../../hooks/useTodayList';
import { useOrgAge } from '../../../hooks/useOrgAge';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { useTemperatureState } from '../../../lib/canonicalQueries/temperature-state';
import { useDocumentsSummary } from '../../../hooks/useDocumentsSummary';

export function PrpHeader() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id || '';
  const { timezone } = useOrgSummary();
  const { selectedLocationId, locations, isMultiLocation } = useDashboardLocation();

  const isAllMode = isMultiLocation && selectedLocationId === null;

  // Drift counts — pillar-split, NEVER summed
  const { foodCount: foodDrift, fireCount: fireDrift, loading: driftLoading } = useOpenDriftCounts(selectedLocationId);
  const upcoming = useUpcomingServices(14, selectedLocationId);
  const { catches: driftCatches } = useDriftCatches();

  // Tasks: filter by location in single-location mode
  const { items: todayItems, totalToday, doneToday, loading: todayLoading } = useTodayList(
    selectedLocationId ? { locationIdFilter: selectedLocationId } : undefined
  );

  // Org age or location age for Prove
  const { daysSinceCreate: orgDays, loading: ageLoading } = useOrgAge();

  // In All mode, Prove = earliest location's days since go-live
  let proveDays = orgDays;
  let proveLoading = ageLoading;
  if (isAllMode && locations.length > 0) {
    const earliest = locations.reduce((min, loc) => {
      const t = new Date(loc.created_at).getTime();
      return t < min ? t : min;
    }, Infinity);
    proveDays = Math.max(0, Math.floor((Date.now() - earliest) / 86_400_000));
    proveLoading = false;
  } else if (selectedLocationId && locations.length > 0) {
    const loc = locations.find(l => l.id === selectedLocationId);
    if (loc) {
      proveDays = Math.max(0, Math.floor((Date.now() - new Date(loc.created_at).getTime()) / 86_400_000));
      proveLoading = false;
    }
  }

  // Temperature: filter by location
  const { data: tempData, isLoading: tempLoading } = useTemperatureState({
    orgId,
    tz: timezone,
    locationFilter: selectedLocationId || undefined,
  });

  // Documents count for Prove tile evidence gate + secondary lines
  const { current: docCurrent, total: docTotal, expiringWithin30Days, loading: docsLoading } = useDocumentsSummary({
    locationIdFilter: selectedLocationId || undefined,
  });

  const openToday = Math.max(totalToday - doneToday, 0);
  // REDUCE = findings handled (acknowledged) this period
  const reducedCount = handledCount;

  // -- Per-pillar splits (Fire / Food -- never summed) --
  const _openTasks = (todayItems || []).filter((i) => i.status !== 'done');
  const _foodTasks = _openTasks.filter((i) => i.pillar === 'food_safety');
  const _fireTasks = _openTasks.filter((i) => i.pillar === 'fire_safety');
  const _taskDet = (arr: typeof _openTasks) => [
    arr.filter((i) => i.kind === 'checklist').length ? `${arr.filter((i) => i.kind === 'checklist').length} checklist${arr.filter((i) => i.kind === 'checklist').length === 1 ? '' : 's'}` : '',
    arr.filter((i) => i.kind === 'reading').length ? `${arr.filter((i) => i.kind === 'reading').length} temp log${arr.filter((i) => i.kind === 'reading').length === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ');
  // Predict per pillar: Fire leans services, Food leans daily ops -- but show both counts honestly
  const predictFire = _fireTasks.length + upcoming.fire;
  const predictFood = _foodTasks.length + upcoming.food;
  const predictFireDet = [_taskDet(_fireTasks), upcoming.fire ? `${upcoming.fire} service${upcoming.fire === 1 ? '' : 's'} due` : ''].filter(Boolean).join(' · ') || 'Nothing coming';
  const predictFoodDet = [_taskDet(_foodTasks), upcoming.food ? `${upcoming.food} service${upcoming.food === 1 ? '' : 's'} due` : ''].filter(Boolean).join(' · ') || 'Nothing coming';
  // Reduce per pillar: acknowledged drifts
  const _ack = (driftCatches || []).filter((d) => d.status === 'ack');
  const reduceFire = _ack.filter((d) => d.pillar === 'fire_safety').length;
  const reduceFood = _ack.filter((d) => d.pillar === 'food_safety').length;
  const driftCount = tempData?.counts?.failing ?? 0;
  const sensorTotal = tempData?.counts?.total ?? 0;

  // Evidence gate: documents, sensors, OR completed tasks count as proof on file
  const hasEvidence = docTotal > 0 || sensorTotal > 0 || doneToday > 0;

  // Scope labels for All mode
  const locCount = locations.length;
  const reduceSub = isAllMode
    ? `Open today · across ${locCount} locations`
    : 'Open today';
  const driftSub = (foodDrift > 0 || fireDrift > 0)
    ? (isAllMode ? `Open drift · across ${locCount} locations` : 'Open drift')
    : '';
  const proveSub = isAllMode
    ? 'Earliest location'
    : 'Days since go-live';

  return (
    <div>
            <div className="prp-accent" />
      <div className="prp-row prp-grid-2x2">

        {/* PREDICT */}
        <Link to="/insights/operational-drift" className="prp predict prp-lite" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <div>
            <p className="prp-label prp-lite-label">What’s Coming</p>
            {(driftLoading || todayLoading || upcoming.loading) ? (
              <p className="prp-num prp-lite-num">—</p>
            ) : (
              <>
                <div className="prp-pillar">
                  <div className="prp-pline"><span className="prp-pk">Fire</span><span className="prp-lite-num" style={{ color: predictFire > 0 ? '#B8823A' : '#1E2D4D' }}>{predictFire}</span></div>
                  <p className="prp-pdet">{predictFireDet}</p>
                </div>
                <div className="prp-pillar">
                  <div className="prp-pline"><span className="prp-pk">Food</span><span className="prp-lite-num" style={{ color: predictFood > 0 ? '#B8823A' : '#1E2D4D' }}>{predictFood}</span></div>
                  <p className="prp-pdet">{predictFoodDet}</p>
                </div>
              </>
            )}
          </div>
        </Link>

        {/* REDUCE */}
        <div className="prp reduce prp-lite">
          <div>
            <p className="prp-label prp-lite-label">What’s Handled</p>
            {todayLoading ? (
              <p className="prp-num prp-lite-num">—</p>
            ) : (
              <>
                <div className="prp-pillar">
                  <div className="prp-pline"><span className="prp-pk">Fire</span><span className="prp-lite-num">{reduceFire}</span></div>
                  <p className="prp-pdet">Acknowledged &amp; acted on</p>
                </div>
                <div className="prp-pillar">
                  <div className="prp-pline"><span className="prp-pk">Food</span><span className="prp-lite-num">{reduceFood}</span></div>
                  <p className="prp-pdet">Acknowledged &amp; acted on</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* PROVE — honest interim: real docs-current, NOT a fabricated county-insurance fraction */}
        <div className="prp prove prp-lite">
          <div>
            <p className="prp-label prp-lite-label">What You Can Prove</p>
            {(proveLoading || docsLoading || tempLoading || todayLoading) ? (
              <p className="prp-num prp-lite-num">—</p>
            ) : hasEvidence ? (
              <>
                <div className="prp-pline"><span className="prp-lite-num">{docCurrent}<span style={{ fontSize: 13, fontWeight: 400, color: '#B4AEB8' }}> of {docTotal}</span></span>{docTotal > 0 && docCurrent === docTotal && <span className="prp-dot" style={{ background: '#3E9E7A' }} />}</div>
                <p className="prp-pdet" style={{ marginLeft: 0 }}>Records current{expiringWithin30Days > 0 ? ` · ${expiringWithin30Days} expiring` : ''}</p>
                <p className="prp-pdet" style={{ marginLeft: 0, marginTop: 6, color: '#B0A99A' }}>Coverage scoring coming soon</p>
              </>
            ) : (
              <>
                <p className="prp-num steady prp-lite-num">Start your record</p>
                <p className="prp-pdet" style={{ marginLeft: 0 }}>Upload or log your first evidence</p>
              </>
            )}
          </div>
        </div>

        {/* INTELLIGENCE — placeholder; feeds wired after the deep-dig audit */}
        <div className="prp prp-lite">
          <div>
            <p className="prp-label prp-lite-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Intelligence</span>
              <Link to="/insights/intelligence" style={{ fontSize: 10, fontWeight: 600, color: '#A08C5A', textTransform: 'none', letterSpacing: 0, textDecoration: 'none' }}>Open ›</Link>
            </p>
            <p className="prp-pdet" style={{ marginLeft: 0, marginTop: 4 }}>Risk, benchmarks, and regulatory signals for your kitchen.</p>
            <p className="prp-pdet" style={{ marginLeft: 0, marginTop: 8, color: '#B0A99A' }}>Signals arriving soon</p>
          </div>
        </div>

      </div>
      {/* Sensor strip: only show loading and failing states; suppress no-equipment and all-clear noise */}
      {tempLoading ? (
        <div className="prp-drift drift-clear">
          <i className="ti ti-temperature" />
          <span className="drift-num">—</span>
          <span className="drift-label">loading sensor data</span>
        </div>
      ) : driftCount > 0 ? (
        <div className="prp-drift drift-alert">
          <i className="ti ti-temperature" />
          <span className="drift-num">{driftCount}</span>
          <span className="drift-label">sensor{driftCount !== 1 ? 's' : ''} out of range</span>
        </div>
      ) : null}
    </div>
  );
}
