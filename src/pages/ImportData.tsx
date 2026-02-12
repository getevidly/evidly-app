import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { toast } from 'sonner';
import {
  Upload,
  Download,
  Check,
  ArrowLeft,
  Cog,
  Truck,
  Users,
  Thermometer,
  FileText,
  MapPin,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Loader2,
} from 'lucide-react';
import {
  ImportDataType,
  getAllImportSchemas,
  getImportSchema,
  generateTemplateCSV,
} from '../lib/importTemplates';
import { validateImportData, ImportSummary } from '../lib/importValidator';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { Breadcrumb } from '../components/Breadcrumb';

// ---------------------------------------------------------------------------
// Icon map for data type cards
// ---------------------------------------------------------------------------

const DATA_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  equipment: Cog,
  vendors: Truck,
  team: Users,
  temperature_logs: Thermometer,
  documents: FileText,
  locations: MapPin,
};

// ---------------------------------------------------------------------------
// Navigation targets after a successful import
// ---------------------------------------------------------------------------

const IMPORT_NAV_TARGETS: Record<ImportDataType, string> = {
  equipment: '/equipment',
  vendors: '/vendors',
  team: '/team',
  temperature_logs: '/temp-logs',
  documents: '/documents',
  locations: '/settings',
};

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Select Type', 'Upload File', 'Preview', 'Import'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportData() {
  const navigate = useNavigate();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } =
    useDemoGuard();

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [dataType, setDataType] = useState<ImportDataType | null>(null);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [validation, setValidation] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [skipErrors, setSkipErrors] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived
  const schema = dataType ? getImportSchema(dataType) : null;

  const validCount =
    validation
      ? validation.results.filter((r) => r.status !== 'error').length
      : 0;

  // -----------------------------------------------------------------------
  // File handling
  // -----------------------------------------------------------------------

  const handleFile = useCallback(
    (file: File) => {
      if (!dataType) return;

      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('File is too large. Maximum size is 10 MB.');
        return;
      }

      setFileName(file.name);

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            toast.error(`CSV parsing error: ${results.errors[0].message}`);
          }

          const rows = results.data as Record<string, string>[];
          setParsedRows(rows);

          if (rows.length === 0) {
            toast.error('The file contains no data rows.');
            return;
          }

          const summary = validateImportData(dataType, rows);
          setValidation(summary);
          setStep(3);
          toast.success(`Parsed ${rows.length} rows from ${file.name}`);
        },
      });
    },
    [dataType]
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so re-upload of same file triggers onChange
      e.target.value = '';
    },
    [handleFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // -----------------------------------------------------------------------
  // Template download
  // -----------------------------------------------------------------------

  const downloadTemplate = useCallback(() => {
    if (!dataType) return;
    const csv = generateTemplateCSV(dataType);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dataType}_import_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  }, [dataType]);

  // -----------------------------------------------------------------------
  // Import (simulated)
  // -----------------------------------------------------------------------

  const runImport = useCallback(() => {
    if (!validation || !dataType) return;

    // In demo mode, show upgrade prompt
    guardAction('edit', 'bulk data import', () => {
      // Live mode — simulate batch processing
      setImporting(true);
      setImportProgress(0);
      setStep(4);

      const rowsToImport = validation.results.filter(
        (r) => (skipErrors ? r.status !== 'error' : true)
      );
      const totalBatches = Math.ceil(rowsToImport.length / 50);
      let currentBatch = 0;

      const processBatch = () => {
        currentBatch++;
        const progress = Math.min(
          Math.round((currentBatch / totalBatches) * 100),
          100
        );
        setImportProgress(progress);

        if (currentBatch >= totalBatches) {
          // Complete
          const successCount = rowsToImport.filter(
            (r) => r.status !== 'error'
          ).length;
          const failedCount = rowsToImport.length - successCount;

          console.log(
            `[Import] ${dataType}: ${successCount} records imported`
          );

          setImportResult({
            success: successCount,
            failed: failedCount,
            errors: [],
          });
          setImporting(false);
          toast.success(
            `Successfully imported ${successCount} ${dataType} records`
          );
        } else {
          setTimeout(processBatch, 500);
        }
      };

      // Start first batch after short delay
      setTimeout(processBatch, 500);
    });
  }, [validation, dataType, skipErrors, guardAction]);

  // -----------------------------------------------------------------------
  // Navigation helpers
  // -----------------------------------------------------------------------

  const goBack = useCallback(() => {
    if (step === 2) {
      setStep(1);
      setDataType(null);
      setFileName('');
      setParsedRows([]);
      setValidation(null);
    } else if (step === 3) {
      setStep(2);
      setFileName('');
      setParsedRows([]);
      setValidation(null);
    } else if (step === 4 && !importing) {
      setStep(3);
      setImportResult(null);
      setImportProgress(0);
    }
  }, [step, importing]);

  const selectDataType = useCallback((dt: ImportDataType) => {
    setDataType(dt);
    setStep(2);
  }, []);

  // -----------------------------------------------------------------------
  // Render: Step Indicator
  // -----------------------------------------------------------------------

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isCompleted = step > stepNum;
        const isCurrent = step === stepNum;

        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-12 h-0.5 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-[#d4af37] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span
                className={`text-xs whitespace-nowrap ${
                  isCurrent
                    ? 'text-[#1e4d6b] font-semibold'
                    : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // -----------------------------------------------------------------------
  // Render: Step 1 — Select Data Type
  // -----------------------------------------------------------------------

  const renderStep1 = () => {
    const schemas = getAllImportSchemas();

    return (
      <div>
        <h2 className="text-lg font-bold text-[#1e4d6b] mb-1">
          What would you like to import?
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Choose a data type to get started with your CSV import.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schemas.map((s) => {
            const Icon =
              DATA_TYPE_ICONS[s.dataType] || FileText;

            return (
              <button
                key={s.dataType}
                onClick={() => selectDataType(s.dataType)}
                className={`text-left p-5 rounded-xl border bg-white shadow-sm transition-all hover:shadow-md hover:border-[#d4af37] ${
                  dataType === s.dataType
                    ? 'border-[#d4af37] ring-2 ring-[#d4af37]/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-[#eef4f8] flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#1e4d6b]" />
                  </div>
                  <h3 className="font-semibold text-[#1e4d6b]">{s.label}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {s.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Render: Step 2 — Upload File
  // -----------------------------------------------------------------------

  const renderStep2 = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-[#1e4d6b] mb-1">
            Upload {schema?.label} CSV
          </h2>
          <p className="text-sm text-gray-500">
            Upload a CSV file with your {schema?.label?.toLowerCase()} data, or
            download our template first.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1e4d6b] bg-white border border-[#b8d4e8] rounded-lg hover:bg-[#eef4f8] transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {/* Required columns info */}
      {schema && (
        <div className="mb-6 p-4 bg-[#eef4f8] rounded-lg border border-[#b8d4e8]">
          <p className="text-sm font-medium text-[#1e4d6b] mb-2">
            Required columns:
          </p>
          <div className="flex flex-wrap gap-2">
            {schema.columns
              .filter((c) => c.required)
              .map((c) => (
                <span
                  key={c.field}
                  className="px-2 py-0.5 bg-white text-[#1e4d6b] text-xs font-medium rounded border border-[#b8d4e8]"
                >
                  {c.header}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-[#d4af37] bg-[#d4af37]/5'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        <FileUp
          className={`w-12 h-12 mx-auto mb-4 ${
            dragOver ? 'text-[#d4af37]' : 'text-gray-400'
          }`}
        />
        <p className="text-base font-medium text-gray-700 mb-1">
          Drag a CSV file here or click to browse
        </p>
        <p className="text-sm text-gray-400">Accepts .csv files up to 10MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={onFileInputChange}
          className="hidden"
        />
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Render: Step 3 — Preview & Validate
  // -----------------------------------------------------------------------

  const renderStep3 = () => {
    if (!validation || !schema) return null;

    return (
      <div>
        <h2 className="text-lg font-bold text-[#1e4d6b] mb-1">
          Preview &amp; Validate
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Review your data before importing. File: <strong>{fileName}</strong>
        </p>

        {/* Summary bar */}
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
          <span className="text-sm font-medium text-gray-700">
            {validation.total} rows:
          </span>
          <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {validation.valid} valid
          </span>
          <span className="flex items-center gap-1 text-sm text-amber-600 font-medium">
            <AlertTriangle className="w-4 h-4" />
            {validation.warnings} warnings
          </span>
          <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
            <AlertCircle className="w-4 h-4" />
            {validation.errors} errors
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-16">
                    Row
                  </th>
                  {schema.columns.map((col) => (
                    <th
                      key={col.field}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap"
                    >
                      {col.header}
                      {col.required && (
                        <span className="text-red-400 ml-0.5">*</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {validation.results.map((result, idx) => {
                  const row = parsedRows[idx] || {};
                  const bgClass =
                    result.status === 'error'
                      ? 'bg-red-50'
                      : result.status === 'warning'
                      ? 'bg-amber-50'
                      : 'bg-white';
                  const dotColor =
                    result.status === 'error'
                      ? 'bg-red-500'
                      : result.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-green-500';

                  return (
                    <tr key={idx} className={bgClass}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}
                          />
                          <span className="text-xs text-gray-500">
                            {result.row}
                          </span>
                        </div>
                      </td>
                      {schema.columns.map((col) => {
                        const value =
                          row[col.header] ?? row[col.field] ?? '';
                        return (
                          <td
                            key={col.field}
                            className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                            title={value}
                          >
                            {value || (
                              <span className="text-gray-300">--</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Error/warning details per row */}
        {validation.results
          .filter((r) => r.errors.length > 0 || r.warnings.length > 0)
          .map((r) => (
            <div
              key={r.row}
              className="mb-2 px-4 py-2 rounded-lg border border-gray-100 bg-white text-xs"
            >
              <span className="font-medium text-gray-600">Row {r.row}:</span>
              {r.errors.map((err, i) => (
                <span key={`e${i}`} className="ml-2 text-red-600">
                  {err}
                </span>
              ))}
              {r.warnings.map((w, i) => (
                <span key={`w${i}`} className="ml-2 text-amber-600">
                  {w}
                </span>
              ))}
            </div>
          ))}

        {/* Skip errors checkbox + action buttons */}
        <div className="flex items-center justify-between mt-6">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={skipErrors}
              onChange={(e) => setSkipErrors(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#1e4d6b] focus:ring-[#1e4d6b]"
            />
            Skip rows with errors
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={runImport}
              disabled={validCount === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-[#1e4d6b] rounded-lg hover:bg-[#2a6a8f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import{' '}
              {skipErrors
                ? validation.valid + validation.warnings
                : validation.total}{' '}
              Records
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Render: Step 4 — Import Progress / Result
  // -----------------------------------------------------------------------

  const renderStep4 = () => (
    <div>
      <h2 className="text-lg font-bold text-[#1e4d6b] mb-1">
        {importing ? 'Importing...' : 'Import Complete'}
      </h2>

      {importing && (
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-[#d4af37] animate-spin" />
            <span className="text-sm text-gray-600">
              Processing records... {importProgress}%
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#d4af37] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {!importing && importResult && (
        <div className="mt-6">
          <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-[#1e4d6b] mb-2">
              {importResult.success} Records Imported
            </h3>
            {importResult.failed > 0 && (
              <p className="text-sm text-gray-500 mb-1">
                {importResult.failed} rows skipped due to errors
              </p>
            )}
            <p className="text-sm text-gray-500 mb-6">
              Your {schema?.label?.toLowerCase()} data has been successfully
              imported.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setStep(1);
                  setDataType(null);
                  setFileName('');
                  setParsedRows([]);
                  setValidation(null);
                  setImportResult(null);
                  setImportProgress(0);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Import More Data
              </button>
              {dataType && (
                <button
                  onClick={() =>
                    navigate(IMPORT_NAV_TARGETS[dataType] || '/settings')
                  }
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#1e4d6b] rounded-lg hover:bg-[#2a6a8f] transition-colors"
                >
                  View Imported Records
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // -----------------------------------------------------------------------
  // Main Render
  // -----------------------------------------------------------------------

  return (
    <div className="p-0">
      <Breadcrumb
        items={[
          { label: 'Settings', href: '/settings' },
          { label: 'Import Data' },
        ]}
      />

      <div className="p-6">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-[#eef4f8] flex items-center justify-center">
            <Upload className="h-5 w-5 text-[#1e4d6b]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1e4d6b]">
              Bulk Data Import
            </h1>
            <p className="text-sm text-gray-500">
              Import equipment, vendors, team members, and more from CSV files.
            </p>
          </div>
        </div>

        {/* Step indicator */}
        {renderStepIndicator()}

        {/* Back button for steps 2-4 */}
        {step > 1 && step < 4 && (
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e4d6b] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        {step === 4 && !importing && !importResult && (
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e4d6b] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {/* Step content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      {/* Demo upgrade prompt */}
      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
