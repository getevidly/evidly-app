/**
 * notificationConstants.ts — NOTIFICATION-SUPER-01
 *
 * Category config, severity config, and type mappings for the
 * unified notification system.
 */

import {
  SEVERITY_COLORS,
  CATEGORY_COLORS,
  type NotificationSeverity,
  type NotificationCategory,
} from '../../constants/statusColors';

// ── Re-exports for convenience ───────────────────────────────

export type { NotificationSeverity, NotificationCategory };
export { SEVERITY_COLORS, CATEGORY_COLORS };

// ── Unified Notification Interface ───────────────────────────

export interface UnifiedNotification {
  id: string;
  type: string;
  category: NotificationCategory | string;
  severity: NotificationSeverity;
  title: string;
  body: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  priority: string;
  sourceType: string | null;
  sourceId: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  snoozedUntil: string | null;
  emailSent: boolean;
  createdAt: string;
}

// ── Category Config (for UI tabs and preferences page) ───────

export interface CategoryConfig {
  key: NotificationCategory;
  label: string;
  description: string;
  color: string;
  bg: string;
  icon: string;
}

export const NOTIFICATION_CATEGORIES: CategoryConfig[] = [
  {
    key: 'compliance',
    label: 'Compliance',
    description: 'Inspection readiness, checklist gaps, corrective actions',
    color: CATEGORY_COLORS.compliance.color,
    bg: CATEGORY_COLORS.compliance.bg,
    icon: CATEGORY_COLORS.compliance.icon,
  },
  {
    key: 'safety',
    label: 'Safety',
    description: 'Temperature excursions, fire safety, intelligence signals',
    color: CATEGORY_COLORS.safety.color,
    bg: CATEGORY_COLORS.safety.bg,
    icon: CATEGORY_COLORS.safety.icon,
  },
  {
    key: 'documents',
    label: 'Documents',
    description: 'Document and certificate expiry, uploads, renewals',
    color: CATEGORY_COLORS.documents.color,
    bg: CATEGORY_COLORS.documents.bg,
    icon: CATEGORY_COLORS.documents.icon,
  },
  {
    key: 'vendors',
    label: 'Vendors',
    description: 'Vendor COI expiry, service overdue, document uploads',
    color: CATEGORY_COLORS.vendors.color,
    bg: CATEGORY_COLORS.vendors.bg,
    icon: CATEGORY_COLORS.vendors.icon,
  },
  {
    key: 'team',
    label: 'Team',
    description: 'Employee certifications, training, team invites',
    color: CATEGORY_COLORS.team.color,
    bg: CATEGORY_COLORS.team.bg,
    icon: CATEGORY_COLORS.team.icon,
  },
  {
    key: 'system',
    label: 'System',
    description: 'Platform updates, billing, weekly digest',
    color: CATEGORY_COLORS.system.color,
    bg: CATEGORY_COLORS.system.bg,
    icon: CATEGORY_COLORS.system.icon,
  },
];

// ── Severity Config (for notification items) ─────────────────

export interface SeverityConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}

export const SEVERITY_CONFIG: Record<NotificationSeverity, SeverityConfig> = {
  urgent: {
    label: SEVERITY_COLORS.urgent.label,
    color: SEVERITY_COLORS.urgent.color,
    bg: SEVERITY_COLORS.urgent.bg,
    border: SEVERITY_COLORS.urgent.border,
    dot: SEVERITY_COLORS.urgent.dot,
  },
  advisory: {
    label: SEVERITY_COLORS.advisory.label,
    color: SEVERITY_COLORS.advisory.color,
    bg: SEVERITY_COLORS.advisory.bg,
    border: SEVERITY_COLORS.advisory.border,
    dot: SEVERITY_COLORS.advisory.dot,
  },
  info: {
    label: SEVERITY_COLORS.info.label,
    color: SEVERITY_COLORS.info.color,
    bg: SEVERITY_COLORS.info.bg,
    border: SEVERITY_COLORS.info.border,
    dot: SEVERITY_COLORS.info.dot,
  },
};

// ── Time formatting ──────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── DB row → UnifiedNotification mapper ──────────────────────

export function mapDbRow(row: Record<string, unknown>): UnifiedNotification {
  return {
    id: row.id as string,
    type: (row.type as string) || 'system',
    category: (row.category as NotificationCategory) || 'system',
    severity: (row.severity as NotificationSeverity) || 'info',
    title: row.title as string,
    body: (row.body as string) || null,
    actionUrl: (row.action_url as string) || null,
    actionLabel: (row.action_label as string) || null,
    priority: (row.priority as string) || 'medium',
    sourceType: (row.source_type as string) || null,
    sourceId: (row.source_id as string) || null,
    readAt: (row.read_at as string) || null,
    dismissedAt: (row.dismissed_at as string) || null,
    snoozedUntil: (row.snoozed_until as string) || null,
    emailSent: (row.email_sent as boolean) || false,
    createdAt: row.created_at as string,
  };
}
