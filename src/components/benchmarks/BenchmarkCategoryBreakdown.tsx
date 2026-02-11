import { locationScores, complianceScores } from '../../data/demoData';
import { VERTICAL_BENCHMARKS } from '../../data/benchmarkData';

interface Props {
  locationId: string;
}

// Simulated percentiles for category-level comparison
const CATEGORY_PERCENTILES: Record<string, { operational: number; equipment: number; documentation: number; overall: number }> = {
  downtown: { operational: 93, equipment: 85, documentation: 90, overall: 89 },
  airport: { operational: 50, equipment: 38, documentation: 53, overall: 52 },
  university: { operational: 25, equipment: 15, documentation: 10, overall: 18 },
  all: { operational: 62, equipment: 50, documentation: 55, overall: 58 },
};

export function BenchmarkCategoryBreakdown({ locationId }: Props) {
  const scores = locationId === 'all' ? complianceScores : locationScores[locationId] || complianceScores;
  const vertical = VERTICAL_BENCHMARKS.find(v => v.vertical === 'Restaurant')!;
  const pct = CATEGORY_PERCENTILES[locationId] || CATEGORY_PERCENTILES['all'];

  const rows = [
    { category: 'Operational', yours: scores.operational, verticalAvg: vertical.avgOperational, industryAvg: 76, percentile: pct.operational },
    { category: 'Equipment & Fire Safety', yours: scores.equipment, verticalAvg: vertical.avgEquipment, industryAvg: 70, percentile: pct.equipment },
    { category: 'Documentation', yours: scores.documentation, verticalAvg: vertical.avgDocumentation, industryAvg: 72, percentile: pct.documentation },
    { category: 'Overall', yours: scores.overall, verticalAvg: vertical.avgScore, industryAvg: 73, percentile: pct.overall },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Category Breakdown</h3>
      <p className="text-sm text-gray-500 mb-4">Compare your three compliance domains against peers</p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">Category</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 px-3">Your Score</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 px-3">Vertical Avg</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 px-3">Industry Avg</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 px-3">Delta</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pl-3">Percentile</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const delta = row.yours - row.verticalAvg;
              const isLast = row.category === 'Overall';
              return (
                <tr key={row.category} className={isLast ? 'border-t-2 border-gray-200 font-semibold' : i < rows.length - 2 ? 'border-b border-gray-50' : ''}>
                  <td className="py-3 pr-4 text-sm text-gray-900">{row.category}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-sm font-bold" style={{
                      color: row.yours >= 90 ? '#22c55e' : row.yours >= 75 ? '#eab308' : row.yours >= 60 ? '#f59e0b' : '#ef4444'
                    }}>{row.yours}</span>
                  </td>
                  <td className="py-3 px-3 text-center text-sm text-gray-500">{row.verticalAvg}</td>
                  <td className="py-3 px-3 text-center text-sm text-gray-400">{row.industryAvg}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-sm font-semibold" style={{ color: delta >= 0 ? '#16a34a' : '#dc2626' }}>
                      {delta >= 0 ? '+' : ''}{delta}
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-center">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                      backgroundColor: row.percentile >= 75 ? '#f0fdf4' : row.percentile >= 50 ? '#fefce8' : '#fef2f2',
                      color: row.percentile >= 75 ? '#16a34a' : row.percentile >= 50 ? '#a16207' : '#dc2626',
                    }}>
                      {row.percentile}th
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
