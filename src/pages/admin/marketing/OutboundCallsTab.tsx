/**
 * OutboundCallsTab — INPUT tab (form + import).
 *
 * // This tab was "empty with no way to input" — the add-prospect form
 * // and CSV/XLSX import are the fix. Rows land in sales_pipeline with
 * // source='cold_call', ICP derived on write, dedupe on org_name+county.
 *
 * Two entry paths:
 *   1. Add-prospect form: organization, county, segment, location count
 *   2. CSV/XLSX import with mandatory column-mapping confirm step
 *      — no write happens until the user reviews and confirms the map.
 *
 * The prospect list below the form has column sort and filters
 * (county, segment, ICP band, stage).
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { ArrowUpDown, Plus, Upload, X, FileSpreadsheet, Check, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';
import { type AccountRow } from '../../../lib/marketing/useMarketingData';
import {
  CALIFORNIA_COUNTIES,
  SEGMENTS,
  STAGE_LABELS,
  deriveICP,
  priorityBand,
  type Stage,
} from '../../../lib/marketing/gtmReference';
import {
  EV_NAVY, EV_EMBER, EV_EMBER_HOT, EV_MUTED, EV_LINE, EV_PAPER, EV_LIGHT,
  EV_SUCCESS, EV_WARN, EV_DANGER, DISPLAY, BODY,
} from './marketingTokens';
import { toast } from 'sonner';

// ── Constants ────────────────────────────────────────────────────

const COUNTY_LIST = CALIFORNIA_COUNTIES;
const SEGMENT_LIST = Object.keys(SEGMENTS).sort();

const IMPORT_FIELDS = [
  { key: 'org_name', label: 'Organization', required: true },
  { key: 'county', label: 'County', required: false },
  { key: 'segment', label: 'Segment', required: false },
  { key: 'location_count', label: 'Location Count', required: false },
  { key: 'contact_name', label: 'Contact Name', required: false },
  { key: 'contact_email', label: 'Contact Email', required: false },
  { key: 'contact_title', label: 'Contact Title', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'next_action_at', label: 'Next action date', required: false },
] as const;

type ImportFieldKey = typeof IMPORT_FIELDS[number]['key'];

// ── Types ────────────────────────────────────────────────────────

interface OutboundCallsTabProps {
  accounts: AccountRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

interface ImportResult {
  added: number;
  merged: number;
  skipped: number;
  errors: string[];
}

type SortCol = 'org_name' | 'county' | 'segment' | 'stage' | 'icp' | 'created_at';
type SortDir = 'asc' | 'desc';

// ── Add-prospect form ────────────────────────────────────────────

function AddProspectForm({ accounts, onRefresh }: { accounts: AccountRow[]; onRefresh: () => void }) {
  // Prospect fields
  const [org, setOrg] = useState('');
  const [county, setCounty] = useState('');
  const [countySearch, setCountySearch] = useState('');
  const [showCountyDropdown, setShowCountyDropdown] = useState(false);
  const [segment, setSegment] = useState('');
  const [locations, setLocations] = useState(1);
  // Contact fields
  const [contactName, setContactName] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  // Call log fields
  const [callDate, setCallDate] = useState('');
  const [callSummary, setCallSummary] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [nextActionErr, setNextActionErr] = useState(false);

  const [saving, setSaving] = useState(false);

  const quickSet = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setNextActionAt(d.toISOString().slice(0, 10));
    setNextActionErr(false);
  };

  const filteredCounties = useMemo(() => {
    if (!countySearch) return COUNTY_LIST;
    const q = countySearch.toLowerCase();
    return COUNTY_LIST.filter(c => c.toLowerCase().includes(q));
  }, [countySearch]);

  const handleSubmit = async () => {
    const trimOrg = org.trim();
    if (!trimOrg) { toast.error('Organization name is required'); return; }
    if (!nextActionAt) { setNextActionErr(true); return; }

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
      source: 'cold_call',
      buyer_type: segment ? (SEGMENTS[segment]?.category ?? null) : null,
      notes: `ICP ${icp} on entry`,
      contact_name: contactName.trim() || null,
      contact_title: contactTitle.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_address: contactAddress.trim() || null,
      call_date: callDate || null,
      call_summary: callSummary.trim() || null,
      next_action_at: nextActionAt || null,
    });
    setSaving(false);

    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${trimOrg}`);
    setOrg(''); setCounty(''); setCountySearch(''); setSegment(''); setLocations(1);
    setContactName(''); setContactTitle(''); setContactPhone('');
    setContactEmail(''); setContactAddress('');
    setCallDate(''); setCallSummary(''); setNextActionAt(''); setNextActionErr(false);
    onRefresh();
  };

  const LBL = "block text-[10px] tracking-wider font-bold mb-1";
  const INP = "w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none";
  const inpStyle = { borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY };

  return (
    <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <h4 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Add Prospect</h4>

      {/* Row 1: Prospect */}
      <div className="text-[10px] tracking-wider font-bold mb-2" style={{ color: EV_EMBER, letterSpacing: '0.15em' }}>Prospect</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div>
          <label className={LBL} style={{ color: EV_MUTED }}>
            Organization <span style={{ color: EV_DANGER }}>*</span>
          </label>
          <input type="text" value={org} onChange={e => setOrg(e.target.value)}
            placeholder="Business name" className={INP} style={inpStyle} />
        </div>
        <div className="relative">
          <label className={LBL} style={{ color: EV_MUTED }}>County</label>
          <input type="text"
            value={showCountyDropdown ? countySearch : county}
            onChange={e => { setCountySearch(e.target.value); setShowCountyDropdown(true); }}
            onFocus={() => setShowCountyDropdown(true)}
            onBlur={() => setTimeout(() => setShowCountyDropdown(false), 200)}
            placeholder="Type to search..." className={INP} style={inpStyle} />
          {showCountyDropdown && filteredCounties.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto border rounded-md bg-white shadow-md"
              style={{ borderColor: EV_LINE }}>
              {filteredCounties.map(c => (
                <div key={c}
                  onMouseDown={() => { setCounty(c); setCountySearch(c); setShowCountyDropdown(false); }}
                  className="px-3 py-1.5 text-[13px] cursor-pointer hover:bg-gray-50"
                  style={{ color: EV_NAVY }}>
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className={LBL} style={{ color: EV_MUTED }}>Segment</label>
          <select value={segment} onChange={e => setSegment(e.target.value)}
            className={`${INP} bg-white`} style={inpStyle}>
            <option value="">Select...</option>
            {SEGMENT_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={LBL} style={{ color: EV_MUTED }}>Locations</label>
          <input type="number" min={1} value={locations}
            onChange={e => setLocations(Math.max(1, parseInt(e.target.value) || 1))}
            className={INP} style={inpStyle} />
        </div>
      </div>

      {/* Row 2: Contact */}
      <div className="text-[10px] tracking-wider font-bold mb-2" style={{ color: EV_EMBER, letterSpacing: '0.15em' }}>Contact</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <div>
          <label className={LBL} style={{ color: EV_MUTED }}>Name</label>
          <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
            placeholder="Contact name" className={INP} style={inpStyle} />
        </div>
        <div>
          <label className={LBL} style={{ color: EV_MUTED }}>Title</label>
          <input type="text" value={contactTitle} onChange={e => setContactTitle(e.target.value)}
            placeholder="Job title" className={INP} style={inpStyle} />
        </div>
        <div>
          <label className={LBL} style={{ color: EV_MUTED }}>Phone</label>
          <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
            placeholder="(555) 555-5555" className={INP} style={inpStyle} />
        </div>
        <div>
          <label className={LBL} style={{ color: EV_MUTED }}>Email</label>
          <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
            placeholder="email@example.com" className={INP} style={inpStyle} />
        </div>
        <div>
          <label className={LBL} style={{ color: EV_MUTED }}>Address</label>
          <input type="text" value={contactAddress} onChange={e => setContactAddress(e.target.value)}
            placeholder="Business address" className={INP} style={inpStyle} />
        </div>
      </div>

      {/* Row 3: Call log + submit */}
      <div className="text-[10px] tracking-wider font-bold mb-2" style={{ color: EV_EMBER, letterSpacing: '0.15em' }}>Call log</div>
      <div className="grid grid-cols-1 sm:grid-cols-[160px_160px_1fr_auto] gap-3 items-end">
        <div>
          <label className={LBL} style={{ color: EV_MUTED }}>Call date</label>
          <input type="date" value={callDate} onChange={e => setCallDate(e.target.value)}
            className={INP} style={inpStyle} />
        </div>
        <div>
          <label className={LBL} style={{ color: EV_MUTED }}>
            Next action date <span style={{ color: EV_DANGER }}>*</span>
          </label>
          <input type="date" value={nextActionAt}
            onChange={e => { setNextActionAt(e.target.value); setNextActionErr(false); }}
            className={INP} style={inpStyle} />
          <div className="flex flex-wrap gap-1 mt-1">
            {[3, 7, 14, 30].map(n => (
              <button key={n} type="button" onClick={() => quickSet(n)}
                className="py-0.5 px-2 text-[11px] font-semibold rounded-md cursor-pointer border-none"
                style={{ backgroundColor: EV_LIGHT, color: EV_MUTED, fontFamily: BODY }}>
                +{n} days
              </button>
            ))}
          </div>
          {nextActionErr && (
            <div className="text-[11px] mt-1" style={{ color: EV_DANGER }}>Set a next action before saving.</div>
          )}
        </div>
        <div>
          <label className={LBL} style={{ color: EV_MUTED }}>Summary</label>
          <textarea value={callSummary} onChange={e => setCallSummary(e.target.value)}
            placeholder="Call notes or outcome..."
            rows={1}
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none resize-y"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY, minHeight: 36 }} />
        </div>
        <button onClick={handleSubmit} disabled={saving}
          className="inline-flex items-center justify-center gap-2 py-[7px] px-4 text-[13px] font-bold rounded-md border-none cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}>
          <Plus size={14} /> {saving ? 'Saving...' : 'Add'}
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
    contact_name: '', contact_email: '', contact_title: '', notes: '',
    next_action_at: '',
  });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [defaultNextActionAt, setDefaultNextActionAt] = useState('');
  const [defaultNextActionErr, setDefaultNextActionErr] = useState(false);

  const quickSetDefault = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDefaultNextActionAt(d.toISOString().slice(0, 10));
    setDefaultNextActionErr(false);
  };

  const parseFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    setFileName(file.name);

    if (ext === 'csv' || ext === 'tsv') {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
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
      const idx = lower.findIndex(h =>
        h === norm || h.includes(norm) || h.includes(field.label.toLowerCase().replace(/[^a-z0-9]/g, '')),
      );
      map[field.key] = idx >= 0 ? headers[idx] : '';
    }
    setColumnMap(map as Record<ImportFieldKey, string>);
  };

  const canConfirm = columnMap.org_name !== '';

  const runImport = async () => {
    if (!canConfirm) { toast.error('Organization column must be mapped'); return; }
    if (!defaultNextActionAt) { setDefaultNextActionErr(true); return; }
    setStep('importing');
    const res: ImportResult = { added: 0, merged: 0, skipped: 0, errors: [] };
    const existingSet = new Set(
      accounts.map(a => `${a.org_name.toLowerCase()}|${(a.county || '').toLowerCase()}`),
    );
    const batchInserts: Record<string, unknown>[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const orgName = (row[columnMap.org_name] || '').trim();
      if (!orgName) { res.skipped += 1; continue; }

      const county = columnMap.county ? (row[columnMap.county] || '').trim() : '';
      const segment = columnMap.segment ? (row[columnMap.segment] || '').trim() : '';
      const locStr = columnMap.location_count ? (row[columnMap.location_count] || '').trim() : '';
      const locs = parseInt(locStr) || 1;

      const key = `${orgName.toLowerCase()}|${county.toLowerCase()}`;
      if (existingSet.has(key)) {
        res.skipped += 1;
        continue;
      }
      // Also check within the import batch itself
      existingSet.add(key);

      const icp = deriveICP({
        county: county || null,
        segment: segment || null,
        location_count: locs,
      });

      const rawNaAt = columnMap.next_action_at ? (row[columnMap.next_action_at] || '').trim() : '';
      const nextActionAtVal = rawNaAt && !isNaN(Date.parse(rawNaAt)) ? rawNaAt : defaultNextActionAt;

      batchInserts.push({
        org_name: orgName,
        county: county || null,
        segment: segment || null,
        location_count: locs,
        contact_name: columnMap.contact_name ? (row[columnMap.contact_name] || '').trim() || null : null,
        contact_email: columnMap.contact_email ? (row[columnMap.contact_email] || '').trim() || null : null,
        contact_title: columnMap.contact_title ? (row[columnMap.contact_title] || '').trim() || null : null,
        notes: columnMap.notes
          ? (row[columnMap.notes] || '').trim() || `ICP ${icp} on import`
          : `ICP ${icp} on import`,
        stage: 'prospect',
        source: 'cold_call',
        buyer_type: segment ? (SEGMENTS[segment]?.category ?? null) : null,
        next_action_at: nextActionAtVal,
      });
    }

    // Batch insert in chunks of 100
    const CHUNK = 100;
    for (let i = 0; i < batchInserts.length; i += CHUNK) {
      const chunk = batchInserts.slice(i, i + CHUNK);
      const { error } = await supabase.from('sales_pipeline').insert(chunk);
      if (error) {
        res.errors.push(`Batch ${Math.floor(i / CHUNK) + 1}: ${error.message}`);
      } else {
        res.added += chunk.length;
      }
    }

    setResult(res);
    setStep('done');
    if (res.added > 0) onRefresh();
  };

  const reset = () => {
    setStep('idle');
    setFileName('');
    setRawRows([]);
    setFileHeaders([]);
    setResult(null);
    setDefaultNextActionAt('');
    setDefaultNextActionErr(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Idle: upload zone ──
  if (step === 'idle') {
    return (
      <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <h4 className="text-sm font-bold mb-2" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Import Prospects</h4>
        <p className="text-[12px] mb-3" style={{ color: EV_MUTED }}>
          Upload a CSV or XLSX file. You'll map columns before any data is written.
        </p>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.xlsx,.xls" className="hidden"
          onChange={e => { if (e.target.files?.[0]) parseFile(e.target.files[0]); }} />
        <button
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 py-2 px-4 text-[13px] font-bold rounded-md border cursor-pointer"
          style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: EV_LIGHT, fontFamily: BODY }}
        >
          <Upload size={14} /> Choose file
        </button>
      </div>
    );
  }

  // ── Mapping: column map confirm ──
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {IMPORT_FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-[10px] tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>
                {f.label} {f.required && <span style={{ color: EV_DANGER }}>*</span>}
              </label>
              <select
                value={columnMap[f.key]}
                onChange={e => setColumnMap(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none bg-white"
                style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
              >
                <option value="">— skip —</option>
                {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Preview first 3 rows */}
        {rawRows.length > 0 && columnMap.org_name && (
          <div className="mb-4">
            <div className="text-[10px] tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>Preview (first 3 rows)</div>
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

        {/* Default next action date */}
        <div className="mb-4">
          <label className="block text-[10px] tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>
            Default next action date <span style={{ color: EV_DANGER }}>*</span>
          </label>
          <div className="flex items-center gap-2">
            <input type="date" value={defaultNextActionAt}
              onChange={e => { setDefaultNextActionAt(e.target.value); setDefaultNextActionErr(false); }}
              className="py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
              style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
            {[3, 7, 14, 30].map(n => (
              <button key={n} type="button" onClick={() => quickSetDefault(n)}
                className="py-0.5 px-2 text-[11px] font-semibold rounded-md cursor-pointer border-none"
                style={{ backgroundColor: EV_LIGHT, color: EV_MUTED, fontFamily: BODY }}>
                +{n} days
              </button>
            ))}
          </div>
          {defaultNextActionErr && (
            <div className="text-[11px] mt-1" style={{ color: EV_DANGER }}>Set a default next action before importing.</div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runImport} disabled={!canConfirm}
            className="inline-flex items-center gap-2 py-2 px-4 text-[13px] font-bold rounded-md border-none cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}
          >
            <Check size={14} /> Confirm & Import ({rawRows.length} rows)
          </button>
          <button
            onClick={reset}
            className="py-2 px-4 text-[13px] font-semibold rounded-md border cursor-pointer"
            style={{ borderColor: EV_LINE, color: EV_MUTED, fontFamily: BODY }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Importing: progress ──
  if (step === 'importing') {
    return (
      <div className="border rounded-lg p-6 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="text-[13px] font-semibold" style={{ color: EV_NAVY }}>Importing...</div>
      </div>
    );
  }

  // ── Done: results ──
  return (
    <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <h4 className="text-sm font-bold mb-2" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Import Complete</h4>
      <div className="flex items-center gap-4 text-[13px] mb-3">
        <span style={{ color: EV_SUCCESS }}>
          <Check size={13} className="inline mr-1" />{result?.added ?? 0} added
        </span>
        <span style={{ color: EV_MUTED }}>{result?.skipped ?? 0} skipped (duplicate or empty)</span>
        {(result?.errors.length ?? 0) > 0 && (
          <span style={{ color: EV_DANGER }}>
            <AlertTriangle size={13} className="inline mr-1" />{result?.errors.length} errors
          </span>
        )}
      </div>
      {result?.errors.map((err, i) => (
        <div key={i} className="text-[12px] mb-1" style={{ color: EV_DANGER }}>{err}</div>
      ))}
      <button
        onClick={reset}
        className="mt-2 py-2 px-4 text-[13px] font-semibold rounded-md border cursor-pointer"
        style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }}
      >
        Import another file
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────

export default function OutboundCallsTab({
  accounts, loading, error, onRefresh,
}: OutboundCallsTabProps) {
  // Filter to cold_call-sourced prospects
  const prospects = useMemo(() => accounts.filter(a => a.source === 'cold_call'), [accounts]);

  // ── Filters ──────────────────────────────────────────────────
  const [filterCounty, setFilterCounty] = useState('');
  const [filterSegment, setFilterSegment] = useState('');
  const [filterBand, setFilterBand] = useState('');
  const [filterStage, setFilterStage] = useState('');

  // ── Sort ──────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState<SortCol>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    return prospects.filter(a => {
      if (filterCounty && a.county !== filterCounty) return false;
      if (filterSegment && a.segment !== filterSegment) return false;
      if (filterStage && a.stage !== filterStage) return false;
      if (filterBand) {
        const band = priorityBand(deriveICP(a));
        if (band !== filterBand) return false;
      }
      return true;
    });
  }, [prospects, filterCounty, filterSegment, filterStage, filterBand]);

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
        case 'created_at': cmp = a.created_at.localeCompare(b.created_at); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return rows;
  }, [filtered, sortCol, sortDir]);

  const counties = useMemo(
    () => [...new Set(prospects.map(a => a.county).filter(Boolean) as string[])].sort(),
    [prospects],
  );
  const segments = useMemo(
    () => [...new Set(prospects.map(a => a.segment).filter(Boolean) as string[])].sort(),
    [prospects],
  );
  const stages = useMemo(
    () => [...new Set(prospects.map(a => a.stage))].sort(),
    [prospects],
  );

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  const sortIcon = (active: boolean) => (
    <ArrowUpDown size={11} style={{ color: active ? EV_EMBER : EV_MUTED, opacity: active ? 1 : 0.4 }} />
  );

  if (loading) {
    return <div className="p-10 text-center text-[13px]" style={{ color: EV_MUTED }}>Loading...</div>;
  }

  if (error) {
    return <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* ── Form + Import side by side ──────────────────────── */}
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
        {(filterCounty || filterSegment || filterBand || filterStage) && (
          <button
            onClick={() => { setFilterCounty(''); setFilterSegment(''); setFilterBand(''); setFilterStage(''); }}
            className="py-[7px] px-3 text-[12px] font-semibold rounded-md cursor-pointer border-none"
            style={{ backgroundColor: EV_LIGHT, color: EV_MUTED, fontFamily: BODY }}>
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[12px] font-semibold" style={{ color: EV_MUTED }}>
          {filtered.length} prospect{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Prospect list ──────────────────────────────────────── */}
      <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: EV_LINE }}>
          <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
            Cold Call Prospects
          </h4>
        </div>
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-[13px]" style={{ color: EV_MUTED }}>
            No prospects yet. Add one above or import a file.
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
                    ['Stage', 'stage'],
                    ['ICP', 'icp'],
                    ['Added', 'created_at'],
                  ] as const).map(([label, col]) => (
                    <th key={col} onClick={() => toggleSort(col)}
                      className="py-2 px-4 text-[10px] font-bold tracking-wider cursor-pointer select-none"
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
                      <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>
                        {STAGE_LABELS[a.stage as Stage] ?? a.stage}
                      </td>
                      <td className="py-2.5 px-4 text-[13px] font-bold" style={{ color: bandColor, fontFamily: 'ui-monospace, monospace' }}>
                        {icp}
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
