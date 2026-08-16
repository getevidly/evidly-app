/**
 * InPersonTab — INPUT tab (form + import).
 *
 * // This tab was "empty with no way to input" — the add-prospect form
 * // and CSV/XLSX import are the fix. Identical to Outbound Calls with
 * // three differences:
 * //   1. source = 'in_person' (field visit, not cold call)
 * //   2. Required Rep field stamped on every row for 1099 commission
 * //   3. Outcome field (Interested / Left card / No)
 *
 * Rows land in sales_pipeline with ICP derived on write, dedupe on
 * org_name+county. The rep name goes into assigned_to, the outcome
 * into next_action.
 */
import { useState, useMemo, useRef } from 'react';
import { ArrowUpDown, Plus, Upload, X, FileSpreadsheet, Check, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';
import { type AccountRow } from '../../../lib/marketing/useMarketingData';
import {
  JURISDICTIONS,
  SEGMENTS,
  STAGE_LABELS,
  deriveICP,
  priorityBand,
  type Stage,
} from '../../../lib/marketing/gtmReference';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_LINE, EV_PAPER, EV_LIGHT, EV_FAINT,
  EV_SUCCESS, EV_WARN, EV_DANGER, DISPLAY, BODY,
} from './marketingTokens';
import { toast } from 'sonner';

// ── Constants ────────────────────────────────────────────────────

const COUNTY_LIST = Object.keys(JURISDICTIONS).sort();
const SEGMENT_LIST = Object.keys(SEGMENTS).sort();

const OUTCOMES = [
  { value: 'interested', label: 'Interested' },
  { value: 'left_card', label: 'Left card' },
  { value: 'no', label: 'No' },
] as const;

const IMPORT_FIELDS = [
  { key: 'org_name', label: 'Organization', required: true },
  { key: 'county', label: 'County', required: false },
  { key: 'segment', label: 'Segment', required: false },
  { key: 'location_count', label: 'Location Count', required: false },
  { key: 'assigned_to', label: 'Rep', required: true },
  { key: 'next_action', label: 'Outcome', required: false },
  { key: 'contact_name', label: 'Contact Name', required: false },
  { key: 'contact_email', label: 'Contact Email', required: false },
  { key: 'notes', label: 'Notes', required: false },
] as const;

type ImportFieldKey = typeof IMPORT_FIELDS[number]['key'];

// ── Types ────────────────────────────────────────────────────────

