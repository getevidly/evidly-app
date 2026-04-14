/**
 * AdminSecurity — Platform security dashboard
 *
 * Route: /admin/security
 * Access: platform_admin only (AdminShell)
 *
 * Three sections:
 *  1. MFA Policy — toggle MFA enforcement per role, grace periods
 *  2. Session Policy — idle/absolute/admin timeouts per role
 *  3. Active Sessions — list with bulk revoke
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import { toast } from 'sonner';

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

interface MfaPolicyRow {
  role: string;
  mfa_required: boolean;
  grace_period_days: number;
  enforce_at: string | null;
}

interface SessionPolicyRow {
  role: string;
  idle_timeout_minutes: number;
  absolute_timeout_hours: number;
  admin_timeout_minutes: number;
}

interface ActiveSession {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_active_at: string;
  expires_at: string;
  revoked_at: string | null;
}

type Tab = 'mfa' | 'sessions_policy' | 'active_sessions';

export default function AdminSecurity() {
  useDemoGuard();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('mfa');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // MFA Policy
  const [mfaPolicy, setMfaPolicy] = useState<MfaPolicyRow[]>([]);
  const [mfaEditing, setMfaEditing] = useState<string | null>(null);

  // Session Policy
  const [sessionPolicy, setSessionPolicy] = useState<SessionPolicyRow[]>([]);
  const [sessionEditing, setSessionEditing] = useState<string | null>(null);

  // Active Sessions
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [mfaRes, sessRes, activeRes] = await Promise.all([
        supabase.from('mfa_policy').select('*').order('role'),
        supabase.from('session_policy').select('*').order('role'),
        supabase.from('user_sessions').select('id, user_id, ip_address, user_agent, created_at, last_active_at, expires_at, revoked_at').is('revoked_at', null).order('last_active_at', { ascending: false }),
      ]);

      setMfaPolicy((mfaRes.data || []) as MfaPolicyRow[]);
      setSessionPolicy((sessRes.data || []) as SessionPolicyRow[]);

      if (activeRes.data && activeRes.data.length > 0) {
        // Enrich sessions with user info
        const userIds = [...new Set(activeRes.data.map((s: any) => s.user_id))];
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        const enriched = activeRes.data.map((s: any) => {
          const profile = profileMap.get(s.user_id);
          return {
            ...s,
            user_email: profile?.email || 'Unknown',
            user_name: profile?.full_name || 'Unknown',
          };
        });
        setSessions(enriched as ActiveSession[]);
      } else {
        setSessions([]);
      }
    } catch {
      setMfaPolicy([]);
      setSessionPolicy([]);
      setSessions([]);
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── MFA actions ──
  const toggleMfa = async (role: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setMfaPolicy(prev => prev.map(r => r.role === role ? { ...r, mfa_required: newVal } : r));
    await supabase.from('mfa_policy').update({ mfa_required: newVal }).eq('role', role);
    await supabase.from('platform_audit_log').insert({
      actor_id: user?.id, actor_email: user?.email,
      action: 'admin.mfa_policy_changed', resource_type: 'mfa_policy', resource_id: role,
      old_value: { mfa_required: currentVal }, new_value: { mfa_required: newVal },
    }).catch(() => {});
    toast.success(`MFA ${newVal ? 'required' : 'optional'} for ${ROLE_LABELS[role] || role}`);
  };

  const updateGracePeriod = async (role: string, days: number) => {
    setMfaPolicy(prev => prev.map(r => r.role === role ? { ...r, grace_period_days: days } : r));
    await supabase.from('mfa_policy').update({ grace_period_days: days }).eq('role', role);
    setMfaEditing(null);
    toast.success(`Grace period updated for ${ROLE_LABELS[role] || role}`);
  };

  // ── Session policy actions ──
  const updateSessionPolicy = async (role: string, field: string, value: number) => {
    setSessionPolicy(prev => prev.map(r =>
      r.role === role ? { ...r, [field]: value } : r
    ));
    await supabase.from('session_policy').update({ [field]: value }).eq('role', role);
    setSessionEditing(null);
    toast.success(`Session policy updated for ${ROLE_LABELS[role] || role}`);
  };

  // ── Session actions ──
  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    await supabase.from('user_sessions').update({
      revoked_at: new Date().toISOString(),
      revoke_reason: 'admin_forced',
    }).eq('id', sessionId);
    await supabase.from('platform_audit_log').insert({
      actor_id: user?.id, actor_email: user?.email,
      action: 'admin.session_revoked', resource_type: 'user_session', resource_id: sessionId,
    }).catch(() => {});
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setRevoking(null);
    toast.success('Session revoked');
  };

  const revokeAllSessions = async () => {
    if (!confirm('Revoke ALL active sessions? All users will be signed out.')) return;
    for (const s of sessions) {
      await supabase.from('user_sessions').update({
        revoked_at: new Date().toISOString(),
        revoke_reason: 'admin_forced',
      }).eq('id', s.id);
    }
    await supabase.from('platform_audit_log').insert({
      actor_id: user?.id, actor_email: user?.email,
      action: 'admin.all_sessions_revoked', resource_type: 'user_session',
      metadata: { count: sessions.length },
    }).catch(() => {});
    setSessions([]);
    toast.success('All sessions revoked');
  };

  // ── Stats ──
  const mfaEnforcedRoles = mfaPolicy.filter(r => r.mfa_required).length;
  const activeSessions = sessions.length;
  const strictestIdle = sessionPolicy.reduce((min, r) => Math.min(min, r.idle_timeout_minutes), 999);

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const parseBrowser = (ua: string | null) => {
    if (!ua) return 'Unknown';
    return ua.length > 30 ? ua.substring(0, 30) + '...' : ua;
  };

  // ── Tab buttons ──
  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-[18px] py-2 text-[13px] cursor-pointer rounded-t-lg -mb-px ${
        tab === t
          ? 'font-bold text-navy bg-white border border-[#E2D9C8] border-b-white'
          : 'font-medium text-[#6B7F96] bg-transparent border border-transparent border-b-[#E2D9C8]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Security' }]} />

      <div>
        <h1 className="text-[22px] font-extrabold text-navy">Platform Security</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          MFA enforcement, session policies, and active session management
        </p>
      </div>

      {loadError && (
        <div className="text-center p-12">
          <p className="text-[#6B7F96]">Failed to load data.</p>
          <button onClick={loadData} className="mt-3 bg-gold text-white border-none rounded-md px-5 py-2 cursor-pointer">
            Try again
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile label="MFA-Enforced Roles" value={`${mfaEnforcedRoles}/8`} />
        <KpiTile label="Active Sessions" value={activeSessions} />
        <KpiTile label="Strictest Idle Timeout" value={`${strictestIdle}m`} />
        <KpiTile label="Total Roles" value={8} />
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E2D9C8]">
        {tabBtn('mfa', 'MFA Policy')}
        {tabBtn('sessions_policy', 'Session Policy')}
        {tabBtn('active_sessions', `Active Sessions (${activeSessions})`)}
      </div>

      {/* Tab content */}
      <div className="bg-white border border-[#E2D9C8] rounded-[0_10px_10px_10px] overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-[13px]">Loading...</div>
        ) : tab === 'mfa' ? (
          /* ── MFA Policy Tab ── */
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-left">Role</th>
                <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-left">MFA Required</th>
                <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-left">Grace Period</th>
                <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-right">Enforcement</th>
              </tr>
            </thead>
            <tbody>
              {mfaPolicy.map(row => (
                <tr key={row.role}>
                  <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy">
                    <span className="font-semibold">{ROLE_LABELS[row.role] || row.role}</span>
                  </td>
                  <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy">
                    <button
                      onClick={() => toggleMfa(row.role, row.mfa_required)}
                      className={`w-[44px] h-6 rounded-xl border-none cursor-pointer relative transition-colors duration-200 ${
                        row.mfa_required ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[left] duration-200 ${
                        row.mfa_required ? 'left-[22px]' : 'left-0.5'
                      }`} />
                    </button>
                  </td>
                  <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy">
                    {mfaEditing === row.role ? (
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="number"
                          defaultValue={row.grace_period_days}
                          min={0}
                          max={90}
                          className="px-2.5 py-[7px] text-[13px] border border-[#E2D9C8] rounded-md outline-none text-navy bg-white w-[70px]"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateGracePeriod(row.role, parseInt((e.target as HTMLInputElement).value) || 0);
                            }
                          }}
                          autoFocus
                        />
                        <span className="text-xs text-gray-400">days</span>
                        <button onClick={() => setMfaEditing(null)} className="text-[11px] text-gray-400 bg-transparent border-none cursor-pointer">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setMfaEditing(row.role)}
                        className="bg-transparent border-none cursor-pointer text-navy text-[13px]"
                      >
                        {row.grace_period_days === 0 ? 'Immediate' : `${row.grace_period_days} days`}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy text-right">
                    {row.mfa_required ? (
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-500">
                        Enforced
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-400">
                        Optional
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === 'sessions_policy' ? (
          /* ── Session Policy Tab ── */
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-left">Role</th>
                <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-left">Idle Timeout</th>
                <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-left">Absolute Timeout</th>
                <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-left">Admin Timeout</th>
              </tr>
            </thead>
            <tbody>
              {sessionPolicy.map(row => (
                <tr key={row.role}>
                  <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy">
                    <span className="font-semibold">{ROLE_LABELS[row.role] || row.role}</span>
                  </td>
                  <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy">
                    {sessionEditing === `${row.role}-idle` ? (
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="number"
                          defaultValue={row.idle_timeout_minutes}
                          min={5}
                          max={480}
                          className="px-2.5 py-[7px] text-[13px] border border-[#E2D9C8] rounded-md outline-none text-navy bg-white w-[70px]"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateSessionPolicy(row.role, 'idle_timeout_minutes', parseInt((e.target as HTMLInputElement).value) || 60);
                            }
                          }}
                          autoFocus
                        />
                        <span className="text-xs text-gray-400">min</span>
                        <button onClick={() => setSessionEditing(null)} className="text-[11px] text-gray-400 bg-transparent border-none cursor-pointer">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSessionEditing(`${row.role}-idle`)}
                        className="bg-transparent border-none cursor-pointer text-navy text-[13px]"
                      >
                        {row.idle_timeout_minutes} min
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy">
                    {sessionEditing === `${row.role}-abs` ? (
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="number"
                          defaultValue={row.absolute_timeout_hours}
                          min={1}
                          max={168}
                          className="px-2.5 py-[7px] text-[13px] border border-[#E2D9C8] rounded-md outline-none text-navy bg-white w-[70px]"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateSessionPolicy(row.role, 'absolute_timeout_hours', parseInt((e.target as HTMLInputElement).value) || 24);
                            }
                          }}
                          autoFocus
                        />
                        <span className="text-xs text-gray-400">hrs</span>
                        <button onClick={() => setSessionEditing(null)} className="text-[11px] text-gray-400 bg-transparent border-none cursor-pointer">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSessionEditing(`${row.role}-abs`)}
                        className="bg-transparent border-none cursor-pointer text-navy text-[13px]"
                      >
                        {row.absolute_timeout_hours} hrs
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy">
                    {sessionEditing === `${row.role}-admin` ? (
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="number"
                          defaultValue={row.admin_timeout_minutes}
                          min={5}
                          max={120}
                          className="px-2.5 py-[7px] text-[13px] border border-[#E2D9C8] rounded-md outline-none text-navy bg-white w-[70px]"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateSessionPolicy(row.role, 'admin_timeout_minutes', parseInt((e.target as HTMLInputElement).value) || 30);
                            }
                          }}
                          autoFocus
                        />
                        <span className="text-xs text-gray-400">min</span>
                        <button onClick={() => setSessionEditing(null)} className="text-[11px] text-gray-400 bg-transparent border-none cursor-pointer">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSessionEditing(`${row.role}-admin`)}
                        className="bg-transparent border-none cursor-pointer text-navy text-[13px]"
                      >
                        {row.admin_timeout_minutes} min
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* ── Active Sessions Tab ── */
          <div>
            {/* Header with bulk revoke */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-[#E2D9C8]">
              <span className="text-[13px] font-semibold text-navy">
                {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
              </span>
              {sessions.length > 0 && (
                <button onClick={revokeAllSessions} className="px-3.5 py-1.5 text-xs font-semibold border-none rounded-md cursor-pointer bg-red-50 text-red-600">
                  Revoke All
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-[13px]">
                No active sessions
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-left">User</th>
                    <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-left">IP Address</th>
                    <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-left">Browser</th>
                    <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-left">Last Active</th>
                    <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-left">Expires</th>
                    <th className="text-[11px] font-bold text-gray-400 uppercase px-3 py-2.5 border-b border-[#E2D9C8] text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy">
                        <div className="font-semibold">{s.user_name}</div>
                        <div className="text-[11px] text-gray-400">{s.user_email}</div>
                      </td>
                      <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy">
                        <span className="font-mono text-xs">{s.ip_address || '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy">
                        <span className="text-xs text-[#6B7F96]">{parseBrowser(s.user_agent)}</span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy">
                        <span className="text-xs text-[#6B7F96]">{relativeTime(s.last_active_at)}</span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy">
                        <span className="text-xs text-[#6B7F96]">
                          {new Date(s.expires_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-[#E2D9C8] text-[13px] text-navy text-right">
                        <button
                          onClick={() => revokeSession(s.id)}
                          disabled={revoking === s.id}
                          className="px-3.5 py-1.5 text-xs font-semibold border-none rounded-md cursor-pointer bg-red-50 text-red-600"
                        >
                          {revoking === s.id ? '...' : 'Revoke'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
