import { EvidlyIcon } from './ui/EvidlyIcon';

interface InspectionReadyBadgeProps {
  score: number;
  show: boolean;
}

export function InspectionReadyBadge({ score, show }: InspectionReadyBadgeProps) {
  if (!show || score < 90) return null;

  return (
    <div
      className="animate-badge-appear"
      title="Your compliance score qualifies as inspection-ready"
    >
      <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#d4af37] badge-shimmer">
        <EvidlyIcon size={20} />
        <span className="text-sm font-bold text-white tracking-wide">
          Inspection Ready ✓
        </span>
      </div>
    </div>
  );
}
