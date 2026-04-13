import { TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';
import { LEAD_LAG_DATA } from '../../data/benchmarkData';

interface Props {
  locationId: string;
}

export function BenchmarkLeadLag({ locationId }: Props) {
  const data = LEAD_LAG_DATA[locationId] || LEAD_LAG_DATA['all'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Where You Lead */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">Where You Lead</h3>
        </div>
        <div className="space-y-3">
          {data.leads.map((item, i) => (
            <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-900">{item.subcategory}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                  {item.percentile}th pctl
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>You: <strong>{item.yourScore}%</strong></span>
                <span className="text-gray-300">|</span>
                <span>Avg: {item.verticalAvg}%</span>
                <span className="font-semibold text-green-600">
                  +{Math.abs(item.delta)} pts above
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Where You Lag */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">Where You Lag</h3>
        </div>
        <div className="space-y-3">
          {data.lags.map((item, i) => (
            <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-900">{item.subcategory}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                  {item.percentile}th pctl
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                <span>You: <strong>{item.yourScore}%</strong></span>
                <span className="text-gray-300">|</span>
                <span>Avg: {item.verticalAvg}%</span>
                <span className="font-semibold text-red-600">
                  {item.delta} pts below
                </span>
              </div>
              {item.recommendation && (
                <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-red-100">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-gray-600 leading-relaxed">{item.recommendation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
