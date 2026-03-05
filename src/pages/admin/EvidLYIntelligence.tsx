/**
 * EvidLY Intelligence — The Moat
 * 80+ sources crawled. Every signal correlated to clients, jurisdictions, and industries.
 * Route: /admin/intelligence
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E5E0D8';

type Tab = 'overview' | 'signals' | 'sources' | 'jie' | 'correlations' | 'scoretable';

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
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  // Filters
  const [sigFilter, setSigFilter] = useState({ search: '', urgency: '', type: '', status: '' });
  const [srcCatFilter, setSrcCatFilter] = useState('');
  const [srcStatusFilter, setSrcStatusFilter] = useState('');
  const [srcDemoOnly, setSrcDemoOnly] = useState(false);

  // Publish Advisory modal
  const [publishModal, setPublishModal] = useState<{ open: boolean; signal: Signal | null }>({ open: false, signal: null });
  const [pubForm, setPubForm] = useState({ dimension: 'operational', risk_level: 'medium', advisory_type: 'risk', title: '', summary: '' });

  // ScoreTable analytics
  const [scoreTableData, setScoreTableData] = useState<{ county_slug: string; total_views: number; unique_sessions: number; views_7d: number; views_30d: number; last_viewed: string | null }[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [sourcesRes, signalsRes, jieRes, corrRes, stRes] = await Promise.all([
      supabase.from('intelligence_sources').select('*').order('category').order('name'),
      supabase.from('intelligence_signals').select('*').order('discovered_at', { ascending: false }).limit(200),
      supabase.from('jie_updates').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('intelligence_correlations').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('scoretable_views').select('county_slug, viewed_at, session_id').order('viewed_at', { ascending: false }).limit(5000),
    ]);
    if (sourcesRes.data) setSources(sourcesRes.data);
    if (signalsRes.data) setSignals(signalsRes.data);
    if (jieRes.data) setJieUpdates(jieRes.data);
    if (corrRes.data) setCorrelations(corrRes.data);
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
    alert('[Demo] Intelligence crawl triggered. In production, this invokes the intelligence-collect edge function.');
  };

  const publishJIEUpdate = async (updateId: string) => {
    await supabase.from('jie_updates')
      .update({ published_to_clients: true })
      .eq('id', updateId);
    setJieUpdates(prev => prev.map(u => u.id === updateId ? { ...u, published_to_clients: true } : u));
  };

  const openPublishModal = (signal: Signal) => {
    setPubForm({
      dimension: 'operational',
      risk_level: signal.ai_urgency || 'medium',
      advisory_type: signal.ai_urgency === 'critical' ? 'action_required' : 'risk',
      title: signal.title,
      summary: signal.ai_summary || signal.summary || '',
    });
    setPublishModal({ open: true, signal });
  };

  const submitAdvisory = async () => {
    const sig = publishModal.signal;
    if (!sig) return;
    await supabase.from('client_advisories').insert({
      signal_id: sig.id,
      title: pubForm.title,
      summary: pubForm.summary,
      dimension: pubForm.dimension,
      risk_level: pubForm.risk_level,
      advisory_type: pubForm.advisory_type,
      published_by: user?.email,
    });
    await updateSignalStatus(sig.id, 'published');
    setPublishModal({ open: false, signal: null });
    alert('Advisory published to client intelligence feed.');
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={runIntelligence}
            style={{ padding: '8px 16px', background: NAVY, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            ⟳ Run Now
          </button>
          <button onClick={() => setActiveTab('sources')}
            style={{ padding: '8px 16px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, color: NAVY, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Manage Sources
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {[
          { label: 'Total Sources', value: totalSources, color: NAVY, note: `${activeSources} active` },
          { label: 'Demo Critical', value: demoCritical, color: GOLD, note: 'must work for demos' },
          { label: 'Broken / Blocked', value: brokenSources, color: brokenSources > 0 ? '#DC2626' : TEXT_MUTED, note: 'need attention' },
          { label: 'New Signals', value: newSignals, color: newSignals > 0 ? '#2563EB' : TEXT_MUTED, note: 'pending review' },
          { label: 'Critical Signals', value: criticalSignals, color: criticalSignals > 0 ? '#DC2626' : TEXT_MUTED, note: 'urgent action' },
          { label: 'JIE Updates', value: jieUpdates.length, color: '#059669', note: 'scoring changes' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '14px 16px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: k.color }}>
              {loading ? '\u2014' : k.value}
            </div>
            <div style={{ fontSize: 11, color: '#4A5568', marginTop: 3 }}>{k.label}</div>
            <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>{k.note}</div>
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

      {/* ────────── PUBLISH ADVISORY MODAL ────────── */}
      {publishModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setPublishModal({ open: false, signal: null })}
        >
          <div
            style={{
              background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 520,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 4 }}>Publish Client Advisory</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 20 }}>
              Create an advisory from this signal and publish it to the client intelligence feed.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Title</label>
                <input value={pubForm.title} onChange={e => setPubForm(f => ({ ...f, title: e.target.value }))}
                  style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Summary</label>
                <textarea value={pubForm.summary} onChange={e => setPubForm(f => ({ ...f, summary: e.target.value }))}
                  rows={4} style={{ ...inputStyle, width: '100%', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Dimension</label>
                  <select value={pubForm.dimension} onChange={e => setPubForm(f => ({ ...f, dimension: e.target.value }))}
                    style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
                    <option value="revenue">Revenue</option>
                    <option value="liability">Liability</option>
                    <option value="cost">Cost</option>
                    <option value="operational">Operational</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Risk Level</label>
                  <select value={pubForm.risk_level} onChange={e => setPubForm(f => ({ ...f, risk_level: e.target.value }))}
                    style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="informational">Informational</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Type</label>
                  <select value={pubForm.advisory_type} onChange={e => setPubForm(f => ({ ...f, advisory_type: e.target.value }))}
                    style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
                    <option value="risk">Risk</option>
                    <option value="opportunity">Opportunity</option>
                    <option value="update">Update</option>
                    <option value="action_required">Action Required</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
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
                Publish Advisory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
