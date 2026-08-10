/**
 * FounderWindowTab — DERIVED tab (computed, nothing typed).
 *
 * Reads founder seat count LIVE from the get_founder_count RPC
 * (the same RPC the Overview KPI strip uses). Shows seats claimed,
 * the 250-seat cap, and remaining. The RPC returns a single integer
 * (count of organizations with plan_tier = 'founder') — it does NOT
 * provide a per-status breakdown.
 *
 * No hand-entered number anywhere — a typed seat count goes stale
 * the moment someone signs.
 */
import { Flame } from 'lucide-react';
import { useFounderCount, FOUNDER_CAP } from '../../../hooks/useFounderCount';
import { KpiMini } from './marketingPrimitives';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_LINE, EV_PAPER,
  EV_SUCCESS, EV_WARN, EV_DANGER, DISPLAY, BODY,
} from './marketingTokens';

// ── Component ────────────────────────────────────────────────────

export default function FounderWindowTab() {
  const { founderCount, spotsRemaining, loading } = useFounderCount();

  if (loading) {
    return (
      <div className="p-10 text-center text-[13px]" style={{ color: EV_MUTED }}>
        Loading founder seat data...
      </div>
    );
  }

  const pctClaimed = FOUNDER_CAP > 0
    ? Math.round((founderCount / FOUNDER_CAP) * 100)
    : 0;

  // Accent color shifts as seats fill
  const barColor = spotsRemaining <= 25 ? EV_DANGER
    : spotsRemaining <= 75 ? EV_WARN
    : EV_SUCCESS;

  const urgencyLabel = spotsRemaining <= 25 ? 'Almost full'
    : spotsRemaining <= 75 ? 'Filling up'
    : 'Open';

  return (
    <div className="space-y-6">
      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiMini l="Seats Claimed" v={founderCount} accent={EV_NAVY} />
        <KpiMini l="Cap" v={FOUNDER_CAP} accent={EV_MUTED} />
        <KpiMini
          l="Remaining"
          v={spotsRemaining}
          sub={urgencyLabel}
          accent={barColor}
        />
      </div>

      {/* ── Hero gauge card ────────────────────────────────────── */}
      <div
        className="border rounded-lg p-6"
        style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 flex items-center justify-center rounded"
            style={{ backgroundColor: '#F6E9E3' }}
          >
            <Flame size={20} style={{ color: EV_EMBER }} />
          </div>
          <div>
            <h4
              className="text-[15px] font-bold"
              style={{ color: EV_NAVY, fontFamily: DISPLAY }}
            >
              Founder Window
            </h4>
            <div className="text-[11px]" style={{ color: EV_MUTED }}>
              First {FOUNDER_CAP} customers lock founder pricing for life
            </div>
          </div>
        </div>

        {/* Seat counter headline */}
        <div className="flex items-baseline gap-2 mb-4">
          <span
            className="text-[40px] font-bold"
            style={{ color: EV_NAVY, fontFamily: DISPLAY, lineHeight: 1 }}
          >
            {founderCount}
          </span>
          <span
            className="text-[18px] font-semibold"
            style={{ color: EV_MUTED, fontFamily: DISPLAY }}
          >
            / {FOUNDER_CAP}
          </span>
          <span
            className="text-[13px] font-medium ml-1"
            style={{ color: EV_MUTED, fontFamily: BODY }}
          >
            seats claimed
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div
            className="h-4 rounded-full overflow-hidden"
            style={{ backgroundColor: '#F0EDE5' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(pctClaimed, 100)}%`,
                backgroundColor: barColor,
                minWidth: founderCount > 0 ? 8 : 0,
              }}
            />
          </div>
        </div>

        {/* Labels under bar */}
        <div className="flex justify-between text-[11px]" style={{ color: EV_MUTED }}>
          <span>{pctClaimed}% claimed</span>
          <span>
            <span style={{ color: barColor, fontWeight: 700 }}>{spotsRemaining}</span> remaining
          </span>
        </div>
      </div>
    </div>
  );
}
