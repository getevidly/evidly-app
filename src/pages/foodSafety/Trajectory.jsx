import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import PillarToggle from '../../components/pillars/PillarToggle';
import { Breadcrumb } from '../../components/Breadcrumb';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';

const TIME_RANGES = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last 12 months', days: 365 },
];

const METRIC_OPTIONS = [
  { value: 'activity', label: 'Activity completion' },
  { value: 'checklists', label: 'Checklists only' },
  { value: 'temperatures', label: 'Temperatures only' },
  { value: 'resolution', label: 'Incident resolution time' },
];

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function StatCard({ title, value, subtitle, loading: cardLoading }) {
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '20px', flex: '1 1 0', minWidth: '200px' }}>
      <div style={{ fontSize: '13px', color: 'rgba(30,45,77,0.6)', fontWeight: 500, marginBottom: '8px' }}>{title}</div>
      {cardLoading ? (
        <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'rgba(30,45,77,0.4)' }} />
        </div>
      ) : value === null ? (
        <div style={{ fontSize: '14px', color: 'rgba(30,45,77,0.4)' }}>No data in this period</div>
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
      <div style={{ flex: 1, height: '24px', backgroundColor: 'rgba(30,45,77,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(100, percentage)}%`,
            height: '100%',
            backgroundColor: getBarColor(percentage),
            borderRadius: '6px',
            transition: 'width 300ms ease',
          }}
        />
      </div>
      <div style={{ width: '48px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: getBarColor(percentage) }}>
        {percentage}%
      </div>
    </div>
  );
}

export default function FoodSafetyTrajectory() {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;
  const accessibleLocations = getAccessibleLocations();

  const [selectedLocations, setSelectedLocations] = useState([]);
  const [timeRange, setTimeRange] = useState(90);
  const [metric, setMetric] = useState('activity');
  const [loading, setLoading] = useState(true);

  // Data states
  const [activityCompletion, setActivityCompletion] = useState(null);
  const [avgResolution, setAvgResolution] = useState(null);
  const [checklistsOnTime, setChecklistsOnTime] = useState(null);
  const [tempsInRange, setTempsInRange] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [locationData, setLocationData] = useState([]);

  useEffect(() => {
    if (isDemoMode || !orgId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        await Promise.all([
          fetchActivityCompletion(),
          fetchAvgResolution(),
          fetchChecklistsOnTime(),
          fetchTempsInRange(),
          fetchTrendData(),
          fetchLocationData(),
        ]);
      } catch (err) {
        console.error('Food Safety Trajectory fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isDemoMode, orgId, timeRange, metric, selectedLocations]);

  async function fetchActivityCompletion() {
    const periodStart = daysAgo(timeRange);

    // Checklists due and completed on time
    const { data: clData } = await supabase
      .from('checklist_template_completions')
      .select('completed_at, due_date, status')
      .eq('organization_id', orgId)
      .gte('due_date', periodStart.split('T')[0]);

    // Temperature logs (all are "scheduled" in the sense they were recorded)
    const { data: tempData } = await supabase
      .from('temperature_logs')
      .select('temp_pass')
      .eq('facility_id', orgId)
      .gte('reading_time', periodStart);

    const clTotal = clData ? clData.length : 0;
    const clOnTime = clData ? clData.filter(r => r.completed_at && r.due_date && r.completed_at.split('T')[0] <= r.due_date).length : 0;
    const tempTotal = tempData ? tempData.length : 0;
    const totalActivities = clTotal + tempTotal;

    if (totalActivities === 0) {
      setActivityCompletion(null);
      return;
    }

    // "Completed on time" = checklist completed by due date + all temp logs (they exist = completed)
    const completedOnTime = clOnTime + tempTotal;
    const pct = Math.round((completedOnTime / totalActivities) * 100);
    setActivityCompletion(pct);
  }

  async function fetchAvgResolution() {
    const periodStart = daysAgo(timeRange);

    const { data } = await supabase
      .from('incidents')
      .select('created_at, resolved_at')
      .eq('organization_id', orgId)
      .eq('pillar', 'food_safety')
      .not('resolved_at', 'is', null)
      .gte('resolved_at', periodStart);

    if (!data || data.length === 0) {
      setAvgResolution(null);
      return;
    }

    const durations = data.map(r => {
      const start = new Date(r.created_at).getTime();
      const end = new Date(r.resolved_at).getTime();
      return end - start;
    }).filter(d => d > 0);

    if (durations.length === 0) {
      setAvgResolution(null);
      return;
    }

    const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
    const totalHours = avgMs / (1000 * 60 * 60);
    const days = Math.floor(totalHours / 24);
    const hours = Math.round(totalHours % 24);

    setAvgResolution({ days, hours, raw: avgMs });
  }

  async function fetchChecklistsOnTime() {
    const periodStart = daysAgo(timeRange);

    const { data } = await supabase
      .from('checklist_template_completions')
      .select('completed_at, due_date, status')
      .eq('organization_id', orgId)
      .gte('due_date', periodStart.split('T')[0]);

    if (!data || data.length === 0) {
      setChecklistsOnTime(null);
      return;
    }

    const completed = data.filter(r => r.completed_at || r.status === 'completed');
    const onTime = completed.filter(r => r.completed_at && r.due_date && r.completed_at.split('T')[0] <= r.due_date);
    const pct = data.length > 0 ? Math.round((onTime.length / data.length) * 100) : null;
    setChecklistsOnTime(pct);
  }

  async function fetchTempsInRange() {
    const periodStart = daysAgo(timeRange);

    const { data } = await supabase
      .from('temperature_logs')
      .select('temp_pass')
      .eq('facility_id', orgId)
      .gte('reading_time', periodStart);

    if (!data || data.length === 0) {
      setTempsInRange(null);
      return;
    }

    const inRange = data.filter(r => r.temp_pass).length;
    const pct = Math.round((inRange / data.length) * 100);
    setTempsInRange(pct);
  }

  async function fetchTrendData() {
    const periodStart = daysAgo(timeRange);
    const numDays = Math.min(timeRange, 90);
    const dailyPoints = [];

    // Get all data in one batch
    const { data: clData } = await supabase
      .from('checklist_template_completions')
      .select('completed_at, due_date, status')
      .eq('organization_id', orgId)
      .gte('due_date', periodStart.split('T')[0]);

    const { data: tempData } = await supabase
      .from('temperature_logs')
      .select('temp_pass, reading_time')
      .eq('facility_id', orgId)
      .gte('reading_time', periodStart);

    // Build daily data points
    for (let i = numDays - 1; i >= 0; i--) {
      const dayStart = new Date(Date.now() - (i + 1) * 86400000);
      const dayEnd = new Date(Date.now() - i * 86400000);
      const dayStr = dayStart.toISOString().split('T')[0];
      const dayEndStr = dayEnd.toISOString().split('T')[0];

      let pct = null;

      if (metric === 'activity' || metric === 'checklists') {
        const dayChecklists = clData ? clData.filter(r => r.due_date === dayStr) : [];
        const dayOnTime = dayChecklists.filter(r => r.completed_at && r.completed_at.split('T')[0] <= r.due_date);

        if (metric === 'checklists') {
          pct = dayChecklists.length > 0 ? Math.round((dayOnTime.length / dayChecklists.length) * 100) : null;
        } else {
          // Activity = checklists + temps
          const dayTemps = tempData ? tempData.filter(r => r.reading_time >= dayStart.toISOString() && r.reading_time < dayEnd.toISOString()) : [];
          const total = dayChecklists.length + dayTemps.length;
          const completed = dayOnTime.length + dayTemps.length;
          pct = total > 0 ? Math.round((completed / total) * 100) : null;
        }
      } else if (metric === 'temperatures') {
        const dayTemps = tempData ? tempData.filter(r => r.reading_time >= dayStart.toISOString() && r.reading_time < dayEnd.toISOString()) : [];
        pct = dayTemps.length > 0 ? Math.round((dayTemps.filter(r => r.temp_pass).length / dayTemps.length) * 100) : null;
      }
      // resolution metric not charted as percentage — skip

      if (pct !== null) {
        dailyPoints.push({
          date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: pct,
        });
      }
    }

    setTrendData(dailyPoints);
  }

  async function fetchLocationData() {
    // Per-location activity completion for 90 days
    const periodStart = daysAgo(90);

    const { data: locations } = await supabase
      .from('locations')
      .select('id, name')
      .eq('organization_id', orgId);

    if (!locations || locations.length === 0) {
      setLocationData([]);
      return;
    }

    // Get all checklist data
    const { data: clData } = await supabase
      .from('checklist_template_completions')
      .select('location_id, completed_at, due_date, status')
      .eq('organization_id', orgId)
      .gte('due_date', periodStart.split('T')[0]);

    const results = locations.map(loc => {
      const locChecklists = clData ? clData.filter(r => r.location_id === loc.id) : [];
      const onTime = locChecklists.filter(r => r.completed_at && r.due_date && r.completed_at.split('T')[0] <= r.due_date);
      const pct = locChecklists.length > 0 ? Math.round((onTime.length / locChecklists.length) * 100) : 0;
      return { name: loc.name, percentage: pct };
    }).sort((a, b) => b.percentage - a.percentage);

    setLocationData(results);
  }

  const resolutionDisplay = useMemo(() => {
    if (!avgResolution) return null;
    const { days, hours } = avgResolution;
    if (days === 0 && hours === 0) return '< 1 hour';
    if (days === 0) return `${hours} hours`;
    return `${days} days ${hours} hours`;
  }, [avgResolution]);

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Food Safety', href: '/food-safety' }, { label: 'Trajectory' }]} />

      <PillarToggle />

      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1E2D4D', marginBottom: '20px' }}>Food Safety Trajectory</h1>

      {/* Filter Strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', padding: '12px 16px', backgroundColor: '#FAF7F0', borderRadius: '10px', border: '1px solid rgba(30,45,77,0.1)' }}>
        <select
          value={selectedLocations.length === 0 ? 'all' : selectedLocations[0]}
          onChange={(e) => setSelectedLocations(e.target.value === 'all' ? [] : [e.target.value])}
          style={{ padding: '8px 12px', border: '1px solid rgba(30,45,77,0.15)', borderRadius: '8px', fontSize: '13px', backgroundColor: 'white' }}
        >
          <option value="all">All Locations</option>
          {accessibleLocations.map(loc => (
            <option key={loc.locationUrlId} value={loc.locationUrlId}>{loc.locationName}</option>
          ))}
        </select>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid rgba(30,45,77,0.15)', borderRadius: '8px', fontSize: '13px', backgroundColor: 'white' }}
        >
          {METRIC_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          style={{ padding: '8px 12px', border: '1px solid rgba(30,45,77,0.15)', borderRadius: '8px', fontSize: '13px', backgroundColor: 'white' }}
        >
          {TIME_RANGES.map(tr => (
            <option key={tr.days} value={tr.days}>{tr.label}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1E2D4D' }} />
          <span style={{ marginLeft: '12px', color: 'rgba(30,45,77,0.6)', fontSize: '14px' }}>Loading trajectory data...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
            <StatCard
              title="Activity completion"
              value={activityCompletion !== null ? `${activityCompletion}%` : null}
              subtitle="Scheduled activities completed on time"
            />
            <StatCard
              title="Average incident resolution"
              value={resolutionDisplay}
              subtitle={avgResolution === null ? undefined : `${(avgResolution.raw ? Math.round(avgResolution.raw / (1000 * 60 * 60)) : 0)} total hours average`}
            />
            <StatCard
              title="Checklists on time"
              value={checklistsOnTime !== null ? `${checklistsOnTime}%` : null}
              subtitle="Completed by due date"
            />
            <StatCard
              title="Temperatures within range"
              value={tempsInRange !== null ? `${tempsInRange}%` : null}
              subtitle="Within configured equipment range"
            />
          </div>

          {/* Trend Chart */}
          <div style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E2D4D', marginBottom: '16px' }}>
              {metric === 'resolution' ? 'Incident resolution time is not charted as a daily trend' : `${METRIC_OPTIONS.find(m => m.value === metric)?.label || 'Activity'} trend`}
            </h2>
            {metric === 'resolution' ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(30,45,77,0.4)', fontSize: '14px' }}>
                Incident resolution time is displayed as an average in the stat card above. Select a different metric to view the trend chart.
              </div>
            ) : trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,77,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(30,45,77,0.6)' }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'rgba(30,45,77,0.6)' }} unit="%" />
                  <Tooltip formatter={(val) => [`${val}%`, 'Completion']} />
                  <Line type="monotone" dataKey="value" stroke="#A08C5A" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(30,45,77,0.4)', fontSize: '14px' }}>
                No trend data available for this period
              </div>
            )}
          </div>

          {/* By-Location Bar List */}
          <div style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E2D4D', marginBottom: '16px' }}>Activity completion by location (90 days)</h2>
            {locationData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(30,45,77,0.4)', fontSize: '14px' }}>
                No location data available
              </div>
            ) : (
              <div>
                {locationData.map((loc, i) => (
                  <LocationBar key={i} name={loc.name} percentage={loc.percentage} />
                ))}
                {/* Legend */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '11px', color: 'rgba(30,45,77,0.5)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#166534' }} /> 90% or above
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#1E2D4D' }} /> 80 to 89%
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#d97706' }} /> Below 80%
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
