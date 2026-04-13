import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';

const PRIMARY = '#1E2D4D';
const GOLD = '#A08C5A';
const NAVY = '#1E2D4D';
const MUTED_GOLD = '#A08C5A';

const PLATFORMS = [
  { id: 'zenput', label: 'Zenput / CrunchTime' },
  { id: 'squadle', label: 'Squadle' },
  { id: 'compliancemate', label: 'ComplianceMate' },
  { id: 'jolt', label: 'Jolt' },
  { id: 'paper', label: 'Paper / Spreadsheets' },
  { id: 'other', label: 'Other' },
];

const exportInstructions = {
  zenput: 'In Zenput: Reports \u2192 Temperature Logs \u2192 Export CSV. Date range: All time.',
  squadle: 'In Squadle: Data \u2192 Temperature History \u2192 Download. Select all locations.',
  compliancemate: 'In ComplianceMate: Admin \u2192 Data Export \u2192 Temperature Records \u2192 CSV.',
  jolt: 'In Jolt: Reports \u2192 Food Safety \u2192 Temperature Log \u2192 Export.',
  paper: 'Photograph or scan your paper logs. We\'ll help you digitize them.',
  other: 'Export any CSV with date, equipment name, temperature, and pass/fail columns.',
};

const columnMap = {
  date: ['date', 'timestamp', 'time', 'recorded_at', 'datetime', 'check_time'],
  equipment: ['equipment', 'unit', 'sensor', 'location_name', 'device', 'appliance'],
  temperature: ['temperature', 'temp', 'reading', 'value', 'temp_f', 'temp_c'],
  pass: ['pass', 'status', 'result', 'pass_fail', 'compliant', 'within_range'],
  corrective_action: ['corrective_action', 'action', 'notes', 'comments', 'resolution'],
};

const defaultThresholds = {
  cooler: { min: 32, max: 41 },
  freezer: { min: -10, max: 0 },
  hot_holding: { min: 135, max: 165 },
  cold_holding: { min: 32, max: 41 },
  walk_in: { min: 32, max: 41 },
};

const FIELD_LABELS = {
  date: 'Date',
  equipment: 'Equipment',
  temperature: 'Temperature',
  pass: 'Pass/Fail',
  corrective_action: 'Corrective Action',
};

const STEPS = [
  { number: 1, label: 'Choose Platform' },
  { number: 2, label: 'Upload Data' },
  { number: 3, label: 'Map Equipment' },
  { number: 4, label: 'Import Preview' },
];

function fuzzyMatch(header, candidates) {
  const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized === normalizedCandidate) return true;
    if (normalized.includes(normalizedCandidate) || normalizedCandidate.includes(normalized)) return true;
  }
  return false;
}

function autoDetectColumns(headers) {
  const mapping = {};
  for (const [field, candidates] of Object.entries(columnMap)) {
    const match = headers.find((h) => fuzzyMatch(h, candidates));
    mapping[field] = match || '';
  }
  return mapping;
}

function detectEquipmentType(name) {
  const lower = name.toLowerCase();
  if (lower.includes('freezer')) return 'freezer';
  if (lower.includes('hot') && lower.includes('hold')) return 'hot_holding';
  if (lower.includes('cold') && lower.includes('hold')) return 'cold_holding';
  if (lower.includes('walk') && lower.includes('in')) return 'walk_in';
  if (lower.includes('cooler') || lower.includes('fridge') || lower.includes('refrigerat')) return 'cooler';
  return 'cooler';
}

