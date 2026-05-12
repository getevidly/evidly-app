import { AlertTriangle, Clock } from 'lucide-react';
import { expiryLabel } from '../../lib/relativeTime';
import type { KitchenEmployeeIntelligence } from '../../hooks/documents/useKitchenEmployeeIntelligence';

interface Props {
  intel: KitchenEmployeeIntelligence;
}

/** Shows only when there are expiring/expired signals. Renders above the doc list. */
export function KitchenEmployeeIntelligenceBanner({ intel }: Props) {
  if (!intel.hasSignals) return null;

  const totalUrgent = intel.expiring.length + intel.expired.length;

  return (
    <div className="mb-4 rounded-lg border border-[#FDE68A] bg-[#FEF3C7] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <AlertTriangle size={14} className="text-[#D97706]" />
        <span className="text-[13px] font-bold text-[#92400E]">
          {totalUrgent} document{totalUrgent !== 1 ? 's' : ''} need attention
        </span>
      </div>

      {/* Signal rows */}
      <div className="border-t border-[#FDE68A]">
        {intel.expired.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-2 border-b border-[#FDE68A]/50 last:border-b-0 bg-[#FEE2E2]/30">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[#1E2D4D] truncate">{s.name}</p>
              <p className="text-[10px] text-[#8A93A6]">{s.type || 'Document'}</p>
            </div>
            <div className="flex items-center gap-1.5 ml-3">
              <Clock size={10} className="text-[#B91C1C]" />
              <span className="text-[10px] font-semibold text-[#B91C1C]">
                {expiryLabel(s.expiry_date)}
              </span>
            </div>
          </div>
        ))}
        {intel.expiring.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-2 border-b border-[#FDE68A]/50 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[#1E2D4D] truncate">{s.name}</p>
              <p className="text-[10px] text-[#8A93A6]">{s.type || 'Document'}</p>
            </div>
            <div className="flex items-center gap-1.5 ml-3">
              <Clock size={10} className="text-[#B45309]" />
              <span className="text-[10px] font-semibold text-[#B45309]">
                {expiryLabel(s.expiry_date)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
