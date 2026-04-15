import { locationScores, complianceScores } from '../../data/demoData';
import { VERTICAL_BENCHMARKS } from '../../data/benchmarkData';

interface Props {
  locationId: string;
}

// Simulated percentiles for category-level comparison
const CATEGORY_PERCENTILES: Record<string, { foodSafety: number; facilitySafety: number }> = {
  downtown: { foodSafety: 93, facilitySafety: 85 },
  airport: { foodSafety: 50, facilitySafety: 38 },
  university: { foodSafety: 25, facilitySafety: 15 },
  all: { foodSafety: 62, facilitySafety: 50 },
};

export function BenchmarkCategoryBreakdown({ locationId }: Props) {
  const scores = locationId === 'all' ? complianceScores : locationScores[locationId] || complianceScores;
  const vertical = VERTICAL_BENCHMARKS.find(v => v.vertical === 'Restaurant')!;
  const pct = CATEGORY_PERCENTILES[locationId] || CATEGORY_PERCENTILES['all'];

  const rows = [
    { category: 'Food Safety', yours: scores.foodSafety, verticalAvg: vertical.avgFoodSafety, industryAvg: 76, percentile: pct.foodSafety },
    { category: 'Fire Safety', yours: scores.facilitySafety, verticalAvg: vertical.avgFacilitySafety, industryAvg: 70, percentile: pct.facilitySafety },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
      <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-1">Category Breakdown</h3>
      <p className="text-sm text-[#1E2D4D]/50 mb-4">Compare your compliance domains against peers</p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1E2D4D]/10 hover:bg-[#1E2D4D]/[0.02] transition-colors">
              <th className="text-left text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wider pb-3 pr-4">Category</th>
              <th className="text-center text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wider pb-3 px-3">Your Score</th>
              <th className="text-center text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wider pb-3 px-3">Vertical Avg</th>
              <th className="text-center text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wider pb-3 px-3">Industry Avg</th>
              <th className="text-center text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wider pb-3 px-3">Delta</th>
              <th className="text-center text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wider pb-3 pl-3">Percentile</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const delta = row.yours - row.verticalAvg;
              return (
                <tr key={row.category} className={i < rows.length - 1 ? 'border-b border-[#1E2D4D]/3' : ''}>
                  <td className="py-3 pr-4 text-sm text-[#1E2D4D]">{row.category}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-sm font-bold" style={{
                      color: row.yours >= 90 ? '#22c55e' : row.yours >= 75 ? '#eab308' : row.yours >= 60 ? '#f59e0b' : '#ef4444'
                    }}>{row.yours}</span>
                  </td>
                  <td className="py-3 px-3 text-center text-sm text-[#1E2D4D]/50">{row.verticalAvg}</td>
                  <td className="py-3 px-3 text-center text-sm text-[#1E2D4D]/30">{row.industryAvg}</td>
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
