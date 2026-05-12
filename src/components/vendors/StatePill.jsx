/**
 * StatePill — renders a state indicator pill.
 *
 * Props:
 *   state: 'current' | 'attention' | 'action' | 'fulfilled'
 */

const STATES = {
  current:   { label: 'Current',         fg: '#2E7D32', bg: '#E8F2E5' },
  attention: { label: 'Attention',       fg: '#B45309', bg: '#FFF8E1' },
  action:    { label: 'Action required', fg: '#B91C1C', bg: '#FCE8E4' },
  fulfilled: { label: 'Fulfilled',       fg: '#2E7D32', bg: '#E8F2E5' },
};

export function StatePill({ state }) {
  const entry = STATES[state];
  if (!entry) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ fontSize: '10px', fontWeight: 500, color: entry.fg, backgroundColor: entry.bg }}
    >
      {state === 'fulfilled' && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5.5L4 7.5L8 3" stroke={entry.fg} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {entry.label}
    </span>
  );
}
