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
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { useDemo } from '../../contexts/DemoContext';

// Color constants removed — now using Tailwind equivalents:
// NAVY=#1E2D4D → text-navy/bg-navy, GOLD=#A08C5A → text-gold/bg-gold
// TEXT_SEC=#6B7F96 → text-[#6B7F96], TEXT_MUTED=#9CA3AF → text-gray-400
// BORDER=#E5E0D8 → border-[#E5E0D8]

type Tab = 'overview' | 'signals' | 'sources' | 'correlations' | 'jurisdiction_updates' | 'regulatory_updates' | 'predictions';

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
  <div className="bg-gray-200 rounded-md animate-pulse" style={{ width: w, height: h }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="text-center py-12 px-5 bg-[#FAFAF8] border-[1.5px] border-dashed border-[#E5E0D8] rounded-[10px]">
    <div className="text-4xl mb-3">{icon}</div>
    <div className="text-sm font-bold text-navy mb-1.5">{title}</div>
    <div className="text-xs text-[#6B7F96] max-w-[400px] mx-auto leading-relaxed">{subtitle}</div>
  </div>
);

// Admin reference architecture — displays when no live correlations. Real data takes precedence in future state.
const SAMPLE_CORRELATIONS = [
  {
    id: 'corr-001',
    pillar: 'Revenue',
    pillarColor: '#C2410C',
    title: 'Repeat Violation → Revenue Loss',
    description: 'Locations with 2+ repeat critical violations in 12 months show an average 18% revenue decline within 6 months of public posting.',
    signalCount: 14,
    impactRange: '$45,000 – $180,000',
    confidence: 87,
    sources: ['Health Dept Public Records', 'Yelp Signal Feed', 'CDPH Violation Index'],
    status: 'active' as const,
  },
  {
    id: 'corr-002',
    pillar: 'Revenue',
    pillarColor: '#C2410C',
    title: 'Grade Downgrade → Foot Traffic Drop',
    description: 'Letter grade downgrades (A→B or B→C) correlate with a 12–22% foot traffic reduction within 30 days based on mobile location data.',
    signalCount: 9,
    impactRange: '$28,000 – $95,000',
    confidence: 79,
    sources: ['LA County Grade Data', 'Mobile Analytics Signal'],
    status: 'active' as const,
  },
  {
    id: 'corr-003',
    pillar: 'Liability',
    pillarColor: '#991B1B',
    title: 'Open Violation at Reinspection → Closure Risk',
    description: 'Locations entering reinspection with 3+ open critical violations have a 43% probability of temporary closure order.',
    signalCount: 22,
    impactRange: '$85,000 – $400,000',
    confidence: 91,
    sources: ['CDPH Reinspection Records', 'Mariposa County EHD', 'Stanislaus County EHD'],
    status: 'active' as const,
  },
  {
    id: 'corr-004',
    pillar: 'Liability',
    pillarColor: '#991B1B',
    title: 'Hood Cleaning Overdue → Insurance Claim Trigger',
    description: 'NFPA 96-2024 Table 12.4 overdue intervals (>30 days past schedule) correlate with 2.8× higher fire suppression claim frequency.',
    signalCount: 17,
    impactRange: '$120,000 – $650,000',
    confidence: 84,
    sources: ['IKECA Service Records', 'OSFM Fire Reports', 'Insurance Carrier Claims Data'],
    status: 'active' as const,
  },
  {
    id: 'corr-005',
    pillar: 'Cost',
    pillarColor: '#1E2D4D',
    title: 'Vendor COI Lapse → Emergency Service Premium',
    description: 'Locations using vendors with expired COI are 3.1× more likely to incur emergency service charges averaging $4,200 per incident.',
    signalCount: 11,
    impactRange: '$12,000 – $68,000',
    confidence: 76,
    sources: ['Vendor Document Records', 'Service Invoice Data'],
    status: 'active' as const,
  },
  {
    id: 'corr-006',
    pillar: 'Cost',
    pillarColor: '#1E2D4D',
    title: 'Temperature Log Gap → Food Loss Exposure',
    description: 'Missing temperature logs for 3+ consecutive days correlate with $1,800 avg food inventory loss and $3,200 corrective action costs.',
    signalCount: 8,
    impactRange: '$5,000 – $42,000',
    confidence: 72,
    sources: ['Temperature Sensor Data', 'EvidLY Checklist Records'],
    status: 'active' as const,
  },
  {
    id: 'corr-007',
    pillar: 'Operational',
    pillarColor: '#166534',
    title: 'CFPM Cert Expiry → Inspection Score Decline',
    description: 'Locations where the CFPM certification lapses show a 14-point average inspection score decline within 90 days.',
    signalCount: 19,
    impactRange: '$22,000 – $110,000',
    confidence: 88,
    sources: ['CA Environmental Health Data', 'Training Records Module'],
    status: 'active' as const,
  },
  {
    id: 'corr-008',
    pillar: 'Operational',
    pillarColor: '#166534',
    title: 'Self-Inspection Gap → Failed Surprise Inspection',
    description: 'Locations missing self-inspection checklists for 2+ weeks are 2.4× more likely to fail unannounced health inspections.',
    signalCount: 13,
    impactRange: '$18,000 – $75,000',
    confidence: 81,
    sources: ['EvidLY Self-Inspection Logs', 'County Inspection Records'],
    status: 'active' as const,
  },
  {
    id: 'corr-009',
    pillar: 'Workforce',
    pillarColor: '#6B21A8',
    title: 'High Turnover → Training Gap → Violation Cluster',
    description: 'Locations with >60% annual staff turnover show a 3.7× violation cluster rate within 120 days of turnover spike.',
    signalCount: 16,
    impactRange: '$35,000 – $160,000',
    confidence: 83,
    sources: ['HR Turnover Signal', 'Training Completion Records', 'County Inspection Data'],
    status: 'active' as const,
  },
  {
    id: 'corr-010',
    pillar: 'Workforce',
    pillarColor: '#6B21A8',
    title: 'Food Handler Cert Gap → Critical Violation',
    description: 'Locations where >25% of food handlers have lapsed certifications show a 2.1× rate of critical food safety violations on next inspection.',
    signalCount: 12,
    impactRange: '$14,000 – $85,000',
    confidence: 78,
    sources: ['Training Records Module', 'CDPH Inspection Index'],
    status: 'active' as const,
  },
];

const CORR_PILLARS = ['Revenue', 'Liability', 'Cost', 'Operational', 'Workforce'];
const CORR_PILLAR_COLORS: Record<string, string> = {
  Revenue: '#C2410C',
  Liability: '#991B1B',
  Cost: '#1E2D4D',
  Operational: '#166534',
  Workforce: '#6B21A8',
};
const REPORT_FORMATS = ['Executive Summary', 'Formal Document', 'PDF/Print Ready', 'Risk Register'];

