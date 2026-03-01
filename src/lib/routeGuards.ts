import type { UserRole } from '../contexts/RoleContext';

// ── Route → Role access map ─────────────────────────────────
// Derived from sidebarConfig.ts per-role sections.
// Routes NOT listed here are accessible to all authenticated users.

const ROUTE_ROLE_MAP: [string, UserRole[]][] = [
  // Insights — roles with the Insights sidebar section
  ['/analysis',              ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager']],
  ['/audit-trail',           ['owner_operator', 'executive', 'compliance_manager']],
  ['/benchmarks',            ['owner_operator', 'executive']],
  ['/business-intelligence', ['owner_operator', 'executive', 'compliance_manager']],
  ['/intelligence',          ['owner_operator', 'executive', 'compliance_manager']],
  ['/regulatory-updates',   ['owner_operator', 'executive', 'compliance_manager']],
  ['/iot-monitoring',        ['owner_operator', 'executive', 'compliance_manager', 'facilities_manager']],
  ['/jurisdiction',          ['owner_operator', 'executive', 'compliance_manager']],
  ['/scoring-breakdown',     ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager']],
  ['/violation-trends',      ['owner_operator', 'compliance_manager']],

  // Compliance — not kitchen_staff
  ['/corrective-actions',    ['owner_operator', 'compliance_manager', 'chef', 'kitchen_manager']],
  ['/vendor-certifications', ['owner_operator', 'compliance_manager']],
  ['/export-center',         ['compliance_manager']],

  // Equipment / Facilities
  ['/equipment',             ['facilities_manager', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager']],
  ['/vendors',               ['facilities_manager', 'owner_operator', 'executive']],
  ['/calendar',              ['facilities_manager', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef']],

  // Training Records
  ['/dashboard/training',    ['owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef', 'kitchen_staff']],

  // Administration
  ['/billing',               ['owner_operator', 'executive']],
  ['/org-hierarchy',         ['owner_operator', 'executive']],
  ['/team',                  ['owner_operator', 'executive', 'kitchen_manager', 'chef', 'facilities_manager']],
  ['/admin/',                ['owner_operator', 'executive']],

  // Enterprise — owner/exec only
  ['/enterprise/',           ['owner_operator', 'executive']],

  // Role permissions — owner/exec only
  ['/settings/roles-permissions', ['owner_operator', 'executive']],
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
