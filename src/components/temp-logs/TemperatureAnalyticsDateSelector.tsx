interface Props {
  value: number;
  onChange: (days: number) => void;
}

const OPTIONS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
  { label: 'All', days: 0 },
];

export function TemperatureAnalyticsDateSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden border" style={{ borderColor: '#1E2D4D20' }}>
      {OPTIONS.map(opt => (
        <button
          key={opt.days}
          type="button"
          onClick={() => onChange(opt.days)}
          className="px-4 py-2 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: value === opt.days ? '#1E2D4D' : 'transparent',
            color: value === opt.days ? '#FAF7F0' : '#6B7F96',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
