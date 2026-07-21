/**
 * ClientJoin — the /join/:token signup page.
 *
 * Ported from the approved SignupScreenMockup. The layout, copy, colors, and
 * structure are byte-for-byte from the mockup. Only four fields are dynamic
 * (from evidly_client_invites): organization_name, contact_name, email, phone.
 *
 * Wiring:
 *   CTA            -> accept-client-invite (creates auth user + profile)
 *   password focus  -> mark-record-viewed  (stamps journey_stages.record_viewed_at)
 *   share panel     -> mailto / clipboard only. No marketing_sends.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Flame, Utensils, CheckCircle2, Zap,
  Eye, ArrowRight, Send, Lock, Shield, Key,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { EvidLYDashboard, LOC_TABS } from '../components/join/EvidLYDashboard';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-client-invite`;
const VIEWED_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-record-viewed`;

/* Design-token aliases — same values as EvidLYDashboard, kept local to avoid
   coupling the page shell to the preview's internal constants. */
const SERIF = "'Spectral', Georgia, serif";
const SANS  = "'Instrument Sans', system-ui, -apple-system, sans-serif";
const MONO  = "'IBM Plex Mono', ui-monospace, monospace";
const BRAND_FONT = "'Montserrat', sans-serif";

const NAVY  = '#1C2A3A';
const CREAM = '#F7F1E6';
const LINE  = '#EEE7D9';
const MUTED = '#5F6875';
const GREEN = '#3E5E4B';
const RED   = '#9E3B32';
const GOLD  = '#A08C5A';
const GOLD_TEXT = '#8A6412';

interface LocationSnapshot {
  org_created_at?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
}

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
  location_snapshot: LocationSnapshot | null;
}

