import { ClipboardList } from 'lucide-react';
import { colors, prp } from '../../lib/designSystem';

const PRP_TILES = [
  {
    eyebrow: 'PREDICT',
    color: prp.predict.accent,
    body: 'Identifies which checks are due, which are at risk of being missed, and which routines are falling behind.',
  },
  {
    eyebrow: 'REDUCE',
    color: prp.reduce.accent,
    body: 'Failed items get linked corrective actions and citation references. No missed items become inspection violations.',
  },
  {
    eyebrow: 'PROVE',
    color: prp.prove.accent,
    body: 'Every completion has a signature, timestamp, and primary-source citation. Inspector-ready proof at a moment\u2019s notice.',
  },
] as const;

interface ChecklistsEmptyStateProps {
  onBrowseLibrary: () => void;
}

export function ChecklistsEmptyState({ onBrowseLibrary }: ChecklistsEmptyStateProps) {
  return (
    <div
      className="rounded-xl flex flex-col items-center text-center py-14 px-6"
      style={{ backgroundColor: colors.cream, border: `2px dashed ${colors.border}` }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center mb-4"
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          backgroundColor: colors.infoSoft,
        }}
      >
        <ClipboardList style={{ color: colors.navy, width: 38, height: 38 }} />
      </div>

      {/* Heading */}
      <h3
        className="text-[22px] font-bold tracking-tight mb-3"
        style={{ color: colors.navy, fontFamily: "'Montserrat', sans-serif" }}
      >
        No checklists active yet
      </h3>

      {/* Body */}
      <p
        className="text-sm mb-6"
        style={{
          color: colors.textMuted,
          maxWidth: 540,
          lineHeight: 1.55,
        }}
      >
        Adopt from your library to start recording compliance routines. EvidLY
        identifies what&apos;s at risk of citation, reduces the chance of a failed
        inspection, and assembles every completed record into your proof packet.
      </p>

      {/* PRP tiles */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-5"
        style={{ maxWidth: 760 }}
      >
        {PRP_TILES.map(tile => (
          <div
            key={tile.eyebrow}
            className="rounded-lg border text-left p-3.5"
            style={{
              backgroundColor: colors.white,
              borderColor: colors.border,
              borderTopWidth: 3,
              borderTopColor: tile.color,
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase mb-1.5"
              style={{ color: tile.color, letterSpacing: '0.12em' }}
            >
              {tile.eyebrow}
            </p>
            <p
              className="text-xs"
              style={{ color: colors.textMuted, lineHeight: 1.45 }}
            >
              {tile.body}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onBrowseLibrary}
        className="inline-flex items-center gap-1.5 rounded-lg font-bold"
        style={{
          backgroundColor: colors.navy,
          color: colors.cream,
          padding: '12px 22px',
          fontSize: 14,
          minHeight: 44,
        }}
      >
        + Browse Library
      </button>
    </div>
  );
}
