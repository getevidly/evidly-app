/**
 * SealedEvidencePanel — what the org can prove, counted.
 *
 * Three pillar rows, always all three, zeros shown. Counts are seals joined to
 * the record they seal, org-scoped, last 12 months. No score, no percentage,
 * no grade — a tally of sealed records and the date of the newest one.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSealedEvidence } from '../../../hooks/useSealedEvidence';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useRole } from '../../../contexts/RoleContext';

const NAVY = '#1E2D4D';
const MUTED = '#6B7F96';
const LINE = 'rgba(30,45,77,0.10)';
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const EMBER = '#B24A2E';

/**
 * Minting an insurance-professional link is a decision-maker act — the same
 * three roles the migration's INSERT policy admits. The button is not
 * rendered for anyone else rather than shown and refused.
 */
const SHARE_ROLES: ReadonlySet<string> = new Set([
  'owner_operator',
  'executive',
  'compliance_manager',
]);

interface ShareLink {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
}

/** 32 bytes of crypto-random, base64url — the sole auth for the public page. */
function mintToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function shareUrl(token: string): string {
  return `${window.location.origin}/share/evidence/${token}`;
}

function formatSealDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SealedEvidencePanel() {
  const { rows, mostRecentSealAt, hasAnySeals, loading, error } = useSealedEvidence();
  const { profile } = useAuth();
  const { userRole } = useRole();

  const orgId = profile?.organization_id;
  const canShare = !!userRole && SHARE_ROLES.has(userRole);

  const [links, setLinks] = useState<ShareLink[]>([]);
  const [minting, setMinting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    if (!orgId || !canShare) return;
    const { data, error: readErr } = await supabase
      .from('sealed_evidence_shares')
      .select('id, token, created_at, expires_at')
      .eq('organization_id', orgId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (readErr) {
      console.error('[SealedEvidencePanel] link read failed:', readErr.message);
      return;
    }
    setLinks((data || []) as ShareLink[]);
  }, [orgId, canShare]);

  useEffect(() => { void loadLinks(); }, [loadLinks]);

  const createLink = async () => {
    if (!orgId || !profile?.id) return;
    setMinting(true);
    setShareError(null);
    const token = mintToken();
    const { error: insErr } = await supabase.from('sealed_evidence_shares').insert({
      organization_id: orgId,
      token,
      created_by: profile.id,
    });
    if (insErr) {
      console.error('[SealedEvidencePanel] link insert failed:', insErr);
      setShareError(insErr.message);
    } else {
      await loadLinks();
    }
    setMinting(false);
  };

  const revokeLink = async (id: string) => {
    const { error: updErr } = await supabase
      .from('sealed_evidence_shares')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);
    if (updErr) {
      console.error('[SealedEvidencePanel] revoke failed:', updErr);
      setShareError(updErr.message);
      return;
    }
    await loadLinks();
  };

  const copyLink = async (link: ShareLink) => {
    try {
      await navigator.clipboard.writeText(shareUrl(link.token));
      setCopiedId(link.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard blocked — the full link is on screen to copy by hand.
    }
  };

  if (loading) {
    return (
      <div>
        <p className="text-[14px] font-semibold mb-3" style={{ color: NAVY }}>Sealed evidence</p>
        <div className="skeleton" style={{ width: '100%', height: 132, borderRadius: 8 }} />
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl" style={{ borderColor: LINE, padding: '16px 18px' }}>
      <p className="text-[14px] font-semibold" style={{ color: NAVY }}>Sealed evidence</p>
      <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>
        Tamper-evident record of documented incidents and verified fixes · Last 12 months
      </p>

      {error ? (
        <p className="text-[12px] mt-3" style={{ color: MUTED }}>
          Sealed evidence could not be loaded — refresh to retry.
        </p>
      ) : (
        <div className="mt-3">
          {rows.map(row => (
            <div
              key={row.key}
              className="flex items-baseline justify-between gap-3 py-2.5"
              style={{ borderTop: `1px solid ${LINE}` }}
            >
              <span className="text-[13px] font-semibold" style={{ color: NAVY }}>{row.label}</span>
              <span className="flex items-baseline gap-4 text-[12px]" style={{ color: MUTED }}>
                <span>
                  Incidents sealed{' '}
                  <span style={{ fontFamily: MONO, color: NAVY, fontWeight: 600 }}>{row.incidents}</span>
                </span>
                <span>
                  Corrective actions sealed{' '}
                  <span style={{ fontFamily: MONO, color: NAVY, fontWeight: 600 }}>{row.correctiveActions}</span>
                </span>
              </span>
            </div>
          ))}

          <p className="text-[11px] pt-3" style={{ color: MUTED, borderTop: `1px solid ${LINE}` }}>
            {hasAnySeals && mostRecentSealAt
              ? `Most recent seal · ${formatSealDate(mostRecentSealAt)}`
              : 'No seals yet — records seal when they close'}
          </p>
        </div>
      )}

      {canShare && (
        <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
          <button
            type="button"
            onClick={createLink}
            disabled={minting}
            className="text-[12px] font-semibold rounded-lg px-4 disabled:opacity-50"
            style={{ background: EMBER, color: '#FFFFFF', minHeight: 40 }}
          >
            {minting ? 'Creating link…' : 'Share with your insurance professional'}
          </button>

          {shareError && (
            <p className="text-[11px] mt-2" style={{ color: EMBER }}>
              Could not update links — {shareError}
            </p>
          )}

          {links.length > 0 && (
            <div className="mt-3">
              {links.map(link => (
                <div key={link.id} className="py-2" style={{ borderTop: `1px solid ${LINE}` }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[11px] break-all"
                      style={{ fontFamily: MONO, color: NAVY }}
                    >
                      {shareUrl(link.token)}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyLink(link)}
                      className="text-[11px] font-semibold rounded-md px-2.5 py-1"
                      style={{ border: `1px solid ${LINE}`, color: NAVY }}
                    >
                      {copiedId === link.id ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeLink(link.id)}
                      className="text-[11px] font-semibold rounded-md px-2.5 py-1"
                      style={{ border: `1px solid ${LINE}`, color: MUTED }}
                    >
                      Revoke
                    </button>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: MUTED }}>
                    Created {formatSealDate(link.created_at)} · Expires {formatSealDate(link.expires_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
