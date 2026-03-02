/**
 * INTEL-ADMIN — Intelligence Admin Panel
 *
 * Minimal approval queue for Arthur to review AI-written insights.
 * Route: /admin/intelligence
 * Access: isEvidlyAdmin || isDemoMode (super_admin)
 */

import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import {
  Brain,
  CheckCircle2,
  XCircle,
  Pencil,
  ChevronDown,
  ChevronUp,
  Eye,
  Clock,
  AlertTriangle,
  Shield,
  RefreshCw,
  Play,
  Plus,
  Star,
  X,
  ArrowDownToLine,
  Trash2,
  Rocket,
  MapPin,
} from 'lucide-react';
import { setDemoJurisdictionFilter, setDemoClientProfile, INDUSTRY_MULTIPLIERS, type ClientProfile } from '../../lib/businessImpactContext';

// ── Types ────────────────────────────────────────────────────

interface Insight {
  id: string;
  source_id: string;
  source_url: string | null;
  source_type: string;
  category: string;
  impact_level: string;
  urgency: string;
  title: string;
  headline: string;
  summary: string;
  full_analysis: string;
  executive_brief: string;
  action_items: string[];
  affected_pillars: string[];
  affected_counties: string[];
  confidence_score: number;
  tags: string[];
  estimated_cost_impact: { low: number; high: number; currency: string; methodology: string };
  source_name: string;
  market_signal_strength: string;
  status: string;
  is_demo_eligible: boolean;
  demo_priority: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejected_reason: string | null;
  raw_source_data: Record<string, unknown>;
  created_at: string;
  published_at: string | null;
}

interface Stats {
  pending: number;
  published_this_week: number;
  total_live: number;
  last_pipeline_run: string | null;
}

// ── Constants ────────────────────────────────────────────────

const MIDNIGHT_NAVY = '#0B1628';
const BRAND_BLUE = '#1e4d6b';
const BRAND_GOLD = '#d4af37';

