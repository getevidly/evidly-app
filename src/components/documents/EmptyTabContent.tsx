import { FileText, Upload, Send } from 'lucide-react';
import type { DocumentTabId } from './DocumentsTabs';

interface EmptyTabContentProps {
  activeTab: DocumentTabId;
  onUpload: () => void;
  onAddVendorDoc: () => void;
}

const TAB_EMPTY: Record<DocumentTabId, { message: string; subtitle?: string; cta: string; icon: 'upload' | 'send' }> = {
  kitchen: {
    message: 'Upload your first kitchen record to start tracking.',
    cta: 'Upload document',
    icon: 'upload',
  },
  service: {
    message: 'Track your vendors\u2019 service work',
    subtitle: 'EvidLY watches for hood cleaning reports, suppression tests, pest control logs, fire alarm inspections \u2014 and tells you what\u2019s missing.',
    cta: 'Request from vendor',
    icon: 'send',
  },
  business: {
    message: 'Track your vendors\u2019 business compliance',
    subtitle: 'EvidLY requests COIs, W-9s, and licenses directly from your vendors \u2014 and alerts you before coverage gaps.',
    cta: 'Request from vendor',
    icon: 'send',
  },
};

export function EmptyTabContent({ activeTab, onUpload, onAddVendorDoc }: EmptyTabContentProps) {
  const { message, subtitle, cta, icon } = TAB_EMPTY[activeTab];
  const handler = activeTab === 'kitchen' ? onUpload : onAddVendorDoc;

  return (
    <div className="border-2 border-dashed border-[#E2DDD4] rounded-lg py-16 px-6 flex flex-col items-center text-center">
      <FileText size={32} className="text-[#B0B8C8] mb-3" />
      <p className="text-[13px] text-[#8A93A6] mb-2">{message}</p>
      {subtitle && <p className="text-[11px] text-[#8A93A6] mb-4 max-w-md">{subtitle}</p>}
      <button
        type="button"
        onClick={handler}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[13px] font-bold transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
      >
        {icon === 'upload' ? <Upload size={14} /> : <Send size={14} />}
        {cta}
      </button>
    </div>
  );
}
