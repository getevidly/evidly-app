import { ArrowRight } from 'lucide-react';
import { EvidlyIcon } from './ui/EvidlyIcon';
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
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <EvidlyIcon size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">Insurance Risk Score</h3>
            <p className="text-xs text-[#1E2D4D]/50">Designed to support carrier conversations</p>
          </div>
        </div>
        <button
          onClick={() => navigate(locationId === 'all' ? '/insurance-risk' : `/insurance-risk?location=${locationId}`)}
          className="text-sm font-medium flex items-center gap-1 hover:underline"
          style={{ color: '#1E2D4D' }}
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
            <div className="text-2xl font-bold tracking-tight" style={{ color: tierInfo.color }}>{riskData.overall}</div>
          </div>
          <div
            className="mt-2 text-xs font-bold px-2 py-0.5 rounded-full inline-block"
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
                  <span className="text-xs text-[#1E2D4D]/70">{cat.name} <span className="text-[#1E2D4D]/30">({Math.round(cat.weight * 100)}%)</span></span>
                  <span className="text-xs font-bold" style={{ color: catTier.color }}>{cat.score}</span>
                </div>
                <div className="w-full h-2 bg-[#1E2D4D]/5 rounded-full overflow-hidden">
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
        <div className="mt-4 pt-3 border-t border-[#1E2D4D]/5 flex items-center justify-between">
          <span className="text-xs text-[#1E2D4D]/30">{riskData.actionItems.length} improvement actions available</span>
          <button
            onClick={() => navigate(locationId === 'all' ? '/insurance-risk' : `/insurance-risk?location=${locationId}`)}
            className="text-xs font-medium flex items-center gap-1 hover:underline"
            style={{ color: '#1E2D4D' }}
          >
            View actions <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
