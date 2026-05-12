import { useState } from 'react';
import { X, Upload, FileText, Download } from 'lucide-react';
import { Modal } from '../../ui/Modal';

/**
 * ImportVendorsModal — Surface 12.
 * CSV/bulk import for vendors.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onImport: (file) => void
 */
export function ImportVendorsModal({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith('.csv') || dropped.name.endsWith('.xlsx'))) {
      setFile(dropped);
    }
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const handleImport = () => {
    onImport?.(file);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setDragOver(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="px-5 pt-5 pb-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#1E2D4D' }}>
            Import vendors
          </h2>
          <button type="button" onClick={handleClose} className="p-1 rounded-md hover:bg-[#F4F1EA]">
            <X size={18} style={{ color: '#5A6478' }} />
          </button>
        </div>

        <p className="mb-4" style={{ fontSize: '12px', color: '#5A6478', lineHeight: '1.5' }}>
          Upload a CSV or Excel file with your vendor list. Required columns: Company Name, Email. Optional: Contact Name, Phone, Service Type.
        </p>

        {/* Download template */}
        <button
          type="button"
          className="flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded-md"
          style={{ fontSize: '11px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #E2DDD4' }}
        >
          <Download size={13} />
          Download CSV template
        </button>

        {/* Drop zone */}
        <div
          className="rounded-lg flex flex-col items-center justify-center py-8 transition-colors cursor-pointer"
          style={{
            border: dragOver ? '2px dashed #1E2D4D' : '2px dashed #E2DDD4',
            backgroundColor: dragOver ? '#F4EFE0' : '#FCFBF8',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('vendor-import-file')?.click()}
        >
          <input
            id="vendor-import-file"
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={handleFileSelect}
          />
          {file ? (
            <>
              <FileText size={24} style={{ color: '#1E2D4D', marginBottom: '8px' }} />
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D' }}>
                {file.name}
              </p>
              <p style={{ fontSize: '11px', color: '#5A6478' }}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </>
          ) : (
            <>
              <Upload size={24} style={{ color: '#5A6478', marginBottom: '8px' }} />
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D' }}>
                Drop CSV or Excel file here
              </p>
              <p style={{ fontSize: '11px', color: '#5A6478' }}>
                or click to browse
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-md"
            style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #E2DDD4' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!file}
            className="px-4 py-2 rounded-md flex items-center gap-1.5 transition-opacity"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: '#1E2D4D',
              color: '#FAF7F0',
              opacity: file ? 1 : 0.4,
            }}
          >
            <Upload size={13} />
            Import vendors
          </button>
        </div>
      </div>
    </Modal>
  );
}
