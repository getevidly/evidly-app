import { useState } from 'react';

interface ExtinguisherItem {
  id: string;
  location: string;
  type: string;
  size: string;
  last_inspection: string;
  expiry: string;
  condition: 'good' | 'fair' | 'poor';
  tag_current: boolean;
}

interface FireSafetyData {
  id: string;
  report_id: string;
  suppression_system_type: string | null;
  suppression_company_name: string | null;
  suppression_company_phone: string | null;
  suppression_company_email: string | null;
  suppression_last_inspection: string | null;
  suppression_next_due: string | null;
  suppression_nozzle_caps: string;
  suppression_nozzles_clean: string;
  suppression_inspection_current: string;
  suppression_tag_photo_url: string | null;
  suppression_notes: string | null;
  extinguishers: ExtinguisherItem[];
  extinguisher_company_name: string | null;
  extinguisher_company_phone: string | null;
  extinguisher_company_email: string | null;
  courtesy_report_sent: boolean;
  courtesy_report_sent_at: string | null;
}

const DEMO_FIRE_SAFETY: FireSafetyData = {
  id: 'fs1',
  report_id: 'sr1',
  suppression_system_type: 'Ansul R-102',
  suppression_company_name: 'Valley Fire Protection',
  suppression_company_phone: '(209) 555-0142',
  suppression_company_email: 'service@valleyfire.com',
  suppression_last_inspection: '2025-09-15',
  suppression_next_due: '2026-03-15',
  suppression_nozzle_caps: 'Yes',
  suppression_nozzles_clean: 'Yes',
  suppression_inspection_current: 'No',
  suppression_tag_photo_url: null,
  suppression_notes: 'Semi-annual inspection overdue by 2 weeks',
  extinguishers: [
    { id: 'ext1', location: 'East Wall — Cookline', type: 'K-Class', size: '6 lb', last_inspection: '2025-11-01', expiry: '2026-11-01', condition: 'good', tag_current: true },
    { id: 'ext2', location: 'West Wall — Cookline', type: 'K-Class', size: '6 lb', last_inspection: '2024-06-15', expiry: '2025-06-15', condition: 'fair', tag_current: false },
  ],
  extinguisher_company_name: 'Central Valley Extinguisher Co.',
  extinguisher_company_phone: '(209) 555-0198',
  extinguisher_company_email: 'info@cvextinguisher.com',
  courtesy_report_sent: false,
  courtesy_report_sent_at: null,
};

export function useFireSafety(reportId: string) {
  const [data] = useState<FireSafetyData>(DEMO_FIRE_SAFETY);
  return {
    fireSafety: data,
    loading: false,
    error: null,
  };
}

export function useUpdateFireSafety(reportId: string) {
  return {
    updateFireSafety: async (_data: Partial<FireSafetyData>) => { throw new Error('Not implemented in demo mode'); },
    addExtinguisher: async (_ext: Omit<ExtinguisherItem, 'id'>) => { throw new Error('Not implemented in demo mode'); },
    removeExtinguisher: async (_extId: string) => { throw new Error('Not implemented in demo mode'); },
    loading: false,
  };
}

export function useSendCourtesyReport(reportId: string) {
  return {
    sendCourtesyReport: async () => { throw new Error('Not implemented in demo mode'); },
    loading: false,
    sent: false,
  };
}
