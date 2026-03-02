/**
 * ROLE-PERMS-1 — Hook for role permission + user exception CRUD.
 *
 * In demo mode all state lives in React useState, seeded from
 * demoPermissionsData.ts.  In production the hook reads/writes
 * Supabase tables: role_permissions, user_permission_overrides,
 * permission_audit_log.
 */

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getRoleDefaultPermissions, isProtectedPermission, ADMIN_ONLY_ROLES } from '../config/permissionCategories';
import {
  DEMO_ROLE_OVERRIDES,
  DEMO_USER_EXCEPTIONS,
  DEMO_AUDIT_LOG,
  DEMO_TEAM_MEMBERS,
  type RolePermissionOverride,
  type UserPermissionException,
  type PermissionAuditEntry,
  type DemoTeamMember,
} from '../data/demoPermissionsData';
import type { UserRole } from '../contexts/RoleContext';

/* ------------------------------------------------------------------ */
/*  Return type                                                        */
/* ------------------------------------------------------------------ */

export interface UseRolePermissionsReturn {
  /** Role-level overrides (org customizations) */
  roleOverrides: RolePermissionOverride[];
  /** Per-user permission exceptions */
  userExceptions: UserPermissionException[];
  /** Audit log entries */
  auditLog: PermissionAuditEntry[];
  /** Team members list (for exception modal user picker) */
  teamMembers: DemoTeamMember[];
  /** Loading state */
  loading: boolean;

  /** Check if a permission is granted for a role (including org overrides) */
  isPermissionGranted: (role: UserRole, permissionKey: string) => boolean;

  /** Toggle a role-level permission */
  toggleRolePermission: (role: UserRole, permissionKey: string, granted: boolean) => void;

  /** Add a per-user exception */
  addUserException: (
    userId: string,
    userName: string,
    userEmail: string,
    userRole: UserRole,
    permissionKey: string,
    granted: boolean,
    reason: string,
  ) => void;

  /** Remove a single user exception */
  removeUserException: (exceptionId: string) => void;

  /** Reset all exceptions for a user back to role defaults */
  resetUserToDefaults: (userId: string) => void;

  /** Get grouped exceptions by user */
  getExceptionsByUser: () => Map<string, UserPermissionException[]>;

