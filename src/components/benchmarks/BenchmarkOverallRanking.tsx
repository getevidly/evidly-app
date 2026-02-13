import { getPercentile, VERTICAL_BENCHMARKS, GEO_BENCHMARKS } from '../../data/benchmarkData';

interface Props {
  locationId: string;
}

function PercentileColumn({ label, percentile, peerCount, avgScore, yourScore }: {
  label: string;
  percentile: number;
  peerCount: number;
  avgScore: number;
  yourScore: number;
}) {
  const delta = yourScore - avgScore;
  return (
    <div className="flex flex-col items-center p-4 rounded-xl border border-gray-100">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="text-4xl font-black" style={{ color: '#d4af37' }}>{percentile}<span className="text-lg">th</span></div>
      <p className="text-xs text-gray-400 mt-1">Top {100 - percentile}%</p>
      <div className="mt-3 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percentile}%`, backgroundColor: '#1e4d6b' }} />
      </div>
      <div className="flex items-center justify-between w-full mt-2 text-[11px] text-gray-400">
        <span>Avg: {avgScore}</span>
        <span className="font-semibold" style={{ color: delta >= 0 ? '#16a34a' : '#dc2626' }}>
          {delta >= 0 ? '+' : ''}{delta}
        </span>
      </div>
      <p className="text-[10px] text-gray-300 mt-1">{peerCount.toLocaleString()} peers</p>
    </div>
  );
}

export function BenchmarkOverallRanking({ locationId }: Props) {
  const p = getPercentile(locationId);
  const vertical = VERTICAL_BENCHMARKS.find(v => v.vertical === 'Restaurant')!;
  const geo = GEO_BENCHMARKS.find(g => g.level === 'county' && g.name === 'Fresno County') || GEO_BENCHMARKS[0];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Overall Ranking</h3>
      <p className="text-sm text-gray-500 mb-5">Your score of <span className="font-bold text-gray-900">{p.score}</span> across different comparison groups</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PercentileColumn
          label="All Industries"
          percentile={p.industryPercentile}
          peerCount={4200}
          avgScore={73}
          yourScore={p.score}
        />
        <PercentileColumn
          label="Restaurant Vertical"
          percentile={p.verticalPercentile}
          peerCount={vertical.peerCount}
          avgScore={vertical.avgScore}
          yourScore={p.score}
        />
        <PercentileColumn
          label={geo.name}
          percentile={p.geoPercentile}
          peerCount={geo.peerCount}
          avgScore={geo.avgScore}
          yourScore={p.score}
        />
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Rank <span className="font-bold text-gray-900">{p.rank}</span> of <span className="font-bold text-gray-900">{p.totalPeers.toLocaleString()}</span> restaurants in your region
        </p>
      </div>
    </div>
  );
}
