/**
 * EvidLY Intelligence — The Moat
 * 80+ sources crawled. Every signal correlated to clients, jurisdictions, and industries.
 * Route: /admin/intelligence
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { INDUSTRY_LABELS, SCOPE_LABELS, correlateSignal, type CorrelationPreview } from '../../lib/correlationEngine';
import { routingTierLabel, routingTierColor, type RoutingTier } from '../../lib/intelligenceRouter';
import { CIC_PILLARS, getPillarForSignalType, isPseSignalType } from '../../lib/cicPillars';
import { RiskLevelTooltip } from '../../components/RiskLevelTooltip';
import VerificationPanel from '../../components/admin/VerificationPanel';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E5E0D8';

type Tab = 'overview' | 'signals' | 'sources' | 'correlations' | 'jurisdiction_updates' | 'regulatory_updates' | 'rfp' | 'predictions';

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
  created_at: string;
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
  cic_pillar: string | null;
  routing_tier: RoutingTier | null;
  severity_score: number | null;
  confidence_score: number | null;
  auto_published: boolean;
  auto_publish_at: string | null;
  review_deadline: string | null;
  routing_reason: string | null;
  published_at: string | null;
  published_by: string | null;
  is_published: boolean;
}

// JIEUpdate interface removed — merged into Jurisdiction Updates tab

interface Correlation {
  id: string;
  source_type: string;
  source_id: string;
  organization_id: string | null;
  jurisdiction_id: string | null;
  correlation_type: string;
  correlation_strength: number | null;
  notes: string | null;
  created_at: string;
  jurisdictions?: { county: string } | null;
  organizations?: { name: string } | null;
}

interface RegulatoryChange {
  id: string;
  source_id: string | null;
  change_type: string;
  title: string;
  summary: string;
  impact_description: string;
  impact_level: string;
  affected_pillars: string[];
  affected_states: string[] | null;
  effective_date: string | null;
  source_url: string | null;
  ai_generated: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published: boolean;
  published_at: string | null;
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

interface PredictionRow {
  id: string;
  organization_id: string;
  location_id: string;
  failure_probability: number;
  risk_level: string;
  score_trajectory: string;
  trajectory_confidence: number | null;
  recommended_service_date: string | null;
  service_urgency: string | null;
  top_risk_pillars: string[];
  top_risk_reasons: string[];
  input_checklist_rate_30d: number | null;
  input_temp_pass_rate_30d: number | null;
  input_days_since_service: number | null;
  input_open_corrective_actions: number;
  input_days_to_next_inspection: number | null;
  model_version: string;
  prediction_method: string;
  predicted_at: string;
  expires_at: string;
  locations?: { name: string; address: string | null } | null;
  organizations?: { name: string } | null;
}

interface AccuracyRow {
  id: string;
  location_id: string;
  organization_id: string;
  predicted_risk_level: string | null;
  predicted_probability: number | null;
  predicted_at: string | null;
  actual_inspection_date: string | null;
  actual_outcome: string | null;
  actual_score: string | null;
  actual_violations: number;
  prediction_correct: boolean | null;
  probability_error: number | null;
  model_version: string;
  logged_at: string;
  locations?: { name: string } | null;
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

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  food_safety:   { label: 'Food Safety (EH Depts)', icon: '🍽' },
  fire_safety:   { label: 'Fire Safety (AHJs)',     icon: '🔥' },
  fda_recalls:   { label: 'FDA / USDA Recalls',     icon: '🇺🇸' },
  regulatory:    { label: 'Regulatory Agencies',     icon: '📋' },
  legislative:   { label: 'Legislative',             icon: '🏛' },
  labor:         { label: 'Labor & Employment',      icon: '👷' },
  environmental: { label: 'Environmental',           icon: '🌿' },
  rfp:           { label: 'RFP / Procurement',       icon: '📄' },
  weather:       { label: 'Weather & Operational',   icon: '🌤' },
  competitive:   { label: 'Competitive Intel',       icon: '📊' },
};

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
  const [searchParams, setSearchParams] = useSearchParams();

  const [sources, setSources] = useState<Source[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [routingMode, setRoutingMode] = useState<'supervised' | 'autonomous'>('supervised');
  const [routingModeLoading, setRoutingModeLoading] = useState(false);
  // jieUpdates state removed — merged into jurisdictionUpdates
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [jurisdictionUpdates, setJurisdictionUpdates] = useState<JurisdictionIntelUpdate[]>([]);
  const [allJurisdictions, setAllJurisdictions] = useState<{ id: string; county: string; jurisdiction_key: string }[]>([]);
  const [regulatoryChanges, setRegulatoryChanges] = useState<RegulatoryChange[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [crawlRunning, setCrawlRunning] = useState(false);
  const [crawlFeedback, setCrawlFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Filters
  const [sigFilter, setSigFilter] = useState({ search: '', urgency: '', type: '', status: '', tier: '', pillar: '' });
  const [srcCatFilter, setSrcCatFilter] = useState('');
  const [srcStatusFilter, setSrcStatusFilter] = useState('');
  const [srcDemoOnly, setSrcDemoOnly] = useState(false);
  const [jurSearch, setJurSearch] = useState('');
  const [jurFilter, setJurFilter] = useState<'' | 'active' | 'quiet' | 'methodology'>('');
  const [jurSort, setJurSort] = useState<'signals' | 'name' | 'recent'>('signals');
  const [expandedRegVerification, setExpandedRegVerification] = useState<string | null>(null);

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

  // RFP Monitor
  const [rfpListings, setRfpListings] = useState<{ id: string; title: string; entity_name: string; state: string; relevance_tier: string; deadline: string | null; estimated_value_min: number | null; estimated_value_max: number | null; status: string; created_at: string; ai_relevance_summary: string | null }[]>([]);

  // Prediction Monitor state
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [accuracyLog, setAccuracyLog] = useState<AccuracyRow[]>([]);
  const [predLastRun, setPredLastRun] = useState<{ predicted_at: string; model_version: string } | null>(null);
  const [predTotalCount, setPredTotalCount] = useState(0);
  const [predLoading, setPredLoading] = useState(false);
  const [predSortCol, setPredSortCol] = useState<'failure_probability' | 'risk_level' | 'predicted_at'>('failure_probability');
  const [predSortAsc, setPredSortAsc] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sourcesRes, signalsRes, corrRes, jiuRes, regRes, rfpRes, jurRes] = await Promise.all([
        supabase.from('intelligence_sources').select('*').order('category').order('name'),
        supabase.from('intelligence_signals').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('entity_correlations').select('*, jurisdictions(county), organizations(name)').order('created_at', { ascending: false }).limit(100),
        supabase.from('jurisdiction_intel_updates').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('regulatory_changes').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('rfp_listings').select('id, title, entity_name, state, relevance_tier, deadline, estimated_value_min, estimated_value_max, status, created_at, ai_relevance_summary').order('created_at', { ascending: false }).limit(100),
        supabase.from('jurisdictions').select('id, county, jurisdiction_key').order('county'),
      ]);
      if (sourcesRes.data) setSources(sourcesRes.data);
      if (signalsRes.data) setSignals(signalsRes.data);
      if (corrRes.data) setCorrelations(corrRes.data);
      if (jiuRes.data) setJurisdictionUpdates(jiuRes.data);
      if (regRes.data) setRegulatoryChanges(regRes.data);
      if (rfpRes.data) setRfpListings(rfpRes.data);
      if (jurRes.data) setAllJurisdictions(jurRes.data);
    } catch {
      // Queries may fail in demo mode — empty states will show
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Load prediction data when tab is selected
  useEffect(() => {
    if (activeTab !== 'predictions') return;
    let cancelled = false;
    async function loadPredictions() {
      setPredLoading(true);
      try {
        const [predRes, accRes, lastRes, countRes] = await Promise.all([
          supabase
            .from('location_risk_predictions')
            .select('*, locations(name, address), organizations(name)')
            .order('failure_probability', { ascending: false })
            .limit(100),
          supabase
            .from('prediction_accuracy_log')
            .select('*, locations(name)')
            .order('logged_at', { ascending: false })
            .limit(50),
          supabase
            .from('location_risk_predictions')
            .select('predicted_at, model_version')
            .order('predicted_at', { ascending: false })
            .limit(1)
            .single(),
          supabase
            .from('location_risk_predictions')
            .select('*', { count: 'exact', head: true }),
        ]);
        if (!cancelled) {
          if (predRes.data) setPredictions(predRes.data);
          if (accRes.data) setAccuracyLog(accRes.data);
          if (lastRes.data) setPredLastRun(lastRes.data);
          setPredTotalCount(countRes.count || 0);
        }
      } catch {
        // Queries may fail — empty states show
      }
      if (!cancelled) setPredLoading(false);
    }
    loadPredictions();
    return () => { cancelled = true; };
  }, [activeTab]);

  // Load routing mode
  useEffect(() => {
    supabase.from('platform_settings').select('value').eq('key', 'intelligence_routing_mode').single()
      .then(({ data }) => {
        if (data?.value) setRoutingMode((data.value as string) === 'autonomous' ? 'autonomous' : 'supervised');
      });
  }, []);

  // One-click approve from URL params (?approve=signalId)
  useEffect(() => {
    const approveId = searchParams.get('approve');
    if (approveId && signals.length > 0) {
      const signal = signals.find(s => s.id === approveId);
      if (signal && signal.status !== 'published') {
        updateSignalStatus(approveId, 'published');
        searchParams.delete('approve');
        setSearchParams(searchParams, { replace: true });
        // Signal auto-approved via URL param — UI updates via state
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals, searchParams]);

  const toggleRoutingMode = async () => {
    const newMode = routingMode === 'supervised' ? 'autonomous' : 'supervised';
    setRoutingModeLoading(true);
    await supabase.from('platform_settings').upsert({
      key: 'intelligence_routing_mode',
      value: JSON.stringify(newMode),
      updated_by: user?.email,
      updated_at: new Date().toISOString(),
    });
    setRoutingMode(newMode);
    setRoutingModeLoading(false);
  };

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
  const activeSources = sources.filter(s => s.status === 'live').length;
  const brokenSources = sources.filter(s => ['waf_blocked', 'timeout', 'error', 'degraded'].includes(s.status)).length;
  const demoCritical = sources.filter(s => s.is_demo_critical).length;
  const totalSignals = signals.length;
  const pendingSignals = signals.filter(s => !s.published_at).length;
  const publishedSignals = signals.filter(s => !!s.published_at).length;
  const criticalSignals = signals.filter(s => s.risk_revenue === 'critical' || s.risk_liability === 'critical').length;
  const totalCorrelations = correlations.length;
  const regulatoryCount = regulatoryChanges.length;
  const rfpCount = rfpListings.length;
  const pendingReview = signals.filter(s => s.routing_tier === 'hold').length;
  const autoRouted = signals.filter(s => s.routing_tier === 'auto').length;
  const notifyRouted = signals.filter(s => s.routing_tier === 'notify').length;
  const holdRouted = signals.filter(s => s.routing_tier === 'hold').length;

  // Filtered signals
  const filteredSignals = signals.filter(s => {
    if (sigFilter.search && !s.title?.toLowerCase().includes(sigFilter.search.toLowerCase())) return false;
    if (sigFilter.urgency && s.ai_urgency !== sigFilter.urgency) return false;
    if (sigFilter.type && s.signal_type !== sigFilter.type) return false;
    if (sigFilter.status && s.status !== sigFilter.status) return false;
    if (sigFilter.tier && s.routing_tier !== sigFilter.tier) return false;
    if (sigFilter.pillar) {
      const sp = s.cic_pillar || getPillarForSignalType(s.signal_type)?.id;
      if (sp !== sigFilter.pillar) return false;
    }
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

  // publishJIEUpdate removed — JIE tab merged into Jurisdiction Updates

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

  const deliverToClients = async (type: 'advisory' | 'jurisdiction_update' | 'regulatory_update', id: string, title: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('intelligence-deliver', {
        body: { type, id },
      });
      if (error) throw error;
      // Delivery succeeded — data.delivered orgs notified
    } catch {
      // Delivery function unavailable — signal still published
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
      // Advisory published — no delivery endpoint matched
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

      {/* KPI Bar */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #E5E7EB',
        borderRadius: 10, padding: '12px 28px',
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16,
      }}>
        {[
          { label: 'Total Signals', value: signals.length, color: NAVY },
          { label: 'Pending Review', value: pendingReview, color: '#D97706' },
          { label: 'Critical', value: criticalSignals, color: NAVY },
          { label: 'Published', value: signals.filter(s => !!s.published_at).length, color: signals.filter(s => !!s.published_at).length > 0 ? '#16A34A' : '#DC2626' },
          { label: 'Sources', value: totalSources, color: NAVY, note: `${activeSources} live · ${brokenSources} broken` },
          { label: 'Correlations', value: correlations.length, color: '#16A34A' },
        ].map(k => (
          <div key={k.label}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>
              {loading ? '—' : k.value}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{k.label}</div>
            {k.note && <div style={{ fontSize: 9, color: '#6B7280', marginTop: 2 }}>{k.note}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}`, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {([
          { key: 'overview' as Tab, label: 'Overview', count: null },
          { key: 'signals' as Tab, label: 'Signals', count: signals.length },
          { key: 'sources' as Tab, label: 'Sources', count: totalSources },
          { key: 'correlations' as Tab, label: 'Correlations', count: correlations.length },
          { key: 'jurisdiction_updates' as Tab, label: 'Jurisdictions', count: null },
          { key: 'regulatory_updates' as Tab, label: 'Regulatory', count: regulatoryChanges.length },
          { key: 'predictions' as Tab, label: 'Predictions', count: null },
        ]).map(t => {
          const isActive = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '10px 16px', fontSize: 13, cursor: 'pointer', background: 'none', border: 'none',
              color: isActive ? GOLD : TEXT_MUTED,
              borderBottom: `2px solid ${isActive ? GOLD : 'transparent'}`,
              marginBottom: -2, fontWeight: isActive ? 600 : 400, transition: 'all 0.12s',
              display: 'flex', alignItems: 'center', gap: 6,
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              {t.label}
              {t.count != null && t.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: isActive ? '#F5F0E8' : '#F3F4F6',
                  color: isActive ? NAVY : '#6B7280',
                  padding: '1px 6px', borderRadius: 10,
                  fontFamily: 'monospace',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ────────── TAB: OVERVIEW ────────── */}
      {activeTab === 'overview' && (
        <>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'stretch', marginBottom: 20 }}>
          {([
            { label: 'Total Sources', value: totalSources, color: NAVY },
            { label: 'Active Sources', value: activeSources, color: '#16A34A' },
            { label: 'Broken Sources', value: brokenSources, color: brokenSources > 0 ? '#DC2626' : NAVY },
            { label: 'Total Signals', value: totalSignals, color: NAVY },
            { label: 'Pending Signals', value: pendingSignals, color: '#D97706' },
            { label: 'Published Signals', value: publishedSignals, color: publishedSignals > 0 ? '#16A34A' : '#DC2626' },
            { label: 'Critical Signals', value: criticalSignals, color: criticalSignals > 0 ? '#DC2626' : NAVY },
            { label: 'Correlations', value: totalCorrelations, color: '#16A34A' },
            { label: 'Regulatory', value: regulatoryCount, color: NAVY },
            { label: 'RFP Listings', value: rfpCount, color: NAVY },
          ] as const).map(card => (
            <div key={card.label} style={{
              background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10,
              padding: '16px 20px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: card.color, lineHeight: 1 }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        {pendingSignals > 0 && (
          <div style={{
            padding: '10px 16px', marginBottom: 20, borderRadius: 8,
            background: '#FFFBEB', border: '1px solid #F59E0B',
            fontSize: 13, fontWeight: 500, color: '#92400E',
          }}>
            {pendingSignals} signal{pendingSignals !== 1 ? 's' : ''} pending review — users see empty Business Intelligence.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Source health by category */}
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Source Health by Category</div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={28} />)}
              </div>
            ) : Object.entries(CATEGORY_META).map(([key, meta]) => {
              const catSources = sources.filter(s => s.category === key);
              if (catSources.length === 0) return null;
              const live = catSources.filter(s => s.status === 'live').length;
              const broken = catSources.filter(s => ['waf_blocked', 'timeout', 'error', 'degraded'].includes(s.status)).length;
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid #F0EDE8',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{meta.icon}</span>
                    <span style={{ fontSize: 12, color: '#4A5568' }}>{meta.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                    <span style={{ color: live > 0 ? '#059669' : '#94A3B8', fontWeight: 600 }}>{live} live</span>
                    {broken > 0 && <span style={{ color: '#DC2626', fontWeight: 600 }}>⚠ {broken} broken</span>}
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
                      {sig.signal_type?.replace(/_/g, ' ')} · {sig.source_key} · {new Date(sig.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Auto-Routing Engine */}
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Intelligence Routing Engine</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                  Signals are auto-triaged into routing tiers based on AI confidence, severity, and risk dimensions.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: TEXT_SEC, fontWeight: 500 }}>
                  {routingMode === 'supervised' ? 'Supervised' : 'Autonomous'}
                </span>
                <button onClick={toggleRoutingMode} disabled={routingModeLoading}
                  style={{
                    width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative',
                    background: routingMode === 'autonomous' ? '#059669' : '#D1D5DB', transition: 'background 0.2s',
                  }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                    left: routingMode === 'autonomous' ? 25 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Auto-Publish', count: autoRouted, color: '#059669', bg: '#ECFDF5', desc: 'Low-risk, high-confidence' },
                { label: 'Notify Admin', count: notifyRouted, color: '#D97706', bg: '#FFFBEB', desc: 'Medium — awaiting one-click approve' },
                { label: 'Manual Review', count: holdRouted, color: '#DC2626', bg: '#FEF2F2', desc: 'High-risk or low confidence' },
                { label: 'Auto-Published', count: signals.filter(s => s.auto_published).length, color: '#1E2D4D', bg: '#F0F4F8', desc: 'Published without manual review' },
              ].map(stat => (
                <div key={stat.label} style={{ padding: 14, borderRadius: 8, background: stat.bg, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 24, fontWeight: 800, color: stat.color }}>{loading ? '—' : stat.count}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: stat.color, marginTop: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 9, color: TEXT_MUTED, marginTop: 2 }}>{stat.desc}</div>
                </div>
              ))}
            </div>
            {routingMode === 'supervised' && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#FFFBEB', borderRadius: 8, fontSize: 11, color: '#92400E', lineHeight: 1.6 }}>
                <strong>Supervised mode:</strong> All signals require manual approval before publishing. Switch to Autonomous to enable auto-publishing of low-risk signals.
              </div>
            )}
            {routingMode === 'autonomous' && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#ECFDF5', borderRadius: 8, fontSize: 11, color: '#065F46', lineHeight: 1.6 }}>
                <strong>Autonomous mode:</strong> Low-risk, high-confidence signals are auto-published after a delay (2-4 hours). Medium-risk signals send you an email with a one-click approve link.
              </div>
            )}
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
                    borderColor: s.status === 'live' ? '#BBF7D0' : '#FECACA',
                    background: s.status === 'live' ? '#F0FDF4' : '#FEF2F2',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600,
                      color: s.status === 'live' ? '#065F46' : '#991B1B' }}>
                      {s.status === 'live' ? '● ' : '✗ '}{s.name}
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
        </>
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
            <select value={sigFilter.tier} onChange={e => setSigFilter(f => ({ ...f, tier: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">All Tiers</option>
              <option value="auto">Auto-Publish</option>
              <option value="notify">Notify Admin</option>
              <option value="hold">Manual Review</option>
            </select>
          </div>

          {/* CIC Pillar filter pills */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pillar:</span>
            <button onClick={() => setSigFilter(f => ({ ...f, pillar: '' }))}
              style={{
                padding: '3px 10px', borderRadius: 14, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                background: !sigFilter.pillar ? GOLD : '#fff', color: !sigFilter.pillar ? '#fff' : TEXT_MUTED,
                border: `1px solid ${!sigFilter.pillar ? GOLD : BORDER}`,
              }}>
              All Pillars
            </button>
            {CIC_PILLARS.map(p => (
              <button key={p.id} onClick={() => setSigFilter(f => ({ ...f, pillar: p.id }))}
                style={{
                  padding: '3px 10px', borderRadius: 14, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  background: sigFilter.pillar === p.id ? p.color : '#fff',
                  color: sigFilter.pillar === p.id ? '#fff' : TEXT_MUTED,
                  border: `1px solid ${sigFilter.pillar === p.id ? p.color : BORDER}`,
                }}>
                {p.shortLabel}
              </button>
            ))}
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
                      {sig.routing_tier && (() => {
                        const rc = routingTierColor(sig.routing_tier);
                        return (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: rc.bg, color: rc.text, border: `1px solid ${rc.text}30` }}
                            title={sig.routing_reason || ''}>
                            {routingTierLabel(sig.routing_tier)}
                            {sig.auto_published && ' (auto)'}
                          </span>
                        );
                      })()}
                      {/* PSE badge */}
                      {isPseSignalType(sig.signal_type) && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
                          PSE-Relevant
                        </span>
                      )}
                      {/* CIC Pillar badge */}
                      {(() => {
                        const pillar = sig.cic_pillar ? CIC_PILLARS.find(p => p.id === sig.cic_pillar) : getPillarForSignalType(sig.signal_type);
                        if (!pillar) return null;
                        return (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: pillar.bgColor, color: pillar.color }}>
                            {pillar.shortLabel}
                          </span>
                        );
                      })()}
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
                        {([
                          { key: 'Revenue', dim: 'revenue' as const, val: sig.risk_revenue },
                          { key: 'Liability', dim: 'liability' as const, val: sig.risk_liability },
                          { key: 'Cost', dim: 'cost' as const, val: sig.risk_cost },
                          { key: 'Operational', dim: 'operational' as const, val: sig.risk_operational },
                        ] as const).filter(d => d.val && d.val !== 'none').map(d => {
                          const rc = RISK_DIM_COLORS[d.val!] || RISK_DIM_COLORS.low;
                          return (
                            <RiskLevelTooltip key={d.key} dimension={d.dim} level={d.val}>
                              <span style={{
                                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                                background: rc.bg, color: rc.text, border: `1px solid ${rc.text}20`,
                              }}>
                                {d.key}: {rc.label}
                              </span>
                            </RiskLevelTooltip>
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
                    {sig.severity_score != null && (
                      <div style={{ textAlign: 'center', fontSize: 10, color: TEXT_MUTED }}>
                        Severity: <strong>{sig.severity_score}</strong> · Conf: <strong>{sig.confidence_score ?? 0}%</strong>
                      </div>
                    )}
                    {sig.auto_publish_at && sig.status !== 'published' && (
                      <div style={{ textAlign: 'center', fontSize: 9, color: '#D97706', marginTop: 2 }}>
                        Auto-pub: {new Date(sig.auto_publish_at).toLocaleString()}
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
              {Object.entries(CATEGORY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
            <select value={srcStatusFilter} onChange={e => setSrcStatusFilter(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">All Statuses</option>
              <option value="live">Live</option>
              <option value="degraded">Degraded</option>
              <option value="waf_blocked">WAF Blocked</option>
              <option value="timeout">Timeout</option>
              <option value="pending">Pending</option>
              <option value="disabled">Disabled</option>
              <option value="error">Error</option>
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
                              {s.url?.replace('https://', '').substring(0, 40)}{(s.url?.length || 0) > 48 ? '...' : ''}
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
                          {s.last_crawled_at ? new Date(s.last_crawled_at).toLocaleString() : '—'}
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

      {/* JIE tab removed — merged into Jurisdiction Updates tab */}

      {/* ────────── TAB: CORRELATIONS ────────── */}
      {activeTab === 'correlations' && (() => {
        const CORR_DIMS = [
          { key: 'risk_revenue' as const, label: 'Revenue', color: '#C2410C' },
          { key: 'risk_liability' as const, label: 'Liability', color: '#991B1B' },
          { key: 'risk_cost' as const, label: 'Cost', color: '#1E40AF' },
          { key: 'risk_operational' as const, label: 'Operational', color: '#166534' },
          { key: 'risk_workforce' as const, label: 'Workforce', color: '#6B21A8' },
        ];
        const SEV_ORDER = ['critical', 'high', 'moderate', 'low'];

        // Build signal → counties lookup from correlations
        const sigCounties: Record<string, { county: string; strength: number }[]> = {};
        for (const c of correlations) {
          const county = c.jurisdictions?.county || c.organizations?.name || null;
          if (county && c.source_id) {
            if (!sigCounties[c.source_id]) sigCounties[c.source_id] = [];
            sigCounties[c.source_id].push({ county, strength: Math.round((c.correlation_strength || 0) * 100) });
          }
        }

        // Helper: check if signal belongs to workforce pillar (P5)
        const isWorkforceSignal = (sig: Signal): boolean => {
          if (sig.cic_pillar === 'workforce_risk') return true;
          const p = getPillarForSignalType(sig.signal_type);
          return p?.id === 'workforce_risk';
        };

        // Build rows per dimension
        const dimSections = CORR_DIMS.map(dim => {
          const rows: { signal: Signal; county: string; strength: number; severity: string }[] = [];
          for (const sig of signals) {
            let severity: string | null = null;
            if (dim.key === 'risk_workforce') {
              // P5 Workforce — derived from cic_pillar or signal_type, not a DB column
              if (isWorkforceSignal(sig)) {
                // Use the highest non-none risk level from the signal as the severity
                const levels = [sig.risk_revenue, sig.risk_liability, sig.risk_cost, sig.risk_operational].filter(l => l && l !== 'none');
                severity = levels.length > 0
                  ? levels.sort((a, b) => SEV_ORDER.indexOf(a!) - SEV_ORDER.indexOf(b!))[0]!
                  : 'high'; // workforce signals default to high if no risk dims set
              }
            } else {
              severity = sig[dim.key as keyof Signal] as string | null;
            }
            if (!severity || severity === 'none') continue;
            const counties = sigCounties[sig.id];
            if (counties && counties.length > 0) {
              for (const c of counties) rows.push({ signal: sig, county: c.county, strength: c.strength, severity });
            } else {
              rows.push({ signal: sig, county: '—', strength: 0, severity });
            }
          }
          rows.sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity));
          return { ...dim, rows };
        });

        return (
          <>
            <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 12 }}>
              Signals grouped by risk dimension. A signal appears in every dimension where it has an assigned risk level.
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={60} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {dimSections.map(sec => (
                  <details key={sec.key} open style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                    <summary style={{
                      padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                      borderBottom: `1px solid ${BORDER}`, background: '#FAFAF8', listStyle: 'none',
                    }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: sec.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{sec.label}</span>
                      <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                        {sec.rows.length} signal{sec.rows.length !== 1 ? 's' : ''}
                      </span>
                    </summary>
                    {sec.rows.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: TEXT_MUTED }}>
                        No signals assigned to this dimension yet. Assign risk levels in the Signal Approval Queue.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                            {['Signal', 'Dimensions', 'Severity', 'County', 'Strength'].map(h => (
                              <th key={h} style={thStyle}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sec.rows.map((row, ri) => {
                            const allDims = [
                              { label: 'Rev', dim: 'revenue' as const, val: row.signal.risk_revenue },
                              { label: 'Liab', dim: 'liability' as const, val: row.signal.risk_liability },
                              { label: 'Cost', dim: 'cost' as const, val: row.signal.risk_cost },
                              { label: 'Ops', dim: 'operational' as const, val: row.signal.risk_operational },
                              { label: 'Wkf', dim: 'workforce' as const, val: isWorkforceSignal(row.signal) ? (row.severity || 'high') : 'none' },
                            ];
                            const sevColor = RISK_DIM_COLORS[row.severity] || RISK_DIM_COLORS.low;
                            return (
                              <tr key={`${row.signal.id}-${row.county}-${ri}`} style={{ borderBottom: `1px solid ${BORDER}` }}>
                                <td style={{ ...tdStyle, fontSize: 12, maxWidth: 260 }}>
                                  <div style={{ fontWeight: 500, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {row.signal.title}
                                  </div>
                                </td>
                                <td style={tdStyle}>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {allDims.map(d => {
                                      const level = d.val || 'none';
                                      const rc = RISK_DIM_COLORS[level] || RISK_DIM_COLORS.none;
                                      return level !== 'none' ? (
                                        <RiskLevelTooltip key={d.label} dimension={d.dim} level={level}>
                                          <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 6, background: rc.bg, color: rc.text }}>
                                            {d.label}
                                          </span>
                                        </RiskLevelTooltip>
                                      ) : (
                                        <span key={d.label} style={{ fontSize: 8, padding: '1px 5px', borderRadius: 6, color: '#D1D5DB' }}>
                                          {d.label}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td style={tdStyle}>
                                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: sevColor.bg, color: sevColor.text }}>
                                    {sevColor.label}
                                  </span>
                                </td>
                                <td style={{ ...tdStyle, fontSize: 12, color: TEXT_SEC }}>{row.county}</td>
                                <td style={tdStyle}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 48, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ width: `${row.strength}%`, height: '100%', background: row.strength >= 80 ? '#059669' : row.strength >= 50 ? '#FBBF24' : '#94A3B8', borderRadius: 3 }} />
                                    </div>
                                    <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600 }}>{row.strength}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </details>
                ))}
              </div>
            )}
          </>
        );
      })()}

      {/* ────────── TAB: JURISDICTION UPDATES ────────── */}
      {activeTab === 'jurisdiction_updates' && (() => {
        const REGION_MAP: Record<string, string[]> = {
          'Northern CA': ['Del Norte','Siskiyou','Modoc','Trinity','Shasta','Lassen','Humboldt','Tehama','Plumas','Mendocino','Glenn','Butte','Sierra','Lake','Colusa','Sutter','Yuba','Nevada','Placer','El Dorado','Yolo','Sacramento'],
          'Bay Area': ['San Francisco','Contra Costa','Alameda','San Mateo','Santa Clara','Marin','Sonoma','Napa','Solano','Berkeley'],
          'Central Valley': ['San Joaquin','Stanislaus','Merced','Madera','Fresno','Kings','Tulare','Kern'],
          'Southern CA': ['Los Angeles','Orange','San Diego','Riverside','San Bernardino','Imperial','Ventura','Santa Barbara','San Luis Obispo','Long Beach','Pasadena','Vernon'],
          'Central Coast': ['Monterey','Santa Cruz','San Benito'],
          'Other': ['Amador','Alpine','Calaveras','Inyo','Mariposa','Mono','Tuolumne'],
        };
        const getRegion = (county: string): string => {
          for (const [region, counties] of Object.entries(REGION_MAP)) {
            if (counties.includes(county)) return region;
          }
          return 'Other';
        };

        // Build per-jurisdiction signal data from correlations
        // Helper: check if signal belongs to workforce pillar (P5)
        const isWfSignal = (sig: Signal): boolean => {
          if (sig.cic_pillar === 'workforce_risk') return true;
          const p = getPillarForSignalType(sig.signal_type);
          return p?.id === 'workforce_risk';
        };

        const jurSignalMap: Record<string, { signalIds: Set<string>; lastDate: string; dims: { rev: boolean; liab: boolean; cost: boolean; ops: boolean; wkf: boolean } }> = {};
        for (const c of correlations) {
          if (!c.jurisdiction_id) continue;
          if (!jurSignalMap[c.jurisdiction_id]) jurSignalMap[c.jurisdiction_id] = { signalIds: new Set(), lastDate: '', dims: { rev: false, liab: false, cost: false, ops: false, wkf: false } };
          const entry = jurSignalMap[c.jurisdiction_id];
          entry.signalIds.add(c.source_id);
          const sig = signals.find(s => s.id === c.source_id);
          if (sig) {
            if (sig.created_at > entry.lastDate) entry.lastDate = sig.created_at;
            if (sig.risk_revenue && sig.risk_revenue !== 'none') entry.dims.rev = true;
            if (sig.risk_liability && sig.risk_liability !== 'none') entry.dims.liab = true;
            if (sig.risk_cost && sig.risk_cost !== 'none') entry.dims.cost = true;
            if (sig.risk_operational && sig.risk_operational !== 'none') entry.dims.ops = true;
            if (isWfSignal(sig)) entry.dims.wkf = true;
          }
        }

        // Build jurisdiction methodology lookup
        const jurMethodology: Record<string, JurisdictionIntelUpdate[]> = {};
        for (const u of jurisdictionUpdates) {
          const key = u.county || u.jurisdiction_name;
          if (!jurMethodology[key]) jurMethodology[key] = [];
          jurMethodology[key].push(u);
        }

        // Build full jurisdiction list
        const jurRows = allJurisdictions.map(j => {
          const data = jurSignalMap[j.id];
          const methodology = jurMethodology[j.county] || [];
          const signalCount = data?.signalIds.size || 0;
          const isActive = signalCount > 0;
          return {
            ...j,
            region: getRegion(j.county),
            signalCount,
            isActive,
            lastSignal: data?.lastDate || '',
            dims: data?.dims || { rev: false, liab: false, cost: false, ops: false, wkf: false },
            methodology,
            signalIds: data ? Array.from(data.signalIds) : [],
          };
        });

        // Filter
        const filtered = jurRows.filter(j => {
          if (jurSearch && !j.county.toLowerCase().includes(jurSearch.toLowerCase())) return false;
          if (jurFilter === 'active' && !j.isActive) return false;
          if (jurFilter === 'quiet' && j.isActive) return false;
          if (jurFilter === 'methodology' && j.methodology.length === 0) return false;
          return true;
        });

        // Sort
        filtered.sort((a, b) => {
          if (jurSort === 'signals') return b.signalCount - a.signalCount;
          if (jurSort === 'name') return a.county.localeCompare(b.county);
          if (jurSort === 'recent') return (b.lastSignal || '').localeCompare(a.lastSignal || '');
          return 0;
        });

        const activeCount = jurRows.filter(j => j.isActive).length;
        const quietCount = jurRows.filter(j => !j.isActive).length;
        const methCount = jurRows.filter(j => j.methodology.length > 0).length;

        return (
          <>
            <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 12 }}>
              All 62 California jurisdictions with correlated intelligence signals, risk dimensions, and methodology changes.
            </div>

            {/* KPI bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Total Jurisdictions', value: allJurisdictions.length || 62, color: NAVY },
                { label: 'Active', value: activeCount, color: '#059669' },
                { label: 'Quiet', value: quietCount, color: TEXT_MUTED },
                { label: 'Methodology Changes', value: methCount, color: GOLD },
              ].map(k => (
                <div key={k.label} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '14px 16px' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: k.color }}>
                    {loading ? '—' : k.value}
                  </div>
                  <div style={{ fontSize: 11, color: '#4A5568', marginTop: 3 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Search jurisdictions..." value={jurSearch}
                onChange={e => setJurSearch(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
              <select value={jurFilter} onChange={e => setJurFilter(e.target.value as any)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="quiet">Quiet</option>
                <option value="methodology">Has Methodology Change</option>
              </select>
              <select value={jurSort} onChange={e => setJurSort(e.target.value as any)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="signals">Signal Count (desc)</option>
                <option value="name">Name (A-Z)</option>
                <option value="recent">Most Recent Signal</option>
              </select>
              <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                {filtered.length} of {jurRows.length}
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={44} />)}
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {['Jurisdiction', 'Region', 'Signals', 'Risk Dimensions', 'Last Signal', 'Methodology', 'Status'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(j => (
                      <tr key={j.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ ...tdStyle, fontWeight: 500, color: NAVY }}>
                          {j.county}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11, color: TEXT_SEC }}>{j.region}</td>
                        <td style={{ ...tdStyle, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: j.signalCount > 0 ? NAVY : TEXT_MUTED }}>
                          {j.signalCount}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {j.dims.rev && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C2410C', display: 'inline-block' }} title="Revenue" />}
                            {j.dims.liab && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#991B1B', display: 'inline-block' }} title="Liability" />}
                            {j.dims.cost && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1E40AF', display: 'inline-block' }} title="Cost" />}
                            {j.dims.ops && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#166534', display: 'inline-block' }} title="Operational" />}
                            {j.dims.wkf && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6B21A8', display: 'inline-block' }} title="Workforce" />}
                            {!j.dims.rev && !j.dims.liab && !j.dims.cost && !j.dims.ops && !j.dims.wkf && (
                              <span style={{ fontSize: 10, color: TEXT_MUTED }}>{'—'}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11, fontFamily: "'DM Mono', monospace", color: j.lastSignal ? TEXT_SEC : TEXT_MUTED }}>
                          {j.lastSignal ? new Date(j.lastSignal).toLocaleDateString() : 'No signals'}
                        </td>
                        <td style={tdStyle}>
                          {j.methodology.length > 0 ? (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: '#F5F3FF', color: '#5B21B6' }}>
                              {j.methodology.length} change{j.methodology.length !== 1 ? 's' : ''}
                            </span>
                          ) : <span style={{ fontSize: 10, color: TEXT_MUTED }}>{'—'}</span>}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                            background: j.isActive ? '#ECFDF5' : '#F9FAFB',
                            color: j.isActive ? '#059669' : TEXT_MUTED,
                          }}>
                            {j.isActive ? 'Active' : 'Quiet'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        );
      })()}

      {/* ────────── TAB: REGULATORY UPDATES ────────── */}
      {activeTab === 'regulatory_updates' && (
        <>
          <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 8 }}>
            Regulatory code changes monitored across federal, state, county, and industry standards.
            Published changes are delivered to all affected client intelligence feeds.
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={60} />)}
            </div>
          ) : regulatoryChanges.length === 0 ? (
            <EmptyState
              icon="📜"
              title="No regulatory changes yet"
              subtitle="Changes appear here when the AI monitoring system detects updates to FDA Food Code, NFPA standards, CalCode, or other tracked regulatory sources."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {regulatoryChanges.map(rc => {
                const impactColor = rc.impact_level === 'critical'
                  ? { bg: '#FEF2F2', text: '#DC2626' }
                  : rc.impact_level === 'moderate'
                    ? { bg: '#FFFBEB', text: '#D97706' }
                    : { bg: '#F9FAFB', text: '#6B7280' };
                return (
                  <div key={rc.id} style={{
                    background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 18px',
                    borderLeft: `4px solid ${impactColor.text}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        {/* Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                            background: impactColor.bg, color: impactColor.text,
                          }}>
                            {rc.impact_level.toUpperCase()}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                            background: '#F9FAFB', color: TEXT_SEC, border: `1px solid ${BORDER}`,
                          }}>
                            {(rc.change_type || '').replace(/_/g, ' ')}
                          </span>
                          {rc.affected_pillars && rc.affected_pillars.length > 0 && rc.affected_pillars.map(p => {
                            const pc = PILLAR_COLORS[p] || PILLAR_COLORS.both;
                            return (
                              <span key={p} style={{
                                fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                                background: pc.bg, color: pc.text,
                              }}>
                                {(p || '').replace(/_/g, ' ').toUpperCase()}
                              </span>
                            );
                          })}
                          {rc.ai_generated && (
                            <span style={{ fontSize: 9, color: TEXT_MUTED }}>AI-generated</span>
                          )}
                        </div>
                        {/* Title + summary */}
                        <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 4 }}>{rc.title}</div>
                        <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 6 }}>{rc.summary}</div>
                        {rc.impact_description && rc.impact_description !== rc.summary && (
                          <div style={{ fontSize: 11, color: '#1D4ED8', background: '#EFF6FF', padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}>
                            <strong>Impact:</strong> {rc.impact_description}
                          </div>
                        )}
                        {/* Meta row */}
                        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: TEXT_MUTED, flexWrap: 'wrap' }}>
                          {rc.effective_date && (
                            <span>Effective: <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{rc.effective_date}</span></span>
                          )}
                          {rc.affected_states && rc.affected_states.length > 0 && (
                            <span>States: {rc.affected_states.join(', ')}</span>
                          )}
                          <span>{new Date(rc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 100 }}>
                        {rc.reviewed_by ? (
                          <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>Reviewed</span>
                        ) : (
                          <span style={{ fontSize: 10, color: TEXT_MUTED }}>Unreviewed</span>
                        )}
                        {rc.published ? (
                          <span style={{ fontSize: 10, color: GOLD, fontWeight: 600 }}>Published</span>
                        ) : (
                          <button onClick={async () => {
                            await deliverToClients('regulatory_update', rc.id, rc.title);
                            setRegulatoryChanges(prev => prev.map(r =>
                              r.id === rc.id ? { ...r, published: true, published_at: new Date().toISOString() } : r
                            ));
                          }}
                            style={{
                              fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                              background: GOLD, color: '#fff', border: 'none', width: '100%',
                            }}>
                            Publish
                          </button>
                        )}
                        {rc.source_url && (
                          <a href={rc.source_url} target="_blank" rel="noreferrer"
                            style={{ fontSize: 10, color: GOLD, textDecoration: 'none', textAlign: 'center' }}>
                            Source
                          </a>
                        )}
                        <button
                          onClick={() => setExpandedRegVerification(expandedRegVerification === rc.id ? null : rc.id)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                            background: 'transparent', color: TEXT_SEC, border: `1px solid ${BORDER}`,
                          }}>
                          {expandedRegVerification === rc.id ? 'Hide Gates' : 'Verify'}
                        </button>
                      </div>
                    </div>
                    {/* Verification Panel */}
                    {expandedRegVerification === rc.id && (
                      <div style={{ marginTop: 12 }}>
                        <VerificationPanel
                          contentTable="regulatory_changes"
                          contentId={rc.id}
                          contentType="legislation"
                          contentTitle={rc.title}
                          onVerificationChange={loadAll}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ────────── TAB: RFP MONITOR ────────── */}
      {activeTab === 'rfp' && (
        <>
          <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 8 }}>
            Government procurement opportunities (RFPs, RFQs, RFIs) relevant to food safety compliance technology.
            AI-classified by relevance tier from crawled procurement portals.
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={60} />)}
            </div>
          ) : rfpListings.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No RFP listings yet"
              subtitle="Government procurement opportunities will appear here when the AI crawl system detects RFPs, RFQs, or RFIs relevant to food safety compliance technology. Sources include SAM.gov, state procurement portals, and county bid boards."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rfpListings.map(rfp => {
                const tierColor = rfp.relevance_tier === 'high'
                  ? { bg: '#ECFDF5', text: '#059669' }
                  : rfp.relevance_tier === 'medium'
                    ? { bg: '#FFFBEB', text: '#D97706' }
                    : { bg: '#F9FAFB', text: '#6B7280' };
                const isExpired = rfp.deadline && new Date(rfp.deadline) < new Date();
                return (
                  <div key={rfp.id} style={{
                    background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 18px',
                    borderLeft: `4px solid ${tierColor.text}`,
                    opacity: isExpired ? 0.6 : 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                            background: tierColor.bg, color: tierColor.text,
                          }}>
                            {(rfp.relevance_tier || 'unclassified').toUpperCase()}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                            background: '#F9FAFB', color: TEXT_SEC, border: `1px solid ${BORDER}`,
                          }}>
                            {rfp.status?.replace(/_/g, ' ') || 'new'}
                          </span>
                          {rfp.state && <span style={{ fontSize: 10, color: GOLD, fontWeight: 500 }}>{rfp.state}</span>}
                          {isExpired && <span style={{ fontSize: 9, color: '#DC2626', fontWeight: 700 }}>EXPIRED</span>}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 4 }}>{rfp.title}</div>
                        <div style={{ fontSize: 12, color: TEXT_SEC, marginBottom: 4 }}>{rfp.entity_name}</div>
                        {rfp.ai_relevance_summary && (
                          <div style={{ fontSize: 11, color: '#1D4ED8', background: '#EFF6FF', padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}>
                            <strong>AI:</strong> {rfp.ai_relevance_summary}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: TEXT_MUTED, flexWrap: 'wrap' }}>
                          {rfp.deadline && (
                            <span>Deadline: <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{new Date(rfp.deadline).toLocaleDateString()}</span></span>
                          )}
                          {(rfp.estimated_value_min || rfp.estimated_value_max) && (
                            <span>Value: ${rfp.estimated_value_min?.toLocaleString() || '?'} – ${rfp.estimated_value_max?.toLocaleString() || '?'}</span>
                          )}
                          <span>{new Date(rfp.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ────────── TAB: PREDICTION MONITOR ────────── */}
      {activeTab === 'predictions' && (() => {
        const RISK_BADGE: Record<string, { bg: string; text: string }> = {
          critical: { bg: '#FEF2F2', text: '#DC2626' },
          high:     { bg: '#FFF7ED', text: '#C2410C' },
          moderate: { bg: '#FFFBEB', text: '#D97706' },
          low:      { bg: '#F0FDF4', text: '#16A34A' },
          unknown:  { bg: '#F3F4F6', text: '#6B7280' },
        };
        const URGENCY_TEXT: Record<string, string> = {
          immediate: '#DC2626', soon: '#D97706', scheduled: '#6B7280', none: '#9CA3AF',
        };
        const PILLAR_BADGE: Record<string, { bg: string; text: string; label: string }> = {};
        for (const p of CIC_PILLARS) {
          PILLAR_BADGE[`P${p.number}`] = { bg: p.bgColor, text: p.color, label: p.shortLabel };
        }

        function relativeTime(iso: string): string {
          const diff = Date.now() - new Date(iso).getTime();
          const mins = Math.floor(diff / 60000);
          if (mins < 1) return 'just now';
          if (mins < 60) return `${mins}m ago`;
          const hrs = Math.floor(mins / 60);
          if (hrs < 24) return `${hrs}h ago`;
          const days = Math.floor(hrs / 24);
          return `${days}d ago`;
        }

        // Sorted predictions
        const sortedPredictions = [...predictions].sort((a, b) => {
          if (predSortCol === 'failure_probability') {
            return predSortAsc
              ? a.failure_probability - b.failure_probability
              : b.failure_probability - a.failure_probability;
          }
          if (predSortCol === 'risk_level') {
            const order = ['critical', 'high', 'moderate', 'low', 'unknown'];
            const ai = order.indexOf(a.risk_level);
            const bi = order.indexOf(b.risk_level);
            return predSortAsc ? ai - bi : bi - ai;
          }
          // predicted_at
          return predSortAsc
            ? new Date(a.predicted_at).getTime() - new Date(b.predicted_at).getTime()
            : new Date(b.predicted_at).getTime() - new Date(a.predicted_at).getTime();
        });

        const handleSort = (col: typeof predSortCol) => {
          if (predSortCol === col) {
            setPredSortAsc(!predSortAsc);
          } else {
            setPredSortCol(col);
            setPredSortAsc(false);
          }
        };

        const sortArrow = (col: typeof predSortCol) =>
          predSortCol === col ? (predSortAsc ? ' \u2191' : ' \u2193') : '';

        return (
          <>
            {/* Section 1: Model Status Bar */}
            <div style={{
              background: NAVY, borderRadius: 12, padding: '18px 24px',
              display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap',
              color: '#fff',
            }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Model Version</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: GOLD }}>{predLastRun?.model_version || 'rules-v1'}</div>
              </div>
              <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)' }} />
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Method</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Rules-based</div>
              </div>
              <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)' }} />
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Phase</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Phase 1 of 3</div>
              </div>
              <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)' }} />
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Next Phase</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>MindsDB (10{'\u2013'}25 customers)</div>
              </div>
              <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)' }} />
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Last Run</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{predLastRun ? relativeTime(predLastRun.predicted_at) : '\u2014'}</div>
              </div>
              <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)' }} />
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Predictions</div>
                <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'DM Mono', monospace" }}>{predTotalCount}</div>
              </div>
            </div>

            {/* Section 2: Location Risk Score Table */}
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 12 }}>Location Risk Scores</h3>
              {predLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={36} />)}
                </div>
              ) : sortedPredictions.length === 0 ? (
                <EmptyState
                  icon={'\uD83D\uDD2E'}
                  title="No predictions generated yet"
                  subtitle="Trigger the generate-alerts edge function to run the first prediction. Predictions will appear here with risk scores per location."
                />
              ) : (
                <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <th style={thStyle}>Location</th>
                        <th style={thStyle}>Organization</th>
                        <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('risk_level')}>
                          Risk Level{sortArrow('risk_level')}
                        </th>
                        <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('failure_probability')}>
                          Failure Prob.{sortArrow('failure_probability')}
                        </th>
                        <th style={thStyle}>Trajectory</th>
                        <th style={thStyle}>Top Risk Pillars</th>
                        <th style={thStyle}>Service Urgency</th>
                        <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('predicted_at')}>
                          Predicted At{sortArrow('predicted_at')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPredictions.map(p => {
                        const badge = RISK_BADGE[p.risk_level] || RISK_BADGE.unknown;
                        const pct = Math.round(p.failure_probability * 100);
                        return (
                          <tr key={p.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ ...tdStyle, fontWeight: 600, color: NAVY }}>
                              {p.locations?.name || p.location_id.slice(0, 8)}
                            </td>
                            <td style={{ ...tdStyle, color: TEXT_SEC }}>
                              {p.organizations?.name || '\u2014'}
                            </td>
                            <td style={tdStyle}>
                              <span style={{
                                display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                                background: badge.bg, color: badge.text, fontSize: 11, fontWeight: 700,
                                textTransform: 'uppercase',
                              }}>
                                {p.risk_level}
                              </span>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ position: 'relative', width: 60, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{
                                    position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3,
                                    width: `${pct}%`,
                                    background: pct >= 70 ? '#DC2626' : pct >= 50 ? '#C2410C' : pct >= 25 ? '#D97706' : '#16A34A',
                                  }} />
                                </div>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: NAVY, fontSize: 12 }}>
                                  {pct}%
                                </span>
                              </div>
                            </td>
                            <td style={tdStyle}>
                              <span style={{
                                color: p.score_trajectory === 'improving' ? '#16A34A'
                                  : p.score_trajectory === 'declining' ? '#DC2626' : '#6B7280',
                                fontWeight: 600,
                              }}>
                                {p.score_trajectory === 'improving' ? '\u2191' : p.score_trajectory === 'declining' ? '\u2193' : '\u2192'}{' '}
                                {p.score_trajectory}
                              </span>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {(p.top_risk_pillars || []).map((code, i) => {
                                  const pb = PILLAR_BADGE[code];
                                  return pb ? (
                                    <span key={i} style={{
                                      display: 'inline-block', padding: '1px 6px', borderRadius: 4,
                                      background: pb.bg, color: pb.text, fontSize: 10, fontWeight: 700,
                                    }}>
                                      {pb.label}
                                    </span>
                                  ) : (
                                    <span key={i} style={{ fontSize: 10, color: TEXT_MUTED }}>{code}</span>
                                  );
                                })}
                                {(!p.top_risk_pillars || p.top_risk_pillars.length === 0) && (
                                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>{'\u2014'}</span>
                                )}
                              </div>
                            </td>
                            <td style={tdStyle}>
                              <span style={{ color: URGENCY_TEXT[p.service_urgency || 'none'] || '#9CA3AF', fontWeight: 600, fontSize: 12 }}>
                                {p.service_urgency || 'none'}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, fontSize: 11, color: TEXT_MUTED, fontFamily: "'DM Mono', monospace" }}>
                              {relativeTime(p.predicted_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 3: Prediction Accuracy Log */}
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Prediction Accuracy Log</h3>
              <p style={{ fontSize: 11, color: TEXT_SEC, marginBottom: 12, lineHeight: 1.6 }}>
                Accuracy tracking begins when actual inspection results are received. Rows with no outcome represent predictions awaiting validation.
              </p>
              {predLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={32} />)}
                </div>
              ) : accuracyLog.length === 0 ? (
                <EmptyState
                  icon={'\uD83C\uDFAF'}
                  title="No accuracy data yet"
                  subtitle="Records appear here after actual inspection outcomes are recorded against prior predictions."
                />
              ) : (
                <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 800 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        {['Location', 'Predicted Risk', 'Actual Outcome', 'Correct', 'Prob. Error', 'Model', 'Logged At'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {accuracyLog.map(row => {
                        const rBadge = RISK_BADGE[row.predicted_risk_level || 'unknown'] || RISK_BADGE.unknown;
                        return (
                          <tr key={row.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ ...tdStyle, fontWeight: 500, color: NAVY }}>
                              {row.locations?.name || row.location_id.slice(0, 8)}
                            </td>
                            <td style={tdStyle}>
                              {row.predicted_risk_level ? (
                                <span style={{
                                  display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                                  background: rBadge.bg, color: rBadge.text, fontSize: 11, fontWeight: 700,
                                  textTransform: 'uppercase',
                                }}>
                                  {row.predicted_risk_level}
                                </span>
                              ) : <span style={{ color: TEXT_MUTED }}>{'\u2014'}</span>}
                            </td>
                            <td style={tdStyle}>
                              {row.actual_outcome ? (
                                <span style={{
                                  fontWeight: 600,
                                  color: row.actual_outcome === 'pass' ? '#16A34A' : row.actual_outcome === 'fail' ? '#DC2626' : '#D97706',
                                }}>
                                  {row.actual_outcome}
                                </span>
                              ) : <span style={{ color: TEXT_MUTED }}>{'\u2014'}</span>}
                            </td>
                            <td style={tdStyle}>
                              {row.prediction_correct === true ? (
                                <span style={{ color: '#16A34A', fontWeight: 700 }}>{'\u2713'}</span>
                              ) : row.prediction_correct === false ? (
                                <span style={{ color: '#DC2626', fontWeight: 700 }}>{'\u2717'}</span>
                              ) : (
                                <span style={{ color: TEXT_MUTED }}>{'\u2014'}</span>
                              )}
                            </td>
                            <td style={{ ...tdStyle, fontFamily: "'DM Mono', monospace", color: TEXT_SEC }}>
                              {row.probability_error != null ? `${Math.round(row.probability_error * 100)}%` : '\u2014'}
                            </td>
                            <td style={{ ...tdStyle, fontSize: 11, color: TEXT_MUTED }}>{row.model_version}</td>
                            <td style={{ ...tdStyle, fontSize: 11, color: TEXT_MUTED, fontFamily: "'DM Mono', monospace" }}>
                              {relativeTime(row.logged_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 4: Model Upgrade Roadmap */}
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 12 }}>Model Upgrade Roadmap</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {/* Phase 1 — Active */}
                <div style={{
                  background: '#fff', borderRadius: 12, padding: '20px 22px',
                  border: '2px solid #16A34A',
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: '#16A34A', marginBottom: 8,
                  }}>
                    Phase 1 {'\u00B7'} Active
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Rules-Based Scoring</div>
                  <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6 }}>
                    Deterministic rules using checklist rate, temp log compliance, hood cleaning recency, and open corrective actions. Model version: rules-v1.
                  </div>
                </div>
                {/* Phase 2 — Upcoming */}
                <div style={{
                  background: '#fff', borderRadius: 12, padding: '20px 22px',
                  border: `1px solid ${BORDER}`,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: TEXT_MUTED, marginBottom: 8,
                  }}>
                    Phase 2 {'\u00B7'} 10{'\u2013'}25 Customers
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 8 }}>MindsDB ML Forecasting</div>
                  <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6 }}>
                    LightGBM model trained on customer compliance data via MindsDB connected to Supabase Postgres. Replaces rules with probability forecasting.
                  </div>
                </div>
                {/* Phase 3 — Future */}
                <div style={{
                  background: '#fff', borderRadius: 12, padding: '20px 22px',
                  border: `1px solid ${BORDER}`,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: TEXT_MUTED, marginBottom: 8,
                  }}>
                    Phase 3 {'\u00B7'} 50+ Customers
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Custom Python Microservice</div>
                  <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6 }}>
                    XGBoost classifier + Facebook Prophet time-series deployed as Edge Function. Full model training on real California compliance + inspection data.
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ────────── PUBLISH ADVISORY MODAL (4-Dimension Risk Form) ────────── */}
      {publishModal.open && (() => {
        const riskSelectStyle: React.CSSProperties = { ...inputStyle, width: '100%', cursor: 'pointer', fontSize: 11 };
        const noteInputStyle: React.CSSProperties = { ...inputStyle, width: '100%', fontSize: 11 };
        const DIMS = [
          { key: 'revenueRisk' as const, noteKey: 'revenueNote' as const, icon: '💰', label: 'Revenue Risk', desc: 'Threat to score, grade, permit, revenue' },
          { key: 'liabilityRisk' as const, noteKey: 'liabilityNote' as const, icon: '⚖️', label: 'Liability Risk', desc: 'Legal/regulatory exposure, fines' },
          { key: 'costRisk' as const, noteKey: 'costNote' as const, icon: '💸', label: 'Cost Risk', desc: 'Equipment, training, remediation spend' },
          { key: 'operationalRisk' as const, noteKey: 'operationalNote' as const, icon: '⚙️', label: 'Operational Risk', desc: 'Process/procedure changes required' },
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
                      { key: 'oppRevenue' as const, noteKey: 'oppRevenueNote' as const, icon: '⬆', label: 'Revenue Opp', desc: 'Score improvement, competitive advantage' },
                      { key: 'oppLiability' as const, noteKey: 'oppLiabilityNote' as const, icon: '🛡', label: 'Liability Opp', desc: 'Legal safe harbor, compliance edge' },
                      { key: 'oppCost' as const, noteKey: 'oppCostNote' as const, icon: '💵', label: 'Cost Opp', desc: 'Insurance discount, grant eligibility' },
                      { key: 'oppOperational' as const, noteKey: 'oppOperationalNote' as const, icon: '🚀', label: 'Operational Opp', desc: 'Efficiency gain, digital workflow' },
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
