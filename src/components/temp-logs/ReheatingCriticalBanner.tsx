import { AlertTriangle } from 'lucide-react';
import type { ReheatingTabSignals } from '../../hooks/temperatures/useReheatingTabSignals';

interface ReheatingCriticalBannerProps {
  signals: ReheatingTabSignals;
}

export function ReheatingCriticalBanner({ signals }: ReheatingCriticalBannerProps) {
  if (signals.loading) return null;

  // Critical: units below 165°F
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
            {signals.criticalUnits.length} unit{signals.criticalUnits.length !== 1 ? 's' : ''} below 165°F
          </p>
          <p className="text-xs mt-0.5 opacity-90">
            {signals.criticalUnits.join(', ')} — continue reheating until ≥165°F or discard.
          </p>
        </div>
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
            Reheating units have no readings logged today. Log a reading now.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
