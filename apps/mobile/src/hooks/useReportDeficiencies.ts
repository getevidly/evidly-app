import { useState } from 'react';

interface ReportDeficiency {
  id: string;
  report_id: string;
  system_id: string;
  component: string;
  field: string;
  value: string;
  nfpa_code_id: string | null;
  deficiency_text: string;
  corrective_action: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
}

interface NfpaCode {
  id: string;
  code: string;
  section: string;
  description: string;
  severity_default: 'minor' | 'moderate' | 'major' | 'critical';
  corrective_action_template: string;
}

const NFPA_CODES: NfpaCode[] = [
  {
    id: 'nfpa1',
    code: 'NFPA 96 7.5.2',
    section: 'Access Panels',
    description: 'Access panels shall be provided at each change in direction and at each junction in the duct system.',
    severity_default: 'moderate',
    corrective_action_template: 'Install or repair access panel(s) to ensure code compliance.',
  },
  {
    id: 'nfpa2',
    code: 'NFPA 96 11.4.1',
    section: 'Cleaning Requirements',
    description: 'The entire exhaust system shall be cleaned by a properly trained, qualified, and certified person(s).',
    severity_default: 'major',
    corrective_action_template: 'Schedule deep cleaning to remove grease buildup exceeding acceptable levels.',
  },
  {
    id: 'nfpa3',
    code: 'NFPA 96 11.6.1',
    section: 'Reports',
    description: 'A certificate of performance or inspection report shall be submitted upon completion.',
    severity_default: 'minor',
    corrective_action_template: 'Provide certificate of performance documenting cleaning completion.',
  },
  {
    id: 'nfpa4',
    code: 'NFPA 96 7.8.1',
    section: 'Fan Components',
    description: 'Exhaust fans shall be hinged, supplied with a hinge kit, or otherwise easily accessible for inspection and cleaning.',
    severity_default: 'moderate',
    corrective_action_template: 'Install hinge kit on exhaust fan to allow proper inspection and cleaning access.',
  },
  {
    id: 'nfpa5',
    code: 'NFPA 96 8.1.1',
    section: 'Fire Suppression',
    description: 'Fire-extinguishing equipment shall be installed to protect cooking equipment that produces grease-laden vapors.',
    severity_default: 'critical',
    corrective_action_template: 'Install or repair fire suppression system to protect cooking equipment.',
  },
  {
    id: 'nfpa6',
    code: 'NFPA 96 7.3.1',
    section: 'Filters',
    description: 'Grease removal devices shall be listed and constructed of steel or stainless steel.',
    severity_default: 'moderate',
    corrective_action_template: 'Replace non-compliant filters with listed steel or stainless steel grease removal devices.',
  },
  {
    id: 'nfpa7',
    code: 'NFPA 96 14.7.1',
    section: 'Solid Fuel',
    description: 'Solid fuel cooking equipment shall be inspected and cleaned at least monthly.',
    severity_default: 'major',
    corrective_action_template: 'Establish monthly inspection and cleaning schedule for solid fuel cooking equipment.',
  },
];

const DEMO_DEFICIENCIES: ReportDeficiency[] = [
  {
    id: 'rd1',
    report_id: 'sr1',
    system_id: 'sys1',
    component: 'duct_vertical',
    field: 'grease_depth',
    value: 'heavy',
    nfpa_code_id: 'nfpa2',
    deficiency_text: 'Vertical duct section grease depth exceeds 2mm. Grease buildup classified as heavy per NFPA 96 standards.',
    corrective_action: 'Deep cleaning performed. Recommend increasing cleaning frequency from quarterly to monthly for this system.',
    severity: 'major',
  },
  {
    id: 'rd2',
    report_id: 'sr1',
    system_id: 'sys1',
    component: 'access_panel',
    field: 'hinge_condition',
    value: 'damaged',
    nfpa_code_id: 'nfpa1',
    deficiency_text: 'Access panel #2 hinge is damaged and does not seal properly, allowing potential grease migration.',
    corrective_action: 'Hinge replacement recommended. Quote provided to customer for repair.',
    severity: 'moderate',
  },
  {
    id: 'rd3',
    report_id: 'sr1',
    system_id: 'sys2',
    component: 'fan',
    field: 'access',
    value: 'restricted',
    nfpa_code_id: 'nfpa4',
    deficiency_text: 'Roof access restricted by building management. Unable to fully inspect exhaust fan unit.',
    corrective_action: 'Coordinate with building management to schedule roof access for complete fan inspection.',
    severity: 'moderate',
  },
];

export function useReportDeficiencies() {
  const [deficiencies] = useState<ReportDeficiency[]>(DEMO_DEFICIENCIES);
  const [nfpaCodes] = useState<NfpaCode[]>(NFPA_CODES);

  return {
    deficiencies,
    nfpaCodes,
    getByReport: (reportId: string) => deficiencies.filter(d => d.report_id === reportId),
    getBySystem: (systemId: string) => deficiencies.filter(d => d.system_id === systemId),
    addDeficiency: async (_data: Omit<ReportDeficiency, 'id'>) => {
      throw new Error('Not implemented in demo mode');
    },
    removeDeficiency: async (_id: string) => {
      throw new Error('Not implemented in demo mode');
    },
    getNfpaByCode: (code: string) => nfpaCodes.find(n => n.code === code) || null,
    loading: false,
  };
}
