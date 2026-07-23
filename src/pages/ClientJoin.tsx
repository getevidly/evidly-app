/**
 * ClientJoin — the /join/:token prospect page.
 *
 * Shows a SAMPLE EvidLY dashboard (Pacific Restaurant Group, three
 * kitchens, mature data) in a rail + content layout.  The prospect's
 * real record lives on the gate (/gate/:token), not here.
 *
 * Journey: email → sample dashboard (/join) → their record (/gate) → book.
 *
 * NOTE: accept-client-invite and the claim path are intentionally kept
 * in the codebase — they'll be re-used downstream after conversion.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { EvidLYDashboard, LOC_TABS } from '../components/join/EvidLYDashboard';

const VIEWED_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-record-viewed`;
const SHARE_URL  = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-join-preview`;

/* Design-token aliases */
const SERIF = "'Spectral', Georgia, serif";
const SANS  = "'Instrument Sans', system-ui, -apple-system, sans-serif";
const MONO  = "'IBM Plex Mono', ui-monospace, monospace";
const BRAND = "'Montserrat', sans-serif";

const NAVY  = '#1C2A3A';
const CREAM = '#F7F1E6';
const LINE  = '#EEE7D9';
const MUTED = '#5F6875';
const GOLD  = '#A08C5A';
const GOLD_TEXT = '#8A6412';

interface Invite {
  organization_id: string;
  organization_name: string | null;
  business_name: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  expires_at: string;
}

