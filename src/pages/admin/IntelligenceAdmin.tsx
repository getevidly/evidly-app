/**
 * IntelligenceAdmin — Signal Approval Queue
 *
 * Focused admin page for reviewing, publishing, and managing intelligence signals.
 * Supports dismiss with reason, undo, restore, AI risk classification, and filtering.
 * Route: /admin/intelligence-admin
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { routingTierLabel, routingTierColor, type RoutingTier } from '../../lib/intelligenceRouter';
import { CIC_PILLARS, getPillarForSignalType, isPseSignalType } from '../../lib/cicPillars';
import { RiskLevelTooltip } from '../../components/RiskLevelTooltip';
import VerificationPanel from '../../components/admin/VerificationPanel';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Button from '../../components/ui/Button';

// Tailwind equivalents: NAVY=#1E2D4D → text-navy/bg-navy, GOLD=#A08C5A → text-gold/bg-gold,
// TEXT_SEC=#6B7F96 → text-slate_ui, TEXT_MUTED=#9CA3AF → text-gray-400, BORDER=#E5E0D8 → border-border_ui

interface QueueSignal {
  id: string;
  title: string;
  content_summary: string | null;
  category: string;
  signal_type: string;
  source_key: string | null;
  source_name: string | null;
  source_url: string | null;
  revenue_risk_level: string | null;
  liability_risk_level: string | null;
  cost_risk_level: string | null;
  operational_risk_level: string | null;
  workforce_risk_level: string | null;
  routing_tier: RoutingTier | null;
  severity_score: number | null;
  confidence_score: number | null;
  created_at: string;
  is_published: boolean;
  counties_affected: string[] | null;
  target_counties: string[] | null;
  original_url: string | null;
  recommended_action: string | null;
  // Fields requiring schema_align migration (optional until applied)
  status?: string;
  ai_urgency?: string | null;
  ai_summary?: string | null;
  scope?: string | null;
  affected_jurisdictions?: string[];
  routing_reason?: string | null;
  dismissed_reason?: string | null;
  dismissed_at?: string | null;
  dismissed_by?: string | null;
  cic_pillar?: string | null;
  // AUDIT-FIX-05 / P-1: Delivery tracking
  delivery_status?: string | null;
  delivered_at?: string | null;
  delivery_error?: string | null;
  delivery_attempt_count?: number | null;
  published_at?: string | null;
  // SIGNAL-VALIDATION-01: Review pipeline fields
  arthur_notes?: string | null;
  target_org_ids?: string[] | null;
  preview_sent?: boolean;
  edit_count?: number;
  detail_markdown?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

type TabFilter = 'all' | 'hold' | 'notify' | 'rejected' | 'published' | 'ai-costs';

// SIGNAL-VALIDATION-01: Seven-step pipeline
type PipelineStep = 'crawled' | 'ai_triage' | 'game_plan' | 'arthur_reviews' | 'impact_check' | 'approve' | 'deliver';

const PIPELINE_STEPS: { key: PipelineStep; label: string; auto: boolean }[] = [
  { key: 'crawled',        label: 'Crawled',        auto: true },
  { key: 'ai_triage',      label: 'AI Triage',      auto: true },
  { key: 'game_plan',      label: 'Game Plan',      auto: true },
  { key: 'arthur_reviews', label: 'Arthur Reviews',  auto: false },
  { key: 'impact_check',   label: 'Impact Check',   auto: false },
  { key: 'approve',        label: 'Approve',        auto: false },
  { key: 'deliver',        label: 'Deliver',        auto: false },
];

function derivePipelineStep(sig: QueueSignal, hasGamePlan: boolean): number {
  if (sig.is_published && sig.delivery_status && sig.delivery_status !== 'pending') return 6;
  if (sig.is_published) return 5;
  if (sig.reviewed_at) return 4;
  if (sig.routing_tier && sig.routing_tier !== 'auto') return 3;
  if (hasGamePlan || (sig.ai_urgency && sig.ai_summary)) return 2;
  if (sig.severity_score != null && sig.severity_score > 0) return 1;
  return 0;
}

function PipelineStepBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex gap-0.5 mb-2.5">
      {PIPELINE_STEPS.map((step, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={step.key} className="flex-1 text-center">
            <div className={`h-1 rounded-sm transition-colors duration-300 mb-[3px] ${
              isComplete ? 'bg-emerald-600' : isCurrent ? 'bg-gold' : 'bg-gray-200'
            }`} />
            <div className={`text-[8px] font-bold whitespace-nowrap ${
              isComplete ? 'text-emerald-600' : isCurrent ? 'text-gold' : 'text-gray-400'
            }`}>
              {step.label}
              {step.auto && <span className="text-[7px] text-gray-400"> (AI)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// AUDIT-FIX-08 / A-3: Classification log entry
interface ClassificationLogEntry {
  id: string;
  signal_id: string | null;
  signal_title: string | null;
  signal_type: string | null;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  total_cost_usd: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}


const URGENCY_COLORS: Record<string, { bg: string; text: string }> = {
  critical:      { bg: '#FEF2F2', text: '#DC2626' },
  high:          { bg: '#FFFBEB', text: '#D97706' },
  medium:        { bg: '#EFF6FF', text: '#2563EB' },
  low:           { bg: '#F9FAFB', text: '#6B7280' },
  informational: { bg: '#F9FAFB', text: '#9CA3AF' },
};

const RISK_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#D97706',
  medium: '#2563EB',
  low: '#6B7280',
  none: '#D1D5DB',
};

const DIM_COLORS: Record<string, string> = {
  revenue: '#DC2626',
  liability: '#7C3AED',
  cost: '#D97706',
  operational: '#2563EB',
  workforce: '#6B21A8',
};

const LEVELS = ['critical', 'high', 'medium', 'low', 'none'] as const;
const LEVEL_LABELS: Record<string, string> = { critical: 'Crit', high: 'High', medium: 'Med', low: 'Low', none: 'None' };

const REJECT_REASONS = [
  'Not relevant to CA commercial kitchens',
  'Duplicate signal',
  'Outdated / superseded',
  'Insufficient source quality',
  'Out of scope for current platform',
  'Other',
] as const;

const CATEGORY_OPTIONS = [
  { key: '', label: 'All' },
  { key: 'recall', label: 'Recall' },
  { key: 'allergen_alert', label: 'Allergen Alert' },
  { key: 'regulatory_updates', label: 'Regulatory Change' },
  { key: 'fire_safety', label: 'Fire Safety' },
  { key: 'outbreak_alert', label: 'Health Alert' },
  { key: 'workforce_risk', label: 'Workforce Risk' },
] as const;

const DATE_OPTIONS = [
  { key: '', label: 'All Time' },
  { key: '7', label: 'Last 7 Days' },
  { key: '30', label: 'Last 30 Days' },
  { key: '90', label: 'Last 90 Days' },
] as const;

/** Normalize legacy 'moderate' → 'medium' */
const normLevel = (v: string | null | undefined): string => {
  if (v === 'moderate') return 'medium';
  return v || 'none';
};

