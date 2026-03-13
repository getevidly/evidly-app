import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { CategoryTrendDataPoint } from '../../data/trendDemoData';

interface Props {
  data: CategoryTrendDataPoint[];
}

export function OverallTrendChart({ data }: Props) {
  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" />
          <XAxis
            dataKey="dateDisplay"
            fontSize={11}
            tick={{ fill: '#6B7F96' }}
            interval={Math.max(0, Math.floor(data.length / 8) - 1)}
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
          <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '90', position: 'right', fontSize: 10 }} />
          <ReferenceLine y={75} stroke="#eab308" strokeDasharray="3 3" label={{ value: '75', position: 'right', fontSize: 10 }} />
          <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '60', position: 'right', fontSize: 10 }} />
          <Line type="monotone" dataKey="foodSafety" stroke="#22c55e" strokeWidth={2} dot={false} name="Food Safety" />
          <Line type="monotone" dataKey="facilitySafety" stroke="#d4af37" strokeWidth={2} dot={false} name="Facility Safety" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
