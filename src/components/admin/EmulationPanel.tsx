// ══════════════════════════════════════════════════════════════
// EmulationPanel — Admin User Emulation UI
// Allows platform_admin to emulate any user in any organization.
// Uses the existing EmulationContext (startEmulation / stopEmulation).
// Orgs + users are fetched live from Supabase — no hardcoded data.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldAlert, User, Building2, ChevronRight, X, Clock, Loader2 } from 'lucide-react';
import { useEmulation, type EmulatedUser } from '../../contexts/EmulationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRole, type UserRole } from '../../contexts/RoleContext';
import { supabase } from '../../lib/supabase';

const BRAND = '#1E2D4D';
const F = { fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" };

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  owner_operator: 'Owner / Operator',
  executive: 'Executive',
  compliance_manager: 'Compliance Manager',
  chef: 'Chef',
  facilities_manager: 'Facilities Manager',
  kitchen_manager: 'Kitchen Manager',
  kitchen_staff: 'Kitchen Staff',
};

const ROLE_COLORS: Record<string, string> = {
  platform_admin: '#7c3aed',
  owner_operator: '#1E2D4D',
  executive: '#0d9488',
  compliance_manager: '#2563eb',
  chef: '#d97706',
  facilities_manager: '#059669',
  kitchen_manager: '#dc2626',
  kitchen_staff: '#6b7280',
};

// ── Types ────────────────────────────────────────────────────

interface OrgRow {
  id: string;
  name: string;
  subscription_tier: string | null;
  userCount: number;
}

interface OrgUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

// ── Component ────────────────────────────────────────────────

