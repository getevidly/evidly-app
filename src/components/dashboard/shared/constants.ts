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
export const PAGE_BG = '#f4f6f9';
export const MUTED = '#94a3b8';
export const BODY_TEXT = '#1e293b';
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

// ── Status color helper ──────────────────────────────────
export function statusColor(status: 'passing' | 'failing' | 'at_risk' | 'unknown'): string {
  switch (status) {
    case 'passing': return '#16a34a';
    case 'failing': return '#dc2626';
    case 'at_risk': return '#d97706';
    default: return '#94a3b8';
  }
}
