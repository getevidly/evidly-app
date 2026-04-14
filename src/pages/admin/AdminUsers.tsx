/**
 * AdminUsers — User management dashboard
 *
 * Route: /admin/users (replaces existing UserProvisioning link)
 * Access: platform_admin only (AdminShell)
 *
 * Manage users: search, filter, suspend/unsuspend, change roles,
 * reset passwords, revoke sessions. All actions logged to platform_audit_log.
 * NO delete option — SOX requires record retention.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import { toast } from 'sonner';
import Button from '../../components/ui/Button';

const ROLES = [
  'platform_admin', 'owner_operator', 'executive', 'compliance_officer',
  'facilities', 'chef', 'kitchen_manager', 'kitchen_staff',
];

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  owner_operator: 'Owner/Operator',
  executive: 'Executive',
  compliance_officer: 'Compliance Officer',
  facilities: 'Facilities',
  chef: 'Chef',
  kitchen_manager: 'Kitchen Manager',
  kitchen_staff: 'Kitchen Staff',
};

const STATUS_FILTERS = ['All', 'Active', 'Suspended', 'Locked'];

interface UserRow {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  is_suspended: boolean;
  suspended_at: string | null;
  suspend_reason: string | null;
  failed_login_count: number;
  locked_until: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_at: string;
  organization_id: string | null;
}

export default function AdminUsers() {
  useDemoGuard();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Action modals
  const [actionUser, setActionUser] = useState<UserRow | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [actionReason, setActionReason] = useState('');
  const [actionRole, setActionRole] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Invite
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('kitchen_staff');

  // AUDIT-FIX-06 / A-2: More-menu state
  const [moreMenuId, setMoreMenuId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, is_suspended, suspended_at, suspend_reason, failed_login_count, locked_until, last_login_at, last_login_ip, created_at, organization_id')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setUsers((data || []) as UserRow[]);
    } catch {
      setUsers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Filter logic ──
  const filtered = users.filter(u => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.full_name.toLowerCase().includes(q) && !(u.email || '').toLowerCase().includes(q)) return false;
    }
    if (roleFilter !== 'All' && u.role !== roleFilter) return false;
    if (statusFilter === 'Active' && (u.is_suspended || (u.locked_until && new Date(u.locked_until) > new Date()))) return false;
    if (statusFilter === 'Suspended' && !u.is_suspended) return false;
    if (statusFilter === 'Locked' && !(u.locked_until && new Date(u.locked_until) > new Date())) return false;
    return true;
  });

  // ── Stats ──
  const totalUsers = users.length;
  const activeUsers = users.filter(u => !u.is_suspended && !(u.locked_until && new Date(u.locked_until) > new Date())).length;
  const suspendedUsers = users.filter(u => u.is_suspended).length;
  const lockedUsers = users.filter(u => u.locked_until && new Date(u.locked_until) > new Date()).length;

  // ── Actions ──
  const openAction = (u: UserRow, type: string) => {
    setActionUser(u);
    setActionType(type);
    setActionReason('');
    setActionRole(u.role);
  };

  const closeAction = () => {
    setActionUser(null);
    setActionType('');
    setActionReason('');
    setActionLoading(false);
  };

  const logAuditEvent = async (action: string, resourceId: string, oldValue: any, newValue: any) => {
    await supabase.from('platform_audit_log').insert({
      actor_id: user?.id,
      actor_email: user?.email,
      action,
      resource_type: 'user',
      resource_id: resourceId,
      old_value: oldValue,
      new_value: newValue,
    }).catch(() => {});
  };

  const executeAction = async () => {
    if (!actionUser) return;
    setActionLoading(true);

    try {
      switch (actionType) {
        case 'suspend': {
          await supabase.from('user_profiles').update({
            is_suspended: true,
            suspended_at: new Date().toISOString(),
            suspended_by: user?.id,
            suspend_reason: actionReason || 'Admin action',
          }).eq('id', actionUser.id);
          await logAuditEvent('admin.user_suspended', actionUser.id,
            { is_suspended: false }, { is_suspended: true, reason: actionReason });
          toast.success(`${actionUser.full_name} suspended`);
          break;
        }
        case 'unsuspend': {
          await supabase.from('user_profiles').update({
            is_suspended: false,
            suspended_at: null,
            suspended_by: null,
            suspend_reason: null,
          }).eq('id', actionUser.id);
          await logAuditEvent('admin.user_unsuspended', actionUser.id,
            { is_suspended: true }, { is_suspended: false });
          toast.success(`${actionUser.full_name} unsuspended`);
          break;
        }
        case 'change_role': {
          const oldRole = actionUser.role;
          await supabase.from('user_profiles').update({ role: actionRole }).eq('id', actionUser.id);
          await logAuditEvent('admin.user_role_changed', actionUser.id,
            { role: oldRole }, { role: actionRole });
          toast.success(`${actionUser.full_name} role changed to ${ROLE_LABELS[actionRole] || actionRole}`);
          break;
        }
        case 'unlock': {
          await supabase.from('user_profiles').update({
            failed_login_count: 0,
            locked_until: null,
          }).eq('id', actionUser.id);
          await logAuditEvent('admin.user_unlocked', actionUser.id,
            { locked: true }, { locked: false });
          toast.success(`${actionUser.full_name} unlocked`);
          break;
        }
        case 'reset_password': {
          await supabase.auth.resetPasswordForEmail(actionUser.email || '');
          await logAuditEvent('admin.password_reset_sent', actionUser.id, null,
            { email: actionUser.email });
          toast.success(`Password reset email sent to ${actionUser.email}`);
          break;
        }
        case 'revoke_sessions': {
          await supabase.from('user_sessions').update({
            revoked_at: new Date().toISOString(),
            revoke_reason: 'admin_forced',
          }).eq('user_id', actionUser.id).is('revoked_at', null);
          await logAuditEvent('admin.sessions_revoked', actionUser.id, null,
            { reason: 'admin_forced' });
          toast.success(`All sessions revoked for ${actionUser.full_name}`);
          break;
        }
      }
      await loadUsers();
    } catch (err: any) {
      toast.error(`Action failed: ${err?.message || 'Unknown error'}`);
    }
    closeAction();
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setActionLoading(true);
    try {
      await supabase.auth.admin.inviteUserByEmail(inviteEmail);
      await logAuditEvent('admin.user_invited', inviteEmail, null,
        { email: inviteEmail, role: inviteRole });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInvite(false);
      setInviteEmail('');
    } catch (err: any) {
      toast.error(`Invite failed: ${err?.message || 'Unknown error'}`);
    }
    setActionLoading(false);
  };

  // ── Helpers ──
  const getStatus = (u: UserRow) => {
    if (u.is_suspended) return { label: 'Suspended', twText: 'text-red-600', twBg: 'bg-red-50' };
    if (u.locked_until && new Date(u.locked_until) > new Date()) return { label: 'Locked', twText: 'text-amber-500', twBg: 'bg-amber-50' };
    return { label: 'Active', twText: 'text-emerald-500', twBg: 'bg-emerald-50' };
  };

  const relativeTime = (iso: string | null) => {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // ── Render ──
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Failed to load users</p>
        <Button onClick={loadUsers} variant="primary" size="sm" className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'User Management' }]} />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">User Management</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Manage user accounts, roles, and access across EvidLY
          </p>
        </div>
        <Button
          onClick={() => setShowInvite(true)}
          variant="gold" size="sm"
        >
          + Invite User
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile label="Total Users" value={totalUsers} />
        <KpiTile label="Active" value={activeUsers} />
        <KpiTile label="Suspended" value={suspendedUsers} valueColor={suspendedUsers > 0 ? '#DC2626' : undefined} />
        <KpiTile label="Locked" value={lockedUsers} valueColor={lockedUsers > 0 ? '#F59E0B' : undefined} />
      </div>

      {/* Filters */}
      <div className="flex gap-2.5 flex-wrap">
        <input
          className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-60"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="All">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
        </select>
        <select
          className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Users table */}
      <div className="bg-white border border-border_ui-warm rounded-[10px] overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-4 py-2.5 border-b border-border_ui-warm text-[11px] font-bold text-gray-400 uppercase">
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
          <span>Last Login</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-[13px]">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-[13px]">No users match filters</div>
        ) : (
          filtered.map(u => {
            const status = getStatus(u);
            return (
              <div key={u.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-4 py-3 border-b border-border_ui-warm items-center text-[13px]">
                {/* User */}
                <div>
                  <div className="font-semibold text-navy">{u.full_name}</div>
                  <div className="text-[11px] text-gray-400">{u.email || 'No email'}</div>
                </div>

                {/* Role */}
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F0F4F8] text-navy">
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </div>

                {/* Status */}
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${status.twBg} ${status.twText}`}>
                    {status.label}
                  </span>
                  {u.failed_login_count > 0 && !u.is_suspended && (
                    <div className="text-[10px] text-amber-500 mt-0.5">
                      {u.failed_login_count} failed login{u.failed_login_count !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Last Login */}
                <div>
                  <div className="text-slate_ui text-xs">{relativeTime(u.last_login_at)}</div>
                  {u.last_login_ip && (
                    <div className="text-[10px] text-gray-400 font-mono">{u.last_login_ip}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="text-right flex gap-1 justify-end flex-wrap">
                  {u.is_suspended ? (
                    <Button onClick={() => openAction(u, 'unsuspend')} variant="ghost" size="sm" className="bg-emerald-50 text-emerald-500">Unsuspend</Button>
                  ) : (
                    <Button onClick={() => openAction(u, 'suspend')} variant="ghost" size="sm" className="bg-red-50 text-red-600">Suspend</Button>
                  )}
                  <Button onClick={() => openAction(u, 'change_role')} variant="ghost" size="sm" className="bg-[#F0F4F8] text-navy">Role</Button>
                  {u.locked_until && new Date(u.locked_until) > new Date() && (
                    <Button onClick={() => openAction(u, 'unlock')} variant="ghost" size="sm" className="bg-amber-50 text-amber-500">Unlock</Button>
                  )}
                  <div className="relative">
                    <Button onClick={() => setMoreMenuId(moreMenuId === u.id ? null : u.id)} variant="ghost" size="sm" className="px-2 py-1.5 bg-[#F0F4F8] text-slate_ui">
                      ···
                    </Button>
                    {moreMenuId === u.id && (
                      <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-border_ui-warm rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] min-w-[180px] overflow-hidden">
                        <Button
                          onClick={() => { setMoreMenuId(null); openAction(u, 'reset_password'); }}
                          variant="ghost" size="sm"
                          className="block w-full px-3.5 py-2.5 text-navy text-left rounded-none justify-start hover:bg-[#F0F4F8]"
                        >
                          Reset Password
                        </Button>
                        <Button
                          onClick={() => { setMoreMenuId(null); openAction(u, 'revoke_sessions'); }}
                          variant="ghost" size="sm"
                          className="block w-full px-3.5 py-2.5 text-red-600 text-left rounded-none justify-start hover:bg-red-50"
                        >
                          Revoke Sessions
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action confirmation modal */}
      {actionUser && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-7 w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
            <h3 className="text-base font-bold text-navy mb-3">
              {actionType === 'suspend' && `Suspend ${actionUser.full_name}?`}
              {actionType === 'unsuspend' && `Unsuspend ${actionUser.full_name}?`}
              {actionType === 'change_role' && `Change role for ${actionUser.full_name}`}
              {actionType === 'unlock' && `Unlock ${actionUser.full_name}?`}
              {actionType === 'reset_password' && `Reset password for ${actionUser.full_name}?`}
              {actionType === 'revoke_sessions' && `Revoke all sessions for ${actionUser.full_name}?`}
            </h3>

            {actionType === 'suspend' && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate_ui block mb-1">
                  Reason for suspension
                </label>
                <textarea
                  className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full min-h-[60px] resize-y"
                  placeholder="Enter reason..."
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  The user will be unable to log in. This action is logged to the audit trail.
                </p>
              </div>
            )}

            {actionType === 'change_role' && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate_ui block mb-1">
                  New role
                </label>
                <select
                  className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                  value={actionRole}
                  onChange={e => setActionRole(e.target.value)}
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Current role: {ROLE_LABELS[actionUser.role] || actionUser.role}
                </p>
              </div>
            )}

            {actionType === 'unsuspend' && (
              <p className="text-[13px] text-slate_ui mb-4">
                This will restore access for {actionUser.full_name}. They will be able to log in again.
              </p>
            )}

            {actionType === 'unlock' && (
              <p className="text-[13px] text-slate_ui mb-4">
                This will reset the failed login counter and remove the account lockout.
              </p>
            )}

            {actionType === 'reset_password' && (
              <p className="text-[13px] text-slate_ui mb-4">
                A password reset email will be sent to {actionUser.email}. This action is logged.
              </p>
            )}

            {actionType === 'revoke_sessions' && (
              <p className="text-[13px] text-slate_ui mb-4">
                All active sessions will be immediately revoked. The user will need to log in again.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                onClick={closeAction}
                variant="ghost" size="sm" className="bg-[#F0F4F8] text-slate_ui"
              >
                Cancel
              </Button>
              <Button
                onClick={executeAction}
                disabled={actionLoading}
                variant={actionType === 'suspend' ? 'destructive' : 'primary'}
                size="sm"
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-7 w-[400px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
            <h3 className="text-base font-bold text-navy mb-4">Invite New User</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate_ui block mb-1">Email</label>
                <input
                  className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate_ui block mb-1">Role</label>
                <select
                  className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <Button onClick={() => setShowInvite(false)} variant="ghost" size="sm" className="bg-[#F0F4F8] text-slate_ui">Cancel</Button>
              <Button onClick={sendInvite} disabled={actionLoading || !inviteEmail} variant="gold" size="sm">
                {actionLoading ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
