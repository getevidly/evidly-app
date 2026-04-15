import { colors, shadows, radius, typography, transitions } from '../../../lib/designSystem';

// ── Types ──────────────────────────────────────────────────

export interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  color?: string;
  onClick?: () => void;
}

interface MetricCardRowProps {
  cards: MetricCardProps[];
}

// ── Component ──────────────────────────────────────────────

export function MetricCardRow({ cards }: MetricCardRowProps) {
  if (cards.length === 0) return null;

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card, i) => (
        <button
          key={i}
          type="button"
          onClick={card.onClick}
          disabled={!card.onClick}
          style={{
            background: colors.white,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            boxShadow: shadows.sm,
            padding: '12px',
            textAlign: 'center',
            cursor: card.onClick ? 'pointer' : 'default',
            transition: `box-shadow ${transitions.fast}, transform ${transitions.fast}`,
          }}
          onMouseEnter={e => {
            if (card.onClick) {
              e.currentTarget.style.boxShadow = shadows.md;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = shadows.sm;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <p style={{
            fontSize: typography.size.h2,
            fontWeight: typography.weight.bold,
            lineHeight: 1.2,
            color: card.color || colors.textPrimary,
            margin: 0,
          }}>
            {card.value ?? '\u2014'}
          </p>
          <p style={{
            fontSize: typography.size.xs,
            fontWeight: typography.weight.medium,
            color: colors.textSecondary,
            marginTop: 4,
            lineHeight: 1.2,
          }}>
            {card.label}
          </p>
          {card.detail && (
            <p style={{
              fontSize: typography.size.xs,
              color: colors.textSecondary,
              marginTop: 2,
              lineHeight: 1.2,
            }}>
              {card.detail}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}
