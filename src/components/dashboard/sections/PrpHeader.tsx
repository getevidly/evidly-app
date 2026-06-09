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
import { useSignalNotifications } from '../../../hooks/useSignalNotifications';
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

  // Signals are org-wide (notifications table has no location_id)
  const { criticalNotifications } = useSignalNotifications();

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

  const predictCount = criticalNotifications.length;
  const openToday = Math.max(totalToday - doneToday, 0);
  const driftCount = tempData?.counts?.failing ?? 0;
  const sensorTotal = tempData?.counts?.total ?? 0;

  // Evidence gate: documents, sensors, OR completed tasks count as proof on file
  const hasEvidence = docTotal > 0 || sensorTotal > 0 || doneToday > 0;

  // Scope labels for All mode
  const locCount = locations.length;
  const reduceSub = isAllMode
    ? `Open today · across ${locCount} locations`
    : 'Open today';
  const predictSub = predictCount === 0
    ? ''
    : isAllMode
      ? `Unread · across ${locCount} locations`
      : 'Unread';
  const proveSub = isAllMode
    ? 'Earliest location'
    : 'Days since go-live';

  return (
    <div>
      <div className="prp-accent" />
      <div className="prp-row">
        <div className="prp predict">
          <div className="prp-icon"><i className="ti ti-trending-up" /></div>
          <div>
            <p className="prp-label">What's Coming</p>
            <p className={`prp-num${predictCount === 0 ? ' steady' : ''}`}>
              {predictCount === 0 ? (orgDays <= 1 ? 'Nothing yet' : 'Nothing new') : predictCount}
            </p>
            {predictSub && <p className="prp-sub">{predictSub}</p>}
          </div>
        </div>
        <div className="prp reduce">
          <div className="prp-icon"><i className="ti ti-shield-check" /></div>
          <div>
            <p className="prp-label">What's Handled</p>
            <p className="prp-num">{todayLoading ? '—' : openToday}</p>
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
      {tempLoading ? (
        <div className="prp-drift drift-clear">
          <i className="ti ti-temperature" />
          <span className="drift-num">—</span>
          <span className="drift-label">loading sensor data</span>
        </div>
      ) : sensorTotal === 0 ? (
        <div className="prp-drift drift-clear" style={{ opacity: 0.7 }}>
          <i className="ti ti-temperature" />
          <span className="drift-label">
            No equipment added yet · <Link to="/equipment" style={{ color: 'inherit', textDecoration: 'underline' }}>Add equipment</Link>
          </span>
        </div>
      ) : driftCount > 0 ? (
        <div className="prp-drift drift-alert">
          <i className="ti ti-temperature" />
          <span className="drift-num">{driftCount}</span>
          <span className="drift-label">sensor{driftCount !== 1 ? 's' : ''} out of range</span>
        </div>
      ) : (
        <div className="prp-drift drift-clear">
          <i className="ti ti-temperature" />
          <span className="drift-label">all {sensorTotal} sensor{sensorTotal !== 1 ? 's' : ''} in range</span>
        </div>
      )}
    </div>
  );
}
