import { FileText, Upload, Send } from 'lucide-react';
import type { DocumentTabId } from './DocumentsTabs';

interface EmptyTabContentProps {
  activeTab: DocumentTabId;
  onUpload: () => void;
}

const TAB_EMPTY: Record<DocumentTabId, { message: string; cta: string; icon: 'upload' | 'request' }> = {
  kitchen: {
    message: 'Upload your first kitchen record to start tracking.',
    cta: 'Upload Document',
    icon: 'upload',
  },
  service: {
    message: 'Request a service record from a vendor.',
    cta: 'Request from vendor',
    icon: 'request',
  },
  business: {
    message: 'Request vendor business records (COI, W-9, etc).',
    cta: 'Request from vendor',
    icon: 'request',
  },
};

export function EmptyTabContent({ activeTab, onUpload }: EmptyTabContentProps) {
  const { message, cta, icon } = TAB_EMPTY[activeTab];

  return (
    <div className="border-2 border-dashed border-[#E2DDD4] rounded-lg py-16 px-6 flex flex-col items-center text-center">
      <FileText size={32} className="text-[#B0B8C8] mb-3" />
      <p className="text-[13px] text-[#8A93A6] mb-4">{message}</p>
      <button
        type="button"
        onClick={onUpload}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[13px] font-bold transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
      >
        {icon === 'upload' ? <Upload size={14} /> : <Send size={14} />}
        {cta}
      </button>
    </div>
  );
}
