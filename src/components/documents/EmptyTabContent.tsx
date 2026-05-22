import { FileText, Upload, Send } from 'lucide-react';
import type { DocumentTabId } from './DocumentsTabs';
import type { OnboardingDocument } from '../../data/onboardingDocuments';

interface EmptyTabContentProps {
  activeTab: DocumentTabId;
  onUpload: () => void;
  onAddVendorDoc: () => void;
  smartEmptyData?: {
    county: string;
    stateAbbr: string;
    requiredDocs: OnboardingDocument[];
  };
}

const TAB_EMPTY: Record<DocumentTabId, { message: string; subtitle?: string; cta: string; icon: 'upload' | 'send' }> = {
  kitchen: {
    message: 'Upload your first kitchen record to get started.',
    cta: 'Upload document',
    icon: 'upload',
  },
  service: {
    message: 'Review your vendors\u2019 service work',
    subtitle: 'EvidLY watches for hood cleaning reports, suppression tests, pest control logs, fire alarm inspections \u2014 and tells you what\u2019s missing.',
    cta: 'Send request',
    icon: 'send',
  },
  business: {
    message: 'Review your vendors\u2019 business compliance',
    subtitle: 'EvidLY identifies COI expirations, flags vendors missing required documents, and alerts you before coverage gaps.',
    cta: 'Send request',
    icon: 'send',
  },
};

export function EmptyTabContent({ activeTab, onUpload, onAddVendorDoc, smartEmptyData }: EmptyTabContentProps) {
  const { message, subtitle, cta, icon } = TAB_EMPTY[activeTab];
  const handler = activeTab === 'kitchen' ? onUpload : onAddVendorDoc;

  // Smart empty state: county-specific required docs grid
  if (smartEmptyData && smartEmptyData.requiredDocs.length > 0) {
    const { county, stateAbbr, requiredDocs } = smartEmptyData;
    return (
      <div
        className="rounded-lg py-8 px-6"
        style={{ backgroundColor: '#FAF7F0', border: '2px dashed #E2DDD4' }}
      >
        {/* Eyebrow */}
        <div
          className="text-[10px] uppercase font-bold mb-2"
          style={{ color: '#B45309', letterSpacing: '0.12em' }}
        >
          PREDICT LAYER {'\u00B7'} {county.toUpperCase()}, {stateAbbr.toUpperCase()}
        </div>

        {/* Heading */}
        <h3 className="text-[16px] font-bold text-[#1E2D4D] mb-1">
          Your county requires {requiredDocs.length} record type{requiredDocs.length !== 1 ? 's' : ''} for this tab
        </h3>

        {/* Subhead */}
        <p className="text-[12px] text-[#6B7F96] mb-5 max-w-lg">
          Here are the required record types for your county.
        </p>

        {/* Required docs grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {requiredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-[#E2DDD4] rounded-lg p-3"
            >
              <div
                className="text-[9px] uppercase font-bold mb-1"
                style={{ color: '#B45309', letterSpacing: '0.12em' }}
              >
                REQUIRED {'\u00B7'} {doc.renewalFrequency}
              </div>
              <div className="text-[13px] font-bold text-[#1E2D4D] mb-1">
                {doc.name}
              </div>
              <p className="text-[11px] text-[#6B7F96] mb-2 line-clamp-2">
                {doc.description}
              </p>
              <button
                type="button"
                onClick={onUpload}
                className="text-[11px] font-bold hover:opacity-80"
                style={{ color: '#B45309' }}
              >
                {'\u2B06'} Upload now {'\u2192'}
              </button>
            </div>
          ))}
        </div>

        {/* Primary action */}
        <button
          type="button"
          onClick={handler}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[13px] font-bold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
        >
          {icon === 'upload' ? <Upload size={14} /> : <Send size={14} />}
          Upload any document
        </button>

        {/* Bottom italic line */}
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid #E2DDD4' }}>
          <p className="text-[11px] text-[#8A93A6] italic">
            A clear, consistent record on day one is the difference between a renewal and a re-inspection.
          </p>
        </div>
      </div>
    );
  }

  // Default generic empty state
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
