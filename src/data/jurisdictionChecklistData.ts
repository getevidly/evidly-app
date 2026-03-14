// ══════════════════════════════════════════════════════════════
// Jurisdiction Enforcement Data for Checklists & HACCP
// Maps each demo county to enforcement emphasis areas.
// Used by Checklists.tsx, HACCP.tsx, and AI advisor for
// jurisdiction-aware suggestions.
// ══════════════════════════════════════════════════════════════

export interface EnforcementFocusItem {
  codeSection: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface JurisdictionEnforcementConfig {
  jurisdictionKey: string;
  ehdName: string;
  ahjName: string;
  foodCodeVersion: string;
  enforcementFocus: EnforcementFocusItem[];
  aiContextNote: string;
}

// ── Enforcement configs for the 3 demo counties ─────────────

export const JURISDICTION_ENFORCEMENT: Record<string, JurisdictionEnforcementConfig> = {
  fresno: {
    jurisdictionKey: 'fresno',
    ehdName: 'Fresno County DPH',
    ahjName: 'Fresno County Fire',
    foodCodeVersion: '2022 California Retail Food Code',
    enforcementFocus: [
      { codeSection: '§114002', description: 'Cooling procedures', priority: 'high' },
      { codeSection: '§114059', description: 'Date marking (TCS foods)', priority: 'high' },
      { codeSection: '§114259', description: 'Pest control', priority: 'medium' },
      { codeSection: '§113996', description: 'Cold/hot holding temps', priority: 'medium' },
    ],
    aiContextNote: 'Fresno County DPH emphasizes cooling procedures and date marking as top enforcement priorities. Cooling violations are the leading cause of reinspection in this jurisdiction.',
  },
  merced: {
    jurisdictionKey: 'merced',
    ehdName: 'Merced County DPH',
    ahjName: 'Merced County Fire',
    foodCodeVersion: '2022 California Retail Food Code',
    enforcementFocus: [
      { codeSection: '§113996', description: 'Hot/cold holding temps', priority: 'high' },
      { codeSection: '§113949.2', description: 'Employee health screening', priority: 'high' },
      { codeSection: '§113980', description: 'Receiving temperatures', priority: 'medium' },
      { codeSection: '§114047', description: 'Food storage order', priority: 'medium' },
    ],
    aiContextNote: 'Merced County DPH uses a three-tier rating system and focuses on temperature control (hot/cold holding) and employee health screening as primary enforcement areas.',
  },
  stanislaus: {
    jurisdictionKey: 'stanislaus',
    ehdName: 'Stanislaus County DER',
    ahjName: 'Modesto Fire Dept',
    foodCodeVersion: '2022 California Retail Food Code',
    enforcementFocus: [
      { codeSection: '§113986', description: 'Cross-contamination prevention', priority: 'high' },
      { codeSection: '§113980', description: 'Sanitizer concentration', priority: 'high' },
      { codeSection: '§113953', description: 'Handwashing compliance', priority: 'medium' },
      { codeSection: '§114097', description: 'Food-contact surface sanitation', priority: 'medium' },
    ],
    aiContextNote: 'Stanislaus County DER prioritizes cross-contamination prevention and sanitizer concentration. The jurisdiction has a reinspection requirement when 2 or more major violations are found.',
  },
};

// ── Location → jurisdiction mapping ─────────────────────────

const LOCATION_JURISDICTION_MAP: Record<string, string> = {
  downtown: 'fresno',
  airport: 'merced',
  university: 'stanislaus',
};

export function getJurisdictionForLocation(
  locationId: string,
): JurisdictionEnforcementConfig | null {
  const key = LOCATION_JURISDICTION_MAP[locationId];
  return key ? JURISDICTION_ENFORCEMENT[key] ?? null : null;
}
