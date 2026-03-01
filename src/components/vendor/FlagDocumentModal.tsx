import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { FlagCategory } from '../../types/vendorDocuments';

const NAVY = '#1E2D4D';

const FLAG_CATEGORIES: { value: FlagCategory; label: string }[] = [
  { value: 'wrong_document', label: 'Wrong Document' },
  { value: 'illegible', label: 'Illegible / Poor Quality' },
  { value: 'expired_cert', label: 'Expired Certificate' },
  { value: 'incomplete', label: 'Incomplete / Missing Info' },
  { value: 'other', label: 'Other' },
];

interface FlagDocumentModalProps {
  documentTitle: string;
  vendorName: string;
  onClose: () => void;
  onSubmit: (reason: string, category: string) => void;
}

export function FlagDocumentModal({ documentTitle, vendorName, onClose, onSubmit }: FlagDocumentModalProps) {
  const [category, setCategory] = useState<FlagCategory>('wrong_document');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onSubmit(reason.trim(), category);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #E8EDF5' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} style={{ color: '#DC2626' }} />
              <h3 className="text-lg font-semibold" style={{ color: NAVY }}>Flag Document Issue</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-black/5 transition-colors"
              aria-label="Close"
            >
              <X size={16} style={{ color: '#9CA3AF' }} />
            </button>
          </div>
          <p className="text-sm mt-2" style={{ color: '#3D5068' }}>
            Flag an issue with <strong>{documentTitle}</strong> from {vendorName}. The vendor will be notified to upload a corrected document.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B7F96' }}>
              Issue Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as FlagCategory)}
              className="w-full px-3 py-2 rounded-md text-sm border"
              style={{ borderColor: '#D1D9E6', color: NAVY }}
            >
              {FLAG_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B7F96' }}>
              Describe the Issue <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g., Coverage amount is below our $1M requirement"
              rows={3}
              className="w-full px-3 py-2 rounded-md text-sm border resize-none"
              style={{ borderColor: '#D1D9E6', color: NAVY }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-black/5"
            style={{ color: '#6B7F96' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="px-4 py-2 rounded-md text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#DC2626' }}
          >
            Submit Flag
          </button>
        </div>
      </div>
    </div>
  );
}
