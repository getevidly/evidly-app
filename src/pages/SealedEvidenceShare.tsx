/**
 * SealedEvidenceShare — the carrier-facing page behind a share link.
 *
 * Public and read-only. Everything on it comes from the sealed-evidence-share
 * edge function, which returns counts and hash prefixes only. No record
 * contents reach this page, and there is no score, percentage or grade
 * anywhere — it reports what has been sealed, not how good the kitchen is.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const NAVY = '#1E2D4D';
const CREAM = '#FAF7F0';
const INK = '#3D5068';
const MUTED = '#6B7F96';
const LINE = '#E6E1D3';
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

interface Tally {
  pillar: string;
  label: string;
  incidents_12mo: number;
  corrective_actions_12mo: number;
  incidents_all_time: number;
  corrective_actions_all_time: number;
}

interface RecentSeal {
  sealed_at: string;
  type: string;
  pillar_label: string;
  hash_prefix: string;
}

interface Payload {
  ok: boolean;
  reason?: string;
  org_name?: string;
  location_count?: number;
  created_at?: string;
  expires_at?: string;
  tallies?: Tally[];
  recent_seals?: RecentSeal[];
}

const fmt = (iso: string | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const PRINT_CSS = `
@media print {
  @page { margin: 14mm; }
  body { background: #FFFFFF !important; }
  .no-print { display: none !important; }
  .sheet { box-shadow: none !important; border: none !important; max-width: 100% !important; }
  .avoid-break { break-inside: avoid; page-break-inside: avoid; }
}
`;

export default function SealedEvidenceShare() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Called with no Authorization header on purpose: the function is
        // public (verify_jwt = false) and the token in the URL is the auth.
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sealed-evidence-share` +
            `?token=${encodeURIComponent(token || '')}`,
        );
        const body = (await res.json()) as Payload;
        if (!cancelled) setData(body);
      } catch (err) {
        console.error('[SealedEvidenceShare] fetch failed:', err);
        if (!cancelled) setData({ ok: false, reason: 'lookup_failed' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const header = (
    <div style={{ background: NAVY, padding: '26px 28px' }}>
      <p style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700, letterSpacing: '0.5px' }}>
        EvidLY
      </p>
      <p style={{ margin: '6px 0 0', color: '#FFFFFF', fontSize: 16, fontWeight: 600 }}>
        Sealed evidence summary
      </p>
      {data?.ok && (
        <p style={{ margin: '6px 0 0', color: '#C9D4E4', fontSize: 13 }}>
          {data.org_name} · {data.location_count} location{data.location_count === 1 ? '' : 's'}
          {' · '}Prepared {fmt(data.created_at)} · Link expires {fmt(data.expires_at)}
        </p>
      )}
    </div>
  );

  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '24px 12px' }}>
      <style>{PRINT_CSS}</style>
      <div
        className="sheet"
        style={{
          maxWidth: 720,
          margin: '0 auto',
          background: '#FFFFFF',
          borderRadius: 10,
          overflow: 'hidden',
          border: `1px solid ${LINE}`,
        }}
      >
        {header}

        {loading ? (
          <div style={{ padding: '28px' }}>
            <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>Loading…</p>
          </div>
        ) : !data?.ok ? (
          <div style={{ padding: '28px' }}>
            <p style={{ margin: 0, color: NAVY, fontSize: 14, lineHeight: 1.6 }}>
              This link has expired or been revoked. Ask the kitchen for a current link.
            </p>
          </div>
        ) : (
          <div style={{ padding: '24px 28px 28px' }}>
            <p style={{ margin: 0, color: INK, fontSize: 14, lineHeight: 1.65 }}>
              This kitchen documents incidents and corrective actions in EvidLY and seals each
              record when it closes. A sealed record is locked from edits and carries a
              cryptographic hash of its contents at sealing — the counts below are drawn live
              from those seals.
            </p>

            {/* Tally table */}
            <div className="avoid-break" style={{ marginTop: 22 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontSize: 11, color: MUTED, fontWeight: 600, padding: '0 0 8px' }}>
                      Pillar
                    </th>
                    <th style={{ textAlign: 'right', fontSize: 11, color: MUTED, fontWeight: 600, padding: '0 0 8px' }}>
                      Incidents Sealed
                    </th>
                    <th style={{ textAlign: 'right', fontSize: 11, color: MUTED, fontWeight: 600, padding: '0 0 8px' }}>
                      Corrective Actions Sealed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data.tallies || []).map(t => (
                    <tr key={t.pillar} style={{ borderTop: `1px solid ${LINE}` }}>
                      <td style={{ padding: '10px 0', fontSize: 13, color: NAVY, fontWeight: 600 }}>
                        {t.label}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontSize: 13, color: NAVY, fontFamily: MONO }}>
                        {t.incidents_12mo}
                        <span style={{ color: MUTED, fontSize: 11 }}>
                          {' '}/ {t.incidents_all_time} all time
                        </span>
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontSize: 13, color: NAVY, fontFamily: MONO }}>
                        {t.corrective_actions_12mo}
                        <span style={{ color: MUTED, fontSize: 11 }}>
                          {' '}/ {t.corrective_actions_all_time} all time
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: '8px 0 0', color: MUTED, fontSize: 11 }}>
                Leading figure covers the last 12 months.
              </p>
            </div>

            {/* Most recent seals */}
            <div className="avoid-break" style={{ marginTop: 24 }}>
              <p style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600 }}>Most recent seals</p>
              {(data.recent_seals || []).length === 0 ? (
                <p style={{ margin: '8px 0 0', color: MUTED, fontSize: 13 }}>No seals yet.</p>
              ) : (
                <div style={{ marginTop: 8 }}>
                  {(data.recent_seals || []).map((s, i) => (
                    <div
                      key={i}
                      style={{ padding: '8px 0', borderTop: `1px solid ${LINE}`, fontSize: 13, color: INK }}
                    >
                      {fmt(s.sealed_at)} · {s.type} — {s.pillar_label} ·{' '}
                      <span style={{ fontFamily: MONO, color: MUTED }}>Seal {s.hash_prefix}…</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* What a seal means */}
            <div
              className="avoid-break"
              style={{ marginTop: 24, background: CREAM, borderRadius: 8, padding: '16px 18px' }}
            >
              <p style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600 }}>What a seal means</p>
              <p style={{ margin: '8px 0 0', color: INK, fontSize: 13, lineHeight: 1.65 }}>
                When a record closes, EvidLY writes a cryptographic hash of its contents and locks
                the record from further edits. Any later change to the record would produce a
                different hash, so the seal is evidence that what is on file today is what was
                filed then.
              </p>
              <p style={{ margin: '10px 0 0', color: INK, fontSize: 13, lineHeight: 1.65 }}>
                This is a record of sealed evidence, not a rating. EvidLY does not score, grade, or
                rank kitchens — it makes their documentation available and verifiable.
              </p>
            </div>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${LINE}`, padding: '16px 28px' }}>
          <p style={{ margin: 0, color: MUTED, fontSize: 11, lineHeight: 1.6 }}>
            EvidLY · a Cleaning Pros Plus, LLC company · This link is read-only and was shared by
            the kitchen. Questions: support@getevidly.com
          </p>
        </div>
      </div>
    </div>
  );
}
