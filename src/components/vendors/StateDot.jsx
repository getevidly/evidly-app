/**
 * StateDot — 8px state-color dot with title tooltip.
 *
 * Props:
 *   state: 'current' | 'attention' | 'action' | 'not_contracted'
 *   locationName: string
 */

const DOT_COLORS = {
  current:        '#2E7D32',
  attention:      '#B45309',
  action:         '#B91C1C',
  not_contracted: '#D8D3C8',
};

const STATE_LABELS = {
  current:        'Current',
  attention:      'Attention',
  action:         'Action required',
  not_contracted: 'Not contracted',
};

export function StateDot({ state, locationName }) {
  const color = DOT_COLORS[state] || '#D8D3C8';
  const label = STATE_LABELS[state] || state;

  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: '8px', height: '8px', backgroundColor: color }}
      title={`${locationName}: ${label}`}
    />
  );
}
