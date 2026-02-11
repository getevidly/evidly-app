import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { MONTHLY_TRENDS } from '../../data/benchmarkData';

interface Props {
  locationId: string;
}

export function BenchmarkTrendAnalysis({ locationId }: Props) {
  const [months, setMonths] = useState<3 | 6 | 12>(12);
  const allData = MONTHLY_TRENDS[locationId] || MONTHLY_TRENDS['downtown'];
  const data = allData.slice(-months);

  const lastQ = allData.slice(-4);
  const prevQ = allData.slice(-8, -4);
  const currentQAvg = lastQ.length > 0 ? Math.round(lastQ.reduce((s, d) => s + d.yourScore, 0) / lastQ.length) : 0;
  const prevQAvg = prevQ.length > 0 ? Math.round(prevQ.reduce((s, d) => s + d.yourScore, 0) / prevQ.length) : 0;
  const quarterlyDelta = currentQAvg - prevQAvg;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Trend Analysis</h3>
          <p className="text-sm text-gray-500">Your score vs industry benchmarks over time</p>
        </div>
        <div className="flex items-center gap-1">
          {([3, 6, 12] as const).map(m => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className="px-3 py-1 text-xs font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: months === m ? '#1e4d6b' : 'transparent',
                color: months === m ? 'white' : '#64748b',
              }}
            >
              {m}mo
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={11} />
            <YAxis domain={[0, 100]} fontSize={11} />
            <Tooltip />
            <Legend />
            <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '90', position: 'right', fontSize: 10 }} />
            <ReferenceLine y={75} stroke="#eab308" strokeDasharray="3 3" label={{ value: '75', position: 'right', fontSize: 10 }} />
            <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '60', position: 'right', fontSize: 10 }} />
            <Line type="monotone" dataKey="yourScore" stroke="#1e4d6b" strokeWidth={3} dot={{ r: 3 }} name="Your Score" />
            <Line type="monotone" dataKey="verticalAvg" stroke="#d4af37" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="6 3" name="Restaurant Avg" />
            <Line type="monotone" dataKey="industryAvg" stroke="#94a3b8" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="6 3" name="Industry Avg" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quarterly summary */}
      <div className="mt-4 flex items-center gap-6 text-sm">
        <div>
          <span className="text-gray-500">Current quarter avg: </span>
          <span className="font-bold text-gray-900">{currentQAvg}</span>
        </div>
        <div>
          <span className="text-gray-500">Previous quarter avg: </span>
          <span className="font-bold text-gray-900">{prevQAvg}</span>
        </div>
        <div>
          <span className="text-gray-500">Change: </span>
          <span className="font-bold" style={{ color: quarterlyDelta >= 0 ? '#16a34a' : '#dc2626' }}>
            {quarterlyDelta >= 0 ? '+' : ''}{quarterlyDelta} pts
          </span>
        </div>
      </div>
    </div>
  );
}
