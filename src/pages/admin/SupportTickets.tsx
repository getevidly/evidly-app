/**
 * Support Tickets — Admin support ticket management system
 * Route: /admin/support-tickets
 * Access: platform_admin / @getevidly.com
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import OrgCombobox, { type OrgOption } from '../../components/admin/OrgCombobox';
import { KpiTile } from '../../components/admin/KpiTile';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import Button from '../../components/ui/Button';

type Tab = 'all' | 'mine' | 'analytics';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  source: string;
  org_id: string | null;
  contact_email: string | null;
  contact_name: string | null;
  assigned_to: string | null;
  sla_due_at: string | null;
  satisfaction_score: number | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  csat_token: string | null;
  csat_sent_at: string | null;
  csat_comment: string | null;
  csat_completed_at: string | null;
  organizations?: { name: string } | null;
}

interface Reply {
  id: string;
  ticket_id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  reply_type: string; // 'staff' | 'customer' | 'internal_note'
  created_at: string;
}

interface OrgRow {
  id: string;
  name: string;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEF2F2', text: '#DC2626' },
  high:     { bg: '#FFF7ED', text: '#EA580C' },
  normal:   { bg: '#FFFBEB', text: '#D97706' },
  low:      { bg: '#F3F4F6', text: '#6B7280' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open:        { bg: '#EFF6FF', text: '#2563EB' },
  in_progress: { bg: '#FFFBEB', text: '#D97706' },
  resolved:    { bg: '#F0FFF4', text: '#059669' },
  closed:      { bg: '#F3F4F6', text: '#6B7280' },
  escalated:   { bg: '#FEF2F2', text: '#DC2626' },
};

const CATEGORIES = [
  'billing', 'technical', 'onboarding', 'compliance', 'feature_request',
  'bug_report', 'account', 'integration', 'general',
];

const PRIORITIES = ['critical', 'high', 'normal', 'low'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'escalated'];

const SLA_HOURS: Record<string, number> = {
  critical: 4,
  high: 24,
  normal: 72,
  low: 168, // 7 days
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function isSlaBreached(ticket: Ticket): boolean {
  if (!ticket.sla_due_at) return false;
  if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
  return new Date(ticket.sla_due_at).getTime() < Date.now();
}

function hoursBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60) * 10) / 10;
}

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div className="rounded-md animate-pulse bg-gray-200" style={{ width: w, height: h }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="text-center py-[60px] px-5 bg-cream-warm border-2 border-dashed border-border_ui-warm rounded-xl m-4">
    <div className="text-[40px] mb-4">{icon}</div>
    <div className="text-base font-bold text-navy mb-2">{title}</div>
    <div className="text-[13px] text-slate_ui max-w-[400px] mx-auto">{subtitle}</div>
  </div>
);

function Badge({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
      style={{ background: colors.bg, color: colors.text }}
    >
      {label.replace(/_/g, ' ')}
    </span>
  );
}

const INPUT_CLASS = 'px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full';

export default function SupportTickets() {
  useDemoGuard();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('all');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  // Drawer
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [drawerStatus, setDrawerStatus] = useState('');
  const [drawerAssigned, setDrawerAssigned] = useState('');

  // CSAT prompt
  const [showCsatPrompt, setShowCsatPrompt] = useState(false);
  const [csatResolvedTicket, setCsatResolvedTicket] = useState<Ticket | null>(null);
  const [csatSending, setCsatSending] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createOrg, setCreateOrg] = useState<OrgOption | null>(null);
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [createCategory, setCreateCategory] = useState('general');
  const [createPriority, setCreatePriority] = useState('normal');
  const [createDescription, setCreateDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const [ticketRes, orgRes] = await Promise.all([
      supabase
        .from('support_tickets')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false }),
      supabase.from('organizations').select('id, name').order('name'),
    ]);
    if (ticketRes.data) setTickets(ticketRes.data);
    if (orgRes.data) setOrgs(orgRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Load replies when drawer opens
  const loadReplies = useCallback(async (ticketId: string) => {
    setRepliesLoading(true);
    const { data } = await supabase
      .from('support_ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (data) setReplies(data);
    setRepliesLoading(false);
  }, []);

  const openDrawer = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDrawerStatus(ticket.status);
    setDrawerAssigned(ticket.assigned_to || '');
    setReplyBody('');
    setIsInternalNote(false);
    loadReplies(ticket.id);
  };

  const closeDrawer = () => {
    setSelectedTicket(null);
    setReplies([]);
    setReplyBody('');
  };

  // Filter logic
  const currentUserEmail = user?.email || '';

  const filteredTickets = useMemo(() => {
    let list = tickets;
    if (tab === 'mine') {
      list = list.filter(t => t.assigned_to === currentUserEmail);
    }
    if (statusFilter) list = list.filter(t => t.status === statusFilter);
    if (priorityFilter) list = list.filter(t => t.priority === priorityFilter);
    if (categoryFilter) list = list.filter(t => t.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.ticket_number || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q) ||
        (t.contact_name || '').toLowerCase().includes(q) ||
        (t.contact_email || '').toLowerCase().includes(q) ||
        (t.organizations?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, tab, statusFilter, priorityFilter, categoryFilter, search, currentUserEmail]);

  // KPI calculations
  const kpis = useMemo(() => {
    const openCount = tickets.filter(t => t.status === 'open').length;
    const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
    const slaBreachedCount = tickets.filter(t => isSlaBreached(t)).length;

    // Avg response time: hours between created_at and first staff reply (approximation: use resolved_at or fallback)
    const resolvedTickets = tickets.filter(t => t.resolved_at);
    const avgResponseHours = resolvedTickets.length > 0
      ? Math.round(resolvedTickets.reduce((sum, t) => sum + hoursBetween(t.created_at, t.resolved_at!), 0) / resolvedTickets.length * 10) / 10
      : 0;

    const ratedTickets = tickets.filter(t => t.satisfaction_score != null && t.satisfaction_score > 0);
    const csatScore = ratedTickets.length > 0
      ? Math.round(ratedTickets.reduce((sum, t) => sum + (t.satisfaction_score || 0), 0) / ratedTickets.length / 5 * 100)
      : 0;

    return { openCount, inProgressCount, slaBreachedCount, avgResponseHours, csatScore };
  }, [tickets]);

  // Analytics KPIs
  const analyticsKpis = useMemo(() => {
    const total = tickets.length;
    const resolvedTickets = tickets.filter(t => t.resolved_at);
    const avgResolutionHours = resolvedTickets.length > 0
      ? Math.round(resolvedTickets.reduce((sum, t) => sum + hoursBetween(t.created_at, t.resolved_at!), 0) / resolvedTickets.length * 10) / 10
      : 0;

    const ratedTickets = tickets.filter(t => t.satisfaction_score != null && t.satisfaction_score > 0);
    const csatPct = ratedTickets.length > 0
      ? Math.round(ratedTickets.reduce((sum, t) => sum + (t.satisfaction_score || 0), 0) / ratedTickets.length / 5 * 100)
      : 0;

    const slaTotalApplicable = tickets.filter(t => t.sla_due_at);
    const slaCompliant = slaTotalApplicable.filter(t => {
      if (t.status === 'resolved' || t.status === 'closed') {
        const resolveTime = t.resolved_at || t.closed_at;
        if (resolveTime && t.sla_due_at) {
          return new Date(resolveTime).getTime() <= new Date(t.sla_due_at).getTime();
        }
        return true;
      }
      return !isSlaBreached(t);
    });
    const slaCompliancePct = slaTotalApplicable.length > 0
      ? Math.round(slaCompliant.length / slaTotalApplicable.length * 100)
      : 100;

    // Top orgs by ticket volume
    const orgCounts: Record<string, { name: string; count: number }> = {};
    tickets.forEach(t => {
      const orgName = t.organizations?.name || 'Unknown';
      const key = t.org_id || 'unknown';
      if (!orgCounts[key]) orgCounts[key] = { name: orgName, count: 0 };
      orgCounts[key].count++;
    });
    const topOrgs = Object.values(orgCounts).sort((a, b) => b.count - a.count).slice(0, 10);

    return { total, avgResolutionHours, csatPct, slaCompliancePct, topOrgs, avgFirstResponse: kpis.avgResponseHours };
  }, [tickets, kpis.avgResponseHours]);

  // Handlers
  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
    if (newStatus === 'closed') updates.closed_at = new Date().toISOString();
    await supabase.from('support_tickets').update(updates).eq('id', ticketId);
    await loadTickets();
    if (selectedTicket?.id === ticketId) {
      setDrawerStatus(newStatus);
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus, ...updates } : null);
    }
  };

  const handleAssignChange = async (ticketId: string, assignedTo: string) => {
    await supabase.from('support_tickets').update({ assigned_to: assignedTo || null }).eq('id', ticketId);
    await loadTickets();
    if (selectedTicket?.id === ticketId) {
      setDrawerAssigned(assignedTo);
      setSelectedTicket(prev => prev ? { ...prev, assigned_to: assignedTo || null } : null);
    }
  };

  const handleSendReply = async () => {
    if (!replyBody.trim() || !selectedTicket) return;
    setSendingReply(true);
    const { error } = await supabase.from('support_ticket_replies').insert({
      ticket_id: selectedTicket.id,
      author_email: currentUserEmail,
      author_name: user?.user_metadata?.full_name || currentUserEmail,
      body: replyBody.trim(),
      reply_type: isInternalNote ? 'internal_note' : 'staff',
    });
    if (error) {
      console.error(`Reply error: ${error.message}`);
    } else {
      setReplyBody('');
      setIsInternalNote(false);
      await loadReplies(selectedTicket.id);
      // If ticket is open, auto-move to in_progress
      if (selectedTicket.status === 'open') {
        await handleStatusChange(selectedTicket.id, 'in_progress');
      }
    }
    setSendingReply(false);
  };

  const handleResolveAndClose = async () => {
    if (!selectedTicket) return;
    const now = new Date().toISOString();
    const token = crypto.randomUUID();
    await supabase.from('support_tickets').update({
      status: 'closed',
      resolved_at: selectedTicket.resolved_at || now,
      closed_at: now,
      csat_token: token,
    }).eq('id', selectedTicket.id);
    await loadTickets();
    const resolvedTicket = { ...selectedTicket, status: 'closed', resolved_at: selectedTicket.resolved_at || now, closed_at: now, csat_token: token };
    closeDrawer();
    // Show CSAT prompt if there's a contact email
    if (resolvedTicket.contact_email) {
      setCsatResolvedTicket(resolvedTicket);
      setShowCsatPrompt(true);
    }
  };

  const handleSendCsat = async () => {
    if (!csatResolvedTicket) return;
    setCsatSending(true);
    const surveyUrl = `${window.location.origin}/support/survey/${csatResolvedTicket.csat_token}`;
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: csatResolvedTicket.contact_email,
          subject: `How was your support experience? — ${csatResolvedTicket.ticket_number}`,
          html: `<p>Hi ${csatResolvedTicket.contact_name || 'there'},</p>
<p>Your support ticket <strong>${csatResolvedTicket.ticket_number}</strong> — "${csatResolvedTicket.subject}" — has been resolved.</p>
<p>We'd love your feedback. Please take a moment to rate your experience:</p>
<p><a href="${surveyUrl}" style="display:inline-block;padding:12px 24px;background:#A08C5A;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Rate Your Experience</a></p>
<p style="color:#6B7F96;font-size:12px;">Or copy this link: ${surveyUrl}</p>`,
        },
      });
    } catch {
      // Edge function may not exist — log the survey URL for demo
      console.error(`CSAT send-email unavailable. Survey URL: ${surveyUrl}`);
    }
    await supabase.from('support_tickets').update({
      csat_sent_at: new Date().toISOString(),
    }).eq('id', csatResolvedTicket.id);
    await loadTickets();
    setCsatSending(false);
    setShowCsatPrompt(false);
    setCsatResolvedTicket(null);
  };

  const handleSkipCsat = () => {
    setShowCsatPrompt(false);
    setCsatResolvedTicket(null);
  };

  const handleCreateTicket = async () => {
    if (!createSubject || !createDescription) return;
    setCreating(true);
    const now = new Date();
    const slaDueAt = new Date(now.getTime() + SLA_HOURS[createPriority] * 60 * 60 * 1000).toISOString();
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabase.from('support_tickets').insert({
      ticket_number: ticketNumber,
      subject: createSubject,
      description: createDescription,
      status: 'open',
      priority: createPriority,
      category: createCategory,
      source: 'admin_created',
      org_id: createOrg?.isNew ? null : (createOrg?.id || null),
      contact_email: createEmail || null,
      contact_name: createName || null,
      submitted_by_phone: createPhone || null,
      sla_due_at: slaDueAt,
    });

    if (error) {
      console.error(`Ticket create error: ${error.message}`);
    } else {
      setCreateSubject('');
      setCreateDescription('');
      setCreateEmail('');
      setCreateName('');
      setCreatePhone('');
      setCreateOrg(null);
      setCreateCategory('general');
      setCreatePriority('normal');
      setShowCreate(false);
      await loadTickets();
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Support Tickets' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Support Tickets</h1>
          <p className="text-[13px] text-slate_ui mt-1">
            Manage customer support requests, track SLAs, and monitor satisfaction.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-[3px] w-fit">
        {([
          { id: 'all' as Tab, label: 'All Tickets' },
          { id: 'mine' as Tab, label: 'My Tickets' },
          { id: 'analytics' as Tab, label: 'Analytics' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-[18px] py-2 rounded-md border-none text-[13px] font-semibold cursor-pointer ${
              tab === t.id
                ? 'bg-white text-navy shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'bg-transparent text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* All Tickets / My Tickets tabs */}
      {(tab === 'all' || tab === 'mine') && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-5 gap-3 items-stretch">
            <KpiTile label="Open" value={kpis.openCount.toString()} valueColor="navy" />
            <KpiTile label="In Progress" value={kpis.inProgressCount.toString()} valueColor="warning" />
            <KpiTile label="SLA Breached" value={kpis.slaBreachedCount.toString()} valueColor={kpis.slaBreachedCount > 0 ? 'red' : 'green'} />
            <KpiTile label="Avg Response" value={`${kpis.avgResponseHours}h`} valueColor="navy" />
            <KpiTile label="CSAT Score" value={`${kpis.csatScore}%`} valueColor="navy" />
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-[10px] flex-wrap bg-white border border-border_ui-warm rounded-[10px] px-[14px] py-[10px]">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className={`${INPUT_CLASS} !w-[140px] cursor-pointer`}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
              className={`${INPUT_CLASS} !w-[140px] cursor-pointer`}>
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className={`${INPUT_CLASS} !w-[150px] cursor-pointer`}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets..."
              className={`${INPUT_CLASS} flex-1 min-w-[160px]`}
            />
            <Button variant="gold" size="sm" onClick={() => setShowCreate(true)} className="whitespace-nowrap">
              + Create Ticket
            </Button>
          </div>

          {/* Ticket table */}
          <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={36} />)}
              </div>
            ) : filteredTickets.length === 0 ? (
              <EmptyState
                icon="🎫"
                title={tab === 'mine' ? 'No tickets assigned to you' : 'No tickets found'}
                subtitle={tab === 'mine' ? 'Tickets assigned to your email will appear here.' : 'Adjust your filters or create a new ticket to get started.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border_ui-warm">
                      {['Ticket #', 'Subject', 'Org', 'Category', 'Priority', 'Status', 'Assigned', 'SLA Due', 'Created'].map(h => (
                        <th key={h} className="text-left px-[14px] py-[10px] text-slate_ui font-semibold text-[11px] uppercase whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map(ticket => {
                      const breached = isSlaBreached(ticket);
                      return (
                        <tr key={ticket.id}
                          onClick={() => openDrawer(ticket)}
                          className="border-b border-border_ui-warm cursor-pointer hover:bg-[#FAFAF8]">
                          <td className="px-[14px] py-[10px] text-navy font-semibold font-mono text-xs">
                            {ticket.ticket_number}
                          </td>
                          <td className="px-[14px] py-[10px] text-navy font-medium max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap">
                            {ticket.subject}
                          </td>
                          <td className="px-[14px] py-[10px] text-slate_ui text-xs">
                            {ticket.organizations?.name || '—'}
                          </td>
                          <td className="px-[14px] py-[10px] text-slate_ui text-xs capitalize">
                            {(ticket.category || '').replace(/_/g, ' ')}
                          </td>
                          <td className="px-[14px] py-[10px]">
                            <Badge label={ticket.priority} colors={PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.normal} />
                          </td>
                          <td className="px-[14px] py-[10px]">
                            <Badge label={ticket.status} colors={STATUS_COLORS[ticket.status] || STATUS_COLORS.open} />
                          </td>
                          <td className="px-[14px] py-[10px] text-slate_ui text-xs">
                            {ticket.assigned_to || '—'}
                          </td>
                          <td className={`px-[14px] py-[10px] text-xs ${breached ? 'font-bold text-red-600' : 'font-normal text-slate_ui'}`}>
                            {ticket.sla_due_at ? formatDateTime(ticket.sla_due_at) : '—'}
                            {breached && <span className="ml-1 text-[10px] text-red-600">BREACHED</span>}
                          </td>
                          <td className="px-[14px] py-[10px] text-slate_ui text-xs whitespace-nowrap">
                            {formatDate(ticket.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Analytics tab */}
      {tab === 'analytics' && (
        <>
          {/* Analytics KPI row */}
          <div className="grid grid-cols-5 gap-3 items-stretch">
            <KpiTile label="Total Tickets" value={analyticsKpis.total.toString()} valueColor="navy" />
            <KpiTile label="Avg First Response" value={`${analyticsKpis.avgFirstResponse}h`} valueColor="navy" />
            <KpiTile label="Avg Resolution" value={`${analyticsKpis.avgResolutionHours}h`} valueColor="navy" />
            <KpiTile label="CSAT" value={`${analyticsKpis.csatPct}%`} valueColor="navy" />
            <KpiTile label="SLA Compliance" value={`${analyticsKpis.slaCompliancePct}%`} valueColor={analyticsKpis.slaCompliancePct >= 90 ? 'green' : 'red'} />
          </div>

          {/* Top orgs table */}
          <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
            <div className="px-[18px] py-[14px] border-b border-border_ui-warm">
              <h3 className="text-sm font-bold text-navy m-0">Top Organizations by Ticket Volume</h3>
            </div>
            {analyticsKpis.topOrgs.length === 0 ? (
              <EmptyState icon="📊" title="No data yet" subtitle="Ticket analytics will appear once tickets are created." />
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border_ui-warm">
                    <th className="text-left px-[18px] py-[10px] text-slate_ui font-semibold text-[11px] uppercase">Organization</th>
                    <th className="text-right px-[18px] py-[10px] text-slate_ui font-semibold text-[11px] uppercase">Tickets</th>
                    <th className="text-left px-[18px] py-[10px] text-slate_ui font-semibold text-[11px] uppercase w-1/2">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsKpis.topOrgs.map((org, i) => {
                    const maxCount = analyticsKpis.topOrgs[0]?.count || 1;
                    return (
                      <tr key={i} className="border-b border-border_ui-warm">
                        <td className="px-[18px] py-[10px] text-navy font-semibold">{org.name}</td>
                        <td className="px-[18px] py-[10px] text-slate_ui text-right font-semibold">{org.count}</td>
                        <td className="px-[18px] py-[10px]">
                          <div className="bg-gray-100 rounded h-2 overflow-hidden">
                            <div className="h-full rounded bg-gold" style={{ width: `${(org.count / maxCount) * 100}%` }} />
                          </div>
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

      {/* Ticket Detail Drawer */}
      {selectedTicket && (
        <TicketDrawer
          ticket={selectedTicket}
          replies={replies}
          repliesLoading={repliesLoading}
          drawerStatus={drawerStatus}
          drawerAssigned={drawerAssigned}
          replyBody={replyBody}
          isInternalNote={isInternalNote}
          sendingReply={sendingReply}
          onClose={closeDrawer}
          onStatusChange={(status) => {
            setDrawerStatus(status);
            handleStatusChange(selectedTicket.id, status);
          }}
          onAssignChange={(assigned) => {
            setDrawerAssigned(assigned);
            handleAssignChange(selectedTicket.id, assigned);
          }}
          onReplyBodyChange={setReplyBody}
          onInternalNoteChange={setIsInternalNote}
          onSendReply={handleSendReply}
          onResolveAndClose={handleResolveAndClose}
        />
      )}

      {/* CSAT Prompt Modal */}
      {showCsatPrompt && csatResolvedTicket && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-[14px] w-[420px] max-w-[90vw] px-6 py-7 shadow-[0_12px_40px_rgba(0,0,0,0.15)] text-center">
            <div className="text-4xl mb-3">&#9993;</div>
            <h3 className="text-base font-bold text-navy mb-2">
              Send CSAT Survey?
            </h3>
            <p className="text-[13px] text-slate_ui leading-normal mb-1.5">
              Ticket <strong>{csatResolvedTicket.ticket_number}</strong> has been resolved.
            </p>
            <p className="text-[13px] text-slate_ui leading-normal mb-5">
              Send a satisfaction survey to <strong>{csatResolvedTicket.contact_email}</strong>?
            </p>
            <div className="flex gap-[10px] justify-center">
              <Button variant="secondary" size="sm" onClick={handleSkipCsat}>
                Skip
              </Button>
              <Button variant="gold" size="sm" onClick={handleSendCsat} disabled={csatSending}>
                {csatSending ? 'Sending...' : 'Send Survey'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreate && (
        <CreateTicketModal
          orgs={orgs}
          createOrg={createOrg}
          createEmail={createEmail}
          createName={createName}
          createPhone={createPhone}
          createSubject={createSubject}
          createCategory={createCategory}
          createPriority={createPriority}
          createDescription={createDescription}
          creating={creating}
          onOrgChange={setCreateOrg}
          onEmailChange={setCreateEmail}
          onNameChange={setCreateName}
          onPhoneChange={setCreatePhone}
          onSubjectChange={setCreateSubject}
          onCategoryChange={setCreateCategory}
          onPriorityChange={setCreatePriority}
          onDescriptionChange={setCreateDescription}
          onSubmit={handleCreateTicket}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

// ── Ticket Drawer ──────────────────────────────────────────

function TicketDrawer({
  ticket, replies, repliesLoading, drawerStatus, drawerAssigned,
  replyBody, isInternalNote, sendingReply,
  onClose, onStatusChange, onAssignChange,
  onReplyBodyChange, onInternalNoteChange, onSendReply, onResolveAndClose,
}: {
  ticket: Ticket;
  replies: Reply[];
  repliesLoading: boolean;
  drawerStatus: string;
  drawerAssigned: string;
  replyBody: string;
  isInternalNote: boolean;
  sendingReply: boolean;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onAssignChange: (assigned: string) => void;
  onReplyBodyChange: (body: string) => void;
  onInternalNoteChange: (val: boolean) => void;
  onSendReply: () => void;
  onResolveAndClose: () => void;
}) {
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 z-40"
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-[420px] max-w-[100vw] bg-white z-50 shadow-[-4px_0_24px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border_ui-warm shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-slate_ui font-semibold">
              {ticket.ticket_number}
            </span>
            <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-xl text-gray-400 leading-none">
              {'×'}
            </button>
          </div>
          <div className="flex gap-1.5 mb-2">
            <Badge label={ticket.status} colors={STATUS_COLORS[ticket.status] || STATUS_COLORS.open} />
            <Badge label={ticket.priority} colors={PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.normal} />
          </div>
          <h3 className="text-base font-bold text-navy m-0 leading-tight">
            {ticket.subject}
          </h3>
        </div>

        {/* Details */}
        <div className="px-5 py-[14px] border-b border-border_ui-warm shrink-0">
          <div className="grid grid-cols-2 gap-[10px] text-xs">
            <div>
              <div className="text-gray-400 text-[10px] font-semibold uppercase mb-0.5">Organization</div>
              <div className="text-navy font-semibold">{ticket.organizations?.name || '—'}</div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] font-semibold uppercase mb-0.5">Submitted By</div>
              <div className="text-navy font-medium">{ticket.contact_name || '—'}</div>
              <div className="text-slate_ui text-[11px]">{ticket.contact_email || ''}</div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] font-semibold uppercase mb-0.5">SLA Due</div>
              <div className={`font-semibold ${isSlaBreached(ticket) ? 'text-red-600' : 'text-emerald-600'}`}>
                {ticket.sla_due_at ? formatDateTime(ticket.sla_due_at) : '—'}
                {isSlaBreached(ticket) && <span className="ml-1 text-[10px]">BREACHED</span>}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] font-semibold uppercase mb-0.5">Category</div>
              <div className="text-navy font-medium capitalize">{(ticket.category || '').replace(/_/g, ' ')}</div>
            </div>
          </div>

          {/* Assigned To dropdown */}
          <div className="mt-3">
            <label className="text-[10px] font-semibold text-gray-400 uppercase block mb-1">
              Assigned To
            </label>
            <input
              value={drawerAssigned}
              onChange={e => onAssignChange(e.target.value)}
              placeholder="Enter email..."
              className={INPUT_CLASS}
            />
          </div>

          {/* Status dropdown */}
          <div className="mt-[10px]">
            <label className="text-[10px] font-semibold text-gray-400 uppercase block mb-1">
              Status
            </label>
            <select
              value={drawerStatus}
              onChange={e => onStatusChange(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}>
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* CSAT Status */}
          {(ticket.satisfaction_score || ticket.csat_sent_at) && (
            <div className="mt-3 px-3 py-[10px] bg-gray-50 rounded-lg border border-border_ui-warm">
              <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
                Customer Satisfaction
              </div>
              {ticket.satisfaction_score ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className={`text-base ${s <= ticket.satisfaction_score! ? 'text-amber-500' : 'text-gray-300'}`}>
                        &#9733;
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-navy">{ticket.satisfaction_score}/5</span>
                  {ticket.csat_completed_at && (
                    <span className="text-[10px] text-gray-400 ml-auto">
                      {formatDate(ticket.csat_completed_at)}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate_ui">
                  Survey sent {formatDateTime(ticket.csat_sent_at)} — awaiting response
                </div>
              )}
              {ticket.csat_comment && (
                <div className="mt-1.5 text-xs text-navy italic leading-snug">
                  "{ticket.csat_comment}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {ticket.description && (
          <div className="px-5 py-3 border-b border-border_ui-warm shrink-0">
            <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Description</div>
            <div className="text-[13px] text-navy leading-normal whitespace-pre-wrap">{ticket.description}</div>
          </div>
        )}

        {/* Conversation thread */}
        <div className="flex-1 overflow-y-auto px-5 py-[14px]">
          <div className="text-[10px] font-semibold text-gray-400 uppercase mb-[10px]">
            Conversation ({replies.length})
          </div>
          {repliesLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton h={50} />
              <Skeleton h={50} />
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-[30px] px-[10px] text-gray-400 text-xs">
              No replies yet. Send the first response below.
            </div>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {replies.map(reply => {
                let bgColor = '#FFFFFF';
                let borderColor = '#E5E7EB';
                let labelColor = '#6B7F96';
                let labelText = 'Staff';

                if (reply.reply_type === 'customer') {
                  bgColor = '#EFF6FF';
                  borderColor = '#BFDBFE';
                  labelText = 'Customer';
                  labelColor = '#2563EB';
                } else if (reply.reply_type === 'internal_note') {
                  bgColor = '#F3F4F6';
                  borderColor = '#D1D5DB';
                  labelText = 'Internal Note';
                  labelColor = '#6B7280';
                }

                return (
                  <div key={reply.id}
                    className="rounded-lg px-3 py-[10px]"
                    style={{ background: bgColor, border: `1px solid ${borderColor}` }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {reply.reply_type === 'internal_note' && (
                          <span className="text-xs">&#128274;</span>
                        )}
                        <span className="text-[11px] font-bold text-navy">
                          {reply.author_name || reply.author_email}
                        </span>
                        <span
                          className="text-[9px] font-bold px-1.5 py-px rounded-sm"
                          style={{
                            color: labelColor,
                            background: reply.reply_type === 'customer' ? '#DBEAFE' : reply.reply_type === 'internal_note' ? '#E5E7EB' : '#F0FDF4',
                          }}
                        >
                          {labelText}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">{formatDateTime(reply.created_at)}</span>
                    </div>
                    <div className="text-[13px] text-navy leading-normal whitespace-pre-wrap">
                      {reply.body}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reply form */}
        <div className="px-5 py-[14px] border-t border-border_ui-warm shrink-0 bg-[#FAFAF8]">
          <textarea
            value={replyBody}
            onChange={e => onReplyBodyChange(e.target.value)}
            placeholder={isInternalNote ? 'Write an internal note (not visible to customer)...' : 'Write a reply...'}
            rows={3}
            className={`${INPUT_CLASS} resize-y mb-2 ${isInternalNote ? '!bg-gray-50' : '!bg-white'}`}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-slate_ui cursor-pointer">
              <input type="checkbox" checked={isInternalNote} onChange={e => onInternalNoteChange(e.target.checked)} />
              Internal Note
            </label>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onResolveAndClose}
                className="bg-green-50 border-green-200 text-emerald-600 text-xs font-bold">
                Resolve & Close
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={onSendReply}
                disabled={sendingReply || !replyBody.trim()}>
                {sendingReply ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Create Ticket Modal ────────────────────────────────────

function CreateTicketModal({
  orgs, createOrg, createEmail, createName, createPhone, createSubject, createCategory,
  createPriority, createDescription, creating,
  onOrgChange, onEmailChange, onNameChange, onPhoneChange, onSubjectChange,
  onCategoryChange, onPriorityChange, onDescriptionChange, onSubmit, onClose,
}: {
  orgs: OrgRow[];
  createOrg: OrgOption | null;
  createEmail: string;
  createName: string;
  createPhone: string;
  createSubject: string;
  createCategory: string;
  createPriority: string;
  createDescription: string;
  creating: boolean;
  onOrgChange: (org: OrgOption | null) => void;
  onEmailChange: (val: string) => void;
  onNameChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
  onSubjectChange: (val: string) => void;
  onCategoryChange: (val: string) => void;
  onPriorityChange: (val: string) => void;
  onDescriptionChange: (val: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-[14px] w-[520px] max-w-[90vw] max-h-[90vh] overflow-y-auto p-6 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy m-0">Create Ticket</h2>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-[22px] text-gray-400 leading-none">
            {'×'}
          </button>
        </div>

        <div className="flex flex-col gap-[14px]">
          {/* Org */}
          <div>
            <label className="text-[11px] text-slate_ui block mb-1">Organization</label>
            <OrgCombobox orgs={orgs} value={createOrg} onChange={onOrgChange} placeholder="Search organization..." />
          </div>

          {/* Name + Email + Phone */}
          <div>
            <label className="text-[11px] text-slate_ui block mb-1">Contact Name *</label>
            <input value={createName} onChange={e => onNameChange(e.target.value)} className={INPUT_CLASS} placeholder="Contact name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate_ui block mb-1">Contact Email *</label>
              <input value={createEmail} onChange={e => onEmailChange(e.target.value)} className={INPUT_CLASS} placeholder="customer@example.com" type="email" />
            </div>
            <div>
              <label className="text-[11px] text-slate_ui block mb-1">Contact Phone</label>
              <input value={createPhone} onChange={e => onPhoneChange(e.target.value)} className={INPUT_CLASS} placeholder="(555) 000-0000" type="tel" />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-[11px] text-slate_ui block mb-1">Subject *</label>
            <input value={createSubject} onChange={e => onSubjectChange(e.target.value)} className={INPUT_CLASS} placeholder="Ticket subject" />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate_ui block mb-1">Category</label>
              <select value={createCategory} onChange={e => onCategoryChange(e.target.value)} className={`${INPUT_CLASS} cursor-pointer`}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate_ui block mb-1">Priority</label>
              <select value={createPriority} onChange={e => onPriorityChange(e.target.value)} className={`${INPUT_CLASS} cursor-pointer`}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] text-slate_ui block mb-1">Description *</label>
            <textarea
              value={createDescription}
              onChange={e => onDescriptionChange(e.target.value)}
              rows={4}
              className={`${INPUT_CLASS} resize-y`}
              placeholder="Describe the issue..."
            />
          </div>

          {/* SLA note */}
          <div className="text-[11px] text-gray-400 bg-gray-50 rounded-md px-3 py-2">
            SLA will be set based on priority: Critical = 4h, High = 24h, Normal = 72h, Low = 7 days
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-[10px] mt-1">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={onSubmit}
              disabled={creating || !createSubject || !createDescription}>
              {creating ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
