/**
 * EvidLY Design System — Single Source of Truth
 *
 * Every new component and page upgrade MUST import from here.
 * Never hardcode hex values, shadows, or font sizes directly.
 *
 * Usage:
 *   import { colors, shadows, typography, radius } from '../lib/designSystem';
 */

// ─── Colors ────────────────────────────────────────────────────
export const colors = {
  navy: '#1E2D4D',
  navyDark: '#0B1628',
  navyHover: '#162340',
  navyLight: '#283f6a',
  gold: '#A08C5A',
  goldLight: '#C4AE7A',
  goldGlow: 'rgba(160, 140, 90, 0.15)',
  cream: '#FAF7F0',
  creamWarm: '#FAF7F2',
  white: '#FFFFFF',
  textPrimary: '#1E2D4D',
  textSecondary: '#6B7F96',
  textMuted: '#94A3B8',
  border: '#E5E0D8',
  borderLight: '#F0EDE6',
  success: '#059669',
  successSoft: '#D1FAE5',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#2563EB',
  infoSoft: '#DBEAFE',
} as const;

// ─── Shadows ───────────────────────────────────────────────────
export const shadows = {
  sm: '0 1px 3px rgba(30,45,77,0.06), 0 1px 2px rgba(30,45,77,0.04)',
  md: '0 4px 12px rgba(30,45,77,0.08), 0 2px 4px rgba(30,45,77,0.04)',
  lg: '0 12px 36px rgba(30,45,77,0.12), 0 4px 12px rgba(30,45,77,0.06)',
  xl: '0 20px 48px rgba(30,45,77,0.15), 0 8px 16px rgba(30,45,77,0.08)',
  goldGlow: '0 0 0 3px rgba(160, 140, 90, 0.25)',
} as const;

// ─── Border Radius ─────────────────────────────────────────────
export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

// ─── Typography ────────────────────────────────────────────────
export const typography = {
  family: {
    body: "'Montserrat', sans-serif",
    logo: "'Syne', sans-serif",
  },
  size: {
    hero: '36px',
    h1: '28px',
    h2: '22px',
    h3: '18px',
    body: '15px',
    sm: '13px',
    xs: '11px',
  },
  weight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

// ─── Transitions ───────────────────────────────────────────────
export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const;
