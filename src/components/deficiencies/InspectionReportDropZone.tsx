import { useState, useRef, useCallback } from 'react';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.heic', '.doc', '.docx'];
const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface InspectionReportDropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function InspectionReportDropZone({ onFileSelected, disabled }: InspectionReportDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const typeOk = ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext);
    if (!typeOk) {
      toast.error(`Unsupported file format: ${ext}`);
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`File exceeds ${MAX_SIZE_MB}MB limit`);
      return false;
    }
    return true;
  }, []);

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      onFileSelected(file);
    }
  }, [validateFile, onFileSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-all ${
        isDragging
          ? 'border-[#1E2D4D] bg-[#1E2D4D]/5'
          : 'border-[#E2DDD4] bg-[#FAF7F0]/50 hover:border-[#1E2D4D]/30'
      } ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm">
          <Download className="w-8 h-8" style={{ color: '#1E2D4D' }} />
        </div>

        <div>
          <h3 className="text-lg font-semibold" style={{ color: '#1E2D4D' }}>
            Drop your inspection report here
          </h3>
          <p className="text-sm mt-1" style={{ color: '#6B7F96' }}>
            or click to browse files
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {['PDF', 'JPG\u00b7PNG\u00b7HEIC', 'DOC\u00b7DOCX'].map(fmt => (
            <span
              key={fmt}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: '#EEF1F7', color: '#3D5068' }}
            >
              {fmt}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: '#1E2D4D' }}
          disabled={disabled}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Browse files
        </button>

        <p className="text-xs" style={{ color: '#94A3B8' }}>
          Maximum file size: {MAX_SIZE_MB}MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}
