// Re-export scoring engine as single source of truth
import {
  INDUSTRY_WEIGHTS as ENGINE_WEIGHTS,
  DEFAULT_WEIGHTS,
  getScoreColor,
  getScoreStatus,
  getScoreInfo,
  getGraduatedPenalty,
  computeWeightedOverall,
  type PillarWeights,
  type IndustryVertical,
} from '../lib/complianceScoring';

export { getScoreColor, getScoreStatus, getScoreInfo, getGraduatedPenalty };
export type { PillarWeights, IndustryVertical };

// Re-export for backwards compat — all imports come through here
export const INDUSTRY_WEIGHTS = ENGINE_WEIGHTS;
export const PILLAR_WEIGHTS = DEFAULT_WEIGHTS;

let currentIndustry: IndustryVertical = 'RESTAURANT';
export function setIndustry(industry: IndustryVertical) {
  currentIndustry = industry;
}
export function getWeights(): PillarWeights {
  return INDUSTRY_WEIGHTS[currentIndustry] || PILLAR_WEIGHTS;
}

export function computeOverall(
  scores: { operational: number; equipment: number; documentation: number },
  weights?: PillarWeights,
): number {
  return computeWeightedOverall(scores, weights || getWeights());
}

// Backwards-compatible wrapper — delegates to scoring engine
export const getGrade = (score: number) => getScoreInfo(score);

// ============================================================
// Location Scores — reflect graduated urgency penalties
// ============================================================
// Downtown: Everything current, fire suppression due in 15 days (−3.75 on Equipment)
//   Operational 94, Equipment 88, Documentation 91 → Overall 92
// Airport: Hood cleaning 5 days overdue (−30 Equipment), 1 vendor cert due in 12 days, checklist rate dropped
//   Operational 72, Equipment 62, Documentation 74 → Overall 70
// University: Health permit expired (−25 Docs), 2 food handler certs expired (−10 Docs), equipment overdue
//   Operational 62, Equipment 55, Documentation 42 → Overall 54
// ============================================================

export const locationScores: Record<string, { overall: number; operational: number; equipment: number; documentation: number }> = {
  'downtown': { operational: 94, equipment: 88, documentation: 91, overall: 92 },
  'airport':  { operational: 72, equipment: 62, documentation: 74, overall: 70 },
  'university': { operational: 62, equipment: 55, documentation: 42, overall: 54 },
};

export const locationScoresThirtyDaysAgo: Record<string, { overall: number; operational: number; equipment: number; documentation: number }> = {
  'downtown':   { operational: 90, equipment: 85, documentation: 88, overall: 88 },
  'airport':    { operational: 75, equipment: 76, documentation: 72, overall: 74 },
  'university': { operational: 55, equipment: 58, documentation: 48, overall: 53 },
};

// Company-level scores = average of all location scores
function computeCompanyScores(locScores: Record<string, { overall: number; operational: number; equipment: number; documentation: number }>) {
  const locs = Object.values(locScores);
  const count = locs.length;
  if (count === 0) return { overall: 0, operational: 0, equipment: 0, documentation: 0 };
  return {
    operational: Math.round(locs.reduce((s, l) => s + l.operational, 0) / count),
    equipment: Math.round(locs.reduce((s, l) => s + l.equipment, 0) / count),
    documentation: Math.round(locs.reduce((s, l) => s + l.documentation, 0) / count),
    overall: Math.round(locs.reduce((s, l) => s + l.overall, 0) / count),
  };
}

export const complianceScores = computeCompanyScores(locationScores);
export const complianceScoresThirtyDaysAgo = computeCompanyScores(locationScoresThirtyDaysAgo);

export const getTrend = (current: number, thirtyDaysAgo: number) => {
  const diff = current - thirtyDaysAgo;
  if (diff > 0) return { direction: 'up', color: '#22c55e', icon: '▲', diff: '+' + diff };
  if (diff < 0) return { direction: 'down', color: '#ef4444', icon: '▼', diff: String(diff) };
  return { direction: 'flat', color: '#94a3b8', icon: '—', diff: '0' };
};

export interface Location {
  id: string;
  urlId: string;
  name: string;
  lat: number;
  lng: number;
  score: number;
  status: string;
  actionItems: number;
}

