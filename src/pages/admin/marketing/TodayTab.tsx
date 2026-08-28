/**
 * TodayTab — the day's starting surface.
 *
 * The follow-up queue used to live here. It moved to its own tab, so this
 * keeps what it always had alongside it — adherence, channel cadences and
 * Start today — and points at Follow-ups rather than duplicating the queue.
 */
import { Link } from 'react-router-dom';
import { EV_NAVY, EV_EMBER, DISPLAY } from './marketingTokens';
import { ArrowRight } from 'lucide-react';
import ChannelCadences from './ChannelCadences';
import StartToday from './StartToday';
import AdherenceCards from './AdherenceCards';

export default function TodayTab() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Adherence cards */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
          The number you are graded on
        </h3>
        <AdherenceCards today={today} />
      </div>

      {/* The queue lives on its own tab now. */}
      <Link
        to="/admin/marketing/follow-ups"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
        style={{ color: EV_EMBER, textDecoration: 'none' }}
      >
        Follow-ups <ArrowRight size={13} />
      </Link>

      {/* Channel cadences */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
          Channel cadences
        </h3>
        <ChannelCadences />
      </div>

      {/* Start today */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
          Start today
        </h3>
        <StartToday today={today} />
      </div>
    </div>
  );
}
