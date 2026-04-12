import { TrendDirectionBadge } from './TrendDirectionBadge';
import type { TrendAnalysis } from '../../lib/trendAnalytics';

interface Props {
  label: string;
  analysis: TrendAnalysis;
  color?: string;
}

export function TrendSummaryCard({ label, analysis, color = '#1E2D4D' }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold" style={{ color }}>{analysis.currentValue}</span>
        <TrendDirectionBadge direction={analysis.direction} delta={analysis.periodDelta} />
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span>Start: {analysis.periodStartValue}</span>
        <span>Avg: {analysis.avgValue}</span>
        <span>Range: {analysis.minValue}–{analysis.maxValue}</span>
      </div>
    </div>
  );
}
