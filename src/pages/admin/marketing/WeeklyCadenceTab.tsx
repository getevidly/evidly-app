/**
 * WeeklyCadenceTab — the weekly target schedule.
 *
 * Was "Today". The adherence cards, Start today and the Follow-ups link
 * moved off this surface; what remains is the thing the tab is named for:
 * the channel cadences table and its week-by-week target editor.
 */
import { EV_NAVY, EV_MUTED, EV_LINE, EV_PAPER, EV_EMBER, DISPLAY, BODY } from './marketingTokens';
import ChannelCadences from './ChannelCadences';

export default function WeeklyCadenceTab() {
  return (
    <div>
      {/* Heading */}
      <h1
        className="text-[26px] font-semibold tracking-[-0.01em] m-0 mb-1"
        style={{ color: EV_NAVY, fontFamily: DISPLAY }}
      >
        Weekly target schedule
      </h1>
      <p
        className="text-[14px] m-0 mb-6 max-w-[640px]"
        style={{ color: EV_MUTED, fontFamily: BODY }}
      >
        Set a different target for specific upcoming weeks on any per-week channel — a ramp,
        not one fixed number. Weeks you don't set fall back to the channel's baseline.
      </p>

      {/* Explainer */}
      <div
        className="border rounded-xl px-[18px] py-4 mb-[22px] flex gap-3.5 items-start"
        style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}
      >
        <span
          className="w-2 h-2 rounded-full mt-[7px] flex-none"
          style={{ backgroundColor: EV_EMBER }}
        />
        <p className="text-[14px] m-0" style={{ color: EV_MUTED, fontFamily: BODY }}>
          <b style={{ color: EV_NAVY }}>How it reads.</b> The &quot;this week&quot; number on each
          per-week channel is <b style={{ color: EV_NAVY }}>the target scheduled for that week</b>.
          Set next week to 9 and the week after to 11, and the target rises with it — automatically,
          as the calendar moves.
        </p>
      </div>

      {/* Section head */}
      <div className="flex items-baseline gap-3 mt-1.5 mb-3">
        <h2 className="text-[18px] font-semibold m-0" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
          Channel cadences
        </h2>
        <span className="text-[12.5px]" style={{ color: EV_MUTED, fontFamily: BODY }}>
          Per-week channels show a Schedule link — open it to set week-by-week targets.
        </span>
      </div>

      <ChannelCadences />
    </div>
  );
}
