/**
 * BRANDING-UPDATE-1 — EvidLY Square Icon (inline SVG)
 *
 * Navy bg (#1a2d4a), gold border (#A08C5A), "ELY" in white,
 * gold underline, gold checkmark badge top-right.
 * viewBox 0 0 80 80.
 */

import React from 'react';

interface EvidlyIconProps {
  size?: number;
  className?: string;
}

export const EvidlyIcon: React.FC<EvidlyIconProps> = ({ size = 40, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 80 80"
    width={size}
    height={size}
    aria-label="EvidLY"
    className={className}
  >
    {/* Navy background */}
    <rect width="80" height="80" fill="#1a2d4a" rx="16" />
    {/* Gold border rectangle */}
    <rect x="16" y="16" width="48" height="48" rx="8" fill="none" stroke="#A08C5A" strokeWidth="2.5" />
    {/* ELY text */}
    <text
      x="40"
      y="46"
      textAnchor="middle"
      fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
      fontSize="20"
      fontWeight="900"
      fill="white"
      letterSpacing="-0.5"
    >
      ELY
    </text>
    {/* Gold underline */}
    <line x1="28" y1="52" x2="52" y2="52" stroke="#A08C5A" strokeWidth="1.5" strokeLinecap="round" />
    {/* Gold checkmark badge */}
    <circle cx="58" cy="22" r="8" fill="#A08C5A" />
    <text
      x="58"
      y="26"
      textAnchor="middle"
      fontFamily="system-ui, sans-serif"
      fontSize="12"
      fontWeight="900"
      fill="white"
    >
      ✓
    </text>
  </svg>
);

// Also export as named function for existing imports
export { EvidlyIcon as default };