export default function EvidLYIntelligence() {
  useDemoGuard();
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
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
  const [jurSearch, setJurSearch] = useState('');
  const [jurFilter, setJurFilter] = useState<'' | 'active' | 'quiet' | 'methodology'>('');
  const [jurSort, setJurSort] = useState<'signals' | 'name' | 'recent'>('signals');
  const [expandedRegVerification, setExpandedRegVerification] = useState<string | null>(null);
  const [corrPillarFilter, setCorrPillarFilter] = useState<string>('All');
  const [corrReportFormat, setCorrReportFormat] = useState<string>('Executive Summary');
  const [corrExpanded, setCorrExpanded] = useState<string | null>(null);

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

  const inputCls = 'py-1.5 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs';
  const thCls = 'text-left py-2.5 px-3.5 text-[#6B7F96] font-semibold text-[11px] uppercase';
  const tdCls = 'py-2.5 px-3.5 text-xs';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-[26px] font-black font-[Syne,sans-serif] text-navy">
              EvidLY Intelligence
            </span>
            <span className="text-[10px] font-black py-[3px] px-2.5 rounded-[10px] bg-gradient-to-br from-gold to-gold-light text-white tracking-[1px]">
              ⚡ MOAT
            </span>
          </div>
          <div className="text-[13px] text-gray-400">
            {totalSources} sources crawled · Every signal correlated to clients, jurisdictions, and industries
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {crawlFeedback && (
            <span className={`text-[11px] font-semibold ${crawlFeedback.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {crawlFeedback.msg}
            </span>
          )}
          <button onClick={runIntelligence} disabled={crawlRunning}
            className={`py-2 px-4 border-none rounded-lg text-white text-xs font-bold ${crawlRunning ? 'bg-gray-400 cursor-wait opacity-70' : 'bg-navy cursor-pointer'}`}>
            {crawlRunning ? '⟳ Crawling...' : '⟳ Run Now'}
          </button>
          <button onClick={() => setActiveTab('sources')}
            className="py-2 px-4 bg-white border border-[#E5E0D8] rounded-lg text-navy text-xs font-semibold cursor-pointer">
            Manage Sources
          </button>
        </div>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-6 gap-3 items-stretch">
        {[
          { label: 'Total Signals', value: signals.length, color: 'text-navy' },
          { label: 'Pending Review', value: pendingReview, color: 'text-[#C2410C]' },
          { label: 'Critical', value: criticalSignals, color: 'text-[#991B1B]' },
          { label: 'Published', value: signals.filter(s => !!s.published_at).length, color: signals.filter(s => !!s.published_at).length > 0 ? 'text-[#166534]' : 'text-[#991B1B]' },
          { label: 'Sources', value: totalSources, color: 'text-navy' },
          { label: 'Correlations', value: correlations.length, color: 'text-[#166534]' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-lg py-4 px-5 text-center flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
              {k.label}
            </div>
            <div className={`text-[28px] font-extrabold leading-none ${k.color}`}>
              {loading ? '—' : k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-[#E5E0D8] overflow-x-auto scrollbar-none">
        {([
          { key: 'overview' as Tab, label: 'Overview', count: null },
          { key: 'signals' as Tab, label: 'Signals', count: signals.length },
          { key: 'sources' as Tab, label: 'Sources', count: totalSources },
          { key: 'correlations' as Tab, label: 'Correlations', count: correlations.length },
          { key: 'jurisdiction_updates' as Tab, label: 'Jurisdictions', count: allJurisdictions.length || 62 },
          { key: 'regulatory_updates' as Tab, label: 'Regulatory', count: regulatoryChanges.length },
          { key: 'predictions' as Tab, label: 'Predictions', count: null },
        ]).map(t => {
          const isActive = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`py-2.5 px-4 text-[13px] cursor-pointer bg-transparent border-none -mb-[2px] transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${isActive ? 'text-gold font-semibold border-b-2 border-gold' : 'text-gray-400 font-normal border-b-2 border-transparent'}`}>
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className={`text-[10px] font-bold py-[1px] px-1.5 rounded-[10px] font-mono ${isActive ? 'bg-[#F5F0E8] text-navy' : 'bg-gray-100 text-gray-500'}`}>
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
        <div className="grid grid-cols-5 gap-3 items-stretch mb-5">
          {([
            { label: 'Total Sources', value: totalSources, color: 'text-navy' },
            { label: 'Active Sources', value: activeSources, color: 'text-[#166534]' },
            { label: 'Broken Sources', value: brokenSources, color: brokenSources > 0 ? 'text-[#991B1B]' : 'text-navy' },
            { label: 'Total Signals', value: totalSignals, color: 'text-navy' },
            { label: 'Pending Signals', value: pendingSignals, color: 'text-[#C2410C]' },
            { label: 'Published Signals', value: publishedSignals, color: publishedSignals > 0 ? 'text-[#166534]' : 'text-[#991B1B]' },
            { label: 'Critical Signals', value: criticalSignals, color: criticalSignals > 0 ? 'text-[#991B1B]' : 'text-navy' },
            { label: 'Correlations', value: totalCorrelations, color: 'text-[#166534]' },
            { label: 'Regulatory', value: regulatoryCount, color: 'text-navy' },
            { label: 'RFP Listings', value: rfpCount, color: 'text-navy' },
          ] as const).map(card => (
            <div key={card.label} className="bg-white border border-gray-200 rounded-lg py-4 px-5 text-center flex flex-col items-center justify-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                {card.label}
              </div>
              <div className={`text-[28px] font-extrabold leading-none ${card.color}`}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        {pendingSignals > 0 && (
          <div className="py-2.5 px-4 mb-5 rounded-lg bg-amber-50 border border-amber-400 text-[13px] font-medium text-amber-800">
            {pendingSignals} signal{pendingSignals !== 1 ? 's' : ''} pending review — users see empty Business Intelligence.
          </div>
        )}

        <div className="grid grid-cols-2 gap-5">
          {/* Source health by category */}
          <div className="bg-white border border-[#E5E0D8] rounded-[10px] p-5">
            <div className="text-[13px] font-bold text-navy mb-4">Source Health by Category</div>
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={28} />)}
              </div>
            ) : Object.entries(CATEGORY_META).map(([key, meta]) => {
              const catSources = sources.filter(s => s.category === key);
              if (catSources.length === 0) return null;
              const live = catSources.filter(s => s.status === 'live').length;
              const broken = catSources.filter(s => ['waf_blocked', 'timeout', 'error', 'degraded'].includes(s.status)).length;
              return (
                <div key={key} className="flex items-center justify-between py-2 border-b border-[#F0EDE8]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{meta.icon}</span>
                    <span className="text-xs text-[#4A5568]">{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={`font-semibold ${live > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{live} live</span>
                    {broken > 0 && <span className="text-red-600 font-semibold">⚠ {broken} broken</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent signals */}
          <div className="bg-white border border-[#E5E0D8] rounded-[10px] p-5">
            <div className="text-[13px] font-bold text-navy mb-4">
              Recent Signals
              {criticalSignals > 0 && (
                <span className="ml-2 text-[10px] bg-red-50 text-red-600 py-[2px] px-[7px] rounded-[10px] font-bold">
                  {criticalSignals} CRITICAL
                </span>
              )}
            </div>
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={36} />)}
              </div>
            ) : signals.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                No signals yet — run intelligence crawler to populate
              </div>
            ) : signals.slice(0, 8).map(sig => {
              const uc = URGENCY_COLORS[sig.ai_urgency || ''] || URGENCY_COLORS.low;
              return (
                <div key={sig.id} className="py-[9px] border-b border-[#F0EDE8] flex items-start gap-2.5">
                  <span className="text-[9px] font-extrabold py-[2px] px-[7px] rounded-[10px] whitespace-nowrap mt-0.5"
                    style={{ background: uc.bg, color: uc.text }}>
                    {(sig.ai_urgency || 'new').toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-navy font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                      {sig.title}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {sig.signal_type?.replace(/_/g, ' ')} · {sig.source_key} · {new Date(sig.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
        </>
      )}

      {/* ────────── TAB: SIGNALS ────────── */}
      {activeTab === 'signals' && (
        <>
          {/* Filter bar */}
          <div className="flex gap-2.5 flex-wrap">
            <input placeholder="Search signals..." value={sigFilter.search}
              onChange={e => setSigFilter(f => ({ ...f, search: e.target.value }))}
              className={`${inputCls} flex-1 min-w-[200px]`} />
            <select value={sigFilter.urgency} onChange={e => setSigFilter(f => ({ ...f, urgency: e.target.value }))}
              className={`${inputCls} cursor-pointer`}>
              <option value="">All Urgency</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="informational">Informational</option>
            </select>
            <select value={sigFilter.type} onChange={e => setSigFilter(f => ({ ...f, type: e.target.value }))}
              className={`${inputCls} cursor-pointer`}>
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
              className={`${inputCls} cursor-pointer`}>
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="analyzing">Analyzing</option>
              <option value="analyzed">Analyzed</option>
              <option value="reviewed">Reviewed</option>
              <option value="published">Published</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <select value={sigFilter.tier} onChange={e => setSigFilter(f => ({ ...f, tier: e.target.value }))}
              className={`${inputCls} cursor-pointer`}>
              <option value="">All Tiers</option>
              <option value="auto">Auto-Publish</option>
              <option value="notify">Notify Admin</option>
              <option value="hold">Manual Review</option>
            </select>
          </div>

          {/* CIC Pillar filter pills */}
          <div className="flex gap-1.5 items-center mt-2">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Pillar:</span>
            <button onClick={() => setSigFilter(f => ({ ...f, pillar: '' }))}
              className={`py-[3px] px-2.5 rounded-[14px] text-[10px] font-semibold cursor-pointer border ${!sigFilter.pillar ? 'bg-gold text-white border-gold' : 'bg-white text-gray-400 border-[#E5E0D8]'}`}>
              All Pillars
            </button>
            {CIC_PILLARS.map(p => (
              <button key={p.id} onClick={() => setSigFilter(f => ({ ...f, pillar: p.id }))}
                className="py-[3px] px-2.5 rounded-[14px] text-[10px] font-semibold cursor-pointer border"
                style={{
                  background: sigFilter.pillar === p.id ? p.color : '#fff',
                  color: sigFilter.pillar === p.id ? '#fff' : '#9CA3AF',
                  borderColor: sigFilter.pillar === p.id ? p.color : '#E5E0D8',
                }}>
                {p.shortLabel}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col gap-2.5">
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
              <div key={sig.id} className={`bg-white border rounded-[10px] py-4 px-[18px] mb-2.5 ${sig.ai_urgency === 'critical' ? 'border-red-200' : 'border-[#E5E0D8]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {sig.ai_urgency && (
                        <span className="text-[9px] font-extrabold py-[2px] px-2 rounded-[10px]"
                          style={{ background: uc.bg, color: uc.text }}>
                          {sig.ai_urgency.toUpperCase()}
                        </span>
                      )}
                      {sig.routing_tier && (() => {
                        const rc = routingTierColor(sig.routing_tier);
                        return (
                          <span className="text-[9px] font-bold py-[2px] px-[7px] rounded-[10px]"
                            style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.text}30` }}
                            title={sig.routing_reason || ''}>
                            {routingTierLabel(sig.routing_tier)}
                            {sig.auto_published && ' (auto)'}
                          </span>
                        );
                      })()}
                      {/* PSE badge */}
                      {isPseSignalType(sig.signal_type) && (
                        <span className="text-[9px] font-bold py-[2px] px-2 rounded-[10px] bg-amber-50 text-amber-600 border border-amber-200">
                          PSE-Relevant
                        </span>
                      )}
                      {/* CIC Pillar badge */}
                      {(() => {
                        const pillar = sig.cic_pillar ? CIC_PILLARS.find(p => p.id === sig.cic_pillar) : getPillarForSignalType(sig.signal_type);
                        if (!pillar) return null;
                        return (
                          <span className="text-[9px] font-bold py-[2px] px-2 rounded-[10px]"
                            style={{ background: pillar.bgColor, color: pillar.color }}>
                            {pillar.shortLabel}
                          </span>
                        );
                      })()}
                      <span className="text-[10px] text-[#6B7F96] bg-gray-50 border border-[#E5E0D8] py-[1px] px-[7px] rounded-[10px]">
                        {sig.signal_type?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-gold">{sig.source_key}</span>
                      {sig.scope && <span className="text-[10px] text-gray-400">{sig.scope}</span>}
                      {sig.signal_scope && (
                        <span className="text-[9px] font-bold py-[2px] px-[7px] rounded-lg bg-navy text-white">
                          {SCOPE_LABELS[sig.signal_scope] || sig.signal_scope}
                        </span>
                      )}
                      {sig.target_industries && !sig.target_all_industries && sig.target_industries.length > 0 && (
                        sig.target_industries.slice(0, 2).map(ind => (
                          <span key={ind} className="text-[9px] font-semibold py-[1px] px-1.5 rounded-lg border border-gold text-gold">
                            {INDUSTRY_LABELS[ind] || ind}
                          </span>
                        ))
                      )}
                      {sig.target_counties && sig.target_counties.length > 0 && (
                        <span className="text-[9px] text-[#6B7F96]">{sig.target_counties.length} {sig.target_counties.length === 1 ? 'county' : 'counties'}</span>
                      )}
                    </div>
                    <div className="text-[13px] font-semibold text-navy mb-1.5">{sig.title}</div>
                    {sig.ai_summary && (
                      <div className="text-xs text-[#6B7F96] leading-relaxed mb-2">{sig.ai_summary}</div>
                    )}
                    {sig.ai_client_impact && (
                      <div className="text-[11px] text-blue-700 bg-blue-50 py-1.5 px-2.5 rounded-md mb-1.5">
                        <strong>Client impact:</strong> {sig.ai_client_impact}
                      </div>
                    )}
                    {sig.ai_platform_impact && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 py-1.5 px-2.5 rounded-md">
                        <strong>Platform impact:</strong> {sig.ai_platform_impact}
                      </div>
                    )}
                    {/* Risk Dimensions */}
                    {(sig.risk_revenue && sig.risk_revenue !== 'none') || (sig.risk_liability && sig.risk_liability !== 'none') ||
                     (sig.risk_cost && sig.risk_cost !== 'none') || (sig.risk_operational && sig.risk_operational !== 'none') ? (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {([
                          { key: 'Revenue', dim: 'revenue' as const, val: sig.risk_revenue },
                          { key: 'Liability', dim: 'liability' as const, val: sig.risk_liability },
                          { key: 'Cost', dim: 'cost' as const, val: sig.risk_cost },
                          { key: 'Operational', dim: 'operational' as const, val: sig.risk_operational },
                        ] as const).filter(d => d.val && d.val !== 'none').map(d => {
                          const rc = RISK_DIM_COLORS[d.val!] || RISK_DIM_COLORS.low;
                          return (
                            <RiskLevelTooltip key={d.key} dimension={d.dim} level={d.val}>
                              <span className="text-[9px] font-bold py-[2px] px-[7px] rounded-lg"
                                style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.text}20` }}>
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
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {[
                          { key: 'Revenue', val: sig.opp_revenue },
                          { key: 'Liability', val: sig.opp_liability },
                          { key: 'Cost', val: sig.opp_cost },
                          { key: 'Operational', val: sig.opp_operational },
                        ].filter(d => d.val && d.val !== 'none').map(d => (
                          <span key={d.key} className="text-[9px] font-bold py-[2px] px-[7px] rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300">
                            {d.key}: {(d.val || '').toUpperCase().slice(0, 4)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-[100px]">
                    <select value={sig.status}
                      onChange={e => updateSignalStatus(sig.id, e.target.value)}
                      className={`${inputCls} text-[11px] cursor-pointer`}>
                      <option value="new">New</option>
                      <option value="analyzing">Analyzing</option>
                      <option value="analyzed">Analyzed</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="published">Publish</option>
                      <option value="dismissed">Dismiss</option>
                    </select>
                    <button onClick={() => openPublishModal(sig)}
                      className="text-[10px] font-bold py-1 px-2.5 rounded-md cursor-pointer bg-gold text-white border-none w-full">
                      Publish Advisory
                    </button>
                    {sig.ai_impact_score != null && (
                      <div className="text-center text-[10px] text-gray-400">
                        Impact: <strong className={sig.ai_impact_score > 75 ? 'text-red-600' : sig.ai_impact_score > 50 ? 'text-amber-600' : 'text-emerald-600'}>{sig.ai_impact_score}/100</strong>
                      </div>
                    )}
                    {sig.severity_score != null && (
                      <div className="text-center text-[10px] text-gray-400">
                        Severity: <strong>{sig.severity_score}</strong> · Conf: <strong>{sig.confidence_score ?? 0}%</strong>
                      </div>
                    )}
                    {sig.auto_publish_at && sig.status !== 'published' && (
                      <div className="text-center text-[9px] text-amber-600 mt-0.5">
                        Auto-pub: {new Date(sig.auto_publish_at).toLocaleString()}
                      </div>
                    )}
                    {/* Risk dimension quick-tag */}
                    <div className="grid grid-cols-2 gap-[3px] mt-1">
                      {(['revenue','liability','cost','operational'] as const).map(dim => (
                        <select key={dim} value={(sig as any)[`risk_${dim}`] || 'none'}
                          onChange={e => updateSignalRisk(sig.id, dim, e.target.value)}
                          className="text-[9px] py-[2px] px-[3px] border border-[#E5E0D8] rounded bg-[#FAFAFA] text-[#6B7F96] cursor-pointer">
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
          <div className="flex gap-2.5 flex-wrap items-center">
            <select value={srcCatFilter} onChange={e => setSrcCatFilter(e.target.value)}
              className={`${inputCls} min-w-[180px] cursor-pointer`}>
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
            <select value={srcStatusFilter} onChange={e => setSrcStatusFilter(e.target.value)}
              className={`${inputCls} cursor-pointer`}>
              <option value="">All Statuses</option>
              <option value="live">Live</option>
              <option value="degraded">Degraded</option>
              <option value="waf_blocked">WAF Blocked</option>
              <option value="timeout">Timeout</option>
              <option value="pending">Pending</option>
              <option value="disabled">Disabled</option>
              <option value="error">Error</option>
            </select>
            <span className="text-[11px] text-gray-400 ml-auto">
              Showing {filteredSources.length} of {totalSources} sources
            </span>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E0D8] overflow-hidden">
            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={32} />)}
              </div>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5E0D8]">
                    {['Source', 'Category', 'Method', 'Frequency', 'Status', 'Last Crawled', 'Signals (30d)'].map(h => (
                      <th key={h} className={thCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSources.map(s => {
                    const sc = STATUS_COLORS[s.status] || STATUS_COLORS.pending;
                    return (
                      <tr key={s.id} className="border-b border-[#E5E0D8] hover:bg-gray-50">
                        <td className={tdCls}>
                          <div className="text-xs font-medium text-navy">{s.name}</div>
                          {s.url && (
                            <a href={s.url} target="_blank" rel="noreferrer"
                              className="text-[10px] text-gold no-underline">
                              {s.url?.replace('https://', '').substring(0, 40)}{(s.url?.length || 0) > 48 ? '...' : ''}
                            </a>
                          )}
                        </td>
                        <td className={`${tdCls} text-[11px] text-[#6B7F96]`}>{s.category?.replace(/_/g, ' ')}</td>
                        <td className={`${tdCls} text-[11px] font-['DM_Mono',monospace] text-[#6B7F96]`}>{s.crawl_method}</td>
                        <td className={`${tdCls} text-[11px] text-[#6B7F96]`}>{s.crawl_frequency}</td>
                        <td className={tdCls}>
                          <span className="text-[10px] font-bold py-[2px] px-2 rounded-[10px]"
                            style={{ background: sc.bg, color: sc.text }}>
                            {s.status}
                          </span>
                        </td>
                        <td className={`${tdCls} text-[11px] text-gray-400 font-['DM_Mono',monospace]`}>
                          {s.last_crawled_at ? new Date(s.last_crawled_at).toLocaleString() : '—'}
                        </td>
                        <td className={`${tdCls} text-xs font-['DM_Mono',monospace] ${s.signal_count_30d > 0 ? 'text-navy' : 'text-gray-400'}`}>
                          {s.signal_count_30d || 0}
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
      {activeTab === 'correlations' && (
        <div className="py-6">

          {/* Header row */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[13px] text-gray-500">
                Signals grouped by risk dimension. A signal appears in every dimension where it has an assigned risk level.
              </div>
              {correlations.length === 0 && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-md py-1 px-2.5 text-[11px] text-amber-800 font-semibold">
                  ⚠ Showing reference architecture — no live correlations yet. Assign risk levels in Signal Approval Queue to populate with real data.
                </div>
              )}
            </div>
            <div className="text-xs text-gray-400 shrink-0">
              {(isDemoMode ? SAMPLE_CORRELATIONS : []).length} correlations · {CORR_PILLARS.length} pillars
            </div>
          </div>

          {/* Pillar filter pills */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {['All', ...CORR_PILLARS].map(p => (
              <button
                key={p}
                onClick={() => setCorrPillarFilter(p)}
                className="py-[5px] px-3.5 rounded-full border text-xs cursor-pointer"
                style={{
                  borderColor: corrPillarFilter === p
                    ? (p === 'All' ? '#A08C5A' : CORR_PILLAR_COLORS[p])
                    : '#E5E7EB',
                  background: corrPillarFilter === p
                    ? (p === 'All' ? '#A08C5A' : CORR_PILLAR_COLORS[p])
                    : '#fff',
                  color: corrPillarFilter === p ? '#fff' : '#374151',
                  fontWeight: corrPillarFilter === p ? 700 : 400,
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Report Format selector */}
          <div className="bg-white border border-[#E5E0D8] rounded-lg py-4 px-5 mb-6">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">
              Export Report Format
            </div>
            <div className="flex gap-2 flex-wrap">
              {REPORT_FORMATS.map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setCorrReportFormat(fmt)}
                  className={`py-2 px-4 rounded-md border text-xs cursor-pointer ${corrReportFormat === fmt ? 'border-navy bg-navy text-white font-bold' : 'border-gray-200 bg-gray-50 text-gray-700 font-normal'}`}
                >
                  {fmt}
                </button>
              ))}
            </div>
            <div className="mt-2.5 text-[11px] text-gray-400">
              {corrReportFormat === 'Executive Summary' && 'One-page narrative summary for C-suite. Key risks, dollar exposure, and 3 priority recommendations.'}
              {corrReportFormat === 'Formal Document' && 'Full structured report with methodology, pillar analysis, and regulatory citations. Suitable for board or legal review.'}
              {corrReportFormat === 'PDF/Print Ready' && 'Print-optimized layout with EvidLY letterhead, table of contents, and signature block. Exports as PDF.'}
              {corrReportFormat === 'Risk Register' && 'Tabular format: Risk ID, Pillar, Description, Dollar Impact, Owner, Due Date, Status. Imports into risk management tools.'}
            </div>
            <button
              className="mt-3 py-2 px-5 bg-gold text-white border-none rounded-md text-xs font-bold cursor-pointer"
              onClick={() => alert(`Export as ${corrReportFormat} — wire to export function when ready`)}
            >
              Export {corrReportFormat}
            </button>
          </div>

          {/* Empty state for production (no sample data) */}
          {!isDemoMode && correlations.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-[10px] py-8 px-6 text-center mb-5">
              <div className="text-sm font-semibold text-navy mb-1.5">No correlation data available</div>
              <div className="text-xs text-[#6B7F96] leading-relaxed">
                Correlations appear as intelligence signals are published and analyzed.
              </div>
            </div>
          )}

          {/* Correlations grouped by pillar */}
          {CORR_PILLARS.filter(p => corrPillarFilter === 'All' || corrPillarFilter === p).map(pillar => {
            const items = (isDemoMode ? SAMPLE_CORRELATIONS : []).filter(c => c.pillar === pillar);
            if (items.length === 0) return null;
            const color = CORR_PILLAR_COLORS[pillar];
            return (
              <div key={pillar} className="mb-7">
                {/* Pillar header */}
                <div className="flex items-center gap-2.5 mb-3 pb-2"
                  style={{ borderBottom: `2px solid ${color}22` }}>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[15px] font-extrabold text-navy">{pillar}</span>
                  <span className="text-xs text-gray-400">{items.length} signal{items.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Correlation cards */}
                <div className="flex flex-col gap-2.5">
                  {items.map(corr => (
                    <div
                      key={corr.id}
                      className="bg-white border border-[#E5E0D8] rounded-lg py-3.5 px-4 cursor-pointer"
                      style={{ borderLeft: `3px solid ${color}` }}
                      onClick={() => setCorrExpanded(corrExpanded === corr.id ? null : corr.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-[13px] font-bold text-navy mb-1">
                            {corr.title}
                          </div>
                          <div className="text-xs text-gray-500 leading-normal">
                            {corr.description}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[13px] font-extrabold text-gold">{corr.impactRange}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">impact range</div>
                        </div>
                      </div>

                      {corrExpanded === corr.id && (
                        <div className="mt-3.5 pt-3.5 border-t border-gray-100">
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="text-center py-2.5 px-3 bg-gray-50 rounded-md">
                              <div className="text-xl font-extrabold text-navy">{corr.signalCount}</div>
                              <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">Signals</div>
                            </div>
                            <div className="text-center py-2.5 px-3 bg-gray-50 rounded-md">
                              <div className="text-xl font-extrabold" style={{ color }}>{corr.confidence}%</div>
                              <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">Confidence</div>
                            </div>
                            <div className="text-center py-2.5 px-3 bg-gray-50 rounded-md">
                              <div className="text-[11px] font-bold text-green-800">ACTIVE</div>
                              <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">Status</div>
                            </div>
                          </div>
                          <div className="text-[11px] text-gray-500">
                            <span className="font-bold text-gray-700">Sources: </span>
                            {corr.sources.join(' · ')}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            <div className="text-xs text-[#6B7F96] leading-relaxed mb-3">
              All 62 California jurisdictions with correlated intelligence signals, risk dimensions, and methodology changes.
            </div>

            {/* KPI bar */}
            <div className="grid grid-cols-4 gap-3 items-stretch mb-4">
              {[
                { label: 'Total Jurisdictions', value: allJurisdictions.length || 62, color: 'text-navy' },
                { label: 'Active', value: activeCount, color: 'text-[#166534]' },
                { label: 'Quiet', value: quietCount, color: 'text-navy' },
                { label: 'Methodology Changes', value: methCount, color: 'text-gold' },
              ].map(k => (
                <div key={k.label} className="bg-white border border-gray-200 rounded-lg py-4 px-5 text-center flex flex-col items-center justify-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                    {k.label}
                  </div>
                  <div className={`text-[28px] font-extrabold leading-none ${k.color}`}>
                    {loading ? '—' : k.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Filter bar */}
            <div className="flex gap-2.5 mb-4 flex-wrap items-center">
              <input placeholder="Search jurisdictions..." value={jurSearch}
                onChange={e => setJurSearch(e.target.value)}
                className={`${inputCls} flex-1 min-w-[200px]`} />
              <select value={jurFilter} onChange={e => setJurFilter(e.target.value as any)}
                className={`${inputCls} cursor-pointer`}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="quiet">Quiet</option>
                <option value="methodology">Has Methodology Change</option>
              </select>
              <select value={jurSort} onChange={e => setJurSort(e.target.value as any)}
                className={`${inputCls} cursor-pointer`}>
                <option value="signals">Signal Count (desc)</option>
                <option value="name">Name (A-Z)</option>
                <option value="recent">Most Recent Signal</option>
              </select>
              <span className="text-[11px] text-gray-400">
                {filtered.length} of {jurRows.length}
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col gap-2.5">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={44} />)}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E5E0D8] overflow-hidden">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-[#E5E0D8]">
                      {['Jurisdiction', 'Region', 'Signals', 'Risk Dimensions', 'Last Signal', 'Methodology', 'Status'].map(h => (
                        <th key={h} className={thCls}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(j => (
                      <tr key={j.id} className="border-b border-[#E5E0D8] hover:bg-gray-50">
                        <td className={`${tdCls} font-medium text-navy`}>
                          {j.county}
                        </td>
                        <td className={`${tdCls} text-[11px] text-[#6B7F96]`}>{j.region}</td>
                        <td className={`${tdCls} font-['DM_Mono',monospace] font-semibold ${j.signalCount > 0 ? 'text-navy' : 'text-gray-400'}`}>
                          {j.signalCount}
                        </td>
                        <td className={tdCls}>
                          <div className="flex gap-1">
                            {j.dims.rev && <span className="w-2 h-2 rounded-full bg-[#C2410C] inline-block" title="Revenue" />}
                            {j.dims.liab && <span className="w-2 h-2 rounded-full bg-[#991B1B] inline-block" title="Liability" />}
                            {j.dims.cost && <span className="w-2 h-2 rounded-full bg-navy inline-block" title="Cost" />}
                            {j.dims.ops && <span className="w-2 h-2 rounded-full bg-[#166534] inline-block" title="Operational" />}
                            {j.dims.wkf && <span className="w-2 h-2 rounded-full bg-[#6B21A8] inline-block" title="Workforce" />}
                            {!j.dims.rev && !j.dims.liab && !j.dims.cost && !j.dims.ops && !j.dims.wkf && (
                              <span className="text-[10px] text-gray-400">{'—'}</span>
                            )}
                          </div>
                        </td>
                        <td className={`${tdCls} text-[11px] font-['DM_Mono',monospace] ${j.lastSignal ? 'text-[#6B7F96]' : 'text-gray-400'}`}>
                          {j.lastSignal ? new Date(j.lastSignal).toLocaleDateString() : 'No signals'}
                        </td>
                        <td className={tdCls}>
                          {j.methodology.length > 0 ? (
                            <span className="text-[9px] font-bold py-[2px] px-[7px] rounded-lg bg-purple-50 text-purple-800">
                              {j.methodology.length} change{j.methodology.length !== 1 ? 's' : ''}
                            </span>
                          ) : <span className="text-[10px] text-gray-400">{'—'}</span>}
                        </td>
                        <td className={tdCls}>
                          <span className={`text-[9px] font-bold py-[2px] px-2 rounded-[10px] ${j.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
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
          <div className="text-xs text-[#6B7F96] leading-relaxed mb-2">
            Regulatory code changes monitored across federal, state, county, and industry standards.
            Published changes are delivered to all affected client intelligence feeds.
          </div>

          {loading ? (
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={60} />)}
            </div>
          ) : regulatoryChanges.length === 0 ? (
            <EmptyState
              icon="📜"
              title="No regulatory changes yet"
              subtitle="Changes appear here when the AI monitoring system detects updates to FDA Food Code, NFPA standards, CalCode, or other tracked regulatory sources."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {regulatoryChanges.map(rc => {
                const impactColor = rc.impact_level === 'critical'
                  ? { bg: '#FEF2F2', text: '#DC2626' }
                  : rc.impact_level === 'moderate'
                    ? { bg: '#FFFBEB', text: '#D97706' }
                    : { bg: '#F9FAFB', text: '#6B7280' };
                return (
                  <div key={rc.id} className="bg-white border border-[#E5E0D8] rounded-[10px] py-4 px-[18px]"
                    style={{ borderLeft: `4px solid ${impactColor.text}` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {/* Badges */}
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className="text-[9px] font-bold py-[2px] px-2 rounded-[10px]"
                            style={{ background: impactColor.bg, color: impactColor.text }}>
                            {rc.impact_level.toUpperCase()}
                          </span>
                          <span className="text-[9px] font-semibold py-[2px] px-2 rounded-[10px] bg-gray-50 text-[#6B7F96] border border-[#E5E0D8]">
                            {(rc.change_type || '').replace(/_/g, ' ')}
                          </span>
                          {rc.affected_pillars && rc.affected_pillars.length > 0 && rc.affected_pillars.map(p => {
                            const pc = PILLAR_COLORS[p] || PILLAR_COLORS.both;
                            return (
                              <span key={p} className="text-[9px] font-bold py-[2px] px-2 rounded-[10px]"
                                style={{ background: pc.bg, color: pc.text }}>
                                {(p || '').replace(/_/g, ' ').toUpperCase()}
                              </span>
                            );
                          })}
                          {rc.ai_generated && (
                            <span className="text-[9px] text-gray-400">AI-generated</span>
                          )}
                        </div>
                        {/* Title + summary */}
                        <div className="text-[13px] font-semibold text-navy mb-1">{rc.title}</div>
                        <div className="text-xs text-[#6B7F96] leading-relaxed mb-1.5">{rc.summary}</div>
                        {rc.impact_description && rc.impact_description !== rc.summary && (
                          <div className="text-[11px] text-blue-700 bg-blue-50 py-1.5 px-2.5 rounded-md mb-1.5">
                            <strong>Impact:</strong> {rc.impact_description}
                          </div>
                        )}
                        {/* Meta row */}
                        <div className="flex gap-3 text-[10px] text-gray-400 flex-wrap">
                          {rc.effective_date && (
                            <span>Effective: <span className="font-['DM_Mono',monospace] font-semibold">{rc.effective_date}</span></span>
                          )}
                          {rc.affected_states && rc.affected_states.length > 0 && (
                            <span>States: {rc.affected_states.join(', ')}</span>
                          )}
                          <span>{new Date(rc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 min-w-[100px]">
                        {rc.reviewed_by ? (
                          <span className="text-[10px] text-emerald-600 font-semibold">Reviewed</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Unreviewed</span>
                        )}
                        {rc.published ? (
                          <span className="text-[10px] text-gold font-semibold">Published</span>
                        ) : (
                          <button onClick={async () => {
                            await deliverToClients('regulatory_update', rc.id, rc.title);
                            setRegulatoryChanges(prev => prev.map(r =>
                              r.id === rc.id ? { ...r, published: true, published_at: new Date().toISOString() } : r
                            ));
                          }}
                            className="text-[10px] font-bold py-1 px-2.5 rounded-md cursor-pointer bg-gold text-white border-none w-full">
                            Publish
                          </button>
                        )}
                        {rc.source_url && (
                          <a href={rc.source_url} target="_blank" rel="noreferrer"
                            className="text-[10px] text-gold no-underline text-center">
                            Source
                          </a>
                        )}
                        <button
                          onClick={() => setExpandedRegVerification(expandedRegVerification === rc.id ? null : rc.id)}
                          className="py-1 px-2.5 rounded-md text-[10px] font-semibold cursor-pointer bg-transparent text-[#6B7F96] border border-[#E5E0D8]">
                          {expandedRegVerification === rc.id ? 'Hide Gates' : 'Verify'}
                        </button>
                      </div>
                    </div>
                    {/* Verification Panel */}
                    {expandedRegVerification === rc.id && (
                      <div className="mt-3">
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
            <div className="bg-navy rounded-xl py-[18px] px-6 flex items-center gap-7 flex-wrap text-white">
              <div>
                <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wide mb-1">Model Version</div>
                <div className="text-[15px] font-extrabold text-gold">{predLastRun?.model_version || 'rules-v1'}</div>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div>
                <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wide mb-1">Method</div>
                <div className="text-[13px] font-semibold">Rules-based</div>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div>
                <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wide mb-1">Phase</div>
                <div className="text-[13px] font-semibold">Phase 1 of 3</div>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div>
                <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wide mb-1">Next Phase</div>
                <div className="text-[13px] font-semibold">MindsDB (10{'\u2013'}25 customers)</div>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div>
                <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wide mb-1">Last Run</div>
                <div className="text-[13px] font-semibold">{predLastRun ? relativeTime(predLastRun.predicted_at) : '\u2014'}</div>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div>
                <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wide mb-1">Total Predictions</div>
                <div className="text-[15px] font-extrabold font-['DM_Mono',monospace]">{predTotalCount}</div>
              </div>
            </div>

            {/* Section 2: Location Risk Score Table */}
            <div className="mt-5">
              <h3 className="text-[15px] font-bold text-navy mb-3">Location Risk Scores</h3>
              {predLoading ? (
                <div className="flex flex-col gap-2.5">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={36} />)}
                </div>
              ) : sortedPredictions.length === 0 ? (
                <EmptyState
                  icon={'\uD83D\uDD2E'}
                  title="No predictions generated yet"
                  subtitle="Trigger the generate-alerts edge function to run the first prediction. Predictions will appear here with risk scores per location."
                />
              ) : (
                <div className="bg-white rounded-xl border border-[#E5E0D8] overflow-auto">
                  <table className="w-full border-collapse text-xs min-w-[900px]">
                    <thead>
                      <tr className="border-b border-[#E5E0D8]">
                        <th className={thCls}>Location</th>
                        <th className={thCls}>Organization</th>
                        <th className={`${thCls} cursor-pointer`} onClick={() => handleSort('risk_level')}>
                          Risk Level{sortArrow('risk_level')}
                        </th>
                        <th className={`${thCls} cursor-pointer`} onClick={() => handleSort('failure_probability')}>
                          Failure Prob.{sortArrow('failure_probability')}
                        </th>
                        <th className={thCls}>Trajectory</th>
                        <th className={thCls}>Top Risk Pillars</th>
                        <th className={thCls}>Service Urgency</th>
                        <th className={`${thCls} cursor-pointer`} onClick={() => handleSort('predicted_at')}>
                          Predicted At{sortArrow('predicted_at')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPredictions.map(p => {
                        const badge = RISK_BADGE[p.risk_level] || RISK_BADGE.unknown;
                        const pct = Math.round(p.failure_probability * 100);
                        return (
                          <tr key={p.id} className="border-b border-[#E5E0D8] hover:bg-gray-50">
                            <td className={`${tdCls} font-semibold text-navy`}>
                              {p.locations?.name || p.location_id.slice(0, 8)}
                            </td>
                            <td className={`${tdCls} text-[#6B7F96]`}>
                              {p.organizations?.name || '\u2014'}
                            </td>
                            <td className={tdCls}>
                              <span className="inline-block py-[2px] px-2 rounded-md text-[11px] font-bold uppercase"
                                style={{ background: badge.bg, color: badge.text }}>
                                {p.risk_level}
                              </span>
                            </td>
                            <td className={tdCls}>
                              <div className="flex items-center gap-2">
                                <div className="relative w-[60px] h-1.5 bg-gray-200 rounded-sm overflow-hidden">
                                  <div className="absolute left-0 top-0 h-full rounded-sm"
                                    style={{
                                      width: `${pct}%`,
                                      background: pct >= 70 ? '#DC2626' : pct >= 50 ? '#C2410C' : pct >= 25 ? '#D97706' : '#16A34A',
                                    }} />
                                </div>
                                <span className="font-['DM_Mono',monospace] font-semibold text-navy text-xs">
                                  {pct}%
                                </span>
                              </div>
                            </td>
                            <td className={tdCls}>
                              <span className={`font-semibold ${p.score_trajectory === 'improving' ? 'text-green-600' : p.score_trajectory === 'declining' ? 'text-red-600' : 'text-gray-500'}`}>
                                {p.score_trajectory === 'improving' ? '\u2191' : p.score_trajectory === 'declining' ? '\u2193' : '\u2192'}{' '}
                                {p.score_trajectory}
                              </span>
                            </td>
                            <td className={tdCls}>
                              <div className="flex gap-1 flex-wrap">
                                {(p.top_risk_pillars || []).map((code, i) => {
                                  const pb = PILLAR_BADGE[code];
                                  return pb ? (
                                    <span key={i} className="inline-block py-px px-1.5 rounded text-[10px] font-bold"
                                      style={{ background: pb.bg, color: pb.text }}>
                                      {pb.label}
                                    </span>
                                  ) : (
                                    <span key={i} className="text-[10px] text-gray-400">{code}</span>
                                  );
                                })}
                                {(!p.top_risk_pillars || p.top_risk_pillars.length === 0) && (
                                  <span className="text-[11px] text-gray-400">{'\u2014'}</span>
                                )}
                              </div>
                            </td>
                            <td className={tdCls}>
                              <span className="font-semibold text-xs" style={{ color: URGENCY_TEXT[p.service_urgency || 'none'] || '#9CA3AF' }}>
                                {p.service_urgency || 'none'}
                              </span>
                            </td>
                            <td className={`${tdCls} text-[11px] text-gray-400 font-['DM_Mono',monospace]`}>
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
            <div className="mt-7">
              <h3 className="text-[15px] font-bold text-navy mb-1">Prediction Accuracy Log</h3>
              <p className="text-[11px] text-[#6B7F96] mb-3 leading-relaxed">
                Accuracy tracking begins when actual inspection results are received. Rows with no outcome represent predictions awaiting validation.
              </p>
              {predLoading ? (
                <div className="flex flex-col gap-2.5">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={32} />)}
                </div>
              ) : accuracyLog.length === 0 ? (
                <EmptyState
                  icon={'\uD83C\uDFAF'}
                  title="No accuracy data yet"
                  subtitle="Records appear here after actual inspection outcomes are recorded against prior predictions."
                />
              ) : (
                <div className="bg-white rounded-xl border border-[#E5E0D8] overflow-auto">
                  <table className="w-full border-collapse text-xs min-w-[800px]">
                    <thead>
                      <tr className="border-b border-[#E5E0D8]">
                        {['Location', 'Predicted Risk', 'Actual Outcome', 'Correct', 'Prob. Error', 'Model', 'Logged At'].map(h => (
                          <th key={h} className={thCls}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {accuracyLog.map(row => {
                        const rBadge = RISK_BADGE[row.predicted_risk_level || 'unknown'] || RISK_BADGE.unknown;
                        return (
                          <tr key={row.id} className="border-b border-[#E5E0D8] hover:bg-gray-50">
                            <td className={`${tdCls} font-medium text-navy`}>
                              {row.locations?.name || row.location_id.slice(0, 8)}
                            </td>
                            <td className={tdCls}>
                              {row.predicted_risk_level ? (
                                <span className="inline-block py-[2px] px-2 rounded-md text-[11px] font-bold uppercase"
                                  style={{ background: rBadge.bg, color: rBadge.text }}>
                                  {row.predicted_risk_level}
                                </span>
                              ) : <span className="text-gray-400">{'\u2014'}</span>}
                            </td>
                            <td className={tdCls}>
                              {row.actual_outcome ? (
                                <span className={`font-semibold ${row.actual_outcome === 'pass' ? 'text-green-600' : row.actual_outcome === 'fail' ? 'text-red-600' : 'text-amber-600'}`}>
                                  {row.actual_outcome}
                                </span>
                              ) : <span className="text-gray-400">{'\u2014'}</span>}
                            </td>
                            <td className={tdCls}>
                              {row.prediction_correct === true ? (
                                <span className="text-green-600 font-bold">{'\u2713'}</span>
                              ) : row.prediction_correct === false ? (
                                <span className="text-red-600 font-bold">{'\u2717'}</span>
                              ) : (
                                <span className="text-gray-400">{'\u2014'}</span>
                              )}
                            </td>
                            <td className={`${tdCls} font-['DM_Mono',monospace] text-[#6B7F96]`}>
                              {row.probability_error != null ? `${Math.round(row.probability_error * 100)}%` : '\u2014'}
                            </td>
                            <td className={`${tdCls} text-[11px] text-gray-400`}>{row.model_version}</td>
                            <td className={`${tdCls} text-[11px] text-gray-400 font-['DM_Mono',monospace]`}>
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
            <div className="mt-7">
              <h3 className="text-[15px] font-bold text-navy mb-3">Model Upgrade Roadmap</h3>
              <div className="grid grid-cols-3 gap-3.5">
                {/* Phase 1 — Active */}
                <div className="bg-white rounded-xl py-5 px-[22px] border-2 border-green-600">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-green-600 mb-2">
                    Phase 1 {'\u00B7'} Active
                  </div>
                  <div className="text-sm font-bold text-navy mb-2">Rules-Based Scoring</div>
                  <div className="text-xs text-[#6B7F96] leading-relaxed">
                    Deterministic rules using checklist rate, temp log compliance, hood cleaning recency, and open corrective actions. Model version: rules-v1.
                  </div>
                </div>
                {/* Phase 2 — Upcoming */}
                <div className="bg-white rounded-xl py-5 px-[22px] border border-[#E5E0D8]">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                    Phase 2 {'\u00B7'} 10{'\u2013'}25 Customers
                  </div>
                  <div className="text-sm font-bold text-navy mb-2">MindsDB ML Forecasting</div>
                  <div className="text-xs text-[#6B7F96] leading-relaxed">
                    LightGBM model trained on customer compliance data via MindsDB connected to Supabase Postgres. Replaces rules with probability forecasting.
                  </div>
                </div>
                {/* Phase 3 — Future */}
                <div className="bg-white rounded-xl py-5 px-[22px] border border-[#E5E0D8]">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                    Phase 3 {'\u00B7'} 50+ Customers
                  </div>
                  <div className="text-sm font-bold text-navy mb-2">Custom Python Microservice</div>
                  <div className="text-xs text-[#6B7F96] leading-relaxed">
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
        const riskSelectCls = `${inputCls} w-full cursor-pointer text-[11px]`;
        const noteInputCls = `${inputCls} w-full text-[11px]`;
        const DIMS = [
          { key: 'revenueRisk' as const, noteKey: 'revenueNote' as const, icon: '💰', label: 'Revenue Risk', desc: 'Threat to score, grade, permit, revenue' },
          { key: 'liabilityRisk' as const, noteKey: 'liabilityNote' as const, icon: '⚖️', label: 'Liability Risk', desc: 'Legal/regulatory exposure, fines' },
          { key: 'costRisk' as const, noteKey: 'costNote' as const, icon: '💸', label: 'Cost Risk', desc: 'Equipment, training, remediation spend' },
          { key: 'operationalRisk' as const, noteKey: 'operationalNote' as const, icon: '⚙️', label: 'Operational Risk', desc: 'Process/procedure changes required' },
        ];
        return (
          <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center overflow-auto p-5"
            onClick={() => setPublishModal({ open: false, signal: null })}
          >
            <div
              className="bg-white rounded-[14px] p-7 w-full max-w-[600px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-h-[90vh] overflow-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-base font-extrabold text-navy mb-1">Publish Intelligence Signal</div>
              <div className="text-xs text-gray-400 mb-4">
                Tag risk dimensions and publish to affected client intelligence feeds.
              </div>

              {/* Signal info */}
              <div className="bg-gray-50 rounded-lg py-2.5 px-3.5 mb-4 border border-[#E5E0D8]">
                <div className="text-xs font-semibold text-navy">{publishModal.signal?.title}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Source: {publishModal.signal?.source_key} · {publishModal.signal?.signal_type?.replace(/_/g, ' ')}
                  {publishModal.signal?.affected_jurisdictions?.length ? ` · Counties: ${publishModal.signal.affected_jurisdictions.join(', ')}` : ''}
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                {/* Title + Summary */}
                <div>
                  <label className="text-[11px] font-semibold text-[#6B7F96] block mb-1">Title (shown to clients)</label>
                  <input value={pubForm.title} onChange={e => setPubForm(f => ({ ...f, title: e.target.value }))}
                    className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#6B7F96] block mb-1">Summary</label>
                  <textarea value={pubForm.summary} onChange={e => setPubForm(f => ({ ...f, summary: e.target.value }))}
                    rows={3} className={`${inputCls} w-full resize-y`} />
                </div>

                {/* Risk Dimension Tagging — 4 rows */}
                <div className="border-t border-[#E5E0D8] pt-3.5">
                  <div className="text-xs font-bold text-navy mb-2.5">Risk Dimension Tagging</div>
                  <div className="flex flex-col gap-2.5">
                    {DIMS.map(dim => (
                      <div key={dim.key} className="grid grid-cols-[140px_100px_1fr] gap-2 items-center">
                        <div>
                          <span className="text-xs">{dim.icon}</span>
                          <span className="text-[11px] font-semibold text-navy ml-1">{dim.label}</span>
                        </div>
                        <select value={pubForm[dim.key]} onChange={e => setPubForm(f => ({ ...f, [dim.key]: e.target.value }))}
                          className={riskSelectCls}>
                          <option value="none">None</option>
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="moderate">Moderate</option>
                          <option value="low">Low</option>
                        </select>
                        <input value={pubForm[dim.noteKey]} onChange={e => setPubForm(f => ({ ...f, [dim.noteKey]: e.target.value }))}
                          placeholder={dim.desc} className={noteInputCls} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Targeting Section */}
                <div className="border-t border-[#E5E0D8] pt-3.5">
                  <div className="text-xs font-bold text-navy mb-2.5">Signal Targeting</div>
                  <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-[#6B7F96] block mb-1">Scope</label>
                        <select value={pubForm.signalScope} onChange={e => setPubForm(f => ({ ...f, signalScope: e.target.value }))}
                          className={`${inputCls} w-full cursor-pointer`}>
                          {Object.entries(SCOPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#6B7F96] block mb-1">Counties (comma-separated)</label>
                        <input value={pubForm.targetCounties} onChange={e => setPubForm(f => ({ ...f, targetCounties: e.target.value }))}
                          placeholder="e.g. Fresno, Madera, Merced" className={`${inputCls} w-full`} />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B7F96] cursor-pointer">
                        <input type="checkbox" checked={pubForm.allIndustries}
                          onChange={e => setPubForm(f => ({ ...f, allIndustries: e.target.checked }))} />
                        All Industries
                      </label>
                      {!pubForm.allIndustries && (
                        <div className="flex gap-2 flex-wrap mt-2">
                          {Object.entries(INDUSTRY_LABELS).map(([k, v]) => (
                            <label key={k} className="flex items-center gap-1 text-[11px] text-[#6B7F96] cursor-pointer">
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
                <div className="border-t border-[#E5E0D8] pt-3.5">
                  <div className="text-xs font-bold text-emerald-800 mb-2.5">Opportunity Dimensions (upside of acting early)</div>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { key: 'oppRevenue' as const, noteKey: 'oppRevenueNote' as const, icon: '⬆', label: 'Revenue Opp', desc: 'Score improvement, competitive advantage' },
                      { key: 'oppLiability' as const, noteKey: 'oppLiabilityNote' as const, icon: '🛡', label: 'Liability Opp', desc: 'Legal safe harbor, compliance edge' },
                      { key: 'oppCost' as const, noteKey: 'oppCostNote' as const, icon: '💵', label: 'Cost Opp', desc: 'Insurance discount, grant eligibility' },
                      { key: 'oppOperational' as const, noteKey: 'oppOperationalNote' as const, icon: '🚀', label: 'Operational Opp', desc: 'Efficiency gain, digital workflow' },
                    ].map(dim => (
                      <div key={dim.key} className="grid grid-cols-[140px_100px_1fr] gap-2 items-center">
                        <div>
                          <span className="text-xs">{dim.icon}</span>
                          <span className="text-[11px] font-semibold text-emerald-800 ml-1">{dim.label}</span>
                        </div>
                        <select value={pubForm[dim.key]} onChange={e => setPubForm(f => ({ ...f, [dim.key]: e.target.value }))}
                          className={`${inputCls} w-full cursor-pointer text-[11px] border-emerald-200`}>
                          <option value="none">None</option>
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="moderate">Moderate</option>
                          <option value="low">Low</option>
                        </select>
                        <input value={pubForm[dim.noteKey]} onChange={e => setPubForm(f => ({ ...f, [dim.noteKey]: e.target.value }))}
                          placeholder={dim.desc} className={`${inputCls} w-full text-[11px] border-emerald-200`} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impact Preview */}
                {impactPreview && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg py-2.5 px-3.5">
                    <div className="text-[11px] font-bold text-navy mb-1">
                      Impact Preview: {impactPreview.total_orgs} org{impactPreview.total_orgs !== 1 ? 's' : ''}, {impactPreview.total_locations} location{impactPreview.total_locations !== 1 ? 's' : ''}
                    </div>
                    {impactPreview.orgs.length > 0 && (
                      <div className="text-[10px] text-blue-500 leading-relaxed">
                        {impactPreview.orgs.map(o => o.name).join(' · ')}
                      </div>
                    )}
                    <div className="text-[9px] text-gray-500 mt-1">
                      Confidence: {impactPreview.confidence}%
                    </div>
                  </div>
                )}

                {/* Recommended Action + Deadline */}
                <div className="border-t border-[#E5E0D8] pt-3.5">
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7F96] block mb-1">
                      Recommended Action (shown to client)
                    </label>
                    <textarea value={pubForm.recommendedAction}
                      onChange={e => setPubForm(f => ({ ...f, recommendedAction: e.target.value }))}
                      rows={2} placeholder="What should the client do?"
                      className={`${inputCls} w-full resize-y`} />
                  </div>
                  <div className="mt-2.5">
                    <label className="text-[11px] font-semibold text-[#6B7F96] block mb-1">
                      Action Deadline
                    </label>
                    <input type="date" value={pubForm.actionDeadline}
                      onChange={e => setPubForm(f => ({ ...f, actionDeadline: e.target.value }))}
                      className={`${inputCls} w-[180px]`} />
                  </div>
                </div>

                {/* Priority preview */}
                {(() => {
                  const p = computePriority(pubForm);
                  const pColor = p === 'critical' ? 'text-red-600' : p === 'high' ? 'text-amber-600' : p === 'normal' ? 'text-blue-600' : 'text-gray-500';
                  return (
                    <div className="text-[11px] text-[#6B7F96]">
                      Computed priority: <span className={`font-bold ${pColor}`}>{p.toUpperCase()}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2.5 mt-5 border-t border-[#E5E0D8] pt-4">
                <button onClick={() => setPublishModal({ open: false, signal: null })}
                  className="py-2 px-[18px] bg-white border border-[#E5E0D8] rounded-lg text-[#6B7F96] text-[13px] font-semibold cursor-pointer">
                  Cancel
                </button>
                <button onClick={submitAdvisory}
                  className="py-2 px-[18px] bg-gold border-none rounded-lg text-white text-[13px] font-bold cursor-pointer">
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
