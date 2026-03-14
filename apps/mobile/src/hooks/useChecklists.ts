import { useState } from 'react';

interface ChecklistItem {
  id: string;
  template_id: string;
  label: string;
  phase: 'pre_clean' | 'post_clean' | 'final';
  order: number;
  required: boolean;
  type: 'yes_no' | 'text' | 'photo' | 'measurement';
}

interface ChecklistTemplate {
  id: string;
  name: string;
  service_type: string;
  version: number;
  items: ChecklistItem[];
}

interface ChecklistResponse {
  id: string;
  job_id: string;
  template_id: string;
  item_id: string;
  value: string;
  completed_at: string;
  technician_id: string;
}

const DEMO_ITEMS: ChecklistItem[] = [
  { id: 'ci1', template_id: 'ct1', label: 'Verify equipment is powered off and locked out', phase: 'pre_clean', order: 1, required: true, type: 'yes_no' },
  { id: 'ci2', template_id: 'ct1', label: 'Place drop cloths and protective coverings', phase: 'pre_clean', order: 2, required: true, type: 'yes_no' },
  { id: 'ci3', template_id: 'ct1', label: 'Photograph hood interior before cleaning', phase: 'pre_clean', order: 3, required: true, type: 'photo' },
  { id: 'ci4', template_id: 'ct1', label: 'Inspect filters for damage or warping', phase: 'pre_clean', order: 4, required: true, type: 'yes_no' },
  { id: 'ci5', template_id: 'ct1', label: 'Check grease containment and drip trays', phase: 'pre_clean', order: 5, required: true, type: 'yes_no' },
  { id: 'ci6', template_id: 'ct1', label: 'Measure grease depth in accessible duct sections', phase: 'pre_clean', order: 6, required: false, type: 'measurement' },
  { id: 'ci7', template_id: 'ct1', label: 'Note any visible damage to ductwork', phase: 'pre_clean', order: 7, required: true, type: 'text' },
  { id: 'ci8', template_id: 'ct1', label: 'Verify fire suppression system access', phase: 'pre_clean', order: 8, required: true, type: 'yes_no' },
  { id: 'ci9', template_id: 'ct1', label: 'Check fan operation and belt condition', phase: 'pre_clean', order: 9, required: true, type: 'yes_no' },
  { id: 'ci10', template_id: 'ct1', label: 'Document access panel locations', phase: 'pre_clean', order: 10, required: false, type: 'text' },
];

const DEMO_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'ct1',
    name: 'KEC Pre-Clean Inspection',
    service_type: 'KEC',
    version: 3,
    items: DEMO_ITEMS,
  },
];

const DEMO_RESPONSES: ChecklistResponse[] = [];

export function useChecklists() {
  const [templates] = useState<ChecklistTemplate[]>(DEMO_TEMPLATES);
  const [responses] = useState<ChecklistResponse[]>(DEMO_RESPONSES);

  return {
    templates,
    getTemplatesByPhase: (templateId: string, phase: string) =>
      templates
        .find(t => t.id === templateId)
        ?.items.filter(i => i.phase === phase) || [],
    responses,
    saveResponse: async (_response: Omit<ChecklistResponse, 'id'>) => {
      throw new Error('Not implemented in demo mode');
    },
    loading: false,
  };
}
