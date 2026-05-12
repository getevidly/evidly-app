/**
 * MetricsStrip — 4-card metrics row used on every vendors surface.
 *
 * Props:
 *   cards: Array<{ label: string, value: ReactNode, sub?: string,
 *     valueColor?: 'navy' | 'current' | 'attention' | 'action' }>
 *
 * Gold is NOT a valid valueColor.
 */

const VALUE_COLORS = {
  navy:      '#1E2D4D',
  current:   '#2E7D32',
  attention: '#B45309',
  action:    '#B91C1C',
};

export function MetricsStrip({ cards }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
      {cards.map((card, i) => {
        const color = VALUE_COLORS[card.valueColor] || VALUE_COLORS.navy;
        return (
          <div
            key={i}
            className="bg-white rounded-md px-3 py-2.5"
            style={{ border: '1px solid #E2DDD4' }}
          >
            <p
              className="uppercase tracking-wider mb-1"
              style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
            >
              {card.label}
            </p>
            <p className="leading-tight" style={{ fontSize: '18px', fontWeight: 500, color }}>
              {card.value}
            </p>
            {card.sub && (
              <p className="mt-0.5" style={{ fontSize: '10px', fontWeight: 400, color: '#5A6478' }}>
                {card.sub}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
