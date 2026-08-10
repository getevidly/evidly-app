/**
 * SERPTab — CONNECT tab for rank-tracking provider data.
 *
 * Shows ConnectBanner + dimmed PreviewGate until a rank-tracking
 * provider is chosen and linked.  No typed input, no placeholder
 * figures — structure only.
 */
import { TrendingUp } from 'lucide-react';
import { ConnectBanner, PreviewGate, KpiMini } from './marketingPrimitives';
import { EV_LINE, EV_PAPER, EV_NAVY, EV_MUTED, DISPLAY } from './marketingTokens';

export default function SERPTab() {
  return (
    <div className="space-y-5">
      {/* CONNECT — no rank-tracking provider chosen yet */}
      <ConnectBanner
        Icon={TrendingUp}
        name="SERP Rank Tracking"
        blurb="No rank-tracking provider is chosen yet — rankings, share of voice, and content gaps will appear here."
      />

      <PreviewGate>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiMini l="Tracked Keywords" v="—" />
          <KpiMini l="Avg Rank" v="—" />
          <KpiMini l="Share of Voice" v="—" />
          <KpiMini l="Content Gaps" v="—" />
        </div>

        <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: EV_LINE }}>
            <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Keyword Rankings</h4>
            <div className="text-[11px] mt-0.5" style={{ color: EV_MUTED }}>Populated once a provider is connected</div>
          </div>
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: EV_MUTED }}>
            No data yet
          </div>
        </div>
      </PreviewGate>
    </div>
  );
}
