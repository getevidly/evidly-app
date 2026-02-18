/**
 * DASHBOARD-8 v2 — Permission check hooks
 *
 * In demo mode: checks against DEFAULT_PERMISSIONS (static).
 * In production: would check org-level overrides first, then defaults.
 *
 * Supports wildcards:
 *   'sidebar.*' matches 'sidebar.checklists'
 *   '*' matches everything
 */

import { useMemo } from 'react';
import { useRole } from '../contexts/RoleContext';
import { DEFAULT_PERMISSIONS } from '../data/defaultPermissions';

function matchPermission(granted: string, requested: string): boolean {
  if (granted === requested) return true;
  if (granted === '*') return true;
  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -1); // 'sidebar.' from 'sidebar.*'
    return requested.startsWith(prefix);
  }
  return false;
}

/** Check a single permission */
export function usePermission(permission: string): boolean {
  const { userRole } = useRole();
  return useMemo(() => {
    const grants = DEFAULT_PERMISSIONS[userRole] || [];
    return grants.some(g => matchPermission(g, permission));
  }, [userRole, permission]);
}

/** Check multiple permissions at once */
export function usePermissions(permissions: string[]): Record<string, boolean> {
  const { userRole } = useRole();
  return useMemo(() => {
    const grants = DEFAULT_PERMISSIONS[userRole] || [];
    const result: Record<string, boolean> = {};
    for (const p of permissions) {
      result[p] = grants.some(g => matchPermission(g, p));
    }
    return result;
  }, [userRole, permissions]);
}

/** Check if ANY of the given permissions are granted */
export function useHasAnyPermission(permissions: string[]): boolean {
  const { userRole } = useRole();
  return useMemo(() => {
    const grants = DEFAULT_PERMISSIONS[userRole] || [];
    return permissions.some(p => grants.some(g => matchPermission(g, p)));
  }, [userRole, permissions]);
}

/** Pure function (non-hook) — check a permission for a given role */
export function checkPermission(role: string, permission: string): boolean {
  const grants = DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS] || [];
  return grants.some(g => matchPermission(g, permission));
}
