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
  const handledCount = (driftCatches || []).filter((d) => d.status === 'ack').length;

  // Tasks: filter by location in single-location mode
  const { totalToday, doneToday, loading: todayLoading } = useTodayList(
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
      <div className="prp-row">
        <Link to="/insights/operational-drift" className="prp predict" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <div className="prp-icon"><i className="ti ti-trending-up" /></div>
          <div>
            <p className="prp-label">What's Coming</p>
            {driftLoading ? (
              <p className="prp-num">—</p>
            ) : (
              <>
                <p className={`prp-num${foodDrift > 0 ? '' : ' steady'}`} style={{ fontSize: 18 }}>
                  Food: {foodDrift === 0 ? 'clear' : foodDrift}
                </p>
                <p className="prp-sub" style={{ marginTop: 2 }}>
                  {upcoming.total === 0 ? 'No services due soon' : `${upcoming.total} service${upcoming.total === 1 ? '' : 's'} due soon`}
                </p>
                <p className={`prp-num${fireDrift > 0 ? '' : ' steady'}`} style={{ fontSize: 18, marginTop: 2 }}>
                  Fire: {fireDrift === 0 ? 'clear' : fireDrift}
                </p>
              </>
            )}
            {driftSub && <p className="prp-sub">{driftSub}</p>}
          </div>
        </Link>
        <div className="prp reduce">
          <div className="prp-icon"><i className="ti ti-shield-check" /></div>
          <div>
            <p className="prp-label">What's Handled</p>
            <p className="prp-num">{todayLoading ? '—' : reducedCount}</p>
            <p className="prp-sub">{reduceSub}</p>
          </div>
        </div>
        <div className="prp prove">
          <div className="prp-icon"><i className="ti ti-file-check" /></div>
          <div>
            <p className="prp-label">What You Can Prove</p>
            {(proveLoading || docsLoading || tempLoading || todayLoading) ? (
              <p className="prp-num">—</p>
            ) : hasEvidence ? (
              <>
                <p className="prp-num">{proveDays}</p>
                <p className="prp-sub">{proveSub}</p>
                {docTotal > 0 && (
                  <p style={{ fontSize: 10, color: 'var(--muted)', margin: '2px 0 0' }}>
                    {docCurrent} of {docTotal} docs current
                    {expiringWithin30Days > 0 && ` · ${expiringWithin30Days} expire within 30 days`}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="prp-num steady">Start your record</p>
                <p className="prp-sub">Upload or log your first evidence</p>
              </>
            )}
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
