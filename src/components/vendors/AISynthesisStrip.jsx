import { Sparkles } from 'lucide-react';

/**
 * AISynthesisStrip — "EvidLY says" forward-looking AI answer strip.
 * Appears below sub-tabs on every vendors surface.
 */
export function AISynthesisStrip({ message, onAskEvidLY }) {
  if (!message) return null;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3.5 mb-4 rounded-lg"
      style={{ backgroundColor: '#FCFBF8', border: '1px solid #E2DDD4' }}
    >
      {/* Gold sparkle circle */}
      <div
        className="flex-shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center mt-0.5"
        style={{ backgroundColor: '#F4EFE0' }}
      >
        <Sparkles size={13} style={{ color: '#A08C5A' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="uppercase tracking-wider mb-1"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#A08C5A' }}
        >
          EvidLY says
        </p>
        <p className="text-[13px] leading-[1.5]" style={{ color: '#1E2D4D', fontWeight: 400 }}>
          {message}
        </p>
      </div>

      {onAskEvidLY && (
        <button
          type="button"
          onClick={onAskEvidLY}
          className="flex-shrink-0 mt-1 px-3 py-1.5 rounded-md text-[11px] transition-colors hover:bg-[#F4F1EA]"
          style={{ fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D' }}
        >
          Ask EvidLY
        </button>
      )}
    </div>
  );
}
