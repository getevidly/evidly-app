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

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';
const GREEN = '#10B981';
const RED = '#DC2626';
const AMBER = '#F59E0B';

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

// ── Demo data ──

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

const DEMO_MFA_POLICY: MfaPolicyRow[] = [
  { role: 'platform_admin', mfa_required: true, grace_period_days: 0, enforce_at: null },
  { role: 'owner_operator', mfa_required: false, grace_period_days: 30, enforce_at: null },
  { role: 'executive', mfa_required: false, grace_period_days: 30, enforce_at: null },
  { role: 'compliance_officer', mfa_required: false, grace_period_days: 30, enforce_at: null },
  { role: 'facilities', mfa_required: false, grace_period_days: 30, enforce_at: null },
  { role: 'chef', mfa_required: false, grace_period_days: 30, enforce_at: null },
  { role: 'kitchen_manager', mfa_required: false, grace_period_days: 30, enforce_at: null },
  { role: 'kitchen_staff', mfa_required: false, grace_period_days: 30, enforce_at: null },
];

const DEMO_SESSION_POLICY: SessionPolicyRow[] = [
  { role: 'platform_admin', idle_timeout_minutes: 15, absolute_timeout_hours: 8, admin_timeout_minutes: 15 },
  { role: 'owner_operator', idle_timeout_minutes: 60, absolute_timeout_hours: 24, admin_timeout_minutes: 30 },
  { role: 'executive', idle_timeout_minutes: 60, absolute_timeout_hours: 24, admin_timeout_minutes: 30 },
  { role: 'compliance_officer', idle_timeout_minutes: 60, absolute_timeout_hours: 24, admin_timeout_minutes: 30 },
  { role: 'facilities', idle_timeout_minutes: 120, absolute_timeout_hours: 48, admin_timeout_minutes: 60 },
  { role: 'chef', idle_timeout_minutes: 120, absolute_timeout_hours: 48, admin_timeout_minutes: 60 },
  { role: 'kitchen_manager', idle_timeout_minutes: 120, absolute_timeout_hours: 48, admin_timeout_minutes: 60 },
  { role: 'kitchen_staff', idle_timeout_minutes: 240, absolute_timeout_hours: 72, admin_timeout_minutes: 60 },
];

const DEMO_SESSIONS: ActiveSession[] = [
  { id: 's1', user_id: 'd1', user_email: 'arthur@getevidly.com', user_name: 'Arthur Chen', ip_address: '192.168.1.1', user_agent: 'Chrome 120 / macOS', created_at: new Date(Date.now() - 3600000).toISOString(), last_active_at: new Date(Date.now() - 120000).toISOString(), expires_at: new Date(Date.now() + 25200000).toISOString(), revoked_at: null },
  { id: 's2', user_id: 'd2', user_email: 'sarah@downtown.com', user_name: 'Sarah Johnson', ip_address: '10.0.0.5', user_agent: 'Safari 17 / iOS', created_at: new Date(Date.now() - 7200000).toISOString(), last_active_at: new Date(Date.now() - 900000).toISOString(), expires_at: new Date(Date.now() + 79200000).toISOString(), revoked_at: null },
  { id: 's3', user_id: 'd3', user_email: 'mike@airport.com', user_name: 'Mike Torres', ip_address: '172.16.0.8', user_agent: 'Chrome 120 / Android', created_at: new Date(Date.now() - 14400000).toISOString(), last_active_at: new Date(Date.now() - 3600000).toISOString(), expires_at: new Date(Date.now() + 158400000).toISOString(), revoked_at: null },
  { id: 's4', user_id: 'd6', user_email: 'ana@downtown.com', user_name: 'Ana Rivera', ip_address: '10.0.0.20', user_agent: 'Firefox 121 / Windows', created_at: new Date(Date.now() - 28800000).toISOString(), last_active_at: new Date(Date.now() - 7200000).toISOString(), expires_at: new Date(Date.now() + 230400000).toISOString(), revoked_at: null },
];

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, border: `1px solid ${BORDER}`,
  borderRadius: 6, outline: 'none', color: NAVY, background: '#fff',
};

