/**
 * statusColors.ts — NOTIFICATION-SUPER-01
 *
 * Global tricolor status system for EvidLY.
 * Green → Amber → Red for severity/urgency indicators.
 * Also includes info (blue) and neutral (gray) tiers.
 *
 * Use these constants instead of hardcoded hex values.
 * CSS variables in index.css (--green, --yellow, --red) remain
 * the source for CSS-only usage; this file is for TypeScript.
 */

// ── Notification Severity Colors ──────────────────────────────

export const SEVERITY_COLORS = {
  urgent: {
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    dot: '#EF4444',
    label: 'Urgent',
  },
  advisory: {
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    dot: '#F59E0B',
    label: 'Advisory',
  },
  info: {
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    dot: '#3B82F6',
    label: 'Info',
  },
} as const;

// ── Priority Colors (for badges) ──────────────────────────────

export const PRIORITY_COLORS = {
  critical: {
    color: '#991b1b',
    bg: '#fef2f2',
    border: '#fca5a5',
    label: 'Critical',
  },
  high: {
    color: '#92400e',
    bg: '#fffbeb',
    border: '#fde68a',
    label: 'High',
  },
  medium: {
    color: '#1e4d6b',
    bg: '#eef4f8',
    border: '#b8d4e8',
    label: 'Medium',
  },
  low: {
    color: '#166534',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    label: 'Low',
  },
} as const;

// ── General Status Colors ─────────────────────────────────────

export const STATUS_TRICOLOR = {
  good: {
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    dot: '#22C55E',
  },
  warning: {
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    dot: '#F59E0B',
  },
  danger: {
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    dot: '#EF4444',
  },
  neutral: {
    color: '#6B7F96',
    bg: '#F3F4F6',
    border: '#E5E7EB',
    dot: '#9CA3AF',
  },
} as const;

// ── Notification Category Colors ──────────────────────────────

export const CATEGORY_COLORS = {
  compliance: { color: '#1e4d6b', bg: '#eef4f8', icon: 'ClipboardCheck' },
  safety:     { color: '#dc2626', bg: '#fef2f2', icon: 'ShieldAlert' },
  documents:  { color: '#2563eb', bg: '#eff6ff', icon: 'FileText' },
  vendors:    { color: '#7c3aed', bg: '#f5f3ff', icon: 'Truck' },
  team:       { color: '#059669', bg: '#ecfdf5', icon: 'Users' },
  system:     { color: '#6B7F96', bg: '#f8fafc', icon: 'Settings' },
} as const;

// ── Type exports ──────────────────────────────────────────────

export type NotificationSeverity = keyof typeof SEVERITY_COLORS;
export type NotificationPriority = keyof typeof PRIORITY_COLORS;
export type NotificationCategory = keyof typeof CATEGORY_COLORS;
