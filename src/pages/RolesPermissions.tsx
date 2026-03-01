/**
 * ROLE-PERMS-1 — Roles & Permissions Management Page
 *
 * /settings/roles-permissions
 *
 * Access: Owner/Operator and Executive only.
 * Two-layer system: role-level defaults + per-user exceptions.
 */

import { useState, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, ChevronDown, Info } from 'lucide-react';
import { useRole, type UserRole } from '../contexts/RoleContext';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import {
  getPermissionCategories,
  formatRoleName,
  MANAGEABLE_ROLES,
  ADMIN_ONLY_ROLES,
  getRoleDefaultPermissions,
  isProtectedPermission,
} from '../config/permissionCategories';
import { PermissionCategoryCard } from '../components/permissions/PermissionCategoryCard';
import { UserExceptionsTable } from '../components/permissions/UserExceptionsTable';
import { UserExceptionModal } from '../components/permissions/UserExceptionModal';
import { ConfirmRoleChangeModal } from '../components/permissions/ConfirmRoleChangeModal';

/* ------------------------------------------------------------------ */
/*  Permission display names                                           */
/* ------------------------------------------------------------------ */

const PERMISSION_DISPLAY_NAMES: Record<string, string> = {
  'sidebar.dashboard': 'Dashboard',
  'sidebar.checklists': 'Checklists',
  'sidebar.temperatures': 'Temperature Logs',
  'sidebar.haccp': 'HACCP Management',
  'sidebar.cooling-logs': 'Cooling Logs',
  'sidebar.receiving-log': 'Receiving Log',
  'sidebar.allergen-tracking': 'Allergen Tracking',
  'sidebar.facility-safety': 'Facility Safety',
  'sidebar.hood-exhaust': 'Hood & Exhaust',
  'sidebar.hvac': 'HVAC',
  'sidebar.suppression-systems': 'Suppression Systems',
  'sidebar.vendors': 'Vendor Management',
  'sidebar.vendor-certifications': 'Vendor Certifications',
  'sidebar.services': 'Services',
  'sidebar.team': 'Team Management',
  'sidebar.score-table': 'Location Leaderboard',
  'sidebar.reporting': 'Reports',
  'sidebar.export-center': 'Export Center',
  'sidebar.service-reporting': 'Service Reporting',
  'sidebar.ai-insights': 'AI Insights',
  'sidebar.analytics': 'Analytics',
  'sidebar.intelligence': 'Intelligence Hub',
  'sidebar.jurisdiction-intelligence': 'Jurisdiction Intelligence',
  'sidebar.regulatory': 'Regulatory Updates',
  'sidebar.benchmarks': 'Benchmarks',
  'sidebar.business-intelligence': 'Business Intelligence',
  'sidebar.violation-trends': 'Violation Trends',
  'sidebar.iot-dashboard': 'IoT Dashboard',
  'sidebar.refrigeration': 'Refrigeration',
  'sidebar.ice-machines': 'Ice Machines',
  'sidebar.incidents': 'Incident Reports',
  'sidebar.corrective-actions': 'Corrective Actions',
  'sidebar.self-inspection': 'Self-Inspection',
  'sidebar.audit-log': 'Audit Log',
  'sidebar.documents': 'Documents',
  'sidebar.food-recovery': 'Food Recovery',
  'sidebar.waste-diversion': 'Waste Diversion Log',
  'sidebar.recovery-agreements': 'Recovery Agreements',
  'sidebar.usda-production-records': 'USDA Production Records',
  'sidebar.usda-meal-patterns': 'USDA Meal Patterns',
  'sidebar.usda-cn-labels': 'CN Labels',
  'sidebar.self-diagnosis': 'Self-Diagnosis',
  'sidebar.report-issue': 'Report Issue',
  'sidebar.settings': 'Settings',
  'sidebar.roles-permissions': 'Role Permissions',
  'sidebar.billing': 'Billing',
  'sidebar.help': 'Help & Support',
  'dashboard.hero': 'Compliance Scores',
  'dashboard.alerts': 'Dashboard Alerts',
  'dashboard.location-health': 'Location Health',
  'dashboard.trend': 'Trend Charts',
  'dashboard.kpis': 'KPIs',
  'dashboard.tasks': 'Dashboard Tasks',
  'dashboard.start': 'Quick Start Panel',
  'dashboard.jurisdiction-matrix': 'Jurisdiction Matrix',
  'permission.manage_roles': 'Manage Role Permissions',
  'billing.manage': 'Manage Billing',
  'org.delete': 'Delete Organization',
  'org.transfer_ownership': 'Transfer Ownership',
  'team.manage_roles': 'Manage Roles',
  'settings_access': 'Settings Access',
  'help_access': 'Help Access',
};

