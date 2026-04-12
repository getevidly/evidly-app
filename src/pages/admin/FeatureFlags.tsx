/**
 * FeatureFlags — Domain security & feature control
 *
 * Route: /admin/feature-flags
 * Access: platform_admin only (AdminShell)
 *
 * Toggle features, set go-live criteria, customize end-user messages,
 * AI-assisted disabled-message generation.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import { AIAssistButton } from '../../components/ui/AIAssistButton';
import { usePageTitle } from '../../hooks/usePageTitle';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

// ── Types ──────────────────────────────────────────────────────────

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  route: string | null;
  section: string | null;
  is_enabled: boolean;
  trigger_type: string;
  date_config: any;
  criteria: any[];
  criteria_logic: string;
  visible_to: string;
  allowed_roles: string[] | null;
  plan_tiers: string[] | null;
  disabled_message: string | null;
  disabled_message_title: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface AuditEntry {
  id: string;
  flag_key: string;
  change_type: string;
  changed_at: string;
}

// ── Constants ──────────────────────────────────────────────────────

const TRIGGER_TYPES = [
  { key: 'always_on', label: 'Always on' },
  { key: 'fixed_date', label: 'Fixed date' },
  { key: 'relative_date', label: 'Relative date' },
  { key: 'rolling_window', label: 'Rolling window' },
  { key: 'event_delay', label: 'Event + delay' },
  { key: 'time_window', label: 'Time window' },
  { key: 'fiscal_renewal', label: 'Fiscal/renewal' },
  { key: 'criteria', label: 'Criteria' },
] as const;

const SECTION_TABS = ['All', 'Core', 'Compliance', 'Intelligence', 'Growth', 'Admin'] as const;

const ROLES = [
  'owner_operator', 'executive', 'compliance_manager', 'chef',
  'facilities_manager', 'kitchen_manager', 'kitchen_staff',
];

const PLAN_TIERS = ['trial', 'founder', 'professional', 'enterprise'];

const CRITERIA_CATEGORIES = ['Date', 'Data', 'Action', 'Plan/Role', 'Risk Signal'];

const EVENT_OPTIONS = [
  'first_login', 'first_doc_upload', 'first_inspection',
  'guided_tour_complete', 'irr_complete',
];

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  live:       { label: 'Live',     bg: '#ECFDF5', color: '#059669' },
  scheduled:  { label: 'Scheduled', bg: '#FFFBEB', color: '#D97706' },
  criteria:   { label: 'Criteria',  bg: '#EFF6FF', color: '#2563EB' },
  off:        { label: 'Off',      bg: '#FEF2F2', color: '#DC2626' },
};

function getStatus(f: FeatureFlag): string {
  if (!f.is_enabled) {
    if (f.trigger_type === 'criteria') return 'criteria';
    if (f.trigger_type === 'fixed_date' || f.trigger_type === 'time_window') return 'scheduled';
    return 'off';
  }
  return 'live';
}

// ── Helpers ────────────────────────────────────────────────────────

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', background: '#F9FAFB', border: '1px solid #D1D5DB',
  borderRadius: 6, color: NAVY, fontSize: 12, width: '100%', boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer',
};

const pillBtn = (active: boolean): React.CSSProperties => ({
  padding: '4px 12px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 600,
  cursor: 'pointer', transition: 'all 0.12s',
  background: active ? NAVY : '#F3F4F6', color: active ? '#fff' : TEXT_MUTED,
});

const sectionBadge = (section: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; color: string }> = {
    Core:         { bg: '#F3F4F6', color: '#374151' },
    Compliance:   { bg: '#ECFDF5', color: '#059669' },
    Intelligence: { bg: '#EFF6FF', color: '#2563EB' },
    Growth:       { bg: '#FFFBEB', color: '#D97706' },
    Admin:        { bg: '#FEF2F2', color: '#DC2626' },
  };
  const c = colors[section] ?? colors.Core;
  return {
    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
    background: c.bg, color: c.color, textTransform: 'uppercase' as const,
  };
};

// ── Component ──────────────────────────────────────────────────────

export default function FeatureFlags() {
  useDemoGuard();
  const { user } = useAuth();
  usePageTitle('Admin | Feature Flags');

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionTab, setSectionTab] = useState<string>('All');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  // Local edits per flag (keyed by flag key)
  const [edits, setEdits] = useState<Record<string, Partial<FeatureFlag>>>({});

  const loadFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from('feature_flags')
      .select('*')
      .order('sort_order', { ascending: true });
    if (fetchErr) {
      setError(fetchErr.message || 'Failed to load data');
    } else if (data) {
      setFlags(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadFlags(); }, [loadFlags]);

  // ── Derived ──

  const getEdited = (f: FeatureFlag): FeatureFlag => ({ ...f, ...edits[f.key] });

  const filtered = flags.filter(f =>
    sectionTab === 'All' || f.section === sectionTab
  );

  const live = flags.filter(f => f.is_enabled).length;
  const scheduled = flags.filter(f => ['fixed_date', 'time_window', 'relative_date'].includes(f.trigger_type) && !f.is_enabled).length;
  const criteriaGated = flags.filter(f => f.trigger_type === 'criteria' && !f.is_enabled).length;
  const off = flags.filter(f => !f.is_enabled && f.trigger_type === 'always_on').length;

  // ── Actions ──

  const updateEdit = (key: string, patch: Partial<FeatureFlag>) => {
    setEdits(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const toggleFlag = async (f: FeatureFlag) => {
    const newVal = !f.is_enabled;
    // Optimistic
    setFlags(prev => prev.map(p => p.key === f.key ? { ...p, is_enabled: newVal } : p));

    const { error: err } = await supabase
      .from('feature_flags')
      .update({ is_enabled: newVal, updated_at: new Date().toISOString() })
      .eq('id', f.id);

    if (err) {
      // Revert
      setFlags(prev => prev.map(p => p.key === f.key ? { ...p, is_enabled: !newVal } : p));
      alert('Failed to toggle: ' + err.message);
      return;
    }

    // Audit log
    await supabase.from('feature_flag_audit').insert({
      flag_key: f.key,
      changed_by: user?.id,
      change_type: newVal ? 'enabled' : 'disabled',
      old_value: { is_enabled: !newVal },
      new_value: { is_enabled: newVal },
    });
  };

  const saveFlag = async (f: FeatureFlag) => {
    const edit = edits[f.key];
    if (!edit) return;

    setSaving(f.key);
    const payload: any = { ...edit, updated_at: new Date().toISOString() };

    const { error: err } = await supabase
      .from('feature_flags')
      .update(payload)
      .eq('id', f.id);

    if (err) {
      alert('Failed to save: ' + err.message);
    } else {
      // Audit
      await supabase.from('feature_flag_audit').insert({
        flag_key: f.key,
        changed_by: user?.id,
        change_type: 'updated',
        old_value: { trigger_type: f.trigger_type, date_config: f.date_config },
        new_value: payload,
      });

      setFlags(prev => prev.map(p => p.key === f.key ? { ...p, ...edit } : p));
      setEdits(prev => { const next = { ...prev }; delete next[f.key]; return next; });
    }
    setSaving(null);
  };

  const aiSuggest = async (f: FeatureFlag) => {
    setAiLoading(f.key);
    try {
      const edited = getEdited(f);
      const { data, error: fnErr } = await supabase.functions.invoke('ai-flag-suggest', {
        body: {
          flag_name: edited.name,
          trigger_type: edited.trigger_type,
          date_config: edited.date_config,
          criteria: edited.criteria,
        },
      });
      if (fnErr) throw fnErr;
      if (data?.title || data?.message) {
        updateEdit(f.key, {
          disabled_message_title: data.title || edited.disabled_message_title,
          disabled_message: data.message || edited.disabled_message,
        });
      }
    } catch (err: any) {
      alert('AI suggestion failed: ' + (err?.message || 'Unknown error'));
    }
    setAiLoading(null);
  };

  // ── Criteria builder helpers ──

  const addCriterion = (key: string) => {
    const current = edits[key]?.criteria ?? flags.find(f => f.key === key)?.criteria ?? [];
    updateEdit(key, { criteria: [...current, { category: 'Data', type: '', operator: '=', value: '', label: '' }] });
  };

  const updateCriterion = (key: string, idx: number, patch: any) => {
    const current = [...(edits[key]?.criteria ?? flags.find(f => f.key === key)?.criteria ?? [])];
    current[idx] = { ...current[idx], ...patch };
    updateEdit(key, { criteria: current });
  };

  const removeCriterion = (key: string, idx: number) => {
    const current = [...(edits[key]?.criteria ?? flags.find(f => f.key === key)?.criteria ?? [])];
    current.splice(idx, 1);
    updateEdit(key, { criteria: current });
  };

  // ── Render ──

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Failed to load data</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2.5 bg-[#1E2D4D] text-white rounded-lg text-sm font-medium hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] min-h-[44px]">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Feature Control' }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Domain Security & Feature Control</h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>
          Toggle features, set go-live criteria, customize end-user messages
        </p>
      </div>

      {/* ── KPIs ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i}><Skeleton h={80} /></div>)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <KpiTile label="Total Features" value={flags.length} valueColor="navy" />
          <KpiTile label="Live" value={live} valueColor="green" />
          <KpiTile label="Scheduled" value={scheduled} valueColor="warning" />
          <KpiTile label="Criteria-gated" value={criteriaGated} valueColor="navy" />
          <KpiTile label="Off" value={off} valueColor="red" />
        </div>
      )}

      {/* ── Section tabs ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SECTION_TABS.map(t => (
          <button key={t} onClick={() => setSectionTab(t)} style={pillBtn(sectionTab === t)}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Feature cards ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={60} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FAF7F2', border: '2px dashed #E2D9C8', borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>{'🔧'}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>No features in this section</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(flag => {
            const f = getEdited(flag);
            const expanded = expandedKey === f.key;
            const status = getStatus(flag); // use raw flag for status
            const ss = STATUS_STYLE[status];
            const hasEdits = !!edits[f.key];

            return (
              <div key={f.key} style={{
                background: '#fff', border: `1px solid ${expanded ? GOLD : BORDER}`,
                borderRadius: 10, transition: 'border-color 0.15s',
              }}>
                {/* ── Collapsed header ── */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedKey(expanded ? null : f.key)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{f.name}</span>
                      <span style={sectionBadge(f.section ?? 'Core')}>{f.section ?? 'Core'}</span>
                    </div>
                    {f.route && (
                      <div style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{f.route}</div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 10,
                    background: ss.bg, color: ss.color,
                  }}>
                    {ss.label}
                  </span>
                  {/* Toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleFlag(flag); }}
                    style={{
                      width: 40, height: 22, borderRadius: 11, border: 'none',
                      background: flag.is_enabled ? '#059669' : '#D1D5DB',
                      position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3,
                      left: flag.is_enabled ? 21 : 3,
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }} />
                  </button>
                  <span style={{ fontSize: 16, color: TEXT_MUTED, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    {'▾'}
                  </span>
                </div>

                {/* ── Expanded config ── */}
                {expanded && (
                  <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${BORDER}` }}>
                    {/* Row 1 — Trigger type */}
                    <div style={{ marginTop: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trigger Type</label>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                        {TRIGGER_TYPES.map(tt => (
                          <button key={tt.key}
                            onClick={() => updateEdit(f.key, { trigger_type: tt.key })}
                            style={pillBtn(f.trigger_type === tt.key)}>
                            {tt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row 2 — Dynamic config */}
                    <div style={{ marginTop: 14 }}>
                      {f.trigger_type === 'fixed_date' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Go-live date</label>
                            <input type="date" style={inputStyle}
                              value={f.date_config?.go_live?.split('T')[0] ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, go_live: e.target.value } })} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Time</label>
                            <input type="time" style={inputStyle}
                              value={f.date_config?.go_live_time ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, go_live_time: e.target.value } })} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Timezone</label>
                            <select style={selectStyle}
                              value={f.date_config?.timezone ?? 'PT'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, timezone: e.target.value } })}>
                              <option value="PT">Pacific (PT)</option>
                              <option value="ET">Eastern (ET)</option>
                              <option value="UTC">UTC</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Early access</label>
                            <select style={selectStyle}
                              value={f.date_config?.early_access ?? 'none'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, early_access: e.target.value } })}>
                              <option value="none">None</option>
                              <option value="founder_only">Founder only</option>
                              <option value="enterprise_only">Enterprise only</option>
                              <option value="admin_preview">Admin preview</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {f.trigger_type === 'relative_date' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Delay</label>
                            <input type="number" min={0} style={inputStyle}
                              value={f.date_config?.days ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, days: Number(e.target.value) } })} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Unit</label>
                            <select style={selectStyle}
                              value={f.date_config?.unit ?? 'days'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, unit: e.target.value } })}>
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                              <option value="months">Months</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Scope</label>
                            <select style={selectStyle}
                              value={f.date_config?.scope ?? 'per_user'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, scope: e.target.value } })}>
                              <option value="per_user">Per user</option>
                              <option value="per_org">Per org</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {f.trigger_type === 'rolling_window' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Active for N days</label>
                            <input type="number" min={1} style={inputStyle}
                              value={f.date_config?.active_days ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, active_days: Number(e.target.value) } })} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>In last Y days</label>
                            <input type="number" min={1} style={inputStyle}
                              value={f.date_config?.window_days ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, window_days: Number(e.target.value) } })} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Action type</label>
                            <select style={selectStyle}
                              value={f.date_config?.action_type ?? 'any_login'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, action_type: e.target.value } })}>
                              <option value="any_login">Any login</option>
                              <option value="log_entry">Log entry</option>
                              <option value="checklist_completed">Checklist completed</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {f.trigger_type === 'event_delay' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Trigger event</label>
                            <select style={selectStyle}
                              value={f.date_config?.trigger_event ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, trigger_event: e.target.value } })}>
                              <option value="">Select event...</option>
                              {EVENT_OPTIONS.map(ev => (
                                <option key={ev} value={ev}>{ev.replace(/_/g, ' ')}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Delay (days)</label>
                            <input type="number" min={0} style={inputStyle}
                              value={f.date_config?.delay_days ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, delay_days: Number(e.target.value) } })} />
                          </div>
                        </div>
                      )}

                      {f.trigger_type === 'time_window' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Start date</label>
                            <input type="date" style={inputStyle}
                              value={f.date_config?.start?.split('T')[0] ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, start: e.target.value } })} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>End date</label>
                            <input type="date" style={inputStyle}
                              value={f.date_config?.end?.split('T')[0] ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, end: e.target.value } })} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>After end</label>
                            <select style={selectStyle}
                              value={f.date_config?.after_end ?? 'off'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, after_end: e.target.value } })}>
                              <option value="off">Turn off</option>
                              <option value="on">Stays on</option>
                              <option value="custom_message">Show different message</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {f.trigger_type === 'fiscal_renewal' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Unlock on</label>
                            <select style={selectStyle}
                              value={f.date_config?.unlock_on ?? 'next_renewal'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, unlock_on: e.target.value } })}>
                              <option value="next_renewal">Next renewal</option>
                              <option value="upgrade_standard">Upgrade to Standard</option>
                              <option value="upgrade_enterprise">Upgrade to Enterprise</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Prorate immediately</label>
                            <select style={selectStyle}
                              value={f.date_config?.prorate ? 'yes' : 'no'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, prorate: e.target.value === 'yes' } })}>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {f.trigger_type === 'criteria' && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: TEXT_SEC }}>Match</span>
                            {(['all', 'any'] as const).map(logic => (
                              <button key={logic}
                                onClick={() => updateEdit(f.key, { criteria_logic: logic })}
                                style={pillBtn(f.criteria_logic === logic)}>
                                {logic === 'all' ? 'ALL of' : 'ANY of'}
                              </button>
                            ))}
                          </div>
                          {(f.criteria ?? []).map((c: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                              <select style={{ ...selectStyle, width: 'auto' }}
                                value={c.category ?? 'Data'}
                                onChange={e => updateCriterion(f.key, idx, { category: e.target.value })}>
                                {CRITERIA_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                              <input style={{ ...inputStyle, width: 120 }} placeholder="Type"
                                value={c.type ?? ''} onChange={e => updateCriterion(f.key, idx, { type: e.target.value })} />
                              <select style={{ ...selectStyle, width: 'auto' }}
                                value={c.operator ?? '='}
                                onChange={e => updateCriterion(f.key, idx, { operator: e.target.value })}>
                                <option value="=">=</option>
                                <option value="!=">!=</option>
                                <option value=">">&gt;</option>
                                <option value="<">&lt;</option>
                                <option value=">=">&gt;=</option>
                                <option value="<=">&lt;=</option>
                                <option value="contains">contains</option>
                              </select>
                              <input style={{ ...inputStyle, width: 100 }} placeholder="Value"
                                value={c.value ?? ''} onChange={e => updateCriterion(f.key, idx, { value: e.target.value })} />
                              <button onClick={() => removeCriterion(f.key, idx)}
                                style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                                {'×'}
                              </button>
                            </div>
                          ))}
                          <button onClick={() => addCriterion(f.key)}
                            style={{ fontSize: 11, color: GOLD, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}>
                            + Add criteria
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Row 3 — Visibility */}
                    <div style={{ marginTop: 16 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visibility</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                        <div>
                          <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Visible to</label>
                          <select style={selectStyle}
                            value={f.visible_to}
                            onChange={e => updateEdit(f.key, { visible_to: e.target.value })}>
                            <option value="all">All users</option>
                            <option value="admin_only">Admins only</option>
                            <option value="role_filtered">Role-filtered</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Plan tier restriction</label>
                          <select style={selectStyle}
                            value={(f.plan_tiers ?? [])[0] ?? 'none'}
                            onChange={e => updateEdit(f.key, { plan_tiers: e.target.value === 'none' ? null : [e.target.value] })}>
                            <option value="none">None (all plans)</option>
                            {PLAN_TIERS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}+</option>)}
                          </select>
                        </div>
                      </div>
                      {f.visible_to === 'role_filtered' && (
                        <div style={{ marginTop: 8 }}>
                          <label style={{ fontSize: 10, color: TEXT_SEC, fontWeight: 600 }}>Allowed roles</label>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                            {ROLES.map(role => {
                              const checked = (f.allowed_roles ?? []).includes(role);
                              return (
                                <label key={role} style={{ fontSize: 11, color: checked ? NAVY : TEXT_MUTED, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                  <input type="checkbox" checked={checked}
                                    onChange={() => {
                                      const current = [...(f.allowed_roles ?? [])];
                                      const next = checked ? current.filter(r => r !== role) : [...current, role];
                                      updateEdit(f.key, { allowed_roles: next });
                                    }} />
                                  {role.replace(/_/g, ' ')}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Row 4 — Disabled message */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Disabled Message</label>
                        <button
                          onClick={() => aiSuggest(flag)}
                          disabled={aiLoading === f.key}
                          style={{
                            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 5,
                            background: aiLoading === f.key ? '#E5E7EB' : 'linear-gradient(135deg, #A08C5A, #C4A961)',
                            color: '#fff', border: 'none', cursor: aiLoading === f.key ? 'not-allowed' : 'pointer',
                          }}>
                          {aiLoading === f.key ? 'Generating...' : '✦ AI Suggest'}
                        </button>
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            style={{ ...inputStyle, flex: 1 }}
                            placeholder="Title (shown as heading)"
                            value={f.disabled_message_title ?? ''}
                            onChange={e => updateEdit(f.key, { disabled_message_title: e.target.value })}
                          />
                          <AIAssistButton
                            fieldLabel="Disabled Feature Title"
                            context={{ featureName: f.name, triggerType: f.trigger_type, section: f.section }}
                            currentValue={f.disabled_message_title ?? ''}
                            onGenerated={(text) => updateEdit(f.key, { disabled_message_title: text })}
                          />
                        </div>
                        <textarea
                          style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
                          placeholder="Message body (shown to operators when feature is unavailable)"
                          value={f.disabled_message ?? ''}
                          onChange={e => updateEdit(f.key, { disabled_message: e.target.value })}
                        />
                        <div style={{ fontSize: 10, color: TEXT_MUTED, textAlign: 'right' }}>
                          {(f.disabled_message ?? '').length} chars
                        </div>
                      </div>
                    </div>

                    {/* Row 5 — Audit trail stub */}
                    <div style={{ marginTop: 12, fontSize: 11, color: TEXT_MUTED }}>
                      Last updated: {flag.updated_at ? new Date(flag.updated_at).toLocaleString() : 'never'}
                    </div>

                    {/* Save button */}
                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      {hasEdits && (
                        <button
                          onClick={() => setEdits(prev => { const next = { ...prev }; delete next[f.key]; return next; })}
                          style={{
                            padding: '6px 16px', fontSize: 11, fontWeight: 600,
                            background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6,
                            color: TEXT_MUTED, cursor: 'pointer',
                          }}>
                          Discard
                        </button>
                      )}
                      <button
                        onClick={() => saveFlag(flag)}
                        disabled={!hasEdits || saving === f.key}
                        style={{
                          padding: '6px 16px', fontSize: 11, fontWeight: 700,
                          background: hasEdits ? NAVY : '#E5E7EB',
                          color: hasEdits ? '#fff' : TEXT_MUTED,
                          border: 'none', borderRadius: 6,
                          cursor: hasEdits ? 'pointer' : 'not-allowed',
                        }}>
                        {saving === f.key ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
