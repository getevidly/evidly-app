import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  X, Upload, FileText, Loader2,
  ChevronDown, Trash2, Sparkles,
} from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';
import {
  canClassify, classifyDocument, classifyDocumentDemo,
  getConfidenceLevel, getConfidenceColor, getConfidenceIcon,
  PILLAR_OPTIONS, DOCUMENT_TYPE_OPTIONS,
  type ClassificationResult,
} from '../lib/documentClassifier';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClassifiedFile {
  file: File;
  status: 'pending' | 'classifying' | 'classified' | 'error';
  classification: ClassificationResult | null;
  /** User-editable overrides */
  overrides: {
    documentType: string;
    documentLabel: string;
    pillar: string;
    vendorName: string;
    serviceDate: string;
    expiryDate: string;
    notes: string;
  };
  /** Whether user has accepted the AI result (possibly with edits) */
  accepted: boolean;
}

export interface SmartUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user saves the classified documents */
  onSave: (files: ClassifiedFile[]) => void;
  /** Optional: if uploading for a specific onboarding doc, pre-set the type */
  presetDocType?: string;
  presetDocLabel?: string;
  /** Max files allowed (default 10) */
  maxFiles?: number;
  /** Whether batch mode is enabled (default true) */
  batchMode?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CONCURRENT = 3;

