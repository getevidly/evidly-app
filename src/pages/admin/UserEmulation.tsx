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
  <div className="bg-[#E5E7EB] rounded-md animate-pulse" style={{ width: w, height: h }} />
);

const EmptyState = ({ title, subtitle }: { icon?: string; title: string; subtitle: string }) => (
  <div className="text-center py-12 px-5">
    <div className="text-sm text-[#9CA3AF] mb-1">{title}</div>
    <div className="text-xs text-[#9CA3AF]">{subtitle}</div>
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

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'User Emulation' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">User Emulation</h1>
          <p className="text-[13px] text-[#6B7F96] mt-1">
            View EvidLY as any user — read-only, fully audited
          </p>
        </div>
        {isEmulating && emulatedUser && (
          <button onClick={stopEmulation}
            className="py-2 px-5 bg-[#DC2626] border-none rounded-lg text-white text-[13px] font-bold cursor-pointer">
            Exit Emulation ({emulatedUser.full_name})
          </button>
        )}
      </div>

      {/* Warning card */}
      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] py-3.5 px-5 text-xs text-[#92400E]">
        Emulation sessions are fully audited. The target user's role and permissions are applied. Restricted operations (password reset, billing, account deletion, role changes) are blocked.
      </div>

      {/* Org filter + User search */}
      <div className="flex gap-3 flex-wrap w-full">
        <input value={orgSearch} onChange={e => setOrgSearch(e.target.value)} placeholder="Search organizations..."
          className="py-1.5 px-3 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-xs flex-1 min-w-[180px]" />
        <select value={selectedOrgId || ''} onChange={e => setSelectedOrgId(e.target.value || null)}
          className="py-1.5 px-3 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-xs min-w-[160px] cursor-pointer">
          <option value="">All Organizations</option>
          {filteredOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users by name or email..."
          className="py-1.5 px-3 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-xs flex-1 min-w-[200px]" />
      </div>

      {loadError && (
        <div className="text-center p-12">
          <p className="text-[#6B7F96]">Failed to load data.</p>
          <button onClick={loadData} className="mt-3 bg-gold text-white border-none rounded-md py-2 px-5 cursor-pointer">
            Try again
          </button>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-[#E2D9C8] overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState icon="&#128100;" title="No users found" subtitle="Users will appear here when organizations have members." />
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E2D9C8]">
                {['Name', 'Email', 'Role', 'Organization', 'Action'].map(h => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-[#6B7F96] font-semibold text-[11px] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.slice(0, 50).map(u => {
                const org = orgs.find(o => o.id === u.organization_id);
                const roleColor = ROLE_COLORS[u.role] || '#6B7F96';
                return (
                  <tr key={u.id} className="border-b border-[#E2D9C8] hover:bg-[#F9FAFB]">
                    <td className="px-3.5 py-2.5 text-navy font-semibold">{u.full_name || '\u2014'}</td>
                    <td className="px-3.5 py-2.5 text-[#6B7F96] text-xs">{u.email}</td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: `${roleColor}15`, color: roleColor }}
                      >
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-[#6B7F96] text-xs">{org?.name || '\u2014'}</td>
                    <td className="px-3.5 py-2.5">
                      <button onClick={() => handleEmulate(u)}
                        className="py-1 px-3.5 bg-white border border-[#E2D9C8] rounded-md text-gold text-[11px] font-bold cursor-pointer">
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
      <h2 className="text-lg font-bold text-navy">Recent Emulation Sessions</h2>
      <div className="bg-white rounded-xl border border-[#E2D9C8] overflow-hidden">
        {auditLog.length === 0 ? (
          <EmptyState icon="&#128203;" title="No emulation sessions recorded" subtitle="Audit entries will appear here after emulation sessions." />
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E2D9C8]">
                {['Started', 'Ended', 'Summary'].map(h => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-[#6B7F96] font-semibold text-[11px] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLog.map(a => (
                <tr key={a.id} className="border-b border-[#E2D9C8]">
                  <td className="px-3.5 py-2.5 text-[#6B7F96] text-xs">{new Date(a.started_at).toLocaleString()}</td>
                  <td className="px-3.5 py-2.5 text-[#6B7F96] text-xs">{a.ended_at ? new Date(a.ended_at).toLocaleString() : 'Active'}</td>
                  <td className="px-3.5 py-2.5 text-navy text-xs">{a.actions_summary || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
