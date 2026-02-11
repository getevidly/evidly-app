import { AlertTriangle } from 'lucide-react';
import type { BenchmarkVertical, BenchmarkSize } from '../../data/benchmarkData';
import { VERTICAL_BENCHMARKS, SIZE_BENCHMARKS, GEO_BENCHMARKS, getFilteredBenchmark } from '../../data/benchmarkData';

export interface BenchmarkFilterState {
  vertical: BenchmarkVertical;
  size: BenchmarkSize | '';
  state: string;
  county: string;
}

interface BenchmarkFiltersProps {
  filters: BenchmarkFilterState;
  onChange: (filters: BenchmarkFilterState) => void;
}

export function BenchmarkFilters({ filters, onChange }: BenchmarkFiltersProps) {
  const result = getFilteredBenchmark({
    vertical: filters.vertical,
    size: filters.size || undefined,
    state: filters.state || undefined,
    county: filters.county || undefined,
  });

  const counties = GEO_BENCHMARKS.filter(g => g.level === 'county');
  const belowMinimum = result.peerCount < 10;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.vertical}
          onChange={e => onChange({ ...filters, vertical: e.target.value as BenchmarkVertical })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
        >
          {VERTICAL_BENCHMARKS.map(v => (
            <option key={v.vertical} value={v.vertical}>{v.vertical}</option>
          ))}
        </select>

        <select
          value={filters.size}
          onChange={e => onChange({ ...filters, size: e.target.value as BenchmarkSize | '' })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
        >
          <option value="">All Sizes</option>
          {SIZE_BENCHMARKS.map(s => (
            <option key={s.size} value={s.size}>{s.label}</option>
          ))}
        </select>

        <select
          value={filters.county}
          onChange={e => onChange({ ...filters, county: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
        >
          <option value="">All Counties (CA)</option>
          {counties.map(c => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>
            {result.peerCount.toLocaleString()} peers
          </span>
          <span className="text-xs text-gray-400">
            Avg: {result.avgScore}
          </span>
        </div>
      </div>

      {belowMinimum && (
        <div className="flex items-center gap-2 mt-2 text-xs text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Minimum 10 peers required for anonymized comparison. Broaden your filters.</span>
        </div>
      )}
    </div>
  );
}
