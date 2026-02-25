/**
 * INTEL-HUB-1 — EvidLY Intelligence Hub
 *
 * Full-page layout: left feed panel (30%) + right detail panel (70%).
 * Five view states: Source Status, Insight Detail, Executive Snapshot, Recall Dashboard, Legislative Tracker.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Activity, AlertTriangle, ChevronRight, ExternalLink,
  Check, X, Share2, Trash2, Clock, Shield, Zap, Eye,
  FileText, Scale, CloudRain, Building2, Siren, Bug,
  RefreshCw, Settings, ChevronDown, ChevronUp, Sparkles,
  BookOpen, ArrowRight,
} from 'lucide-react';
import { useIntelligenceHub } from '../hooks/useIntelligenceHub';
import { ExecutiveSnapshotPanel } from '../components/intelligence/ExecutiveSnapshotPanel';
import { IntelligenceSubscriptionSettings } from '../components/intelligence/IntelligenceSubscriptionSettings';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, GOLD, NAVY, BODY_TEXT, MUTED,
  PAGE_BG, TEXT_TERTIARY, PANEL_BG, BORDER_SUBTLE, FONT, KEYFRAMES, stagger,
} from '../components/dashboard/shared/constants';
import type { IntelligenceInsight, ImpactLevel, RecallAlert, LegislativeItem, PersonalizedBusinessImpact } from '../data/demoIntelligenceData';

// ── Helpers ──────────────────────────────────────────────────────

const IMPACT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  high: { bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },
  medium: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
  low: { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
};

const DEFAULT_IMPACT = { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };

/** Safe lookup — always returns a valid {bg,text,border} triple */
function getImpactColor(level: string | undefined | null) {
  if (level && IMPACT_COLORS[level]) return IMPACT_COLORS[level];
  return DEFAULT_IMPACT;
}

const CATEGORY_ICONS: Record<string, typeof Brain> = {
  enforcement_surge: Siren,
  legislative_update: Scale,
  recall_alert: AlertTriangle,
  outbreak_alert: Bug,
  regulatory_change: Shield,
  competitor_activity: Building2,
  weather_risk: CloudRain,
  enforcement_action: Siren,
  inspector_pattern: Eye,
  benchmark_shift: Activity,
  concession_advisory: FileText,
  supply_disruption: AlertTriangle,
  regulatory_advisory: Shield,
};

type FilterKey = 'all' | 'critical' | 'regulatory' | 'health_dept' | 'recalls' | 'outbreaks' | 'weather' | 'legislative' | 'competitor';

const FILTERS: { key: FilterKey; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '' },
  { key: 'critical', label: 'Critical', emoji: '\ud83d\udea8' },
  { key: 'regulatory', label: 'Regulatory', emoji: '\ud83d\udccb' },
  { key: 'health_dept', label: 'Health Dept', emoji: '\ud83c\udfdb' },
  { key: 'recalls', label: 'Recalls', emoji: '\u26a0\ufe0f' },
  { key: 'outbreaks', label: 'Outbreaks', emoji: '\ud83e\udda0' },
  { key: 'weather', label: 'Weather', emoji: '\u26c5' },
  { key: 'legislative', label: 'Legislative', emoji: '\ud83c\udfdb' },
  { key: 'competitor', label: 'Competitor', emoji: '\ud83c\udfe2' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return `$${n.toLocaleString()}`;
}

type ViewState = 'sources' | 'insight' | 'snapshot' | 'recalls' | 'legislative' | 'settings';

const LEGISLATIVE_COLUMNS: { status: LegislativeItem['status']; label: string }[] = [
  { status: 'introduced', label: 'Introduced' },
  { status: 'committee', label: 'Committee' },
  { status: 'floor_vote', label: 'Floor Vote' },
  { status: 'passed', label: 'Passed' },
  { status: 'signed', label: 'Signed' },
  { status: 'chaptered', label: 'Chaptered' },
];

// ── CLIENT LOCATION COUNTIES (for "affects your locations" matching) ──
const CLIENT_COUNTIES: Record<string, string> = {
  fresno: 'Downtown Kitchen',
  merced: 'Airport Cafe',
  stanislaus: 'University Dining',
  mariposa: 'Yosemite Concession',
};

