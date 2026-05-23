import { useState } from 'react';
import { Upload, Paperclip, Clock } from 'lucide-react';
import { InspectionReportDropZone } from './InspectionReportDropZone';

interface InspectionUploadModeTabsProps {
  onFileSelected: (file: File, serviceRecordId?: string) => void;
  disabled?: boolean;
}

type Mode = 'fresh' | 'attach';

export function InspectionUploadModeTabs({ onFileSelected, disabled }: InspectionUploadModeTabsProps) {
  const [mode, setMode] = useState<Mode>('fresh');

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div
        className="inline-flex rounded-lg p-1"
        style={{ backgroundColor: '#EEF1F7' }}
      >
        <button
          onClick={() => setMode('fresh')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'fresh' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
          }`}
          style={{ color: mode === 'fresh' ? '#1E2D4D' : '#6B7F96' }}
        >
          <Upload className="w-4 h-4" />
          Fresh upload
        </button>
        <button
          onClick={() => setMode('attach')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'attach' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
          }`}
          style={{ color: mode === 'attach' ? '#1E2D4D' : '#6B7F96' }}
        >
          <Paperclip className="w-4 h-4" />
          Attach to service
        </button>
      </div>

      {/* Tab content */}
      {mode === 'fresh' ? (
        <InspectionReportDropZone
          onFileSelected={(file) => onFileSelected(file)}
          disabled={disabled}
        />
      ) : (
        /* Attach mode: scaffolded but showing placeholder until
           vendor_service_records relation is confirmed */
        <div
          className="rounded-xl border-2 border-dashed p-10 text-center"
          style={{ borderColor: '#E2DDD4', backgroundColor: '#FAF7F0/30' }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Clock className="w-6 h-6" style={{ color: '#6B7F96' }} />
            </div>
            <h4 className="text-sm font-semibold" style={{ color: '#1E2D4D' }}>
              Attach mode coming soon
            </h4>
            <p className="text-sm max-w-sm" style={{ color: '#6B7F96' }}>
              Link inspection reports directly to service records for automatic
              deficiency association. Switch to fresh upload for now.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
