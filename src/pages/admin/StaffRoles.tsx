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
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

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
  perm_billing: '#059669',
  perm_security: '#DC2626',
  perm_emulate: '#7C3AED',
  perm_configure: '#2563EB',
  perm_support_tickets: '#D97706',
  perm_sales_pipeline: '#059669',
  perm_crawl_manage: '#EA580C',
  perm_remote_connect: '#0891B2',
  perm_intelligence: '#7C3AED',
  perm_staff_manage: '#DC2626',
};

/* ── Role badge styling ── */
const ROLE_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: `linear-gradient(135deg, ${NAVY}, ${GOLD})`, text: '#FFFFFF' },
  admin: { bg: NAVY, text: '#FFFFFF' },
  support: { bg: '#2563EB', text: '#FFFFFF' },
  sales: { bg: '#059669', text: '#FFFFFF' },
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
  INFO:  { bg: '#EFF6FF', text: '#2563EB' },
  WARN:  { bg: '#FFFBEB', text: '#D97706' },
  ERROR: { bg: '#FEF2F2', text: '#DC2626' },
  DEBUG: { bg: '#F3F4F6', text: '#6B7280' },
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
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FAF7F2', border: '2px dashed #E2D9C8', borderRadius: 12, margin: 16 }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 400, margin: '0 auto' }}>{subtitle}</div>
  </div>
);

/* ─────────────────────────────────────────────────────────── */

