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

interface Org { id: string; name: string; state: string | null; city: string | null; primary_contact_name: string | null; primary_contact_email: string | null; }
interface Invite {
  id: string; organization_id: string | null; organization_name: string | null; contact_name: string; email: string;
  status: string; client_role: string; reminder_count: number; created_at: string;
}

export function ClientInviteForm() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('owner_operator');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('organizations')
        .select('id, name, state, is_system, primary_contact_name, primary_contact_email')
        .order('created_at', { ascending: false });
      if (data) {
        setOrgs((data as (Org & { is_system?: boolean })[])
          .filter(o => !o.is_system && o.name !== '__SYSTEM_TEMPLATES__'));
      }
    })();
  }, []);

  const loadInvites = useCallback(async () => {
    const { data } = await supabase
      .from('evidly_client_invites')
      .select('id, organization_id, organization_name, contact_name, email, status, client_role, reminder_count, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!data) return;

    // Reconcile: pending invites whose org already has a client user profile
    // are actually accepted (the status update may have failed silently).
    const pendingOrgIds = [...new Set(
      data.filter(i => i.status === 'pending' && i.organization_id)
          .map(i => i.organization_id as string),
    )];
    let acceptedOrgIds = new Set<string>();
    if (pendingOrgIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .in('organization_id', pendingOrgIds)
        .is('evidly_staff_role', null);
      if (profiles) {
        acceptedOrgIds = new Set(profiles.map(p => p.organization_id as string));
      }
    }

    setInvites(data.map(inv => ({
      ...inv,
      status: inv.status === 'pending' && inv.organization_id && acceptedOrgIds.has(inv.organization_id)
        ? 'accepted' : inv.status,
    })) as Invite[]);
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

  async function handleOrgSelect(id: string) {
    setOrgId(id);
    if (!id) return;

    // Source 1: client profile (non-staff) for this org → email via RPC
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('organization_id', id)
      .is('evidly_staff_role', null)
      .order('created_at', { ascending: true })
      .limit(1);

    if (profiles && profiles.length > 0) {
      const p = profiles[0];
      if (p.full_name) setContactName(p.full_name);
      const { data: emails } = await supabase.rpc('admin_get_user_emails', {
        p_user_ids: [p.id],
      });
      if (emails && emails.length > 0 && emails[0].email) {
        setEmail(emails[0].email);
      }
      return;
    }

    // Source 2: most recent invite for this org
    const { data: inviteRows } = await supabase
      .from('evidly_client_invites')
      .select('contact_name, email')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (inviteRows && inviteRows.length > 0) {
      if (inviteRows[0].contact_name) setContactName(inviteRows[0].contact_name);
      if (inviteRows[0].email) setEmail(inviteRows[0].email);
      return;
    }

    // Source 3: org's primary contact columns (backfilled or manually set)
    const org = orgs.find(o => o.id === id);
    if (org) {
      if (org.primary_contact_name) setContactName(org.primary_contact_name);
      if (org.primary_contact_email) setEmail(org.primary_contact_email);
    }
  }

  async function handleSend() {
    if (!orgId) { setFeedback({ ok: false, text: 'Select an organization.' }); return; }
    if (!contactName.trim() || !email.trim()) {
      setFeedback({ ok: false, text: 'Contact name and email are required.' }); return;
    }
    setSending(true); setFeedback(null);
    const orgName = orgs.find(o => o.id === orgId)?.name || null;
    try {
      const res = await fetch(CREATE_FN, {
        method: 'POST',
        headers: await authedHeaders(),
        body: JSON.stringify({
          organization_id: orgId,
          organization_name: orgName,
          contact_name: contactName,
          email,
          client_role: role,
          message: message || null,
          sender_name: 'Arthur',
        }),
      });
      const out = await res.json();
      if (!res.ok) { setFeedback({ ok: false, text: out.error || 'Could not send invite.' }); setSending(false); return; }
      setFeedback({ ok: true, text: `Invite sent to ${email}.` });
      setContactName(''); setEmail(''); setRole('owner_operator'); setMessage(''); setOrgId('');
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
        method: 'POST', headers: await authedHeaders(),
        body: JSON.stringify({ invite_id: inviteId, sender_name: 'Arthur' }),
      });
      const out = await res.json();
      if (!res.ok) setFeedback({ ok: false, text: out.error || 'Reminder failed.' });
      else { setFeedback({ ok: true, text: 'Reminder sent.' }); loadInvites(); }
    } catch { setFeedback({ ok: false, text: 'Reminder failed.' }); }
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
        <p className="text-[#1E2D4D]/70">Give a client login access to the account you set up for them. Their kitchen, county, and records are already in place.</p>
      </div>

      {feedback && (
        <div className="mb-6 px-4 py-3 rounded" style={{ background: feedback.ok ? '#E1F5EE' : '#FCEBEB', color: feedback.ok ? '#0F6E56' : '#A32D2D' }}>
          {feedback.text}
        </div>
      )}

      <label className="block text-sm text-[#1E2D4D]/70 mb-1">Organization *</label>
      <select value={orgId} onChange={e => handleOrgSelect(e.target.value)} className="w-full border border-[#1E2D4D]/15 rounded px-3 py-2 mb-1">
        <option value="">Select the client's organization…</option>
        {orgs.map(o => <option key={o.id} value={o.id}>{o.name}{o.state ? ` · ${o.state}` : ''}</option>)}
      </select>
      <p className="text-xs text-[#1E2D4D]/50 mb-4">The account you already configured. The invite grants access to this org.</p>

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

      <div className="mb-6">
        <label className="block text-sm text-[#1E2D4D]/70 mb-1">Personal message <span className="text-[#1E2D4D]/40">· optional</span></label>
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
                  <p className="text-sm font-medium text-[#1E2D4D] truncate">{inv.organization_name || inv.contact_name}</p>
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
