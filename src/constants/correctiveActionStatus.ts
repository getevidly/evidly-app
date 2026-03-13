/**
 * CORRECTIVE-ACTION-01 — Status Pipeline Constants
 *
 * Single source of truth for the 5-status lifecycle:
 * reported → assigned → in_progress → resolved → verified
 */

// ── Status Types ─────────────────────────────────────────────

export type CAStatus = 'reported' | 'assigned' | 'in_progress' | 'resolved' | 'verified';

export interface CAStatusConfig {
  key: CAStatus;
  label: string;
  color: string;
  bg: string;
  nextStatus: CAStatus | null;
  nextLabel: string | null;
  allowedRoles: string[];
}

export const CA_STATUSES: CAStatusConfig[] = [
  {
    key: 'reported',
    label: 'Reported',
    color: '#6366f1',
    bg: '#eef2ff',
    nextStatus: 'assigned',
    nextLabel: 'Assign',
    allowedRoles: [
      'owner_operator', 'executive', 'compliance_manager',
      'kitchen_manager', 'facilities_manager', 'platform_admin',
    ],
  },
  {
    key: 'assigned',
    label: 'Assigned',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    nextStatus: 'in_progress',
    nextLabel: 'Start Work',
    allowedRoles: [
      'owner_operator', 'executive', 'compliance_manager',
      'kitchen_manager', 'chef', 'kitchen_staff',
      'facilities_manager', 'platform_admin',
    ],
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    color: '#d97706',
    bg: '#fffbeb',
    nextStatus: 'resolved',
    nextLabel: 'Mark Resolved',
    allowedRoles: [
      'owner_operator', 'executive', 'compliance_manager',
      'kitchen_manager', 'chef', 'kitchen_staff',
      'facilities_manager', 'platform_admin',
    ],
  },
  {
    key: 'resolved',
    label: 'Resolved',
    color: '#16a34a',
    bg: '#f0fdf4',
    nextStatus: 'verified',
    nextLabel: 'Verify & Close',
    allowedRoles: [
      'owner_operator', 'executive', 'compliance_manager',
      'kitchen_manager', 'facilities_manager', 'platform_admin',
    ],
  },
  {
    key: 'verified',
    label: 'Verified',
    color: '#1e4d6b',
    bg: '#eef4f8',
    nextStatus: null,
    nextLabel: null,
    allowedRoles: [],
  },
];

export const CA_STATUS_MAP: Record<CAStatus, CAStatusConfig> =
  Object.fromEntries(CA_STATUSES.map(s => [s.key, s])) as Record<CAStatus, CAStatusConfig>;

export const CA_STATUS_ORDER: Record<CAStatus, number> = {
  reported: 0, assigned: 1, in_progress: 2, resolved: 3, verified: 4,
};

// ── Severity Config ──────────────────────────────────────────

export type CASeverity = 'critical' | 'high' | 'medium' | 'low';

const NAVY = '#1e4d6b';

export const SEVERITY_CONFIG: Record<CASeverity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  high:     { label: 'High',     color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  medium:   { label: 'Medium',   color: NAVY,      bg: '#eef4f8', border: '#b8d4e8' },
  low:      { label: 'Low',      color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
};

export const SEVERITY_ORDER: Record<CASeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

// ── Demo Team Members ────────────────────────────────────────

export const DEMO_TEAM_MEMBERS = [
  { id: 'd1', name: 'David Kim' },
  { id: 'd2', name: 'Sofia Chen' },
  { id: 'd3', name: 'Ana Torres' },
  { id: 'd4', name: 'Michael Torres' },
  { id: 'd5', name: 'Lisa Nguyen' },
  { id: 'd6', name: 'Maria Garcia' },
  { id: 'd7', name: 'James Rodriguez' },
  { id: 'd8', name: 'Carlos Perez' },
  { id: 'd9', name: 'Marcus Johnson' },
];
