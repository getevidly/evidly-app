import { useState } from 'react';
import { FileText, Upload, Send } from 'lucide-react';
import type { DocumentTabId } from './DocumentsTabs';
import {
  CA_REQUIRED_RECORDS,
  TAB_TO_CA_SUBTAB,
  getCARecordsForTab,
  type RequiredRecord,
} from '../../data/caRequiredRecords';

interface EmptyTabContentProps {
  activeTab: DocumentTabId;
  onUpload: (typeHint?: string) => void;
  onAddVendorDoc: () => void;
  stateCode: string | null;
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

type SubTabKey = RequiredRecord['tab'];

const SUB_TABS: { key: SubTabKey; label: string; count: number }[] = [
  { key: 'kitchen_employee', label: 'Kitchen & Employee', count: getCARecordsForTab('kitchen_employee').length },
  { key: 'vendor_service', label: 'Vendor Service Records', count: getCARecordsForTab('vendor_service').length },
  { key: 'vendor_business', label: 'Vendor Business Info', count: getCARecordsForTab('vendor_business').length },
];

export function EmptyTabContent({ activeTab, onUpload, onAddVendorDoc, stateCode }: EmptyTabContentProps) {
  const { message, subtitle, cta, icon } = TAB_EMPTY[activeTab];
  const handler = activeTab === 'kitchen' ? () => onUpload() : onAddVendorDoc;

  // Default sub-tab matches the main tab the user is currently viewing
  const defaultSubTab = TAB_TO_CA_SUBTAB[activeTab] || 'kitchen_employee';
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>(defaultSubTab);

  // CA smart empty state
  if (stateCode === 'CA') {
    const records = getCARecordsForTab(activeSubTab);

    return (
      <div className="py-8 flex flex-col items-center text-center">
        {/* Eyebrow */}
        <div
          className="uppercase mb-2"
          style={{
            color: '#B45309',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.12em',
          }}
        >
          REQUIRED RECORDS {'\u00B7'} CALIFORNIA
        </div>

        {/* Heading */}
        <h3
          className="mb-2"
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
            fontSize: '20px',
            color: '#1E2D4D',
          }}
        >
          California kitchens commonly need these records
        </h3>

        {/* Subhead */}
        <p
          className="mb-6"
          style={{
            color: '#8A93A6',
            fontSize: '13px',
            maxWidth: '480px',
          }}
        >
          Here&rsquo;s a starting checklist for any CA commercial kitchen. Upload what
          you have. We&rsquo;ll identify renewal dates and what&rsquo;s missing as you go.
        </p>

        {/* Sub-tab nav */}
        <div
          className="inline-flex mb-6"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            padding: '4px',
            border: '1px solid #E2DDD4',
          }}
        >
          {SUB_TABS.map((st) => {
            const active = activeSubTab === st.key;
            return (
              <button
                key={st.key}
                type="button"
                onClick={() => setActiveSubTab(st.key)}
                className="px-3 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer border-none"
                style={{
                  borderRadius: '6px',
                  backgroundColor: active ? '#1E2D4D' : 'transparent',
                  color: active ? '#FAF7F0' : '#8A93A6',
                }}
              >
                {st.label} ({st.count})
              </button>
            );
          })}
        </div>

        {/* Suggestion grid */}
        <div
          className="grid gap-3 w-full mb-6"
          style={{ maxWidth: '900px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
        >
          {records.map((rec) => (
            <button
              key={rec.id}
              type="button"
              onClick={() => onUpload(rec.id)}
              className="bg-white text-left p-4 transition-all cursor-pointer group"
              style={{
                borderRadius: '8px',
                border: '1px solid #E2DDD4',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#1E2D4D';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(30,45,77,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#E2DDD4';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              {/* Card eyebrow */}
              <div
                className="uppercase mb-1.5"
                style={{
                  color: '#B45309',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                {rec.regulatory_basis}
              </div>

              {/* Card title */}
              <div
                className="mb-1"
                style={{ color: '#1E2D4D', fontWeight: 700, fontSize: '14px' }}
              >
                {rec.display_name}
              </div>

              {/* Card body */}
              <p
                className="mb-3"
                style={{ color: '#8A93A6', fontSize: '12px' }}
              >
                {rec.short_description}
              </p>

              {/* Footer link */}
              <span
                style={{ color: '#1E2D4D', fontWeight: 600, fontSize: '12px' }}
              >
                {'\u2B06'} Upload now {'\u2192'}
              </span>
            </button>
          ))}
        </div>

        {/* Primary action button */}
        <button
          type="button"
          onClick={() => onUpload()}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-md text-[13px] font-bold transition-opacity hover:opacity-90 mb-5"
          style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
        >
          <Upload size={14} />
          {'\u2B06'} Upload any document
        </button>

        {/* Disclaimer */}
        <p
          className="mb-4"
          style={{
            maxWidth: '720px',
            color: '#8A93A6',
            fontSize: '11px',
            lineHeight: 1.5,
          }}
        >
          Common required records for California commercial kitchens. Specific
          requirements vary by county and city &mdash; confirm with your local jurisdiction.
        </p>

        {/* Why line */}
        <p
          className="italic"
          style={{
            maxWidth: '560px',
            color: '#8A93A6',
            fontSize: '12px',
            borderTop: '1px solid #E2DDD4',
            paddingTop: '20px',
            marginTop: '16px',
          }}
        >
          A clear, consistent record on day one is the difference between a renewal
          and a re-inspection.
        </p>
      </div>
    );
  }

  // Default generic empty state (non-CA or no state)
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
