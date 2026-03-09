import { LEVEL_COLORS } from './types';

interface Props {
  level: string | null;
  compact?: boolean;
}

export function SevBadge({ level, compact }: Props) {
  if (!level || level === 'none') return <span style={{ color: '#9CA3AF', fontSize: compact ? 9 : 10 }}>—</span>;
  const c = LEVEL_COLORS[level] || LEVEL_COLORS.low;
  return (
    <span style={{
      fontSize: compact ? 9 : 10,
      fontWeight: 700,
      padding: compact ? '1px 6px' : '2px 8px',
      borderRadius: 6,
      background: c.bg,
      color: c.text,
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  );
}
