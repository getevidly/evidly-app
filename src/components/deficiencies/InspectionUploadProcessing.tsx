import { useState, useEffect } from 'react';
import { FileText, Check, Loader2, X } from 'lucide-react';

interface ProcessingStep {
  label: string;
  status: 'pending' | 'active' | 'done';
}

interface InspectionUploadProcessingProps {
  fileName: string;
  fileSize: number;
  fileType: string;
  elapsedMs: number;
  onCancel: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

export function InspectionUploadProcessing({
  fileName,
  fileSize,
  fileType,
  elapsedMs,
  onCancel,
}: InspectionUploadProcessingProps) {
  const [stepIndex, setStepIndex] = useState(0);

  // Simulate step progression based on elapsed time
  useEffect(() => {
    if (elapsedMs < 3000) setStepIndex(0);
    else if (elapsedMs < 8000) setStepIndex(1);
    else if (elapsedMs < 15000) setStepIndex(2);
    else setStepIndex(3);
  }, [elapsedMs]);

  const steps: ProcessingStep[] = [
    { label: 'Uploading file', status: stepIndex > 0 ? 'done' : stepIndex === 0 ? 'active' : 'pending' },
    { label: 'Extracting text content', status: stepIndex > 1 ? 'done' : stepIndex === 1 ? 'active' : 'pending' },
    { label: 'Identifying deficiencies', status: stepIndex > 2 ? 'done' : stepIndex === 2 ? 'active' : 'pending' },
    { label: 'Preparing review', status: stepIndex > 3 ? 'done' : stepIndex === 3 ? 'active' : 'pending' },
  ];

  const showTimeout = elapsedMs > 90000;

  return (
    <div className="rounded-xl border p-6" style={{ borderColor: '#E2DDD4', backgroundColor: '#FFFFFF' }}>
      {/* File info */}
      <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid #E2DDD4' }}>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: fileType === 'application/pdf' ? '#fee2e2' : '#EEF1F7' }}
        >
          <FileText className="w-5 h-5" style={{ color: fileType === 'application/pdf' ? '#dc2626' : '#3D5068' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#1E2D4D' }}>{fileName}</p>
          <p className="text-xs" style={{ color: '#6B7F96' }}>
            {formatFileSize(fileSize)} · {fileType.split('/').pop()?.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Processing steps */}
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {step.status === 'done' ? (
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#d1fae5' }}>
                  <Check className="w-3.5 h-3.5" style={{ color: '#059669' }} />
                </div>
              ) : step.status === 'active' ? (
                <div className="w-6 h-6 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: '#A08C5A' }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#EEF1F7' }} />
              )}
            </div>
            <span
              className="text-sm"
              style={{
                color: step.status === 'done' ? '#059669' : step.status === 'active' ? '#1E2D4D' : '#94A3B8',
                fontWeight: step.status === 'active' ? 600 : 400,
              }}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Timeout warning */}
      {showTimeout && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px dashed #E2DDD4' }}>
          <p className="text-sm" style={{ color: '#6B7F96' }}>
            Still working... This is taking longer than expected.
          </p>
          <button
            onClick={onCancel}
            className="mt-2 flex items-center gap-1.5 text-sm font-medium hover:underline"
            style={{ color: '#b3261e' }}
          >
            <X className="w-3.5 h-3.5" /> Cancel extraction
          </button>
        </div>
      )}
    </div>
  );
}
