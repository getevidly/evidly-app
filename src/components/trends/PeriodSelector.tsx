import type { TimePeriod } from '../../lib/trendAnalytics';

interface Props {
  periods: TimePeriod[];
  selected: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

const LABELS: Record<TimePeriod, string> = {
  '30d': '30 days',
  '60d': '60 days',
  '90d': '90 days',
};

export function PeriodSelector({ periods, selected, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="px-3 py-1 text-xs font-medium rounded-lg transition-colors"
          style={{
            backgroundColor: selected === p ? '#1e4d6b' : 'transparent',
            color: selected === p ? 'white' : 'var(--text-secondary, #3D5068)',
          }}
        >
          {LABELS[p]}
        </button>
      ))}
    </div>
  );
}
