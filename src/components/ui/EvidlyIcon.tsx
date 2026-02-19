/**
 * BRANDING-UPDATE-1 — EvidLY Square Icon (inline SVG)
 *
 * Midnight Navy (#1E2D4D) background, Refined Gold (#A08C5A) border,
 * "ELY" text in gold, small checkmark accent.
 * Used in sidebar (collapsed state) and as favicon.
 */

interface EvidlyIconProps {
  className?: string;
  size?: number;
}

export function EvidlyIcon({ className, size = 36 }: EvidlyIconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      aria-label="EvidLY icon"
    >
      {/* Background */}
      <rect x="1" y="1" width="38" height="38" rx="8" fill="#1E2D4D" stroke="#A08C5A" strokeWidth="2" />
      {/* ELY text */}
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fontFamily="'Outfit', 'Inter', sans-serif"
        fontWeight="800"
        fontSize="14"
        fill="#A08C5A"
      >
        ELY
      </text>
      {/* Checkmark accent */}
      <path d="M12 30L15 33L19 28" stroke="#A08C5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