export function EmulationPanel() {
  const { isEmulating, emulatedUser, originalAdmin, startEmulation, stopEmulation } = useEmulation();
  const { profile } = useAuth();
  const { userRole } = useRole();
  const navigate = useNavigate();

  // Org list
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected org + its users
  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Confirm modal
  const [confirmUser, setConfirmUser] = useState<OrgUser | null>(null);
  const [confirmOrgName, setConfirmOrgName] = useState('');

  // ── Fetch all organizations on mount ──
  useEffect(() => {
    let cancelled = false;

    async function fetchOrgs() {
      setOrgsLoading(true);
      // Get all orgs
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, subscription_tier')
        .order('name');

      if (cancelled || !orgData) {
        if (!cancelled) { setOrgs([]); setOrgsLoading(false); }
        return;
      }

      // Get user counts per org in one query
      const { data: profileCounts } = await supabase
        .from('user_profiles')
        .select('organization_id');

      const countMap: Record<string, number> = {};
      if (profileCounts) {
        for (const p of profileCounts) {
          if (p.organization_id) {
            countMap[p.organization_id] = (countMap[p.organization_id] || 0) + 1;
          }
        }
      }

      const rows: OrgRow[] = orgData.map((o) => ({
        id: o.id,
        name: o.name,
        subscription_tier: o.subscription_tier,
        userCount: countMap[o.id] || 0,
      }));

      if (!cancelled) {
        setOrgs(rows);
        setOrgsLoading(false);
      }
    }

    fetchOrgs();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch users when an org is selected ──
  const selectOrg = useCallback(async (org: OrgRow) => {
    setSelectedOrg(org);
    setOrgUsers([]);
    setUsersLoading(true);

    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role')
      .eq('organization_id', org.id)
      .order('full_name');

    setOrgUsers(
      (data || []).map((u) => ({
        id: u.id,
        full_name: u.full_name || '(unnamed)',
        email: u.email || '',
        role: (u.role || 'kitchen_staff') as UserRole,
      }))
    );
    setUsersLoading(false);
  }, []);

  // ── Filter orgs by search (client-side on already-fetched list) ──
  const filteredOrgs = searchQuery.trim()
    ? orgs.filter((o) => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : orgs;

  const handleStartEmulation = async (user: OrgUser, orgName: string) => {
    const emUser: EmulatedUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    };
    const admin = {
      adminRole: userRole,
      adminName: profile?.full_name || 'Admin',
      adminId: profile?.id || 'admin',
    };

    await startEmulation(emUser, admin, selectedOrg!.id, orgName);
    setConfirmUser(null);
    navigate('/dashboard');
  };

  // ── Active session view ──
  if (isEmulating && emulatedUser) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold" style={{ color: BRAND, ...F }}>User Emulation</h3>

        <div className="rounded-xl p-5" style={{ background: '#fef2f2', border: '2px solid #fecaca' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#dc2626' }}>
              <ShieldAlert size={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: '#991b1b', ...F }}>Emulation Active</div>
              <div className="text-xs" style={{ color: '#b91c1c' }}>All actions are logged. Usage tracking is paused.</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: '#991b1b' }}>Viewing as</div>
              <div className="text-sm font-semibold" style={{ color: '#0B1628', ...F }}>{emulatedUser.full_name}</div>
              <div className="text-xs" style={{ color: '#6b7280' }}>{emulatedUser.email}</div>
            </div>
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: '#991b1b' }}>Role</div>
              <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ background: ROLE_COLORS[emulatedUser.role] || '#6b7280' }}>
                {ROLE_LABELS[emulatedUser.role] || emulatedUser.role}
              </span>
            </div>
          </div>

          {originalAdmin && (
            <div className="text-xs mb-4" style={{ color: '#6b7280' }}>
              <Clock size={12} className="inline mr-1" />
              Admin: {originalAdmin.adminName}
            </div>
          )}

          <button
            onClick={stopEmulation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
            style={{ background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', ...F }}
          >
            <X size={15} />
            End Emulation
          </button>
        </div>
      </div>
    );
  }

  // ── Normal view: search + select ──
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: BRAND, ...F }}>User Emulation</h3>
      <p className="text-sm" style={{ color: '#6B7F96', ...F }}>
        View EvidLY as any user to debug issues, verify permissions, or demonstrate features. Sessions are fully logged.
      </p>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSelectedOrg(null); }}
          placeholder="Search by org name..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm"
          style={{ borderColor: '#D1D9E6', ...F }}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Account selector */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#6B7F96' }}>Organizations</div>
          {orgsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: BRAND }} />
              <span className="ml-2 text-sm" style={{ color: '#6B7F96' }}>Loading organizations...</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {filteredOrgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => selectOrg(org)}
                  className="w-full text-left px-3 py-2.5 rounded-lg transition-colors"
                  style={{
                    background: selectedOrg?.id === org.id ? '#eef4f8' : '#fff',
                    border: selectedOrg?.id === org.id ? `1.5px solid ${BRAND}` : '1px solid #e5e7eb',
                    cursor: 'pointer', ...F,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} style={{ color: BRAND }} />
                      <span className="text-sm font-semibold" style={{ color: '#0B1628' }}>{org.name}</span>
                    </div>
                    <ChevronRight size={14} style={{ color: '#9ca3af' }} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-6">
                    {org.subscription_tier && (
                      <span className="text-xs" style={{ color: '#6B7F96' }}>{org.subscription_tier}</span>
                    )}
                    <span className="text-xs" style={{ color: '#6B7F96' }}>{org.userCount} user{org.userCount !== 1 ? 's' : ''}</span>
                  </div>
                </button>
              ))}
              {filteredOrgs.length === 0 && (
                <div className="text-center py-6 text-sm" style={{ color: '#9ca3af' }}>
                  {orgs.length === 0 ? 'No organizations found' : 'No matching organizations'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: User selector */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#6B7F96' }}>
            {selectedOrg ? `Users in ${selectedOrg.name}` : 'Select an organization'}
          </div>
          {selectedOrg ? (
            usersLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin" style={{ color: BRAND }} />
                <span className="ml-2 text-sm" style={{ color: '#6B7F96' }}>Loading users...</span>
              </div>
            ) : orgUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: '#9ca3af' }}>
                <User size={28} className="mb-2" />
                <span className="text-sm">No users in this organization</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {orgUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                    style={{ background: '#fff', border: '1px solid #e5e7eb' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: ROLE_COLORS[user.role] || '#6b7280' }}>
                        {user.full_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#0B1628', ...F }}>{user.full_name}</div>
                        <div className="text-xs" style={{ color: '#6B7F96' }}>{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ background: ROLE_COLORS[user.role] || '#6b7280' }}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                      <button
                        onClick={() => { setConfirmUser(user); setConfirmOrgName(selectedOrg.name); }}
                        className="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                        style={{ background: '#eef4f8', color: BRAND, border: `1px solid ${BRAND}`, cursor: 'pointer', ...F }}
                      >
                        Emulate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: '#9ca3af' }}>
              <User size={28} className="mb-2" />
              <span className="text-sm">Select an organization to see users</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm Modal ── */}
      {confirmUser && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setConfirmUser(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" style={{ ...F }} onClick={(e) => e.stopPropagation()}>
              <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#e5e7eb' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
                    <ShieldAlert size={20} style={{ color: '#dc2626' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: '#0B1628' }}>Start Emulation</h3>
                    <p className="text-xs" style={{ color: '#6B7F96' }}>This session will be logged</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5 space-y-3">
                <p className="text-sm" style={{ color: '#374151' }}>
                  You are about to view EvidLY as:
                </p>
                <div className="px-4 py-3 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                  <div className="text-sm font-bold" style={{ color: '#0B1628' }}>{confirmUser.full_name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6B7F96' }}>{confirmUser.email}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ background: ROLE_COLORS[confirmUser.role] || '#6b7280' }}>
                      {ROLE_LABELS[confirmUser.role] || confirmUser.role}
                    </span>
                    <span className="text-xs" style={{ color: '#6B7F96' }}>at {confirmOrgName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#eef4f8', color: BRAND }}>
                  <ShieldAlert size={13} />
                  Usage tracking is paused during emulation.
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmUser(null)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer', ...F }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStartEmulation(confirmUser, confirmOrgName)}
                  className="px-4 py-2 rounded-lg text-sm font-bold"
                  style={{ background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', ...F }}
                >
                  Start Emulation
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
