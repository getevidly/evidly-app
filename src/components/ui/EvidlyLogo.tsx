/**
 * LOGO-FIX-3 — EvidLY Wordmark (HTML spans, zero-gap)
 *
 * variant="dark" (default): "vid" in white — for dark backgrounds
 * variant="light": "vid" in navy (#1E2D4D) — for light backgrounds
 * "E" + "LY" always in Refined Gold (#A08C5A).
 *
 * Uses HTML <span> elements instead of SVG <text> to guarantee
 * zero gaps across all browsers and font rendering engines.
 */

interface EvidlyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  showTagline?: boolean;
}

export function EvidlyLogo({
  className,
  size = 'md',
  variant = 'dark',
  showTagline = false,
}: EvidlyLogoProps) {
  const vidColor = variant === 'light' ? '#1E2D4D' : '#ffffff';
  const goldColor = '#A08C5A';

  const sizeMap = { sm: '0.875rem', md: '1.25rem', lg: '1.5rem' };
  const fontSize = sizeMap[size];

  return (
    <div className={className} style={{ lineHeight: 1.2 }}>
      <span
        style={{
          fontFamily: "'Outfit', 'Inter', sans-serif",
          fontWeight: 800,
          fontSize,
          letterSpacing: '-0.02em',
        }}
      >
        <span style={{ color: goldColor }}>E</span>
        <span style={{ color: vidColor }}>vid</span>
        <span style={{ color: goldColor }}>LY</span>
      </span>
      {showTagline && (
        <div
          style={{
            fontSize: '9px',
            color: '#94a3b8',
            letterSpacing: '0.05em',
            marginTop: '-1px',
          }}
        >
          Compliance Simplified
        </div>
      )}
    </div>
  );
}