/* ═══════════════════════════════════════════════════════════════ */
export function ClientJoin({ previewOnly = false }: { previewOnly?: boolean }) {
  const { token } = useParams<{ token: string }>();

  /* ── State ─────────────────────────────────────────────────── */
  const [loading, setLoading]       = useState(!previewOnly);
  const [invite, setInvite]         = useState<Invite | null>(null);
  const [loadError, setLoadError]   = useState<string | null>(null);

  const [showShare, setShowShare]       = useState(false);
  const [shareEmail, setShareEmail]     = useState('');
  const [shareNote, setShareNote]       = useState('');
  const [shareSending, setShareSending] = useState(false);
  const [shareSent, setShareSent]       = useState(false);

  const [previewLoc, setPreviewLoc] = useState('all');

  const viewedRef = useRef(false);

  /* ── Fetch invite ──────────────────────────────────────────── */
  useEffect(() => {
    if (previewOnly) return;
    (async () => {
      if (!token) { setLoadError('Missing invite link.'); setLoading(false); return; }
      const { data, error } = await supabase
        .from('evidly_client_invites')
        .select('organization_id, organization_name, business_name, contact_name, email, phone, message, status, expires_at')
        .eq('token', token)
        .maybeSingle();
      if (error || !data) { setLoadError('This invite link is invalid.'); setLoading(false); return; }
      if (data.status === 'accepted') { setLoadError('This invite has already been used. Please sign in.'); setLoading(false); return; }
      if (data.status !== 'pending') { setLoadError(`This invite is ${data.status}.`); setLoading(false); return; }
      if (new Date(data.expires_at) < new Date()) { setLoadError('This invite has expired.'); setLoading(false); return; }
      setInvite(data as Invite);
      setLoading(false);
      if (!viewedRef.current) {
        viewedRef.current = true;
        fetch(VIEWED_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ token }),
        }).catch(() => {});
      }
    })();
  }, [token, previewOnly]);

  /* ── Share ──────────────────────────────────────────────────── */
  async function handleShare() {
    if (!shareEmail || shareSending) return;
    setShareSending(true);
    try {
      const res = await fetch(SHARE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token, email: shareEmail, note: shareNote || undefined }),
      });
      if (!res.ok) {
        const out = await res.json().catch(() => ({}));
        toast.error(out.error || 'Could not send. Check the email and try again.');
        setShareSending(false);
        return;
      }
      setShareSent(true);
      setShareSending(false);
    } catch {
      toast.error('Something went wrong. Please try again.');
      setShareSending(false);
    }
  }

  /* ── Derived ───────────────────────────────────────────────── */
  const orgLabel = previewOnly
    ? 'Pacific Restaurant Group'
    : (invite?.organization_name || invite?.business_name || 'your kitchen');
  const gateHref = token ? `/gate/${token}` : null;

  /* ── Loading ───────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: NAVY, fontFamily: SANS, fontSize: 15 }}>Loading…</span>
      </div>
    );
  }

  /* ── Error ──────────────────────────────────────────────────── */
  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 12, border: `1px solid ${LINE}`, padding: 28, textAlign: 'center' }}>
          <div style={{ marginBottom: 12, fontFamily: BRAND, fontWeight: 800, fontSize: 20 }}>
            <span style={{ color: GOLD }}>E</span><span style={{ color: NAVY }}>vid</span><span style={{ color: GOLD }}>LY</span>
          </div>
          <p style={{ color: NAVY, fontSize: 15, fontFamily: SANS }}>{loadError}</p>
          <Link to="/login"
            style={{ marginTop: 16, display: 'inline-block', padding: '10px 20px', borderRadius: 9, background: NAVY, color: '#F5EFE4', fontFamily: SANS, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  /* ── Rail content (shared between desktop sticky + mobile top) */
  const railInner = (
    <>
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 22, letterSpacing: '-0.01em' }}>
          <span style={{ color: GOLD }}>E</span>
          <span style={{ color: 'white' }}>vid</span>
          <span style={{ color: GOLD }}>LY</span>
        </span>
      </div>

      {!previewOnly && (
        <div style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.2em', fontWeight: 600, color: GOLD, marginBottom: 12 }}>
          Prepared for {orgLabel}
        </div>
      )}

      <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 22, lineHeight: 1.25, color: 'white', margin: '0 0 12px' }}>
        Your hood cleaning is documented.
      </h1>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.65)', margin: '0 0 28px' }}>
        You already trust Cleaning Pros Plus with your hood cleaning. Every visit, we leave a dated certificate
        {'\u2009'}&mdash;{'\u2009'}what we cleaned, what we found, what we couldn{'\u2019'}t reach.
        That{'\u2019'}s now the first record in your account.
      </p>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
        {([['Predict', "what's upcoming"], ['Reduce', 'the lapse'], ['Prove', "it's done"]] as const).map(([t, sub]) => (
          <div key={t}>
            <div style={{ fontFamily: SERIF, fontSize: 12, fontWeight: 600, color: GOLD_TEXT, marginBottom: 2 }}>{t}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {gateHref && (
        <>
          <Link to={gateHref}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 20px', background: '#B24A2E', color: 'white', borderRadius: 8, fontFamily: SANS, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            See what{'\u2019'}s on file →
          </Link>
          <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 8, fontFamily: MONO, letterSpacing: '0.04em' }}>
            Your record · view-only, no account
          </div>
        </>
      )}

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 28, paddingTop: 16, fontSize: 10, color: 'rgba(255,255,255,0.30)', lineHeight: 1.6 }}>
        founders@getevidly.com · (855) 384-3591
      </div>
    </>
  );

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: SANS }}>

      {/* ══════ DESKTOP RAIL — sticky ~290 px ══════ */}
      <div className="hidden lg:block" style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 290,
        background: NAVY, padding: '32px 28px', overflowY: 'auto' as const, zIndex: 20,
      }}>
        {railInner}
      </div>

      {/* ══════ MOBILE RAIL — stacks on top ══════ */}
      <div className="lg:hidden" style={{ background: NAVY, padding: '28px 22px' }}>
        {railInner}
      </div>

      {/* ══════ MAIN CONTENT ══════ */}
      <div className="lg:ml-[290px]" style={{ paddingBottom: 80 }}>

        {/* ── 1. SAMPLE BADGE BAR ── */}
        <div style={{ background: '#FBF9F2', borderBottom: `1px solid ${LINE}`, padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontWeight: 600, padding: '4px 10px', background: NAVY, color: '#F5EFE4', borderRadius: 4, whiteSpace: 'nowrap' as const }}>
            Sample Dashboard
          </span>
          <span style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>
            You{'\u2019'}re looking at Pacific Restaurant Group{'\u2009'}&mdash;{'\u2009'}a three-kitchen sample, so you can see EvidLY
            with a full year of records in it. Your account starts with your hood cleaning certificate.
          </span>
        </div>

        {/* ── 2. LOCATION TABS + SHARE ── */}
        <div style={{ borderBottom: `1px solid ${LINE}`, padding: '10px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' as const }}>
          <div style={{ display: 'flex', gap: 2, overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as any, scrollbarWidth: 'none' as const }}>
            {LOC_TABS.map(([id, label]: [string, string]) => {
              const active = previewLoc === id;
              return (
                <button key={id} onClick={() => setPreviewLoc(id)}
                  style={{
                    fontFamily: active ? SERIF : SANS, fontSize: 13, fontWeight: active ? 600 : 500,
                    padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: active ? NAVY : 'transparent', color: active ? '#F5EFE4' : MUTED,
                    whiteSpace: 'nowrap' as const, transition: 'background .16s',
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
          <button onClick={() => { setShowShare(!showShare); setShareSent(false); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              border: `1px solid ${showShare ? GOLD : LINE}`, borderRadius: 8,
              background: showShare ? GOLD : 'transparent',
              color: showShare ? 'white' : MUTED, cursor: 'pointer',
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            }}>
            <Send size={12} /> Share
          </button>
        </div>

        {/* ── 3. INLINE SHARE FORM ── */}
        {showShare && (
          <div style={{ borderBottom: `1px solid ${LINE}`, padding: '18px 28px', background: '#FBF9F2' }}>
            {shareSent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#3E5E4B' }}>{'\u2713'} Sent to {shareEmail}</span>
                <button onClick={() => { setShareSent(false); setShareEmail(''); setShareNote(''); }}
                  style={{ fontSize: 12, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Send another
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1">
                  <label style={{ fontSize: 11, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 4 }}>Recipient email</label>
                  <input type="email" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="colleague@restaurant.com"
                    style={{ width: '100%', padding: '8px 12px', border: `1px solid ${LINE}`, borderRadius: 6, fontSize: 13, fontFamily: SANS }} />
                </div>
                <div className="flex-1">
                  <label style={{ fontSize: 11, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 4 }}>
                    Note <span style={{ fontWeight: 400, color: MUTED }}>(optional)</span>
                  </label>
                  <input type="text" value={shareNote} onChange={(e) => setShareNote(e.target.value)}
                    placeholder="Take a look at this"
                    style={{ width: '100%', padding: '8px 12px', border: `1px solid ${LINE}`, borderRadius: 6, fontSize: 13, fontFamily: SANS }} />
                </div>
                <button onClick={handleShare} disabled={!shareEmail || shareSending}
                  style={{
                    padding: '8px 20px', background: NAVY, color: 'white', border: 'none',
                    borderRadius: 6, fontFamily: SANS, fontSize: 13, fontWeight: 600,
                    cursor: shareEmail && !shareSending ? 'pointer' : 'not-allowed',
                    opacity: shareEmail && !shareSending ? 1 : 0.5, whiteSpace: 'nowrap' as const,
                  }}>
                  {shareSending ? 'Sending\u2026' : 'Send'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 4–12. EMBEDDED DASHBOARD ── */}
        <EvidLYDashboard embedded loc={previewLoc} onLocChange={setPreviewLoc} gateToken={token} />
      </div>

      {/* ══════ MOBILE STICKY BOTTOM CTA ══════ */}
      {gateHref && (
        <div className="lg:hidden" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
          background: NAVY, padding: '12px 20px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 -4px 20px rgba(28,42,58,0.3)',
        }}>
          <Link to={gateHref}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: '#B24A2E', color: 'white', borderRadius: 8, fontFamily: SANS, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            See what{'\u2019'}s on file →
          </Link>
        </div>
      )}
    </div>
  );
}
