/**
 * ClientIntelligenceFeed — Tenant-facing intelligence feed
 *
 * Route: /insights/intelligence
 * Access: owner_operator, executive, compliance_manager, platform_admin
 *
 * Shows risk-framed intelligence items correlated to the client's
 * specific locations, jurisdictions, and operations.
 * 4 risk dimensions per item: Revenue, Liability, Cost, Operational
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemoGuard } from '../hooks/useDemoGuard';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#D1D9E6';

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  signal_type: string;
  source_name: string | null;
  priority: string;
  // 4 risk dimensions
  revenue_risk_level: string | null;
  liability_risk_level: string | null;
  cost_risk_level: string | null;
  operational_risk_level: string | null;
  revenue_risk_note: string | null;
  liability_risk_note: string | null;
  cost_risk_note: string | null;
  operational_risk_note: string | null;
  // Action
  recommended_action: string | null;
  action_deadline: string | null;
  action_url: string | null;
  // Status
  is_read: boolean;
  is_actioned: boolean;
  is_dismissed: boolean;
  actioned_at: string | null;
  // Meta
  published_at: string;
  feed_type: string;
  // Opportunity dimensions
  opp_revenue_level?: string | null;
  opp_liability_level?: string | null;
  opp_cost_level?: string | null;
  opp_operational_level?: string | null;
  opp_revenue_note?: string | null;
  opp_liability_note?: string | null;
  opp_cost_note?: string | null;
  opp_operational_note?: string | null;
  relevance_reason?: string | null;
  // Legacy single-dimension (for backwards compat)
  dimension?: string;
  risk_level?: string;
  recommended_actions?: { action: string; priority: string }[];
}

const DIM_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  revenue:     { icon: '\uD83D\uDCB0', label: 'Revenue Risk',     color: '#C2410C', bg: '#FFF7ED' },
  liability:   { icon: '\u2696\uFE0F', label: 'Liability Risk',   color: '#991B1B', bg: '#FEF2F2' },
  cost:        { icon: '\uD83D\uDCB8', label: 'Cost Risk',        color: '#1E40AF', bg: '#EFF6FF' },
  operational: { icon: '\u2699\uFE0F', label: 'Operational Risk', color: '#166534', bg: '#F0FDF4' },
  workforce:   { icon: '\uD83D\uDC77', label: 'Workforce Risk',  color: '#6B21A8', bg: '#F5F3FF' },
};

const OPP_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  revenue:     { icon: '\u2B06', label: 'Revenue Opp',     color: '#065F46', bg: '#ECFDF5' },
  liability:   { icon: '\uD83D\uDEE1', label: 'Liability Opp',   color: '#065F46', bg: '#ECFDF5' },
  cost:        { icon: '\uD83D\uDCB5', label: 'Cost Opp',        color: '#065F46', bg: '#ECFDF5' },
  operational: { icon: '\uD83D\uDE80', label: 'Operational Opp', color: '#065F46', bg: '#ECFDF5' },
  workforce:   { icon: '\uD83D\uDC77', label: 'Workforce Opp',  color: '#065F46', bg: '#ECFDF5' },
};

const LEVEL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: '#FEF2F2', text: '#DC2626', label: 'CRITICAL' },
  high:     { bg: '#FFFBEB', text: '#D97706', label: 'HIGH' },
  moderate: { bg: '#EFF6FF', text: '#2563EB', label: 'MODERATE' },
  medium:   { bg: '#EFF6FF', text: '#2563EB', label: 'MEDIUM' },
  low:      { bg: '#F9FAFB', text: '#6B7280', label: 'LOW' },
};

const PRIORITY_COLORS: Record<string, { dot: string; bg: string; label: string }> = {
  critical: { dot: '#DC2626', bg: '#FEF2F2', label: 'CRITICAL' },
  high:     { dot: '#D97706', bg: '#FFFBEB', label: 'HIGH' },
  normal:   { dot: '#2563EB', bg: '#EFF6FF', label: 'NORMAL' },
  low:      { dot: '#6B7280', bg: '#F9FAFB', label: 'LOW' },
};

// Demo feed items with all 4 risk dimensions
const DEMO_FEED: FeedItem[] = [
  {
    id: 'demo-cif-1',
    title: 'Merced County prioritizing cold-holding enforcement',
    summary: 'Your Airport location operates in Merced County, which has elevated cold-holding temperature compliance to priority enforcement following an outbreak investigation. Digital probe verification is now standard.',
    category: 'food_safety', signal_type: 'enforcement_priority', source_name: 'Merced County',
    priority: 'critical', feed_type: 'jurisdiction',
    revenue_risk_level: 'high', revenue_risk_note: 'Grade card at risk if cold-holding violations found',
    liability_risk_level: 'critical', liability_risk_note: 'Direct liability — post-outbreak enforcement action',
    cost_risk_level: 'low', cost_risk_note: 'No new equipment — process change only',
    operational_risk_level: 'critical', operational_risk_note: 'Immediate cold-holding protocol update required',
    recommended_action: 'Audit all cold-holding units at Airport location immediately. Verify digital probe calibration records.',
    action_deadline: '2026-03-15', action_url: '/temp-logs',
    opp_revenue_level: 'moderate', opp_revenue_note: 'Proactive compliance differentiates your operation',
    opp_liability_level: 'none', opp_liability_note: null,
    opp_cost_level: 'none', opp_cost_note: null,
    opp_operational_level: 'high', opp_operational_note: 'Digital monitoring qualifies for insurance premium discount',
    relevance_reason: 'Your Airport location in Merced County is directly affected by this enforcement priority.',
    is_read: false, is_actioned: false, is_dismissed: false, actioned_at: null,
    published_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-cif-2',
    title: 'Fresno County inspection frequency increasing to semi-annual',
    summary: 'Your Downtown location is in Fresno County, which is increasing routine inspection frequency from annual to semi-annual for high-risk facilities starting April 2026.',
    category: 'food_safety', signal_type: 'inspection_frequency', source_name: 'Fresno County',
    priority: 'high', feed_type: 'jurisdiction',
    revenue_risk_level: 'high', revenue_risk_note: 'More frequent inspections = more grade risk',
    liability_risk_level: 'moderate', liability_risk_note: 'Repeat violations trigger mandatory re-inspection at operator cost',
    cost_risk_level: 'low', cost_risk_note: null,
    operational_risk_level: 'high', operational_risk_note: 'Resolve open CAs before next cycle begins',
    recommended_action: 'Resolve all open corrective actions at Downtown location. Schedule pre-inspection internal audit.',
    action_deadline: '2026-04-01', action_url: '/corrective-actions',
    opp_revenue_level: 'high', opp_revenue_note: 'Clean inspections strengthen grade card and customer trust',
    opp_liability_level: 'moderate', opp_liability_note: 'Proactive CA resolution shows good-faith compliance',
    opp_cost_level: 'none', opp_cost_note: null,
    opp_operational_level: 'moderate', opp_operational_note: 'Internal audits build inspection-ready culture',
    relevance_reason: 'Your Downtown location in Fresno County is directly affected — semi-annual cycle starts April 2026.',
    is_read: false, is_actioned: false, is_dismissed: false, actioned_at: null,
    published_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'demo-cif-3',
    title: 'Stanislaus DER adds allergen management to inspections',
    summary: 'Your University location in Stanislaus County will be scored on food allergen management starting March 2026. Written allergen protocols and staff training records are now required.',
    category: 'food_safety', signal_type: 'methodology_change', source_name: 'Stanislaus County',
    priority: 'high', feed_type: 'jurisdiction',
    revenue_risk_level: 'moderate', revenue_risk_note: 'New scoring category could lower overall grade',
    liability_risk_level: 'critical', liability_risk_note: 'Allergen failure = immediate critical violation',
    cost_risk_level: 'low', cost_risk_note: null,
    operational_risk_level: 'high', operational_risk_note: 'Written allergen protocol + staff training required',
    recommended_action: 'Develop written allergen management protocol for University location. Schedule allergen awareness training for all food handlers.',
    action_deadline: '2026-03-01', action_url: '/training',
    opp_revenue_level: 'high', opp_revenue_note: 'First-mover advantage — written allergen program differentiates you',
    opp_liability_level: 'high', opp_liability_note: 'Written protocol creates legal safe harbor',
    opp_cost_level: 'low', opp_cost_note: 'Training materials available at no cost through EvidLY',
    opp_operational_level: 'moderate', opp_operational_note: 'Allergen checklist integrates with daily prep workflow',
    relevance_reason: 'Your University location in Stanislaus County is directly affected — new scoring category effective March 2026.',
    is_read: false, is_actioned: false, is_dismissed: false, actioned_at: null,
    published_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'demo-cif-4',
    title: 'NFPA 96 2025 edition adopted — monthly grease filter inspections',
    summary: 'Merced County Fire Marshal now requires NFPA 96 (2025) compliance. Grease filter inspection frequency increased from quarterly to monthly for high-volume operations like your Airport location.',
    category: 'facility_safety', signal_type: 'fire_code_update', source_name: 'Merced County Fire',
    priority: 'normal', feed_type: 'regulatory',
    revenue_risk_level: 'none', revenue_risk_note: null,
    liability_risk_level: 'high', liability_risk_note: 'NFPA 96 violation = fire code enforcement',
    cost_risk_level: 'moderate', cost_risk_note: 'Monthly filter inspection adds ~$100-200/mo',
    operational_risk_level: 'moderate', operational_risk_note: 'Update maintenance schedule from quarterly to monthly',
    recommended_action: 'Update grease filter inspection schedule to monthly at Airport. Review NFPA 96 2025 changes with hood vendor.',
    action_deadline: '2026-05-01', action_url: '/equipment',
    opp_revenue_level: 'none', opp_revenue_note: null,
    opp_liability_level: 'moderate', opp_liability_note: 'Early adoption demonstrates compliance posture to fire marshal',
    opp_cost_level: 'low', opp_cost_note: 'Monthly cleaning prevents expensive duct remediation',
    opp_operational_level: 'moderate', opp_operational_note: 'Digital maintenance logs simplify fire inspection prep',
    relevance_reason: 'Your Airport location in Merced County — NFPA 96 2025 now adopted by county fire marshal.',
    is_read: true, is_actioned: false, is_dismissed: false, actioned_at: null,
    published_at: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 'demo-cif-5',
    title: 'Annual hood suppression testing now required in Stanislaus County',
    summary: 'Stanislaus County Fire requires annual UL-300 compliance testing (was biennial). Your University location must schedule its next test before April 15, 2026.',
    category: 'facility_safety', signal_type: 'fire_code_update', source_name: 'Stanislaus County Fire',
    priority: 'high', feed_type: 'jurisdiction',
    revenue_risk_level: 'none', revenue_risk_note: null,
    liability_risk_level: 'high', liability_risk_note: 'Fire code violation = Notice of Violation',
    cost_risk_level: 'high', cost_risk_note: 'UL-300 test ~$400-800 annually (was every 2 years)',
    operational_risk_level: 'moderate', operational_risk_note: 'Schedule with certified suppression technician',
    recommended_action: 'Schedule UL-300 suppression test at University location before April 15.',
    action_deadline: '2026-04-15', action_url: '/equipment',
    opp_revenue_level: 'none', opp_revenue_note: null,
    opp_liability_level: 'high', opp_liability_note: 'Proactive testing avoids Notice of Violation',
    opp_cost_level: 'moderate', opp_cost_note: 'Insurance carriers offer discounts for annual testing documentation',
    opp_operational_level: 'low', opp_operational_note: 'Schedule with certified vendor — EvidLY tracks completion',
    relevance_reason: 'Your University location in Stanislaus County — annual testing now mandatory (was biennial).',
    is_read: false, is_actioned: false, is_dismissed: false, actioned_at: null,
    published_at: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    id: 'demo-cif-6',
    title: 'LA County letter grade display rule change effective June 2026',
    summary: 'Los Angeles County is updating letter grade display requirements. Facilities scoring below 70 must display numerical scores on yellow cards. This affects any future LA County expansion.',
    category: 'food_safety', signal_type: 'grading_change', source_name: 'LA County DPH',
    priority: 'low', feed_type: 'regulatory',
    revenue_risk_level: 'low', revenue_risk_note: 'Affects expansion planning only',
    liability_risk_level: 'moderate', liability_risk_note: 'Below-70 display requirement is public-facing',
    cost_risk_level: 'none', cost_risk_note: null,
    operational_risk_level: 'low', operational_risk_note: 'Monitor if expanding to LA County',
    recommended_action: 'Review LA County grading requirements for expansion planning. Ensure all locations maintain scores above 70.',
    action_deadline: null, action_url: null,
    opp_revenue_level: 'low', opp_revenue_note: 'Early awareness helps expansion planning timeline',
    opp_liability_level: 'none', opp_liability_note: null,
    opp_cost_level: 'none', opp_cost_note: null,
    opp_operational_level: 'low', opp_operational_note: 'Monitor — no immediate action needed',
    relevance_reason: 'Applies to future LA County expansion — informational for your planning team.',
    is_read: true, is_actioned: true, is_dismissed: false, actioned_at: new Date(Date.now() - 86400000).toISOString(),
    published_at: new Date(Date.now() - 432000000).toISOString(),
  },
];

type TabKey = 'all' | 'unread' | 'food_safety' | 'facility_safety' | 'regulatory' | 'actioned';

export function ClientIntelligenceFeed() {
  useDemoGuard();
  const { isDemoMode } = useDemo();
  const { user } = useAuth();

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Local demo state
  const [demoRead, setDemoRead] = useState<Set<string>>(new Set(['demo-cif-4', 'demo-cif-6']));
  const [demoActioned, setDemoActioned] = useState<Set<string>>(new Set(['demo-cif-6']));
  const [demoDismissed, setDemoDismissed] = useState<Set<string>>(new Set());

  const loadFeed = useCallback(async () => {
    setLoading(true);
    if (isDemoMode) {
      setFeed(DEMO_FEED);
      setLoading(false);
      return;
    }
    // Production: query client_intelligence_feed for the user's org
    const { data } = await supabase
      .from('client_intelligence_feed')
      .select('*')
      .eq('is_dismissed', false)
      .order('published_at', { ascending: false })
      .limit(50);
    if (data) setFeed(data);
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Helpers to check local demo overrides
  const isRead = (item: FeedItem) => isDemoMode ? demoRead.has(item.id) : item.is_read;
  const isActioned = (item: FeedItem) => isDemoMode ? demoActioned.has(item.id) : item.is_actioned;
  const isDismissed = (item: FeedItem) => isDemoMode ? demoDismissed.has(item.id) : item.is_dismissed;

  const markRead = async (item: FeedItem) => {
    if (isDemoMode) { setDemoRead(prev => new Set(prev).add(item.id)); return; }
    await supabase.from('client_intelligence_feed').update({ is_read: true }).eq('id', item.id);
    setFeed(prev => prev.map(f => f.id === item.id ? { ...f, is_read: true } : f));
  };

  const markActioned = async (item: FeedItem) => {
    if (isDemoMode) {
      setDemoActioned(prev => new Set(prev).add(item.id));
      setDemoRead(prev => new Set(prev).add(item.id));
      return;
    }
    await supabase.from('client_intelligence_feed').update({
      is_actioned: true, actioned_at: new Date().toISOString(),
      actioned_by: user?.email, is_read: true,
    }).eq('id', item.id);
    setFeed(prev => prev.map(f => f.id === item.id ? { ...f, is_actioned: true, is_read: true } : f));
  };

  const dismiss = async (item: FeedItem) => {
    if (isDemoMode) { setDemoDismissed(prev => new Set(prev).add(item.id)); return; }
    await supabase.from('client_intelligence_feed').update({ is_dismissed: true }).eq('id', item.id);
    setFeed(prev => prev.map(f => f.id === item.id ? { ...f, is_dismissed: true } : f));
  };

  // Filter
  const visible = feed.filter(f => !isDismissed(f));
  const filtered = visible.filter(f => {
    if (activeTab === 'unread' && isRead(f)) return false;
    if (activeTab === 'food_safety' && f.category !== 'food_safety') return false;
    if (activeTab === 'facility_safety' && f.category !== 'facility_safety') return false;
    if (activeTab === 'regulatory' && f.feed_type !== 'regulatory') return false;
    if (activeTab === 'actioned' && !isActioned(f)) return false;
    if (priorityFilter && f.priority !== priorityFilter) return false;
    return true;
  });

  // KPIs
  const unreadCount = visible.filter(f => !isRead(f)).length;
  const criticalCount = visible.filter(f => f.priority === 'critical' && !isActioned(f)).length;
  const needsAction = visible.filter(f => !isActioned(f) && f.recommended_action).length;
  const actionedCount = visible.filter(f => isActioned(f)).length;

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: visible.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'food_safety', label: 'Food Safety' },
    { key: 'facility_safety', label: 'Facility Safety' },
    { key: 'regulatory', label: 'Regulatory' },
    { key: 'actioned', label: 'Actioned', count: actionedCount },
  ];

  const renderRiskGrid = (item: FeedItem) => {
    const dims = [
      { key: 'revenue', level: item.revenue_risk_level, note: item.revenue_risk_note },
      { key: 'liability', level: item.liability_risk_level, note: item.liability_risk_note },
      { key: 'cost', level: item.cost_risk_level, note: item.cost_risk_note },
      { key: 'operational', level: item.operational_risk_level, note: item.operational_risk_note },
    ].filter(d => d.level && d.level !== 'none' && d.level !== 'n/a');

    if (dims.length === 0) return null;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: dims.length > 2 ? '1fr 1fr' : `repeat(${dims.length}, 1fr)`, gap: 8, marginTop: 12 }}>
        {dims.map(d => {
          const meta = DIM_META[d.key];
          const lc = LEVEL_COLORS[d.level!] || LEVEL_COLORS.low;
          return (
            <div key={d.key} style={{
              background: meta.bg, borderRadius: 8, padding: '8px 10px',
              border: `1px solid ${meta.color}15`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <span style={{ fontSize: 12 }}>{meta.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label.replace(' Risk', '')}</span>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 800, color: lc.text,
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                {lc.label}
              </div>
              {d.note && (
                <div style={{ fontSize: 10, color: meta.color, marginTop: 3, lineHeight: 1.4, opacity: 0.85 }}>
                  {d.note}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderOppGrid = (item: FeedItem) => {
    const dims = [
      { key: 'revenue', level: item.opp_revenue_level, note: item.opp_revenue_note },
      { key: 'liability', level: item.opp_liability_level, note: item.opp_liability_note },
      { key: 'cost', level: item.opp_cost_level, note: item.opp_cost_note },
      { key: 'operational', level: item.opp_operational_level, note: item.opp_operational_note },
    ].filter(d => d.level && d.level !== 'none' && d.level !== 'n/a');

    if (dims.length === 0) return null;

    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#065F46', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Opportunity — acting early
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: dims.length > 2 ? '1fr 1fr' : `repeat(${dims.length}, 1fr)`, gap: 8 }}>
          {dims.map(d => {
            const meta = OPP_META[d.key];
            const lc = LEVEL_COLORS[d.level!] || LEVEL_COLORS.low;
            return (
              <div key={d.key} style={{
                background: meta.bg, borderRadius: 8, padding: '8px 10px',
                border: '1px solid #A7F3D0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <span style={{ fontSize: 12 }}>{meta.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label.replace(' Opp', '')}</span>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 800, color: lc.text,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  {lc.label}
                </div>
                {d.note && (
                  <div style={{ fontSize: 10, color: meta.color, marginTop: 3, lineHeight: 1.4, opacity: 0.85 }}>
                    {d.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>
          Intelligence Feed
        </h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SEC }}>
          What you need to know, specific to your kitchens.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Unread', value: unreadCount, color: unreadCount > 0 ? '#2563EB' : TEXT_MUTED },
          { label: 'Critical', value: criticalCount, color: criticalCount > 0 ? '#DC2626' : TEXT_MUTED },
          { label: 'Requiring Action', value: needsAction, color: needsAction > 0 ? '#D97706' : TEXT_MUTED },
          { label: 'Actioned', value: actionedCount, color: '#059669' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border p-4" style={{ borderColor: BORDER }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: k.color }}>
              {loading ? '\u2014' : k.value}
            </div>
            <div className="text-[11px] mt-1" style={{ color: TEXT_MUTED }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: `1px solid ${BORDER}`, paddingBottom: 1 }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', border: 'none', borderRadius: '6px 6px 0 0',
              color: activeTab === tab.key ? NAVY : TEXT_MUTED,
              borderBottom: activeTab === tab.key ? `2px solid ${GOLD}` : '2px solid transparent',
            }}>
            {tab.label}{tab.count != null ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="text-sm rounded-lg border px-3 py-2 bg-white"
          style={{ borderColor: BORDER, color: NAVY }}>
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        {(priorityFilter || activeTab !== 'all') && (
          <button onClick={() => { setPriorityFilter(''); setActiveTab('all'); }}
            className="text-xs font-medium underline" style={{ color: TEXT_SEC }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Feed cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-xl border bg-white animate-pulse" style={{ borderColor: BORDER }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border" style={{ borderColor: BORDER }}>
          <div className="text-4xl mb-3">{'\u26A1'}</div>
          <div className="text-sm font-semibold" style={{ color: NAVY }}>
            {visible.length === 0 ? 'No intelligence items yet' : 'No items match your filters'}
          </div>
          <div className="text-xs mt-1" style={{ color: TEXT_SEC }}>
            {visible.length === 0
              ? 'Intelligence items will appear here as they are published by the EvidLY team.'
              : 'Adjust your filters to see more items.'}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => {
            const pc = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.normal;
            const itemRead = isRead(item);
            const itemActioned = isActioned(item);

            return (
              <div key={item.id} className="rounded-xl border bg-white overflow-hidden transition-all"
                style={{
                  borderColor: BORDER,
                  borderLeft: `4px solid ${pc.dot}`,
                  opacity: itemActioned ? 0.75 : 1,
                }}
                onMouseEnter={() => { if (!itemRead) markRead(item); }}
              >
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: pc.dot }}>
                          {pc.label}
                        </span>
                        {item.category && (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: item.category === 'food_safety' ? '#ECFDF5' : '#FFF7ED', color: item.category === 'food_safety' ? '#065F46' : '#9A3412' }}>
                            {item.category.replace(/_/g, ' ')}
                          </span>
                        )}
                        {item.signal_type && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: '#F9FAFB', color: TEXT_SEC, border: `1px solid ${BORDER}` }}>
                            {item.signal_type.replace(/_/g, ' ')}
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: TEXT_MUTED }}>
                          {new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {!itemRead && (
                          <span className="w-2 h-2 rounded-full" style={{ background: '#2563EB' }} />
                        )}
                      </div>
                      <h3 className="text-[15px] font-bold" style={{ color: NAVY }}>{item.title}</h3>
                    </div>
                    {/* Dismiss */}
                    <button onClick={() => dismiss(item)} className="text-[10px] px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      style={{ color: TEXT_MUTED }} title="Dismiss">
                      ×
                    </button>
                  </div>

                  {/* Summary */}
                  <p className="text-xs leading-relaxed mb-1" style={{ color: TEXT_SEC, lineHeight: 1.7 }}>
                    {item.summary}
                  </p>

                  {/* Relevance reason */}
                  {item.relevance_reason && (
                    <div style={{
                      marginTop: 10, padding: '6px 10px', borderRadius: 6,
                      background: '#FFFBEB', border: '1px solid #E8D9B8',
                      fontSize: 11, color: '#92400E', lineHeight: 1.5,
                    }}>
                      {item.relevance_reason}
                    </div>
                  )}

                  {/* 2x2 Risk Grid */}
                  {renderRiskGrid(item)}

                  {/* 2x2 Opportunity Grid */}
                  {renderOppGrid(item)}

                  {/* Recommended action */}
                  {item.recommended_action && (
                    <div className="mt-3 rounded-lg p-3" style={{ background: '#F9FAFB', border: `1px solid ${BORDER}` }}>
                      <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: TEXT_MUTED }}>
                        Recommended Action
                      </div>
                      <div className="text-xs" style={{ color: NAVY, lineHeight: 1.6 }}>
                        {item.recommended_action}
                      </div>
                      {item.action_deadline && (
                        <div className="text-[10px] mt-1.5 font-medium" style={{ color: '#D97706' }}>
                          Deadline: {new Date(item.action_deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Legacy: recommended_actions array (backwards compat) */}
                  {!item.recommended_action && item.recommended_actions && item.recommended_actions.length > 0 && (
                    <div className="mt-3 rounded-lg p-3" style={{ background: '#F9FAFB', border: `1px solid ${BORDER}` }}>
                      <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: TEXT_MUTED }}>
                        Recommended Actions
                      </div>
                      <div className="space-y-1">
                        {item.recommended_actions.map((ra, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                              style={{ background: ra.priority === 'critical' ? '#DC2626' : ra.priority === 'high' ? '#D97706' : '#2563EB' }} />
                            <span className="text-xs" style={{ color: NAVY }}>{ra.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <span className="text-[11px]" style={{ color: TEXT_MUTED }}>
                      {item.source_name ? `${item.source_name} · ` : ''}
                      {new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-2">
                      {itemActioned ? (
                        <span className="text-[10px] font-semibold" style={{ color: '#059669' }}>
                          {'\u2713'} Actioned
                        </span>
                      ) : (
                        <button onClick={() => markActioned(item)}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors hover:bg-green-50"
                          style={{ color: '#059669', border: '1px solid #BBF7D0' }}>
                          {'\u2713'} Mark as Actioned
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
