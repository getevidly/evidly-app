import type { UserRole } from '../contexts/RoleContext';

// ── Route → Role access map ─────────────────────────────────
// Derived from sidebarConfig.ts per-role sections.
// Routes NOT listed here are accessible to all authenticated users.

const ROUTE_ROLE_MAP: [string, UserRole[]][] = [
  // Insights — roles with the Insights sidebar section
  ['/analysis',              ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager']],
  ['/audit-trail',           ['owner_operator', 'executive', 'compliance_manager']],
  ['/benchmarks',            ['owner_operator', 'executive']],
  ['/compliance-trends',     ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager']],
  ['/intelligence',          ['owner_operator', 'executive', 'compliance_manager']],
  ['/insights/intelligence', ['owner_operator', 'executive', 'compliance_manager']],
  ['/insights/reports',      ['owner_operator', 'executive', 'compliance_manager']],
  ['/insights/inspection-forecast', ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef', 'facilities_manager']],
  ['/insights/violation-radar',     ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef']],
  ['/insights/trajectory',          ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager']],
  ['/insights/vendor-performance',  ['owner_operator', 'executive', 'compliance_manager', 'facilities_manager']],
  ['/insights/signals',             ['owner_operator', 'executive', 'compliance_manager']],
  ['/insights/leaderboard',         ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager']],
  ['/iot-monitoring',        ['owner_operator', 'executive', 'compliance_manager', 'facilities_manager']],
  ['/jurisdiction',          ['owner_operator', 'executive', 'compliance_manager']],
  ['/scoring-breakdown',     ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager']],
  ['/violation-trends',      ['owner_operator', 'compliance_manager']],

  // Compliance — not kitchen_staff
  ['/tasks',                 ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef', 'kitchen_staff', 'facilities_manager']],
  ['/corrective-actions',    ['owner_operator', 'executive', 'compliance_manager', 'chef', 'kitchen_manager', 'facilities_manager', 'kitchen_staff']],
  ['/vendor-certifications', ['owner_operator', 'compliance_manager']],
  ['/export-center',         ['compliance_manager']],

  // Workforce Risk (P5)
  ['/workforce-risk',        ['owner_operator', 'executive', 'compliance_manager', 'facilities_manager']],

  // CIC/PSE Operator View
  ['/cic-pse',               ['owner_operator', 'executive', 'compliance_manager']],

  // Vendor Connect
  ['/vendor-connect',        ['owner_operator', 'executive', 'compliance_manager', 'facilities_manager']],
  ['/admin/vendor-connect',  []],

  // Equipment / Facilities
  ['/equipment',             ['facilities_manager', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager']],
  ['/incidents',             ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef', 'facilities_manager', 'kitchen_staff']],
  ['/vendors',               ['facilities_manager', 'owner_operator', 'executive']],
  ['/vendors/review',        ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager']],
  ['/calendar',              ['facilities_manager', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef']],

  // Training Records
  ['/dashboard/training',    ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef', 'kitchen_staff']],

  // Reports — all roles except kitchen_staff
  ['/reports',               ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef', 'facilities_manager']],

  // Administration
  ['/billing',               ['owner_operator', 'executive']],
  ['/org-hierarchy',         ['owner_operator', 'executive']],
  ['/team',                  ['owner_operator', 'executive', 'kitchen_manager', 'chef', 'facilities_manager']],

  // Superadmin only — platform_admin bypasses all guards, so empty array = admin-only
  ['/admin/api-keys',        []],
  ['/admin/demo-generator',  []],
  ['/admin/demo-pipeline',   []],
  ['/admin/demos',           []],

  ['/admin/',                ['owner_operator', 'executive']],

  // Enterprise — owner/exec only
  ['/enterprise/',           ['owner_operator', 'executive']],

  // Settings — role-gated sections
  ['/settings/roles-permissions', ['owner_operator', 'executive']],
  ['/settings/team-roles',        ['owner_operator', 'executive']],
  ['/settings/service-types',     ['owner_operator', 'executive']],
  ['/settings/billing',           ['owner_operator']],
  ['/iot/hub',               ['owner_operator', 'executive', 'compliance_manager']],
];

/**
 * Check whether a given pathname is accessible to the specified role.
 * Returns true if the route is unrestricted or the role is in the allow-list.
 */
export function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  // Platform admin has access to every route — no restrictions
  if (role === 'platform_admin') return true;

  for (const [prefix, allowedRoles] of ROUTE_ROLE_MAP) {
    const match = prefix.endsWith('/')
      ? pathname.startsWith(prefix)
      : pathname === prefix || pathname.startsWith(prefix + '/');
    if (match) {
      return allowedRoles.includes(role);
    }
  }
  // Routes not in the map are accessible to all authenticated users
  return true;
}
