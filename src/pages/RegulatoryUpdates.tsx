/**
 * SIDEBAR-03 + UI-DIFFERENTIATE-1 — Regulatory Updates page
 *
 * Dedicated page for regulatory_updates / regulatory_change / legislative_update
 * category insights. Visually distinct from Intelligence Hub with:
 *   - Scope filter tabs (All / Federal / State / Local)
 *   - Agency source badges
 *   - Government-themed color accents
 *   - Pillar tags (Food Safety / Facility Safety)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Scale, Clock, Shield, AlertTriangle, ChevronRight,
  ExternalLink, Check, Filter, Landmark, Building, MapPin,
} from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED,
  PAGE_BG, TEXT_TERTIARY, PANEL_BG, FONT, KEYFRAMES, stagger,
} from '../components/dashboard/shared/constants';
import type { IntelligenceInsight, ImpactLevel } from '../data/demoIntelligenceData';
import { DEMO_INTELLIGENCE_INSIGHTS } from '../data/demoIntelligenceData';

// ── Scope classification ─────────────────────────────────────

type ScopeFilter = 'all' | 'federal' | 'state' | 'local';

const SCOPE_META: Record<Exclude<ScopeFilter, 'all'>, { label: string; icon: typeof Landmark; color: string; bg: string; border: string }> = {
  federal: { label: 'Federal', icon: Landmark, color: '#1e3a5f', bg: '#eff6ff', border: '#93c5fd' },
  state:   { label: 'State',   icon: Building, color: '#7c2d12', bg: '#fff7ed', border: '#fdba74' },
  local:   { label: 'Local',   icon: MapPin,   color: '#166534', bg: '#f0fdf4', border: '#86efac' },
};

function classifyScope(insight: IntelligenceInsight): Exclude<ScopeFilter, 'all'> {
  const src = (insight.source_name || '').toLowerCase();
  const cat = (insight.category || '').toLowerCase();

  // Federal sources
  if (src.includes('fda') || src.includes('usda') || src.includes('cdc') ||
      src.includes('epa') || src.includes('osha') || src.includes('federal register') ||
      src.includes('cpsc') || src.includes('nfpa') || src.includes('nsf') ||
      src.includes('servsafe') || cat === 'recall_alert') {
    return 'federal';
  }
  // Local sources
  if (src.includes('county') || src.includes('city') || src.includes('local') ||
      (insight.affected_counties && insight.affected_counties.length === 1)) {
    return 'local';
  }
  // Default state for California-specific
  return 'state';
}

// ── Helpers ──────────────────────────────────────────────────

const IMPACT_COLORS: Record<ImpactLevel, { bg: string; text: string; border: string }> = {
  critical: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  high:     { bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },
  medium:   { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
  low:      { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
};

const PILLAR_COLORS: Record<string, { bg: string; text: string }> = {
  food_safety: { bg: '#ecfdf5', text: '#065f46' },
  facility_safety: { bg: '#fef2f2', text: '#991b1b' },
};

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getPillars(insight: IntelligenceInsight): string[] {
  return insight.affected_pillars?.filter(p => p === 'food_safety' || p === 'facility_safety') || [];
}

// ── Main Component ──────────────────────────────────────────

export function RegulatoryUpdates() {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [insights, setInsights] = useState<IntelligenceInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        let query = supabase
          .from('intelligence_insights')
          .select('*')
          .in('category', ['regulatory_updates', 'regulatory_change', 'legislative_update', 'regulatory_advisory', 'nfpa_update'])
          .in('status', ['published', 'pending_review'])
          .order('created_at', { ascending: false });

        if (isDemoMode) {
          query = query.eq('is_demo_eligible', true);
        }

        const { data, error } = await query.limit(50);

        if (!cancelled) {
          if (error || !data || data.length === 0) {
            const demoRegulatory = DEMO_INTELLIGENCE_INSIGHTS.filter(
              i => i.category === 'regulatory_updates' || i.category === 'regulatory_change' ||
                   i.category === 'legislative_update' || i.category === 'regulatory_advisory' ||
                   i.category === 'nfpa_update',
            );
            setInsights(demoRegulatory);
          } else {
            setInsights(data.map((row: any) => ({
              ...row,
              personalizedBusinessImpact: row.personalized_business_impact ?? row.personalizedBusinessImpact,
            })));
          }
        }
      } catch {
        if (!cancelled) {
          const demoRegulatory = DEMO_INTELLIGENCE_INSIGHTS.filter(
            i => i.category === 'regulatory_updates' || i.category === 'regulatory_change' ||
                 i.category === 'legislative_update' || i.category === 'regulatory_advisory' ||
                 i.category === 'nfpa_update',
          );
          setInsights(demoRegulatory);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isDemoMode, profile?.organization_id]);

  // Filtered insights by scope
  const filtered = useMemo(() => {
    if (scopeFilter === 'all') return insights;
    return insights.filter(i => classifyScope(i) === scopeFilter);
  }, [insights, scopeFilter]);

  const selected = useMemo(() => filtered.find(i => i.id === selectedId) || null, [filtered, selectedId]);

  // Scope counts
  const scopeCounts = useMemo(() => {
    const counts = { all: insights.length, federal: 0, state: 0, local: 0 };
    insights.forEach(i => { counts[classifyScope(i)]++; });
    return counts;
  }, [insights]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: PAGE_BG, ...FONT }}>
      <style>{KEYFRAMES}</style>

      {/* Header */}
      <header
        className="px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-2"
        style={{ backgroundColor: CARD_BG, borderBottom: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1e3a5f' }}>
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg" style={{ color: BODY_TEXT }}>Regulatory Updates</h1>
            <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
              New rules, policy changes, and regulatory actions from federal, state, and local agencies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: TEXT_TERTIARY }}>
          <Filter className="h-3.5 w-3.5" />
          <span>{filtered.length} update{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </header>

      {/* Scope Filter Tabs */}
      <div
        className="px-4 sm:px-6 py-2 flex gap-1.5 overflow-x-auto"
        style={{ backgroundColor: CARD_BG, borderBottom: `1px solid ${CARD_BORDER}` }}
      >
        {(['all', 'federal', 'state', 'local'] as ScopeFilter[]).map(scope => {
          const isActive = scopeFilter === scope;
          const meta = scope !== 'all' ? SCOPE_META[scope] : null;
          const Icon = meta?.icon || Filter;
          return (
            <button
              key={scope}
              onClick={() => { setScopeFilter(scope); setSelectedId(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
              style={{
                backgroundColor: isActive ? (meta?.bg || '#1e3a5f') : 'transparent',
                color: isActive ? (meta?.color || '#fff') : TEXT_TERTIARY,
                border: `1px solid ${isActive ? (meta?.border || '#1e3a5f') : 'transparent'}`,
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="capitalize">{scope === 'all' ? 'All Sources' : meta?.label}</span>
              <span
                className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]"
                style={{
                  backgroundColor: isActive ? 'rgba(0,0,0,0.08)' : PANEL_BG,
                  color: isActive ? (meta?.color || '#fff') : TEXT_TERTIARY,
                }}
              >
                {scopeCounts[scope]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* Left panel — list */}
        <div className="w-full lg:w-[35%] border-r overflow-y-auto" style={{ borderColor: CARD_BORDER, maxHeight: 'calc(100vh - 120px)' }}>
          {isLoading ? (
            <div className="p-8 text-center" style={{ color: MUTED }}>
              <Clock className="h-6 w-6 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Loading regulatory updates...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Scale className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <h3 className="text-sm font-semibold mb-1" style={{ color: BODY_TEXT }}>No regulatory updates</h3>
              <p className="text-xs" style={{ color: MUTED }}>
                {scopeFilter !== 'all'
                  ? `No ${scopeFilter}-level updates found. Try "All Sources".`
                  : 'Regulatory updates will appear here as the intelligence pipeline processes them.'}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: CARD_BORDER }}>
              {filtered.map((insight, idx) => {
                const ic = IMPACT_COLORS[insight.impact_level];
                const scope = classifyScope(insight);
                const sm = SCOPE_META[scope];
                const isSelected = selectedId === insight.id;
                const pillars = getPillars(insight);
                return (
                  <button
                    key={insight.id}
                    onClick={() => setSelectedId(insight.id)}
                    className="w-full text-left px-4 py-3 transition-colors hover:opacity-90"
                    style={{
                      backgroundColor: isSelected ? PANEL_BG : CARD_BG,
                      ...stagger(idx * 0.03),
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {/* Scope dot */}
                      <span
                        className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: sm.color }}
                        title={sm.label}
                      />
                      <div className="flex-1 min-w-0">
                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                            style={{ backgroundColor: ic.bg, color: ic.text, border: `1px solid ${ic.border}` }}
                          >
                            {insight.impact_level}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase"
                            style={{ backgroundColor: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}
                          >
                            {sm.label}
                          </span>
                          {pillars.map(p => (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                              style={{ backgroundColor: PILLAR_COLORS[p]?.bg || PANEL_BG, color: PILLAR_COLORS[p]?.text || MUTED }}
                            >
                              {p === 'food_safety' ? 'Food' : 'Fire'}
                            </span>
                          ))}
                          <span className="text-[10px] ml-auto shrink-0" style={{ color: TEXT_TERTIARY }}>
                            {timeAgo(insight.published_at || (insight as any).created_at)}
                          </span>
                        </div>
                        {/* Title */}
                        <p className="text-[13px] font-semibold leading-tight line-clamp-2" style={{ color: BODY_TEXT }}>
                          {insight.title}
                        </p>
                        {/* Source */}
                        <p className="text-[11px] mt-1 line-clamp-1" style={{ color: MUTED }}>
                          {insight.source_name}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 mt-1 shrink-0 hidden lg:block" style={{ color: TEXT_TERTIARY }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel — detail */}
        <div className="hidden lg:block flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {!selected ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Scale className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-medium" style={{ color: MUTED }}>Select an update to view details</p>
              </div>
            </div>
          ) : (() => {
            const scope = classifyScope(selected);
            const sm = SCOPE_META[scope];
            const ScopeIcon = sm.icon;
            const pillars = getPillars(selected);
            return (
              <div style={stagger(0)}>
                {/* Badges */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span
                    className="px-2 py-1 rounded-md text-xs font-bold uppercase"
                    style={{ backgroundColor: IMPACT_COLORS[selected.impact_level].bg, color: IMPACT_COLORS[selected.impact_level].text, border: `1px solid ${IMPACT_COLORS[selected.impact_level].border}` }}
                  >
                    {selected.impact_level}
                  </span>
                  <span
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold"
                    style={{ backgroundColor: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}
                  >
                    <ScopeIcon className="h-3 w-3" />
                    {sm.label}
                  </span>
                  {pillars.map(p => (
                    <span
                      key={p}
                      className="px-2 py-1 rounded-md text-xs font-medium"
                      style={{ backgroundColor: PILLAR_COLORS[p]?.bg || PANEL_BG, color: PILLAR_COLORS[p]?.text || MUTED }}
                    >
                      {p === 'food_safety' ? 'Food Safety' : 'Facility Safety'}
                    </span>
                  ))}
                  <span className="px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: PANEL_BG, color: MUTED }}>
                    {selected.source_name}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold mb-2" style={{ color: BODY_TEXT }}>{selected.title}</h2>

                {/* Headline */}
                {selected.headline && (
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: MUTED }}>{selected.headline}</p>
                )}

                {/* Summary */}
                <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_TERTIARY }}>Summary</h3>
                  <p className="text-sm leading-relaxed" style={{ color: BODY_TEXT }}>{selected.summary}</p>
                </div>

                {/* Executive Brief */}
                {selected.executive_brief && (
                  <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#f0f4ff', border: '1px solid #c7d2fe' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#3730a3' }}>Executive Brief</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#1e1b4b' }}>{selected.executive_brief}</p>
                  </div>
                )}

                {/* Full Analysis */}
                {selected.full_analysis && (
                  <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_TERTIARY }}>Full Analysis</h3>
                    {selected.full_analysis.split('\n').map((para, i) => (
                      <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: BODY_TEXT }}>{para}</p>
                    ))}
                  </div>
                )}

                {/* Cost Impact */}
                {selected.estimated_cost_impact && (selected.estimated_cost_impact.low > 0 || selected.estimated_cost_impact.high > 0) && (
                  <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#92400e' }}>Estimated Cost Impact</h3>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-lg font-bold" style={{ color: '#92400e' }}>
                        ${selected.estimated_cost_impact.low.toLocaleString()} &ndash; ${selected.estimated_cost_impact.high.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#78350f' }}>{selected.estimated_cost_impact.methodology}</p>
                  </div>
                )}

                {/* Action Items */}
                {selected.action_items && selected.action_items.length > 0 && (
                  <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_TERTIARY }}>Action Items</h3>
                    <ol className="space-y-2">
                      {selected.action_items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: BODY_TEXT }}>
                          <span className="text-xs font-bold mt-0.5 shrink-0" style={{ color: '#1e3a5f' }}>{idx + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Affected Counties */}
                {selected.affected_counties && selected.affected_counties.length > 0 && (
                  <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#166534' }}>Affected Jurisdictions</h3>
                    <div className="flex flex-wrap gap-2">
                      {selected.affected_counties.map(county => (
                        <span key={county} className="px-2 py-1 rounded-md text-xs font-semibold bg-white capitalize" style={{ color: '#166534', border: '1px solid #86efac' }}>
                          {county.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selected.tags && selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {selected.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: PANEL_BG, color: MUTED }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default RegulatoryUpdates;
