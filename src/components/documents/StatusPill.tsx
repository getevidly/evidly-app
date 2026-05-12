const STATUS_MAP: Record<string, { label: string; bg: string; fg: string }> = {
  current:        { label: 'Current',        bg: '#E8F5E9', fg: '#2E7D32' },
  expiring:       { label: 'Expiring Soon',  bg: '#FEF3C7', fg: '#B45309' },
  expired:        { label: 'Expired',        bg: '#FEE2E2', fg: '#B91C1C' },
  pending_review: { label: 'Pending Review', bg: '#DBEAFE', fg: '#1D4ED8' },
  requested:      { label: 'Requested',      bg: '#FEF3C7', fg: '#B45309' },
  overdue:        { label: 'Overdue',        bg: '#FEE2E2', fg: '#B91C1C' },
};

export function statusPillColors(status: string) {
  return STATUS_MAP[status] || { label: status, bg: '#EEE', fg: '#444' };
}

interface StatusPillProps {
  status: string;
}

export function StatusPill({ status }: StatusPillProps) {
  const { label, bg, fg } = statusPillColors(status);
  return (
    <span
      className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}
