/**
 * DASHBOARD-8 v2 + ROLE-PERMS-1 — Permission check hooks
 *
 * 3-tier resolution order:
 *   1. Per-user exceptions  (user_permission_overrides / demo state)
 *   2. Org role overrides   (role_permissions / demo state)
 *   3. System defaults      (DEFAULT_PERMISSIONS)
 *
 * In demo mode everything resolves from static defaults (tiers 1 & 2
 * are empty until the admin changes them on the permissions page).
 *
 * Supports wildcards:
 *   'sidebar.*' matches 'sidebar.checklists'
 *   '*' matches everything
 */

import { useMemo, useState, useEffect } from 'react';
import { useRole } from '../contexts/RoleContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { DEFAULT_PERMISSIONS } from '../data/defaultPermissions';
import { supabase } from '../lib/supabase';

/* ------------------------------------------------------------------ */
/*  Wildcard matcher (unchanged)                                       */
/* ------------------------------------------------------------------ */

function matchPermission(granted: string, requested: string): boolean {
  if (granted === requested) return true;
  if (granted === '*') return true;
  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -1); // 'sidebar.' from 'sidebar.*'
    return requested.startsWith(prefix);
  }
  return false;
}

/** Check against the static DEFAULT_PERMISSIONS for a role */
function checkAgainstDefaults(role: string, permission: string): boolean {
  const grants = DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS] || [];
  return grants.some(g => matchPermission(g, permission));
}

/* ------------------------------------------------------------------ */
/*  Org-level cache (fetched once, shared across hook instances)        */
/* ------------------------------------------------------------------ */

interface OrgOverride {
  permission_key: string;
  granted: boolean;
}

let _orgRoleOverrides: Map<string, OrgOverride[]> | null = null;
let _orgUserOverrides: Map<string, OrgOverride[]> | null = null;
let _orgId: string | null = null;
let _fetchPromise: Promise<void> | null = null;

function buildKey(role: string) { return role; }
function buildUserKey(userId: string) { return userId; }

async function fetchOrgOverrides(organizationId: string, userId: string) {
  // Skip if already fetched for this org
  if (_orgId === organizationId && _orgRoleOverrides && _orgUserOverrides) return;

  _orgId = organizationId;
  _orgRoleOverrides = new Map();
  _orgUserOverrides = new Map();

  const [roleRes, userRes] = await Promise.all([
    supabase
      .from('role_permissions')
      .select('role, permission_key, granted')
      .eq('organization_id', organizationId),
    supabase
      .from('user_permission_overrides')
      .select('user_id, permission_key, granted')
      .eq('organization_id', organizationId)
      .eq('user_id', userId),
  ]);

  if (roleRes.data) {
    for (const row of roleRes.data) {
      const key = buildKey(row.role);
      const list = _orgRoleOverrides!.get(key) || [];
      list.push({ permission_key: row.permission_key, granted: row.granted });
      _orgRoleOverrides!.set(key, list);
    }
  }

  if (userRes.data) {
    const list: OrgOverride[] = userRes.data.map(r => ({
      permission_key: r.permission_key,
      granted: r.granted,
    }));
    _orgUserOverrides!.set(buildUserKey(userId), list);
  }
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/** Check a single permission (3-tier) */
export function usePermission(permission: string): boolean {
  const { userRole } = useRole();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [orgReady, setOrgReady] = useState(false);

  const orgId = profile?.organization_id;
  const userId = profile?.id;

  // Fetch org overrides in production mode (once)
  useEffect(() => {
    if (isDemoMode || !orgId || !userId) {
      setOrgReady(true);
      return;
    }
    if (!_fetchPromise) {
      _fetchPromise = fetchOrgOverrides(orgId, userId).then(() => setOrgReady(true));
    } else {
      _fetchPromise.then(() => setOrgReady(true));
    }
  }, [isDemoMode, orgId, userId]);

  return useMemo(() => {
    if (isDemoMode || !orgReady) {
      // Demo mode or not yet loaded: use static defaults only
      return checkAgainstDefaults(userRole, permission);
    }

    // Tier 1: user-level exception
    const userOverrides = _orgUserOverrides?.get(buildUserKey(userId ?? ''));
    if (userOverrides) {
      const match = userOverrides.find(o => o.permission_key === permission);
      if (match) return match.granted;
    }

    // Tier 2: org role override
    const roleOverrides = _orgRoleOverrides?.get(buildKey(userRole));
    if (roleOverrides) {
      const match = roleOverrides.find(o => o.permission_key === permission);
      if (match) return match.granted;
    }

    // Tier 3: system defaults
    return checkAgainstDefaults(userRole, permission);
  }, [userRole, permission, isDemoMode, orgReady, userId]);
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
  return checkAgainstDefaults(role, permission);
}
