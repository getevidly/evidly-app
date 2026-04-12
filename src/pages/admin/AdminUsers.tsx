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

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';
const GREEN = '#10B981';
const RED = '#DC2626';
const AMBER = '#F59E0B';

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


const inputStyle: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, border: `1px solid ${BORDER}`,
  borderRadius: 6, outline: 'none', color: NAVY, background: '#fff',
};

const btnStyle = (bg: string, fg: string): React.CSSProperties => ({
  padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none',
  borderRadius: 6, cursor: 'pointer', background: bg, color: fg,
});

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
    if (u.is_suspended) return { label: 'Suspended', color: RED, bg: '#FEF2F2' };
    if (u.locked_until && new Date(u.locked_until) > new Date()) return { label: 'Locked', color: AMBER, bg: '#FFFBEB' };
    return { label: 'Active', color: GREEN, bg: '#ECFDF5' };
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
        <button onClick={loadUsers} className="mt-4 px-4 py-2.5 bg-[#1E2D4D] text-white rounded-lg text-sm font-medium hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] min-h-[44px]">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'User Management' }]} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>User Management</h1>
          <p style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>
            Manage user accounts, roles, and access across the platform
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          style={btnStyle(GOLD, '#fff')}
        >
          + Invite User
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile label="Total Users" value={totalUsers} />
        <KpiTile label="Active" value={activeUsers} />
        <KpiTile label="Suspended" value={suspendedUsers} valueColor={suspendedUsers > 0 ? RED : undefined} />
        <KpiTile label="Locked" value={lockedUsers} valueColor={lockedUsers > 0 ? AMBER : undefined} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, width: 240 }}
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={inputStyle}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="All">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
        </select>
        <select
          style={inputStyle}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Users table */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
          padding: '10px 16px', borderBottom: `1px solid ${BORDER}`,
          fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase',
        }}>
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
          <span>Last Login</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>Loading users...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No users match filters</div>
        ) : (
          filtered.map(u => {
            const status = getStatus(u);
            return (
              <div key={u.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                padding: '12px 16px', borderBottom: `1px solid ${BORDER}`,
                alignItems: 'center', fontSize: 13,
              }}>
                {/* User */}
                <div>
                  <div style={{ fontWeight: 600, color: NAVY }}>{u.full_name}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED }}>{u.email || 'No email'}</div>
                </div>

                {/* Role */}
                <div>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                    fontSize: 11, fontWeight: 600, background: '#F0F4F8', color: NAVY,
                  }}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </div>

                {/* Status */}
                <div>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                    fontSize: 11, fontWeight: 600, background: status.bg, color: status.color,
                  }}>
                    {status.label}
                  </span>
                  {u.failed_login_count > 0 && !u.is_suspended && (
                    <div style={{ fontSize: 10, color: AMBER, marginTop: 2 }}>
                      {u.failed_login_count} failed login{u.failed_login_count !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Last Login */}
                <div>
                  <div style={{ color: TEXT_SEC, fontSize: 12 }}>{relativeTime(u.last_login_at)}</div>
                  {u.last_login_ip && (
                    <div style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: 'monospace' }}>{u.last_login_ip}</div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ textAlign: 'right', display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {u.is_suspended ? (
                    <button onClick={() => openAction(u, 'unsuspend')} style={btnStyle('#ECFDF5', GREEN)}>Unsuspend</button>
                  ) : (
                    <button onClick={() => openAction(u, 'suspend')} style={btnStyle('#FEF2F2', RED)}>Suspend</button>
                  )}
                  <button onClick={() => openAction(u, 'change_role')} style={btnStyle('#F0F4F8', NAVY)}>Role</button>
                  {u.locked_until && new Date(u.locked_until) > new Date() && (
                    <button onClick={() => openAction(u, 'unlock')} style={btnStyle('#FFFBEB', AMBER)}>Unlock</button>
                  )}
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setMoreMenuId(moreMenuId === u.id ? null : u.id)} style={{ ...btnStyle('#F0F4F8', TEXT_SEC), padding: '6px 8px' }}>
                      ···
                    </button>
                    {moreMenuId === u.id && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
                        background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180, overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => { setMoreMenuId(null); openAction(u, 'reset_password'); }}
                          style={{ display: 'block', width: '100%', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: NAVY, background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F0F4F8')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => { setMoreMenuId(null); openAction(u, 'revoke_sessions'); }}
                          style={{ display: 'block', width: '100%', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: RED, background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          Revoke Sessions
                        </button>
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
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 28, width: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 12 }}>
              {actionType === 'suspend' && `Suspend ${actionUser.full_name}?`}
              {actionType === 'unsuspend' && `Unsuspend ${actionUser.full_name}?`}
              {actionType === 'change_role' && `Change role for ${actionUser.full_name}`}
              {actionType === 'unlock' && `Unlock ${actionUser.full_name}?`}
              {actionType === 'reset_password' && `Reset password for ${actionUser.full_name}?`}
              {actionType === 'revoke_sessions' && `Revoke all sessions for ${actionUser.full_name}?`}
            </h3>

            {actionType === 'suspend' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>
                  Reason for suspension
                </label>
                <textarea
                  style={{ ...inputStyle, width: '100%', minHeight: 60, resize: 'vertical' }}
                  placeholder="Enter reason..."
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                />
                <p style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>
                  The user will be unable to log in. This action is logged to the audit trail.
                </p>
              </div>
            )}

            {actionType === 'change_role' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>
                  New role
                </label>
                <select
                  style={{ ...inputStyle, width: '100%' }}
                  value={actionRole}
                  onChange={e => setActionRole(e.target.value)}
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
                </select>
                <p style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>
                  Current role: {ROLE_LABELS[actionUser.role] || actionUser.role}
                </p>
              </div>
            )}

            {actionType === 'unsuspend' && (
              <p style={{ fontSize: 13, color: TEXT_SEC, marginBottom: 16 }}>
                This will restore access for {actionUser.full_name}. They will be able to log in again.
              </p>
            )}

            {actionType === 'unlock' && (
              <p style={{ fontSize: 13, color: TEXT_SEC, marginBottom: 16 }}>
                This will reset the failed login counter and remove the account lockout.
              </p>
            )}

            {actionType === 'reset_password' && (
              <p style={{ fontSize: 13, color: TEXT_SEC, marginBottom: 16 }}>
                A password reset email will be sent to {actionUser.email}. This action is logged.
              </p>
            )}

            {actionType === 'revoke_sessions' && (
              <p style={{ fontSize: 13, color: TEXT_SEC, marginBottom: 16 }}>
                All active sessions will be immediately revoked. The user will need to log in again.
              </p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={closeAction}
                style={btnStyle('#F0F4F8', TEXT_SEC)}
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={actionLoading}
                style={btnStyle(
                  actionType === 'suspend' ? RED : NAVY,
                  '#fff'
                )}
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 28, width: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Invite New User</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Email</label>
                <input
                  style={{ ...inputStyle, width: '100%' }}
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Role</label>
                <select
                  style={{ ...inputStyle, width: '100%' }}
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowInvite(false)} style={btnStyle('#F0F4F8', TEXT_SEC)}>Cancel</button>
              <button onClick={sendInvite} disabled={actionLoading || !inviteEmail} style={btnStyle(GOLD, '#fff')}>
                {actionLoading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
