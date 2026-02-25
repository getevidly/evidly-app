/**
 * ROLE-PERMS-1 — Modal for adding/editing user permission exceptions.
 *
 * Two modes:
 *   1. "Add" — pick a user from team members, then set overrides
 *   2. "Edit" — pre-populated with existing user, show role defaults
 *      as greyed baseline and highlight overrides in Gold
 */

import { useState, useMemo } from 'react';
import { X, Search, Check, Shield, RotateCcw } from 'lucide-react';
import {
  getPermissionCategories,
  formatRoleName,
  isProtectedPermission,
  ADMIN_ONLY_ROLES,
  type PermissionCategory,
} from '../../config/permissionCategories';
import type { DemoTeamMember, UserPermissionException } from '../../data/demoPermissionsData';
import type { UserRole } from '../../contexts/RoleContext';

interface UserExceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: DemoTeamMember[];
  /** Existing exceptions for all users */
  existingExceptions: UserPermissionException[];
  /** Pre-selected user (edit mode) */
  editUserId?: string | null;
  /** Get whether a permission is granted by role default */
  isRoleDefault: (role: UserRole, key: string) => boolean;
  /** Save callback */
  onSave: (
    userId: string,
    userName: string,
    userEmail: string,
    userRole: UserRole,
    permissionKey: string,
    granted: boolean,
    reason: string,
  ) => void;
  onRemoveException: (exceptionId: string) => void;
  onResetUser: (userId: string) => void;
}

