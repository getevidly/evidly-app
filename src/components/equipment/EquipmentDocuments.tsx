/**
 * EquipmentDocuments — Document list with upload for an equipment item.
 */
import { useRef } from 'react';
import { FileText, Award, BookOpen, Shield, File, Upload, Download, Plus } from 'lucide-react';
import { useEquipmentDocuments } from '../../hooks/api/useEquipment';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY, MUTED } from '../dashboard/shared/constants';

const DOC_TYPE_META: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  certificate: { icon: Award, label: 'Certificate', color: '#059669' },
  installation: { icon: BookOpen, label: 'Installation Record', color: '#2563EB' },
  warranty: { icon: Shield, label: 'Warranty', color: '#7C3AED' },
  manual: { icon: FileText, label: 'Manual', color: '#D97706' },
  other: { icon: File, label: 'Document', color: '#6B7280' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface EquipmentDocumentsProps {
  equipmentId: string;
}

export function EquipmentDocuments({ equipmentId }: EquipmentDocumentsProps) {
  const { data: documents, isLoading } = useEquipmentDocuments(equipmentId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <div className="h-4 w-48 bg-[#1E2D4D]/8 rounded mb-2" />
            <div className="h-3 w-32 bg-[#1E2D4D]/8 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const items = documents || [];

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    alert('File upload (demo) — requires live backend');
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        className="rounded-xl p-8 text-center cursor-pointer hover:bg-[#FAF7F0] transition-colors"
        style={{ background: CARD_BG, border: `2px dashed ${CARD_BORDER}` }}
        onClick={handleFileSelect}
        onDragOver={e => e.preventDefault()}
        onDrop={handleFileDrop}
      >
        <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: TEXT_TERTIARY }} />
        <p className="text-sm font-medium" style={{ color: NAVY }}>Drop files here or click to upload</p>
        <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>PDF, images, and documents up to 10MB</p>
        <input ref={fileInputRef} type="file" className="hidden" multiple onChange={() => alert('File upload (demo)')} />
      </div>

      {/* Document list */}
      {items.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
          <p className="text-base font-semibold" style={{ color: NAVY }}>Upload equipment documents</p>
          <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>Certificates, warranties, manuals, and installation records.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          {items.map((doc, i) => {
            const meta = DOC_TYPE_META[doc.documentType] || DOC_TYPE_META.other;
            const Icon = meta.icon;
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-[#FAF7F0] transition-colors"
                style={{ borderBottom: i < items.length - 1 ? `1px solid ${CARD_BORDER}` : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${meta.color}12` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: meta.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: NAVY }}>{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs" style={{ color: TEXT_TERTIARY }}>
                      <span>{meta.label}</span>
                      <span>&middot;</span>
                      <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                      <span>&middot;</span>
                      <span>{formatFileSize(doc.sizeBytes)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => alert('Download (demo)')}
                  className="p-2 rounded-lg hover:bg-[#1E2D4D]/5 transition-colors"
                >
                  <Download className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
