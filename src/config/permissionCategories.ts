/**
 * ROLE-PERMS-1 — Permission Categories Registry
 *
 * Groups granular permissions into module-based categories for the
 * Roles & Permissions management UI. Categories are derived dynamically
 * from the DEFAULT_PERMISSIONS map — new permissions added there will
 * surface automatically when they match a known prefix.
 *
 * To add a new module:
 *   1. Add a new entry to PERMISSION_CATEGORIES below
 *   2. Add matching permission keys to DEFAULT_PERMISSIONS
 *   3. The UI picks them up automatically
 */

import { DEFAULT_PERMISSIONS } from '../data/defaultPermissions';
import type { UserRole } from '../contexts/RoleContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Permission {
  key: string;
  label: string;
  description: string;
  /** Cannot be granted to non-owner/exec roles */
  protected?: boolean;
}

export interface PermissionCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  permissions: Permission[];
  /** Entire category is protected (admin-only) */
  protected?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Protected permissions                                              */
/* ------------------------------------------------------------------ */

export const PROTECTED_PERMISSION_KEYS = new Set([
  'permission.manage_roles',
  'billing.manage',
  'org.delete',
  'org.transfer_ownership',
  'team.manage_roles',
]);

export function isProtectedPermission(key: string): boolean {
  return PROTECTED_PERMISSION_KEYS.has(key);
}

export const ADMIN_ONLY_ROLES: UserRole[] = [
  'platform_admin',
  'owner_operator',
  'executive',
];

/* ------------------------------------------------------------------ */
/*  Category definitions                                               */
/* ------------------------------------------------------------------ */

/**
 * Each category maps a module to its granular permissions.
 * `sidebarKeys` / `dashboardKeys` etc. link to the existing
 * permission strings in DEFAULT_PERMISSIONS so the UI can
 * read current state from the same source.
 */
