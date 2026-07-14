/**
 * ClientJoin — the /join/:token signup page.
 *
 * This is NOT an acquisition form. The account already exists.
 * An admin created it, the admin sent an invite, and the user
 * lands here to set a password and view their records.
 *
 * Every account field is pre-populated and read-only.
 * The only editable region is the password.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Check, X, Share2,
  ChevronDown, ChevronUp, Copy, Mail,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { FONT, SURFACE, TEXT, LINE, TONE, BRAND } from '../design/tokens';
import { EvidLYDashboard } from '../components/join/EvidLYDashboard';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-client-invite`;
const VIEWED_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-record-viewed`;

/* Preview location tabs — simulated (sanctioned demo exception) */
const PREVIEW_LOCATIONS = [
  { id: 'all', name: null },     // uses org name at render time
  { id: 'loc1', name: 'Vista Grill' },
  { id: 'loc2', name: 'Harbor House' },
  { id: 'loc3', name: 'The Anchor Room' },
];

interface Invite {
  organization_id: string;
  organization_name: string | null;
  business_name: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  status: string;
  expires_at: string;
}

/* ── Wordmark: E-gold · vid-contextual · LY-gold ─────────────── */
function Wordmark({ onDark = false }: { onDark?: boolean }) {
  const midColor = onDark ? TEXT.onDark : TEXT.ink;
  return (
    <span style={{
      fontSize: 20, fontWeight: 800, letterSpacing: 0.5,
      fontFamily: "'Montserrat', sans-serif",
    }}>
      <span style={{ color: BRAND.gold }}>E</span>
      <span style={{ color: midColor }}>vid</span>
      <span style={{ color: BRAND.gold }}>LY</span>
    </span>
  );
}

