/**
 * ROLE-PERMS-1 — Table of per-user permission exceptions.
 *
 * Groups exceptions by user, shows override count with a Gold badge,
 * and provides Edit / Reset actions.
 */

import { useState, useMemo } from 'react';
import { Search, UserCog, RotateCcw, Edit2, Trash2, Plus } from 'lucide-react';
import type { UserPermissionException } from '../../data/demoPermissionsData';
import { formatRoleName } from '../../config/permissionCategories';

interface UserExceptionsTableProps {
  exceptions: UserPermissionException[];
  onAddException: () => void;
  onEditUser: (userId: string) => void;
  onRemoveException: (exceptionId: string) => void;
  onResetUser: (userId: string) => void;
}

interface GroupedUser {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  overrides: UserPermissionException[];
  lastModified: string;
  grantedBy: string;
}

export function UserExceptionsTable({
  exceptions,
  onAddException,
  onEditUser,
  onRemoveException,
  onResetUser,
}: UserExceptionsTableProps) {
  const [search, setSearch] = useState('');

  // Group exceptions by user
  const grouped = useMemo(() => {
    const map = new Map<string, GroupedUser>();
    for (const e of exceptions) {
      let group = map.get(e.userId);
      if (!group) {
        group = {
          userId: e.userId,
          userName: e.userName,
          userEmail: e.userEmail,
          userRole: e.userRole,
          overrides: [],
          lastModified: e.grantedAt,
          grantedBy: e.grantedBy,
        };
        map.set(e.userId, group);
      }
      group.overrides.push(e);
      if (e.grantedAt > group.lastModified) {
        group.lastModified = e.grantedAt;
        group.grantedBy = e.grantedBy;
      }
    }
    return Array.from(map.values());
  }, [exceptions]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped.filter(
      g =>
        g.userName.toLowerCase().includes(q) ||
        g.userEmail.toLowerCase().includes(q) ||
        g.overrides.some(o => o.permissionKey.toLowerCase().includes(q)),
    );
  }, [grouped, search]);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5" style={{ color: '#A08C5A' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#1E2D4D' }}>
              User Exceptions
            </h3>
            {exceptions.length > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(160, 140, 90, 0.15)', color: '#A08C5A' }}
              >
                {grouped.length} user{grouped.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={onAddException}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#1e4d6b' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
          >
            <Plus className="w-4 h-4" />
            Add Exception
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#6B7F96' }} />
          <input
            type="text"
            placeholder="Search by user or permission..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={{
              borderColor: 'var(--border)',
              color: '#1E2D4D',
              backgroundColor: 'var(--bg-panel, #EEF1F7)',
            }}
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <UserCog className="w-10 h-10 mx-auto mb-3" style={{ color: '#D1D9E6' }} />
          <p className="text-sm font-medium" style={{ color: '#3D5068' }}>
            {search ? 'No matching exceptions' : 'No user exceptions configured'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#6B7F96' }}>
            {search
              ? 'Try a different search term'
              : 'All users follow their role\u2019s default permissions. Use the Add Exception button to grant or restrict specific permissions for individual team members.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-panel, #EEF1F7)' }}>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7F96' }}>
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7F96' }}>
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7F96' }}>
                  Overrides
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7F96' }}>
                  Last Modified
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7F96' }}>
                  By
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7F96' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(group => (
                <tr
                  key={group.userId}
                  className="border-t hover:bg-gray-50 transition-colors"
                  style={{ borderColor: 'var(--border-subtle, #E8EDF5)' }}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1E2D4D' }}>
                        {group.userName}
                      </p>
                      <p className="text-xs" style={{ color: '#6B7F96' }}>
                        {group.userEmail}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm" style={{ color: '#3D5068' }}>
                      {formatRoleName(group.userRole as any)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(160, 140, 90, 0.15)', color: '#A08C5A' }}
                    >
                      {group.overrides.length} custom
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm" style={{ color: '#6B7F96' }}>
                      {new Date(group.lastModified).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm" style={{ color: '#3D5068' }}>
                      {group.grantedBy}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditUser(group.userId)}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                        style={{ borderColor: 'var(--border)', color: '#1e4d6b' }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => onResetUser(group.userId)}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-red-50"
                        style={{ borderColor: 'var(--border)', color: '#dc2626' }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
