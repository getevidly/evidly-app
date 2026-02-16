// ═══════════════════════════════════════════════════════════
// src/utils/roleAccess.ts
// RBAC access control for Jurisdiction Intelligence Engine
// 7 roles with differentiated access to JIE components
// ═══════════════════════════════════════════════════════════

export type UserRole =
  | 'evidly_admin'
  | 'enterprise_admin'
  | 'owner_operator'
  | 'facilities_manager'
  | 'kitchen_manager'
  | 'staff'
  | 'demo';

// Who can see the jurisdiction info panel (scoring method, weights, fire AHJ)
export function canViewJurisdictionInfo(role: UserRole): boolean {
  return role !== 'staff';
}

// Who can see the scoring breakdown (violation-level detail)
export function canViewScoringBreakdown(role: UserRole): boolean {
  return ['evidly_admin', 'enterprise_admin', 'owner_operator', 'facilities_manager', 'demo'].includes(role);
}

// Who can see the demo jurisdiction switcher
export function canViewDemoSwitcher(role: UserRole): boolean {
  return ['evidly_admin', 'enterprise_admin', 'demo'].includes(role);
}

// Default pillar focus per role
export function getDefaultPillar(role: UserRole): 'all' | 'food_safety' | 'fire_safety' {
  switch (role) {
    case 'kitchen_manager':
      return 'food_safety';
    case 'facilities_manager':
      return 'fire_safety';
    default:
      return 'all';
  }
}

// Badge size per role context
export function getBadgeSize(role: UserRole): 'sm' | 'md' | 'lg' {
  switch (role) {
    case 'staff':
      return 'sm';
    case 'evidly_admin':
    case 'enterprise_admin':
    case 'demo':
      return 'lg';
    default:
      return 'md';
  }
}

// Whether to show jurisdiction name alongside the badge
export function showJurisdictionName(role: UserRole): boolean {
  return role !== 'staff';
}

// Default violation filter for scoring breakdown
export function getDefaultViolationFilter(role: UserRole): 'all' | 'critical_major' | 'none' {
  switch (role) {
    case 'evidly_admin':
    case 'enterprise_admin':
    case 'demo':
      return 'all';
    case 'owner_operator':
    case 'facilities_manager':
      return 'critical_major';
    default:
      return 'none';
  }
}
