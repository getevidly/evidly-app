/**
 * GoogleAdsTab — CONNECT tab for Google Ads account data.
 *
 * Shows ConnectBanner + dimmed PreviewGate until the Google Ads
 * account is linked.  No typed input, no placeholder figures —
 * structure only.
 */
import { Megaphone } from 'lucide-react';
import { ConnectBanner, PreviewGate, KpiMini } from './marketingPrimitives';
import { EV_LINE, EV_PAPER, EV_NAVY, EV_MUTED, DISPLAY } from './marketingTokens';

export default function GoogleAdsTab() {
  return (
    <div className="space-y-5">
      {/* CONNECT — Google Ads account */}
      <ConnectBanner
        Icon={Megaphone}
        name="Google Ads"
        blurb="Spend, clicks, CPC, and cost per demo by campaign — connect the Google Ads account to fill."
      />

      <PreviewGate>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiMini l="Spend" v="—" />
          <KpiMini l="Clicks" v="—" />
          <KpiMini l="CPC" v="—" />
          <KpiMini l="Cost / Demo" v="—" />
        </div>

        <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: EV_LINE }}>
            <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Campaign Breakdown</h4>
            <div className="text-[11px] mt-0.5" style={{ color: EV_MUTED }}>Populated from Google Ads</div>
          </div>
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: EV_MUTED }}>
            No data yet
          </div>
        </div>
      </PreviewGate>
    </div>
  );
}
