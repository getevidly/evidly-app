interface KpiTileProps {
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: 'default' | 'green' | 'gold' | 'red' | 'amber' | 'blue';
}

const colorMap: Record<string, string> = {
  default: 'text-[#1E2D4D]',
  green: 'text-green-600',
  gold: 'text-[#A08C5A]',
  red: 'text-red-600',
  amber: 'text-amber-600',
  blue: 'text-blue-600',
};

export function KpiTile({ label, value, sub, valueColor = 'default' }: KpiTileProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className={`text-2xl font-bold ${colorMap[valueColor] || colorMap.default}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
