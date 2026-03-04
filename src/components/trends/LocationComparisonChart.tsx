import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { CategoryTrendDataPoint } from '../../data/trendDemoData';

interface Props {
  locationData: Record<string, CategoryTrendDataPoint[]>;
}

type Metric = 'overall' | 'foodSafety' | 'facilitySafety';

const METRIC_LABELS: Record<Metric, string> = {
  overall: 'Overall',
  foodSafety: 'Food Safety',
  facilitySafety: 'Facility Safety',
};

const LOCATION_COLORS: Record<string, string> = {
  downtown: '#4ade80',
  airport: '#f97316',
  university: '#ef4444',
};

const LOCATION_LABELS: Record<string, string> = {
  downtown: 'Downtown',
  airport: 'Airport',
  university: 'University',
};

export function LocationComparisonChart({ locationData }: Props) {
  const [metric, setMetric] = useState<Metric>('overall');

  // Build merged data for chart (one entry per day with columns per location)
  const locationIds = Object.keys(locationData);
  const refLoc = locationData[locationIds[0]] || [];
  const chartData = refLoc.map((_, i) => {
    const row: Record<string, string | number> = {
      dateDisplay: refLoc[i].dateDisplay,
    };
    for (const locId of locationIds) {
      const pt = locationData[locId]?.[i];
      if (pt) row[locId] = pt[metric] as number;
    }
    return row;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Location Comparison</h3>
          <p className="text-sm text-gray-500">Compare compliance trajectories across locations</p>
        </div>
        <div className="flex items-center gap-1">
          {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className="px-3 py-1 text-xs font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: metric === m ? '#1e4d6b' : 'transparent',
                color: metric === m ? 'white' : 'var(--text-secondary, #3D5068)',
              }}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" />
            <XAxis
              dataKey="dateDisplay"
              fontSize={11}
              tick={{ fill: '#6B7F96' }}
              interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
            />
            <YAxis domain={[0, 100]} fontSize={11} tick={{ fill: '#6B7F96' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0B1628',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 12,
              }}
            />
            <Legend />
            {locationIds.map((locId) => (
              <Area
                key={locId}
                type="monotone"
                dataKey={locId}
                stroke={LOCATION_COLORS[locId] || '#1e4d6b'}
                fill={LOCATION_COLORS[locId] || '#1e4d6b'}
                fillOpacity={0.1}
                strokeWidth={2}
                dot={false}
                name={LOCATION_LABELS[locId] || locId}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
