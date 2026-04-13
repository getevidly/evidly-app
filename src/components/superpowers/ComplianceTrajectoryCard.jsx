// SUPERPOWERS-APP-01 — SP3: Compliance Trajectory Card
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area } from 'recharts';

const TREND_STYLES = {
  improving: { icon: TrendingUp, text: 'text-[#166534]', bg: 'bg-[#166534]/10', label: 'Improving' },
  stable: { icon: Minus, text: 'text-[#A08C5A]', bg: 'bg-[#A08C5A]/10', label: 'Stable' },
  declining: { icon: TrendingDown, text: 'text-[#991B1B]', bg: 'bg-[#991B1B]/10', label: 'Declining' },
};

function computeProjection(snapshots) {
  if (snapshots.length < 7) return { trend: 'stable', projections: [] };

  // Linear regression on overall_score
  const n = snapshots.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  snapshots.forEach((s, i) => {
    sumX += i;
    sumY += s.overall_score;
    sumXY += i * s.overall_score;
    sumX2 += i * i;
  });
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const trend = slope > 0.15 ? 'improving' : slope < -0.15 ? 'declining' : 'stable';

  // Project 30/60/90 days
  const projections = [30, 60, 90].map(days => {
    const projIdx = n + Math.floor(days / (90 / n));
    const projected = Math.max(0, Math.min(100, Math.round(intercept + slope * projIdx)));
    const date = new Date();
    date.setDate(date.getDate() + days);
    return {
      date: date.toISOString().split('T')[0],
      label: `+${days}d`,
      projected,
    };
  });

  return { trend, projections, slope };
}

export function ComplianceTrajectoryCard({ snapshots }) {
  const { chartData, trend, current } = useMemo(() => {
    if (!snapshots?.length) return { chartData: [], trend: 'stable', current: null };

    const { trend, projections } = computeProjection(snapshots);
    const current = snapshots[snapshots.length - 1]?.overall_score || 0;

    // Historical data
    const historical = snapshots.map(s => ({
      date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: Math.round(s.overall_score),
      type: 'historical',
    }));

    // Projection data
    const projected = projections.map(p => ({
      date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      projected: p.projected,
      type: 'projected',
    }));

    return { chartData: [...historical, ...projected], trend, current: Math.round(current) };
  }, [snapshots]);

  if (!snapshots?.length) {
    return (
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#F4F6FA] rounded-lg">
            <BarChart3 className="h-5 w-5 text-[#1E2D4D]" />
          </div>
          <h3 className="text-lg font-semibold text-[#0B1628]">Compliance Trajectory</h3>
        </div>
        <div className="text-center py-8">
          <BarChart3 className="h-10 w-10 text-[#D1D9E6] mx-auto mb-3" />
          <p className="text-sm text-[#6B7F96]">Insufficient data for trajectory analysis</p>
          <p className="text-xs text-[#6B7F96] mt-1">Trajectory requires at least 7 days of readiness snapshots</p>
        </div>
      </div>
    );
  }

  const trendStyle = TREND_STYLES[trend];
  const TrendIcon = trendStyle.icon;

  return (
    <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F4F6FA] rounded-lg">
            <BarChart3 className="h-5 w-5 text-[#1E2D4D]" />
          </div>
          <h3 className="text-lg font-semibold text-[#0B1628]">Compliance Trajectory</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${trendStyle.bg} ${trendStyle.text}`}>
            <TrendIcon className="h-3 w-3" />
            {trendStyle.label}
          </span>
        </div>
      </div>

      {/* Current Score */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold text-[#0B1628]">{current}</span>
        <span className="text-sm text-[#6B7F96]">/ 100 current readiness</span>
      </div>

      {/* Chart */}
      <div className="h-52 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7F96' }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6B7F96' }} width={30} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E6', fontSize: 12 }}
              labelStyle={{ color: '#0B1628', fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#1E2D4D"
              strokeWidth={2}
              dot={{ r: 2, fill: '#1E2D4D' }}
              name="Readiness Score"
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#A08C5A"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 2, fill: '#A08C5A' }}
              name="Projected"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[#1E2D4D]" />
          <span className="text-[10px] text-[#6B7F96]">Historical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[#A08C5A]" style={{ borderTop: '2px dashed #A08C5A', height: 0 }} />
          <span className="text-[10px] text-[#6B7F96]">Projected</span>
        </div>
      </div>

      <p className="text-[10px] text-[#6B7F96] border-t border-[#E8EDF5] pt-3">
        Projected trajectory is based on historical readiness patterns and may not reflect future compliance outcomes. Actual scores depend on operational performance.
      </p>
    </div>
  );
}
