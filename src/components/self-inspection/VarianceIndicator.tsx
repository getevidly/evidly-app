// ═══════════════════════════════════════════════════════════════════
// VarianceIndicator.tsx
// Shows an amber badge on inspection items that differ materially
// from the CalCode standard for the active jurisdiction.
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { JurisdictionVariance } from '../../data/selfInspectionChecklist';

interface VarianceIndicatorProps {
  variance: JurisdictionVariance;
}

const VARIANCE_TYPE_LABELS: Record<string, string> = {
  stricter_threshold: 'Stricter Threshold',
  additional_requirement: 'Additional Requirement',
  different_citation: 'Different Citation',
  different_penalty: 'Different Penalty',
};

export function VarianceIndicator({ variance }: VarianceIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <AlertTriangle className="h-3 w-3" />
        <span>Jurisdiction Variance</span>
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {expanded && (
        <div className="mt-1.5 rounded-md border border-amber-200 bg-amber-50/50 p-2.5 text-xs text-amber-800">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
              {VARIANCE_TYPE_LABELS[variance.varianceType] || variance.varianceType}
            </span>
          </div>
          <p className="mb-1.5 leading-relaxed">{variance.description}</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <div className="font-semibold text-amber-600">CalCode Standard</div>
              <div className="text-amber-700">{variance.standardValue}</div>
            </div>
            <div>
              <div className="font-semibold text-amber-600">This Jurisdiction</div>
              <div className="text-amber-700">{variance.jurisdictionValue}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
