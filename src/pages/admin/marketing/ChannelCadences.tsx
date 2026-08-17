/**
 * ChannelCadences — settings section for channel_cadences table.
 *
 * Renders a table of existing cadence rows with inline editing,
 * and a form to add new channels. No delete — deactivate via toggle.
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  EV_NAVY, EV_MUTED, EV_LINE, EV_PAPER, EV_LIGHT,
  EV_DANGER, EV_SUCCESS, DISPLAY, BODY,
} from './marketingTokens';
import { toast } from 'sonner';

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

export default function ChannelCadences() {
  const [rows, setRows] = useState<CadenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotFound, setTableNotFound] = useState(false);

  // Inline editing state: maps row id → edited fields
  const [edits, setEdits] = useState<Record<string, Partial<CadenceRow>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

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

  useEffect(() => { fetchRows(); }, [fetchRows]);

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
      {rows.length === 0 && !showForm ? (
        <div className="border rounded-lg p-8 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <div className="text-[13px]" style={{ color: EV_MUTED }}>No channels set.</div>
        </div>
      ) : rows.length > 0 ? (
        <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: EV_LINE }}>
                  {['Label', 'Source value', 'Stage', 'Cadence', 'Target', 'Owner', 'Active', ''].map(h => (
                    <th key={h} className="py-2 px-4 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b last:border-b-0" style={{ borderColor: EV_LINE }}>
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
                        value={getEdit(r.id, 'cadence_type', r.cadence_type) as string}
                        onChange={e => setEdit(r.id, 'cadence_type', e.target.value)}
                        className="py-1 px-2 text-[12px] border rounded-md outline-none bg-white"
                        style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
                      >
                        {CADENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="py-2.5 px-4">
                      <input
                        type="number"
                        min={0}
                        value={(getEdit(r.id, 'target_count', r.target_count) as number | null) ?? ''}
                        onChange={e => setEdit(r.id, 'target_count', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-16 py-1 px-2 text-[12px] border rounded-md outline-none"
                        style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
                      />
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
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={getEdit(r.id, 'is_active', r.is_active) as boolean}
                        onChange={e => setEdit(r.id, 'is_active', e.target.checked)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-4">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

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
