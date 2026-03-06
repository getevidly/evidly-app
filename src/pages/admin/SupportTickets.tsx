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

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

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
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d: string | null): string {
  if (!d) return '\u2014';
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
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FAF7F2', border: '2px dashed #E2D9C8', borderRadius: 12, margin: 16 }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 400, margin: '0 auto' }}>{subtitle}</div>
  </div>
);

function Badge({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
      background: colors.bg, color: colors.text, whiteSpace: 'nowrap',
    }}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}

export default function SupportTickets() {
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
      alert(`Error: ${error.message}`);
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
      alert(`CSAT survey link (send-email unavailable):\n${surveyUrl}`);
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
      alert(`Error: ${error.message}`);
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

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: tab === t ? '#FFFFFF' : 'transparent', color: tab === t ? NAVY : TEXT_MUTED,
    boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
  });

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 6, color: NAVY, fontSize: 13, width: '100%',
  };

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Support Tickets' }]} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Support Tickets</h1>
          <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
            Manage customer support requests, track SLAs, and monitor satisfaction.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#F3F4F6', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {([
          { id: 'all' as Tab, label: 'All Tickets' },
          { id: 'mine' as Tab, label: 'My Tickets' },
          { id: 'analytics' as Tab, label: 'Analytics' },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* All Tickets / My Tickets tabs */}
      {(tab === 'all' || tab === 'mine') && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <KpiTile label="Open" value={kpis.openCount.toString()} valueColor="blue" />
            <KpiTile label="In Progress" value={kpis.inProgressCount.toString()} valueColor="amber" />
            <KpiTile label="SLA Breached" value={kpis.slaBreachedCount.toString()} valueColor={kpis.slaBreachedCount > 0 ? 'red' : 'green'} />
            <KpiTile label="Avg Response" value={`${kpis.avgResponseHours}h`} valueColor="default" />
            <KpiTile label="CSAT Score" value={`${kpis.csatScore}%`} valueColor={kpis.csatScore >= 80 ? 'green' : 'amber'} />
          </div>

          {/* Filter bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 14px',
          }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ ...inputStyle, width: 140, cursor: 'pointer' }}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
              style={{ ...inputStyle, width: 140, cursor: 'pointer' }}>
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              style={{ ...inputStyle, width: 150, cursor: 'pointer' }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets..."
              style={{ ...inputStyle, flex: 1, minWidth: 160 }}
            />
            <button onClick={() => setShowCreate(true)}
              style={{
                padding: '8px 18px', background: GOLD, border: 'none', borderRadius: 6,
                color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              + Create Ticket
            </button>
          </div>

          {/* Ticket table */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={36} />)}
              </div>
            ) : filteredTickets.length === 0 ? (
              <EmptyState
                icon="🎫"
                title={tab === 'mine' ? 'No tickets assigned to you' : 'No tickets found'}
                subtitle={tab === 'mine' ? 'Tickets assigned to your email will appear here.' : 'Adjust your filters or create a new ticket to get started.'}
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {['Ticket #', 'Subject', 'Org', 'Category', 'Priority', 'Status', 'Assigned', 'SLA Due', 'Created'].map(h => (
                        <th key={h} style={{
                          textAlign: 'left', padding: '10px 14px', color: TEXT_SEC,
                          fontWeight: 600, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap',
                        }}>
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
                          style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF8')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '10px 14px', color: NAVY, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                            {ticket.ticket_number}
                          </td>
                          <td style={{ padding: '10px 14px', color: NAVY, fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ticket.subject}
                          </td>
                          <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>
                            {ticket.organizations?.name || '\u2014'}
                          </td>
                          <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12, textTransform: 'capitalize' }}>
                            {(ticket.category || '').replace(/_/g, ' ')}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Badge label={ticket.priority} colors={PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.normal} />
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Badge label={ticket.status} colors={STATUS_COLORS[ticket.status] || STATUS_COLORS.open} />
                          </td>
                          <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>
                            {ticket.assigned_to || '\u2014'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: breached ? 700 : 400, color: breached ? '#DC2626' : TEXT_SEC }}>
                            {ticket.sla_due_at ? formatDateTime(ticket.sla_due_at) : '\u2014'}
                            {breached && <span style={{ marginLeft: 4, fontSize: 10, color: '#DC2626' }}>BREACHED</span>}
                          </td>
                          <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12, whiteSpace: 'nowrap' }}>
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <KpiTile label="Total Tickets" value={analyticsKpis.total.toString()} valueColor="default" />
            <KpiTile label="Avg First Response" value={`${analyticsKpis.avgFirstResponse}h`} valueColor="default" />
            <KpiTile label="Avg Resolution" value={`${analyticsKpis.avgResolutionHours}h`} valueColor="default" />
            <KpiTile label="CSAT" value={`${analyticsKpis.csatPct}%`} valueColor={analyticsKpis.csatPct >= 80 ? 'green' : 'amber'} />
            <KpiTile label="SLA Compliance" value={`${analyticsKpis.slaCompliancePct}%`} valueColor={analyticsKpis.slaCompliancePct >= 90 ? 'green' : 'red'} />
          </div>

          {/* Top orgs table */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>Top Organizations by Ticket Volume</h3>
            </div>
            {analyticsKpis.topOrgs.length === 0 ? (
              <EmptyState icon="📊" title="No data yet" subtitle="Ticket analytics will appear once tickets are created." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th style={{ textAlign: 'left', padding: '10px 18px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Organization</th>
                    <th style={{ textAlign: 'right', padding: '10px 18px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Tickets</th>
                    <th style={{ textAlign: 'left', padding: '10px 18px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', width: '50%' }}>Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsKpis.topOrgs.map((org, i) => {
                    const maxCount = analyticsKpis.topOrgs[0]?.count || 1;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={{ padding: '10px 18px', color: NAVY, fontWeight: 600 }}>{org.name}</td>
                        <td style={{ padding: '10px 18px', color: TEXT_SEC, textAlign: 'right', fontWeight: 600 }}>{org.count}</td>
                        <td style={{ padding: '10px 18px' }}>
                          <div style={{ background: '#F3F4F6', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 4, background: GOLD, width: `${(org.count / maxCount) * 100}%` }} />
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
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: 14, width: 420, maxWidth: '90vw',
            padding: '28px 24px', boxShadow: '0 12px 40px rgba(0,0,0,0.15)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>&#9993;</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>
              Send CSAT Survey?
            </h3>
            <p style={{ fontSize: 13, color: TEXT_SEC, lineHeight: 1.5, marginBottom: 6 }}>
              Ticket <strong>{csatResolvedTicket.ticket_number}</strong> has been resolved.
            </p>
            <p style={{ fontSize: 13, color: TEXT_SEC, lineHeight: 1.5, marginBottom: 20 }}>
              Send a satisfaction survey to <strong>{csatResolvedTicket.contact_email}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={handleSkipCsat}
                style={{
                  padding: '8px 20px', background: '#F3F4F6', border: `1px solid ${BORDER}`,
                  borderRadius: 8, color: TEXT_SEC, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                Skip
              </button>
              <button onClick={handleSendCsat} disabled={csatSending}
                style={{
                  padding: '8px 20px', background: csatSending ? '#E5E7EB' : GOLD,
                  border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 13, fontWeight: 700,
                  cursor: csatSending ? 'default' : 'pointer',
                }}>
                {csatSending ? 'Sending...' : 'Send Survey'}
              </button>
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
          inputStyle={inputStyle}
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
  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 6, color: NAVY, fontSize: 13, width: '100%',
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40,
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '100vw',
        background: '#FFFFFF', zIndex: 50, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: TEXT_SEC, fontWeight: 600 }}>
              {ticket.ticket_number}
            </span>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: TEXT_MUTED, lineHeight: 1,
            }}>
              {'\u00D7'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <Badge label={ticket.status} colors={STATUS_COLORS[ticket.status] || STATUS_COLORS.open} />
            <Badge label={ticket.priority} colors={PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.normal} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1.3 }}>
            {ticket.subject}
          </h3>
        </div>

        {/* Details */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
            <div>
              <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Organization</div>
              <div style={{ color: NAVY, fontWeight: 600 }}>{ticket.organizations?.name || '\u2014'}</div>
            </div>
            <div>
              <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Submitted By</div>
              <div style={{ color: NAVY, fontWeight: 500 }}>{ticket.contact_name || '\u2014'}</div>
              <div style={{ color: TEXT_SEC, fontSize: 11 }}>{ticket.contact_email || ''}</div>
            </div>
            <div>
              <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>SLA Due</div>
              <div style={{
                color: isSlaBreached(ticket) ? '#DC2626' : '#059669',
                fontWeight: 600,
              }}>
                {ticket.sla_due_at ? formatDateTime(ticket.sla_due_at) : '\u2014'}
                {isSlaBreached(ticket) && <span style={{ marginLeft: 4, fontSize: 10 }}>BREACHED</span>}
              </div>
            </div>
            <div>
              <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Category</div>
              <div style={{ color: NAVY, fontWeight: 500, textTransform: 'capitalize' }}>{(ticket.category || '').replace(/_/g, ' ')}</div>
            </div>
          </div>

          {/* Assigned To dropdown */}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Assigned To
            </label>
            <input
              value={drawerAssigned}
              onChange={e => onAssignChange(e.target.value)}
              placeholder="Enter email..."
              style={inputStyle}
            />
          </div>

          {/* Status dropdown */}
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Status
            </label>
            <select
              value={drawerStatus}
              onChange={e => onStatusChange(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* CSAT Status */}
          {(ticket.satisfaction_score || ticket.csat_sent_at) && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 6 }}>
                Customer Satisfaction
              </div>
              {ticket.satisfaction_score ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} style={{ fontSize: 16, color: s <= ticket.satisfaction_score! ? '#F59E0B' : '#D1D5DB' }}>
                        &#9733;
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{ticket.satisfaction_score}/5</span>
                  {ticket.csat_completed_at && (
                    <span style={{ fontSize: 10, color: TEXT_MUTED, marginLeft: 'auto' }}>
                      {formatDate(ticket.csat_completed_at)}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: TEXT_SEC }}>
                  Survey sent {formatDateTime(ticket.csat_sent_at)} — awaiting response
                </div>
              )}
              {ticket.csat_comment && (
                <div style={{ marginTop: 6, fontSize: 12, color: NAVY, fontStyle: 'italic', lineHeight: 1.4 }}>
                  "{ticket.csat_comment}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {ticket.description && (
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
            <div style={{ fontSize: 13, color: NAVY, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
          </div>
        )}

        {/* Conversation thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 10 }}>
            Conversation ({replies.length})
          </div>
          {repliesLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton h={50} />
              <Skeleton h={50} />
            </div>
          ) : replies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: TEXT_MUTED, fontSize: 12 }}>
              No replies yet. Send the first response below.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {replies.map(reply => {
                let bgColor = '#FFFFFF';
                let borderColor = '#E5E7EB';
                let labelColor = TEXT_SEC;
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
                  <div key={reply.id} style={{
                    background: bgColor, border: `1px solid ${borderColor}`,
                    borderRadius: 8, padding: '10px 12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {reply.reply_type === 'internal_note' && (
                          <span style={{ fontSize: 12 }}>&#128274;</span>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>
                          {reply.author_name || reply.author_email}
                        </span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: labelColor,
                          background: reply.reply_type === 'customer' ? '#DBEAFE' : reply.reply_type === 'internal_note' ? '#E5E7EB' : '#F0FDF4',
                          padding: '1px 6px', borderRadius: 3,
                        }}>
                          {labelText}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, color: TEXT_MUTED }}>{formatDateTime(reply.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: NAVY, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {reply.body}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reply form */}
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, background: '#FAFAF8' }}>
          <textarea
            value={replyBody}
            onChange={e => onReplyBodyChange(e.target.value)}
            placeholder={isInternalNote ? 'Write an internal note (not visible to customer)...' : 'Write a reply...'}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', marginBottom: 8, background: isInternalNote ? '#F9FAFB' : '#FFFFFF' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT_SEC, cursor: 'pointer' }}>
              <input type="checkbox" checked={isInternalNote} onChange={e => onInternalNoteChange(e.target.checked)} />
              Internal Note
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onResolveAndClose}
                style={{
                  padding: '6px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0',
                  borderRadius: 6, color: '#059669', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                Resolve & Close
              </button>
              <button
                onClick={onSendReply}
                disabled={sendingReply || !replyBody.trim()}
                style={{
                  padding: '6px 14px', background: sendingReply || !replyBody.trim() ? '#E5E7EB' : GOLD,
                  border: 'none', borderRadius: 6, color: '#FFFFFF', fontSize: 12, fontWeight: 700,
                  cursor: sendingReply || !replyBody.trim() ? 'default' : 'pointer',
                }}>
                {sendingReply ? 'Sending...' : 'Send Reply'}
              </button>
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
  createPriority, createDescription, creating, inputStyle,
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
  inputStyle: React.CSSProperties;
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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 14, width: 520, maxWidth: '90vw',
        maxHeight: '90vh', overflowY: 'auto', padding: 24,
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>Create Ticket</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: TEXT_MUTED, lineHeight: 1,
          }}>
            {'\u00D7'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Org */}
          <div>
            <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Organization</label>
            <OrgCombobox orgs={orgs} value={createOrg} onChange={onOrgChange} placeholder="Search organization..." />
          </div>

          {/* Name + Email + Phone */}
          <div>
            <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Contact Name *</label>
            <input value={createName} onChange={e => onNameChange(e.target.value)} style={inputStyle} placeholder="Contact name" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Contact Email *</label>
              <input value={createEmail} onChange={e => onEmailChange(e.target.value)} style={inputStyle} placeholder="customer@example.com" type="email" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Contact Phone</label>
              <input value={createPhone} onChange={e => onPhoneChange(e.target.value)} style={inputStyle} placeholder="(555) 000-0000" type="tel" />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Subject *</label>
            <input value={createSubject} onChange={e => onSubjectChange(e.target.value)} style={inputStyle} placeholder="Ticket subject" />
          </div>

          {/* Category + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Category</label>
              <select value={createCategory} onChange={e => onCategoryChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Priority</label>
              <select value={createPriority} onChange={e => onPriorityChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Description *</label>
            <textarea
              value={createDescription}
              onChange={e => onDescriptionChange(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Describe the issue..."
            />
          </div>

          {/* SLA note */}
          <div style={{ fontSize: 11, color: TEXT_MUTED, background: '#F9FAFB', borderRadius: 6, padding: '8px 12px' }}>
            SLA will be set based on priority: Critical = 4h, High = 24h, Normal = 72h, Low = 7 days
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button onClick={onClose}
              style={{
                padding: '8px 18px', background: '#F3F4F6', border: `1px solid ${BORDER}`,
                borderRadius: 6, color: TEXT_SEC, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={creating || !createSubject || !createDescription}
              style={{
                padding: '8px 18px',
                background: creating || !createSubject || !createDescription ? '#E5E7EB' : GOLD,
                border: 'none', borderRadius: 6, color: '#FFFFFF', fontSize: 13, fontWeight: 700,
                cursor: creating || !createSubject || !createDescription ? 'default' : 'pointer',
              }}>
              {creating ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
