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
  management: [
    'sidebar.*',
    'dashboard.*',
    'bottom.*',
    'action.*',
    'page.*',
  ],

  // ── Executive — org-wide analytics & strategy ───────────────
  executive: [
    'sidebar.dashboard',
    'sidebar.calendar',
    'sidebar.compliance',
    'sidebar.regulatory',
    'sidebar.reporting',
    'sidebar.locations',
    'sidebar.benchmarks',
    'sidebar.risk-score',
    'sidebar.leaderboard',
    'sidebar.team',
    'sidebar.settings',
    'sidebar.help',
    'dashboard.hero',
    'dashboard.alerts',
    'dashboard.location-health',
    'dashboard.trend',
    'dashboard.kpis',
    'bottom.reports',
    'bottom.locations',
    'bottom.benchmarks',
    'bottom.regulatory',
    'bottom.settings',
  ],

  // ── Compliance Manager — food safety, regulatory, inspections ─
  compliance_manager: [
    'sidebar.dashboard',
    'sidebar.calendar',
    'sidebar.checklists',
    'sidebar.temperatures',
    'sidebar.fire-safety',
    'sidebar.incidents',
    'sidebar.documents',
    'sidebar.equipment',
    'sidebar.haccp',
    'sidebar.compliance',
    'sidebar.self-inspection',
    'sidebar.inspector',
    'sidebar.regulatory',
    'sidebar.reporting',
    'sidebar.alerts',
    'sidebar.settings',
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
  ],

  // ── Facilities Manager — equipment, vendors, fire safety ─────
  facilities: [
    'sidebar.dashboard',
    'sidebar.calendar',
    'sidebar.fire-safety',
    'sidebar.incidents',
    'sidebar.documents',
    'sidebar.equipment',
    'sidebar.vendors',
    'sidebar.reporting',
    'sidebar.alerts',
    'sidebar.settings',
    'sidebar.help',
    'dashboard.hero',
    'dashboard.alerts',
    'dashboard.start',
    'bottom.fire-safety',
    'bottom.equipment',
    'bottom.schedule',
    'bottom.vendors',
    'bottom.alerts',
  ],

  // ── Kitchen Manager — daily operations, checklists, team ─────
  kitchen_manager: [
    'sidebar.dashboard',
    'sidebar.calendar',
    'sidebar.checklists',
    'sidebar.temperatures',
    'sidebar.iot-monitoring',
    'sidebar.incidents',
    'sidebar.documents',
    'sidebar.equipment',
    'sidebar.haccp',
    'sidebar.vendors',
    'sidebar.training',
    'sidebar.ai-copilot',
    'sidebar.reporting',
    'sidebar.team',
    'sidebar.settings',
    'sidebar.help',
    'dashboard.hero',
    'dashboard.alerts',
    'dashboard.tasks',
    'bottom.checklists',
    'bottom.temps',
    'bottom.qr-scan',
    'bottom.team',
    'bottom.incidents',
  ],

  // ── Kitchen Staff — task-focused, minimal sidebar ────────────
  kitchen: [
    'sidebar.my-tasks',
    'sidebar.calendar',
    'sidebar.checklists',
    'sidebar.log-temp',
    'sidebar.photos',
    'sidebar.training',
    'sidebar.help',
    'page.calendar',
    'page.checklists',
    'page.photos',
    'page.training',
    'page.help',
    'dashboard.tasks',
    'dashboard.training',
    'bottom.tasks',
    'bottom.temps',
    'bottom.qr-scan',
    'bottom.photo',
    'bottom.report',
  ],
};
