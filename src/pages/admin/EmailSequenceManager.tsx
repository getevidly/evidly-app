/**
 * Email Sequence Manager — Trial email sequences, content editor, vendor pipeline,
 * notification log, and referral tracking
 * Route: /admin/email-sequences
 * Access: platform_admin / @getevidly.com
 */

import { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { supabase } from '../../lib/supabase';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import { toast } from 'sonner';
import {
  Mail, Send, Users, Filter, Plus, X, ChevronRight, Eye,
  Play, Pause, Save, Search, Tag, Clock, RefreshCw,
} from 'lucide-react';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const BORDER = '#E2D9C8';

type Tab = 'sequences' | 'editor' | 'vendor-pipeline' | 'notifications' | 'referrals';

// ── Demo Data ─────────────────────────────────────────────────────

interface SequenceStep {
  id: string;
  step: number;
  day: number;
  subject: string;
  body: string;
  status: 'active' | 'paused';
  sent: number;
  openRate: number;
}

const DEMO_SEQUENCES: SequenceStep[] = [
  { id: 's1', step: 1, day: 0, subject: 'Welcome to EvidLY — Your Kitchen Command Center', body: '<p>You just took the first step toward knowing exactly where your kitchen stands.</p><p>EvidLY scores your food safety and facility safety compliance against {{org_name}}\'s own jurisdiction — not a generic checklist.</p><p>Here\'s what to do first:</p><ol><li>Complete your opening checklist</li><li>Log today\'s temperature readings</li><li>Review your compliance score</li></ol>', status: 'active', sent: 234, openRate: 78 },
  { id: 's2', step: 2, day: 2, subject: 'Quick Win: Log Your First Temperature Check', body: '<p>Hi {{first_name}},</p><p>The fastest way to see EvidLY in action is to log your first temperature check. It takes 30 seconds and immediately feeds your compliance score.</p>', status: 'active', sent: 221, openRate: 65 },
  { id: 's3', step: 3, day: 4, subject: 'Feature Spotlight: Jurisdiction-Specific Scoring', body: '<p>Hi {{first_name}},</p><p>Unlike generic checklists, EvidLY scores {{org_name}} against your actual jurisdiction\'s requirements. Your score reflects real regulatory expectations.</p>', status: 'active', sent: 198, openRate: 58 },
  { id: 's4', step: 4, day: 7, subject: 'How\'s It Going? Your First Week Recap', body: '<p>Hi {{first_name}},</p><p>You\'ve been using EvidLY for a week now. Here\'s what we\'ve seen from teams like yours — and what to try next.</p>', status: 'active', sent: 189, openRate: 61 },
  { id: 's5', step: 5, day: 10, subject: '"We Passed Our Inspection" — A Founder Story', body: '<p>Hi {{first_name}},</p><p>When Maria at Bella\'s Kitchen started using EvidLY, her compliance score was 56. Three weeks later, she passed her LA County inspection with zero critical violations.</p>', status: 'active', sent: 167, openRate: 54 },
  { id: 's6', step: 6, day: 12, subject: 'Your Trial Ends Soon — Lock In Founder Pricing', body: '<p>Hi {{first_name}},</p><p>You have {{days_remaining}} days left on your trial. Lock in founder pricing before it expires — this rate won\'t be available after launch.</p>', status: 'paused', sent: 145, openRate: 49 },
  { id: 's7', step: 7, day: 14, subject: 'Last Day: Don\'t Lose Your Compliance Data', body: '<p>Hi {{first_name}},</p><p>Your EvidLY trial ends today. All your compliance data, temperature logs, and scores for {{org_name}} will be preserved if you subscribe — otherwise they\'ll be archived after 30 days.</p><p><a href="{{login_url}}">Log in to subscribe</a></p>', status: 'active', sent: 134, openRate: 52 },
];

interface Vendor {
  id: string;
  name: string;
  type: string;
  stage: string;
  email: string;
  phone: string | null;
  lastTouch: string | null;
  nextFollowup: string | null;
  notes: string;
}

const DEMO_VENDORS: Vendor[] = [
  { id: 'v1', name: 'Pacific Hood Cleaning', type: 'hood_cleaning', stage: 'interested', email: 'ops@pacifichood.com', phone: '(559) 555-0101', lastTouch: '2026-03-10', nextFollowup: '2026-03-17', notes: 'Interested in EvidLY integration for service verification. 45 active kitchen accounts.' },
  { id: 'v2', name: 'Valley Fire Protection', type: 'fire_suppression', stage: 'contacted', email: 'sales@valleyfire.com', phone: '(559) 555-0202', lastTouch: '2026-03-08', nextFollowup: '2026-03-15', notes: 'Left voicemail. Serves Central Valley restaurants.' },
  { id: 'v3', name: 'GreenShield Pest', type: 'pest_control', stage: 'new', email: 'info@greenshieldpest.com', phone: null, lastTouch: null, nextFollowup: null, notes: 'Found via RFP monitor. Large regional operator.' },
  { id: 'v4', name: 'Central HVAC Solutions', type: 'hvac', stage: 'onboarding', email: 'admin@centralhvac.com', phone: '(209) 555-0303', lastTouch: '2026-03-12', nextFollowup: '2026-03-19', notes: 'Signed LOI. Setting up vendor portal access.' },
  { id: 'v5', name: 'QuickDrain Grease Services', type: 'grease_trap', stage: 'active', email: 'dispatch@quickdrain.com', phone: '(559) 555-0404', lastTouch: '2026-03-01', nextFollowup: null, notes: 'Active vendor. 12 shared kitchen accounts.' },
  { id: 'v6', name: 'Metro Plumbing & Drain', type: 'plumbing', stage: 'inactive', email: 'contact@metroplumbing.com', phone: '(209) 555-0505', lastTouch: '2026-01-15', nextFollowup: null, notes: 'Not responsive after 3 attempts. Revisit Q3.' },
];

interface NotificationEntry {
  id: string;
  vendorName: string;
  documentType: string;
  sentAt: string;
  deliveryStatus: 'delivered' | 'opened' | 'bounced' | 'pending';
  openedAt: string | null;
}

const DEMO_NOTIFICATIONS: NotificationEntry[] = [
  { id: 'n1', vendorName: 'Pacific Hood Cleaning', documentType: 'Hood Cleaning Certificate', sentAt: '2026-03-14T10:30:00Z', deliveryStatus: 'opened', openedAt: '2026-03-14T11:05:00Z' },
  { id: 'n2', vendorName: 'Valley Fire Protection', documentType: 'Fire Suppression Report', sentAt: '2026-03-13T14:15:00Z', deliveryStatus: 'delivered', openedAt: null },
  { id: 'n3', vendorName: 'QuickDrain Grease Services', documentType: 'Grease Trap Service Report', sentAt: '2026-03-12T09:00:00Z', deliveryStatus: 'opened', openedAt: '2026-03-12T09:22:00Z' },
  { id: 'n4', vendorName: 'Central HVAC Solutions', documentType: 'Insurance COI', sentAt: '2026-03-11T16:45:00Z', deliveryStatus: 'delivered', openedAt: null },
  { id: 'n5', vendorName: 'GreenShield Pest', documentType: 'Pest Control Report', sentAt: '2026-03-10T08:20:00Z', deliveryStatus: 'bounced', openedAt: null },
  { id: 'n6', vendorName: 'Pacific Hood Cleaning', documentType: 'Insurance COI', sentAt: '2026-03-09T11:00:00Z', deliveryStatus: 'opened', openedAt: '2026-03-09T13:30:00Z' },
  { id: 'n7', vendorName: 'Metro Plumbing & Drain', documentType: 'Insurance COI', sentAt: '2026-03-07T15:30:00Z', deliveryStatus: 'pending', openedAt: null },
  { id: 'n8', vendorName: 'Valley Fire Protection', documentType: 'Fire Suppression Report', sentAt: '2026-03-05T10:00:00Z', deliveryStatus: 'opened', openedAt: '2026-03-05T10:45:00Z' },
  { id: 'n9', vendorName: 'QuickDrain Grease Services', documentType: 'Hood Cleaning Certificate', sentAt: '2026-02-28T14:00:00Z', deliveryStatus: 'delivered', openedAt: null },
  { id: 'n10', vendorName: 'Central HVAC Solutions', documentType: 'Pest Control Report', sentAt: '2026-02-20T09:15:00Z', deliveryStatus: 'opened', openedAt: '2026-02-20T10:00:00Z' },
];

interface Referral {
  id: string;
  code: string;
  type: 'k2c' | 'champion' | 'vendor';
  createdBy: string;
  uses: number;
  revenue: number;
}

const DEMO_REFERRALS: Referral[] = [
  { id: 'r1', code: 'K2C-BELLA', type: 'k2c', createdBy: "Bella's Kitchen", uses: 3, revenue: 891 },
  { id: 'r2', code: 'CHAMP-MARIA', type: 'champion', createdBy: 'Maria Rodriguez', uses: 7, revenue: 2094 },
  { id: 'r3', code: 'VEND-PACIFIC', type: 'vendor', createdBy: 'Pacific Hood Cleaning', uses: 12, revenue: 4752 },
  { id: 'r4', code: 'K2C-GOLDEN', type: 'k2c', createdBy: 'Golden Dragon', uses: 1, revenue: 297 },
  { id: 'r5', code: 'CHAMP-JAMES', type: 'champion', createdBy: 'James Chen', uses: 4, revenue: 1188 },
  { id: 'r6', code: 'VEND-VALLEY', type: 'vendor', createdBy: 'Valley Fire Protection', uses: 5, revenue: 1485 },
  { id: 'r7', code: 'K2C-SUNRISE', type: 'k2c', createdBy: 'Sunrise Cafe', uses: 2, revenue: 594 },
  { id: 'r8', code: 'CHAMP-ARTHUR', type: 'champion', createdBy: 'Arthur H.', uses: 15, revenue: 5940 },
];

// ── Color maps ────────────────────────────────────────────────────

const SERVICE_TYPE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  hood_cleaning: { bg: '#DBEAFE', color: '#1E40AF', label: 'Hood Cleaning' },
  fire_suppression: { bg: '#FEE2E2', color: '#991B1B', label: 'Fire Suppression' },
  pest_control: { bg: '#FEF3C7', color: '#92400E', label: 'Pest Control' },
  hvac: { bg: '#D1FAE5', color: '#065F46', label: 'HVAC' },
  plumbing: { bg: '#E0E7FF', color: '#3730A3', label: 'Plumbing' },
  grease_trap: { bg: '#FCE7F3', color: '#9D174D', label: 'Grease Trap' },
};