/* ═══════════════════════════════════════════════════════════════ */
export function ClientJoin({ previewOnly = false }: { previewOnly?: boolean }) {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  /* ── State ─────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(!previewOnly);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showShare, setShowShare] = useState(false);
  const [previewLoc, setPreviewLoc] = useState('all');
  const [showPreviewOnMobile, setShowPreviewOnMobile] = useState(false);
  const [showSenderEdit, setShowSenderEdit] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const viewedRef = useRef(false);

  /* ── Fetch invite ──────────────────────────────────────────── */
  useEffect(() => {
    if (previewOnly) return;
    (async () => {
      if (!token) { setLoadError('Missing invite link.'); setLoading(false); return; }
      const { data, error } = await supabase
        .from('evidly_client_invites')
        .select('organization_id, organization_name, business_name, contact_name, email, phone, message, status, expires_at, location_snapshot')
        .eq('token', token)
        .maybeSingle();
      if (error || !data) { setLoadError('This invite link is invalid.'); setLoading(false); return; }
      if (data.status === 'accepted') { setLoadError('This invite has already been used. Please sign in.'); setLoading(false); return; }
      if (data.status !== 'pending') { setLoadError(`This invite is ${data.status}.`); setLoading(false); return; }
      if (new Date(data.expires_at) < new Date()) { setLoadError('This invite has expired.'); setLoading(false); return; }
      setInvite(data as Invite);
      setLoading(false);
    })();
  }, [token, previewOnly]);

  /* ── Password validation ───────────────────────────────────── */
  const rules = {
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const allRules = Object.values(rules).every(Boolean);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = allRules && passwordsMatch && !submitting;

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
      navigate('/onboarding');
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

  /* ── Derived ───────────────────────────────────────────────── */
  const orgLabel = previewOnly ? 'Pacific Restaurant Group' : (invite?.organization_name || invite?.business_name || 'your kitchen');

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
          <div style={{ marginBottom: 12, fontFamily: BRAND_FONT, fontWeight: 800, fontSize: 20 }}>
            <span style={{ color: GOLD }}>E</span><span style={{ color: NAVY }}>vid</span><span style={{ color: GOLD }}>LY</span>
          </div>
          <p style={{ color: NAVY, fontSize: 15, fontFamily: SANS }}>{loadError}</p>
          <button
            onClick={() => navigate('/login')}
            style={{ marginTop: 16, padding: '10px 20px', borderRadius: 9, background: NAVY, color: '#F5EFE4', border: 'none', fontFamily: SANS, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ backgroundColor: CREAM, minHeight: '100vh', fontFamily: SANS }} className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {!previewOnly && invite?.message && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-1.5" style={{ color: GOLD_TEXT }}>
              A note to this kitchen
            </div>
            <div className="text-sm border px-4 py-3" style={{ borderColor: LINE, fontFamily: SANS, color: NAVY, backgroundColor: '#fff' }}>
              {invite.message}
            </div>
          </div>
        )}
        <div className="bg-white shadow-2xl" style={{ borderRadius: 4 }}>

          {/* ============ TOP HEADER — TABS IN HEADER ============ */}
          <div className="border-b" style={{ borderColor: LINE, backgroundColor: NAVY }}>
            <div className="px-8 py-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="font-black tracking-tight text-2xl" style={{ fontFamily: BRAND_FONT, fontWeight: 800 }}>
                  <span style={{ color: GOLD }}>E</span>
                  <span style={{ color: 'white' }}>vid</span>
                  <span style={{ color: GOLD }}>LY</span>
                </div>
                <div className="border-l border-white/20 pl-4 hidden md:block">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Preview what EvidLY looks like</div>
                  <div className="text-[10px] tracking-wide text-white/40 mt-0.5" style={{ fontFamily: MONO }}>A Cleaning Pros Plus Company</div>
                </div>
              </div>

              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1 border border-white/20 overflow-x-auto"
                     style={{ scrollbarWidth: 'none' as const }}>
                  {LOC_TABS.map(([id, label]) => {
                    const a = previewLoc === id;
                    const tabLabel = id === 'all' ? orgLabel : label;
                    return (
                      <button key={id} onClick={() => { setPreviewLoc(id); setShowPreviewOnMobile(true); }}
                        className="text-xs px-3.5 py-2 font-semibold transition whitespace-nowrap"
                        style={{
                          backgroundColor: a ? GOLD : 'transparent',
                          color: a ? 'white' : 'rgba(255,255,255,0.7)',
                          fontFamily: a ? SERIF : 'inherit',
                        }}>
                        {tabLabel}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setShowShare(!showShare)}
                  className="inline-flex items-center gap-1.5 border px-3 py-2 transition"
                  style={{
                    borderColor: showShare ? GOLD : 'rgba(255,255,255,0.2)',
                    backgroundColor: showShare ? GOLD : 'transparent',
                    color: showShare ? 'white' : 'rgba(255,255,255,0.7)',
                  }}
                  title="Forward this invite">
                  <Send size={13} />
                  <span className="text-[10px] uppercase tracking-widest font-semibold hidden sm:inline">Share</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* ============ LEFT NAVY RAIL ============ */}
            <div className="lg:col-span-4 p-8" style={{ backgroundColor: NAVY, color: 'white' }}>
              {!previewOnly && invite?.location_snapshot?.city && (
                <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: GOLD }}>
                  Prepared for {orgLabel} · {[invite.location_snapshot.city, invite.location_snapshot.state].filter(Boolean).join(', ')}
                </div>
              )}
              <h1 className="text-2xl mb-3 leading-tight" style={{ fontFamily: SERIF, fontWeight: 600 }}>
                The Hood Cleaning Certificate<br />is ready for {orgLabel}
              </h1>
              <p className="text-sm text-white/70 mb-8 leading-relaxed">
                You already trust Cleaning Pros Plus with hood cleaning. Those records now live in EvidLY — see what other documents are required to maintain compliance and protect your livelihood.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(160,140,90,0.15)' }}>
                    <Zap size={15} style={{ color: '#D8A93A' }} fill="#D8A93A" />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ fontFamily: SERIF }}>Intelligence</div>
                    <div className="text-xs text-white/60 leading-relaxed">Real-time alerts, predictive reminders, automated escalation, regulation cross-referencing, and sealed proof on demand</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(160,140,90,0.15)' }}>
                    <Flame size={15} style={{ color: '#E8763A' }} fill="#E8763A" />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ fontFamily: SERIF }}>Fire Safety</div>
                    <div className="text-xs text-white/60 leading-relaxed">Hood cleaning (NFPA 96), fire suppression (17A), sprinklers (25), alarms (72), extinguisher tags (10), and employee fire safety training</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(160,140,90,0.15)' }}>
                    <Utensils size={15} style={{ color: '#5B8AAD' }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ fontFamily: SERIF }}>Food Safety</div>
                    <div className="text-xs text-white/60 leading-relaxed">Employee Food Handler Cards, Certified Food Protection Manager certifications, daily temperature logs, HACCP, receiving inspections, pest control, and health inspection history</div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs font-bold mb-0.5" style={{ color: GOLD_TEXT, fontFamily: SERIF }}>Predict</div>
                  <div className="text-[10px] text-white/60">what's expiring</div>
                </div>
                <div>
                  <div className="text-xs font-bold mb-0.5" style={{ color: GOLD_TEXT, fontFamily: SERIF }}>Reduce</div>
                  <div className="text-[10px] text-white/60">the cost</div>
                </div>
                <div>
                  <div className="text-xs font-bold mb-0.5" style={{ color: GOLD_TEXT, fontFamily: SERIF }}>Prove</div>
                  <div className="text-[10px] text-white/60">on demand</div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <h3 className="text-lg mb-2 leading-snug" style={{ fontFamily: SERIF, fontWeight: 600, color: 'white' }}>
                  See the gaps. Let's close them.
                </h3>
                <a
                  href="https://calendly.com/founders-getevidly/founders"
                  target="_blank"
                  rel="noopener"
                  className="w-full text-sm py-3 font-semibold inline-flex items-center justify-center gap-2 mt-2"
                  style={{ backgroundColor: '#E8763A', color: 'white', borderRadius: 9, border: 'none', textDecoration: 'none' }}
                >
                  Schedule a meeting with Arthur →
                </a>
                <div className="text-[11px] text-white/50 mt-2 text-center leading-relaxed">
                  Arthur Haggerty · IKECA-certified · NFPA 96 expert witness.
                </div>
              </div>
            </div>

            {/* ============ RIGHT PANEL ============ */}
            <div className="lg:col-span-8 p-8">
              {/* Inline Share panel */}
              {showShare && !previewOnly && (
                <div className="mb-6 border p-5" style={{ borderColor: LINE, borderLeftWidth: 3, borderLeftColor: GOLD, backgroundColor: '#FBF9F2' }}>
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: GOLD_TEXT }}>Forward this invite</div>
                      <h3 className="text-lg font-bold" style={{ color: NAVY, fontFamily: SERIF }}>Share with a kitchen decision maker or facility manager</h3>
                      <p className="text-xs mt-1" style={{ color: MUTED }}>They'll see the same preview and get their own invite to view records.</p>
                    </div>
                    <button onClick={() => setShowShare(false)}
                      className="text-[10px] uppercase tracking-widest font-semibold flex-shrink-0" style={{ color: MUTED }}>
                      {'\u2715'} Close
                    </button>
                  </div>

                  <div className="mb-4 pb-4 border-b" style={{ borderColor: LINE }}>
                    <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                      <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: MUTED }}>Sending as · auto-populated from your account</div>
                      <button onClick={() => setShowSenderEdit(!showSenderEdit)}
                        className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: NAVY }}>
                        {showSenderEdit ? '\u2715 Cancel' : 'Edit \u2192'}
                      </button>
                    </div>

                    {!showSenderEdit ? (
                      <div>
                        <div className="text-sm font-bold" style={{ color: NAVY, fontFamily: SERIF }}>{invite!.contact_name} · {orgLabel}</div>
                        <div className="text-[11px]" style={{ color: MUTED }}>{invite!.phone ? `${invite!.phone} · ` : ''}{invite!.email}</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: NAVY }}>Your name</label>
                          <input type="text" className="w-full text-sm border px-3 py-2.5" style={{ borderColor: LINE }} defaultValue={invite!.contact_name} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: NAVY }}>Your restaurant</label>
                          <input type="text" className="w-full text-sm border px-3 py-2.5" style={{ borderColor: LINE }} defaultValue={orgLabel} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: NAVY }}>Your phone</label>
                          <input type="tel" className="w-full text-sm border px-3 py-2.5" style={{ borderColor: LINE }} defaultValue={invite!.phone || ''} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: NAVY }}>Your email</label>
                          <input type="email" className="w-full text-sm border px-3 py-2.5" style={{ borderColor: LINE }} defaultValue={invite!.email} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold" style={{ color: NAVY }}>Your message</label>
                      <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: GOLD_TEXT }}>Edit to make it yours</span>
                    </div>
                    <textarea className="w-full text-sm border px-3 py-2.5" style={{ borderColor: LINE, minHeight: 120, resize: 'vertical' as const }}
                      defaultValue={`Hi,

Arthur at EvidLY just set my kitchen up — hood cleaning records from Cleaning Pros Plus, health inspections, fire suppression, food safety, all in one place. It catches what I'd miss and knows what's coming next. Thought you'd want to see it firsthand.

Reach EvidLY: founders@getevidly.com · (855) 384-3591 ext. 1`} />
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const orgLbl = orgLabel;
                          const subject = encodeURIComponent(`View your records on EvidLY — ${orgLbl}`);
                          const body = encodeURIComponent(
                            `I'm sharing this so you can preview what EvidLY looks like for ${orgLbl}.\n\n` +
                            `Open this link to see what's already set up:\n${window.location.href}\n\n` +
                            `You'll get your own invite to view records.`
                          );
                          window.location.href = `mailto:?subject=${subject}&body=${body}`;
                        }}
                        className="text-sm px-4 py-2 font-semibold inline-flex items-center gap-2"
                        style={{ backgroundColor: NAVY, color: 'white' }}>
                        <Send size={13} /> Send now
                      </button>
                      <button onClick={() => setShowShare(false)} className="text-sm font-semibold" style={{ color: MUTED }}>
                        Cancel
                      </button>
                    </div>
                    <div className="text-[11px]" style={{ color: MUTED }}>
                      Sent from EvidLY on your behalf. We track opens to credit you.
                    </div>
                  </div>
                </div>
              )}

              {/* Share panel — preview-only mode (simplified) */}
              {showShare && previewOnly && (
                <div className="mb-6 border p-5" style={{ borderColor: LINE, borderLeftWidth: 3, borderLeftColor: GOLD, backgroundColor: '#FBF9F2' }}>
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: GOLD_TEXT }}>Share this preview</div>
                      <h3 className="text-lg font-bold" style={{ color: NAVY, fontFamily: SERIF }}>Send to a kitchen decision maker or facility manager</h3>
                      <p className="text-xs mt-1" style={{ color: MUTED }}>They'll see the same preview you're looking at now.</p>
                    </div>
                    <button onClick={() => setShowShare(false)}
                      className="text-[10px] uppercase tracking-widest font-semibold flex-shrink-0" style={{ color: MUTED }}>
                      {'\u2715'} Close
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const subject = encodeURIComponent('See what EvidLY looks like — Pacific Restaurant Group');
                        const body = encodeURIComponent(
                          'I wanted to share this EvidLY dashboard preview with you.\n\n' +
                          'Open this link to see what it looks like:\n' + window.location.href + '\n\n' +
                          'It tracks fire safety, food safety, and compliance \u2014 all in one place.'
                        );
                        window.location.href = `mailto:?subject=${subject}&body=${body}`;
                      }}
                      className="text-sm px-4 py-2 font-semibold inline-flex items-center gap-2"
                      style={{ backgroundColor: NAVY, color: 'white' }}>
                      <Send size={13} /> Send via email
                    </button>
                    <button onClick={() => setShowShare(false)} className="text-sm font-semibold" style={{ color: MUTED }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile-only: expand button */}
              {!showPreviewOnMobile && (
                <button onClick={() => setShowPreviewOnMobile(true)}
                  className="md:hidden w-full text-sm py-3 mb-4 border font-semibold inline-flex items-center justify-center gap-2"
                  style={{ borderColor: LINE, color: NAVY, backgroundColor: '#FBF9F2' }}>
                  <span style={{ color: GOLD_TEXT }}>{'\u2605'}</span> See what EvidLY looks like <ArrowRight size={13} />
                </button>
              )}

              {/* Preview area */}
              <div className={`mb-8 p-4 border ${showPreviewOnMobile ? 'block' : 'hidden md:block'}`} style={{ borderColor: LINE, backgroundColor: '#FBF9F2' }}>
                {showPreviewOnMobile && (
                  <div className="md:hidden mb-3 pb-3 border-b flex items-center justify-between" style={{ borderColor: LINE }}>
                    <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: NAVY }}>Preview · {LOC_TABS.find(([id]) => id === previewLoc)?.[1]}</span>
                    <button onClick={() => setShowPreviewOnMobile(false)}
                      className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: MUTED }}>
                      Hide
                    </button>
                  </div>
                )}
                <div style={{ border: `1px solid ${LINE}`, background: '#F7F1E6' }}>
                  <EvidLYDashboard embedded loc={previewLoc} onLocChange={setPreviewLoc} />
                </div>
              </div>

              {/* ============ CLOSING CTA — Schedule a meeting ============ */}
              <div className="mb-8 p-6" style={{ backgroundColor: NAVY, borderRadius: 4 }}>
                <h3 className="text-xl mb-2 leading-snug" style={{ fontFamily: SERIF, fontWeight: 600, color: 'white' }}>
                  See the gaps. Let's close them.
                </h3>
                <a
                  href="https://calendly.com/founders-getevidly/founders"
                  target="_blank"
                  rel="noopener"
                  className="w-full text-base py-3 font-semibold inline-flex items-center justify-center gap-2 mt-3"
                  style={{ backgroundColor: '#E8763A', color: 'white', borderRadius: 9, border: 'none', textDecoration: 'none' }}
                >
                  Schedule a meeting with Arthur →
                </a>
                <div className="text-[11px] mt-2 text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Arthur Haggerty · IKECA-certified · NFPA 96 expert witness.
                </div>
              </div>

              {!previewOnly && (<>
              {/* View Account section */}
              <div className="mb-5">
                <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-1" style={{ color: GOLD_TEXT }}>
                  Access your records
                </div>
                <h2 className="text-2xl mb-1" style={{ color: NAVY, fontFamily: SERIF, fontWeight: 600 }}>View Account</h2>
                <p className="text-xs" style={{ color: MUTED }}>Your Cleaning Pros Plus hood cleaning record is ready to view. Set a password to open your account.</p>
              </div>

              {/* Pre-populated account details (readonly) */}
              <div className="mb-6 border p-5" style={{ borderColor: LINE, backgroundColor: '#FBF9F2' }}>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 size={13} style={{ color: GREEN }} />
                  <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: GREEN }}>Set up for you</span>
                </div>

                {/* Owner & Business */}
                <div className="mb-4">
                  <div className="text-[10px] uppercase font-semibold mb-2 pb-1 border-b" style={{ color: GOLD_TEXT, letterSpacing: '0.15em', borderColor: LINE }}>Owner & Business</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Owner name</div>
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>{invite!.contact_name}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Business name</div>
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>{orgLabel}</div>
                    </div>
                    {invite!.location_snapshot?.org_created_at && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Account created</div>
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>
                          {new Date(invite!.location_snapshot.org_created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact */}
                <div className="mb-4">
                  <div className="text-[10px] uppercase font-semibold mb-2 pb-1 border-b" style={{ color: GOLD_TEXT, letterSpacing: '0.15em', borderColor: LINE }}>Contact</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Primary email</div>
                      <div className="text-sm font-semibold" style={{ color: NAVY }}>{invite!.email}</div>
                    </div>
                    {invite!.phone && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Business phone</div>
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>{invite!.phone}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location — only shown if snapshot has address data */}
                {invite!.location_snapshot?.address && (
                  <div>
                    <div className="text-[10px] uppercase font-semibold mb-2 pb-1 border-b" style={{ color: GOLD_TEXT, letterSpacing: '0.15em', borderColor: LINE }}>Location</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>Address</div>
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>{invite!.location_snapshot.address}</div>
                      </div>
                      {(invite!.location_snapshot.city || invite!.location_snapshot.state || invite!.location_snapshot.zip) && (
                        <div>
                          <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>City · State · ZIP</div>
                          <div className="text-sm font-semibold" style={{ color: NAVY }}>
                            {[invite!.location_snapshot.city, invite!.location_snapshot.state, invite!.location_snapshot.zip].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      )}
                      {invite!.location_snapshot.county && (
                        <div>
                          <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>County</div>
                          <div className="text-sm font-semibold" style={{ color: NAVY }}>{invite!.location_snapshot.county}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t text-[11px]" style={{ borderColor: LINE, color: MUTED }}>
                  Something not right? <a href={`mailto:arthur@getevidly.com?subject=${encodeURIComponent(orgLabel + ' account correction')}`} className="font-semibold underline" style={{ color: NAVY }}>Message Arthur</a> — he set this up personally.
                </div>
              </div>

              {/* Set your access */}
              <div className="mb-6 border p-5" style={{ borderColor: LINE, borderLeftWidth: 3, borderLeftColor: GOLD }}>
                <div className="flex items-center gap-2 mb-4">
                  <Key size={13} style={{ color: GOLD_TEXT }} />
                  <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: NAVY }}>Set your access</span>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-semibold block mb-1" style={{ color: NAVY }}>Create a password</label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                    <input type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={handlePasswordFocus}
                      className="w-full text-sm border pl-9 pr-9 py-2.5" style={{ borderColor: LINE }}
                      placeholder="Enter password" />
                    <Eye size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px]">
                    <div className="inline-flex items-center gap-1" style={{ color: rules.length ? GREEN : MUTED }}>
                      <CheckCircle2 size={11} /> 12+ characters
                    </div>
                    <div className="inline-flex items-center gap-1" style={{ color: rules.upper ? GREEN : MUTED }}>
                      <CheckCircle2 size={11} /> Uppercase
                    </div>
                    <div className="inline-flex items-center gap-1" style={{ color: rules.lower ? GREEN : MUTED }}>
                      <CheckCircle2 size={11} /> Lowercase
                    </div>
                    <div className="inline-flex items-center gap-1" style={{ color: rules.number ? GREEN : MUTED }}>
                      <CheckCircle2 size={11} /> Number
                    </div>
                    <div className="inline-flex items-center gap-1" style={{ color: rules.special ? GREEN : MUTED }}>
                      <CheckCircle2 size={11} /> Special character
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="text-xs font-semibold block mb-1" style={{ color: NAVY }}>Confirm password</label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                    <input type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full text-sm border pl-9 pr-9 py-2.5" style={{ borderColor: LINE }}
                      placeholder="Re-enter password" />
                    {passwordsMatch && (
                      <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: GREEN }} />
                    )}
                  </div>
                  {passwordsMatch && (
                    <div className="text-[11px] mt-1.5 inline-flex items-center gap-1" style={{ color: GREEN }}>
                      <CheckCircle2 size={11} /> Passwords match
                    </div>
                  )}
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <div className="text-[11px] mt-1.5" style={{ color: RED }}>
                      Passwords don't match yet
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t text-[11px] inline-flex items-start gap-2" style={{ borderColor: LINE, color: MUTED }}>
                  <Shield size={11} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span><strong style={{ color: NAVY }}>Two-factor authentication coming soon.</strong> We'll notify you when it's ready — an extra layer of protection for your compliance records.</span>
                </div>
              </div>

              {/* 60 days FREE callout */}
              <div className="border p-4 mb-3" style={{ borderColor: LINE, borderLeftWidth: 3, borderLeftColor: GREEN, backgroundColor: '#F0F4EF' }}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 font-bold" style={{ backgroundColor: GREEN, color: 'white', fontFamily: MONO }}>
                    No credit card needed
                  </span>
                  <div className="flex-1 text-xs" style={{ color: NAVY }}>
                    <div className="font-bold mb-0.5" style={{ fontFamily: SERIF }}>Set a password. View your records.</div>
                    <div style={{ color: MUTED }}>No card to see what's already yours. One is only needed when you begin — and nothing is charged for 60 days.</div>
                  </div>
                </div>
              </div>

              {/* Primary CTA */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full text-base py-3 font-semibold inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: canSubmit ? NAVY : `${NAVY}40`, color: 'white', cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
                {submitting ? 'Viewing records…' : <>View My Records <ArrowRight size={15} /></>}
              </button>
              <div className="text-center text-[11px] mt-2" style={{ color: MUTED }}>
                {'\u2192'} Your Cleaning Pros Plus hood cleaning record
              </div>
              </>)}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
