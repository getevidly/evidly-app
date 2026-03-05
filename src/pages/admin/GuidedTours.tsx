/**
 * Guided Tours — Tour setup, templates, pipeline overview, and history
 * Route: /admin/guided-tours
 * Access: platform_admin / @getevidly.com
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Breadcrumb } from '../../components/Breadcrumb';
import { toast } from 'sonner';
import {
  Play, Plus, Clock, Users, DollarSign, TrendingUp, Target,
  ChevronRight, Calendar, Edit2, Copy, Trash2, X, Check,
  BarChart3, ArrowRight, RefreshCw, MessageSquare, Eye,
  Layers, Zap, Award, Filter,
} from 'lucide-react';

const NAVY = '#1e4d6b';
const GOLD = '#A08C5A';
const DARK = '#1E2D4D';

type Tab = 'overview' | 'setup' | 'history' | 'templates';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'setup', label: 'Setup Tour' },
  { id: 'history', label: 'Active & History' },
  { id: 'templates', label: 'Templates' },
];

const SOURCES = ['cold_outreach', 'referral', 'inbound', 'event', 'linkedin', 'direct'];
const SEGMENTS = ['restaurant_single', 'restaurant_multi', 'hospitality', 'healthcare', 'institutional', 'enterprise'];
const INDUSTRIES = ['restaurant', 'hospitality', 'healthcare', 'institutional', 'k12_education', 'higher_education', 'senior_living'];
const STAGES = ['tour_scheduled', 'tour_completed', 'proposal_sent', 'negotiating', 'won', 'lost', 'nurture'];
const STAGE_LABELS: Record<string, string> = {
  tour_scheduled: 'Tour Scheduled', tour_completed: 'Tour Completed',
  proposal_sent: 'Proposal Sent', negotiating: 'Negotiating',
  won: 'Won', lost: 'Lost', nurture: 'Nurture',
};
const MODULES = ['temp', 'checklists', 'corrective_actions', 'documents', 'facility_safety', 'haccp', 'equipment', 'vendors', 'benchmarks', 'leaderboard', 'business_intelligence', 'risk_analysis', 'analytics', 'iot', 'regulatory_updates'];

function formatCents(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateTime(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function daysAgo(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

const calculateEstimatedMRR = (locations: number, segment: string): number => {
  const base = segment === 'enterprise' ? 19900 : 9900;
  const perLoc = segment === 'enterprise' ? 9900 : 4900;
  return base + (perLoc * locations);
};

export default function GuidedTours() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // ── Shared data ──
  const [sessions, setSessions] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [touchpoints, setTouchpoints] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [sessRes, pipeRes, campRes, touchRes, tplRes] = await Promise.all([
      supabase.from('demo_sessions').select('*').order('started_at', { ascending: false }),
      supabase.from('sales_pipeline').select('*').order('estimated_mrr_cents', { ascending: false }),
      supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('marketing_touchpoints').select('*').order('created_at', { ascending: false }),
      supabase.from('guided_tour_templates').select('*').order('created_at'),
    ]);
    if (sessRes.data) setSessions(sessRes.data);
    if (pipeRes.data) setPipeline(pipeRes.data);
    if (campRes.data) setCampaigns(campRes.data);
    if (touchRes.data) setTouchpoints(touchRes.data);
    if (tplRes.data) setTemplates(tplRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37]" />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <Breadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Guided Tours' }]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guided Tours</h1>
          <p className="text-sm text-gray-600 mt-1">Launch tours, track pipeline, manage templates</p>
        </div>
        <button
          onClick={() => setActiveTab('setup')}
          className="flex items-center gap-2 px-4 py-2 min-h-[44px] text-white rounded-lg text-sm font-medium shadow-sm"
          style={{ backgroundColor: NAVY }}
        >
          <Play className="h-4 w-4" /> Launch Tour
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#1e4d6b] text-[#1e4d6b]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab sessions={sessions} pipeline={pipeline} campaigns={campaigns} touchpoints={touchpoints} />
      )}
      {activeTab === 'setup' && (
        <SetupTourTab templates={templates} campaigns={campaigns} onLaunch={loadData} />
      )}
      {activeTab === 'history' && (
        <HistoryTab sessions={sessions} pipeline={pipeline} onRefresh={loadData} />
      )}
      {activeTab === 'templates' && (
        <TemplatesTab templates={templates} onRefresh={loadData} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ════════════════════════════════════════════════════════════

function OverviewTab({ sessions, pipeline, campaigns, touchpoints }: {
  sessions: any[]; pipeline: any[]; campaigns: any[]; touchpoints: any[];
}) {
  const now = Date.now();
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const thisWeek = now - 7 * 86400000;

  // Funnel stages
  const funnelStages = ['tour_scheduled', 'tour_completed', 'proposal_sent', 'negotiating', 'won'];
  const funnelCounts = funnelStages.map(s =>
    sessions.filter(sess => sess.sales_stage === s).length +
    pipeline.filter(p => p.stage === s).length
  );
  // Deduplicate: prefer pipeline stage
  const stageCounts: Record<string, number> = {};
  funnelStages.forEach(s => {
    stageCounts[s] = pipeline.filter(p => p.stage === s).length || sessions.filter(sess => sess.sales_stage === s).length;
  });
  const totalLeads = sessions.length;

  // KPIs
  const toursTotal = sessions.length;
  const toursMonth = sessions.filter(s => new Date(s.started_at).getTime() >= thisMonth).length;
  const toursWeek = sessions.filter(s => new Date(s.started_at).getTime() >= thisWeek).length;
  const avgDuration = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length / 60)
    : 0;
  const openDeals = pipeline.filter(p => !['won', 'lost', 'churned'].includes(p.stage));
  const pipelineValue = openDeals.reduce((sum, p) => sum + (p.estimated_mrr_cents || 0) * 12, 0);
  const wonMonth = pipeline.filter(p => p.stage === 'won' && p.won_date && new Date(p.won_date).getTime() >= thisMonth).length;
  const wonTotal = pipeline.filter(p => p.stage === 'won').length;
  const lostTotal = pipeline.filter(p => p.stage === 'lost').length;
  const winRate = wonTotal + lostTotal > 0 ? Math.round(wonTotal / (wonTotal + lostTotal) * 100) : 0;
  const wonDeals = pipeline.filter(p => p.stage === 'won' && p.won_date && p.created_at);
  const avgDaysToClose = wonDeals.length > 0
    ? Math.round(wonDeals.reduce((sum, p) => sum + (new Date(p.won_date).getTime() - new Date(p.created_at).getTime()) / 86400000, 0) / wonDeals.length)
    : 0;

  // Source breakdown
  const sourceBreakdown = sessions.reduce((acc, s) => {
    const src = s.source || 'unknown';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const maxSource = Math.max(...Object.values(sourceBreakdown) as number[], 1);

  // Revenue
  const wonMRR = pipeline.filter(p => p.stage === 'won').reduce((sum, p) => sum + (p.estimated_mrr_cents || 0), 0);
  const openMRR = openDeals.reduce((sum, p) => sum + (p.estimated_mrr_cents || 0), 0);
  const launchGoalAccounts = 100;
  const wonAccounts = wonTotal;
  const progress = Math.min(Math.round(wonAccounts / launchGoalAccounts * 100), 100);

  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  const kpis = [
    { label: 'Total Tours', value: toursTotal, icon: Eye },
    { label: 'Tours This Month', value: toursMonth, icon: Calendar },
    { label: 'Tours This Week', value: toursWeek, icon: Clock },
    { label: 'Avg Duration', value: `${avgDuration}m`, icon: Clock },
    { label: 'Pipeline Value', value: formatCents(pipelineValue), icon: DollarSign },
    { label: 'Won This Month', value: wonMonth, icon: Award },
    { label: 'Win Rate', value: `${winRate}%`, icon: TrendingUp },
    { label: 'Avg Days to Close', value: avgDaysToClose || '—', icon: Target },
  ];

  return (
    <div className="space-y-6">
      {/* Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Sales Funnel</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {funnelStages.map((stage, i) => {
            const count = stageCounts[stage] || 0;
            const prev = i > 0 ? (stageCounts[funnelStages[i - 1]] || 0) : totalLeads;
            const rate = prev > 0 ? Math.round(count / prev * 100) : 0;
            return (
              <div key={stage} className="flex items-center gap-2">
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-center min-w-[120px]">
                  <div className="text-lg font-bold" style={{ color: DARK }}>{count}</div>
                  <div className="text-[10px] text-gray-500 font-medium uppercase">{STAGE_LABELS[stage] || stage}</div>
                  {i > 0 && <div className="text-[10px] text-green-600 font-semibold mt-1">{rate}% conv</div>}
                </div>
                {i < funnelStages.length - 1 && <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">{kpi.label}</span>
            </div>
            <div className="text-xl font-bold" style={{ color: DARK }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Source breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Tour Source Breakdown</h3>
        <div className="space-y-2">
          {Object.entries(sourceBreakdown).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
            <div key={source} className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-600 w-28 truncate">{source.replace(/_/g, ' ')}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(count as number) / maxSource * 100}%`, backgroundColor: NAVY }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 w-8 text-right">{count as number}</span>
            </div>
          ))}
          {Object.keys(sourceBreakdown).length === 0 && (
            <p className="text-sm text-gray-400">No tours yet — launch your first tour to see source data.</p>
          )}
        </div>
      </div>

      {/* Revenue impact */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Revenue Impact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <span className="text-xs text-gray-500">Tours Won</span>
            <div className="text-lg font-bold" style={{ color: DARK }}>{wonTotal} accounts = {formatCents(wonMRR)} MRR</div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Pipeline (open)</span>
            <div className="text-lg font-bold" style={{ color: DARK }}>{openDeals.length} accounts = {formatCents(openMRR)} projected MRR</div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Launch Goal</span>
            <div className="text-lg font-bold" style={{ color: DARK }}>{launchGoalAccounts} accounts</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: GOLD }} />
          </div>
          <span className="text-sm font-bold" style={{ color: GOLD }}>{progress}%</span>
        </div>
      </div>

      {/* Active campaigns */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Active Campaigns</h3>
        {activeCampaigns.length === 0 ? (
          <p className="text-sm text-gray-400">No active campaigns. Create one in Marketing Campaigns.</p>
        ) : (
          <div className="space-y-2">
            {activeCampaigns.map(c => {
              const campTouches = touchpoints.filter(t => t.campaign_id === c.id).length;
              return (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{c.name}</span>
                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{c.channel}</span>
                  </div>
                  <span className="text-xs text-gray-500">{campTouches} touch{campTouches !== 1 ? 'es' : ''}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 2 — SETUP TOUR
// ════════════════════════════════════════════════════════════

function SetupTourTab({ templates, campaigns, onLaunch }: {
  templates: any[]; campaigns: any[]; onLaunch: () => void;
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '', county: '', contactName: '', title: '', email: '', phone: '',
    locations: 1, industry: 'restaurant', segment: 'restaurant_single',
    source: 'cold_outreach', campaignId: '', templateId: '',
    scheduleType: 'now' as 'now' | 'later', scheduleDate: '', notes: '',
  });
  const [launching, setLaunching] = useState(false);

  const selectedTemplate = templates.find(t => t.id === form.templateId);

  const updateForm = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleLaunch = async () => {
    if (!form.companyName.trim()) { toast.error('Company name is required'); return; }
    setLaunching(true);
    try {
      const instanceId = `gt_${Date.now()}`;
      const { data: session, error: sessErr } = await supabase.from('demo_sessions').insert({
        account_name: form.companyName.trim(),
        county: form.county || null,
        user_email: form.email || null,
        prospect_name: form.contactName || null,
        prospect_title: form.title || null,
        location_count: form.locations,
        industry: form.industry,
        segment: form.segment,
        source: form.source,
        template_id: form.templateId || null,
        sales_stage: 'tour_scheduled',
        instance_id: instanceId,
      }).select().single();

      if (sessErr) throw sessErr;

      await supabase.from('sales_pipeline').insert({
        session_id: session.id,
        org_name: form.companyName.trim(),
        contact_name: form.contactName || null,
        contact_email: form.email || null,
        contact_title: form.title || null,
        segment: form.segment,
        industry: form.industry,
        location_count: form.locations,
        estimated_mrr_cents: calculateEstimatedMRR(form.locations, form.segment),
        stage: 'tour_scheduled',
        probability_pct: 20,
      });

      if (form.campaignId) {
        await supabase.from('marketing_touchpoints').insert({
          campaign_id: form.campaignId,
          session_id: session.id,
          touchpoint_type: 'first_touch',
          channel: form.source,
        });
      }

      await supabase.from('admin_event_log').insert({
        level: 'INFO', category: 'guided_tour',
        message: `Guided tour launched: ${form.companyName} (${form.county || 'N/A'}) — ${form.contactName || 'N/A'}`,
      });

      toast.success('Tour launched successfully');
      onLaunch();

      if (form.scheduleType === 'now') {
        navigate(`/dashboard?guidedTour=true&instance=${instanceId}&org=${encodeURIComponent(form.companyName)}&county=${form.county}`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLaunching(false);
    }
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Prospect info */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Prospect Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Company Name *" value={form.companyName} onChange={v => updateForm('companyName', v)} placeholder="Clean Kitchen Co." />
            <Input label="County" value={form.county} onChange={v => updateForm('county', v)} placeholder="Los Angeles" />
            <Input label="Contact Name" value={form.contactName} onChange={v => updateForm('contactName', v)} placeholder="Jane Smith" />
            <Input label="Title" value={form.title} onChange={v => updateForm('title', v)} placeholder="Owner" />
            <Input label="Email" value={form.email} onChange={v => updateForm('email', v)} placeholder="jane@example.com" type="email" />
            <Input label="Phone" value={form.phone} onChange={v => updateForm('phone', v)} placeholder="(555) 123-4567" />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Locations</label>
              <input type="number" min={1} value={form.locations} onChange={e => updateForm('locations', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
            </div>
            <Select label="Industry" value={form.industry} onChange={v => updateForm('industry', v)} options={INDUSTRIES.map(i => ({ value: i, label: i.replace(/_/g, ' ') }))} />
          </div>
        </div>

        {/* Source */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">How Did They Find Us?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Source" value={form.source} onChange={v => updateForm('source', v)} options={SOURCES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} />
            <Select label="Campaign" value={form.campaignId} onChange={v => updateForm('campaignId', v)}
              options={[{ value: '', label: '— None —' }, ...activeCampaigns.map(c => ({ value: c.id, label: c.name }))]} />
          </div>
        </div>

        {/* Tour config */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Tour Configuration</h3>
          <Select label="Template" value={form.templateId} onChange={v => updateForm('templateId', v)}
            options={[{ value: '', label: '— No template —' }, ...templates.filter(t => t.is_active).map(t => ({ value: t.id, label: `${t.name} (${t.duration_minutes}m)` }))]} />
          {selectedTemplate && (
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <span className="font-medium">Modules:</span> {(selectedTemplate.modules_enabled || []).join(', ') || 'None'}
              <span className="ml-3 font-medium">Duration:</span> {selectedTemplate.duration_minutes} min
              {selectedTemplate.description && <p className="mt-1 text-gray-400">{selectedTemplate.description}</p>}
            </div>
          )}
          <Select label="Segment" value={form.segment} onChange={v => updateForm('segment', v)} options={SEGMENTS.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} />
        </div>

        {/* Schedule */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Scheduling</h3>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="schedule" checked={form.scheduleType === 'now'} onChange={() => updateForm('scheduleType', 'now')} className="h-4 w-4" />
              <span className="text-sm font-medium text-gray-700">Launch Now</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="schedule" checked={form.scheduleType === 'later'} onChange={() => updateForm('scheduleType', 'later')} className="h-4 w-4" />
              <span className="text-sm font-medium text-gray-700">Schedule for Later</span>
            </label>
          </div>
          {form.scheduleType === 'later' && (
            <input type="datetime-local" value={form.scheduleDate} onChange={e => updateForm('scheduleDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes (internal)</label>
          <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} rows={3} placeholder="Internal notes — not shown to prospect"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] resize-none" />
        </div>

        {/* Est. MRR preview */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <span className="text-gray-500">Estimated MRR:</span>
          <span className="ml-2 font-bold" style={{ color: DARK }}>
            {formatCents(calculateEstimatedMRR(form.locations, form.segment))}/mo
          </span>
          <span className="text-gray-400 ml-2 text-xs">($99 + $49/location)</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleLaunch}
            disabled={!form.companyName.trim() || launching}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-white rounded-lg text-sm font-bold disabled:opacity-40"
            style={{ backgroundColor: NAVY }}
          >
            {launching ? 'Launching...' : (
              <>{form.scheduleType === 'now' ? <Play className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
              {form.scheduleType === 'now' ? 'Launch Guided Tour' : 'Schedule Tour'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 3 — ACTIVE & HISTORY
// ════════════════════════════════════════════════════════════

function HistoryTab({ sessions, pipeline, onRefresh }: {
  sessions: any[]; pipeline: any[]; onRefresh: () => void;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const now = Date.now();
  const activeSessions = sessions.filter(s => s.last_active_at && (now - new Date(s.last_active_at).getTime()) < 3600000);
  const completedSessions = sessions.filter(s => !activeSessions.includes(s)).slice(0, 100);

  // Follow-ups due within 7 days
  const followUps = sessions.filter(s =>
    s.follow_up_at &&
    new Date(s.follow_up_at).getTime() <= now + 7 * 86400000 &&
    s.sales_stage !== 'won' && s.sales_stage !== 'lost'
  ).sort((a, b) => new Date(a.follow_up_at).getTime() - new Date(b.follow_up_at).getTime());

  const handleStageUpdate = async (sessionId: string, newStage: string) => {
    setUpdatingId(sessionId);
    const updates: any = { sales_stage: newStage };
    if (newStage === 'won') updates.converted_at = new Date().toISOString();

    await supabase.from('demo_sessions').update(updates).eq('id', sessionId);

    // Also update pipeline
    const pipelineRow = pipeline.find(p => p.session_id === sessionId);
    if (pipelineRow) {
      const pipeUpdates: any = { stage: newStage, updated_at: new Date().toISOString() };
      if (newStage === 'won') pipeUpdates.won_date = new Date().toISOString().split('T')[0];
      if (newStage === 'lost') pipeUpdates.lost_date = new Date().toISOString().split('T')[0];
      // Update probability
      const probMap: Record<string, number> = {
        tour_scheduled: 20, tour_completed: 35, proposal_sent: 50, negotiating: 70, won: 100, lost: 0,
      };
      if (probMap[newStage] !== undefined) pipeUpdates.probability_pct = probMap[newStage];
      await supabase.from('sales_pipeline').update(pipeUpdates).eq('id', pipelineRow.id);
    }

    toast.success(`Stage updated to ${STAGE_LABELS[newStage] || newStage}`);
    setUpdatingId(null);
    onRefresh();
  };

  const handleSetFollowUp = async (sessionId: string) => {
    const date = prompt('Set follow-up date (YYYY-MM-DD):');
    if (!date) return;
    await supabase.from('demo_sessions').update({ follow_up_at: date + 'T09:00:00Z' }).eq('id', sessionId);
    toast.success('Follow-up set');
    onRefresh();
  };

  const handleAddNote = async (sessionId: string) => {
    const note = prompt('Add outcome note:');
    if (!note) return;
    await supabase.from('demo_sessions').update({ outcome_notes: note }).eq('id', sessionId);
    toast.success('Note saved');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Follow-up tracker */}
      {followUps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Follow-ups Due
          </h3>
          <div className="space-y-2">
            {followUps.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                <div>
                  <span className="text-sm font-semibold text-gray-900">{s.account_name}</span>
                  <span className="ml-2 text-xs text-gray-500">{s.prospect_name || s.user_email}</span>
                  <span className="ml-2 text-xs text-amber-600 font-medium">{formatDate(s.follow_up_at)}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleAddNote(s.id)} className="px-2 py-1 text-xs border border-gray-200 rounded text-gray-600 hover:bg-gray-50">Log Contact</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active tours */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Active Tours ({activeSessions.length})
          </h3>
          <button onClick={onRefresh} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
        {activeSessions.length === 0 ? (
          <p className="text-sm text-gray-400">No active tours right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Company</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Contact</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">County</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Started</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Stage</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map(s => (
                  <SessionRow key={s.id} session={s} updatingId={updatingId}
                    onStageUpdate={handleStageUpdate} onFollowUp={handleSetFollowUp} onAddNote={handleAddNote} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Completed tours */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
          Tour History ({completedSessions.length})
        </h3>
        {completedSessions.length === 0 ? (
          <p className="text-sm text-gray-400">No completed tours yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Company</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Contact</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Industry</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700">Loc</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Source</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Stage</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Date</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {completedSessions.map(s => (
                  <SessionRow key={s.id} session={s} updatingId={updatingId}
                    onStageUpdate={handleStageUpdate} onFollowUp={handleSetFollowUp} onAddNote={handleAddNote} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionRow({ session: s, updatingId, onStageUpdate, onFollowUp, onAddNote }: {
  session: any; updatingId: string | null;
  onStageUpdate: (id: string, stage: string) => void;
  onFollowUp: (id: string) => void;
  onAddNote: (id: string) => void;
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-2 font-medium text-gray-900">{s.account_name}</td>
      <td className="px-3 py-2 text-gray-600">{s.prospect_name || s.user_email || '—'}</td>
      <td className="px-3 py-2 text-gray-500 text-xs">{s.industry || s.county || '—'}</td>
      <td className="px-3 py-2 text-center text-gray-500">{s.location_count || '—'}</td>
      <td className="px-3 py-2 text-xs text-gray-500">{(s.source || '—').replace(/_/g, ' ')}</td>
      <td className="px-3 py-2">
        <select
          value={s.sales_stage || 'tour_scheduled'}
          onChange={e => onStageUpdate(s.id, e.target.value)}
          disabled={updatingId === s.id}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none"
        >
          {STAGES.map(st => <option key={st} value={st}>{STAGE_LABELS[st]}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 text-xs text-gray-500">{formatDate(s.started_at)}</td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => onFollowUp(s.id)} className="px-2 py-1 text-[10px] border border-gray-200 rounded hover:bg-gray-50" title="Set follow-up">
            <Calendar className="h-3 w-3" />
          </button>
          <button onClick={() => onAddNote(s.id)} className="px-2 py-1 text-[10px] border border-gray-200 rounded hover:bg-gray-50" title="Add note">
            <MessageSquare className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 4 — TEMPLATES
// ════════════════════════════════════════════════════════════

function TemplatesTab({ templates, onRefresh }: { templates: any[]; onRefresh: () => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const handleToggleActive = async (id: string, current: boolean) => {
    await supabase.from('guided_tour_templates').update({ is_active: !current }).eq('id', id);
    toast.success(`Template ${current ? 'deactivated' : 'activated'}`);
    onRefresh();
  };

  const handleDuplicate = async (template: any) => {
    const { id, created_at, ...rest } = template;
    await supabase.from('guided_tour_templates').insert({ ...rest, name: `${rest.name} (Copy)` });
    toast.success('Template duplicated');
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await supabase.from('guided_tour_templates').delete().eq('id', id);
    toast.success('Template deleted');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-900">{templates.length} Templates</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: NAVY }}
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-semibold text-gray-900">{t.name}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{t.target_segment?.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-400">{t.duration_minutes} min</span>
                  {!t.is_active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                </div>
              </div>
              <button
                onClick={() => handleToggleActive(t.id, t.is_active)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.is_active ? 'border-green-300 text-green-700 bg-green-50' : 'border-gray-300 text-gray-500'}`}
              >
                {t.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
            {t.description && <p className="text-xs text-gray-500 mb-2">{t.description}</p>}
            <div className="text-xs text-gray-400 mb-3">
              <span className="font-medium">Modules:</span> {(t.modules_enabled || []).join(', ') || 'None'}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditId(t.id)} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 flex items-center gap-1">
                <Edit2 className="h-3 w-3" /> Edit
              </button>
              <button onClick={() => handleDuplicate(t)} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 flex items-center gap-1">
                <Copy className="h-3 w-3" /> Duplicate
              </button>
              <button onClick={() => handleDelete(t.id)} className="px-2 py-1 text-xs border border-red-200 rounded hover:bg-red-50 text-red-600 flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {(showCreate || editId) && (
        <TemplateModal
          template={editId ? templates.find(t => t.id === editId) : null}
          onClose={() => { setShowCreate(false); setEditId(null); }}
          onSave={onRefresh}
        />
      )}
    </div>
  );
}

function TemplateModal({ template, onClose, onSave }: {
  template: any | null; onClose: () => void; onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: template?.name || '',
    description: template?.description || '',
    target_segment: template?.target_segment || 'default',
    county: template?.county || '',
    industry: template?.industry || '',
    duration_minutes: template?.duration_minutes || 20,
    modules_enabled: template?.modules_enabled || [],
    is_active: template?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const toggleModule = (mod: string) => {
    setForm(prev => ({
      ...prev,
      modules_enabled: prev.modules_enabled.includes(mod)
        ? prev.modules_enabled.filter((m: string) => m !== mod)
        : [...prev.modules_enabled, mod],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      county: form.county || null,
      industry: form.industry || null,
      created_by: 'arthur@getevidly.com',
    };

    if (template) {
      await supabase.from('guided_tour_templates').update(payload).eq('id', template.id);
    } else {
      await supabase.from('guided_tour_templates').insert(payload);
    }
    toast.success(template ? 'Template updated' : 'Template created');
    setSaving(false);
    onClose();
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-4 sm:p-6 w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{template ? 'Edit Template' : 'New Template'}</h3>
        <div className="space-y-4">
          <Input label="Name *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
          </div>
          <Select label="Target Segment" value={form.target_segment} onChange={v => setForm(p => ({ ...p, target_segment: v }))}
            options={[{ value: 'default', label: 'Default' }, ...SEGMENTS.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))]} />
          <Input label="County (optional)" value={form.county} onChange={v => setForm(p => ({ ...p, county: v }))} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input type="number" min={5} value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 20 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Modules to Highlight</label>
            <div className="flex flex-wrap gap-2">
              {MODULES.map(mod => (
                <button key={mod} type="button" onClick={() => toggleModule(mod)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.modules_enabled.includes(mod)
                      ? 'bg-[#1e4d6b] text-white border-[#1e4d6b]'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}>
                  {mod.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded" />
            <span className="text-sm text-gray-700">Active</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 min-h-[44px] border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={!form.name.trim() || saving}
            className="flex-1 px-4 py-2.5 min-h-[44px] text-white rounded-lg text-sm font-bold disabled:opacity-40" style={{ backgroundColor: NAVY }}>
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared form components ─────────────────────────────────

function Input({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] bg-white">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
