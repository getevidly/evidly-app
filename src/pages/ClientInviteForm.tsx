import { useState, useEffect, useCallback } from 'react';
import { Send, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

const NAVY = '#1E2D4D';
const CREATE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-client-invite`;

const ROLES = [
  { v: 'owner_operator', l: 'Owner / operator' },
  { v: 'executive', l: 'Executive' },
  { v: 'compliance_manager', l: 'Compliance manager' },
  { v: 'facilities_manager', l: 'Facilities manager' },
  { v: 'chef', l: 'Chef' },
  { v: 'kitchen_manager', l: 'Kitchen manager' },
];

interface Invite {
  id: string;
  business_name: string | null;
  contact_name: string;
  email: string;
  status: string;
  client_role: string;
  reminder_count: number;
  created_at: string;
}

export function ClientInviteForm() {
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('owner_operator');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    const { data } = await supabase
      .from('evidly_client_invites')
      .select('id, business_name, contact_name, email, status, client_role, reminder_count, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setInvites(data as Invite[]);
  }, []);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  async function authedHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
    return {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
    };
  }

  async function handleSend() {
    if (!contactName.trim() || !email.trim()) {
      setFeedback({ ok: false, text: 'Contact name and email are required.' });
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch(CREATE_FN, {
        method: 'POST',
        headers: await authedHeaders(),
        body: JSON.stringify({
          contact_name: contactName,
          email,
          client_role: role,
          business_name: businessName || null,
          phone: phone || null,
          message: message || null,
          sender_name: 'Arthur',
        }),
      });
      const out = await res.json();
      if (!res.ok) { setFeedback({ ok: false, text: out.error || 'Could not send invite.' }); setSending(false); return; }
      setFeedback({ ok: true, text: `Invite sent to ${email}.` });
      setContactName(''); setEmail(''); setRole('owner_operator');
      setBusinessName(''); setPhone(''); setMessage('');
      loadInvites();
    } catch {
      setFeedback({ ok: false, text: 'Something went wrong. Try again.' });
    }
    setSending(false);
  }

  async function handleRemind(inviteId: string) {
    setRemindingId(inviteId);
    try {
      const res = await fetch(CREATE_FN, {
        method: 'POST',
        headers: await authedHeaders(),
        body: JSON.stringify({ invite_id: inviteId, sender_name: 'Arthur' }),
      });
      const out = await res.json();
      if (!res.ok) setFeedback({ ok: false, text: out.error || 'Reminder failed.' });
      else { setFeedback({ ok: true, text: 'Reminder sent.' }); loadInvites(); }
    } catch {
      setFeedback({ ok: false, text: 'Reminder failed.' });
    }
    setRemindingId(null);
  }

  const badge = (status: string) => {
    const map: Record<string, { bg: string; fg: string }> = {
      pending: { bg: '#FAEEDA', fg: '#854F0B' },
      accepted: { bg: '#E1F5EE', fg: '#0F6E56' },
      expired: { bg: '#F1EFE8', fg: '#5F5E5A' },
      revoked: { bg: '#FCEBEB', fg: '#A32D2D' },
    };
    const c = map[status] || map.expired;
    return <span style={{ background: c.bg, color: c.fg, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>{status}</span>;
  };

  return (
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-2">Invite a client</h2>
        <p className="text-[#1E2D4D]/70">Send a client an EvidLY account. They complete anything you leave blank on sign-up.</p>
      </div>

      {feedback && (
        <div className="mb-6 px-4 py-3 rounded" style={{ background: feedback.ok ? '#E1F5EE' : '#FCEBEB', color: feedback.ok ? '#0F6E56' : '#A32D2D' }}>
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-[#1E2D4D]/70 mb-1">Contact name *</label>
          <input value={contactName} onChange={e => setContactName(e.target.value)} className="w-full border border-[#1E2D4D]/15 rounded px-3 py-2" placeholder="Maria Delgado" />
        </div>
        <div>
          <label className="block text-sm text-[#1E2D4D]/70 mb-1">Email *</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-[#1E2D4D]/15 rounded px-3 py-2" placeholder="maria@business.com" />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-[#1E2D4D]/70 mb-1">Role *</label>
        <select value={role} onChange={e => setRole(e.target.value)} className="w-full border border-[#1E2D4D]/15 rounded px-3 py-2">
          {ROLES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
        <p className="text-xs text-[#1E2D4D]/50 mt-1">Sets what they see in EvidLY. Default: owner / operator.</p>
      </div>

      <div className="border-t border-[#1E2D4D]/10 my-4"></div>
      <p className="text-xs text-[#1E2D4D]/50 italic mb-4">Optional — leave blank and they fill it in on sign-up.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-[#1E2D4D]/70 mb-1">Business name</label>
          <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full border border-[#1E2D4D]/15 rounded px-3 py-2" placeholder="Blue Oak Grill" />
        </div>
        <div>
          <label className="block text-sm text-[#1E2D4D]/70 mb-1">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-[#1E2D4D]/15 rounded px-3 py-2" placeholder="(559) 555-0148" />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm text-[#1E2D4D]/70 mb-1">Personal message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full border border-[#1E2D4D]/15 rounded px-3 py-2" rows={2} placeholder="A short note from you" />
      </div>

      <button onClick={handleSend} disabled={sending} className="w-full text-white font-medium rounded py-3 flex items-center justify-center gap-2" style={{ background: NAVY, opacity: sending ? 0.5 : 1 }}>
        <Send size={16} />{sending ? 'Sending…' : 'Send invite'}
      </button>

      {invites.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-[#1E2D4D] mb-3">Sent invites</h3>
          <div className="flex flex-col gap-2">
            {invites.map(inv => (
              <div key={inv.id} className="border border-[#1E2D4D]/10 rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1E2D4D] truncate">{inv.business_name || inv.contact_name}</p>
                  <p className="text-xs text-[#1E2D4D]/60 truncate">{inv.email} · {inv.client_role.replace(/_/g, ' ')}{inv.reminder_count > 0 ? ` · reminded ${inv.reminder_count}×` : ''}</p>
                </div>
                <div className="flex items-center gap-3 flex-none">
                  {badge(inv.status)}
                  {inv.status === 'pending' && (
                    <button onClick={() => handleRemind(inv.id)} disabled={remindingId === inv.id} className="text-xs flex items-center gap-1" style={{ color: NAVY }}>
                      <RefreshCw size={12} />{remindingId === inv.id ? '…' : 'Remind'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
