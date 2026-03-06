/**
 * EvidLY Intelligence — The Moat
 * 80+ sources crawled. Every signal correlated to clients, jurisdictions, and industries.
 * Route: /admin/intelligence
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { INDUSTRY_LABELS, SCOPE_LABELS, correlateSignal, type CorrelationPreview } from '../../lib/correlationEngine';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E5E0D8';

type Tab = 'overview' | 'signals' | 'sources' | 'jie' | 'correlations' | 'scoretable' | 'jurisdiction_updates';

interface Source {
  id: string;
  source_key: string;
  name: string;
  category: string;
  subcategory: string | null;
  url: string | null;
  crawl_method: string | null;
  crawl_frequency: string;
  last_crawled_at: string | null;
  last_signal_at: string | null;
  status: string;
  signal_count_total: number;
  signal_count_30d: number;
  is_demo_critical: boolean;
}

interface Signal {
  id: string;
  source_key: string | null;
  signal_type: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  discovered_at: string;
  scope: string | null;
  affected_jurisdictions: string[];
  ai_summary: string | null;
  ai_impact_score: number | null;
  ai_urgency: string | null;
  ai_client_impact: string | null;
  ai_platform_impact: string | null;
  ai_confidence: number | null;
  status: string;
  risk_revenue: string | null;
  risk_liability: string | null;
  risk_cost: string | null;
  risk_operational: string | null;
  orgs_affected: number;
  target_industries: string[] | null;
  target_counties: string[] | null;
  target_all_industries: boolean;
  signal_scope: string | null;
  opp_revenue: string | null;
  opp_liability: string | null;
  opp_cost: string | null;
  opp_operational: string | null;
  opp_revenue_note: string | null;
  opp_liability_note: string | null;
  opp_cost_note: string | null;
  opp_operational_note: string | null;
}

interface JIEUpdate {
  id: string;
  signal_id: string | null;
  jurisdiction_key: string;
  jurisdiction_name: string | null;
  update_type: string;
  description: string | null;
  effective_date: string | null;
  verified: boolean;
  verified_by: string | null;
  published_to_clients: boolean;
  created_at: string;
}

interface Correlation {
  id: string;
  signal_id: string;
  correlation_type: string;
  jurisdiction_key: string | null;
  county: string | null;
  industry: string | null;
  impact_level: string;
  impact_description: string | null;
  action_required: boolean;
  action_description: string | null;
  created_at: string;
}

interface JurisdictionIntelUpdate {
  id: string;
  jurisdiction_key: string;
  jurisdiction_name: string;
  county: string | null;
  pillar: string;
  update_type: string;
  title: string;
  description: string | null;
  effective_date: string | null;
  risk_revenue: string | null;
  risk_liability: string | null;
  risk_cost: string | null;
  risk_operational: string | null;
  verified: boolean;
  verified_by: string | null;
  published: boolean;
  published_by: string | null;
  created_at: string;
}

const RISK_DIM_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: '#FEF2F2', text: '#DC2626', label: 'CRIT' },
  high:     { bg: '#FFFBEB', text: '#D97706', label: 'HIGH' },
  moderate: { bg: '#EFF6FF', text: '#2563EB', label: 'MOD' },
  low:      { bg: '#F9FAFB', text: '#6B7280', label: 'LOW' },
  none:     { bg: 'transparent', text: 'transparent', label: '' },
};

const PILLAR_COLORS: Record<string, { bg: string; text: string }> = {
  food_safety:     { bg: '#ECFDF5', text: '#065F46' },
  facility_safety: { bg: '#FFF7ED', text: '#9A3412' },
  both:            { bg: '#F5F3FF', text: '#5B21B6' },
};

const URGENCY_COLORS: Record<string, { bg: string; text: string }> = {
  critical:      { bg: '#FEF2F2', text: '#DC2626' },
  high:          { bg: '#FFFBEB', text: '#D97706' },
  medium:        { bg: '#EFF6FF', text: '#2563EB' },
  low:           { bg: '#F9FAFB', text: '#6B7280' },
  informational: { bg: '#F9FAFB', text: '#9CA3AF' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:      { bg: '#ECFDF5', text: '#059669' },
  paused:      { bg: '#F9FAFB', text: '#6B7280' },
  waf_blocked: { bg: '#F5F3FF', text: '#7C3AED' },
  broken:      { bg: '#FEF2F2', text: '#DC2626' },
  pending:     { bg: '#FFFBEB', text: '#D97706' },
};

const CATEGORY_META: { key: string; label: string; icon: string }[] = [
  { key: 'jurisdiction_food', label: 'County EH Depts (Food)', icon: '🍽' },
  { key: 'jurisdiction_fire', label: 'AHJs (Fire)',            icon: '🔥' },
  { key: 'state_agency',      label: 'CA State Agencies',      icon: '🏛' },
  { key: 'federal_agency',    label: 'Federal Agencies',       icon: '🇺🇸' },
  { key: 'legislative',       label: 'Legislative',            icon: '📜' },
  { key: 'industry',          label: 'Industry Standards',     icon: '📋' },
  { key: 'insurance',         label: 'Insurance',              icon: '🛡' },
  { key: 'competitive',       label: 'Competitive',            icon: '🔭' },
  { key: 'news',              label: 'Trade Press',            icon: '📰' },
];

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '48px 20px', background: '#FAFAF8', border: '1.5px dashed #E5E0D8', borderRadius: 10 }}>
    <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 12, color: TEXT_SEC, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>{subtitle}</div>
  </div>
);

export default function EvidLYIntelligence() {
  const { user } = useAuth();

  const [sources, setSources] = useState<Source[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [jieUpdates, setJieUpdates] = useState<JIEUpdate[]>([]);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [jurisdictionUpdates, setJurisdictionUpdates] = useState<JurisdictionIntelUpdate[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [crawlRunning, setCrawlRunning] = useState(false);
  const [crawlFeedback, setCrawlFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Filters
  const [sigFilter, setSigFilter] = useState({ search: '', urgency: '', type: '', status: '' });
  const [srcCatFilter, setSrcCatFilter] = useState('');
  const [srcStatusFilter, setSrcStatusFilter] = useState('');
  const [srcDemoOnly, setSrcDemoOnly] = useState(false);

  // Publish Advisory modal
  const [publishModal, setPublishModal] = useState<{ open: boolean; signal: Signal | null }>({ open: false, signal: null });
  const [pubForm, setPubForm] = useState({
    title: '', summary: '',
    revenueRisk: 'none' as string, liabilityRisk: 'none' as string,
    costRisk: 'none' as string, operationalRisk: 'none' as string,
    revenueNote: '', liabilityNote: '', costNote: '', operationalNote: '',
    oppRevenue: 'none' as string, oppLiability: 'none' as string,
    oppCost: 'none' as string, oppOperational: 'none' as string,
    oppRevenueNote: '', oppLiabilityNote: '', oppCostNote: '', oppOperationalNote: '',
    allIndustries: true, targetIndustries: [] as string[], targetCounties: '',
    signalScope: 'statewide' as string,
    recommendedAction: '', actionDeadline: '',
  });
  const [impactPreview, setImpactPreview] = useState<CorrelationPreview | null>(null);

  // ScoreTable analytics
  const [scoreTableData, setScoreTableData] = useState<{ county_slug: string; total_views: number; unique_sessions: number; views_7d: number; views_30d: number; last_viewed: string | null }[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [sourcesRes, signalsRes, jieRes, corrRes, stRes, jiuRes] = await Promise.all([
      supabase.from('intelligence_sources').select('*').order('category').order('name'),
      supabase.from('intelligence_signals').select('*').order('discovered_at', { ascending: false }).limit(200),
      supabase.from('jie_updates').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('intelligence_correlations').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('scoretable_views').select('county_slug, viewed_at, session_id').order('viewed_at', { ascending: false }).limit(5000),
      supabase.from('jurisdiction_intel_updates').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    if (sourcesRes.data) setSources(sourcesRes.data);
    if (signalsRes.data) setSignals(signalsRes.data);
    if (jieRes.data) setJieUpdates(jieRes.data);
    if (corrRes.data) setCorrelations(corrRes.data);
    if (jiuRes.data) setJurisdictionUpdates(jiuRes.data);
    // Aggregate ScoreTable views client-side
    if (stRes.data && stRes.data.length > 0) {
      const now = Date.now();
      const d7 = 7 * 86400000;
      const d30 = 30 * 86400000;
      const byCounty: Record<string, { total: number; sessions: Set<string>; v7: number; v30: number; last: string }> = {};
      for (const row of stRes.data) {
        const slug = row.county_slug;
        if (!byCounty[slug]) byCounty[slug] = { total: 0, sessions: new Set(), v7: 0, v30: 0, last: '' };
        byCounty[slug].total++;
        if (row.session_id) byCounty[slug].sessions.add(row.session_id);
        const age = now - new Date(row.viewed_at).getTime();
        if (age < d7) byCounty[slug].v7++;
        if (age < d30) byCounty[slug].v30++;
        if (!byCounty[slug].last || row.viewed_at > byCounty[slug].last) byCounty[slug].last = row.viewed_at;
      }
      setScoreTableData(Object.entries(byCounty).map(([slug, d]) => ({
        county_slug: slug,
        total_views: d.total,
        unique_sessions: d.sessions.size,
        views_7d: d.v7,
        views_30d: d.v30,
        last_viewed: d.last,
      })).sort((a, b) => b.total_views - a.total_views));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Impact preview: refresh when targeting fields change in publish modal
  useEffect(() => {
    if (!publishModal.open) return;
    const targetCountiesArr = pubForm.targetCounties.split(',').map(c => c.trim()).filter(Boolean);
    const targeting = {
      target_industries: pubForm.targetIndustries,
      target_all_industries: pubForm.allIndustries,
      target_counties: targetCountiesArr,
      signal_scope: pubForm.signalScope,
    };
    let cancelled = false;
    const isDemoMode = !user || user.email === 'demo@getevidly.com';
    correlateSignal(targeting, supabase, isDemoMode).then(preview => {
      if (!cancelled) setImpactPreview(preview);
    });
    return () => { cancelled = true; };
  }, [publishModal.open, pubForm.allIndustries, pubForm.targetIndustries, pubForm.targetCounties, pubForm.signalScope, user]);

  // Derived stats
  const totalSources = sources.length;
  const activeSources = sources.filter(s => s.status === 'active').length;
  const brokenSources = sources.filter(s => ['broken', 'waf_blocked'].includes(s.status)).length;
  const demoCritical = sources.filter(s => s.is_demo_critical).length;
  const newSignals = signals.filter(s => s.status === 'new').length;
  const criticalSignals = signals.filter(s => s.ai_urgency === 'critical').length;
  const pendingReview = signals.filter(s => ['new', 'analyzing', 'analyzed'].includes(s.status)).length;

  // Filtered signals
  const filteredSignals = signals.filter(s => {
    if (sigFilter.search && !s.title?.toLowerCase().includes(sigFilter.search.toLowerCase())) return false;
    if (sigFilter.urgency && s.ai_urgency !== sigFilter.urgency) return false;
    if (sigFilter.type && s.signal_type !== sigFilter.type) return false;
    if (sigFilter.status && s.status !== sigFilter.status) return false;
    return true;
  });

  // Filtered sources
  const filteredSources = sources.filter(s => {
    if (srcCatFilter && s.category !== srcCatFilter) return false;
    if (srcStatusFilter && s.status !== srcStatusFilter) return false;
    if (srcDemoOnly && !s.is_demo_critical) return false;
    return true;
  });

  // Actions
  const updateSignalStatus = async (signalId: string, newStatus: string) => {
    await supabase.from('intelligence_signals')
      .update({ status: newStatus, reviewed_by: user?.email, reviewed_at: new Date().toISOString() })
      .eq('id', signalId);
    setSignals(prev => prev.map(s => s.id === signalId ? { ...s, status: newStatus } : s));
  };

  const runIntelligence = async () => {
    setCrawlRunning(true);
    setCrawlFeedback(null);
    try {
      const { data, error } = await supabase.functions.invoke('intelligence-collect');
      if (error) throw error;
      const newCount = data?.new_insights ?? data?.newInsights ?? 0;
      setCrawlFeedback({ type: 'success', msg: `Crawl completed. ${newCount} new signals discovered.` });
      await loadAll();
    } catch (err: any) {
      setCrawlFeedback({ type: 'error', msg: `Crawl failed: ${err.message || 'Edge function error. Check Supabase logs.'}` });
    }
    setCrawlRunning(false);
  };

  const updateSignalRisk = async (signalId: string, dimension: string, level: string) => {
    const col = `risk_${dimension}` as keyof Signal;
    await supabase.from('intelligence_signals')
      .update({ [col]: level })
      .eq('id', signalId);
    setSignals(prev => prev.map(s => s.id === signalId ? { ...s, [col]: level } : s));
  };

  const publishJurisdictionUpdate = async (updateId: string) => {
    await supabase.from('jurisdiction_intel_updates')
      .update({ published: true, published_by: user?.email, published_at: new Date().toISOString() })
      .eq('id', updateId);
    const updated = jurisdictionUpdates.find(u => u.id === updateId);
    setJurisdictionUpdates(prev => prev.map(u => u.id === updateId ? { ...u, published: true, published_by: user?.email || null } : u));
    // Auto-deliver to affected clients
    if (updated) {
      await deliverToClients('jurisdiction_update', updateId, updated.title);
    }
  };

  const verifyJurisdictionUpdate = async (updateId: string) => {
    await supabase.from('jurisdiction_intel_updates')
      .update({ verified: true, verified_by: user?.email, verified_at: new Date().toISOString() })
      .eq('id', updateId);
    setJurisdictionUpdates(prev => prev.map(u => u.id === updateId ? { ...u, verified: true, verified_by: user?.email || null } : u));
  };

  const publishJIEUpdate = async (updateId: string) => {
    await supabase.from('jie_updates')
      .update({ published_to_clients: true })
      .eq('id', updateId);
    setJieUpdates(prev => prev.map(u => u.id === updateId ? { ...u, published_to_clients: true } : u));
  };

  const openPublishModal = (signal: Signal) => {
    setPubForm({
      title: signal.title,
      summary: signal.ai_summary || signal.summary || '',
      revenueRisk: signal.risk_revenue || 'none',
      liabilityRisk: signal.risk_liability || 'none',
      costRisk: signal.risk_cost || 'none',
      operationalRisk: signal.risk_operational || 'none',
      revenueNote: '', liabilityNote: '', costNote: '', operationalNote: '',
      oppRevenue: signal.opp_revenue || 'none', oppLiability: signal.opp_liability || 'none',
      oppCost: signal.opp_cost || 'none', oppOperational: signal.opp_operational || 'none',
      oppRevenueNote: signal.opp_revenue_note || '', oppLiabilityNote: signal.opp_liability_note || '',
      oppCostNote: signal.opp_cost_note || '', oppOperationalNote: signal.opp_operational_note || '',
      allIndustries: signal.target_all_industries ?? true,
      targetIndustries: signal.target_industries || [],
      targetCounties: (signal.target_counties || []).join(', '),
      signalScope: signal.signal_scope || 'statewide',
      recommendedAction: '', actionDeadline: '',
    });
    setImpactPreview(null);
    setPublishModal({ open: true, signal });
  };

  const computePriority = (form: typeof pubForm) => {
    const levels = [form.revenueRisk, form.liabilityRisk, form.costRisk, form.operationalRisk];
    if (levels.includes('critical')) return 'critical';
    if (levels.includes('high')) return 'high';
    if (levels.includes('moderate')) return 'normal';
    return 'low';
  };

  const deliverToClients = async (type: 'advisory' | 'jurisdiction_update', id: string, title: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('intelligence-deliver', {
        body: { type, id },
      });
      if (error) throw error;
      alert(`Delivered "${title}" to ${data?.delivered || 0} organizations. ${data?.emailed || 0} email notifications sent.`);
    } catch {
      alert(`[Demo] Intelligence delivery triggered for "${title}". In production, this sends email notifications to all affected clients.`);
    }
  };

  const submitAdvisory = async () => {
    const sig = publishModal.signal;
    if (!sig) return;
    const targetCountiesArr = pubForm.targetCounties.split(',').map(c => c.trim()).filter(Boolean);
    // 1. Update signal with risk + opportunity dimensions + targeting + published status
    await supabase.from('intelligence_signals').update({
      risk_revenue: pubForm.revenueRisk,
      risk_liability: pubForm.liabilityRisk,
      risk_cost: pubForm.costRisk,
      risk_operational: pubForm.operationalRisk,
      revenue_risk_note: pubForm.revenueNote || null,
      liability_risk_note: pubForm.liabilityNote || null,
      cost_risk_note: pubForm.costNote || null,
      operational_risk_note: pubForm.operationalNote || null,
      opp_revenue: pubForm.oppRevenue,
      opp_liability: pubForm.oppLiability,
      opp_cost: pubForm.oppCost,
      opp_operational: pubForm.oppOperational,
      opp_revenue_note: pubForm.oppRevenueNote || null,
      opp_liability_note: pubForm.oppLiabilityNote || null,
      opp_cost_note: pubForm.oppCostNote || null,
      opp_operational_note: pubForm.oppOperationalNote || null,
      target_industries: pubForm.allIndustries ? [] : pubForm.targetIndustries,
      target_all_industries: pubForm.allIndustries,
      target_counties: targetCountiesArr,
      signal_scope: pubForm.signalScope,
      recommended_action: pubForm.recommendedAction || null,
      action_deadline: pubForm.actionDeadline || null,
      is_published: true,
      published_at: new Date().toISOString(),
      published_by: user?.email,
    }).eq('id', sig.id);
    // 2. Also insert into client_advisories for backwards compat
    const primaryDim = [
      { key: 'liability', val: pubForm.liabilityRisk },
      { key: 'revenue', val: pubForm.revenueRisk },
      { key: 'cost', val: pubForm.costRisk },
      { key: 'operational', val: pubForm.operationalRisk },
    ].sort((a, b) => {
      const order = ['critical', 'high', 'moderate', 'low', 'none'];
      return order.indexOf(a.val) - order.indexOf(b.val);
    })[0];
    const { data: advisory } = await supabase.from('client_advisories').insert({
      signal_id: sig.id,
      title: pubForm.title,
      summary: pubForm.summary,
      dimension: primaryDim.key,
      risk_level: primaryDim.val === 'moderate' ? 'medium' : primaryDim.val,
      advisory_type: primaryDim.val === 'critical' ? 'action_required' : 'risk',
      published_by: user?.email,
    }).select('id').single();
    await updateSignalStatus(sig.id, 'published');
    setPublishModal({ open: false, signal: null });
    // 3. Deliver to affected clients
    if (advisory?.id) {
      await deliverToClients('advisory', advisory.id, pubForm.title);
    } else {
      alert('Advisory published to client intelligence feed.');
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 12px', background: '#F9FAFB', border: '1px solid #D1D5DB',
    borderRadius: 6, color: NAVY, fontSize: 12,
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '10px 14px', color: TEXT_SEC,
    fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
  };

  const tdStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 12 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Syne, sans-serif', color: NAVY }}>
              EvidLY Intelligence
            </span>
            <span style={{
              fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 10,
              background: 'linear-gradient(135deg, #A08C5A, #C4AA72)', color: '#fff', letterSpacing: '1px',
            }}>
              ⚡ MOAT
            </span>
          </div>
          <div style={{ fontSize: 13, color: TEXT_MUTED }}>
            {totalSources} sources crawled · Every signal correlated to clients, jurisdictions, and industries
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {crawlFeedback && (
            <span style={{ fontSize: 11, fontWeight: 600, color: crawlFeedback.type === 'success' ? '#059669' : '#DC2626' }}>
              {crawlFeedback.msg}
            </span>
          )}
          <button onClick={runIntelligence} disabled={crawlRunning}
            style={{ padding: '8px 16px', background: crawlRunning ? '#9CA3AF' : NAVY, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: crawlRunning ? 'wait' : 'pointer', opacity: crawlRunning ? 0.7 : 1 }}>
            {crawlRunning ? '⟳ Crawling...' : '⟳ Run Now'}
          </button>
          <button onClick={() => setActiveTab('sources')}
            style={{ padding: '8px 16px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, color: NAVY, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Manage Sources
          </button>
        </div>
      </div>

      {/* Canonical KPI Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #1E2D4D 0%, #253B5E 100%)',
        borderRadius: 12, padding: '18px 24px',
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16,
      }}>
        {[
          { label: 'Total Signals', value: signals.length, accent: '#fff' },
          { label: 'Pending Review', value: pendingReview, accent: pendingReview > 0 ? '#FBBF24' : '#94A3B8' },
          { label: 'Critical', value: criticalSignals, accent: criticalSignals > 0 ? '#F87171' : '#94A3B8' },
          { label: 'Published', value: signals.filter(s => s.status === 'published').length, accent: '#34D399' },
          { label: 'Sources', value: totalSources, accent: '#94A3B8', note: `${activeSources} active · ${brokenSources} broken` },
        ].map(k => (
          <div key={k.label}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 800, color: k.accent, lineHeight: 1 }}>
              {loading ? '\u2014' : k.value}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: 500 }}>{k.label}</div>
            {k.note && <div style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>{k.note}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}` }}>
        {([
          { key: 'overview' as Tab, label: 'Overview' },
          { key: 'signals' as Tab, label: `Signals${pendingReview > 0 ? ` (${pendingReview})` : ''}` },
          { key: 'sources' as Tab, label: `Sources (${totalSources})` },
          { key: 'jie' as Tab, label: 'JIE Updates' },
          { key: 'correlations' as Tab, label: 'Correlations' },
          { key: 'jurisdiction_updates' as Tab, label: `Jurisdiction${jurisdictionUpdates.length > 0 ? ` (${jurisdictionUpdates.length})` : ''}` },
          { key: 'scoretable' as Tab, label: `ScoreTable${scoreTableData.length > 0 ? ` (${scoreTableData.reduce((s, d) => s + d.total_views, 0)})` : ''}` },
        ]).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '10px 20px', fontSize: 13, cursor: 'pointer', background: 'none', border: 'none',
            color: activeTab === t.key ? GOLD : TEXT_MUTED,
            borderBottom: `2px solid ${activeTab === t.key ? GOLD : 'transparent'}`,
            marginBottom: -2, fontWeight: activeTab === t.key ? 600 : 400, transition: 'all 0.12s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ────────── TAB: OVERVIEW ────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Source health by category */}
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Source Health by Category</div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={28} />)}
              </div>
            ) : CATEGORY_META.map(cat => {
              const catSources = sources.filter(s => s.category === cat.key);
              const active = catSources.filter(s => s.status === 'active').length;
              const broken = catSources.filter(s => ['broken', 'waf_blocked'].includes(s.status)).length;
              return (
                <div key={cat.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid #F0EDE8',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{cat.icon}</span>
                    <span style={{ fontSize: 12, color: '#4A5568' }}>{cat.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                    <span style={{ color: '#059669', fontWeight: 600 }}>{active} live</span>
                    {broken > 0 && <span style={{ color: '#DC2626', fontWeight: 600 }}>⚠ {broken} broken</span>}
                    {catSources.length === 0 && <span style={{ color: TEXT_MUTED }}>none</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent signals */}
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 16 }}>
              Recent Signals
              {criticalSignals > 0 && (
                <span style={{ marginLeft: 8, fontSize: 10, background: '#FEF2F2', color: '#DC2626',
                  padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>
                  {criticalSignals} CRITICAL
                </span>
              )}
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={36} />)}
              </div>
            ) : signals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: TEXT_MUTED, fontSize: 12 }}>
                No signals yet — run intelligence crawler to populate
              </div>
            ) : signals.slice(0, 8).map(sig => {
              const uc = URGENCY_COLORS[sig.ai_urgency || ''] || URGENCY_COLORS.low;
              return (
                <div key={sig.id} style={{
                  padding: '9px 0', borderBottom: '1px solid #F0EDE8',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 10, whiteSpace: 'nowrap', marginTop: 2,
                    background: uc.bg, color: uc.text,
                  }}>
                    {(sig.ai_urgency || 'new').toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: NAVY, fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sig.title}
                    </div>
                    <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                      {sig.signal_type?.replace(/_/g, ' ')} · {sig.source_key} · {new Date(sig.discovered_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Demo-critical sources */}
          <div style={{ background: '#fff', border: `1.5px solid #E8D9B8`, borderRadius: 10, padding: 20, gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Demo-Critical Sources</div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 14 }}>
              These sources must be operational for the Aramark Yosemite demo and all client-facing demos.
            </div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={60} />)}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {sources.filter(s => s.is_demo_critical).map(s => (
                  <div key={s.id} style={{
                    padding: '10px 12px', borderRadius: 8, border: '1px solid',
                    borderColor: s.status === 'active' ? '#BBF7D0' : '#FECACA',
                    background: s.status === 'active' ? '#F0FDF4' : '#FEF2F2',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600,
                      color: s.status === 'active' ? '#065F46' : '#991B1B' }}>
                      {s.status === 'active' ? '● ' : '✗ '}{s.name}
                    </div>
                    <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                      {s.crawl_method} · {s.crawl_frequency}
                    </div>
                    {s.last_crawled_at && (
                      <div style={{ fontSize: 9, color: TEXT_MUTED, marginTop: 2 }}>
                        Last: {new Date(s.last_crawled_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────── TAB: SIGNALS ────────── */}
      {activeTab === 'signals' && (
        <>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input placeholder="Search signals..." value={sigFilter.search}
              onChange={e => setSigFilter(f => ({ ...f, search: e.target.value }))}
              style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
            <select value={sigFilter.urgency} onChange={e => setSigFilter(f => ({ ...f, urgency: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">All Urgency</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="informational">Informational</option>
            </select>
            <select value={sigFilter.type} onChange={e => setSigFilter(f => ({ ...f, type: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">All Types</option>
              <option value="regulatory_change">Regulatory Change</option>
              <option value="recall">Recall</option>
              <option value="outbreak">Outbreak</option>
              <option value="inspection_methodology">Inspection Methodology</option>
              <option value="nfpa_update">NFPA Update</option>
              <option value="fire_inspection_change">Fire Inspection Change</option>
              <option value="legislation">Legislation</option>
              <option value="competitor_activity">Competitor Activity</option>
            </select>
            <select value={sigFilter.status} onChange={e => setSigFilter(f => ({ ...f, status: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="analyzing">Analyzing</option>
              <option value="analyzed">Analyzed</option>
              <option value="reviewed">Reviewed</option>
              <option value="published">Published</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={80} />)}
            </div>
          ) : filteredSignals.length === 0 ? (
            <EmptyState
              icon="📡"
              title="No signals yet"
              subtitle="Run the intelligence crawler to populate signals from all 80+ sources. Signals are automatically analyzed by AI for urgency, impact, and client correlation."
            />
          ) : filteredSignals.map(sig => {
            const uc = URGENCY_COLORS[sig.ai_urgency || ''] || URGENCY_COLORS.low;
            return (
              <div key={sig.id} style={{
                background: '#fff', border: `1px solid ${sig.ai_urgency === 'critical' ? '#FECACA' : BORDER}`,
                borderRadius: 10, padding: '16px 18px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      {sig.ai_urgency && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: uc.bg, color: uc.text }}>
                          {sig.ai_urgency.toUpperCase()}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: TEXT_SEC, background: '#F9FAFB', border: `1px solid ${BORDER}`, padding: '1px 7px', borderRadius: 10 }}>
                        {sig.signal_type?.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: 10, color: GOLD }}>{sig.source_key}</span>
                      {sig.scope && <span style={{ fontSize: 10, color: TEXT_MUTED }}>{sig.scope}</span>}
                      {sig.signal_scope && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: NAVY, color: '#fff' }}>
                          {SCOPE_LABELS[sig.signal_scope] || sig.signal_scope}
                        </span>
                      )}
                      {sig.target_industries && !sig.target_all_industries && sig.target_industries.length > 0 && (
                        sig.target_industries.slice(0, 2).map(ind => (
                          <span key={ind} style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, border: `1px solid ${GOLD}`, color: GOLD }}>
                            {INDUSTRY_LABELS[ind] || ind}
                          </span>
                        ))
                      )}
                      {sig.target_counties && sig.target_counties.length > 0 && (
                        <span style={{ fontSize: 9, color: TEXT_SEC }}>{sig.target_counties.length} {sig.target_counties.length === 1 ? 'county' : 'counties'}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>{sig.title}</div>
                    {sig.ai_summary && (
                      <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 8 }}>{sig.ai_summary}</div>
                    )}
                    {sig.ai_client_impact && (
                      <div style={{ fontSize: 11, color: '#1D4ED8', background: '#EFF6FF', padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}>
                        <strong>Client impact:</strong> {sig.ai_client_impact}
                      </div>
                    )}
                    {sig.ai_platform_impact && (
                      <div style={{ fontSize: 11, color: '#065F46', background: '#ECFDF5', padding: '6px 10px', borderRadius: 6 }}>
                        <strong>Platform impact:</strong> {sig.ai_platform_impact}
                      </div>
                    )}
                    {/* Risk Dimensions */}
                    {(sig.risk_revenue && sig.risk_revenue !== 'none') || (sig.risk_liability && sig.risk_liability !== 'none') ||
                     (sig.risk_cost && sig.risk_cost !== 'none') || (sig.risk_operational && sig.risk_operational !== 'none') ? (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {[
                          { key: 'Revenue', val: sig.risk_revenue },
                          { key: 'Liability', val: sig.risk_liability },
                          { key: 'Cost', val: sig.risk_cost },
                          { key: 'Operational', val: sig.risk_operational },
                        ].filter(d => d.val && d.val !== 'none').map(d => {
                          const rc = RISK_DIM_COLORS[d.val!] || RISK_DIM_COLORS.low;
                          return (
                            <span key={d.key} style={{
                              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                              background: rc.bg, color: rc.text, border: `1px solid ${rc.text}20`,
                            }}>
                              {d.key}: {rc.label}
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                    {/* Opportunity Dimensions */}
                    {(sig.opp_revenue && sig.opp_revenue !== 'none') || (sig.opp_liability && sig.opp_liability !== 'none') ||
                     (sig.opp_cost && sig.opp_cost !== 'none') || (sig.opp_operational && sig.opp_operational !== 'none') ? (
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {[
                          { key: 'Revenue', val: sig.opp_revenue },
                          { key: 'Liability', val: sig.opp_liability },
                          { key: 'Cost', val: sig.opp_cost },
                          { key: 'Operational', val: sig.opp_operational },
                        ].filter(d => d.val && d.val !== 'none').map(d => (
                          <span key={d.key} style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                            background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0',
                          }}>
                            {d.key}: {(d.val || '').toUpperCase().slice(0, 4)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 100 }}>
                    <select value={sig.status}
                      onChange={e => updateSignalStatus(sig.id, e.target.value)}
                      style={{ ...inputStyle, fontSize: 11, cursor: 'pointer' }}>
                      <option value="new">New</option>
                      <option value="analyzing">Analyzing</option>
                      <option value="analyzed">Analyzed</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="published">Publish</option>
                      <option value="dismissed">Dismiss</option>
                    </select>
                    <button onClick={() => openPublishModal(sig)}
                      style={{
                        fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                        background: GOLD, color: '#fff', border: 'none', width: '100%',
                      }}>
                      Publish Advisory
                    </button>
                    {sig.ai_impact_score != null && (
                      <div style={{ textAlign: 'center', fontSize: 10, color: TEXT_MUTED }}>
                        Impact: <strong style={{
                          color: sig.ai_impact_score > 75 ? '#DC2626' : sig.ai_impact_score > 50 ? '#D97706' : '#059669'
                        }}>{sig.ai_impact_score}/100</strong>
                      </div>
                    )}
                    {/* Risk dimension quick-tag */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginTop: 4 }}>
                      {(['revenue','liability','cost','operational'] as const).map(dim => (
                        <select key={dim} value={(sig as any)[`risk_${dim}`] || 'none'}
                          onChange={e => updateSignalRisk(sig.id, dim, e.target.value)}
                          style={{ fontSize: 9, padding: '2px 3px', border: `1px solid ${BORDER}`, borderRadius: 4,
                            background: '#FAFAFA', color: TEXT_SEC, cursor: 'pointer' }}>
                          <option value="none">{dim.slice(0,3).toUpperCase()}</option>
                          <option value="critical">Crit</option>
                          <option value="high">High</option>
                          <option value="moderate">Mod</option>
                          <option value="low">Low</option>
                        </select>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ────────── TAB: SOURCES ────────── */}
      {activeTab === 'sources' && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={srcCatFilter} onChange={e => setSrcCatFilter(e.target.value)}
              style={{ ...inputStyle, minWidth: 180, cursor: 'pointer' }}>
              <option value="">All Categories</option>
              {CATEGORY_META.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={srcStatusFilter} onChange={e => setSrcStatusFilter(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="broken">Broken</option>
              <option value="waf_blocked">WAF Blocked</option>
              <option value="paused">Paused</option>
              <option value="pending">Pending</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4A5568', cursor: 'pointer' }}>
              <input type="checkbox" checked={srcDemoOnly} onChange={e => setSrcDemoOnly(e.target.checked)} />
              Demo critical only
            </label>
            <span style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: 'auto' }}>
              Showing {filteredSources.length} of {totalSources} sources
            </span>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={32} />)}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Source', 'Category', 'Method', 'Frequency', 'Status', 'Last Crawled', 'Signals (30d)', '⭐'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSources.map(s => {
                    const sc = STATUS_COLORS[s.status] || STATUS_COLORS.pending;
                    return (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={tdStyle}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: NAVY }}>{s.name}</div>
                          {s.url && (
                            <a href={s.url} target="_blank" rel="noreferrer"
                              style={{ fontSize: 10, color: GOLD, textDecoration: 'none' }}>
                              {s.url.replace('https://', '').substring(0, 40)}{s.url.length > 48 ? '...' : ''}
                            </a>
                          )}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11, color: TEXT_SEC }}>{s.category?.replace(/_/g, ' ')}</td>
                        <td style={{ ...tdStyle, fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT_SEC }}>{s.crawl_method}</td>
                        <td style={{ ...tdStyle, fontSize: 11, color: TEXT_SEC }}>{s.crawl_frequency}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.text }}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11, color: TEXT_MUTED, fontFamily: "'DM Mono', monospace" }}>
                          {s.last_crawled_at ? new Date(s.last_crawled_at).toLocaleString() : '\u2014'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 12, fontFamily: "'DM Mono', monospace", color: s.signal_count_30d > 0 ? NAVY : TEXT_MUTED }}>
                          {s.signal_count_30d || 0}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {s.is_demo_critical ? '⭐' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ────────── TAB: JIE UPDATES ────────── */}
      {activeTab === 'jie' && (
        <>
          <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 8 }}>
            JIE updates reflect real changes to jurisdiction inspection methodologies, grading scales, or enforcement priorities.
            These feed directly into ScoreTable profiles and client dashboards.
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : jieUpdates.length === 0 ? (
            <EmptyState
              icon="🏛"
              title="No JIE updates yet"
              subtitle="Updates appear here when a jurisdiction changes its inspection methodology, grading scale, or enforcement priorities."
            />
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Jurisdiction', 'Update Type', 'Description', 'Effective', 'Verified', 'Published', 'Signal'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jieUpdates.map(u => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ ...tdStyle, fontWeight: 500, color: NAVY }}>{u.jurisdiction_name || u.jurisdiction_key}</td>
                      <td style={{ ...tdStyle, fontSize: 11, color: TEXT_SEC }}>{u.update_type?.replace(/_/g, ' ')}</td>
                      <td style={{ ...tdStyle, fontSize: 12, maxWidth: 280 }}>{u.description || '\u2014'}</td>
                      <td style={{ ...tdStyle, fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT_SEC }}>{u.effective_date || '\u2014'}</td>
                      <td style={tdStyle}>
                        {u.verified
                          ? <span style={{ color: '#059669', fontSize: 11 }}>✓ {u.verified_by}</span>
                          : <span style={{ color: '#D97706', fontSize: 11 }}>Pending</span>}
                      </td>
                      <td style={tdStyle}>
                        {u.published_to_clients
                          ? <span style={{ color: '#059669', fontSize: 11 }}>✓</span>
                          : <button onClick={() => publishJIEUpdate(u.id)} style={{
                              fontSize: 10, color: GOLD, background: 'none', border: `1px solid #E8D9B8`,
                              borderRadius: 5, padding: '2px 8px', cursor: 'pointer',
                            }}>Publish</button>}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 10, color: TEXT_MUTED }}>{u.signal_id ? 'Linked' : '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ────────── TAB: CORRELATIONS ────────── */}
      {activeTab === 'correlations' && (
        <>
          <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 8 }}>
            Correlations map each intelligence signal to the specific EvidLY clients, locations, and jurisdictions it affects.
            This drives automated client alerts and compliance advisories.
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : correlations.length === 0 ? (
            <EmptyState
              icon="🔗"
              title="No correlations yet"
              subtitle="Correlations are generated automatically when signals are analyzed. Each signal is mapped to affected clients, locations, jurisdictions, and EvidLY modules."
            />
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Type', 'Target', 'Impact', 'Description', 'Action Required', 'Created'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlations.map(c => {
                    const ic = URGENCY_COLORS[c.impact_level] || URGENCY_COLORS.low;
                    return (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={{ ...tdStyle, fontSize: 11, color: TEXT_SEC }}>{c.correlation_type}</td>
                        <td style={{ ...tdStyle, fontSize: 12, color: NAVY, fontWeight: 500 }}>
                          {c.jurisdiction_key || c.county || c.industry || '\u2014'}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: ic.bg, color: ic.text }}>
                            {c.impact_level}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: 12, maxWidth: 280 }}>{c.impact_description || '\u2014'}</td>
                        <td style={{ ...tdStyle, fontSize: 11 }}>
                          {c.action_required
                            ? <span style={{ color: '#DC2626', fontWeight: 600 }}>Yes</span>
                            : <span style={{ color: TEXT_MUTED }}>No</span>}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11, color: TEXT_MUTED }}>{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ────────── TAB: JURISDICTION UPDATES ────────── */}
      {activeTab === 'jurisdiction_updates' && (
        <>
          <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 8 }}>
            Jurisdiction-specific food safety and facility safety regulatory changes.
            Each update is tagged with risk dimensions and published to affected clients.
          </div>

          {/* Pillar filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              { key: '', label: 'All', count: jurisdictionUpdates.length },
              { key: 'food_safety', label: 'Food Safety', count: jurisdictionUpdates.filter(u => u.pillar === 'food_safety' || u.pillar === 'both').length },
              { key: 'facility_safety', label: 'Facility Safety', count: jurisdictionUpdates.filter(u => u.pillar === 'facility_safety' || u.pillar === 'both').length },
            ].map(f => (
              <button key={f.key} onClick={() => setSigFilter(prev => ({ ...prev, type: f.key }))}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: sigFilter.type === f.key ? NAVY : '#fff',
                  color: sigFilter.type === f.key ? '#fff' : TEXT_SEC,
                  border: `1px solid ${sigFilter.type === f.key ? NAVY : BORDER}`,
                }}>
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={60} />)}
            </div>
          ) : jurisdictionUpdates.length === 0 ? (
            <EmptyState
              icon="🏛"
              title="No jurisdiction intelligence updates"
              subtitle="Updates appear here when jurisdiction food safety or facility safety requirements change — scoring changes, new requirements, fire code updates, and more."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {jurisdictionUpdates
                .filter(u => !sigFilter.type || u.pillar === sigFilter.type || u.pillar === 'both')
                .map(u => {
                const pc = PILLAR_COLORS[u.pillar] || PILLAR_COLORS.both;
                return (
                  <div key={u.id} style={{
                    background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 18px',
                    borderLeft: `4px solid ${pc.text}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        {/* Badges row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: pc.bg, color: pc.text }}>
                            {u.pillar.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#F9FAFB', color: TEXT_SEC, border: `1px solid ${BORDER}` }}>
                            {u.update_type.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: 10, color: GOLD, fontWeight: 500 }}>{u.jurisdiction_name}</span>
                          {u.county && <span style={{ fontSize: 10, color: TEXT_MUTED }}>{u.county} County</span>}
                        </div>
                        {/* Title + description */}
                        <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 4 }}>{u.title}</div>
                        {u.description && (
                          <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 8 }}>{u.description}</div>
                        )}
                        {/* Risk dimensions */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[
                            { key: 'Revenue', val: u.risk_revenue },
                            { key: 'Liability', val: u.risk_liability },
                            { key: 'Cost', val: u.risk_cost },
                            { key: 'Operational', val: u.risk_operational },
                          ].filter(d => d.val && d.val !== 'none').map(d => {
                            const rc = RISK_DIM_COLORS[d.val!] || RISK_DIM_COLORS.low;
                            return (
                              <span key={d.key} style={{
                                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                                background: rc.bg, color: rc.text, border: `1px solid ${rc.text}20`,
                              }}>
                                {d.key}: {rc.label}
                              </span>
                            );
                          })}
                        </div>
                        {/* Effective date */}
                        {u.effective_date && (
                          <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 6 }}>
                            Effective: <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{u.effective_date}</span>
                          </div>
                        )}
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 100 }}>
                        {u.verified ? (
                          <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>✓ Verified</span>
                        ) : (
                          <button onClick={() => verifyJurisdictionUpdate(u.id)}
                            style={{
                              fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                              background: '#fff', color: '#059669', border: '1px solid #BBF7D0', width: '100%',
                            }}>
                            Verify
                          </button>
                        )}
                        {u.published ? (
                          <span style={{ fontSize: 10, color: GOLD, fontWeight: 600 }}>✓ Published</span>
                        ) : (
                          <button onClick={() => publishJurisdictionUpdate(u.id)}
                            style={{
                              fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                              background: GOLD, color: '#fff', border: 'none', width: '100%',
                            }}>
                            Publish
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ────────── TAB: SCORETABLE ────────── */}
      {activeTab === 'scoretable' && (
        <>
          <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 8 }}>
            Public ScoreTable pages (/scoretable/[county]-county) drive SEO traffic and convert operators into assessment leads.
            Track views, sessions, and conversion signals across all 62 county pages.
          </div>

          {/* ScoreTable KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Total Pages', value: scoreTableData.length || 62, color: NAVY },
              { label: 'Total Views', value: scoreTableData.reduce((s, d) => s + d.total_views, 0), color: GOLD },
              { label: 'Views (7d)', value: scoreTableData.reduce((s, d) => s + d.views_7d, 0), color: '#2563EB' },
              { label: 'Views (30d)', value: scoreTableData.reduce((s, d) => s + d.views_30d, 0), color: '#059669' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '14px 16px' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: k.color }}>
                  {loading ? '\u2014' : k.value}
                </div>
                <div style={{ fontSize: 11, color: '#4A5568', marginTop: 3 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : scoreTableData.length === 0 ? (
            <EmptyState
              icon={'\uD83D\uDCCA'}
              title="No ScoreTable views yet"
              subtitle="ScoreTable page views will appear here once users visit /scoretable/[county]-county pages. All 62 counties are tracked automatically."
            />
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['County', 'Total Views', 'Unique Sessions', '7-Day', '30-Day', 'Last Viewed'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scoreTableData.map(d => (
                    <tr key={d.county_slug} style={{ borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...tdStyle, fontWeight: 500, color: NAVY }}>
                        {d.county_slug.replace(/-county$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} County
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: NAVY }}>{d.total_views}</td>
                      <td style={{ ...tdStyle, fontFamily: "'DM Mono', monospace", color: TEXT_SEC }}>{d.unique_sessions}</td>
                      <td style={{ ...tdStyle, fontFamily: "'DM Mono', monospace", color: d.views_7d > 0 ? '#2563EB' : TEXT_MUTED }}>{d.views_7d}</td>
                      <td style={{ ...tdStyle, fontFamily: "'DM Mono', monospace", color: d.views_30d > 0 ? '#059669' : TEXT_MUTED }}>{d.views_30d}</td>
                      <td style={{ ...tdStyle, fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT_MUTED }}>
                        {d.last_viewed ? new Date(d.last_viewed).toLocaleDateString() : '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ────────── PUBLISH ADVISORY MODAL (4-Dimension Risk Form) ────────── */}
      {publishModal.open && (() => {
        const riskSelectStyle: React.CSSProperties = { ...inputStyle, width: '100%', cursor: 'pointer', fontSize: 11 };
        const noteInputStyle: React.CSSProperties = { ...inputStyle, width: '100%', fontSize: 11 };
        const DIMS = [
          { key: 'revenueRisk' as const, noteKey: 'revenueNote' as const, icon: '\uD83D\uDCB0', label: 'Revenue Risk', desc: 'Threat to score, grade, permit, revenue' },
          { key: 'liabilityRisk' as const, noteKey: 'liabilityNote' as const, icon: '\u2696\uFE0F', label: 'Liability Risk', desc: 'Legal/regulatory exposure, fines' },
          { key: 'costRisk' as const, noteKey: 'costNote' as const, icon: '\uD83D\uDCB8', label: 'Cost Risk', desc: 'Equipment, training, remediation spend' },
          { key: 'operationalRisk' as const, noteKey: 'operationalNote' as const, icon: '\u2699\uFE0F', label: 'Operational Risk', desc: 'Process/procedure changes required' },
        ];
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: 20,
          }}
            onClick={() => setPublishModal({ open: false, signal: null })}
          >
            <div
              style={{
                background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 600,
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflow: 'auto',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 4 }}>Publish Intelligence Signal</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 16 }}>
                Tag risk dimensions and publish to affected client intelligence feeds.
              </div>

              {/* Signal info */}
              <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 14px', marginBottom: 16, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{publishModal.signal?.title}</div>
                <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                  Source: {publishModal.signal?.source_key} · {publishModal.signal?.signal_type?.replace(/_/g, ' ')}
                  {publishModal.signal?.affected_jurisdictions?.length ? ` · Counties: ${publishModal.signal.affected_jurisdictions.join(', ')}` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Title + Summary */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Title (shown to clients)</label>
                  <input value={pubForm.title} onChange={e => setPubForm(f => ({ ...f, title: e.target.value }))}
                    style={{ ...inputStyle, width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Summary</label>
                  <textarea value={pubForm.summary} onChange={e => setPubForm(f => ({ ...f, summary: e.target.value }))}
                    rows={3} style={{ ...inputStyle, width: '100%', resize: 'vertical' }} />
                </div>

                {/* Risk Dimension Tagging — 4 rows */}
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Risk Dimension Tagging</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {DIMS.map(dim => (
                      <div key={dim.key} style={{ display: 'grid', gridTemplateColumns: '140px 100px 1fr', gap: 8, alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: 12 }}>{dim.icon}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: NAVY, marginLeft: 4 }}>{dim.label}</span>
                        </div>
                        <select value={pubForm[dim.key]} onChange={e => setPubForm(f => ({ ...f, [dim.key]: e.target.value }))}
                          style={riskSelectStyle}>
                          <option value="none">None</option>
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="moderate">Moderate</option>
                          <option value="low">Low</option>
                        </select>
                        <input value={pubForm[dim.noteKey]} onChange={e => setPubForm(f => ({ ...f, [dim.noteKey]: e.target.value }))}
                          placeholder={dim.desc} style={noteInputStyle} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Targeting Section */}
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Signal Targeting</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Scope</label>
                        <select value={pubForm.signalScope} onChange={e => setPubForm(f => ({ ...f, signalScope: e.target.value }))}
                          style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
                          {Object.entries(SCOPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Counties (comma-separated)</label>
                        <input value={pubForm.targetCounties} onChange={e => setPubForm(f => ({ ...f, targetCounties: e.target.value }))}
                          placeholder="e.g. Fresno, Madera, Merced" style={{ ...inputStyle, width: '100%' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: TEXT_SEC, cursor: 'pointer' }}>
                        <input type="checkbox" checked={pubForm.allIndustries}
                          onChange={e => setPubForm(f => ({ ...f, allIndustries: e.target.checked }))} />
                        All Industries
                      </label>
                      {!pubForm.allIndustries && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {Object.entries(INDUSTRY_LABELS).map(([k, v]) => (
                            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: TEXT_SEC, cursor: 'pointer' }}>
                              <input type="checkbox" checked={pubForm.targetIndustries.includes(k)}
                                onChange={e => setPubForm(f => ({
                                  ...f,
                                  targetIndustries: e.target.checked
                                    ? [...f.targetIndustries, k]
                                    : f.targetIndustries.filter(i => i !== k),
                                }))} />
                              {v}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Opportunity Dimensions — 4 rows (green-tinted) */}
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 10 }}>Opportunity Dimensions (upside of acting early)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { key: 'oppRevenue' as const, noteKey: 'oppRevenueNote' as const, icon: '\u2B06', label: 'Revenue Opp', desc: 'Score improvement, competitive advantage' },
                      { key: 'oppLiability' as const, noteKey: 'oppLiabilityNote' as const, icon: '\uD83D\uDEE1', label: 'Liability Opp', desc: 'Legal safe harbor, compliance edge' },
                      { key: 'oppCost' as const, noteKey: 'oppCostNote' as const, icon: '\uD83D\uDCB5', label: 'Cost Opp', desc: 'Insurance discount, grant eligibility' },
                      { key: 'oppOperational' as const, noteKey: 'oppOperationalNote' as const, icon: '\uD83D\uDE80', label: 'Operational Opp', desc: 'Efficiency gain, digital workflow' },
                    ].map(dim => (
                      <div key={dim.key} style={{ display: 'grid', gridTemplateColumns: '140px 100px 1fr', gap: 8, alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: 12 }}>{dim.icon}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#065F46', marginLeft: 4 }}>{dim.label}</span>
                        </div>
                        <select value={pubForm[dim.key]} onChange={e => setPubForm(f => ({ ...f, [dim.key]: e.target.value }))}
                          style={{ ...inputStyle, width: '100%', cursor: 'pointer', fontSize: 11, borderColor: '#A7F3D0' }}>
                          <option value="none">None</option>
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="moderate">Moderate</option>
                          <option value="low">Low</option>
                        </select>
                        <input value={pubForm[dim.noteKey]} onChange={e => setPubForm(f => ({ ...f, [dim.noteKey]: e.target.value }))}
                          placeholder={dim.desc} style={{ ...inputStyle, width: '100%', fontSize: 11, borderColor: '#A7F3D0' }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impact Preview */}
                {impactPreview && (
                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', marginBottom: 4 }}>
                      Impact Preview: {impactPreview.total_orgs} org{impactPreview.total_orgs !== 1 ? 's' : ''}, {impactPreview.total_locations} location{impactPreview.total_locations !== 1 ? 's' : ''}
                    </div>
                    {impactPreview.orgs.length > 0 && (
                      <div style={{ fontSize: 10, color: '#3B82F6', lineHeight: 1.6 }}>
                        {impactPreview.orgs.map(o => o.name).join(' · ')}
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: '#6B7280', marginTop: 4 }}>
                      Confidence: {impactPreview.confidence}%
                    </div>
                  </div>
                )}

                {/* Recommended Action + Deadline */}
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>
                      Recommended Action (shown to client)
                    </label>
                    <textarea value={pubForm.recommendedAction}
                      onChange={e => setPubForm(f => ({ ...f, recommendedAction: e.target.value }))}
                      rows={2} placeholder="What should the client do?"
                      style={{ ...inputStyle, width: '100%', resize: 'vertical' }} />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>
                      Action Deadline
                    </label>
                    <input type="date" value={pubForm.actionDeadline}
                      onChange={e => setPubForm(f => ({ ...f, actionDeadline: e.target.value }))}
                      style={{ ...inputStyle, width: 180 }} />
                  </div>
                </div>

                {/* Priority preview */}
                {(() => {
                  const p = computePriority(pubForm);
                  const pColor = p === 'critical' ? '#DC2626' : p === 'high' ? '#D97706' : p === 'normal' ? '#2563EB' : '#6B7280';
                  return (
                    <div style={{ fontSize: 11, color: TEXT_SEC }}>
                      Computed priority: <span style={{ fontWeight: 700, color: pColor }}>{p.toUpperCase()}</span>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
                <button onClick={() => setPublishModal({ open: false, signal: null })}
                  style={{
                    padding: '8px 18px', background: '#fff', border: `1px solid ${BORDER}`,
                    borderRadius: 8, color: TEXT_SEC, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                  Cancel
                </button>
                <button onClick={submitAdvisory}
                  style={{
                    padding: '8px 18px', background: GOLD, border: 'none',
                    borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>
                  Publish to Clients
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
