/**
 * PostureBadge — Reusable readiness posture indicator
 *
 * Renders advisor posture (solid/watch/alarm) as a colored badge.
 * §1731-compliant: reads/identifies/flags — no score, just readiness state.
 *
 * REUSABLE: used by admin cross-org view today; future client-facing
 * single-org view should import this same component.
 */

interface PostureBadgeProps {
  posture: 'solid' | 'watch' | 'alarm' | null | undefined;
  size?: 'sm' | 'md';
}

const CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  solid: { label: 'Solid', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  watch: { label: 'Watch', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  alarm: { label: 'Alarm', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function PostureBadge({ posture, size = 'md' }: PostureBadgeProps) {
  if (!posture) return <span className="text-gray-400 text-sm">—</span>;
  const c = CONFIG[posture] || CONFIG.solid;
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${c.bg} ${c.text} ${px}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
