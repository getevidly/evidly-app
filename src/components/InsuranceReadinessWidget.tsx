import { Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  calculateInsuranceRiskScore,
  calculateOrgInsuranceRiskScore,
  getInsuranceRiskTier,
} from '../lib/insuranceRiskScore';

interface InsuranceReadinessWidgetProps {
  locationId: string;
}

export function InsuranceReadinessWidget({ locationId }: InsuranceReadinessWidgetProps) {
  const navigate = useNavigate();

  const riskData = locationId === 'all'
    ? calculateOrgInsuranceRiskScore()
    : calculateInsuranceRiskScore(locationId);

  const tierInfo = getInsuranceRiskTier(riskData.overall);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <Shield className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Insurance Risk Score</h3>
            <p className="text-xs text-gray-500">Designed to support carrier conversations</p>
          </div>
        </div>
        <button
          onClick={() => navigate(locationId === 'all' ? '/insurance-risk' : `/insurance-risk?location=${locationId}`)}
          className="text-sm font-medium flex items-center gap-1 hover:underline"
          style={{ color: '#1e4d6b' }}
        >
          View Full Report <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Score + Categories */}
      <div className="flex items-center gap-6">
        {/* Score Circle */}
        <div className="flex-shrink-0 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center border-[3px]"
            style={{ borderColor: tierInfo.color, backgroundColor: tierInfo.bg }}
          >
            <div className="text-2xl font-bold" style={{ color: tierInfo.color }}>{riskData.overall}</div>
          </div>
          <div
            className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block"
            style={{ backgroundColor: tierInfo.bg, color: tierInfo.color, border: `1px solid ${tierInfo.color}` }}
          >
            {riskData.tier}
          </div>
        </div>

        {/* Category Bars */}
        <div className="flex-1 space-y-2.5">
          {riskData.categories.map(cat => {
            const catTier = getInsuranceRiskTier(cat.score);
            return (
              <div key={cat.key}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-gray-600">{cat.name} <span className="text-gray-400">({Math.round(cat.weight * 100)}%)</span></span>
                  <span className="text-xs font-bold" style={{ color: catTier.color }}>{cat.score}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, cat.score)}%`, backgroundColor: catTier.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action hint */}
      {riskData.actionItems.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">{riskData.actionItems.length} improvement actions available</span>
          <button
            onClick={() => navigate(locationId === 'all' ? '/insurance-risk' : `/insurance-risk?location=${locationId}`)}
            className="text-[11px] font-medium flex items-center gap-1 hover:underline"
            style={{ color: '#1e4d6b' }}
          >
            View actions <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