  /** Count of users with overrides for a given permission+role */
  getUserCountForRole: (role: UserRole) => number;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

let idCounter = 100;
function nextId(prefix: string) {
  return `${prefix}-${++idCounter}`;
}

export function useRolePermissions(): UseRolePermissionsReturn {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();

  // ── State (demo: seeded, production: empty until loaded from Supabase) ──
  const [roleOverrides, setRoleOverrides] = useState<RolePermissionOverride[]>(
    isDemoMode ? [...DEMO_ROLE_OVERRIDES] : [],
  );
  const [userExceptions, setUserExceptions] = useState<UserPermissionException[]>(
    isDemoMode ? [...DEMO_USER_EXCEPTIONS] : [],
  );
  const [auditLog, setAuditLog] = useState<PermissionAuditEntry[]>(
    isDemoMode ? [...DEMO_AUDIT_LOG] : [],
  );
  const [loading] = useState(false);
  const teamMembers = isDemoMode ? DEMO_TEAM_MEMBERS : [];

  // ── Helpers ─────────────────────────────────────────────────────

  const currentUserName = useMemo(() => {
    if (isDemoMode) return 'James Chen';
    return profile?.full_name ?? 'Unknown';
  }, [isDemoMode, profile]);

  /** Resolve whether a permission is granted for a role (default + org override) */
  const isPermissionGranted = useCallback(
    (role: UserRole, permissionKey: string): boolean => {
      // Check org-level override first
      const override = roleOverrides.find(
        o => o.role === role && o.permissionKey === permissionKey,
      );
      if (override) return override.granted;

      // Fall back to system default
      const defaults = getRoleDefaultPermissions(role);
      return defaults.has(permissionKey);
    },
    [roleOverrides],
  );

  /** Get number of team members with a given role */
  const getUserCountForRole = useCallback(
    (role: UserRole): number => {
      return teamMembers.filter(m => m.role === role).length;
    },
    [teamMembers],
  );

  // ── Mutations ───────────────────────────────────────────────────

  const toggleRolePermission = useCallback(
    (role: UserRole, permissionKey: string, granted: boolean) => {
      // Block protected permissions for non-admin roles
      if (isProtectedPermission(permissionKey) && !ADMIN_ONLY_ROLES.includes(role)) {
        toast.error('This permission is restricted to Owner and Executive roles');
        return;
      }

      const now = new Date().toISOString();

      setRoleOverrides(prev => {
        const existing = prev.findIndex(
          o => o.role === role && o.permissionKey === permissionKey,
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], granted, modifiedBy: currentUserName, modifiedAt: now };
          return updated;
        }
        return [
          ...prev,
          {
            id: nextId('ro'),
            role,
            permissionKey,
            granted,
            modifiedBy: currentUserName,
            modifiedAt: now,
          },
        ];
      });

      // Audit entry
      const defaults = getRoleDefaultPermissions(role);
      const oldValue = defaults.has(permissionKey);
      setAuditLog(prev => [
        {
          id: nextId('al'),
          changedBy: currentUserName,
          changeType: 'role_default_change',
          targetRole: role,
          permissionKey,
          oldValue,
          newValue: granted,
          timestamp: now,
        },
        ...prev,
      ]);

      if (!isDemoMode) {
        // Production: upsert to Supabase
        supabase
          .from('role_permissions')
          .upsert(
            {
              organization_id: profile?.organization_id,
              role,
              permission_key: permissionKey,
              granted,
              modified_by: profile?.id,
              updated_at: now,
            },
            { onConflict: 'organization_id,role,permission_key' },
          )
          .then(({ error }) => {
            if (error) toast.error('Failed to save permission change');
          });
      }

      toast.success(`Permission updated${isDemoMode ? ' (Demo)' : ''}`);
    },
    [currentUserName, isDemoMode, profile],
  );

  const addUserException = useCallback(
    (
      userId: string,
      userName: string,
      userEmail: string,
      userRole: UserRole,
      permissionKey: string,
      granted: boolean,
      reason: string,
    ) => {
      if (isProtectedPermission(permissionKey) && !ADMIN_ONLY_ROLES.includes(userRole)) {
        toast.error('This permission is restricted to Owner and Executive roles');
        return;
      }

      const now = new Date().toISOString();
      const id = nextId('ue');

      // Remove existing exception for same user+permission (replace)
      setUserExceptions(prev => {
        const filtered = prev.filter(
          e => !(e.userId === userId && e.permissionKey === permissionKey),
        );
        return [
          ...filtered,
          {
            id,
            userId,
            userName,
            userEmail,
            userRole,
            permissionKey,
            granted,
            reason,
            grantedBy: currentUserName,
            grantedAt: now,
          },
        ];
      });

      setAuditLog(prev => [
        {
          id: nextId('al'),
          changedBy: currentUserName,
          changeType: 'user_exception_add',
          targetUserId: userId,
          targetUserName: userName,
          permissionKey,
          newValue: granted,
          reason,
          timestamp: now,
        },
        ...prev,
      ]);

      if (!isDemoMode) {
        supabase
          .from('user_permission_overrides')
          .upsert(
            {
              organization_id: profile?.organization_id,
              user_id: userId,
              permission_key: permissionKey,
              granted,
              reason,
              granted_by: profile?.id,
              updated_at: now,
            },
            { onConflict: 'organization_id,user_id,permission_key' },
          )
          .then(({ error }) => {
            if (error) toast.error('Failed to save user exception');
          });
      }

      toast.success(`Exception added for ${userName}${isDemoMode ? ' (Demo)' : ''}`);
    },
    [currentUserName, isDemoMode, profile],
  );

  const removeUserException = useCallback(
    (exceptionId: string) => {
      const exception = userExceptions.find(e => e.id === exceptionId);
      if (!exception) return;

      setUserExceptions(prev => prev.filter(e => e.id !== exceptionId));

      setAuditLog(prev => [
        {
          id: nextId('al'),
          changedBy: currentUserName,
          changeType: 'user_exception_remove',
          targetUserId: exception.userId,
          targetUserName: exception.userName,
          permissionKey: exception.permissionKey,
          oldValue: exception.granted,
          newValue: !exception.granted,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);

      if (!isDemoMode) {
        supabase
          .from('user_permission_overrides')
          .delete()
          .eq('organization_id', profile?.organization_id)
          .eq('user_id', exception.userId)
          .eq('permission_key', exception.permissionKey)
          .then(({ error }) => {
            if (error) toast.error('Failed to remove exception');
          });
      }

      toast.success(`Exception removed${isDemoMode ? ' (Demo)' : ''}`);
    },
    [userExceptions, currentUserName, isDemoMode, profile],
  );

  const resetUserToDefaults = useCallback(
    (userId: string) => {
      const removed = userExceptions.filter(e => e.userId === userId);
      if (removed.length === 0) return;

      const userName = removed[0].userName;
      setUserExceptions(prev => prev.filter(e => e.userId !== userId));

      setAuditLog(prev => [
        {
          id: nextId('al'),
          changedBy: currentUserName,
          changeType: 'user_reset',
          targetUserId: userId,
          targetUserName: userName,
          permissionKey: '*',
          newValue: false,
          reason: 'Reset all exceptions to role defaults',
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);

      if (!isDemoMode) {
        supabase
          .from('user_permission_overrides')
          .delete()
          .eq('organization_id', profile?.organization_id)
          .eq('user_id', userId)
          .then(({ error }) => {
            if (error) toast.error('Failed to reset user');
          });
      }

      toast.success(`${userName} reset to role defaults${isDemoMode ? ' (Demo)' : ''}`);
    },
    [userExceptions, currentUserName, isDemoMode, profile],
  );

  const getExceptionsByUser = useCallback(() => {
    const map = new Map<string, UserPermissionException[]>();
    for (const e of userExceptions) {
      const list = map.get(e.userId) || [];
      list.push(e);
      map.set(e.userId, list);
    }
    return map;
  }, [userExceptions]);

  return {
    roleOverrides,
    userExceptions,
    auditLog,
    teamMembers,
    loading,
    isPermissionGranted,
    toggleRolePermission,
    addUserException,
    removeUserException,
    resetUserToDefaults,
    getExceptionsByUser,
    getUserCountForRole,
  };
}
