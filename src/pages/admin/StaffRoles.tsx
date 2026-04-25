/**
 * Staff & Roles — Manage EvidLY internal staff accounts & role-based permissions
 * Route: /admin/staff-roles
 *
 * 3 tabs:
 * A — Staff Members (table + add modal)
 * B — Role Definitions (2x2 card grid)
 * C — Activity Log (admin_event_log for @getevidly.com actors)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import Button from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

type Tab = 'staff' | 'roles' | 'activity';

/* ── Permission keys ── */
const PERM_KEYS = [
  'perm_billing',
  'perm_security',
  'perm_emulate',
  'perm_configure',
  'perm_support_tickets',
  'perm_sales_pipeline',
  'perm_crawl_manage',
  'perm_remote_connect',
  'perm_intelligence',
  'perm_staff_manage',
] as const;

type PermKey = (typeof PERM_KEYS)[number];

const PERM_LABELS: Record<PermKey, string> = {
  perm_billing: 'Billing',
  perm_security: 'Security',
  perm_emulate: 'Emulate',
  perm_configure: 'Configure',
  perm_support_tickets: 'Support Tickets',
  perm_sales_pipeline: 'Sales Pipeline',
  perm_crawl_manage: 'Crawl Manage',
  perm_remote_connect: 'Remote Connect',
  perm_intelligence: 'Intelligence',
  perm_staff_manage: 'Staff Management',
};

const PERM_SHORT_LABELS: Record<PermKey, string> = {
  perm_billing: 'Billing',
  perm_security: 'Security',
  perm_emulate: 'Emulate',
  perm_configure: 'Configure',
  perm_support_tickets: 'Tickets',
  perm_sales_pipeline: 'Pipeline',
  perm_crawl_manage: 'Crawl',
  perm_remote_connect: 'Remote',
  perm_intelligence: 'Intelligence',
  perm_staff_manage: 'Staff Mgmt',
};

const PERM_DOT_COLORS: Record<PermKey, string> = {
  perm_billing: 'bg-emerald-600',
  perm_security: 'bg-red-600',
  perm_emulate: 'bg-violet-600',
  perm_configure: 'bg-blue-600',
  perm_support_tickets: 'bg-amber-600',
  perm_sales_pipeline: 'bg-emerald-600',
  perm_crawl_manage: 'bg-orange-600',
  perm_remote_connect: 'bg-cyan-600',
  perm_intelligence: 'bg-violet-600',
  perm_staff_manage: 'bg-red-600',
};

/* ── Role badge styling ── */
const ROLE_BADGE_BG: Record<string, string> = {
  super_admin: 'bg-gradient-to-br from-navy to-gold',
  admin: 'bg-navy',
  support: 'bg-blue-600',
  sales: 'bg-emerald-600',
};

const ROLE_DISPLAY: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  support: 'Support',
  sales: 'Sales',
};

const STAFF_ROLES = ['super_admin', 'admin', 'support', 'sales'];

/* ── Level badge colors for activity log ── */
const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  INFO:  { bg: 'bg-blue-50', text: 'text-blue-600' },
  WARN:  { bg: 'bg-amber-50', text: 'text-amber-600' },
  ERROR: { bg: 'bg-red-50', text: 'text-red-600' },
  DEBUG: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

/* ── Interfaces ── */
interface StaffRow {
  id: string;
  full_name: string | null;
  email: string;
  evidly_staff_role: string;
  last_login_at: string | null;
  created_at: string;
  perm_billing?: boolean;
  perm_security?: boolean;
  perm_emulate?: boolean;
  perm_configure?: boolean;
  perm_support_tickets?: boolean;
  perm_sales_pipeline?: boolean;
  perm_crawl_manage?: boolean;
  perm_remote_connect?: boolean;
  perm_intelligence?: boolean;
  perm_staff_manage?: boolean;
}

interface RoleDefRow {
  id: string;
  role_name: string;
  description: string | null;
  perm_billing: boolean;
  perm_security: boolean;
  perm_emulate: boolean;
  perm_configure: boolean;
  perm_support_tickets: boolean;
  perm_sales_pipeline: boolean;
  perm_crawl_manage: boolean;
  perm_remote_connect: boolean;
  perm_intelligence: boolean;
  perm_staff_manage: boolean;
}

interface EventRow {
  id: string;
  event_time: string;
  level: string;
  category: string | null;
  message: string;
  metadata?: any;
  user_id?: string | null;
}

