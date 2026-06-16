import { TrendingUp } from 'lucide-react';
import { useDemoGuard } from '../hooks/useDemoGuard';

export function ComplianceTrends() {
  useDemoGuard();

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: '#1E2D4D' }}
        >
          <TrendingUp className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1E2D4D]">Compliance Trends</h1>
          <p className="text-sm text-[#1E2D4D]/50">
            Track compliance trajectory across locations and categories
          </p>
        </div>
      </div>

      {/* Placeholder state */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8 text-center">
        <TrendingUp className="w-10 h-10 text-[#1E2D4D]/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-[#1E2D4D]/80">
          Compliance trends are being updated to show operational metrics.
        </p>
        <p className="text-xs text-[#1E2D4D]/50 mt-1">
          Manufactured score data has been removed. Operational metric trends will appear here.
        </p>
      </div>
    </div>
  );
}
