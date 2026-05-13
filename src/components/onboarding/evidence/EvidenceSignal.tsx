import { AlertTriangle } from 'lucide-react';
import type { EvidenceSignalData } from '../../../hooks/onboarding/useItemEvidenceTrail';

interface EvidenceSignalProps {
  signals: EvidenceSignalData[];
}

export function EvidenceSignal({ signals }: EvidenceSignalProps) {
  if (signals.length === 0) return null;

  return (
    <div className="mx-4 mt-2 px-3 py-2 bg-[#FFF8E1] border border-[#FFE082] rounded-lg">
      <div className="flex items-center gap-1.5 mb-1">
        <AlertTriangle size={12} className="text-[#AD6200]" />
        <span className="text-[10px] font-semibold text-[#AD6200] uppercase tracking-wider">
          EvidLY Signal
        </span>
      </div>
      {signals.map(s => (
        <p key={s.id} className="text-xs text-[#1E2D4D]/80">
          Pattern detected: &ldquo;{s.pattern_text}&rdquo; found across{' '}
          {s.thread_ids.length} items in the last 60 days
        </p>
      ))}
    </div>
  );
}