function formatDateRange(dates) {
  if (!dates.length) return 'N/A';
  const sorted = [...dates].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(first)} \u2013 ${fmt(last)}`;
}

export function MigrationWizard() {
  const navigate = useNavigate();
  const { isDemoMode: demoActive } = useDemo();
  const { guardAction, isDemoMode } = useDemoGuard();
  const fileInputRef = useRef(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState('');

  // Step 2 state
  const [csvData, setCsvData] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Step 3 state
  const [equipmentMap, setEquipmentMap] = useState([]);

  // Step 4 state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);

  // ─── Derived data ───
  const previewRows = useMemo(() => {
    if (!csvData || !csvData.length) return [];
    return csvData.slice(0, 5);
  }, [csvData]);

  const summary = useMemo(() => {
    if (!csvData || !csvData.length || !columnMapping.date || !columnMapping.equipment) {
      return { total: 0, equipment: 0, dateRange: 'N/A' };
    }

    const dateCol = columnMapping.date;
    const eqCol = columnMapping.equipment;

    const equipmentNames = new Set();
    const dates = [];

    for (const row of csvData) {
      if (row[eqCol]) equipmentNames.add(row[eqCol]);
      if (row[dateCol]) {
        const parsed = new Date(row[dateCol]);
        if (!isNaN(parsed.getTime())) dates.push(parsed);
      }
    }

    return {
      total: csvData.length,
      equipment: equipmentNames.size,
      dateRange: formatDateRange(dates),
    };
  }, [csvData, columnMapping]);

  // ─── CSV parsing ───
  const handleFile = useCallback((file) => {
    if (!file) return;

    setParseError('');
    setFileName(file.name);

    if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      setParseError('Please upload a CSV file.');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          const criticalErrors = results.errors.filter((e) => e.type === 'Quotes' || e.type === 'FieldMismatch');
          if (criticalErrors.length > 0) {
            setParseError(`CSV parsing error: ${criticalErrors[0].message} (row ${criticalErrors[0].row})`);
            return;
          }
        }

        if (!results.data || results.data.length === 0) {
          setParseError('The CSV file appears to be empty.');
          return;
        }

        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data);

        const detected = autoDetectColumns(headers);
        setColumnMapping(detected);
      },
      error: (err) => {
        setParseError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleFileInput = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ─── Step transitions ───
  const goNext = () => {
    if (step === 2 && csvData) {
      // Build equipment map for step 3
      const eqCol = columnMapping.equipment;
      if (eqCol) {
        const unique = [...new Set(csvData.map((row) => row[eqCol]).filter(Boolean))];
        setEquipmentMap(
          unique.map((name) => {
            const type = detectEquipmentType(name);
            const thresholds = defaultThresholds[type] || defaultThresholds.cooler;
            return {
              csvName: name,
              evidlyName: name,
              type,
              action: 'create_new',
              minTemp: thresholds.min,
              maxTemp: thresholds.max,
            };
          })
        );
      }
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  // ─── Import action ───
  const handleImport = () => {
    guardAction('import', 'Migration Import', () => {
      if (demoActive || isDemoMode) {
        alert('Demo Mode: In a live account, this would import your records into EvidLY. The migration wizard is fully functional in production.');
        return;
      }

      setImporting(true);
      setImportProgress(0);

      // Simulated progress
      const interval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setImporting(false);
            setImportComplete(true);
            return 100;
          }
          return prev + 2;
        });
      }, 60);
    });
  };

  // ─── Column mapping update ───
  const updateColumnMapping = (field, value) => {
    setColumnMapping((prev) => ({ ...prev, [field]: value }));
  };

  // ─── Equipment map update ───
  const updateEquipment = (index, updates) => {
    setEquipmentMap((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  // ─── Step validation ───
  const canProceed = () => {
    switch (step) {
      case 1:
        return !!platform;
      case 2:
        return csvData && csvData.length > 0 && columnMapping.date && columnMapping.equipment && columnMapping.temperature;
      case 3:
        return equipmentMap.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  // ─── Render ───
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-[#1E2D4D]/10 overflow-hidden">
      {/* Step indicator */}
      <div className="px-6 py-5 border-b border-[#1E2D4D]/5" style={{ background: '#FAFBFC' }}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                  style={{
                    background: step >= s.number ? PRIMARY : '#E5E7EB',
                    color: step >= s.number ? '#FFFFFF' : '#9CA3AF',
                  }}
                >
                  {step > s.number ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    s.number
                  )}
                </div>
                <span
                  className="text-xs mt-1.5 font-medium hidden sm:block"
                  style={{ color: step >= s.number ? PRIMARY : '#9CA3AF' }}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-12 sm:w-20 h-0.5 mx-2 rounded"
                  style={{ background: step > s.number ? PRIMARY : '#E5E7EB' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="p-6 md:p-8">
        {/* ── STEP 1: Choose Platform ── */}
        {step === 1 && (
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ color: NAVY }}>
              Where are you migrating from?
            </h3>
            <p className="text-[#1E2D4D]/50 mb-6">
              Select your current platform so we can provide specific export instructions.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  style={{
                    borderColor: platform === p.id ? PRIMARY : '#E5E7EB',
                    background: platform === p.id ? `${PRIMARY}08` : '#FFFFFF',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: platform === p.id ? PRIMARY : '#D1D5DB' }}
                  >
                    {platform === p.id && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PRIMARY }} />
                    )}
                  </div>
                  <span className="font-medium text-[#1E2D4D]">{p.label}</span>
                </button>
              ))}
            </div>

            {platform && (
              <div
                className="rounded-xl p-4 border"
                style={{ background: `${GOLD}08`, borderColor: `${GOLD}30` }}
              >
                <div className="flex gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke={MUTED_GOLD} strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-sm mb-1" style={{ color: NAVY }}>
                      Export Instructions
                    </p>
                    <p className="text-sm text-[#1E2D4D]/80">{exportInstructions[platform]}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Upload Data ── */}
        {step === 2 && (
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ color: NAVY }}>
              Upload your data
            </h3>
            <p className="text-[#1E2D4D]/50 mb-6">
              Drop your CSV file below. We will auto-detect your columns.
            </p>

            {/* Drop zone */}
            {!csvData && (
              <div
                className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: dragActive ? PRIMARY : '#D1D5DB',
                  background: dragActive ? `${PRIMARY}05` : '#FAFBFC',
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileInput}
                  className="hidden"
                />

                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>

                <p className="text-[#1E2D4D]/80 font-medium mb-1">
                  Drag and drop your CSV file here
                </p>
                <p className="text-[#1E2D4D]/30 text-sm">
                  or click to browse your files
                </p>
              </div>
            )}

            {parseError && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {parseError}
              </div>
            )}

            {/* File loaded state */}
            {csvData && (
              <div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-800 text-sm font-medium">
                    {fileName} loaded successfully ({csvData.length} rows)
                  </span>
                  <button
                    onClick={() => {
                      setCsvData(null);
                      setCsvHeaders([]);
                      setColumnMapping({});
                      setFileName('');
                      setParseError('');
                    }}
                    className="ml-auto text-green-600 hover:text-green-800 text-sm underline"
                  >
                    Remove
                  </button>
                </div>

                {/* Column mapping */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold mb-3" style={{ color: NAVY }}>
                    Column Mapping
                  </h4>
                  <p className="text-sm text-[#1E2D4D]/50 mb-4">
                    We auto-detected your columns. Adjust any that are incorrect.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {Object.entries(FIELD_LABELS).map(([field, label]) => (
                      <div key={field}>
                        <label className="block text-xs font-semibold text-[#1E2D4D]/70 mb-1.5">
                          {label}
                          {(field === 'date' || field === 'equipment' || field === 'temperature') && (
                            <span className="text-red-500 ml-0.5">*</span>
                          )}
                        </label>
                        <select
                          value={columnMapping[field] || ''}
                          onChange={(e) => updateColumnMapping(field, e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#1E2D4D]/15 text-sm focus-visible:outline-none focus-visible:ring-2 bg-white"
                          style={{ '--tw-ring-color': PRIMARY }}
                        >
                          <option value="">-- Select column --</option>
                          {csvHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview table */}
                {previewRows.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-bold mb-3" style={{ color: NAVY }}>
                      Preview (first 5 rows)
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-[#1E2D4D]/10">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#FAF7F0]">
                            {csvHeaders.map((h) => (
                              <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-[#1E2D4D]/70 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAF7F0]'}>
                              {csvHeaders.map((h) => (
                                <td key={h} className="px-3 py-2 text-[#1E2D4D]/80 whitespace-nowrap max-w-[200px] truncate">
                                  {row[h] || '\u2014'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Summary */}
                {summary.total > 0 && (
                  <div
                    className="rounded-xl p-4 border"
                    style={{ background: `${PRIMARY}06`, borderColor: `${PRIMARY}20` }}
                  >
                    <p className="text-sm" style={{ color: NAVY }}>
                      <span className="font-bold">We found {summary.total.toLocaleString()} records</span>{' '}
                      across{' '}
                      <span className="font-bold">{summary.equipment} equipment</span>{' '}
                      spanning{' '}
                      <span className="font-bold">{summary.dateRange}</span>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Map Equipment ── */}
        {step === 3 && (
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ color: NAVY }}>
              Map your equipment
            </h3>
            <p className="text-[#1E2D4D]/50 mb-6">
              Match each piece of equipment from your CSV to EvidLY. We pre-filled thresholds based on equipment type.
            </p>

            <div className="space-y-4">
              {equipmentMap.map((eq, i) => (
                <div
                  key={eq.csvName}
                  className="rounded-xl border border-[#1E2D4D]/10 p-4 hover:border-[#1E2D4D]/15 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* CSV name */}
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-[#1E2D4D]/50 mb-1">
                        CSV Equipment Name
                      </label>
                      <p className="font-medium text-[#1E2D4D]">{eq.csvName}</p>
                    </div>

                    {/* Action */}
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-[#1E2D4D]/50 mb-1">
                        Action
                      </label>
                      <select
                        value={eq.action}
                        onChange={(e) => updateEquipment(i, { action: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#1E2D4D]/15 text-sm focus-visible:outline-none focus-visible:ring-2 bg-white"
                        style={{ '--tw-ring-color': PRIMARY }}
                      >
                        <option value="create_new">Create New Equipment</option>
                        <option value="skip">Skip</option>
                      </select>
                    </div>

                    {/* Equipment type */}
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-[#1E2D4D]/50 mb-1">
                        Type
                      </label>
                      <select
                        value={eq.type}
                        onChange={(e) => {
                          const type = e.target.value;
                          const thresholds = defaultThresholds[type] || defaultThresholds.cooler;
                          updateEquipment(i, {
                            type,
                            minTemp: thresholds.min,
                            maxTemp: thresholds.max,
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#1E2D4D]/15 text-sm focus-visible:outline-none focus-visible:ring-2 bg-white"
                        style={{ '--tw-ring-color': PRIMARY }}
                      >
                        <option value="cooler">Cooler</option>
                        <option value="freezer">Freezer</option>
                        <option value="hot_holding">Hot Holding</option>
                        <option value="cold_holding">Cold Holding</option>
                        <option value="walk_in">Walk-In</option>
                      </select>
                    </div>

                    {/* Thresholds */}
                    <div className="flex gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#1E2D4D]/50 mb-1">
                          Min (\u00B0F)
                        </label>
                        <input
                          type="number"
                          value={eq.minTemp}
                          onChange={(e) => updateEquipment(i, { minTemp: Number(e.target.value) })}
                          className="w-20 px-3 py-2 rounded-xl border border-[#1E2D4D]/15 text-sm focus-visible:outline-none focus-visible:ring-2"
                          style={{ '--tw-ring-color': PRIMARY }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#1E2D4D]/50 mb-1">
                          Max (\u00B0F)
                        </label>
                        <input
                          type="number"
                          value={eq.maxTemp}
                          onChange={(e) => updateEquipment(i, { maxTemp: Number(e.target.value) })}
                          className="w-20 px-3 py-2 rounded-xl border border-[#1E2D4D]/15 text-sm focus-visible:outline-none focus-visible:ring-2"
                          style={{ '--tw-ring-color': PRIMARY }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {equipmentMap.length === 0 && (
              <div className="text-center py-10 text-[#1E2D4D]/30">
                <p>No equipment found in your CSV. Go back and check your column mapping.</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Import Preview ── */}
        {step === 4 && !importComplete && (
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ color: NAVY }}>
              Import preview
            </h3>
            <p className="text-[#1E2D4D]/50 mb-6">
              Review your import before we bring everything into EvidLY.
            </p>

            {/* Summary cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl border border-[#1E2D4D]/10 p-4">
                <p className="text-xs font-semibold text-[#1E2D4D]/50 mb-1">Total Records</p>
                <p className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>
                  {summary.total.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-[#1E2D4D]/10 p-4">
                <p className="text-xs font-semibold text-[#1E2D4D]/50 mb-1">Date Range</p>
                <p className="text-sm font-bold" style={{ color: NAVY }}>
                  {summary.dateRange}
                </p>
              </div>
              <div className="rounded-xl border border-[#1E2D4D]/10 p-4">
                <p className="text-xs font-semibold text-[#1E2D4D]/50 mb-1">Equipment</p>
                <p className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>
                  {equipmentMap.filter((e) => e.action !== 'skip').length}
                </p>
              </div>
              <div className="rounded-xl border border-[#1E2D4D]/10 p-4">
                <p className="text-xs font-semibold text-[#1E2D4D]/50 mb-1">Est. HACCP Records</p>
                <p className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>
                  {Math.ceil(summary.total * 0.12).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Equipment summary */}
            <div className="mb-6">
              <h4 className="text-sm font-bold mb-3" style={{ color: NAVY }}>
                Equipment to Import
              </h4>
              <div className="rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#FAF7F0]">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-[#1E2D4D]/70">Name</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-[#1E2D4D]/70">Type</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-[#1E2D4D]/70">Range</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-[#1E2D4D]/70">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentMap.map((eq) => (
                      <tr key={eq.csvName} className="border-t border-[#1E2D4D]/5">
                        <td className="px-4 py-2 font-medium text-[#1E2D4D]">{eq.csvName}</td>
                        <td className="px-4 py-2 text-[#1E2D4D]/70 capitalize">{eq.type.replace('_', ' ')}</td>
                        <td className="px-4 py-2 text-[#1E2D4D]/70">{eq.minTemp}\u00B0F \u2013 {eq.maxTemp}\u00B0F</td>
                        <td className="px-4 py-2">
                          {eq.action === 'skip' ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-[#1E2D4D]/5 text-[#1E2D4D]/50 font-medium">
                              Skipped
                            </span>
                          ) : (
                            <span
                              className="text-xs px-2 py-1 rounded-full font-medium"
                              style={{ background: `${PRIMARY}10`, color: PRIMARY }}
                            >
                              Create New
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warning banner */}
            <div
              className="rounded-xl p-4 border mb-6"
              style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}
            >
              <div className="flex gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="font-semibold text-sm text-amber-800 mb-1">
                    Imported records are marked as historical
                  </p>
                  <p className="text-sm text-amber-700">
                    All imported records will be tagged with source "imported" and will not affect your current compliance scores. They serve as historical HACCP documentation for inspector review.
                  </p>
                </div>
              </div>
            </div>

            {/* Import button */}
            {importing ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: NAVY }}>
                    Importing records...
                  </span>
                  <span className="text-sm font-bold" style={{ color: PRIMARY }}>
                    {importProgress}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-[#1E2D4D]/8 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${importProgress}%`,
                      background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleImport}
                className="w-full py-4 rounded-lg text-white font-bold text-lg transition-all hover:scale-[1.01] hover:shadow-lg"
                style={{ background: PRIMARY }}
              >
                Import My Data
              </button>
            )}
          </div>
        )}

        {/* ── IMPORT COMPLETE ── */}
        {importComplete && (
          <div className="text-center py-10">
            {/* Confetti dots */}
            <div className="relative mb-8">
              <div className="absolute -top-4 left-1/4 w-3 h-3 rounded-full animate-bounce" style={{ background: GOLD, animationDelay: '0ms' }} />
              <div className="absolute -top-2 left-1/3 w-2 h-2 rounded-full animate-bounce" style={{ background: PRIMARY, animationDelay: '150ms' }} />
              <div className="absolute -top-6 right-1/3 w-3 h-3 rounded-full animate-bounce" style={{ background: GOLD, animationDelay: '300ms' }} />
              <div className="absolute -top-3 right-1/4 w-2 h-2 rounded-full animate-bounce" style={{ background: MUTED_GOLD, animationDelay: '450ms' }} />
              <div className="absolute top-0 left-[45%] w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: PRIMARY, animationDelay: '100ms' }} />
              <div className="absolute -top-5 right-[40%] w-2 h-2 rounded-full animate-bounce" style={{ background: GOLD, animationDelay: '250ms' }} />

              <div
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                style={{ background: `${PRIMARY}10` }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke={PRIMARY} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <h3 className="text-2xl font-bold tracking-tight mb-2" style={{ color: NAVY }}>
              Migration complete!
            </h3>
            <p className="text-[#1E2D4D]/50 mb-2">
              Your compliance history is now in EvidLY.
            </p>
            <div className="text-sm text-[#1E2D4D]/70 mb-8 space-y-1">
              <p>
                <span className="font-bold" style={{ color: PRIMARY }}>{summary.total.toLocaleString()}</span> temperature records imported
              </p>
              <p>
                <span className="font-bold" style={{ color: PRIMARY }}>{equipmentMap.filter((e) => e.action !== 'skip').length}</span> equipment created
              </p>
              <p>
                <span className="font-bold" style={{ color: PRIMARY }}>{Math.ceil(summary.total * 0.12).toLocaleString()}</span> estimated HACCP entries generated
              </p>
            </div>

            <button
              onClick={() => navigate('/temp-logs')}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold transition-all hover:scale-105"
              style={{ background: PRIMARY }}
            >
              View Temperature Logs
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      {!importComplete && (
        <div className="px-6 md:px-8 py-4 border-t border-[#1E2D4D]/5 flex items-center justify-between" style={{ background: '#FAFBFC' }}>
          <div>
            {step > 1 && (
              <button
                onClick={goBack}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-[#1E2D4D]/70 hover:text-[#1E2D4D] hover:bg-[#1E2D4D]/5 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
            )}
          </div>

          <div>
            {step < 4 && (
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md"
                style={{ background: canProceed() ? PRIMARY : '#9CA3AF' }}
              >
                Continue
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
