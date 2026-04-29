// ============================================================
// Fire Safety Overview — Right-now snapshot (Sprint 5d-1d)
// ============================================================
// Last inspection, open findings, PSE compliance status,
// needs attention, and drill tiles to Analysis + Trajectory.
// No score, no aggregate — jurisdiction publishes the result.
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame, ChevronRight, FileText, AlertTriangle, CheckCircle2,
  Bell, Droplets, Wind, TrendingUp, BarChart3,
  Upload,
} from 'lucide-react';
import { Breadcrumb } from '../../components/Breadcrumb';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/designSystem';

const OPEN_STATUSES = ['open', 'in_progress', 'assigned', 'pending'];
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 };
const QUERY_TIMEOUT = 5000;

// ── Helpers ─────────────────────────────────────────────────

function fmtDate(iso) {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ── Drill tile ──────────────────────────────────────────────

function DrillTile({ title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px', borderRadius: '10px',
        border: '1px solid rgba(30,45,77,0.08)', backgroundColor: 'white',
        cursor: 'pointer', width: '100%', textAlign: 'left',
        transition: 'box-shadow 150ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(30,45,77,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px',
        backgroundColor: colors.fireOrangeSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {title === 'Analysis'
          ? <BarChart3 style={{ width: '18px', height: '18px', color: colors.fireOrange }} />
          : <TrendingUp style={{ width: '18px', height: '18px', color: colors.fireOrange }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: colors.navy }}>{title}</div>
        <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '2px' }}>{description}</div>
      </div>
      <ChevronRight style={{ width: '16px', height: '16px', color: colors.textMuted, flexShrink: 0 }} />
    </button>
  );
}

// ── Fire system card (PSE panel) ────────────────────────────

const FIRE_SYSTEMS = [
  { key: 'fire_alarms', label: 'Fire Alarms', Icon: Bell },
  { key: 'sprinklers', label: 'Sprinklers', Icon: Droplets },
  { key: 'hood', label: 'Hood', Icon: Wind },
  { key: 'ansul', label: 'Ansul', Icon: Flame },
];

// ── Main Component ──────────────────────────────────────────

