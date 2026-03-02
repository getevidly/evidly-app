/**
 * INTEL-PIPELINE-1 — Admin Intelligence Approval Queue
 *
 * Review, publish, or reject intelligence insights collected by
 * the intelligence-collect edge function.
 *
 * POST { insight_id, action: 'publish' | 'reject', is_demo_eligible?, demo_priority? }
 * Returns: { success: true, insight_id }
 *
 * Access: isEvidlyAdmin || isDemoMode
 */

import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Brain,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Clock,
  AlertTriangle,
  Shield,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';

interface QueueInsight {
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

const impactColors: Record<string, { dot: string; bg: string; border: string; label: string }> = {
  critical: { dot: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Critical' },
  high:     { dot: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'High' },
  medium:   { dot: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Medium' },
  low:      { dot: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', label: 'Low' },
};

type TabKey = 'pending' | 'published' | 'rejected';

export function AdminIntelligenceQueue() {
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const isAdmin = isEvidlyAdmin || isDemoMode;

  const [insights, setInsights] = useState<QueueInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [demoEligible, setDemoEligible] = useState(false);
  const [demoPriority, setDemoPriority] = useState(0);

  const statusForTab: Record<TabKey, string[]> = {
    pending: ['pending_review'],
    published: ['published'],
    rejected: ['rejected'],
  };

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        // In demo mode, direct query (RLS allows demo-eligible rows)
        const { data, error } = await supabase
          .from('intelligence_insights')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setInsights(data || []);
      } else {
        // Live mode: call the edge function
        const { data, error } = await supabase.functions.invoke('intelligence-approve', {
          body: { action: 'list', status: statusForTab[activeTab] },
        });
        if (error) throw error;
        setInsights(data?.insights || []);
      }
    } catch (err: any) {
      console.error('Failed to load insights:', err);
      // Fallback: direct query
      const { data } = await supabase
        .from('intelligence_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setInsights(data || []);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, activeTab]);

  useEffect(() => {
    if (isAdmin) fetchInsights();
  }, [isAdmin, fetchInsights]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredInsights = insights.filter(i => statusForTab[activeTab].includes(i.status));
  const pendingCount = insights.filter(i => i.status === 'pending_review').length;
  const publishedCount = insights.filter(i => i.status === 'published').length;
  const rejectedCount = insights.filter(i => i.status === 'rejected').length;

  async function handlePublish(id: string) {
    if (isDemoMode) {
      setInsights(prev => prev.map(i =>
        i.id === id ? {
          ...i,
          status: 'published',
          is_demo_eligible: demoEligible,
          demo_priority: demoPriority,
          published_at: new Date().toISOString(),
          reviewed_by: 'arthur',
          reviewed_at: new Date().toISOString(),
        } : i
      ));
      toast.success('Insight published');
      setDemoEligible(false);
      setDemoPriority(0);
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('intelligence-approve', {
        body: {
          action: 'publish',
          insight_id: id,
          is_demo_eligible: demoEligible,
          demo_priority: demoPriority,
        },
      });
      if (error) throw error;
      toast.success('Insight published');
      setDemoEligible(false);
      setDemoPriority(0);
      fetchInsights();
    } catch {
      toast.error('Failed to publish insight');
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    if (isDemoMode) {
      setInsights(prev => prev.map(i =>
        i.id === id ? {
          ...i,
          status: 'rejected',
          rejected_reason: rejectReason,
          reviewed_by: 'arthur',
          reviewed_at: new Date().toISOString(),
        } : i
      ));
      toast('Insight rejected');
      setRejectingId(null);
      setRejectReason('');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('intelligence-approve', {
        body: { action: 'reject', insight_id: id, reason: rejectReason },
      });
      if (error) throw error;
      toast('Insight rejected');
      setRejectingId(null);
      setRejectReason('');
      fetchInsights();
    } catch {
      toast.error('Failed to reject insight');
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending Review', count: pendingCount },
    { key: 'published', label: 'Published', count: publishedCount },
    { key: 'rejected', label: 'Rejected', count: rejectedCount },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
            <Brain className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Intelligence Queue</h1>
            <p className="text-xs text-gray-500">Review and publish intelligence insights from external sources</p>
          </div>
        </div>
        <button
          onClick={fetchInsights}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="px-4 py-2 text-sm rounded-lg bg-yellow-50 border border-yellow-200">
          <span className="font-semibold text-yellow-700">{pendingCount}</span>
          <span className="text-yellow-600 ml-1">pending</span>
        </div>
        <div className="px-4 py-2 text-sm rounded-lg bg-green-50 border border-green-200">
          <span className="font-semibold text-green-700">{publishedCount}</span>
          <span className="text-green-600 ml-1">published</span>
        </div>
        <div className="px-4 py-2 text-sm rounded-lg bg-red-50 border border-red-200">
          <span className="font-semibold text-red-700">{rejectedCount}</span>
          <span className="text-red-600 ml-1">rejected</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setExpandedId(null); setRejectingId(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#1e4d6b] text-[#1e4d6b]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <RefreshCw className="h-8 w-8 mx-auto text-gray-300 mb-3 animate-spin" />
          <p className="text-gray-500 text-sm">Loading insights...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredInsights.length === 0 && (
        <div className="text-center py-16">
          <Shield className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No {activeTab} insights</p>
          <p className="text-gray-400 text-sm mt-1">
            {activeTab === 'pending'
              ? 'Run the intelligence-collect function to fetch new data from external sources.'
              : activeTab === 'published'
                ? 'Publish pending insights to see them here.'
                : 'No insights have been rejected yet.'}
          </p>
        </div>
      )}

      {/* Insight List */}
      {!loading && (
        <div className="space-y-3">
          {filteredInsights.map(insight => {
            const impact = impactColors[insight.impact_level] || impactColors.medium;
            const isExpanded = expandedId === insight.id;
            const isRejecting = rejectingId === insight.id;
            const keyFindings = (insight.raw_source_data as any)?.key_findings as string[] | undefined;

            return (
              <div key={insight.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Card Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {/* Impact badge */}
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: impact.bg, color: impact.dot, border: `1px solid ${impact.border}` }}
                        >
                          {impact.label}
                        </span>

                        {/* Source badge */}
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
                          {insight.source_id}
                        </span>

                        {/* Pillars */}
                        {insight.affected_pillars?.map(p => (
                          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600">
                            {p === 'food_safety' ? 'Food' : p === 'facility_safety' ? 'Fire' : p}
                          </span>
                        ))}

                        {/* Demo eligible flag */}
                        {insight.is_demo_eligible && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#fffbeb', color: '#d4af37', border: '1px solid #fde68a' }}>
                            Demo{insight.demo_priority > 0 ? ` (${insight.demo_priority})` : ''}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-gray-900 truncate">{insight.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{insight.summary}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        <Clock className="h-3 w-3 inline mr-0.5" />
                        {timeAgo(insight.created_at)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    {/* Summary */}
                    <p className="text-sm text-gray-700 mb-3">{insight.summary}</p>

                    {/* Full analysis */}
                    {insight.full_analysis && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Analysis</h4>
                        <p className="text-xs text-gray-600 whitespace-pre-line">{insight.full_analysis}</p>
                      </div>
                    )}

                    {/* Key Findings (from raw_source_data) */}
                    {keyFindings && keyFindings.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Key Findings</h4>
                        <ul className="space-y-1">
                          {keyFindings.map((finding, idx) => (
                            <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                              <span className="text-blue-500 mt-0.5 font-bold">{idx + 1}.</span>
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Executive Brief */}
                    {insight.executive_brief && (
                      <div className="mb-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <h4 className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Executive Brief
                        </h4>
                        <p className="text-xs text-blue-600">{insight.executive_brief}</p>
                      </div>
                    )}

                    {/* Action Items */}
                    {insight.action_items?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Action Items</h4>
                        <ul className="space-y-1">
                          {(Array.isArray(insight.action_items) ? insight.action_items : []).map((item, idx) => (
                            <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                              <span className="text-green-500 mt-0.5">-</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Metadata row */}
                    <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 mb-3">
                      <span>Source: {insight.source_name}</span>
                      <span>Signal: {insight.market_signal_strength}</span>
                      {insight.affected_counties?.length > 0 && (
                        <span>Counties: {insight.affected_counties.join(', ')}</span>
                      )}
                      {insight.estimated_cost_impact?.low != null && (
                        <span>
                          Cost: ${(insight.estimated_cost_impact.low || 0).toLocaleString()}-${(insight.estimated_cost_impact.high || 0).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {insight.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {insight.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Rejection reason */}
                    {insight.status === 'rejected' && insight.rejected_reason && (
                      <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-100">
                        <h4 className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Rejection Reason
                        </h4>
                        <p className="text-xs text-red-600">{insight.rejected_reason}</p>
                      </div>
                    )}

                    {/* Reject input */}
                    {isRejecting && (
                      <div className="space-y-2 mb-3 p-3 rounded-lg bg-red-50 border border-red-100">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-red-700">Rejection reason</label>
                          <AIAssistButton
                            fieldLabel="Rejection Reason"
                            context={{ title: insight.title }}
                            currentValue={rejectReason}
                            onGenerated={(text) => { setRejectReason(text); setAiFields(prev => new Set(prev).add('rejectReason')); }}
                          />
                        </div>
                        <textarea
                          value={rejectReason}
                          onChange={e => { setRejectReason(e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete('rejectReason'); return n; }); }}
                          rows={2}
                          placeholder="Why is this insight being rejected?"
                          className="w-full border border-red-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-red-300 focus:border-transparent outline-none resize-none"
                        />
                        {aiFields.has('rejectReason') && <AIGeneratedIndicator />}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(insight.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Confirm Reject
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectReason(''); }}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons (only for pending tab) */}
                    {activeTab === 'pending' && !isRejecting && (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        {/* Demo eligible checkbox */}
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={demoEligible}
                            onChange={e => setDemoEligible(e.target.checked)}
                            className="rounded border-gray-300 text-[#d4af37] focus:ring-[#d4af37]"
                          />
                          Demo
                        </label>

                        {/* Demo priority */}
                        {demoEligible && (
                          <label className="flex items-center gap-1 text-xs text-gray-500">
                            Priority:
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={demoPriority}
                              onChange={e => setDemoPriority(Number(e.target.value))}
                              className="w-12 border border-gray-300 rounded px-1.5 py-0.5 text-xs text-center"
                            />
                          </label>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setRejectingId(insight.id); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePublish(insight.id); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors"
                            style={{ backgroundColor: '#22c55e' }}
                            onMouseOver={e => (e.currentTarget.style.backgroundColor = '#16a34a')}
                            onMouseOut={e => (e.currentTarget.style.backgroundColor = '#22c55e')}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Publish
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Published tab: view-only with status */}
                    {activeTab === 'published' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200 text-xs text-gray-400">
                        <Eye className="h-3.5 w-3.5" />
                        Published {insight.published_at ? timeAgo(insight.published_at) : ''}
                        {insight.reviewed_by && (
                          <span className="ml-1">by {insight.reviewed_by}</span>
                        )}
                        {insight.is_demo_eligible && (
                          <span className="ml-1 text-[#d4af37] font-medium">+ Demo{insight.demo_priority > 0 ? ` (${insight.demo_priority})` : ''}</span>
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
    </div>
  );
}

export default AdminIntelligenceQueue;
