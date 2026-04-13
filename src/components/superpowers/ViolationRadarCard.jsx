// SUPERPOWERS-APP-01 — SP2: Violation Risk Radar Card
import { Target, AlertTriangle, ShieldAlert, Info } from 'lucide-react';

const SEVERITY_STYLES = {
  critical: { bg: 'bg-[#991B1B]/10', text: 'text-[#991B1B]', label: 'Critical' },
  major: { bg: 'bg-[#A08C5A]/10', text: 'text-[#A08C5A]', label: 'Major' },
  minor: { bg: 'bg-[#166534]/10', text: 'text-[#166534]', label: 'Minor' },
};

export function ViolationRadarCard({ risks }) {
  if (!risks || risks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#F4F6FA] rounded-lg">
            <Target className="h-5 w-5 text-[#1E2D4D]" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#0B1628]">Violation Risk Radar</h3>
        </div>
        <div className="text-center py-8">
          <ShieldAlert className="h-10 w-10 text-[#D1D9E6] mx-auto mb-3" />
          <p className="text-sm text-[#6B7F96]">No operational data to analyze</p>
          <p className="text-xs text-[#6B7F96] mt-1">Risk analysis requires active temperature logs, documents, and corrective actions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F4F6FA] rounded-lg">
            <Target className="h-5 w-5 text-[#1E2D4D]" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#0B1628]">Violation Risk Radar</h3>
        </div>
        <span className="text-xs text-[#6B7F96]">{risks.length} potential risk{risks.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-3 mb-4">
        {risks.map((risk, i) => {
          const style = SEVERITY_STYLES[risk.severity];
          return (
            <div key={i} className="border border-[#E8EDF5] rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${style.text}`} />
                  <span className="text-sm font-medium text-[#0B1628]">{risk.category}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
              <p className="text-xs text-[#3D5068] mb-3">{risk.description}</p>

              {/* Probability bar */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[#6B7F96] w-20">Estimated risk</span>
                <div className="flex-1 h-2 bg-[#EEF1F7] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      risk.probability >= 70 ? 'bg-[#991B1B]' :
                      risk.probability >= 40 ? 'bg-[#A08C5A]' :
                      'bg-[#166534]'
                    }`}
                    style={{ width: `${risk.probability}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-[#3D5068] w-8 text-right">{risk.probability}%</span>
              </div>

              {/* Suggested action */}
              <div className="flex items-start gap-1.5 mt-2 p-2 bg-[#F4F6FA] rounded">
                <Info className="h-3 w-3 text-[#6B7F96] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#6B7F96]">{risk.suggestedAction}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[#6B7F96] border-t border-[#E8EDF5] pt-3">
        This analysis is advisory only — risk estimates are based on current operational data and may not reflect actual inspection outcomes. Inspector findings are determined solely by your local health authority.
      </p>
    </div>
  );
}
