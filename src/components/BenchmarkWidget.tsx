import { Target, ArrowRight, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getBenchmarkComparison, getPercentile } from '../data/benchmarkData';
import { getBadgeColor, getBadgeLabel } from '../lib/benchmarkBadges';

interface BenchmarkWidgetProps {
  locationId: string;
}

export function BenchmarkWidget({ locationId }: BenchmarkWidgetProps) {
  const navigate = useNavigate();
  const comparison = getBenchmarkComparison(locationId === 'all' ? 'all' : locationId);
  const percentile = getPercentile(locationId === 'all' ? 'all' : locationId);

  const topStrength = comparison.leadLag.leads[0];
  const topWeakness = comparison.leadLag.lags[0];
  const qChange = comparison.quarterlyChange;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <Target className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Industry Benchmark</h3>
            <p className="text-xs text-gray-500">How you compare to {percentile.totalPeers.toLocaleString()} peers</p>
          </div>
        </div>
        <button
          onClick={() => navigate(locationId === 'all' ? '/benchmarks' : `/benchmarks?location=${locationId}`)}
          className="text-sm font-medium flex items-center gap-1 hover:underline"
          style={{ color: '#1e4d6b' }}
        >
          View Full Report <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Score comparison bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold text-gray-900">Your Score: {percentile.score}</span>
          <span className="text-gray-500">Industry Avg: {comparison.industryAvg}</span>
        </div>
        <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
          {/* Industry average marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-gray-400 z-10"
            style={{ left: `${comparison.industryAvg}%` }}
          />
          {/* Your score bar */}
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${percentile.score}%`,
              backgroundColor: percentile.score >= 90 ? '#22c55e' : percentile.score >= 75 ? '#eab308' : percentile.score >= 60 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gray-400">0</span>
          <span className="text-[10px] text-gray-400">100</span>
        </div>
      </div>

      {/* Percentile + Context Row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: '#d4af37' }}>{percentile.percentile}th</span>
            <span className="text-sm font-medium text-gray-500">percentile</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Top {100 - percentile.percentile}% of peers</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700">Restaurant — Fresno County, CA</p>
          <p className="text-xs text-gray-500">Rank {percentile.rank} of {percentile.totalPeers.toLocaleString()}</p>
        </div>
      </div>

      {/* Badge callout (if qualified) */}
      {comparison.badge?.qualified && comparison.badge.tier && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: '#fdf8e8', border: '1px solid #fef3c7' }}>
          <Award className="h-4 w-4" style={{ color: getBadgeColor(comparison.badge.tier) }} />
          <span className="text-sm font-semibold" style={{ color: getBadgeColor(comparison.badge.tier) }}>
            {getBadgeLabel(comparison.badge.tier)}
          </span>
          <span className="text-xs text-gray-500 ml-1">since {new Date(comparison.badge.qualifyingSince!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
        </div>
      )}

      {/* Lead / Lag chips */}
      <div className="flex flex-col gap-2 mb-4">
        {topStrength && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              LEAD
            </span>
            <span className="text-gray-700">{topStrength.subcategory}</span>
            <span className="font-semibold" style={{ color: '#16a34a' }}>
              {topStrength.delta > 0 ? '+' : ''}{topStrength.delta} vs avg
            </span>
          </div>
        )}
        {topWeakness && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              LAG
            </span>
            <span className="text-gray-700">{topWeakness.subcategory}</span>
            <span className="font-semibold" style={{ color: '#dc2626' }}>
              {topWeakness.delta > 0 ? '+' : ''}{topWeakness.delta} vs avg
            </span>
          </div>
        )}
      </div>

      {/* Trend + Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-sm">
          {qChange >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className="font-medium" style={{ color: qChange >= 0 ? '#16a34a' : '#dc2626' }}>
            {qChange >= 0 ? '+' : ''}{qChange} pts
          </span>
          <span className="text-gray-400">vs last quarter</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(locationId === 'all' ? '/benchmarks' : `/benchmarks?location=${locationId}`)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ backgroundColor: '#1e4d6b', color: 'white' }}
          >
            Full Report
          </button>
          <button
            onClick={() => toast.info("Share from the full Benchmarks page")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: '#1e4d6b', color: '#1e4d6b' }}
          >
            Share Ranking
          </button>
        </div>
      </div>
    </div>
  );
}