const SEVERITY_STYLES: Record<string, { dot: string; bg: string; border: string; label: string }> = {
  critical: { dot: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Critical' },
  high:     { dot: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'High' },
  medium:   { dot: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Medium' },
  low:      { dot: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', label: 'Low' },
};

const CATEGORY_LABELS: Record<string, string> = {
  recall_alert: 'Recall',
  outbreak_alert: 'Outbreak',
  enforcement_surge: 'Enforcement',
  regulatory_change: 'Regulatory',
  inspection_trend: 'Inspection',
  nfpa_update: 'NFPA',
  seasonal_risk: 'Seasonal',
  legislative_update: 'Legislative',
  competitor_activity: 'Competitor',
  weather_risk: 'Weather',
  enforcement_action: 'Enforcement',
  inspector_pattern: 'Inspector',
  benchmark_shift: 'Benchmark',
  concession_advisory: 'NPS Advisory',
  supply_disruption: 'Supply Chain',
  regulatory_advisory: 'Advisory',
};

type TabKey = 'pending' | 'published' | 'manual' | 'demo';

// ── Helpers ──────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── Component ────────────────────────────────────────────────

export function IntelligenceAdmin() {
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const isAdmin = isEvidlyAdmin || isDemoMode;

  const [insights, setInsights] = useState<Insight[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, published_this_week: 0, total_live: 0, last_pipeline_run: null });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editActions, setEditActions] = useState<string[]>([]);

  // Reject state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Publish options (per-card)
  const [publishDemoEligible, setPublishDemoEligible] = useState(false);
  const [publishDemoPriority, setPublishDemoPriority] = useState(0);

  // Manual insight form
  const [manualForm, setManualForm] = useState({
    title: '',
    summary: '',
    category: 'regulatory_change',
    impact_level: 'medium',
    affected_counties: '',
    action_items: [''],
  });

  // ── Data fetching ──────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      if (isDemoMode) {
        // Demo: compute from local data
        return;
      }
      const { data, error } = await supabase.functions.invoke('intelligence-approve', {
        body: { action: 'stats' },
      });
      if (error) throw error;
      if (data) setStats(data as Stats);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  }, [isDemoMode]);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        const { data, error } = await supabase
          .from('intelligence_insights')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        setInsights(data || []);
      } else {
        const { data, error } = await supabase.functions.invoke('intelligence-approve', {
          body: { action: 'list', status: ['pending_review', 'published', 'rejected'], limit: 100 },
        });
        if (error) throw error;
        setInsights(data?.insights || []);
      }
    } catch (err: any) {
      console.error('Failed to load insights:', err);
      const { data } = await supabase
        .from('intelligence_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setInsights(data || []);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (isAdmin) {
      fetchInsights();
      fetchStats();
    }
  }, [isAdmin, fetchInsights, fetchStats]);

  // Compute demo stats from local data
  useEffect(() => {
    if (!isDemoMode) return;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const pending = insights.filter(i => i.status === 'pending_review').length;
    const publishedWeek = insights.filter(i => i.status === 'published' && i.published_at && i.published_at >= weekAgo).length;
    const totalLive = insights.filter(i => i.status === 'published').length;
    const pipelineInsights = insights.filter(i => i.source_name !== 'EvidLY Admin');
    const lastRun = pipelineInsights.length > 0 ? pipelineInsights[0].created_at : null;
    setStats({ pending, published_this_week: publishedWeek, total_live: totalLive, last_pipeline_run: lastRun });
  }, [isDemoMode, insights]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Filtered data ──────────────────────────────────────────

  const pendingInsights = insights.filter(i => i.status === 'pending_review');
  const publishedInsights = insights.filter(i => i.status === 'published');

  // ── Actions ────────────────────────────────────────────────

  function runPipeline() {
    toast('To run the pipeline, use: npm run intelligence in your terminal', { duration: 6000 });
  }

  async function handlePublish(id: string) {
    if (isDemoMode) {
      setInsights(prev => prev.map(i =>
        i.id === id ? {
          ...i,
          status: 'published',
          is_demo_eligible: publishDemoEligible,
          demo_priority: publishDemoPriority,
          published_at: new Date().toISOString(),
          reviewed_by: 'arthur',
          reviewed_at: new Date().toISOString(),
        } : i
      ));
      toast.success('Published');
      resetPublishState();
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('intelligence-approve', {
        body: { action: 'publish', insight_id: id, is_demo_eligible: publishDemoEligible, demo_priority: publishDemoPriority },
      });
      if (error) throw error;
      toast.success('Published');
      resetPublishState();
      fetchInsights();
      fetchStats();
    } catch { toast.error('Failed to publish'); }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) { toast.error('Reason required'); return; }
    if (isDemoMode) {
      setInsights(prev => prev.map(i =>
        i.id === id ? { ...i, status: 'rejected', rejected_reason: rejectReason, reviewed_by: 'arthur', reviewed_at: new Date().toISOString() } : i
      ));
      toast('Rejected');
      setRejectingId(null);
      setRejectReason('');
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('intelligence-approve', {
        body: { action: 'reject', insight_id: id, reason: rejectReason },
      });
      if (error) throw error;
      toast('Rejected');
      setRejectingId(null);
      setRejectReason('');
      fetchInsights();
      fetchStats();
    } catch { toast.error('Failed to reject'); }
  }

  async function handleUnpublish(id: string) {
    if (isDemoMode) {
      setInsights(prev => prev.map(i =>
        i.id === id ? { ...i, status: 'pending_review', published_at: null } : i
      ));
      toast('Unpublished');
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('intelligence-approve', {
        body: { action: 'unpublish', insight_id: id },
      });
      if (error) throw error;
      toast('Unpublished — moved to pending');
      fetchInsights();
      fetchStats();
    } catch { toast.error('Failed to unpublish'); }
  }

  async function handleToggleDemo(id: string, currentValue: boolean) {
    if (isDemoMode) {
      setInsights(prev => prev.map(i =>
        i.id === id ? { ...i, is_demo_eligible: !currentValue, demo_priority: !currentValue ? i.demo_priority : 0 } : i
      ));
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('intelligence-approve', {
        body: { action: 'edit', insight_id: id, updates: { is_demo_eligible: !currentValue, demo_priority: !currentValue ? undefined : 0 } },
      });
      if (error) throw error;
      fetchInsights();
    } catch { toast.error('Failed to update'); }
  }

  async function handlePublishWithEdits(id: string) {
    if (isDemoMode) {
      setInsights(prev => prev.map(i =>
        i.id === id ? {
          ...i,
          title: editTitle,
          headline: editTitle,
          summary: editSummary,
          action_items: editActions.filter(a => a.trim()),
          status: 'published',
          published_at: new Date().toISOString(),
          reviewed_by: 'arthur',
          reviewed_at: new Date().toISOString(),
          is_demo_eligible: publishDemoEligible,
          demo_priority: publishDemoPriority,
        } : i
      ));
      toast.success('Published with edits');
      setEditingId(null);
      resetPublishState();
      return;
    }
    try {
      // Step 1: edit
      await supabase.functions.invoke('intelligence-approve', {
        body: {
          action: 'edit',
          insight_id: id,
          updates: {
            title: editTitle,
            headline: editTitle,
            summary: editSummary,
            action_items: editActions.filter(a => a.trim()),
          },
        },
      });
      // Step 2: publish
      const { error } = await supabase.functions.invoke('intelligence-approve', {
        body: { action: 'publish', insight_id: id, is_demo_eligible: publishDemoEligible, demo_priority: publishDemoPriority },
      });
      if (error) throw error;
      toast.success('Published with edits');
      setEditingId(null);
      resetPublishState();
      fetchInsights();
      fetchStats();
    } catch { toast.error('Failed to publish'); }
  }

  async function handleCreateManual(publishNow: boolean) {
    const { title, summary, category, impact_level, affected_counties, action_items } = manualForm;
    if (!title.trim() || !summary.trim()) { toast.error('Title and summary are required'); return; }

    const counties = affected_counties.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
    const items = action_items.filter(a => a.trim());

    if (isDemoMode) {
      const now = new Date().toISOString();
      const newInsight: Insight = {
        id: `manual-${Date.now()}`,
        source_id: 'manual',
        source_url: null,
        source_type: 'manual',
        category,
        impact_level,
        urgency: { critical: 'immediate', high: 'urgent', medium: 'standard', low: 'informational' }[impact_level] || 'standard',
        title,
        headline: title,
        summary,
        full_analysis: '',
        executive_brief: '',
        action_items: items,
        affected_pillars: ['food_safety'],
        affected_counties: counties,
        confidence_score: 0.5,
        tags: [],
        estimated_cost_impact: { low: 0, high: 0, currency: 'USD', methodology: '' },
        source_name: 'EvidLY Admin',
        market_signal_strength: 'moderate',
        status: publishNow ? 'published' : 'pending_review',
        is_demo_eligible: false,
        demo_priority: 0,
        reviewed_by: 'arthur',
        reviewed_at: now,
        rejected_reason: null,
        raw_source_data: { manual: true },
        created_at: now,
        published_at: publishNow ? now : null,
      };
      setInsights(prev => [newInsight, ...prev]);
      toast.success(publishNow ? 'Published' : 'Saved as draft');
      resetManualForm();
      setActiveTab('pending');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('intelligence-approve', {
        body: {
          action: 'create',
          title,
          summary,
          category,
          impact_level,
          affected_counties: counties,
          action_items: items,
          status: publishNow ? 'published' : 'pending_review',
        },
      });
      if (error) throw error;
      toast.success(publishNow ? 'Published' : 'Saved as draft');
      resetManualForm();
      setActiveTab(publishNow ? 'published' : 'pending');
      fetchInsights();
      fetchStats();
    } catch { toast.error('Failed to create insight'); }
  }

  function startEdit(insight: Insight) {
    setEditingId(insight.id);
    setEditTitle(insight.title);
    setEditSummary(insight.summary);
    setEditActions(Array.isArray(insight.action_items) && insight.action_items.length > 0
      ? [...insight.action_items]
      : ['']);
  }

  function resetPublishState() {
    setPublishDemoEligible(false);
    setPublishDemoPriority(0);
  }

  function resetManualForm() {
    setManualForm({ title: '', summary: '', category: 'regulatory_change', impact_level: 'medium', affected_counties: '', action_items: [''] });
  }

  // ── Render ─────────────────────────────────────────────────

  const tabs: { key: TabKey; label: string; count?: number; icon?: 'plus' | 'rocket' }[] = [
    { key: 'pending', label: 'Pending Review', count: pendingInsights.length },
    { key: 'published', label: 'Published', count: publishedInsights.length },
    { key: 'manual', label: 'Add Manual Insight', icon: 'plus' },
    { key: 'demo', label: 'Launch Demo', icon: 'rocket' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6FA' }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-4" style={{ backgroundColor: MIDNIGHT_NAVY }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.15)' }}>
              <Brain className="h-5 w-5" style={{ color: BRAND_GOLD }} />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Intelligence Admin</h1>
              <p className="text-[11px]" style={{ color: '#94A3B8' }}>Review and publish AI-generated intelligence insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchInsights(); fetchStats(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ color: '#94A3B8', border: '1px solid #1e3a5f' }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={runPipeline}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <Play className="h-3.5 w-3.5" />
              Run Pipeline Now
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        {/* ── Demo Banner ─────────────────────────────────────── */}
        {isDemoMode && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm font-medium"
            style={{ backgroundColor: '#fffbeb', color: MIDNIGHT_NAVY, border: '1px solid #fde68a' }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: '#d97706' }} />
            You are viewing the admin panel in demo mode. Pipeline runs are simulated. No real data will be fetched or published.
          </div>
        )}

        {/* ── Stats Bar ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard
            label="Pending Review"
            value={stats.pending}
            accent={stats.pending > 0 ? '#d97706' : '#6B7F96'}
            bg={stats.pending > 0 ? '#fffbeb' : '#FFFFFF'}
            borderColor={stats.pending > 0 ? '#fde68a' : '#D1D9E6'}
          />
          <StatCard label="Published This Week" value={stats.published_this_week} accent="#22c55e" />
          <StatCard label="Total Live" value={stats.total_live} accent={BRAND_BLUE} />
          <StatCard
            label="Last Pipeline Run"
            value={stats.last_pipeline_run ? timeAgo(stats.last_pipeline_run) : 'Never'}
            accent="#6B7F96"
            isText
          />
        </div>

        {/* ── Tabs ────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-4 border-b" style={{ borderColor: '#D1D9E6' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setExpandedId(null); setEditingId(null); setRejectingId(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-[#1e4d6b]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === tab.key ? { borderBottomColor: BRAND_BLUE } : undefined}
            >
              {tab.icon === 'plus' ? (
                <span className="flex items-center gap-1"><Plus className="h-3.5 w-3.5" />{tab.label}</span>
              ) : tab.icon === 'rocket' ? (
                <span className="flex items-center gap-1"><Rocket className="h-3.5 w-3.5" />{tab.label}</span>
              ) : (
                <>{tab.label}{tab.count != null ? ` (${tab.count})` : ''}</>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────────── */}
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="h-8 w-8 mx-auto text-gray-300 mb-3 animate-spin" />
            <p className="text-gray-500 text-sm">Loading insights...</p>
          </div>
        ) : activeTab === 'pending' ? (
          <PendingTab
            insights={pendingInsights}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            editingId={editingId}
            editTitle={editTitle}
            setEditTitle={setEditTitle}
            editSummary={editSummary}
            setEditSummary={setEditSummary}
            editActions={editActions}
            setEditActions={setEditActions}
            rejectingId={rejectingId}
            setRejectingId={setRejectingId}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            publishDemoEligible={publishDemoEligible}
            setPublishDemoEligible={setPublishDemoEligible}
            publishDemoPriority={publishDemoPriority}
            setPublishDemoPriority={setPublishDemoPriority}
            onPublish={handlePublish}
            onReject={handleReject}
            onStartEdit={startEdit}
            onCancelEdit={() => setEditingId(null)}
            onPublishWithEdits={handlePublishWithEdits}
          />
        ) : activeTab === 'published' ? (
          <PublishedTab
            insights={publishedInsights}
            onUnpublish={handleUnpublish}
            onToggleDemo={handleToggleDemo}
          />
        ) : activeTab === 'manual' ? (
          <ManualTab
            form={manualForm}
            setForm={setManualForm}
            onSubmit={handleCreateManual}
          />
        ) : (
          <DemoLauncherTab />
        )}
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────

