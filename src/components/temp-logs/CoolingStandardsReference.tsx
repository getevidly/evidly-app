import { colors, shadows } from '../../lib/designSystem';

// ── Component ──────────────────────────────────────────────────

export function CoolingStandardsReference() {
  return (
    <div
      className="rounded-xl border p-4 sm:p-5"
      style={{
        backgroundColor: colors.white,
        borderColor: colors.border,
        boxShadow: shadows.sm,
      }}
    >
      {/* Title + badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="text-sm font-bold" style={{ color: colors.textPrimary }}>
          Cooling Standards Reference
        </h3>
        <span
          className="px-2 py-0.5 text-xs font-semibold rounded"
          style={{ backgroundColor: `${colors.navy}10`, color: colors.navy }}
        >
          FDA §3-501.14
        </span>
        <span
          className="px-2 py-0.5 text-xs font-semibold rounded"
          style={{ backgroundColor: `${colors.gold}15`, color: colors.gold }}
        >
          CalCode §114002(b)
        </span>
      </div>

      {/* Stage rows */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6">
        {/* Stage 1 */}
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: `${colors.gold}20`, color: colors.gold }}
          >
            1
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
              135°F → 70°F within 2 hours
            </p>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              Clock starts at 135°F
            </p>
          </div>
        </div>

        {/* Stage 2 */}
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: `${colors.success}15`, color: colors.success }}
          >
            2
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
              70°F → 41°F within 4 more hours
            </p>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              6 hours total from 135°F
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
