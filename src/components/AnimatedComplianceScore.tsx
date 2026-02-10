import { useEffect, useState, useRef } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { useConfetti } from '../hooks/useConfetti';

interface AnimatedComplianceScoreProps {
  score: number;
  label: string;
  color: string;
  trend?: { icon: string; diff: string; color: string };
}

export function AnimatedComplianceScore({ score, label, color, trend }: AnimatedComplianceScoreProps) {
  const animatedScore = useCountUp(score, 1500);
  const [animationComplete, setAnimationComplete] = useState(false);
  const { triggerConfetti } = useConfetti();
  const hasTriggeredRef = useRef(false);

  // Calculate the stroke dash for the circular gauge
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  // Color transitions as score climbs — uses scoring engine thresholds
  const getAnimatedColor = (currentScore: number) => {
    if (currentScore < 70) return '#ef4444';
    if (currentScore < 90) return '#eab308';
    return '#22c55e';
  };

  const currentColor = getAnimatedColor(animatedScore);

  useEffect(() => {
    if (animatedScore === score) {
      setAnimationComplete(true);

      // Trigger confetti for 90+ scores
      if (score >= 90 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        setTimeout(() => {
          triggerConfetti('compliance-score-90');
        }, 300);
      }
    }
  }, [animatedScore, score, triggerConfetti]);

  return (
    <div className="relative flex flex-col items-center" data-tour="compliance-score">
      {/* SVG Gauge */}
      <div className="relative w-[200px] h-[200px]">
        <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Animated progress circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={currentColor}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{
              transition: 'stroke 0.3s ease',
              filter: animationComplete ? `drop-shadow(0 0 6px ${currentColor}40)` : 'none',
            }}
          />
        </svg>

        {/* Center score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`text-5xl font-bold transition-all duration-300 ${animationComplete ? 'animate-score-pulse' : ''}`}
            style={{ color: currentColor }}
          >
            {animatedScore}
          </div>
          <div className="text-base text-gray-500 mt-1">Overall</div>
        </div>
      </div>

      {/* Status label */}
      <div className="mt-4 text-center">
        <span
          className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-all duration-500 ${
            animationComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          } ${
            color === 'green'
              ? 'bg-green-100 text-green-800'
              : color === 'yellow'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {label}
        </span>

        {/* Trend indicator */}
        {trend && (
          <div
            className={`flex items-center justify-center gap-1 mt-2 text-sm transition-all duration-500 ${
              animationComplete ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span style={{ color: trend.color, fontWeight: 600 }}>{trend.icon}</span>
            <span style={{ color: trend.color, fontWeight: 600 }}>{trend.diff}</span>
            <span className="text-gray-400">vs 30 days ago</span>
          </div>
        )}
      </div>

    </div>
  );
}
