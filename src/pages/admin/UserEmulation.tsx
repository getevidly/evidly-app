/**
 * User Emulation — Search organizations/users, start emulation sessions
 * Route: /admin/emulate
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useEmulation } from '../../contexts/EmulationContext';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { useRole } from '../../contexts/RoleContext';
import type { UserRole } from '../../contexts/RoleContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

interface OrgRow {
  id: string;
  name: string;
  created_at: string;
}

interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  organization_id: string | null;
}

interface AuditRow {
  id: string;
  admin_id: string;
  target_user_id: string;
  started_at: string;
  ended_at: string | null;
  actions_summary: string | null;
}

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ title, subtitle }: { icon?: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '48px 20px' }}>
    <div style={{ fontSize: 14, color: TEXT_MUTED, marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 12, color: TEXT_MUTED }}>{subtitle}</div>
  </div>
);

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

export default function UserEmulation() {
  useDemoGuard();
  const navigate = useNavigate();
  const { startEmulation, isEmulating, emulatedUser, stopEmulation } = useEmulation();
  const { userRole, userName, userId } = useRole();

  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [orgSearch, setOrgSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [orgRes, userRes, auditRes] = await Promise.all([
        supabase.from('organizations').select('id, name, created_at').order('name'),
        supabase.from('user_profiles').select('id, full_name, email, role, organization_id').order('full_name'),
        supabase.from('emulation_audit_log').select('*').order('started_at', { ascending: false }).limit(20),
      ]);
      if (orgRes.data) setOrgs(orgRes.data);
      if (userRes.data) setUsers(userRes.data);
      if (auditRes.data) setAuditLog(auditRes.data);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredOrgs = orgs.filter(o =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase())
  );

  const filteredUsers = users.filter(u => {
    if (selectedOrgId && u.organization_id !== selectedOrgId) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      return (u.full_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const handleEmulate = async (user: UserRow) => {
    if (isEmulating) {
      return;
    }
    const org = orgs.find(o => o.id === user.organization_id);
    await startEmulation(
      {
        id: user.id,
        full_name: user.full_name || user.email,
        email: user.email,
        role: user.role as UserRole,
      },
      {
        adminRole: userRole,
        adminName: userName || 'Admin',
        adminId: userId || 'unknown',
      },
      user.organization_id || '',
      org?.name || 'Unknown',
    );
    navigate('/dashboard');
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 12px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 6, color: NAVY, fontSize: 12,
  };

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'User Emulation' }]} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>User Emulation</h1>
          <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
            View the platform as any user — read-only, fully audited
          </p>
        </div>
        {isEmulating && emulatedUser && (
          <button onClick={stopEmulation}
            style={{ padding: '8px 20px', background: '#DC2626', border: 'none', borderRadius: 8, color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Exit Emulation ({emulatedUser.full_name})
          </button>
        )}
      </div>

      {/* Warning card */}
      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '14px 20px', fontSize: 12, color: '#92400E' }}>
        Emulation sessions are fully audited. The target user's role and permissions are applied. Restricted operations (password reset, billing, account deletion, role changes) are blocked.
      </div>

      {/* Org filter + User search */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%' }}>
        <input value={orgSearch} onChange={e => setOrgSearch(e.target.value)} placeholder="Search organizations..."
          style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
        <select value={selectedOrgId || ''} onChange={e => setSelectedOrgId(e.target.value || null)}
          style={{ ...inputStyle, minWidth: 160, cursor: 'pointer' }}>
          <option value="">All Organizations</option>
          {filteredOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users by name or email..."
          style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
      </div>

      {loadError && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6B7F96' }}>Failed to load data.</p>
          <button onClick={loadData} style={{ marginTop: 12, background: '#A08C5A', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      )}

      {/* Users table */}
      <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState icon="👤" title="No users found" subtitle="Users will appear here when organizations have members." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Name', 'Email', 'Role', 'Organization', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.slice(0, 50).map(u => {
                const org = orgs.find(o => o.id === u.organization_id);
                const roleColor = ROLE_COLORS[u.role] || TEXT_SEC;
                return (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER}` }}
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
                      <button onClick={() => handleEmulate(u)}
                        style={{ padding: '4px 14px', background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 6, color: GOLD, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Emulate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent emulations */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>Recent Emulation Sessions</h2>
      <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {auditLog.length === 0 ? (
          <EmptyState icon="📋" title="No emulation sessions recorded" subtitle="Audit entries will appear here after emulation sessions." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Started', 'Ended', 'Summary'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLog.map(a => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{new Date(a.started_at).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{a.ended_at ? new Date(a.ended_at).toLocaleString() : 'Active'}</td>
                  <td style={{ padding: '10px 14px', color: NAVY, fontSize: 12 }}>{a.actions_summary || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
