import { Thermometer } from 'lucide-react';
import { colors } from '../../lib/designSystem';

interface HotHoldingSectionHeaderProps {
  headerLabel: string;
  allPass: boolean;
  noneMeasured: boolean;
}

/**
 * Renders the hot holding section header INLINE (no card wrapper).
 * Intended to be placed inside the parent card in HoldingActiveStatus.
 */
export function HotHoldingSectionHeader({ headerLabel, allPass, noneMeasured }: HotHoldingSectionHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-[26px] h-[26px] rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#EA580C' }}
          >
            <Thermometer className="h-3.5 w-3.5 text-white" />
          </div>
          <span
            className="text-[13px] uppercase font-bold"
            style={{ color: colors.textPrimary, letterSpacing: '0.05em' }}
          >
            Hot Holding
          </span>
        </div>
        <span
          className="px-2 py-0.5 text-[10px] font-medium rounded"
          style={{ backgroundColor: `${colors.navy}08`, color: colors.textSecondary, fontFamily: 'monospace' }}
        >
          FDA §3-501.16(A)(1) · CalCode §113996(a)
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: colors.textMuted }}>
        Must remain ≥135°F · check every 4 hours · 4h discard rule for held items
      </p>
      <span
        className="px-2.5 py-1 rounded-full text-xs font-semibold inline-block"
        style={{
          backgroundColor: noneMeasured
            ? colors.bgPanel
            : allPass
              ? colors.successSoft
              : colors.warningSoft,
          color: noneMeasured
            ? colors.textSecondary
            : allPass
              ? colors.success
              : colors.warning,
        }}
      >
        {headerLabel}
      </span>
    </div>
  );
}
