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
import VerificationPanel from '../../components/admin/VerificationPanel';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E5E0D8';

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
}

type TabFilter = 'all' | 'hold' | 'notify' | 'dismissed';

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
};

const LEVELS = ['critical', 'high', 'medium', 'low', 'none'] as const;
const LEVEL_LABELS: Record<string, string> = { critical: 'Crit', high: 'High', medium: 'Med', low: 'Low', none: 'None' };

const DISMISS_REASONS = [
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [signals, setSignals] = useState<QueueSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TabFilter>('all');
  const [dimFilter, setDimFilter] = useState<'' | 'revenue' | 'liability' | 'cost' | 'operational'>('');
  const [pillarFilter, setPillarFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [publishing, setPublishing] = useState<string | null>(null);
  const [riskEdits, setRiskEdits] = useState<Record<string, { revenue: string; liability: string; cost: string; operational: string }>>({});
  const [expandedVerification, setExpandedVerification] = useState<string | null>(null);
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, {
    verification_status: string; publish_blocked: boolean;
    gates_passed: number; gates_required: number;
    last_verified_at?: string; verified_by?: string;
  }>>({});
  const [verificationAvailable, setVerificationAvailable] = useState(true);

  // Saved flash state — key is `${signalId}_${dim}`
  const [savedDim, setSavedDim] = useState<Record<string, boolean>>({});

  // AI suggestion tracking: { signalId: { dim: true } }
  const [aiSuggested, setAiSuggested] = useState<Record<string, Record<string, boolean>>>({});
  const aiClassifiedRef = useRef<Set<string>>(new Set());

  // Dismiss modal state
  const [dismissModal, setDismissModal] = useState<{ signalId: string; previousTier: RoutingTier | null } | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [dismissNote, setDismissNote] = useState('');

  // Undo toast state
  const [lastDismissed, setLastDismissed] = useState<{ id: string; previousTier: RoutingTier | null; signal: QueueSignal } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restored flash
  const [restoredId, setRestoredId] = useState<string | null>(null);

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

      for (const result of data.results as Array<{ id: string; revenue_risk_level: string; liability_risk_level: string; cost_risk_level: string; operational_risk_level: string }>) {
        const r = result.revenue_risk_level;
        const l = result.liability_risk_level;
        const c = result.cost_risk_level;
        const o = result.operational_risk_level;

        // Optimistic update
        setRiskEdits(prev => ({
          ...prev,
          [result.id]: { revenue: r, liability: l, cost: c, operational: o },
        }));
        setAiSuggested(prev => ({
          ...prev,
          [result.id]: { revenue: true, liability: true, cost: true, operational: true },
        }));

        // Save to Supabase
        await supabase.from('intelligence_signals').update({
          revenue_risk_level: r,
          liability_risk_level: l,
          cost_risk_level: c,
          operational_risk_level: o,
        }).eq('id', result.id);
      }
    } catch {
      // Silent fail — leave buttons unset
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('is_published', false)
      .order('routing_tier', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) console.error('[SignalQueue] load error:', error.message);
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
               isUnset(sig.cost_risk_level) && isUnset(sig.operational_risk_level);
      }).slice(0, 5);
      if (needsAI.length > 0) {
        needsAI.forEach((sig: QueueSignal) => aiClassifiedRef.current.add(sig.id));
        classifySignals(needsAI);
      }
    }
    setLoading(false);
  }, [classifySignals]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); };
  }, []);

  const getRiskLevel = (sig: QueueSignal, dim: 'revenue' | 'liability' | 'cost' | 'operational'): string => {
    if (riskEdits[sig.id]) return riskEdits[sig.id][dim];
    return normLevel(sig[`${dim}_risk_level` as keyof QueueSignal] as string);
  };

  const setRiskLevel = async (sig: QueueSignal, dim: 'revenue' | 'liability' | 'cost' | 'operational', level: string) => {
    // Optimistic update
    setRiskEdits(prev => ({
      ...prev,
      [sig.id]: {
        revenue: prev[sig.id]?.revenue ?? normLevel(sig.revenue_risk_level),
        liability: prev[sig.id]?.liability ?? normLevel(sig.liability_risk_level),
        cost: prev[sig.id]?.cost ?? normLevel(sig.cost_risk_level),
        operational: prev[sig.id]?.operational ?? normLevel(sig.operational_risk_level),
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
    return (['revenue', 'liability', 'cost', 'operational'] as const).every(d => getRiskLevel(sig, d) === 'none');
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
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .eq('id', sig.id);
    if (error) {
      console.error(`Failed to publish: ${error.message}`);
    } else {
      setSignals(prev => prev.filter(s => s.id !== sig.id));
      setRiskEdits(prev => { const next = { ...prev }; delete next[sig.id]; return next; });
      try {
        await supabase.functions.invoke('intelligence-deliver', {
          body: { type: 'signal', id: sig.id },
        });
      } catch {}
    }
    setPublishing(null);
  };

  // Open dismiss modal
  const openDismissModal = (sig: QueueSignal) => {
    setDismissModal({ signalId: sig.id, previousTier: sig.routing_tier });
    setDismissReason('');
    setDismissNote('');
  };

  // Confirm dismiss with reason
  const confirmDismiss = async () => {
    if (!dismissModal || !dismissReason) return;
    if (dismissReason === 'Other' && dismissNote.length < 1) return;

    const sig = signals.find(s => s.id === dismissModal.signalId);
    if (!sig) return;

    const fullReason = dismissReason === 'Other' ? `Other: ${dismissNote}` : dismissReason;

    // Optimistic update
    setSignals(prev => prev.map(s =>
      s.id === dismissModal.signalId
        ? { ...s, status: 'dismissed', dismissed_reason: fullReason, dismissed_at: new Date().toISOString(), dismissed_by: user?.email || 'admin' }
        : s
    ));
    setDismissModal(null);

    // Start undo timer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setLastDismissed({ id: sig.id, previousTier: sig.routing_tier, signal: sig });
    undoTimerRef.current = setTimeout(() => {
      setLastDismissed(null);
    }, 6000);

    // Persist
    await supabase
      .from('intelligence_signals')
      .update({
        status: 'dismissed',
        dismissed_reason: fullReason,
        dismissed_at: new Date().toISOString(),
        dismissed_by: user?.email || 'admin',
      })
      .eq('id', dismissModal.signalId);
  };

  // Undo dismiss
  const undoDismiss = async () => {
    if (!lastDismissed) return;
    const { id, signal } = lastDismissed;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setLastDismissed(null);

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
  };

  // Split signals
  const activeSignals = signals.filter(s => s.status !== 'dismissed');
  const dismissedSignals = signals.filter(s => s.status === 'dismissed');

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
  const filtered = (filter === 'dismissed' ? dismissedSignals : activeSignals).filter(s => {
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
  const dismissedCount = dismissedSignals.length;
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

  const isDismissedTab = filter === 'dismissed';

  const pillStyle = (active: boolean, color: string = NAVY): React.CSSProperties => ({
    padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    background: active ? color : '#fff',
    color: active ? '#fff' : TEXT_SEC,
    border: `1px solid ${active ? color : BORDER}`,
  });

  const smallPillStyle = (active: boolean, color: string = GOLD): React.CSSProperties => ({
    padding: '3px 10px', borderRadius: 14, fontSize: 10, fontWeight: 600, cursor: 'pointer',
    background: active ? color : '#fff',
    color: active ? '#fff' : TEXT_MUTED,
    border: `1px solid ${active ? color : BORDER}`,
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>
          Signal Approval Queue
        </h1>
        <p style={{ fontSize: 13, color: TEXT_SEC, margin: 0 }}>
          Review and publish intelligence signals to client feeds. Sorted by severity.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Pending', value: activeSignals.length, color: NAVY },
          { label: 'Revenue', value: revenueCount, color: '#DC2626' },
          { label: 'Liability', value: liabilityCount, color: '#7C3AED' },
          { label: 'Cost + Ops', value: costOpsCount, color: '#D97706' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {([
          { key: 'all' as TabFilter, label: `All (${activeSignals.length})` },
          { key: 'hold' as TabFilter, label: `Hold (${holdCount})` },
          { key: 'notify' as TabFilter, label: `Notify (${notifyCount})` },
          { key: 'dismissed' as TabFilter, label: `Dismissed (${dismissedCount})` },
        ]).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={pillStyle(filter === f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* CIC Pillar filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pillar:</span>
        <button onClick={() => setPillarFilter('')} style={smallPillStyle(pillarFilter === '')}>
          All Pillars
        </button>
        {CIC_PILLARS.map(p => (
          <button key={p.id} onClick={() => setPillarFilter(p.id)}
            style={{
              padding: '3px 10px', borderRadius: 14, fontSize: 10, fontWeight: 600, cursor: 'pointer',
              background: pillarFilter === p.id ? p.color : '#fff',
              color: pillarFilter === p.id ? '#fff' : TEXT_MUTED,
              border: `1px solid ${pillarFilter === p.id ? p.color : BORDER}`,
            }}>
            {p.shortLabel}
          </button>
        ))}
      </div>

      {/* Risk dimension filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Risk:</span>
        {([
          { key: '' as const, label: 'All' },
          { key: 'revenue' as const, label: 'Revenue' },
          { key: 'liability' as const, label: 'Liability' },
          { key: 'cost' as const, label: 'Cost' },
          { key: 'operational' as const, label: 'Operational' },
        ]).map(f => (
          <button key={f.key} onClick={() => setDimFilter(f.key)} style={smallPillStyle(dimFilter === f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type:</span>
        {CATEGORY_OPTIONS.map(f => (
          <button key={f.key} onClick={() => setCategoryFilter(f.key)} style={smallPillStyle(categoryFilter === f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date:</span>
        {DATE_OPTIONS.map(f => (
          <button key={f.key} onClick={() => setDateFilter(f.key)} style={smallPillStyle(dateFilter === f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Signal cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 80, background: '#E5E7EB', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', background: '#FAFAF8', border: '1.5px dashed #E5E0D8', borderRadius: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
            {isDismissedTab ? 'No dismissed signals' : 'Queue is clear'}
          </div>
          <div style={{ fontSize: 12, color: TEXT_SEC, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
            {isDismissedTab
              ? 'Dismissed signals will appear here. Use the Restore button to return them to the review queue.'
              : 'No signals pending review. New signals will appear here when the intelligence crawler detects changes.'
            }
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(sig => {
            const uc = URGENCY_COLORS[sig.ai_urgency || 'low'] || URGENCY_COLORS.low;
            const rc = sig.routing_tier ? routingTierColor(sig.routing_tier) : null;
            const isDismissed = sig.status === 'dismissed';
            const isRestored = restoredId === sig.id;

            if (isRestored) {
              return (
                <div key={sig.id} style={{
                  background: '#ECFDF5', border: '1px solid #059669', borderRadius: 10, padding: '16px 18px',
                  textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#059669',
                }}>
                  Restored — signal returned to review queue
                </div>
              );
            }

            return (
              <div key={sig.id} style={{
                background: isDismissed ? '#FAFAF8' : '#fff',
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: '16px 18px',
                borderLeft: isDismissed ? `4px solid ${TEXT_MUTED}`
                  : sig.routing_tier === 'hold' ? '4px solid #DC2626'
                  : sig.routing_tier === 'notify' ? '4px solid #D97706'
                  : `4px solid ${BORDER}`,
                opacity: isDismissed ? 0.85 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                      {sig.routing_tier && rc && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: rc.bg, color: rc.text }}>
                          {routingTierLabel(sig.routing_tier)}
                        </span>
                      )}
                      {sig.ai_urgency && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: uc.bg, color: uc.text }}>
                          {sig.ai_urgency.toUpperCase()}
                        </span>
                      )}
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
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#F9FAFB', color: TEXT_SEC, border: `1px solid ${BORDER}` }}>
                        {sig.signal_type?.replace(/_/g, ' ')}
                      </span>
                      {sig.severity_score != null && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: TEXT_MUTED }}>
                          Severity: {sig.severity_score}
                        </span>
                      )}
                      {sig.confidence_score != null && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: TEXT_MUTED }}>
                          Confidence: {sig.confidence_score}%
                        </span>
                      )}
                      {isDismissed && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#F3F4F6', color: TEXT_MUTED }}>
                          DISMISSED
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                      {sig.title}
                    </div>

                    {/* Summary */}
                    {(sig.ai_summary || sig.content_summary) && (
                      <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.5, marginBottom: 6 }}>
                        {(sig.ai_summary || sig.content_summary || '').slice(0, 200)}
                        {(sig.ai_summary || sig.content_summary || '').length > 200 ? '...' : ''}
                      </div>
                    )}

                    {/* Source & Verification */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
                      <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                        <span style={{ fontWeight: 600 }}>Source: </span>
                        {sig.source_name || sig.source_key || 'Unknown'}
                        {sig.source_url && (
                          <>
                            {' — '}
                            <a href={sig.source_url} target="_blank" rel="noopener noreferrer"
                              style={{ color: TEXT_SEC, textDecoration: 'underline' }}>
                              {(() => { try { return new URL(sig.source_url).hostname.replace(/^www\./, ''); } catch { return sig.source_url; } })()}
                            </a>
                          </>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                        <span style={{ fontWeight: 600 }}>Verified: </span>
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
                    {isDismissed ? (
                      <div style={{ marginTop: 4, marginBottom: 8, padding: '8px 12px', background: '#F9FAFB', borderRadius: 6, border: `1px solid #E5E7EB` }}>
                        <div style={{ fontSize: 12, color: NAVY, fontWeight: 600 }}>
                          Dismissed: {sig.dismissed_at ? new Date(sig.dismissed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          {' — '}
                          <span style={{ fontWeight: 400, color: TEXT_SEC }}>{sig.dismissed_reason || 'No reason provided'}</span>
                        </div>
                        {sig.dismissed_by && (
                          <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                            Dismissed by: {sig.dismissed_by}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Risk dimension selectors — only for active signals */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8, marginTop: 4 }}>
                        {(['revenue', 'liability', 'cost', 'operational'] as const).map(dim => {
                          const current = getRiskLevel(sig, dim);
                          const dimSaved = savedDim[`${sig.id}_${dim}`];
                          const isAiSuggested = aiSuggested[sig.id]?.[dim];
                          return (
                            <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: DIM_COLORS[dim], width: 72, textTransform: 'capitalize' }}>
                                {dim}
                              </span>
                              {isAiSuggested && (
                                <span style={{ fontSize: 8, fontWeight: 700, color: GOLD, background: '#FFF8E1', padding: '1px 5px', borderRadius: 6, flexShrink: 0 }}>
                                  AI
                                </span>
                              )}
                              <div style={{ display: 'flex', gap: 3 }}>
                                {LEVELS.map(level => {
                                  const isActive = current === level;
                                  const levelColor = level === 'none' ? '#9CA3AF' : (RISK_COLORS[level] || '#6B7280');
                                  return (
                                    <button key={level} onClick={() => setRiskLevel(sig, dim, level)}
                                      style={{
                                        padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 600, cursor: 'pointer',
                                        background: isActive ? levelColor : 'transparent',
                                        color: isActive ? '#fff' : TEXT_MUTED,
                                        border: `1px solid ${isActive ? levelColor : '#E5E7EB'}`,
                                      }}>
                                      {LEVEL_LABELS[level]}
                                    </button>
                                  );
                                })}
                              </div>
                              {dimSaved && (
                                <span style={{ fontSize: 10, color: '#059669', fontWeight: 600, flexShrink: 0, transition: 'opacity 0.3s' }}>
                                  Saved
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* All-none warning */}
                    {!isDismissed && isAllNone(sig) && (
                      <div style={{ fontSize: 10, color: '#D97706', background: '#FFFBEB', padding: '4px 10px', borderRadius: 6, marginBottom: 6 }}>
                        No risk dimensions assigned — this signal will not appear under any dimension in the Intelligence Center.
                      </div>
                    )}

                    {/* Meta */}
                    <div style={{ fontSize: 10, color: TEXT_MUTED }}>
                      {sig.source_key && <span>{sig.source_key} · </span>}
                      {sig.counties_affected && sig.counties_affected.length > 0 && <span>{sig.counties_affected.join(', ')} · </span>}
                      {sig.target_counties && sig.target_counties.length > 0 && !sig.counties_affected?.length && <span>{sig.target_counties.join(', ')} · </span>}
                      {new Date(sig.created_at).toLocaleDateString()}
                      {sig.routing_reason && <span> · {sig.routing_reason}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    {isDismissed ? (
                      /* Restore button for dismissed signals */
                      <button
                        onClick={() => restoreSignal(sig)}
                        style={{
                          padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          background: '#059669', color: '#fff', border: 'none',
                        }}
                      >
                        Restore
                      </button>
                    ) : (
                      /* Normal action buttons for active signals */
                      <>
                        {(() => {
                          const vs = verificationStatuses[sig.id];
                          const blocked = vs?.publish_blocked ?? true;
                          const label = vs
                            ? blocked
                              ? `${vs.gates_passed}/${vs.gates_required} verified`
                              : 'Verified — Publish'
                            : 'Unverified';
                          return (
                            <button
                              onClick={() => publishSignal(sig)}
                              disabled={publishing === sig.id || blocked}
                              style={{
                                padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: blocked ? 'not-allowed' : 'pointer',
                                background: blocked ? '#E5E7EB' : '#059669', color: blocked ? TEXT_MUTED : '#fff', border: 'none',
                                opacity: publishing === sig.id ? 0.5 : 1,
                              }}
                            >
                              {publishing === sig.id ? 'Publishing...' : label}
                            </button>
                          );
                        })()}
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedVerification(expandedVerification === sig.id ? null : sig.id); }}
                          style={{
                            padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                            background: 'transparent', color: TEXT_SEC, border: `1px solid ${BORDER}`,
                          }}
                        >
                          {expandedVerification === sig.id ? 'Hide Gates' : 'Verify Gates'}
                        </button>
                        <button
                          onClick={() => navigate(`/admin/verification?signal=${sig.id}`)}
                          style={{
                            padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                            background: NAVY, color: '#fff', border: 'none',
                          }}
                        >
                          Verify{(() => {
                            const vs = verificationStatuses[sig.id];
                            return vs ? ` (${vs.gates_passed}/${vs.gates_required})` : '';
                          })()}
                        </button>
                        <button
                          onClick={() => openDismissModal(sig)}
                          style={{
                            padding: '6px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: 'transparent', color: TEXT_MUTED, border: `1px solid ${BORDER}`,
                          }}
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    {sig.source_url && (
                      <a href={sig.source_url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 10, color: TEXT_SEC, textAlign: 'center', textDecoration: 'underline' }}>
                        Source
                      </a>
                    )}
                  </div>
                </div>

                {/* Verification Panel (expanded) */}
                {!isDismissed && expandedVerification === sig.id && (
                  <div style={{ marginTop: 12 }}>
                    <VerificationPanel
                      contentTable="intelligence_signals"
                      contentId={sig.id}
                      contentType={sig.signal_type || 'recall'}
                      contentTitle={sig.title}
                      onVerificationChange={loadQueue}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dismiss reason modal */}
      {dismissModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={() => setDismissModal(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, padding: '24px 28px', maxWidth: 420, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 4px' }}>
              Dismiss Signal
            </h3>
            <p style={{ fontSize: 12, color: TEXT_SEC, margin: '0 0 16px' }}>
              Select a reason for dismissing this signal. It can be restored later.
            </p>

            {/* Reason dropdown */}
            <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>
              Reason *
            </label>
            <select
              value={dismissReason}
              onChange={e => setDismissReason(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${BORDER}`,
                borderRadius: 6, background: '#F9FAFB', color: NAVY, cursor: 'pointer', marginBottom: 12,
              }}
            >
              <option value="">Select a reason...</option>
              {DISMISS_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Note field */}
            <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>
              Note {dismissReason === 'Other' ? '*' : '(optional)'}
            </label>
            <textarea
              value={dismissNote}
              onChange={e => setDismissNote(e.target.value.slice(0, 280))}
              placeholder={dismissReason === 'Other' ? 'Required — describe the reason...' : 'Optional note...'}
              rows={3}
              style={{
                width: '100%', padding: '8px 12px', fontSize: 12, border: `1px solid ${BORDER}`,
                borderRadius: 6, background: '#F9FAFB', color: NAVY, resize: 'vertical',
              }}
            />
            <div style={{ fontSize: 10, color: TEXT_MUTED, textAlign: 'right', marginTop: 2, marginBottom: 16 }}>
              {dismissNote.length}/280
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDismissModal(null)}
                style={{
                  padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: 'transparent', color: TEXT_SEC, border: `1px solid ${BORDER}`,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDismiss}
                disabled={!dismissReason || (dismissReason === 'Other' && dismissNote.length < 1)}
                style={{
                  padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: !dismissReason || (dismissReason === 'Other' && dismissNote.length < 1) ? '#E5E7EB' : '#DC2626',
                  color: !dismissReason || (dismissReason === 'Other' && dismissNote.length < 1) ? TEXT_MUTED : '#fff',
                  border: 'none',
                }}
              >
                Dismiss Signal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {lastDismissed && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: NAVY, color: '#fff', padding: '12px 24px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)', zIndex: 1001,
        }}>
          <span>Signal dismissed.</span>
          <button
            onClick={undoDismiss}
            style={{
              background: 'transparent', border: `1px solid rgba(255,255,255,0.4)`, color: '#fff',
              padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
