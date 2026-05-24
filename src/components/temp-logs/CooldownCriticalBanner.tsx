import { AlertTriangle, Clock } from 'lucide-react';
import type { CooldownTabSignals } from '../../hooks/temperatures/useCooldownTabSignals';

interface CooldownCriticalBannerProps {
  signals: CooldownTabSignals;
}

export function CooldownCriticalBanner({ signals }: CooldownCriticalBannerProps) {
  if (signals.loading) return null;

  // Red: failed cooldown without disposition
  if (signals.needsDisposition > 0) {
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
            {signals.needsDisposition} failed cooldown{signals.needsDisposition !== 1 ? 's' : ''} — disposition required
          </p>
          <p className="text-xs mt-0.5 opacity-90">
            CalCode §114002 requires documentation of the corrective action taken when a cooldown fails.
          </p>
        </div>
      </div>
    );
  }

  // Amber: active cooldowns approaching deadline
  if (signals.atRisk > 0) {
    return (
      <div
        className="rounded-xl p-4 mb-4 flex items-start gap-3"
        style={{ backgroundColor: 'rgba(194,115,26,0.1)', border: '1px solid rgba(194,115,26,0.3)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(194,115,26,0.15)' }}
        >
          <Clock className="w-4 h-4" style={{ color: '#c2731a' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: '#c2731a' }}>
            {signals.atRisk} cooldown{signals.atRisk !== 1 ? 's' : ''} approaching deadline
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#c2731a', opacity: 0.85 }}>
            Check temperatures now. If the target can't be met, begin disposition.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
