import { SUBCATEGORY_BENCHMARKS, LOCATION_SUBCATEGORY_SCORES } from '../../data/benchmarkData';

interface Props {
  locationId: string;
}

function SubcategoryBar({ label, pillar, yourScore, verticalAvg }: {
  label: string;
  pillar: string;
  yourScore: number;
  verticalAvg: number;
}) {
  const delta = yourScore - verticalAvg;
  const isAbove = delta >= 0;
  const pillarColors: Record<string, string> = {
    Operational: '#1e4d6b',
    Equipment: '#d4af37',
    Documentation: '#6366f1',
  };

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
            backgroundColor: pillarColors[pillar] + '15',
            color: pillarColors[pillar],
          }}>{pillar}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{
            color: yourScore >= 90 ? '#22c55e' : yourScore >= 75 ? '#eab308' : yourScore >= 60 ? '#f59e0b' : '#ef4444'
          }}>{yourScore}%</span>
          <span className="text-xs font-semibold w-12 text-right" style={{ color: isAbove ? '#16a34a' : '#dc2626' }}>
            {isAbove ? '+' : ''}{delta}
          </span>
        </div>
      </div>
      <div className="relative h-2.5 bg-gray-100 rounded-full overflow-visible">
        {/* Your score bar */}
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
          style={{
            width: `${yourScore}%`,
            backgroundColor: isAbove ? '#1e4d6b' : '#f59e0b',
          }}
        />
        {/* Vertical avg marker */}
        <div
          className="absolute top-[-3px] w-0.5 h-[16px] rounded-full"
          style={{
            left: `${verticalAvg}%`,
            backgroundColor: '#ef4444',
          }}
        />
      </div>
      <div className="flex items-center justify-end mt-1">
        <span className="text-[10px] text-gray-400">Vertical avg: {verticalAvg}%</span>
      </div>
    </div>
  );
}

export function BenchmarkSubcategoryDeepDive({ locationId }: Props) {
  const locScores = LOCATION_SUBCATEGORY_SCORES[locationId] || LOCATION_SUBCATEGORY_SCORES['downtown'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Subcategory Deep Dive</h3>
      <p className="text-sm text-gray-500 mb-2">Your performance in 8 specific compliance areas vs vertical average</p>
      <div className="flex items-center gap-4 mb-4 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-1.5 rounded-full" style={{ backgroundColor: '#1e4d6b' }} /> Your score
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-0.5 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} /> Vertical avg
        </span>
      </div>
      <div>
        {SUBCATEGORY_BENCHMARKS.map(sub => (
          <SubcategoryBar
            key={sub.key}
            label={sub.label}
            pillar={sub.pillar}
            yourScore={locScores[sub.key] || 50}
            verticalAvg={sub.verticalAvg}
          />
        ))}
      </div>
    </div>
  );
}