function getAffectedLocations(counties: string[]): string[] {
  return counties
    .filter(c => CLIENT_COUNTIES[c])
    .map(c => CLIENT_COUNTIES[c]);
}

// ── Main Component ───────────────────────────────────────────────

export function IntelligenceHub() {
  const navigate = useNavigate();
  const {
    insights, executiveSnapshot, recalls, outbreaks,
    legislativeItems, inspectorPatterns, competitorEvents, sourceStatus,
    subscription, isLoading, markAsRead, dismissInsight, requestSnapshot,
    updateSubscription,
  } = useIntelligenceHub();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>('sources');
  const [checkedActions, setCheckedActions] = useState<Set<string>>(new Set());
  const [expandedLegId, setExpandedLegId] = useState<string | null>(null);

  // ── Filter insights ────────────────────────────────────
  const filteredInsights = useMemo(() => {
    let list = insights;
    switch (filter) {
      case 'critical': list = list.filter(i => i.impact_level === 'critical' || i.urgency === 'immediate'); break;
      case 'regulatory': list = list.filter(i => ['regulatory_change', 'enforcement_action', 'enforcement_surge', 'regulatory_advisory'].includes(i.category)); break;
      case 'health_dept': list = list.filter(i => i.source_type === 'health_dept' || i.source_type === 'cdph'); break;
      case 'recalls': list = list.filter(i => i.category === 'recall_alert'); break;
      case 'outbreaks': list = list.filter(i => i.category === 'outbreak_alert'); break;
      case 'weather': list = list.filter(i => i.category === 'weather_risk'); break;
      case 'legislative': list = list.filter(i => i.source_type === 'legislative' || i.category === 'legislative_update'); break;
      case 'competitor': list = list.filter(i => i.source_type === 'competitor'); break;
    }
    // Sort: impact DESC, urgency DESC, published DESC
    const impactOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    const urgencyOrder: Record<string, number> = { immediate: 4, urgent: 3, standard: 2, informational: 1 };
    return [...list].sort((a, b) => {
      const id = (impactOrder[b.impact_level] || 0) - (impactOrder[a.impact_level] || 0);
      if (id !== 0) return id;
      const ud = (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
      if (ud !== 0) return ud;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });
  }, [insights, filter]);

  const selectedInsight = useMemo(() =>
    insights.find(i => i.id === selectedInsightId) || null
  , [insights, selectedInsightId]);

  const criticalCount = useMemo(() =>
    insights.filter(i => i.impact_level === 'critical' || i.urgency === 'immediate').length
  , [insights]);

  const lastUpdated = useMemo(() => {
    const latest = (sourceStatus || []).reduce((max, s) => {
      const t = new Date(s.last_checked_at).getTime();
      return t > max ? t : max;
    }, 0);
    return latest ? timeAgo(new Date(latest).toISOString()) : 'Unknown';
  }, [sourceStatus]);

  const sourceHealth = useMemo(() => {
    const errCount = (sourceStatus || []).filter(s => s.status === 'error').length;
    const warnCount = (sourceStatus || []).filter(s => s.status === 'warning').length;
    if (errCount > 0) return 'error';
    if (warnCount > 0) return 'warning';
    return 'healthy';
  }, [sourceStatus]);

  // ── Select an insight ──────────────────────────────────
  function handleSelectInsight(insight: IntelligenceInsight) {
    setSelectedInsightId(insight.id);
    setViewState('insight');
    setCheckedActions(new Set());
    markAsRead(insight.id);
  }

  function handleGenerateSnapshot() {
    requestSnapshot();
    setViewState('snapshot');
    setSelectedInsightId(null);
  }

  // Critical insights for sticky section
  const criticalInsights = useMemo(() =>
    filteredInsights.filter(i => i.impact_level === 'critical' || i.urgency === 'immediate')
  , [filteredInsights]);

  const nonCriticalInsights = useMemo(() =>
    filteredInsights.filter(i => i.impact_level !== 'critical' && i.urgency !== 'immediate')
  , [filteredInsights]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: PAGE_BG, ...FONT }}>
      <style>{KEYFRAMES}</style>

      {/* ── Header Bar ─────────────────────────────────── */}
      <header
        className="px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-2"
        style={{ backgroundColor: CARD_BG, borderBottom: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1e4d6b' }}>
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg" style={{ color: BODY_TEXT }}>Compliance Intelligence</h1>
            <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Live industry alerts, recalls, and regulatory updates — updated daily.</p>
            <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: TEXT_TERTIARY }}>
              <span className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Live
              </span>
              <span>Updated {lastUpdated}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {criticalCount > 0 && (
            <button
              onClick={() => { setFilter('critical'); setViewState('sources'); setSelectedInsightId(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: '#dc2626' }}
            >
              <Siren className="h-3.5 w-3.5" />
              {criticalCount} Critical
            </button>
          )}
          <button
            onClick={handleGenerateSnapshot}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: GOLD }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#a88a24'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = GOLD; }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Executive Brief
          </button>
          <button
            onClick={() => { setViewState(viewState === 'settings' ? 'sources' : 'settings'); setSelectedInsightId(null); }}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: viewState === 'settings' ? PANEL_BG : 'transparent', color: MUTED }}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            className="p-2 rounded-lg"
            style={{ color: sourceHealth === 'healthy' ? '#16a34a' : sourceHealth === 'warning' ? '#d97706' : '#dc2626' }}
            title={`Source health: ${sourceHealth}`}
            onClick={() => { setViewState('sources'); setSelectedInsightId(null); }}
          >
            <Activity className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Main Content: Left (30%) + Right (70%) ──── */}
      <div className="flex" style={{ minHeight: 'calc(100vh - 64px)' }}>

        {/* ── LEFT PANEL: Intelligence Feed ─────────── */}
        <div
          className="w-full lg:w-[30%] lg:min-w-[320px] lg:max-w-[400px] overflow-y-auto border-r"
          style={{ borderColor: CARD_BORDER, maxHeight: 'calc(100vh - 64px)' }}
        >
          {/* Filter chips */}
          <div className="p-3 flex flex-wrap gap-1.5 border-b sticky top-0 z-10" style={{ backgroundColor: CARD_BG, borderColor: BORDER_SUBTLE }}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); if (f.key === 'recalls') setViewState('recalls'); else if (f.key === 'legislative') setViewState('legislative'); else setViewState(selectedInsightId ? 'insight' : 'sources'); }}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap"
                style={{
                  backgroundColor: filter === f.key ? '#1e4d6b' : PANEL_BG,
                  color: filter === f.key ? '#fff' : MUTED,
                  border: `1px solid ${filter === f.key ? '#1e4d6b' : BORDER_SUBTLE}`,
                }}
              >
                {f.emoji ? `${f.emoji} ` : ''}{f.label}
              </button>
            ))}
          </div>

          {/* Critical section (sticky at top if any) */}
          {criticalInsights.length > 0 && (
            <div className="border-b" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}>
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: '#991b1b' }}>
                <Siren className="h-3 w-3 inline mr-1" />
                {criticalInsights.length} Critical Alert{criticalInsights.length > 1 ? 's' : ''} — Action Required
              </div>
              {criticalInsights.map(i => (
                <InsightCard
                  key={i.id}
                  insight={i}
                  selected={selectedInsightId === i.id}
                  onSelect={() => handleSelectInsight(i)}
                />
              ))}
            </div>
          )}

          {/* Non-critical feed */}
          <div>
            {nonCriticalInsights.map((i, idx) => (
              <InsightCard
                key={i.id}
                insight={i}
                selected={selectedInsightId === i.id}
                onSelect={() => handleSelectInsight(i)}
              />
            ))}
          </div>

          {filteredInsights.length === 0 && (
            <div className="p-8 text-center" style={{ color: TEXT_TERTIARY }}>
              <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No intelligence for this filter</p>
              <p className="text-xs mt-1">Try selecting a different category</p>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Detail Views ────────────── */}
        <div
          className="hidden lg:block flex-1 overflow-y-auto p-6"
          style={{ maxHeight: 'calc(100vh - 64px)' }}
        >
          {viewState === 'settings' && (
            <IntelligenceSubscriptionSettings
              subscription={subscription}
              sourceStatus={sourceStatus}
              onUpdate={updateSubscription}
            />
          )}

          {viewState === 'snapshot' && executiveSnapshot && (
            <ExecutiveSnapshotPanel snapshot={executiveSnapshot} />
          )}

          {viewState === 'insight' && selectedInsight && (
            <InsightDetailView
              insight={selectedInsight}
              checkedActions={checkedActions}
              onToggleAction={(idx) => {
                setCheckedActions(prev => {
                  const next = new Set(prev);
                  const key = `${selectedInsight.id}-${idx}`;
                  if (next.has(key)) next.delete(key); else next.add(key);
                  return next;
                });
              }}
              onDismiss={() => { dismissInsight(selectedInsight.id); setSelectedInsightId(null); setViewState('sources'); }}
              onShare={() => { alert('Share link copied to clipboard (demo)'); }}
            />
          )}

          {viewState === 'recalls' && (
            <RecallDashboard recalls={recalls} />
          )}

          {viewState === 'legislative' && (
            <LegislativeTracker
              items={legislativeItems}
              expandedId={expandedLegId}
              onToggleExpand={(id) => setExpandedLegId(expandedLegId === id ? null : id)}
            />
          )}

          {viewState === 'sources' && !selectedInsightId && (
            <SourceStatusView
              sourceStatus={sourceStatus}
              insightCount={insights.length}
              criticalCount={criticalCount}
            />
          )}
        </div>

        {/* Mobile: show detail below feed */}
        <div className="lg:hidden w-full p-4">
          {viewState === 'insight' && selectedInsight && (
            <InsightDetailView
              insight={selectedInsight}
              checkedActions={checkedActions}
              onToggleAction={(idx) => {
                setCheckedActions(prev => {
                  const next = new Set(prev);
                  const key = `${selectedInsight.id}-${idx}`;
                  if (next.has(key)) next.delete(key); else next.add(key);
                  return next;
                });
              }}
              onDismiss={() => { dismissInsight(selectedInsight.id); setSelectedInsightId(null); setViewState('sources'); }}
              onShare={() => { alert('Share link copied to clipboard (demo)'); }}
            />
          )}
          {viewState === 'snapshot' && executiveSnapshot && (
            <ExecutiveSnapshotPanel snapshot={executiveSnapshot} />
          )}
          {viewState === 'settings' && (
            <IntelligenceSubscriptionSettings
              subscription={subscription}
              sourceStatus={sourceStatus}
              onUpdate={updateSubscription}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Insight Feed Card ────────────────────────────────────────────

function InsightCard({ insight, selected, onSelect }: { insight: IntelligenceInsight; selected: boolean; onSelect: () => void }) {
  const ic = getImpactColor(insight.impact_level);
  const CategoryIcon = CATEGORY_ICONS[insight.category] || Brain;
  const pillarLabels = (insight.affected_pillars || []).map(p => p === 'fire_safety' ? 'Fire' : p === 'food_safety' ? 'Food' : p);

  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-3 py-3 border-b transition-all"
      style={{
        backgroundColor: selected ? '#fefdf5' : insight.read ? CARD_BG : '#fafbff',
        borderColor: BORDER_SUBTLE,
        borderLeft: `3px solid ${ic.border}`,
        outline: selected ? `2px solid ${GOLD}` : 'none',
        outlineOffset: '-2px',
      }}
    >
      <div className="flex items-start gap-2">
        <CategoryIcon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: ic.text }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ backgroundColor: ic.bg, color: ic.text }}>
              {insight.impact_level}
            </span>
            {!insight.read && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-700">NEW</span>
            )}
            {pillarLabels.map(p => (
              <span key={p} className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                {p}
              </span>
            ))}
          </div>
          <p className="text-[13px] font-semibold leading-tight line-clamp-2" style={{ color: BODY_TEXT }}>{insight.title}</p>
          <p className="text-[11px] mt-1 line-clamp-1" style={{ color: TEXT_TERTIARY }}>{insight.headline}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {(insight.affected_counties || []).slice(0, 3).map(c => (
              <span key={c} className="px-1.5 py-0.5 rounded text-[9px]" style={{ backgroundColor: PANEL_BG, color: MUTED }}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </span>
            ))}
            <span className="text-[10px] ml-auto" style={{ color: TEXT_TERTIARY }}>{timeAgo(insight.published_at)}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 mt-1 shrink-0" style={{ color: TEXT_TERTIARY }} />
      </div>
    </button>
  );
}