export default function IntelligenceAdmin() {
  useDemoGuard();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [signals, setSignals] = useState<QueueSignal[]>([]);
  const [publishedSignals, setPublishedSignals] = useState<QueueSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TabFilter>('all');
  const [redelivering, setRedelivering] = useState<string | null>(null);
  const [dimFilter, setDimFilter] = useState<'' | 'revenue' | 'liability' | 'cost' | 'operational' | 'workforce'>('');
  const [pillarFilter, setPillarFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [publishing, setPublishing] = useState<string | null>(null);
  const [riskEdits, setRiskEdits] = useState<Record<string, { revenue: string; liability: string; cost: string; operational: string; workforce: string }>>({});
  const [expandedVerification, setExpandedVerification] = useState<string | null>(null);
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, {
    verification_status: string; publish_blocked: boolean;
    gates_passed: number; gates_required: number;
    last_verified_at?: string; verified_by?: string;
  }>>({});
  const [verificationAvailable, setVerificationAvailable] = useState(true);

  // AUDIT-FIX-06 / P-2: Create signal modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', summary: '', detail_markdown: '', signal_type: 'intelligence',
    category: 'food_safety', priority: 'medium',
    affected_jurisdictions: [] as string[],
    game_plan_steps: [] as string[],
    affected_ingredient: '', affected_supplier: '',
  });
  const [creating, setCreating] = useState(false);

  // AUDIT-FIX-06 / P-3: Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', summary: '', detail_markdown: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // AUDIT-FIX-08 / A-3: AI Costs tab state
  const [aiCostsLoading, setAiCostsLoading] = useState(false);
  const [aiCostLog, setAiCostLog] = useState<ClassificationLogEntry[]>([]);
  const [aiDailySpend, setAiDailySpend] = useState<{ date: string; spend: number }[]>([]);
  const [aiTodaySpend, setAiTodaySpend] = useState(0);
  const [aiMonthSpend, setAiMonthSpend] = useState(0);
  const [aiMonthCount, setAiMonthCount] = useState(0);
  const [aiBudget, setAiBudget] = useState({ daily: 10, monthly: 100, threshold: 80 });
  const [editBudget, setEditBudget] = useState({ daily: '10', monthly: '100', threshold: '80' });
  const [savingBudget, setSavingBudget] = useState(false);
  const [aiCostTimeFilter, setAiCostTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // Saved flash state — key is `${signalId}_${dim}`
  const [savedDim, setSavedDim] = useState<Record<string, boolean>>({});

  // AI suggestion tracking: { signalId: { dim: true } }
  const [aiSuggested, setAiSuggested] = useState<Record<string, Record<string, boolean>>>({});
  const aiClassifiedRef = useRef<Set<string>>(new Set());

  // SIGNAL-VALIDATION-01: Reject modal state (renamed from dismiss)
  const [rejectModal, setRejectModal] = useState<{ signalId: string; previousTier: RoutingTier | null } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  // SIGNAL-VALIDATION-01: Review panel state
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [reviewTab, setReviewTab] = useState<'content' | 'source' | 'preview' | 'gameplan'>('content');
  const [editFormExtended, setEditFormExtended] = useState({ title: '', summary: '', detail_markdown: '', recommended_action: '' });
  const [gamePlans, setGamePlans] = useState<Record<string, { id: string; title: string; description: string | null; priority: string; status: string; tasks: any[]; task_status: Record<string, string>; created_at: string }[]>>({});
  const [gamePlanLoading, setGamePlanLoading] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [arthurNotes, setArthurNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [subsetModal, setSubsetModal] = useState<{ signalId: string } | null>(null);
  const [subsetOrgIds, setSubsetOrgIds] = useState<string[]>([]);
  const [sendingPreview, setSendingPreview] = useState<string | null>(null);
  const [weeklyPublished, setWeeklyPublished] = useState(0);
  const [weeklyRejected, setWeeklyRejected] = useState(0);
  const [avgReviewHours, setAvgReviewHours] = useState<number | null>(null);

  // Undo toast state (reject)
  const [lastRejected, setLastRejected] = useState<{ id: string; previousTier: RoutingTier | null; signal: QueueSignal } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restored flash
  const [restoredId, setRestoredId] = useState<string | null>(null);

  // E2E-FIX-01: Manual per-signal classify state
  const [classifyingId, setClassifyingId] = useState<string | null>(null);

  // AI auto-classification via server-side edge function [P0-API-KEY-01]
  const classifySignals = useCallback(async (sigs: QueueSignal[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('classify-signals', {
        body: {
          signals: sigs.map(s => ({
            id: s.id,
            title: s.title,
            content_summary: s.content_summary,
            category: s.category,
          })),
        },
      });
      if (error || !data?.results) return;

      for (const result of data.results as Array<{ id: string; revenue_risk_level: string; liability_risk_level: string; cost_risk_level: string; operational_risk_level: string; workforce_risk_level?: string }>) {
        const r = result.revenue_risk_level;
        const l = result.liability_risk_level;
        const c = result.cost_risk_level;
        const o = result.operational_risk_level;
        const w = result.workforce_risk_level || 'none';

        // Optimistic update
        setRiskEdits(prev => ({
          ...prev,
          [result.id]: { revenue: r, liability: l, cost: c, operational: o, workforce: w },
        }));
        setAiSuggested(prev => ({
          ...prev,
          [result.id]: { revenue: true, liability: true, cost: true, operational: true, workforce: true },
        }));

        // Save to Supabase
        await supabase.from('intelligence_signals').update({
          revenue_risk_level: r,
          liability_risk_level: l,
          cost_risk_level: c,
          operational_risk_level: o,
          workforce_risk_level: w,
        }).eq('id', result.id);
      }
    } catch {
      // Silent fail — leave buttons unset
    }
  }, []);

  // E2E-FIX-01: Manual per-signal classify
  const classifySingle = useCallback(async (sig: QueueSignal) => {
    setClassifyingId(sig.id);
    try {
      const { data, error } = await supabase.functions.invoke('classify-signals', {
        body: {
          signals: [{ id: sig.id, title: sig.title, content_summary: sig.content_summary, category: sig.category }],
        },
      });
      if (error || !data?.results) throw error || new Error('No results');
      for (const result of data.results as Array<{ id: string; revenue_risk_level: string; liability_risk_level: string; cost_risk_level: string; operational_risk_level: string; workforce_risk_level?: string }>) {
        setRiskEdits(prev => ({
          ...prev,
          [result.id]: { revenue: result.revenue_risk_level, liability: result.liability_risk_level, cost: result.cost_risk_level, operational: result.operational_risk_level, workforce: result.workforce_risk_level || 'none' },
        }));
        setAiSuggested(prev => ({
          ...prev,
          [result.id]: { revenue: true, liability: true, cost: true, operational: true, workforce: true },
        }));
        await supabase.from('intelligence_signals').update({
          revenue_risk_level: result.revenue_risk_level,
          liability_risk_level: result.liability_risk_level,
          cost_risk_level: result.cost_risk_level,
          operational_risk_level: result.operational_risk_level,
          workforce_risk_level: result.workforce_risk_level || 'none',
        }).eq('id', result.id);
      }
      toast.success('Signal classified');
    } catch {
      toast.error('Classification failed');
    }
    setClassifyingId(null);
  }, []);

  // SIGNAL-VALIDATION-01: Log review action to signal_review_log
  const logReviewAction = useCallback(async (
    signalId: string, action: string, notes?: string, metadata?: Record<string, any>
  ) => {
    await supabase.from('signal_review_log').insert({
      signal_id: signalId,
      action,
      actor_id: user?.id,
      actor_email: user?.email,
      notes: notes || null,
      metadata: metadata || {},
    }).catch(() => {});
  }, [user]);

  // SIGNAL-VALIDATION-01: Load game plans for a signal
  const loadGamePlansForSignal = useCallback(async (signalId: string) => {
    setGamePlanLoading(signalId);
    const { data } = await supabase
      .from('intelligence_game_plans')
      .select('*')
      .eq('signal_id', signalId)
      .order('created_at', { ascending: false });
    setGamePlans(prev => ({ ...prev, [signalId]: data || [] }));
    setGamePlanLoading(null);
  }, []);

  // SIGNAL-VALIDATION-01: Save arthur notes
  const saveArthurNotes = useCallback(async (signalId: string) => {
    const notes = arthurNotes[signalId];
    if (notes === undefined) return;
    setSavingNotes(signalId);
    await supabase.from('intelligence_signals').update({ arthur_notes: notes }).eq('id', signalId);
    setSignals(prev => prev.map(s => s.id === signalId ? { ...s, arthur_notes: notes } : s));
    await logReviewAction(signalId, 'edit', `Updated notes: ${notes.slice(0, 100)}`);
    setSavingNotes(null);
    toast.success('Notes saved');
  }, [arthurNotes, logReviewAction]);

  // SIGNAL-VALIDATION-01: Send preview
  const sendPreview = useCallback(async (signalId: string) => {
    setSendingPreview(signalId);
    await supabase.from('intelligence_signals').update({ preview_sent: true }).eq('id', signalId);
    setSignals(prev => prev.map(s => s.id === signalId ? { ...s, preview_sent: true } : s));
    await logReviewAction(signalId, 'preview_sent');
    setSendingPreview(null);
    toast.success('Preview marked as sent');
  }, [logReviewAction]);

  // SIGNAL-VALIDATION-01: Hold signal
  const holdSignal = useCallback(async (signalId: string) => {
    await supabase.from('intelligence_signals').update({ routing_tier: 'hold' }).eq('id', signalId);
    setSignals(prev => prev.map(s => s.id === signalId ? { ...s, routing_tier: 'hold' as RoutingTier } : s));
    await logReviewAction(signalId, 'hold');
    toast.success('Signal placed on hold');
  }, [logReviewAction]);

  // AUDIT-FIX-05 / P-1: Re-deliver a failed signal
  const redeliverSignal = useCallback(async (signalId: string) => {
    setRedelivering(signalId);
    try {
      await supabase.functions.invoke('intelligence-deliver', {
        body: { signal_id: signalId, manual_retry: true },
      });
      // Refresh published list after re-delivery
      const { data: updated } = await supabase
        .from('intelligence_signals')
        .select('*')
        .eq('id', signalId)
        .single();
      if (updated) {
        setPublishedSignals(prev => prev.map(s => s.id === signalId ? updated : s));
      }
    } catch (err) {
      console.error('[IntelligenceAdmin] Re-deliver failed:', err);
    }
    setRedelivering(null);
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    // Load unpublished queue
    const { data, error } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('is_published', false)
      .order('routing_tier', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) console.error('[SignalQueue] load error:', error.message);

    // AUDIT-FIX-05 / P-1: Load published signals for delivery tracking
    const { data: pubData } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(50);
    if (pubData) setPublishedSignals(pubData);

    if (data) {
      setSignals(data);
      // Load verification statuses for all signals
      const ids = data.map((s: QueueSignal) => s.id);
      if (ids.length > 0) {
        const { data: vsData, error: vsError } = await supabase
          .from('content_verification_status')
          .select('content_id, verification_status, publish_blocked, gates_passed, gates_required, last_verified_at, verified_by')
          .eq('content_table', 'intelligence_signals')
          .in('content_id', ids);
        if (vsError) {
          setVerificationAvailable(false);
        } else if (vsData) {
          const map: typeof verificationStatuses = {};
          vsData.forEach((v: { content_id: string; verification_status: string; publish_blocked: boolean; gates_passed: number; gates_required: number; last_verified_at?: string; verified_by?: string }) => {
            map[v.content_id] = v;
          });
          setVerificationStatuses(map);
        }
      }

      // AI classification for signals with all risk dims unset (max 5 per load)
      const isUnset = (v: string | null | undefined) => !v || v === 'none';
      const needsAI = data.filter((sig: QueueSignal) => {
        if (aiClassifiedRef.current.has(sig.id)) return false;
        return isUnset(sig.revenue_risk_level) && isUnset(sig.liability_risk_level) &&
               isUnset(sig.cost_risk_level) && isUnset(sig.operational_risk_level) &&
               isUnset(sig.workforce_risk_level);
      }).slice(0, 5);
      if (needsAI.length > 0) {
        needsAI.forEach((sig: QueueSignal) => aiClassifiedRef.current.add(sig.id));
        classifySignals(needsAI);
      }
    }
    // SIGNAL-VALIDATION-01: Enhanced weekly KPIs
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: weekPubCount } = await supabase
      .from('intelligence_signals')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .gte('published_at', oneWeekAgo);
    setWeeklyPublished(weekPubCount || 0);

    const { count: weekRejCount } = await supabase
      .from('intelligence_signals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'dismissed')
      .gte('dismissed_at', oneWeekAgo);
    setWeeklyRejected(weekRejCount || 0);

    const { data: reviewedSigs } = await supabase
      .from('intelligence_signals')
      .select('created_at, reviewed_at')
      .not('reviewed_at', 'is', null)
      .gte('reviewed_at', oneWeekAgo)
      .limit(100);
    if (reviewedSigs && reviewedSigs.length > 0) {
      const totalHrs = reviewedSigs.reduce((sum: number, s: { created_at: string; reviewed_at: string }) => {
        return sum + (new Date(s.reviewed_at).getTime() - new Date(s.created_at).getTime()) / 3600000;
      }, 0);
      setAvgReviewHours(Math.round((totalHrs / reviewedSigs.length) * 10) / 10);
    } else {
      setAvgReviewHours(null);
    }

    setLoading(false);
  }, [classifySignals]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // AUDIT-FIX-06 / P-2: Create a new signal manually
  const createSignal = useCallback(async () => {
    if (!createForm.title.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from('intelligence_signals').insert({
        title: createForm.title.trim(),
        content_summary: createForm.summary.trim() || null,
        detail_markdown: createForm.detail_markdown.trim() || null,
        signal_type: createForm.signal_type,
        category: createForm.category,
        severity_score: createForm.priority === 'critical' ? 90 : createForm.priority === 'high' ? 70 : createForm.priority === 'medium' ? 50 : 30,
        is_published: false,
        source_url: 'manual',
        source_name: 'Admin — Manual Entry',
        affected_jurisdictions: createForm.affected_jurisdictions.length > 0 ? createForm.affected_jurisdictions : null,
      });
      if (error) throw error;
      await supabase.from('platform_audit_log').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: 'signal.created_manual',
        resource_type: 'intelligence_signal',
        old_value: null,
        new_value: { title: createForm.title, signal_type: createForm.signal_type },
      }).catch(() => {});
      toast.success('Signal created');
      setShowCreateModal(false);
      setCreateForm({ title: '', summary: '', detail_markdown: '', signal_type: 'intelligence', category: 'food_safety', priority: 'medium', affected_jurisdictions: [], game_plan_steps: [], affected_ingredient: '', affected_supplier: '' });
      await loadQueue();
    } catch (err: any) {
      toast.error(`Failed to create signal: ${err?.message || 'Unknown error'}`);
    }
    setCreating(false);
  }, [createForm, user, loadQueue]);

  // AUDIT-FIX-06 / P-3: Inline edit helpers
  const startEdit = (sig: QueueSignal) => {
    setEditingId(sig.id);
    setEditForm({
      title: sig.title || '',
      summary: sig.ai_summary || sig.content_summary || '',
      detail_markdown: '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', summary: '', detail_markdown: '' });
  };

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    setSavingEdit(true);
    try {
      const updates: Record<string, any> = {};
      if (editForm.title.trim()) updates.title = editForm.title.trim();
      if (editForm.summary.trim()) updates.content_summary = editForm.summary.trim();
      if (Object.keys(updates).length === 0) { setSavingEdit(false); return; }
      // SIGNAL-VALIDATION-01: Increment edit_count
      const currentSig = signals.find(s => s.id === editingId);
      updates.edit_count = (currentSig?.edit_count || 0) + 1;
      const { error } = await supabase.from('intelligence_signals').update(updates).eq('id', editingId);
      if (error) throw error;
      await supabase.from('platform_audit_log').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: 'signal.edited',
        resource_type: 'intelligence_signal',
        resource_id: editingId,
        old_value: null,
        new_value: updates,
      }).catch(() => {});
      await logReviewAction(editingId, 'edit', null, updates);
      toast.success('Signal updated');
      setSignals(prev => prev.map(s => s.id === editingId ? { ...s, ...updates } : s));
      setEditingId(null);
    } catch (err: any) {
      toast.error(`Save failed: ${err?.message || 'Unknown error'}`);
    }
    setSavingEdit(false);
  }, [editingId, editForm, user, signals, logReviewAction]);

  // AUDIT-FIX-08 / A-3: Load AI cost data
  const loadAiCosts = useCallback(async () => {
    setAiCostsLoading(true);
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: config } = await supabase.from('ai_budget_config').select('*').single();
      if (config) {
        setAiBudget({ daily: config.daily_budget_usd, monthly: config.monthly_budget_usd, threshold: config.alert_threshold_pct });
        setEditBudget({ daily: String(config.daily_budget_usd), monthly: String(config.monthly_budget_usd), threshold: String(config.alert_threshold_pct) });
      }

      const { data: todayData } = await supabase.from('intelligence_classification_log').select('total_cost_usd').gte('created_at', today).eq('success', true);
      const { data: monthData } = await supabase.from('intelligence_classification_log').select('total_cost_usd').gte('created_at', monthStart).eq('success', true);

      setAiTodaySpend((todayData || []).reduce((s, r) => s + (r.total_cost_usd || 0), 0));
      setAiMonthSpend((monthData || []).reduce((s, r) => s + (r.total_cost_usd || 0), 0));
      setAiMonthCount((monthData || []).length);

      // 30-day daily aggregation
      const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const { data: dailyRaw } = await supabase.from('intelligence_classification_log').select('created_at, total_cost_usd').gte('created_at', thirtyAgo).eq('success', true).order('created_at', { ascending: true });
      const dmap: Record<string, number> = {};
      (dailyRaw || []).forEach(r => {
        const d = new Date(r.created_at).toISOString().split('T')[0];
        dmap[d] = (dmap[d] || 0) + (r.total_cost_usd || 0);
      });
      setAiDailySpend(Object.entries(dmap).map(([date, spend]) => ({ date, spend: Math.round(spend * 1000000) / 1000000 })).sort((a, b) => a.date.localeCompare(b.date)));

      // Log entries
      let logQ = supabase.from('intelligence_classification_log').select('*').order('created_at', { ascending: false }).limit(50);
      const { data: logData } = await logQ;

      setAiCostLog(logData || []);
    } catch {
      setAiCostLog([]);
    }
    setAiCostsLoading(false);
  }, []);

  const saveBudgetConfig = useCallback(async () => {
    setSavingBudget(true);
    try {
      const daily = parseFloat(editBudget.daily) || 10;
      const monthly = parseFloat(editBudget.monthly) || 100;
      const threshold = parseInt(editBudget.threshold) || 80;

      const { data: existing } = await supabase.from('ai_budget_config').select('id').limit(1);
      if (existing && existing.length > 0) {
        await supabase.from('ai_budget_config').update({ daily_budget_usd: daily, monthly_budget_usd: monthly, alert_threshold_pct: threshold, updated_at: new Date().toISOString() }).eq('id', existing[0].id);
      } else {
        await supabase.from('ai_budget_config').insert({ daily_budget_usd: daily, monthly_budget_usd: monthly, alert_threshold_pct: threshold });
      }

      setAiBudget({ daily, monthly, threshold });
      toast.success('Budget config saved');
    } catch (err: any) {
      toast.error(`Save failed: ${err?.message || 'Unknown error'}`);
    }
    setSavingBudget(false);
  }, [editBudget]);

  const exportClassifCsv = useCallback(() => {
    const headers = ['Timestamp', 'Signal Title', 'Type', 'Model', 'Input Tokens', 'Output Tokens', 'Total Cost USD', 'Success', 'Error'];
    const rows = aiCostLog.map(e => [
      e.created_at, e.signal_title || '', e.signal_type || '', e.model,
      String(e.input_tokens || ''), String(e.output_tokens || ''),
      String(e.total_cost_usd || ''), String(e.success), e.error_message || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-classification-costs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Classification log exported');
  }, [aiCostLog]);

  // Load AI costs when tab is selected
  useEffect(() => {
    if (filter === 'ai-costs') loadAiCosts();
  }, [filter, loadAiCosts]);

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); };
  }, []);

  const getRiskLevel = (sig: QueueSignal, dim: 'revenue' | 'liability' | 'cost' | 'operational' | 'workforce'): string => {
    if (riskEdits[sig.id]) return riskEdits[sig.id][dim];
    return normLevel(sig[`${dim}_risk_level` as keyof QueueSignal] as string);
  };

  const setRiskLevel = async (sig: QueueSignal, dim: 'revenue' | 'liability' | 'cost' | 'operational' | 'workforce', level: string) => {
    // Optimistic update
    setRiskEdits(prev => ({
      ...prev,
      [sig.id]: {
        revenue: prev[sig.id]?.revenue ?? normLevel(sig.revenue_risk_level),
        liability: prev[sig.id]?.liability ?? normLevel(sig.liability_risk_level),
        cost: prev[sig.id]?.cost ?? normLevel(sig.cost_risk_level),
        operational: prev[sig.id]?.operational ?? normLevel(sig.operational_risk_level),
        workforce: prev[sig.id]?.workforce ?? normLevel(sig.workforce_risk_level),
        [dim]: level,
      },
    }));

    // Remove AI suggested badge for this dimension
    setAiSuggested(prev => {
      if (!prev[sig.id]) return prev;
      const next = { ...prev[sig.id] };
      delete next[dim];
      if (Object.keys(next).length === 0) {
        const outer = { ...prev };
        delete outer[sig.id];
        return outer;
      }
      return { ...prev, [sig.id]: next };
    });

    // Persist to Supabase
    const { error } = await supabase
      .from('intelligence_signals')
      .update({ [`${dim}_risk_level`]: level })
      .eq('id', sig.id);

    if (error) {
      console.error('Risk level save failed:', error);
    } else {
      const key = `${sig.id}_${dim}`;
      setSavedDim(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setSavedDim(prev => { const next = { ...prev }; delete next[key]; return next; });
      }, 1500);
    }
  };

  const isAllNone = (sig: QueueSignal): boolean => {
    return (['revenue', 'liability', 'cost', 'operational', 'workforce'] as const).every(d => getRiskLevel(sig, d) === 'none');
  };

  const publishSignal = async (sig: QueueSignal) => {
    setPublishing(sig.id);
    const { error } = await supabase
      .from('intelligence_signals')
      .update({
        revenue_risk_level: getRiskLevel(sig, 'revenue'),
        liability_risk_level: getRiskLevel(sig, 'liability'),
        cost_risk_level: getRiskLevel(sig, 'cost'),
        operational_risk_level: getRiskLevel(sig, 'operational'),
        workforce_risk_level: getRiskLevel(sig, 'workforce'),
        is_published: true,
        published_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.email || 'admin',
        // AUDIT-FIX-05 / P-1: Initialize delivery tracking
        delivery_status: 'pending',
        delivery_attempt_count: 0,
      })
      .eq('id', sig.id);
    if (error) {
      console.error(`Failed to publish: ${error.message}`);
    } else {
      await logReviewAction(sig.id, 'approve');
      setSignals(prev => prev.filter(s => s.id !== sig.id));
      setRiskEdits(prev => { const next = { ...prev }; delete next[sig.id]; return next; });
      try {
        await supabase.functions.invoke('intelligence-deliver', {
          body: { type: 'signal', id: sig.id },
        });
      } catch {}
      // Refresh published list
      const { data: pubData } = await supabase
        .from('intelligence_signals')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(50);
      if (pubData) setPublishedSignals(pubData);
    }
    setPublishing(null);
  };

  // SIGNAL-VALIDATION-01: Publish for subset
  const publishForSubset = async (sig: QueueSignal, orgIds: string[]) => {
    setPublishing(sig.id);
    const { error } = await supabase
      .from('intelligence_signals')
      .update({
        revenue_risk_level: getRiskLevel(sig, 'revenue'),
        liability_risk_level: getRiskLevel(sig, 'liability'),
        cost_risk_level: getRiskLevel(sig, 'cost'),
        operational_risk_level: getRiskLevel(sig, 'operational'),
        workforce_risk_level: getRiskLevel(sig, 'workforce'),
        is_published: true,
        published_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.email || 'admin',
        delivery_status: 'pending',
        delivery_attempt_count: 0,
        target_org_ids: orgIds,
      })
      .eq('id', sig.id);
    if (!error) {
      await logReviewAction(sig.id, 'approve_subset', null, { target_org_ids: orgIds });
      setSignals(prev => prev.filter(s => s.id !== sig.id));
      setRiskEdits(prev => { const next = { ...prev }; delete next[sig.id]; return next; });
      try { await supabase.functions.invoke('intelligence-deliver', { body: { type: 'signal', id: sig.id } }); } catch {}
      const { data: pubData } = await supabase.from('intelligence_signals').select('*').eq('is_published', true).order('published_at', { ascending: false }).limit(50);
      if (pubData) setPublishedSignals(pubData);
    }
    setPublishing(null);
    setSubsetModal(null);
  };

  // Open reject modal (renamed from dismiss)
  const openRejectModal = (sig: QueueSignal) => {
    setRejectModal({ signalId: sig.id, previousTier: sig.routing_tier });
    setRejectReason('');
    setRejectNote('');
  };

  // Confirm reject with reason
  const confirmReject = async () => {
    if (!rejectModal || !rejectReason) return;
    if (rejectReason === 'Other' && rejectNote.length < 1) return;

    const sig = signals.find(s => s.id === rejectModal.signalId);
    if (!sig) return;

    const fullReason = rejectReason === 'Other' ? `Other: ${rejectNote}` : rejectReason;

    // Optimistic update
    setSignals(prev => prev.map(s =>
      s.id === rejectModal.signalId
        ? { ...s, status: 'dismissed', dismissed_reason: fullReason, dismissed_at: new Date().toISOString(), dismissed_by: user?.email || 'admin' }
        : s
    ));
    setRejectModal(null);

    // Start undo timer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setLastRejected({ id: sig.id, previousTier: sig.routing_tier, signal: sig });
    undoTimerRef.current = setTimeout(() => {
      setLastRejected(null);
    }, 6000);

    // Persist
    await supabase
      .from('intelligence_signals')
      .update({
        status: 'dismissed',
        dismissed_reason: fullReason,
        dismissed_at: new Date().toISOString(),
        dismissed_by: user?.email || 'admin',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.email || 'admin',
      })
      .eq('id', rejectModal.signalId);

    await logReviewAction(rejectModal.signalId, 'reject', fullReason);
  };

  // Undo reject
  const undoReject = async () => {
    if (!lastRejected) return;
    const { id, signal } = lastRejected;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setLastRejected(null);

    // Optimistic: restore to original state
    setSignals(prev => prev.map(s =>
      s.id === id
        ? { ...s, status: signal.status === 'dismissed' ? 'new' : signal.status, dismissed_reason: null, dismissed_at: null, dismissed_by: null }
        : s
    ));

    await supabase
      .from('intelligence_signals')
      .update({
        status: 'new',
        dismissed_reason: null,
        dismissed_at: null,
        dismissed_by: null,
      })
      .eq('id', id);

    await logReviewAction(id, 'restore');
  };

  // Restore from dismissed tab
  const restoreSignal = async (sig: QueueSignal) => {
    // Optimistic update
    setSignals(prev => prev.map(s =>
      s.id === sig.id
        ? { ...s, status: 'new', dismissed_reason: null, dismissed_at: null, dismissed_by: null }
        : s
    ));
    setRestoredId(sig.id);
    setTimeout(() => setRestoredId(null), 1500);

    await supabase
      .from('intelligence_signals')
      .update({
        status: 'new',
        dismissed_reason: null,
        dismissed_at: null,
        dismissed_by: null,
      })
      .eq('id', sig.id);

    await logReviewAction(sig.id, 'restore');
  };

  // Split signals
  const activeSignals = signals.filter(s => s.status !== 'dismissed');
  const rejectedSignals = signals.filter(s => s.status === 'dismissed');

  // Date filter helper
  const passesDateFilter = (createdAt: string): boolean => {
    if (!dateFilter) return true;
    const days = parseInt(dateFilter, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return new Date(createdAt) >= cutoff;
  };

  // Helper: resolve a signal's CIC pillar (from DB column or derived from signal_type)
  const getSignalPillar = (s: QueueSignal): string | undefined => {
    if (s.cic_pillar) return s.cic_pillar;
    const p = getPillarForSignalType(s.signal_type);
    return p?.id;
  };

  // Apply all filters
  const filtered = (filter === 'rejected' ? rejectedSignals : activeSignals).filter(s => {
    if (filter === 'hold' && s.routing_tier !== 'hold') return false;
    if (filter === 'notify' && s.routing_tier !== 'notify') return false;
    if (pillarFilter && getSignalPillar(s) !== pillarFilter) return false;
    if (dimFilter) {
      const riskVal = riskEdits[s.id]?.[dimFilter] ?? normLevel(s[`${dimFilter}_risk_level` as keyof QueueSignal] as string);
      if (!riskVal || riskVal === 'none') return false;
    }
    if (categoryFilter) {
      if (categoryFilter === 'workforce_risk') {
        if (getSignalPillar(s) !== 'workforce_risk') return false;
      } else if (s.category !== categoryFilter) {
        return false;
      }
    }
    if (!passesDateFilter(s.created_at)) return false;
    return true;
  });

  const holdCount = activeSignals.filter(s => s.routing_tier === 'hold').length;
  const notifyCount = activeSignals.filter(s => s.routing_tier === 'notify').length;
  const rejectedCount = rejectedSignals.length;
  const revenueCount = activeSignals.filter(s => {
    const v = riskEdits[s.id]?.revenue ?? s.revenue_risk_level;
    return v && v !== 'none';
  }).length;
  const liabilityCount = activeSignals.filter(s => {
    const v = riskEdits[s.id]?.liability ?? s.liability_risk_level;
    return v && v !== 'none';
  }).length;
  const costOpsCount = activeSignals.filter(s => {
    const cv = riskEdits[s.id]?.cost ?? s.cost_risk_level;
    const ov = riskEdits[s.id]?.operational ?? s.operational_risk_level;
    return (cv && cv !== 'none') || (ov && ov !== 'none');
  }).length;

  const publishedCount = publishedSignals.length;
  const failedDeliveryCount = publishedSignals.filter(s => s.delivery_status === 'failed').length;
  const isRejectedTab = filter === 'rejected';
  const isPublishedTab = filter === 'published';

  const pillCls = (active: boolean, color: string = 'navy') => {
    const colorMap: Record<string, string> = { navy: 'bg-navy border-navy', gold: 'bg-gold border-gold' };
    return `py-[5px] px-3.5 rounded-full text-[11px] font-semibold cursor-pointer border ${
      active ? `${colorMap[color] || `bg-[${color}] border-[${color}]`} text-white` : 'bg-white text-slate_ui border-border_ui'
    }`;
  };

  const smallPillCls = (active: boolean, color: string = 'gold') => {
    const colorMap: Record<string, string> = { gold: 'bg-gold border-gold' };
    return `py-[3px] px-2.5 rounded-[14px] text-[10px] font-semibold cursor-pointer border ${
      active ? `${colorMap[color] || `bg-[${color}] border-[${color}]`} text-white` : 'bg-white text-gray-400 border-border_ui'
    }`;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy mb-1">
            Signal Approval Queue
          </h1>
          <p className="text-[13px] text-slate_ui m-0">
            Review and publish intelligence signals to client feeds. Sorted by severity.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              try {
                const { error } = await supabase.from('intelligence_signals').insert({
                  title: 'FDA recall affecting leafy greens — California suppliers',
                  summary: 'An FDA recall has been issued affecting romaine lettuce from California suppliers. Review your receiving logs for the past 30 days.',
                  content_summary: 'The FDA has issued a Class I recall for romaine lettuce from Central Valley, CA due to potential E. coli O157:H7 contamination.',
                  signal_type: 'fda_recall', category: 'food_safety', cic_pillar: 'liability_risk',
                  severity_score: 90, confidence_score: 95,
                  revenue_risk_level: 'high', liability_risk_level: 'critical',
                  cost_risk_level: 'low', operational_risk_level: 'high',
                  recommended_action: 'Check receiving logs for romaine lettuce from California suppliers. Quarantine any affected product.',
                  is_published: true, published_at: new Date().toISOString(), status: 'published', routing_tier: 'notify',
                });
                if (error) throw error;
                toast.success('Demo signal fired — check the notification bell');
                loadQueue();
              } catch (err: any) { toast.error(`Failed: ${err.message}`); }
            }}
            className="shrink-0"
          >
            Fire Demo Signal
          </Button>
          <Button
            variant="gold"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="shrink-0"
          >
            + New Signal
          </Button>
        </div>
      </div>

      {/* Stats row — SIGNAL-VALIDATION-01 enhanced KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'In Queue', value: String(activeSignals.length), colorCls: 'text-navy' },
          { label: 'Published (7d)', value: String(weeklyPublished), colorCls: 'text-emerald-600' },
          { label: 'Rejected (7d)', value: String(weeklyRejected), colorCls: 'text-red-600' },
          { label: 'Avg Review Time', value: avgReviewHours != null ? `${avgReviewHours}h` : '—', colorCls: 'text-gold' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-border_ui rounded-[10px] py-3.5 px-4">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.04em] mb-1">
              {s.label}
            </div>
            <div className={`text-[22px] font-extrabold ${s.colorCls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab pills */}
      <div className="flex gap-2 mb-2 flex-wrap">
        {([
          { key: 'all' as TabFilter, label: `All (${activeSignals.length})` },
          { key: 'hold' as TabFilter, label: `Hold (${holdCount})` },
          { key: 'notify' as TabFilter, label: `Notify (${notifyCount})` },
          { key: 'rejected' as TabFilter, label: `Rejected (${rejectedCount})` },
          { key: 'published' as TabFilter, label: `Published (${publishedCount})${failedDeliveryCount > 0 ? ` · ${failedDeliveryCount} failed` : ''}` },
          { key: 'ai-costs' as TabFilter, label: '$ AI Costs' },
        ]).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`${pillCls(filter === f.key)}${
              f.key === 'published' && failedDeliveryCount > 0 && filter !== f.key ? ' !border-red-600 !text-red-600' : ''
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* CIC Pillar filters */}
      <div className="flex gap-1.5 mb-2 items-center">
        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.04em]">Pillar:</span>
        <button onClick={() => setPillarFilter('')} className={smallPillCls(pillarFilter === '')}>
          All Pillars
        </button>
        {CIC_PILLARS.map(p => (
          <button key={p.id} onClick={() => setPillarFilter(p.id)}
            className="py-[3px] px-2.5 rounded-[14px] text-[10px] font-semibold cursor-pointer border"
            style={{
              background: pillarFilter === p.id ? p.color : '#fff',
              color: pillarFilter === p.id ? '#fff' : '#9CA3AF',
              borderColor: pillarFilter === p.id ? p.color : '#E5E0D8',
            }}>
            {p.shortLabel}
          </button>
        ))}
      </div>

      {/* Risk dimension filters */}
      <div className="flex gap-1.5 mb-2 items-center">
        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.04em]">Risk:</span>
        {([
          { key: '' as const, label: 'All' },
          { key: 'revenue' as const, label: 'Revenue' },
          { key: 'liability' as const, label: 'Liability' },
          { key: 'cost' as const, label: 'Cost' },
          { key: 'operational' as const, label: 'Operational' },
          { key: 'workforce' as const, label: 'Workforce' },
        ]).map(f => (
          <button key={f.key} onClick={() => setDimFilter(f.key)} className={smallPillCls(dimFilter === f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 mb-2 items-center">
        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.04em]">Type:</span>
        {CATEGORY_OPTIONS.map(f => (
          <button key={f.key} onClick={() => setCategoryFilter(f.key)} className={smallPillCls(categoryFilter === f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div className="flex gap-1.5 mb-4 items-center">
        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.04em]">Date:</span>
        {DATE_OPTIONS.map(f => (
          <button key={f.key} onClick={() => setDateFilter(f.key)} className={smallPillCls(dateFilter === f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* AUDIT-FIX-08 / A-3: AI Costs Tab */}
      {filter === 'ai-costs' ? (
        <div className="flex flex-col gap-4">
          {/* KPI row */}
          {aiCostsLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-[10px] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {/* Today's Spend */}
              <div className="bg-white border border-border_ui rounded-[10px] py-3.5 px-4">
                <div className="text-[11px] font-semibold text-slate_ui mb-1">Today&apos;s Spend</div>
                <div className="text-[22px] font-extrabold text-navy">${aiTodaySpend.toFixed(4)}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Budget: ${aiBudget.daily.toFixed(2)}/day
                </div>
              </div>
              {/* Month Spend */}
              <div className="bg-white border border-border_ui rounded-[10px] py-3.5 px-4">
                <div className="text-[11px] font-semibold text-slate_ui mb-1">Month Spend</div>
                <div className="text-[22px] font-extrabold text-navy">${aiMonthSpend.toFixed(4)}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {aiMonthCount} classifications
                </div>
              </div>
              {/* Monthly Budget */}
              {(() => {
                const pct = aiBudget.monthly > 0 ? (aiMonthSpend / aiBudget.monthly) * 100 : 0;
                const barColor = pct >= 90 ? 'bg-red-600' : pct >= 70 ? 'bg-amber-600' : 'bg-emerald-600';
                return (
                  <div className="bg-white border border-border_ui rounded-[10px] py-3.5 px-4">
                    <div className="text-[11px] font-semibold text-slate_ui mb-1">Monthly Budget</div>
                    <div className="text-[22px] font-extrabold text-navy">{pct.toFixed(1)}%</div>
                    <div className="h-1 bg-gray-200 rounded-sm mt-1.5">
                      <div className={`h-1 rounded-sm ${barColor} transition-all duration-300`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      ${aiMonthSpend.toFixed(2)} / ${aiBudget.monthly.toFixed(2)}
                    </div>
                  </div>
                );
              })()}
              {/* Avg Cost / Signal */}
              <div className="bg-white border border-border_ui rounded-[10px] py-3.5 px-4">
                <div className="text-[11px] font-semibold text-slate_ui mb-1">Avg Cost / Signal</div>
                <div className="text-[22px] font-extrabold text-navy">
                  ${aiMonthCount > 0 ? (aiMonthSpend / aiMonthCount).toFixed(5) : '0.00000'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Claude Haiku 4.5
                </div>
              </div>
            </div>
          )}

          {/* 30-day bar chart */}
          <div className="bg-white border border-border_ui rounded-[10px] py-[18px] px-5">
            <div className="text-[13px] font-bold text-navy mb-3">Daily Spend (30 days)</div>
            {aiDailySpend.length === 0 ? (
              <div className="text-center p-6 text-xs text-gray-400">No classification data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={aiDailySpend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v: number) => `$${v.toFixed(3)}`} width={60} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(5)}`, 'Spend']} labelFormatter={(l: string) => `Date: ${l}`} />
                  <Bar dataKey="spend" fill="#A08C5A" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Budget configuration */}
          <div className="bg-white border border-border_ui rounded-[10px] py-[18px] px-5">
            <div className="text-[13px] font-bold text-navy mb-3">Budget Configuration</div>
            <div className="flex gap-4 items-end flex-wrap">
              <div>
                <label className="text-[11px] font-semibold text-slate_ui block mb-1">Daily Budget ($)</label>
                <input type="number" step="0.50" min="0" value={editBudget.daily}
                  onChange={e => setEditBudget(p => ({ ...p, daily: e.target.value }))}
                  className="w-[100px] py-1.5 px-2.5 rounded-md border border-border_ui text-[13px]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate_ui block mb-1">Monthly Budget ($)</label>
                <input type="number" step="1" min="0" value={editBudget.monthly}
                  onChange={e => setEditBudget(p => ({ ...p, monthly: e.target.value }))}
                  className="w-[100px] py-1.5 px-2.5 rounded-md border border-border_ui text-[13px]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate_ui block mb-1">Alert Threshold (%)</label>
                <input type="number" step="5" min="0" max="100" value={editBudget.threshold}
                  onChange={e => setEditBudget(p => ({ ...p, threshold: e.target.value }))}
                  className="w-20 py-1.5 px-2.5 rounded-md border border-border_ui text-[13px]" />
              </div>
              <Button variant="gold" size="sm" onClick={saveBudgetConfig} disabled={savingBudget} isLoading={savingBudget}>
                {savingBudget ? 'Saving...' : 'Save'}
              </Button>
            </div>
            {/* Rate limit note */}
            <div className="mt-3 py-2 px-3 bg-gray-50 rounded-md text-[11px] text-slate_ui leading-normal">
              <strong>Model:</strong> Claude Haiku 4.5 &middot; <strong>Pricing:</strong> $1.00/M input tokens, $5.00/M output tokens &middot; <strong>Limit:</strong> 10 signals/request &middot; 15s timeout/signal
            </div>
          </div>

          {/* Classification log table */}
          <div className="bg-white border border-border_ui rounded-[10px] py-[18px] px-5">
            <div className="flex justify-between items-center mb-3">
              <div className="text-[13px] font-bold text-navy">Classification Log</div>
              <div className="flex gap-2 items-center">
                {/* Time filter pills */}
                {(['today', 'week', 'month', 'all'] as const).map(tf => (
                  <button key={tf} onClick={() => setAiCostTimeFilter(tf)}
                    className={`py-[3px] px-2.5 rounded-xl text-[10px] font-semibold cursor-pointer border ${
                      aiCostTimeFilter === tf ? 'border-gold bg-gold text-white' : 'border-border_ui bg-transparent text-slate_ui'
                    }`}>
                    {tf.charAt(0).toUpperCase() + tf.slice(1)}
                  </button>
                ))}
                <Button variant="secondary" size="sm" onClick={exportClassifCsv}>
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border_ui">
                    <th className="text-left py-1.5 px-2 font-bold text-slate_ui text-[10px]">Timestamp</th>
                    <th className="text-left py-1.5 px-2 font-bold text-slate_ui text-[10px]">Signal</th>
                    <th className="text-left py-1.5 px-2 font-bold text-slate_ui text-[10px]">Model</th>
                    <th className="text-right py-1.5 px-2 font-bold text-slate_ui text-[10px]">Input</th>
                    <th className="text-right py-1.5 px-2 font-bold text-slate_ui text-[10px]">Output</th>
                    <th className="text-right py-1.5 px-2 font-bold text-slate_ui text-[10px]">Cost</th>
                    <th className="text-center py-1.5 px-2 font-bold text-slate_ui text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const now = new Date();
                    const filteredLog = aiCostLog.filter(entry => {
                      if (aiCostTimeFilter === 'all') return true;
                      const d = new Date(entry.created_at);
                      if (aiCostTimeFilter === 'today') return d.toDateString() === now.toDateString();
                      if (aiCostTimeFilter === 'week') return (now.getTime() - d.getTime()) < 7 * 86400000;
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    });
                    if (filteredLog.length === 0) {
                      return (
                        <tr><td colSpan={7} className="text-center p-5 text-gray-400">No classifications yet — costs will appear here once signals are classified.</td></tr>
                      );
                    }
                    const totalCost = filteredLog.reduce((s, e) => s + (e.total_cost_usd || 0), 0);
                    const totalIn = filteredLog.reduce((s, e) => s + (e.input_tokens || 0), 0);
                    const totalOut = filteredLog.reduce((s, e) => s + (e.output_tokens || 0), 0);
                    return (
                      <>
                        {filteredLog.map(entry => (
                          <tr key={entry.id} className="border-b border-gray-100">
                            <td className="py-1.5 px-2 text-gray-400 whitespace-nowrap text-[11px]">
                              {new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </td>
                            <td className="py-1.5 px-2 text-navy font-medium max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap">
                              {entry.signal_title || '—'}
                            </td>
                            <td className="py-1.5 px-2 text-gray-400 text-[10px] font-mono">
                              {entry.model.replace('claude-', '').replace('-20251001', '')}
                            </td>
                            <td className="py-1.5 px-2 text-right text-slate_ui font-mono">
                              {entry.input_tokens?.toLocaleString() || '—'}
                            </td>
                            <td className="py-1.5 px-2 text-right text-slate_ui font-mono">
                              {entry.output_tokens?.toLocaleString() || '—'}
                            </td>
                            <td className="py-1.5 px-2 text-right text-navy font-semibold font-mono">
                              {entry.total_cost_usd != null ? `$${entry.total_cost_usd.toFixed(5)}` : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <span className={`text-[9px] font-bold py-0.5 px-2 rounded-[10px] ${
                                entry.success ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                              }`}>
                                {entry.success ? 'OK' : 'FAIL'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="border-t-2 border-border_ui font-bold">
                          <td className="p-2 text-navy text-[11px]">TOTAL ({filteredLog.length})</td>
                          <td className="p-2"></td>
                          <td className="p-2"></td>
                          <td className="p-2 text-right text-navy font-mono text-[11px]">{totalIn.toLocaleString()}</td>
                          <td className="p-2 text-right text-navy font-mono text-[11px]">{totalOut.toLocaleString()}</td>
                          <td className="p-2 text-right text-navy font-mono text-[11px]">${totalCost.toFixed(5)}</td>
                          <td className="p-2"></td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* AUDIT-FIX-05 / P-1: Published Signals with Delivery Status */}
      {isPublishedTab ? (
        <div>
          {publishedSignals.length === 0 ? (
            <div className="text-center py-12 px-5 bg-[#FAFAF8] border-[1.5px] border-dashed border-border_ui rounded-[10px]">
              <div className="text-sm font-bold text-navy mb-1.5">No published signals</div>
              <div className="text-xs text-slate_ui">Published signals will appear here with their delivery status.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {publishedSignals.map(sig => {
                const ds = sig.delivery_status || 'pending';
                const dsColorCls = ds === 'delivered' ? 'text-emerald-600' : ds === 'failed' ? 'text-red-600' : 'text-amber-600';
                const dsLabel = ds === 'delivered' ? 'Delivered' : ds === 'failed' ? 'Failed' : ds === 'partial' ? 'Partial' : 'Pending';
                const dsIcon = ds === 'delivered' ? '\u2713' : ds === 'failed' ? '\u2717' : '\u27F3';
                const isFailed = ds === 'failed' || ds === 'pending';

                return (
                  <div key={sig.id} className={`bg-white border border-border_ui rounded-[10px] py-3.5 px-[18px] ${
                    ds === 'failed' ? 'border-l-4 border-l-red-600'
                      : ds === 'delivered' ? 'border-l-4 border-l-emerald-600'
                      : 'border-l-4 border-l-amber-600'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {/* Badges */}
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className={`text-[9px] font-bold py-0.5 px-2 rounded-[10px] ${
                            ds === 'delivered' ? 'bg-emerald-50' : ds === 'failed' ? 'bg-red-50' : 'bg-amber-50'
                          } ${dsColorCls}`}>
                            {dsIcon} {dsLabel.toUpperCase()}
                          </span>
                          <span className="text-[9px] font-semibold py-0.5 px-2 rounded-[10px] bg-gray-50 text-slate_ui border border-border_ui">
                            {sig.signal_type?.replace(/_/g, ' ')}
                          </span>
                          {sig.delivery_attempt_count != null && sig.delivery_attempt_count > 1 && (
                            <span className="text-[9px] font-semibold text-gray-400">
                              Attempt #{sig.delivery_attempt_count}
                            </span>
                          )}
                        </div>
                        {/* Title */}
                        <div className="text-sm font-bold text-navy mb-1">{sig.title}</div>
                        {/* Summary */}
                        {sig.content_summary && (
                          <div className="text-xs text-slate_ui leading-normal mb-1.5">
                            {sig.content_summary.slice(0, 150)}{sig.content_summary.length > 150 ? '...' : ''}
                          </div>
                        )}
                        {/* Delivery details */}
                        <div className="text-[11px] text-gray-400">
                          Published: {sig.published_at ? new Date(sig.published_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                          {sig.delivered_at && (
                            <> · Delivered: {new Date(sig.delivered_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</>
                          )}
                        </div>
                        {/* Error message for failed */}
                        {sig.delivery_error && (
                          <div className="text-[11px] text-red-600 mt-1 py-1 px-2 bg-red-50 rounded">
                            Error: {sig.delivery_error}
                          </div>
                        )}
                      </div>

                      {/* Re-deliver button for failed/pending */}
                      {isFailed && (
                        <Button
                          variant="gold"
                          size="sm"
                          onClick={() => redeliverSignal(sig.id)}
                          disabled={redelivering === sig.id}
                          isLoading={redelivering === sig.id}
                          className="shrink-0"
                        >
                          {redelivering === sig.id ? 'Delivering...' : 'Re-deliver'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Signal cards */}
      {isPublishedTab || filter === 'ai-costs' ? null : loading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-[10px] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 px-5 bg-[#FAFAF8] border-[1.5px] border-dashed border-border_ui rounded-[10px]">
          <div className="text-sm font-bold text-navy mb-1.5">
            {isRejectedTab ? 'No rejected signals' : 'Queue is clear'}
          </div>
          <div className="text-xs text-slate_ui max-w-[400px] mx-auto leading-relaxed">
            {isRejectedTab
              ? 'Rejected signals will appear here. Use the Restore button to return them to the review queue.'
              : 'No signals pending review. New signals will appear here when the intelligence crawler detects changes.'
            }
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(sig => {
            const uc = URGENCY_COLORS[sig.ai_urgency || 'low'] || URGENCY_COLORS.low;
            const rc = sig.routing_tier ? routingTierColor(sig.routing_tier) : null;
            const isRejected = sig.status === 'dismissed';
            const isRestored = restoredId === sig.id;

            if (isRestored) {
              return (
                <div key={sig.id} className="bg-emerald-50 border border-emerald-600 rounded-[10px] py-4 px-[18px] text-center text-[13px] font-semibold text-emerald-600">
                  Restored — signal returned to review queue
                </div>
              );
            }

            return (
              <div key={sig.id} className={`border border-border_ui rounded-[10px] py-4 px-[18px] cursor-pointer ${
                isRejected ? 'bg-[#FAFAF8] opacity-[0.85] border-l-4 border-l-gray-400'
                  : sig.routing_tier === 'hold' ? 'bg-white border-l-4 border-l-red-600'
                  : sig.routing_tier === 'notify' ? 'bg-white border-l-4 border-l-amber-600'
                  : 'bg-white border-l-4 border-l-border_ui'
              }`}
                onClick={() => {
                  if (expandedSignalId === sig.id) { setExpandedSignalId(null); }
                  else {
                    setExpandedSignalId(sig.id);
                    setReviewTab('content');
                    setEditFormExtended({
                      title: sig.title || '',
                      summary: sig.ai_summary || sig.content_summary || '',
                      detail_markdown: sig.detail_markdown || '',
                      recommended_action: sig.recommended_action || '',
                    });
                    setArthurNotes(prev => ({ ...prev, [sig.id]: sig.arthur_notes || '' }));
                    if (!gamePlans[sig.id]) loadGamePlansForSignal(sig.id);
                  }
                }}
              >
                {/* SIGNAL-VALIDATION-01: Pipeline step bar */}
                {!isRejected && (
                  <PipelineStepBar currentStep={derivePipelineStep(sig, !!(gamePlans[sig.id]?.length))} />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {/* Badges */}
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      {sig.routing_tier && rc && (
                        <span className="text-[9px] font-bold py-0.5 px-2 rounded-[10px]" style={{ background: rc.bg, color: rc.text }}>
                          {routingTierLabel(sig.routing_tier)}
                        </span>
                      )}
                      {sig.ai_urgency && (
                        <span className="text-[9px] font-bold py-0.5 px-2 rounded-[10px]" style={{ background: uc.bg, color: uc.text }}>
                          {sig.ai_urgency.toUpperCase()}
                        </span>
                      )}
                      {/* PSE badge */}
                      {isPseSignalType(sig.signal_type) && (
                        <span className="text-[9px] font-bold py-0.5 px-2 rounded-[10px] bg-amber-50 text-amber-600 border border-amber-200">
                          PSE-Relevant
                        </span>
                      )}
                      {/* CIC Pillar badge */}
                      {(() => {
                        const pillar = sig.cic_pillar ? CIC_PILLARS.find(p => p.id === sig.cic_pillar) : getPillarForSignalType(sig.signal_type);
                        if (!pillar) return null;
                        return (
                          <span className="text-[9px] font-bold py-0.5 px-2 rounded-[10px]" style={{ background: pillar.bgColor, color: pillar.color }}>
                            {pillar.shortLabel}
                          </span>
                        );
                      })()}
                      <span className="text-[9px] font-semibold py-0.5 px-2 rounded-[10px] bg-gray-50 text-slate_ui border border-border_ui">
                        {sig.signal_type?.replace(/_/g, ' ')}
                      </span>
                      {sig.severity_score != null && (
                        <span className="text-[9px] font-semibold text-gray-400">
                          Severity: {sig.severity_score}
                        </span>
                      )}
                      {sig.confidence_score != null && (
                        <span className="text-[9px] font-semibold text-gray-400">
                          Confidence: {sig.confidence_score}%
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[9px] font-bold py-0.5 px-2 rounded-[10px] bg-gray-100 text-gray-400">
                          REJECTED
                        </span>
                      )}
                      {/* SIGNAL-VALIDATION-01: Edit count badge */}
                      {sig.edit_count != null && sig.edit_count > 0 && (
                        <span className="text-[9px] font-semibold py-0.5 px-2 rounded-[10px] bg-blue-50 text-blue-600 border border-blue-200">
                          {sig.edit_count} edit{sig.edit_count > 1 ? 's' : ''}
                        </span>
                      )}
                      {/* SIGNAL-VALIDATION-01: Preview sent */}
                      {sig.preview_sent && (
                        <span className="text-[9px] font-bold py-0.5 px-2 rounded-[10px] bg-green-50 text-emerald-600">
                          PREVIEW SENT
                        </span>
                      )}
                      {/* SIGNAL-VALIDATION-01: Subset target */}
                      {sig.target_org_ids && sig.target_org_ids.length > 0 && (
                        <span className="text-[9px] font-semibold py-0.5 px-2 rounded-[10px] bg-orange-50 text-orange-700">
                          {sig.target_org_ids.length} org target{sig.target_org_ids.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    {editingId === sig.id ? (
                      <input
                        value={editForm.title}
                        onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        className="text-sm font-bold text-navy mb-1 w-full py-1 px-2 border border-gold rounded outline-none"
                      />
                    ) : (
                      <div className="text-sm font-bold text-navy mb-1">
                        {sig.title}
                      </div>
                    )}

                    {/* Summary */}
                    {editingId === sig.id ? (
                      <textarea
                        value={editForm.summary}
                        onChange={e => setEditForm(prev => ({ ...prev, summary: e.target.value }))}
                        rows={3}
                        className="text-xs text-slate_ui leading-normal mb-1.5 w-full py-1 px-2 border border-gold rounded resize-y outline-none"
                      />
                    ) : (sig.ai_summary || sig.content_summary) ? (
                      <div className="text-xs text-slate_ui leading-normal mb-1.5">
                        {(sig.ai_summary || sig.content_summary || '').slice(0, 200)}
                        {(sig.ai_summary || sig.content_summary || '').length > 200 ? '...' : ''}
                      </div>
                    ) : null}

                    {/* Source & Verification */}
                    <div className="flex flex-col gap-0.5 mb-1.5">
                      <div className="text-[11px] text-gray-400">
                        <span className="font-semibold">Source: </span>
                        {sig.source_name || sig.source_key || 'Unknown'}
                        {sig.source_url && (
                          <>
                            {' — '}
                            <a href={sig.source_url} target="_blank" rel="noopener noreferrer"
                              className="text-slate_ui underline">
                              {(() => { try { return new URL(sig.source_url).hostname.replace(/^www\./, ''); } catch { return sig.source_url; } })()}
                            </a>
                          </>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        <span className="font-semibold">Verified: </span>
                        {(() => {
                          if (!verificationAvailable) return <span>Verification unavailable</span>;
                          const vs = verificationStatuses[sig.id];
                          if (!vs) return <span>Not yet verified</span>;
                          return (
                            <>
                              {vs.gates_passed} of {vs.gates_required} gates passed
                              {vs.last_verified_at && ` · Verified ${new Date(vs.last_verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                              {vs.verified_by && ` · ${vs.verified_by}`}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Dismissed info — replaces risk dimensions for dismissed signals */}
                    {isRejected ? (
                      <div className="mt-1 mb-2 py-2 px-3 bg-gray-50 rounded-md border border-gray-200">
                        <div className="text-xs text-navy font-semibold">
                          Dismissed: {sig.dismissed_at ? new Date(sig.dismissed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          {' — '}
                          <span className="font-normal text-slate_ui">{sig.dismissed_reason || 'No reason provided'}</span>
                        </div>
                        {sig.dismissed_by && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Dismissed by: {sig.dismissed_by}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Risk dimension selectors — only for active signals */
                      <div className="flex flex-col gap-[5px] mb-2 mt-1">
                        {(['revenue', 'liability', 'cost', 'operational', 'workforce'] as const).map(dim => {
                          const current = getRiskLevel(sig, dim);
                          const dimSaved = savedDim[`${sig.id}_${dim}`];
                          const isAiSuggested = aiSuggested[sig.id]?.[dim];
                          return (
                            <div key={dim} className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold w-[72px] capitalize" style={{ color: DIM_COLORS[dim] }}>
                                {dim}
                              </span>
                              {isAiSuggested && (
                                <span className="text-[8px] font-bold text-gold bg-[#FFF8E1] py-px px-[5px] rounded-md shrink-0">
                                  AI
                                </span>
                              )}
                              <div className="flex gap-[3px]">
                                {LEVELS.map(level => {
                                  const isActive = current === level;
                                  const levelColor = level === 'none' ? '#9CA3AF' : (RISK_COLORS[level] || '#6B7280');
                                  const btn = (
                                    <button onClick={() => setRiskLevel(sig, dim, level)}
                                      className="py-0.5 px-2 rounded-[10px] text-[9px] font-semibold cursor-pointer"
                                      style={{
                                        background: isActive ? levelColor : 'transparent',
                                        color: isActive ? '#fff' : '#9CA3AF',
                                        border: `1px solid ${isActive ? levelColor : '#E5E7EB'}`,
                                      }}>
                                      {LEVEL_LABELS[level]}
                                    </button>
                                  );
                                  return isActive ? (
                                    <RiskLevelTooltip key={level} dimension={dim} level={level}>{btn}</RiskLevelTooltip>
                                  ) : <span key={level}>{btn}</span>;
                                })}
                              </div>
                              {dimSaved && (
                                <span className="text-[10px] text-emerald-600 font-semibold shrink-0 transition-opacity duration-300">
                                  Saved
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* All-none warning */}
                    {!isRejected && isAllNone(sig) && (
                      <div className="text-[10px] text-amber-600 bg-amber-50 py-1 px-2.5 rounded-md mb-1.5">
                        No risk dimensions assigned — this signal will not appear under any dimension in the Intelligence Center.
                      </div>
                    )}

                    {/* Meta */}
                    <div className="text-[10px] text-gray-400">
                      {sig.source_key && <span>{sig.source_key} · </span>}
                      {sig.counties_affected && sig.counties_affected.length > 0 && <span>{sig.counties_affected.join(', ')} · </span>}
                      {sig.target_counties && sig.target_counties.length > 0 && !sig.counties_affected?.length && <span>{sig.target_counties.join(', ')} · </span>}
                      {new Date(sig.created_at).toLocaleDateString()}
                      {sig.routing_reason && <span> · {sig.routing_reason}</span>}
                    </div>
                  </div>

                  {/* SIGNAL-VALIDATION-01: 6 Action Buttons */}
                  <div className="flex flex-col gap-[5px] shrink-0" onClick={e => e.stopPropagation()}>
                    {isRejected ? (
                      <Button variant="primary" size="sm" onClick={() => restoreSignal(sig)}
                        className="!bg-emerald-600 !hover:bg-emerald-700">
                        Restore
                      </Button>
                    ) : (
                      <>
                        {/* 1. Approve & Publish */}
                        {(() => {
                          const vs = verificationStatuses[sig.id];
                          const blocked = vs?.publish_blocked ?? true;
                          return (
                            <Button variant="primary" size="sm" onClick={() => publishSignal(sig)} disabled={publishing === sig.id || blocked}
                              className={blocked ? '!bg-gray-200 !text-gray-400' : '!bg-emerald-600'}>
                              {publishing === sig.id ? 'Publishing...' : blocked ? `${vs?.gates_passed || 0}/${vs?.gates_required || '?'} gates` : 'Approve & Publish'}
                            </Button>
                          );
                        })()}
                        {/* 2. Approve for Subset */}
                        <Button variant="secondary" size="sm" onClick={() => setSubsetModal({ signalId: sig.id })}
                          className="!bg-orange-50 !text-orange-700 !border-orange-300">
                          Approve Subset
                        </Button>
                        {/* 3. Edit & Approve */}
                        <Button variant="secondary" size="sm" onClick={() => { setExpandedSignalId(sig.id); setReviewTab('content');
                          setEditFormExtended({ title: sig.title || '', summary: sig.ai_summary || sig.content_summary || '', detail_markdown: sig.detail_markdown || '', recommended_action: sig.recommended_action || '' });
                        }}
                          className="!bg-blue-50 !text-blue-600 !border-blue-200">
                          Edit & Approve
                        </Button>
                        {/* 4. Send Preview */}
                        <Button variant="secondary" size="sm" onClick={() => sendPreview(sig.id)} disabled={sendingPreview === sig.id || sig.preview_sent}
                          className={sig.preview_sent ? '!text-emerald-600 !border-emerald-600' : ''}>
                          {sig.preview_sent ? 'Preview Sent' : sendingPreview === sig.id ? 'Sending...' : 'Send Preview'}
                        </Button>
                        {/* 5. Reject */}
                        <Button variant="secondary" size="sm" onClick={() => openRejectModal(sig)}
                          className="!bg-red-50 !text-red-600 !border-red-200">
                          Reject
                        </Button>
                        {/* 6. Hold */}
                        <Button variant="secondary" size="sm" onClick={() => holdSignal(sig.id)} disabled={sig.routing_tier === 'hold'}
                          className="!text-gray-400">
                          {sig.routing_tier === 'hold' ? 'On Hold' : 'Hold'}
                        </Button>
                        {/* Verification gates */}
                        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setExpandedVerification(expandedVerification === sig.id ? null : sig.id); }}
                          className="!text-slate_ui">
                          {expandedVerification === sig.id ? 'Hide Gates' : 'Verify Gates'}
                        </Button>
                        {/* E2E-FIX-01: Manual classify button for unclassified signals */}
                        {isAllNone(sig) && (
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); classifySingle(sig); }}
                            disabled={classifyingId === sig.id}
                            isLoading={classifyingId === sig.id}>
                            {classifyingId === sig.id ? 'Classifying...' : '\u2726 Classify'}
                          </Button>
                        )}
                      </>
                    )}
                    {sig.source_url && (
                      <a href={sig.source_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="text-[10px] text-slate_ui text-center underline">
                        Source
                      </a>
                    )}
                  </div>
                </div>

                {/* Verification Panel (expanded) */}
                {!isRejected && expandedVerification === sig.id && (
                  <div className="mt-3" onClick={e => e.stopPropagation()}>
                    <VerificationPanel
                      contentTable="intelligence_signals"
                      contentId={sig.id}
                      contentType={sig.signal_type || 'recall'}
                      contentTitle={sig.title}
                      onVerificationChange={loadQueue}
                    />
                  </div>
                )}

                {/* SIGNAL-VALIDATION-01: Review Panel with 4 Tabs */}
                {expandedSignalId === sig.id && !isRejected && (
                  <div className="mt-4 border-t border-border_ui pt-4" onClick={e => e.stopPropagation()}>
                    {/* Tab pills */}
                    <div className="flex gap-1.5 mb-3">
                      {(['content', 'source', 'preview', 'gameplan'] as const).map(t => (
                        <button key={t} onClick={() => setReviewTab(t)}
                          className={`py-1 px-3 rounded-[14px] text-[10px] font-semibold cursor-pointer border ${
                            reviewTab === t ? 'bg-gold text-white border-gold' : 'bg-white text-gray-400 border-border_ui'
                          }`}>
                          {{ content: 'Signal Content', source: 'Source & AI', preview: 'Operator Preview', gameplan: 'Game Plan' }[t]}
                        </button>
                      ))}
                    </div>

                    {/* Tab 1: Signal Content */}
                    {reviewTab === 'content' && (
                      <div className="flex flex-col gap-2.5">
                        <div>
                          <label className="text-[10px] font-semibold text-slate_ui block mb-[3px]">Title</label>
                          <input value={editFormExtended.title} onChange={e => setEditFormExtended(p => ({ ...p, title: e.target.value }))}
                            className="w-full py-1.5 px-2.5 text-xs border border-border_ui rounded-md text-navy outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate_ui block mb-[3px]">Summary</label>
                          <textarea value={editFormExtended.summary} onChange={e => setEditFormExtended(p => ({ ...p, summary: e.target.value }))} rows={3}
                            className="w-full py-1.5 px-2.5 text-xs border border-border_ui rounded-md text-navy resize-y outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate_ui block mb-[3px]">Detail (Markdown)</label>
                          <textarea value={editFormExtended.detail_markdown} onChange={e => setEditFormExtended(p => ({ ...p, detail_markdown: e.target.value }))} rows={4}
                            className="w-full py-1.5 px-2.5 text-xs border border-border_ui rounded-md text-navy resize-y outline-none font-mono" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate_ui block mb-[3px]">Recommended Action</label>
                          <textarea value={editFormExtended.recommended_action} onChange={e => setEditFormExtended(p => ({ ...p, recommended_action: e.target.value }))} rows={2}
                            className="w-full py-1.5 px-2.5 text-xs border border-border_ui rounded-md text-navy resize-y outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate_ui block mb-[3px]">Arthur&apos;s Notes</label>
                          <textarea value={arthurNotes[sig.id] || ''} onChange={e => setArthurNotes(prev => ({ ...prev, [sig.id]: e.target.value }))} rows={2}
                            placeholder="Internal notes about this signal..."
                            className="w-full py-1.5 px-2.5 text-xs border border-border_ui rounded-md text-navy resize-y outline-none" />
                          <Button variant="gold" size="sm" onClick={() => saveArthurNotes(sig.id)} disabled={savingNotes === sig.id}
                            isLoading={savingNotes === sig.id} className="mt-1">
                            {savingNotes === sig.id ? 'Saving...' : 'Save Notes'}
                          </Button>
                        </div>
                        {/* Save & Publish from content tab */}
                        <div className="flex gap-2 mt-1">
                          <Button variant="primary" size="sm" onClick={async () => {
                            const updates: Record<string, any> = {};
                            if (editFormExtended.title.trim()) updates.title = editFormExtended.title.trim();
                            if (editFormExtended.summary.trim()) updates.content_summary = editFormExtended.summary.trim();
                            if (editFormExtended.detail_markdown.trim()) updates.detail_markdown = editFormExtended.detail_markdown.trim();
                            if (editFormExtended.recommended_action.trim()) updates.recommended_action = editFormExtended.recommended_action.trim();
                            updates.edit_count = (sig.edit_count || 0) + 1;
                            if (Object.keys(updates).length > 1) {
                              await supabase.from('intelligence_signals').update(updates).eq('id', sig.id);
                              await logReviewAction(sig.id, 'edit_approve', null, updates);
                              setSignals(prev => prev.map(s => s.id === sig.id ? { ...s, ...updates } : s));
                            }
                            publishSignal({ ...sig, ...updates });
                            setExpandedSignalId(null);
                          }}
                            className="!bg-emerald-600">
                            Save & Publish
                          </Button>
                          <Button variant="secondary" size="sm" onClick={async () => {
                            const updates: Record<string, any> = {};
                            if (editFormExtended.title.trim()) updates.title = editFormExtended.title.trim();
                            if (editFormExtended.summary.trim()) updates.content_summary = editFormExtended.summary.trim();
                            if (editFormExtended.detail_markdown.trim()) updates.detail_markdown = editFormExtended.detail_markdown.trim();
                            if (editFormExtended.recommended_action.trim()) updates.recommended_action = editFormExtended.recommended_action.trim();
                            updates.edit_count = (sig.edit_count || 0) + 1;
                            if (Object.keys(updates).length > 1) {
                              await supabase.from('intelligence_signals').update(updates).eq('id', sig.id);
                              await logReviewAction(sig.id, 'edit', null, updates);
                              setSignals(prev => prev.map(s => s.id === sig.id ? { ...s, ...updates } : s));
                              toast.success('Signal saved');
                            }
                          }}
                            className="!bg-blue-50 !text-blue-600 !border-blue-200">
                            Save Only
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Source & AI Analysis */}
                    {reviewTab === 'source' && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="font-bold text-navy mb-2">Source</div>
                          <div className="text-slate_ui mb-1"><strong>Name:</strong> {sig.source_name || '—'}</div>
                          <div className="text-slate_ui mb-1"><strong>Key:</strong> {sig.source_key || '—'}</div>
                          {sig.source_url && (
                            <div className="mb-1">
                              <strong className="text-slate_ui">URL:</strong>{' '}
                              <a href={sig.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                {(() => { try { return new URL(sig.source_url).hostname; } catch { return sig.source_url; } })()}
                              </a>
                            </div>
                          )}
                          {sig.original_url && sig.original_url !== sig.source_url && (
                            <div className="text-slate_ui mb-1"><strong>Original:</strong>{' '}
                              <a href={sig.original_url} target="_blank" rel="noopener noreferrer" className="text-blue-600">{sig.original_url}</a>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-navy mb-2">AI Analysis</div>
                          <div className="text-slate_ui mb-1"><strong>Urgency:</strong> {sig.ai_urgency || '—'}</div>
                          <div className="text-slate_ui mb-1"><strong>Confidence:</strong> {sig.confidence_score != null ? `${sig.confidence_score}%` : '—'}</div>
                          <div className="text-slate_ui mb-1"><strong>Severity:</strong> {sig.severity_score || '—'}</div>
                          <div className="text-slate_ui mb-1"><strong>Routing:</strong> {sig.routing_tier || '—'}{sig.routing_reason ? ` — ${sig.routing_reason}` : ''}</div>
                          <div className="text-slate_ui mb-1"><strong>Scope:</strong> {sig.scope || '—'}</div>
                          {sig.ai_summary && (
                            <div className="mt-2 py-2 px-2.5 bg-gray-50 rounded-md text-[11px] text-slate_ui leading-normal">
                              <strong>AI Summary:</strong> {sig.ai_summary}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Operator Preview */}
                    {reviewTab === 'preview' && (
                      <div className="relative max-w-[480px]">
                        <div className="absolute top-2 right-2 text-[9px] font-extrabold text-amber-600 bg-amber-50 py-0.5 px-2 rounded-md z-[1] border border-amber-200">
                          PREVIEW
                        </div>
                        <div className="bg-white border border-border_ui rounded-[10px] py-4 px-[18px]">
                          <div className="flex gap-1.5 mb-2 flex-wrap">
                            <span className="text-[10px] font-bold py-0.5 px-2 rounded-[10px] uppercase" style={{ background: URGENCY_COLORS[sig.ai_urgency || 'low']?.bg || '#F9FAFB', color: URGENCY_COLORS[sig.ai_urgency || 'low']?.text || '#6B7280' }}>
                              {sig.ai_urgency || 'low'}
                            </span>
                            <span className="text-[10px] font-semibold py-0.5 px-2 rounded-[10px] bg-gray-100 text-gray-400">
                              {sig.signal_type?.replace(/_/g, ' ') || 'intelligence'}
                            </span>
                          </div>
                          <div className="text-[15px] font-bold text-navy mb-1.5">{editFormExtended.title || sig.title}</div>
                          <div className="text-xs text-slate_ui leading-relaxed mb-2">{editFormExtended.summary || sig.content_summary || sig.ai_summary || ''}</div>
                          {(editFormExtended.recommended_action || sig.recommended_action) && (
                            <div className="text-[11px] text-navy bg-green-50 py-2 px-2.5 rounded-md mb-2">
                              <strong>Action:</strong> {editFormExtended.recommended_action || sig.recommended_action}
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400">{new Date(sig.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                      </div>
                    )}

                    {/* Tab 4: Game Plan */}
                    {reviewTab === 'gameplan' && (
                      <div>
                        {gamePlanLoading === sig.id ? (
                          <div className="p-5 text-center text-xs text-gray-400">Loading game plans...</div>
                        ) : !gamePlans[sig.id] || gamePlans[sig.id].length === 0 ? (
                          <div className="py-5 px-4 text-center bg-[#FAFAF8] border-[1.5px] border-dashed border-border_ui rounded-lg">
                            <div className="text-[13px] font-semibold text-navy mb-1">No game plan linked</div>
                            <div className="text-[11px] text-slate_ui">Game plans are auto-generated during AI triage or can be created manually.</div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2.5">
                            {gamePlans[sig.id].map(gp => (
                              <div key={gp.id} className="border border-border_ui rounded-lg py-3 px-3.5">
                                <div className="text-[13px] font-bold text-navy mb-1">{gp.title}</div>
                                {gp.description && <div className="text-[11px] text-slate_ui mb-2">{gp.description}</div>}
                                <div className="flex gap-1.5 mb-2">
                                  <span className={`text-[9px] font-semibold py-0.5 px-2 rounded-[10px] ${
                                    gp.priority === 'critical' ? 'bg-red-50 text-red-600' : gp.priority === 'high' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'
                                  }`}>
                                    {gp.priority}
                                  </span>
                                  <span className="text-[9px] font-semibold py-0.5 px-2 rounded-[10px] bg-gray-100 text-slate_ui">
                                    {gp.status}
                                  </span>
                                </div>
                                {/* Tasks */}
                                {Array.isArray(gp.tasks) && gp.tasks.length > 0 && (
                                  <div className="flex flex-col gap-1">
                                    {gp.tasks.map((task: any, ti: number) => {
                                      const taskId = task.id || String(ti);
                                      const taskStatus = gp.task_status?.[taskId] || 'pending';
                                      return (
                                        <div key={taskId} className="flex items-center gap-1.5 text-[11px]">
                                          <button onClick={async () => {
                                            const newStatus = taskStatus === 'completed' ? 'pending' : 'completed';
                                            const updatedTaskStatus = { ...gp.task_status, [taskId]: newStatus };
                                            await supabase.from('intelligence_game_plans').update({ task_status: updatedTaskStatus }).eq('id', gp.id);
                                            setGamePlans(prev => ({
                                              ...prev,
                                              [sig.id]: prev[sig.id].map(p => p.id === gp.id ? { ...p, task_status: updatedTaskStatus } : p),
                                            }));
                                          }}
                                            className={`w-4 h-4 rounded-[3px] cursor-pointer flex items-center justify-center text-white text-[10px] shrink-0 border ${
                                              taskStatus === 'completed' ? 'border-emerald-600 bg-emerald-600' : 'border-border_ui bg-white'
                                            }`}>
                                            {taskStatus === 'completed' ? '\u2713' : ''}
                                          </button>
                                          <span className={taskStatus === 'completed' ? 'text-gray-400 line-through' : 'text-navy'}>
                                            {task.title || task}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {/* Add task */}
                                <div className="flex gap-1.5 mt-2">
                                  <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="Add a task..."
                                    className="flex-1 py-1 px-2 text-[11px] border border-border_ui rounded outline-none" />
                                  <Button variant="gold" size="sm" onClick={async () => {
                                    if (!newTaskText.trim()) return;
                                    const newTask = { id: crypto.randomUUID(), title: newTaskText.trim() };
                                    const updatedTasks = [...(gp.tasks || []), newTask];
                                    await supabase.from('intelligence_game_plans').update({ tasks: updatedTasks }).eq('id', gp.id);
                                    setGamePlans(prev => ({
                                      ...prev,
                                      [sig.id]: prev[sig.id].map(p => p.id === gp.id ? { ...p, tasks: updatedTasks } : p),
                                    }));
                                    setNewTaskText('');
                                  }}>
                                    Add
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SIGNAL-VALIDATION-01: Reject reason modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]"
          onClick={() => setRejectModal(null)}
        >
          <div
            className="bg-white rounded-xl py-6 px-7 max-w-[420px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-navy m-0 mb-1">
              Reject Signal
            </h3>
            <p className="text-xs text-slate_ui m-0 mb-4">
              Select a reason for rejecting this signal. It can be restored later.
            </p>

            <label className="text-[11px] font-semibold text-slate_ui block mb-1">
              Reason *
            </label>
            <select
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full py-2 px-3 text-[13px] border border-border_ui rounded-md bg-gray-50 text-navy cursor-pointer mb-3"
            >
              <option value="">Select a reason...</option>
              {REJECT_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <label className="text-[11px] font-semibold text-slate_ui block mb-1">
              Note {rejectReason === 'Other' ? '*' : '(optional)'}
            </label>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value.slice(0, 280))}
              placeholder={rejectReason === 'Other' ? 'Required — describe the reason...' : 'Optional note...'}
              rows={3}
              className="w-full py-2 px-3 text-xs border border-border_ui rounded-md bg-gray-50 text-navy resize-y"
            />
            <div className="text-[10px] text-gray-400 text-right mt-0.5 mb-4">
              {rejectNote.length}/280
            </div>

            <div className="flex gap-2.5 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRejectModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmReject}
                disabled={!rejectReason || (rejectReason === 'Other' && rejectNote.length < 1)}
              >
                Reject Signal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SIGNAL-VALIDATION-01: Subset targeting modal */}
      {subsetModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]"
          onClick={() => setSubsetModal(null)}
        >
          <div
            className="bg-white rounded-xl py-6 px-7 max-w-[480px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-navy m-0 mb-1">
              Approve for Subset
            </h3>
            <p className="text-xs text-slate_ui m-0 mb-4">
              Enter organization IDs to target this signal to specific operators.
            </p>

            <label className="text-[11px] font-semibold text-slate_ui block mb-1">
              Organization IDs (comma-separated UUIDs)
            </label>
            <textarea
              value={subsetOrgIds.join(', ')}
              onChange={e => setSubsetOrgIds(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              rows={3}
              placeholder="org-uuid-1, org-uuid-2, ..."
              className="w-full py-2 px-3 text-xs border border-border_ui rounded-md bg-gray-50 text-navy resize-y font-mono"
            />
            <div className="text-[10px] text-gray-400 mt-1 mb-4">
              {subsetOrgIds.length} organization{subsetOrgIds.length !== 1 ? 's' : ''} targeted
            </div>

            <div className="flex gap-2.5 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSubsetModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const sig = signals.find(s => s.id === subsetModal.signalId);
                  if (sig) publishForSubset(sig, subsetOrgIds);
                }}
                disabled={subsetOrgIds.length === 0 || publishing === subsetModal.signalId}
                isLoading={publishing === subsetModal.signalId}
                className="!bg-orange-700"
              >
                {publishing === subsetModal.signalId ? 'Publishing...' : `Publish to ${subsetOrgIds.length} Org${subsetOrgIds.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT-FIX-06 / P-2: Create Signal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-xl py-6 px-7 max-w-[520px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-navy m-0 mb-1">
              Create Signal
            </h3>
            <p className="text-xs text-slate_ui m-0 mb-4">
              Manually create a new intelligence signal for review and publishing.
            </p>

            <div className="flex flex-col gap-3">
              {/* Title */}
              <div>
                <label className="text-[11px] font-semibold text-slate_ui block mb-1">Title *</label>
                <input
                  value={createForm.title}
                  onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Signal title..."
                  className="w-full py-2 px-3 text-[13px] border border-border_ui rounded-md text-navy outline-none"
                />
              </div>

              {/* Summary */}
              <div>
                <label className="text-[11px] font-semibold text-slate_ui block mb-1">Summary</label>
                <textarea
                  value={createForm.summary}
                  onChange={e => setCreateForm(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Brief summary..."
                  rows={3}
                  className="w-full py-2 px-3 text-[13px] border border-border_ui rounded-md text-navy resize-y outline-none"
                />
              </div>

              {/* Detail */}
              <div>
                <label className="text-[11px] font-semibold text-slate_ui block mb-1">Detail / Body</label>
                <textarea
                  value={createForm.detail_markdown}
                  onChange={e => setCreateForm(prev => ({ ...prev, detail_markdown: e.target.value }))}
                  placeholder="Full detail (markdown supported)..."
                  rows={4}
                  className="w-full py-2 px-3 text-[13px] border border-border_ui rounded-md text-navy resize-y outline-none"
                />
              </div>

              {/* Signal Type + Category row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate_ui block mb-1">Signal Type</label>
                  <select
                    value={createForm.signal_type}
                    onChange={e => setCreateForm(prev => ({ ...prev, signal_type: e.target.value }))}
                    className="w-full py-2 px-3 text-[13px] border border-border_ui rounded-md text-navy cursor-pointer"
                  >
                    <option value="intelligence">Intelligence</option>
                    <option value="game_plan">Game Plan</option>
                    <option value="outbreak">Outbreak</option>
                    <option value="regulatory_change">Regulatory Change</option>
                    <option value="vendor_intelligence">Vendor Intelligence</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate_ui block mb-1">Category</label>
                  <select
                    value={createForm.category}
                    onChange={e => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full py-2 px-3 text-[13px] border border-border_ui rounded-md text-navy cursor-pointer"
                  >
                    <option value="food_safety">Food Safety</option>
                    <option value="recall">Recall</option>
                    <option value="allergen_alert">Allergen Alert</option>
                    <option value="regulatory_updates">Regulatory Update</option>
                    <option value="fire_safety">Fire Safety</option>
                    <option value="outbreak_alert">Health Alert</option>
                    <option value="workforce_risk">Workforce Risk</option>
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-[11px] font-semibold text-slate_ui block mb-1">Priority</label>
                <select
                  value={createForm.priority}
                  onChange={e => setCreateForm(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full py-2 px-3 text-[13px] border border-border_ui rounded-md text-navy cursor-pointer"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 justify-end mt-5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={createSignal}
                disabled={creating || !createForm.title.trim()}
                isLoading={creating}
              >
                {creating ? 'Creating...' : 'Create Signal'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {lastRejected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy text-white py-3 px-6 rounded-[10px] text-[13px] font-semibold flex items-center gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)] z-[1001]">
          <span>Signal rejected.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={undoReject}
            className="!text-white !border !border-white/40"
          >
            Undo
          </Button>
        </div>
      )}
    </div>
  );
}