const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    description: 'Dashboard widgets and location visibility',
    permissions: [
      { key: 'sidebar.dashboard', label: 'Access Dashboard', description: 'View the main dashboard page' },
      { key: 'dashboard.hero', label: 'View Compliance Scores', description: 'See hero section with compliance scores' },
      { key: 'dashboard.alerts', label: 'View Alerts', description: 'See active alerts on dashboard' },
      { key: 'dashboard.location-health', label: 'View Location Health', description: 'See per-location health cards' },
      { key: 'dashboard.trend', label: 'View Trend Charts', description: 'See compliance trend graphs' },
      { key: 'dashboard.kpis', label: 'View KPIs', description: 'See key performance indicator widgets' },
      { key: 'dashboard.tasks', label: 'View Tasks', description: 'See task list widget on dashboard' },
      { key: 'dashboard.start', label: 'Quick Start Panel', description: 'See quick-start action panel' },
      { key: 'dashboard.jurisdiction-matrix', label: 'Jurisdiction Matrix', description: 'View jurisdiction compliance matrix' },
    ],
  },
  {
    id: 'food-safety',
    label: 'Food Safety',
    icon: '🍽️',
    description: 'Checklists, temperatures, and HACCP management',
    permissions: [
      { key: 'sidebar.checklists', label: 'View Checklists', description: 'Access daily checklists' },
      { key: 'sidebar.temperatures', label: 'View Temperatures', description: 'Access temperature logs' },
      { key: 'sidebar.haccp', label: 'Manage HACCP', description: 'Access HACCP plans and CCPs' },
      { key: 'sidebar.cooling-logs', label: 'Cooling Logs', description: 'Access cooling log records' },
      { key: 'sidebar.receiving-log', label: 'Receiving Log', description: 'Access receiving log records' },
      { key: 'sidebar.allergen-tracking', label: 'Allergen Tracking', description: 'Access allergen tracking' },
      { key: 'page.checklists', label: 'Direct Checklist Access', description: 'Navigate directly to checklists' },
      { key: 'bottom.checklists', label: 'Mobile: Checklists', description: 'Checklists button in mobile bottom bar' },
      { key: 'bottom.temps', label: 'Mobile: Temps', description: 'Temperatures button in mobile bottom bar' },
      { key: 'bottom.qr-scan', label: 'Mobile: QR Scan', description: 'QR scan button in mobile bottom bar' },
    ],
  },
  {
    id: 'facility-safety',
    label: 'Facility Safety',
    icon: '🔥',
    description: 'Fire safety documents, inspections, and equipment',
    permissions: [
      { key: 'sidebar.facility-safety', label: 'View Facility Safety', description: 'Access facility safety section' },
      { key: 'sidebar.hood-exhaust', label: 'Hood & Exhaust', description: 'Access hood/exhaust records' },
      { key: 'sidebar.hvac', label: 'HVAC', description: 'Access HVAC maintenance' },
      { key: 'sidebar.suppression-systems', label: 'Suppression Systems', description: 'Access suppression systems' },
      { key: 'bottom.facility-safety', label: 'Mobile: Facility Safety', description: 'Facility Safety in mobile bottom bar' },
    ],
  },
  {
    id: 'vendor-management',
    label: 'Vendor Management',
    icon: '🤝',
    description: 'Vendor profiles, certifications, and scorecards',
    permissions: [
      { key: 'sidebar.vendors', label: 'View Vendors', description: 'Access vendor list' },
      { key: 'sidebar.vendor-certifications', label: 'Vendor Certifications', description: 'View vendor certification status' },
      { key: 'sidebar.services', label: 'Services', description: 'Access vendor services tracking' },
      { key: 'bottom.vendors', label: 'Mobile: Vendors', description: 'Vendors button in mobile bottom bar' },
    ],
  },
  {
    id: 'team-management',
    label: 'Team Management',
    icon: '👥',
    description: 'Team members, invitations, and role assignments',
    permissions: [
      { key: 'sidebar.team', label: 'View Team', description: 'Access team management page' },
      { key: 'bottom.team', label: 'Mobile: Team', description: 'Team button in mobile bottom bar' },
      { key: 'team.manage_roles', label: 'Manage Roles', description: 'Assign and change user roles', protected: true },
    ],
  },
  {
    id: 'locations',
    label: 'Locations',
    icon: '📍',
    description: 'Location management and leaderboard',
    permissions: [
      { key: 'sidebar.score-table', label: 'Location Leaderboard', description: 'View location score table' },
      { key: 'bottom.locations', label: 'Mobile: Locations', description: 'Locations in mobile bottom bar' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: '📋',
    description: 'Reporting, exports, and compliance documents',
    permissions: [
      { key: 'sidebar.reporting', label: 'View Reports', description: 'Access reporting section' },
      { key: 'sidebar.export-center', label: 'Export Center', description: 'Access export/download center' },
      { key: 'sidebar.service-reporting', label: 'Service Reporting', description: 'Access service reports' },
      { key: 'bottom.reports', label: 'Mobile: Reports', description: 'Reports in mobile bottom bar' },
    ],
  },
  {
    id: 'compliance-intelligence',
    label: 'Compliance Intelligence',
    icon: '🧠',
    description: 'Analytics, regulatory updates, and benchmarks',
    permissions: [
      { key: 'sidebar.ai-insights', label: 'AI Insights', description: 'Access AI-powered insights' },
      { key: 'sidebar.analytics', label: 'Analytics', description: 'Access predictive analytics' },
      { key: 'sidebar.intelligence', label: 'Intelligence Hub', description: 'Access compliance intelligence' },
      { key: 'sidebar.jurisdiction-intelligence', label: 'Jurisdiction Intelligence', description: 'Jurisdiction-level intelligence' },
      { key: 'sidebar.regulatory', label: 'Regulatory Updates', description: 'View regulatory change alerts' },
      { key: 'sidebar.benchmarks', label: 'Benchmarks', description: 'View performance benchmarks' },
      { key: 'sidebar.business-intelligence', label: 'Business Intelligence', description: 'Access BI dashboards' },
      { key: 'sidebar.violation-trends', label: 'Violation Trends', description: 'View violation trend analysis' },
      { key: 'bottom.regulatory', label: 'Mobile: Regulatory', description: 'Regulatory in mobile bottom bar' },
      { key: 'bottom.benchmarks', label: 'Mobile: Benchmarks', description: 'Benchmarks in mobile bottom bar' },
    ],
  },
  {
    id: 'equipment',
    label: 'Equipment & IoT',
    icon: '🔧',
    description: 'Equipment registry, IoT sensors, and maintenance',
    permissions: [
      { key: 'sidebar.iot-dashboard', label: 'IoT Dashboard', description: 'Access IoT monitoring dashboard' },
      { key: 'sidebar.refrigeration', label: 'Refrigeration', description: 'Access refrigeration monitoring' },
      { key: 'sidebar.ice-machines', label: 'Ice Machines', description: 'Access ice machine monitoring' },
      { key: 'bottom.equipment', label: 'Mobile: Equipment', description: 'Equipment in mobile bottom bar' },
      { key: 'bottom.schedule', label: 'Mobile: Schedule', description: 'Schedule in mobile bottom bar' },
    ],
  },
  {
    id: 'incidents',
    label: 'Incidents & Compliance',
    icon: '⚠️',
    description: 'Incident tracking, corrective actions, and audits',
    permissions: [
      { key: 'sidebar.incidents', label: 'View Incidents', description: 'Access incident log' },
      { key: 'sidebar.corrective-actions', label: 'Corrective Actions', description: 'Manage corrective actions' },
      { key: 'sidebar.self-inspection', label: 'Self-Inspection', description: 'Run self-inspections' },
      { key: 'sidebar.audit-log', label: 'Audit Log', description: 'View audit trail' },
      { key: 'sidebar.documents', label: 'Documents', description: 'Access document management' },
      { key: 'bottom.compliance', label: 'Mobile: Compliance', description: 'Compliance in mobile bottom bar' },
      { key: 'bottom.self-inspect', label: 'Mobile: Self-Inspect', description: 'Self-inspect in mobile bottom bar' },
      { key: 'bottom.violations', label: 'Mobile: Violations', description: 'Violations in mobile bottom bar' },
      { key: 'bottom.alerts', label: 'Mobile: Alerts', description: 'Alerts in mobile bottom bar' },
    ],
  },
  {
    id: 'food-recovery',
    label: 'Food Recovery (SB 1383)',
    icon: '♻️',
    description: 'Organic waste diversion, food recovery agreements, and SB 1383 compliance',
    permissions: [
      { key: 'sidebar.food-recovery', label: 'Food Recovery', description: 'Access SB 1383 food recovery tracking' },
      { key: 'sidebar.waste-diversion', label: 'Waste Diversion Log', description: 'Log organic waste diversion activities' },
      { key: 'sidebar.recovery-agreements', label: 'Recovery Agreements', description: 'Manage food recovery organization agreements' },
      { key: 'bottom.food-recovery', label: 'Mobile: Food Recovery', description: 'Food Recovery in mobile bottom bar' },
    ],
  },
  {
    id: 'usda-k12',
    label: 'USDA K-12',
    icon: '🏫',
    description: 'USDA Child Nutrition Program production records and meal compliance',
    permissions: [
      { key: 'sidebar.usda-production-records', label: 'Production Records', description: 'Access USDA meal production records' },
      { key: 'sidebar.usda-meal-patterns', label: 'Meal Patterns', description: 'Track USDA meal pattern compliance' },
      { key: 'sidebar.usda-cn-labels', label: 'CN Labels', description: 'Manage Child Nutrition label tracking' },
      { key: 'bottom.usda-k12', label: 'Mobile: USDA K-12', description: 'USDA K-12 in mobile bottom bar' },
    ],
  },
  {
    id: 'training',
    label: 'Training',
    icon: '🎓',
    description: 'Training courses, certifications, and progress tracking',
    permissions: [
      { key: 'page.help', label: 'Help Access', description: 'Access help and support pages' },
      { key: 'sidebar.help', label: 'Help & Support', description: 'Help section in sidebar' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: '🛠️',
    description: 'Self-diagnosis, report issue, and other utilities',
    permissions: [
      { key: 'sidebar.self-diagnosis', label: 'Self-Diagnosis', description: 'Access equipment self-diagnosis tool' },
      { key: 'sidebar.report-issue', label: 'Report Issue', description: 'Submit issue reports' },
      { key: 'bottom.tasks', label: 'Mobile: Tasks', description: 'Tasks in mobile bottom bar' },
      { key: 'bottom.report', label: 'Mobile: Report', description: 'Report in mobile bottom bar' },
      { key: 'bottom.incidents', label: 'Mobile: Incidents', description: 'Incidents in mobile bottom bar' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    description: 'Organization settings and billing',
    permissions: [
      { key: 'sidebar.settings', label: 'View Settings', description: 'Access settings page' },
      { key: 'sidebar.roles-permissions', label: 'Role Permissions', description: 'Access role permissions management' },
      { key: 'sidebar.billing', label: 'View Billing', description: 'Access billing section' },
      { key: 'settings_access', label: 'Settings Access', description: 'General settings page access' },
      { key: 'help_access', label: 'Help Access', description: 'Access help and support features' },
      { key: 'bottom.settings', label: 'Mobile: Settings', description: 'Settings in mobile bottom bar' },
      { key: 'billing.manage', label: 'Manage Billing', description: 'Change billing and subscription settings', protected: true },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: '🔒',
    description: 'Critical administrative actions — restricted to Owner/Executive',
    protected: true,
    permissions: [
      { key: 'permission.manage_roles', label: 'Manage Role Permissions', description: 'Access and modify role permission settings', protected: true },
      { key: 'org.delete', label: 'Delete Organization', description: 'Permanently delete the organization', protected: true },
      { key: 'org.transfer_ownership', label: 'Transfer Ownership', description: 'Transfer organization ownership to another user', protected: true },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/** Get all permission categories */
export function getPermissionCategories(): PermissionCategory[] {
  return PERMISSION_CATEGORIES;
}

/** Collect every unique permission key across all categories */
export function getAllPermissionKeys(): string[] {
  return PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.key));
}

/** Resolve the effective permission set for a role from DEFAULT_PERMISSIONS */
export function getRoleDefaultPermissions(role: UserRole): Set<string> {
  const grants = DEFAULT_PERMISSIONS[role] || [];
  const resolved = new Set<string>();
  const allKeys = getAllPermissionKeys();

  for (const key of allKeys) {
    const isGranted = grants.some(g => {
      if (g === key) return true;
      if (g === '*') return true;
      if (g.endsWith('.*')) {
        const prefix = g.slice(0, -1); // 'sidebar.' from 'sidebar.*'
        return key.startsWith(prefix);
      }
      return false;
    });
    if (isGranted) resolved.add(key);
  }

  return resolved;
}

/** Get the number of users with a given role (for demo mode) */
export function getDemoRoleUserCount(role: UserRole): number {
  const DEMO_COUNTS: Partial<Record<UserRole, number>> = {
    owner_operator: 1,
    executive: 1,
    compliance_manager: 1,
    chef: 1,
    facilities_manager: 1,
    kitchen_manager: 1,
    kitchen_staff: 3,
  };
  return DEMO_COUNTS[role] ?? 0;
}

/** Pretty-print a role name */
export function formatRoleName(role: UserRole): string {
  const LABELS: Record<UserRole, string> = {
    platform_admin: 'Platform Admin',
    owner_operator: 'Owner / Operator',
    executive: 'Executive',
    compliance_manager: 'Compliance Manager',
    chef: 'Chef',
    facilities_manager: 'Facilities Manager',
    kitchen_manager: 'Kitchen Manager',
    kitchen_staff: 'Kitchen Staff',
  };
  return LABELS[role] ?? role;
}

/** Roles that can be managed (excludes platform_admin) */
export const MANAGEABLE_ROLES: UserRole[] = [
  'executive',
  'compliance_manager',
  'chef',
  'facilities_manager',
  'kitchen_manager',
  'kitchen_staff',
];
