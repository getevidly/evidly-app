import { Clock } from 'lucide-react';
import { colors } from '../../lib/designSystem';

const PRP_TILES = [
  {
    eyebrow: 'PREDICT',
    color: colors.warning,
    body: 'Pattern detection across completion history identifies which items recurrently fail, which shifts skip checks, and where you\u2019re at risk of citation.',
  },
  {
    eyebrow: 'REDUCE',
    color: colors.danger,
    body: 'Coverage gaps are identified here proactively. Every missed completion can be logged retroactively with an audit reason, before it becomes a violation.',
  },
  {
    eyebrow: 'PROVE',
    color: colors.success,
    body: 'Every completion is a verified record. Filter by date, equipment, or user. Export the proof packet your inspector wants.',
  },
] as const;

interface ChecklistsHistoryEmptyStateProps {
  onStartChecklist: () => void;
}

export function ChecklistsHistoryEmptyState({ onStartChecklist }: ChecklistsHistoryEmptyStateProps) {
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
          backgroundColor: colors.borderLight,
        }}
      >
        <Clock style={{ color: colors.navy, width: 38, height: 38 }} />
      </div>

      {/* Heading */}
      <h3
        className="text-[22px] font-bold tracking-tight mb-3"
        style={{ color: colors.navy, fontFamily: "'Montserrat', sans-serif" }}
      >
        No completed checklists yet
      </h3>

      {/* Body */}
      <p
        className="text-sm mb-6"
        style={{
          color: colors.textMuted,
          maxWidth: 560,
          lineHeight: 1.55,
        }}
      >
        Your checklist history will appear here once you start completing them.
        Each completion creates an inspector-defensible record with signatures,
        timestamps, and primary-source citations.
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
        onClick={onStartChecklist}
        className="inline-flex items-center gap-1.5 rounded-lg font-bold"
        style={{
          backgroundColor: colors.navy,
          color: colors.cream,
          padding: '12px 22px',
          fontSize: 14,
          minHeight: 44,
        }}
      >
        + Start a Checklist &rarr;
      </button>
    </div>
  );
}
