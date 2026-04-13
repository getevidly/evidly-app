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

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const BORDER = '#E2D9C8';

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
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FAF7F2', border: '2px dashed #E2D9C8', borderRadius: 12, margin: 16 }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 400, margin: '0 auto' }}>{subtitle}</div>
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

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 6, color: NAVY, fontSize: 13, width: '100%',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '10px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 12,
  };

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
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Remote Connect</h1>
        <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
          Initiate and manage remote support sessions with customers.
        </p>
      </div>

      {/* ───────── Section 1: Initiate New Session ───────── */}
      <div style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Initiate New Session</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
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
            <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Customer Email *</label>
            <input
              value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)}
              style={inputStyle}
              placeholder="customer@example.com"
              type="email"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Customer Phone</label>
            <input
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              style={inputStyle}
              placeholder="(555) 000-0000"
              type="tel"
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Linked Ticket (optional)</label>
            <select value={linkedTicket} onChange={e => setLinkedTicket(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">No linked ticket</option>
              {tickets.map(t => (
                <option key={t.id} value={t.id}>#{t.ticket_number} — {t.subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 8 }}>Session Type</label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {(Object.entries(SESSION_TYPE_LABELS) as [SessionType, string][]).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: NAVY, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="sessionType"
                    value={key}
                    checked={sessionType === key}
                    onChange={() => setSessionType(key)}
                    style={{ accentColor: GOLD }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="Session context, customer issue description, etc."
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={creating || !customerEmail}
          style={{
            padding: '8px 24px', background: creating || !customerEmail ? '#E5E7EB' : GOLD, border: 'none', borderRadius: 6,
            color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: creating || !customerEmail ? 'default' : 'pointer',
          }}
        >
          {creating ? 'Creating...' : 'Create Session & Send Link'}
        </button>
      </div>

      {/* ───────── Section 2: Active Sessions ───────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>Active Sessions</h3>
          <span style={{ fontSize: 10, color: TEXT_SEC, fontStyle: 'italic' }}>Auto-refreshes every 15s</span>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : activeSessions.length === 0 ? (
            <EmptyState icon="📡" title="No active sessions" subtitle="Active and pending support sessions will appear here." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Org', 'Customer Email', 'Type', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSessions.map(s => {
                  const statusStyle = STATUS_STYLES[s.status];
                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...tdStyle, color: NAVY, fontWeight: 600 }}>
                        {s.organizations?.name || '—'}
                      </td>
                      <td style={{ ...tdStyle, color: TEXT_SEC }}>{s.customer_email}</td>
                      <td style={{ ...tdStyle, color: NAVY }}>
                        {SESSION_TYPE_LABELS[s.session_type] || s.session_type}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                          background: statusStyle.bg, color: statusStyle.color,
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: TEXT_SEC }}>
                        {new Date(s.created_at).toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => window.open(s.connection_url, '_blank', 'noopener')}
                          style={{
                            padding: '4px 10px', background: '#F0FFF4', border: '1px solid #BBF7D0', borderRadius: 4,
                            color: '#059669', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Join Room
                        </button>
                        <button
                          onClick={() => handleEndSession(s)}
                          style={{
                            padding: '4px 10px', background: '#FEF2F2', border: 'none', borderRadius: 4,
                            color: '#DC2626', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}
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
        <h3 style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 12 }}>Session History</h3>
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : historySessions.length === 0 ? (
            <EmptyState icon="📋" title="No session history" subtitle="Completed support sessions will appear here." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Org', 'Type', 'Status', 'Staff', 'Duration', 'Ticket #', 'Created'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historySessions.map(s => {
                  const statusStyle = STATUS_STYLES[s.status];
                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...tdStyle, color: NAVY, fontWeight: 600 }}>
                        {s.organizations?.name || '—'}
                      </td>
                      <td style={{ ...tdStyle, color: NAVY }}>
                        {SESSION_TYPE_LABELS[s.session_type] || s.session_type}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                          background: statusStyle.bg, color: statusStyle.color,
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: TEXT_SEC }}>
                        {s.staff_user_id ? s.staff_user_id.slice(0, 8) + '...' : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: NAVY, fontWeight: 600 }}>
                        {formatDuration(s.duration_seconds)}
                      </td>
                      <td style={{ ...tdStyle, color: TEXT_SEC }}>
                        {s.ticket_number ? `#${s.ticket_number}` : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: TEXT_SEC }}>
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
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF', borderRadius: 16, padding: 32, maxWidth: 480, width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F0FFF4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <span className="text-2xl">&#x2713;</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>Session Created</h3>
              <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 6 }}>
                The support session has been created. Share the connection link with the customer.
              </p>
            </div>

            <div style={{
              background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 8, padding: 12, marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <input
                readOnly
                value={createdUrl}
                style={{
                  flex: 1, border: 'none', background: 'transparent', fontSize: 12, color: NAVY,
                  outline: 'none', fontFamily: 'monospace',
                }}
              />
              <button
                onClick={handleCopyUrl}
                style={{
                  padding: '6px 14px', background: copied ? '#059669' : NAVY, border: 'none', borderRadius: 6,
                  color: '#FFFFFF', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'background 0.2s',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => window.open(createdUrl, '_blank', 'noopener')}
                style={{
                  flex: 1, padding: '10px 16px', background: GOLD, border: 'none', borderRadius: 8,
                  color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Open Room
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: '10px 16px', background: '#F3F4F6', border: `1px solid ${BORDER}`, borderRadius: 8,
                  color: TEXT_SEC, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
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
