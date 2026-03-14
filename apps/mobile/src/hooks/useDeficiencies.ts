import { useState } from 'react';

interface Deficiency {
  id: string;
  job_id: string;
  component: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  nfpa_code?: string;
  photo_id?: string;
  corrective_action?: string;
  resolved: boolean;
  created_at: string;
}

const DEMO_DEFICIENCIES: Deficiency[] = [
  {
    id: 'd1',
    job_id: 'j1',
    component: 'vertical_duct',
    description: 'Heavy grease buildup exceeding 2mm depth in vertical duct section',
    severity: 'major',
    nfpa_code: 'NFPA 96 11.4.1',
    corrective_action: 'Deep clean scheduled; customer notified of increased frequency recommendation',
    resolved: false,
    created_at: '2026-03-15T09:00:00Z',
  },
  {
    id: 'd2',
    job_id: 'j1',
    component: 'access_panel',
    description: 'Access panel hinge damaged, panel does not seal properly',
    severity: 'moderate',
    nfpa_code: 'NFPA 96 7.5.2',
    corrective_action: 'Hinge replacement recommended; quote provided to customer',
    resolved: false,
    created_at: '2026-03-15T09:15:00Z',
  },
];

export function useDeficiencies() {
  const [deficiencies] = useState<Deficiency[]>(DEMO_DEFICIENCIES);

  return {
    deficiencies,
    addDeficiency: async (_deficiency: Omit<Deficiency, 'id' | 'created_at'>) => {
      throw new Error('Not implemented in demo mode');
    },
    updateDeficiency: async (_id: string, _updates: Partial<Deficiency>) => {
      throw new Error('Not implemented in demo mode');
    },
    getByJob: (jobId: string) => deficiencies.filter(d => d.job_id === jobId),
    loading: false,
  };
}
