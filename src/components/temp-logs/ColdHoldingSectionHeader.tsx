import { Snowflake } from 'lucide-react';
import { colors } from '../../lib/designSystem';

interface ColdHoldingSectionHeaderProps {
  headerLabel: string;
  allPass: boolean;
  noneMeasured: boolean;
}

/**
 * Renders the cold holding section header INLINE (no card wrapper).
 * Intended to be placed inside the parent card in HoldingActiveStatus.
 */
export function ColdHoldingSectionHeader({ headerLabel, allPass, noneMeasured }: ColdHoldingSectionHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-[26px] h-[26px] rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#2563EB' }}
          >
            <Snowflake className="h-3.5 w-3.5 text-white" />
          </div>
          <span
            className="text-[13px] uppercase font-bold"
            style={{ color: colors.textPrimary, letterSpacing: '0.05em' }}
          >
            Cold Holding
          </span>
        </div>
        <span
          className="px-2 py-0.5 text-[10px] font-medium rounded"
          style={{ backgroundColor: `${colors.navy}08`, color: colors.textSecondary, fontFamily: 'monospace' }}
        >
          <span style={{ fontWeight: 700, color: colors.navy }}>CalCode §113996(b)</span>
          <span style={{ color: colors.textMuted }}> · FDA §3-501.16(A)(2)</span>
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: colors.textMuted }}>
        Must remain ≤41°F · check every 4 hours · date-mark if held &gt;24 hours
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
