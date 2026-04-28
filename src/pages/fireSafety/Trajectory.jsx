import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import PillarToggle from '../../components/pillars/PillarToggle';
import { Breadcrumb } from '../../components/Breadcrumb';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';

/** Wrap a Supabase query promise with a 5-second timeout */
function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), ms)),
  ]);
}

const TIME_RANGES = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last 12 months', days: 365 },
];

const METRIC_OPTIONS = [
  { value: 'pse_completion', label: 'PSE test completion' },
  { value: 'resolution_time', label: 'Findings resolution time' },
  { value: 'opened', label: 'Findings opened' },
  { value: 'closed', label: 'Findings closed' },
];

const OPEN_STATUSES_EXCLUDE = ['resolved', 'verified', 'closed', 'archived'];

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function StatCard({ title, value, subtitle, emptyText, loading: cardLoading }) {
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '20px', flex: '1 1 0', minWidth: '200px' }}>
      <div style={{ fontSize: '13px', color: 'rgba(30,45,77,0.6)', fontWeight: 500, marginBottom: '8px' }}>{title}</div>
      {cardLoading ? (
        <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'rgba(30,45,77,0.4)' }} />
        </div>
      ) : value === null ? (
        <div style={{ fontSize: '13px', color: 'rgba(30,45,77,0.4)', lineHeight: 1.5 }}>{emptyText || 'No data in this period'}</div>
      ) : (
        <>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1E2D4D' }}>{value}</div>
          {subtitle && (
            <div style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(30,45,77,0.5)' }}>{subtitle}</div>
          )}
        </>
      )}
    </div>
  );
}

function LocationBar({ name, percentage }) {
  const getBarColor = (pct) => {
    if (pct >= 90) return '#166534';
    if (pct >= 80) return '#1E2D4D';
    return '#d97706';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(30,45,77,0.06)' }}>
      <div style={{ width: '160px', fontSize: '13px', fontWeight: 500, color: '#1E2D4D', flexShrink: 0 }}>{name}</div>
      <div style={{ flex: 1, height: '20px', backgroundColor: 'rgba(30,45,77,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(percentage, 100)}%`, backgroundColor: getBarColor(percentage), borderRadius: '4px', transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ width: '50px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: getBarColor(percentage) }}>
        {percentage}%
      </div>
    </div>
  );
}