function StatCard({ label, value, accent, bg, borderColor, isText }: {
  label: string;
  value: number | string;
  accent: string;
  bg?: string;
  borderColor?: string;
  isText?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: bg || '#FFFFFF',
        border: `1px solid ${borderColor || '#D1D9E6'}`,
        boxShadow: '0 1px 3px rgba(11,22,40,.06)',
      }}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#6B7F96' }}>{label}</p>
      <p className={`font-bold mt-0.5 ${isText ? 'text-sm' : 'text-xl'}`} style={{ color: accent }}>{value}</p>
    </div>
  );
}

// ── Pending Tab ──────────────────────────────────────────────

function PendingTab({
  insights, expandedId, setExpandedId,
  editingId, editTitle, setEditTitle, editSummary, setEditSummary, editActions, setEditActions,
  rejectingId, setRejectingId, rejectReason, setRejectReason,
  publishDemoEligible, setPublishDemoEligible, publishDemoPriority, setPublishDemoPriority,
  onPublish, onReject, onStartEdit, onCancelEdit, onPublishWithEdits,
}: {
  insights: Insight[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  editingId: string | null;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editSummary: string;
  setEditSummary: (v: string) => void;
  editActions: string[];
  setEditActions: (v: string[]) => void;
  rejectingId: string | null;
  setRejectingId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  publishDemoEligible: boolean;
  setPublishDemoEligible: (v: boolean) => void;
  publishDemoPriority: number;
  setPublishDemoPriority: (v: number) => void;
  onPublish: (id: string) => void;
  onReject: (id: string) => void;
  onStartEdit: (insight: Insight) => void;
  onCancelEdit: () => void;
  onPublishWithEdits: (id: string) => void;
}) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-16">
        <Shield className="h-12 w-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No pending insights</p>
        <p className="text-gray-400 text-sm mt-1">Run the pipeline to fetch new data from external sources.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map(insight => {
        const sev = SEVERITY_STYLES[insight.impact_level] || SEVERITY_STYLES.medium;
        const catLabel = CATEGORY_LABELS[insight.category] || insight.category;
        const isExpanded = expandedId === insight.id;
        const isEditing = editingId === insight.id;
        const isRejecting = rejectingId === insight.id;
        const keyFindings = (insight.raw_source_data as any)?.key_findings as string[] | undefined;

        return (
          <div key={insight.id} className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #D1D9E6' }}>
            {/* Card Header */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : insight.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: sev.bg, color: sev.dot, border: `1px solid ${sev.border}` }}
                    >{sev.label}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{catLabel}</span>
                    {insight.affected_counties?.slice(0, 3).map(c => (
                      <span key={c} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EEF1F7', color: '#3D5068' }}>{c}</span>
                    ))}
                    {(insight.affected_counties?.length || 0) > 3 && (
                      <span className="text-[10px] text-gray-400">+{insight.affected_counties.length - 3}</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: '#0B1628' }}>{insight.title}</h3>
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#3D5068' }}>{insight.summary}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] whitespace-nowrap" style={{ color: '#6B7F96' }}>
                    <Clock className="h-3 w-3 inline mr-0.5" />{insight.source_name} &middot; {timeAgo(insight.created_at)}
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>
            </div>

            {/* Expanded */}
            {isExpanded && (
              <div className="border-t p-4" style={{ borderColor: '#E8EDF5', backgroundColor: '#F8F9FC' }}>
                {isEditing ? (
                  /* ── Inline Editor ── */
                  <div className="space-y-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
                        style={{ border: '1px solid #D1D9E6', focusRing: BRAND_GOLD } as any}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>Summary</label>
                      <textarea
                        value={editSummary}
                        onChange={e => setEditSummary(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-2"
                        style={{ border: '1px solid #D1D9E6' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>Action Items</label>
                      {editActions.map((a, idx) => (
                        <div key={idx} className="flex gap-1.5 mb-1.5">
                          <input
                            type="text"
                            value={a}
                            onChange={e => {
                              const next = [...editActions];
                              next[idx] = e.target.value;
                              setEditActions(next);
                            }}
                            className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
                            style={{ border: '1px solid #D1D9E6' }}
                            placeholder={`Action item ${idx + 1}`}
                          />
                          {editActions.length > 1 && (
                            <button
                              onClick={() => setEditActions(editActions.filter((_, i) => i !== idx))}
                              className="p-1 text-gray-400 hover:text-red-500"
                            ><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setEditActions([...editActions, ''])}
                        className="text-[11px] font-medium flex items-center gap-1 mt-1"
                        style={{ color: BRAND_BLUE }}
                      ><Plus className="h-3 w-3" /> Add item</button>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <DemoToggle
                        eligible={publishDemoEligible}
                        setEligible={setPublishDemoEligible}
                        priority={publishDemoPriority}
                        setPriority={setPublishDemoPriority}
                      />
                      <div className="ml-auto flex gap-2">
                        <button onClick={onCancelEdit} className="px-3 py-1.5 text-xs rounded-lg" style={{ border: '1px solid #D1D9E6' }}>Cancel</button>
                        <button
                          onClick={() => onPublishWithEdits(insight.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
                          style={{ backgroundColor: '#22c55e' }}
                        ><CheckCircle2 className="h-3.5 w-3.5" /> Publish with edits</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Read-only expanded view ── */
                  <>
                    {insight.full_analysis && (
                      <div className="mb-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6B7F96' }}>Full Analysis</h4>
                        <p className="text-xs whitespace-pre-line" style={{ color: '#3D5068' }}>{insight.full_analysis}</p>
                      </div>
                    )}
                    {keyFindings && keyFindings.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6B7F96' }}>Key Findings</h4>
                        <ul className="space-y-0.5">
                          {keyFindings.map((f, i) => (
                            <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#3D5068' }}>
                              <span className="font-bold" style={{ color: BRAND_BLUE }}>{i + 1}.</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(insight.action_items) && insight.action_items.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6B7F96' }}>Action Items</h4>
                        <ul className="space-y-0.5">
                          {insight.action_items.map((a, i) => (
                            <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#3D5068' }}>
                              <span className="text-green-500 mt-0.5">&#x2022;</span>{a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-[10px] mb-3" style={{ color: '#6B7F96' }}>
                      {insight.estimated_cost_impact?.high > 0 && (
                        <span>Cost: ${(insight.estimated_cost_impact.low || 0).toLocaleString()}-${(insight.estimated_cost_impact.high || 0).toLocaleString()}</span>
                      )}
                      {insight.tags?.length > 0 && (
                        <span>Tags: {insight.tags.join(', ')}</span>
                      )}
                    </div>
                  </>
                )}

                {/* Reject input */}
                {isRejecting && (
                  <div className="space-y-2 mb-3 p-3 rounded-lg bg-red-50 border border-red-100">
                    <label className="block text-xs font-medium text-red-700">Rejection reason</label>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      rows={2}
                      placeholder="Why is this insight being rejected?"
                      className="w-full border border-red-200 rounded-lg px-3 py-2 text-xs outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => onReject(insight.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-red-500 hover:bg-red-600"
                      ><XCircle className="h-3.5 w-3.5" /> Confirm Reject</button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-100"
                      >Cancel</button>
                    </div>
                  </div>
                )}

                {/* Action bar (when not editing and not rejecting) */}
                {!isEditing && !isRejecting && (
                  <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: '#E8EDF5' }}>
                    <DemoToggle
                      eligible={publishDemoEligible}
                      setEligible={setPublishDemoEligible}
                      priority={publishDemoPriority}
                      setPriority={setPublishDemoPriority}
                    />
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); onStartEdit(insight); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg"
                        style={{ color: '#3D5068', border: '1px solid #D1D9E6' }}
                      ><Pencil className="h-3.5 w-3.5" /> Edit</button>
                      <button
                        onClick={e => { e.stopPropagation(); setRejectingId(insight.id); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-red-600 border border-red-200 hover:bg-red-50"
                      ><XCircle className="h-3.5 w-3.5" /> Reject</button>
                      <button
                        onClick={e => { e.stopPropagation(); onPublish(insight.id); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg text-white"
                        style={{ backgroundColor: '#22c55e' }}
                      ><CheckCircle2 className="h-3.5 w-3.5" /> Publish</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Published Tab ────────────────────────────────────────────

function PublishedTab({
  insights, onUnpublish, onToggleDemo,
}: {
  insights: Insight[];
  onUnpublish: (id: string) => void;
  onToggleDemo: (id: string, current: boolean) => void;
}) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-16">
        <Eye className="h-12 w-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No published insights</p>
        <p className="text-gray-400 text-sm mt-1">Publish pending insights to see them here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #D1D9E6' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: '#F4F6FA' }}>
              <th className="text-left px-4 py-2.5 font-semibold" style={{ color: '#3D5068' }}>Title</th>
              <th className="text-left px-3 py-2.5 font-semibold" style={{ color: '#3D5068' }}>Severity</th>
              <th className="text-left px-3 py-2.5 font-semibold" style={{ color: '#3D5068' }}>Category</th>
              <th className="text-left px-3 py-2.5 font-semibold" style={{ color: '#3D5068' }}>Published</th>
              <th className="text-center px-3 py-2.5 font-semibold" style={{ color: '#3D5068' }}>Demo</th>
              <th className="text-right px-4 py-2.5 font-semibold" style={{ color: '#3D5068' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {insights.map(insight => {
              const sev = SEVERITY_STYLES[insight.impact_level] || SEVERITY_STYLES.medium;
              const catLabel = CATEGORY_LABELS[insight.category] || insight.category;
              return (
                <tr key={insight.id} className="border-t hover:bg-gray-50/50 transition-colors" style={{ borderColor: '#E8EDF5' }}>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-semibold truncate" style={{ color: '#0B1628' }}>{insight.title}</p>
                    <p className="text-[10px] truncate mt-0.5" style={{ color: '#6B7F96' }}>{insight.source_name}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: sev.bg, color: sev.dot, border: `1px solid ${sev.border}` }}
                    >{sev.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{catLabel}</span>
                  </td>
                  <td className="px-3 py-3" style={{ color: '#6B7F96' }}>{formatDate(insight.published_at)}</td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => onToggleDemo(insight.id, insight.is_demo_eligible)}
                      className="mx-auto"
                      title={insight.is_demo_eligible ? 'Remove from demo' : 'Add to demo'}
                    >
                      <Star
                        className="h-4 w-4 transition-colors"
                        style={{
                          color: insight.is_demo_eligible ? BRAND_GOLD : '#D1D9E6',
                          fill: insight.is_demo_eligible ? BRAND_GOLD : 'none',
                        }}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onUnpublish(insight.id)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded ml-auto"
                      style={{ color: '#6B7F96', border: '1px solid #D1D9E6' }}
                    ><ArrowDownToLine className="h-3 w-3" /> Unpublish</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Manual Insight Tab ───────────────────────────────────────

function ManualTab({
  form, setForm, onSubmit,
}: {
  form: { title: string; summary: string; category: string; impact_level: string; affected_counties: string; action_items: string[] };
  setForm: (f: typeof form) => void;
  onSubmit: (publish: boolean) => void;
}) {
  const categories = [
    { value: 'recall_alert', label: 'Recall Alert' },
    { value: 'outbreak_alert', label: 'Outbreak Alert' },
    { value: 'enforcement_surge', label: 'Enforcement Surge' },
    { value: 'regulatory_change', label: 'Regulatory Change' },
    { value: 'inspection_trend', label: 'Inspection Trend' },
    { value: 'nfpa_update', label: 'NFPA Update' },
    { value: 'seasonal_risk', label: 'Seasonal Risk' },
  ];

  const severities = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const inputStyle = { border: '1px solid #D1D9E6', backgroundColor: '#FFFFFF' };

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 max-w-2xl" style={{ border: '1px solid #D1D9E6' }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: '#0B1628' }}>Add Manual Insight</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Clear, specific headline (max 100 chars)"
            maxLength={100}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>Summary</label>
          <textarea
            value={form.summary}
            onChange={e => setForm({ ...form, summary: e.target.value })}
            placeholder="2-3 sentence executive summary"
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>Category</label>
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>Severity</label>
            <select
              value={form.impact_level}
              onChange={e => setForm({ ...form, impact_level: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              {severities.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>Affected Counties</label>
          <input
            type="text"
            value={form.affected_counties}
            onChange={e => setForm({ ...form, affected_counties: e.target.value })}
            placeholder="fresno, merced, stanislaus (comma-separated)"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>Action Items</label>
          {form.action_items.map((a, idx) => (
            <div key={idx} className="flex gap-1.5 mb-1.5">
              <input
                type="text"
                value={a}
                onChange={e => {
                  const next = [...form.action_items];
                  next[idx] = e.target.value;
                  setForm({ ...form, action_items: next });
                }}
                placeholder={`Action item ${idx + 1}`}
                className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
              {form.action_items.length > 1 && (
                <button
                  onClick={() => setForm({ ...form, action_items: form.action_items.filter((_, i) => i !== idx) })}
                  className="p-1 text-gray-400 hover:text-red-500"
                ><X className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
          <button
            onClick={() => setForm({ ...form, action_items: [...form.action_items, ''] })}
            className="text-[11px] font-medium flex items-center gap-1 mt-1"
            style={{ color: BRAND_BLUE }}
          ><Plus className="h-3 w-3" /> Add item</button>
        </div>

        <div className="flex gap-2 pt-3 border-t" style={{ borderColor: '#E8EDF5' }}>
          <button
            onClick={() => onSubmit(false)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg"
            style={{ color: '#3D5068', border: '1px solid #D1D9E6' }}
          >Save Draft</button>
          <button
            onClick={() => onSubmit(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg text-white"
            style={{ backgroundColor: '#22c55e' }}
          ><CheckCircle2 className="h-3.5 w-3.5" /> Publish</button>
        </div>
      </div>
    </div>
  );
}

// ── Demo Launcher Tab ─────────────────────────────────────────

const CA_COUNTIES = [
  'alameda','alpine','amador','butte','calaveras','colusa','contra costa','del norte',
  'el dorado','fresno','glenn','humboldt','imperial','inyo','kern','kings','lake',
  'lassen','los angeles','madera','marin','mariposa','mendocino','merced','modoc',
  'mono','monterey','napa','nevada','orange','placer','plumas','riverside',
  'sacramento','san benito','san bernardino','san diego','san francisco','san joaquin',
  'san luis obispo','san mateo','santa barbara','santa clara','santa cruz','shasta',
  'sierra','siskiyou','solano','sonoma','stanislaus','sutter','tehama','trinity',
  'tulare','tuolumne','ventura','yolo','yuba',
];

const SEGMENT_OPTIONS: { value: ClientProfile['segment']; label: string }[] = [
  { value: 'casual_dining', label: 'Casual Dining' },
  { value: 'multi_unit_restaurant', label: 'Multi-Unit Restaurant' },
  { value: 'independent', label: 'Independent Restaurant' },
  { value: 'national_park_concession', label: 'National Park Concession' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'k12', label: 'K-12 School' },
  { value: 'university', label: 'University' },
  { value: 'corporate_dining', label: 'Corporate Dining' },
  { value: 'hotel', label: 'Hotel' },
];

function DemoLauncherTab() {
  const [prospectName, setProspectName] = useState('');
  const [selectedCounties, setSelectedCounties] = useState<string[]>([]);
  const [countySearch, setCountySearch] = useState('');
  const [segment, setSegment] = useState<ClientProfile['segment']>('casual_dining');
  const [locationCount, setLocationCount] = useState(3);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [supplierInput, setSupplierInput] = useState('');
  const [showCountyDropdown, setShowCountyDropdown] = useState(false);

  const filteredCounties = CA_COUNTIES.filter(c =>
    c.includes(countySearch.toLowerCase()) && !selectedCounties.includes(c),
  );

  function addCounty(county: string) {
    setSelectedCounties(prev => [...prev, county]);
    setCountySearch('');
  }

  function removeCounty(county: string) {
    setSelectedCounties(prev => prev.filter(c => c !== county));
  }

  function addSupplier() {
    const trimmed = supplierInput.trim();
    if (trimmed && !suppliers.includes(trimmed)) {
      setSuppliers(prev => [...prev, trimmed]);
      setSupplierInput('');
    }
  }

  function removeSupplier(s: string) {
    setSuppliers(prev => prev.filter(x => x !== s));
  }

  function handleLaunch() {
    // 1. Set jurisdiction filter
    setDemoJurisdictionFilter(selectedCounties);

    // 2. Build personalized profile overrides
    const overrides: Partial<ClientProfile> = {
      organization_name: prospectName || 'Demo Organization',
      segment,
      industry_multiplier: INDUSTRY_MULTIPLIERS[segment],
      total_locations: locationCount,
      primary_counties: selectedCounties,
      counties: selectedCounties,
      key_suppliers: suppliers,
    };
    setDemoClientProfile(overrides);

    // 3. Open demo in new tab
    window.open('/demo', '_blank');
    toast.success(`Demo launched for ${prospectName || 'prospect'} — ${selectedCounties.length} ${selectedCounties.length === 1 ? 'county' : 'counties'}`);
  }

  const inputStyle = { border: '1px solid #D1D9E6', backgroundColor: '#FFFFFF' };

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 max-w-2xl" style={{ border: '1px solid #D1D9E6' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.12)' }}>
          <Rocket className="h-4 w-4" style={{ color: BRAND_GOLD }} />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: '#0B1628' }}>Personalized Demo Launcher</h3>
          <p className="text-[11px]" style={{ color: '#6B7F96' }}>
            Configure prospect details — Intelligence Hub shows real insights filtered to their counties
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Prospect Name */}
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>Prospect Name</label>
          <input
            type="text"
            value={prospectName}
            onChange={e => setProspectName(e.target.value)}
            placeholder="e.g. Enterprise Restaurant Group"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>

        {/* Counties */}
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>
            Counties <span className="font-normal" style={{ color: '#6B7F96' }}>— select all that apply</span>
          </label>
          {/* Selected pills */}
          {selectedCounties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedCounties.map(c => (
                <span
                  key={c}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium capitalize"
                  style={{ backgroundColor: 'rgba(30,77,107,0.08)', color: BRAND_BLUE, border: `1px solid rgba(30,77,107,0.2)` }}
                >
                  <MapPin className="h-3 w-3" />
                  {c}
                  <button onClick={() => removeCounty(c)} className="ml-0.5 hover:text-red-500"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              value={countySearch}
              onChange={e => { setCountySearch(e.target.value); setShowCountyDropdown(true); }}
              onFocus={() => setShowCountyDropdown(true)}
              placeholder="Search California counties..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            {showCountyDropdown && countySearch.length > 0 && filteredCounties.length > 0 && (
              <div
                className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg overflow-y-auto"
                style={{ border: '1px solid #D1D9E6', maxHeight: 200 }}
              >
                {filteredCounties.slice(0, 15).map(c => (
                  <button
                    key={c}
                    onClick={() => { addCounty(c); setShowCountyDropdown(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 capitalize"
                    style={{ color: '#3D5068' }}
                  >{c}</button>
                ))}
              </div>
            )}
          </div>
          {/* Quick-pick row */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {['fresno', 'los angeles', 'san francisco', 'san diego', 'orange', 'sacramento'].map(c => (
              <button
                key={c}
                onClick={() => !selectedCounties.includes(c) && addCounty(c)}
                disabled={selectedCounties.includes(c)}
                className="text-[10px] px-2 py-0.5 rounded-full capitalize disabled:opacity-30"
                style={{ border: '1px solid #D1D9E6', color: '#6B7F96' }}
              >{c}</button>
            ))}
          </div>
        </div>

        {/* Segment + Location Count */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>Industry Segment</label>
            <select
              value={segment}
              onChange={e => setSegment(e.target.value as ClientProfile['segment'])}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              {SEGMENT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>Location Count</label>
            <input
              type="number"
              min={1}
              max={500}
              value={locationCount}
              onChange={e => setLocationCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Key Suppliers */}
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#3D5068' }}>
            Key Suppliers <span className="font-normal" style={{ color: '#6B7F96' }}>— optional</span>
          </label>
          {suppliers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {suppliers.map(s => (
                <span
                  key={s}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                  style={{ backgroundColor: '#EEF1F7', color: '#3D5068' }}
                >
                  {s}
                  <button onClick={() => removeSupplier(s)} className="ml-0.5 hover:text-red-500"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={supplierInput}
              onChange={e => setSupplierInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSupplier(); } }}
              placeholder="Type supplier name, press Enter"
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <button
              onClick={addSupplier}
              disabled={!supplierInput.trim()}
              className="px-3 py-2 text-xs font-medium rounded-lg disabled:opacity-30"
              style={{ color: BRAND_BLUE, border: '1px solid #D1D9E6' }}
            ><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {/* Launch button */}
        <div className="pt-3 border-t" style={{ borderColor: '#E8EDF5' }}>
          <button
            onClick={handleLaunch}
            disabled={selectedCounties.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: selectedCounties.length > 0 ? BRAND_BLUE : '#94A3B8' }}
          >
            <Rocket className="h-4 w-4" />
            Launch Demo Session
          </button>
          {selectedCounties.length === 0 && (
            <p className="text-[11px] mt-1.5" style={{ color: '#6B7F96' }}>Select at least one county to launch a personalized demo</p>
          )}
          {selectedCounties.length > 0 && (
            <p className="text-[11px] mt-1.5" style={{ color: '#6B7F96' }}>
              Opens /demo in a new tab — Intelligence Hub will show real insights for {selectedCounties.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Demo Toggle (shared) ─────────────────────────────────────

function DemoToggle({
  eligible, setEligible, priority, setPriority,
}: {
  eligible: boolean;
  setEligible: (v: boolean) => void;
  priority: number;
  setPriority: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setEligible(!eligible)}
        className="flex items-center gap-1 text-xs"
        style={{ color: eligible ? BRAND_GOLD : '#6B7F96' }}
      >
        <Star className="h-3.5 w-3.5" style={{ fill: eligible ? BRAND_GOLD : 'none', color: eligible ? BRAND_GOLD : '#D1D9E6' }} />
        Demo
      </button>
      {eligible && (
        <label className="flex items-center gap-1 text-[10px]" style={{ color: '#6B7F96' }}>
          Priority:
          <input
            type="range"
            min={0}
            max={10}
            value={priority}
            onChange={e => setPriority(Number(e.target.value))}
            className="w-16 h-1 accent-amber-500"
          />
          <span className="w-4 text-center font-bold" style={{ color: BRAND_GOLD }}>{priority}</span>
        </label>
      )}
    </div>
  );
}

export default IntelligenceAdmin;
