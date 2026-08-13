/**
 * ClientJoin — the /join/:token prospect page.
 *
 * Shows a SAMPLE EvidLY dashboard (Pacific Restaurant Group, three
 * kitchens, mature data).  The prospect's real record lives on the
 * gate (/gate/:token), not here.
 *
 * Journey: email → sample dashboard (/join) → their record (/gate) → book.
 *
 * NOTE: accept-client-invite and the claim path are intentionally kept
 * in the codebase — they'll be re-used downstream after conversion.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { anonClient } from '../lib/anonClient';
import { EvidLYDashboard } from '../components/join/EvidLYDashboard';

const VIEWED_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-record-viewed`;

/* Design-token aliases */
const SANS  = "'Instrument Sans', system-ui, -apple-system, sans-serif";
const BRAND = "'Montserrat', sans-serif";

const NAVY  = '#1C2A3A';
const CREAM = '#F7F1E6';
const LINE  = '#EEE7D9';
const GOLD  = '#B24A2E';

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

  const viewedRef = useRef(false);

  /* ── Fetch invite ──────────────────────────────────────────── */
  useEffect(() => {
    if (previewOnly) return;
    (async () => {
      if (!token) { setLoadError('Missing invite link.'); setLoading(false); return; }
      const { data, error } = await anonClient
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

  /* ── Derived ───────────────────────────────────────────────── */
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

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: SANS, paddingBottom: 72 }}>
      <EvidLYDashboard embedded gateToken={token} />

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
