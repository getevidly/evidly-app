/**
 * User Emulation — Search organizations/users, start emulation sessions
 * Route: /admin/emulate
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useEmulation } from '../../contexts/EmulationContext';
import { useRole } from '../../contexts/RoleContext';
import type { UserRole } from '../../contexts/RoleContext';

const BG = '#0F1629';
const CARD = '#1A2540';
const GOLD = '#A08C5A';
const TEXT = '#F0EBE0';
const TEXT_DIM = '#8A9AB8';
const TEXT_MUTED = '#4A5C7A';
const BORDER = '#1E2D4D';

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
  <div style={{ width: w, height: h, background: BORDER, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', color: TEXT_MUTED }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_DIM, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_MUTED, maxWidth: 400, margin: '0 auto' }}>{subtitle}</div>
  </div>
);

const ROLE_COLORS: Record<string, string> = {
  owner_operator: '#34D399',
  executive: '#60A5FA',
  kitchen_manager: '#FBBF24',
  compliance_manager: '#A78BFA',
  chef: '#F472B6',
  facilities_manager: '#FB923C',
  kitchen_staff: '#8A9AB8',
  platform_admin: '#F87171',
};

export default function UserEmulation() {
  const navigate = useNavigate();
  const { startEmulation, isEmulating, emulatedUser, stopEmulation } = useEmulation();
  const { userRole, userName, userId } = useRole();

  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [orgSearch, setOrgSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [orgRes, userRes, auditRes] = await Promise.all([
      supabase.from('organizations').select('id, name, created_at').order('name'),
      supabase.from('profiles').select('id, full_name, email, role, organization_id').order('full_name'),
      supabase.from('emulation_audit_log').select('*').order('started_at', { ascending: false }).limit(20),
    ]);
    if (orgRes.data) setOrgs(orgRes.data);
    if (userRes.data) setUsers(userRes.data);
    if (auditRes.data) setAuditLog(auditRes.data);
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
      alert('Already emulating a user. Exit current session first.');
      return;
    }
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
      }
    );
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 40px', fontFamily: 'Inter, sans-serif' }}>
      <button onClick={() => navigate('/admin')} style={{ marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: GOLD, fontSize: 13 }}>&larr; Admin</button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0 }}>User Emulation</h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, marginTop: 4 }}>
            View the platform as any user — read-only, fully audited
          </p>
        </div>
        {isEmulating && emulatedUser && (
          <button onClick={stopEmulation}
            style={{ padding: '8px 20px', background: '#F87171', border: 'none', borderRadius: 8, color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Exit Emulation ({emulatedUser.full_name})
          </button>
        )}
      </div>

      {/* Warning card */}
      <div style={{ background: '#3b2f1033', border: '1px solid #FBBF2444', borderRadius: 10, padding: '14px 20px', marginBottom: 24, fontSize: 12, color: '#FBBF24' }}>
        Emulation sessions are fully audited. The target user's role and permissions are applied. Restricted operations (password reset, billing, account deletion, role changes) are blocked.
      </div>

      {/* Org filter + User search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={orgSearch} onChange={e => setOrgSearch(e.target.value)} placeholder="Search organizations..."
          style={{ padding: '6px 12px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12, width: 220 }} />
        <select value={selectedOrgId || ''} onChange={e => setSelectedOrgId(e.target.value || null)}
          style={{ padding: '6px 12px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12 }}>
          <option value="">All Organizations</option>
          {filteredOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users by name or email..."
          style={{ padding: '6px 12px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12, flex: 1, minWidth: 200 }} />
      </div>

      {/* Users table */}
      <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden', marginBottom: 32 }}>
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
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.slice(0, 50).map(u => {
                const org = orgs.find(o => o.id === u.organization_id);
                const roleColor = ROLE_COLORS[u.role] || TEXT_DIM;
                return (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1E2D4D33'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', color: TEXT, fontWeight: 600 }}>{u.full_name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{u.email}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: `${roleColor}20`, color: roleColor }}>
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{org?.name || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => handleEmulate(u)}
                        style={{ padding: '4px 14px', background: '#0A0F1E', border: `1px solid ${BORDER}`, borderRadius: 6, color: GOLD, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
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
      <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Recent Emulation Sessions</h2>
      <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {auditLog.length === 0 ? (
          <EmptyState icon="📋" title="No emulation sessions recorded" subtitle="Audit entries will appear here after emulation sessions." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Started', 'Ended', 'Summary'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLog.map(a => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{new Date(a.started_at).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{a.ended_at ? new Date(a.ended_at).toLocaleString() : 'Active'}</td>
                  <td style={{ padding: '10px 14px', color: TEXT, fontSize: 12 }}>{a.actions_summary || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
