import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendDirectionBadge } from './TrendDirectionBadge';
import type { TrendAnalysis } from '../../lib/trendAnalytics';

interface Props {
  label: string;
  analysis: TrendAnalysis;
  sparklineData: number[];
  color?: string;
  unit?: string;
  invertDirection?: boolean;
}

export function CategoryTrendCard({
  label,
  analysis,
  sparklineData,
  color = '#1E2D4D',
  unit = '',
  invertDirection,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  // For metrics where lower is better (incident hours), invert the direction
  const displayDirection = invertDirection
    ? analysis.direction === 'improving'
      ? 'declining'
      : analysis.direction === 'declining'
      ? 'improving'
      : 'stable'
    : analysis.direction;

  const displayDelta = invertDirection ? -analysis.periodDelta : analysis.periodDelta;

  return (
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Mini sparkline */}
          <div className="w-20 h-8 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData.map((v, i) => ({ i, v }))}>
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
            <p className="text-xs text-[#1E2D4D]/50">
              Current: {analysis.currentValue}{unit}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <TrendDirectionBadge direction={displayDirection} delta={displayDelta} compact />
          {expanded ? <ChevronUp size={16} className="text-[#1E2D4D]/30" /> : <ChevronDown size={16} className="text-[#1E2D4D]/30" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs text-[#1E2D4D]/70">
            <div>
              <p className="text-[#1E2D4D]/30">Start</p>
              <p className="font-medium">{analysis.periodStartValue}{unit}</p>
            </div>
            <div>
              <p className="text-[#1E2D4D]/30">Current</p>
              <p className="font-medium">{analysis.currentValue}{unit}</p>
            </div>
            <div>
              <p className="text-[#1E2D4D]/30">Average</p>
              <p className="font-medium">{analysis.avgValue}{unit}</p>
            </div>
            <div>
              <p className="text-[#1E2D4D]/30">Change</p>
              <p className="font-medium">
                {analysis.periodDelta > 0 ? '+' : ''}{analysis.periodDelta}{unit}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
