/**
 * LOGO-FIX-6 — EvidLY Wordmark (styled text, no dot icon)
 *
 * "E" in Gold (#A08C5A), "vid" in White (#FFFFFF), "LY" in Gold (#A08C5A).
 * Font: Syne, weight 800.
 * Tagline "ANSWERS BEFORE YOU ASK" in gold, 10px, wide tracking.
 */

import React from 'react';

interface EvidlyLogoProps {
  width?: number;
  showTagline?: boolean;
  className?: string;
  /** When true (default), "vid" renders white; when false, "vid" renders navy #1E2D4D */
  onDark?: boolean;
  /** @deprecated — use width instead. Kept for back-compat. */
  size?: 'sm' | 'md' | 'lg';
  /** @deprecated — use onDark instead. */
  variant?: 'dark' | 'light';
}

export const EvidlyLogo: React.FC<EvidlyLogoProps> = ({
  showTagline = true,
  onDark = true,
  className,
}) => {
  const vidColor = onDark ? '#FFFFFF' : '#1E2D4D';
  return (
    <div className={className} aria-label="EvidLY — Answers before you ask">
      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', letterSpacing: '-0.02em', lineHeight: 1 }}>
        <span style={{ color: '#A08C5A' }}>E</span>
        <span style={{ color: vidColor }}>vid</span>
        <span style={{ color: '#A08C5A' }}>LY</span>
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
          ANSWERS BEFORE YOU ASK
        </div>
      )}
    </div>
  );
};

// Also export as named function for existing imports
export { EvidlyLogo as default };
