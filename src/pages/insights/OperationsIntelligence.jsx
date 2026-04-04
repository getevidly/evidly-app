// SP8-OPS-INTEL-01 — Operations Intelligence Page
import { useState, useEffect, useCallback } from 'react';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabase';
import { Sparkles, AlertTriangle, Clock, CheckCircle2, TrendingUp, X, ExternalLink, RefreshCw } from 'lucide-react';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const CREAM = '#FAF7F0';
const PRIORITY_COLORS = {
  1: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: 'Critical' },
  2: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', label: 'Warning' },
  3: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', label: 'Good' },
};

const DEMO_INSIGHTS = [
  { id: 'd1', priority: 1, category: 'pse_exposure', title: '2 PSE safeguards missing records', body: 'No service records found for: Fire Alarm, Sprinklers. These are critical for fire safety compliance.', source: 'vendor_service_records', action_text: 'Add Service Records', action_url: '/vendors', status: 'active' },
  { id: 'd2', priority: 1, category: 'ca_aging', title: '3 corrective actions open >14 days', body: 'Long-open CAs: Walk-in cooler temp (18d), Handwash station (16d), Floor drain (15d).', source: 'corrective_actions', action_text: 'Review CAs', action_url: '/corrective-actions', status: 'active' },
  { id: 'd3', priority: 2, category: 'document_currency', title: '2 documents expiring within 30 days', body: 'Expiring soon: Business License (12d), Health Permit (28d).', source: 'documents', action_text: 'Renew Documents', action_url: '/documents', status: 'active' },
  { id: 'd4', priority: 2, category: 'temp_trend', title: 'Walk-in Cooler: +2.3°F drift detected', body: 'Average temperature shifted from 36.2°F to 38.5°F over 14 days. Check calibration.', source: 'temp_logs', action_text: 'Check Equipment', action_url: '/temperature', status: 'active' },
  { id: 'd5', priority: 3, category: 'trajectory', title: 'Readiness score improving (+6.2 pts)', body: 'Average score rose from 78.4 to 84.6. Great work maintaining compliance.', source: 'readiness_snapshots', action_text: 'View Trajectory', action_url: '/insights/trajectory', status: 'active' },
];

const DEMO_COACH = 'Focus on scheduling fire alarm and sprinkler inspections this week — two critical safeguards are missing service records.';