export const locations: Location[] = [
  { id: '1', urlId: 'downtown', name: 'Downtown Kitchen', lat: 36.7378, lng: -119.7871, score: locationScores['downtown'].overall, status: getScoreStatus(locationScores['downtown'].overall), actionItems: 2 },
  { id: '2', urlId: 'airport', name: 'Airport Cafe', lat: 37.2847, lng: -120.5139, score: locationScores['airport'].overall, status: getScoreStatus(locationScores['airport'].overall), actionItems: 5 },
  { id: '3', urlId: 'university', name: 'University Dining', lat: 37.6393, lng: -120.9969, score: locationScores['university'].overall, status: getScoreStatus(locationScores['university'].overall), actionItems: 12 },
];

export interface Vendor {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  serviceType: string;
  lastService: string;
  nextDue: string;
  documentsCount: number;
  status: 'current' | 'overdue' | 'upcoming';
  locationId: string;
}

export const vendors: Vendor[] = [
  // Downtown Kitchen - all current
  {
    id: '1',
    companyName: 'ABC Fire Protection',
    contactName: 'John Smith',
    email: 'john@abcfire.com',
    phone: '(555) 123-4567',
    serviceType: 'Hood Cleaning',
    lastService: '2026-01-15',
    nextDue: '2026-04-15',
    documentsCount: 3,
    status: 'current',
    locationId: '1',
  },
  {
    id: '2',
    companyName: 'Pacific Pest Control',
    contactName: 'Sarah Johnson',
    email: 'sarah@pacificpest.com',
    phone: '(555) 234-5678',
    serviceType: 'Pest Control',
    lastService: '2026-01-28',
    nextDue: '2026-02-28',
    documentsCount: 2,
    status: 'upcoming',
    locationId: '1',
  },
  {
    id: '3',
    companyName: 'Valley Fire Systems',
    contactName: 'Mike Davis',
    email: 'mike@valleyfire.com',
    phone: '(555) 345-6789',
    serviceType: 'Fire Suppression',
    lastService: '2025-12-10',
    nextDue: '2026-02-24',
    documentsCount: 4,
    status: 'upcoming',
    locationId: '1',
  },
  {
    id: '4',
    companyName: 'CleanAir HVAC',
    contactName: 'Lisa Martinez',
    email: 'lisa@cleanairhvac.com',
    phone: '(555) 456-7890',
    serviceType: 'HVAC Service',
    lastService: '2025-11-15',
    nextDue: '2026-05-15',
    documentsCount: 5,
    status: 'current',
    locationId: '1',
  },
  {
    id: '5',
    companyName: 'Grease Masters',
    contactName: 'Tom Wilson',
    email: 'tom@greasemasters.com',
    phone: '(555) 567-8901',
    serviceType: 'Grease Trap',
    lastService: '2026-01-05',
    nextDue: '2026-04-05',
    documentsCount: 2,
    status: 'current',
    locationId: '1',
  },
  // Airport Cafe - mixed status (hood cleaning 5 days overdue)
  {
    id: '6',
    companyName: 'ABC Fire Protection',
    contactName: 'John Smith',
    email: 'john@abcfire.com',
    phone: '(555) 123-4567',
    serviceType: 'Hood Cleaning',
    lastService: '2025-10-04',
    nextDue: '2026-02-04',
    documentsCount: 3,
    status: 'overdue',
    locationId: '2',
  },
  {
    id: '7',
    companyName: 'Pacific Pest Control',
    contactName: 'Sarah Johnson',
    email: 'sarah@pacificpest.com',
    phone: '(555) 234-5678',
    serviceType: 'Pest Control',
    lastService: '2026-02-01',
    nextDue: '2026-03-01',
    documentsCount: 2,
    status: 'upcoming',
    locationId: '2',
  },
  {
    id: '8',
    companyName: 'Valley Fire Systems',
    contactName: 'Mike Davis',
    email: 'mike@valleyfire.com',
    phone: '(555) 345-6789',
    serviceType: 'Fire Suppression',
    lastService: '2026-01-20',
    nextDue: '2026-07-20',
    documentsCount: 4,
    status: 'current',
    locationId: '2',
  },
  {
    id: '9',
    companyName: 'CleanAir HVAC',
    contactName: 'Lisa Martinez',
    email: 'lisa@cleanairhvac.com',
    phone: '(555) 456-7890',
    serviceType: 'HVAC Service',
    lastService: '2025-12-05',
    nextDue: '2026-06-05',
    documentsCount: 5,
    status: 'current',
    locationId: '2',
  },
  {
    id: '10',
    companyName: 'Grease Masters',
    contactName: 'Tom Wilson',
    email: 'tom@greasemasters.com',
    phone: '(555) 567-8901',
    serviceType: 'Grease Trap',
    lastService: '2025-09-20',
    nextDue: '2026-03-20',
    documentsCount: 2,
    status: 'upcoming',
    locationId: '2',
  },
  // University Dining - poor status
  {
    id: '11',
    companyName: 'ABC Fire Protection',
    contactName: 'John Smith',
    email: 'john@abcfire.com',
    phone: '(555) 123-4567',
    serviceType: 'Hood Cleaning',
    lastService: '2025-11-15',
    nextDue: '2026-02-15',
    documentsCount: 3,
    status: 'upcoming',
    locationId: '3',
  },
  {
    id: '12',
    companyName: 'Pacific Pest Control',
    contactName: 'Sarah Johnson',
    email: 'sarah@pacificpest.com',
    phone: '(555) 234-5678',
    serviceType: 'Pest Control',
    lastService: '2025-12-01',
    nextDue: '2026-03-01',
    documentsCount: 2,
    status: 'upcoming',
    locationId: '3',
  },
  {
    id: '13',
    companyName: 'Valley Fire Systems',
    contactName: 'Mike Davis',
    email: 'mike@valleyfire.com',
    phone: '(555) 345-6789',
    serviceType: 'Fire Suppression',
    lastService: '2025-04-10',
    nextDue: '2026-01-10',
    documentsCount: 4,
    status: 'overdue',
    locationId: '3',
  },
  {
    id: '14',
    companyName: 'CleanAir HVAC',
    contactName: 'Lisa Martinez',
    email: 'lisa@cleanairhvac.com',
    phone: '(555) 456-7890',
    serviceType: 'HVAC Service',
    lastService: '2026-01-04',
    nextDue: '2026-04-04',
    documentsCount: 5,
    status: 'current',
    locationId: '3',
  },
  {
    id: '15',
    companyName: 'Grease Masters',
    contactName: 'Tom Wilson',
    email: 'tom@greasemasters.com',
    phone: '(555) 567-8901',
    serviceType: 'Grease Trap',
    lastService: '2025-07-20',
    nextDue: '2026-01-20',
    documentsCount: 2,
    status: 'overdue',
    locationId: '3',
  },
];

