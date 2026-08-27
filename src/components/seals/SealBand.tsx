/**
 * SealBand — the evidentiary seal banner shown on a sealed record.
 *
 * One band, two callers: a sealed incident (IncidentLog) and a sealed
 * corrective action (CorrectiveActionDetail). Everything that differs between
 * them arrives as the `contents` prop, so the band itself makes no assumptions
 * about what was sealed.
 *
 * The full SHA-256 is the thing an auditor actually checks, so the truncated
 * form is a disclosure control rather than a hard limit — tapping the hash
 * reveals all 64 characters, selectable, in monospace.
 */

import { useState } from 'react';
import { ShieldCheck, ChevronDown } from 'lucide-react';

const NAVY = '#1E2D4D';
const NAVY_DEEP = '#162340';
const EMBER = '#B24A2E';
const CREAM = '#FAF7F0';
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

interface SealBandProps {
  /** 64-char hex SHA-256 from the seal row. */
  contentHash: string;
  /** ISO timestamp as stored in the seal (already canonical to the second). */
  sealedAt: string;
  /** Resolved display name of the sealer — callers pass their own lookup. */
  sealedByName: string;
  /**
   * What this seal covers, in the caller's own words.
   * e.g. "Incident record · 6 timeline entries · 3 photos, hashed"
   */
  contents: string;
}

/** "a1b2c3d4…9f8e7d6c" — first 8 and last 8 of the hash. */
function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

/** "12 Aug 2026, 14:30 UTC" from the stored timestamp. */
function formatSealedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hh}:${mm} UTC`;
}

export function SealBand({ contentHash, sealedAt, sealedByName, contents }: SealBandProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: NAVY, boxShadow: '0 2px 12px rgba(11,22,40,0.18)' }}
      data-testid="seal-band"
    >
      <div className="p-4 sm:p-5">
        {/* Title row */}
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" style={{ color: EMBER }} aria-hidden="true" />
          <span className="text-[15px] font-semibold" style={{ color: '#FFFFFF' }}>
            Sealed evidence record
          </span>
          <span
            className="inline-block rounded-full"
            style={{ width: 7, height: 7, backgroundColor: EMBER }}
            aria-hidden="true"
          />
        </div>

        {/* Hash — truncated, expandable to the full 64 characters */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide the full SHA-256 hash' : 'Show the full SHA-256 hash'}
          className="mt-3 w-full text-left rounded-lg px-3 py-2 flex items-start gap-2"
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', minHeight: 44 }}
        >
          <span className="flex-1 min-w-0">
            <span
              className="block text-[10px] tracking-[0.14em]"
              style={{ color: 'rgba(255,255,255,0.55)', fontFamily: MONO }}
            >
              SHA-256
            </span>
            <span
              className="block text-[12.5px] leading-relaxed"
              style={{
                color: CREAM,
                fontFamily: MONO,
                wordBreak: expanded ? 'break-all' : 'normal',
                userSelect: 'text',
              }}
            >
              {expanded ? contentHash : truncateHash(contentHash)}
            </span>
          </span>
          <ChevronDown
            className="h-4 w-4 shrink-0 mt-3"
            style={{
              color: 'rgba(255,255,255,0.55)',
              transform: expanded ? 'rotate(180deg)' : 'none',
            }}
            aria-hidden="true"
          />
        </button>

        {/* Attribution */}
        <p className="mt-3 text-[13px]" style={{ color: 'rgba(255,255,255,0.88)' }}>
          Sealed {formatSealedAt(sealedAt)} · by {sealedByName}
        </p>

        {/* What the hash covers */}
        <p className="mt-1 text-[12.5px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
          {contents}
        </p>
      </div>

      {/* Write-once terms */}
      <div className="px-4 sm:px-5 py-3" style={{ backgroundColor: NAVY_DEEP }}>
        <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
          This record cannot be edited or deleted — a correction issues a superseding
          record; the original stays.
        </p>
      </div>
    </div>
  );
}