/* ── Reusable atoms ── */
const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div
    className="rounded-md animate-pulse bg-gray-200"
    style={{ width: w, height: h }}
  />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="text-center py-[60px] px-5 bg-cream-warm border-2 border-dashed border-border_ui-warm rounded-xl m-4">
    <div className="text-[40px] mb-4">{icon}</div>
    <div className="text-base font-bold text-navy mb-2">{title}</div>
    <div className="text-[13px] text-slate_ui max-w-[400px] mx-auto">{subtitle}</div>
  </div>
);

/* ─────────────────────────────────────────────────────────── */

export default function StaffRoles() {
  useDemoGuard();
  const { isDemoMode } = useDemo();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('staff');

  /* Staff members state */
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [roleDefs, setRoleDefs] = useState<RoleDefRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffRow | null>(null);

  /* Add-staff modal form */
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('admin');
  const [formPerms, setFormPerms] = useState<Record<PermKey, boolean>>(
    Object.fromEntries(PERM_KEYS.map(k => [k, false])) as Record<PermKey, boolean>
  );

  /* ── Data loading ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    if (tab === 'staff') {
      const [staffRes, roleRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .not('evidly_staff_role', 'is', null)
          .order('created_at'),
        supabase
          .from('evidly_role_permissions')
          .select('*')
          .order('role_name'),
      ]);
      if (staffRes.data) setStaff(staffRes.data as StaffRow[]);
      if (roleRes.data) setRoleDefs(roleRes.data as RoleDefRow[]);
    } else if (tab === 'roles') {
      const { data } = await supabase
        .from('evidly_role_permissions')
        .select('*')
        .order('role_name');
      if (data) setRoleDefs(data as RoleDefRow[]);
    } else if (tab === 'activity') {
      const { data } = await supabase
        .from('admin_event_log')
        .select('*')
        .order('event_time', { ascending: false })
        .limit(200);
      if (data) setEvents(data as EventRow[]);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadData(); }, [loadData]);

  /* When role changes in modal, auto-fill perms from role defaults */
  const applyRoleDefaults = (roleName: string) => {
    const defaults = roleDefs.find(r => r.role_name === roleName);
    if (defaults) {
      const next = { ...formPerms };
      for (const k of PERM_KEYS) {
        next[k] = !!(defaults as any)[k];
      }
      setFormPerms(next);
    }
  };

  const handleRoleChange = (roleName: string) => {
    setFormRole(roleName);
    applyRoleDefaults(roleName);
  };

  const resetModal = () => {
    setFormEmail('');
    setFormName('');
    setFormRole('admin');
    setFormPerms(Object.fromEntries(PERM_KEYS.map(k => [k, false])) as Record<PermKey, boolean>);
    setShowAddModal(false);
  };

  /* ── Render role badge ── */
  const renderRoleBadge = (role: string) => {
    const bgClass = ROLE_BADGE_BG[role] || 'bg-gray-500';
    return (
      <span className={`inline-block px-[10px] py-[3px] rounded text-[11px] font-bold text-white ${bgClass}`}>
        {ROLE_DISPLAY[role] || role}
      </span>
    );
  };

  /* ── Render permission dots ── */
  const renderPermDots = (row: StaffRow) => (
    <div className="flex gap-1 flex-wrap">
      {PERM_KEYS.map(k => {
        const active = !!(row as any)[k];
        return (
          <span
            key={k}
            title={`${PERM_LABELS[k]}: ${active ? 'Enabled' : 'Disabled'}`}
            className={`w-2 h-2 rounded-full inline-block cursor-help ${active ? PERM_DOT_COLORS[k] : 'bg-gray-300'}`}
          />
        );
      })}
    </div>
  );

  const getEventTimestamp = (e: EventRow) => e.event_time || '';

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Staff & Roles' }]} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Staff & Roles</h1>
        <p className="text-[13px] text-slate_ui mt-1">
          Manage EvidLY internal staff accounts and role-based permissions.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-[3px] w-fit">
        {([
          { id: 'staff' as Tab, label: 'Staff Members' },
          { id: 'roles' as Tab, label: 'Role Definitions' },
          { id: 'activity' as Tab, label: 'Activity Log' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-[18px] py-2 rounded-md border-none text-[13px] font-semibold cursor-pointer ${
              tab === t.id
                ? 'bg-white text-navy shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'bg-transparent text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ TAB 1: STAFF MEMBERS ═══════ */}
      {tab === 'staff' && (
        <>
          {/* Header row */}
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-navy">EvidLY Staff Accounts</h2>
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                applyRoleDefaults(formRole);
                setShowAddModal(true);
              }}
            >
              + Add Staff Member
            </Button>
          </div>

          {/* Staff table */}
          <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={32} />)}
              </div>
            ) : staff.length === 0 ? (
              <EmptyState icon="👤" title="No staff accounts found" subtitle="Staff accounts with an evidly_staff_role will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border_ui-warm">
                      {['Name', 'Email', 'Role', 'Permissions', 'Last Login'].map(h => (
                        <th key={h} className="text-left px-[14px] py-[10px] text-slate_ui font-semibold text-[11px] uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedStaff(s)}
                        className="border-b border-border_ui-warm cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-[14px] py-[10px] text-navy font-semibold">{s.full_name || '—'}</td>
                        <td className="px-[14px] py-[10px] text-slate_ui text-xs">{s.email}</td>
                        <td className="px-[14px] py-[10px]">{renderRoleBadge(s.evidly_staff_role)}</td>
                        <td className="px-[14px] py-[10px]">{renderPermDots(s)}</td>
                        <td className="px-[14px] py-[10px] text-slate_ui text-xs">
                          {s.last_login_at ? new Date(s.last_login_at).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Add Staff Member Modal ── */}
          <Modal isOpen={showAddModal} onClose={() => resetModal()} size="lg">
            <div className="p-7">
                <h3 className="text-lg font-bold text-navy mb-5">
                  Add Staff Member
                </h3>

                {/* Email */}
                <label className="block text-xs font-semibold text-slate_ui mb-1">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="name@getevidly.com"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] mb-[14px]"
                />

                {/* Full Name */}
                <label className="block text-xs font-semibold text-slate_ui mb-1">
                  Full Name
                </label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="First Last"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] mb-[14px]"
                />

                {/* Role */}
                <label className="block text-xs font-semibold text-slate_ui mb-1">
                  Role
                </label>
                <select
                  value={formRole}
                  onChange={e => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] mb-[18px] cursor-pointer"
                >
                  {STAFF_ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_DISPLAY[r]}</option>
                  ))}
                </select>

                {/* Permission checkboxes */}
                <label className="block text-xs font-semibold text-slate_ui mb-2">
                  Permissions
                </label>
                <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-50 rounded-lg p-[14px] border border-gray-200">
                  {PERM_KEYS.map(k => (
                    <label
                      key={k}
                      className="flex items-center gap-2 text-xs text-navy cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formPerms[k]}
                        onChange={e => setFormPerms(prev => ({ ...prev, [k]: e.target.checked }))}
                        className="accent-gold"
                      />
                      {PERM_LABELS[k]}
                    </label>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-[10px] justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => resetModal()}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (isDemoMode) return;
                      if (!formEmail) return;
                      alert(`Invitation for ${formEmail} requires the server-side auth pipeline. Use Supabase Dashboard to send invitations.`);
                      resetModal();
                    }}
                  >
                    Send Invitation
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => {
                      if (isDemoMode) return;
                      if (!formEmail) return;
                      alert(`Provisioning ${formEmail} requires the server-side auth pipeline. Use Supabase Dashboard to create accounts.`);
                      resetModal();
                    }}
                  >
                    Provision Now
                  </Button>
                </div>
            </div>
          </Modal>
        </>
      )}

      {/* ═══════ TAB 2: ROLE DEFINITIONS ═══════ */}
      {tab === 'roles' && (
        <>
          <h2 className="text-base font-bold text-navy">Role Definitions</h2>
          <p className="text-[13px] text-slate_ui -mt-2 mb-2">
            Default permission templates for each internal staff role.
          </p>

          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={240} />)}
            </div>
          ) : roleDefs.length === 0 ? (
            <EmptyState icon="🔐" title="No role definitions" subtitle="Role definitions from evidly_role_permissions will appear here." />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-4">
              {roleDefs.map(rd => {
                const roleIcon = rd.role_name === 'super_admin' ? '👑'
                  : rd.role_name === 'admin' ? '🛡'
                  : rd.role_name === 'support' ? '🎧'
                  : rd.role_name === 'sales' ? '📈' : '👤';

                return (
                  <div
                    key={rd.id}
                    className="bg-white rounded-xl border border-border_ui-warm p-5 flex flex-col gap-[14px]"
                  >
                    {/* Card header */}
                    <div className="flex items-center gap-[10px]">
                      <span className="text-2xl">{roleIcon}</span>
                      <div>
                        <div className="text-[15px] font-bold text-navy">
                          {ROLE_DISPLAY[rd.role_name] || rd.role_name}
                        </div>
                        {rd.description && (
                          <div className="text-xs text-slate_ui mt-0.5">
                            {rd.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Permission grid */}
                    <div className="grid grid-cols-2 gap-1.5 bg-gray-50 rounded-lg p-3">
                      {PERM_KEYS.map(k => {
                        const enabled = !!(rd as any)[k];
                        return (
                          <div key={k} className="flex items-center gap-1.5 text-xs">
                            <span className={`w-4 h-4 rounded inline-flex items-center justify-center text-[10px] font-bold ${
                              enabled ? 'bg-green-50 text-emerald-600' : 'bg-red-50 text-red-600'
                            }`}>
                              {enabled ? '✓' : '✗'}
                            </span>
                            <span className={enabled ? 'text-navy' : 'text-gray-400'}>
                              {PERM_SHORT_LABELS[k]}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={() => alert(`Edit defaults for "${ROLE_DISPLAY[rd.role_name] || rd.role_name}" requires write access to evidly_role_permissions table.`)}
                      className="px-[14px] py-1.5 rounded-md border border-border_ui-warm bg-white text-slate_ui text-xs font-semibold cursor-pointer self-end"
                    >
                      Edit Defaults
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════ TAB 3: ACTIVITY LOG ═══════ */}
      {tab === 'activity' && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-navy">Activity Log</h2>
            <span className="text-xs text-gray-400">
              Showing up to 200 recent events
            </span>
          </div>

          <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={28} />)}
              </div>
            ) : events.length === 0 ? (
              <EmptyState icon="📋" title="No activity logged" subtitle="Admin events from getevidly.com staff will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border_ui-warm">
                      {['Category', 'Message', 'Level', 'Timestamp'].map(h => (
                        <th key={h} className="text-left px-[14px] py-[10px] text-slate_ui font-semibold text-[11px] uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(ev => {
                      const ts = getEventTimestamp(ev);
                      const lc = LEVEL_COLORS[ev.level] || LEVEL_COLORS.INFO;
                      return (
                        <tr
                          key={ev.id}
                          className="border-b border-border_ui-warm hover:bg-gray-50"
                        >
                          <td className="px-[14px] py-[10px]">
                            <div className="flex flex-col gap-0.5">
                              {ev.category && (
                                <span className="inline-block px-1.5 py-[1px] rounded-[3px] text-[10px] font-semibold bg-gray-100 text-slate_ui w-fit">
                                  {ev.category}
                                </span>
                              )}
                              {!ev.category && (
                                <span className="text-gray-400 text-xs">{'—'}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-[14px] py-[10px] text-navy max-w-[400px]">
                            <span className="break-words">{ev.message}</span>
                          </td>
                          <td className="px-[14px] py-[10px]">
                            <span className={`px-2 py-[2px] rounded text-[10px] font-bold ${lc.bg} ${lc.text}`}>
                              {ev.level}
                            </span>
                          </td>
                          <td className="px-[14px] py-[10px] text-slate_ui text-xs whitespace-nowrap">
                            {ts ? new Date(ts).toLocaleString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Staff Detail Drawer */}
      {selectedStaff && (
        <StaffDrawer
          staff={selectedStaff}
          roleDefs={roleDefs}
          onClose={() => setSelectedStaff(null)}
          renderRoleBadge={renderRoleBadge}
        />
      )}
    </div>
  );
}

// ── Staff Detail Drawer ──

function StaffDrawer({ staff, roleDefs, onClose, renderRoleBadge }: {
  staff: StaffRow;
  roleDefs: RoleDefRow[];
  onClose: () => void;
  renderRoleBadge: (role: string) => React.ReactNode;
}) {
  const { isDemoMode } = useDemo();
  const [drawerTab, setDrawerTab] = useState('Profile');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setEventsLoading(true);
      const { data } = await supabase
        .from('admin_event_log')
        .select('*')
        .ilike('message', `%${staff.email}%`)
        .order('event_time', { ascending: false })
        .limit(100);
      if (data) setEvents(data as EventRow[]);
      setEventsLoading(false);
    })();
  }, [staff.email]);

  const roleDef = roleDefs.find(r => r.role_name === staff.evidly_staff_role);

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/20 z-40" />
      <div className="fixed top-0 right-0 bottom-0 w-[580px] max-w-[100vw] bg-white z-50 shadow-[-4px_0_24px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border_ui-warm shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-navy m-0">{staff.full_name || staff.email}</h2>
              <div className="text-[13px] text-slate_ui mt-0.5">{staff.email}</div>
              <div className="mt-1.5">{renderRoleBadge(staff.evidly_staff_role)}</div>
            </div>
            <button onClick={onClose} className="bg-transparent border-none text-[22px] text-gray-400 cursor-pointer">{'×'}</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border_ui-warm px-6 shrink-0">
          {['Profile', 'Permissions', 'Activity'].map(t => (
            <button
              key={t}
              onClick={() => setDrawerTab(t)}
              className={`px-[14px] py-[10px] text-[13px] font-semibold border-none bg-transparent cursor-pointer whitespace-nowrap -mb-px ${
                drawerTab === t
                  ? 'border-b-2 border-navy text-navy'
                  : 'border-b-2 border-transparent text-gray-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {drawerTab === 'Profile' && (
            <div className="flex flex-col gap-3">
              {[
                ['Full Name', staff.full_name],
                ['Email', staff.email],
                ['Role', ROLE_DISPLAY[staff.evidly_staff_role] || staff.evidly_staff_role],
                ['Last Login', staff.last_login_at ? new Date(staff.last_login_at).toLocaleString() : 'Never'],
                ['Account Created', new Date(staff.created_at).toLocaleDateString()],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-xs text-slate_ui font-semibold">{label}</span>
                  <span className="text-[13px] text-navy font-medium">{value || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {drawerTab === 'Permissions' && (
            <div className="flex flex-col gap-[10px]">
              <div className="text-xs text-slate_ui mb-1">
                Role default: <strong>{ROLE_DISPLAY[staff.evidly_staff_role]}</strong>
                {roleDef && <span className="ml-2 text-gray-400">({roleDef.description || 'No description'})</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-[14px] border border-gray-200">
                {PERM_KEYS.map(k => {
                  const enabled = !!(staff as any)[k];
                  return (
                    <div key={k} className="flex items-center gap-2 text-[13px]">
                      <span className={`w-5 h-5 rounded inline-flex items-center justify-center text-[11px] font-bold ${
                        enabled ? 'bg-green-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {enabled ? '✓' : '✗'}
                      </span>
                      <span className={`${enabled ? 'text-navy font-semibold' : 'text-gray-400 font-normal'}`}>
                        {PERM_LABELS[k]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {drawerTab === 'Activity' && (
            eventsLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={24} />)}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center p-[30px] text-gray-400 text-[13px]">No activity recorded for this staff member.</div>
            ) : (
              <div className="flex flex-col gap-1">
                {events.map(ev => {
                  const lc = LEVEL_COLORS[ev.level] || LEVEL_COLORS.INFO;
                  return (
                    <div key={ev.id} className="py-1.5 border-b border-gray-100 text-xs">
                      <span className="text-slate_ui">{ev.event_time ? new Date(ev.event_time).toLocaleString() : '—'}</span>
                      <span className={`ml-1.5 px-[5px] py-[1px] rounded-[3px] text-[9px] font-bold ${lc.bg} ${lc.text}`}>{ev.level}</span>
                      <span className="ml-2 text-navy">{ev.message}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-[14px] border-t border-border_ui-warm shrink-0 flex gap-[10px]">
          <button onClick={() => alert(`Edit role/permissions for ${staff.full_name || staff.email} requires write access to user_profiles and evidly_role_permissions tables.`)} className="px-4 py-2 rounded-lg border-none bg-navy text-white text-xs font-bold cursor-pointer">
            Edit Role & Permissions
          </button>
          <button onClick={async () => { if (isDemoMode) return; if (confirm(`Send password reset email to ${staff.email}?`)) { const { error } = await supabase.auth.resetPasswordForEmail(staff.email); alert(error ? `Error: ${error.message}` : `Password reset email sent to ${staff.email}.`); } }} className="px-4 py-2 rounded-lg border border-border_ui-warm bg-gray-50 text-slate_ui text-xs font-semibold cursor-pointer">
            Reset Password
          </button>
          <button onClick={() => alert(`Deactivate ${staff.full_name || staff.email} requires admin edge function. Use Supabase Dashboard → Authentication to disable accounts.`)} className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-semibold cursor-pointer">
            Deactivate
          </button>
        </div>
      </div>
    </>
  );
}
