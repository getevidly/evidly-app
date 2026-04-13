/**
 * ROLE-PERMS-1 — Expandable card showing permissions for one module.
 *
 * Each row is a toggle that reflects the role's current grant state.
 * Protected permissions show a lock badge and cannot be toggled for
 * non-admin roles. When used in user-exception mode, overridden
 * permissions are highlighted with the Gold accent colour.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, Shield } from 'lucide-react';
import type { PermissionCategory, Permission } from '../../config/permissionCategories';
import { isProtectedPermission, ADMIN_ONLY_ROLES } from '../../config/permissionCategories';
import type { UserRole } from '../../contexts/RoleContext';

interface PermissionCategoryCardProps {
  category: PermissionCategory;
  role: UserRole;
  /** Whether each permission key is granted */
  getGranted: (key: string) => boolean;
  /** Called when a toggle is flipped */
  onToggle: (key: string, granted: boolean) => void;
  /** If present, treat this as user-exception mode: highlight overrides */
  overriddenKeys?: Set<string>;
  /** Disable all toggles (read-only) */
  disabled?: boolean;
  /** Start expanded */
  defaultOpen?: boolean;
}

export function PermissionCategoryCard({
  category,
  role,
  getGranted,
  onToggle,
  overriddenKeys,
  disabled,
  defaultOpen = false,
}: PermissionCategoryCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isAdminRole = ADMIN_ONLY_ROLES.includes(role);

  const grantedCount = category.permissions.filter(p => getGranted(p.key)).length;
  const totalCount = category.permissions.length;

  return (
    <div
      className="rounded-xl border overflow-hidden transition-shadow"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{category.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold" style={{ color: '#1E2D4D' }}>
                {category.label}
              </span>
              {category.protected && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Lock className="w-3 h-3" />
                  Protected
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: '#6B7F96' }}>
              {category.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#EEF1F7', color: '#3D5068' }}>
            {grantedCount}/{totalCount}
          </span>
          {open ? (
            <ChevronDown className="w-5 h-5" style={{ color: '#6B7F96' }} />
          ) : (
            <ChevronRight className="w-5 h-5" style={{ color: '#6B7F96' }} />
          )}
        </div>
      </button>

      {/* Permission rows */}
      {open && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          {category.permissions.map(perm => (
            <PermissionRow
              key={perm.key}
              permission={perm}
              granted={getGranted(perm.key)}
              isAdminRole={isAdminRole}
              isOverridden={overriddenKeys?.has(perm.key) ?? false}
              disabled={disabled ?? false}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single permission row                                              */
/* ------------------------------------------------------------------ */

function PermissionRow({
  permission,
  granted,
  isAdminRole,
  isOverridden,
  disabled,
  onToggle,
}: {
  permission: Permission;
  granted: boolean;
  isAdminRole: boolean;
  isOverridden: boolean;
  disabled: boolean;
  onToggle: (key: string, granted: boolean) => void;
}) {
  const isProtected = isProtectedPermission(permission.key);
  const isLocked = isProtected && !isAdminRole;

  return (
    <div
      className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 transition-colors"
      style={{
        borderColor: 'var(--border-subtle, #E8EDF5)',
        backgroundColor: isOverridden ? 'rgba(160, 140, 90, 0.06)' : undefined,
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: '#1E2D4D' }}>
              {permission.label}
            </span>
            {isProtected && (
              <Shield className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
            )}
            {isOverridden && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'rgba(160, 140, 90, 0.15)', color: '#A08C5A' }}
              >
                OVERRIDE
              </span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: '#6B7F96' }}>
            {permission.description}
          </p>
        </div>
      </div>

      {/* Toggle switch */}
      <button
        type="button"
        role="switch"
        aria-checked={granted}
        disabled={disabled || isLocked}
        onClick={() => onToggle(permission.key, !granted)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2
          ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          backgroundColor: granted
            ? isOverridden ? '#A08C5A' : '#1e4d6b'
            : '#D1D9E6',
          ...(granted && !isLocked ? { boxShadow: '0 0 0 2px transparent' } : {}),
        }}
        title={isLocked ? 'Restricted to Owner/Executive roles' : permission.label}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${granted ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
