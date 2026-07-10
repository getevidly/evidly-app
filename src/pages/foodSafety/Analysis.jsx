import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import PillarToggle from '../../components/pillars/PillarToggle';
import { Breadcrumb } from '../../components/Breadcrumb';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';

const TIME_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 12 weeks', days: 84 },
  { label: 'Last 90 days', days: 90 },
];

const STAGE_MAP = {
  receiving: 'Receiving',
  hot_holding: 'Hot & Cold Holding',
  holding_hot: 'Hot & Cold Holding',
  cold_holding: 'Hot & Cold Holding',
  holding_cold: 'Hot & Cold Holding',
  cooldown: 'Cooldown',
  cooling: 'Cooldown',
};

const STAGE_ORDER = ['Receiving', 'Hot & Cold Holding', 'Cooldown'];

const SOURCE_TYPE_LABELS = {
  inspection: 'Inspection',
  checklist: 'Checklist',
  temperature: 'Temperature',
  self_inspection: 'Self Inspection',
  manual: 'Manual',
  incident: 'Incident',
};

const OPEN_STATUSES_EXCLUDE = ['resolved', 'verified'];

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function StatCard({ title, value, delta, deltaLabel, loading: cardLoading }) {
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
          {delta !== null && delta !== undefined && (
            <div style={{ fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: deltaLabel === 'No prior data' ? 'rgba(30,45,77,0.4)' : delta > 0 ? '#166534' : delta < 0 ? '#991b1b' : 'rgba(30,45,77,0.6)' }}>
              {deltaLabel === 'No prior data' ? null : delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
              <span>{deltaLabel || (delta > 0 ? `+${delta}` : `${delta}`)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FoodSafetyAnalysis() {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;
  const accessibleLocations = getAccessibleLocations();

  const [selectedLocations, setSelectedLocations] = useState([]);
  const [timeRange, setTimeRange] = useState(84); // 12 weeks default
  const [tempGroupBy, setTempGroupBy] = useState('equipment');
  const [loading, setLoading] = useState(true);

  // Data states
  const [tempPassRate, setTempPassRate] = useState({ current: null, prior: null });
  const [checklistCompletion, setChecklistCompletion] = useState({ current: null, prior: null });
  const [overdueChecklists, setOverdueChecklists] = useState({ current: null, prior: null });
  const [openCAs, setOpenCAs] = useState({ current: null, prior: null });
  const [stageData, setStageData] = useState({});
  const [failuresTable, setFailuresTable] = useState([]);
  const [trendChartData, setTrendChartData] = useState([]);
  const [priorityActions, setPriorityActions] = useState({ critical: [], high: [], medium: [] });

  // Fetch all data
  useEffect(() => {
    if (isDemoMode || !orgId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        await Promise.all([
          fetchTempPassRate(),
          fetchChecklistCompletion(),
          fetchOverdueChecklists(),
          fetchOpenCAs(),
          fetchStageData(),
          fetchFailures(),
          fetchTrendChart(),
          fetchPriorityActions(),
        ]);
      } catch (err) {
        console.error('Food Safety Analysis fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isDemoMode, orgId, timeRange, selectedLocations]);

  async function fetchTempPassRate() {
    const now = new Date();
    const currentStart = daysAgo(7);
    const priorStart = daysAgo(14);
    const priorEnd = daysAgo(7);

    let query = supabase
      .from('temperature_logs')
      .select('temp_pass, reading_time, temperature_equipment!inner(organization_id)')
      .eq('temperature_equipment.organization_id', orgId)
      .gte('reading_time', priorStart);

    const { data } = await query;
    if (!data || data.length === 0) {
      setTempPassRate({ current: null, prior: null });
      return;
    }

    const currentLogs = data.filter(r => r.reading_time >= currentStart);
    const priorLogs = data.filter(r => r.reading_time >= priorStart && r.reading_time < priorEnd);

    const currentRate = currentLogs.length > 0
      ? Math.round((currentLogs.filter(r => r.temp_pass).length / currentLogs.length) * 1000) / 10
      : null;
    const priorRate = priorLogs.length > 0
      ? Math.round((priorLogs.filter(r => r.temp_pass).length / priorLogs.length) * 1000) / 10
      : null;

    setTempPassRate({ current: currentRate, prior: priorRate });
  }

  async function fetchChecklistCompletion() {
    const currentStart = daysAgo(7);
    const priorStart = daysAgo(14);
    const priorEnd = daysAgo(7);

    let query = supabase
      .from('customer_checklist_instance_completions')
      .select('completed_at, started_at, status')
      .eq('organization_id', orgId)
      .gte('started_at', priorStart);

    const { data } = await query;
    if (!data || data.length === 0) {
      setChecklistCompletion({ current: null, prior: null });
      return;
    }

    const currentItems = data.filter(r => r.started_at >= currentStart);
    const priorItems = data.filter(r => r.started_at >= priorStart && r.started_at < priorEnd);

    const calcRate = (items) => {
      if (items.length === 0) return null;
      const completed = items.filter(r => r.completed_at || r.status === 'completed').length;
      return Math.round((completed / items.length) * 1000) / 10;
    };

    setChecklistCompletion({ current: calcRate(currentItems), prior: calcRate(priorItems) });
  }

  async function fetchOverdueChecklists() {
    const now = new Date().toISOString().split('T')[0];
    const priorPeriodStart = daysAgo(timeRange * 2).split('T')[0];
    const priorPeriodEnd = daysAgo(timeRange).split('T')[0];

    const { data } = await supabase
      .from('customer_checklist_instance_completions')
      .select('started_at, completed_at, status')
      .eq('organization_id', orgId)
      .is('completed_at', null)
      .neq('status', 'completed')
      .lt('started_at', now);

    const currentCount = data ? data.length : null;

    // Prior period: count items that were abandoned at that time (approximation)
    const { data: priorData } = await supabase
      .from('customer_checklist_instance_completions')
      .select('started_at, completed_at, status')
      .eq('organization_id', orgId)
      .lt('started_at', priorPeriodEnd)
      .gte('started_at', priorPeriodStart)
      .is('completed_at', null)
      .neq('status', 'completed');

    const priorCount = priorData ? priorData.length : null;
    setOverdueChecklists({ current: currentCount, prior: priorCount });
  }

  async function fetchOpenCAs() {
    const { data, count } = await supabase
      .from('corrective_actions')
      .select('id', { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('pillar', 'food_safety')
      .not('status', 'in', '("resolved","verified","closed","archived")');

    const currentCount = count ?? (data ? data.length : null);

    // Prior period approximation: count CAs created in prior period that were open
    const priorStart = daysAgo(timeRange * 2);
    const priorEnd = daysAgo(timeRange);
    const { count: priorCount } = await supabase
      .from('corrective_actions')
      .select('id', { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('pillar', 'food_safety')
      .not('status', 'in', '("resolved","verified","closed","archived")')
      .gte('created_at', priorStart)
      .lt('created_at', priorEnd);

    setOpenCAs({ current: currentCount, prior: priorCount ?? null });
  }

  async function fetchStageData() {
    const periodStart = daysAgo(timeRange);
    const priorStart = daysAgo(timeRange * 2);
    const priorEnd = daysAgo(timeRange);

    const { data } = await supabase
      .from('temperature_logs')
      .select('log_type, temp_pass, reading_time, temperature_equipment!inner(organization_id)')
      .eq('temperature_equipment.organization_id', orgId)
      .gte('reading_time', priorStart);

    if (!data || data.length === 0) {
      setStageData({});
      return;
    }

    const stages = {};
    for (const stage of STAGE_ORDER) {
      stages[stage] = { current: { pass: 0, total: 0 }, prior: { pass: 0, total: 0 } };
    }

    for (const row of data) {
      const stageName = STAGE_MAP[row.log_type];
      if (!stageName || !stages[stageName]) continue;

      const isCurrent = row.reading_time >= periodStart;
      const isPrior = row.reading_time >= priorStart && row.reading_time < priorEnd;

      if (isCurrent) {
        stages[stageName].current.total++;
        if (row.temp_pass) stages[stageName].current.pass++;
      } else if (isPrior) {
        stages[stageName].prior.total++;
        if (row.temp_pass) stages[stageName].prior.pass++;
      }
    }

    setStageData(stages);
  }

  async function fetchFailures() {
    const periodStart = daysAgo(timeRange);

    const { data } = await supabase
      .from('temperature_logs')
      .select('equipment_id, log_type, reading_time, temperature_equipment!inner(organization_id)')
      .eq('temperature_equipment.organization_id', orgId)
      .eq('temp_pass', false)
      .gte('reading_time', periodStart)
      .order('reading_time', { ascending: false });

    if (!data || data.length === 0) {
      setFailuresTable([]);
      return;
    }

    // Group by equipment_id + log_type
    const grouped = {};
    for (const row of data) {
      const key = `${row.equipment_id || 'unknown'}-${row.log_type || 'unknown'}`;
      if (!grouped[key]) {
        grouped[key] = {
          equipmentId: row.equipment_id,
          stage: STAGE_MAP[row.log_type] || row.log_type || 'Unknown',
          count: 0,
          lastFailure: row.reading_time,
        };
      }
      grouped[key].count++;
    }

    const sorted = Object.values(grouped)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setFailuresTable(sorted);
  }

  async function fetchTrendChart() {
    // Build 12-week chart: weekly count of open CAs and overdue checklists
    const weeks = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000);
      const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
      weeks.push({
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
        label: `Wk of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      });
    }

    // Fetch all CAs in range
    const rangeStart = weeks[0].start;
    const { data: caData } = await supabase
      .from('corrective_actions')
      .select('created_at, status')
      .eq('organization_id', orgId)
      .eq('pillar', 'food_safety')
      .gte('created_at', rangeStart);

    // Fetch incomplete checklists in range
    const { data: clData } = await supabase
      .from('customer_checklist_instance_completions')
      .select('started_at, completed_at, status')
      .eq('organization_id', orgId)
      .gte('started_at', rangeStart)
      .is('completed_at', null)
      .neq('status', 'completed');

    const chartData = weeks.map(week => {
      const caCount = caData
        ? caData.filter(r => r.created_at >= week.start && r.created_at < week.end && !OPEN_STATUSES_EXCLUDE.includes(r.status)).length
        : 0;
      const clCount = clData
        ? clData.filter(r => r.started_at >= week.start && r.started_at < week.end).length
        : 0;

      return { name: week.label, openCAs: caCount, overdueChecklists: clCount };
    });

    setTrendChartData(chartData);
  }

  async function fetchPriorityActions() {
    const { data } = await supabase
      .from('corrective_actions')
      .select('id, title, source_type, assigned_to, due_date, status, severity, created_at')
      .eq('organization_id', orgId)
      .eq('pillar', 'food_safety')
      .not('status', 'in', '("resolved","verified","closed","archived")')
      .order('due_date', { ascending: true });

    if (!data || data.length === 0) {
      setPriorityActions({ critical: [], high: [], medium: [] });
      return;
    }

    const groups = { critical: [], high: [], medium: [] };
    for (const row of data) {
      const sev = (row.severity || 'medium').toLowerCase();
      if (groups[sev]) {
        groups[sev].push(row);
      } else {
        groups.medium.push(row);
      }
    }

    // Sort within each group
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return (a.created_at || '').localeCompare(b.created_at || '');
      });
    }

    setPriorityActions(groups);
  }

  // Compute stat card deltas
  const tempDelta = useMemo(() => {
    if (tempPassRate.current === null) return { value: null, label: null };
    if (tempPassRate.prior === null) return { value: null, label: 'No prior data' };
    const diff = Math.round((tempPassRate.current - tempPassRate.prior) * 10) / 10;
    return { value: diff, label: `${diff > 0 ? '+' : ''}${diff} percentage points vs prior 7 days` };
  }, [tempPassRate]);

  const checklistDelta = useMemo(() => {
    if (checklistCompletion.current === null) return { value: null, label: null };
    if (checklistCompletion.prior === null) return { value: null, label: 'No prior data' };
    const diff = Math.round((checklistCompletion.current - checklistCompletion.prior) * 10) / 10;
    return { value: diff, label: `${diff > 0 ? '+' : ''}${diff} percentage points vs prior 7 days` };
  }, [checklistCompletion]);

  const overdueDelta = useMemo(() => {
    if (overdueChecklists.current === null) return { value: null, label: null };
    if (overdueChecklists.prior === null) return { value: null, label: 'No prior data' };
    const diff = overdueChecklists.current - overdueChecklists.prior;
    return { value: diff, label: `${diff > 0 ? '+' : ''}${diff} vs prior period` };
  }, [overdueChecklists]);

  const caDelta = useMemo(() => {
    if (openCAs.current === null) return { value: null, label: null };
    if (openCAs.prior === null) return { value: null, label: 'No prior data' };
    const diff = openCAs.current - openCAs.prior;
    return { value: diff, label: `${diff > 0 ? '+' : ''}${diff} vs prior period` };
  }, [openCAs]);

  const formatDate = (iso) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusPill = (status) => {
    const colors = {
      open: { bg: '#fef2f2', text: '#991b1b' },
      reported: { bg: '#fef2f2', text: '#991b1b' },
      assigned: { bg: '#eff6ff', text: '#1E2D4D' },
      in_progress: { bg: '#fffbeb', text: '#92400e' },
    };
    const c = colors[status] || { bg: 'rgba(30,45,77,0.05)', text: 'rgba(30,45,77,0.6)' };
    return (
      <span style={{ backgroundColor: c.bg, color: c.text, padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>
        {(status || 'open').replace('_', ' ')}
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      critical: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
      high: { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
      medium: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    };
    const c = colors[severity] || colors.medium;
    return (
      <span style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: '3px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
        {severity}
      </span>
    );
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Food Safety', href: '/food-safety' }, { label: 'Analysis' }]} />

      <PillarToggle />

      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1E2D4D', marginBottom: '20px' }}>Food Safety Analysis</h1>

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
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          style={{ padding: '8px 12px', border: '1px solid rgba(30,45,77,0.15)', borderRadius: '8px', fontSize: '13px', backgroundColor: 'white' }}
        >
          {TIME_RANGES.map(tr => (
            <option key={tr.days} value={tr.days}>{tr.label}</option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1E2D4D' }} />
          <span style={{ marginLeft: '12px', color: 'rgba(30,45,77,0.6)', fontSize: '14px' }}>Loading analysis data...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
            <StatCard
              title="Temperature pass rate (7 days)"
              value={tempPassRate.current !== null ? `${tempPassRate.current}%` : null}
              delta={tempDelta.value}
              deltaLabel={tempDelta.label}
            />
            <StatCard
              title="Checklist completion (7 days)"
              value={checklistCompletion.current !== null ? `${checklistCompletion.current}%` : null}
              delta={checklistDelta.value}
              deltaLabel={checklistDelta.label}
            />
            <StatCard
              title="Overdue checklists"
              value={overdueChecklists.current}
              delta={overdueDelta.value}
              deltaLabel={overdueDelta.label}
            />
            <StatCard
              title="Open corrective actions"
              value={openCAs.current}
              delta={caDelta.value}
              deltaLabel={caDelta.label}
            />
          </div>

          {/* Temperature Monitoring Section */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E2D4D', marginBottom: '4px' }}>Temperature Monitoring</h2>
            <p style={{ fontSize: '13px', color: 'rgba(30,45,77,0.6)', marginBottom: '16px' }}>Full cycle: Receiving &rarr; Hot &amp; Cold Holding &rarr; Cooldown</p>

            {/* Toggle pills */}
            <div style={{ display: 'inline-flex', marginBottom: '16px', border: '1px solid rgba(30,45,77,0.15)', borderRadius: '9999px', overflow: 'hidden' }}>
              {['equipment', 'food'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setTempGroupBy(mode)}
                  style={{
                    padding: '6px 16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: tempGroupBy === mode ? '#1E2D4D' : 'white',
                    color: tempGroupBy === mode ? 'white' : '#1E2D4D',
                  }}
                >
                  By {mode}
                </button>
              ))}
            </div>

            {/* Stage Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {STAGE_ORDER.map(stage => {
                const data = stageData[stage];
                if (!data || data.current.total === 0) {
                  return (
                    <div key={stage} style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '20px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E2D4D', marginBottom: '8px' }}>{stage}</div>
                      <div style={{ fontSize: '13px', color: 'rgba(30,45,77,0.4)' }}>No data in this period</div>
                    </div>
                  );
                }

                const rate = Math.round((data.current.pass / data.current.total) * 1000) / 10;
                const priorRate = data.prior.total > 0 ? Math.round((data.prior.pass / data.prior.total) * 1000) / 10 : null;
                const delta = priorRate !== null ? Math.round((rate - priorRate) * 10) / 10 : null;

                return (
                  <div key={stage} style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E2D4D', marginBottom: '8px' }}>{stage}</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#1E2D4D' }}>{rate}%</div>
                    <div style={{ fontSize: '12px', color: 'rgba(30,45,77,0.6)', marginTop: '4px' }}>
                      {data.current.pass} of {data.current.total} in range
                    </div>
                    {delta !== null && (
                      <div style={{ fontSize: '12px', marginTop: '4px', color: delta >= 0 ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {delta > 0 ? '+' : ''}{delta} percentage points
                      </div>
                    )}
                    {delta === null && (
                      <div style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(30,45,77,0.4)' }}>No prior data</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Equipment Failures Table */}
            <div style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(30,45,77,0.1)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1E2D4D' }}>
                  {tempGroupBy === 'equipment' ? 'Equipment failures' : 'Food item failures'} (top 10)
                </h3>
              </div>
              {failuresTable.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(30,45,77,0.4)', fontSize: '14px' }}>
                  No failures recorded in this period
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#FAF7F0' }}>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'rgba(30,45,77,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {tempGroupBy === 'equipment' ? 'Equipment' : 'Food item'}
                      </th>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'rgba(30,45,77,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stage failed</th>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'rgba(30,45,77,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Failure count</th>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'rgba(30,45,77,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last failure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failuresTable.map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid rgba(30,45,77,0.06)' }}>
                        <td style={{ padding: '12px 20px', fontSize: '13px', color: '#1E2D4D' }}>{row.equipmentId || 'Unknown'}</td>
                        <td style={{ padding: '12px 20px', fontSize: '13px', color: 'rgba(30,45,77,0.7)' }}>{row.stage}</td>
                        <td style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 600, color: '#991b1b' }}>{row.count}</td>
                        <td style={{ padding: '12px 20px', fontSize: '13px', color: 'rgba(30,45,77,0.6)' }}>{formatDate(row.lastFailure)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Corrective Actions Trend Chart */}
          <div style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E2D4D', marginBottom: '16px' }}>Open Corrective Actions Trend (12 weeks)</h2>
            {trendChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,77,0.08)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(30,45,77,0.6)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgba(30,45,77,0.6)' }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="openCAs" stroke="#A08C5A" strokeWidth={2} dot={{ r: 3 }} name="Open corrective actions" />
                    <Line type="monotone" dataKey="overdueChecklists" stroke="#1E2D4D" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} name="Overdue checklists" />
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(30,45,77,0.4)', fontSize: '14px' }}>
                No trend data available for this period
              </div>
            )}
          </div>

          {/* Priority Actions List */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E2D4D', marginBottom: '16px' }}>Priority Actions</h2>

            {['critical', 'high', 'medium'].map(severity => (
              <div key={severity} style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  {getSeverityBadge(severity)}
                </div>

                {priorityActions[severity].length === 0 ? (
                  <div style={{ padding: '20px', backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '10px', color: 'rgba(30,45,77,0.4)', fontSize: '13px' }}>
                    No open corrective actions at this urgency.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {priorityActions[severity].map(action => (
                      <div key={action.id} style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '10px', padding: '14px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>{action.title}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(30,45,77,0.5)', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <span>{SOURCE_TYPE_LABELS[action.source_type] || 'Manual'}</span>
                            {action.assigned_to && <span>Assigned: {action.assigned_to}</span>}
                            {action.due_date && <span>Due: {formatDate(action.due_date)}</span>}
                          </div>
                        </div>
                        {getStatusPill(action.status)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
