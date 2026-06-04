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

import { useAuth } from '../../../contexts/AuthContext';
import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { useSignalNotifications } from '../../../hooks/useSignalNotifications';
import { useTodayList } from '../../../hooks/useTodayList';
import { useOrgAge } from '../../../hooks/useOrgAge';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { useTemperatureState } from '../../../lib/canonicalQueries/temperature-state';

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

  const predictCount = criticalNotifications.length;
  const openToday = Math.max(totalToday - doneToday, 0);
  const driftCount = tempData?.counts?.failing ?? 0;

  // Scope labels for All mode
  const locCount = locations.length;
  const reduceSub = isAllMode
    ? `open today · across ${locCount} locations`
    : 'open today';
  const predictSub = predictCount === 0
    ? 'no unread signals'
    : isAllMode
      ? `unread signal${predictCount !== 1 ? 's' : ''} · across ${locCount} locations`
      : `unread signal${predictCount !== 1 ? 's' : ''}`;
  const proveSub = isAllMode
    ? 'earliest location'
    : 'days since go-live';

  return (
    <div>
      <div className="prp-accent" />
      <div className="prp-row">
        <div className="prp predict">
          <div className="prp-icon"><i className="ti ti-trending-up" /></div>
          <div>
            <p className="prp-label">Predict</p>
            <p className={`prp-num${predictCount === 0 ? ' steady' : ''}`}>
              {predictCount === 0 ? 'all steady' : predictCount}
            </p>
            <p className="prp-sub">{predictSub}</p>
          </div>
        </div>
        <div className="prp reduce">
          <div className="prp-icon"><i className="ti ti-shield-check" /></div>
          <div>
            <p className="prp-label">Reduce</p>
            <p className="prp-num">{todayLoading ? '—' : openToday}</p>
            <p className="prp-sub">{reduceSub}</p>
          </div>
        </div>
        <div className="prp prove">
          <div className="prp-icon"><i className="ti ti-file-check" /></div>
          <div>
            <p className="prp-label">Prove</p>
            <p className="prp-num">{proveLoading ? '—' : proveDays}</p>
            <p className="prp-sub">{proveSub}</p>
          </div>
        </div>
      </div>
      <div className={`prp-drift${driftCount > 0 ? ' drift-alert' : ' drift-clear'}`}>
        <i className="ti ti-temperature" />
        <span className="drift-num">{tempLoading ? '—' : driftCount}</span>
        <span className="drift-label">
          {tempLoading
            ? 'loading sensor data'
            : driftCount === 0
              ? 'all sensors in range'
              : `sensor${driftCount !== 1 ? 's' : ''} out of range`}
        </span>
      </div>
    </div>
  );
}
