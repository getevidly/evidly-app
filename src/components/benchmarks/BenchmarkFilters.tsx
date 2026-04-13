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
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.vertical}
          onChange={e => onChange({ ...filters, vertical: e.target.value as BenchmarkVertical })}
          className="text-sm border border-[#1E2D4D]/15 rounded-xl px-3 py-2 bg-white text-[#1E2D4D]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
        >
          {VERTICAL_BENCHMARKS.map(v => (
            <option key={v.vertical} value={v.vertical}>{v.vertical}</option>
          ))}
        </select>

        <select
          value={filters.size}
          onChange={e => onChange({ ...filters, size: e.target.value as BenchmarkSize | '' })}
          className="text-sm border border-[#1E2D4D]/15 rounded-xl px-3 py-2 bg-white text-[#1E2D4D]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
        >
          <option value="">All Sizes</option>
          {SIZE_BENCHMARKS.map(s => (
            <option key={s.size} value={s.size}>{s.label}</option>
          ))}
        </select>

        <select
          value={filters.county}
          onChange={e => onChange({ ...filters, county: e.target.value })}
          className="text-sm border border-[#1E2D4D]/15 rounded-xl px-3 py-2 bg-white text-[#1E2D4D]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
        >
          <option value="">All Counties (CA)</option>
          {counties.map(c => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#eef4f8', color: '#1E2D4D' }}>
            {result.peerCount.toLocaleString()} peers
          </span>
          <span className="text-xs text-[#1E2D4D]/30">
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