// ── VIEW A: Insight Detail ───────────────────────────────────────

function InsightDetailView({
  insight, checkedActions, onToggleAction, onDismiss, onShare,
}: {
  insight: IntelligenceInsight;
  checkedActions: Set<string>;
  onToggleAction: (idx: number) => void;
  onDismiss: () => void;
  onShare: () => void;
}) {
  const navigate = useNavigate();
  const ic = getImpactColor(insight.impact_level);
  const affectedLocs = getAffectedLocations(insight.affected_counties || []);

  return (
    <div style={stagger(0)}>
      {/* Badges row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="px-2 py-1 rounded-md text-xs font-bold uppercase" style={{ backgroundColor: ic.bg, color: ic.text, border: `1px solid ${ic.border}` }}>
          {insight.impact_level}
        </span>
        <span className="px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: PANEL_BG, color: MUTED }}>
          {insight.source_name}
        </span>
        <span className="px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: PANEL_BG, color: MUTED }}>
          Confidence: {Math.round(insight.confidence_score * 100)}%
        </span>
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold mb-4" style={{ color: BODY_TEXT }}>{insight.title}</h2>

      {/* Summary card */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <p className="text-sm leading-relaxed" style={{ color: BODY_TEXT }}>{insight.summary}</p>
      </div>

      {/* Business Impact — WHAT THIS MEANS FOR YOUR BUSINESS */}
      {insight.personalizedBusinessImpact && (() => {
        const biz = insight.personalizedBusinessImpact;
        return (
          <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#fefdf5', border: `1px solid ${GOLD}`, boxShadow: CARD_SHADOW }}>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4" style={{ color: GOLD }} />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#92400e' }}>
                What This Means for Your Business
              </h3>
              <span className="ml-auto px-2 py-0.5 rounded text-[9px] font-bold" style={{
                backgroundColor: biz.relevance_score >= 0.8 ? '#fef2f2' : biz.relevance_score >= 0.6 ? '#fffbeb' : '#f0fdf4',
                color: biz.relevance_score >= 0.8 ? '#991b1b' : biz.relevance_score >= 0.6 ? '#92400e' : '#166534',
              }}>
                {Math.round(biz.relevance_score * 100)}% Relevant
              </span>
            </div>

            <p className="text-sm leading-relaxed mb-3" style={{ color: BODY_TEXT }}>
              {biz.business_context}
            </p>

            {/* Affected Locations */}
            {(biz.affected_locations || []).length > 0 && (
              <div className="mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_TERTIARY }}>
                  Your Affected Locations
                </h4>
                <div className="space-y-1.5">
                  {(biz.affected_locations || []).map(loc => (
                    <div key={loc.name} className="flex items-start gap-2 text-xs" style={{ color: BODY_TEXT }}>
                      <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{
                        backgroundColor: loc.risk_level === 'high' ? '#dc2626' : loc.risk_level === 'medium' ? '#d97706' : '#16a34a',
                      }} />
                      <div>
                        <span className="font-semibold">{loc.name}</span>
                        <span className="ml-1" style={{ color: MUTED }}> — {loc.impact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Adjusted Financial Impact */}
            {biz.financial_impact_adjusted && biz.financial_impact_adjusted.high > 0 && (
              <div className="mb-3 p-2.5 rounded-lg" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: '#92400e' }}>Your Exposure:</span>
                  <span className="text-sm font-bold" style={{ color: '#d97706' }}>
                    {formatCurrency(biz.financial_impact_adjusted.low)} — {formatCurrency(biz.financial_impact_adjusted.high)}
                  </span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                  {biz.financial_impact_adjusted.methodology}
                </p>
              </div>
            )}

            {/* Personalized Actions */}
            {(biz.personalized_actions || []).length > 0 && (
              <div className="mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_TERTIARY }}>
                  Recommended for Your Operations
                </h4>
                <ol className="space-y-1">
                  {(biz.personalized_actions || []).map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: BODY_TEXT }}>
                      <span className="text-[10px] font-bold mt-0.5 shrink-0" style={{ color: GOLD }}>{i + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Industry Note */}
            <p className="text-[11px] italic" style={{ color: MUTED }}>
              {biz.industry_specific_note}
            </p>
          </div>
        );
      })()}

      {/* Full Analysis */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_TERTIARY }}>Full Analysis</h3>
        {(insight.full_analysis || '').split('\n').map((para, i) => (
          <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: BODY_TEXT }}>{para}</p>
        ))}
      </div>

      {/* Executive Language box */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#fefdf5', borderLeft: `4px solid ${GOLD}`, border: `1px solid #f3e8c0` }}>
        <div className="flex items-center gap-1.5 mb-2">
          <BookOpen className="h-3.5 w-3.5" style={{ color: GOLD }} />
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#92400e' }}>Executive Language</h3>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: BODY_TEXT }}>{insight.executive_brief}</p>
      </div>

      {/* Action Items */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_TERTIARY }}>Action Items</h3>
        <ol className="space-y-2">
          {(insight.action_items || []).map((item, idx) => {
            const key = `${insight.id}-${idx}`;
            const checked = checkedActions.has(key);
            return (
              <li key={idx}>
                <button
                  onClick={() => onToggleAction(idx)}
                  className="flex items-start gap-2 w-full text-left group"
                >
                  <span
                    className="mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      borderColor: checked ? '#16a34a' : CARD_BORDER,
                      backgroundColor: checked ? '#16a34a' : 'transparent',
                    }}
                  >
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className={`text-sm ${checked ? 'line-through opacity-50' : ''}`} style={{ color: BODY_TEXT }}>
                    {idx + 1}. {item}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Cost Impact */}
      {insight.estimated_cost_impact && insight.estimated_cost_impact.high > 0 && (
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_TERTIARY }}>Estimated Cost Impact</h3>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold" style={{ color: '#d97706' }}>
              {formatCurrency(insight.estimated_cost_impact.low)} — {formatCurrency(insight.estimated_cost_impact.high)}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>{insight.estimated_cost_impact.methodology}</p>
          {/* Range bar */}
          <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: PANEL_BG }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (insight.estimated_cost_impact.high / 50000) * 100)}%`,
                background: 'linear-gradient(90deg, #fcd34d 0%, #f59e0b 50%, #dc2626 100%)',
              }}
            />
          </div>
        </div>
      )}

      {/* Affected Locations */}
      {affectedLocs.length > 0 && (
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1e40af' }}>Affects Your Locations</h3>
          <div className="flex flex-wrap gap-2">
            {affectedLocs.map(loc => (
              <span key={loc} className="px-2 py-1 rounded-md text-xs font-semibold bg-white" style={{ color: '#1e40af', border: '1px solid #93c5fd' }}>
                {loc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cross-reference: jurisdiction rules */}
      {['enforcement_surge', 'enforcement_action', 'inspector_pattern', 'regulatory_change', 'regulatory_advisory'].includes(insight.category) && (
        <button
          onClick={() => navigate('/jurisdiction')}
          className="flex items-center gap-2 w-full rounded-lg px-4 py-3 mb-4 text-xs font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: '#eef4f8', color: '#1e4d6b', border: '1px solid #b8d4e8' }}
        >
          <Scale className="h-3.5 w-3.5" />
          <span>See your jurisdiction's rules</span>
          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
        </button>
      )}

      {/* Bottom actions */}
      <div className="flex items-center gap-2 pt-2">
        <button onClick={onShare} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: PANEL_BG, color: MUTED }}>
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
        <button onClick={onDismiss} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: PANEL_BG, color: MUTED }}>
          <Trash2 className="h-3.5 w-3.5" /> Dismiss
        </button>
        <button onClick={() => alert('Corrective action created (demo)')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#1e4d6b' }}>
          <Zap className="h-3.5 w-3.5" /> Create Corrective Action
        </button>
      </div>
    </div>
  );
}

// ── VIEW C: Source Status ────────────────────────────────────────

function SourceStatusView({ sourceStatus: rawStatus, insightCount, criticalCount }: { sourceStatus: import('../data/demoIntelligenceData').SourceStatus[]; insightCount: number; criticalCount: number }) {
  const sourceStatus = rawStatus || [];
  const totalEvents = sourceStatus.reduce((s, src) => s + src.new_events_this_week, 0);

  return (
    <div style={stagger(0)}>
      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Insights This Week', value: String(insightCount), color: '#1e4d6b' },
          { label: 'Critical Alerts', value: String(criticalCount), color: '#dc2626' },
          { label: 'Sources Monitored', value: String(sourceStatus.length), color: '#16a34a' },
        ].map(tile => (
          <div key={tile.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
            <div className="text-2xl font-bold" style={{ color: tile.color }}>{tile.value}</div>
            <div className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>{tile.label}</div>
          </div>
        ))}
      </div>

      {/* Source table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER_SUBTLE }}>
          <h3 className="text-sm font-bold" style={{ color: BODY_TEXT }}>Intelligence Sources</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: PANEL_BG }}>
                <th className="text-left px-4 py-2 font-semibold" style={{ color: MUTED }}>Source</th>
                <th className="text-left px-4 py-2 font-semibold" style={{ color: MUTED }}>Type</th>
                <th className="text-left px-4 py-2 font-semibold" style={{ color: MUTED }}>Jurisdictions</th>
                <th className="text-left px-4 py-2 font-semibold" style={{ color: MUTED }}>Frequency</th>
                <th className="text-left px-4 py-2 font-semibold" style={{ color: MUTED }}>Last Checked</th>
                <th className="text-center px-4 py-2 font-semibold" style={{ color: MUTED }}>Events</th>
                <th className="text-center px-4 py-2 font-semibold" style={{ color: MUTED }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sourceStatus.map(src => (
                <tr key={src.id} className="border-t" style={{ borderColor: BORDER_SUBTLE }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: BODY_TEXT }}>{src.name}</td>
                  <td className="px-4 py-2.5 capitalize" style={{ color: MUTED }}>{src.type || 'unknown'}</td>
                  <td className="px-4 py-2.5" style={{ color: MUTED }}>{(src.jurisdictions || []).join(', ')}</td>
                  <td className="px-4 py-2.5" style={{ color: MUTED }}>{src.frequency}</td>
                  <td className="px-4 py-2.5" style={{ color: MUTED }}>{timeAgo(src.last_checked_at)}</td>
                  <td className="px-4 py-2.5 text-center font-semibold" style={{ color: src.new_events_this_week > 0 ? '#1e4d6b' : TEXT_TERTIARY }}>{src.new_events_this_week}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${src.status === 'healthy' ? 'bg-green-500' : src.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── VIEW D: Recall Dashboard ─────────────────────────────────────

function RecallDashboard({ recalls: rawRecalls }: { recalls: RecallAlert[] }) {
  const recalls = rawRecalls || [];
  const active = recalls.filter(r => r.status === 'active');
  const resolved = recalls.filter(r => r.status === 'resolved');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div style={stagger(0)}>
      <h2 className="text-lg font-bold mb-4" style={{ color: BODY_TEXT }}>Recall Dashboard</h2>

      {active.length > 0 && (
        <>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#991b1b' }}>Active Recalls</h3>
          <div className="space-y-3 mb-6">
            {active.map(r => (
              <div key={r.id} className="rounded-xl p-4" style={{ backgroundColor: r.class === 'I' ? '#fef2f2' : '#fffbeb', border: `1px solid ${r.class === 'I' ? '#fca5a5' : '#fcd34d'}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: r.class === 'I' ? '#dc2626' : '#d97706' }}>
                    Class {r.class}
                  </span>
                  <span className="text-sm font-bold" style={{ color: BODY_TEXT }}>{r.product}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: MUTED }}>
                  <div><span className="font-semibold">Brand:</span> {r.brand}</div>
                  <div><span className="font-semibold">Date:</span> {r.recall_date}</div>
                  <div className="col-span-2"><span className="font-semibold">Reason:</span> {r.reason}</div>
                  <div className="col-span-2"><span className="font-semibold">Lot Codes:</span> {r.lot_codes}</div>
                  <div className="col-span-2"><span className="font-semibold">Distribution:</span> {r.distribution}</div>
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  className="mt-3 flex items-center gap-1 text-xs font-semibold"
                  style={{ color: '#1e4d6b' }}
                >
                  {expandedId === r.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  Check my inventory
                </button>
                {expandedId === r.id && (
                  <div className="mt-2 p-3 rounded-lg text-xs" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                    <p className="font-medium mb-2" style={{ color: BODY_TEXT }}>Affected counties in your coverage area:</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(r.affected_counties || []).map(c => {
                        const loc = CLIENT_COUNTIES[c];
                        return (
                          <span key={c} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: loc ? '#fef2f2' : PANEL_BG, color: loc ? '#991b1b' : MUTED }}>
                            {c.charAt(0).toUpperCase() + c.slice(1)}{loc ? ` (${loc})` : ''}
                          </span>
                        );
                      })}
                    </div>
                    <p style={{ color: MUTED }}>Check product inventory at each affected location. Document findings in your HACCP log.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {resolved.length > 0 && (
        <>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_TERTIARY }}>Resolved (Last 30 Days)</h3>
          <div className="space-y-2">
            {resolved.map(r => (
              <div key={r.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium" style={{ color: BODY_TEXT }}>{r.product} — {r.brand}</p>
                  <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>Resolved {r.resolved_date}</p>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
                  Resolved
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── VIEW E: Legislative Tracker ──────────────────────────────────

function LegislativeTracker({ items: rawItems, expandedId, onToggleExpand }: { items: LegislativeItem[]; expandedId: string | null; onToggleExpand: (id: string) => void }) {
  const items = rawItems || [];
  return (
    <div style={stagger(0)}>
      <h2 className="text-lg font-bold mb-4" style={{ color: BODY_TEXT }}>Legislative Tracker</h2>

      {/* Kanban columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {LEGISLATIVE_COLUMNS.map(col => {
          const colItems = items.filter(i => i.status === col.status);
          return (
            <div key={col.status} className="rounded-xl p-3" style={{ backgroundColor: PANEL_BG, border: `1px solid ${BORDER_SUBTLE}` }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2 text-center" style={{ color: MUTED }}>{col.label}</div>
              {colItems.length === 0 && (
                <div className="text-center text-[10px] py-4" style={{ color: TEXT_TERTIARY }}>--</div>
              )}
              {colItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onToggleExpand(item.id)}
                  className="w-full rounded-lg p-2.5 mb-2 text-left transition-all"
                  style={{ backgroundColor: CARD_BG, border: `1px solid ${expandedId === item.id ? GOLD : CARD_BORDER}`, boxShadow: CARD_SHADOW }}
                >
                  <div className="text-[10px] font-bold" style={{ color: '#1e4d6b' }}>{item.bill_number}</div>
                  <div className="text-[10px] leading-tight mt-0.5 line-clamp-2" style={{ color: BODY_TEXT }}>{item.title}</div>
                  {/* Probability bar */}
                  <div className="mt-1.5 flex items-center gap-1">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: PANEL_BG }}>
                      <div className="h-full rounded-full" style={{ width: `${item.probability * 100}%`, backgroundColor: item.probability >= 0.7 ? '#16a34a' : item.probability >= 0.4 ? '#d97706' : TEXT_TERTIARY }} />
                    </div>
                    <span className="text-[9px] font-semibold" style={{ color: MUTED }}>{Math.round(item.probability * 100)}%</span>
                  </div>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Expanded detail */}
      {expandedId && (() => {
        const item = items.find(i => i.id === expandedId);
        if (!item) return null;
        return (
          <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${GOLD}`, boxShadow: CARD_SHADOW }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}>{item.bill_number}</span>
              <h3 className="text-sm font-bold" style={{ color: BODY_TEXT }}>{item.title}</h3>
            </div>
            <p className="text-sm mb-3" style={{ color: MUTED }}>{item.summary}</p>
            <div className="grid grid-cols-2 gap-3 text-xs mb-3" style={{ color: MUTED }}>
              <div><span className="font-semibold">Probability:</span> {Math.round(item.probability * 100)}%</div>
              {item.compliance_deadline && <div><span className="font-semibold">Deadline:</span> {item.compliance_deadline}</div>}
              <div><span className="font-semibold">Cost/Location:</span> {formatCurrency(item.estimated_cost_per_location.low)}–{formatCurrency(item.estimated_cost_per_location.high)}</div>
            </div>
            {(item.auto_checklist_items || []).length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: TEXT_TERTIARY }}>Preparation Checklist</h4>
                <ul className="space-y-1">
                  {(item.auto_checklist_items || []).map((ci, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs" style={{ color: BODY_TEXT }}>
                      <span className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5" style={{ borderColor: CARD_BORDER }}>
                        <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{idx + 1}</span>
                      </span>
                      {ci}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export default IntelligenceHub;
