/**
 * BRANDING-UPDATE-1 + LOGO-FIX-1 — EvidLY Full Logo (inline SVG)
 *
 * "E" + "LY" in Refined Gold (#A08C5A), "vid" in white (#ffffff).
 * letterSpacing="-1" on all tspans for tight kerning.
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
      <text fontFamily="'Outfit', 'Inter', sans-serif" fontWeight="800" fontSize="28" y="25">
        <tspan fill="#A08C5A" letterSpacing="-1">E</tspan>
        <tspan fill="#ffffff" letterSpacing="-1">vid</tspan>
        <tspan fill="#A08C5A" letterSpacing="-1">LY</tspan>
      </text>
    </svg>
  );
}
