/**
 * SealedEvidencePanel — what the org can prove, counted.
 *
 * Three pillar rows, always all three, zeros shown. Counts are seals joined to
 * the record they seal, org-scoped, last 12 months. No score, no percentage,
 * no grade — a tally of sealed records and the date of the newest one.
 */

import { useSealedEvidence } from '../../../hooks/useSealedEvidence';

const NAVY = '#1E2D4D';
const MUTED = '#6B7F96';
const LINE = 'rgba(30,45,77,0.10)';
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

function formatSealDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SealedEvidencePanel() {
  const { rows, mostRecentSealAt, hasAnySeals, loading, error } = useSealedEvidence();

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
    </div>
  );
}
