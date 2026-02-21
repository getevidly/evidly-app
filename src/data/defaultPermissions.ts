/**
 * DASHBOARD-8 v2 — Granular Permission System
 *
 * Every sidebar item, dashboard widget, and bottom-bar button is a named
 * permission.  Roles ship with sensible defaults below.  In demo mode
 * these are used directly; in production they serve as fallback when no
 * org-level overrides exist in the `role_permissions` table.
 *
 * Naming convention:
 *   sidebar.<itemId>     — sidebar nav visibility
 *   dashboard.<widgetId> — dashboard widget visibility
 *   bottom.<actionId>    — bottom action bar button visibility
 *   action.<capability>  — functional capability (create, edit, delete)
 *   page.<pageId>        — direct page access (e.g. Kitchen Staff pages)
 */

import type { UserRole } from '../contexts/RoleContext';

export const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  // ── Owner / Operator — full access ──────────────────────────
  owner_operator: [
    'sidebar.*',
    'dashboard.*',
    'bottom.*',
    'action.*',
    'page.*',
    'settings_access',
    'help_access',
  ],

  // ── Executive — org-wide analytics & strategy ───────────────
  executive: [
    'sidebar.dashboard',
    'sidebar.analytics',
    'sidebar.audit-log',
    'sidebar.benchmarks',
    'sidebar.business-intelligence',
    'sidebar.iot-dashboard',
    'sidebar.score-table',
    'sidebar.regulatory',
    'sidebar.reporting',
    'sidebar.billing',
    'sidebar.settings',
    'sidebar.help',
    'dashboard.hero',
    'dashboard.alerts',
    'dashboard.location-health',
    'dashboard.trend',
    'dashboard.kpis',
    'bottom.reports',
    'bottom.benchmarks',
    'bottom.regulatory',
    'bottom.settings',
    'settings_access',
    'help_access',
  ],

  // ── Compliance Manager — food safety, regulatory, inspections ─
  compliance_manager: [
    'sidebar.dashboard',
    'sidebar.corrective-actions',
    'sidebar.documents',
    'sidebar.regulatory',
    'sidebar.reporting',
    'sidebar.self-inspection',
    'sidebar.vendor-certifications',
    'sidebar.audit-log',
    'sidebar.business-intelligence',
    'sidebar.iot-dashboard',
    'sidebar.jurisdiction-intelligence',
    'sidebar.score-table',
    'sidebar.violation-trends',
    'sidebar.incidents',
    'sidebar.temperatures',
    'sidebar.export-center',
    'sidebar.self-diagnosis',
    'sidebar.help',
    'dashboard.hero',
    'dashboard.alerts',
    'dashboard.jurisdiction-matrix',
    'dashboard.start',
    'bottom.compliance',
    'bottom.self-inspect',
    'bottom.violations',
    'bottom.regulatory',
    'bottom.alerts',
    'settings_access',
    'help_access',
  ],

  // ── Chef — kitchen operations, checklists, temps, team ───────
  chef: [
    'sidebar.dashboard',
    'sidebar.allergen-tracking',
    'sidebar.cooling-logs',
    'sidebar.haccp',
    'sidebar.receiving-log',
    'sidebar.temperatures',
    'sidebar.checklists',
    'sidebar.incidents',
    'sidebar.self-diagnosis',
    'sidebar.help',
    'dashboard.hero',
    'dashboard.alerts',
    'dashboard.tasks',
    'bottom.checklists',
    'bottom.temps',
    'bottom.team',
    'bottom.incidents',
    'settings_access',
    'help_access',
  ],

  // ── Facilities Manager — equipment, vendors, fire safety ─────
  facilities_manager: [
    'sidebar.dashboard',
    'sidebar.hood-exhaust',
    'sidebar.hvac',
    'sidebar.ice-machines',
    'sidebar.refrigeration',
    'sidebar.suppression-systems',
    'sidebar.certs-docs',
    'sidebar.self-diagnosis',
    'sidebar.service-calendar',
    'sidebar.service-reporting',
    'sidebar.vendors',
    'sidebar.help',
    'dashboard.hero',
    'dashboard.alerts',
    'dashboard.start',
    'bottom.equipment',
    'bottom.schedule',
    'bottom.vendors',
    'bottom.alerts',
    'settings_access',
    'help_access',
  ],

  // ── Kitchen Manager — daily operations, checklists, team ─────
  kitchen_manager: [
    'sidebar.dashboard',
    'sidebar.checklists',
    'sidebar.incidents',
    'sidebar.temperatures',
    'sidebar.documents',
    'sidebar.regulatory',
    'sidebar.reporting',
    'sidebar.self-inspection',
    'sidebar.self-diagnosis',
    'sidebar.settings',
    'sidebar.team',
    'sidebar.help',
    'dashboard.hero',
    'dashboard.alerts',
    'dashboard.tasks',
    'bottom.checklists',
    'bottom.temps',
    'bottom.team',
    'bottom.incidents',
    'settings_access',
    'help_access',
  ],

  // ── Kitchen Staff — task-focused, minimal sidebar ────────────
  kitchen_staff: [
    'sidebar.dashboard',
    'sidebar.checklists',
    'sidebar.temperatures',
    'sidebar.report-issue',
    'sidebar.self-diagnosis',
    'sidebar.help',
    'page.checklists',
    'page.help',
    'dashboard.tasks',
    'bottom.tasks',
    'bottom.temps',
    'bottom.report',
    'help_access',
  ],
};
