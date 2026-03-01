/**
 * LOGO-FIX-5 — EvidLY Wordmark (styled text)
 *
 * "Evid" in Refined Gold (#A08C5A), "LY" in White (#FFFFFF).
 * Font: Syne, weight 800.
 * Tagline "LEAD WITH CONFIDENCE" in gold, 10px, wide tracking.
 */

import React from 'react';

interface EvidlyLogoProps {
  width?: number;
  showTagline?: boolean;
  className?: string;
  /** @deprecated — use width instead. Kept for back-compat. */
  size?: 'sm' | 'md' | 'lg';
  /** @deprecated — no longer used. */
  variant?: 'dark' | 'light';
}

export const EvidlyLogo: React.FC<EvidlyLogoProps> = ({
  showTagline = true,
  className,
}) => {
  return (
    <div className={className} aria-label="EvidLY — Lead with Confidence">
      <span style={{ fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 800, fontSize: '24px', lineHeight: 1 }}>
        <span style={{ color: '#A08C5A' }}>Evid</span>
        <span style={{ color: '#FFFFFF' }}>LY</span>
      </span>
      {showTagline && (
        <div style={{
          fontSize: '10px',
          letterSpacing: '0.15em',
          color: '#A08C5A',
          fontWeight: 600,
          marginTop: '2px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          LEAD WITH CONFIDENCE
        </div>
      )}
    </div>
  );
};

// Also export as named function for existing imports
export { EvidlyLogo as default };
