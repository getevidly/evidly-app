import { Search, Plus, ArrowLeft, FileText, ExternalLink } from 'lucide-react';
import type { DeficiencyUploadRecord } from '../../hooks/deficiencies/useDeficiencyUpload';

interface ExtractionEmptyStateProps {
  upload: DeficiencyUploadRecord;
  storageUrl: string | null;
  onAddManually: () => void;
  onTryDifferent: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

export function ExtractionEmptyState({ upload, storageUrl, onAddManually, onTryDifferent }: ExtractionEmptyStateProps) {
  return (
    <div className="space-y-5">
      {/* Source file card */}
      <div
        className="rounded-xl border p-4 flex items-center gap-3"
        style={{ borderColor: '#E2DDD4', backgroundColor: '#FFFFFF' }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: upload.file_type === 'application/pdf' ? '#fee2e2' : '#EEF1F7' }}
        >
          <FileText className="w-5 h-5" style={{ color: upload.file_type === 'application/pdf' ? '#dc2626' : '#3D5068' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#1E2D4D' }}>{upload.file_name}</p>
          <p className="text-xs" style={{ color: '#6B7F96' }}>
            {formatFileSize(upload.file_size)} · {upload.file_type.split('/').pop()?.toUpperCase()}
          </p>
        </div>
        {storageUrl && (
          <a
            href={storageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium hover:underline flex-shrink-0"
            style={{ color: '#1E2D4D' }}
          >
            View file <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Empty extraction block */}
      <div
        className="rounded-xl border p-10 text-center"
        style={{ borderColor: '#E2DDD4', backgroundColor: '#FFFFFF' }}
      >
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#EEF1F7' }}
          >
            <Search className="w-7 h-7" style={{ color: '#6B7F96' }} />
          </div>

          <h4 className="text-lg font-semibold" style={{ color: '#1E2D4D' }}>
            No deficiencies found in this report
          </h4>

          <p className="text-sm" style={{ color: '#6B7F96' }}>
            The AI could not identify any code violations in the uploaded document.
            This may happen with reports that contain only passing results, handwritten
            notes, or formats not yet supported.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mt-2">
            <button
              onClick={onAddManually}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#1E2D4D' }}
            >
              <Plus className="w-4 h-4" />
              Add deficiency manually
            </button>
            <button
              onClick={onTryDifferent}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors hover:bg-[#FAF7F0]"
              style={{ borderColor: '#E2DDD4', color: '#3D5068' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Try a different file
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-center" style={{ color: '#94A3B8' }}>
        AI extraction works best with typed inspection reports that include code citations.
        Scanned documents, handwritten notes, and photos of forms may produce fewer results.
        You can always add deficiencies manually.
      </p>
    </div>
  );
}
