/**
 * ChannelCadences — settings section for channel_cadences table.
 *
 * Renders a table of existing cadence rows with inline editing,
 * and a form to add new channels. No delete — deactivate via toggle.
 *
 * per_week rows get a "Schedule ▾" toggle that opens a weekly-target
 * drawer backed by channel_cadence_weeks.
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  EV_NAVY, EV_MUTED, EV_LINE, EV_PAPER, EV_LIGHT, EV_EMBER,
  EV_DANGER, EV_SUCCESS, EV_FAINT, DISPLAY, BODY,
} from './marketingTokens';
import { toast } from 'sonner';
import { mondayOf, SCHEDULE_WEEKS, targetForWeek } from '../../../lib/marketing/weeklyTarget';

interface CadenceRow {
  id: string;
  channel_key: string;
  label: string;
  source_value: string | null;
  stage: string;
  cadence_type: string;
  target_count: number | null;
  owner: string | null;
  is_active: boolean;
}

interface WeekOverrideRow {
  id: string;
  channel_id: string;
  week_start: string;
  target_count: number;
}

const STAGE_OPTIONS = [
  { value: 'live', label: 'Live' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'development', label: 'Development' },
];

const CADENCE_OPTIONS = [
  { value: 'per_weekday', label: 'Per weekday' },
  { value: 'per_week', label: 'Per week' },
  { value: 'none', label: 'Not set' },
];

const KNOWN_SOURCES = ['cold_call', 'in_person', 'show'];

function cadenceDisplay(cadenceType: string, targetCount: number | null): string {
  if (cadenceType === 'none' || !targetCount) return 'Not set';
  if (cadenceType === 'per_weekday') return `${targetCount} per weekday`;
  if (cadenceType === 'per_week') return `${targetCount} per week`;
  return 'Not set';
}

const INP = "w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none";
const inpStyle = { borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY };
const LBL = "block text-[10px] tracking-wider font-bold mb-1";

// ── Helpers for the week grid ──────────────────────────────────────────────
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtWeekLabel(isoMonday: string, todayMonday: string): string {
  const d = new Date(isoMonday + 'T12:00:00');
  const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (isoMonday === todayMonday) return `Week of ${label} · this week`;
  // Check if next week
  const nextMon = addDays(new Date(todayMonday + 'T12:00:00'), 7);
  const nextMonStr = nextMon.getFullYear() + '-' +
    String(nextMon.getMonth() + 1).padStart(2, '0') + '-' +
    String(nextMon.getDate()).padStart(2, '0');
  if (isoMonday === nextMonStr) return `Week of ${label} · next week`;
  return `Week of ${label}`;
}

/** Build array of Monday ISO strings for the next SCHEDULE_WEEKS weeks. */
function buildWeekStarts(today: Date): string[] {
  const mon = mondayOf(today);
  const base = new Date(mon + 'T12:00:00');
  const weeks: string[] = [];
  for (let i = 0; i < SCHEDULE_WEEKS; i++) {
    const d = addDays(base, i * 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    weeks.push(`${y}-${m}-${dd}`);
  }
  return weeks;
}

// ── Weekly Drawer ──────────────────────────────────────────────────────────
interface WeeklyDrawerProps {
  row: CadenceRow;
  baseline: number | null;
  onBaselineChange: (v: number | null) => void;
  onClose: () => void;
}

function WeeklyDrawer({ row, baseline, onBaselineChange, onClose }: WeeklyDrawerProps) {
  const todayMonday = mondayOf(new Date());
  const weekStarts = buildWeekStarts(new Date());

  // Local state: week_start → value (string for input, '' = cleared/baseline)
  const [cells, setCells] = useState<Record<string, string>>({});
  // Track which week_starts had existing DB rows (to know what to DELETE)
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing overrides on mount
  useEffect(() => {
    setLoadingOverrides(true);
    supabase
      .from('channel_cadence_weeks')
      .select('*')
      .eq('channel_id', row.id)
      .gte('week_start', todayMonday)
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load weekly overrides');
          setLoadingOverrides(false);
          return;
        }
        const loaded: Record<string, string> = {};
        const keys = new Set<string>();
        for (const r of (data as WeekOverrideRow[]) || []) {
          loaded[r.week_start] = String(r.target_count);
          keys.add(r.week_start);
        }
        setCells(loaded);
        setExistingKeys(keys);
        setLoadingOverrides(false);
      });
  }, [row.id, todayMonday]);

  const handleSave = async () => {
    setSaving(true);

    // Split into upserts vs deletes
    const toUpsert: { channel_id: string; week_start: string; target_count: number }[] = [];
    const toDelete: string[] = [];

    for (const ws of weekStarts) {
      const val = cells[ws]?.trim();
      if (val !== undefined && val !== '') {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 0) {
          toUpsert.push({ channel_id: row.id, week_start: ws, target_count: n });
        }
      } else if (existingKeys.has(ws)) {
        // User cleared a cell that had a DB row — delete it
        toDelete.push(ws);
      }
    }

    // Upsert
    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from('channel_cadence_weeks')
        .upsert(toUpsert, { onConflict: 'channel_id,week_start' });
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    // Delete cleared cells
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('channel_cadence_weeks')
        .delete()
        .eq('channel_id', row.id)
        .in('week_start', toDelete);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    toast.success('Schedule saved');
    setSaving(false);
    onClose();
  };

  return (
    <div className="px-6 py-4 space-y-4" style={{ backgroundColor: EV_LIGHT }}>
      {/* Baseline */}
      <div className="flex items-center gap-3">
        <label className="text-[12px] font-bold" style={{ color: EV_NAVY, fontFamily: BODY }}>
          Baseline Weekly Target
        </label>
        <input
          type="number"
          min={0}
          value={baseline ?? ''}
          onChange={e => onBaselineChange(e.target.value ? parseInt(e.target.value) : null)}
          className="w-20 py-1 px-2 text-[12px] border rounded-md outline-none"
          style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
        />
      </div>

      {/* Week grid */}
      {loadingOverrides ? (
        <div className="text-[12px] py-2" style={{ color: EV_MUTED }}>Loading...</div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(SCHEDULE_WEEKS, 4)}, 1fr)` }}>
          {weekStarts.map(ws => {
            const val = cells[ws] ?? '';
            const hasOverride = val !== '';
            return (
              <div key={ws} className="border rounded-lg p-3" style={{
                borderColor: hasOverride ? EV_EMBER : EV_LINE,
                backgroundColor: EV_PAPER,
              }}>
                <div className="text-[11px] font-semibold mb-2" style={{ color: EV_NAVY, fontFamily: BODY }}>
                  {fmtWeekLabel(ws, todayMonday)}
                </div>
                <input
                  type="number"
                  min={0}
                  value={val}
                  placeholder={baseline != null ? String(baseline) : '—'}
                  onChange={e => setCells(prev => ({ ...prev, [ws]: e.target.value }))}
                  className="w-full py-1.5 px-2 text-[13px] border rounded-md outline-none"
                  style={{
                    borderColor: EV_LINE,
                    color: hasOverride ? EV_NAVY : EV_MUTED,
                    fontFamily: BODY,
                  }}
                />
                {!hasOverride && baseline != null && (
                  <div className="text-[10px] mt-1" style={{ color: EV_MUTED }}>
                    baseline · {baseline}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 py-[7px] px-4 text-[13px] font-bold rounded-md border-none cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}
        >
          <Check size={12} /> {saving ? 'Saving...' : 'Save Schedule'}
        </button>
        <button
          onClick={onClose}
          className="py-[7px] px-4 text-[13px] font-semibold rounded-md border cursor-pointer"
          style={{ borderColor: EV_LINE, color: EV_MUTED, fontFamily: BODY }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ChannelCadences() {
  const [rows, setRows] = useState<CadenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotFound, setTableNotFound] = useState(false);

  // Inline editing state: maps row id → edited fields
  const [edits, setEdits] = useState<Record<string, Partial<CadenceRow>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Weekly drawer: which row id is open (null = none)
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);

  // This week's per-channel overrides, so the Target cell can read "N this week"
  const [thisMonday] = useState(() => mondayOf(new Date()));
  const [weekOverrides, setWeekOverrides] = useState<Record<string, number>>({});

  // Archive visibility
  const [showArchived, setShowArchived] = useState(false);

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formSourceMode, setFormSourceMode] = useState<'known' | 'other'>('known');
  const [formSourceKnown, setFormSourceKnown] = useState('');
  const [formSourceOther, setFormSourceOther] = useState('');
  const [formStage, setFormStage] = useState('development');
  const [formCadence, setFormCadence] = useState('none');
  const [formTarget, setFormTarget] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [addingSaving, setAddingSaving] = useState(false);

  const fetchRows = useCallback(async () => {
    const { data, error } = await supabase
      .from('channel_cadences')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        setTableNotFound(true);
      }
      setRows([]);
    } else {
      setRows((data as CadenceRow[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchWeekOverrides = useCallback(async () => {
    const { data, error } = await supabase
      .from('channel_cadence_weeks')
      .select('channel_id, target_count')
      .eq('week_start', thisMonday);
    if (error) { setWeekOverrides({}); return; }
    const map: Record<string, number> = {};
    for (const w of (data as { channel_id: string; target_count: number }[]) || []) {
      map[w.channel_id] = w.target_count;
    }
    setWeekOverrides(map);
  }, [thisMonday]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { fetchWeekOverrides(); }, [fetchWeekOverrides]);

  const getEdit = (id: string, field: keyof CadenceRow, original: unknown) => {
    return edits[id]?.[field] ?? original;
  };

  const setEdit = (id: string, field: keyof CadenceRow, value: unknown) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const hasEdits = (id: string) => {
    return edits[id] && Object.keys(edits[id]).length > 0;
  };

  const saveRow = async (row: CadenceRow) => {
    const patch = edits[row.id];
    if (!patch || Object.keys(patch).length === 0) return;
    setSavingId(row.id);
    const { error } = await supabase
      .from('channel_cadences')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    setEdits(prev => { const next = { ...prev }; delete next[row.id]; return next; });
    fetchRows();
  };

  const handleAdd = async () => {
    const key = formKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!key) { toast.error('Channel key is required'); return; }
    if (!formLabel.trim()) { toast.error('Label is required'); return; }

    const sourceValue = formSourceMode === 'other'
      ? (formSourceOther.trim() || null)
      : (formSourceKnown || null);

    setAddingSaving(true);
    const { error } = await supabase.from('channel_cadences').insert({
      channel_key: key,
      label: formLabel.trim(),
      source_value: sourceValue,
      stage: formStage,
      cadence_type: formCadence,
      target_count: formTarget ? parseInt(formTarget) || null : null,
      owner: formOwner.trim() || null,
    });
    setAddingSaving(false);

    if (error) {
      if (error.code === '23505') toast.error('A channel with that key already exists');
      else toast.error(error.message);
      return;
    }

    toast.success(`Added ${formLabel.trim()}`);
    setFormKey(''); setFormLabel(''); setFormSourceMode('known'); setFormSourceKnown('');
    setFormSourceOther(''); setFormStage('development'); setFormCadence('none');
    setFormTarget(''); setFormOwner(''); setShowForm(false);
    fetchRows();
  };

  const toggleActive = async (row: CadenceRow) => {
    const next = !row.is_active;
    const { error } = await supabase
      .from('channel_cadences')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next ? `${row.label} unarchived` : `${row.label} archived`);
    fetchRows();
  };

  const visibleRows = showArchived ? rows : rows.filter(r => r.is_active);
  const archivedCount = rows.filter(r => !r.is_active).length;

  if (loading) {
    return <div className="p-6 text-center text-[13px]" style={{ color: EV_MUTED }}>Loading...</div>;
  }

  if (tableNotFound) {
    return (
      <div className="border rounded-lg p-8 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="text-[13px]" style={{ color: EV_MUTED }}>No channels set.</div>
        <div className="text-[12px] mt-1" style={{ color: EV_MUTED }}>Cadence table not yet created.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleRows.length === 0 && !showForm ? (
        <div className="border rounded-lg p-8 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <div className="text-[13px]" style={{ color: EV_MUTED }}>No channels set.</div>
        </div>
      ) : visibleRows.length > 0 ? (
        <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: EV_LINE }}>
                  {['Channel', 'Source value', 'Stage', 'Cadence', 'Target', 'Owner', 'Active'].map(h => (
                    <th key={h} className="py-2 px-4 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(r => {
                  const effectiveCadence = (getEdit(r.id, 'cadence_type', r.cadence_type) as string);
                  const isPerWeek = effectiveCadence === 'per_week';
                  const isPerWeekday = effectiveCadence === 'per_weekday';
                  const drawerOpen = openDrawerId === r.id;
                  const baseline = getEdit(r.id, 'target_count', r.target_count) as number | null;
                  const thisWeekTarget = targetForWeek(
                    baseline,
                    r.id in weekOverrides ? { [thisMonday]: weekOverrides[r.id] } : {},
                    thisMonday,
                  );

                  return (
                    <>
                      <tr key={r.id} className="border-b last:border-b-0" style={{ borderColor: EV_LINE, opacity: r.is_active ? 1 : 0.45 }}>
                        <td className="py-2.5 px-4 text-[13px] font-semibold" style={{ color: EV_NAVY }}>{r.label}</td>
                        <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>{r.source_value || '\u2014'}</td>
                        <td className="py-2.5 px-4">
                          <select
                            value={getEdit(r.id, 'stage', r.stage) as string}
                            onChange={e => setEdit(r.id, 'stage', e.target.value)}
                            className="py-1 px-2 text-[12px] border rounded-md outline-none bg-white"
                            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
                          >
                            {STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4">
                          <select
                            value={effectiveCadence}
                            onChange={e => setEdit(r.id, 'cadence_type', e.target.value)}
                            className="py-1 px-2 text-[12px] border rounded-md outline-none bg-white"
                            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
                          >
                            {CADENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            {isPerWeek ? (
                              <>
                                {thisWeekTarget != null ? (
                                  <span className="text-[13px] font-semibold whitespace-nowrap" style={{ color: EV_NAVY, fontFamily: BODY }}>
                                    {thisWeekTarget}{' '}
                                    <span className="font-medium" style={{ color: EV_MUTED }}>this week</span>
                                  </span>
                                ) : (
                                  <span className="text-[13px]" style={{ color: EV_FAINT }}>{'—'}</span>
                                )}
                                <button
                                  onClick={() => setOpenDrawerId(drawerOpen ? null : r.id)}
                                  className="text-[12px] font-semibold border-none bg-transparent cursor-pointer whitespace-nowrap p-0"
                                  style={{ color: EV_EMBER, fontFamily: BODY }}
                                >
                                  Schedule {drawerOpen ? '▴' : '▾'}
                                </button>
                              </>
                            ) : isPerWeekday ? (
                              <>
                                <input
                                  type="number"
                                  min={0}
                                  value={baseline ?? ''}
                                  onChange={e => setEdit(r.id, 'target_count', e.target.value ? parseInt(e.target.value) : null)}
                                  className="w-16 py-1 px-2 text-[12px] border rounded-md outline-none text-center"
                                  style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
                                />
                                <span className="text-[12px] whitespace-nowrap" style={{ color: EV_MUTED, fontFamily: BODY }}>
                                  per weekday
                                </span>
                              </>
                            ) : (
                              <span className="text-[13px]" style={{ color: EV_FAINT }}>{'—'}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={(getEdit(r.id, 'owner', r.owner) as string | null) ?? ''}
                            onChange={e => setEdit(r.id, 'owner', e.target.value || null)}
                            className="w-24 py-1 px-2 text-[12px] border rounded-md outline-none"
                            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
                            placeholder="Owner"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={r.is_active}
                              onChange={() => toggleActive(r)}
                              title={r.is_active ? 'Archive' : 'Unarchive'}
                              aria-label={(r.is_active ? 'Archive ' : 'Unarchive ') + r.label}
                              className="w-4 h-4 cursor-pointer"
                              style={{ accentColor: EV_EMBER }}
                            />
                            {hasEdits(r.id) && (
                              <button
                                onClick={() => saveRow(r)}
                                disabled={savingId === r.id}
                                className="inline-flex items-center gap-1 py-1 px-2 text-[11px] font-bold rounded-md border-none cursor-pointer disabled:opacity-50"
                                style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}
                              >
                                <Check size={11} /> {savingId === r.id ? 'Saving' : 'Save'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isPerWeek && drawerOpen && (
                        <tr key={`${r.id}-drawer`}>
                          <td colSpan={7} className="p-0 border-b" style={{ borderColor: EV_LINE }}>
                            <WeeklyDrawer
                              row={r}
                              baseline={baseline}
                              onBaselineChange={v => setEdit(r.id, 'target_count', v)}
                              onClose={() => { setOpenDrawerId(null); fetchWeekOverrides(); }}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Show archived toggle */}
      {archivedCount > 0 && (
        <button
          onClick={() => setShowArchived(v => !v)}
          className="text-[12px] font-semibold border-none bg-transparent cursor-pointer"
          style={{ color: EV_MUTED, fontFamily: BODY }}
        >
          {showArchived ? 'Hide Archived' : `Show Archived (${archivedCount})`}
        </button>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <h4 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Add channel</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <label className={LBL} style={{ color: EV_MUTED }}>
                Channel key <span style={{ color: EV_DANGER }}>*</span>
              </label>
              <input type="text" value={formKey}
                onChange={e => setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                placeholder="e.g. cold_call" className={INP} style={inpStyle} />
            </div>
            <div>
              <label className={LBL} style={{ color: EV_MUTED }}>
                Label <span style={{ color: EV_DANGER }}>*</span>
              </label>
              <input type="text" value={formLabel}
                onChange={e => setFormLabel(e.target.value)}
                placeholder="e.g. Outbound Calls" className={INP} style={inpStyle} />
            </div>
            <div>
              <label className={LBL} style={{ color: EV_MUTED }}>Source value</label>
              <select
                value={formSourceMode === 'other' ? '__other__' : formSourceKnown}
                onChange={e => {
                  if (e.target.value === '__other__') {
                    setFormSourceMode('other');
                  } else {
                    setFormSourceMode('known');
                    setFormSourceKnown(e.target.value);
                  }
                }}
                className={`${INP} bg-white`} style={inpStyle}
              >
                <option value="">None</option>
                {KNOWN_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__other__">Other</option>
              </select>
              {formSourceMode === 'other' && (
                <input type="text" value={formSourceOther}
                  onChange={e => setFormSourceOther(e.target.value)}
                  placeholder="Custom source value" className={`${INP} mt-1`} style={inpStyle} />
              )}
            </div>
            <div>
              <label className={LBL} style={{ color: EV_MUTED }}>Stage</label>
              <select value={formStage} onChange={e => setFormStage(e.target.value)}
                className={`${INP} bg-white`} style={inpStyle}>
                {STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className={LBL} style={{ color: EV_MUTED }}>Cadence</label>
              <select value={formCadence} onChange={e => setFormCadence(e.target.value)}
                className={`${INP} bg-white`} style={inpStyle}>
                {CADENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LBL} style={{ color: EV_MUTED }}>Target</label>
              <input type="number" min={0} value={formTarget}
                onChange={e => setFormTarget(e.target.value)}
                placeholder="Count" className={INP} style={inpStyle} />
            </div>
            <div>
              <label className={LBL} style={{ color: EV_MUTED }}>Owner</label>
              <input type="text" value={formOwner}
                onChange={e => setFormOwner(e.target.value)}
                placeholder="Name" className={INP} style={inpStyle} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={addingSaving}
                className="inline-flex items-center justify-center gap-2 py-[7px] px-4 text-[13px] font-bold rounded-md border-none cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}>
                <Plus size={14} /> {addingSaving ? 'Adding...' : 'Add'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="py-[7px] px-4 text-[13px] font-semibold rounded-md border cursor-pointer"
                style={{ borderColor: EV_LINE, color: EV_MUTED, fontFamily: BODY }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 py-2 px-4 text-[13px] font-bold rounded-md border cursor-pointer"
          style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: EV_LIGHT, fontFamily: BODY }}
        >
          <Plus size={14} /> Add channel
        </button>
      )}
    </div>
  );
}
