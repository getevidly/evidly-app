/**
 * marketingTokens — local design tokens for the Marketing console.
 *
 * Ember #B24A2E is the accent (gold #A08C5A is retired as of July 2026).
 * These are scoped to the marketing shell — they do NOT touch
 * src/design/tokens.ts, designSystem.ts, tailwind.config.js, or
 * BrandingContext (32 other admin pages still use gold).
 */

// ── Colors ────────────────────────────────────────────────────────
export const EV_NAVY      = '#1E2D4D';
export const EV_INK       = '#26303F';
export const EV_EMBER     = '#B24A2E';
export const EV_EMBER_HOT = '#8F3A22';
export const EV_EMBER_BR  = '#CB5E38';
export const EV_SLATE     = '#3E6B8A';
export const EV_MUTED     = '#66707D';
export const EV_FAINT     = '#8B94A1';
export const EV_CREAM     = '#FAF7F0';
export const EV_LIGHT     = '#F4F1EA';
export const EV_LINE      = '#E7E0D2';
export const EV_PAPER     = '#FFFDF8';
export const EV_SUCCESS   = '#4B7A57';
export const EV_WARN      = '#8A6412';
export const EV_DANGER    = '#9E3B32';

// ── Typography ────────────────────────────────────────────────────
export const DISPLAY = 'Fraunces, Georgia, serif';
export const BODY    = 'Plus Jakarta Sans, system-ui, sans-serif';

// ── Google Fonts link (injected once by MarketingConsole) ─────────
export const MARKETING_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
