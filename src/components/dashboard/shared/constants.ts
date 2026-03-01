/**
 * DASHBOARD-8 v2 — Shared dashboard constants
 *
 * Extracted from OwnerOperatorDashboard, ExecutiveDashboard,
 * ComplianceManagerDashboard, etc. to eliminate duplication.
 */

import type React from 'react';

// ── Brand colors ──────────────────────────────────────────
export const GOLD = '#C49A2B';
export const NAVY = '#163a5f';
export const PAGE_BG = '#F4F6FA';
export const MUTED = '#3D5068';
export const BODY_TEXT = '#0B1628';
export const CARD_BG = '#FFFFFF';
export const CARD_BORDER = '#D1D9E6';
export const CARD_SHADOW = '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)';
export const PANEL_BG = '#EEF1F7';
export const BORDER_SUBTLE = '#E8EDF5';
export const TEXT_TERTIARY = '#6B7F96';
export const STEEL_SLATE_GRADIENT = 'linear-gradient(135deg, #1c2a3f 0%, #263d56 50%, #2f4a66 100%)';

// ── Typography ────────────────────────────────────────────
export const FONT: React.CSSProperties = { fontFamily: "'Inter', 'DM Sans', sans-serif" };

// ── JIE location ID mapping ──────────────────────────────
export const JIE_LOC_MAP: Record<string, string> = {
  downtown: 'demo-loc-downtown',
  airport: 'demo-loc-airport',
  university: 'demo-loc-university',
};

// ── Keyframes ─────────────────────────────────────────────
export const KEYFRAMES = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ringDraw {
  from { stroke-dashoffset: var(--circ); }
  to   { stroke-dashoffset: var(--off); }
}
`;

// ── Animation helper ──────────────────────────────────────
export function stagger(i: number): React.CSSProperties {
  return { animation: `fadeInUp 0.4s ease-out ${i * 0.1}s both` };
}

// ── Time helpers ──────────────────────────────────────────
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

// ── Per-role demo user names ─────────────────────────────
export const DEMO_ROLE_NAMES: Record<string, { firstName: string; fullName: string }> = {
  owner_operator: { firstName: 'Maria', fullName: 'Maria Rodriguez' },
  executive: { firstName: 'James', fullName: 'James Park' },
  compliance_manager: { firstName: 'Sofia', fullName: 'Sofia Chen' },
  chef: { firstName: 'Ana', fullName: 'Ana Torres' },
  facilities_manager: { firstName: 'Michael', fullName: 'Michael Torres' },
  kitchen_manager: { firstName: 'David', fullName: 'David Kim' },
  kitchen_staff: { firstName: 'Lisa', fullName: 'Lisa Nguyen' },
};

// ── Status color helper ──────────────────────────────────
export function statusColor(status: 'passing' | 'failing' | 'at_risk' | 'unknown'): string {
  switch (status) {
    case 'passing': return '#16a34a';
    case 'failing': return '#dc2626';
    case 'at_risk': return '#d97706';
    default: return '#94a3b8';
  }
}
