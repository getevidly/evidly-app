import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, Bell, Droplets, Wind, Flame, AlertTriangle, ExternalLink } from 'lucide-react';
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

const OPEN_STATUSES_EXCLUDE = ['resolved', 'verified', 'closed', 'archived'];

// Fire findings source_type labels — never show checklist or temperature for fire
const SOURCE_TYPE_LABELS = {
  inspection: 'Inspection',
  self_inspection: 'Self Inspection',
  manual: 'Manual',
  incident: 'Incident',
};

const PSE_SYSTEMS = [
  { key: 'fire_alarm', label: 'Fire Alarms', icon: Bell, standard: 'NFPA 72' },
  { key: 'sprinklers', label: 'Sprinklers', icon: Droplets, standard: 'NFPA 25' },
  { key: 'hood_cleaning', label: 'Hood', icon: Wind, standard: 'NFPA 96' },
  { key: 'fire_suppression', label: 'Ansul', icon: Flame, standard: 'NFPA 17A' },
];

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function StatCard({ title, value, detail, loading: cardLoading }) {
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
          {detail && (
            <div style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(30,45,77,0.5)' }}>{detail}</div>
          )}
        </>
      )}
    </div>
  );
}

export default function FireSafetyAnalysis() {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;
  const accessibleLocations = getAccessibleLocations();

  const [selectedLocations, setSelectedLocations] = useState([]);
  const [timeRange, setTimeRange] = useState(84); // 12 weeks default
  const [loading, setLoading] = useState(true);
  const [pseToggle, setPseToggle] = useState('system'); // 'system' | 'location'

  // Data state
  const [pseData, setPseData] = useState([]);
  const [findings, setFindings] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [stats, setStats] = useState({ pseCompliant: null, pseTotal: null, testCompletion: null, criticalFindings: null, openFindings: null, severityBreakdown: '' });

  const locationIds = useMemo(() => {
    if (selectedLocations.length > 0) return selectedLocations;
    return accessibleLocations.map(l => l.locationId);
  }, [selectedLocations, accessibleLocations]);

  useEffect(() => {
    if (!orgId && !isDemoMode) { setLoading(false); return; }
    loadData();
  }, [orgId, locationIds, timeRange, isDemoMode]);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([loadPSEStatus(), loadFindings(), loadTrend()]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function loadPSEStatus() {
    if (isDemoMode) {
      setPseData([]);
      setStats(prev => ({ ...prev, pseCompliant: null, pseTotal: 4, testCompletion: null }));
      return;
    }

    // Query location_service_schedules for KEC/FS
    let query = supabase
      .from('location_service_schedules')
      .select('service_type_code, vendor_name, last_service_date, next_due_date, location_id')
      .eq('organization_id', orgId)
      .in('service_type_code', ['KEC', 'FS'])
      .eq('is_active', true);

    if (locationIds.length > 0 && locationIds.length < accessibleLocations.length) {
      query = query.in('location_id', locationIds);
    }

    const { data: schedules } = await query;

    // Also try vendor_service_records for fire_alarm and sprinklers
    let vsrQuery = supabase
      .from('vendor_service_records')
      .select('safeguard_type, vendor_name, service_date, next_due_date, location_id')
      .eq('organization_id', orgId)
      .in('safeguard_type', ['fire_alarm', 'sprinklers', 'hood_cleaning', 'fire_suppression'])
      .eq('is_sample', false);

    if (locationIds.length > 0 && locationIds.length < accessibleLocations.length) {
      vsrQuery = vsrQuery.in('location_id', locationIds);
    }

    const { data: vsrRows } = await vsrQuery;

    // Build PSE status from available data
    const now = new Date();
    const pseResults = PSE_SYSTEMS.map(system => {
      let records = [];

      // Map service codes to PSE system keys
      if (system.key === 'hood_cleaning') {
        const kec = (schedules || []).filter(r => r.service_type_code === 'KEC');
        const vsr = (vsrRows || []).filter(r => r.safeguard_type === 'hood_cleaning');
        records = [...kec.map(r => ({ nextDue: r.next_due_date, lastService: r.last_service_date, vendor: r.vendor_name, locationId: r.location_id })),
                   ...vsr.map(r => ({ nextDue: r.next_due_date, lastService: r.service_date, vendor: r.vendor_name, locationId: r.location_id }))];
      } else if (system.key === 'fire_suppression') {
        const fs = (schedules || []).filter(r => r.service_type_code === 'FS');
        const vsr = (vsrRows || []).filter(r => r.safeguard_type === 'fire_suppression');
        records = [...fs.map(r => ({ nextDue: r.next_due_date, lastService: r.last_service_date, vendor: r.vendor_name, locationId: r.location_id })),
                   ...vsr.map(r => ({ nextDue: r.next_due_date, lastService: r.service_date, vendor: r.vendor_name, locationId: r.location_id }))];
      } else {
        const vsr = (vsrRows || []).filter(r => r.safeguard_type === system.key);
        records = vsr.map(r => ({ nextDue: r.next_due_date, lastService: r.service_date, vendor: r.vendor_name, locationId: r.location_id }));
      }

      // Determine status
      let status = 'no_record';
      let currentCount = 0;
      const totalLocations = locationIds.length || 1;

      for (const rec of records) {
        if (rec.nextDue) {
          const due = new Date(rec.nextDue);
          if (due >= now) currentCount++;
        }
      }

      if (records.length === 0) {
        status = 'no_record';
      } else if (currentCount === records.length) {
        status = 'current';
      } else if (currentCount > 0) {
        status = 'due_soon';
      } else {
        status = 'overdue';
      }

      const latest = records.sort((a, b) => (b.lastService || '').localeCompare(a.lastService || ''))[0];

      return {
        ...system,
        status,
        lastTest: latest?.lastService || null,
        nextDue: latest?.nextDue || null,
        coverageLine: records.length > 0 ? `${currentCount} of ${records.length} locations current` : 'No records on file',
      };
    });

    setPseData(pseResults);

    const compliant = pseResults.filter(p => p.status === 'current').length;
    setStats(prev => ({ ...prev, pseCompliant: compliant, pseTotal: 4 }));
  }

  async function loadFindings() {
    if (isDemoMode) {
      setFindings([]);
      setStats(prev => ({ ...prev, criticalFindings: null, openFindings: null, severityBreakdown: '' }));
      return;
    }

    const since = daysAgo(timeRange);
    let query = supabase
      .from('corrective_actions')
      .select('id, title, severity, status, source_type, assignee_name, due_date, created_at, location_id')
      .eq('organization_id', orgId)
      .eq('pillar', 'fire_safety')
      .not('status', 'in', `(${OPEN_STATUSES_EXCLUDE.join(',')})`)
      .not('source_type', 'in', '(checklist,temperature)')
      .gte('created_at', since)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(50);

    if (locationIds.length > 0 && locationIds.length < accessibleLocations.length) {
      query = query.in('location_id', locationIds);
    }

    const { data: rows } = await query;
    const active = rows || [];
    setFindings(active);

    const critical = active.filter(r => r.severity === 'critical').length;
    const total = active.length;
    const high = active.filter(r => r.severity === 'high').length;
    const medium = active.filter(r => r.severity === 'medium').length;

    setStats(prev => ({
      ...prev,
      criticalFindings: critical,
      openFindings: total,
      severityBreakdown: total > 0 ? `${critical} critical, ${high} high, ${medium} medium` : '',
    }));
  }

  async function loadTrend() {
    if (isDemoMode) { setTrendData([]); return; }

    // Build 12-week trend of open fire findings
    const weeks = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);
      weeks.push({ start: weekStart, end: weekEnd, label: `Wk of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` });
    }

    // We need to count findings open at each week endpoint
    // Simplified: query all fire_safety CAs created in last 12 weeks
    const since = daysAgo(84);
    let query = supabase
      .from('corrective_actions')
      .select('id, created_at, closed_at, completed_at, verified_at, archived_at')
      .eq('organization_id', orgId)
      .eq('pillar', 'fire_safety')
      .not('source_type', 'in', '(checklist,temperature)')
      .or(`created_at.gte.${since},and(closed_at.is.null,completed_at.is.null)`);

    if (locationIds.length > 0 && locationIds.length < accessibleLocations.length) {
      query = query.in('location_id', locationIds);
    }

    const { data: allCAs } = await query;
    const cas = allCAs || [];

    const chartData = weeks.map(week => {
      const count = cas.filter(ca => {
        const created = new Date(ca.created_at);
        if (created > week.end) return false;
        // Was it still open at week end?
        const closedAt = ca.closed_at || ca.completed_at || ca.verified_at || ca.archived_at;
        if (closedAt && new Date(closedAt) <= week.end) return false;
        return true;
      }).length;
      return { label: week.label, openFindings: count };
    });

    setTrendData(chartData);
  }

  // PSE findings requiring attention (top 10 by days overdue)
  const findingsTable = useMemo(() => {
    const now = new Date();
    return findings
      .filter(f => f.due_date && new Date(f.due_date) < now)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 10)
      .map(f => ({
        ...f,
        daysOverdue: Math.ceil((now.getTime() - new Date(f.due_date).getTime()) / 86400000),
      }));
  }, [findings]);

  // Group findings by severity for priority list
  const groupedFindings = useMemo(() => {
    const groups = { critical: [], high: [], medium: [] };
    for (const f of findings) {
      const sev = f.severity || 'medium';
      if (groups[sev]) groups[sev].push(f);
      else groups.medium.push(f);
    }
    // Sort each group by due_date asc, then created_at asc
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const dueComp = (a.due_date || '9999').localeCompare(b.due_date || '9999');
        if (dueComp !== 0) return dueComp;
        return (a.created_at || '').localeCompare(b.created_at || '');
      });
    }
    return groups;
  }, [findings]);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <PillarToggle />
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Fire Safety', href: '/facility-safety' },
        { label: 'Analysis' },
      ]} />

      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1E2D4D', marginTop: '16px', marginBottom: '16px' }}>
        Fire Safety Analysis
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
          title="PSE systems in compliance"
          value={stats.pseCompliant !== null ? `${stats.pseCompliant} of ${stats.pseTotal}` : null}
          detail={pseData.length > 0 ? pseData.filter(p => p.status === 'current').map(p => p.label).join(', ') || 'None current' : null}
          loading={loading}
        />
        <StatCard
          title="On-time test completion (last 90 days)"
          value={null}
          detail={null}
          loading={loading}
        />
        <StatCard
          title="Critical findings"
          value={stats.criticalFindings !== null ? `${stats.criticalFindings}` : null}
          detail={stats.criticalFindings > 0 ? 'Needs immediate action' : stats.criticalFindings === 0 ? 'No critical findings' : null}
          loading={loading}
        />
        <StatCard
          title="Open findings"
          value={stats.openFindings !== null ? `${stats.openFindings}` : null}
          detail={stats.severityBreakdown || null}
          loading={loading}
        />
      </div>

      {/* Big 4 PSE Status */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E2D4D', margin: 0 }}>Big 4 PSE Status</h2>
            <p style={{ fontSize: '13px', color: 'rgba(30,45,77,0.5)', margin: '4px 0 0' }}>Fire Alarms &middot; Sprinklers &middot; Hood &middot; Ansul</p>
          </div>
          <div style={{ display: 'inline-flex', border: '1px solid rgba(30,45,77,0.15)', borderRadius: '9999px', overflow: 'hidden' }}>
            <button
              onClick={() => setPseToggle('system')}
              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: pseToggle === 'system' ? '#1E2D4D' : '#FAF7F0', color: pseToggle === 'system' ? '#FAF7F0' : '#1E2D4D' }}
            >
              By system
            </button>
            <button
              onClick={() => setPseToggle('location')}
              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: pseToggle === 'location' ? '#1E2D4D' : '#FAF7F0', color: pseToggle === 'location' ? '#FAF7F0' : '#1E2D4D' }}
            >
              By location
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: '140px', background: '#E5E7EB', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : pseData.length === 0 ? (
          <div style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'rgba(30,45,77,0.4)' }}>No PSE service records found. Add records in Vendor Management to see status here.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {pseData.map(system => {
              const Icon = system.icon;
              const statusColors = {
                current: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', label: 'Current' },
                due_soon: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', label: 'Due Soon' },
                overdue: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: 'Overdue' },
                no_record: { bg: '#F9FAFB', border: '#E5E7EB', text: '#6B7280', label: 'No Record' },
              };
              const sc = statusColors[system.status] || statusColors.no_record;

              return (
                <div key={system.key} style={{ backgroundColor: 'white', border: `1px solid ${sc.border}`, borderRadius: '12px', padding: '16px', borderLeft: `4px solid ${sc.text}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Icon className="h-5 w-5" style={{ color: '#1E2D4D' }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E2D4D' }}>{system.label}</span>
                  </div>
                  <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, marginBottom: '8px' }}>
                    {sc.label}
                  </span>
                  <div style={{ fontSize: '11px', color: 'rgba(30,45,77,0.5)', lineHeight: 1.8 }}>
                    <div>Standard: {system.standard}</div>
                    <div>Last test: {system.lastTest ? new Date(system.lastTest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
                    <div>Next due: {system.nextDue ? new Date(system.nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
                    <div>{system.coverageLine}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Findings requiring attention table */}
        {findingsTable.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1E2D4D', marginBottom: '8px' }}>Findings requiring attention</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(30,45,77,0.1)' }}>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'rgba(30,45,77,0.5)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Issue</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'rgba(30,45,77,0.5)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Severity</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: 'rgba(30,45,77,0.5)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Days overdue</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'rgba(30,45,77,0.5)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {findingsTable.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid rgba(30,45,77,0.05)' }}>
                      <td style={{ padding: '8px', color: '#1E2D4D', fontWeight: 500 }}>{f.title}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '6px', backgroundColor: f.severity === 'critical' ? '#FEF2F2' : f.severity === 'high' ? '#FFFBEB' : '#F0FDF4', color: f.severity === 'critical' ? '#991B1B' : f.severity === 'high' ? '#92400E' : '#166534' }}>
                          {f.severity}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#991B1B', fontWeight: 600 }}>{f.daysOverdue}</td>
                      <td style={{ padding: '8px', color: 'rgba(30,45,77,0.6)' }}>{f.assignee_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {!loading && findingsTable.length === 0 && findings.length === 0 && (
          <div style={{ marginTop: '16px', backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'rgba(30,45,77,0.4)' }}>No overdue findings.</p>
          </div>
        )}
      </div>

      {/* Open findings trend chart */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E2D4D', marginBottom: '16px' }}>Open Findings Trend</h2>
        {loading ? (
          <div style={{ height: '240px', backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'rgba(30,45,77,0.3)' }} />
          </div>
        ) : trendData.length === 0 ? (
          <div style={{ height: '200px', backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: '14px', color: 'rgba(30,45,77,0.4)' }}>No trend data available</p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', padding: '20px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,77,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(30,45,77,0.5)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'rgba(30,45,77,0.5)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="openFindings" stroke="#A08C5A" strokeWidth={2} dot={false} name="Open fire-safety findings (weekly count)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Priority findings list */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E2D4D', marginBottom: '16px' }}>Priority Findings</h2>
        {loading ? (
          <div style={{ height: '120px', backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'rgba(30,45,77,0.3)' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { key: 'critical', label: 'CRITICAL', color: '#991B1B', bg: '#FEF2F2' },
              { key: 'high', label: 'HIGH', color: '#92400E', bg: '#FFFBEB' },
              { key: 'medium', label: 'MEDIUM', color: '#166534', bg: '#F0FDF4' },
            ].map(group => (
              <div key={group.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: group.bg, color: group.color }}>{group.label}</span>
                  <span style={{ fontSize: '12px', color: 'rgba(30,45,77,0.4)' }}>({groupedFindings[group.key]?.length || 0})</span>
                </div>
                {(groupedFindings[group.key] || []).length === 0 ? (
                  <div style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.06)', borderRadius: '8px', padding: '12px 16px' }}>
                    <p style={{ fontSize: '13px', color: 'rgba(30,45,77,0.4)', margin: 0 }}>No open findings at this urgency.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {groupedFindings[group.key].map(f => (
                      <div key={f.id} style={{ backgroundColor: 'white', border: '1px solid rgba(30,45,77,0.08)', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E2D4D', flex: '1 1 200px' }}>{f.title}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(30,45,77,0.5)' }}>
                          {SOURCE_TYPE_LABELS[f.source_type] || f.source_type || 'Manual'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'rgba(30,45,77,0.5)' }}>
                          {f.assignee_name || 'Unassigned'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'rgba(30,45,77,0.5)' }}>
                          Due: {f.due_date ? new Date(f.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '6px', backgroundColor: 'rgba(30,45,77,0.06)', color: '#1E2D4D' }}>
                          {f.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
