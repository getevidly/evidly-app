import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, TEXT_TERTIARY } from './constants';

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
          className="rounded-lg px-3 py-3 text-center transition-colors"
          style={{
            backgroundColor: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            boxShadow: CARD_SHADOW,
            cursor: card.onClick ? 'pointer' : 'default',
          }}
        >
          <p
            className="text-xl font-bold leading-tight"
            style={{ color: card.color || BODY_TEXT }}
          >
            {card.value ?? '\u2014'}
          </p>
          <p
            className="text-xs font-medium mt-1 leading-tight"
            style={{ color: TEXT_TERTIARY }}
          >
            {card.label}
          </p>
          {card.detail && (
            <p
              className="text-xs mt-0.5 leading-tight"
              style={{ color: TEXT_TERTIARY }}
            >
              {card.detail}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}