interface InPersonTabProps {
  accounts: AccountRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

interface ImportResult {
  added: number;
  skipped: number;
  errors: string[];
}

type SortCol = 'org_name' | 'county' | 'segment' | 'stage' | 'icp' | 'rep' | 'outcome' | 'created_at';
type SortDir = 'asc' | 'desc';

// ── Helpers ──────────────────────────────────────────────────────

function outcomeLabel(val: string | null): string {
  if (!val) return '\u2014';
  const found = OUTCOMES.find(o => o.value === val);
  return found ? found.label : val;
}

const OUTCOME_COLOR: Record<string, string> = {
  interested: EV_SUCCESS,
  left_card: EV_WARN,
  no: EV_DANGER,
};

// ── Add-prospect form ────────────────────────────────────────────

function AddProspectForm({ accounts, onRefresh }: { accounts: AccountRow[]; onRefresh: () => void }) {
  const [org, setOrg] = useState('');
  const [county, setCounty] = useState('');
  const [countySearch, setCountySearch] = useState('');
  const [showCountyDropdown, setShowCountyDropdown] = useState(false);
  const [segment, setSegment] = useState('');
  const [locations, setLocations] = useState(1);
  const [rep, setRep] = useState('');
  const [outcome, setOutcome] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredCounties = useMemo(() => {
    if (!countySearch) return COUNTY_LIST;
    const q = countySearch.toLowerCase();
    return COUNTY_LIST.filter(c => c.toLowerCase().includes(q));
  }, [countySearch]);

  const handleSubmit = async () => {
    const trimOrg = org.trim();
    const trimRep = rep.trim();
    if (!trimOrg) { toast.error('Organization name is required'); return; }
    if (!trimRep) { toast.error('Rep name is required for 1099 commission tracking'); return; }

    // Dedupe check: org_name + county
    const duplicate = accounts.find(
      a => a.org_name.toLowerCase() === trimOrg.toLowerCase()
        && (a.county || '').toLowerCase() === county.toLowerCase(),
    );
    if (duplicate) {
      toast.error(`"${trimOrg}" in ${county || '(no county)'} already exists in pipeline`);
      return;
    }

    setSaving(true);
    const icp = deriveICP({ county: county || null, segment: segment || null, location_count: locations });
    const { error } = await supabase.from('sales_pipeline').insert({
      org_name: trimOrg,
      county: county || null,
      segment: segment || null,
      location_count: locations,
      stage: 'prospect',
      source: 'in_person',
      assigned_to: trimRep,
      next_action: outcome || null,
      next_action_at: nextActionAt || null,
      buyer_type: segment ? (SEGMENTS[segment]?.category ?? null) : null,
      notes: `ICP ${icp} on entry · field visit by ${trimRep}`,
    });
    setSaving(false);

    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${trimOrg} (rep: ${trimRep})`);
    setOrg(''); setCounty(''); setCountySearch(''); setSegment('');
    setLocations(1); setOutcome(''); setNextActionAt('');
    // Keep rep — likely the same person is entering multiple visits
    onRefresh();
  };

  return (
    <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <h4 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Log Field Visit</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {/* Organization */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>
            Organization <span style={{ color: EV_DANGER }}>*</span>
          </label>
          <input type="text" value={org} onChange={e => setOrg(e.target.value)}
            placeholder="Business name"
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
        </div>

        {/* County (type-to-search) */}
        <div className="relative">
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>County</label>
          <input type="text"
            value={showCountyDropdown ? countySearch : county}
            onChange={e => { setCountySearch(e.target.value); setShowCountyDropdown(true); }}
            onFocus={() => setShowCountyDropdown(true)}
            onBlur={() => setTimeout(() => setShowCountyDropdown(false), 200)}
            placeholder="Type to search..."
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
          {showCountyDropdown && filteredCounties.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto border rounded-md bg-white shadow-md"
              style={{ borderColor: EV_LINE }}>
              {filteredCounties.map(c => (
                <div key={c}
                  onMouseDown={() => { setCounty(c); setCountySearch(c); setShowCountyDropdown(false); }}
                  className="px-3 py-1.5 text-[13px] cursor-pointer hover:bg-gray-50" style={{ color: EV_NAVY }}>
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Segment */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>Segment</label>
          <select value={segment} onChange={e => setSegment(e.target.value)}
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}>
            <option value="">Select...</option>
            {SEGMENT_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Locations */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>Locations</label>
          <input type="number" min={1} value={locations}
            onChange={e => setLocations(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        {/* Rep (required) */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>
            Rep <span style={{ color: EV_DANGER }}>*</span>
          </label>
          <input type="text" value={rep} onChange={e => setRep(e.target.value)}
            placeholder="Rep name (for 1099 commission)"
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>Outcome</label>
          <select value={outcome} onChange={e => setOutcome(e.target.value)}
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}>
            <option value="">Select...</option>
            {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Next action date */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>Next action date</label>
          <input type="date" value={nextActionAt} onChange={e => setNextActionAt(e.target.value)}
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={saving}
          className="inline-flex items-center justify-center gap-2 py-[7px] px-4 text-[13px] font-bold rounded-md border-none cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}>
          <Plus size={14} /> {saving ? 'Saving...' : 'Log Visit'}
        </button>
      </div>
    </div>
  );
}

// ── Import wizard ────────────────────────────────────────────────

type ImportStep = 'idle' | 'mapping' | 'importing' | 'done';

function ImportWizard({ accounts, onRefresh }: { accounts: AccountRow[]; onRefresh: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('idle');
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<ImportFieldKey, string>>({
    org_name: '', county: '', segment: '', location_count: '',
    assigned_to: '', next_action: '', contact_name: '', contact_email: '', notes: '',
  });
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    setFileName(file.name);

    if (ext === 'csv' || ext === 'tsv') {
      Papa.parse<Record<string, string>>(file, {
        header: true, skipEmptyLines: true,
        complete: (res) => {
          if (res.data.length === 0) { toast.error('File is empty'); return; }
          setRawRows(res.data);
          setFileHeaders(res.meta.fields || []);
          autoMap(res.meta.fields || []);
          setStep('mapping');
        },
        error: () => toast.error('Failed to parse CSV'),
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
          if (rows.length === 0) { toast.error('Spreadsheet is empty'); return; }
          const headers = Object.keys(rows[0]);
          setRawRows(rows);
          setFileHeaders(headers);
          autoMap(headers);
          setStep('mapping');
        } catch { toast.error('Failed to parse spreadsheet'); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Unsupported file type. Use CSV, TSV, XLSX, or XLS.');
    }
  };

  const autoMap = (headers: string[]) => {
    const map: Record<string, string> = {};
    const lower = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    for (const field of IMPORT_FIELDS) {
      const norm = field.key.replace(/_/g, '');
      const labelNorm = field.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      const idx = lower.findIndex(h => h === norm || h.includes(norm) || h.includes(labelNorm));
      map[field.key] = idx >= 0 ? headers[idx] : '';
    }
    setColumnMap(map as Record<ImportFieldKey, string>);
  };

  const canConfirm = columnMap.org_name !== '' && columnMap.assigned_to !== '';

  const runImport = async () => {
    if (!columnMap.org_name) { toast.error('Organization column must be mapped'); return; }
    if (!columnMap.assigned_to) { toast.error('Rep column must be mapped'); return; }
    setStep('importing');
    const res: ImportResult = { added: 0, skipped: 0, errors: [] };
    const existingSet = new Set(
      accounts.map(a => `${a.org_name.toLowerCase()}|${(a.county || '').toLowerCase()}`),
    );
    const batchInserts: Record<string, unknown>[] = [];

    for (const row of rawRows) {
      const orgName = (row[columnMap.org_name] || '').trim();
      if (!orgName) { res.skipped += 1; continue; }

      const county = columnMap.county ? (row[columnMap.county] || '').trim() : '';
      const segment = columnMap.segment ? (row[columnMap.segment] || '').trim() : '';
      const locStr = columnMap.location_count ? (row[columnMap.location_count] || '').trim() : '';
      const locs = parseInt(locStr) || 1;
      const repName = (row[columnMap.assigned_to] || '').trim();
      const outcomeVal = columnMap.next_action ? (row[columnMap.next_action] || '').trim().toLowerCase() : '';

      const key = `${orgName.toLowerCase()}|${county.toLowerCase()}`;
      if (existingSet.has(key)) { res.skipped += 1; continue; }
      existingSet.add(key);

      const icp = deriveICP({ county: county || null, segment: segment || null, location_count: locs });

      batchInserts.push({
        org_name: orgName,
        county: county || null,
        segment: segment || null,
        location_count: locs,
        assigned_to: repName || null,
        next_action: outcomeVal || null,
        stage: 'prospect',
        source: 'in_person',
        buyer_type: segment ? (SEGMENTS[segment]?.category ?? null) : null,
        contact_name: columnMap.contact_name ? (row[columnMap.contact_name] || '').trim() || null : null,
        contact_email: columnMap.contact_email ? (row[columnMap.contact_email] || '').trim() || null : null,
        notes: columnMap.notes
          ? (row[columnMap.notes] || '').trim() || `ICP ${icp} on import · field visit`
          : `ICP ${icp} on import · field visit`,
      });
    }

    const CHUNK = 100;
    for (let i = 0; i < batchInserts.length; i += CHUNK) {
      const chunk = batchInserts.slice(i, i + CHUNK);
      const { error } = await supabase.from('sales_pipeline').insert(chunk);
      if (error) res.errors.push(`Batch ${Math.floor(i / CHUNK) + 1}: ${error.message}`);
      else res.added += chunk.length;
    }

    setResult(res);
    setStep('done');
    if (res.added > 0) onRefresh();
  };

  const reset = () => {
    setStep('idle'); setFileName(''); setRawRows([]); setFileHeaders([]); setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (step === 'idle') {
    return (
      <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <h4 className="text-sm font-bold mb-2" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Import Field Visits</h4>
        <p className="text-[12px] mb-3" style={{ color: EV_MUTED }}>
          Upload a CSV or XLSX. Rep column is required for 1099 tracking. You'll map columns before any data is written.
        </p>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.xlsx,.xls" className="hidden"
          onChange={e => { if (e.target.files?.[0]) parseFile(e.target.files[0]); }} />
        <button onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 py-2 px-4 text-[13px] font-bold rounded-md border cursor-pointer"
          style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: EV_LIGHT, fontFamily: BODY }}>
          <Upload size={14} /> Choose file
        </button>
      </div>
    );
  }

  if (step === 'mapping') {
    return (
      <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Map Columns</h4>
            <p className="text-[12px] mt-0.5" style={{ color: EV_MUTED }}>
              <FileSpreadsheet size={12} className="inline mr-1" />{fileName} — {rawRows.length} rows
            </p>
          </div>
          <button onClick={reset} className="p-1 rounded hover:bg-gray-100" title="Cancel">
            <X size={16} style={{ color: EV_MUTED }} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {IMPORT_FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>
                {f.label} {f.required && <span style={{ color: EV_DANGER }}>*</span>}
              </label>
              <select value={columnMap[f.key]}
                onChange={e => setColumnMap(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
                style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}>
                <option value="">— skip —</option>
                {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}
        </div>

        {rawRows.length > 0 && columnMap.org_name && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>Preview (first 3 rows)</div>
            <div className="overflow-x-auto border rounded" style={{ borderColor: EV_LINE }}>
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr style={{ backgroundColor: EV_LIGHT }}>
                    {IMPORT_FIELDS.filter(f => columnMap[f.key]).map(f => (
                      <th key={f.key} className="py-1.5 px-3 font-bold" style={{ color: EV_MUTED }}>{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: EV_LINE }}>
                      {IMPORT_FIELDS.filter(f => columnMap[f.key]).map(f => (
                        <td key={f.key} className="py-1.5 px-3" style={{ color: EV_NAVY }}>
                          {row[columnMap[f.key]] || '\u2014'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={runImport} disabled={!canConfirm}
            className="inline-flex items-center gap-2 py-2 px-4 text-[13px] font-bold rounded-md border-none cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}>
            <Check size={14} /> Confirm & Import ({rawRows.length} rows)
          </button>
          <button onClick={reset}
            className="py-2 px-4 text-[13px] font-semibold rounded-md border cursor-pointer"
            style={{ borderColor: EV_LINE, color: EV_MUTED, fontFamily: BODY }}>
            Cancel
          </button>
          {!canConfirm && (
            <span className="text-[12px]" style={{ color: EV_DANGER }}>Organization and Rep columns are required</span>
          )}
        </div>
      </div>
    );
  }

  if (step === 'importing') {
    return (
      <div className="border rounded-lg p-6 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="text-[13px] font-semibold" style={{ color: EV_NAVY }}>Importing...</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <h4 className="text-sm font-bold mb-2" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Import Complete</h4>
      <div className="flex items-center gap-4 text-[13px] mb-3">
        <span style={{ color: EV_SUCCESS }}><Check size={13} className="inline mr-1" />{result?.added ?? 0} added</span>
        <span style={{ color: EV_MUTED }}>{result?.skipped ?? 0} skipped (duplicate or empty)</span>
        {(result?.errors.length ?? 0) > 0 && (
          <span style={{ color: EV_DANGER }}><AlertTriangle size={13} className="inline mr-1" />{result?.errors.length} errors</span>
        )}
      </div>
      {result?.errors.map((err, i) => (
        <div key={i} className="text-[12px] mb-1" style={{ color: EV_DANGER }}>{err}</div>
      ))}
      <button onClick={reset}
        className="mt-2 py-2 px-4 text-[13px] font-semibold rounded-md border cursor-pointer"
        style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}>
        Import another file
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────

export default function InPersonTab({
  accounts, loading, error, onRefresh,
}: InPersonTabProps) {
  const prospects = useMemo(() => accounts.filter(a => a.source === 'in_person'), [accounts]);

  // ── Filters ──────────────────────────────────────────────────
  const [filterCounty, setFilterCounty] = useState('');
  const [filterSegment, setFilterSegment] = useState('');
  const [filterBand, setFilterBand] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterRep, setFilterRep] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');

  // ── Sort ──────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState<SortCol>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    return prospects.filter(a => {
      if (filterCounty && a.county !== filterCounty) return false;
      if (filterSegment && a.segment !== filterSegment) return false;
      if (filterStage && a.stage !== filterStage) return false;
      if (filterRep && a.assigned_to !== filterRep) return false;
      if (filterOutcome && a.next_action !== filterOutcome) return false;
      if (filterBand) {
        if (priorityBand(deriveICP(a)) !== filterBand) return false;
      }
      return true;
    });
  }, [prospects, filterCounty, filterSegment, filterStage, filterRep, filterOutcome, filterBand]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'org_name': cmp = a.org_name.localeCompare(b.org_name); break;
        case 'county': cmp = (a.county || '').localeCompare(b.county || ''); break;
        case 'segment': cmp = (a.segment || '').localeCompare(b.segment || ''); break;
        case 'stage': cmp = a.stage.localeCompare(b.stage); break;
        case 'icp': cmp = deriveICP(a) - deriveICP(b); break;
        case 'rep': cmp = (a.assigned_to || '').localeCompare((b as any).assigned_to || ''); break;
        case 'outcome': cmp = (a.next_action || '').localeCompare(b.next_action || ''); break;
        case 'created_at': cmp = a.created_at.localeCompare(b.created_at); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return rows;
  }, [filtered, sortCol, sortDir]);

  const counties = useMemo(() => [...new Set(prospects.map(a => a.county).filter(Boolean) as string[])].sort(), [prospects]);
  const segments = useMemo(() => [...new Set(prospects.map(a => a.segment).filter(Boolean) as string[])].sort(), [prospects]);
  const stages = useMemo(() => [...new Set(prospects.map(a => a.stage))].sort(), [prospects]);
  const reps = useMemo(() => [...new Set(prospects.map(a => a.assigned_to).filter(Boolean) as string[])].sort(), [prospects]);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  const sortIcon = (active: boolean) => (
    <ArrowUpDown size={11} style={{ color: active ? EV_EMBER : EV_MUTED, opacity: active ? 1 : 0.4 }} />
  );

  if (loading) return <div className="p-10 text-center text-[13px]" style={{ color: EV_MUTED }}>Loading...</div>;
  if (error) return <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">{error}</div>;

  return (
    <div className="space-y-4">
      <AddProspectForm accounts={accounts} onRefresh={onRefresh} />
      <ImportWizard accounts={accounts} onRefresh={onRefresh} />

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterCounty} onChange={e => setFilterCounty(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}>
          <option value="">All counties</option>
          {counties.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterSegment} onChange={e => setFilterSegment(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}>
          <option value="">All segments</option>
          {segments.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterRep} onChange={e => setFilterRep(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}>
          <option value="">All reps</option>
          {reps.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}>
          <option value="">All outcomes</option>
          {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterBand} onChange={e => setFilterBand(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}>
          <option value="">All ICP bands</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="nurture">Nurture</option>
        </select>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
          className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
          style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}>
          <option value="">All stages</option>
          {stages.map(s => <option key={s} value={s}>{STAGE_LABELS[s as Stage] ?? s}</option>)}
        </select>
        {(filterCounty || filterSegment || filterBand || filterStage || filterRep || filterOutcome) && (
          <button
            onClick={() => { setFilterCounty(''); setFilterSegment(''); setFilterBand(''); setFilterStage(''); setFilterRep(''); setFilterOutcome(''); }}
            className="py-[7px] px-3 text-[12px] font-semibold rounded-md cursor-pointer border-none"
            style={{ backgroundColor: EV_LIGHT, color: EV_MUTED, fontFamily: BODY }}>
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[12px] font-semibold" style={{ color: EV_MUTED }}>
          {filtered.length} visit{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Visit list ─────────────────────────────────────────── */}
      <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: EV_LINE }}>
          <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Field Visit Prospects</h4>
        </div>
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-[13px]" style={{ color: EV_MUTED }}>
            No field visits logged yet. Add one above or import a file.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: EV_LINE }}>
                  {([
                    ['Organization', 'org_name'],
                    ['County', 'county'],
                    ['Segment', 'segment'],
                    ['Rep', 'rep'],
                    ['Outcome', 'outcome'],
                    ['ICP', 'icp'],
                    ['Stage', 'stage'],
                    ['Date', 'created_at'],
                  ] as const).map(([label, col]) => (
                    <th key={col} onClick={() => toggleSort(col)}
                      className="py-2 px-4 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none"
                      style={{ color: EV_MUTED }}>
                      <span className="inline-flex items-center gap-1">
                        {label} {sortIcon(sortCol === col)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(a => {
                  const icp = deriveICP(a);
                  const band = priorityBand(icp);
                  const bandColor = band === 'hot' ? EV_DANGER : band === 'warm' ? EV_WARN : EV_MUTED;
                  return (
                    <tr key={a.id} className="border-b last:border-b-0" style={{ borderColor: EV_LINE }}>
                      <td className="py-2.5 px-4 text-[13px] font-semibold" style={{ color: EV_NAVY }}>{a.org_name}</td>
                      <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>{a.county || '\u2014'}</td>
                      <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>{a.segment || '\u2014'}</td>
                      <td className="py-2.5 px-4 text-[13px] font-semibold" style={{ color: EV_NAVY }}>
                        {a.assigned_to || '\u2014'}
                      </td>
                      <td className="py-2.5 px-4 text-[13px] font-semibold"
                        style={{ color: OUTCOME_COLOR[a.next_action || ''] || EV_MUTED }}>
                        {outcomeLabel(a.next_action)}
                      </td>
                      <td className="py-2.5 px-4 text-[13px] font-bold" style={{ color: bandColor, fontFamily: 'ui-monospace, monospace' }}>
                        {icp}
                      </td>
                      <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>
                        {STAGE_LABELS[a.stage as Stage] ?? a.stage}
                      </td>
                      <td className="py-2.5 px-4 text-[12px]" style={{ color: EV_FAINT }}>
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