export default function StaffRoles() {
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

  /* ── Style helpers ── */
  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: tab === t ? '#FFFFFF' : 'transparent', color: tab === t ? NAVY : TEXT_MUTED,
    boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
  });

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 6, color: NAVY, fontSize: 13, width: '100%',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '10px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 13,
  };

  /* ── Render role badge ── */
  const renderRoleBadge = (role: string) => {
    const style = ROLE_BADGE_STYLES[role] || { bg: '#6B7280', text: '#FFFFFF' };
    const isGradient = style.bg.includes('gradient');
    return (
      <span style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        color: style.text,
        ...(isGradient ? { backgroundImage: style.bg } : { background: style.bg }),
      }}>
        {ROLE_DISPLAY[role] || role}
      </span>
    );
  };

  /* ── Render permission dots ── */
  const renderPermDots = (row: StaffRow) => (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {PERM_KEYS.map(k => {
        const active = !!(row as any)[k];
        return (
          <span
            key={k}
            title={`${PERM_LABELS[k]}: ${active ? 'Enabled' : 'Disabled'}`}
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: active ? PERM_DOT_COLORS[k] : '#D1D5DB',
              display: 'inline-block',
              cursor: 'help',
            }}
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
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Staff & Roles</h1>
        <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
          Manage EvidLY internal staff accounts and role-based permissions.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 2, background: '#F3F4F6', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {([
          { id: 'staff' as Tab, label: 'Staff Members' },
          { id: 'roles' as Tab, label: 'Role Definitions' },
          { id: 'activity' as Tab, label: 'Activity Log' },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ TAB 1: STAFF MEMBERS ═══════ */}
      {tab === 'staff' && (
        <>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>EvidLY Staff Accounts</h2>
            <button
              onClick={() => {
                applyRoleDefaults(formRole);
                setShowAddModal(true);
              }}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600,
                background: GOLD, color: '#FFFFFF', cursor: 'pointer',
              }}
            >
              + Add Staff Member
            </button>
          </div>

          {/* Staff table */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={32} />)}
              </div>
            ) : staff.length === 0 ? (
              <EmptyState icon="👤" title="No staff accounts found" subtitle="Staff accounts with an evidly_staff_role will appear here." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {['Name', 'Email', 'Role', 'Permissions', 'Last Login'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedStaff(s)}
                        style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ ...tdStyle, color: NAVY, fontWeight: 600 }}>{s.full_name || '\u2014'}</td>
                        <td style={{ ...tdStyle, color: TEXT_SEC, fontSize: 12 }}>{s.email}</td>
                        <td style={tdStyle}>{renderRoleBadge(s.evidly_staff_role)}</td>
                        <td style={tdStyle}>{renderPermDots(s)}</td>
                        <td style={{ ...tdStyle, color: TEXT_SEC, fontSize: 12 }}>
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
          {showAddModal && (
            <div
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: 9999,
              }}
              onClick={() => resetModal()}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background: '#FFFFFF', borderRadius: 16, padding: 28, width: 520, maxHeight: '90vh',
                  overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                }}
              >
                <h3 style={{ fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 20 }}>
                  Add Staff Member
                </h3>

                {/* Email */}
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TEXT_SEC, marginBottom: 4 }}>
                  Email <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="name@getevidly.com"
                  style={{ ...inputStyle, marginBottom: 14 }}
                />

                {/* Full Name */}
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TEXT_SEC, marginBottom: 4 }}>
                  Full Name
                </label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="First Last"
                  style={{ ...inputStyle, marginBottom: 14 }}
                />

                {/* Role */}
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TEXT_SEC, marginBottom: 4 }}>
                  Role
                </label>
                <select
                  value={formRole}
                  onChange={e => handleRoleChange(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 18, cursor: 'pointer' }}
                >
                  {STAFF_ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_DISPLAY[r]}</option>
                  ))}
                </select>

                {/* Permission checkboxes */}
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TEXT_SEC, marginBottom: 8 }}>
                  Permissions
                </label>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24,
                  background: '#F9FAFB', borderRadius: 8, padding: 14, border: '1px solid #E5E7EB',
                }}>
                  {PERM_KEYS.map(k => (
                    <label
                      key={k}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: NAVY, cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={formPerms[k]}
                        onChange={e => setFormPerms(prev => ({ ...prev, [k]: e.target.checked }))}
                        style={{ accentColor: GOLD }}
                      />
                      {PERM_LABELS[k]}
                    </label>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => resetModal()}
                    style={{
                      padding: '8px 16px', borderRadius: 6, border: `1px solid ${BORDER}`,
                      background: '#FFFFFF', color: TEXT_SEC, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!formEmail) return;
                      resetModal();
                    }}
                    style={{
                      padding: '8px 16px', borderRadius: 6, border: 'none',
                      background: '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Send Invitation
                  </button>
                  <button
                    onClick={() => {
                      if (!formEmail) return;
                      resetModal();
                    }}
                    style={{
                      padding: '8px 16px', borderRadius: 6, border: 'none',
                      background: GOLD, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Provision Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════ TAB 2: ROLE DEFINITIONS ═══════ */}
      {tab === 'roles' && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Role Definitions</h2>
          <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: -8, marginBottom: 8 }}>
            Default permission templates for each internal staff role.
          </p>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={240} />)}
            </div>
          ) : roleDefs.length === 0 ? (
            <EmptyState icon="🔐" title="No role definitions" subtitle="Role definitions from evidly_role_permissions will appear here." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
              {roleDefs.map(rd => {
                const roleIcon = rd.role_name === 'super_admin' ? '👑'
                  : rd.role_name === 'admin' ? '🛡'
                  : rd.role_name === 'support' ? '🎧'
                  : rd.role_name === 'sales' ? '📈' : '👤';

                return (
                  <div
                    key={rd.id}
                    style={{
                      background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`,
                      padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
                    }}
                  >
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{roleIcon}</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
                          {ROLE_DISPLAY[rd.role_name] || rd.role_name}
                        </div>
                        {rd.description && (
                          <div style={{ fontSize: 12, color: TEXT_SEC, marginTop: 2 }}>
                            {rd.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Permission grid */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                      background: '#F9FAFB', borderRadius: 8, padding: 12,
                    }}>
                      {PERM_KEYS.map(k => {
                        const enabled = !!(rd as any)[k];
                        return (
                          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <span style={{
                              width: 16, height: 16, borderRadius: 4,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              background: enabled ? '#F0FFF4' : '#FEF2F2',
                              color: enabled ? '#059669' : '#DC2626',
                              fontSize: 10, fontWeight: 700,
                            }}>
                              {enabled ? '\u2713' : '\u2717'}
                            </span>
                            <span style={{ color: enabled ? NAVY : TEXT_MUTED }}>
                              {PERM_SHORT_LABELS[k]}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={() => {}}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: `1px solid ${BORDER}`,
                        background: '#FFFFFF', color: TEXT_SEC, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', alignSelf: 'flex-end',
                      }}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Activity Log</h2>
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>
              Showing up to 200 recent events
            </span>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={28} />)}
              </div>
            ) : events.length === 0 ? (
              <EmptyState icon="📋" title="No activity logged" subtitle="Admin events from getevidly.com staff will appear here." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {['Category', 'Message', 'Level', 'Timestamp'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
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
                          style={{ borderBottom: `1px solid ${BORDER}` }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {ev.category && (
                                <span style={{
                                  display: 'inline-block', padding: '1px 6px', borderRadius: 3,
                                  fontSize: 10, fontWeight: 600, background: '#F3F4F6', color: TEXT_SEC,
                                  width: 'fit-content',
                                }}>
                                  {ev.category}
                                </span>
                              )}
                              {!ev.category && (
                                <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{'\u2014'}</span>
                              )}
                            </div>
                          </td>
                          <td style={{ ...tdStyle, color: NAVY, maxWidth: 400 }}>
                            <span style={{ wordBreak: 'break-word' }}>{ev.message}</span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                              background: lc.bg, color: lc.text,
                            }}>
                              {ev.level}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color: TEXT_SEC, fontSize: 12, whiteSpace: 'nowrap' }}>
                            {ts ? new Date(ts).toLocaleString() : '\u2014'}
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

  const drawerTabStyle = (t: string): React.CSSProperties => ({
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
              <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>{staff.full_name || staff.email}</h2>
              <div style={{ fontSize: 13, color: TEXT_SEC, marginTop: 2 }}>{staff.email}</div>
              <div style={{ marginTop: 6 }}>{renderRoleBadge(staff.evidly_staff_role)}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: TEXT_MUTED, cursor: 'pointer' }}>{'\u00D7'}</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, padding: '0 24px', flexShrink: 0 }}>
          {['Profile', 'Permissions', 'Activity'].map(t => (
            <button key={t} onClick={() => setDrawerTab(t)} style={drawerTabStyle(t)}>{t}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {drawerTab === 'Profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Full Name', staff.full_name],
                ['Email', staff.email],
                ['Role', ROLE_DISPLAY[staff.evidly_staff_role] || staff.evidly_staff_role],
                ['Last Login', staff.last_login_at ? new Date(staff.last_login_at).toLocaleString() : 'Never'],
                ['Account Created', new Date(staff.created_at).toLocaleDateString()],
              ].map(([label, value]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ fontSize: 12, color: TEXT_SEC, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 13, color: NAVY, fontWeight: 500 }}>{value || '\u2014'}</span>
                </div>
              ))}
            </div>
          )}

          {drawerTab === 'Permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: TEXT_SEC, marginBottom: 4 }}>
                Role default: <strong>{ROLE_DISPLAY[staff.evidly_staff_role]}</strong>
                {roleDef && <span style={{ marginLeft: 8, color: TEXT_MUTED }}>({roleDef.description || 'No description'})</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#F9FAFB', borderRadius: 8, padding: 14, border: '1px solid #E5E7EB' }}>
                {PERM_KEYS.map(k => {
                  const enabled = !!(staff as any)[k];
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 4,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: enabled ? '#F0FFF4' : '#FEF2F2',
                        color: enabled ? '#059669' : '#DC2626',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {enabled ? '\u2713' : '\u2717'}
                      </span>
                      <span style={{ color: enabled ? NAVY : TEXT_MUTED, fontWeight: enabled ? 600 : 400 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={24} />)}
              </div>
            ) : events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No activity recorded for this staff member.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {events.map(ev => {
                  const lc = LEVEL_COLORS[ev.level] || LEVEL_COLORS.INFO;
                  return (
                    <div key={ev.id} style={{ padding: '6px 0', borderBottom: '1px solid #F3F4F6', fontSize: 12 }}>
                      <span style={{ color: TEXT_SEC }}>{ev.event_time ? new Date(ev.event_time).toLocaleString() : '\u2014'}</span>
                      <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: lc.bg, color: lc.text }}>{ev.level}</span>
                      <span style={{ marginLeft: 8, color: NAVY }}>{ev.message}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, display: 'flex', gap: 10 }}>
          <button onClick={() => {}} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: NAVY, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Edit Role & Permissions
          </button>
          <button onClick={() => {}} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#F9FAFB', color: TEXT_SEC, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Reset Password
          </button>
          <button onClick={() => {}} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Deactivate
          </button>
        </div>
      </div>
    </>
  );
}
