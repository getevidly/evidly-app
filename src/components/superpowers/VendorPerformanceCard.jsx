// SUPERPOWERS-APP-01 — SP4: Vendor Performance Card
import { Trophy, Store, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const GRADE_STYLES = {
  A: { bg: 'bg-[#166534]', text: 'text-white' },
  B: { bg: 'bg-[#166534]/80', text: 'text-white' },
  C: { bg: 'bg-[#A08C5A]', text: 'text-white' },
  D: { bg: 'bg-[#A08C5A]/70', text: 'text-white' },
  F: { bg: 'bg-[#991B1B]', text: 'text-white' },
};

const TREND_ICONS = {
  up: <TrendingUp className="h-3.5 w-3.5 text-[#166534]" />,
  down: <TrendingDown className="h-3.5 w-3.5 text-[#991B1B]" />,
  stable: <Minus className="h-3.5 w-3.5 text-[#6B7F96]" />,
};

const CATEGORY_BARS = [
  { key: 'timeliness', label: 'Timeliness', max: 40 },
  { key: 'certQuality', label: 'Cert Quality', max: 30 },
  { key: 'coiCurrent', label: 'COI Current', max: 15 },
  { key: 'noMissedServices', label: 'No Missed', max: 15 },
];

export function VendorPerformanceCard({ scores }) {
  if (!scores || scores.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#F4F6FA] rounded-lg">
            <Trophy className="h-5 w-5 text-[#1E2D4D]" />
          </div>
          <h3 className="text-lg font-semibold text-[#0B1628]">Vendor Performance</h3>
        </div>
        <div className="text-center py-8">
          <Store className="h-10 w-10 text-[#D1D9E6] mx-auto mb-3" />
          <p className="text-sm text-[#6B7F96]">No vendor service records available</p>
          <p className="text-xs text-[#6B7F96] mt-1">Performance scores require active vendor service history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F4F6FA] rounded-lg">
            <Trophy className="h-5 w-5 text-[#1E2D4D]" />
          </div>
          <h3 className="text-lg font-semibold text-[#0B1628]">Vendor Performance</h3>
        </div>
        <span className="text-xs text-[#6B7F96]">{scores.length} vendor{scores.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-4 mb-4">
        {scores.map((vendor) => {
          const gradeStyle = GRADE_STYLES[vendor.letterGrade] || GRADE_STYLES.F;
          return (
            <div key={vendor.vendorId} className="border border-[#E8EDF5] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${gradeStyle.bg} ${gradeStyle.text}`}>
                    {vendor.letterGrade}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0B1628]">{vendor.vendorName}</p>
                    <p className="text-[11px] text-[#6B7F96]">{vendor.serviceCount} service record{vendor.serviceCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {TREND_ICONS[vendor.trend]}
                  <span className="text-lg font-bold text-[#0B1628]">{vendor.totalScore}</span>
                  <span className="text-xs text-[#6B7F96]">/100</span>
                </div>
              </div>

              {/* Category breakdown bars */}
              <div className="space-y-1.5">
                {CATEGORY_BARS.map(cat => {
                  const value = vendor[cat.key];
                  const pct = (value / cat.max) * 100;
                  return (
                    <div key={cat.key} className="flex items-center gap-2">
                      <span className="text-[10px] text-[#6B7F96] w-16 truncate">{cat.label}</span>
                      <div className="flex-1 h-1.5 bg-[#EEF1F7] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 80 ? 'bg-[#166534]' : pct >= 50 ? 'bg-[#A08C5A]' : 'bg-[#991B1B]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#3D5068] w-10 text-right">{value}/{cat.max}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-[#6B7F96] border-t border-[#E8EDF5] pt-3">
        Vendor scores are based on service records and documentation on file. Scores are advisory and may not reflect overall vendor quality.
      </p>
    </div>
  );
}
