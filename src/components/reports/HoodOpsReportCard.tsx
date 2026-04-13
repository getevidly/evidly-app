/**
 * HoodOpsReportCard — Report card for the library grid.
 * Displays icon, title, description, category badge.
 */
import { Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY } from '../dashboard/shared/constants';

interface HoodOpsReportCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  categoryLabel: string;
  categoryColor: string;
  categoryBg: string;
  isFavorite?: boolean;
  onClick?: () => void;
  onToggleFavorite?: () => void;
}

export function HoodOpsReportCard({
  title,
  description,
  icon: Icon,
  categoryLabel,
  categoryColor,
  categoryBg,
  isFavorite,
  onClick,
  onToggleFavorite,
}: HoodOpsReportCardProps) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl p-4 transition-all hover:shadow-md group relative"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: categoryBg }}>
          <Icon className="w-4.5 h-4.5" style={{ color: categoryColor }} />
        </div>
        {onToggleFavorite && (
          <button
            onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
            className="p-2.5 -m-1 rounded hover:bg-[#1E2D4D]/5 transition-colors"
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-[#1E2D4D]/30'}`} />
          </button>
        )}
      </div>
      <p className="text-sm font-semibold mb-1 group-hover:text-[#1E2D4D]" style={{ color: NAVY }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: TEXT_TERTIARY }}>{description}</p>
      <div className="mt-3">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: categoryColor, background: categoryBg }}>
          {categoryLabel}
        </span>
      </div>
    </button>
  );
}
