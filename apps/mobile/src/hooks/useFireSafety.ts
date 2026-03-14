import { useState } from 'react';

interface ExtinguisherItem {
  location: string;
  type: string;
  size: string;
  last_inspection: string;
  expiry: string;
  condition: 'good' | 'fair' | 'poor' | 'expired';
  tag_current: boolean;
}

interface FireSafetyData {
  id: string;
  report_id: string;
  suppression_system_type: string;
  suppression_company_name: string;
  suppression_company_phone: string;
  suppression_company_email: string;
  suppression_last_inspection: string;
  suppression_next_due: string;
  suppression_nozzle_caps: boolean;
  suppression_nozzles_clean: boolean;
  suppression_inspection_current: boolean;
  suppression_tag_photo_url: string | null;
  suppression_notes: string | null;
  extinguishers: ExtinguisherItem[];
  extinguisher_company_name: string;
  extinguisher_company_phone: string;
  extinguisher_company_email: string;
  courtesy_report_sent: boolean;
}

const DEMO_FIRE_SAFETY: FireSafetyData[] = [
  {
    id: 'fs1',
    report_id: 'sr1',
    suppression_system_type: 'Ansul R-102',
    suppression_company_name: 'Pacific Fire Protection',
    suppression_company_phone: '(310) 555-0198',
    suppression_company_email: 'service@pacificfire.example.com',
    suppression_last_inspection: '2025-12-15',
    suppression_next_due: '2026-06-15',
    suppression_nozzle_caps: true,
    suppression_nozzles_clean: true,
    suppression_inspection_current: true,
    suppression_tag_photo_url: 'https://placeholder.com/suppression-tag.jpg',
    suppression_notes: 'System in good condition. All nozzles properly aimed at cooking surfaces.',
    extinguishers: [
      {
        location: 'Kitchen entrance - left wall',
        type: 'K-Class',
        size: '6L',
        last_inspection: '2025-11-01',
        expiry: '2026-11-01',
        condition: 'good',
        tag_current: true,
      },
      {
        location: 'Near walk-in cooler',
        type: 'ABC',
        size: '10 lb',
        last_inspection: '2025-06-15',
        expiry: '2026-06-15',
        condition: 'fair',
        tag_current: true,
      },
    ],
    extinguisher_company_name: 'Pacific Fire Protection',
    extinguisher_company_phone: '(310) 555-0198',
    extinguisher_company_email: 'service@pacificfire.example.com',
    courtesy_report_sent: false,
  },
];

export function useFireSafety() {
  const [fireSafety] = useState<FireSafetyData[]>(DEMO_FIRE_SAFETY);

  return {
    fireSafety,
    getByReport: (reportId: string) => fireSafety.find(fs => fs.report_id === reportId) || null,
    saveFireSafety: async (_data: Partial<FireSafetyData>) => {
      throw new Error('Not implemented in demo mode');
    },
    sendCourtesyReport: async (_reportId: string) => {
      throw new Error('Not implemented in demo mode');
    },
    loading: false,
  };
}
