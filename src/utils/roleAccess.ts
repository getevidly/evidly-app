// ═══════════════════════════════════════════════════════════
// src/utils/roleAccess.ts
// RBAC access control for Jurisdiction Intelligence Engine
// 7 roles with differentiated access to JIE components
// ═══════════════════════════════════════════════════════════

import type { UserRole } from '../contexts/RoleContext';

export type { UserRole };

// Who can see the jurisdiction info panel (scoring method, weights, fire AHJ)
export function canViewJurisdictionInfo(role: UserRole): boolean {
  return role !== 'kitchen_staff';
}

// Who can see the scoring breakdown (violation-level detail)
export function canViewScoringBreakdown(role: UserRole): boolean {
  return ['owner_operator', 'executive', 'compliance_manager', 'facilities_manager'].includes(role);
}

// Who can see the demo jurisdiction switcher
export function canViewDemoSwitcher(role: UserRole): boolean {
  return ['owner_operator', 'executive', 'compliance_manager'].includes(role);
}

// Default pillar focus per role
export function getDefaultPillar(role: UserRole): 'all' | 'food_safety' | 'fire_safety' {
  switch (role) {
    case 'chef':
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
    case 'kitchen_staff':
      return 'sm';
    case 'owner_operator':
    case 'executive':
    case 'compliance_manager':
      return 'lg';
    default:
      return 'md';
  }
}

// Whether to show jurisdiction name alongside the badge
export function showJurisdictionName(role: UserRole): boolean {
  return role !== 'kitchen_staff';
}

// Default violation filter for scoring breakdown
export function getDefaultViolationFilter(role: UserRole): 'all' | 'critical_major' | 'none' {
  switch (role) {
    case 'owner_operator':
    case 'executive':
    case 'compliance_manager':
      return 'all';
    case 'facilities_manager':
      return 'critical_major';
    default:
      return 'none';
  }
}
