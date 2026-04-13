// CASINO-JIE-01 — Tribal Food Safety Advisory Banner
// Shows on food safety pages when org.food_safety_mode === 'advisory'.
// Fire safety pages show NO banner — fully functional under county AHJ.

import { ShieldAlert } from 'lucide-react';

export function TribalFoodSafetyAdvisory({ tribeName, advisoryText }) {
  const defaultText =
    'Food safety compliance for this property is governed by the ' +
    'Tribal Environmental Health Office (TEHO) under tribal sovereignty. ' +
    'EvidLY tracks fire safety and operational compliance in full. ' +
    'Tribe-specific food safety intelligence is in active development.';

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 mb-1">
            {tribeName
              ? `${tribeName} — Tribal Food Safety (Advisory Mode)`
              : 'Tribal Food Safety — Advisory Mode'}
          </p>
          <p className="text-sm text-amber-700">
            {advisoryText || defaultText}
          </p>
          <p className="text-xs text-amber-600 mt-2">
            Fire safety and operational compliance are fully tracked and scored.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TribalFoodSafetyAdvisory;
