import { Radio } from 'lucide-react';
import { toast } from 'sonner';
import { colors } from '../../lib/designSystem';
import { SupportedSensorsCard } from './SupportedSensorsCard';

// ── PRP tile data ────────────────────────────────────────────

const PRP_TILES = [
  {
    eyebrow: 'PREDICT',
    color: colors.warning,
    body: 'Sensors detect drift between manual checks. Catches problems hours before an operator\u2019s next probe reading.',
  },
  {
    eyebrow: 'REDUCE',
    color: colors.danger,
    body: 'Sensor + probe disagreement flags miscalibration or placement issues before they create a violation.',
  },
  {
    eyebrow: 'PROVE',
    color: colors.success,
    body: 'Continuous 24-hour coverage per unit. Every minute logged. Nothing missed between manual checks.',
  },
] as const;

// ── Component ────────────────────────────────────────────────

export function LiveSensorsEmptyState() {
  const handleConnect = () => {
    // TODO: Wire to sensor integration flow once vendor APIs are integrated
    toast.info(
      'Sensor integration coming soon. Contact founders@getevidly.com to join the early access list.',
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero empty state */}
      <div
        className="rounded-xl flex flex-col items-center text-center py-14 px-6"
        style={{ backgroundColor: colors.cream, border: `2px dashed ${colors.border}` }}
      >
        {/* Icon */}
        <div
          className="w-[54px] h-[54px] rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: colors.infoSoft }}
        >
          <Radio className="h-[38px] w-[38px]" style={{ color: colors.navy }} />
        </div>

        {/* Heading */}
        <h3
          className="text-[22px] font-bold tracking-tight mb-3"
          style={{ color: colors.navy, fontFamily: "'Montserrat', sans-serif" }}
        >
          No sensors connected
        </h3>

        {/* Body */}
        <p
          className="text-sm mb-6"
          style={{
            color: colors.textMuted,
            maxWidth: 520,
            lineHeight: 1.55,
          }}
        >
          Connect your first IoT sensor to capture temperatures in real time.
          EvidLY identifies drift before it becomes a violation, cross-confirms
          sensor readings against your manual probe checks, and assembles
          continuous coverage for the inspector.
        </p>

        {/* PRP tiles */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-5"
          style={{ maxWidth: 720 }}
        >
          {PRP_TILES.map(tile => (
            <div
              key={tile.eyebrow}
              className="rounded-lg border text-left p-3.5"
              style={{
                backgroundColor: colors.white,
                borderColor: colors.border,
                borderTopWidth: 3,
                borderTopColor: tile.color,
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase mb-1.5"
                style={{ color: tile.color, letterSpacing: '0.12em' }}
              >
                {tile.eyebrow}
              </p>
              <p
                className="text-xs"
                style={{ color: colors.textMuted, lineHeight: 1.45 }}
              >
                {tile.body}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleConnect}
          className="inline-flex items-center gap-1.5 rounded-lg font-bold"
          style={{
            backgroundColor: colors.navy,
            color: colors.cream,
            padding: '12px 22px',
            fontSize: 14,
            minHeight: 44,
          }}
        >
          + Connect your first sensor
        </button>
      </div>

      {/* TODO: Connected-state UI — sensor table, live readings, cross-check, alerts log.
         Requires vendor API integration (future sprint). */}

      {/* Supported sensors */}
      <SupportedSensorsCard />
    </div>
  );
}