const btnStyle = (bg: string, fg: string): React.CSSProperties => ({
  padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none',
  borderRadius: 6, cursor: 'pointer', background: bg, color: fg,
});

const thStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase',
  padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, textAlign: 'left',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, fontSize: 13, color: NAVY,
};

type Tab = 'mfa' | 'sessions_policy' | 'active_sessions';

export default function AdminSecurity() {
  useDemoGuard();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('mfa');
  const [loading, setLoading] = useState(true);

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
    try {
      const [mfaRes, sessRes, activeRes] = await Promise.all([
        supabase.from('mfa_policy').select('*').order('role'),
        supabase.from('session_policy').select('*').order('role'),
        supabase.from('user_sessions').select('id, user_id, ip_address, user_agent, created_at, last_active_at, expires_at, revoked_at').is('revoked_at', null).order('last_active_at', { ascending: false }),
      ]);

      if (mfaRes.data && mfaRes.data.length > 0) {
        setMfaPolicy(mfaRes.data as MfaPolicyRow[]);
      } else {
        setMfaPolicy(DEMO_MFA_POLICY);
      }

      if (sessRes.data && sessRes.data.length > 0) {
        setSessionPolicy(sessRes.data as SessionPolicyRow[]);
      } else {
        setSessionPolicy(DEMO_SESSION_POLICY);
      }

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
        setSessions(DEMO_SESSIONS);
      }
    } catch {
      setMfaPolicy(DEMO_MFA_POLICY);
      setSessionPolicy(DEMO_SESSION_POLICY);
      setSessions(DEMO_SESSIONS);
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
      style={{
        padding: '8px 18px', fontSize: 13, fontWeight: tab === t ? 700 : 500,
        color: tab === t ? NAVY : TEXT_SEC,
        background: tab === t ? '#fff' : 'transparent',
        border: tab === t ? `1px solid ${BORDER}` : '1px solid transparent',
        borderBottom: tab === t ? '1px solid #fff' : `1px solid ${BORDER}`,
        borderRadius: '8px 8px 0 0', cursor: 'pointer',
        marginBottom: -1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Security' }]} />

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Platform Security</h1>
        <p style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>
          MFA enforcement, session policies, and active session management
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiTile label="MFA-Enforced Roles" value={`${mfaEnforcedRoles}/8`} />
        <KpiTile label="Active Sessions" value={activeSessions} />
        <KpiTile label="Strictest Idle Timeout" value={`${strictestIdle}m`} />
        <KpiTile label="Total Roles" value={8} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}` }}>
        {tabBtn('mfa', 'MFA Policy')}
        {tabBtn('sessions_policy', 'Session Policy')}
        {tabBtn('active_sessions', `Active Sessions (${activeSessions})`)}
      </div>

      {/* Tab content */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: '0 10px 10px 10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>Loading...</div>
        ) : tab === 'mfa' ? (
          /* ── MFA Policy Tab ── */
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>MFA Required</th>
                <th style={thStyle}>Grace Period</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Enforcement</th>
              </tr>
            </thead>
            <tbody>
              {mfaPolicy.map(row => (
                <tr key={row.role}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>{ROLE_LABELS[row.role] || row.role}</span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => toggleMfa(row.role, row.mfa_required)}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: row.mfa_required ? GREEN : '#D1D5DB',
                        position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 2,
                        left: row.mfa_required ? 22 : 2,
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#fff', transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  </td>
                  <td style={tdStyle}>
                    {mfaEditing === row.role ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="number"
                          defaultValue={row.grace_period_days}
                          min={0}
                          max={90}
                          style={{ ...inputStyle, width: 70 }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateGracePeriod(row.role, parseInt((e.target as HTMLInputElement).value) || 0);
                            }
                          }}
                          autoFocus
                        />
                        <span style={{ fontSize: 12, color: TEXT_MUTED }}>days</span>
                        <button onClick={() => setMfaEditing(null)} style={{ fontSize: 11, color: TEXT_MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setMfaEditing(row.role)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: NAVY, fontSize: 13 }}
                      >
                        {row.grace_period_days === 0 ? 'Immediate' : `${row.grace_period_days} days`}
                      </button>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {row.mfa_required ? (
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                        fontSize: 11, fontWeight: 600, background: '#ECFDF5', color: GREEN,
                      }}>
                        Enforced
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                        fontSize: 11, fontWeight: 600, background: '#F3F4F6', color: TEXT_MUTED,
                      }}>
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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Idle Timeout</th>
                <th style={thStyle}>Absolute Timeout</th>
                <th style={thStyle}>Admin Timeout</th>
              </tr>
            </thead>
            <tbody>
              {sessionPolicy.map(row => (
                <tr key={row.role}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>{ROLE_LABELS[row.role] || row.role}</span>
                  </td>
                  <td style={tdStyle}>
                    {sessionEditing === `${row.role}-idle` ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="number"
                          defaultValue={row.idle_timeout_minutes}
                          min={5}
                          max={480}
                          style={{ ...inputStyle, width: 70 }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateSessionPolicy(row.role, 'idle_timeout_minutes', parseInt((e.target as HTMLInputElement).value) || 60);
                            }
                          }}
                          autoFocus
                        />
                        <span style={{ fontSize: 12, color: TEXT_MUTED }}>min</span>
                        <button onClick={() => setSessionEditing(null)} style={{ fontSize: 11, color: TEXT_MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSessionEditing(`${row.role}-idle`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: NAVY, fontSize: 13 }}
                      >
                        {row.idle_timeout_minutes} min
                      </button>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {sessionEditing === `${row.role}-abs` ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="number"
                          defaultValue={row.absolute_timeout_hours}
                          min={1}
                          max={168}
                          style={{ ...inputStyle, width: 70 }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateSessionPolicy(row.role, 'absolute_timeout_hours', parseInt((e.target as HTMLInputElement).value) || 24);
                            }
                          }}
                          autoFocus
                        />
                        <span style={{ fontSize: 12, color: TEXT_MUTED }}>hrs</span>
                        <button onClick={() => setSessionEditing(null)} style={{ fontSize: 11, color: TEXT_MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSessionEditing(`${row.role}-abs`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: NAVY, fontSize: 13 }}
                      >
                        {row.absolute_timeout_hours} hrs
                      </button>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {sessionEditing === `${row.role}-admin` ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="number"
                          defaultValue={row.admin_timeout_minutes}
                          min={5}
                          max={120}
                          style={{ ...inputStyle, width: 70 }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateSessionPolicy(row.role, 'admin_timeout_minutes', parseInt((e.target as HTMLInputElement).value) || 30);
                            }
                          }}
                          autoFocus
                        />
                        <span style={{ fontSize: 12, color: TEXT_MUTED }}>min</span>
                        <button onClick={() => setSessionEditing(null)} style={{ fontSize: 11, color: TEXT_MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSessionEditing(`${row.role}-admin`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: NAVY, fontSize: 13 }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
              </span>
              {sessions.length > 0 && (
                <button onClick={revokeAllSessions} style={btnStyle('#FEF2F2', RED)}>
                  Revoke All
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>
                No active sessions
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>IP Address</th>
                    <th style={thStyle}>Browser</th>
                    <th style={thStyle}>Last Active</th>
                    <th style={thStyle}>Expires</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{s.user_name}</div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED }}>{s.user_email}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.ip_address || '—'}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: TEXT_SEC }}>{parseBrowser(s.user_agent)}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: TEXT_SEC }}>{relativeTime(s.last_active_at)}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: TEXT_SEC }}>
                          {new Date(s.expires_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button
                          onClick={() => revokeSession(s.id)}
                          disabled={revoking === s.id}
                          style={btnStyle('#FEF2F2', RED)}
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
