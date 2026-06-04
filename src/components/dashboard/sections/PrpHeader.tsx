/**
 * PrpHeader — C18 Phase 2
 *
 * Live PRP spine: three stat tiles wired to canonical data hooks,
 * plus temperature drift numeral below.
 *
 * Predict: unread critical/high signal count (useSignalNotifications)
 * Reduce:  open tasks today (useTodayList)
 * Prove:   days since org creation (useOrgAge)
 * Drift:   sensors failing (useTemperatureState)
 */

import { useAuth } from '../../../contexts/AuthContext';
import { useSignalNotifications } from '../../../hooks/useSignalNotifications';
import { useTodayList } from '../../../hooks/useTodayList';
import { useOrgAge } from '../../../hooks/useOrgAge';
import { useOrgSummary } from '../../../hooks/useOrgSummary';
import { useTemperatureState } from '../../../lib/canonicalQueries/temperature-state';

export function PrpHeader() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id || '';
  const { timezone } = useOrgSummary();

  const { criticalNotifications } = useSignalNotifications();
  const { totalToday, doneToday, loading: todayLoading } = useTodayList();
  const { daysSinceCreate, loading: ageLoading } = useOrgAge();
  const { data: tempData, isLoading: tempLoading } = useTemperatureState({
    orgId,
    tz: timezone,
  });

  const predictCount = criticalNotifications.length;
  const openToday = Math.max(totalToday - doneToday, 0);
  const driftCount = tempData?.counts?.failing ?? 0;

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
            <p className="prp-sub">
              {predictCount === 0
                ? 'no unread signals'
                : `unread signal${predictCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="prp reduce">
          <div className="prp-icon"><i className="ti ti-shield-check" /></div>
          <div>
            <p className="prp-label">Reduce</p>
            <p className="prp-num">{todayLoading ? '—' : openToday}</p>
            <p className="prp-sub">open today</p>
          </div>
        </div>
        <div className="prp prove">
          <div className="prp-icon"><i className="ti ti-file-check" /></div>
          <div>
            <p className="prp-label">Prove</p>
            <p className="prp-num">{ageLoading ? '—' : daysSinceCreate}</p>
            <p className="prp-sub">days since go-live</p>
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
