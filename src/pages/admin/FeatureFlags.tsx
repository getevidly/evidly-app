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

const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  live:       { label: 'Live',     bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  scheduled:  { label: 'Scheduled', bg: 'bg-amber-50', fg: 'text-amber-600' },
  criteria:   { label: 'Criteria',  bg: 'bg-blue-50', fg: 'text-blue-600' },
  off:        { label: 'Off',      bg: 'bg-red-50', fg: 'text-red-600' },
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
  <div className="bg-gray-200 rounded-md animate-pulse" style={{ width: w, height: h }} />
);

const SECTION_BADGE_CLASSES: Record<string, { bg: string; fg: string }> = {
  Core:         { bg: 'bg-gray-100', fg: 'text-gray-700' },
  Compliance:   { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  Intelligence: { bg: 'bg-blue-50', fg: 'text-blue-600' },
  Growth:       { bg: 'bg-amber-50', fg: 'text-amber-600' },
  Admin:        { bg: 'bg-red-50', fg: 'text-red-600' },
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
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2.5 bg-navy text-white rounded-lg text-sm font-medium hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] min-h-[44px]">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Feature Control' }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Domain Security & Feature Control</h1>
        <p className="mt-1 text-sm text-gray-400">
          Toggle features, set go-live criteria, customize end-user messages
        </p>
      </div>

      {/* ── KPIs ── */}
      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i}><Skeleton h={80} /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          <KpiTile label="Total Features" value={flags.length} valueColor="navy" />
          <KpiTile label="Live" value={live} valueColor="green" />
          <KpiTile label="Scheduled" value={scheduled} valueColor="warning" />
          <KpiTile label="Criteria-gated" value={criteriaGated} valueColor="navy" />
          <KpiTile label="Off" value={off} valueColor="red" />
        </div>
      )}

      {/* ── Section tabs ── */}
      <div className="flex gap-1.5 flex-wrap">
        {SECTION_TABS.map(t => (
          <button key={t} onClick={() => setSectionTab(t)}
            className={`py-1 px-3 rounded-full border-none text-[11px] font-semibold cursor-pointer transition-all duration-[120ms] ${
              sectionTab === t
                ? 'bg-navy text-white'
                : 'bg-gray-100 text-gray-400'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Feature cards ── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={60} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-[60px] px-5 bg-[#FAF7F2] border-2 border-dashed border-[#E2D9C8] rounded-xl">
          <div className="text-[40px] mb-4">{'🔧'}</div>
          <div className="text-base font-bold text-navy">No features in this section</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(flag => {
            const f = getEdited(flag);
            const expanded = expandedKey === f.key;
            const status = getStatus(flag); // use raw flag for status
            const ss = STATUS_STYLE[status];
            const hasEdits = !!edits[f.key];
            const sbc = SECTION_BADGE_CLASSES[f.section ?? 'Core'] ?? SECTION_BADGE_CLASSES.Core;

            return (
              <div key={f.key} className={`bg-white border rounded-[10px] transition-[border-color] duration-150 ${
                expanded ? 'border-gold' : 'border-[#E2D9C8]'
              }`}>
                {/* ── Collapsed header ── */}
                <div
                  className="flex items-center gap-3 py-3.5 px-[18px] cursor-pointer"
                  onClick={() => setExpandedKey(expanded ? null : f.key)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-navy">{f.name}</span>
                      <span className={`text-[9px] font-bold py-0.5 px-2 rounded-[10px] uppercase ${sbc.bg} ${sbc.fg}`}>{f.section ?? 'Core'}</span>
                    </div>
                    {f.route && (
                      <div className="text-[11px] text-gray-400 font-['DM_Mono',monospace] mt-0.5">{f.route}</div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold py-0.5 px-2.5 rounded-[10px] ${ss.bg} ${ss.fg}`}>
                    {ss.label}
                  </span>
                  {/* Toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleFlag(flag); }}
                    className={`w-10 h-[22px] rounded-[11px] border-none relative cursor-pointer transition-colors duration-200 shrink-0 ${
                      flag.is_enabled ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-[3px] transition-[left] duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.15)] ${
                      flag.is_enabled ? 'left-[21px]' : 'left-[3px]'
                    }`} />
                  </button>
                  <span className={`text-base text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                    {'▾'}
                  </span>
                </div>

                {/* ── Expanded config ── */}
                {expanded && (
                  <div className="px-[18px] pb-[18px] border-t border-[#E2D9C8]">
                    {/* Row 1 — Trigger type */}
                    <div className="mt-3.5">
                      <label className="text-[11px] font-bold text-[#6B7F96] uppercase tracking-[0.05em]">Trigger Type</label>
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {TRIGGER_TYPES.map(tt => (
                          <button key={tt.key}
                            onClick={() => updateEdit(f.key, { trigger_type: tt.key })}
                            className={`py-1 px-3 rounded-full border-none text-[11px] font-semibold cursor-pointer transition-all duration-[120ms] ${
                              f.trigger_type === tt.key
                                ? 'bg-navy text-white'
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                            {tt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row 2 — Dynamic config */}
                    <div className="mt-3.5">
                      {f.trigger_type === 'fixed_date' && (
                        <div className="grid grid-cols-4 gap-2.5">
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Go-live date</label>
                            <input type="date" className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs"
                              value={f.date_config?.go_live?.split('T')[0] ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, go_live: e.target.value } })} />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Time</label>
                            <input type="time" className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs"
                              value={f.date_config?.go_live_time ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, go_live_time: e.target.value } })} />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Timezone</label>
                            <select className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer"
                              value={f.date_config?.timezone ?? 'PT'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, timezone: e.target.value } })}>
                              <option value="PT">Pacific (PT)</option>
                              <option value="ET">Eastern (ET)</option>
                              <option value="UTC">UTC</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Early access</label>
                            <select className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer"
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
                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Delay</label>
                            <input type="number" min={0} className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs"
                              value={f.date_config?.days ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, days: Number(e.target.value) } })} />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Unit</label>
                            <select className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer"
                              value={f.date_config?.unit ?? 'days'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, unit: e.target.value } })}>
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                              <option value="months">Months</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Scope</label>
                            <select className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer"
                              value={f.date_config?.scope ?? 'per_user'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, scope: e.target.value } })}>
                              <option value="per_user">Per user</option>
                              <option value="per_org">Per org</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {f.trigger_type === 'rolling_window' && (
                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Active for N days</label>
                            <input type="number" min={1} className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs"
                              value={f.date_config?.active_days ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, active_days: Number(e.target.value) } })} />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">In last Y days</label>
                            <input type="number" min={1} className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs"
                              value={f.date_config?.window_days ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, window_days: Number(e.target.value) } })} />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Action type</label>
                            <select className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer"
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
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Trigger event</label>
                            <select className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer"
                              value={f.date_config?.trigger_event ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, trigger_event: e.target.value } })}>
                              <option value="">Select event...</option>
                              {EVENT_OPTIONS.map(ev => (
                                <option key={ev} value={ev}>{ev.replace(/_/g, ' ')}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Delay (days)</label>
                            <input type="number" min={0} className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs"
                              value={f.date_config?.delay_days ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, delay_days: Number(e.target.value) } })} />
                          </div>
                        </div>
                      )}

                      {f.trigger_type === 'time_window' && (
                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Start date</label>
                            <input type="date" className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs"
                              value={f.date_config?.start?.split('T')[0] ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, start: e.target.value } })} />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">End date</label>
                            <input type="date" className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs"
                              value={f.date_config?.end?.split('T')[0] ?? ''}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, end: e.target.value } })} />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">After end</label>
                            <select className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer"
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
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Unlock on</label>
                            <select className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer"
                              value={f.date_config?.unlock_on ?? 'next_renewal'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, unlock_on: e.target.value } })}>
                              <option value="next_renewal">Next renewal</option>
                              <option value="upgrade_standard">Upgrade to Standard</option>
                              <option value="upgrade_enterprise">Upgrade to Enterprise</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-[#6B7F96] font-semibold">Prorate immediately</label>
                            <select className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer"
                              value={f.date_config?.prorate ? 'yes' : 'no'}
                              onChange={e => updateEdit(f.key, { date_config: { ...f.date_config, prorate: e.target.value === 'yes' } })}>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {f.trigger_type === 'criteria' && (
                        <div className="mt-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[11px] text-[#6B7F96]">Match</span>
                            {(['all', 'any'] as const).map(logic => (
                              <button key={logic}
                                onClick={() => updateEdit(f.key, { criteria_logic: logic })}
                                className={`py-1 px-3 rounded-full border-none text-[11px] font-semibold cursor-pointer transition-all duration-[120ms] ${
                                  f.criteria_logic === logic
                                    ? 'bg-navy text-white'
                                    : 'bg-gray-100 text-gray-400'
                                }`}>
                                {logic === 'all' ? 'ALL of' : 'ANY of'}
                              </button>
                            ))}
                          </div>
                          {(f.criteria ?? []).map((c: any, idx: number) => (
                            <div key={idx} className="flex gap-1.5 items-center mb-1.5">
                              <select className="py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer w-auto"
                                value={c.category ?? 'Data'}
                                onChange={e => updateCriterion(f.key, idx, { category: e.target.value })}>
                                {CRITERIA_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                              <input className="py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs w-[120px]" placeholder="Type"
                                value={c.type ?? ''} onChange={e => updateCriterion(f.key, idx, { type: e.target.value })} />
                              <select className="py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer w-auto"
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
                              <input className="py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs w-[100px]" placeholder="Value"
                                value={c.value ?? ''} onChange={e => updateCriterion(f.key, idx, { value: e.target.value })} />
                              <button onClick={() => removeCriterion(f.key, idx)}
                                className="bg-transparent border-none text-red-600 cursor-pointer text-sm font-bold">
                                {'×'}
                              </button>
                            </div>
                          ))}
                          <button onClick={() => addCriterion(f.key)}
                            className="text-[11px] text-gold font-semibold bg-transparent border-none cursor-pointer mt-0.5">
                            + Add criteria
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Row 3 — Visibility */}
                    <div className="mt-4">
                      <label className="text-[11px] font-bold text-[#6B7F96] uppercase tracking-[0.05em]">Visibility</label>
                      <div className="grid grid-cols-2 gap-2.5 mt-1.5">
                        <div>
                          <label className="text-[10px] text-[#6B7F96] font-semibold">Visible to</label>
                          <select className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer"
                            value={f.visible_to}
                            onChange={e => updateEdit(f.key, { visible_to: e.target.value })}>
                            <option value="all">All users</option>
                            <option value="admin_only">Admins only</option>
                            <option value="role_filtered">Role-filtered</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#6B7F96] font-semibold">Plan tier restriction</label>
                          <select className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer"
                            value={(f.plan_tiers ?? [])[0] ?? 'none'}
                            onChange={e => updateEdit(f.key, { plan_tiers: e.target.value === 'none' ? null : [e.target.value] })}>
                            <option value="none">None (all plans)</option>
                            {PLAN_TIERS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}+</option>)}
                          </select>
                        </div>
                      </div>
                      {f.visible_to === 'role_filtered' && (
                        <div className="mt-2">
                          <label className="text-[10px] text-[#6B7F96] font-semibold">Allowed roles</label>
                          <div className="flex gap-2 flex-wrap mt-1">
                            {ROLES.map(role => {
                              const checked = (f.allowed_roles ?? []).includes(role);
                              return (
                                <label key={role} className={`text-[11px] flex items-center gap-1 cursor-pointer ${checked ? 'text-navy' : 'text-gray-400'}`}>
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
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#6B7F96] uppercase tracking-[0.05em]">Disabled Message</label>
                        <button
                          onClick={() => aiSuggest(flag)}
                          disabled={aiLoading === f.key}
                          className={`text-[10px] font-bold py-[3px] px-2.5 rounded-[5px] text-white border-none ${
                            aiLoading === f.key
                              ? 'bg-gray-200 cursor-not-allowed'
                              : 'bg-gradient-to-br from-gold to-gold-light cursor-pointer'
                          }`}>
                          {aiLoading === f.key ? 'Generating...' : '✦ AI Suggest'}
                        </button>
                      </div>
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1">
                          <input
                            className="flex-1 py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs"
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
                          className="w-full py-1.5 px-2.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs min-h-[60px] resize-y font-[inherit]"
                          placeholder="Message body (shown to operators when feature is unavailable)"
                          value={f.disabled_message ?? ''}
                          onChange={e => updateEdit(f.key, { disabled_message: e.target.value })}
                        />
                        <div className="text-[10px] text-gray-400 text-right">
                          {(f.disabled_message ?? '').length} chars
                        </div>
                      </div>
                    </div>

                    {/* Row 5 — Audit trail stub */}
                    <div className="mt-3 text-[11px] text-gray-400">
                      Last updated: {flag.updated_at ? new Date(flag.updated_at).toLocaleString() : 'never'}
                    </div>

                    {/* Save button */}
                    <div className="mt-3.5 flex justify-end gap-2">
                      {hasEdits && (
                        <button
                          onClick={() => setEdits(prev => { const next = { ...prev }; delete next[f.key]; return next; })}
                          className="py-1.5 px-4 text-[11px] font-semibold bg-transparent border border-[#E2D9C8] rounded-md text-gray-400 cursor-pointer">
                          Discard
                        </button>
                      )}
                      <button
                        onClick={() => saveFlag(flag)}
                        disabled={!hasEdits || saving === f.key}
                        className={`py-1.5 px-4 text-[11px] font-bold border-none rounded-md ${
                          hasEdits
                            ? 'bg-navy text-white cursor-pointer'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}>
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
