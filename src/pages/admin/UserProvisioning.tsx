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
import OrgCombobox, { type OrgOption } from '../../components/admin/OrgCombobox';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

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
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FAF7F2', border: '2px dashed #E2D9C8', borderRadius: 12, margin: 16 }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 400, margin: '0 auto' }}>{subtitle}</div>
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

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: tab === t ? '#FFFFFF' : 'transparent', color: tab === t ? NAVY : TEXT_MUTED,
    boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
  });

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 6, color: NAVY, fontSize: 13, width: '100%',
  };

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'User Provisioning' }]} />
      <div>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>User Provisioning</h1>
        <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
          Invite users, create accounts, and manage roles across all organizations.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#F3F4F6', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {([
          { id: 'all-users' as Tab, label: 'All Users' },
          { id: 'invite-create' as Tab, label: 'Invite & Create' },
          { id: 'audit-log' as Tab, label: 'Audit Log' },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ───────── Tab: All Users ───────── */}
      {tab === 'all-users' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={{ ...inputStyle, flex: 1, minWidth: 200 }}
            />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ ...inputStyle, width: 180, cursor: 'pointer' }}>
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 140, cursor: 'pointer' }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
              </div>
            ) : filteredUsers.length === 0 ? (
              <EmptyState icon="👥" title="No users found" subtitle="Users will appear here when organizations have members." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Name', 'Email', 'Role', 'Organization', 'Status', 'Last Active'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.slice(0, 50).map(u => {
                    const org = orgs.find(o => o.id === u.organization_id);
                    const roleColor = ROLE_COLORS[u.role] || TEXT_SEC;
                    return (
                      <tr key={u.id} onClick={() => setSelectedUser(u)} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '10px 14px', color: NAVY, fontWeight: 600 }}>{u.full_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{u.email}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: `${roleColor}15`, color: roleColor }}>
                            {u.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{org?.name || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#F0FFF4', color: '#059669' }}>
                            active
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>
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

      {/* ───────── Tab: Invite & Create ───────── */}
      {tab === 'invite-create' && (
        <>
          {/* Single user form */}
          <div style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Create User</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Email *</label>
                <input value={invEmail} onChange={e => setInvEmail(e.target.value)} style={inputStyle} placeholder="user@example.com" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Full Name</label>
                <input value={invName} onChange={e => setInvName(e.target.value)} style={inputStyle} placeholder="Jane Smith" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Phone Number</label>
                <input value={invPhone} onChange={e => setInvPhone(e.target.value)} style={inputStyle} placeholder="(555) 000-0000" type="tel" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Role</label>
                <select value={invRole} onChange={e => setInvRole(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT_SEC, cursor: 'pointer' }}>
                <input type="checkbox" checked={sendInvite} onChange={e => setSendInvite(e.target.checked)} />
                Send email invite
              </label>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !invEmail}
              style={{
                padding: '8px 24px', background: creating || !invEmail ? '#E5E7EB' : GOLD, border: 'none', borderRadius: 6,
                color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: creating || !invEmail ? 'default' : 'pointer',
              }}
            >
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </div>

          {/* Bulk invite */}
          <div style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Bulk Invite</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Email addresses (comma-separated)</label>
              <textarea
                value={bulkEmails}
                onChange={e => setBulkEmails(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="user1@example.com, user2@example.com, user3@example.com"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Role</label>
                <select value={bulkRole} onChange={e => setBulkRole(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
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
            <button
              onClick={handleBulkInvite}
              disabled={!bulkEmails.trim()}
              style={{
                padding: '8px 24px', background: !bulkEmails.trim() ? '#E5E7EB' : NAVY, border: 'none', borderRadius: 6,
                color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: !bulkEmails.trim() ? 'default' : 'pointer',
              }}
            >
              Send Invites
            </button>
          </div>
        </>
      )}

      {/* ───────── Tab: Audit Log ───────── */}
      {tab === 'audit-log' && (
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : auditLog.length === 0 ? (
            <EmptyState icon="📋" title="No audit entries" subtitle="User provisioning and emulation audit entries will appear here." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Timestamp', 'Admin', 'Target User', 'Ended', 'Summary'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLog.map(a => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{new Date(a.started_at).toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', color: NAVY, fontSize: 12, fontWeight: 600 }}>{a.admin_id.slice(0, 8)}...</td>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{a.target_user_id.slice(0, 8)}...</td>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{a.ended_at ? new Date(a.ended_at).toLocaleString() : 'Active'}</td>
                    <td style={{ padding: '10px 14px', color: NAVY, fontSize: 12 }}>{a.actions_summary || '—'}</td>
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

// ── User Detail Drawer ──

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

  const roleColor = ROLE_COLORS[user.role] || TEXT_SEC;

  const tabBtn = (t: string): React.CSSProperties => ({
    padding: '10px 14px', fontSize: 13, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
    borderBottom: drawerTab === t ? `2px solid ${NAVY}` : '2px solid transparent', marginBottom: -1,
    color: drawerTab === t ? NAVY : TEXT_MUTED, whiteSpace: 'nowrap',
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 580, maxWidth: '100vw',
        background: '#FFFFFF', zIndex: 50, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>{user.full_name || user.email}</h2>
              <div style={{ fontSize: 13, color: TEXT_SEC, marginTop: 2 }}>{user.email}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: `${roleColor}15`, color: roleColor }}>
                  {user.role.replace(/_/g, ' ')}
                </span>
                {org && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#F3F4F6', color: TEXT_SEC }}>{org.name}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: TEXT_MUTED, cursor: 'pointer' }}>{'×'}</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, padding: '0 24px', flexShrink: 0 }}>
          {['Profile', 'Activity'].map(t => (
            <button key={t} onClick={() => setDrawerTab(t)} style={tabBtn(t)}>{t}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {drawerTab === 'Profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                ['Full Name', user.full_name],
                ['Email', user.email],
                ['Role', user.role.replace(/_/g, ' ')],
                ['Organization', org?.name],
                ['Status', 'Active'],
                ['Last Active', user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'],
                ['Account Created', new Date(user.created_at).toLocaleDateString()],
              ] as [string, string | null | undefined][]).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ fontSize: 12, color: TEXT_SEC, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 13, color: NAVY, fontWeight: 500 }}>{value || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {drawerTab === 'Activity' && (
            eventsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => <EmptyState key={i} icon="" title="" subtitle="" />).slice(0, 0)}
                <div style={{ width: '100%', height: 20, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
            ) : events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No activity recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {events.map((ev: any) => (
                  <div key={ev.id} style={{ padding: '6px 0', borderBottom: '1px solid #F3F4F6', fontSize: 12 }}>
                    <span style={{ color: TEXT_SEC }}>{new Date(ev.event_time).toLocaleString()}</span>
                    <span style={{ marginLeft: 8, color: NAVY }}>{ev.message}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, display: 'flex', gap: 10 }}>
          <button onClick={() => alert('Edit User profile requires admin edge function. Use Supabase Dashboard to modify user records.')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: NAVY, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Edit User
          </button>
          <button onClick={async () => { if (isDemoMode) return; if (confirm(`Send password reset email to ${user.email}?`)) { const { error } = await supabase.auth.resetPasswordForEmail(user.email); alert(error ? `Error: ${error.message}` : `Password reset email sent to ${user.email}.`); } }} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#F9FAFB', color: TEXT_SEC, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Reset Password
          </button>
          <button onClick={() => { onClose(); navigate('/admin/emulate'); }} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#FAF7F2', color: NAVY, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Emulate
          </button>
          <button onClick={() => alert('Suspend user requires admin edge function. Use Supabase Dashboard → Authentication to disable accounts.')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Suspend
          </button>
        </div>
      </div>
    </>
  );
}
