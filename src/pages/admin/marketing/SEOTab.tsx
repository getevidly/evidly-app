/**
 * SEOTab — CONNECT tab for Google Search Console data.
 *
 * Shows ConnectBanner + dimmed PreviewGate until the Search Console
 * OAuth connection is established.  No typed input, no placeholder
 * figures — structure only.
 */
import { Search } from 'lucide-react';
import { ConnectBanner, PreviewGate, KpiMini } from './marketingPrimitives';
import { EV_LINE, EV_PAPER, EV_NAVY, EV_MUTED, DISPLAY } from './marketingTokens';

export default function SEOTab() {
  return (
    <div className="space-y-5">
      {/* CONNECT — Google Search Console */}
      <ConnectBanner
        Icon={Search}
        name="Google Search Console"
        blurb="Organic impressions, clicks, average position, and top queries — connect Search Console to fill."
      />

      <PreviewGate>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiMini l="Impressions" v="—" />
          <KpiMini l="Clicks" v="—" />
          <KpiMini l="Avg Position" v="—" />
          <KpiMini l="CTR" v="—" />
        </div>

        <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: EV_LINE }}>
            <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Top Queries</h4>
            <div className="text-[11px] mt-0.5" style={{ color: EV_MUTED }}>Populated from Search Console</div>
          </div>
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: EV_MUTED }}>
            No data yet
          </div>
        </div>
      </PreviewGate>
    </div>
  );
}
