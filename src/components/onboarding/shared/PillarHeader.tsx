import { ShieldCheck, Flame } from 'lucide-react';

interface PillarHeaderProps {
  pillar: 'food_safety' | 'fire_safety';
  subtitle?: string;
  completedCount: number;
  totalCount: number;
}

export function PillarHeader({ pillar, subtitle, completedCount, totalCount }: PillarHeaderProps) {
  const isFood = pillar === 'food_safety';
  const Icon = isFood ? ShieldCheck : Flame;
  const title = isFood ? 'Food Safety' : 'Fire Safety';

  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isFood ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[#1E2D4D]">{title}</h3>
          <span className="text-xs text-[#8A93A6]">{completedCount} of {totalCount}</span>
        </div>
        {subtitle && <p className="text-xs text-[#8A93A6] truncate">{subtitle}</p>}
      </div>
    </div>
  );
}
