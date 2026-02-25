/**
 * ROLE-PERMS-1 — Confirmation modal for role-level permission changes.
 *
 * Shown when toggling a role-level permission that affects multiple users.
 * Displays the permission, the role, and the number of affected users.
 */

import { X, AlertTriangle, Users } from 'lucide-react';
import { formatRoleName } from '../../config/permissionCategories';
import type { UserRole } from '../../contexts/RoleContext';

interface ConfirmRoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  role: UserRole;
  permissionLabel: string;
  permissionKey: string;
  newValue: boolean;
  affectedUserCount: number;
}

export function ConfirmRoleChangeModal({
  isOpen,
  onClose,
  onConfirm,
  role,
  permissionLabel,
  permissionKey,
  newValue,
  affectedUserCount,
}: ConfirmRoleChangeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-md rounded-xl shadow-xl border"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold" style={{ color: '#1E2D4D' }}>
              Confirm Permission Change
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: '#6B7F96' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm" style={{ color: '#3D5068' }}>
            You are about to <strong>{newValue ? 'grant' : 'revoke'}</strong> the
            following permission for the <strong>{formatRoleName(role)}</strong> role:
          </p>

          <div
            className="px-4 py-3 rounded-lg border"
            style={{ backgroundColor: 'var(--bg-panel, #EEF1F7)', borderColor: 'var(--border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: '#1E2D4D' }}>
              {permissionLabel}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#6B7F96' }}>
              {permissionKey}
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
            <Users className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              This change will affect{' '}
              <strong>
                {affectedUserCount} user{affectedUserCount !== 1 ? 's' : ''}
              </strong>{' '}
              with the {formatRoleName(role)} role (unless they have individual exceptions).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: '#3D5068' }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: newValue ? '#1e4d6b' : '#dc2626' }}
            onMouseEnter={e =>
              (e.currentTarget.style.backgroundColor = newValue ? '#2a6a8f' : '#b91c1c')
            }
            onMouseLeave={e =>
              (e.currentTarget.style.backgroundColor = newValue ? '#1e4d6b' : '#dc2626')
            }
          >
            {newValue ? 'Grant' : 'Revoke'} for {affectedUserCount} user
            {affectedUserCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