const DELIVERY_STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  delivered: { bg: '#D1FAE5', color: '#065F46', label: 'Delivered' },
  opened: { bg: '#DBEAFE', color: '#1E40AF', label: 'Opened' },
  bounced: { bg: '#FEE2E2', color: '#991B1B', label: 'Bounced' },
  pending: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
};

const REFERRAL_TYPE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  k2c: { bg: '#DBEAFE', color: '#1E40AF', label: 'K2C' },
  champion: { bg: '#FEF3C7', color: '#92400E', label: 'Champion' },
  vendor: { bg: '#D1FAE5', color: '#065F46', label: 'Vendor' },
};

const VENDOR_STAGES = ['new', 'contacted', 'interested', 'onboarding', 'active', 'inactive'];

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  onboarding: 'Onboarding',
  active: 'Active',
  inactive: 'Inactive',
};

// ── Helpers ───────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d: string | null): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function renderEmailPreview(subject: string, body: string): string {
  const resolvedSubject = subject
    .replace(/\{\{first_name\}\}/g, 'Maria')
    .replace(/\{\{org_name\}\}/g, "Bella's Kitchen")
    .replace(/\{\{days_remaining\}\}/g, '5')
    .replace(/\{\{login_url\}\}/g, 'https://app.getevidly.com/login');

  const resolvedBody = body
    .replace(/\{\{first_name\}\}/g, 'Maria')
    .replace(/\{\{org_name\}\}/g, "Bella's Kitchen")
    .replace(/\{\{days_remaining\}\}/g, '5')
    .replace(/\{\{login_url\}\}/g, 'https://app.getevidly.com/login');

  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 100%; background: #f9fafb; padding: 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #1E2D4D; padding: 20px 24px; text-align: center;">
          <span style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">EvidLY</span>
        </div>
        <div style="padding: 24px;">
          <div style="font-size: 16px; font-weight: 600; color: #1E2D4D; margin-bottom: 16px;">${resolvedSubject}</div>
          <div style="font-size: 14px; color: #374151; line-height: 1.6;">${resolvedBody}</div>
        </div>
        <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <span style="font-size: 11px; color: #9CA3AF;">EvidLY Inc. &bull; Kitchen Compliance Platform</span>
        </div>
      </div>
    </div>
  `;
}

// ── Main Component ────────────────────────────────────────────────

export default function EmailSequenceManager() {
  useDemoGuard();
  const { isDemoMode } = useDemo();

  const [activeTab, setActiveTab] = useState<Tab>('sequences');
  const [loading, setLoading] = useState(true);

  // Sequences state
  const [sequences, setSequences] = useState<SequenceStep[]>([]);

  // Vendor pipeline state
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);

  // Referrals state
  const [referrals, setReferrals] = useState<Referral[]>([]);

  // KPI state
  const [kpis, setKpis] = useState({ emailsSent: 847, openRate: '62%', activeSequences: 5, vendorPipeline: 12 });

  const loadData = useCallback(async () => {
    setLoading(true);

    if (isDemoMode) {
      setSequences(DEMO_SEQUENCES);
      setVendors(DEMO_VENDORS);
      setNotifications(DEMO_NOTIFICATIONS);
      setReferrals(DEMO_REFERRALS);
      setKpis({ emailsSent: 847, openRate: '62%', activeSequences: 5, vendorPipeline: 12 });
      setLoading(false);
      return;
    }

    try {
      const [seqRes, vendorRes, notifRes, refRes] = await Promise.all([
        supabase.from('trial_email_sequences').select('*').order('step', { ascending: true }),
        supabase.from('vendor_outreach_pipeline').select('*').order('created_at', { ascending: false }),
        supabase.from('vendor_notification_log').select('*').order('sent_at', { ascending: false }),
        supabase.from('referrals').select('*').order('created_at', { ascending: false }),
      ]);

      if (seqRes.data) {
        setSequences(seqRes.data.map((s: any) => ({
          id: s.id,
          step: s.step_number ?? s.step,
          day: s.trigger_day ?? s.day,
          subject: s.subject_template ?? s.subject,
          body: s.body_template ?? s.body ?? '',
          status: s.status || 'active',
          sent: s.sent_count ?? 0,
          openRate: s.open_rate ?? 0,
        })));
      }
      if (vendorRes.data) {
        setVendors(vendorRes.data.map((v: any) => ({
          id: v.id,
          name: v.vendor_name ?? v.name,
          type: v.service_type ?? v.type,
          stage: v.stage || 'new',
          email: v.email || '',
          phone: v.phone || null,
          lastTouch: v.last_touch_at ?? v.last_touch ?? null,
          nextFollowup: v.next_followup_at ?? v.next_followup ?? null,
          notes: v.notes || '',
        })));
      }
      if (notifRes.data) {
        setNotifications(notifRes.data.map((n: any) => ({
          id: n.id,
          vendorName: n.vendor_name,
          documentType: n.document_type,
          sentAt: n.sent_at,
          deliveryStatus: n.delivery_status || 'pending',
          openedAt: n.opened_at || null,
        })));
      }
      if (refRes.data) {
        setReferrals(refRes.data.map((r: any) => ({
          id: r.id,
          code: r.code,
          type: r.type || 'k2c',
          createdBy: r.created_by || r.creator_name || '',
          uses: r.uses ?? r.use_count ?? 0,
          revenue: r.revenue_impact ?? r.revenue ?? 0,
        })));
      }

      // Compute KPIs from live data
      const totalSent = (seqRes.data || []).reduce((sum: number, s: any) => sum + (s.sent_count ?? 0), 0);
      const avgOpen = (seqRes.data || []).length > 0
        ? Math.round((seqRes.data || []).reduce((sum: number, s: any) => sum + (s.open_rate ?? 0), 0) / seqRes.data!.length)
        : 0;
      const activeSeqs = (seqRes.data || []).filter((s: any) => s.status === 'active').length;
      const vendorCount = (vendorRes.data || []).length;

      setKpis({
        emailsSent: totalSent,
        openRate: `${avgOpen}%`,
        activeSequences: activeSeqs,
        vendorPipeline: vendorCount,
      });
    } catch (err: any) {
      toast.error(`Failed to load data: ${err.message}`);
    }

    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37]" />
        <p className="mt-3 text-sm" style={{ color: TEXT_SEC }}>Loading...</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Mail }[] = [
    { id: 'sequences', label: 'Trial Sequences', icon: Mail },
    { id: 'editor', label: 'Email Editor', icon: Send },
    { id: 'vendor-pipeline', label: 'Vendor Pipeline', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Eye },
    { id: 'referrals', label: 'Referrals', icon: Tag },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <AdminBreadcrumb crumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Email Sequences' }]} />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0, fontFamily: 'Outfit, sans-serif' }}>Email Sequence Manager</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0 0', fontFamily: 'Inter, sans-serif' }}>Manage trial sequences, vendor outreach, and referral tracking</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiTile label="Emails Sent (30d)" value={kpis.emailsSent} />
        <KpiTile label="Open Rate" value={kpis.openRate} valueColor="green" />
        <KpiTile label="Active Sequences" value={kpis.activeSequences} valueColor="navy" />
        <KpiTile label="Vendor Pipeline" value={kpis.vendorPipeline} valueColor="gold" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'border-[#1E2D4D] text-[#1E2D4D]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sequences' && (
        <SequencesTab
          sequences={sequences}
          setSequences={setSequences}
          isDemoMode={isDemoMode}
          onRefresh={loadData}
        />
      )}
      {activeTab === 'editor' && (
        <EditorTab
          sequences={sequences}
          setSequences={setSequences}
          isDemoMode={isDemoMode}
        />
      )}
      {activeTab === 'vendor-pipeline' && (
        <VendorPipelineTab
          vendors={vendors}
          setVendors={setVendors}
          isDemoMode={isDemoMode}
          onRefresh={loadData}
        />
      )}
      {activeTab === 'notifications' && (
        <NotificationsTab
          notifications={notifications}
          isDemoMode={isDemoMode}
        />
      )}
      {activeTab === 'referrals' && (
        <ReferralsTab
          referrals={referrals}
          isDemoMode={isDemoMode}
        />
      )}
    </div>
  );
}

// ── Tab 1: Trial Sequences ────────────────────────────────────────

function SequencesTab({ sequences, setSequences, isDemoMode, onRefresh }: {
  sequences: SequenceStep[];
  setSequences: React.Dispatch<React.SetStateAction<SequenceStep[]>>;
  isDemoMode: boolean;
  onRefresh: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStep, setNewStep] = useState({ step_number: '', trigger_day: '', subject: '', body: '' });

  const handleToggleStatus = async (seq: SequenceStep) => {
    const newStatus = seq.status === 'active' ? 'paused' : 'active';

    if (isDemoMode) {
      setSequences(prev => prev.map(s => s.id === seq.id ? { ...s, status: newStatus } : s));
      toast.success(`Step ${seq.step} ${newStatus === 'active' ? 'activated' : 'paused'}`);
      return;
    }

    const { error } = await supabase
      .from('trial_email_sequences')
      .update({ status: newStatus })
      .eq('id', seq.id);
    if (error) {
      toast.error(`Update failed: ${error.message}`);
      return;
    }
    toast.success(`Step ${seq.step} ${newStatus === 'active' ? 'activated' : 'paused'}`);
    onRefresh();
  };

  const handleAddStep = async () => {
    const stepNum = parseInt(newStep.step_number);
    const triggerDay = parseInt(newStep.trigger_day);
    if (!stepNum || isNaN(triggerDay) || !newStep.subject.trim()) {
      toast.error('Step number, trigger day, and subject are required');
      return;
    }

    if (isDemoMode) {
      const newEntry: SequenceStep = {
        id: `s${Date.now()}`,
        step: stepNum,
        day: triggerDay,
        subject: newStep.subject.trim(),
        body: newStep.body || '',
        status: 'active',
        sent: 0,
        openRate: 0,
      };
      setSequences(prev => [...prev, newEntry].sort((a, b) => a.step - b.step));
      setNewStep({ step_number: '', trigger_day: '', subject: '', body: '' });
      setShowAddForm(false);
      toast.success('Step added');
      return;
    }

    const { error } = await supabase.from('trial_email_sequences').insert({
      step_number: stepNum,
      trigger_day: triggerDay,
      subject_template: newStep.subject.trim(),
      body_template: newStep.body || '',
      status: 'active',
    });
    if (error) {
      toast.error(`Insert failed: ${error.message}`);
      return;
    }
    toast.success('Step added');
    setNewStep({ step_number: '', trigger_day: '', subject: '', body: '' });
    setShowAddForm(false);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1E2D4D]">{sequences.length} Steps</h3>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: NAVY }}>
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? 'Cancel' : 'Add Step'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAF7F0] border-b border-gray-200">
                <th className="text-center px-3 py-3 font-semibold text-gray-700 w-16">Step</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 w-20">Day</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">Subject</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 w-24">Status</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700 w-20">Sent</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700 w-24">Open Rate</th>
              </tr>
            </thead>
            <tbody>
              {sequences.map(seq => (
                <tr key={seq.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-3 text-center font-bold" style={{ color: NAVY }}>{seq.step}</td>
                  <td className="px-3 py-3 text-center text-gray-600">Day {seq.day}</td>
                  <td className="px-3 py-3 text-gray-900 font-medium">{seq.subject}</td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => handleToggleStatus(seq)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: seq.status === 'active' ? '#D1FAE5' : '#FEF3C7',
                        color: seq.status === 'active' ? '#065F46' : '#92400E',
                      }}>
                      {seq.status === 'active' ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                      {seq.status === 'active' ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600">{seq.sent}</td>
                  <td className="px-3 py-3 text-right font-medium" style={{ color: NAVY }}>{seq.openRate}%</td>
                </tr>
              ))}
              {sequences.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No sequence steps configured.</td></tr>
              )}

              {/* Inline add form */}
              {showAddForm && (
                <tr className="bg-blue-50 border-t-2 border-blue-200">
                  <td className="px-3 py-3">
                    <input type="number" placeholder="#" value={newStep.step_number}
                      onChange={e => setNewStep(p => ({ ...p, step_number: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center" />
                  </td>
                  <td className="px-3 py-3">
                    <input type="number" placeholder="Day" value={newStep.trigger_day}
                      onChange={e => setNewStep(p => ({ ...p, trigger_day: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center" />
                  </td>
                  <td className="px-3 py-3" colSpan={2}>
                    <input type="text" placeholder="Email subject line..." value={newStep.subject}
                      onChange={e => setNewStep(p => ({ ...p, subject: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mb-2" />
                    <textarea placeholder="Email body (HTML)..." value={newStep.body}
                      onChange={e => setNewStep(p => ({ ...p, body: e.target.value }))}
                      rows={3}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono" />
                  </td>
                  <td className="px-3 py-3 text-center" colSpan={2}>
                    <button onClick={handleAddStep}
                      className="px-4 py-2 text-sm font-bold text-white rounded-lg"
                      style={{ backgroundColor: NAVY }}>
                      <Save className="h-4 w-4 inline mr-1" />
                      Save
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Email Content Editor ───────────────────────────────────

function EditorTab({ sequences, setSequences, isDemoMode }: {
  sequences: SequenceStep[];
  setSequences: React.Dispatch<React.SetStateAction<SequenceStep[]>>;
  isDemoMode: boolean;
}) {
  const [selectedStepId, setSelectedStepId] = useState<string>(sequences[0]?.id || '');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedStep = sequences.find(s => s.id === selectedStepId);

  useEffect(() => {
    if (selectedStep) {
      setEditSubject(selectedStep.subject);
      setEditBody(selectedStep.body);
    }
  }, [selectedStepId, selectedStep]);

  const handleSave = async () => {
    if (!selectedStep) return;
    setSaving(true);

    if (isDemoMode) {
      setSequences(prev => prev.map(s =>
        s.id === selectedStepId ? { ...s, subject: editSubject, body: editBody } : s
      ));
      setSaving(false);
      toast.success('Template saved (demo)');
      return;
    }

    const { error } = await supabase
      .from('trial_email_sequences')
      .update({ subject_template: editSubject, body_template: editBody })
      .eq('id', selectedStep.id);

    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return;
    }
    toast.success('Template saved');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 500 }}>
      {/* Left: Editor */}
      <div className="flex-[3] space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Select Sequence Step</label>
          <select
            value={selectedStepId}
            onChange={e => setSelectedStepId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
            {sequences.map(s => (
              <option key={s.id} value={s.id}>Step {s.step} (Day {s.day}): {s.subject}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
          <input type="text" value={editSubject} onChange={e => setEditSubject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Body (HTML)</label>
          <textarea
            value={editBody}
            onChange={e => setEditBody(e.target.value)}
            rows={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            style={{ fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: 13 }}
          />
        </div>

        <p className="text-xs" style={{ color: TEXT_SEC }}>
          Available tokens: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{'{{first_name}}'}</code>,{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{'{{org_name}}'}</code>,{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{'{{days_remaining}}'}</code>,{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{'{{login_url}}'}</code>
        </p>

        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-lg disabled:opacity-40"
          style={{ backgroundColor: NAVY }}>
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Template'}
        </button>
      </div>

      {/* Right: Preview */}
      <div className="flex-[2]">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4" style={{ color: TEXT_SEC }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: TEXT_SEC }}>Live Preview</span>
        </div>
        <div
          className="bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: BORDER }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderEmailPreview(editSubject, editBody)) }}
            style={{ maxHeight: 520, overflowY: 'auto' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Vendor Outreach Pipeline ───────────────────────────────

function VendorPipelineTab({ vendors, setVendors, isDemoMode, onRefresh }: {
  vendors: Vendor[];
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  isDemoMode: boolean;
  onRefresh: () => void;
}) {
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);

  const handleStageChange = async (vendor: Vendor, newStage: string) => {
    if (isDemoMode) {
      setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, stage: newStage } : v));
      toast.success(`${vendor.name} moved to ${STAGE_LABELS[newStage]}`);
      return;
    }

    const { error } = await supabase
      .from('vendor_outreach_pipeline')
      .update({ stage: newStage })
      .eq('id', vendor.id);
    if (error) {
      toast.error(`Update failed: ${error.message}`);
      return;
    }
    toast.success(`${vendor.name} moved to ${STAGE_LABELS[newStage]}`);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-[#1E2D4D]">{vendors.length} Vendors</h3>

      {/* Stage columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {VENDOR_STAGES.map(stage => {
          const stageVendors = vendors.filter(v => v.stage === stage);
          return (
            <div key={stage}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: NAVY }}>
                  {STAGE_LABELS[stage]}
                </span>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">
                  {stageVendors.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {stageVendors.map(vendor => {
                  const typeStyle = SERVICE_TYPE_COLORS[vendor.type] || { bg: '#F3F4F6', color: '#6B7280', label: vendor.type };
                  const isExpanded = expandedNotes === vendor.id;
                  return (
                    <div key={vendor.id} className="bg-white rounded-xl border border-gray-200 p-3 transition-shadow">
                      <div className="font-semibold text-sm text-gray-900 mb-1">{vendor.name}</div>
                      <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-2"
                        style={{ background: typeStyle.bg, color: typeStyle.color }}>
                        {typeStyle.label}
                      </span>

                      <div className="space-y-1 text-xs text-gray-500">
                        {vendor.lastTouch && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Last: {formatDate(vendor.lastTouch)}</span>
                          </div>
                        )}
                        {vendor.nextFollowup && (
                          <div className="flex items-center gap-1">
                            <ChevronRight className="h-3 w-3" />
                            <span>Next: {formatDate(vendor.nextFollowup)}</span>
                          </div>
                        )}
                      </div>

                      {/* Stage select */}
                      <div className="mt-2">
                        <select
                          value={vendor.stage}
                          onChange={e => handleStageChange(vendor, e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white">
                          {VENDOR_STAGES.map(s => (
                            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                          ))}
                        </select>
                      </div>

                      {/* Notes */}
                      {vendor.notes && (
                        <div className="mt-2">
                          <p className={`text-xs text-gray-500 ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {vendor.notes}
                          </p>
                          {vendor.notes.length > 80 && (
                            <button
                              onClick={() => setExpandedNotes(isExpanded ? null : vendor.id)}
                              className="text-xs font-medium mt-0.5"
                              style={{ color: GOLD }}>
                              {isExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {stageVendors.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-6 bg-[#FAF7F0] rounded-lg">
                    No vendors
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 4: Vendor Notifications ───────────────────────────────────

function NotificationsTab({ notifications, isDemoMode }: {
  notifications: NotificationEntry[];
  isDemoMode: boolean;
}) {
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | 'all'>('30d');
  const [vendorSearch, setVendorSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = notifications.filter(n => {
    // Date filter
    if (dateFilter !== 'all') {
      const days = dateFilter === '7d' ? 7 : 30;
      const cutoff = Date.now() - days * 86400000;
      if (new Date(n.sentAt).getTime() < cutoff) return false;
    }
    // Vendor search
    if (vendorSearch && !n.vendorName.toLowerCase().includes(vendorSearch.toLowerCase())) return false;
    // Status filter
    if (statusFilter !== 'all' && n.deliveryStatus !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" style={{ color: TEXT_SEC }} />
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" style={{ color: TEXT_SEC }} />
          <input type="text" placeholder="Search vendor..." value={vendorSearch}
            onChange={e => setVendorSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48" />
        </div>

        <div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="all">All statuses</option>
            <option value="delivered">Delivered</option>
            <option value="opened">Opened</option>
            <option value="bounced">Bounced</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAF7F0] border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Vendor Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Document Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Sent At</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Opened At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(n => {
                const statusStyle = DELIVERY_STATUS_COLORS[n.deliveryStatus] || { bg: '#F3F4F6', color: '#6B7280', label: n.deliveryStatus };
                return (
                  <tr key={n.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{n.vendorName}</td>
                    <td className="px-4 py-3 text-gray-600">{n.documentType}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(n.sentAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}>
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(n.openedAt)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No notifications match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs" style={{ color: TEXT_SEC }}>
        Showing {filtered.length} of {notifications.length} notifications
      </p>
    </div>
  );
}

// ── Tab 5: Referrals ──────────────────────────────────────────────

function ReferralsTab({ referrals, isDemoMode }: {
  referrals: Referral[];
  isDemoMode: boolean;
}) {
  const totalRevenue = referrals.reduce((sum, r) => sum + r.revenue, 0);
  const totalUses = referrals.reduce((sum, r) => sum + r.uses, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1E2D4D]">{referrals.length} Referral Codes</h3>
        <div className="flex items-center gap-4 text-xs" style={{ color: TEXT_SEC }}>
          <span>Total Uses: <strong style={{ color: NAVY }}>{totalUses}</strong></span>
          <span>Total Revenue: <strong style={{ color: NAVY }}>${totalRevenue.toLocaleString()}</strong></span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAF7F0] border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Code</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Created By</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Uses</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Revenue Impact</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map(r => {
                const typeStyle = REFERRAL_TYPE_COLORS[r.type] || { bg: '#F3F4F6', color: '#6B7280', label: r.type };
                return (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <code className="text-sm font-mono font-bold px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: NAVY }}>
                        {r.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: typeStyle.bg, color: typeStyle.color }}>
                        {typeStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{r.createdBy}</td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: NAVY }}>{r.uses}</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: '#166534' }}>
                      ${r.revenue.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {referrals.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No referral codes yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
