/**
 * LOGO-FIX-3 — EvidLY Square Icon (inline SVG)
 *
 * Stamp + checkmark + circle badge design.
 * Midnight Navy (#1E2D4D) background, Refined Gold (#A08C5A) accents.
 * viewBox 0 0 80 80 for higher fidelity.
 */

interface EvidlyIconProps {
  className?: string;
  size?: number;
}

export function EvidlyIcon({ className, size = 36 }: EvidlyIconProps) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      aria-label="EvidLY icon"
    >
      {/* Rounded-square background */}
      <rect x="2" y="2" width="76" height="76" rx="16" fill="#1E2D4D" stroke="#A08C5A" strokeWidth="3" />
      {/* Stamp circle */}
      <circle cx="40" cy="36" r="20" stroke="#A08C5A" strokeWidth="2.5" fill="none" />
      {/* Checkmark inside circle */}
      <path d="M30 36L37 43L52 28" stroke="#A08C5A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Badge circle bottom-right */}
      <circle cx="58" cy="60" r="12" fill="#A08C5A" />
      <text x="58" y="65" textAnchor="middle" fontFamily="'Outfit','Inter',sans-serif" fontWeight="800" fontSize="13" fill="#1E2D4D">E</text>
    </svg>
  );
}
