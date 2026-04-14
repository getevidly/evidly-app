/**
 * User Provisioning — Invite, create, manage users across all organizations
 * Route: /admin/users
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import Button from '../../components/ui/Button';
import OrgCombobox, { type OrgOption } from '../../components/admin/OrgCombobox';

type Tab = 'all-users' | 'invite-create' | 'audit-log';

interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  organization_id: string | null;
  status?: string;
  last_sign_in_at?: string | null;
  created_at: string;
}

interface OrgRow {
  id: string;
  name: string;
}

interface AuditRow {
  id: string;
  admin_id: string;
  target_user_id: string;
  started_at: string;
  ended_at: string | null;
  actions_summary: string | null;
}

const ROLES = [
  'owner_operator',
  'executive',
  'kitchen_manager',
  'compliance_manager',
  'chef',
  'facilities_manager',
  'kitchen_staff',
  'platform_admin',
];

const ROLE_COLORS: Record<string, string> = {
  owner_operator: '#059669',
  executive: '#2563EB',
  kitchen_manager: '#D97706',
  compliance_manager: '#7C3AED',
  chef: '#DB2777',
  facilities_manager: '#EA580C',
  kitchen_staff: '#6B7280',
  platform_admin: '#DC2626',
};

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div className="bg-gray-200 rounded-md animate-pulse" style={{ width: w, height: h }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="text-center py-[60px] px-5 bg-cream-warm border-2 border-dashed border-border_ui-warm rounded-xl m-4">
    <div className="text-[40px] mb-4">{icon}</div>
    <div className="text-base font-bold text-navy mb-2">{title}</div>
    <div className="text-[13px] text-slate_ui max-w-[400px] mx-auto">{subtitle}</div>
  </div>
);

export default function UserProvisioning() {
  useDemoGuard();
  const { isDemoMode } = useDemo();
  const [tab, setTab] = useState<Tab>('all-users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail drawer
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Invite form
  const [invEmail, setInvEmail] = useState('');
  const [invName, setInvName] = useState('');
  const [invPhone, setInvPhone] = useState('');
  const [invRole, setInvRole] = useState('kitchen_staff');
  const [invOrg, setInvOrg] = useState<OrgOption | null>(null);
  const [sendInvite, setSendInvite] = useState(true);
  const [creating, setCreating] = useState(false);

  // Bulk invite
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkRole, setBulkRole] = useState('kitchen_staff');
  const [bulkOrg, setBulkOrg] = useState<OrgOption | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (tab === 'all-users') {
      const [userRes, orgRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, role, organization_id, created_at').order('created_at', { ascending: false }),
        supabase.from('organizations').select('id, name').order('name'),
      ]);
      if (userRes.data) setUsers(userRes.data);
      if (orgRes.data) setOrgs(orgRes.data);
    } else if (tab === 'invite-create') {
      const { data } = await supabase.from('organizations').select('id, name').order('name');
      if (data) setOrgs(data);
    } else if (tab === 'audit-log') {
      const { data } = await supabase.from('emulation_audit_log').select('*').order('started_at', { ascending: false }).limit(50);
      if (data) setAuditLog(data);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredUsers = users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter === 'active' && !u.email) return false;
    if (search) {
      const q = search.toLowerCase();
      return (u.full_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCreate = async () => {
    if (isDemoMode) return;
    if (!invEmail) return;
    setCreating(true);
    alert(`User provisioning for ${invEmail} requires the server-side auth pipeline. Use Supabase Dashboard → Authentication to create accounts.`);
    setInvEmail('');
    setInvName('');
    setInvPhone('');
    setInvOrg(null);
    setCreating(false);
  };

  const handleBulkInvite = () => {
    if (isDemoMode) return;
    const emails = bulkEmails.split(',').map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) return;
    alert(`Bulk invite for ${emails.length} email(s) requires the server-side auth pipeline. Use Supabase Dashboard → Authentication to create accounts.`);
    setBulkEmails('');
    setBulkOrg(null);
  };

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'User Provisioning' }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">User Provisioning</h1>
        <p className="text-[13px] text-slate_ui mt-1">
          Invite users, create accounts, and manage roles across all organizations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-[3px] w-fit">
        {([
          { id: 'all-users' as Tab, label: 'All Users' },
          { id: 'invite-create' as Tab, label: 'Invite & Create' },
          { id: 'audit-log' as Tab, label: 'Audit Log' },
        ]).map(t => (
          <Button key={t.id} onClick={() => setTab(t.id)}
            variant="ghost" size="sm"
            className={`px-[18px] py-2 rounded-md ${
              tab === t.id
                ? 'bg-white text-navy shadow-sm'
                : 'bg-transparent text-gray-400 shadow-none'
            }`}>
            {t.label}
          </Button>
        ))}
      </div>

      {/* --------- Tab: All Users --------- */}
      {tab === 'all-users' && (
        <>
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full flex-1 min-w-[200px]"
            />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-[180px] cursor-pointer">
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-[140px] cursor-pointer">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
              </div>
            ) : filteredUsers.length === 0 ? (
              <EmptyState icon="👥" title="No users found" subtitle="Users will appear here when organizations have members." />
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border_ui-warm">
                    {['Name', 'Email', 'Role', 'Organization', 'Status', 'Last Active'].map(h => (
                      <th key={h} className="text-left px-[14px] py-2.5 text-slate_ui font-semibold text-[11px] uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.slice(0, 50).map(u => {
                    const org = orgs.find(o => o.id === u.organization_id);
                    const roleColor = ROLE_COLORS[u.role] || '#6B7F96';
                    return (
                      <tr key={u.id} onClick={() => setSelectedUser(u)}
                        className="border-b border-border_ui-warm cursor-pointer hover:bg-gray-50">
                        <td className="px-[14px] py-2.5 text-navy font-semibold">{u.full_name || '—'}</td>
                        <td className="px-[14px] py-2.5 text-slate_ui text-xs">{u.email}</td>
                        <td className="px-[14px] py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${roleColor}15`, color: roleColor }}>
                            {u.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-[14px] py-2.5 text-slate_ui text-xs">{org?.name || '—'}</td>
                        <td className="px-[14px] py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-emerald-600">
                            active
                          </span>
                        </td>
                        <td className="px-[14px] py-2.5 text-slate_ui text-xs">
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* --------- Tab: Invite & Create --------- */}
      {tab === 'invite-create' && (
        <>
          {/* Single user form */}
          <div className="bg-white border border-border_ui-warm rounded-xl p-6">
            <h3 className="text-sm font-bold text-navy mb-4">Create User</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-slate_ui block mb-1">Email *</label>
                <input value={invEmail} onChange={e => setInvEmail(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full" placeholder="user@example.com" />
              </div>
              <div>
                <label className="text-[11px] text-slate_ui block mb-1">Full Name</label>
                <input value={invName} onChange={e => setInvName(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="text-[11px] text-slate_ui block mb-1">Phone Number</label>
                <input value={invPhone} onChange={e => setInvPhone(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full" placeholder="(555) 000-0000" type="tel" />
              </div>
              <div>
                <label className="text-[11px] text-slate_ui block mb-1">Role</label>
                <select value={invRole} onChange={e => setInvRole(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full cursor-pointer">
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <OrgCombobox
                  label="Organization"
                  orgs={orgs}
                  value={invOrg}
                  onChange={setInvOrg}
                  placeholder="Search or create organization..."
                  inputStyle={{ background: '#F9FAFB' }}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-1.5 text-xs text-slate_ui cursor-pointer">
                <input type="checkbox" checked={sendInvite} onChange={e => setSendInvite(e.target.checked)} />
                Send email invite
              </label>
            </div>
            <Button
              onClick={handleCreate}
              disabled={creating || !invEmail}
              variant="gold" size="sm"
            >
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </div>

          {/* Bulk invite */}
          <div className="bg-white border border-border_ui-warm rounded-xl p-6">
            <h3 className="text-sm font-bold text-navy mb-4">Bulk Invite</h3>
            <div className="mb-3">
              <label className="text-[11px] text-slate_ui block mb-1">Email addresses (comma-separated)</label>
              <textarea
                value={bulkEmails}
                onChange={e => setBulkEmails(e.target.value)}
                rows={3}
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full resize-y"
                placeholder="user1@example.com, user2@example.com, user3@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] text-slate_ui block mb-1">Role</label>
                <select value={bulkRole} onChange={e => setBulkRole(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full cursor-pointer">
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <OrgCombobox
                  label="Organization"
                  orgs={orgs}
                  value={bulkOrg}
                  onChange={setBulkOrg}
                  placeholder="Search or create organization..."
                  inputStyle={{ background: '#F9FAFB' }}
                />
              </div>
            </div>
            <Button
              onClick={handleBulkInvite}
              disabled={!bulkEmails.trim()}
              variant="primary" size="sm"
            >
              Send Invites
            </Button>
          </div>
        </>
      )}

      {/* --------- Tab: Audit Log --------- */}
      {tab === 'audit-log' && (
        <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : auditLog.length === 0 ? (
            <EmptyState icon="📋" title="No audit entries" subtitle="User provisioning and emulation audit entries will appear here." />
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border_ui-warm">
                  {['Timestamp', 'Admin', 'Target User', 'Ended', 'Summary'].map(h => (
                    <th key={h} className="text-left px-[14px] py-2.5 text-slate_ui font-semibold text-[11px] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLog.map(a => (
                  <tr key={a.id} className="border-b border-border_ui-warm">
                    <td className="px-[14px] py-2.5 text-slate_ui text-xs">{new Date(a.started_at).toLocaleString()}</td>
                    <td className="px-[14px] py-2.5 text-navy text-xs font-semibold">{a.admin_id.slice(0, 8)}...</td>
                    <td className="px-[14px] py-2.5 text-slate_ui text-xs">{a.target_user_id.slice(0, 8)}...</td>
                    <td className="px-[14px] py-2.5 text-slate_ui text-xs">{a.ended_at ? new Date(a.ended_at).toLocaleString() : 'Active'}</td>
                    <td className="px-[14px] py-2.5 text-navy text-xs">{a.actions_summary || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* User Detail Drawer */}
      {selectedUser && (
        <UserDetailDrawer
          user={selectedUser}
          org={orgs.find(o => o.id === selectedUser.organization_id) || null}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

// -- User Detail Drawer --

function UserDetailDrawer({ user, org, onClose }: { user: UserRow; org: OrgRow | null; onClose: () => void }) {
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();
  const [drawerTab, setDrawerTab] = useState('Profile');
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setEventsLoading(true);
      const { data } = await supabase
        .from('admin_event_log')
        .select('id, event_time, level, message')
        .ilike('message', `%${user.email}%`)
        .order('event_time', { ascending: false })
        .limit(50);
      if (data) setEvents(data);
      setEventsLoading(false);
    })();
  }, [user.email]);

  const roleColor = ROLE_COLORS[user.role] || '#6B7F96';

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/20 z-40" />
      <div className="fixed top-0 right-0 bottom-0 w-[580px] max-w-[100vw] bg-white z-50 shadow-[-4px_0_24px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border_ui-warm shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-navy m-0">{user.full_name || user.email}</h2>
              <div className="text-[13px] text-slate_ui mt-0.5">{user.email}</div>
              <div className="flex gap-1.5 mt-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${roleColor}15`, color: roleColor }}>
                  {user.role.replace(/_/g, ' ')}
                </span>
                {org && <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-slate_ui">{org.name}</span>}
              </div>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm" className="text-[22px] text-gray-400">{'×'}</Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border_ui-warm px-6 shrink-0">
          {['Profile', 'Activity'].map(t => (
            <Button key={t} onClick={() => setDrawerTab(t)}
              variant="ghost" size="sm"
              className={`px-[14px] py-2.5 rounded-none whitespace-nowrap -mb-px ${
                drawerTab === t
                  ? 'text-navy border-b-2 border-navy'
                  : 'text-gray-400 border-b-2 border-transparent'
              }`}>{t}</Button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {drawerTab === 'Profile' && (
            <div className="flex flex-col gap-3">
              {([
                ['Full Name', user.full_name],
                ['Email', user.email],
                ['Role', user.role.replace(/_/g, ' ')],
                ['Organization', org?.name],
                ['Status', 'Active'],
                ['Last Active', user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'],
                ['Account Created', new Date(user.created_at).toLocaleDateString()],
              ] as [string, string | null | undefined][]).map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-xs text-slate_ui font-semibold">{label}</span>
                  <span className="text-[13px] text-navy font-medium">{value || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {drawerTab === 'Activity' && (
            eventsLoading ? (
              <div className="flex flex-col gap-2">
                <div className="w-full h-5 bg-gray-200 rounded-md animate-pulse" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center p-[30px] text-gray-400 text-[13px]">No activity recorded.</div>
            ) : (
              <div className="flex flex-col gap-1">
                {events.map((ev: any) => (
                  <div key={ev.id} className="py-1.5 border-b border-gray-100 text-xs">
                    <span className="text-slate_ui">{new Date(ev.event_time).toLocaleString()}</span>
                    <span className="ml-2 text-navy">{ev.message}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-[14px] border-t border-border_ui-warm shrink-0 flex gap-2.5">
          <Button onClick={() => alert('Edit User profile requires admin edge function. Use Supabase Dashboard to modify user records.')}
            variant="primary" size="sm">
            Edit User
          </Button>
          <Button onClick={async () => { if (isDemoMode) return; if (confirm(`Send password reset email to ${user.email}?`)) { const { error } = await supabase.auth.resetPasswordForEmail(user.email); alert(error ? `Error: ${error.message}` : `Password reset email sent to ${user.email}.`); } }}
            variant="secondary" size="sm" className="bg-gray-50 text-slate_ui">
            Reset Password
          </Button>
          <Button onClick={() => { onClose(); navigate('/admin/emulate'); }}
            variant="secondary" size="sm" className="bg-cream-warm text-navy">
            Emulate
          </Button>
          <Button onClick={() => alert('Suspend user requires admin edge function. Use Supabase Dashboard → Authentication to disable accounts.')}
            variant="destructive" size="sm" className="bg-red-50 text-red-600 border border-red-200">
            Suspend
          </Button>
        </div>
      </div>
    </>
  );
}