export default function FireSafetyTrajectory() {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;
  const accessibleLocations = getAccessibleLocations();

  const [selectedLocations, setSelectedLocations] = useState([]);
  const [timeRange, setTimeRange] = useState(90);
  const [metric, setMetric] = useState('pse_completion');
  const [loading, setLoading] = useState(true);

  // Data state
  const [stats, setStats] = useState({ pseCompletion: null, pseDetail: '', avgResolution: null, resolvedOnTime: null, criticalCleared: null });
  const [trendData, setTrendData] = useState([]);
  const [locationData, setLocationData] = useState([]);

  const locationIds = useMemo(() => {
    if (selectedLocations.length > 0) return selectedLocations;
    return accessibleLocations.map(l => l.locationId);
  }, [selectedLocations, accessibleLocations]);

  useEffect(() => {
    if (!orgId && !isDemoMode) { setLoading(false); return; }
    loadData();
  }, [orgId, locationIds, timeRange, metric, isDemoMode]);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadTrend(), loadLocationBars()]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    if (isDemoMode) {
      setStats({ pseCompletion: null, pseDetail: '', avgResolution: null, resolvedOnTime: null, criticalCleared: null });
      return;
    }

    const since = daysAgo(timeRange);

    // PSE test completion: look at location_service_schedules where next_due_date falls within window
    let schedQuery = supabase
      .from('location_service_schedules')
      .select('next_due_date, last_service_date')
      .eq('organization_id', orgId)
      .in('service_type_code', ['KEC', 'FS'])
      .eq('is_active', true)
      .gte('next_due_date', since);

    if (locationIds.length > 0 && locationIds.length < accessibleLocations.length) {
      schedQuery = schedQuery.in('location_id', locationIds);
    }

    const { data: schedRows } = await withTimeout(schedQuery);
    const scheduled = schedRows || [];
    const onTime = scheduled.filter(r => r.last_service_date && r.next_due_date && new Date(r.last_service_date) <= new Date(r.next_due_date)).length;
    const pseCompletion = scheduled.length > 0 ? Math.round((onTime / scheduled.length) * 100) : null;

    // Findings resolution stats
    let resQuery = supabase
      .from('corrective_actions')
      .select('created_at, completed_at, closed_at, verified_at, due_date, severity')
      .eq('organization_id', orgId)
      .eq('pillar', 'fire_safety')
      .not('source_type', 'in', '(checklist,temperature)')
      .in('status', ['resolved', 'verified', 'closed'])
      .gte('created_at', since);

    if (locationIds.length > 0 && locationIds.length < accessibleLocations.length) {
      resQuery = resQuery.in('location_id', locationIds);
    }

    const { data: resolved } = await withTimeout(resQuery);
    const resolvedFindings = resolved || [];

    let avgDays = null;
    let resolvedOnTimePct = null;
    let criticalCleared = 0;

    if (resolvedFindings.length > 0) {
      let totalDuration = 0;
      let onTimeCount = 0;

      for (const f of resolvedFindings) {
        const created = new Date(f.created_at);
        const closed = new Date(f.completed_at || f.closed_at || f.verified_at);
        const duration = (closed.getTime() - created.getTime()) / 86400000;
        totalDuration += duration;

        if (f.due_date && closed <= new Date(f.due_date)) onTimeCount++;
        if (f.severity === 'critical') criticalCleared++;
      }

      avgDays = Math.round(totalDuration / resolvedFindings.length);
      resolvedOnTimePct = Math.round((onTimeCount / resolvedFindings.length) * 100);
    }

    setStats({
      pseCompletion,
      pseDetail: scheduled.length > 0 ? `${onTime} of ${scheduled.length} scheduled tests on time` : '',
      avgResolution: avgDays !== null ? `${avgDays} days` : null,
      resolvedOnTime: resolvedOnTimePct !== null ? `${resolvedOnTimePct}%` : null,
      criticalCleared: resolvedFindings.length > 0 ? `${criticalCleared}` : null,
    });
  }

  async function loadTrend() {
    if (isDemoMode) { setTrendData([]); return; }

    // Build daily trend for selected metric over timeRange
    const days = Math.min(timeRange, 90);
    const dataPoints = [];
    const now = new Date();

    if (metric === 'pse_completion') {
      // For PSE completion we don't have daily granularity easily; show empty for now
      // This would require a more complex windowed query
      setTrendData([]);
      return;
    }

    // For findings-based metrics, query all fire_safety CAs in window
    const since = daysAgo(days);
    let query = supabase
      .from('corrective_actions')
      .select('id, created_at, completed_at, closed_at, verified_at, status')
      .eq('organization_id', orgId)
      .eq('pillar', 'fire_safety')
      .not('source_type', 'in', '(checklist,temperature)');

    if (locationIds.length > 0 && locationIds.length < accessibleLocations.length) {
      query = query.in('location_id', locationIds);
    }

    if (metric === 'opened') {
      query = query.gte('created_at', since);
    } else if (metric === 'closed') {
      query = query.in('status', ['resolved', 'verified', 'closed']).gte('completed_at', since);
    } else {
      query = query.gte('created_at', since);
    }

    const { data: rows } = await withTimeout(query);
    const cas = rows || [];

    // Group by week
    const weekCount = Math.ceil(days / 7);
    for (let i = weekCount - 1; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);
      const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let count = 0;
      if (metric === 'opened') {
        count = cas.filter(c => {
          const d = new Date(c.created_at);
          return d >= weekStart && d < weekEnd;
        }).length;
      } else if (metric === 'closed') {
        count = cas.filter(c => {
          const d = new Date(c.completed_at || c.closed_at || c.verified_at);
          return d >= weekStart && d < weekEnd;
        }).length;
      } else if (metric === 'resolution_time') {
        const resolved = cas.filter(c => {
          const d = new Date(c.completed_at || c.closed_at || c.verified_at || '');
          return d >= weekStart && d < weekEnd && (c.completed_at || c.closed_at || c.verified_at);
        });
        if (resolved.length > 0) {
          const total = resolved.reduce((sum, c) => {
            const created = new Date(c.created_at);
            const closed = new Date(c.completed_at || c.closed_at || c.verified_at);
            return sum + (closed.getTime() - created.getTime()) / 86400000;
          }, 0);
          count = Math.round(total / resolved.length);
        }
      }

      dataPoints.push({ label, value: count });
    }

    setTrendData(dataPoints);
  }

  async function loadLocationBars() {
    if (isDemoMode || accessibleLocations.length <= 1) { setLocationData([]); return; }

    // Per-location PSE completion: scheduled tests per location
    const since = daysAgo(timeRange);
    let query = supabase
      .from('location_service_schedules')
      .select('location_id, next_due_date, last_service_date')
      .eq('organization_id', orgId)
      .in('service_type_code', ['KEC', 'FS'])
      .eq('is_active', true);

    if (locationIds.length > 0 && locationIds.length < accessibleLocations.length) {
      query = query.in('location_id', locationIds);
    }

    const { data: rows } = await withTimeout(query);
    const schedules = rows || [];

    // Group by location
    const byLocation = new Map();
    for (const row of schedules) {
      if (!byLocation.has(row.location_id)) byLocation.set(row.location_id, []);
      byLocation.get(row.location_id).push(row);
    }

    const bars = [];
    for (const loc of accessibleLocations) {
      const locSchedules = byLocation.get(loc.locationId) || [];
      if (locSchedules.length === 0) continue;

      const onTime = locSchedules.filter(r => r.last_service_date && r.next_due_date && new Date(r.last_service_date) <= new Date(r.next_due_date)).length;
      const pct = Math.round((onTime / locSchedules.length) * 100);
      bars.push({ name: loc.name, percentage: pct });
    }

    bars.sort((a, b) => b.percentage - a.percentage);
    setLocationData(bars);
  }

  const metricLabel = METRIC_OPTIONS.find(m => m.value === metric)?.label || 'Value';

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <PillarToggle />
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Fire Safety', href: '/facility-safety' },
        { label: 'Trajectory' },
      ]} />

      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1E2D4D', marginTop: '16px', marginBottom: '16px' }}>
        Fire Safety Trajectory
      </h1>

      {/* Filter strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        {accessibleLocations.length > 1 && (
          <select
            value={selectedLocations.length === 0 ? '' : selectedLocations[0]}
            onChange={(e) => setSelectedLocations(e.target.value ? [e.target.value] : [])}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(30,45,77,0.15)', fontSize: '13px', color: '#1E2D4D', backgroundColor: 'white' }}
          >
            <option value="">All locations</option>
            {accessibleLocations.map(loc => (
              <option key={loc.locationId} value={loc.locationId}>{loc.name}</option>
            ))}
          </select>
        )}
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(30,45,77,0.15)', fontSize: '13px', color: '#1E2D4D', backgroundColor: 'white' }}
        >
          {METRIC_OPTIONS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(30,45,77,0.15)', fontSize: '13px', color: '#1E2D4D', backgroundColor: 'white' }}
        >
          {TIME_RANGES.map(tr => (
            <option key={tr.days} value={tr.days}>{tr.label}</option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
        <StatCard
          title="PSE test completion"
          value={stats.pseCompletion !== null ? `${stats.pseCompletion}%` : null}
          subtitle={stats.pseDetail || null}
          emptyText="No data yet. Will appear once PSE test records are connected."
          loading={loading}
        />
        <StatCard
          title="Average findings resolution"
          value={stats.avgResolution}
          subtitle={null}
          emptyText="No data yet. Will appear once findings are resolved in the selected period."
          loading={loading}
        />
        <StatCard
          title="Findings resolved on time"
          value={stats.resolvedOnTime}
          subtitle={null}
          emptyText="No data yet. Will appear once findings are closed in the selected period."
          loading={loading}
        />
        <StatCard
          title="Critical findings cleared"
          value={stats.criticalCleared}
          subtitle={null}
          emptyText="No data yet. Will appear once critical findings are cleared in the selected period."
          loading={loading}
        />
      </div>

      {/* Trend chart */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E2D4D', marginBottom: '16px' }}>
          {metricLabel} &mdash; {TIME_RANGES.find(t => t.days === timeRange)?.label || ''}
        </h2>
        {loading ? (
          <div style={{ height: '240px', backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'rgba(30,45,77,0.3)' }} />
          </div>
        ) : trendData.length === 0 ? (
          <div style={{ height: '200px', backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: '14px', color: 'rgba(30,45,77,0.4)' }}>Trend will appear once data is recorded for the selected metric.</p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '20px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,77,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(30,45,77,0.5)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'rgba(30,45,77,0.5)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="value" stroke="#A08C5A" strokeWidth={2} dot={false} name={metricLabel} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* By-location bar list */}
      {accessibleLocations.length > 1 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E2D4D', marginBottom: '16px' }}>By Location</h2>
          {loading ? (
            <div style={{ height: '120px', backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'rgba(30,45,77,0.3)' }} />
            </div>
          ) : locationData.length === 0 ? (
            <div style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'rgba(30,45,77,0.4)' }}>No location data yet. Will appear once PSE test records are connected.</p>
            </div>
          ) : (
            <div style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '16px 20px' }}>
              {locationData.map(loc => (
                <LocationBar key={loc.name} name={loc.name} percentage={loc.percentage} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
