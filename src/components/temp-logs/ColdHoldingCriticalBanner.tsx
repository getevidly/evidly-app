import { AlertTriangle } from 'lucide-react';
import type { ColdHoldingTabSignals } from '../../hooks/temperatures/useColdHoldingTabSignals';

interface ColdHoldingCriticalBannerProps {
  signals: ColdHoldingTabSignals;
}

export function ColdHoldingCriticalBanner({ signals }: ColdHoldingCriticalBannerProps) {
  if (signals.loading) return null;

  // Critical: units above 41°F
  if (signals.criticalUnits.length > 0) {
    return (
      <div
        className="rounded-xl p-4 mb-4 flex items-start gap-3"
        style={{ backgroundColor: '#b3261e', color: 'white' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <AlertTriangle className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">
            {signals.criticalUnits.length} unit{signals.criticalUnits.length !== 1 ? 's' : ''} above 41°F
          </p>
          <p className="text-xs mt-0.5 opacity-90">
            {signals.criticalUnits.join(', ')} — TCS items at risk of spoilage. Verify and document discard if needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const firstCard = document.querySelector('[data-unit-critical="true"]');
            firstCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          View →
        </button>
      </div>
    );
  }

  // Stale: no recent readings but no critical
  if (signals.staleUnits.length > 0) {
    return (
      <div
        className="rounded-xl p-4 mb-4 flex items-start gap-3"
        style={{ backgroundColor: 'rgba(194,115,26,0.1)', border: '1px solid rgba(194,115,26,0.3)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(194,115,26,0.15)' }}
        >
          <AlertTriangle className="w-4 h-4" style={{ color: '#c2731a' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: '#c2731a' }}>
            No recent readings
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#c2731a', opacity: 0.85 }}>
            All units are past the 4-hour check interval. Log a reading now.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