export interface Notification {
  id: string;
  title: string;
  time: string;
  link: string;
  type: 'alert' | 'info' | 'success';
  locationId: string;
}

export const notifications: Notification[] = [
  { id: '1', title: 'Hood Cleaning 5 Days Overdue', time: '2h ago', link: '/vendors', type: 'alert', locationId: '2' },
  { id: '2', title: 'Health Permit Renewal Due', time: '5h ago', link: '/documents', type: 'alert', locationId: '1' },
  { id: '3', title: '3 Temperature Checks Missed', time: '1d ago', link: '/temp-logs', type: 'alert', locationId: '3' },
  { id: '4', title: 'Weekly Report Ready', time: '2d ago', link: '/reports', type: 'info', locationId: '1' },
  { id: '5', title: 'Team Member Completed Training', time: '3d ago', link: '/team', type: 'success', locationId: '2' },
];

export interface NeedsAttentionItem {
  id: string;
  title: string;
  detail: string;
  color: 'red' | 'amber' | 'blue';
  url: string;
  roles: string[];
  locationId: string;
}

export const needsAttentionItems: NeedsAttentionItem[] = [
  // Downtown Kitchen - 2 items
  { id: '1', title: '1 Closing Checklist Submitted Late', detail: 'Downtown Kitchen — Feb 4', color: 'amber', url: '/checklists', roles: ['management', 'kitchen'], locationId: '1' },
  { id: '2', title: 'Fire Suppression Due in 15 Days', detail: 'Valley Fire — due Feb 24 (−3.75 pts graduated)', color: 'amber', url: '/vendors', roles: ['management', 'facilities'], locationId: '1' },
  // Airport Cafe - 7 items
  { id: '3', title: '3 Temperature Checks Missed', detail: 'Airport Cafe — missed this week', color: 'red', url: '/temp-logs', roles: ['management', 'kitchen'], locationId: '2' },
  { id: '4', title: 'Opening Checklist Late 2 Days This Week', detail: 'Airport Cafe — Feb 4, Feb 5', color: 'red', url: '/checklists', roles: ['management', 'kitchen'], locationId: '2' },
  { id: '5', title: 'Hood Cleaning 5 Days OVERDUE', detail: 'ABC Fire — was due Feb 4 (−30 pts Equipment)', color: 'red', url: '/vendors', roles: ['management', 'facilities'], locationId: '2' },
  { id: '6', title: 'Grease Trap Service Due Soon', detail: 'Grease Masters — due Mar 20', color: 'amber', url: '/vendors', roles: ['management', 'facilities'], locationId: '2' },
  { id: '7', title: 'Valley Fire COI Expiring in 12 Days', detail: 'Airport Cafe — graduated penalty −7.5 pts', color: 'amber', url: '/documents', roles: ['management', 'facilities'], locationId: '2' },
  { id: '8', title: 'Food Handler Cert Expiring', detail: 'Airport Cafe — expires in 14 days', color: 'amber', url: '/team', roles: ['management', 'kitchen'], locationId: '2' },
  { id: '9', title: 'Pest Control Report Missing', detail: 'Airport Cafe — last visit Feb 1', color: 'amber', url: '/documents', roles: ['management', 'facilities'], locationId: '2' },
  // University Dining - 12 items
  { id: '10', title: '8 Temperature Checks Missed', detail: 'University Dining — missed this week', color: 'red', url: '/temp-logs', roles: ['management', 'kitchen'], locationId: '3' },
  { id: '11', title: 'Opening Checklists Missed 3 Days', detail: 'University Dining — Feb 3, 4, 5', color: 'red', url: '/checklists', roles: ['management', 'kitchen'], locationId: '3' },
  { id: '12', title: 'HACCP Monitoring Overdue', detail: 'University Dining — no logs this month', color: 'red', url: '/haccp', roles: ['management', 'kitchen'], locationId: '3' },
  { id: '13', title: 'Fire Suppression 4 Months Overdue', detail: 'Valley Fire — due Jan 10', color: 'red', url: '/vendors', roles: ['management', 'facilities'], locationId: '3' },
  { id: '14', title: 'Grease Trap 2 Months Overdue', detail: 'Grease Masters — due Jan 20', color: 'red', url: '/vendors', roles: ['management', 'facilities'], locationId: '3' },
  { id: '15', title: 'Hood Cleaning Due in 5 Days', detail: 'ABC Fire — due Feb 15', color: 'amber', url: '/vendors', roles: ['management', 'facilities'], locationId: '3' },
  { id: '16', title: 'Health Permit EXPIRED', detail: 'University Dining — expired Jan 6 (−25 pts Documentation)', color: 'red', url: '/documents', roles: ['management', 'facilities'], locationId: '3' },
  { id: '17', title: '3 Vendor COIs Expired', detail: 'University Dining — action required', color: 'red', url: '/documents', roles: ['management', 'facilities'], locationId: '3' },
  { id: '18', title: '2 Food Handler Certs Expired', detail: 'University Dining — −10 pts Documentation', color: 'red', url: '/team', roles: ['management', 'kitchen'], locationId: '3' },
  { id: '19', title: 'Pest Control Service Due Soon', detail: 'Pacific Pest — due Mar 1', color: 'amber', url: '/vendors', roles: ['management', 'facilities'], locationId: '3' },
];

