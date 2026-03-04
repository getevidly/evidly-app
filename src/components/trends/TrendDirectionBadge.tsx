import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import type { TrendDirection } from '../../lib/trendAnalytics';

interface Props {
  direction: TrendDirection;
  delta?: number;
  compact?: boolean;
}

const CONFIG: Record<TrendDirection, { icon: typeof TrendingUp; color: string; bg: string; label: string }> = {
  improving: { icon: TrendingUp, color: '#16a34a', bg: '#f0fdf4', label: 'Improving' },
  stable:    { icon: ArrowRight, color: '#6b7280', bg: '#f9fafb', label: 'Stable' },
  declining: { icon: TrendingDown, color: '#dc2626', bg: '#fef2f2', label: 'Declining' },
};

export function TrendDirectionBadge({ direction, delta, compact }: Props) {
  const { icon: Icon, color, bg, label } = CONFIG[direction];
  const size = compact ? 12 : 14;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-medium"
      style={{
        backgroundColor: bg,
        color,
        padding: compact ? '2px 6px' : '3px 10px',
        fontSize: compact ? 11 : 12,
      }}
    >
      <Icon size={size} />
      {!compact && label}
      {delta !== undefined && delta !== 0 && (
        <span>{delta > 0 ? '+' : ''}{Math.round(delta)}</span>
      )}
    </span>
  );
}