export function OperationsIntelligence() {
  useDemoGuard();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { currentTier } = useSubscription();

  const [insights, setInsights] = useState([]);
  const [coachText, setCoachText] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('insights');
  const [refreshing, setRefreshing] = useState(false);

  // Score strip data
  const [scoreData, setScoreData] = useState({ readiness: null, overdue: 0, expiring: 0, trend: null });

  const loadInsights = useCallback(async () => {
    if (isDemoMode) {
      setInsights(DEMO_INSIGHTS);
      setCoachText(DEMO_COACH);
      setScoreData({ readiness: 84.6, overdue: 3, expiring: 2, trend: '+6.2' });
      setLoading(false);
      return;
    }

    const orgId = profile?.organization_id;
    if (!orgId) { setLoading(false); return; }

    try {
      // Load insights
      const { data } = await supabase
        .from('ops_intelligence_insights')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('priority', { ascending: true })
        .limit(10);

      const active = data || [];
      setInsights(active);

      // Extract coach recommendation from metadata
      const withCoach = active.find(i => i.metadata?.coach_recommendation);
      setCoachText(withCoach?.metadata?.coach_recommendation || '');

      // Score strip
      const { data: snapshot } = await supabase
        .from('readiness_snapshots')
        .select('overall_score')
        .eq('org_id', orgId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const overdueCount = active.filter(i => i.priority === 1).length;
      const expiringCount = active.filter(i =>
        ['document_currency', 'service_currency', 'certification_gap'].includes(i.category)
      ).length;
      const trendInsight = active.find(i => i.category === 'trajectory');
      const trendVal = trendInsight?.metadata?.diff
        ? `${trendInsight.metadata.diff > 0 ? '+' : ''}${Number(trendInsight.metadata.diff).toFixed(1)}`
        : null;

      setScoreData({
        readiness: snapshot?.overall_score ? Number(snapshot.overall_score) : null,
        overdue: overdueCount,
        expiring: expiringCount,
        trend: trendVal,
      });
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, profile?.organization_id]);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  const handleDismiss = async (insightId) => {
    if (isDemoMode) {
      setInsights(prev => prev.filter(i => i.id !== insightId));
      return;
    }
    await supabase
      .from('ops_intelligence_insights')
      .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
      .eq('id', insightId);
    setInsights(prev => prev.filter(i => i.id !== insightId));
  };

  const handleRefresh = async () => {
    if (isDemoMode || refreshing) return;
    setRefreshing(true);
    try {
      await supabase.functions.invoke('ops-intelligence-generate', {
        body: { organization_id: profile?.organization_id },
      });
      await supabase.functions.invoke('ops-intelligence-coach', {
        body: { organization_id: profile?.organization_id },
      });
      await loadInsights();
    } catch {
      // Silent fail
    } finally {
      setRefreshing(false);
    }
  };

  const insightsTab = insights.filter(i => !['document_currency', 'service_currency'].includes(i.category));
  const currencyTab = insights.filter(i => ['document_currency', 'service_currency', 'certification_gap'].includes(i.category));

  const showUpsell = !isDemoMode && ['trial', 'founder', 'standard'].includes(currentTier);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: NAVY }}>
            <Sparkles className="h-6 w-6" style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0B1628]">Operations Intelligence</h1>
            <p className="text-sm text-[#6B7F96]">Proactive insights from all your data sources</p>
          </div>
        </div>
        {!isDemoMode && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors"
            style={{ borderColor: '#D1D9E6', color: '#4B5563' }}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: GOLD }} />
          <p className="mt-3 text-sm text-[#6B7F96]">Analyzing operations data...</p>
        </div>
      ) : (
        <>
          {/* Score Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <ScoreCard
              label="Readiness"
              value={scoreData.readiness !== null ? `${scoreData.readiness}` : '—'}
              icon={<CheckCircle2 className="h-4 w-4" />}
              color="#166534"
            />
            <ScoreCard
              label="Critical"
              value={`${scoreData.overdue}`}
              icon={<AlertTriangle className="h-4 w-4" />}
              color={scoreData.overdue > 0 ? '#991B1B' : '#166534'}
            />
            <ScoreCard
              label="Expiring"
              value={`${scoreData.expiring}`}
              icon={<Clock className="h-4 w-4" />}
              color={scoreData.expiring > 0 ? '#92400E' : '#166534'}
            />
            <ScoreCard
              label="Trend"
              value={scoreData.trend || '—'}
              icon={<TrendingUp className="h-4 w-4" />}
              color={scoreData.trend && scoreData.trend.startsWith('+') ? '#166534' : scoreData.trend ? '#991B1B' : '#6B7F96'}
            />
          </div>

          {/* AI Coach Card */}
          {coachText && (
            <div
              className="rounded-xl p-4 mb-6"
              style={{ background: CREAM, borderLeft: `4px solid ${GOLD}` }}
            >
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: GOLD }}>
                    AI Coach — This Week's Focus
                  </p>
                  <p className="text-sm font-medium text-[#0B1628]">{coachText}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-[#D1D9E6]">
            <TabButton
              active={activeTab === 'insights'}
              label="Insights"
              count={insightsTab.length}
              onClick={() => setActiveTab('insights')}
            />
            <TabButton
              active={activeTab === 'currency'}
              label="Currency"
              count={currencyTab.length}
              onClick={() => setActiveTab('currency')}
            />
          </div>

          {/* Tab content */}
          {activeTab === 'insights' ? (
            <div className="space-y-3">
              {insightsTab.length === 0 ? (
                <EmptyState message="No operational insights right now. All systems look good!" />
              ) : (
                insightsTab.map(insight => (
                  <InsightCard key={insight.id} insight={insight} onDismiss={handleDismiss} />
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {currencyTab.length === 0 ? (
                <EmptyState message="All documents and services are current." />
              ) : (
                currencyTab.map(insight => (
                  <InsightCard key={insight.id} insight={insight} onDismiss={handleDismiss} />
                ))
              )}
            </div>
          )}

          {/* Upsell Card */}
          {showUpsell && (
            <div
              className="mt-8 rounded-xl border-2 p-5"
              style={{ borderColor: GOLD, background: '#FEFCF5' }}
            >
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                <div>
                  <p className="font-semibold text-[#0B1628] mb-1">Unlock AI-Powered Coaching</p>
                  <p className="text-sm text-[#4B5563] mb-3">
                    Upgrade to Professional to receive weekly AI coaching recommendations
                    tailored to your specific operational data.
                  </p>
                  <a
                    href="/billing"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ background: GOLD }}
                  >
                    View Plans <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function ScoreCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-[#D1D9E6] p-4">
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs font-medium text-[#6B7F96] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function InsightCard({ insight, onDismiss }) {
  const p = PRIORITY_COLORS[insight.priority] || PRIORITY_COLORS[2];
  return (
    <div
      className="rounded-xl border p-4 transition-all"
      style={{ background: p.bg, borderColor: p.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: p.border, color: p.text }}
            >
              {p.label}
            </span>
            <span className="text-xs text-[#6B7F96]">{insight.source?.replace(/_/g, ' ')}</span>
          </div>
          <h3 className="font-semibold text-sm text-[#0B1628] mb-1">{insight.title}</h3>
          <p className="text-sm text-[#4B5563]">{insight.body}</p>
          {insight.action_text && insight.action_url && (
            <a
              href={insight.action_url}
              className="inline-flex items-center gap-1 mt-2 text-sm font-medium transition-colors"
              style={{ color: NAVY }}
            >
              {insight.action_text}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <button
          onClick={() => onDismiss(insight.id)}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-white/50 transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4 text-[#6B7F96]" />
        </button>
      </div>
    </div>
  );
}

function TabButton({ active, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 text-sm font-medium transition-colors relative"
      style={{
        color: active ? NAVY : '#6B7F96',
        borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
      }}
    >
      {label}
      {count > 0 && (
        <span
          className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-xs font-semibold"
          style={{
            background: active ? NAVY : '#E5E7EB',
            color: active ? '#FFFFFF' : '#4B5563',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ message }) {
  return (
    <div className="bg-white rounded-xl border border-[#D1D9E6] p-8 text-center">
      <CheckCircle2 className="h-10 w-10 mx-auto mb-3" style={{ color: '#166534' }} />
      <p className="text-sm text-[#6B7F96]">{message}</p>
    </div>
  );
}

export default OperationsIntelligence;
