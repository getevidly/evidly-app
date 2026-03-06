/**
 * Marketing Campaigns — Channel performance, campaign management, attribution
 * Route: /admin/campaigns
 * Access: platform_admin / @getevidly.com
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import { toast } from 'sonner';
import {
  BarChart3, Plus, TrendingUp, DollarSign, Target,
  Users, X, Calendar, Eye, Award, Filter,
} from 'lucide-react';

const NAVY = '#1e4d6b';
const GOLD = '#A08C5A';
const DARK = '#1E2D4D';

type Tab = 'dashboard' | 'campaigns' | 'attribution';

const CHANNELS = ['email', 'linkedin', 'cold_call', 'event', 'referral', 'seo', 'paid_ads', 'partner', 'direct', 'other'];
const STATUS_OPTS = ['active', 'paused', 'completed'];

function formatCents(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MarketingCampaigns() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [touchpoints, setTouchpoints] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [campRes, touchRes, pipeRes, sessRes] = await Promise.all([
      supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('marketing_touchpoints').select('*').order('created_at', { ascending: false }),
      supabase.from('sales_pipeline').select('*'),
      supabase.from('demo_sessions').select('*'),
    ]);
    if (campRes.data) setCampaigns(campRes.data);
    if (touchRes.data) setTouchpoints(touchRes.data);
    if (pipeRes.data) setPipeline(pipeRes.data);
    if (sessRes.data) setSessions(sessRes.data);
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'attribution', label: 'Attribution' },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <AdminBreadcrumb crumbs={[{ label: 'Marketing Campaigns' }]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Marketing Campaigns</h1>
      <p className="text-sm text-gray-600 mb-6">Track campaigns, channel performance, and tour attribution</p>

      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-[#1e4d6b] text-[#1e4d6b]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'dashboard' && <DashboardTab campaigns={campaigns} touchpoints={touchpoints} pipeline={pipeline} sessions={sessions} />}
      {activeTab === 'campaigns' && <CampaignsTab campaigns={campaigns} touchpoints={touchpoints} pipeline={pipeline} onRefresh={loadData} />}
      {activeTab === 'attribution' && <AttributionTab campaigns={campaigns} touchpoints={touchpoints} pipeline={pipeline} sessions={sessions} />}
    </div>
  );
}

// ── Dashboard Tab ──────────────────────────────────────────

function DashboardTab({ campaigns, touchpoints, pipeline, sessions }: {
  campaigns: any[]; touchpoints: any[]; pipeline: any[]; sessions: any[];
}) {
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const recentTouchpoints = touchpoints.filter(t => new Date(t.created_at).getTime() >= thirtyDaysAgo);

  // Channel performance
  const channelPerf = useMemo(() => {
    const perf: Record<string, { touches: number; tours: number; won: number; pipelineMRR: number; budget: number }> = {};
    CHANNELS.forEach(ch => { perf[ch] = { touches: 0, tours: 0, won: 0, pipelineMRR: 0, budget: 0 }; });

    recentTouchpoints.forEach(t => {
      const ch = t.channel || 'other';
      if (perf[ch]) perf[ch].touches++;
    });

    // Map sessions to channels
    sessions.forEach(s => {
      const ch = s.source || 'other';
      const mapped = ch === 'cold_outreach' ? 'cold_call' : ch === 'inbound' ? 'seo' : ch;
      if (perf[mapped]) perf[mapped].tours++;
    });

    // Map won deals to channels
    pipeline.filter(p => p.stage === 'won').forEach(p => {
      const session = sessions.find(s => s.id === p.session_id);
      const ch = session?.source || 'other';
      const mapped = ch === 'cold_outreach' ? 'cold_call' : ch === 'inbound' ? 'seo' : ch;
      if (perf[mapped]) {
        perf[mapped].won++;
        perf[mapped].pipelineMRR += p.estimated_mrr_cents || 0;
      }
    });

    campaigns.forEach(c => {
      if (perf[c.channel]) perf[c.channel].budget += c.budget_cents || 0;
    });

    return Object.entries(perf).filter(([, v]) => v.touches > 0 || v.tours > 0 || v.budget > 0)
      .sort((a, b) => b[1].tours - a[1].tours);
  }, [recentTouchpoints, sessions, pipeline, campaigns]);

  // Top campaigns
  const topCampaigns = useMemo(() => {
    return campaigns.map(c => {
      const campTouches = touchpoints.filter(t => t.campaign_id === c.id);
      const tourCount = campTouches.filter(t => t.session_id).length;
      return { ...c, touches: campTouches.length, tours: tourCount };
    }).sort((a, b) => b.tours - a.tours).slice(0, 5);
  }, [campaigns, touchpoints]);

  const totalTours = sessions.length;
  const totalWon = pipeline.filter(p => p.stage === 'won').length;
  const totalMRR = pipeline.filter(p => p.stage === 'won').reduce((sum, p) => sum + (p.estimated_mrr_cents || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile label="Active Campaigns" value={campaigns.filter(c => c.status === 'active').length} />
        <KpiTile label="Touches (30d)" value={recentTouchpoints.length} />
        <KpiTile label="Total Tours" value={totalTours} />
        <KpiTile label="Won Deals" value={totalWon} valueColor="green" />
      </div>

      {/* Channel performance */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Channel Performance (30d)</h3>
        {channelPerf.length === 0 ? (
          <p className="text-sm text-gray-400">No channel data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Channel</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700">Touches</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700">Tours</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700">Won</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700">Pipeline MRR</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700">CAC</th>
                </tr>
              </thead>
              <tbody>
                {channelPerf.map(([ch, v]) => (
                  <tr key={ch} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-900 capitalize">{ch.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{v.touches}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{v.tours}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{v.won}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatCents(v.pipelineMRR)}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{v.budget > 0 && v.won > 0 ? formatCents(Math.round(v.budget / v.won)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top campaigns */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Top Campaigns</h3>
        {topCampaigns.length === 0 ? (
          <p className="text-sm text-gray-400">No campaigns created yet.</p>
        ) : (
          <div className="space-y-2">
            {topCampaigns.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-sm font-semibold text-gray-900">{c.name}</span>
                  <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">{c.channel?.replace(/_/g, ' ')}</span>
                  <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-50 text-green-700' : c.status === 'paused' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {c.touches} touches · {c.tours} tours
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Campaigns Tab ──────────────────────────────────────────

function CampaignsTab({ campaigns, touchpoints, pipeline, onRefresh }: {
  campaigns: any[]; touchpoints: any[]; pipeline: any[]; onRefresh: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);

  const enriched = useMemo(() => {
    return campaigns.map(c => {
      const campTouches = touchpoints.filter(t => t.campaign_id === c.id);
      return { ...c, touches: campTouches.length, tours: campTouches.filter(t => t.session_id).length };
    });
  }, [campaigns, touchpoints]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">{campaigns.length} Campaigns</h3>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ backgroundColor: NAVY }}>
          <Plus className="h-4 w-4" /> New Campaign
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Channel</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Start</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">End</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Budget</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Tours</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{c.channel?.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-50 text-green-700' : c.status === 'paused' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.start_date)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.end_date)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{c.budget_cents > 0 ? formatCents(c.budget_cents) : '—'}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">{c.tours}</td>
              </tr>
            ))}
            {enriched.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No campaigns yet. Create your first campaign.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CampaignModal onClose={() => setShowCreate(false)} onSave={() => { setShowCreate(false); onRefresh(); }} />}
    </div>
  );
}

function CampaignModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: '', channel: 'email', target_segment: '', budget_cents: 0,
    utm_source: '', utm_medium: '', utm_campaign: '',
    start_date: '', end_date: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    await supabase.from('marketing_campaigns').insert({
      ...form, name: form.name.trim(),
      start_date: form.start_date || null, end_date: form.end_date || null,
      target_segment: form.target_segment || null,
      utm_source: form.utm_source || null, utm_medium: form.utm_medium || null, utm_campaign: form.utm_campaign || null,
    });
    toast.success('Campaign created');
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-4 sm:p-6 w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4">New Campaign</h3>
        <div className="space-y-4">
          <FormInput label="Campaign Name *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
          <FormSelect label="Channel" value={form.channel} onChange={v => setForm(p => ({ ...p, channel: v }))}
            options={CHANNELS.map(c => ({ value: c, label: c.replace(/_/g, ' ') }))} />
          <FormInput label="Target Segment" value={form.target_segment} onChange={v => setForm(p => ({ ...p, target_segment: v }))} placeholder="e.g., restaurant_single" />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Budget ($)</label>
            <input type="number" min={0} value={form.budget_cents / 100} onChange={e => setForm(p => ({ ...p, budget_cents: Math.round(parseFloat(e.target.value || '0') * 100) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
            </div>
          </div>
          <FormInput label="UTM Source" value={form.utm_source} onChange={v => setForm(p => ({ ...p, utm_source: v }))} placeholder="google" />
          <FormInput label="UTM Medium" value={form.utm_medium} onChange={v => setForm(p => ({ ...p, utm_medium: v }))} placeholder="cpc" />
          <FormInput label="UTM Campaign" value={form.utm_campaign} onChange={v => setForm(p => ({ ...p, utm_campaign: v }))} placeholder="spring_2026" />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 min-h-[44px] border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={!form.name.trim() || saving}
            className="flex-1 px-4 py-2.5 min-h-[44px] text-white rounded-lg text-sm font-bold disabled:opacity-40" style={{ backgroundColor: NAVY }}>
            {saving ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Attribution Tab ────────────────────────────────────────

function AttributionTab({ campaigns, touchpoints, pipeline, sessions }: {
  campaigns: any[]; touchpoints: any[]; pipeline: any[]; sessions: any[];
}) {
  const [attrModel, setAttrModel] = useState<'first_touch' | 'last_touch'>('first_touch');

  const wonDeals = pipeline.filter(p => p.stage === 'won');

  // Attribution: connect won deals → touchpoints → campaigns
  const attributedDeals = useMemo(() => {
    return wonDeals.map(deal => {
      const dealTouchpoints = touchpoints.filter(t => t.session_id === deal.session_id);
      const relevantTouch = attrModel === 'first_touch'
        ? dealTouchpoints.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
        : dealTouchpoints.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      const campaign = relevantTouch ? campaigns.find(c => c.id === relevantTouch.campaign_id) : null;
      return { ...deal, campaign, touchpoint: relevantTouch };
    });
  }, [wonDeals, touchpoints, campaigns, attrModel]);

  // Pipeline by source
  const sourceBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; mrr: number }> = {};
    pipeline.forEach(p => {
      const session = sessions.find(s => s.id === p.session_id);
      const source = session?.source || 'unknown';
      if (!breakdown[source]) breakdown[source] = { count: 0, mrr: 0 };
      breakdown[source].count++;
      breakdown[source].mrr += p.estimated_mrr_cents || 0;
    });
    return Object.entries(breakdown).sort((a, b) => b[1].mrr - a[1].mrr);
  }, [pipeline, sessions]);

  const maxMRR = Math.max(...sourceBreakdown.map(([, v]) => v.mrr), 1);

  return (
    <div className="space-y-6">
      {/* Attribution model toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-gray-700">Attribution Model:</span>
        <button onClick={() => setAttrModel('first_touch')}
          className={`px-3 py-1 rounded-full text-xs font-semibold ${attrModel === 'first_touch' ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
          style={attrModel === 'first_touch' ? { backgroundColor: NAVY } : undefined}>First Touch</button>
        <button onClick={() => setAttrModel('last_touch')}
          className={`px-3 py-1 rounded-full text-xs font-semibold ${attrModel === 'last_touch' ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
          style={attrModel === 'last_touch' ? { backgroundColor: NAVY } : undefined}>Last Touch</button>
      </div>

      {/* Won deal attribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Won Deal Attribution ({attrModel.replace('_', ' ')})</h3>
        {attributedDeals.length === 0 ? (
          <p className="text-sm text-gray-400">No won deals to attribute yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Company</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700">MRR</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Campaign</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Channel</th>
                </tr>
              </thead>
              <tbody>
                {attributedDeals.map(d => (
                  <tr key={d.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-900">{d.org_name}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatCents(d.estimated_mrr_cents)}/mo</td>
                    <td className="px-3 py-2 text-gray-600">{d.campaign?.name || '— No campaign —'}</td>
                    <td className="px-3 py-2 text-gray-500 capitalize">{d.touchpoint?.channel?.replace(/_/g, ' ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pipeline by source */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Pipeline by Source</h3>
        {sourceBreakdown.length === 0 ? (
          <p className="text-sm text-gray-400">No pipeline data yet.</p>
        ) : (
          <div className="space-y-2">
            {sourceBreakdown.map(([source, v]) => (
              <div key={source} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600 w-28 truncate capitalize">{source.replace(/_/g, ' ')}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${v.mrr / maxMRR * 100}%`, backgroundColor: NAVY }} />
                </div>
                <span className="text-xs font-bold text-gray-700 w-20 text-right">{formatCents(v.mrr)} MRR</span>
                <span className="text-xs text-gray-400 w-12 text-right">{v.count} deals</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────

// KpiCard removed — using shared KpiTile

function FormInput({ label, value, onChange, placeholder, type = 'text' }: {
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

function FormSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