const ACCEPT_TYPES = '.pdf,.jpg,.jpeg,.png,.webp';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SmartUploadModal({
  isOpen,
  onClose,
  onSave,
  presetDocType,
  presetDocLabel,
  maxFiles = 10,
  batchMode = true,
}: SmartUploadModalProps) {
  const { isDemoMode } = useDemo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ClassifiedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // -----------------------------------------------------------------------
  // File handling
  // -----------------------------------------------------------------------

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const limit = batchMode ? maxFiles : 1;

    // If not batch mode, replace existing
    const toAdd = fileArray.slice(0, limit);
    if (toAdd.length === 0) return;

    const newEntries: ClassifiedFile[] = toAdd.map((file) => ({
      file,
      status: 'pending' as const,
      classification: null,
      overrides: {
        documentType: presetDocType || '',
        documentLabel: presetDocLabel || '',
        pillar: '',
        vendorName: '',
        serviceDate: '',
        expiryDate: '',
        notes: '',
      },
      accepted: false,
    }));

    const updatedFiles = batchMode
      ? [...files, ...newEntries].slice(0, maxFiles)
      : newEntries;

    setFiles(updatedFiles);

    // Auto-classify all pending files
    classifyFiles(updatedFiles);
  }, [files, batchMode, maxFiles, presetDocType, presetDocLabel]);

  const classifyFiles = async (allFiles: ClassifiedFile[]) => {
    const pending = allFiles.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;

    // Process in batches of MAX_CONCURRENT
    for (let i = 0; i < pending.length; i += MAX_CONCURRENT) {
      const batch = pending.slice(i, i + MAX_CONCURRENT);
      await Promise.all(batch.map((entry) => classifySingleFile(entry.file)));
    }
  };

  const classifySingleFile = async (file: File) => {
    // Mark as classifying
    setFiles((prev) =>
      prev.map((f) =>
        f.file === file ? { ...f, status: 'classifying' as const } : f,
      ),
    );

    const validation = canClassify(file);
    if (!validation.ok) {
      // Can't classify — mark as error and let user fill manually
      setFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? {
                ...f,
                status: 'error' as const,
                classification: {
                  documentType: 'unknown',
                  documentLabel: file.name,
                  pillar: 'unknown',
                  vendorName: null,
                  serviceDate: null,
                  expiryDate: null,
                  confidence: 0,
                  summary: validation.reason || 'Cannot classify this file type',
                  suggestedFields: {},
                },
              }
            : f,
        ),
      );
      return;
    }

    try {
      const result = isDemoMode
        ? await classifyDocumentDemo(file)
        : await classifyDocument(file, async (name, options) => {
            // In live mode, use supabase.functions.invoke
            const { supabase } = await import('../lib/supabase');
            return supabase.functions.invoke(name, options);
          });

      const c = result.classification;

      setFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? {
                ...f,
                status: 'classified' as const,
                classification: c,
                overrides: {
                  documentType: presetDocType || c.documentType,
                  documentLabel: presetDocLabel || c.documentLabel,
                  pillar: c.pillar !== 'unknown' ? c.pillar : '',
                  vendorName: c.vendorName || '',
                  serviceDate: c.serviceDate || '',
                  expiryDate: c.expiryDate || '',
                  notes: '',
                },
              }
            : f,
        ),
      );
    } catch {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? { ...f, status: 'error' as const }
            : f,
        ),
      );
    }
  };

  // -----------------------------------------------------------------------
  // Drag & Drop
  // -----------------------------------------------------------------------

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // -----------------------------------------------------------------------
  // File removal
  // -----------------------------------------------------------------------

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
    else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  // -----------------------------------------------------------------------
  // Override updates
  // -----------------------------------------------------------------------

  const updateOverride = (
    index: number,
    field: keyof ClassifiedFile['overrides'],
    value: string,
  ) => {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, overrides: { ...f.overrides, [field]: value } } : f,
      ),
    );
  };

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------

  const classifiedFiles = files.filter(
    (f) => f.status === 'classified' || f.status === 'error',
  );
  const classifyingFiles = files.filter((f) => f.status === 'classifying');
  const canSave = classifiedFiles.length > 0 && classifyingFiles.length === 0;

  const handleSave = () => {
    const toSave = files.map((f) => ({ ...f, accepted: true }));
    onSave(toSave);
    toast.success(
      `${toSave.length} document${toSave.length > 1 ? 's' : ''} saved`,
    );
    setFiles([]);
    onClose();
  };

  // -----------------------------------------------------------------------
  // Close handler
  // -----------------------------------------------------------------------

  const handleClose = () => {
    setFiles([]);
    setExpandedIndex(null);
    onClose();
  };

  if (!isOpen) return null;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Sparkles size={20} style={{ color: '#d4af37' }} />
            <h2 className="text-lg font-semibold" style={{ color: '#1e4d6b' }}>
              {presetDocLabel ? `Upload: ${presetDocLabel}` : 'Smart Document Upload'}
            </h2>
          </div>
          <button
            className="p-1 rounded hover:bg-gray-100"
            onClick={handleClose}
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Drop zone — always visible if under max files */}
          {files.length < maxFiles && (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-[#1e4d6b] bg-[#eef4f8]' : 'border-[#b8d4e8] hover:border-gray-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload size={28} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">
                Drag &amp; drop or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, JPG, or PNG &middot; Max 10 MB
                {batchMode && ' &middot; Multiple files OK'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_TYPES}
                multiple={batchMode}
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-3">
              {files.map((entry, index) => (
                <FileClassificationCard
                  key={`${entry.file.name}-${index}`}
                  entry={entry}
                  index={index}
                  expanded={expandedIndex === index}
                  onToggle={() =>
                    setExpandedIndex(expandedIndex === index ? null : index)
                  }
                  onRemove={() => removeFile(index)}
                  onUpdateOverride={(field, value) =>
                    updateOverride(index, field, value)
                  }
                  presetDocType={presetDocType}
                />
              ))}
            </div>
          )}

          {/* Batch summary */}
          {files.length > 1 && (
            <div
              className="text-sm rounded-lg p-3"
              style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}
            >
              {classifyingFiles.length > 0 && (
                <span>
                  Analyzing {classifyingFiles.length} file
                  {classifyingFiles.length > 1 ? 's' : ''}...{' '}
                </span>
              )}
              {classifiedFiles.length > 0 && (
                <span>
                  {classifiedFiles.length} classified.{' '}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button
            className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: canSave ? '#1e4d6b' : '#3D5068' }}
            onMouseEnter={(e) => {
              if (canSave) e.currentTarget.style.backgroundColor = '#2a6a8f';
            }}
            onMouseLeave={(e) => {
              if (canSave) e.currentTarget.style.backgroundColor = '#1e4d6b';
            }}
            disabled={!canSave}
            onClick={handleSave}
          >
            {classifyingFiles.length > 0
              ? 'Analyzing...'
              : `Save ${classifiedFiles.length > 0 ? classifiedFiles.length : ''} Document${classifiedFiles.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// File Classification Card (per-file)
// ---------------------------------------------------------------------------

function FileClassificationCard({
  entry,
  index,
  expanded,
  onToggle,
  onRemove,
  onUpdateOverride,
  presetDocType,
}: {
  entry: ClassifiedFile;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateOverride: (field: keyof ClassifiedFile['overrides'], value: string) => void;
  presetDocType?: string;
}) {
  const c = entry.classification;
  const confidence = c?.confidence ?? 0;
  const level = getConfidenceLevel(confidence);
  const color = getConfidenceColor(confidence);
  const icon = getConfidenceIcon(confidence);

  // Status-based rendering
  if (entry.status === 'classifying') {
    return (
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <Loader2 size={18} className="animate-spin text-[#1e4d6b]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {entry.file.name}
            </p>
            <p className="text-xs text-gray-500">Analyzing with AI...</p>
          </div>
          <div className="w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                width: '60%',
                background: 'linear-gradient(90deg, #1e4d6b, #d4af37)',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (entry.status === 'pending') {
    return (
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <FileText size={18} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-900 truncate flex-1">
            {entry.file.name}
          </p>
          <span className="text-xs text-gray-400">Queued</span>
        </div>
      </div>
    );
  }

  // Classified or error
  const pillarMeta = PILLAR_OPTIONS.find(
    (p) => p.value === (entry.overrides.pillar || c?.pillar),
  );

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: level === 'high' ? '#86efac' : level === 'medium' ? '#fde68a' : '#fecaca',
      }}
    >
      {/* Summary row */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        {/* Confidence icon */}
        <span className="text-lg flex-shrink-0" title={`${Math.round(confidence * 100)}% confidence`}>
          {entry.status === 'error' ? '❌' : icon}
        </span>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {entry.file.name}
          </p>
          <p className="text-xs text-gray-600 truncate mt-0.5">
            {entry.overrides.documentLabel || c?.documentLabel || 'Unknown'}
            {c?.vendorName && ` \u00B7 ${c.vendorName}`}
          </p>
        </div>

        {/* Pillar badge */}
        {pillarMeta && pillarMeta.value !== 'unknown' && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}
          >
            {pillarMeta.icon} {pillarMeta.label}
          </span>
        )}

        {/* Confidence % */}
        <span
          className="text-xs font-semibold flex-shrink-0"
          style={{ color }}
        >
          {Math.round(confidence * 100)}%
        </span>

        {/* Expand arrow */}
        <ChevronDown
          size={16}
          className={`text-gray-400 flex-shrink-0 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded detail — edit form */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* AI Summary */}
          {c?.summary && (
            <div
              className="text-xs rounded-md p-3"
              style={{ backgroundColor: '#f9fafb', color: '#374151' }}
            >
              <span className="font-medium">AI Summary: </span>
              {c.summary}
            </div>
          )}

          {/* Editable fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Document Type */}
            {!presetDocType && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Document Type
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] bg-white"
                  value={entry.overrides.documentType}
                  onChange={(e) => {
                    onUpdateOverride('documentType', e.target.value);
                    const opt = DOCUMENT_TYPE_OPTIONS.find(
                      (o) => o.value === e.target.value,
                    );
                    if (opt) {
                      onUpdateOverride('documentLabel', opt.label);
                      onUpdateOverride('pillar', opt.pillar);
                    }
                  }}
                >
                  <option value="">Select type...</option>
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Pillar */}
            {!presetDocType && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Compliance Pillar
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] bg-white"
                  value={entry.overrides.pillar}
                  onChange={(e) => onUpdateOverride('pillar', e.target.value)}
                >
                  <option value="">Select pillar...</option>
                  {PILLAR_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.icon} {p.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Vendor */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Vendor Name
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
                placeholder="e.g. Valley Fire Systems"
                value={entry.overrides.vendorName}
                onChange={(e) => onUpdateOverride('vendorName', e.target.value)}
              />
            </div>

            {/* Service Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Service Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
                value={entry.overrides.serviceDate}
                onChange={(e) => onUpdateOverride('serviceDate', e.target.value)}
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Expiry / Due Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
                value={entry.overrides.expiryDate}
                onChange={(e) => onUpdateOverride('expiryDate', e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Notes
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
                placeholder="Optional notes..."
                value={entry.overrides.notes}
                onChange={(e) => onUpdateOverride('notes', e.target.value)}
              />
            </div>
          </div>

          {/* Remove button */}
          <div className="flex justify-end">
            <button
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 transition-colors"
              onClick={onRemove}
            >
              <Trash2 size={12} />
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
