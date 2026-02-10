import { useCountUp } from '../hooks/useCountUp';

interface AnimatedPillarBarProps {
  name: string;
  score: number;
  tooltip: string;
  trend: { icon: string; diff: string; color: string };
  delay?: number;
  onClick?: () => void;
  isExpanded?: boolean;
}

export function AnimatedPillarBar({ name, score, tooltip, trend, delay = 0, onClick, isExpanded }: AnimatedPillarBarProps) {
  const animatedScore = useCountUp(score, 1500 + delay);
  const color = animatedScore >= 90 ? '#22c55e' : animatedScore >= 75 ? '#eab308' : animatedScore >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div
      className="animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both', flex: 1, minWidth: 0 }}
    >
      <div
        onClick={onClick}
        className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md"
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="text-center">
          <div className="font-semibold text-base text-gray-700 mb-2">{name}</div>
          <div
            className="text-4xl font-bold transition-colors duration-300"
            style={{ color }}
          >
            {animatedScore}
          </div>
          <div className="flex items-center justify-center gap-1 text-sm mt-1">
            <span style={{ color: trend.color }}>{trend.icon} {trend.diff}</span>
          </div>
          <div className="relative h-1.5 bg-gray-200 rounded-full mx-auto mt-3 w-4/5 overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full rounded-full animate-bar-fill"
              style={{
                backgroundColor: color,
                width: `${score}%`,
                animationDelay: `${delay + 500}ms`,
                animationDuration: '1s',
                animationFillMode: 'both',
              }}
            />
          </div>
          <div className="text-sm text-gray-500 mt-2">{tooltip}</div>
        </div>
      </div>
    </div>
  );
}
