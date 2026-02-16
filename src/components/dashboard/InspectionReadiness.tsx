import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getReadinessColor } from '../../utils/inspectionReadiness';

interface InspectionReadinessProps {
  score: number;
  jurisdiction?: string;
  trend?: 'up' | 'down' | 'stable';
  subtitle?: string;
}

export default function InspectionReadiness({ score, jurisdiction, trend, subtitle }: InspectionReadinessProps) {
  const color = getReadinessColor(score);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#9ca3af';

  return (
    <div className="text-center py-2" style={{ fontFamily: 'Inter, sans-serif' }}>
      <p
        className="text-xs font-semibold uppercase mb-1"
        style={{ letterSpacing: '0.1em', color: '#9ca3af' }}
      >
        Inspection Readiness
      </p>

      <div className="flex items-center justify-center gap-2">
        <span className="text-5xl font-bold" style={{ color }}>
          {score}
        </span>
        {trend && trend !== 'stable' && (
          <TrendIcon size={20} style={{ color: trendColor }} />
        )}
      </div>

      <div className="w-full max-w-xs mx-auto mt-3">
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {(subtitle || jurisdiction) && (
        <p className="text-xs text-gray-400 mt-2">
          {subtitle || jurisdiction}
        </p>
      )}
    </div>
  );
}
