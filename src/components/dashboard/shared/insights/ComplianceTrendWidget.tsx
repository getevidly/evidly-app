import { useState } from 'react';
import { OverallTrendChart } from '../../../trends/OverallTrendChart';
import { PeriodSelector } from '../../../trends/PeriodSelector';
import { filterByPeriod, analyzeTrend, type TimePeriod } from '../../../../lib/trendAnalytics';
import type { CategoryTrendDataPoint } from '../../../../data/trendDemoData';
import { CARD_BG, CARD_BORDER, BODY_TEXT, NAVY } from '../constants';

interface Props {
  trendData: CategoryTrendDataPoint[];
}

export function ComplianceTrendWidget({ trendData }: Props) {
  const [period, setPeriod] = useState<TimePeriod>('90d');
  const filtered = filterByPeriod(trendData, period);
  const analysis = analyzeTrend(filtered.map(d => d.foodSafety));

  const deltaColor = analysis.direction === 'improving' ? '#16a34a'
    : analysis.direction === 'declining' ? '#dc2626' : '#6b7280';
  const deltaSign = analysis.periodDelta > 0 ? '+' : '';

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Compliance Score Trend</h3>
          <span className="text-xs font-medium" style={{ color: deltaColor }}>
            {deltaSign}{analysis.periodDelta} pts ({analysis.direction})
          </span>
        </div>
        <PeriodSelector
          periods={['30d', '60d', '90d']}
          selected={period}
          onChange={setPeriod}
        />
      </div>
      <div className="px-2 py-3">
        <OverallTrendChart data={filtered} />
      </div>
      <div className="grid grid-cols-3 gap-px" style={{ borderTop: `1px solid ${CARD_BORDER}`, backgroundColor: CARD_BORDER }}>
        {[
          { label: 'Current', value: analysis.currentValue },
          { label: 'Average', value: analysis.avgValue },
          { label: 'Range', value: `${analysis.minValue}–${analysis.maxValue}` },
        ].map(stat => (
          <div key={stat.label} className="px-3 py-2.5 text-center" style={{ backgroundColor: CARD_BG }}>
            <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#6B7F96' }}>{stat.label}</p>
            <p className="text-sm font-bold" style={{ color: NAVY }}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
