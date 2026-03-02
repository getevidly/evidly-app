import { useState, useCallback, useRef } from 'react';
import { X, Upload, Download, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { BULK_CSV_COLUMNS, generateCSVTemplate, type ClientInvitation } from '../../data/serviceProviderDemoData';

// ── Brand colors ───────────────────────────────────────────────
const NAVY = '#1e4d6b';
const NAVY_HOVER = '#163a52';
const GOLD = '#d4af37';

// ── Email regex ────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Types ──────────────────────────────────────────────────────
interface BulkClientImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (invitations: ClientInvitation[]) => void;
  providerName: string;
}

interface ParsedRow {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  role: string;
  service_type: string;
  frequency: string;
  locations: string;
}

interface ValidatedRow extends ParsedRow {
  _status: 'valid' | 'missing_email' | 'invalid_email' | 'missing_required' | 'duplicate';
  _errors: string[];
}

type WizardStep = 1 | 2 | 3;

// ── Component ──────────────────────────────────────────────────
export function BulkClientImport({ isOpen, onClose, onImportComplete, providerName }: BulkClientImportProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [k2cReferral, setK2cReferral] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sendingIndex, setSendingIndex] = useState(0);
  const [sendComplete, setSendComplete] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived counts ─────────────────────────────────────────
  const validRows = rows.filter(r => r._status === 'valid');
  const missingEmailRows = rows.filter(r => r._status === 'missing_email' || r._status === 'invalid_email' || r._status === 'missing_required');
  const duplicateRows = rows.filter(r => r._status === 'duplicate');

  // ── Reset state ────────────────────────────────────────────
  const resetState = useCallback(() => {
    setStep(1);
    setRows([]);
    setK2cReferral(false);
    setProgress(0);
    setSendingIndex(0);
    setSendComplete(false);
    setDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  // ── CSV template download ──────────────────────────────────
  const handleDownloadTemplate = useCallback(() => {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── CSV parsing + validation ───────────────────────────────
  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          toast.error('CSV file is empty or has no data rows');
          return;
        }

        const seenEmails = new Set<string>();
        const validated: ValidatedRow[] = results.data.map((row) => {
          const errors: string[] = [];
          const trimmed: ParsedRow = {
            business_name: (row.business_name || '').trim(),
            contact_name: (row.contact_name || '').trim(),
            email: (row.email || '').trim().toLowerCase(),
            phone: (row.phone || '').trim(),
            role: (row.role || '').trim(),
            service_type: (row.service_type || '').trim(),
            frequency: (row.frequency || '').trim(),
            locations: (row.locations || '').trim(),
          };

          // Check required fields
          if (!trimmed.business_name) errors.push('Missing business name');
          if (!trimmed.contact_name) errors.push('Missing contact name');

          // Check email
          if (!trimmed.email) {
            errors.push('Missing email');
            return { ...trimmed, _status: 'missing_email' as const, _errors: errors };
          }
          if (!EMAIL_RE.test(trimmed.email)) {
            errors.push('Invalid email format');
            return { ...trimmed, _status: 'invalid_email' as const, _errors: errors };
          }

          // Check duplicates
          if (seenEmails.has(trimmed.email)) {
            errors.push('Duplicate email');
            return { ...trimmed, _status: 'duplicate' as const, _errors: errors };
          }
          seenEmails.add(trimmed.email);

          // Missing required (business_name or contact_name)
          if (errors.length > 0) {
            return { ...trimmed, _status: 'missing_required' as const, _errors: errors };
          }

          return { ...trimmed, _status: 'valid' as const, _errors: [] };
        });

        setRows(validated);
        setStep(2);
        toast.success(`Parsed ${validated.length} rows from CSV`);
      },
      error: (err: Error) => {
        toast.error(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, []);

  // ── File handlers ──────────────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  // ── Send invitations (demo simulation) ─────────────────────
  const handleSend = useCallback(() => {
    setStep(3);
    const total = validRows.length;
    let current = 0;

    const interval = setInterval(() => {
      current++;
      setSendingIndex(current);
      setProgress(Math.round((current / total) * 100));

      if (current >= total) {
        clearInterval(interval);
        setSendComplete(true);

        // Build ClientInvitation objects
        const now = new Date().toISOString();
        const invitations: ClientInvitation[] = validRows.map((row, idx) => ({
          id: `bulk-${Date.now()}-${idx}`,
          vendorId: 'v-cpp-1',
          inviteCode: `bulk-inv-${Date.now()}-${idx}`,
          contactName: row.contact_name,
          businessName: row.business_name,
          email: row.email,
          phone: row.phone || null,
          role: row.role || null,
          servicesProvided: row.service_type ? row.service_type.split(',').map(s => s.trim()) : [],
          frequency: row.frequency || null,
          numLocations: parseInt(row.locations, 10) || 1,
          k2cReferral,
          message: null,
          status: 'sent' as const,
          sentAt: now,
          openedAt: null,
          signedUpAt: null,
          reminderCount: 0,
          lastReminderAt: null,
        }));

        onImportComplete(invitations);
        toast.success(`${total} invitations sent successfully`);
      }
    }, Math.max(100, Math.min(600, 3000 / total)));
  }, [validRows, k2cReferral, onImportComplete]);

  // ── Don't render if not open ───────────────────────────────
  if (!isOpen) return null;

  // ── Step indicator ─────────────────────────────────────────
  const stepLabels = ['Upload', 'Preview', 'Send'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* ── Header ───────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between" style={{ backgroundColor: NAVY }}>
          <div>
            <h2 className="text-lg font-semibold text-white">Bulk Invite Clients</h2>
            <p className="text-sm text-white/70 mt-0.5">{providerName}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-white/80" />
          </button>
        </div>

        {/* ── Step Indicator ───────────────────────────────── */}
        <div className="px-6 py-3 flex items-center gap-2 border-b" style={{ borderColor: '#E8EDF5' }}>
          {stepLabels.map((label, i) => {
            const stepNum = (i + 1) as WizardStep;
            const isActive = step === stepNum;
            const isComplete = step > stepNum;
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className="w-8 h-px"
                    style={{ backgroundColor: isComplete ? NAVY : '#D1D9E6' }}
                  />
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{
                      backgroundColor: isActive || isComplete ? NAVY : '#E8EDF5',
                      color: isActive || isComplete ? '#fff' : '#6B7F96',
                    }}
                  >
                    {isComplete ? <CheckCircle size={14} /> : stepNum}
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: isActive ? NAVY : '#6B7F96' }}
                  >
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── STEP 1: Upload ──────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Drop zone */}
              <div
                className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: dragOver ? GOLD : '#D1D9E6',
                  backgroundColor: dragOver ? '#FFFDF5' : '#F9FAFB',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload size={36} className="mx-auto mb-3" style={{ color: dragOver ? GOLD : '#9CA3AF' }} />
                <p className="text-sm font-medium" style={{ color: '#0B1628' }}>
                  Drag & drop your CSV file here
                </p>
                <p className="text-xs mt-1" style={{ color: '#6B7F96' }}>
                  or click to browse (.csv only)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Download template */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 text-sm font-medium transition-colors hover:underline"
                style={{ color: NAVY }}
              >
                <Download size={16} />
                Download Template CSV
              </button>

              {/* Column reference */}
              <div className="rounded-lg p-4" style={{ backgroundColor: '#F4F6FA', border: '1px solid #E8EDF5' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#0B1628' }}>
                  CSV Columns
                </p>
                <div className="space-y-1">
                  {BULK_CSV_COLUMNS.map(col => (
                    <div key={col.header} className="flex items-start gap-2 text-xs">
                      <span
                        className="font-mono px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: col.required ? '#DBEAFE' : '#F3F4F6',
                          color: col.required ? '#1E40AF' : '#6B7F96',
                        }}
                      >
                        {col.header}
                      </span>
                      {col.required && (
                        <span className="text-red-500 text-[10px] font-semibold mt-0.5">REQUIRED</span>
                      )}
                      <span style={{ color: '#3D5068' }}>{col.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Preview & Validate ──────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Summary */}
              <div>
                <p className="text-sm font-semibold mb-3" style={{ color: '#0B1628' }}>
                  Found {rows.length} clients in your CSV:
                </p>
                <div className="space-y-1.5">
                  {validRows.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle size={16} style={{ color: '#16A34A' }} />
                      <span style={{ color: '#0B1628' }}>
                        <strong>{validRows.length}</strong> valid &mdash; ready to invite
                      </span>
                    </div>
                  )}
                  {missingEmailRows.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle size={16} style={{ color: '#D97706' }} />
                      <span style={{ color: '#0B1628' }}>
                        <strong>{missingEmailRows.length}</strong> missing email &mdash; fix required
                      </span>
                    </div>
                  )}
                  {duplicateRows.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle size={16} style={{ color: '#D97706' }} />
                      <span style={{ color: '#0B1628' }}>
                        <strong>{duplicateRows.length}</strong> duplicate emails &mdash; will skip
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Table preview (first 10) */}
              <div className="border rounded-lg overflow-x-auto" style={{ borderColor: '#D1D9E6' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: '#F4F6FA' }}>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: '#3D5068' }}>Status</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: '#3D5068' }}>Business</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: '#3D5068' }}>Contact</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: '#3D5068' }}>Email</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: '#3D5068' }}>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-t"
                        style={{
                          borderColor: '#E8EDF5',
                          backgroundColor: row._status !== 'valid' ? '#FFF7ED' : '#fff',
                        }}
                      >
                        <td className="px-3 py-2">
                          {row._status === 'valid' ? (
                            <CheckCircle size={14} style={{ color: '#16A34A' }} />
                          ) : (
                            <AlertTriangle size={14} style={{ color: '#D97706' }} />
                          )}
                        </td>
                        <td className="px-3 py-2" style={{ color: '#0B1628' }}>{row.business_name || '--'}</td>
                        <td className="px-3 py-2" style={{ color: '#0B1628' }}>{row.contact_name || '--'}</td>
                        <td className="px-3 py-2 font-mono" style={{ color: '#0B1628' }}>{row.email || '--'}</td>
                        <td className="px-3 py-2" style={{ color: '#D97706' }}>
                          {row._errors.length > 0 ? row._errors.join(', ') : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 10 && (
                  <div className="px-3 py-2 text-xs text-center" style={{ color: '#6B7F96', backgroundColor: '#F9FAFB', borderTop: '1px solid #E8EDF5' }}>
                    ...and {rows.length - 10} more rows
                  </div>
                )}
              </div>

              {/* K2C Referral checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none rounded-lg p-3" style={{ backgroundColor: '#F4F6FA', border: '1px solid #E8EDF5' }}>
                <input
                  type="checkbox"
                  checked={k2cReferral}
                  onChange={e => setK2cReferral(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded"
                  style={{ accentColor: GOLD }}
                />
                <div>
                  <span className="text-sm font-medium" style={{ color: '#0B1628' }}>
                    Also count as K2C referrals (12 meals each)
                  </span>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7F96' }}>
                    Each client who signs up through your referral earns 12 meals for Kitchen to Community.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* ── STEP 3: Sending ─────────────────────────────── */}
          {step === 3 && (
            <div className="py-8 flex flex-col items-center justify-center space-y-6">
              {!sendComplete ? (
                <>
                  <Loader2 size={40} className="animate-spin" style={{ color: NAVY }} />
                  <p className="text-sm font-medium" style={{ color: '#0B1628' }}>
                    Sending invitation {sendingIndex} of {validRows.length}...
                  </p>
                  {/* Progress bar */}
                  <div className="w-full max-w-sm h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#E8EDF5' }}>
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{ width: `${progress}%`, backgroundColor: NAVY }}
                    />
                  </div>
                  <p className="text-xs" style={{ color: '#6B7F96' }}>{progress}% complete</p>
                </>
              ) : (
                <>
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#DCFCE7' }}
                  >
                    <CheckCircle size={32} style={{ color: '#16A34A' }} />
                  </div>
                  <p className="text-lg font-semibold" style={{ color: '#0B1628' }}>
                    All {validRows.length} invitations sent!
                  </p>
                  <p className="text-sm" style={{ color: '#6B7F96' }}>
                    Your clients will receive an email invitation to join EvidLY.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div
          className="px-6 py-4 flex items-center justify-between border-t"
          style={{ borderColor: '#E8EDF5' }}
        >
          <div>
            {step === 2 && (
              <button
                type="button"
                onClick={() => { setStep(1); setRows([]); }}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-black/5"
                style={{ color: '#6B7F96' }}
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step !== 3 && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-black/5"
                style={{ color: '#6B7F96' }}
              >
                Cancel
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                onClick={handleSend}
                disabled={validRows.length === 0}
                className="px-5 py-2 rounded-md text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: NAVY }}
                onMouseEnter={e => { if (validRows.length > 0) (e.target as HTMLElement).style.backgroundColor = NAVY_HOVER; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = NAVY; }}
              >
                Send {validRows.length} Invitation{validRows.length !== 1 ? 's' : ''}
              </button>
            )}
            {step === 3 && sendComplete && (
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 rounded-md text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: NAVY }}
                onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = NAVY_HOVER; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = NAVY; }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