function getPermissionDisplayName(key: string): string {
  return PERMISSION_DISPLAY_NAMES[key] || key.replace(/^(sidebar|dashboard|bottom|page)\./, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PendingChange {
  role: UserRole;
  permissionKey: string;
  permissionLabel: string;
  newValue: boolean;
  affectedUserCount: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RolesPermissions() {
  const { userRole } = useRole();

  // ── Access check ────────────────────────────────────────────────
  if (!ADMIN_ONLY_ROLES.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <RolesPermissionsInner />;
}

function RolesPermissionsInner() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('owner_operator');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  const {
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
    getUserCountForRole,
  } = useRolePermissions();

  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const categories = useMemo(() => getPermissionCategories(), []);
  const userCount = getUserCountForRole(selectedRole);

  // ── Role permission toggle with confirmation ─────────────────
  const handleRoleToggle = useCallback(
    (permissionKey: string, newValue: boolean) => {
      // Protected check
      if (isProtectedPermission(permissionKey) && !ADMIN_ONLY_ROLES.includes(selectedRole)) {
        return; // blocked at toggle level already
      }

      guardAction('edit', 'Roles & Permissions', () => {
        const count = getUserCountForRole(selectedRole);

        if (count > 1) {
          // Find the label
          const label =
            categories.flatMap(c => c.permissions).find(p => p.key === permissionKey)?.label ??
            permissionKey;

          setPendingChange({
            role: selectedRole,
            permissionKey,
            permissionLabel: label,
            newValue,
            affectedUserCount: count,
          });
        } else {
          toggleRolePermission(selectedRole, permissionKey, newValue);
        }
      });
    },
    [selectedRole, categories, getUserCountForRole, toggleRolePermission, guardAction],
  );

  const confirmPendingChange = useCallback(() => {
    if (!pendingChange) return;
    toggleRolePermission(pendingChange.role, pendingChange.permissionKey, pendingChange.newValue);
    setPendingChange(null);
  }, [pendingChange, toggleRolePermission]);

  // ── User exception handlers ──────────────────────────────────
  const handleAddException = () => {
    guardAction('create', 'Roles & Permissions', () => {
      setEditUserId(null);
      setShowExceptionModal(true);
    });
  };

  const handleEditUser = (userId: string) => {
    guardAction('edit', 'Roles & Permissions', () => {
      setEditUserId(userId);
      setShowExceptionModal(true);
    });
  };

  /** Resolve effective grant for current selected role */
  const getGrantedForRole = useCallback(
    (key: string) => isPermissionGranted(selectedRole, key),
    [selectedRole, isPermissionGranted],
  );

  return (
    <div className="space-y-8 pb-12">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(160, 140, 90, 0.12)' }}
          >
            <Shield className="w-5 h-5" style={{ color: '#A08C5A' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1E2D4D' }}>
              Role Permissions
            </h1>
            <p className="text-sm" style={{ color: '#6B7F96' }}>
              Manage default permissions for each role and per-user exceptions
            </p>
          </div>
        </div>
      </div>

      {/* ── Role Selector ────────────────────────────────────────── */}
      <div
        className="rounded-xl border px-6 py-5"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#1E2D4D' }}>
              Select a role to manage
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50 min-w-[240px] justify-between"
                style={{ borderColor: 'var(--border)', color: '#1E2D4D' }}
              >
                <span>{formatRoleName(selectedRole)}</span>
                <ChevronDown className="w-4 h-4" style={{ color: '#6B7F96' }} />
              </button>

              {roleDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setRoleDropdownOpen(false)} />
                  <div
                    className="absolute top-full left-0 mt-1 w-full rounded-lg border shadow-lg z-20 overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  >
                    {MANAGEABLE_ROLES.map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setSelectedRole(role);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                          role === selectedRole ? 'font-semibold' : ''
                        }`}
                        style={{ color: '#1E2D4D' }}
                      >
                        <span>{formatRoleName(role)}</span>
                        {role === selectedRole && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(30, 77, 107, 0.1)', color: '#1e4d6b' }}>
                            Selected
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border"
              style={{ backgroundColor: 'var(--bg-panel, #EEF1F7)', borderColor: 'var(--border)' }}
            >
              <Info className="w-4 h-4" style={{ color: '#6B7F96' }} />
              <span className="text-sm" style={{ color: '#3D5068' }}>
                <strong>{userCount}</strong> user{userCount !== 1 ? 's' : ''} with this role
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Permission Grid ──────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#1E2D4D' }}>
          Role Default Permissions
        </h2>
        <p className="text-sm mb-5" style={{ color: '#6B7F96' }}>
          These defaults apply to all {formatRoleName(selectedRole)} users unless they have individual exceptions.
        </p>
        <div className="space-y-4">
          {categories.map(category => (
            <PermissionCategoryCard
              key={category.id}
              category={category}
              role={selectedRole}
              getGranted={getGrantedForRole}
              onToggle={handleRoleToggle}
            />
          ))}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="border-t" style={{ borderColor: 'var(--border)' }} />

      {/* ── User Exceptions ──────────────────────────────────────── */}
      <UserExceptionsTable
        exceptions={userExceptions}
        onAddException={handleAddException}
        onEditUser={handleEditUser}
        onRemoveException={removeUserException}
        onResetUser={resetUserToDefaults}
      />

      {/* ── Audit Log Preview ────────────────────────────────────── */}
      {auditLog.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold" style={{ color: '#1E2D4D' }}>
              Recent Permission Changes
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle, #E8EDF5)' }}>
            {auditLog.slice(0, 10).map(entry => (
              <div key={entry.id} className="px-6 py-3 flex items-start gap-4">
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    entry.changeType === 'user_reset'
                      ? 'bg-amber-400'
                      : entry.newValue
                      ? 'bg-green-400'
                      : 'bg-red-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: '#1E2D4D' }}>
                    <strong>{entry.changedBy}</strong>{' '}
                    {entry.changeType === 'role_default_change' && (
                      <>
                        {entry.newValue ? 'granted' : 'revoked'}{' '}
                        <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-panel, #EEF1F7)' }}>
                          {getPermissionDisplayName(entry.permissionKey)}
                        </code>{' '}
                        for role <strong>{entry.targetRole && formatRoleName(entry.targetRole as UserRole)}</strong>
                      </>
                    )}
                    {entry.changeType === 'user_exception_add' && (
                      <>
                        added exception{' '}
                        <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-panel, #EEF1F7)' }}>
                          {getPermissionDisplayName(entry.permissionKey)}
                        </code>{' '}
                        for <strong>{entry.targetUserName}</strong>
                      </>
                    )}
                    {entry.changeType === 'user_exception_remove' && (
                      <>
                        removed exception{' '}
                        <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-panel, #EEF1F7)' }}>
                          {getPermissionDisplayName(entry.permissionKey)}
                        </code>{' '}
                        for <strong>{entry.targetUserName}</strong>
                      </>
                    )}
                    {entry.changeType === 'user_reset' && (
                      <>
                        reset <strong>{entry.targetUserName}</strong> to role defaults
                      </>
                    )}
                  </p>
                  {entry.reason && (
                    <p className="text-xs mt-0.5" style={{ color: '#6B7F96' }}>
                      Reason: {entry.reason}
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: '#6B7F96' }}>
                    {new Date(entry.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────── */}
      <ConfirmRoleChangeModal
        isOpen={!!pendingChange}
        onClose={() => setPendingChange(null)}
        onConfirm={confirmPendingChange}
        role={pendingChange?.role ?? 'owner_operator'}
        permissionLabel={pendingChange?.permissionLabel ?? ''}
        permissionKey={pendingChange?.permissionKey ?? ''}
        newValue={pendingChange?.newValue ?? true}
        affectedUserCount={pendingChange?.affectedUserCount ?? 0}
      />

      <UserExceptionModal
        isOpen={showExceptionModal}
        onClose={() => {
          setShowExceptionModal(false);
          setEditUserId(null);
        }}
        teamMembers={teamMembers}
        existingExceptions={userExceptions}
        editUserId={editUserId}
        isRoleDefault={(role, key) => isPermissionGranted(role, key)}
        onSave={addUserException}
        onRemoveException={removeUserException}
        onResetUser={resetUserToDefaults}
      />

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