export function UserExceptionModal({
  isOpen,
  onClose,
  teamMembers,
  existingExceptions,
  editUserId,
  isRoleDefault,
  onSave,
  onRemoveException,
  onResetUser,
}: UserExceptionModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(editUserId ?? null);
  const [userSearch, setUserSearch] = useState('');
  const [reason, setReason] = useState('');

  // Track pending overrides (not yet saved)
  const [pendingOverrides, setPendingOverrides] = useState<Map<string, boolean>>(new Map());

  const categories = useMemo(() => getPermissionCategories(), []);

  const selectedUser = useMemo(
    () => teamMembers.find(m => m.id === selectedUserId),
    [teamMembers, selectedUserId],
  );

  // Filter to users who aren't owner/exec (they have full access already)
  const selectableUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    return teamMembers
      .filter(m => !ADMIN_ONLY_ROLES.includes(m.role))
      .filter(m => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [teamMembers, userSearch]);

  // Existing exceptions for selected user
  const userExceptions = useMemo(() => {
    if (!selectedUserId) return [];
    return existingExceptions.filter(e => e.userId === selectedUserId);
  }, [existingExceptions, selectedUserId]);

  const userExceptionMap = useMemo(() => {
    const map = new Map<string, UserPermissionException>();
    for (const e of userExceptions) map.set(e.permissionKey, e);
    return map;
  }, [userExceptions]);

  if (!isOpen) return null;

  const handleToggleOverride = (key: string) => {
    if (!selectedUser) return;
    if (isProtectedPermission(key) && !ADMIN_ONLY_ROLES.includes(selectedUser.role)) return;

    const roleDefault = isRoleDefault(selectedUser.role, key);
    const existingException = userExceptionMap.get(key);

    if (existingException) {
      // Remove existing exception (revert to role default)
      onRemoveException(existingException.id);
    } else {
      // Add new override: flip the role default
      onSave(
        selectedUser.id,
        selectedUser.name,
        selectedUser.email,
        selectedUser.role,
        key,
        !roleDefault,
        reason || 'Manual override',
      );
    }
  };

  const handleResetUser = () => {
    if (selectedUserId) {
      onResetUser(selectedUserId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl shadow-xl border"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: '#1E2D4D' }}>
            {editUserId ? 'Edit User Permissions' : 'Add User Exception'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: '#6B7F96' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Step 1: Select user (or show selected user) */}
          {!selectedUser ? (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1E2D4D' }}>
                Select a team member
              </label>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#6B7F96' }} />
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2"
                  style={{ borderColor: 'var(--border)', color: '#1E2D4D' }}
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                {selectableUsers.length === 0 ? (
                  <p className="px-4 py-3 text-sm" style={{ color: '#6B7F96' }}>
                    No matching team members
                  </p>
                ) : (
                  selectableUsers.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedUserId(member.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0"
                      style={{ borderColor: 'var(--border-subtle, #E8EDF5)' }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#1E2D4D' }}>
                          {member.name}
                        </p>
                        <p className="text-xs" style={{ color: '#6B7F96' }}>
                          {member.email} — {formatRoleName(member.role)}
                        </p>
                      </div>
                      {existingExceptions.some(e => e.userId === member.id) && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(160, 140, 90, 0.15)', color: '#A08C5A' }}
                        >
                          HAS OVERRIDES
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Selected user header */}
              <div
                className="flex items-center justify-between px-4 py-3 rounded-lg border"
                style={{ backgroundColor: 'var(--bg-panel, #EEF1F7)', borderColor: 'var(--border)' }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#1E2D4D' }}>
                    {selectedUser.name}
                  </p>
                  <p className="text-xs" style={{ color: '#6B7F96' }}>
                    {selectedUser.email} — {formatRoleName(selectedUser.role)} — {selectedUser.location}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {userExceptions.length > 0 && (
                    <button
                      onClick={handleResetUser}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-red-50"
                      style={{ borderColor: 'var(--border)', color: '#dc2626' }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset All
                    </button>
                  )}
                  {!editUserId && (
                    <button
                      onClick={() => setSelectedUserId(null)}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                      style={{ borderColor: 'var(--border)', color: '#3D5068' }}
                    >
                      Change User
                    </button>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#3D5068' }}>
                  Reason for override (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Temporary access for Q1 review"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2"
                  style={{ borderColor: 'var(--border)', color: '#1E2D4D' }}
                />
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs" style={{ color: '#6B7F96' }}>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#D1D9E6' }} />
                  Role default
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#A08C5A' }} />
                  Custom override
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-amber-500" />
                  Protected
                </span>
              </div>

              {/* Permission grid */}
              <div className="space-y-3">
                {categories.map(cat => (
                  <UserExceptionCategoryCard
                    key={cat.id}
                    category={cat}
                    userRole={selectedUser.role}
                    isRoleDefault={isRoleDefault}
                    exceptionMap={userExceptionMap}
                    onToggle={handleToggleOverride}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: '#3D5068' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category card for user exception mode                              */
/* ------------------------------------------------------------------ */

function UserExceptionCategoryCard({
  category,
  userRole,
  isRoleDefault,
  exceptionMap,
  onToggle,
}: {
  category: PermissionCategory;
  userRole: UserRole;
  isRoleDefault: (role: UserRole, key: string) => boolean;
  exceptionMap: Map<string, UserPermissionException>;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isAdminRole = ADMIN_ONLY_ROLES.includes(userRole);

  const overrideCount = category.permissions.filter(p => exceptionMap.has(p.key)).length;

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{category.icon}</span>
          <span className="text-sm font-medium" style={{ color: '#1E2D4D' }}>
            {category.label}
          </span>
          {overrideCount > 0 && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(160, 140, 90, 0.15)', color: '#A08C5A' }}
            >
              {overrideCount} override{overrideCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: '#6B7F96' }}>
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: 'var(--border-subtle, #E8EDF5)' }}>
          {category.permissions.map(perm => {
            const roleDefault = isRoleDefault(userRole, perm.key);
            const exception = exceptionMap.get(perm.key);
            const effectiveValue = exception ? exception.granted : roleDefault;
            const isOverridden = !!exception;
            const isProtected = isProtectedPermission(perm.key);
            const isLocked = isProtected && !isAdminRole;

            return (
              <div
                key={perm.key}
                className="flex items-center justify-between px-4 py-2.5 border-b last:border-b-0"
                style={{
                  borderColor: 'var(--border-subtle, #E8EDF5)',
                  backgroundColor: isOverridden ? 'rgba(160, 140, 90, 0.06)' : undefined,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs truncate" style={{ color: isOverridden ? '#A08C5A' : '#3D5068' }}>
                    {perm.label}
                  </span>
                  {isProtected && <Shield className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                  {isOverridden && (
                    <span
                      className="text-[9px] font-bold px-1 py-0 rounded"
                      style={{ backgroundColor: 'rgba(160, 140, 90, 0.2)', color: '#A08C5A' }}
                    >
                      CUSTOM
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={effectiveValue}
                  disabled={isLocked}
                  onClick={() => onToggle(perm.key)}
                  className={`
                    relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent
                    transition-colors duration-200 ease-in-out
                    ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  style={{
                    backgroundColor: effectiveValue
                      ? isOverridden ? '#A08C5A' : '#1e4d6b'
                      : '#D1D9E6',
                  }}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0
                      transition duration-200 ease-in-out
                      ${effectiveValue ? 'translate-x-4' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
