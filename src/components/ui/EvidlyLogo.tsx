/**
 * BRANDING-UPDATE-1 — EvidLY Full Logo (inline SVG)
 *
 * "E" + "LY" in Refined Gold (#A08C5A), "vid" in muted silver (#B0BEC5).
 * Used in sidebar (expanded state) and landing page nav.
 */

interface EvidlyLogoProps {
  className?: string;
  height?: number;
}

export function EvidlyLogo({ className, height = 28 }: EvidlyLogoProps) {
  return (
    <svg
      viewBox="0 0 120 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      height={height}
      className={className}
      aria-label="EvidLY logo"
    >
      {/* E */}
      <text x="0" y="25" fontFamily="'Outfit', 'Inter', sans-serif" fontWeight="800" fontSize="28" fill="#A08C5A">E</text>
      {/* vid */}
      <text x="18" y="25" fontFamily="'Outfit', 'Inter', sans-serif" fontWeight="800" fontSize="28" fill="#B0BEC5">vid</text>
      {/* LY */}
      <text x="70" y="25" fontFamily="'Outfit', 'Inter', sans-serif" fontWeight="800" fontSize="28" fill="#A08C5A">LY</text>
    </svg>
  );
}