/* ── Password requirement indicator ───────────────────────────── */
function Req({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 11.5, fontFamily: FONT.body,
      color: ok ? TONE.sage.text : TEXT.muted,
    }}>
      {ok ? <Check size={13} /> : <X size={13} />} {label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export function ClientJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  /* ── State ─────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [previewLoc, setPreviewLoc] = useState('all');
  const [shareOpen, setShareOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);

  // record_viewed_at — fire once on password focus (interactive signal,
  // not page load, to avoid false positives from email scanners).
  // Requires server-side journey_stages integration — stubbed for now.
  const viewedRef = useRef(false);

  /* ── Fetch invite ──────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      if (!token) { setLoadError('Missing invite link.'); setLoading(false); return; }
      const { data, error } = await supabase
        .from('evidly_client_invites')
        .select('organization_id, organization_name, business_name, contact_name, email, phone, status, expires_at')
        .eq('token', token)
        .maybeSingle();
      if (error || !data) { setLoadError('This invite link is invalid.'); setLoading(false); return; }
      if (data.status === 'accepted') { setLoadError('This invite has already been used. Please sign in.'); setLoading(false); return; }
      if (data.status !== 'pending') { setLoadError(`This invite is ${data.status}.`); setLoading(false); return; }
      if (new Date(data.expires_at) < new Date()) { setLoadError('This invite has expired.'); setLoading(false); return; }
      setInvite(data as Invite);
      setLoading(false);
    })();
  }, [token]);

  /* ── Password validation ───────────────────────────────────── */
  const reqs = {
    len: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    num: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const pwValid = Object.values(reqs).every(Boolean);
  const canSubmit = pwValid && password === confirm && !submitting;

  /* ── Submit ────────────────────────────────────────────────── */
  async function handleSubmit() {
    if (!canSubmit || !invite) return;
    setSubmitting(true);
    try {
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token, password }),
      });
      const out = await res.json();
      if (!res.ok) { toast.error(out.error || 'Could not complete signup.'); setSubmitting(false); return; }
      const { error: signInErr } = await signIn(invite.email, password);
      if (signInErr) { toast.success('Account created. Please sign in.'); navigate('/login'); return; }
      toast.success('Welcome to EvidLY!');
      navigate('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  function handlePasswordFocus() {
    if (viewedRef.current) return;
    viewedRef.current = true;
    fetch(VIEWED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token }),
    }).catch(() => { /* best-effort — don't block the signup */ });
  }

  /* ── Share helpers ─────────────────────────────────────────── */
  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  function handleShareEmail() {
    const orgLabel = invite?.organization_name || invite?.business_name || 'our kitchen';
    const subject = encodeURIComponent(`View your records on EvidLY — ${orgLabel}`);
    const body = encodeURIComponent(
      `I'm sharing this so you can preview what EvidLY looks like for ${orgLabel}.\n\n` +
      `Open this link to see what's already set up:\n${window.location.href}\n\n` +
      `You'll get your own invite to view records.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  /* ── Derived ───────────────────────────────────────────────── */
  const orgLabel = invite?.organization_name || invite?.business_name || 'your kitchen';

  /* ── Loading ───────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: SURFACE.page,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: TEXT.ink, fontFamily: FONT.body, fontSize: 15 }}>Loading…</span>
      </div>
    );
  }

  /* ── Error ──────────────────────────────────────────────────── */
  if (loadError) {
    return (
      <div style={{
        minHeight: '100vh', background: SURFACE.page,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div style={{
          maxWidth: 420, width: '100%', background: SURFACE.paper,
          borderRadius: 12, border: `1px solid ${LINE.soft}`, padding: 28, textAlign: 'center',
        }}>
          <div style={{ marginBottom: 12 }}><Wordmark /></div>
          <p style={{ color: TEXT.ink, fontSize: 15, fontFamily: FONT.body }}>{loadError}</p>
          <button
            onClick={() => navigate('/login')}
            style={{
              marginTop: 16, padding: '10px 20px', borderRadius: 9,
              background: TEXT.ink, color: TEXT.onDark, border: 'none',
              fontFamily: FONT.body, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: SURFACE.page }}>

      {/* ═══ HEADER — dark navy bar ═══ */}
      <header style={{ background: TEXT.ink, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          {/* Top row: wordmark + eyebrow + share */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 0 0', flexWrap: 'wrap', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Wordmark onDark />
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.2em',
                textTransform: 'uppercase' as const, color: TEXT.onDark,
                opacity: 0.7, fontFamily: FONT.mono,
              }}>
                PREVIEW WHAT EVIDLY LOOKS LIKE
              </span>
            </div>
            <button
              onClick={() => setShareOpen(!shareOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 6,
                background: 'transparent', border: `1px solid ${TEXT.onDark}40`,
                color: TEXT.onDark, fontSize: 12, fontWeight: 600,
                fontFamily: FONT.body, cursor: 'pointer',
                letterSpacing: '0.1em', textTransform: 'uppercase' as const,
              }}
            >
              <Share2 size={13} /> SHARE
            </button>
          </div>

          {/* Location tabs */}
          <nav style={{
            display: 'flex', overflowX: 'auto',
            WebkitOverflowScrolling: 'touch', paddingTop: 8,
            scrollbarWidth: 'none',
          }}>
            {PREVIEW_LOCATIONS.map(loc => {
              const label = loc.id === 'all' ? orgLabel : loc.name;
              const active = previewLoc === loc.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => setPreviewLoc(loc.id)}
                  style={{
                    padding: '10px 16px', whiteSpace: 'nowrap' as const,
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    color: active ? TEXT.onDark : `${TEXT.onDark}80`,
                    background: 'transparent', border: 'none',
                    borderBottom: active ? `2px solid ${BRAND.gold}` : '2px solid transparent',
                    fontFamily: FONT.body, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ═══ SHARE PANEL (inline, toggled) ═══ */}
      {shareOpen && (
        <div style={{
          background: SURFACE.paper, borderBottom: `1px solid ${LINE.soft}`, padding: '24px 0',
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase' as const, color: TONE.amber.text,
              fontFamily: FONT.mono, marginBottom: 6,
            }}>
              FORWARD THIS INVITE
            </div>
            <h3 style={{
              fontSize: 20, fontWeight: 500, color: TEXT.ink,
              fontFamily: FONT.display, margin: '0 0 6px',
            }}>
              Share with a kitchen decision maker or facility manager
            </h3>
            <p style={{
              fontSize: 14, color: TEXT.body, fontFamily: FONT.body, margin: '0 0 20px',
            }}>
              They'll see the same preview and get their own invite to view records.
            </p>

            {/* Sender info */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.15em',
                textTransform: 'uppercase' as const, color: TEXT.label,
                fontFamily: FONT.mono, marginBottom: 6,
              }}>
                SENDING AS · AUTO-POPULATED FROM YOUR ACCOUNT
              </div>
              <div style={{
                padding: '12px 16px', background: SURFACE.raised, borderRadius: 8,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT.ink, fontFamily: FONT.body }}>
                  {invite!.contact_name}
                </div>
                <div style={{ fontSize: 12, color: TEXT.muted, fontFamily: FONT.body }}>
                  {orgLabel}
                </div>
              </div>
            </div>

            {/* Share actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handleShareEmail}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 8,
                  border: `1px solid ${LINE.strong}`, background: SURFACE.paper,
                  color: TEXT.ink, fontSize: 13, fontWeight: 500,
                  fontFamily: FONT.body, cursor: 'pointer',
                }}
              >
                <Mail size={15} /> Share via email
              </button>
              <button
                onClick={handleCopyLink}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 8,
                  border: `1px solid ${LINE.strong}`, background: SURFACE.paper,
                  color: TEXT.ink, fontSize: 13, fontWeight: 500,
                  fontFamily: FONT.body, cursor: 'pointer',
                }}
              >
                <Copy size={15} /> {linkCopied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* ─── HERO ─── */}
        <section style={{ padding: '40px 0 24px' }}>
          <h1 style={{
            fontSize: 32, fontWeight: 400, color: TEXT.ink,
            fontFamily: FONT.display, margin: 0, lineHeight: 1.25,
          }}>
            Everything's ready for{' '}
            <strong style={{ fontWeight: 600 }}>{orgLabel}</strong>
          </h1>
        </section>

        {/* ─── PREVIEW (collapsible on mobile) ─── */}
        <section style={{ marginBottom: 40 }}>
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className="md:hidden"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '12px 0', background: 'transparent', border: 'none',
              color: TEXT.ink, fontSize: 14, fontWeight: 600,
              fontFamily: FONT.body, cursor: 'pointer',
            }}
          >
            {previewOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {previewOpen ? 'Hide preview' : 'Show preview'}
          </button>
          <div className={previewOpen ? '' : 'hidden md:block'}>
            <EvidLYDashboard embedded loc={previewLoc} orgName={orgLabel} />
          </div>
        </section>

        {/* ─── ACCOUNT DETAILS (read-only) ─── */}
        <section style={{
          background: SURFACE.paper, borderRadius: 12,
          border: `1px solid ${LINE.soft}`, padding: '28px 24px', marginBottom: 24,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase' as const, color: TEXT.label,
            fontFamily: FONT.mono, marginBottom: 20,
          }}>
            YOUR ACCOUNT
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Owner & Business */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: TEXT.meta, fontFamily: FONT.mono,
                textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6,
              }}>
                Owner &amp; Business
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: TEXT.ink, fontFamily: FONT.body }}>
                {invite!.contact_name}
              </div>
              <div style={{ fontSize: 13, color: TEXT.body, fontFamily: FONT.body }}>
                {invite!.business_name || invite!.organization_name || ''}
              </div>
            </div>
            {/* Contact */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: TEXT.meta, fontFamily: FONT.mono,
                textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6,
              }}>
                Contact
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: TEXT.ink, fontFamily: FONT.body }}>
                {invite!.email}
              </div>
              {invite!.phone && (
                <div style={{ fontSize: 13, color: TEXT.body, fontFamily: FONT.body }}>
                  {invite!.phone}
                </div>
              )}
            </div>
            {/* Location */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: TEXT.meta, fontFamily: FONT.mono,
                textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6,
              }}>
                Location
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: TEXT.ink, fontFamily: FONT.body }}>
                {orgLabel}
              </div>
              <div style={{ fontSize: 13, color: TEXT.body, fontFamily: FONT.body }}>
                Your locations are set up and waiting inside.
              </div>
            </div>
          </div>
        </section>

        {/* ─── SET YOUR ACCESS ─── */}
        <section style={{
          background: SURFACE.paper, borderRadius: 12,
          border: `1px solid ${LINE.soft}`, padding: '28px 24px', marginBottom: 24,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase' as const, color: TEXT.label,
            fontFamily: FONT.mono, marginBottom: 4,
          }}>
            SET YOUR ACCESS
          </div>
          <p style={{ fontSize: 13, color: TEXT.muted, fontFamily: FONT.body, margin: '0 0 20px' }}>
            Choose a password to sign in to your account.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password */}
            <div>
              <label style={{
                fontSize: 11, fontWeight: 600, color: TEXT.label,
                fontFamily: FONT.mono, display: 'block', marginBottom: 4,
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={handlePasswordFocus}
                  style={{
                    width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8,
                    border: `1px solid ${LINE.soft}`, fontSize: 14, fontFamily: FONT.body,
                    outline: 'none', boxSizing: 'border-box' as const, color: TEXT.ink,
                    background: SURFACE.paper,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: TEXT.muted, padding: 4,
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '3px 14px', marginTop: 8,
              }}>
                <Req ok={reqs.len} label="12+ characters" />
                <Req ok={reqs.upper} label="Uppercase" />
                <Req ok={reqs.lower} label="Lowercase" />
                <Req ok={reqs.num} label="Number" />
                <Req ok={reqs.special} label="Special character" />
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label style={{
                fontSize: 11, fontWeight: 600, color: TEXT.label,
                fontFamily: FONT.mono, display: 'block', marginBottom: 4,
              }}>
                Confirm password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8,
                    border: `1px solid ${confirm && confirm !== password ? TONE.red.fill : LINE.soft}`,
                    fontSize: 14, fontFamily: FONT.body,
                    outline: 'none', boxSizing: 'border-box' as const, color: TEXT.ink,
                    background: SURFACE.paper,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: TEXT.muted, padding: 4,
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirm && confirm !== password && (
                <p style={{ fontSize: 12, color: TONE.red.text, fontFamily: FONT.body, margin: '6px 0 0' }}>
                  Passwords don't match
                </p>
              )}

              {/* MFA note */}
              <div style={{
                marginTop: 16, padding: '10px 14px',
                background: SURFACE.raised, borderRadius: 8,
              }}>
                <span style={{ fontSize: 11, color: TEXT.meta, fontFamily: FONT.mono }}>
                  Multi-factor authentication — coming soon
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CALLOUT ─── */}
        <section style={{
          background: SURFACE.paper, borderRadius: 12,
          border: `1px solid ${LINE.soft}`, padding: '28px 24px',
          marginBottom: 24, textAlign: 'center',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
            textTransform: 'uppercase' as const,
            color: TONE.amber.text, fontFamily: FONT.mono, marginBottom: 8,
          }}>
            NO CREDIT CARD NEEDED
          </div>
          <h3 style={{
            fontSize: 20, fontWeight: 500, color: TEXT.ink,
            fontFamily: FONT.display, margin: '0 0 8px',
          }}>
            Set a password. View your records.
          </h3>
          <p style={{
            fontSize: 14, color: TEXT.body, fontFamily: FONT.body,
            margin: 0, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto',
          }}>
            No card to see what's already yours. One is only needed when you begin
            — and nothing is charged for 60 days.
          </p>
        </section>

        {/* ─── PRIMARY CTA ─── */}
        <div style={{ textAlign: 'center', paddingBottom: 40 }}>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '16px 48px', borderRadius: 10,
              background: canSubmit ? TEXT.ink : `${TEXT.ink}40`,
              color: TEXT.onDark, border: 'none',
              fontSize: 16, fontWeight: 600, fontFamily: FONT.body,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'opacity 0.15s', letterSpacing: '0.02em',
            }}
          >
            {submitting ? 'Opening your account…' : 'Set password and view records'}
          </button>
        </div>
      </main>
    </div>
  );
}
