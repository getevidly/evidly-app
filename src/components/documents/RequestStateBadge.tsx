const STAGE_MAP: Record<string, { label: string; bg: string; fg: string }> = {
  sent:      { label: 'Link sent',         bg: '#EEF2FF', fg: '#4338CA' },
  viewed:    { label: 'Viewed by vendor',  bg: '#FEF3C7', fg: '#B45309' },
  fulfilled: { label: 'Uploaded',          bg: '#E8F5E9', fg: '#2E7D32' },
  overdue:   { label: 'Overdue',           bg: '#FEE2E2', fg: '#B91C1C' },
};

interface RequestStateBadgeProps {
  stage: string | null;
}

export function RequestStateBadge({ stage }: RequestStateBadgeProps) {
  if (!stage) return null;
  const entry = STAGE_MAP[stage];
  if (!entry) return null;

  return (
    <span
      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: entry.bg, color: entry.fg }}
    >
      {entry.label}
    </span>
  );
}
