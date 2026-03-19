/**
 * ICON-NUCLEAR-FIX-01 — EvidLY Pentagon Dots Icon (inline SVG)
 *
 * Navy rounded-rect bg (#1E2D4D), 5 gold dots (#A08C5A) in pentagon,
 * 1 white center dot. viewBox 0 0 100 100.
 */

import React from 'react';

interface EvidlyIconProps {
  size?: number;
  className?: string;
}

export const EvidlyIcon: React.FC<EvidlyIconProps> = ({ size = 40, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    width={size}
    height={size}
    fill="none"
    aria-label="EvidLY"
    className={className}
  >
    <rect width="100" height="100" rx="22" fill="#1E2D4D" />
    <circle cx="50" cy="22" r="10" fill="#A08C5A" />
    <circle cx="22" cy="42" r="10" fill="#A08C5A" />
    <circle cx="78" cy="42" r="10" fill="#A08C5A" />
    <circle cx="32" cy="74" r="10" fill="#A08C5A" />
    <circle cx="68" cy="74" r="10" fill="#A08C5A" />
    <circle cx="50" cy="50" r="8" fill="white" />
  </svg>
);

// Also export as named function for existing imports
export { EvidlyIcon as default };
