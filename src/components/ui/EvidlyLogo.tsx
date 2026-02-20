/**
 * BRANDING-UPDATE-1 — EvidLY Wordmark (inline SVG)
 *
 * E + LY in Refined Gold (#A08C5A), "vid" in #B0BEC5.
 * Tagline "COMPLIANCE SIMPLIFIED" in #78909C.
 * Uses SVG <text> for pixel-perfect rendering.
 */

import React from 'react';

interface EvidlyLogoProps {
  width?: number;
  showTagline?: boolean;
  className?: string;
  /** @deprecated — use width instead. Kept for back-compat. */
  size?: 'sm' | 'md' | 'lg';
  /** @deprecated — SVG renders identically on all backgrounds. */
  variant?: 'dark' | 'light';
}

export const EvidlyLogo: React.FC<EvidlyLogoProps> = ({
  width,
  showTagline = true,
  className,
  size,
}) => {
  // Back-compat: if legacy `size` prop used without `width`, map it
  const sizeToWidth = { sm: 100, md: 140, lg: 180 };
  const resolvedWidth = width ?? (size ? sizeToWidth[size] : 200);
  const height = showTagline ? resolvedWidth * 0.25 : resolvedWidth * 0.18;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={showTagline ? '0 0 240 60' : '0 0 240 48'}
      width={resolvedWidth}
      height={height}
      aria-label="EvidLY — Compliance Simplified"
      className={className}
    >
      <text
        x="0"
        y="38"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="42"
        fontWeight="800"
        letterSpacing="-1"
      >
        <tspan fill="#A08C5A">E</tspan>
        <tspan fill="#B0BEC5">vid</tspan>
        <tspan fill="#A08C5A">LY</tspan>
      </text>
      {showTagline && (
        <text
          x="0"
          y="56"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="10"
          fontWeight="600"
          fill="#78909C"
          letterSpacing="3"
        >
          COMPLIANCE SIMPLIFIED
        </text>
      )}
    </svg>
  );
};

// Also export as named function for existing imports
export { EvidlyLogo as default };
