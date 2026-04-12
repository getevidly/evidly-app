// SUPERPOWERS-APP-01 — SP1: Inspection Forecast Card
import { Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const RISK_STYLES = {
  low: { bg: 'bg-[#166534]/10', text: 'text-[#166534]', label: 'Low Risk' },
  moderate: { bg: 'bg-[#A08C5A]/10', text: 'text-[#A08C5A]', label: 'Moderate Risk' },
  high: { bg: 'bg-[#991B1B]/10', text: 'text-[#991B1B]', label: 'High Risk' },
};

const IMPACT_ICONS = {
  increases_likelihood: <AlertTriangle className="h-3.5 w-3.5 text-[#991B1B]" />,
  decreases_likelihood: <CheckCircle className="h-3.5 w-3.5 text-[#166534]" />,
  neutral: <Clock className="h-3.5 w-3.5 text-[#6B7F96]" />,
};

export function InspectionForecastCard({ forecast }) {
  if (!forecast) {
    return (
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#F4F6FA] rounded-lg">
            <Calendar className="h-5 w-5 text-[#1E2D4D]" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#0B1628]">Inspection Forecast</h3>
        </div>
        <div className="text-center py-8">
          <Calendar className="h-10 w-10 text-[#D1D9E6] mx-auto mb-3" />
          <p className="text-sm text-[#6B7F96]">No inspection history available</p>
          <p className="text-xs text-[#6B7F96] mt-1">Forecasts require at least one prior inspection record</p>
        </div>
      </div>
    );
  }

  const riskStyle = RISK_STYLES[forecast.riskLevel];
  const earliestStr = forecast.earliestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const latestStr = forecast.latestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F4F6FA] rounded-lg">
            <Calendar className="h-5 w-5 text-[#1E2D4D]" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#0B1628]">Inspection Forecast</h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${riskStyle.bg} ${riskStyle.text}`}>
          {riskStyle.label}
        </span>
      </div>

      {/* Forecast Window */}
      <div className="bg-[#F4F6FA] rounded-lg p-4 mb-5">
        <p className="text-xs text-[#6B7F96] uppercase tracking-wider font-medium mb-2">Estimated Inspection Window</p>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-sm font-semibold text-[#0B1628]">{earliestStr}</p>
            <p className="text-xs text-[#6B7F96]">Earliest</p>
          </div>
          <div className="flex-1 h-px bg-[#D1D9E6] relative">
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center">
              <span className="text-xs text-[#6B7F96] bg-[#F4F6FA] px-2">to</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#0B1628]">{latestStr}</p>
            <p className="text-xs text-[#6B7F96]">Latest</p>
          </div>
        </div>
        {forecast.daysUntilEarliest > 0 && (
          <p className="text-xs text-[#3D5068] mt-3 text-center">
            Approximately {forecast.daysUntilEarliest} – {forecast.daysUntilLatest} days from now
          </p>
        )}
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-[#6B7F96]">Confidence:</span>
        <div className="flex-1 h-1.5 bg-[#EEF1F7] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#A08C5A] rounded-full transition-all"
            style={{ width: `${forecast.confidence}%` }}
          />
        </div>
        <span className="text-xs font-medium text-[#3D5068]">{forecast.confidence}%</span>
      </div>

      {/* Factors */}
      {forecast.factors.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs text-[#6B7F96] uppercase tracking-wider font-medium">Contributing Factors</p>
          {forecast.factors.map((factor, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#F4F6FA]">
              <div className="mt-0.5">{IMPACT_ICONS[factor.impact]}</div>
              <div>
                <p className="text-xs font-medium text-[#0B1628]">{factor.label}</p>
                <p className="text-xs text-[#6B7F96]">{factor.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Advisory Disclaimer */}
      <p className="text-xs text-[#6B7F96] border-t border-[#E8EDF5] pt-3">
        This forecast is advisory only — based on historical patterns and jurisdiction frequency data. Actual inspection timing is determined solely by your local health authority.
      </p>
    </div>
  );
}
