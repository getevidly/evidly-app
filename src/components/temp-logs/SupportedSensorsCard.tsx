import { colors } from '../../lib/designSystem';

const VENDORS = [
  { name: 'SensorPush', color: '#2563EB' },
  { name: 'Temp Stick', color: '#059669' },
  { name: 'Monnit', color: '#8B5CF6' },
  { name: 'Testo', color: '#DC2626' },
  { name: 'ComplianceMate', color: '#0EA5E9' },
] as const;

export function SupportedSensorsCard() {
  return (
    <div
      className="rounded-[10px] border px-5 py-4"
      style={{ backgroundColor: colors.cream, borderColor: colors.border }}
    >
      <h3
        className="text-sm font-bold"
        style={{ color: colors.navy, fontFamily: "'Montserrat', sans-serif" }}
      >
        Supported IoT Sensors
      </h3>
      <p className="text-xs mt-1 mb-3" style={{ color: colors.textSecondary }}>
        Connect any of these to auto-fill your temperature log. Zero manual entry.
      </p>
      <div className="flex flex-wrap gap-2">
        {VENDORS.map(v => (
          <span
            key={v.name}
            className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full"
            style={{
              backgroundColor: colors.white,
              border: `1px solid ${colors.border}`,
              padding: '5px 12px',
            }}
          >
            <div
              className="rounded-full flex-shrink-0"
              style={{ width: 8, height: 8, backgroundColor: v.color }}
            />
            {v.name}
          </span>
        ))}
      </div>
    </div>
  );
}
