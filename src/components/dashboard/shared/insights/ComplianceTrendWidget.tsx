import { useState } from 'react';
import { OverallTrendChart } from '../../../trends/OverallTrendChart';
import { PeriodSelector } from '../../../trends/PeriodSelector';
import { filterByPeriod, type TimePeriod } from '../../../../lib/trendAnalytics';
import type { CategoryTrendDataPoint } from '../../../../data/trendDemoData';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../constants';

interface Props {
  trendData: CategoryTrendDataPoint[];
}

const PERIODS: TimePeriod[] = ['30d', '60d', '90d'];

export function ComplianceTrendWidget({ trendData }: Props) {
  const [period, setPeriod] = useState<TimePeriod>('90d');
  const filtered = filterByPeriod(trendData, period);

  return (
    <div
      className="rounded-lg p-5"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        boxShadow: CARD_SHADOW,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>
          Compliance Score Trend
        </h3>
        <PeriodSelector periods={PERIODS} selected={period} onChange={setPeriod} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs py-8 text-center" style={{ color: MUTED }}>
          No trend data available.
        </p>
      ) : (
        <OverallTrendChart data={filtered} />
      )}
    </div>
  );
}
