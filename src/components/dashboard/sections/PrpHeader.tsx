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
import { useOnboardingState } from '../../../hooks/onboarding/useOnboardingState';
import { useWhatsAtRisk } from '../../../hooks/useWhatsAtRisk';
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
  const { foodSafety: proveFood, fireSafety: proveFire, loading: onboardingLoading } = useOnboardingState();
  const risk = useWhatsAtRisk(selectedLocationId);
  const rMoney = (n: number) => {
    const v = Math.round(n);
    if (v >= 1000000) return '$' + (v/1000000).toFixed(1).replace(/\.0$/,'') + 'M';
    if (v >= 1000) return '$' + (v/1000).toFixed(1).replace(/\.0$/,'') + 'k';
    return '$' + v.toLocaleString();
  };
  const rRange = (lo: number, hi: number) => rMoney(lo) + '–' + rMoney(hi);
  const riskLine = (pr: typeof risk.food) => {
    const stillLo = pr.pending.low + pr.live.low, stillHi = pr.pending.high + pr.live.high;
    return {
      total: pr.counts.total,
      clear: pr.counts.total > 0 && stillHi === 0,
      still: rRange(stillLo, stillHi),
      hasLive: pr.live.high > 0,
      live: rRange(pr.live.low, pr.live.high) + ' live · ' + pr.counts.live + ' overdue',
      hasReduced: pr.reduced.high > 0,
      reduced: '↓ ' + rRange(pr.reduced.low, pr.reduced.high) + ' reduced',
    };
  };
  const rFood = riskLine(risk.food);
  const rFire = riskLine(risk.fire);
  const proveCell = (c: number, t: number) => {
    if (t === 0) return { show: '\u2014', sub: 'No county requirements set', short: false, complete: false };
    return { show: `${c} of ${t}`, sub: c === t ? 'County requirements met' : `${t - c} to complete \u00B7 county`, short: c !== t, complete: c === t };
  };
  const proveFireCell = proveCell(proveFire?.completedCount ?? 0, proveFire?.totalCount ?? 0);
  const proveFoodCell = proveCell(proveFood?.completedCount ?? 0, proveFood?.totalCount ?? 0);

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
        <Link to="/insights/operational-drift" className="prp reduce prp-lite" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <div>
            <p className="prp-label prp-lite-label">What's Handled</p>
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
        </Link>

        {/* PROVE — real county requirement coverage per pillar */}
        <div className="prp prove prp-lite">
            <p className="prp-label prp-lite-label">What's Proven</p>
            {onboardingLoading ? (
              <p className="prp-num prp-lite-num">—</p>
            ) : (
              <>
                <div className="prp-pillar">
                  <div className="prp-pline"><span className="prp-pk">Fire</span><span className="prp-lite-num" style={{ color: proveFireCell.short ? '#B8823A' : '#1E2D4D' }}>{proveFireCell.show}</span>{proveFireCell.complete && <span className="prp-dot" style={{ background: '#3E9E7A' }} />}</div>
                  <p className="prp-pdet">{proveFireCell.sub}</p>
                </div>
                <div className="prp-pillar">
                  <div className="prp-pline"><span className="prp-pk">Food</span><span className="prp-lite-num" style={{ color: proveFoodCell.short ? '#B8823A' : '#1E2D4D' }}>{proveFoodCell.show}</span>{proveFoodCell.complete && <span className="prp-dot" style={{ background: '#3E9E7A' }} />}</div>
                  <p className="prp-pdet">{proveFoodCell.sub}</p>
                </div>
                <p className="prp-pdet" style={{ marginLeft: 0, marginTop: 8, color: '#B0A99A' }}>Insurance coverage — coming</p>
              </>
            )}
        </div>

        {/* WHAT'S AT RISK — residual exposure from useWhatsAtRisk */}
        <Link to="/insights/whats-at-risk" className="prp prp-lite" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <div>
            <p className="prp-label prp-lite-label">What’s at Risk</p>
            {risk.loading ? (
              <p className="prp-num prp-lite-num">—</p>
            ) : (
              <>
                <div className="prp-pillar">
                  <div className="prp-pline"><span className="prp-pk">Food</span><span className="prp-lite-num" style={{ fontSize: 15, color: rFood.hasLive ? '#B4472E' : '#1E2D4D' }}>{rFood.clear ? 'Clear' : rFood.still}</span></div>
                  {rFood.hasLive && <p className="prp-pdet" style={{ color: '#B4472E', fontWeight: 600 }}>{rFood.live}</p>}
                  {rFood.hasReduced && <p className="prp-pdet" style={{ color: '#3E9E7A' }}>{rFood.reduced}</p>}
                </div>
                <div className="prp-pillar">
                  <div className="prp-pline"><span className="prp-pk">Fire</span><span className="prp-lite-num" style={{ fontSize: 15, color: rFire.hasLive ? '#B4472E' : '#1E2D4D' }}>{rFire.clear ? 'Clear' : rFire.still}</span></div>
                  {rFire.hasLive && <p className="prp-pdet" style={{ color: '#B4472E', fontWeight: 600 }}>{rFire.live}</p>}
                  {rFire.hasReduced && <p className="prp-pdet" style={{ color: '#3E9E7A' }}>{rFire.reduced}</p>}
                </div>
                {risk.isPlaceholder && <p className="prp-pdet" style={{ marginLeft: 0, marginTop: 8, color: '#B0A99A' }}>Illustrative · casual</p>}
              </>
            )}
          </div>
        </Link>

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
