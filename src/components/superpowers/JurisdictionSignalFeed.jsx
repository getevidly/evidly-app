// SUPERPOWERS-APP-01 — SP6: Jurisdiction Signal Feed
import { useState } from 'react';
import { Radio, AlertTriangle, Info, AlertCircle, Filter } from 'lucide-react';

const SEVERITY_STYLES = {
  critical: { bg: 'bg-[#991B1B]/10', text: 'text-[#991B1B]', border: 'border-[#991B1B]/20', label: 'Critical' },
  high: { bg: 'bg-[#991B1B]/10', text: 'text-[#991B1B]', border: 'border-[#991B1B]/20', label: 'High' },
  medium: { bg: 'bg-[#A08C5A]/10', text: 'text-[#A08C5A]', border: 'border-[#A08C5A]/20', label: 'Medium' },
  low: { bg: 'bg-[#166534]/10', text: 'text-[#166534]', border: 'border-[#166534]/20', label: 'Low' },
  info: { bg: 'bg-[#1E2D4D]/10', text: 'text-[#1E2D4D]', border: 'border-[#1E2D4D]/20', label: 'Info' },
};

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'health', label: 'Health' },
  { value: 'fire', label: 'Fire' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'legislative', label: 'Legislative' },
];

export function JurisdictionSignalFeed({ signals }) {
  const [categoryFilter, setCategoryFilter] = useState('all');

  if (!signals || signals.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#F4F6FA] rounded-lg">
            <Radio className="h-5 w-5 text-[#1E2D4D]" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#0B1628]">Jurisdiction Signals</h3>
        </div>
        <div className="text-center py-8">
          <Radio className="h-10 w-10 text-[#D1D9E6] mx-auto mb-3" />
          <p className="text-sm text-[#6B7F96]">No regulatory signals for your jurisdiction</p>
          <p className="text-xs text-[#6B7F96] mt-1">Signals are sourced from 80+ regulatory and legislative feeds</p>
        </div>
      </div>
    );
  }

  const filtered = categoryFilter === 'all'
    ? signals
    : signals.filter(s => s.category === categoryFilter);

  return (
    <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F4F6FA] rounded-lg">
            <Radio className="h-5 w-5 text-[#1E2D4D]" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#0B1628]">Jurisdiction Signals</h3>
        </div>
        <span className="text-xs text-[#6B7F96]">{signals.length} signal{signals.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <Filter className="h-3.5 w-3.5 text-[#6B7F96] flex-shrink-0" />
        {CATEGORY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setCategoryFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              categoryFilter === opt.value
                ? 'bg-[#1E2D4D] text-white'
                : 'bg-[#F4F6FA] text-[#3D5068] hover:bg-[#EEF1F7]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Signal cards */}
      <div className="space-y-3 mb-4 max-h-[500px] overflow-y-auto">
        {filtered.map((signal, i) => {
          const severity = SEVERITY_STYLES[signal.ai_urgency] || SEVERITY_STYLES.info;
          return (
            <div key={signal.id || i} className={`border rounded-lg p-4 ${severity.border}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severity.bg} ${severity.text}`}>
                    {severity.label}
                  </span>
                  {signal.category && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F4F6FA] text-[#3D5068]">
                      {signal.category}
                    </span>
                  )}
                </div>
                {signal.published_at && (
                  <span className="text-xs text-[#6B7F96]">
                    {new Date(signal.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-medium text-[#0B1628] mb-1">{signal.title}</h4>
              {signal.summary && (
                <p className="text-xs text-[#3D5068] mb-2">{signal.summary}</p>
              )}
              {signal.county && (
                <p className="text-xs text-[#6B7F96]">
                  {signal.county} County{signal.source_name ? ` · ${signal.source_name}` : ''}
                </p>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-[#6B7F96] text-center py-4">No signals match this filter</p>
        )}
      </div>

      <p className="text-xs text-[#6B7F96] border-t border-[#E8EDF5] pt-3">
        Intelligence signals are advisory — sourced from public regulatory, legislative, and industry data feeds. Verify all information with official sources before taking action.
      </p>
    </div>
  );
}
