/**
 * Guided Tours — Tour setup, templates, pipeline overview, and history
 * Route: /admin/guided-tours
 * Access: platform_admin / @getevidly.com
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import OrgCombobox, { type OrgOption } from '../../components/admin/OrgCombobox';
import { ALL_MODULES } from '../../config/tourModules';
import { StatCardRow } from '../../components/admin/StatCardRow';
import { toast } from 'sonner';
import {
  Play, Plus, Clock, Users, DollarSign, TrendingUp, Target,
  ChevronRight, Calendar, Edit2, Copy, Trash2, X, Check,
  BarChart3, ArrowRight, RefreshCw, MessageSquare, Eye,
  Layers, Zap, Award, Filter,
} from 'lucide-react';
import { useDemoGuard } from '../../hooks/useDemoGuard';

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

// ── PRICING — EXACT RULES ──
// Pilot:    $49 covers 1st location. +$49 each additional.  (Founder testing tier)
// Founder:  $99 covers 1st location. +$49 each additional.
// Standard: $199 covers 1st location. +$99 each additional.
// Enterprise: custom — manual entry.
//
// Verified matrix:
// Plan       | 1 loc | 2 locs | 3 locs | 5 locs | 10 locs
// -----------|-------|--------|--------|--------|--------
// Pilot      | $49   | $98    | $147   | $245   | $490
// Founder    | $99   | $148   | $197   | $295   | $540
// Standard   | $199  | $298   | $397   | $595   | $1,090

const PLANS = {
  pilot:      { label: 'Pilot',      addonLabel: 'FOUNDER TESTING' as string | null },
  founder:    { label: 'Founder',    addonLabel: null },
  standard:   { label: 'Standard',   addonLabel: null },
  enterprise: { label: 'Enterprise', addonLabel: null },
} as const;

type PlanKey = keyof typeof PLANS;

const calculateMRR = (plan: PlanKey, locationCount: number): number => {
  const add = Math.max(0, locationCount - 1);
  if (plan === 'pilot')    return 4900  + (add * 4900);
  if (plan === 'founder')  return 9900  + (add * 4900);
  if (plan === 'standard') return 19900 + (add * 9900);
  return 0; // enterprise — manual entry
};

const CONTACT_ROLES = [
  { value: 'owner_operator',     label: 'Owner / Operator' },
  { value: 'gm',                 label: 'General Manager' },
  { value: 'kitchen_manager',    label: 'Kitchen Manager' },
  { value: 'facilities',         label: 'Facility Manager' },
  { value: 'chef',               label: 'Chef' },
  { value: 'kitchen_staff',      label: 'Kitchen Staff' },
  { value: 'compliance_officer', label: 'Compliance Officer' },
] as const;

interface LocationContact {
  role: string;
  fullName: string;
  email: string;
  phone: string;
}

interface TourLocation {
  id: string;
  name: string;
  address: string;
  contacts: LocationContact[];
}

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

// ════════════════════════════════════════════════════════════
// ModuleGroupToggles — used in TemplateModal and SetupTourTab
// ════════════════════════════════════════════════════════════

function ModuleGroupToggles({
  enabled,
  onChange,
}: {
  enabled: string[];
  onChange: (modules: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(enabled.includes(id)
      ? enabled.filter(m => m !== id)
      : [...enabled, id]);
  };

  const toggleGroup = (groupModules: readonly { id: string }[]) => {
    const ids = groupModules.map(m => m.id);
    const allOn = ids.every(id => enabled.includes(id));
    if (allOn) {
      onChange(enabled.filter(id => !ids.includes(id)));
    } else {
      onChange([...new Set([...enabled, ...ids])]);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {ALL_MODULES.map(group => {
        const groupIds = group.modules.map(m => m.id);
        const allOn  = groupIds.every(id => enabled.includes(id));
        const someOn = groupIds.some(id => enabled.includes(id));

        return (
          <div key={group.group} className="bg-[#FAFAF8] border border-[#E5E0D8] rounded-[10px] overflow-hidden">
            {/* Group header */}
            <div className="py-[11px] px-4 flex items-center justify-between border-b border-[#E5E0D8] bg-white">
              <div>
                <div className="text-xs font-bold text-navy">{group.group}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{group.description}</div>
              </div>
              <button
                type="button"
                onClick={() => toggleGroup(group.modules)}
                className={`text-[10px] font-semibold py-[3px] px-2.5 rounded-md cursor-pointer border ${
                  allOn
                    ? 'bg-[#FAF7F2] border-gold text-gold'
                    : 'bg-white border-[#E5E0D8] text-gray-400'
                }`}
              >
                {allOn ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Module list */}
            <div className="py-2 px-3 flex flex-col gap-1">
              {group.modules.map(mod => {
                const on = enabled.includes(mod.id);
                return (
                  <label key={mod.id} className={`flex items-start gap-2.5 py-[7px] px-2 rounded-[7px] cursor-pointer transition-[background] duration-[120ms] ${
                    on ? 'bg-gold/[0.06]' : 'bg-transparent'
                  }`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(mod.id)}
                      className="mt-0.5 accent-gold"
                    />
                    <div>
                      <div className={`text-xs ${on ? 'font-semibold text-navy' : 'font-normal text-[#4A5568]'}`}>
                        {mod.label}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-px">{mod.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════

export default function GuidedTours() {
  useDemoGuard();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // ── Shared data ──
  const [sessions, setSessions] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [touchpoints, setTouchpoints] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [sessRes, pipeRes, campRes, touchRes, tplRes, orgRes] = await Promise.all([
      supabase.from('demo_sessions').select('*').order('started_at', { ascending: false }),
      supabase.from('sales_pipeline').select('*').order('estimated_mrr_cents', { ascending: false }),
      supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('marketing_touchpoints').select('*').order('created_at', { ascending: false }),
      supabase.from('guided_tour_templates').select('*').order('created_at'),
      supabase.from('organizations').select('id, name').order('name'),
    ]);
    if (sessRes.data) setSessions(sessRes.data);
    if (pipeRes.data) setPipeline(pipeRes.data);
    if (campRes.data) setCampaigns(campRes.data);
    if (touchRes.data) setTouchpoints(touchRes.data);
    if (tplRes.data) setTemplates(tplRes.data);
    if (orgRes.data) setOrgs(orgRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Breadcrumb label per tab
  const tabBreadcrumb = activeTab === 'setup' ? 'Setup Tour'
    : activeTab === 'history' ? 'Active & History'
    : activeTab === 'templates' ? 'Templates'
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="font-['DM_Sans','Inter',sans-serif]">
      <AdminBreadcrumb crumbs={
        tabBreadcrumb
          ? [{ label: 'Guided Tours', path: '/admin/guided-tours' }, { label: tabBreadcrumb }]
          : [{ label: 'Guided Tours' }]
      } />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-navy m-0 font-['Outfit',sans-serif]">Guided Tours</h1>
          <p className="text-[13px] text-gray-500 mt-1 mb-0 font-['Inter',sans-serif]">In-product onboarding for new customers — guides them through first location setup, jurisdiction configuration, and compliance categorys</p>
        </div>
        <button
          onClick={() => setActiveTab('setup')}
          className="flex items-center gap-2 px-4 py-2 min-h-[44px] text-white rounded-lg text-sm font-medium shadow-sm bg-navy"
        >
          <Play className="h-4 w-4" /> Launch Tour
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-navy/10">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-navy text-navy'
                : 'border-transparent text-navy/50 hover:text-navy/80'
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
        <SetupTourTab templates={templates} campaigns={campaigns} orgs={orgs} onLaunch={loadData} />
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
// TAB 1 — OVERVIEW (unchanged)
// ════════════════════════════════════════════════════════════

function OverviewTab({ sessions, pipeline, campaigns, touchpoints }: {
  sessions: any[]; pipeline: any[]; campaigns: any[]; touchpoints: any[];
}) {
  const now = Date.now();
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const thisWeek = now - 7 * 86400000;

  const funnelStages = ['tour_scheduled', 'tour_completed', 'proposal_sent', 'negotiating', 'won'];
  const stageCounts: Record<string, number> = {};
  funnelStages.forEach(s => {
    stageCounts[s] = pipeline.filter(p => p.stage === s).length || sessions.filter(sess => sess.sales_stage === s).length;
  });
  const totalLeads = sessions.length;

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

  const sourceBreakdown = sessions.reduce((acc, s) => {
    const src = s.source || 'unknown';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const maxSource = Math.max(...Object.values(sourceBreakdown) as number[], 1);

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
      <div className="bg-white rounded-xl border border-navy/10 p-6">
        <h3 className="text-sm font-bold text-navy mb-4 uppercase tracking-wide">Sales Funnel</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {funnelStages.map((stage, i) => {
            const count = stageCounts[stage] || 0;
            const prev = i > 0 ? (stageCounts[funnelStages[i - 1]] || 0) : totalLeads;
            const rate = prev > 0 ? Math.round(count / prev * 100) : 0;
            return (
              <div key={stage} className="flex items-center gap-2">
                <div className="bg-cream rounded-xl px-4 py-3 text-center min-w-[120px]">
                  <div className="text-lg font-bold text-navy">{count}</div>
                  <div className="text-xs text-navy/50 font-medium uppercase">{STAGE_LABELS[stage] || stage}</div>
                  {i > 0 && <div className="text-xs text-green-600 font-semibold mt-1">{rate}% conv</div>}
                </div>
                {i < funnelStages.length - 1 && <ChevronRight className="h-4 w-4 text-navy/30 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI cards */}
      <StatCardRow cards={[
        { label: 'TOTAL TOURS', value: toursTotal },
        { label: 'TOURS THIS MONTH', value: toursMonth },
        { label: 'TOURS THIS WEEK', value: toursWeek },
        { label: 'AVG DURATION', value: `${avgDuration}m` },
        { label: 'PIPELINE VALUE', value: formatCents(pipelineValue), valueColor: 'gold' },
        { label: 'WON THIS MONTH', value: wonMonth, valueColor: 'green' },
        { label: 'WIN RATE', value: `${winRate}%` },
        { label: 'AVG DAYS TO CLOSE', value: avgDaysToClose || '—' },
      ]} />

      {/* Source breakdown */}
      <div className="bg-white rounded-xl border border-navy/10 p-6">
        <h3 className="text-sm font-bold text-navy mb-4 uppercase tracking-wide">Tour Source Breakdown</h3>
        <div className="space-y-2">
          {Object.entries(sourceBreakdown).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
            <div key={source} className="flex items-center gap-3">
              <span className="text-xs font-medium text-navy/70 w-28 truncate">{source.replace(/_/g, ' ')}</span>
              <div className="flex-1 bg-navy/5 rounded-full h-5 overflow-hidden">
                <div className="h-full rounded-full transition-all bg-navy" style={{ width: `${(count as number) / maxSource * 100}%` }} />
              </div>
              <span className="text-xs font-bold text-navy/80 w-8 text-right">{count as number}</span>
            </div>
          ))}
          {Object.keys(sourceBreakdown).length === 0 && (
            <p className="text-sm text-navy/30">No tours yet — launch your first tour to see source data.</p>
          )}
        </div>
      </div>

      {/* Revenue impact */}
      <div className="bg-white rounded-xl border border-navy/10 p-6">
        <h3 className="text-sm font-bold text-navy mb-4 uppercase tracking-wide">Revenue Impact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <span className="text-xs text-navy/50">Tours Won</span>
            <div className="text-lg font-bold text-navy">{wonTotal} accounts = {formatCents(wonMRR)} MRR</div>
          </div>
          <div>
            <span className="text-xs text-navy/50">Pipeline (open)</span>
            <div className="text-lg font-bold text-navy">{openDeals.length} accounts = {formatCents(openMRR)} projected MRR</div>
          </div>
          <div>
            <span className="text-xs text-navy/50">Launch Goal</span>
            <div className="text-lg font-bold text-navy">{launchGoalAccounts} accounts</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-navy/5 rounded-full h-4 overflow-hidden">
            <div className="h-full rounded-full transition-all bg-gold" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm font-bold text-gold">{progress}%</span>
        </div>
      </div>

      {/* Active campaigns */}
      <div className="bg-white rounded-xl border border-navy/10 p-6">
        <h3 className="text-sm font-bold text-navy mb-4 uppercase tracking-wide">Active Campaigns</h3>
        {activeCampaigns.length === 0 ? (
          <p className="text-sm text-navy/30">No active campaigns. Create one in Marketing Campaigns.</p>
        ) : (
          <div className="space-y-2">
            {activeCampaigns.map(c => {
              const campTouches = touchpoints.filter(t => t.campaign_id === c.id).length;
              return (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-navy/5 last:border-0">
                  <div>
                    <span className="text-sm font-semibold text-navy">{c.name}</span>
                    <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{c.channel}</span>
                  </div>
                  <span className="text-xs text-navy/50">{campTouches} touch{campTouches !== 1 ? 'es' : ''}</span>
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
// TAB 2 — SETUP TOUR (major rewrite)
// ════════════════════════════════════════════════════════════

function SetupTourTab({ templates, campaigns, orgs, onLaunch }: {
  templates: any[]; campaigns: any[]; orgs: { id: string; name: string }[]; onLaunch: () => void;
}) {
  const navigate = useNavigate();

  // Prospect form
  const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
  const [county, setCounty] = useState('');
  const [contactName, setContactName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('restaurant');
  const [segment, setSegment] = useState('restaurant_single');
  const [source, setSource] = useState('cold_outreach');
  const [campaignId, setCampaignId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [notes, setNotes] = useState('');

  // Plan selector
  const [plan, setPlan] = useState<PlanKey>('founder');
  const [customMRR, setCustomMRR] = useState<number | null>(null);

  // Locations builder
  const [locations, setLocations] = useState<TourLocation[]>([
    { id: crypto.randomUUID(), name: '', address: '', contacts: [] },
  ]);

  // Module customization
  const [showCustomModules, setShowCustomModules] = useState(false);
  const [customModules, setCustomModules] = useState<string[]>([]);

  const [launching, setLaunching] = useState(false);

  const selectedTemplate = templates.find(t => t.id === templateId);

  // When template is selected, seed customModules from it
  useEffect(() => {
    if (selectedTemplate) {
      setCustomModules(selectedTemplate.modules_enabled || []);
      setShowCustomModules(false);
    }
  }, [templateId]);

  const estimatedMRR = plan === 'enterprise' ? (customMRR || 0) : calculateMRR(plan, locations.length);

  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  // Location helpers
  const addLocation = () => setLocations(p => [...p, { id: crypto.randomUUID(), name: '', address: '', contacts: [] }]);
  const removeLocation = (id: string) => setLocations(p => p.length > 1 ? p.filter(l => l.id !== id) : p);
  const updateLocation = (id: string, field: 'name' | 'address', value: string) =>
    setLocations(p => p.map(l => l.id === id ? { ...l, [field]: value } : l));
  const addContact = (lid: string) =>
    setLocations(p => p.map(l => l.id === lid
      ? { ...l, contacts: [...l.contacts, { role: 'owner_operator', fullName: '', email: '', phone: '' }] }
      : l));
  const updateContact = (lid: string, idx: number, field: keyof LocationContact, value: string) =>
    setLocations(p => p.map(l => l.id === lid
      ? { ...l, contacts: l.contacts.map((c, i) => i === idx ? { ...c, [field]: value } : c) }
      : l));
  const removeContact = (lid: string, idx: number) =>
    setLocations(p => p.map(l => l.id === lid
      ? { ...l, contacts: l.contacts.filter((_, i) => i !== idx) }
      : l));

  const companyName = selectedOrg?.name || '';

  const handleLaunch = async () => {
    if (!companyName.trim()) { toast.error('Company name is required'); return; }
    setLaunching(true);
    try {
      const instanceId = `gt_${Date.now()}`;
      const { data: session, error: sessErr } = await supabase.from('demo_sessions').insert({
        account_name: companyName.trim(),
        county: county || null,
        user_email: email || null,
        prospect_name: contactName || null,
        prospect_title: title || null,
        location_count: locations.length,
        industry,
        segment,
        source,
        template_id: templateId || null,
        sales_stage: 'tour_scheduled',
        instance_id: instanceId,
        plan,
        metadata: {
          plan,
          estimated_mrr_cents: estimatedMRR,
          modules: customModules,
          locations: locations.map(l => ({
            name: l.name, address: l.address, contacts: l.contacts,
          })),
        },
      }).select().single();

      if (sessErr) throw sessErr;

      await supabase.from('sales_pipeline').insert({
        session_id: session.id,
        org_name: companyName.trim(),
        contact_name: contactName || null,
        contact_email: email || null,
        contact_title: title || null,
        segment,
        industry,
        location_count: locations.length,
        estimated_mrr_cents: estimatedMRR,
        stage: 'tour_scheduled',
        probability_pct: 20,
      });

      if (campaignId) {
        await supabase.from('marketing_touchpoints').insert({
          campaign_id: campaignId,
          session_id: session.id,
          touchpoint_type: 'first_touch',
          channel: source,
        });
      }

      await supabase.from('admin_event_log').insert({
        level: 'INFO', category: 'guided_tour',
        message: `Guided tour launched: ${companyName} (${county || 'N/A'}) — ${contactName || 'N/A'} [${PLANS[plan].label}, ${locations.length} loc, ${formatCents(estimatedMRR)}/mo]`,
      });

      toast.success('Tour launched successfully');
      onLaunch();

      if (scheduleType === 'now') {
        navigate(`/dashboard?guidedTour=true&instance=${instanceId}&org=${encodeURIComponent(companyName)}&county=${county}`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-navy/10 p-6 space-y-6">
        {/* ── Prospect info ── */}
        <div>
          <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-3">Prospect Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <OrgCombobox
              label="Company Name *"
              orgs={orgs}
              value={selectedOrg}
              onChange={setSelectedOrg}
              placeholder="Search or create company..."
            />
            <Input label="County" value={county} onChange={setCounty} placeholder="Los Angeles" />
            <Input label="Contact Name" value={contactName} onChange={setContactName} placeholder="Jane Smith" />
            <Input label="Title" value={title} onChange={setTitle} placeholder="Owner" />
            <Input label="Email" value={email} onChange={setEmail} placeholder="jane@example.com" type="email" />
            <Input label="Phone" value={phone} onChange={setPhone} placeholder="(555) 123-4567" />
            <Select label="Industry" value={industry} onChange={setIndustry} options={INDUSTRIES.map(i => ({ value: i, label: i.replace(/_/g, ' ') }))} />
            <Select label="Segment" value={segment} onChange={setSegment} options={SEGMENTS.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} />
          </div>
        </div>

        {/* ── Plan selector ── */}
        <div>
          <label className="text-xs font-semibold text-[#4A5568] mb-2 block">
            Plan Type
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(PLANS) as PlanKey[]).map(p => (
              <button key={p} type="button" onClick={() => setPlan(p)} className={`py-2.5 px-2 rounded-lg cursor-pointer text-center text-xs transition-all duration-150 ${
                plan === p
                  ? 'border-2 border-gold bg-[#FAF7F2] text-gold font-bold'
                  : 'border-[1.5px] border-[#E5E0D8] bg-white text-gray-400 font-normal'
              }`}>
                <div>{PLANS[p].label}</div>
                {PLANS[p].addonLabel && (
                  <div className="text-[9px] font-extrabold text-amber-600 mt-0.5 tracking-[0.5px]">
                    {PLANS[p].addonLabel}
                  </div>
                )}
                <div className="text-[10px] text-gray-400 mt-[3px] font-normal">
                  {p === 'pilot' && '$49 · +$49/loc'}
                  {p === 'founder' && '$99 · +$49/loc'}
                  {p === 'standard' && '$199 · +$99/loc'}
                  {p === 'enterprise' && 'Custom'}
                </div>
              </button>
            ))}
          </div>
          {plan === 'pilot' && (
            <div className="mt-2.5 py-2.5 px-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <strong>Pilot pricing</strong> is for Founder-tier customers testing before committing.
              $49/mo flat per location. Converts to Founder ($99 + $49/loc) at full launch.
            </div>
          )}
        </div>

        {/* ── Source ── */}
        <div>
          <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-3">How Did They Find Us?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Source" value={source} onChange={setSource} options={SOURCES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} />
            <Select label="Campaign" value={campaignId} onChange={setCampaignId}
              options={[{ value: '', label: '— None —' }, ...activeCampaigns.map(c => ({ value: c.id, label: c.name }))]} />
          </div>
        </div>

        {/* ── Locations builder ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-bold text-navy uppercase tracking-[0.8px]">
                Locations ({locations.length})
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                Name each location and add the key contacts within it
              </div>
            </div>
            <button type="button" onClick={addLocation}
              className="text-xs font-semibold py-[7px] px-3.5 rounded-[7px] bg-navy text-white border-none cursor-pointer">
              + Add Location
            </button>
          </div>

          {locations.map((loc, locIdx) => (
            <div key={loc.id} className="bg-[#FAFAF8] border border-[#E5E0D8] rounded-[10px] p-[18px] mb-3">
              <div className="flex items-center justify-between mb-3.5">
                <div className="text-xs font-bold text-navy">
                  Location {locIdx + 1}{loc.name ? ` — ${loc.name}` : ''}
                </div>
                {locations.length > 1 && (
                  <button type="button" onClick={() => removeLocation(loc.id)}
                    className="text-[11px] text-red-600 bg-transparent border-none cursor-pointer">
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Location Name *</label>
                  <input placeholder="e.g. Downtown Fresno"
                    value={loc.name} onChange={e => updateLocation(loc.id, 'name', e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg text-[13px] text-navy bg-white outline-none" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Address</label>
                  <input placeholder="Street, City, State"
                    value={loc.address} onChange={e => updateLocation(loc.id, 'address', e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg text-[13px] text-navy bg-white outline-none" />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-[#4A5568] mb-2">Staff Contacts</div>
                {loc.contacts.length === 0 && (
                  <div className="text-[11px] text-gray-400 italic mb-2">
                    Add the key people at this location
                  </div>
                )}
                {loc.contacts.map((c, ci) => (
                  <div key={ci} className="bg-white border border-[#E5E0D8] rounded-lg py-2.5 px-3 mb-2 grid grid-cols-[170px_1fr_1fr_1fr_28px] gap-2 items-center">
                    <select value={c.role} onChange={e => updateContact(loc.id, ci, 'role', e.target.value)}
                      className="w-full py-2 px-3 border border-gray-300 rounded-lg text-[13px] text-navy bg-white outline-none cursor-pointer">
                      {CONTACT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <input placeholder="Full name" value={c.fullName}
                      onChange={e => updateContact(loc.id, ci, 'fullName', e.target.value)}
                      className="w-full py-2 px-3 border border-gray-300 rounded-lg text-[13px] text-navy bg-white outline-none" />
                    <input placeholder="Email" type="email" value={c.email}
                      onChange={e => updateContact(loc.id, ci, 'email', e.target.value)}
                      className="w-full py-2 px-3 border border-gray-300 rounded-lg text-[13px] text-navy bg-white outline-none" />
                    <input placeholder="Phone" value={c.phone}
                      onChange={e => updateContact(loc.id, ci, 'phone', e.target.value)}
                      className="w-full py-2 px-3 border border-gray-300 rounded-lg text-[13px] text-navy bg-white outline-none" />
                    <button type="button" onClick={() => removeContact(loc.id, ci)}
                      className="bg-transparent border-none text-red-600 cursor-pointer text-lg leading-none p-0">
                      {'×'}
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addContact(loc.id)}
                  className="w-full text-[11px] text-gold bg-transparent border border-dashed border-[#E8D9B8] rounded-[7px] py-1.5 px-3 cursor-pointer">
                  + Add Contact
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tour config ── */}
        <div>
          <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-3">Tour Configuration</h3>
          <Select label="Template" value={templateId} onChange={setTemplateId}
            options={[{ value: '', label: '— No template —' }, ...templates.filter(t => t.is_active).map(t => ({ value: t.id, label: `${t.name} (${t.duration_minutes}m)` }))]} />

          {selectedTemplate && (
            <div className="mt-2.5">
              <div className="py-3 px-3.5 bg-[#F9F8F6] border border-[#E5E0D8] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-navy">
                    {selectedTemplate.name} {'·'} {selectedTemplate.duration_minutes} min
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {selectedTemplate.modules_enabled?.length || 0} modules
                  </span>
                </div>
                {selectedTemplate.description && (
                  <div className="text-[11px] text-gray-400 mb-2.5">
                    {selectedTemplate.description}
                  </div>
                )}

                {/* Module pills by group */}
                {ALL_MODULES.map(group => {
                  const active = group.modules.filter(m => selectedTemplate.modules_enabled?.includes(m.id));
                  if (!active.length) return null;
                  return (
                    <div key={group.group} className="mb-2">
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.8px] mb-1">
                        {group.group}
                      </div>
                      <div className="flex flex-wrap gap-[5px]">
                        {active.map(m => (
                          <span key={m.id} className="text-[10px] py-0.5 px-2 rounded-[10px] bg-white border border-[#E5E0D8] text-gray-500">
                            {m.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <button type="button" onClick={() => setShowCustomModules(!showCustomModules)}
                  className="mt-2 text-[11px] text-gold bg-transparent border-none cursor-pointer p-0 font-semibold">
                  {showCustomModules ? '▲ Hide custom modules' : '▼ Customize modules for this tour'}
                </button>
              </div>

              {showCustomModules && (
                <div className="mt-3">
                  <div className="text-[11px] text-gray-400 mb-2.5">
                    These overrides apply to this tour session only — the template is not changed.
                  </div>
                  <ModuleGroupToggles enabled={customModules} onChange={setCustomModules} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Scheduling ── */}
        <div>
          <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-3">Scheduling</h3>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="schedule" checked={scheduleType === 'now'} onChange={() => setScheduleType('now')} className="h-4 w-4" />
              <span className="text-sm font-medium text-navy/80">Launch Now</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="schedule" checked={scheduleType === 'later'} onChange={() => setScheduleType('later')} className="h-4 w-4" />
              <span className="text-sm font-medium text-navy/80">Schedule for Later</span>
            </label>
          </div>
          {scheduleType === 'later' && (
            <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
              className="w-full px-3 py-2 border border-navy/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-gold" />
          )}
        </div>

        {/* ── Notes ── */}
        <div>
          <label className="block text-xs font-medium text-navy/80 mb-1">Notes (internal)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Internal notes — not shown to prospect"
            className="w-full px-3 py-2 border border-navy/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-gold resize-none" />
        </div>

        {/* ── MRR bar ── */}
        <div className="py-3.5 px-[18px] rounded-[9px] bg-[#FAF7F2] border border-[#E8D9B8] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400">Estimated Monthly Recurring Revenue</div>
            {plan !== 'enterprise' && (
              <div className="text-[10px] text-gray-400 mt-0.5">
                {locations.length === 1
                  ? `${PLANS[plan].label} · 1 location (included in base)`
                  : `${PLANS[plan].label} · 1 base + ${locations.length - 1} additional location${locations.length > 2 ? 's' : ''}`
                }
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {plan === 'enterprise' ? (
              <input type="number" placeholder="Enter MRR" value={customMRR || ''}
                onChange={e => setCustomMRR(Number(e.target.value))}
                className="w-[130px] text-right text-xl font-extrabold text-gold border border-[#E8D9B8] rounded-md py-1 px-2.5" />
            ) : (
              <span className="text-2xl font-extrabold text-gold font-['DM_Mono',monospace]">
                ${(estimatedMRR / 100).toFixed(0)}/mo
              </span>
            )}
            <span className={`text-[10px] font-extrabold py-[3px] px-2.5 rounded-[10px] ${
              plan === 'pilot'     ? 'bg-yellow-100 text-yellow-700' :
              plan === 'founder'   ? 'bg-amber-100 text-amber-600' :
              plan === 'standard'  ? 'bg-indigo-50 text-indigo-800' : 'bg-green-50 text-emerald-800'
            }`}>
              {PLANS[plan].label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── Launch button ── */}
        <div className="flex gap-3">
          <button
            onClick={handleLaunch}
            disabled={!companyName.trim() || launching}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-white rounded-lg text-sm font-bold disabled:opacity-40 bg-navy"
          >
            {launching ? 'Launching...' : (
              <>{scheduleType === 'now' ? <Play className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
              {scheduleType === 'now' ? 'Launch Guided Tour' : 'Schedule Tour'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 3 — ACTIVE & HISTORY (unchanged)
// ════════════════════════════════════════════════════════════

function HistoryTab({ sessions, pipeline, onRefresh }: {
  sessions: any[]; pipeline: any[]; onRefresh: () => void;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const now = Date.now();
  const activeSessions = sessions.filter(s => s.last_active_at && (now - new Date(s.last_active_at).getTime()) < 3600000);
  const completedSessions = sessions.filter(s => !activeSessions.includes(s)).slice(0, 100);

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

    const pipelineRow = pipeline.find(p => p.session_id === sessionId);
    if (pipelineRow) {
      const pipeUpdates: any = { stage: newStage, updated_at: new Date().toISOString() };
      if (newStage === 'won') pipeUpdates.won_date = new Date().toISOString().split('T')[0];
      if (newStage === 'lost') pipeUpdates.lost_date = new Date().toISOString().split('T')[0];
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
      {followUps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Follow-ups Due
          </h3>
          <div className="space-y-2">
            {followUps.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-amber-100">
                <div>
                  <span className="text-sm font-semibold text-navy">{s.account_name}</span>
                  <span className="ml-2 text-xs text-navy/50">{s.prospect_name || s.user_email}</span>
                  <span className="ml-2 text-xs text-amber-600 font-medium">{formatDate(s.follow_up_at)}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleAddNote(s.id)} className="px-2 py-1 text-xs border border-navy/10 rounded text-navy/70 hover:bg-cream">Log Contact</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-navy/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wide">Active Tours ({activeSessions.length})</h3>
          <button onClick={onRefresh} className="text-xs text-navy/50 hover:text-navy/80 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
        {activeSessions.length === 0 ? (
          <p className="text-sm text-navy/30">No active tours right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream border-b border-navy/10 hover:bg-navy/[0.02] transition-colors">
                  <th className="text-left px-3 py-2 font-semibold text-navy/80">Company</th>
                  <th className="text-left px-3 py-2 font-semibold text-navy/80">Contact</th>
                  <th className="text-left px-3 py-2 font-semibold text-navy/80">County</th>
                  <th className="text-left px-3 py-2 font-semibold text-navy/80">Started</th>
                  <th className="text-left px-3 py-2 font-semibold text-navy/80">Stage</th>
                  <th className="text-right px-3 py-2 font-semibold text-navy/80">Actions</th>
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

      <div className="bg-white rounded-xl border border-navy/10 p-6">
        <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-4">Tour History ({completedSessions.length})</h3>
        {completedSessions.length === 0 ? (
          <p className="text-sm text-navy/30">No completed tours yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream border-b border-navy/10 hover:bg-navy/[0.02] transition-colors">
                  <th className="text-left px-3 py-2 font-semibold text-navy/80">Company</th>
                  <th className="text-left px-3 py-2 font-semibold text-navy/80">Contact</th>
                  <th className="text-left px-3 py-2 font-semibold text-navy/80">Industry</th>
                  <th className="text-center px-3 py-2 font-semibold text-navy/80">Loc</th>
                  <th className="text-left px-3 py-2 font-semibold text-navy/80">Source</th>
                  <th className="text-left px-3 py-2 font-semibold text-navy/80">Stage</th>
                  <th className="text-left px-3 py-2 font-semibold text-navy/80">Date</th>
                  <th className="text-right px-3 py-2 font-semibold text-navy/80">Actions</th>
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
    <tr className="border-b border-navy/5 hover:bg-cream">
      <td className="px-3 py-2 font-medium text-navy">{s.account_name}</td>
      <td className="px-3 py-2 text-navy/70">{s.prospect_name || s.user_email || '—'}</td>
      <td className="px-3 py-2 text-navy/50 text-xs">{s.industry || s.county || '—'}</td>
      <td className="px-3 py-2 text-center text-navy/50">{s.location_count || '—'}</td>
      <td className="px-3 py-2 text-xs text-navy/50">{(s.source || '—').replace(/_/g, ' ')}</td>
      <td className="px-3 py-2">
        <select
          value={s.sales_stage || 'tour_scheduled'}
          onChange={e => onStageUpdate(s.id, e.target.value)}
          disabled={updatingId === s.id}
          className="text-xs border border-navy/10 rounded px-2 py-1 bg-white focus:outline-none"
        >
          {STAGES.map(st => <option key={st} value={st}>{STAGE_LABELS[st]}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 text-xs text-navy/50">{formatDate(s.started_at)}</td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => onFollowUp(s.id)} className="px-2 py-1 text-xs border border-navy/10 rounded hover:bg-cream" title="Set follow-up">
            <Calendar className="h-3 w-3" />
          </button>
          <button onClick={() => onAddNote(s.id)} className="px-2 py-1 text-xs border border-navy/10 rounded hover:bg-cream" title="Add note">
            <MessageSquare className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 4 — TEMPLATES (updated with ModuleGroupToggles)
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
        <h3 className="text-sm font-bold text-navy">{templates.length} Templates</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-lg bg-navy"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => {
          const moduleCount = (t.modules_enabled || []).length;
          return (
            <div key={t.id} className="bg-white rounded-xl border border-navy/10 p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-semibold text-navy">{t.name}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{t.target_segment?.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-navy/30">{t.duration_minutes} min</span>
                    <span className="text-xs text-navy/30">{moduleCount} module{moduleCount !== 1 ? 's' : ''}</span>
                    {!t.is_active && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-navy/5 text-navy/50">Inactive</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(t.id, t.is_active)}
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${t.is_active ? 'border-green-300 text-green-700 bg-green-50' : 'border-navy/15 text-navy/50'}`}
                >
                  {t.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
              {t.description && <p className="text-xs text-navy/50 mb-2">{t.description}</p>}
              {/* Module pills grouped */}
              <div className="mb-3">
                {ALL_MODULES.map(group => {
                  const active = group.modules.filter(m => (t.modules_enabled || []).includes(m.id));
                  if (!active.length) return null;
                  return (
                    <div key={group.group} className="mb-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.5px]">
                        {group.group}:
                      </span>
                      <span className="text-[10px] text-gray-500 ml-1">
                        {active.map(m => m.label).join(', ')}
                      </span>
                    </div>
                  );
                })}
                {moduleCount === 0 && (
                  <span className="text-xs text-navy/30">No modules selected</span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditId(t.id)} className="px-2 py-1 text-xs border border-navy/10 rounded hover:bg-cream flex items-center gap-1">
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
                <button onClick={() => handleDuplicate(t)} className="px-2 py-1 text-xs border border-navy/10 rounded hover:bg-cream flex items-center gap-1">
                  <Copy className="h-3 w-3" /> Duplicate
                </button>
                <button onClick={() => handleDelete(t.id)} className="px-2 py-1 text-xs border border-red-200 rounded hover:bg-red-50 text-red-600 flex items-center gap-1">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          );
        })}
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
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: template?.name || '',
    description: template?.description || '',
    target_segment: template?.target_segment || 'default',
    county: template?.county || '',
    industry: template?.industry || '',
    duration_minutes: template?.duration_minutes || 20,
    modules_enabled: template?.modules_enabled || [] as string[],
    is_active: template?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      county: form.county || null,
      industry: form.industry || null,
      created_by: user?.email ?? user?.id,
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
      <div className="bg-white rounded-xl p-4 sm:p-6 w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto modal-content-enter">
        <h3 className="text-lg font-bold text-navy mb-4">{template ? 'Edit Template' : 'New Template'}</h3>
        <div className="space-y-4">
          <Input label="Name *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
          <div>
            <label className="block text-xs font-medium text-navy/80 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
              className="w-full px-3 py-2 border border-navy/15 rounded-xl text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus:ring-gold" />
          </div>
          <Select label="Target Segment" value={form.target_segment} onChange={v => setForm(p => ({ ...p, target_segment: v }))}
            options={[{ value: 'default', label: 'Default' }, ...SEGMENTS.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))]} />
          <Input label="County (optional)" value={form.county} onChange={v => setForm(p => ({ ...p, county: v }))} />
          <div>
            <label className="block text-xs font-medium text-navy/80 mb-1">Duration (minutes)</label>
            <input type="number" min={5} value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 20 }))}
              className="w-full px-3 py-2 border border-navy/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-gold" />
          </div>

          {/* Module group toggles — replaces flat pill list */}
          <div>
            <label className="text-xs font-semibold text-[#4A5568] mb-2 block">
              Modules to Include in This Template
            </label>
            <div className="text-[11px] text-gray-400 mb-3">
              Select which features are highlighted during a tour using this template.
              Grouped by how staff use EvidLY — start with daily tasks, end with admin.
            </div>
            <ModuleGroupToggles
              enabled={form.modules_enabled}
              onChange={mods => setForm(t => ({ ...t, modules_enabled: mods }))}
            />
            <div className="mt-2.5 text-[11px] text-gray-400">
              {form.modules_enabled.length} module{form.modules_enabled.length !== 1 ? 's' : ''} selected
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded" />
            <span className="text-sm text-navy/80">Active</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 min-h-[44px] border-2 border-navy/15 rounded-lg text-sm font-medium text-navy/80 hover:bg-cream">Cancel</button>
          <button onClick={handleSave} disabled={!form.name.trim() || saving}
            className="flex-1 px-4 py-2.5 min-h-[44px] text-white rounded-lg text-sm font-bold disabled:opacity-40 bg-navy">
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
      <label className="block text-xs font-medium text-navy/80 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-navy/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-gold" />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-navy/80 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-navy/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-gold bg-white">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