export interface ScoreImpactItem {
  status: 'current' | 'overdue' | 'expired' | 'due_soon' | 'missing';
  label: string;
  impact: string;
  action: string | null;
  actionLink: string | null;
  pillar: 'Operational' | 'Equipment' | 'Documentation';
  locationId: string;
}

// Sub-component weights (of 100-point pillar):
// Operational: Temp checks 35, Checklists 30, Incidents 20, HACCP 15
// Equipment: Hood cleaning 30, Fire suppression 25, Fire extinguisher 20, Equip maintenance 15, Equip condition 10
// Documentation: Vendor certs 25, Health permit 25, Business license 15, Food handler certs 20, Insurance 15

export const scoreImpactData: ScoreImpactItem[] = [
  // ─── Downtown Kitchen ─── Operational (94/100)
  { status: 'current', label: 'Temperature Logs On Schedule', impact: '+34 of 35', action: null, actionLink: null, pillar: 'Operational', locationId: '1' },
  { status: 'current', label: 'Checklists Complete', impact: '+28 of 30', action: '1 Late Submission', actionLink: '/checklists', pillar: 'Operational', locationId: '1' },
  { status: 'current', label: 'Incident Resolution (<2 hrs)', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Operational', locationId: '1' },
  { status: 'current', label: 'HACCP Monitoring', impact: '+12 of 15', action: null, actionLink: null, pillar: 'Operational', locationId: '1' },

  // ─── Downtown Kitchen ─── Equipment (88/100)
  { status: 'current', label: 'Hood Cleaning', impact: '+30 of 30', action: null, actionLink: null, pillar: 'Equipment', locationId: '1' },
  { status: 'due_soon', label: 'Fire Suppression (due in 15 days, −3.75 graduated)', impact: '+21 of 25', action: 'Schedule Inspection', actionLink: '/vendors', pillar: 'Equipment', locationId: '1' },
  { status: 'current', label: 'Fire Extinguisher', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Equipment', locationId: '1' },
  { status: 'current', label: 'Equipment Maintenance', impact: '+12 of 15', action: null, actionLink: null, pillar: 'Equipment', locationId: '1' },
  { status: 'current', label: 'Equipment Condition', impact: '+5 of 10', action: null, actionLink: null, pillar: 'Equipment', locationId: '1' },

  // ─── Downtown Kitchen ─── Documentation (91/100)
  { status: 'current', label: 'Vendor Certificates (All Current)', impact: '+25 of 25', action: null, actionLink: null, pillar: 'Documentation', locationId: '1' },
  { status: 'current', label: 'Health Permit', impact: '+25 of 25', action: 'Renewal in 60 Days', actionLink: '/documents', pillar: 'Documentation', locationId: '1' },
  { status: 'current', label: 'Business License', impact: '+15 of 15', action: null, actionLink: null, pillar: 'Documentation', locationId: '1' },
  { status: 'due_soon', label: 'Food Handler Certs (1 staff due in 25 days, −1.5 graduated)', impact: '+17 of 20', action: 'View Team Certs', actionLink: '/team', pillar: 'Documentation', locationId: '1' },
  { status: 'current', label: 'Insurance Certificates', impact: '+9 of 15', action: 'Renewal Approaching', actionLink: '/documents', pillar: 'Documentation', locationId: '1' },

  // ─── Airport Cafe ─── Operational (72/100)
  { status: 'overdue', label: 'Temperature Logs (3 missed this week)', impact: '+23 of 35', action: 'Log Now', actionLink: '/temp-logs', pillar: 'Operational', locationId: '2' },
  { status: 'current', label: 'Checklists', impact: '+21 of 30', action: 'Late 2 Days This Week', actionLink: '/checklists', pillar: 'Operational', locationId: '2' },
  { status: 'current', label: 'Incident Resolution (2-12 hrs avg)', impact: '+16 of 20', action: null, actionLink: null, pillar: 'Operational', locationId: '2' },
  { status: 'current', label: 'HACCP Monitoring', impact: '+12 of 15', action: null, actionLink: null, pillar: 'Operational', locationId: '2' },

  // ─── Airport Cafe ─── Equipment (62/100)
  { status: 'overdue', label: 'Hood Cleaning 5 DAYS OVERDUE (−30 full penalty)', impact: '0 of 30', action: 'Contact ABC Fire', actionLink: '/vendors', pillar: 'Equipment', locationId: '2' },
  { status: 'current', label: 'Fire Suppression Inspection', impact: '+25 of 25', action: null, actionLink: null, pillar: 'Equipment', locationId: '2' },
  { status: 'current', label: 'Fire Extinguisher', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Equipment', locationId: '2' },
  { status: 'current', label: 'Equipment Maintenance', impact: '+12 of 15', action: null, actionLink: null, pillar: 'Equipment', locationId: '2' },
  { status: 'current', label: 'Equipment Condition (Good)', impact: '+5 of 10', action: null, actionLink: null, pillar: 'Equipment', locationId: '2' },

  // ─── Airport Cafe ─── Documentation (74/100)
  { status: 'due_soon', label: 'Vendor Cert (1 due in 12 days, −7.5 graduated)', impact: '+18 of 25', action: 'Request Updated COI', actionLink: '/vendors', pillar: 'Documentation', locationId: '2' },
  { status: 'current', label: 'Health Permit', impact: '+25 of 25', action: null, actionLink: null, pillar: 'Documentation', locationId: '2' },
  { status: 'current', label: 'Business License', impact: '+15 of 15', action: null, actionLink: null, pillar: 'Documentation', locationId: '2' },
  { status: 'due_soon', label: 'Food Handler Cert (1 staff due in 14 days, −3 graduated)', impact: '+16 of 20', action: 'View Team Certs', actionLink: '/team', pillar: 'Documentation', locationId: '2' },
  { status: 'missing', label: 'Pest Control Report Missing', impact: '0 of 15', action: 'Request from Vendor', actionLink: '/vendors', pillar: 'Documentation', locationId: '2' },

  // ─── University Dining ─── Operational (62/100)
  { status: 'overdue', label: '8 Temperature Checks Missed This Week', impact: '0 of 35', action: 'Log Now', actionLink: '/temp-logs', pillar: 'Operational', locationId: '3' },
  { status: 'overdue', label: 'Opening Checklists Missed 3 Days', impact: '+10 of 30', action: 'Complete Now', actionLink: '/checklists', pillar: 'Operational', locationId: '3' },
  { status: 'current', label: 'Incident Resolution (24-48 hrs avg)', impact: '+8 of 20', action: null, actionLink: null, pillar: 'Operational', locationId: '3' },
  { status: 'overdue', label: 'HACCP Monitoring Not Done This Month', impact: '0 of 15', action: 'Start HACCP Review', actionLink: '/haccp', pillar: 'Operational', locationId: '3' },

  // ─── University Dining ─── Equipment (55/100)
  { status: 'due_soon', label: 'Hood Cleaning Due in 5 Days (−15 graduated)', impact: '+15 of 30', action: 'Confirm Scheduled', actionLink: '/vendors', pillar: 'Equipment', locationId: '3' },
  { status: 'overdue', label: 'Fire Suppression 4 MONTHS OVERDUE (−25 full penalty)', impact: '0 of 25', action: 'URGENT: Schedule Now', actionLink: '/vendors', pillar: 'Equipment', locationId: '3' },
  { status: 'current', label: 'Fire Extinguisher', impact: '+15 of 20', action: null, actionLink: null, pillar: 'Equipment', locationId: '3' },
  { status: 'overdue', label: 'Grease Trap 2 MONTHS OVERDUE (−15 full penalty)', impact: '0 of 15', action: 'Schedule Service', actionLink: '/vendors', pillar: 'Equipment', locationId: '3' },
  { status: 'current', label: 'Equipment Condition (Fair)', impact: '+6 of 10', action: null, actionLink: null, pillar: 'Equipment', locationId: '3' },

  // ─── University Dining ─── Documentation (42/100)
  { status: 'expired', label: 'Health Permit EXPIRED (−25 full penalty)', impact: '0 of 25', action: 'URGENT: Renew Now', actionLink: '/documents', pillar: 'Documentation', locationId: '3' },
  { status: 'current', label: 'Business License', impact: '+15 of 15', action: null, actionLink: null, pillar: 'Documentation', locationId: '3' },
  { status: 'expired', label: '3 Vendor COIs EXPIRED', impact: '0 of 25', action: 'Request All COIs', actionLink: '/vendors', pillar: 'Documentation', locationId: '3' },
  { status: 'expired', label: '2 Food Handler Certs EXPIRED (−10 full penalty)', impact: '0 of 20', action: 'Notify Staff', actionLink: '/team', pillar: 'Documentation', locationId: '3' },
  { status: 'current', label: 'Insurance Certificate', impact: '+8 of 15', action: null, actionLink: null, pillar: 'Documentation', locationId: '3' },
];