export default function FireSafetyOverview() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;
  const accessibleLocations = getAccessibleLocations();

  const [selectedLocations, setSelectedLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Data
  const [lastInspection, setLastInspection] = useState(null);
  const [openFindingCount, setOpenFindingCount] = useState(0);
  const [caSeverity, setCaSeverity] = useState({ critical: 0, high: 0, medium: 0 });
  const [needsAttention, setNeedsAttention] = useState([]);
  const [orgLocations, setOrgLocations] = useState([]);

  // Fetch org locations for selector (live mode)
  useEffect(() => {
    if (!orgId || isDemoMode) return;
    (async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', orgId)
        .order('name');
      if (data) setOrgLocations(data);
    })();
  }, [orgId, isDemoMode]);

  // Build location filter
  const locationFilter = selectedLocations.length > 0 ? selectedLocations : orgLocations.map(l => l.id);

  // Fetch data
  useEffect(() => {
    if (isDemoMode || !orgId) {
      setLoading(false);
      return;
    }
    if (orgLocations.length === 0) return;

    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT);

    (async () => {
      setLoading(true);

      try {
        // 1. Last fire inspection
        const inspQ = supabase
          .from('inspection_reports')
          .select('pillar, inspection_date, raw_result, raw_result_type, inspection_type')
          .eq('organization_id', orgId)
          .eq('pillar', 'fire_safety')
          .order('inspection_date', { ascending: false })
          .limit(1);
        if (locationFilter.length > 0 && locationFilter.length < orgLocations.length) {
          inspQ.in('location_id', locationFilter);
        }
        const { data: inspData } = await inspQ;
        if (!cancelled) setLastInspection(inspData?.[0] || null);

        // 2. Open findings with severity breakdown
        const caBaseQ = () => {
          const q = supabase
            .from('corrective_actions')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('pillar', 'fire_safety')
            .in('status', OPEN_STATUSES);
          if (locationFilter.length > 0 && locationFilter.length < orgLocations.length) {
            q.in('location_id', locationFilter);
          }
          return q;
        };
        const [{ count: caTotal }, { count: caCrit }, { count: caHigh }, { count: caMed }] = await Promise.all([
          caBaseQ(),
          caBaseQ().eq('severity', 'critical'),
          caBaseQ().eq('severity', 'high'),
          caBaseQ().eq('severity', 'medium'),
        ]);
        if (!cancelled) {
          setOpenFindingCount(caTotal || 0);
          setCaSeverity({ critical: caCrit || 0, high: caHigh || 0, medium: caMed || 0 });
        }

        // 3. Needs attention — top 5 open findings by severity
        const naQ = supabase
          .from('corrective_actions')
          .select('id, title, severity, status, due_date')
          .eq('organization_id', orgId)
          .eq('pillar', 'fire_safety')
          .in('status', OPEN_STATUSES)
          .in('severity', ['critical', 'high', 'medium'])
          .order('due_date', { ascending: true })
          .limit(15);
        if (locationFilter.length > 0 && locationFilter.length < orgLocations.length) {
          naQ.in('location_id', locationFilter);
        }
        const { data: naData } = await naQ;
        if (!cancelled && naData) {
          const sorted = naData.sort((a, b) => {
            const sa = SEVERITY_ORDER[a.severity] ?? 3;
            const sb = SEVERITY_ORDER[b.severity] ?? 3;
            if (sa !== sb) return sa - sb;
            return (a.due_date || '').localeCompare(b.due_date || '');
          });
          setNeedsAttention(sorted.slice(0, 5));
        }
      } catch {
        // Timeout or network error — leave empty states
      }

      clearTimeout(timeout);
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [orgId, selectedLocations, isDemoMode, orgLocations]);

  const showEmpty = isDemoMode || (!loading && !orgId);
  const locQuery = selectedLocations.length > 0 ? `?location=${selectedLocations[0]}` : '';

  return (
    <>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Fire Safety', href: '/facility-safety' },
        { label: 'Overview' },
      ]} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <Flame style={{ width: '24px', height: '24px', color: colors.fireOrange }} />
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.navy, margin: 0 }}>
          Fire Safety Overview
        </h1>
      </div>
      <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '20px', marginTop: 0 }}>
        Protective Safeguards Endorsement (PSE) status and open findings, plus entry to deeper analysis.
      </p>

      {/* Location selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', padding: '12px 16px', backgroundColor: '#FAF7F0', borderRadius: '10px', border: '1px solid rgba(30,45,77,0.1)' }}>
        <select
          value={selectedLocations.length === 0 ? 'all' : selectedLocations[0]}
          onChange={(e) => setSelectedLocations(e.target.value === 'all' ? [] : [e.target.value])}
          style={{ padding: '8px 12px', border: '1px solid rgba(30,45,77,0.15)', borderRadius: '8px', fontSize: '13px', backgroundColor: 'white' }}
        >
          <option value="all">All Locations</option>
          {(orgLocations.length > 0 ? orgLocations : accessibleLocations).map(loc => (
            <option key={loc.id || loc.locationUrlId} value={loc.id || loc.locationUrlId}>
              {loc.name || loc.locationName}
            </option>
          ))}
        </select>
      </div>

      {showEmpty ? (
        <div style={{
          backgroundColor: 'white', borderRadius: '14px', border: '1px solid rgba(30,45,77,0.1)',
          padding: '48px 24px', textAlign: 'center',
        }}>
          <Flame style={{ width: '48px', height: '48px', color: colors.textMuted, margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.navy, marginBottom: '8px' }}>No fire safety data yet</h2>
          <p style={{ fontSize: '14px', color: colors.textSecondary, maxWidth: '400px', margin: '0 auto' }}>
            Add locations and start logging fire system inspections and service records.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1100px' }}>
          {/* ── Row 1: Last inspection + Open findings ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* Last fire inspection */}
            <div style={{
              backgroundColor: 'white', borderRadius: '14px', border: '1px solid rgba(30,45,77,0.1)',
              padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textSecondary }}>
                Last Fire Inspection
              </div>
              {lastInspection ? (
                <>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: colors.navy }}>
                    {lastInspection.raw_result}
                  </div>
                  <div style={{ fontSize: '13px', color: colors.textSecondary }}>
                    {lastInspection.raw_result_type} — {fmtDate(lastInspection.inspection_date)}
                  </div>
                  {lastInspection.inspection_type && (
                    <div style={{ fontSize: '12px', color: colors.textMuted }}>
                      Type: {lastInspection.inspection_type}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: colors.textMuted, fontStyle: 'italic' }}>
                    Jurisdiction publishes this result — EvidLY displays it as-is.
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText style={{ width: '16px', height: '16px', color: colors.textMuted }} />
                  <span style={{ fontSize: '13px', color: colors.textMuted }}>No inspections on record</span>
                </div>
              )}
              <button
                onClick={() => navigate('/documents?upload=inspection')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontSize: '12px', fontWeight: 600, color: colors.navy,
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                <Upload style={{ width: '12px', height: '12px' }} />
                Upload inspection report
              </button>
            </div>

            {/* Open findings */}
            <button
              onClick={() => navigate(`/fire-safety/analysis?status=open${locQuery ? '&' + locQuery.slice(1) : ''}`)}
              style={{
                backgroundColor: 'white', borderRadius: '14px', border: '1px solid rgba(30,45,77,0.1)',
                padding: '20px', cursor: 'pointer', textAlign: 'left',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px',
                transition: 'box-shadow 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(30,45,77,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textSecondary }}>
                Open Findings
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle style={{ width: '20px', height: '20px', color: openFindingCount > 0 ? colors.warning : colors.textMuted }} />
                <span style={{ fontSize: '28px', fontWeight: 700, color: colors.navy }}>{openFindingCount}</span>
              </div>
              {openFindingCount > 0 && (
                <div style={{ fontSize: '12px', color: colors.textMuted }}>
                  {[
                    caSeverity.critical > 0 && `${caSeverity.critical} critical`,
                    caSeverity.high > 0 && `${caSeverity.high} high`,
                    caSeverity.medium > 0 && `${caSeverity.medium} medium`,
                  ].filter(Boolean).join(', ')}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: colors.navy, fontWeight: 600 }}>
                View in Analysis <ChevronRight style={{ width: '14px', height: '14px' }} />
              </div>
            </button>
          </div>

          {/* ── Row 2: PSE Compliance — fire systems ── */}
          <div style={{
            backgroundColor: 'white', borderRadius: '14px', border: '1px solid rgba(30,45,77,0.1)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid rgba(30,45,77,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: colors.navy }}>PSE Compliance</span>
            </div>

            {/* Empty state — no service records yet */}
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                Status of fire alarms, sprinklers, hood, and Ansul will appear here as test and inspection records load.
              </p>
            </div>
          </div>

          {/* ── Row 3: Needs attention right now ── */}
          {needsAttention.length > 0 && (
            <div style={{
              backgroundColor: 'white', borderRadius: '14px', border: '1px solid rgba(30,45,77,0.1)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(30,45,77,0.06)' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: colors.navy }}>Needs Attention Right Now</span>
              </div>
              <div style={{ borderTop: 'none' }}>
                {needsAttention.map((ca, i) => {
                  const sevColor = ca.severity === 'critical' ? colors.danger
                    : ca.severity === 'high' ? '#B45309'
                    : colors.warning;
                  return (
                    <button
                      key={ca.id}
                      onClick={() => navigate(`/corrective-actions?id=${ca.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 20px', width: '100%', textAlign: 'left',
                        backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                        borderBottom: i < needsAttention.length - 1 ? '1px solid rgba(30,45,77,0.06)' : 'none',
                        transition: 'background-color 150ms',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.cream; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: '4px',
                        backgroundColor: sevColor + '18', color: sevColor,
                        flexShrink: 0,
                      }}>
                        {ca.severity}
                      </span>
                      <span style={{ flex: 1, fontSize: '13px', color: colors.navy, fontWeight: 500 }}>
                        {ca.title || 'Untitled'}
                      </span>
                      {ca.due_date && (
                        <span style={{ fontSize: '11px', color: colors.textMuted, flexShrink: 0 }}>
                          Due {fmtDate(ca.due_date)}
                        </span>
                      )}
                      <ChevronRight style={{ width: '14px', height: '14px', color: colors.textMuted, flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Row 4: Go deeper ── */}
          <div style={{
            backgroundColor: '#F8F9FA', borderRadius: '14px', border: '1px solid rgba(30,45,77,0.06)',
            padding: '20px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textSecondary, marginBottom: '12px' }}>
              Go Deeper
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
              <DrillTile
                title="Analysis"
                description="PSE status detail, findings requiring attention"
                onClick={() => navigate(`/fire-safety/analysis${locQuery}`)}
              />
              <DrillTile
                title="Trajectory"
                description="Long view: 90-day PSE test completion trend"
                onClick={() => navigate(`/fire-safety/trajectory${locQuery}`)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
