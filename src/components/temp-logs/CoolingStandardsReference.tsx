import { colors, shadows } from '../../lib/designSystem';

// ── Component ──────────────────────────────────────────────────

export function CoolingStandardsReference() {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: colors.white,
        borderColor: colors.border,
        boxShadow: shadows.sm,
      }}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold" style={{ color: colors.textPrimary }}>
            Cooling Standards Reference
          </h3>
          <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
            FDA and California require the same two-stage cooldown.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Stage rows */}
      <div className="space-y-3">
        {/* Stage 1 */}
        <div className="flex items-start gap-3">
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: `${colors.gold}20`, color: colors.gold }}
          >
            1
          </span>
          <div>
            <p className="text-base font-semibold" style={{ color: colors.textPrimary }}>
              135°F → 70°F within 2 hours
            </p>
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              Clock starts at 135°F
            </p>
          </div>
        </div>

        {/* Stage 2 */}
        <div className="flex items-start gap-3">
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: `${colors.success}15`, color: colors.success }}
          >
            2
          </span>
          <div>
            <p className="text-base font-semibold" style={{ color: colors.textPrimary }}>
              70°F → 41°F within 4 more hours
            </p>
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              6 hours total from 135°F
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
