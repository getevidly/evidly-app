import { UtensilsCrossed, Flame } from 'lucide-react';
import type { InspectionPillar } from '../../utils/inspectionReadiness';
import { getReadinessColor } from '../../utils/inspectionReadiness';

interface PillarCardProps {
  pillar: InspectionPillar;
  score: number;
  opsScore: number;
  docsScore: number;
  onClick?: () => void;
}

const PILLAR_CONFIG = {
  food_safety: { label: 'Food Safety', Icon: UtensilsCrossed },
  facility_safety: { label: 'Facility Safety', Icon: Flame },
} as const;

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function PillarCard({ pillar, score, opsScore, docsScore, onClick }: PillarCardProps) {
  const { label, Icon } = PILLAR_CONFIG[pillar];
  const color = getReadinessColor(score);
  const opsColor = getReadinessColor(opsScore);
  const docsColor = getReadinessColor(docsScore);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg p-4 transition-shadow duration-200 hover:shadow-md"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={18} style={{ color }} />
          <span className="text-sm font-semibold text-gray-900">{label}</span>
        </div>
        <span className="text-lg font-bold" style={{ color }}>
          {score}
        </span>
      </div>

      <ProgressBar value={score} color={color} />
    </button>
  );
}
