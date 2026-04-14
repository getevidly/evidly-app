/**
 * Remote Connect — Admin page for remote support sessions
 * Route: /admin/remote-connect
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import OrgCombobox, { type OrgOption } from '../../components/admin/OrgCombobox';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';

type SessionType = 'screen_share' | 'co_browse' | 'guided_walkthrough' | 'diagnostic';
type SessionStatus = 'pending' | 'active' | 'ended' | 'expired';

interface OrgRow {
  id: string;
  name: string;
}

interface TicketRow {
  id: string;
  subject: string;
  ticket_number: string;
}

interface SessionRow {
  id: string;
  organization_id: string | null;
  customer_email: string;
  session_type: SessionType;
  status: SessionStatus;
  connection_url: string;
  notes: string | null;
  staff_user_id: string | null;
  ticket_id: string | null;
  ticket_number: string | null;
  created_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  organizations?: { name: string } | null;
}

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  screen_share: 'Screen Share',
  co_browse: 'Co-Browse',
  guided_walkthrough: 'Guided Walkthrough',
  diagnostic: 'Diagnostic',
};

const STATUS_STYLES: Record<SessionStatus, { bg: string; color: string }> = {
  pending: { bg: '#FFFBEB', color: '#D97706' },
  active: { bg: '#F0FFF4', color: '#059669' },
  ended: { bg: '#F3F4F6', color: '#6B7280' },
  expired: { bg: '#FEF2F2', color: '#DC2626' },
};

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div className="rounded-md animate-pulse bg-gray-200" style={{ width: w, height: h }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="text-center py-[60px] px-5 bg-cream border-2 border-dashed border-[#E2D9C8] rounded-xl m-4">
    <div className="text-[40px] mb-4">{icon}</div>
    <div className="text-base font-bold text-navy mb-2">{title}</div>
    <div className="text-[13px] text-[#6B7F96] max-w-[400px] mx-auto">{subtitle}</div>
  </div>
);

export default function RemoteConnect() {
  useDemoGuard();
  const { user } = useAuth();

  // Org & ticket data
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  // Form state
  const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [linkedTicket, setLinkedTicket] = useState('');
  const [sessionType, setSessionType] = useState<SessionType>('screen_share');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirmation modal
  const [showModal, setShowModal] = useState(false);
  const [createdUrl, setCreatedUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Data Loading ──

  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from('remote_connect_sessions')
      .select('*, organizations(name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setSessions(data as SessionRow[]);
  }, []);

  const loadOrgsAndTickets = useCallback(async () => {
    const [orgRes, ticketRes] = await Promise.all([
      supabase.from('organizations').select('id, name').order('name'),
      supabase.from('support_tickets').select('id, subject, ticket_number').in('status', ['open', 'in_progress', 'escalated']).order('created_at', { ascending: false }),
    ]);
    if (orgRes.data) setOrgs(orgRes.data);
    if (ticketRes.data) setTickets(ticketRes.data);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadSessions(), loadOrgsAndTickets()]);
      setLoading(false);
    })();
  }, [loadSessions, loadOrgsAndTickets]);

  // Auto-refresh active sessions every 15s
  useEffect(() => {
    const interval = setInterval(loadSessions, 15000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // ── Derived Data ──

  const activeSessions = sessions.filter(s => s.status === 'pending' || s.status === 'active');
  const historySessions = sessions.slice(0, 30);

  // ── Handlers ──

  const handleCreate = async () => {
    if (!customerEmail) return;
    setCreating(true);

    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const connectionUrl = `https://app.whereby.com/evidly-support-${token}`;

    const ticket = linkedTicket ? tickets.find(t => t.id === linkedTicket) : null;

    const { error } = await supabase.from('remote_connect_sessions').insert([{
      organization_id: selectedOrg && !selectedOrg.isNew ? selectedOrg.id : null,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      session_type: sessionType,
      status: 'pending' as SessionStatus,
      connection_url: connectionUrl,
      notes: notes || null,
      staff_user_id: user?.id || null,
      ticket_id: linkedTicket || null,
      ticket_number: ticket?.ticket_number || null,
    }]);

    if (error) {
      console.error(`Error creating session: ${error.message}`);
    } else {
      setCreatedUrl(connectionUrl);
      setShowModal(true);
      setCopied(false);

      // Reset form
      setSelectedOrg(null);
      setCustomerEmail('');
      setCustomerPhone('');
      setLinkedTicket('');
      setSessionType('screen_share');
      setNotes('');

      // Refresh sessions list
      await loadSessions();
    }

    setCreating(false);
  };

  const handleEndSession = async (session: SessionRow) => {
    const now = new Date();
    const created = new Date(session.created_at);
    const durationSeconds = Math.round((now.getTime() - created.getTime()) / 1000);

    const { error } = await supabase
      .from('remote_connect_sessions')
      .update({
        status: 'ended' as SessionStatus,
        ended_at: now.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', session.id);

    if (error) {
      console.error(`Error ending session: ${error.message}`);
    } else {
      await loadSessions();
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      const textarea = document.createElement('textarea');
      textarea.value = createdUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Render ──

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Remote Connect' }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Remote Connect</h1>
        <p className="text-[13px] text-[#6B7F96] mt-1">
          Initiate and manage remote support sessions with customers.
        </p>
      </div>

      {/* ───────── Section 1: Initiate New Session ───────── */}
      <div className="bg-white border border-[#E2D9C8] rounded-xl p-6">
        <h3 className="text-sm font-bold text-navy mb-4">Initiate New Session</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <OrgCombobox
              label="Customer Org"
              orgs={orgs}
              value={selectedOrg}
              onChange={setSelectedOrg}
              placeholder="Search organization..."
              inputStyle={{ background: '#F9FAFB' }}
            />
          </div>
          <div>
            <label className="text-[11px] text-[#6B7F96] block mb-1">Customer Email *</label>
            <input
              value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-[13px]"
              placeholder="customer@example.com"
              type="email"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#6B7F96] block mb-1">Customer Phone</label>
            <input
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-[13px]"
              placeholder="(555) 000-0000"
              type="tel"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[11px] text-[#6B7F96] block mb-1">Linked Ticket (optional)</label>
            <select value={linkedTicket} onChange={e => setLinkedTicket(e.target.value)} className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-[13px] cursor-pointer">
              <option value="">No linked ticket</option>
              {tickets.map(t => (
                <option key={t.id} value={t.id}>#{t.ticket_number} — {t.subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-[#6B7F96] block mb-2">Session Type</label>
            <div className="flex gap-3 flex-wrap">
              {(Object.entries(SESSION_TYPE_LABELS) as [SessionType, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-[5px] text-xs text-navy cursor-pointer">
                  <input
                    type="radio"
                    name="sessionType"
                    value={key}
                    checked={sessionType === key}
                    onChange={() => setSessionType(key)}
                    className="accent-gold"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className="text-[11px] text-[#6B7F96] block mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-[13px] resize-y"
            placeholder="Session context, customer issue description, etc."
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={creating || !customerEmail}
          className={`py-2 px-6 border-none rounded-md text-[13px] font-bold text-white ${creating || !customerEmail ? 'bg-gray-200 cursor-default' : 'bg-gold cursor-pointer'}`}
        >
          {creating ? 'Creating...' : 'Create Session & Send Link'}
        </button>
      </div>

      {/* ───────── Section 2: Active Sessions ───────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold text-navy m-0">Active Sessions</h3>
          <span className="text-[10px] text-[#6B7F96] italic">Auto-refreshes every 15s</span>
        </div>
        <div className="bg-white rounded-xl border border-[#E2D9C8] overflow-hidden">
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : activeSessions.length === 0 ? (
            <EmptyState icon="&#128225;" title="No active sessions" subtitle="Active and pending support sessions will appear here." />
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#E2D9C8]">
                  {['Org', 'Customer Email', 'Type', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-[#6B7F96] font-semibold text-[11px] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSessions.map(s => {
                  const statusStyle = STATUS_STYLES[s.status];
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-[#E2D9C8] hover:bg-[#F9FAFB] transition-colors"
                    >
                      <td className="px-3.5 py-2.5 text-xs text-navy font-semibold">
                        {s.organizations?.name || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-[#6B7F96]">{s.customer_email}</td>
                      <td className="px-3.5 py-2.5 text-xs text-navy">
                        {SESSION_TYPE_LABELS[s.session_type] || s.session_type}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-[#6B7F96]">
                        {new Date(s.created_at).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs flex gap-1.5">
                        <button
                          onClick={() => window.open(s.connection_url, '_blank', 'noopener')}
                          className="px-2.5 py-1 bg-[#F0FFF4] border border-[#BBF7D0] rounded text-[#059669] text-[11px] font-semibold cursor-pointer"
                        >
                          Join Room
                        </button>
                        <button
                          onClick={() => handleEndSession(s)}
                          className="px-2.5 py-1 bg-[#FEF2F2] border-none rounded text-[#DC2626] text-[11px] font-semibold cursor-pointer"
                        >
                          End Session
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ───────── Section 3: Session History ───────── */}
      <div>
        <h3 className="text-sm font-bold text-navy mb-3">Session History</h3>
        <div className="bg-white rounded-xl border border-[#E2D9C8] overflow-hidden">
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : historySessions.length === 0 ? (
            <EmptyState icon="&#128203;" title="No session history" subtitle="Completed support sessions will appear here." />
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#E2D9C8]">
                  {['Org', 'Type', 'Status', 'Staff', 'Duration', 'Ticket #', 'Created'].map(h => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-[#6B7F96] font-semibold text-[11px] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historySessions.map(s => {
                  const statusStyle = STATUS_STYLES[s.status];
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-[#E2D9C8] hover:bg-[#F9FAFB] transition-colors"
                    >
                      <td className="px-3.5 py-2.5 text-xs text-navy font-semibold">
                        {s.organizations?.name || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-navy">
                        {SESSION_TYPE_LABELS[s.session_type] || s.session_type}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-[#6B7F96]">
                        {s.staff_user_id ? s.staff_user_id.slice(0, 8) + '...' : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-navy font-semibold">
                        {formatDuration(s.duration_seconds)}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-[#6B7F96]">
                        {s.ticket_number ? `#${s.ticket_number}` : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-[#6B7F96]">
                        {new Date(s.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ───────── Confirmation Modal ───────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-[480px] w-[90%] shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-[#F0FFF4] inline-flex items-center justify-center mb-3">
                <span className="text-2xl">&#x2713;</span>
              </div>
              <h3 className="text-lg font-bold text-navy m-0">Session Created</h3>
              <p className="text-[13px] text-[#6B7F96] mt-1.5">
                The support session has been created. Share the connection link with the customer.
              </p>
            </div>

            <div className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg p-3 mb-4 flex items-center gap-2">
              <input
                readOnly
                value={createdUrl}
                className="flex-1 border-none bg-transparent text-xs text-navy outline-none font-mono"
              />
              <button
                onClick={handleCopyUrl}
                className={`px-3.5 py-1.5 border-none rounded-md text-[11px] font-bold text-white cursor-pointer whitespace-nowrap transition-colors ${copied ? 'bg-[#059669]' : 'bg-navy'}`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => window.open(createdUrl, '_blank', 'noopener')}
                className="flex-1 py-2.5 px-4 bg-gold border-none rounded-lg text-white text-[13px] font-bold cursor-pointer"
              >
                Open Room
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 px-4 bg-[#F3F4F6] border border-[#E2D9C8] rounded-lg text-[#6B7F96] text-[13px] font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
