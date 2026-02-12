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
  scores: { foodSafety: number; fireSafety: number; vendorCompliance: number },
  weights?: PillarWeights,
): number {
  return computeWeightedOverall(scores, weights || getWeights());
}

// Backwards-compatible wrapper — delegates to scoring engine
export const getGrade = (score: number) => getScoreInfo(score);

// ============================================================
// Location Scores — reflect graduated urgency penalties
// ============================================================
// Weights: Food Safety 45%, Fire Safety 35%, Vendor Compliance 20%
// Downtown: Everything current, fire suppression due in 15 days (−3.75 on Fire Safety)
//   Food Safety 94, Fire Safety 88, Vendor Compliance 91 → Overall 91
// Airport: Hood cleaning 5 days overdue (−30 Fire Safety), 1 vendor cert due in 12 days, checklist rate dropped
//   Food Safety 72, Fire Safety 62, Vendor Compliance 74 → Overall 69
// University: Health permit expired (−25 Vendor), 2 food handler certs expired (−10 Vendor), equipment overdue
//   Food Safety 62, Fire Safety 55, Vendor Compliance 42 → Overall 56
// ============================================================

export const locationScores: Record<string, { overall: number; foodSafety: number; fireSafety: number; vendorCompliance: number }> = {
  'downtown': { foodSafety: 94, fireSafety: 88, vendorCompliance: 91, overall: 91 },
  'airport':  { foodSafety: 72, fireSafety: 62, vendorCompliance: 74, overall: 69 },
  'university': { foodSafety: 62, fireSafety: 55, vendorCompliance: 42, overall: 56 },
};

export const locationScoresThirtyDaysAgo: Record<string, { overall: number; foodSafety: number; fireSafety: number; vendorCompliance: number }> = {
  'downtown':   { foodSafety: 90, fireSafety: 85, vendorCompliance: 88, overall: 88 },
  'airport':    { foodSafety: 75, fireSafety: 76, vendorCompliance: 72, overall: 75 },
  'university': { foodSafety: 55, fireSafety: 58, vendorCompliance: 48, overall: 55 },
};

// Company-level scores = average of all location scores
function computeCompanyScores(locScores: Record<string, { overall: number; foodSafety: number; fireSafety: number; vendorCompliance: number }>) {
  const locs = Object.values(locScores);
  const count = locs.length;
  if (count === 0) return { overall: 0, foodSafety: 0, fireSafety: 0, vendorCompliance: 0 };
  return {
    foodSafety: Math.round(locs.reduce((s, l) => s + l.foodSafety, 0) / count),
    fireSafety: Math.round(locs.reduce((s, l) => s + l.fireSafety, 0) / count),
    vendorCompliance: Math.round(locs.reduce((s, l) => s + l.vendorCompliance, 0) / count),
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
  pillar: 'Food Safety' | 'Fire Safety' | 'Vendor Compliance';
  locationId: string;
}

// Sub-component weights (of 100-point pillar):
// Operational: Temp checks 35, Checklists 30, Incidents 20, HACCP 15
// Equipment: Hood cleaning 30, Fire suppression 25, Fire extinguisher 20, Equip maintenance 15, Equip condition 10
// Documentation: Vendor certs 25, Health permit 25, Business license 15, Food handler certs 20, Insurance 15

export const scoreImpactData: ScoreImpactItem[] = [
  // ─── Downtown Kitchen ─── Operational (94/100)
  { status: 'current', label: 'Temperature Logs On Schedule', impact: '+34 of 35', action: null, actionLink: null, pillar: 'Food Safety', locationId: '1' },
  { status: 'current', label: 'Checklists Complete', impact: '+28 of 30', action: '1 Late Submission', actionLink: '/checklists', pillar: 'Food Safety', locationId: '1' },
  { status: 'current', label: 'Incident Resolution (<2 hrs)', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Food Safety', locationId: '1' },
  { status: 'current', label: 'HACCP Monitoring', impact: '+12 of 15', action: null, actionLink: null, pillar: 'Food Safety', locationId: '1' },

  // ─── Downtown Kitchen ─── Equipment (88/100)
  { status: 'current', label: 'Hood Cleaning', impact: '+30 of 30', action: null, actionLink: null, pillar: 'Fire Safety', locationId: '1' },
  { status: 'due_soon', label: 'Fire Suppression (due in 15 days, −3.75 graduated)', impact: '+21 of 25', action: 'Schedule Inspection', actionLink: '/vendors', pillar: 'Fire Safety', locationId: '1' },
  { status: 'current', label: 'Fire Extinguisher', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Fire Safety', locationId: '1' },
  { status: 'current', label: 'Equipment Maintenance', impact: '+12 of 15', action: null, actionLink: null, pillar: 'Fire Safety', locationId: '1' },
  { status: 'current', label: 'Equipment Condition', impact: '+5 of 10', action: null, actionLink: null, pillar: 'Fire Safety', locationId: '1' },

  // ─── Downtown Kitchen ─── Documentation (91/100)
  { status: 'current', label: 'Vendor Certificates (All Current)', impact: '+25 of 25', action: null, actionLink: null, pillar: 'Vendor Compliance', locationId: '1' },
  { status: 'current', label: 'Health Permit', impact: '+25 of 25', action: 'Renewal in 60 Days', actionLink: '/documents', pillar: 'Vendor Compliance', locationId: '1' },
  { status: 'current', label: 'Business License', impact: '+15 of 15', action: null, actionLink: null, pillar: 'Vendor Compliance', locationId: '1' },
  { status: 'due_soon', label: 'Food Handler Certs (1 staff due in 25 days, −1.5 graduated)', impact: '+17 of 20', action: 'View Team Certs', actionLink: '/team', pillar: 'Vendor Compliance', locationId: '1' },
  { status: 'current', label: 'Insurance Certificates', impact: '+9 of 15', action: 'Renewal Approaching', actionLink: '/documents', pillar: 'Vendor Compliance', locationId: '1' },

  // ─── Airport Cafe ─── Operational (72/100)
  { status: 'overdue', label: 'Temperature Logs (3 missed this week)', impact: '+23 of 35', action: 'Log Now', actionLink: '/temp-logs', pillar: 'Food Safety', locationId: '2' },
  { status: 'current', label: 'Checklists', impact: '+21 of 30', action: 'Late 2 Days This Week', actionLink: '/checklists', pillar: 'Food Safety', locationId: '2' },
  { status: 'current', label: 'Incident Resolution (2-12 hrs avg)', impact: '+16 of 20', action: null, actionLink: null, pillar: 'Food Safety', locationId: '2' },
  { status: 'current', label: 'HACCP Monitoring', impact: '+12 of 15', action: null, actionLink: null, pillar: 'Food Safety', locationId: '2' },

  // ─── Airport Cafe ─── Equipment (62/100)
  { status: 'overdue', label: 'Hood Cleaning 5 DAYS OVERDUE (−30 full penalty)', impact: '0 of 30', action: 'Contact ABC Fire', actionLink: '/vendors', pillar: 'Fire Safety', locationId: '2' },
  { status: 'current', label: 'Fire Suppression Inspection', impact: '+25 of 25', action: null, actionLink: null, pillar: 'Fire Safety', locationId: '2' },
  { status: 'current', label: 'Fire Extinguisher', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Fire Safety', locationId: '2' },
  { status: 'current', label: 'Equipment Maintenance', impact: '+12 of 15', action: null, actionLink: null, pillar: 'Fire Safety', locationId: '2' },
  { status: 'current', label: 'Equipment Condition (Good)', impact: '+5 of 10', action: null, actionLink: null, pillar: 'Fire Safety', locationId: '2' },

  // ─── Airport Cafe ─── Documentation (74/100)
  { status: 'due_soon', label: 'Vendor Cert (1 due in 12 days, −7.5 graduated)', impact: '+18 of 25', action: 'Request Updated COI', actionLink: '/vendors', pillar: 'Vendor Compliance', locationId: '2' },
  { status: 'current', label: 'Health Permit', impact: '+25 of 25', action: null, actionLink: null, pillar: 'Vendor Compliance', locationId: '2' },
  { status: 'current', label: 'Business License', impact: '+15 of 15', action: null, actionLink: null, pillar: 'Vendor Compliance', locationId: '2' },
  { status: 'due_soon', label: 'Food Handler Cert (1 staff due in 14 days, −3 graduated)', impact: '+16 of 20', action: 'View Team Certs', actionLink: '/team', pillar: 'Vendor Compliance', locationId: '2' },
  { status: 'missing', label: 'Pest Control Report Missing', impact: '0 of 15', action: 'Request from Vendor', actionLink: '/vendors', pillar: 'Vendor Compliance', locationId: '2' },

  // ─── University Dining ─── Operational (62/100)
  { status: 'overdue', label: '8 Temperature Checks Missed This Week', impact: '0 of 35', action: 'Log Now', actionLink: '/temp-logs', pillar: 'Food Safety', locationId: '3' },
  { status: 'overdue', label: 'Opening Checklists Missed 3 Days', impact: '+10 of 30', action: 'Complete Now', actionLink: '/checklists', pillar: 'Food Safety', locationId: '3' },
  { status: 'current', label: 'Incident Resolution (24-48 hrs avg)', impact: '+8 of 20', action: null, actionLink: null, pillar: 'Food Safety', locationId: '3' },
  { status: 'overdue', label: 'HACCP Monitoring Not Done This Month', impact: '0 of 15', action: 'Start HACCP Review', actionLink: '/haccp', pillar: 'Food Safety', locationId: '3' },

  // ─── University Dining ─── Equipment (55/100)
  { status: 'due_soon', label: 'Hood Cleaning Due in 5 Days (−15 graduated)', impact: '+15 of 30', action: 'Confirm Scheduled', actionLink: '/vendors', pillar: 'Fire Safety', locationId: '3' },
  { status: 'overdue', label: 'Fire Suppression 4 MONTHS OVERDUE (−25 full penalty)', impact: '0 of 25', action: 'URGENT: Schedule Now', actionLink: '/vendors', pillar: 'Fire Safety', locationId: '3' },
  { status: 'current', label: 'Fire Extinguisher', impact: '+15 of 20', action: null, actionLink: null, pillar: 'Fire Safety', locationId: '3' },
  { status: 'overdue', label: 'Grease Trap 2 MONTHS OVERDUE (−15 full penalty)', impact: '0 of 15', action: 'Schedule Service', actionLink: '/vendors', pillar: 'Fire Safety', locationId: '3' },
  { status: 'current', label: 'Equipment Condition (Fair)', impact: '+6 of 10', action: null, actionLink: null, pillar: 'Fire Safety', locationId: '3' },

  // ─── University Dining ─── Documentation (42/100)
  { status: 'expired', label: 'Health Permit EXPIRED (−25 full penalty)', impact: '0 of 25', action: 'URGENT: Renew Now', actionLink: '/documents', pillar: 'Vendor Compliance', locationId: '3' },
  { status: 'current', label: 'Business License', impact: '+15 of 15', action: null, actionLink: null, pillar: 'Vendor Compliance', locationId: '3' },
  { status: 'expired', label: '3 Vendor COIs EXPIRED', impact: '0 of 25', action: 'Request All COIs', actionLink: '/vendors', pillar: 'Vendor Compliance', locationId: '3' },
  { status: 'expired', label: '2 Food Handler Certs EXPIRED (−10 full penalty)', impact: '0 of 20', action: 'Notify Staff', actionLink: '/team', pillar: 'Vendor Compliance', locationId: '3' },
  { status: 'current', label: 'Insurance Certificate', impact: '+8 of 15', action: null, actionLink: null, pillar: 'Vendor Compliance', locationId: '3' },
];

// ============================================================
// Vendor Marketplace — Demo Data
// ============================================================

export type MarketplaceTier = 'verified' | 'certified' | 'preferred';

export interface MarketplaceCategory {
  id: string;
  name: string;
  icon: string;
  subcategories: string[];
}

export interface MarketplaceVendor {
  id: string;
  slug: string;
  companyName: string;
  description: string;
  tier: MarketplaceTier;
  rating: number;
  reviewCount: number;
  yearsInBusiness: number;
  serviceArea: string[];
  responseTimeHours: number;
  categories: string[];
  subcategories: string[];
  languages: string[];
  kitchensServed: number;
  totalServices: number;
  onTimeRate: number;
  docUploadRate: number;
  certifications: { name: string; verified: boolean; expirationDate?: string }[];
  insurance: { type: string; verified: boolean; expirationDate: string }[];
  serviceOfferings: { name: string; description: string; frequencyOptions: string[]; pricingDisplay: string }[];
  contactName: string;
  phone: string;
  email: string;
  website?: string;
}

export interface MarketplaceReview {
  id: string;
  vendorSlug: string;
  reviewerName: string;
  reviewerOrg: string;
  rating: number;
  text: string;
  serviceType: string;
  date: string;
  vendorResponse?: string;
}

export const marketplaceCategories: MarketplaceCategory[] = [
  { id: 'fire-safety', name: 'Fire Safety', icon: 'Flame', subcategories: ['Hood Cleaning', 'Fire Suppression', 'Fire Extinguisher', 'Kitchen Fire Systems'] },
  { id: 'food-safety', name: 'Food Safety', icon: 'ShieldCheck', subcategories: ['Pest Control', 'Food Safety Consulting', 'ServSafe Training', 'Health Inspection Prep'] },
  { id: 'equipment', name: 'Equipment', icon: 'Cog', subcategories: ['HVAC Service', 'Refrigeration', 'Grease Trap', 'Kitchen Equipment Repair', 'Ice Machine', 'Plumbing'] },
  { id: 'compliance', name: 'Compliance', icon: 'ClipboardCheck', subcategories: ['Permit Consulting', 'Food Safety Auditing', 'HACCP Plan Development', 'Insurance Brokers'] },
];

export const marketplaceVendors: MarketplaceVendor[] = [
  // ─── Existing companies (mapped as marketplace listings) ───
  {
    id: 'mv-1', slug: 'abc-fire-protection', companyName: 'ABC Fire Protection',
    description: 'Full-service commercial kitchen fire protection specialists. IKECA-certified hood cleaning with NFPA 96 (2025 Edition) compliance documentation provided after every service. Serving the Central Valley since 2008.',
    tier: 'certified', rating: 4.6, reviewCount: 23, yearsInBusiness: 16,
    serviceArea: ['Fresno', 'Clovis', 'Madera', 'Visalia'],
    responseTimeHours: 6, categories: ['Fire Safety'], subcategories: ['Hood Cleaning', 'Fire Extinguisher'],
    languages: ['English', 'Spanish'], kitchensServed: 85, totalServices: 342, onTimeRate: 94, docUploadRate: 91,
    certifications: [
      { name: 'IKECA Certified', verified: true, expirationDate: '2027-03-15' },
      { name: 'State Fire Marshal License', verified: true, expirationDate: '2026-12-31' },
    ],
    insurance: [
      { type: 'General Liability', verified: true, expirationDate: '2026-09-15' },
      { type: 'Workers Compensation', verified: true, expirationDate: '2026-09-15' },
    ],
    serviceOfferings: [
      { name: 'Hood & Duct Cleaning', description: 'Complete kitchen exhaust system cleaning per NFPA 96 (2025 Edition) schedule. Includes before/after photos and bare metal verification.', frequencyOptions: ['Monthly', 'Quarterly', 'Semi-Annual'], pricingDisplay: '$350 - $750' },
      { name: 'Fire Extinguisher Inspection', description: 'Annual inspection, 6-year maintenance, and 12-year hydrostatic testing per NFPA 10 (2025).', frequencyOptions: ['Annual'], pricingDisplay: '$25/unit' },
    ],
    contactName: 'John Smith', phone: '(555) 123-4567', email: 'john@abcfire.com', website: 'abcfireprotection.com',
  },
  {
    id: 'mv-2', slug: 'pacific-pest-control', companyName: 'Pacific Pest Control',
    description: 'Licensed commercial pest management for restaurants and food service. IPM-focused approach minimizes chemical use while maintaining pest-free environments. State-licensed and insured.',
    tier: 'preferred', rating: 4.8, reviewCount: 41, yearsInBusiness: 22,
    serviceArea: ['Fresno', 'Clovis', 'Madera', 'Merced', 'Tulare'],
    responseTimeHours: 4, categories: ['Food Safety'], subcategories: ['Pest Control'],
    languages: ['English', 'Spanish', 'Hmong'], kitchensServed: 120, totalServices: 580, onTimeRate: 97, docUploadRate: 95,
    certifications: [
      { name: 'CA Dept of Pesticide Regulation License', verified: true, expirationDate: '2026-11-30' },
      { name: 'QualityPro Certified', verified: true, expirationDate: '2027-01-15' },
    ],
    insurance: [
      { type: 'General Liability', verified: true, expirationDate: '2026-08-20' },
      { type: 'Workers Compensation', verified: true, expirationDate: '2026-08-20' },
      { type: 'Vehicle Insurance', verified: true, expirationDate: '2026-08-20' },
    ],
    serviceOfferings: [
      { name: 'Commercial Pest Management', description: 'Monthly IPM service with detailed inspection reports, treatment logs, and compliance documentation for health department audits.', frequencyOptions: ['Monthly', 'Bi-Monthly'], pricingDisplay: '$150 - $300/mo' },
      { name: 'Emergency Pest Response', description: 'Same-day response for critical pest issues. Includes follow-up inspection and documentation.', frequencyOptions: ['One-Time'], pricingDisplay: 'Request Quote' },
    ],
    contactName: 'Maria Garcia', phone: '(555) 234-5678', email: 'maria@pacificpest.com', website: 'pacificpestcontrol.com',
  },
  {
    id: 'mv-3', slug: 'valley-fire-systems', companyName: 'Valley Fire Systems',
    description: 'Authorized dealer for Ansul and Amerex fire suppression systems. Factory-trained technicians provide semi-annual inspections per NFPA 17A (2025) with full documentation.',
    tier: 'certified', rating: 4.5, reviewCount: 18, yearsInBusiness: 14,
    serviceArea: ['Fresno', 'Clovis', 'Visalia', 'Hanford'],
    responseTimeHours: 8, categories: ['Fire Safety'], subcategories: ['Fire Suppression', 'Kitchen Fire Systems'],
    languages: ['English'], kitchensServed: 65, totalServices: 210, onTimeRate: 91, docUploadRate: 88,
    certifications: [
      { name: 'Ansul Authorized Distributor', verified: true },
      { name: 'State Fire Marshal License', verified: true, expirationDate: '2026-12-31' },
    ],
    insurance: [
      { type: 'General Liability', verified: true, expirationDate: '2026-07-01' },
      { type: 'Workers Compensation', verified: true, expirationDate: '2026-07-01' },
    ],
    serviceOfferings: [
      { name: 'Fire Suppression Inspection', description: 'Semi-annual inspection and testing of kitchen fire suppression systems per NFPA 17A (2025)/UL 300.', frequencyOptions: ['Semi-Annual'], pricingDisplay: '$275 - $450' },
      { name: 'System Installation & Retrofit', description: 'New fire suppression system installation or retrofit of existing systems with Ansul or Amerex equipment.', frequencyOptions: ['One-Time'], pricingDisplay: 'Request Quote' },
    ],
    contactName: 'Robert Chen', phone: '(555) 345-6789', email: 'robert@valleyfire.com',
  },
  {
    id: 'mv-4', slug: 'cleanair-hvac', companyName: 'CleanAir HVAC',
    description: 'Commercial kitchen HVAC specialists. Expert in make-up air systems, kitchen ventilation balancing, and exhaust fan maintenance. EPA-certified refrigeration technicians on staff.',
    tier: 'verified', rating: 4.3, reviewCount: 12, yearsInBusiness: 9,
    serviceArea: ['Fresno', 'Clovis', 'Madera'],
    responseTimeHours: 12, categories: ['Equipment'], subcategories: ['HVAC Service', 'Refrigeration'],
    languages: ['English', 'Spanish'], kitchensServed: 45, totalServices: 156, onTimeRate: 88, docUploadRate: 82,
    certifications: [
      { name: 'EPA Section 608 Certification', verified: true },
      { name: 'NATE Certified', verified: true, expirationDate: '2027-06-30' },
    ],
    insurance: [
      { type: 'General Liability', verified: true, expirationDate: '2026-10-15' },
      { type: 'Workers Compensation', verified: true, expirationDate: '2026-10-15' },
    ],
    serviceOfferings: [
      { name: 'Kitchen Ventilation Service', description: 'Make-up air system maintenance, exhaust fan service, and ventilation balancing for commercial kitchens.', frequencyOptions: ['Quarterly', 'Semi-Annual'], pricingDisplay: '$200 - $500' },
      { name: 'Commercial Refrigeration Repair', description: 'Walk-in cooler/freezer repair and maintenance. EPA-certified refrigerant handling.', frequencyOptions: ['As Needed'], pricingDisplay: '$150/hr + parts' },
    ],
    contactName: 'David Park', phone: '(555) 456-7890', email: 'david@cleanairhvac.com',
  },
  {
    id: 'mv-5', slug: 'grease-masters', companyName: 'Grease Masters',
    description: 'Grease trap and interceptor specialists. Licensed for grease removal and disposal per local sewer authority regulations. Detailed service reports with photos provided.',
    tier: 'verified', rating: 4.2, reviewCount: 9, yearsInBusiness: 7,
    serviceArea: ['Fresno', 'Clovis'],
    responseTimeHours: 24, categories: ['Equipment'], subcategories: ['Grease Trap'],
    languages: ['English'], kitchensServed: 30, totalServices: 120, onTimeRate: 85, docUploadRate: 78,
    certifications: [
      { name: 'FOG Hauler Permit', verified: true, expirationDate: '2026-06-30' },
    ],
    insurance: [
      { type: 'General Liability', verified: true, expirationDate: '2026-05-15' },
      { type: 'Workers Compensation', verified: true, expirationDate: '2026-05-15' },
    ],
    serviceOfferings: [
      { name: 'Grease Trap Cleaning', description: 'Complete pump-out, cleaning, and inspection of grease traps and interceptors. Manifests provided for sewer authority compliance.', frequencyOptions: ['Monthly', 'Quarterly'], pricingDisplay: '$175 - $400' },
    ],
    contactName: 'Mike Torres', phone: '(555) 567-8901', email: 'mike@greasemasters.com',
  },
  // ─── New marketplace vendors ───
  {
    id: 'mv-6', slug: 'safeguard-hood-services', companyName: 'SafeGuard Hood Services',
    description: 'Premium hood cleaning with IKECA Master Certified technicians. Known for exceptional documentation and before/after photo packages. Preferred vendor for major restaurant groups across the Central Valley.',
    tier: 'preferred', rating: 4.9, reviewCount: 52, yearsInBusiness: 18,
    serviceArea: ['Fresno', 'Clovis', 'Madera', 'Merced', 'Visalia', 'Bakersfield'],
    responseTimeHours: 3, categories: ['Fire Safety'], subcategories: ['Hood Cleaning', 'Fire Extinguisher'],
    languages: ['English', 'Spanish'], kitchensServed: 150, totalServices: 720, onTimeRate: 98, docUploadRate: 99,
    certifications: [
      { name: 'IKECA Master Certified', verified: true, expirationDate: '2027-05-20' },
      { name: 'State Fire Marshal License', verified: true, expirationDate: '2026-12-31' },
      { name: 'OSHA 30-Hour', verified: true },
    ],
    insurance: [
      { type: 'General Liability ($2M)', verified: true, expirationDate: '2026-11-01' },
      { type: 'Workers Compensation', verified: true, expirationDate: '2026-11-01' },
      { type: 'Vehicle Insurance', verified: true, expirationDate: '2026-11-01' },
    ],
    serviceOfferings: [
      { name: 'Hood & Duct Cleaning (NFPA 96-2025)', description: 'Full exhaust system cleaning to bare metal with before/after photos, sticker placement, and compliance report uploaded within 4 hours of service.', frequencyOptions: ['Monthly', 'Quarterly', 'Semi-Annual'], pricingDisplay: '$400 - $900' },
      { name: 'Rooftop Grease Containment', description: 'Installation and maintenance of rooftop grease containment systems for exhaust fan runoff.', frequencyOptions: ['Quarterly'], pricingDisplay: '$150 - $300' },
      { name: 'Fire Extinguisher Service', description: 'Annual inspection and 6-year maintenance per NFPA 10 (2025).', frequencyOptions: ['Annual'], pricingDisplay: '$20/unit' },
    ],
    contactName: 'Carlos Mendez', phone: '(555) 678-9012', email: 'carlos@safeguardhood.com', website: 'safeguardhood.com',
  },
  {
    id: 'mv-7', slug: 'central-valley-pest-solutions', companyName: 'Central Valley Pest Solutions',
    description: 'Eco-friendly commercial pest management with a focus on prevention. Detailed digital reports accessible through client portal. Specialized in restaurant and food processing environments.',
    tier: 'certified', rating: 4.7, reviewCount: 31, yearsInBusiness: 11,
    serviceArea: ['Fresno', 'Clovis', 'Madera', 'Selma'],
    responseTimeHours: 6, categories: ['Food Safety'], subcategories: ['Pest Control'],
    languages: ['English', 'Spanish'], kitchensServed: 78, totalServices: 340, onTimeRate: 95, docUploadRate: 93,
    certifications: [
      { name: 'CA Dept of Pesticide Regulation License', verified: true, expirationDate: '2027-02-28' },
      { name: 'GreenPro Certified', verified: true, expirationDate: '2026-09-30' },
    ],
    insurance: [
      { type: 'General Liability', verified: true, expirationDate: '2026-12-15' },
      { type: 'Workers Compensation', verified: true, expirationDate: '2026-12-15' },
    ],
    serviceOfferings: [
      { name: 'Monthly Pest Management', description: 'IPM-based monthly service with digital inspection reports, bait station monitoring, and exclusion recommendations.', frequencyOptions: ['Monthly', 'Bi-Monthly'], pricingDisplay: '$125 - $250/mo' },
    ],
    contactName: 'Angela White', phone: '(555) 789-0123', email: 'angela@cvpestsolutions.com', website: 'cvpestsolutions.com',
  },
  {
    id: 'mv-8', slug: 'protech-fire-safety', companyName: 'ProTech Fire & Safety',
    description: 'Fire protection services for commercial kitchens including suppression system testing, alarm inspection, and emergency lighting. NICET-certified technicians.',
    tier: 'verified', rating: 4.4, reviewCount: 15, yearsInBusiness: 6,
    serviceArea: ['Fresno', 'Clovis', 'Madera'],
    responseTimeHours: 12, categories: ['Fire Safety'], subcategories: ['Fire Suppression', 'Kitchen Fire Systems'],
    languages: ['English'], kitchensServed: 40, totalServices: 128, onTimeRate: 89, docUploadRate: 84,
    certifications: [
      { name: 'NICET Level II Fire Protection', verified: true },
      { name: 'State Fire Marshal License', verified: true, expirationDate: '2026-12-31' },
    ],
    insurance: [
      { type: 'General Liability', verified: true, expirationDate: '2026-06-30' },
      { type: 'Workers Compensation', verified: true, expirationDate: '2026-06-30' },
    ],
    serviceOfferings: [
      { name: 'Fire Suppression Inspection', description: 'Semi-annual kitchen fire suppression system inspection per NFPA 17A (2025) with detailed compliance report.', frequencyOptions: ['Semi-Annual'], pricingDisplay: '$250 - $400' },
      { name: 'Fire Alarm Inspection', description: 'Annual fire alarm system testing and certification per NFPA 72 (2025).', frequencyOptions: ['Annual'], pricingDisplay: '$200 - $350' },
    ],
    contactName: 'James Mitchell', phone: '(555) 890-1234', email: 'james@protechfire.com',
  },
  {
    id: 'mv-9', slug: 'freshair-mechanical', companyName: 'FreshAir Mechanical',
    description: 'Full-service commercial HVAC with kitchen ventilation expertise. Specializing in make-up air unit installation, kitchen hood balancing, and energy-efficient upgrades for food service.',
    tier: 'certified', rating: 4.6, reviewCount: 19, yearsInBusiness: 13,
    serviceArea: ['Fresno', 'Clovis', 'Visalia', 'Hanford', 'Tulare'],
    responseTimeHours: 8, categories: ['Equipment'], subcategories: ['HVAC Service'],
    languages: ['English', 'Spanish'], kitchensServed: 55, totalServices: 230, onTimeRate: 93, docUploadRate: 90,
    certifications: [
      { name: 'EPA Section 608 Universal', verified: true },
      { name: 'NATE Certified', verified: true, expirationDate: '2027-04-15' },
      { name: 'Sheet Metal Workers Union', verified: true },
    ],
    insurance: [
      { type: 'General Liability', verified: true, expirationDate: '2027-01-15' },
      { type: 'Workers Compensation', verified: true, expirationDate: '2027-01-15' },
    ],
    serviceOfferings: [
      { name: 'Kitchen Ventilation Maintenance', description: 'Quarterly maintenance of make-up air systems, exhaust fans, and ventilation controls. Includes airflow testing and balancing.', frequencyOptions: ['Quarterly', 'Semi-Annual'], pricingDisplay: '$250 - $600' },
      { name: 'HVAC System Installation', description: 'New kitchen HVAC system design and installation including make-up air, exhaust, and air conditioning.', frequencyOptions: ['One-Time'], pricingDisplay: 'Request Quote' },
    ],
    contactName: 'Tony Ramirez', phone: '(555) 901-2345', email: 'tony@freshairmech.com', website: 'freshairmech.com',
  },
  {
    id: 'mv-10', slug: 'greentrap-environmental', companyName: 'GreenTrap Environmental',
    description: 'Environmentally responsible grease trap and interceptor service. We recycle 100% of collected grease into biodiesel. Full compliance documentation and manifests provided.',
    tier: 'verified', rating: 4.3, reviewCount: 8, yearsInBusiness: 5,
    serviceArea: ['Fresno', 'Clovis', 'Madera'],
    responseTimeHours: 24, categories: ['Equipment'], subcategories: ['Grease Trap', 'Plumbing'],
    languages: ['English'], kitchensServed: 25, totalServices: 95, onTimeRate: 86, docUploadRate: 80,
    certifications: [
      { name: 'FOG Hauler Permit', verified: true, expirationDate: '2026-08-31' },
      { name: 'EPA Compliance Certificate', verified: true },
    ],
    insurance: [
      { type: 'General Liability', verified: true, expirationDate: '2026-09-30' },
      { type: 'Workers Compensation', verified: true, expirationDate: '2026-09-30' },
    ],
    serviceOfferings: [
      { name: 'Grease Trap Service', description: 'Complete pump-out, cleaning, and inspection. Disposal manifests and compliance reports provided within 24 hours.', frequencyOptions: ['Monthly', 'Quarterly'], pricingDisplay: '$150 - $350' },
      { name: 'Drain Line Jetting', description: 'High-pressure water jetting of drain lines to prevent grease buildup and backups.', frequencyOptions: ['Quarterly', 'Semi-Annual'], pricingDisplay: '$200 - $400' },
    ],
    contactName: 'Lisa Chang', phone: '(555) 012-3456', email: 'lisa@greentrap.com',
  },
  {
    id: 'mv-11', slug: 'kitchen-guardian-consulting', companyName: 'Kitchen Guardian Consulting',
    description: 'Former health department inspectors turned food safety consultants. We help restaurants achieve and maintain top compliance scores through mock inspections, staff training, and SOP development.',
    tier: 'preferred', rating: 4.8, reviewCount: 37, yearsInBusiness: 15,
    serviceArea: ['Fresno', 'Clovis', 'Madera', 'Merced', 'Visalia', 'Bakersfield', 'Modesto'],
    responseTimeHours: 4, categories: ['Compliance', 'Food Safety'], subcategories: ['Food Safety Auditing', 'Health Inspection Prep', 'Food Safety Consulting', 'HACCP Plan Development'],
    languages: ['English', 'Spanish', 'Mandarin'], kitchensServed: 200, totalServices: 450, onTimeRate: 96, docUploadRate: 98,
    certifications: [
      { name: 'Certified Professional in Food Safety (CP-FS)', verified: true, expirationDate: '2027-08-15' },
      { name: 'HACCP Certification', verified: true },
      { name: 'ServSafe Proctor/Instructor', verified: true, expirationDate: '2027-03-01' },
    ],
    insurance: [
      { type: 'Professional Liability (E&O)', verified: true, expirationDate: '2026-12-31' },
      { type: 'General Liability', verified: true, expirationDate: '2026-12-31' },
    ],
    serviceOfferings: [
      { name: 'Mock Health Inspection', description: 'Full walkthrough using your county\'s actual inspection form. Detailed report with photos, findings, and corrective action plan.', frequencyOptions: ['One-Time', 'Quarterly'], pricingDisplay: '$350 - $500' },
      { name: 'HACCP Plan Development', description: 'Custom HACCP plan development including hazard analysis, CCP identification, monitoring procedures, and staff training.', frequencyOptions: ['One-Time'], pricingDisplay: '$1,200 - $2,500' },
      { name: 'Food Safety Staff Training', description: 'On-site training sessions covering food handling, cross-contamination, temperature control, and cleaning procedures.', frequencyOptions: ['One-Time', 'Monthly'], pricingDisplay: '$250/session' },
    ],
    contactName: 'Dr. Sarah Kim', phone: '(555) 111-2233', email: 'sarah@kitchenguardian.com', website: 'kitchenguardian.com',
  },
  {
    id: 'mv-12', slug: 'certpro-training', companyName: 'CertPro Training',
    description: 'ANAB-accredited food handler and food manager certification training. On-site group classes, online options, and bilingual instruction available.',
    tier: 'certified', rating: 4.5, reviewCount: 28, yearsInBusiness: 10,
    serviceArea: ['Fresno', 'Clovis', 'Madera', 'Visalia', 'Merced'],
    responseTimeHours: 12, categories: ['Food Safety'], subcategories: ['ServSafe Training'],
    languages: ['English', 'Spanish'], kitchensServed: 180, totalServices: 420, onTimeRate: 92, docUploadRate: 87,
    certifications: [
      { name: 'ANAB Accredited Training Provider', verified: true, expirationDate: '2027-06-30' },
      { name: 'ServSafe Proctor', verified: true, expirationDate: '2027-01-15' },
    ],
    insurance: [
      { type: 'General Liability', verified: true, expirationDate: '2026-10-31' },
    ],
    serviceOfferings: [
      { name: 'Food Handler Certification', description: 'State-approved food handler training and certification. Available in English and Spanish. On-site or online.', frequencyOptions: ['One-Time'], pricingDisplay: '$15/person' },
      { name: 'Food Manager Certification (ServSafe)', description: '8-hour ServSafe Manager course with proctored exam. Group rates available for 10+ employees.', frequencyOptions: ['One-Time'], pricingDisplay: '$175/person' },
    ],
    contactName: 'Patricia Reyes', phone: '(555) 222-3344', email: 'patricia@certprotraining.com', website: 'certprotraining.com',
  },
  {
    id: 'mv-13', slug: 'allclear-refrigeration', companyName: 'AllClear Refrigeration',
    description: 'Walk-in cooler, freezer, and reach-in refrigeration specialists. 24/7 emergency service available. We stock common parts for same-day repair on most brands.',
    tier: 'verified', rating: 4.2, reviewCount: 11, yearsInBusiness: 8,
    serviceArea: ['Fresno', 'Clovis'],
    responseTimeHours: 4, categories: ['Equipment'], subcategories: ['Refrigeration', 'Ice Machine'],
    languages: ['English'], kitchensServed: 35, totalServices: 190, onTimeRate: 87, docUploadRate: 75,
    certifications: [
      { name: 'EPA Section 608 Universal', verified: true },
      { name: 'True Refrigeration Authorized Service', verified: true },
    ],
    insurance: [
      { type: 'General Liability', verified: true, expirationDate: '2026-07-31' },
      { type: 'Workers Compensation', verified: true, expirationDate: '2026-07-31' },
    ],
    serviceOfferings: [
      { name: 'Refrigeration Repair', description: 'Walk-in cooler, freezer, and reach-in repair for all major brands. Most parts in stock for same-day service.', frequencyOptions: ['As Needed'], pricingDisplay: '$125/hr + parts' },
      { name: 'Preventive Maintenance', description: 'Quarterly cleaning of condenser coils, door gasket inspection, temperature calibration, and refrigerant check.', frequencyOptions: ['Quarterly'], pricingDisplay: '$150 - $250' },
      { name: 'Ice Machine Cleaning', description: 'Deep cleaning and sanitizing of ice machines per manufacturer specs and health code requirements.', frequencyOptions: ['Quarterly', 'Semi-Annual'], pricingDisplay: '$125 - $200' },
    ],
    contactName: 'Kevin O\'Brien', phone: '(555) 333-4455', email: 'kevin@allclearrefrig.com',
  },
  {
    id: 'mv-14', slug: 'permitpro-consulting', companyName: 'PermitPro Consulting',
    description: 'Navigating health department permits, plan reviews, and business licensing for restaurants and food service operations. We handle the paperwork so you can focus on food.',
    tier: 'certified', rating: 4.6, reviewCount: 16, yearsInBusiness: 12,
    serviceArea: ['Fresno', 'Clovis', 'Madera', 'Merced', 'Tulare', 'Kings'],
    responseTimeHours: 8, categories: ['Compliance'], subcategories: ['Permit Consulting'],
    languages: ['English', 'Spanish'], kitchensServed: 95, totalServices: 280, onTimeRate: 94, docUploadRate: 92,
    certifications: [
      { name: 'Certified Food Safety Manager', verified: true },
      { name: 'CA Restaurant Association Member', verified: true },
    ],
    insurance: [
      { type: 'Professional Liability (E&O)', verified: true, expirationDate: '2026-11-30' },
      { type: 'General Liability', verified: true, expirationDate: '2026-11-30' },
    ],
    serviceOfferings: [
      { name: 'New Restaurant Permitting', description: 'Complete permit package: health department application, plan review coordination, fire department clearance, and business license.', frequencyOptions: ['One-Time'], pricingDisplay: '$1,500 - $3,000' },
      { name: 'Annual Permit Renewal', description: 'Health permit and business license renewal management with deadline tracking and document preparation.', frequencyOptions: ['Annual'], pricingDisplay: '$250 - $500' },
    ],
    contactName: 'Diana Foster', phone: '(555) 444-5566', email: 'diana@permitpro.com', website: 'permitproconsulting.com',
  },
  {
    id: 'mv-15', slug: 'wastewise-services', companyName: 'WasteWise Services',
    description: 'Commercial kitchen waste management and deep cleaning specialists. Hood filter exchange program, kitchen deep cleaning, and waste oil recycling services.',
    tier: 'verified', rating: 4.1, reviewCount: 7, yearsInBusiness: 4,
    serviceArea: ['Fresno', 'Clovis'],
    responseTimeHours: 48, categories: ['Food Safety', 'Equipment'], subcategories: ['Grease Trap', 'Kitchen Equipment Repair'],
    languages: ['English'], kitchensServed: 20, totalServices: 68, onTimeRate: 82, docUploadRate: 72,
    certifications: [
      { name: 'Waste Hauler Permit', verified: true, expirationDate: '2026-06-30' },
    ],
    insurance: [
      { type: 'General Liability', verified: true, expirationDate: '2026-04-15' },
      { type: 'Workers Compensation', verified: false, expirationDate: '2026-01-31' },
    ],
    serviceOfferings: [
      { name: 'Kitchen Deep Cleaning', description: 'Full commercial kitchen deep cleaning including equipment, floors, walls, and ceiling tiles. Before/after photos provided.', frequencyOptions: ['One-Time', 'Monthly', 'Quarterly'], pricingDisplay: '$500 - $1,200' },
      { name: 'Grease Filter Exchange', description: 'Regular exchange of hood grease filters with professionally cleaned replacements. Includes filter disposal.', frequencyOptions: ['Weekly', 'Bi-Weekly'], pricingDisplay: '$75 - $150/exchange' },
    ],
    contactName: 'Rick Nguyen', phone: '(555) 555-6677', email: 'rick@wastewise.com',
  },
];

export const marketplaceReviews: MarketplaceReview[] = [
  // SafeGuard Hood Services (preferred, 4.9)
  { id: 'mr-1', vendorSlug: 'safeguard-hood-services', reviewerName: 'James W.', reviewerOrg: 'Pacific Coast Dining', rating: 5, text: 'SafeGuard is the gold standard for hood cleaning. Their documentation is uploaded before we even get back to the office. Photos, compliance certificates, everything. Made our health inspection a breeze.', serviceType: 'Hood Cleaning', date: '2026-01-15', vendorResponse: 'Thank you James! We take pride in fast documentation turnaround. Looking forward to your next service.' },
  { id: 'mr-2', vendorSlug: 'safeguard-hood-services', reviewerName: 'Linda M.', reviewerOrg: 'Fresno Eats Group', rating: 5, text: 'Switched from our old vendor and the difference is night and day. Bare metal cleaning every time, and they send before/after photos that actually show the work. Worth every penny.', serviceType: 'Hood Cleaning', date: '2025-11-20' },
  { id: 'mr-3', vendorSlug: 'safeguard-hood-services', reviewerName: 'Tom R.', reviewerOrg: 'Valley Restaurant Co', rating: 5, text: 'Best hood cleaning company in the Valley. Always on time, professional crew, and their IKECA certification gives us confidence in the quality.', serviceType: 'Hood Cleaning', date: '2025-09-08' },
  { id: 'mr-4', vendorSlug: 'safeguard-hood-services', reviewerName: 'Kevin P.', reviewerOrg: 'Campus Dining Services', rating: 4, text: 'Great service but scheduling can be tight during their busy season. Quality of work is excellent though.', serviceType: 'Hood Cleaning', date: '2025-07-22' },
  // Pacific Pest Control (preferred, 4.8)
  { id: 'mr-5', vendorSlug: 'pacific-pest-control', reviewerName: 'Sarah C.', reviewerOrg: 'Pacific Coast Dining', rating: 5, text: 'Maria and her team are amazing. We had a fly problem that two other companies couldn\'t solve. Pacific Pest identified the breeding source in our floor drain and resolved it in one visit.', serviceType: 'Pest Control', date: '2026-01-28', vendorResponse: 'Thanks Sarah! Those drain fly issues can be tricky but our IPM approach helps us find the root cause. Glad we could help!' },
  { id: 'mr-6', vendorSlug: 'pacific-pest-control', reviewerName: 'Mike T.', reviewerOrg: 'Airport Food Services', rating: 5, text: 'Bilingual service team is a huge plus for our kitchen staff. Reports are thorough and always uploaded same day. Never had a pest issue since we switched to Pacific.', serviceType: 'Pest Control', date: '2025-12-05' },
  { id: 'mr-7', vendorSlug: 'pacific-pest-control', reviewerName: 'Karen L.', reviewerOrg: 'University Dining', rating: 4, text: 'Reliable monthly service. They always come on schedule and the digital reports are very detailed. Only wish they had Saturday availability.', serviceType: 'Pest Control', date: '2025-10-18' },
  // ABC Fire Protection (certified, 4.6)
  { id: 'mr-8', vendorSlug: 'abc-fire-protection', reviewerName: 'Daniel F.', reviewerOrg: 'Downtown Grill', rating: 5, text: 'John and his crew do excellent work. They cleaned our 3-story hood system in one night shift without disrupting our operation. Documentation was uploaded next morning.', serviceType: 'Hood Cleaning', date: '2025-12-10' },
  { id: 'mr-9', vendorSlug: 'abc-fire-protection', reviewerName: 'Nancy W.', reviewerOrg: 'Fresno Bistro', rating: 4, text: 'Good hood cleaning service at a fair price. They could improve their scheduling communication but the quality of work is consistently good.', serviceType: 'Hood Cleaning', date: '2025-08-15' },
  { id: 'mr-10', vendorSlug: 'abc-fire-protection', reviewerName: 'Chris B.', reviewerOrg: 'Valley BBQ', rating: 5, text: 'Best fire extinguisher service around. They tag every unit, provide a clear report, and remind us before the next inspection is due. Very organized.', serviceType: 'Fire Extinguisher', date: '2025-06-22' },
  // Kitchen Guardian Consulting (preferred, 4.8)
  { id: 'mr-11', vendorSlug: 'kitchen-guardian-consulting', reviewerName: 'Amy S.', reviewerOrg: 'Madera Hospitality', rating: 5, text: 'Dr. Kim found 14 issues during our mock inspection that we had no idea about. Fixed them all before the real inspector came and we scored a 97. Worth every dollar.', serviceType: 'Health Inspection Prep', date: '2026-02-01', vendorResponse: 'Great work Amy! Your team was incredibly responsive in implementing the changes. That 97 was well-earned!' },
  { id: 'mr-12', vendorSlug: 'kitchen-guardian-consulting', reviewerName: 'Roberto G.', reviewerOrg: 'Tacos El Rey', rating: 5, text: 'Hired them for HACCP plan development. They walked our entire team through it in both English and Spanish. The plan they created has been rock solid.', serviceType: 'HACCP Plan Development', date: '2025-10-30' },
  { id: 'mr-13', vendorSlug: 'kitchen-guardian-consulting', reviewerName: 'Jennifer H.', reviewerOrg: 'Central Valley Cafes', rating: 4, text: 'Excellent consulting but the price point is premium. For what you get though, including the follow-up support, it is fair. Our scores have improved significantly.', serviceType: 'Food Safety Consulting', date: '2025-08-05' },
  // Valley Fire Systems (certified, 4.5)
  { id: 'mr-14', vendorSlug: 'valley-fire-systems', reviewerName: 'Steve M.', reviewerOrg: 'Clovis Grille', rating: 5, text: 'Had our Ansul system replaced and it was seamless. Robert coordinated with the fire marshal for the inspection and passed first time. Very professional.', serviceType: 'Fire Suppression', date: '2025-11-12' },
  { id: 'mr-15', vendorSlug: 'valley-fire-systems', reviewerName: 'Paul D.', reviewerOrg: 'Airport Food Court', rating: 4, text: 'Good semi-annual inspection service. They found a clogged nozzle that could have been a problem. Documentation took a few days to come through though.', serviceType: 'Fire Suppression', date: '2025-09-25' },
  // CertPro Training (certified, 4.5)
  { id: 'mr-16', vendorSlug: 'certpro-training', reviewerName: 'Maria L.', reviewerOrg: 'Valley Restaurant Group', rating: 5, text: 'Patricia trained 22 of our staff in one session. Having a bilingual instructor made all the difference for our kitchen team. Everyone passed their food handler exam.', serviceType: 'ServSafe Training', date: '2026-01-05' },
  { id: 'mr-17', vendorSlug: 'certpro-training', reviewerName: 'Greg N.', reviewerOrg: 'Campus Dining', rating: 4, text: 'Good training program with solid study materials. The online option worked well for our part-time staff who couldn\'t make the in-person session.', serviceType: 'ServSafe Training', date: '2025-11-18' },
  // FreshAir Mechanical (certified, 4.6)
  { id: 'mr-18', vendorSlug: 'freshair-mechanical', reviewerName: 'Andrew K.', reviewerOrg: 'Visalia Kitchen Group', rating: 5, text: 'Tony and his team balanced our kitchen ventilation perfectly. No more smoke backing up during peak hours. They really understand commercial kitchen airflow.', serviceType: 'HVAC Service', date: '2025-12-20' },
  { id: 'mr-19', vendorSlug: 'freshair-mechanical', reviewerName: 'Laura B.', reviewerOrg: 'Fresno Food Hall', rating: 4, text: 'Reliable HVAC maintenance. They catch small issues before they become big problems. Pricing is competitive for the quality of work.', serviceType: 'HVAC Service', date: '2025-10-08' },
  // PermitPro Consulting (certified, 4.6)
  { id: 'mr-20', vendorSlug: 'permitpro-consulting', reviewerName: 'Helen T.', reviewerOrg: 'New Restaurant Ventures', rating: 5, text: 'Diana handled our entire new restaurant permitting process. Health department, fire department, business license — everything. Saved us months of headaches.', serviceType: 'Permit Consulting', date: '2025-12-15', vendorResponse: 'Thank you Helen! Congrats on the opening. We\'re here whenever you need permit renewals.' },
  { id: 'mr-21', vendorSlug: 'permitpro-consulting', reviewerName: 'Brian C.', reviewerOrg: 'Valley Eats Inc', rating: 4, text: 'Great knowledge of local permitting requirements. They caught several issues in our floor plan that would have been rejected by the health department.', serviceType: 'Permit Consulting', date: '2025-09-30' },
  // Central Valley Pest Solutions (certified, 4.7)
  { id: 'mr-22', vendorSlug: 'central-valley-pest-solutions', reviewerName: 'Diane W.', reviewerOrg: 'Madera Dining', rating: 5, text: 'Their eco-friendly approach actually works better than traditional methods. Digital reports are a nice touch and very detailed.', serviceType: 'Pest Control', date: '2025-11-25' },
  // CleanAir HVAC (verified, 4.3)
  { id: 'mr-23', vendorSlug: 'cleanair-hvac', reviewerName: 'Jeff R.', reviewerOrg: 'Downtown Kitchen Co', rating: 4, text: 'Fixed our walk-in cooler quickly. David knew exactly what the problem was. Pricing was fair and they had the part on the truck.', serviceType: 'Refrigeration', date: '2025-10-15' },
  // AllClear Refrigeration (verified, 4.2)
  { id: 'mr-24', vendorSlug: 'allclear-refrigeration', reviewerName: 'Samantha Y.', reviewerOrg: 'Sushi Fresh', rating: 5, text: 'Called at 6am when our walk-in died overnight. Kevin had a tech there by 8am and everything was back to temp by 10. Saved thousands in product.', serviceType: 'Refrigeration', date: '2025-12-01' },
  { id: 'mr-25', vendorSlug: 'allclear-refrigeration', reviewerName: 'Mark H.', reviewerOrg: 'Valley Steakhouse', rating: 3, text: 'Service was eventually good but took three visits to properly diagnose the issue. Would recommend for straightforward repairs.', serviceType: 'Refrigeration', date: '2025-08-20' },
];

// ============================================================
// Cleaning Pros Plus — Launch Vendor (EvidLY Preferred)
// ============================================================
// Append to marketplaceVendors after initialization below

export const cleaningProsPlus: MarketplaceVendor = {
  id: 'mv-16', slug: 'cleaning-pros-plus', companyName: 'Cleaning Pros Plus',
  description: 'Central Valley\'s premier commercial kitchen exhaust cleaning company. IKECA Master Certified with 90+ active accounts including Aramark and Yosemite National Park hospitality. Specializing in NFPA 96 (2025 Edition) compliant hood and duct cleaning with bare-metal verification photography on every job. Family-owned since 2008.',
  tier: 'preferred', rating: 4.8, reviewCount: 34, yearsInBusiness: 18,
  serviceArea: ['Fresno', 'Clovis', 'Madera', 'Merced', 'Visalia', 'Tulare', 'Stanislaus', 'Mariposa'],
  responseTimeHours: 2, categories: ['Fire Safety'], subcategories: ['Hood Cleaning'],
  languages: ['English', 'Spanish'], kitchensServed: 92, totalServices: 1450, onTimeRate: 99, docUploadRate: 98,
  certifications: [
    { name: 'IKECA Master Certified', verified: true, expirationDate: '2027-06-30' },
    { name: 'State Fire Marshal Licensed', verified: true, expirationDate: '2027-01-31' },
    { name: 'OSHA 30-Hour Construction', verified: true },
    { name: 'NFPA 96-2025 Compliance Specialist', verified: true },
  ],
  insurance: [
    { type: 'General Liability ($2M)', verified: true, expirationDate: '2026-12-31' },
    { type: 'Workers Compensation', verified: true, expirationDate: '2026-12-31' },
    { type: 'Commercial Auto', verified: true, expirationDate: '2026-12-31' },
    { type: 'Pollution Liability', verified: true, expirationDate: '2026-12-31' },
  ],
  serviceOfferings: [
    { name: 'Hood & Duct Cleaning (NFPA 96-2025)', description: 'Complete exhaust system cleaning to bare metal per NFPA 96 (2025 Edition) and IKECA standards. Includes before/after photographic documentation, access panel installation if needed, and compliance certificate.', frequencyOptions: ['Monthly', 'Quarterly', 'Semi-Annual'], pricingDisplay: '$450 - $1,200' },
    { name: 'Kitchen Equipment Cleaning', description: 'Deep cleaning of all commercial kitchen equipment including grills, fryers, ovens, and prep surfaces. Restaurant-grade degreasers and sanitizers used.', frequencyOptions: ['Weekly', 'Monthly', 'Quarterly'], pricingDisplay: '$200 - $600' },
    { name: 'Rooftop Grease Containment', description: 'Installation and maintenance of rooftop grease containment systems. Prevents grease buildup on roofs that can cause structural damage and fire hazard.', frequencyOptions: ['Quarterly', 'Semi-Annual'], pricingDisplay: '$150 - $350' },
  ],
  contactName: 'Marco Reyes', phone: '(559) 555-0100', email: 'marco@cleaningprosplus.com', website: 'cleaningprosplus.com',
};

// Inject Cleaning Pros Plus into the vendors array
marketplaceVendors.push(cleaningProsPlus);

// Cleaning Pros Plus reviews
marketplaceReviews.push(
  { id: 'mr-26', vendorSlug: 'cleaning-pros-plus', reviewerName: 'Richard T.', reviewerOrg: 'Aramark Food Services', rating: 5, text: 'Cleaning Pros Plus handles all our Yosemite hospitality locations. Marco\'s crew does bare-metal cleaning every time with photographic proof. Their IKECA Master Certification gives us full confidence in NFPA 96 (2025 Edition) compliance.', serviceType: 'Hood Cleaning', date: '2026-01-20', vendorResponse: 'Thank you Richard! We\'re proud to partner with Aramark across your Yosemite properties. Safety is always job one.' },
  { id: 'mr-27', vendorSlug: 'cleaning-pros-plus', reviewerName: 'Patricia V.', reviewerOrg: 'Central Valley School District', rating: 5, text: 'They clean all 14 of our school cafeteria kitchens. Always on schedule, documentation uploaded same day, and they work around our school calendar. The best in the Valley.', serviceType: 'Hood Cleaning', date: '2025-12-08' },
  { id: 'mr-28', vendorSlug: 'cleaning-pros-plus', reviewerName: 'David L.', reviewerOrg: 'Visalia Hotel Group', rating: 5, text: 'Switched to Cleaning Pros after our previous vendor failed an inspection. Night and day difference — their bare metal photos are impressive and the compliance certificate arrives before we even ask.', serviceType: 'Hood Cleaning', date: '2025-10-15', vendorResponse: 'Glad we could help David. Consistent quality and fast documentation is what sets us apart. See you next quarter!' },
);

// ============================================================
// Vendor Dashboard Demo Data
// (from the perspective of ABC Fire Protection as logged-in vendor)
// ============================================================

export interface VendorLead {
  id: string;
  operatorName: string;
  operatorOrg: string;
  serviceType: string;
  locationDetails: string;
  urgency: 'low' | 'normal' | 'high' | 'emergency';
  status: 'new' | 'quoted' | 'accepted' | 'scheduled' | 'in_progress' | 'completed' | 'declined';
  receivedAt: string;
  respondedAt?: string;
  quoteAmount?: number;
  scheduledDate?: string;
  description: string;
}

export interface VendorScheduledService {
  id: string;
  clientOrg: string;
  serviceType: string;
  location: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'confirmed' | 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

export interface VendorCredentialItem {
  id: string;
  name: string;
  type: string;
  status: 'verified' | 'pending' | 'expiring' | 'expired';
  issuedDate?: string;
  expirationDate?: string;
  documentUrl?: string;
  verifiedByEvidly: boolean;
}

export interface VendorSubscriptionPlan {
  id: string;
  name: string;
  price: number | null;
  interval: 'month' | 'per_lead' | null;
  features: string[];
  badge: string | null;
  highlighted?: boolean;
}

export interface VendorAnalyticsSnapshot {
  month: string;
  profileViews: number;
  quoteRequests: number;
  quotesSent: number;
  quotesAccepted: number;
  servicesCompleted: number;
  revenue: number;
}

export interface VendorMessage {
  id: string;
  conversationId: string;
  senderType: 'vendor' | 'operator' | 'system';
  senderName: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export const vendorDashboardStats = {
  activeLeads: 8,
  upcomingServices: 5,
  recentReviews: 3,
  profileViewsMonth: 127,
  leadConversionRate: 62,
  currentTier: 'certified' as MarketplaceTier,
  tierProgress: 82,
  avgResponseTime: 3.8,
  totalServicesCompleted: 342,
  avgRating: 4.6,
};

export const vendorLeads: VendorLead[] = [
  { id: 'vl-1', operatorName: 'James Wilson', operatorOrg: 'Pacific Coast Dining', serviceType: 'Hood Cleaning', locationDetails: '1247 Fulton St, Fresno', urgency: 'high', status: 'new', receivedAt: '2026-02-10T08:30:00', description: 'Hood system cleaning for 3 stations. Last cleaned 7 months ago. Need NFPA 96 (2025 Edition) compliance cert for upcoming inspection.' },
  { id: 'vl-2', operatorName: 'Maria Santos', operatorOrg: 'Campus Dining Services', serviceType: 'Fire Extinguisher', locationDetails: '3400 N First St, Fresno', urgency: 'normal', status: 'new', receivedAt: '2026-02-09T14:15:00', description: '12 fire extinguishers due for annual inspection. Mix of ABC and K-class units.' },
  { id: 'vl-3', operatorName: 'Robert Chang', operatorOrg: 'Valley Restaurant Group', serviceType: 'Hood Cleaning', locationDetails: '890 E Shaw Ave, Fresno', urgency: 'normal', status: 'quoted', receivedAt: '2026-02-07T10:00:00', respondedAt: '2026-02-07T13:45:00', quoteAmount: 650, description: 'Quarterly hood cleaning for single-station restaurant. Standard 8ft hood.' },
  { id: 'vl-4', operatorName: 'Susan Park', operatorOrg: 'Clovis Bistro', serviceType: 'Hood Cleaning', locationDetails: '445 Pollasky Ave, Clovis', urgency: 'high', status: 'quoted', receivedAt: '2026-02-05T09:20:00', respondedAt: '2026-02-05T11:00:00', quoteAmount: 875, description: 'Full exhaust system including rooftop unit. Health inspection in 3 weeks.' },
  { id: 'vl-5', operatorName: 'Tom Harris', operatorOrg: 'Airport Food Services', serviceType: 'Fire Extinguisher', locationDetails: 'Fresno Yosemite Int\'l Airport', urgency: 'low', status: 'accepted', receivedAt: '2026-02-03T11:30:00', respondedAt: '2026-02-03T14:00:00', quoteAmount: 480, scheduledDate: '2026-02-18', description: '8 K-class extinguishers in food court area. Annual service.' },
  { id: 'vl-6', operatorName: 'Lisa Chen', operatorOrg: 'Fresno Eats Group', serviceType: 'Hood Cleaning', locationDetails: '2100 Kern St, Fresno', urgency: 'normal', status: 'scheduled', receivedAt: '2026-01-28T16:00:00', respondedAt: '2026-01-28T18:30:00', quoteAmount: 750, scheduledDate: '2026-02-14', description: 'Quarterly hood and duct cleaning. Two stations with 12ft hoods.' },
  { id: 'vl-7', operatorName: 'Kevin Martinez', operatorOrg: 'Downtown Grill', serviceType: 'Hood Cleaning', locationDetails: '678 Van Ness Ave, Fresno', urgency: 'normal', status: 'completed', receivedAt: '2026-01-15T09:00:00', respondedAt: '2026-01-15T10:30:00', quoteAmount: 550, scheduledDate: '2026-01-22', description: 'Quarterly hood cleaning. Single station, standard size.' },
  { id: 'vl-8', operatorName: 'Amanda White', operatorOrg: 'Merced Kitchen Co', serviceType: 'Hood Cleaning', locationDetails: '1500 R St, Merced', urgency: 'low', status: 'declined', receivedAt: '2026-01-20T13:00:00', respondedAt: '2026-01-20T15:00:00', description: 'Outside our primary service area. Referred to partner company.' },
];

export const vendorScheduledServices: VendorScheduledService[] = [
  { id: 'vs-1', clientOrg: 'Fresno Eats Group', serviceType: 'Hood Cleaning', location: '2100 Kern St, Fresno', scheduledDate: '2026-02-14', scheduledTime: '10:00 PM', status: 'confirmed', notes: 'Night shift cleaning. Key code: 4521. Two 12ft hoods.' },
  { id: 'vs-2', clientOrg: 'Airport Food Services', serviceType: 'Fire Extinguisher', location: 'Fresno Yosemite Int\'l Airport', scheduledDate: '2026-02-18', scheduledTime: '6:00 AM', status: 'confirmed', notes: 'Before terminal opens. Check in at security desk. 8 K-class units.' },
  { id: 'vs-3', clientOrg: 'Valley BBQ', serviceType: 'Hood Cleaning', location: '3200 N Blackstone, Fresno', scheduledDate: '2026-02-21', scheduledTime: '11:00 PM', status: 'pending', notes: 'Heavy grease buildup expected. Bring extra degreaser.' },
  { id: 'vs-4', clientOrg: 'Clovis Bistro', serviceType: 'Hood Cleaning', location: '445 Pollasky Ave, Clovis', scheduledDate: '2026-02-25', scheduledTime: '10:00 PM', status: 'pending' },
  { id: 'vs-5', clientOrg: 'Pacific Coast Dining', serviceType: 'Hood Cleaning', location: '1247 Fulton St, Fresno', scheduledDate: '2026-03-01', scheduledTime: '11:00 PM', status: 'pending', notes: '3-station system. Full duct access from roof.' },
];

export const vendorCredentials: VendorCredentialItem[] = [
  { id: 'vc-1', name: 'IKECA Certified Exhaust Cleaning Specialist', type: 'certification', status: 'verified', issuedDate: '2024-03-15', expirationDate: '2027-03-15', verifiedByEvidly: true },
  { id: 'vc-2', name: 'State Fire Marshal License #FM-28491', type: 'license', status: 'verified', issuedDate: '2025-01-01', expirationDate: '2026-12-31', verifiedByEvidly: true },
  { id: 'vc-3', name: 'General Liability Insurance ($1M)', type: 'insurance', status: 'verified', issuedDate: '2025-09-15', expirationDate: '2026-09-15', verifiedByEvidly: true },
  { id: 'vc-4', name: 'Workers Compensation Insurance', type: 'insurance', status: 'verified', issuedDate: '2025-09-15', expirationDate: '2026-09-15', verifiedByEvidly: true },
  { id: 'vc-5', name: 'OSHA 10-Hour Safety Certification', type: 'certification', status: 'verified', issuedDate: '2023-06-01', verifiedByEvidly: true },
  { id: 'vc-6', name: 'Vehicle Insurance — Fleet Policy', type: 'insurance', status: 'expiring', issuedDate: '2025-03-01', expirationDate: '2026-03-01', verifiedByEvidly: true },
];

export const vendorSubscriptionPlans: VendorSubscriptionPlan[] = [
  { id: 'plan-free', name: 'EvidLY Listed', price: 0, interval: null, badge: null, features: ['Basic marketplace listing', 'Up to 5 quote requests/month', 'Upload credentials for verification', 'Respond to service requests'] },
  { id: 'plan-standard', name: 'Standard', price: 49, interval: 'month', badge: 'EvidLY Verified', highlighted: true, features: ['Unlimited quote requests', 'EvidLY Verified badge', 'Priority search placement', 'Business analytics dashboard', 'AI-generated recommendations', 'Profile enhancement (photos, packages)'] },
  { id: 'plan-premium', name: 'Premium', price: 99, interval: 'month', badge: 'EvidLY Preferred', features: ['Everything in Standard', 'Top placement in search & AI', 'Featured on category pages', 'Lead notification via SMS', 'Quarterly performance report', '"EvidLY Preferred" badge eligibility', 'Co-marketing opportunities'] },
  { id: 'plan-lead', name: 'Per-Lead', price: 25, interval: 'per_lead', badge: null, features: ['No monthly fee', '$25 per qualified lead', '$50 per scheduled service', 'Pay only when you get leads', 'Good for testing the platform'] },
];

export const vendorCurrentSubscription = { plan: 'free', status: 'active' as const };

export const vendorAnalyticsData: VendorAnalyticsSnapshot[] = [
  { month: 'Mar 2025', profileViews: 45, quoteRequests: 3, quotesSent: 3, quotesAccepted: 2, servicesCompleted: 8, revenue: 4200 },
  { month: 'Apr 2025', profileViews: 52, quoteRequests: 4, quotesSent: 4, quotesAccepted: 3, servicesCompleted: 10, revenue: 5100 },
  { month: 'May 2025', profileViews: 61, quoteRequests: 5, quotesSent: 5, quotesAccepted: 3, servicesCompleted: 11, revenue: 5800 },
  { month: 'Jun 2025', profileViews: 68, quoteRequests: 5, quotesSent: 4, quotesAccepted: 3, servicesCompleted: 12, revenue: 6200 },
  { month: 'Jul 2025', profileViews: 78, quoteRequests: 6, quotesSent: 6, quotesAccepted: 4, servicesCompleted: 14, revenue: 7400 },
  { month: 'Aug 2025', profileViews: 85, quoteRequests: 7, quotesSent: 6, quotesAccepted: 4, servicesCompleted: 13, revenue: 6900 },
  { month: 'Sep 2025', profileViews: 92, quoteRequests: 7, quotesSent: 7, quotesAccepted: 5, servicesCompleted: 15, revenue: 8100 },
  { month: 'Oct 2025', profileViews: 98, quoteRequests: 8, quotesSent: 7, quotesAccepted: 5, servicesCompleted: 14, revenue: 7600 },
  { month: 'Nov 2025', profileViews: 105, quoteRequests: 6, quotesSent: 6, quotesAccepted: 4, servicesCompleted: 12, revenue: 6400 },
  { month: 'Dec 2025', profileViews: 88, quoteRequests: 5, quotesSent: 5, quotesAccepted: 3, servicesCompleted: 11, revenue: 5900 },
  { month: 'Jan 2026', profileViews: 112, quoteRequests: 8, quotesSent: 7, quotesAccepted: 5, servicesCompleted: 16, revenue: 8500 },
  { month: 'Feb 2026', profileViews: 127, quoteRequests: 8, quotesSent: 6, quotesAccepted: 4, servicesCompleted: 9, revenue: 4800 },
];

export const vendorMessages: VendorMessage[] = [
  { id: 'vm-1', conversationId: 'conv-1', senderType: 'operator', senderName: 'James Wilson', message: 'Hi, we need hood cleaning for 3 stations. Can you accommodate a night shift next week?', timestamp: '2026-02-10T08:30:00', read: true },
  { id: 'vm-2', conversationId: 'conv-1', senderType: 'vendor', senderName: 'John (ABC Fire)', message: 'Hi James! Yes, we can do Tuesday or Wednesday night next week. I\'ll send a quote shortly.', timestamp: '2026-02-10T09:15:00', read: true },
  { id: 'vm-3', conversationId: 'conv-1', senderType: 'operator', senderName: 'James Wilson', message: 'Wednesday works better for us. We close at 10pm. Key code for back entrance is 4521.', timestamp: '2026-02-10T09:45:00', read: false },
  { id: 'vm-4', conversationId: 'conv-2', senderType: 'operator', senderName: 'Lisa Chen', message: 'Confirming our Feb 14 appointment. Can your crew arrive by 10pm? We close early on Fridays.', timestamp: '2026-02-08T16:00:00', read: true },
  { id: 'vm-5', conversationId: 'conv-2', senderType: 'vendor', senderName: 'John (ABC Fire)', message: 'Confirmed! We\'ll have a 3-person crew there by 10pm sharp. Should take about 4 hours for both hoods.', timestamp: '2026-02-08T16:30:00', read: true },
  { id: 'vm-6', conversationId: 'conv-2', senderType: 'system', senderName: 'EvidLY', message: 'Service appointment confirmed for Feb 14, 2026 at 10:00 PM. Both parties will receive a reminder 24 hours before.', timestamp: '2026-02-08T16:31:00', read: true },
];

// ============================================================
// Enterprise White-Label Demo Data
// ============================================================

export type EnterpriseTenantStatus = 'active' | 'onboarding' | 'pilot' | 'suspended';
export type SSOProviderType = 'saml' | 'oidc' | 'none';
export type HierarchyLevel = 'corporate' | 'division' | 'region' | 'district' | 'location';

export interface EnterpriseTenant {
  id: string;
  slug: string;
  displayName: string;
  logoPlaceholder: string;
  poweredByText: string;
  showPoweredBy: boolean;
  status: EnterpriseTenantStatus;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    sidebarBg: string;
    sidebarText: string;
    logoText: string;
  };
  domain: string;
  ssoConfig: {
    providerType: SSOProviderType;
    providerName: string;
    metadataUrl: string;
    entityId: string;
    acsUrl: string;
    attributeMapping: Record<string, string>;
    enabled: boolean;
    lastTestAt: string | null;
    testStatus: 'passed' | 'failed' | 'untested';
  };
  scimEnabled: boolean;
  scimEndpoint: string;
  features: {
    customReports: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    advancedAnalytics: boolean;
    scimProvisioning: boolean;
    multiRegionRollup: boolean;
    customHierarchy: boolean;
    dedicatedCSM: boolean;
  };
  hierarchy: { key: HierarchyLevel; label: string }[];
  contract: {
    tier: 'enterprise' | 'enterprise_plus';
    startDate: string;
    endDate: string;
    annualValue: number;
    locationCount: number;
    maxLocations: number;
    dedicatedCSM: string;
  };
  stats: {
    activeUsers: number;
    totalLocations: number;
    avgComplianceScore: number;
    lastSyncAt: string;
  };
}

export interface EnterpriseHierarchyNode {
  id: string;
  tenantId: string;
  parentId: string | null;
  level: HierarchyLevel;
  name: string;
  code: string;
  complianceScore: number;
  locationCount: number;
  foodSafety: number;
  fireSafety: number;
  vendorCompliance: number;
  children?: EnterpriseHierarchyNode[];
}

export interface EnterpriseUser {
  id: string;
  tenantId: string;
  tenantName: string;
  name: string;
  email: string;
  role: string;
  location: string;
  ssoStatus: 'active' | 'pending' | 'disabled';
  lastLogin: string;
  scimManaged: boolean;
  externalId: string;
  groups: string[];
}

export interface EnterpriseReportTemplate {
  id: string;
  tenantId: string;
  tenantName: string;
  name: string;
  templateType: 'executive_summary' | 'regional_rollup' | 'location_detail' | 'audit_package';
  sections: string[];
  brandWatermark: boolean;
  exportFormats: string[];
  isDefault: boolean;
}

export interface EnterpriseAuditEntry {
  id: string;
  tenantId: string;
  tenantName: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceName: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

export const enterpriseTenants: EnterpriseTenant[] = [
  {
    id: 'ent-aramark',
    slug: 'aramark',
    displayName: 'Aramark Compliance Hub',
    logoPlaceholder: 'AR',
    poweredByText: 'Powered by EvidLY',
    showPoweredBy: true,
    status: 'active',
    branding: {
      primaryColor: '#C8102E',
      secondaryColor: '#002855',
      accentColor: '#F0AB00',
      sidebarBg: '#002855',
      sidebarText: '#FFFFFF',
      logoText: 'Aramark Compliance Hub',
    },
    domain: 'compliance.aramark.com',
    ssoConfig: {
      providerType: 'saml',
      providerName: 'Okta',
      metadataUrl: 'https://aramark.okta.com/app/exk1234567890/sso/saml/metadata',
      entityId: 'compliance.aramark.com',
      acsUrl: 'https://compliance.aramark.com/auth/saml/callback',
      attributeMapping: { email: 'user.email', firstName: 'user.firstName', lastName: 'user.lastName', groups: 'user.groups', employeeId: 'user.employeeNumber' },
      enabled: true,
      lastTestAt: '2026-02-08T14:30:00Z',
      testStatus: 'passed',
    },
    scimEnabled: true,
    scimEndpoint: 'https://api.evidly.com/scim/v2/aramark',
    features: { customReports: true, apiAccess: true, whiteLabel: true, advancedAnalytics: true, scimProvisioning: true, multiRegionRollup: true, customHierarchy: true, dedicatedCSM: true },
    hierarchy: [
      { key: 'corporate', label: 'Corporate' },
      { key: 'division', label: 'Business Unit' },
      { key: 'region', label: 'Region' },
      { key: 'district', label: 'District' },
      { key: 'location', label: 'Account' },
    ],
    contract: { tier: 'enterprise_plus', startDate: '2026-07-01', endDate: '2029-06-30', annualValue: 2400000, locationCount: 1847, maxLocations: 3000, dedicatedCSM: 'Arthur Haggerty' },
    stats: { activeUsers: 4126, totalLocations: 1847, avgComplianceScore: 90.0, lastSyncAt: '2026-02-10T06:00:00Z' },
  },
  {
    id: 'ent-compass',
    slug: 'compass',
    displayName: 'Compass Compliance',
    logoPlaceholder: 'CG',
    poweredByText: 'Powered by EvidLY',
    showPoweredBy: true,
    status: 'active',
    branding: {
      primaryColor: '#003DA5',
      secondaryColor: '#1B365D',
      accentColor: '#FFB81C',
      sidebarBg: '#1B365D',
      sidebarText: '#FFFFFF',
      logoText: 'Compass Compliance',
    },
    domain: 'compliance.compass-group.com',
    ssoConfig: {
      providerType: 'oidc',
      providerName: 'Azure AD',
      metadataUrl: 'https://login.microsoftonline.com/compass-group.com/.well-known/openid-configuration',
      entityId: 'compliance.compass-group.com',
      acsUrl: 'https://compliance.compass-group.com/auth/oidc/callback',
      attributeMapping: { email: 'preferred_username', firstName: 'given_name', lastName: 'family_name', groups: 'groups', employeeId: 'employee_id' },
      enabled: true,
      lastTestAt: '2026-02-07T10:15:00Z',
      testStatus: 'passed',
    },
    scimEnabled: true,
    scimEndpoint: 'https://api.evidly.com/scim/v2/compass',
    features: { customReports: true, apiAccess: true, whiteLabel: true, advancedAnalytics: true, scimProvisioning: true, multiRegionRollup: true, customHierarchy: true, dedicatedCSM: true },
    hierarchy: [
      { key: 'corporate', label: 'Global HQ' },
      { key: 'division', label: 'Sector' },
      { key: 'region', label: 'Country' },
      { key: 'district', label: 'Area' },
      { key: 'location', label: 'Unit' },
    ],
    contract: { tier: 'enterprise_plus', startDate: '2026-09-01', endDate: '2029-08-31', annualValue: 1800000, locationCount: 1234, maxLocations: 2500, dedicatedCSM: 'Sarah Mitchell' },
    stats: { activeUsers: 2891, totalLocations: 1234, avgComplianceScore: 86.1, lastSyncAt: '2026-02-10T05:30:00Z' },
  },
  {
    id: 'ent-sodexo',
    slug: 'sodexo',
    displayName: 'Sodexo Safe Kitchen',
    logoPlaceholder: 'SO',
    poweredByText: 'Powered by EvidLY',
    showPoweredBy: false,
    status: 'pilot',
    branding: {
      primaryColor: '#ED1C24',
      secondaryColor: '#231F20',
      accentColor: '#00A0DF',
      sidebarBg: '#231F20',
      sidebarText: '#FFFFFF',
      logoText: 'Sodexo Safe Kitchen',
    },
    domain: 'safekitchen.sodexo.com',
    ssoConfig: {
      providerType: 'none',
      providerName: '',
      metadataUrl: '',
      entityId: 'safekitchen.sodexo.com',
      acsUrl: 'https://safekitchen.sodexo.com/auth/saml/callback',
      attributeMapping: {},
      enabled: false,
      lastTestAt: null,
      testStatus: 'untested',
    },
    scimEnabled: false,
    scimEndpoint: 'https://api.evidly.com/scim/v2/sodexo',
    features: { customReports: true, apiAccess: false, whiteLabel: true, advancedAnalytics: false, scimProvisioning: false, multiRegionRollup: true, customHierarchy: true, dedicatedCSM: true },
    hierarchy: [
      { key: 'corporate', label: 'Headquarters' },
      { key: 'division', label: 'Division' },
      { key: 'region', label: 'Region' },
      { key: 'district', label: 'District' },
      { key: 'location', label: 'Site' },
    ],
    contract: { tier: 'enterprise', startDate: '2026-10-01', endDate: '2027-09-30', annualValue: 950000, locationCount: 623, maxLocations: 1500, dedicatedCSM: 'David Nguyen' },
    stats: { activeUsers: 1224, totalLocations: 623, avgComplianceScore: 84.7, lastSyncAt: '2026-02-09T22:00:00Z' },
  },
];

export const enterpriseHierarchy: EnterpriseHierarchyNode = {
  id: 'h-corp', tenantId: 'ent-aramark', parentId: null, level: 'corporate', name: 'Aramark Corporation', code: 'ARMK',
  complianceScore: 90, locationCount: 1847, foodSafety: 92, fireSafety: 88, vendorCompliance: 89,
  children: [
    {
      id: 'h-higher-ed', tenantId: 'ent-aramark', parentId: 'h-corp', level: 'division', name: 'Higher Education', code: 'ARMK-HE',
      complianceScore: 91, locationCount: 847, foodSafety: 93, fireSafety: 89, vendorCompliance: 90,
      children: [
        {
          id: 'h-he-west', tenantId: 'ent-aramark', parentId: 'h-higher-ed', level: 'region', name: 'Western Region', code: 'ARMK-HE-W',
          complianceScore: 90, locationCount: 254, foodSafety: 92, fireSafety: 88, vendorCompliance: 89,
          children: [
            { id: 'h-he-w-pac', tenantId: 'ent-aramark', parentId: 'h-he-west', level: 'district', name: 'Pacific Northwest', code: 'ARMK-HE-W-PNW', complianceScore: 91, locationCount: 86, foodSafety: 93, fireSafety: 89, vendorCompliance: 90 },
            { id: 'h-he-w-cal', tenantId: 'ent-aramark', parentId: 'h-he-west', level: 'district', name: 'California', code: 'ARMK-HE-W-CA', complianceScore: 89, locationCount: 102, foodSafety: 91, fireSafety: 87, vendorCompliance: 88 },
            { id: 'h-he-w-sw', tenantId: 'ent-aramark', parentId: 'h-he-west', level: 'district', name: 'Southwest', code: 'ARMK-HE-W-SW', complianceScore: 90, locationCount: 66, foodSafety: 92, fireSafety: 88, vendorCompliance: 89 },
          ],
        },
        {
          id: 'h-he-central', tenantId: 'ent-aramark', parentId: 'h-higher-ed', level: 'region', name: 'Central Region', code: 'ARMK-HE-C',
          complianceScore: 92, locationCount: 298, foodSafety: 94, fireSafety: 90, vendorCompliance: 91,
        },
        {
          id: 'h-he-east', tenantId: 'ent-aramark', parentId: 'h-higher-ed', level: 'region', name: 'Eastern Region', code: 'ARMK-HE-E',
          complianceScore: 91, locationCount: 295, foodSafety: 93, fireSafety: 89, vendorCompliance: 90,
          children: [
            { id: 'h-he-e-ne', tenantId: 'ent-aramark', parentId: 'h-he-east', level: 'district', name: 'New England', code: 'ARMK-HE-E-NE', complianceScore: 93, locationCount: 98, foodSafety: 95, fireSafety: 91, vendorCompliance: 92 },
            { id: 'h-he-e-ma', tenantId: 'ent-aramark', parentId: 'h-he-east', level: 'district', name: 'Mid-Atlantic', code: 'ARMK-HE-E-MA', complianceScore: 90, locationCount: 112, foodSafety: 92, fireSafety: 88, vendorCompliance: 89,
              children: [
                { id: 'h-he-e-ma-temple', tenantId: 'ent-aramark', parentId: 'h-he-e-ma', level: 'location', name: 'Temple University', code: 'ARMK-TU-001', complianceScore: 68, locationCount: 1, foodSafety: 72, fireSafety: 64, vendorCompliance: 66 },
              ],
            },
            { id: 'h-he-e-se', tenantId: 'ent-aramark', parentId: 'h-he-east', level: 'district', name: 'Southeast', code: 'ARMK-HE-E-SE', complianceScore: 91, locationCount: 85, foodSafety: 93, fireSafety: 89, vendorCompliance: 90 },
          ],
        },
      ],
    },
    {
      id: 'h-healthcare', tenantId: 'ent-aramark', parentId: 'h-corp', level: 'division', name: 'Healthcare', code: 'ARMK-HC',
      complianceScore: 95, locationCount: 312, foodSafety: 96, fireSafety: 93, vendorCompliance: 94,
      children: [
        { id: 'h-hc-west', tenantId: 'ent-aramark', parentId: 'h-healthcare', level: 'region', name: 'Western Region', code: 'ARMK-HC-W', complianceScore: 94, locationCount: 94, foodSafety: 95, fireSafety: 92, vendorCompliance: 93 },
        { id: 'h-hc-central', tenantId: 'ent-aramark', parentId: 'h-healthcare', level: 'region', name: 'Central Region', code: 'ARMK-HC-C', complianceScore: 95, locationCount: 112, foodSafety: 97, fireSafety: 93, vendorCompliance: 94 },
        { id: 'h-hc-east', tenantId: 'ent-aramark', parentId: 'h-healthcare', level: 'region', name: 'Eastern Region', code: 'ARMK-HC-E', complianceScore: 95, locationCount: 106, foodSafety: 96, fireSafety: 94, vendorCompliance: 95 },
      ],
    },
    {
      id: 'h-destinations', tenantId: 'ent-aramark', parentId: 'h-corp', level: 'division', name: 'Destinations', code: 'ARMK-DEST',
      complianceScore: 88, locationCount: 89, foodSafety: 90, fireSafety: 86, vendorCompliance: 87,
      children: [
        {
          id: 'h-dest-parks', tenantId: 'ent-aramark', parentId: 'h-destinations', level: 'region', name: 'National Parks', code: 'ARMK-DEST-NP',
          complianceScore: 89, locationCount: 32, foodSafety: 91, fireSafety: 87, vendorCompliance: 88,
          children: [
            {
              id: 'h-dest-np-yosemite', tenantId: 'ent-aramark', parentId: 'h-dest-parks', level: 'district', name: 'Yosemite District', code: 'ARMK-DEST-YOS',
              complianceScore: 89, locationCount: 7, foodSafety: 91, fireSafety: 87, vendorCompliance: 88,
              children: [
                { id: 'h-yos-lodge', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'Yosemite Valley Lodge', code: 'YOS-001', complianceScore: 92, locationCount: 1, foodSafety: 94, fireSafety: 90, vendorCompliance: 91 },
                { id: 'h-yos-ahwahnee', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'The Ahwahnee Dining Room', code: 'YOS-002', complianceScore: 94, locationCount: 1, foodSafety: 96, fireSafety: 92, vendorCompliance: 93 },
                { id: 'h-yos-curry', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'Half Dome Village Pavilion', code: 'YOS-003', complianceScore: 87, locationCount: 1, foodSafety: 89, fireSafety: 85, vendorCompliance: 86 },
                { id: 'h-yos-tuolumne', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'Tuolumne Meadows Grill', code: 'YOS-004', complianceScore: 83, locationCount: 1, foodSafety: 85, fireSafety: 81, vendorCompliance: 82 },
                { id: 'h-yos-glacier', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'Glacier Point Snack Stand', code: 'YOS-005', complianceScore: 86, locationCount: 1, foodSafety: 88, fireSafety: 84, vendorCompliance: 85 },
                { id: 'h-yos-village', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'Village Grill & Pizza Deck', code: 'YOS-006', complianceScore: 90, locationCount: 1, foodSafety: 92, fireSafety: 88, vendorCompliance: 89 },
                { id: 'h-yos-white-wolf', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'White Wolf Lodge Dining', code: 'YOS-007', complianceScore: 88, locationCount: 1, foodSafety: 90, fireSafety: 86, vendorCompliance: 87 },
              ],
            },
            { id: 'h-dest-np-glacier', tenantId: 'ent-aramark', parentId: 'h-dest-parks', level: 'district', name: 'Glacier National Park', code: 'ARMK-DEST-GNP', complianceScore: 88, locationCount: 8, foodSafety: 90, fireSafety: 86, vendorCompliance: 87 },
            { id: 'h-dest-np-grandcanyon', tenantId: 'ent-aramark', parentId: 'h-dest-parks', level: 'district', name: 'Grand Canyon District', code: 'ARMK-DEST-GC', complianceScore: 91, locationCount: 6, foodSafety: 93, fireSafety: 89, vendorCompliance: 90 },
            { id: 'h-dest-np-other', tenantId: 'ent-aramark', parentId: 'h-dest-parks', level: 'district', name: 'Other National Parks', code: 'ARMK-DEST-ONP', complianceScore: 90, locationCount: 11, foodSafety: 92, fireSafety: 88, vendorCompliance: 89 },
          ],
        },
        {
          id: 'h-dest-ski', tenantId: 'ent-aramark', parentId: 'h-destinations', level: 'region', name: 'Ski Resorts', code: 'ARMK-DEST-SKI',
          complianceScore: 87, locationCount: 28, foodSafety: 89, fireSafety: 85, vendorCompliance: 86,
          children: [
            { id: 'h-dest-ski-badger', tenantId: 'ent-aramark', parentId: 'h-dest-ski', level: 'location', name: 'Badger Pass Ski Area', code: 'ARMK-DEST-BP', complianceScore: 74, locationCount: 1, foodSafety: 78, fireSafety: 70, vendorCompliance: 72 },
            { id: 'h-dest-ski-mammoth', tenantId: 'ent-aramark', parentId: 'h-dest-ski', level: 'location', name: 'Mammoth Mountain Lodge', code: 'ARMK-DEST-MM', complianceScore: 88, locationCount: 1, foodSafety: 90, fireSafety: 86, vendorCompliance: 87 },
          ],
        },
        {
          id: 'h-dest-conv', tenantId: 'ent-aramark', parentId: 'h-destinations', level: 'region', name: 'Convention Centers', code: 'ARMK-DEST-CC',
          complianceScore: 89, locationCount: 29, foodSafety: 91, fireSafety: 87, vendorCompliance: 88,
        },
      ],
    },
    {
      id: 'h-corrections', tenantId: 'ent-aramark', parentId: 'h-corp', level: 'division', name: 'Corrections', code: 'ARMK-CR',
      complianceScore: 86, locationCount: 156, foodSafety: 88, fireSafety: 84, vendorCompliance: 85,
      children: [
        { id: 'h-cr-federal', tenantId: 'ent-aramark', parentId: 'h-corrections', level: 'region', name: 'Federal Facilities', code: 'ARMK-CR-FED', complianceScore: 87, locationCount: 42, foodSafety: 89, fireSafety: 85, vendorCompliance: 86 },
        { id: 'h-cr-state', tenantId: 'ent-aramark', parentId: 'h-corrections', level: 'region', name: 'State Facilities', code: 'ARMK-CR-ST', complianceScore: 85, locationCount: 78, foodSafety: 87, fireSafety: 83, vendorCompliance: 84 },
        { id: 'h-cr-county', tenantId: 'ent-aramark', parentId: 'h-corrections', level: 'region', name: 'County Facilities', code: 'ARMK-CR-CTY', complianceScore: 86, locationCount: 36, foodSafety: 88, fireSafety: 84, vendorCompliance: 85 },
      ],
    },
    {
      id: 'h-sports', tenantId: 'ent-aramark', parentId: 'h-corp', level: 'division', name: 'Sports & Entertainment', code: 'ARMK-SE',
      complianceScore: 88, locationCount: 443, foodSafety: 90, fireSafety: 86, vendorCompliance: 87,
      children: [
        {
          id: 'h-se-west', tenantId: 'ent-aramark', parentId: 'h-sports', level: 'region', name: 'Western Region', code: 'ARMK-SE-W',
          complianceScore: 87, locationCount: 133, foodSafety: 89, fireSafety: 85, vendorCompliance: 86,
          children: [
            { id: 'h-se-w-bay', tenantId: 'ent-aramark', parentId: 'h-se-west', level: 'district', name: 'Bay Area District', code: 'ARMK-SE-W-BAY', complianceScore: 86, locationCount: 42, foodSafety: 88, fireSafety: 84, vendorCompliance: 85 },
            { id: 'h-se-w-socal', tenantId: 'ent-aramark', parentId: 'h-se-west', level: 'district', name: 'SoCal District', code: 'ARMK-SE-W-SC', complianceScore: 85, locationCount: 48, foodSafety: 87, fireSafety: 83, vendorCompliance: 84 },
            { id: 'h-se-w-pnw', tenantId: 'ent-aramark', parentId: 'h-se-west', level: 'district', name: 'Pacific Northwest', code: 'ARMK-SE-W-PNW', complianceScore: 89, locationCount: 43, foodSafety: 91, fireSafety: 87, vendorCompliance: 88 },
          ],
        },
        { id: 'h-se-central', tenantId: 'ent-aramark', parentId: 'h-sports', level: 'region', name: 'Central Region', code: 'ARMK-SE-C', complianceScore: 88, locationCount: 155, foodSafety: 90, fireSafety: 86, vendorCompliance: 87 },
        { id: 'h-se-east', tenantId: 'ent-aramark', parentId: 'h-sports', level: 'region', name: 'Eastern Region', code: 'ARMK-SE-E', complianceScore: 88, locationCount: 155, foodSafety: 90, fireSafety: 86, vendorCompliance: 87 },
      ],
    },
  ],
};

export const enterpriseUsers: EnterpriseUser[] = [
  { id: 'eu-1', tenantId: 'ent-aramark', tenantName: 'Aramark', name: 'Jennifer Martinez', email: 'j.martinez@aramark.com', role: 'Corporate Admin', location: 'Corporate HQ', ssoStatus: 'active', lastLogin: '2026-02-10T08:15:00Z', scimManaged: true, externalId: 'ARM-10042', groups: ['Compliance_Admins', 'Corporate_Leadership'] },
  { id: 'eu-2', tenantId: 'ent-aramark', tenantName: 'Aramark', name: 'Robert Chen', email: 'r.chen@aramark.com', role: 'Regional Manager', location: 'Western Region', ssoStatus: 'active', lastLogin: '2026-02-10T07:30:00Z', scimManaged: true, externalId: 'ARM-20156', groups: ['Regional_Managers', 'Sports_Leisure'] },
  { id: 'eu-3', tenantId: 'ent-aramark', tenantName: 'Aramark', name: 'Maria Santos', email: 'm.santos@aramark.com', role: 'District Supervisor', location: 'Yosemite District', ssoStatus: 'active', lastLogin: '2026-02-09T16:45:00Z', scimManaged: true, externalId: 'ARM-30289', groups: ['District_Managers', 'Sports_Leisure'] },
  { id: 'eu-4', tenantId: 'ent-aramark', tenantName: 'Aramark', name: 'David Kim', email: 'd.kim@aramark.com', role: 'Site Manager', location: 'Yosemite Valley Lodge', ssoStatus: 'active', lastLogin: '2026-02-10T06:00:00Z', scimManaged: true, externalId: 'ARM-40512', groups: ['Site_Managers'] },
  { id: 'eu-5', tenantId: 'ent-aramark', tenantName: 'Aramark', name: 'Sarah Thompson', email: 's.thompson@aramark.com', role: 'Site Manager', location: 'The Ahwahnee', ssoStatus: 'active', lastLogin: '2026-02-09T22:10:00Z', scimManaged: true, externalId: 'ARM-40513', groups: ['Site_Managers'] },
  { id: 'eu-6', tenantId: 'ent-aramark', tenantName: 'Aramark', name: 'Kevin Patel', email: 'k.patel@aramark.com', role: 'Inspector', location: 'Western Region', ssoStatus: 'pending', lastLogin: '', scimManaged: true, externalId: 'ARM-50071', groups: ['Quality_Inspectors'] },
  { id: 'eu-7', tenantId: 'ent-compass', tenantName: 'Compass Group', name: 'Emma Williams', email: 'e.williams@compass-group.com', role: 'Corporate Admin', location: 'Global HQ', ssoStatus: 'active', lastLogin: '2026-02-10T09:00:00Z', scimManaged: true, externalId: 'CG-10001', groups: ['Platform_Admins', 'Global_Leadership'] },
  { id: 'eu-8', tenantId: 'ent-compass', tenantName: 'Compass Group', name: 'James O\'Brien', email: 'j.obrien@compass-group.com', role: 'Regional Manager', location: 'North America', ssoStatus: 'active', lastLogin: '2026-02-09T18:20:00Z', scimManaged: true, externalId: 'CG-20034', groups: ['Regional_Managers'] },
  { id: 'eu-9', tenantId: 'ent-compass', tenantName: 'Compass Group', name: 'Lisa Nakamura', email: 'l.nakamura@compass-group.com', role: 'Area Manager', location: 'West Coast Area', ssoStatus: 'active', lastLogin: '2026-02-10T07:45:00Z', scimManaged: true, externalId: 'CG-30112', groups: ['Area_Managers', 'Chartwells'] },
  { id: 'eu-10', tenantId: 'ent-compass', tenantName: 'Compass Group', name: 'Michael Torres', email: 'm.torres@compass-group.com', role: 'Unit Manager', location: 'Stanford Dining', ssoStatus: 'active', lastLogin: '2026-02-09T14:30:00Z', scimManaged: false, externalId: 'CG-40256', groups: ['Unit_Managers'] },
  { id: 'eu-11', tenantId: 'ent-compass', tenantName: 'Compass Group', name: 'Rachel Singh', email: 'r.singh@compass-group.com', role: 'Quality Inspector', location: 'North America', ssoStatus: 'disabled', lastLogin: '2026-01-15T11:00:00Z', scimManaged: true, externalId: 'CG-50008', groups: ['Quality_Team'] },
  { id: 'eu-12', tenantId: 'ent-sodexo', tenantName: 'Sodexo', name: 'Pierre Dubois', email: 'p.dubois@sodexo.com', role: 'Platform Admin', location: 'Headquarters', ssoStatus: 'pending', lastLogin: '', scimManaged: false, externalId: '', groups: [] },
  { id: 'eu-13', tenantId: 'ent-sodexo', tenantName: 'Sodexo', name: 'Angela Rivera', email: 'a.rivera@sodexo.com', role: 'Regional Director', location: 'North America Division', ssoStatus: 'pending', lastLogin: '', scimManaged: false, externalId: '', groups: [] },
  { id: 'eu-14', tenantId: 'ent-sodexo', tenantName: 'Sodexo', name: 'Mark Johnson', email: 'm.johnson@sodexo.com', role: 'District Manager', location: 'California District', ssoStatus: 'pending', lastLogin: '', scimManaged: false, externalId: '', groups: [] },
  { id: 'eu-15', tenantId: 'ent-sodexo', tenantName: 'Sodexo', name: 'Yuki Tanaka', email: 'y.tanaka@sodexo.com', role: 'Site Coordinator', location: 'Kaiser SF Medical', ssoStatus: 'pending', lastLogin: '', scimManaged: false, externalId: '', groups: [] },
];

export const enterpriseReportTemplates: EnterpriseReportTemplate[] = [
  { id: 'ert-1', tenantId: 'ent-aramark', tenantName: 'Aramark', name: 'Executive Summary — Monthly', templateType: 'executive_summary', sections: ['Compliance Overview', 'Score Trends', 'Top Issues', 'Action Items', 'Vendor Status'], brandWatermark: true, exportFormats: ['PDF', 'Excel'], isDefault: true },
  { id: 'ert-2', tenantId: 'ent-aramark', tenantName: 'Aramark', name: 'Regional Compliance Rollup', templateType: 'regional_rollup', sections: ['Region Summary', 'District Comparison', 'Score Heatmap', 'Drill-Down Tables', 'Trend Analysis'], brandWatermark: true, exportFormats: ['PDF', 'CSV', 'Excel'], isDefault: false },
  { id: 'ert-3', tenantId: 'ent-compass', tenantName: 'Compass Group', name: 'Quarterly Audit Package', templateType: 'audit_package', sections: ['Audit Summary', 'Inspection Results', 'Corrective Actions', 'Documentation Status', 'Certification Tracking', 'Sign-Off Sheet'], brandWatermark: true, exportFormats: ['PDF'], isDefault: true },
  { id: 'ert-4', tenantId: 'ent-sodexo', tenantName: 'Sodexo', name: 'Location Detail Report', templateType: 'location_detail', sections: ['Site Overview', 'Temperature Logs', 'Checklist Completion', 'Equipment Status', 'Vendor Documents'], brandWatermark: false, exportFormats: ['PDF', 'CSV'], isDefault: true },
  { id: 'ert-5', tenantId: 'ent-aramark', tenantName: 'Aramark', name: 'Board Compliance Report', templateType: 'executive_summary', sections: ['Executive Summary', 'Risk Categories', 'Regulatory Compliance', 'Year-over-Year Trends', 'Strategic Recommendations', 'Financial Impact Analysis'], brandWatermark: true, exportFormats: ['PDF', 'PowerPoint'], isDefault: false },
  { id: 'ert-6', tenantId: 'ent-compass', tenantName: 'Compass Group', name: 'Vendor Performance Review', templateType: 'regional_rollup', sections: ['Vendor Scorecard', 'Service Completion Rates', 'Response Time Analysis', 'Certification Status', 'Cost Analysis', 'Recommendations'], brandWatermark: true, exportFormats: ['PDF', 'Excel', 'CSV'], isDefault: false },
];

export const enterpriseAuditLog: EnterpriseAuditEntry[] = [
  { id: 'eal-1', tenantId: 'ent-aramark', tenantName: 'Aramark', userName: 'Jennifer Martinez', action: 'sso_config_updated', resourceType: 'SSO Configuration', resourceName: 'SAML 2.0 Provider', details: 'Updated attribute mapping for employee ID field', timestamp: '2026-02-10T08:20:00Z', ipAddress: '10.42.1.15' },
  { id: 'eal-2', tenantId: 'ent-aramark', tenantName: 'Aramark', userName: 'System (SCIM)', action: 'user_provisioned', resourceType: 'User', resourceName: 'Kevin Patel', details: 'Auto-provisioned via SCIM from Okta directory sync', timestamp: '2026-02-10T06:01:00Z', ipAddress: '52.14.87.203' },
  { id: 'eal-3', tenantId: 'ent-compass', tenantName: 'Compass Group', userName: 'Emma Williams', action: 'report_generated', resourceType: 'Report', resourceName: 'Q1 2026 Quarterly Audit Package', details: 'Generated for North America region — 1,234 locations', timestamp: '2026-02-09T17:30:00Z', ipAddress: '10.56.2.88' },
  { id: 'eal-4', tenantId: 'ent-aramark', tenantName: 'Aramark', userName: 'Robert Chen', action: 'hierarchy_modified', resourceType: 'Hierarchy', resourceName: 'Western Region', details: 'Added Bay Area District with 42 locations', timestamp: '2026-02-09T14:15:00Z', ipAddress: '10.42.3.201' },
  { id: 'eal-5', tenantId: 'ent-compass', tenantName: 'Compass Group', userName: 'System (SCIM)', action: 'user_deactivated', resourceType: 'User', resourceName: 'Rachel Singh', details: 'Deactivated via SCIM — employee offboarded in Azure AD', timestamp: '2026-02-08T09:00:00Z', ipAddress: '52.14.87.203' },
  { id: 'eal-6', tenantId: 'ent-sodexo', tenantName: 'Sodexo', userName: 'Arthur Haggerty', action: 'tenant_created', resourceType: 'Tenant', resourceName: 'Sodexo Safe Kitchen', details: 'Pilot tenant provisioned — 623 locations, 1-year contract', timestamp: '2026-02-07T11:00:00Z', ipAddress: '67.183.45.12' },
  { id: 'eal-7', tenantId: 'ent-aramark', tenantName: 'Aramark', userName: 'Jennifer Martinez', action: 'branding_updated', resourceType: 'Branding', resourceName: 'Aramark Compliance Hub', details: 'Updated sidebar background color from #1D1D1B to #002855', timestamp: '2026-02-06T16:45:00Z', ipAddress: '10.42.1.15' },
  { id: 'eal-8', tenantId: 'ent-compass', tenantName: 'Compass Group', userName: 'Emma Williams', action: 'sso_test_passed', resourceType: 'SSO Configuration', resourceName: 'OIDC Provider', details: 'Azure AD OIDC test connection passed — 12ms response', timestamp: '2026-02-07T10:15:00Z', ipAddress: '10.56.2.88' },
  { id: 'eal-9', tenantId: 'ent-aramark', tenantName: 'Aramark', userName: 'System', action: 'compliance_rollup', resourceType: 'Analytics', resourceName: 'Daily Compliance Rollup', details: 'Processed 1,847 locations — avg score 88.4% (+0.2% from yesterday)', timestamp: '2026-02-10T06:00:00Z', ipAddress: '10.0.0.1' },
  { id: 'eal-10', tenantId: 'ent-sodexo', tenantName: 'Sodexo', userName: 'David Nguyen', action: 'template_created', resourceType: 'Report Template', resourceName: 'Location Detail Report', details: 'Created default location detail template for Sodexo pilot', timestamp: '2026-02-08T13:20:00Z', ipAddress: '67.183.45.12' },
];

// ============================================================
// Enterprise Expanded Data — Alerts, Integrations, Onboarding,
// Trend History, Pricing, Bulk Operations
// ============================================================

export interface EnterpriseAlert {
  id: string;
  tenantId: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  nodeName: string;
  nodeCode: string;
  message: string;
  score: number | null;
  detectedAt: string;
  acknowledged: boolean;
}

export const enterpriseAlerts: EnterpriseAlert[] = [
  { id: 'ea-1', tenantId: 'ent-aramark', severity: 'critical', category: 'Fire Suppression', nodeName: 'Tuolumne Meadows Grill', nodeCode: 'YOS-004', message: 'Fire suppression system certification expired 12 days ago — immediate action required', score: 83, detectedAt: '2026-02-09T06:00:00Z', acknowledged: false },
  { id: 'ea-2', tenantId: 'ent-aramark', severity: 'critical', category: 'Compliance Score', nodeName: 'SoCal District', nodeCode: 'ARMK-SL-W-SC', message: 'District compliance score dropped below 85% threshold — 3 locations need attention', score: 84, detectedAt: '2026-02-10T06:00:00Z', acknowledged: false },
  { id: 'ea-3', tenantId: 'ent-aramark', severity: 'warning', category: 'Vendor Documentation', nodeName: 'Bay Area District', nodeCode: 'ARMK-SL-W-BAY', message: '4 vendor certifications expiring within 30 days — renewal required', score: 85, detectedAt: '2026-02-10T06:00:00Z', acknowledged: false },
  { id: 'ea-4', tenantId: 'ent-aramark', severity: 'warning', category: 'Temperature Monitoring', nodeName: 'Half Dome Village Pavilion', nodeCode: 'YOS-003', message: '3 consecutive temperature excursions in walk-in cooler — equipment service recommended', score: 87, detectedAt: '2026-02-09T14:30:00Z', acknowledged: true },
  { id: 'ea-5', tenantId: 'ent-compass', severity: 'critical', category: 'Regulatory Gap', nodeName: 'West Coast Area', nodeCode: 'CG-WCA', message: '2 locations missing required health department permits — regulatory risk', score: null, detectedAt: '2026-02-09T09:00:00Z', acknowledged: false },
  { id: 'ea-6', tenantId: 'ent-aramark', severity: 'warning', category: 'Checklist Completion', nodeName: 'Healthcare Division', nodeCode: 'ARMK-HC', message: 'Opening checklist completion rate dropped to 89% across division — target is 95%', score: 86, detectedAt: '2026-02-10T06:00:00Z', acknowledged: false },
  { id: 'ea-7', tenantId: 'ent-sodexo', severity: 'info', category: 'Onboarding', nodeName: 'Sodexo Safe Kitchen', nodeCode: 'SOD', message: 'Pilot phase data migration 82% complete — 511 of 623 locations imported', score: null, detectedAt: '2026-02-10T08:00:00Z', acknowledged: true },
  { id: 'ea-8', tenantId: 'ent-aramark', severity: 'warning', category: 'Employee Training', nodeName: 'Eastern Region (Higher Ed)', nodeCode: 'ARMK-HE-E', message: '14 food handler certifications expiring this month — schedule renewals', score: 93, detectedAt: '2026-02-10T06:00:00Z', acknowledged: false },
];

export interface EnterpriseIntegration {
  id: string;
  tenantId: string;
  tenantName: string;
  type: 'temperature_monitoring' | 'erp' | 'bi_tool' | 'communication' | 'existing_platform';
  providerName: string;
  providerLogo: string;
  status: 'active' | 'pending' | 'error' | 'disabled';
  lastSync: string;
  syncFrequency: string;
  dataPoints: number;
  description: string;
}

export const enterpriseIntegrations: EnterpriseIntegration[] = [
  { id: 'ei-1', tenantId: 'ent-aramark', tenantName: 'Aramark', type: 'temperature_monitoring', providerName: 'ComplianceMate', providerLogo: 'CM', status: 'active', lastSync: '2026-02-10T09:45:00Z', syncFrequency: 'Every 15 min', dataPoints: 284620, description: 'Real-time temperature monitoring across 1,200+ sensors' },
  { id: 'ei-2', tenantId: 'ent-aramark', tenantName: 'Aramark', type: 'erp', providerName: 'SAP S/4HANA', providerLogo: 'SAP', status: 'active', lastSync: '2026-02-10T06:00:00Z', syncFrequency: 'Daily', dataPoints: 45200, description: 'Location master data, vendor POs, cost center mapping' },
  { id: 'ei-3', tenantId: 'ent-aramark', tenantName: 'Aramark', type: 'bi_tool', providerName: 'Power BI', providerLogo: 'PBI', status: 'active', lastSync: '2026-02-10T07:00:00Z', syncFrequency: 'Hourly', dataPoints: 128400, description: 'Executive dashboards and compliance trend analytics' },
  { id: 'ei-4', tenantId: 'ent-aramark', tenantName: 'Aramark', type: 'communication', providerName: 'Microsoft Teams', providerLogo: 'MT', status: 'active', lastSync: '2026-02-10T09:50:00Z', syncFrequency: 'Real-time', dataPoints: 3240, description: 'Alert notifications, inspection results, action item assignments' },
  { id: 'ei-5', tenantId: 'ent-aramark', tenantName: 'Aramark', type: 'existing_platform', providerName: 'Aramark SAFE', providerLogo: 'AS', status: 'active', lastSync: '2026-02-09T22:00:00Z', syncFrequency: 'Every 6 hours', dataPoints: 89100, description: 'Historical compliance data migration and ongoing sync' },
  { id: 'ei-6', tenantId: 'ent-compass', tenantName: 'Compass Group', type: 'temperature_monitoring', providerName: 'Testo Saveris', providerLogo: 'TS', status: 'active', lastSync: '2026-02-10T09:30:00Z', syncFrequency: 'Every 15 min', dataPoints: 198400, description: 'Wireless temperature and humidity monitoring for 800+ units' },
  { id: 'ei-7', tenantId: 'ent-compass', tenantName: 'Compass Group', type: 'erp', providerName: 'Oracle Cloud', providerLogo: 'OC', status: 'active', lastSync: '2026-02-10T05:30:00Z', syncFrequency: 'Daily', dataPoints: 32100, description: 'Vendor management, procurement, and financial integration' },
  { id: 'ei-8', tenantId: 'ent-compass', tenantName: 'Compass Group', type: 'bi_tool', providerName: 'Tableau', providerLogo: 'TB', status: 'pending', lastSync: '', syncFrequency: 'Hourly', dataPoints: 0, description: 'Tableau Cloud connector — in configuration' },
  { id: 'ei-9', tenantId: 'ent-compass', tenantName: 'Compass Group', type: 'communication', providerName: 'Slack', providerLogo: 'SL', status: 'active', lastSync: '2026-02-10T09:48:00Z', syncFrequency: 'Real-time', dataPoints: 1890, description: '#compliance-alerts and #inspection-results channels' },
  { id: 'ei-10', tenantId: 'ent-compass', tenantName: 'Compass Group', type: 'existing_platform', providerName: 'Hospitality IQ', providerLogo: 'HQ', status: 'error', lastSync: '2026-02-08T14:00:00Z', syncFrequency: 'Daily', dataPoints: 42300, description: 'API rate limit exceeded — contact Compass IT for quota increase' },
  { id: 'ei-11', tenantId: 'ent-sodexo', tenantName: 'Sodexo', type: 'temperature_monitoring', providerName: 'Cooper-Atkins', providerLogo: 'CA', status: 'pending', lastSync: '', syncFrequency: 'Every 15 min', dataPoints: 0, description: 'Pending configuration — pilot phase setup' },
  { id: 'ei-12', tenantId: 'ent-sodexo', tenantName: 'Sodexo', type: 'communication', providerName: 'Microsoft Teams', providerLogo: 'MT', status: 'disabled', lastSync: '', syncFrequency: 'Real-time', dataPoints: 0, description: 'Awaiting IT approval for Teams integration' },
];

export interface EnterpriseOnboardingPhase {
  id: string;
  phase: number;
  name: string;
  duration: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  progress: number;
  tasks: { label: string; done: boolean }[];
}

export const enterpriseOnboardingAramark: EnterpriseOnboardingPhase[] = [
  { id: 'eo-1', phase: 1, name: 'Configuration', duration: 'Weeks 1-2', status: 'completed', progress: 100, tasks: [
    { label: 'Tenant provisioning & branding setup', done: true },
    { label: 'SSO/SAML integration with Okta', done: true },
    { label: 'Hierarchy structure defined (5 levels)', done: true },
    { label: 'SCIM user provisioning configured', done: true },
    { label: 'API keys generated & rate limits set', done: true },
  ]},
  { id: 'eo-2', phase: 2, name: 'Data Migration', duration: 'Weeks 3-5', status: 'completed', progress: 100, tasks: [
    { label: 'Historical compliance data imported (24 months)', done: true },
    { label: 'Location master data synced from SAP', done: true },
    { label: 'Vendor records migrated (342 vendors)', done: true },
    { label: 'Temperature sensor mapping completed', done: true },
    { label: 'Employee training records imported', done: true },
  ]},
  { id: 'eo-3', phase: 3, name: 'Pilot', duration: 'Weeks 6-10', status: 'completed', progress: 100, tasks: [
    { label: 'Yosemite District (7 locations) live', done: true },
    { label: 'User acceptance testing completed', done: true },
    { label: 'Report templates customized & approved', done: true },
    { label: 'Integration validation with SAFE platform', done: true },
    { label: 'Training materials distributed', done: true },
  ]},
  { id: 'eo-4', phase: 4, name: 'Full Rollout', duration: 'Weeks 11-16', status: 'in_progress', progress: 72, tasks: [
    { label: 'Western Region deployed (224 locations)', done: true },
    { label: 'Central Region deployed (267 locations)', done: true },
    { label: 'Eastern Region deployment', done: false },
    { label: 'Higher Education division rollout', done: false },
    { label: 'Healthcare division rollout', done: false },
  ]},
];

export const enterpriseOnboardingSodexo: EnterpriseOnboardingPhase[] = [
  { id: 'eo-s1', phase: 1, name: 'Configuration', duration: 'Weeks 1-2', status: 'completed', progress: 100, tasks: [
    { label: 'Tenant provisioning & branding setup', done: true },
    { label: 'Hierarchy structure defined (5 levels)', done: true },
    { label: 'API keys generated', done: true },
  ]},
  { id: 'eo-s2', phase: 2, name: 'Data Migration', duration: 'Weeks 3-5', status: 'in_progress', progress: 82, tasks: [
    { label: 'Location master data import (511/623)', done: false },
    { label: 'Historical compliance data', done: false },
    { label: 'Vendor records migration', done: false },
  ]},
  { id: 'eo-s3', phase: 3, name: 'Pilot', duration: 'Weeks 6-10', status: 'upcoming', progress: 0, tasks: [
    { label: 'California District pilot (48 locations)', done: false },
    { label: 'User acceptance testing', done: false },
    { label: 'Report template customization', done: false },
  ]},
  { id: 'eo-s4', phase: 4, name: 'Full Rollout', duration: 'Weeks 11-16', status: 'upcoming', progress: 0, tasks: [
    { label: 'Regional deployment', done: false },
    { label: 'Full organization rollout', done: false },
  ]},
];

export interface EnterpriseTrendPoint {
  month: string;
  overall: number;
  foodSafety: number;
  fireSafety: number;
  vendorCompliance: number;
}

export const enterpriseTrendData: EnterpriseTrendPoint[] = [
  { month: 'Mar 25', overall: 82.1, foodSafety: 84.0, fireSafety: 80.2, vendorCompliance: 81.5 },
  { month: 'Apr 25', overall: 83.4, foodSafety: 85.1, fireSafety: 81.0, vendorCompliance: 83.2 },
  { month: 'May 25', overall: 83.8, foodSafety: 85.6, fireSafety: 81.5, vendorCompliance: 83.8 },
  { month: 'Jun 25', overall: 84.5, foodSafety: 86.2, fireSafety: 82.1, vendorCompliance: 84.4 },
  { month: 'Jul 25', overall: 83.9, foodSafety: 85.8, fireSafety: 81.8, vendorCompliance: 83.5 },
  { month: 'Aug 25', overall: 84.8, foodSafety: 86.5, fireSafety: 82.6, vendorCompliance: 84.8 },
  { month: 'Sep 25', overall: 85.6, foodSafety: 87.2, fireSafety: 83.4, vendorCompliance: 85.6 },
  { month: 'Oct 25', overall: 86.2, foodSafety: 87.8, fireSafety: 84.1, vendorCompliance: 86.1 },
  { month: 'Nov 25', overall: 86.8, foodSafety: 88.2, fireSafety: 84.8, vendorCompliance: 86.9 },
  { month: 'Dec 25', overall: 85.9, foodSafety: 87.5, fireSafety: 84.0, vendorCompliance: 85.8 },
  { month: 'Jan 26', overall: 87.1, foodSafety: 88.8, fireSafety: 85.2, vendorCompliance: 86.8 },
  { month: 'Feb 26', overall: 90.0, foodSafety: 92.0, fireSafety: 88.0, vendorCompliance: 89.0 },
];

export interface EnterpriseBulkOp {
  id: string;
  tenantId: string;
  tenantName: string;
  type: 'location_import' | 'template_deploy' | 'vendor_assign' | 'user_provision' | 'compliance_action';
  status: 'completed' | 'running' | 'failed' | 'pending';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  initiatedBy: string;
  startedAt: string;
  description: string;
}

export const enterpriseBulkOps: EnterpriseBulkOp[] = [
  { id: 'ebo-1', tenantId: 'ent-aramark', tenantName: 'Aramark', type: 'location_import', status: 'completed', totalItems: 267, processedItems: 267, failedItems: 0, initiatedBy: 'Jennifer Martinez', startedAt: '2026-02-08T10:00:00Z', description: 'Central Region location bulk import from SAP' },
  { id: 'ebo-2', tenantId: 'ent-aramark', tenantName: 'Aramark', type: 'template_deploy', status: 'completed', totalItems: 1847, processedItems: 1847, failedItems: 3, initiatedBy: 'Jennifer Martinez', startedAt: '2026-02-07T14:00:00Z', description: 'Deploy updated daily checklist template to all locations' },
  { id: 'ebo-3', tenantId: 'ent-aramark', tenantName: 'Aramark', type: 'vendor_assign', status: 'running', totalItems: 224, processedItems: 156, failedItems: 2, initiatedBy: 'Robert Chen', startedAt: '2026-02-10T08:30:00Z', description: 'Assign Cleaning Pros Plus as preferred vendor — Western Region' },
  { id: 'ebo-4', tenantId: 'ent-compass', tenantName: 'Compass Group', type: 'user_provision', status: 'completed', totalItems: 89, processedItems: 89, failedItems: 0, initiatedBy: 'Emma Williams', startedAt: '2026-02-09T11:00:00Z', description: 'SCIM bulk provision — new Chartwells employees' },
  { id: 'ebo-5', tenantId: 'ent-sodexo', tenantName: 'Sodexo', type: 'location_import', status: 'running', totalItems: 623, processedItems: 511, failedItems: 4, initiatedBy: 'Pierre Dubois', startedAt: '2026-02-10T07:00:00Z', description: 'Pilot location data import — all Sodexo sites' },
  { id: 'ebo-6', tenantId: 'ent-aramark', tenantName: 'Aramark', type: 'compliance_action', status: 'pending', totalItems: 42, processedItems: 0, failedItems: 0, initiatedBy: 'Maria Santos', startedAt: '', description: 'Schedule fire suppression inspections — Yosemite District' },
];

export interface EnterprisePricingTier {
  name: string;
  price: number;
  priceLabel: string;
  features: string[];
  highlighted: boolean;
}

export const enterprisePricingTiers: EnterprisePricingTier[] = [
  { name: 'Standard', price: 25, priceLabel: '$25/location/mo', highlighted: false, features: [
    'Core compliance dashboard',
    'Temperature monitoring integration',
    'Standard report templates',
    'Email support (24hr SLA)',
    'Up to 3 hierarchy levels',
    'Basic API access (1K req/day)',
  ]},
  { name: 'Premium', price: 35, priceLabel: '$35/location/mo', highlighted: true, features: [
    'Everything in Standard, plus:',
    'SSO (SAML/OIDC) integration',
    'SCIM user provisioning',
    'Custom hierarchy (up to 5 levels)',
    'White-label branding',
    'Multi-region rollup dashboards',
    'Advanced analytics & trends',
    'Dedicated CSM',
    'Full API access (10K req/day)',
  ]},
  { name: 'Platinum', price: 50, priceLabel: '$50/location/mo', highlighted: false, features: [
    'Everything in Premium, plus:',
    'Custom domain & full white-label',
    'ERP integration (SAP/Oracle)',
    'BI tool connectors (Power BI/Tableau)',
    'Custom report builder',
    'HIPAA compliance mode',
    'Data residency controls',
    'SOC 2 audit support',
    '24/7 emergency support',
    'Quarterly business reviews',
    'Unlimited API access',
  ]},
];

// ─── IoT Sensor Integration Framework ──────────────────────────────────────

export interface IoTSensorProvider {
  id: string;
  name: string;
  slug: string;
  color: string;
  authType: 'oauth' | 'apikey' | 'webhook' | 'bluetooth' | 'csv';
  apiBaseUrl: string | null;
  status: 'connected' | 'pending' | 'available';
  capabilities: string[];
  rateLimitPerMin: number | null;
  pricingNote: string;
  sensorCount: number;
  lastSync: string | null;
}

export interface IoTSensor {
  id: string;
  providerSlug: string;
  name: string;
  macAddress: string;
  type: 'temperature' | 'humidity' | 'combo' | 'pressure';
  locationName: string;
  zone: string;
  equipmentLinkId: string | null;
  batteryPct: number;
  signalRssi: number;
  firmware: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  lastSeenAt: string;
  currentTempF: number;
  currentHumidity: number | null;
}

export interface IoTSensorReading {
  sensorId: string;
  timestamp: string;
  temperatureF: number;
  humidityPct: number | null;
  pressureHpa: number | null;
  batteryPct: number;
  isAnomaly: boolean;
  quality: 'good' | 'suspect' | 'error';
  complianceStatus: 'in_range' | 'warning' | 'violation';
  thresholdApplied: { min: number | null; max: number | null; rule: string } | null;
}

export interface IoTMaintenanceEntry {
  id: string;
  sensorId: string;
  type: 'battery_replacement' | 'calibration' | 'relocation' | 'firmware_update' | 'note';
  description: string;
  performedBy: string;
  date: string;
}

export interface IoTSetupWizardSensor {
  id: string;
  name: string;
  macAddress: string;
  model: string;
  lastReading: number | null;
  selected: boolean;
}

export interface IoTSensorAlert {
  id: string;
  sensorId: string;
  sensorName: string;
  locationName: string;
  alertType: 'high_temp' | 'low_temp' | 'humidity_high' | 'battery_low' | 'offline' | 'rapid_change';
  severity: 'critical' | 'warning' | 'info';
  thresholdValue: number;
  actualValue: number;
  message: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
}

export interface IoTSensorConfig {
  providerSlug: string;
  pollingIntervalMin: number;
  alertThresholds: { highTempF: number; lowTempF: number; humidityHigh: number; humidityLow: number; batteryLowPct: number };
  autoLogCompliance: boolean;
  notificationChannels: string[];
}

export interface IoTIngestionLog {
  id: string;
  provider: string;
  method: 'api_pull' | 'webhook' | 'manual' | 'bluetooth';
  sensorCount: number;
  readingCount: number;
  timestamp: string;
  status: 'success' | 'partial' | 'error';
  durationMs: number;
  errorMessage: string | null;
}

export const iotSensorProviders: IoTSensorProvider[] = [
  { id: 'sp-1', name: 'SensorPush', slug: 'sensorpush', color: '#2563eb', authType: 'oauth', apiBaseUrl: 'https://api.sensorpush.com', status: 'connected', capabilities: ['temperature', 'humidity', 'barometric_pressure'], rateLimitPerMin: 1, pricingNote: 'Sensors $50-80 + G1 Gateway $99. No subscription.', sensorCount: 6, lastSync: '2026-02-10T14:58:00Z' },
  { id: 'sp-2', name: 'Temp Stick', slug: 'tempstick', color: '#16a34a', authType: 'apikey', apiBaseUrl: 'https://api.tempstick.com', status: 'connected', capabilities: ['temperature', 'humidity'], rateLimitPerMin: 10, pricingNote: '$139-149/sensor. No subscription. WiFi direct.', sensorCount: 4, lastSync: '2026-02-10T14:55:00Z' },
  { id: 'sp-3', name: 'Monnit', slug: 'monnit', color: '#7c3aed', authType: 'webhook', apiBaseUrl: 'https://www.imonnit.com/api', status: 'connected', capabilities: ['temperature', 'humidity', 'water_detection', 'door_open'], rateLimitPerMin: null, pricingNote: 'Sensors $50-100 + gateway $150-200. Subscription varies.', sensorCount: 2, lastSync: '2026-02-10T14:59:00Z' },
  { id: 'sp-4', name: 'Cooper-Atkins', slug: 'cooper-atkins', color: '#ea580c', authType: 'bluetooth', apiBaseUrl: null, status: 'connected', capabilities: ['temperature', 'bluetooth_le'], rateLimitPerMin: null, pricingNote: 'Blue2 instruments. BLE to mobile app.', sensorCount: 2, lastSync: '2026-02-10T13:30:00Z' },
  { id: 'sp-5', name: 'Testo', slug: 'testo', color: '#dc2626', authType: 'apikey', apiBaseUrl: 'https://api.saveris.testo.com', status: 'pending', capabilities: ['temperature', 'humidity', 'co2', 'pressure'], rateLimitPerMin: 5, pricingNote: 'Enterprise Saveris platform. Contact for API access.', sensorCount: 1, lastSync: null },
  { id: 'sp-6', name: 'ComplianceMate', slug: 'compliancemate', color: '#0891b2', authType: 'csv', apiBaseUrl: null, status: 'connected', capabilities: ['temperature', 'csv_import'], rateLimitPerMin: null, pricingNote: 'Starts $69/mo. No public API — CSV export only.', sensorCount: 1, lastSync: '2026-02-10T08:00:00Z' },
  { id: 'sp-7', name: 'ThermoWorks', slug: 'thermoworks', color: '#ca8a04', authType: 'bluetooth', apiBaseUrl: null, status: 'available', capabilities: ['temperature', 'spot_check', 'bluetooth_le'], rateLimitPerMin: null, pricingNote: 'Thermapen, Signals, BlueDOT. Manual + BLE.', sensorCount: 0, lastSync: null },
  { id: 'sp-8', name: 'DeltaTrak', slug: 'deltatrak', color: '#059669', authType: 'apikey', apiBaseUrl: 'https://api.flashlink.deltatrak.com', status: 'available', capabilities: ['temperature', 'cold_chain', 'transit_monitoring'], rateLimitPerMin: null, pricingNote: 'FlashLink platform. Cold chain focus.', sensorCount: 0, lastSync: null },
];

export const iotSensors: IoTSensor[] = [
  // Downtown Kitchen (6 sensors)
  { id: 'iot-s01', providerSlug: 'sensorpush', name: 'Walk-in Cooler #1', macAddress: 'SP:A4:3B:7C:12:F0', type: 'combo', locationName: 'Downtown Kitchen', zone: 'Walk-in Cooler', equipmentLinkId: 'eq-wic-01', batteryPct: 87, signalRssi: -42, firmware: 'v2.4.1', status: 'online', lastSeenAt: '2026-02-10T14:58:12Z', currentTempF: 36.2, currentHumidity: 45 },
  { id: 'iot-s02', providerSlug: 'sensorpush', name: 'Walk-in Freezer', macAddress: 'SP:A4:3B:7C:12:F1', type: 'combo', locationName: 'Downtown Kitchen', zone: 'Walk-in Freezer', equipmentLinkId: 'eq-wif-01', batteryPct: 72, signalRssi: -55, firmware: 'v2.4.1', status: 'online', lastSeenAt: '2026-02-10T14:58:10Z', currentTempF: -2.1, currentHumidity: 28 },
  { id: 'iot-s03', providerSlug: 'tempstick', name: 'Prep Area Monitor', macAddress: 'TS:B8:2A:5D:09:E3', type: 'combo', locationName: 'Downtown Kitchen', zone: 'Prep Station', equipmentLinkId: null, batteryPct: 94, signalRssi: -38, firmware: 'v3.1.0', status: 'online', lastSeenAt: '2026-02-10T14:55:00Z', currentTempF: 68.4, currentHumidity: 52 },
  { id: 'iot-s04', providerSlug: 'cooper-atkins', name: 'Hot Hold Station', macAddress: 'CA:BLE:01:4A:88:C2', type: 'temperature', locationName: 'Downtown Kitchen', zone: 'Hot Holding', equipmentLinkId: 'eq-hh-01', batteryPct: 65, signalRssi: -60, firmware: 'BLE-1.8', status: 'online', lastSeenAt: '2026-02-10T13:30:00Z', currentTempF: 148.5, currentHumidity: null },
  { id: 'iot-s05', providerSlug: 'monnit', name: 'Dry Storage Ambient', macAddress: 'MN:C7:4E:1B:33:A7', type: 'combo', locationName: 'Downtown Kitchen', zone: 'Dry Storage', equipmentLinkId: null, batteryPct: 91, signalRssi: -48, firmware: 'v4.0.2', status: 'online', lastSeenAt: '2026-02-10T14:59:01Z', currentTempF: 72.1, currentHumidity: 38 },
  { id: 'iot-s06', providerSlug: 'testo', name: 'Receiving Dock', macAddress: 'TE:D5:8F:2A:77:B1', type: 'combo', locationName: 'Downtown Kitchen', zone: 'Receiving', equipmentLinkId: null, batteryPct: 100, signalRssi: -35, firmware: 'Saveris-3.2', status: 'warning', lastSeenAt: '2026-02-10T14:50:00Z', currentTempF: 58.3, currentHumidity: 61 },
  // Airport Terminal (5 sensors)
  { id: 'iot-s07', providerSlug: 'sensorpush', name: 'Walk-in Cooler A', macAddress: 'SP:A4:3B:7C:14:A2', type: 'combo', locationName: 'Airport Terminal', zone: 'Walk-in Cooler', equipmentLinkId: 'eq-wic-02', batteryPct: 43, signalRssi: -62, firmware: 'v2.4.1', status: 'warning', lastSeenAt: '2026-02-10T14:57:00Z', currentTempF: 47.1, currentHumidity: 68 },
  { id: 'iot-s08', providerSlug: 'sensorpush', name: 'Reach-in Cooler B', macAddress: 'SP:A4:3B:7C:14:A3', type: 'combo', locationName: 'Airport Terminal', zone: 'Reach-in Cooler', equipmentLinkId: null, batteryPct: 81, signalRssi: -45, firmware: 'v2.4.1', status: 'online', lastSeenAt: '2026-02-10T14:58:05Z', currentTempF: 38.7, currentHumidity: 42 },
  { id: 'iot-s09', providerSlug: 'tempstick', name: 'Display Case', macAddress: 'TS:B8:2A:5D:11:F7', type: 'combo', locationName: 'Airport Terminal', zone: 'Display Case', equipmentLinkId: null, batteryPct: 88, signalRssi: -40, firmware: 'v3.1.0', status: 'online', lastSeenAt: '2026-02-10T14:55:00Z', currentTempF: 40.2, currentHumidity: 44 },
  { id: 'iot-s10', providerSlug: 'monnit', name: 'Kitchen Ambient', macAddress: 'MN:C7:4E:1B:35:B9', type: 'combo', locationName: 'Airport Terminal', zone: 'Kitchen', equipmentLinkId: null, batteryPct: 78, signalRssi: -52, firmware: 'v4.0.2', status: 'online', lastSeenAt: '2026-02-10T14:59:00Z', currentTempF: 74.8, currentHumidity: 55 },
  { id: 'iot-s11', providerSlug: 'compliancemate', name: 'Blast Chiller', macAddress: 'CM:CSV:IMPORT:01', type: 'temperature', locationName: 'Airport Terminal', zone: 'Blast Chiller', equipmentLinkId: null, batteryPct: 100, signalRssi: 0, firmware: 'CSV-Import', status: 'online', lastSeenAt: '2026-02-10T08:00:00Z', currentTempF: 34.0, currentHumidity: null },
  // University Campus (5 sensors)
  { id: 'iot-s12', providerSlug: 'sensorpush', name: 'Main Walk-in', macAddress: 'SP:A4:3B:7C:16:D4', type: 'combo', locationName: 'University Campus', zone: 'Walk-in Cooler', equipmentLinkId: 'eq-wic-03', batteryPct: 95, signalRssi: -37, firmware: 'v2.4.1', status: 'online', lastSeenAt: '2026-02-10T14:58:20Z', currentTempF: 35.8, currentHumidity: 41 },
  { id: 'iot-s13', providerSlug: 'sensorpush', name: 'Salad Bar Cooler', macAddress: 'SP:A4:3B:7C:16:D5', type: 'combo', locationName: 'University Campus', zone: 'Salad Bar', equipmentLinkId: null, batteryPct: 0, signalRssi: 0, firmware: 'v2.3.8', status: 'offline', lastSeenAt: '2026-02-09T22:15:00Z', currentTempF: 0, currentHumidity: null },
  { id: 'iot-s14', providerSlug: 'tempstick', name: 'Beverage Cooler', macAddress: 'TS:B8:2A:5D:13:G1', type: 'combo', locationName: 'University Campus', zone: 'Beverage Station', equipmentLinkId: null, batteryPct: 62, signalRssi: -58, firmware: 'v3.1.0', status: 'online', lastSeenAt: '2026-02-10T14:55:00Z', currentTempF: 37.4, currentHumidity: 39 },
  { id: 'iot-s15', providerSlug: 'cooper-atkins', name: 'Grill Station Probe', macAddress: 'CA:BLE:02:5B:99:D3', type: 'temperature', locationName: 'University Campus', zone: 'Grill Station', equipmentLinkId: null, batteryPct: 34, signalRssi: -65, firmware: 'BLE-1.8', status: 'warning', lastSeenAt: '2026-02-10T12:45:00Z', currentTempF: 165.2, currentHumidity: null },
  { id: 'iot-s16', providerSlug: 'deltatrak', name: 'Cold Chain Dock', macAddress: 'DT:FL:8A:2C:44:E6', type: 'temperature', locationName: 'University Campus', zone: 'Receiving Dock', equipmentLinkId: null, batteryPct: 100, signalRssi: -41, firmware: 'FL-2.1', status: 'online', lastSeenAt: '2026-02-10T14:50:00Z', currentTempF: 33.9, currentHumidity: null },
];

// Helper: threshold rules by zone
const TH_COLD = { min: null, max: 41.0, rule: 'cold_holding_fda' };
const TH_FREEZE = { min: null, max: 0, rule: 'frozen_storage_fda' };
const TH_HOT = { min: 135, max: null, rule: 'hot_holding_fda' };
const TH_DRY = { min: null, max: 75, rule: 'dry_storage_fda' };
const TH_REC = { min: null, max: 41, rule: 'receiving_cold_fda' };

// 3 readings per sensor — universal data model with compliance status
export const iotSensorReadings: IoTSensorReading[] = [
  // Downtown Walk-in Cooler #1 (max 41°F)
  { sensorId: 'iot-s01', timestamp: '2026-02-10T14:58:12Z', temperatureF: 36.2, humidityPct: 45, pressureHpa: null, batteryPct: 87, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s01', timestamp: '2026-02-10T14:57:12Z', temperatureF: 36.1, humidityPct: 45, pressureHpa: null, batteryPct: 87, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s01', timestamp: '2026-02-10T14:56:12Z', temperatureF: 36.3, humidityPct: 44, pressureHpa: null, batteryPct: 87, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  // Downtown Walk-in Freezer (max 0°F)
  { sensorId: 'iot-s02', timestamp: '2026-02-10T14:58:10Z', temperatureF: -2.1, humidityPct: 28, pressureHpa: null, batteryPct: 72, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_FREEZE },
  { sensorId: 'iot-s02', timestamp: '2026-02-10T14:57:10Z', temperatureF: -1.8, humidityPct: 28, pressureHpa: null, batteryPct: 72, isAnomaly: false, quality: 'good', complianceStatus: 'warning', thresholdApplied: TH_FREEZE },
  { sensorId: 'iot-s02', timestamp: '2026-02-10T14:56:10Z', temperatureF: -2.3, humidityPct: 29, pressureHpa: null, batteryPct: 72, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_FREEZE },
  // Downtown Prep Area (ambient — no strict threshold)
  { sensorId: 'iot-s03', timestamp: '2026-02-10T14:55:00Z', temperatureF: 68.4, humidityPct: 52, pressureHpa: null, batteryPct: 94, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: null },
  { sensorId: 'iot-s03', timestamp: '2026-02-10T14:50:00Z', temperatureF: 68.1, humidityPct: 51, pressureHpa: null, batteryPct: 94, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: null },
  { sensorId: 'iot-s03', timestamp: '2026-02-10T14:45:00Z', temperatureF: 67.9, humidityPct: 52, pressureHpa: null, batteryPct: 94, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: null },
  // Downtown Hot Hold (min 135°F)
  { sensorId: 'iot-s04', timestamp: '2026-02-10T13:30:00Z', temperatureF: 148.5, humidityPct: null, pressureHpa: null, batteryPct: 65, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_HOT },
  { sensorId: 'iot-s04', timestamp: '2026-02-10T13:15:00Z', temperatureF: 150.1, humidityPct: null, pressureHpa: null, batteryPct: 65, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_HOT },
  { sensorId: 'iot-s04', timestamp: '2026-02-10T13:00:00Z', temperatureF: 147.8, humidityPct: null, pressureHpa: null, batteryPct: 66, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_HOT },
  // Downtown Dry Storage (max 75°F)
  { sensorId: 'iot-s05', timestamp: '2026-02-10T14:59:01Z', temperatureF: 72.1, humidityPct: 38, pressureHpa: null, batteryPct: 91, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_DRY },
  { sensorId: 'iot-s05', timestamp: '2026-02-10T14:58:01Z', temperatureF: 72.0, humidityPct: 38, pressureHpa: null, batteryPct: 91, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_DRY },
  { sensorId: 'iot-s05', timestamp: '2026-02-10T14:57:01Z', temperatureF: 71.8, humidityPct: 39, pressureHpa: null, batteryPct: 91, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_DRY },
  // Downtown Receiving Dock (max 41°F for cold — but this is ambient receiving)
  { sensorId: 'iot-s06', timestamp: '2026-02-10T14:50:00Z', temperatureF: 58.3, humidityPct: 61, pressureHpa: 1013.2, batteryPct: 100, isAnomaly: false, quality: 'good', complianceStatus: 'warning', thresholdApplied: TH_REC },
  { sensorId: 'iot-s06', timestamp: '2026-02-10T14:45:00Z', temperatureF: 56.8, humidityPct: 60, pressureHpa: 1013.1, batteryPct: 100, isAnomaly: false, quality: 'good', complianceStatus: 'warning', thresholdApplied: TH_REC },
  { sensorId: 'iot-s06', timestamp: '2026-02-10T14:40:00Z', temperatureF: 55.2, humidityPct: 59, pressureHpa: 1013.0, batteryPct: 100, isAnomaly: false, quality: 'good', complianceStatus: 'warning', thresholdApplied: TH_REC },
  // Airport Walk-in Cooler A — VIOLATION: temp spike to 47°F
  { sensorId: 'iot-s07', timestamp: '2026-02-10T14:57:00Z', temperatureF: 47.1, humidityPct: 68, pressureHpa: null, batteryPct: 43, isAnomaly: true, quality: 'good', complianceStatus: 'violation', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s07', timestamp: '2026-02-10T14:56:00Z', temperatureF: 44.8, humidityPct: 62, pressureHpa: null, batteryPct: 43, isAnomaly: true, quality: 'good', complianceStatus: 'violation', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s07', timestamp: '2026-02-10T14:55:00Z', temperatureF: 39.2, humidityPct: 50, pressureHpa: null, batteryPct: 44, isAnomaly: false, quality: 'good', complianceStatus: 'warning', thresholdApplied: TH_COLD },
  // Airport Reach-in B (max 41°F)
  { sensorId: 'iot-s08', timestamp: '2026-02-10T14:58:05Z', temperatureF: 38.7, humidityPct: 42, pressureHpa: null, batteryPct: 81, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s08', timestamp: '2026-02-10T14:57:05Z', temperatureF: 38.5, humidityPct: 42, pressureHpa: null, batteryPct: 81, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s08', timestamp: '2026-02-10T14:56:05Z', temperatureF: 38.9, humidityPct: 43, pressureHpa: null, batteryPct: 81, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  // Airport Display Case (max 41°F) — warning: 40.2 approaching threshold
  { sensorId: 'iot-s09', timestamp: '2026-02-10T14:55:00Z', temperatureF: 40.2, humidityPct: 44, pressureHpa: null, batteryPct: 88, isAnomaly: false, quality: 'good', complianceStatus: 'warning', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s09', timestamp: '2026-02-10T14:50:00Z', temperatureF: 40.0, humidityPct: 44, pressureHpa: null, batteryPct: 88, isAnomaly: false, quality: 'good', complianceStatus: 'warning', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s09', timestamp: '2026-02-10T14:45:00Z', temperatureF: 39.8, humidityPct: 45, pressureHpa: null, batteryPct: 88, isAnomaly: false, quality: 'good', complianceStatus: 'warning', thresholdApplied: TH_COLD },
  // Airport Kitchen Ambient
  { sensorId: 'iot-s10', timestamp: '2026-02-10T14:59:00Z', temperatureF: 74.8, humidityPct: 55, pressureHpa: null, batteryPct: 78, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: null },
  { sensorId: 'iot-s10', timestamp: '2026-02-10T14:58:00Z', temperatureF: 74.5, humidityPct: 55, pressureHpa: null, batteryPct: 78, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: null },
  { sensorId: 'iot-s10', timestamp: '2026-02-10T14:57:00Z', temperatureF: 74.2, humidityPct: 54, pressureHpa: null, batteryPct: 78, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: null },
  // Airport Blast Chiller (CSV import, max 41°F)
  { sensorId: 'iot-s11', timestamp: '2026-02-10T08:00:00Z', temperatureF: 34.0, humidityPct: null, pressureHpa: null, batteryPct: 100, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s11', timestamp: '2026-02-10T07:00:00Z', temperatureF: 33.5, humidityPct: null, pressureHpa: null, batteryPct: 100, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s11', timestamp: '2026-02-10T06:00:00Z', temperatureF: 33.8, humidityPct: null, pressureHpa: null, batteryPct: 100, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  // University Main Walk-in (max 41°F)
  { sensorId: 'iot-s12', timestamp: '2026-02-10T14:58:20Z', temperatureF: 35.8, humidityPct: 41, pressureHpa: null, batteryPct: 95, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s12', timestamp: '2026-02-10T14:57:20Z', temperatureF: 35.7, humidityPct: 41, pressureHpa: null, batteryPct: 95, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s12', timestamp: '2026-02-10T14:56:20Z', temperatureF: 35.9, humidityPct: 42, pressureHpa: null, batteryPct: 95, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  // University Salad Bar — OFFLINE (battery dead, last reading was violation)
  { sensorId: 'iot-s13', timestamp: '2026-02-09T22:15:00Z', temperatureF: 41.2, humidityPct: 55, pressureHpa: null, batteryPct: 2, isAnomaly: true, quality: 'suspect', complianceStatus: 'violation', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s13', timestamp: '2026-02-09T22:10:00Z', temperatureF: 40.8, humidityPct: 54, pressureHpa: null, batteryPct: 3, isAnomaly: false, quality: 'suspect', complianceStatus: 'warning', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s13', timestamp: '2026-02-09T22:05:00Z', temperatureF: 40.5, humidityPct: 53, pressureHpa: null, batteryPct: 3, isAnomaly: false, quality: 'good', complianceStatus: 'warning', thresholdApplied: TH_COLD },
  // University Beverage Cooler (max 41°F)
  { sensorId: 'iot-s14', timestamp: '2026-02-10T14:55:00Z', temperatureF: 37.4, humidityPct: 39, pressureHpa: null, batteryPct: 62, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s14', timestamp: '2026-02-10T14:50:00Z', temperatureF: 37.2, humidityPct: 39, pressureHpa: null, batteryPct: 62, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s14', timestamp: '2026-02-10T14:45:00Z', temperatureF: 37.5, humidityPct: 40, pressureHpa: null, batteryPct: 62, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  // University Grill Station (min 135°F)
  { sensorId: 'iot-s15', timestamp: '2026-02-10T12:45:00Z', temperatureF: 165.2, humidityPct: null, pressureHpa: null, batteryPct: 34, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_HOT },
  { sensorId: 'iot-s15', timestamp: '2026-02-10T12:30:00Z', temperatureF: 162.8, humidityPct: null, pressureHpa: null, batteryPct: 34, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_HOT },
  { sensorId: 'iot-s15', timestamp: '2026-02-10T12:15:00Z', temperatureF: 168.0, humidityPct: null, pressureHpa: null, batteryPct: 35, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_HOT },
  // University Cold Chain Dock (max 41°F)
  { sensorId: 'iot-s16', timestamp: '2026-02-10T14:50:00Z', temperatureF: 33.9, humidityPct: null, pressureHpa: null, batteryPct: 100, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s16', timestamp: '2026-02-10T14:40:00Z', temperatureF: 34.1, humidityPct: null, pressureHpa: null, batteryPct: 100, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
  { sensorId: 'iot-s16', timestamp: '2026-02-10T14:30:00Z', temperatureF: 33.7, humidityPct: null, pressureHpa: null, batteryPct: 100, isAnomaly: false, quality: 'good', complianceStatus: 'in_range', thresholdApplied: TH_COLD },
];

export const iotSensorAlerts: IoTSensorAlert[] = [
  { id: 'iot-a01', sensorId: 'iot-s07', sensorName: 'Walk-in Cooler A', locationName: 'Airport Terminal', alertType: 'high_temp', severity: 'critical', thresholdValue: 41, actualValue: 47.1, message: 'Walk-in cooler temperature exceeded 41°F — possible door left open or compressor failure', createdAt: '2026-02-10T14:57:00Z', acknowledged: false, acknowledgedBy: null },
  { id: 'iot-a02', sensorId: 'iot-s13', sensorName: 'Salad Bar Cooler', locationName: 'University Campus', alertType: 'offline', severity: 'critical', thresholdValue: 30, actualValue: 960, message: 'Sensor offline for 16+ hours — battery depleted. Replace battery immediately.', createdAt: '2026-02-10T06:15:00Z', acknowledged: false, acknowledgedBy: null },
  { id: 'iot-a03', sensorId: 'iot-s07', sensorName: 'Walk-in Cooler A', locationName: 'Airport Terminal', alertType: 'rapid_change', severity: 'warning', thresholdValue: 5, actualValue: 7.9, message: 'Temperature rose 7.9°F in 2 minutes — abnormal rate of change detected', createdAt: '2026-02-10T14:56:30Z', acknowledged: false, acknowledgedBy: null },
  { id: 'iot-a04', sensorId: 'iot-s06', sensorName: 'Receiving Dock', locationName: 'Downtown Kitchen', alertType: 'humidity_high', severity: 'warning', thresholdValue: 60, actualValue: 61, message: 'Humidity at receiving dock above 60% threshold — check ventilation', createdAt: '2026-02-10T14:50:00Z', acknowledged: false, acknowledgedBy: null },
  { id: 'iot-a05', sensorId: 'iot-s15', sensorName: 'Grill Station Probe', locationName: 'University Campus', alertType: 'battery_low', severity: 'warning', thresholdValue: 20, actualValue: 34, message: 'Battery at 34% — schedule replacement within next 2 weeks', createdAt: '2026-02-10T12:45:00Z', acknowledged: true, acknowledgedBy: 'Maria Chen' },
  { id: 'iot-a06', sensorId: 'iot-s02', sensorName: 'Walk-in Freezer', locationName: 'Downtown Kitchen', alertType: 'low_temp', severity: 'info', thresholdValue: -10, actualValue: -2.1, message: 'Freezer temperature nominal — firmware update v2.5.0 available', createdAt: '2026-02-10T10:00:00Z', acknowledged: true, acknowledgedBy: 'System' },
  { id: 'iot-a07', sensorId: 'iot-s04', sensorName: 'Hot Hold Station', locationName: 'Downtown Kitchen', alertType: 'battery_low', severity: 'info', thresholdValue: 20, actualValue: 65, message: 'Scheduled calibration due Feb 15 — last calibrated Nov 12, 2025', createdAt: '2026-02-10T08:00:00Z', acknowledged: false, acknowledgedBy: null },
  { id: 'iot-a08', sensorId: 'iot-s07', sensorName: 'Walk-in Cooler A', locationName: 'Airport Terminal', alertType: 'battery_low', severity: 'warning', thresholdValue: 20, actualValue: 43, message: 'Battery below 50% on critical equipment sensor — plan replacement', createdAt: '2026-02-10T09:00:00Z', acknowledged: true, acknowledgedBy: 'James Wilson' },
];

export const iotSensorConfigs: IoTSensorConfig[] = [
  { providerSlug: 'sensorpush', pollingIntervalMin: 1, alertThresholds: { highTempF: 41, lowTempF: -10, humidityHigh: 70, humidityLow: 20, batteryLowPct: 20 }, autoLogCompliance: true, notificationChannels: ['email', 'sms', 'push'] },
  { providerSlug: 'tempstick', pollingIntervalMin: 5, alertThresholds: { highTempF: 41, lowTempF: -10, humidityHigh: 70, humidityLow: 20, batteryLowPct: 20 }, autoLogCompliance: true, notificationChannels: ['email', 'push'] },
  { providerSlug: 'monnit', pollingIntervalMin: 0, alertThresholds: { highTempF: 41, lowTempF: -10, humidityHigh: 70, humidityLow: 20, batteryLowPct: 20 }, autoLogCompliance: true, notificationChannels: ['email', 'webhook'] },
  { providerSlug: 'cooper-atkins', pollingIntervalMin: 0, alertThresholds: { highTempF: 41, lowTempF: -10, humidityHigh: 70, humidityLow: 20, batteryLowPct: 20 }, autoLogCompliance: false, notificationChannels: ['email'] },
];

export const iotIngestionLog: IoTIngestionLog[] = [
  { id: 'il-01', provider: 'SensorPush', method: 'api_pull', sensorCount: 6, readingCount: 6, timestamp: '2026-02-10T14:58:12Z', status: 'success', durationMs: 342, errorMessage: null },
  { id: 'il-02', provider: 'Monnit', method: 'webhook', sensorCount: 2, readingCount: 2, timestamp: '2026-02-10T14:59:01Z', status: 'success', durationMs: 89, errorMessage: null },
  { id: 'il-03', provider: 'Temp Stick', method: 'api_pull', sensorCount: 4, readingCount: 4, timestamp: '2026-02-10T14:55:00Z', status: 'success', durationMs: 518, errorMessage: null },
  { id: 'il-04', provider: 'Cooper-Atkins', method: 'bluetooth', sensorCount: 2, readingCount: 2, timestamp: '2026-02-10T13:30:00Z', status: 'success', durationMs: 1250, errorMessage: null },
  { id: 'il-05', provider: 'Testo', method: 'api_pull', sensorCount: 1, readingCount: 1, timestamp: '2026-02-10T14:50:00Z', status: 'partial', durationMs: 2100, errorMessage: 'Rate limit approaching — 4/5 requests used this minute' },
  { id: 'il-06', provider: 'ComplianceMate', method: 'manual', sensorCount: 1, readingCount: 3, timestamp: '2026-02-10T08:00:00Z', status: 'success', durationMs: 0, errorMessage: null },
  { id: 'il-07', provider: 'SensorPush', method: 'api_pull', sensorCount: 6, readingCount: 6, timestamp: '2026-02-10T14:57:12Z', status: 'success', durationMs: 315, errorMessage: null },
  { id: 'il-08', provider: 'DeltaTrak', method: 'api_pull', sensorCount: 1, readingCount: 1, timestamp: '2026-02-10T14:50:00Z', status: 'success', durationMs: 445, errorMessage: null },
  { id: 'il-09', provider: 'SensorPush', method: 'api_pull', sensorCount: 6, readingCount: 5, timestamp: '2026-02-10T14:56:12Z', status: 'partial', durationMs: 890, errorMessage: 'Salad Bar Cooler (iot-s13) — no response, sensor may be offline' },
  { id: 'il-10', provider: 'Monnit', method: 'webhook', sensorCount: 2, readingCount: 2, timestamp: '2026-02-10T14:58:01Z', status: 'success', durationMs: 76, errorMessage: null },
];

export const iotMaintenanceLog: IoTMaintenanceEntry[] = [
  { id: 'im-01', sensorId: 'iot-s01', type: 'calibration', description: 'Annual NIST-traceable calibration — passed within ±0.2°F', performedBy: 'TechCal Services', date: '2025-11-12' },
  { id: 'im-02', sensorId: 'iot-s01', type: 'firmware_update', description: 'Updated firmware from v2.3.1 to v2.4.0 — improved BLE stability', performedBy: 'System', date: '2025-12-05' },
  { id: 'im-03', sensorId: 'iot-s01', type: 'battery_replacement', description: 'Replaced CR2477 coin cell battery — old battery at 12%', performedBy: 'Maria Chen', date: '2025-10-20' },
  { id: 'im-04', sensorId: 'iot-s02', type: 'calibration', description: 'Annual calibration — passed within ±0.3°F at -10°F reference', performedBy: 'TechCal Services', date: '2025-11-12' },
  { id: 'im-05', sensorId: 'iot-s02', type: 'relocation', description: 'Moved from upper shelf to center rack for better airflow reading', performedBy: 'James Wilson', date: '2026-01-08' },
  { id: 'im-06', sensorId: 'iot-s04', type: 'battery_replacement', description: 'Replaced AA batteries — device showed low battery warning', performedBy: 'Maria Chen', date: '2026-01-15' },
  { id: 'im-07', sensorId: 'iot-s04', type: 'note', description: 'Bluetooth range intermittent near walk-in door — repositioned 2 feet left', performedBy: 'James Wilson', date: '2026-02-01' },
  { id: 'im-08', sensorId: 'iot-s07', type: 'calibration', description: 'Quarterly spot-check calibration — within ±0.5°F tolerance', performedBy: 'Airport Maintenance', date: '2025-12-18' },
  { id: 'im-09', sensorId: 'iot-s07', type: 'note', description: 'Cooler door seal appears worn — temperature drift noted. Reported to facilities.', performedBy: 'Sarah Lee', date: '2026-02-09' },
  { id: 'im-10', sensorId: 'iot-s08', type: 'firmware_update', description: 'Updated to v2.4.0 — new features: configurable push interval, improved WiFi reconnect', performedBy: 'System', date: '2026-01-20' },
  { id: 'im-11', sensorId: 'iot-s12', type: 'calibration', description: 'Initial calibration after deployment — passed within ±0.2°F', performedBy: 'TechCal Services', date: '2025-09-15' },
  { id: 'im-12', sensorId: 'iot-s13', type: 'battery_replacement', description: 'URGENT: Battery at 2% — replacement scheduled for Feb 11', performedBy: 'Scheduled', date: '2026-02-11' },
  { id: 'im-13', sensorId: 'iot-s15', type: 'battery_replacement', description: 'Battery at 34% — replacement ordered, ETA Feb 15', performedBy: 'Scheduled', date: '2026-02-15' },
  { id: 'im-14', sensorId: 'iot-s16', type: 'calibration', description: 'Cold chain verification calibration at 33°F reference — passed', performedBy: 'DeltaTrak Calibration Lab', date: '2025-10-01' },
];

// ── IoT Defrost Schedules ────────────────────────────────────────────────────

export interface IoTDefrostSchedule {
  sensorId: string;
  sensorName: string;
  frequency: string;
  durationMin: number;
  expectedRecoveryMin: number;
  lastDefrostAt: string;
  nextDefrostAt: string;
  autoDetect: boolean;
}

export const iotDefrostSchedules: IoTDefrostSchedule[] = [
  { sensorId: 'iot-s01', sensorName: 'Walk-in Cooler #1', frequency: 'Every 6 hours', durationMin: 25, expectedRecoveryMin: 15, lastDefrostAt: '2026-02-10T12:00:00Z', nextDefrostAt: '2026-02-10T18:00:00Z', autoDetect: false },
  { sensorId: 'iot-s02', sensorName: 'Walk-in Freezer', frequency: 'Every 8 hours', durationMin: 30, expectedRecoveryMin: 20, lastDefrostAt: '2026-02-10T08:00:00Z', nextDefrostAt: '2026-02-10T16:00:00Z', autoDetect: true },
  { sensorId: 'iot-s07', sensorName: 'Walk-in Cooler A', frequency: 'Every 6 hours', durationMin: 25, expectedRecoveryMin: 15, lastDefrostAt: '2026-02-10T06:00:00Z', nextDefrostAt: '2026-02-10T12:00:00Z', autoDetect: false },
  { sensorId: 'iot-s12', sensorName: 'Main Walk-in', frequency: 'Every 8 hours', durationMin: 20, expectedRecoveryMin: 12, lastDefrostAt: '2026-02-10T10:00:00Z', nextDefrostAt: '2026-02-10T18:00:00Z', autoDetect: true },
];

// ── IoT Door Open Events ─────────────────────────────────────────────────────

export interface IoTDoorEvent {
  id: string;
  sensorId: string;
  sensorName: string;
  locationName: string;
  openedAt: string;
  closedAt: string | null;
  durationSec: number;
  correlatedTempRise: number | null;
}

export const iotDoorEvents: IoTDoorEvent[] = [
  { id: 'door-01', sensorId: 'iot-s01', sensorName: 'Walk-in Cooler #1', locationName: 'Downtown Kitchen', openedAt: '2026-02-10T11:02:00Z', closedAt: '2026-02-10T11:03:12Z', durationSec: 72, correlatedTempRise: 0.8 },
  { id: 'door-02', sensorId: 'iot-s01', sensorName: 'Walk-in Cooler #1', locationName: 'Downtown Kitchen', openedAt: '2026-02-10T11:15:00Z', closedAt: '2026-02-10T11:15:45Z', durationSec: 45, correlatedTempRise: 0.3 },
  { id: 'door-03', sensorId: 'iot-s01', sensorName: 'Walk-in Cooler #1', locationName: 'Downtown Kitchen', openedAt: '2026-02-10T11:28:00Z', closedAt: '2026-02-10T11:30:30Z', durationSec: 150, correlatedTempRise: 1.5 },
  { id: 'door-04', sensorId: 'iot-s01', sensorName: 'Walk-in Cooler #1', locationName: 'Downtown Kitchen', openedAt: '2026-02-10T11:45:00Z', closedAt: '2026-02-10T11:46:08Z', durationSec: 68, correlatedTempRise: 0.6 },
  { id: 'door-05', sensorId: 'iot-s01', sensorName: 'Walk-in Cooler #1', locationName: 'Downtown Kitchen', openedAt: '2026-02-10T12:10:00Z', closedAt: '2026-02-10T12:12:20Z', durationSec: 140, correlatedTempRise: 1.2 },
  { id: 'door-06', sensorId: 'iot-s07', sensorName: 'Walk-in Cooler A', locationName: 'Airport Terminal', openedAt: '2026-02-10T14:30:00Z', closedAt: '2026-02-10T14:38:15Z', durationSec: 495, correlatedTempRise: 5.8 },
  { id: 'door-07', sensorId: 'iot-s12', sensorName: 'Main Walk-in', locationName: 'University Campus', openedAt: '2026-02-10T12:00:00Z', closedAt: '2026-02-10T12:01:30Z', durationSec: 90, correlatedTempRise: 0.7 },
  { id: 'door-08', sensorId: 'iot-s12', sensorName: 'Main Walk-in', locationName: 'University Campus', openedAt: '2026-02-10T12:22:00Z', closedAt: '2026-02-10T12:22:50Z', durationSec: 50, correlatedTempRise: 0.4 },
];

// ── IoT Cooling Curves ───────────────────────────────────────────────────────

export interface IoTCoolingLog {
  id: string;
  sensorId: string;
  sensorName: string;
  locationName: string;
  foodItem: string;
  startTemp: number;
  targetTemp: number;
  startTime: string;
  readings: { time: string; temp: number }[];
  meetsStandard: boolean;
  standard: string;
  totalMin: number;
}

export const iotCoolingLogs: IoTCoolingLog[] = [
  {
    id: 'cool-01', sensorId: 'iot-s01', sensorName: 'Walk-in Cooler #1', locationName: 'Downtown Kitchen',
    foodItem: 'Chicken Stock (5 gal)', startTemp: 165, targetTemp: 41, startTime: '2026-02-10T09:00:00Z',
    readings: [
      { time: '2026-02-10T09:00:00Z', temp: 165 }, { time: '2026-02-10T09:30:00Z', temp: 142 },
      { time: '2026-02-10T10:00:00Z', temp: 118 }, { time: '2026-02-10T10:30:00Z', temp: 95 },
      { time: '2026-02-10T11:00:00Z', temp: 70 }, { time: '2026-02-10T11:30:00Z', temp: 58 },
      { time: '2026-02-10T12:00:00Z', temp: 48 }, { time: '2026-02-10T12:30:00Z', temp: 43 },
      { time: '2026-02-10T13:00:00Z', temp: 40 }, { time: '2026-02-10T13:30:00Z', temp: 38 },
    ],
    meetsStandard: true, standard: 'FDA: 135→70°F in 2hr, 70→41°F in 4hr', totalMin: 270,
  },
  {
    id: 'cool-02', sensorId: 'iot-s07', sensorName: 'Walk-in Cooler A', locationName: 'Airport Terminal',
    foodItem: 'Rice Pilaf (hotel pan)', startTemp: 180, targetTemp: 41, startTime: '2026-02-10T08:00:00Z',
    readings: [
      { time: '2026-02-10T08:00:00Z', temp: 180 }, { time: '2026-02-10T08:30:00Z', temp: 155 },
      { time: '2026-02-10T09:00:00Z', temp: 130 }, { time: '2026-02-10T09:30:00Z', temp: 108 },
      { time: '2026-02-10T10:00:00Z', temp: 88 }, { time: '2026-02-10T10:30:00Z', temp: 76 },
      { time: '2026-02-10T11:00:00Z', temp: 72 }, { time: '2026-02-10T11:30:00Z', temp: 68 },
      { time: '2026-02-10T12:00:00Z', temp: 62 }, { time: '2026-02-10T13:00:00Z', temp: 55 },
    ],
    meetsStandard: false, standard: 'FDA: 135→70°F in 2hr, 70→41°F in 4hr', totalMin: 300,
  },
];

// ── IoT Compliance Impact Metrics ────────────────────────────────────────────

export interface IoTComplianceImpact {
  locationName: string;
  totalReadings: number;
  inRangeReadings: number;
  tempComplianceRate: number;
  dataCompletenessScore: number;
  sensorCount: number;
  manualLogReduction: number;
  avgResponseTimeMin: number;
  insuranceNote: string;
}

export const iotComplianceImpact: IoTComplianceImpact[] = [
  { locationName: 'Downtown Kitchen', totalReadings: 8640, inRangeReadings: 8510, tempComplianceRate: 98.5, dataCompletenessScore: 99, sensorCount: 6, manualLogReduction: 94, avgResponseTimeMin: 1.8, insuranceNote: 'Automated 24/7 monitoring with 6 sensors reporting every 1-5 minutes' },
  { locationName: 'Airport Terminal', totalReadings: 7200, inRangeReadings: 6840, tempComplianceRate: 95.0, dataCompletenessScore: 97, sensorCount: 5, manualLogReduction: 88, avgResponseTimeMin: 2.5, insuranceNote: 'Automated monitoring with 5 sensors; 1 violation event recorded' },
  { locationName: 'University Campus', totalReadings: 4320, inRangeReadings: 4190, tempComplianceRate: 97.0, dataCompletenessScore: 85, sensorCount: 5, manualLogReduction: 78, avgResponseTimeMin: 3.2, insuranceNote: 'Automated monitoring with 5 sensors; 1 offline sensor affecting coverage' },
];

// ── IoT Sparkline Data (4-hour mini charts per sensor) ───────────────────────

export interface IoTSparklinePoint { time: string; temp: number }

function generateSparkline(baseTemp: number, variance: number, points: number): IoTSparklinePoint[] {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => ({
    time: new Date(now - (points - 1 - i) * 15 * 60000).toISOString(),
    temp: +(baseTemp + Math.sin(i * 0.4) * variance + (Math.random() - 0.5) * variance * 0.3).toFixed(1),
  }));
}

export const iotSparklines: Record<string, IoTSparklinePoint[]> = {
  'iot-s01': generateSparkline(36.2, 0.8, 16),
  'iot-s02': generateSparkline(-2.1, 0.5, 16),
  'iot-s03': generateSparkline(68.4, 1.2, 16),
  'iot-s04': generateSparkline(148.5, 2.0, 16),
  'iot-s05': generateSparkline(72.1, 0.6, 16),
  'iot-s06': generateSparkline(58.3, 1.5, 16),
  'iot-s07': generateSparkline(44.0, 3.5, 16),
  'iot-s08': generateSparkline(38.7, 0.7, 16),
  'iot-s09': generateSparkline(40.2, 0.5, 16),
  'iot-s10': generateSparkline(74.8, 1.0, 16),
  'iot-s11': generateSparkline(34.0, 0.4, 16),
  'iot-s12': generateSparkline(35.8, 0.6, 16),
  'iot-s14': generateSparkline(37.4, 0.5, 16),
  'iot-s15': generateSparkline(165.2, 3.0, 16),
  'iot-s16': generateSparkline(33.9, 0.5, 16),
};

// ── API & Integration Hub Data ───────────────────────────────────────────────

export interface IntegrationPlatform {
  id: string;
  slug: string;
  name: string;
  category: 'accounting' | 'pos' | 'payroll' | 'distribution' | 'productivity' | 'inventory';
  categoryLabel: string;
  color: string;
  description: string;
  authType: 'oauth2' | 'api_key' | 'certificate' | 'edi';
  features: string[];
  status: 'available' | 'connected' | 'coming_soon' | 'beta';
  pricingNote: string;
  marketSize: string;
  docsUrl: string;
}

export const integrationPlatforms: IntegrationPlatform[] = [
  // Accounting
  { id: 'int-r365', slug: 'restaurant365', name: 'Restaurant365', category: 'accounting', categoryLabel: 'Accounting & Operations', color: '#1e40af', description: 'All-in-one accounting, inventory, scheduling, and reporting for restaurants. Push compliance vendor invoices, pull employee and location data.', authType: 'oauth2', features: ['Push vendor invoices', 'Pull employee list', 'Pull location data', 'Sync expense categories'], status: 'connected', pricingNote: 'R365 Partner Ecosystem', marketSize: '52,000+ restaurants', docsUrl: 'https://restaurant365.com/api' },
  { id: 'int-qbo', slug: 'quickbooks', name: 'QuickBooks Online', category: 'accounting', categoryLabel: 'Accounting & Operations', color: '#2ca01c', description: 'Auto-categorize compliance expenses, sync vendor invoices. Dominant small restaurant accounting platform.', authType: 'oauth2', features: ['Push vendor invoices', 'Sync expense categories', 'Pull vendor list', 'Pull employee list'], status: 'connected', pricingNote: 'Free QuickBooks developer account', marketSize: '7M+ small businesses', docsUrl: 'https://developer.intuit.com/' },
  { id: 'int-xero', slug: 'xero', name: 'Xero', category: 'accounting', categoryLabel: 'Accounting & Operations', color: '#13b5ea', description: 'Cloud accounting for international restaurants. Strong in UK/Australia/NZ markets. Compliance expense tracking and vendor sync.', authType: 'oauth2', features: ['Push invoices', 'Sync contacts', 'Pull employee list', 'Manual journals'], status: 'available', pricingNote: 'Xero developer program', marketSize: '4.2M+ subscribers globally', docsUrl: 'https://developer.xero.com/' },
  // POS
  { id: 'int-toast', slug: 'toast', name: 'Toast', category: 'pos', categoryLabel: 'Point of Sale', color: '#ff6600', description: 'Restaurant-specific POS leader. Pull employee data for cert tracking, sync locations, receive real-time webhook events.', authType: 'oauth2', features: ['Pull employee list', 'Pull location data', 'Webhook events', 'Cert tracking sync'], status: 'connected', pricingNote: 'Toast Technology Partner', marketSize: '120,000+ locations', docsUrl: 'https://doc.toasttab.com/' },
  { id: 'int-square', slug: 'square', name: 'Square', category: 'pos', categoryLabel: 'Point of Sale', color: '#006aff', description: 'POS for small/independent restaurants. Team member sync, location management, and labor data integration.', authType: 'oauth2', features: ['Pull team members', 'Pull locations', 'Labor/shift data', 'Webhook events'], status: 'available', pricingNote: 'Square App Marketplace', marketSize: 'Millions of sellers', docsUrl: 'https://developer.squareup.com/' },
  { id: 'int-clover', slug: 'clover', name: 'Clover', category: 'pos', categoryLabel: 'Point of Sale', color: '#43b02a', description: 'Merchant POS platform. Employee sync and order data integration for compliance correlation.', authType: 'oauth2', features: ['Pull employees', 'Pull orders', 'Merchant info', 'Inventory data'], status: 'coming_soon', pricingNote: 'Clover App Market', marketSize: '6M+ devices globally', docsUrl: 'https://docs.clover.com/' },
  { id: 'int-lightspeed', slug: 'lightspeed', name: 'Lightspeed Restaurant', category: 'pos', categoryLabel: 'Point of Sale', color: '#e4002b', description: 'Cloud POS for multi-location restaurants. Employee, sales, and location data sync.', authType: 'oauth2', features: ['Pull locations', 'Pull employees', 'Sales data', 'Inventory sync'], status: 'coming_soon', pricingNote: 'Lightspeed developer portal', marketSize: 'Global restaurant presence', docsUrl: 'https://developers.lightspeedhq.com/' },
  // Payroll & HR
  { id: 'int-adp', slug: 'adp', name: 'ADP Workforce Now', category: 'payroll', categoryLabel: 'Payroll & HR', color: '#d0271d', description: 'Enterprise HR/payroll leader. Auto-sync employee rosters, track certifications, detect new hires and terminations for compliance.', authType: 'certificate', features: ['Workers v2 API sync', 'New hire detection', 'Termination tracking', 'CFPM coverage'], status: 'connected', pricingNote: 'ADP Marketplace partner', marketSize: '920,000+ clients', docsUrl: 'https://developers.adp.com/' },
  { id: 'int-gusto', slug: 'gusto', name: 'Gusto', category: 'payroll', categoryLabel: 'Payroll & HR', color: '#0a8080', description: 'Small business payroll. Pull employee lists, track hire dates for food handler cert deadlines, sync locations.', authType: 'oauth2', features: ['Pull employee list', 'Hire date tracking', 'Location sync', 'Cert deadline flags'], status: 'available', pricingNote: 'Gusto developer platform', marketSize: '300,000+ businesses', docsUrl: 'https://docs.gusto.com/' },
  // Distribution
  { id: 'int-sysco', slug: 'sysco', name: 'Sysco', category: 'distribution', categoryLabel: 'Food Distribution', color: '#003b7c', description: 'Largest food distributor in North America. Delivery-triggered receiving temperature checks and order correlation.', authType: 'edi', features: ['Delivery notifications', 'Receiving check triggers', 'Order data', 'Invoice matching'], status: 'coming_soon', pricingNote: 'Enterprise partnership', marketSize: '$78.8B revenue', docsUrl: 'https://apic-devportal.sysco.com/' },
  { id: 'int-usfoods', slug: 'usfoods', name: 'US Foods', category: 'distribution', categoryLabel: 'Food Distribution', color: '#e31837', description: 'Second-largest US food distributor. Same delivery-triggered compliance workflow as Sysco.', authType: 'edi', features: ['Delivery notifications', 'Receiving checks', 'Order data'], status: 'coming_soon', pricingNote: 'Enterprise partnership', marketSize: 'National distributor', docsUrl: '' },
  // Productivity
  { id: 'int-google', slug: 'google', name: 'Google Workspace', category: 'productivity', categoryLabel: 'Productivity', color: '#4285f4', description: 'Save compliance reports to Google Drive, sync vendor schedules to Calendar, send notifications via Gmail.', authType: 'oauth2', features: ['Drive document storage', 'Calendar sync', 'Gmail notifications', 'Sheets export'], status: 'connected', pricingNote: 'Google Cloud Console', marketSize: '3B+ users', docsUrl: 'https://developers.google.com/' },
  { id: 'int-microsoft', slug: 'microsoft365', name: 'Microsoft 365', category: 'productivity', categoryLabel: 'Productivity', color: '#0078d4', description: 'Push alerts to Teams channels, store reports in SharePoint/OneDrive, sync calendar events.', authType: 'oauth2', features: ['Teams notifications', 'OneDrive storage', 'Outlook calendar', 'SharePoint reports'], status: 'available', pricingNote: 'Microsoft Entra ID', marketSize: '400M+ paid seats', docsUrl: 'https://learn.microsoft.com/graph/' },
  // Inventory
  { id: 'int-marketman', slug: 'marketman', name: 'MarketMan', category: 'inventory', categoryLabel: 'Inventory', color: '#ff9900', description: 'Inventory management platform. Correlate food inventory with safety data for shelf-life and receiving compliance.', authType: 'api_key', features: ['Inventory data', 'Shelf life tracking', 'Receiving log', 'Supplier data'], status: 'coming_soon', pricingNote: 'MarketMan API', marketSize: 'Cloud inventory leader', docsUrl: '' },
  { id: 'int-bluecart', slug: 'bluecart', name: 'BlueCart', category: 'inventory', categoryLabel: 'Inventory', color: '#2563eb', description: 'Restaurant ordering platform. Order data for receiving checks and supplier compliance verification.', authType: 'api_key', features: ['Order data', 'Receiving checks', 'Supplier compliance'], status: 'coming_soon', pricingNote: 'BlueCart API tiers', marketSize: 'Restaurant ordering', docsUrl: '' },
];

export interface ConnectedIntegration {
  id: string;
  platform: string;
  platformDisplayName: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  authType: 'oauth2' | 'api_key' | 'certificate';
  platformAccountId: string | null;
  platformAccountName: string | null;
  scopes: string[];
  syncConfig: { entities: string[]; direction: string; frequencyMin: number };
  lastSyncAt: string;
  lastSyncStatus: 'success' | 'partial' | 'failed';
  lastError: string | null;
  errorCount: number;
  nextSyncAt: string;
  connectedBy: string;
  connectedAt: string;
  disconnectedAt: string | null;
  // Derived display fields (from sync logs)
  employeesSynced: number;
  locationsSynced: number;
  vendorsSynced: number;
  documentsSynced: number;
}

export const connectedIntegrations: ConnectedIntegration[] = [
  { id: 'ci-1', platform: 'restaurant365', platformDisplayName: 'Restaurant365', status: 'connected', authType: 'oauth2', platformAccountId: 'r365-acct-8291', platformAccountName: 'EvidLY Demo Org', scopes: ['employees:read', 'locations:read', 'invoices:write'], syncConfig: { entities: ['employees', 'locations', 'vendors'], direction: 'bidirectional', frequencyMin: 360 }, lastSyncAt: '2026-02-10T14:00:00Z', lastSyncStatus: 'success', lastError: null, errorCount: 0, nextSyncAt: '2026-02-10T20:00:00Z', connectedBy: 'Maria Chen', connectedAt: '2025-11-15T10:00:00Z', disconnectedAt: null, employeesSynced: 47, locationsSynced: 3, vendorsSynced: 12, documentsSynced: 0 },
  { id: 'ci-2', platform: 'quickbooks', platformDisplayName: 'QuickBooks Online', status: 'connected', authType: 'oauth2', platformAccountId: 'qbo-realm-4829371', platformAccountName: 'EvidLY Foods Inc', scopes: ['com.intuit.quickbooks.accounting'], syncConfig: { entities: ['vendors', 'invoices', 'documents'], direction: 'bidirectional', frequencyMin: 360 }, lastSyncAt: '2026-02-10T13:30:00Z', lastSyncStatus: 'success', lastError: null, errorCount: 0, nextSyncAt: '2026-02-10T19:30:00Z', connectedBy: 'Maria Chen', connectedAt: '2025-12-01T09:00:00Z', disconnectedAt: null, employeesSynced: 0, locationsSynced: 0, vendorsSynced: 18, documentsSynced: 24 },
  { id: 'ci-3', platform: 'toast', platformDisplayName: 'Toast', status: 'connected', authType: 'oauth2', platformAccountId: 'toast-guid-a1b2c3', platformAccountName: 'EvidLY Demo', scopes: ['employees:read', 'locations:read', 'webhooks'], syncConfig: { entities: ['employees', 'locations'], direction: 'inbound', frequencyMin: 360 }, lastSyncAt: '2026-02-10T14:55:00Z', lastSyncStatus: 'success', lastError: null, errorCount: 0, nextSyncAt: '2026-02-10T20:55:00Z', connectedBy: 'James Wilson', connectedAt: '2026-01-10T14:00:00Z', disconnectedAt: null, employeesSynced: 52, locationsSynced: 3, vendorsSynced: 0, documentsSynced: 0 },
  { id: 'ci-4', platform: 'adp', platformDisplayName: 'ADP Workforce Now', status: 'connected', authType: 'certificate', platformAccountId: 'adp-org-7812', platformAccountName: 'EvidLY Foods', scopes: ['workers:read', 'events:read'], syncConfig: { entities: ['employees'], direction: 'inbound', frequencyMin: 1440 }, lastSyncAt: '2026-02-10T03:00:00Z', lastSyncStatus: 'partial', lastError: '2 employees missing location assignment in ADP', errorCount: 1, nextSyncAt: '2026-02-11T03:00:00Z', connectedBy: 'Maria Chen', connectedAt: '2026-01-20T11:00:00Z', disconnectedAt: null, employeesSynced: 45, locationsSynced: 3, vendorsSynced: 0, documentsSynced: 0 },
  { id: 'ci-5', platform: 'google', platformDisplayName: 'Google Workspace', status: 'connected', authType: 'oauth2', platformAccountId: null, platformAccountName: 'evidly-demo@evidly.com', scopes: ['drive.file', 'calendar.events', 'gmail.send'], syncConfig: { entities: ['documents'], direction: 'outbound', frequencyMin: 60 }, lastSyncAt: '2026-02-10T14:58:00Z', lastSyncStatus: 'success', lastError: null, errorCount: 0, nextSyncAt: '2026-02-10T15:58:00Z', connectedBy: 'Maria Chen', connectedAt: '2025-10-05T08:00:00Z', disconnectedAt: null, employeesSynced: 0, locationsSynced: 0, vendorsSynced: 0, documentsSynced: 38 },
  { id: 'ci-6', platform: 'toast', platformDisplayName: 'Toast', status: 'error', authType: 'oauth2', platformAccountId: 'toast-guid-d4e5f6', platformAccountName: 'Airport Location', scopes: ['employees:read'], syncConfig: { entities: ['employees'], direction: 'inbound', frequencyMin: 1440 }, lastSyncAt: '2026-02-09T14:00:00Z', lastSyncStatus: 'failed', lastError: 'OAuth token refresh failed — re-authorize required', errorCount: 3, nextSyncAt: '2026-02-10T16:00:00Z', connectedBy: 'Sarah Lee', connectedAt: '2026-02-01T16:00:00Z', disconnectedAt: null, employeesSynced: 0, locationsSynced: 0, vendorsSynced: 0, documentsSynced: 0 },
];

export interface IntegrationSyncLog {
  id: string;
  integrationId: string;
  platform: string;
  platformDisplayName: string;
  syncType: 'pull' | 'push' | 'webhook';
  entityType: string;
  direction: 'inbound' | 'outbound';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: { message: string; recordId?: string }[] | null;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'completed' | 'partial' | 'failed';
}

export const integrationSyncLogs: IntegrationSyncLog[] = [
  { id: 'sl-01', integrationId: 'ci-3', platform: 'toast', platformDisplayName: 'Toast', syncType: 'pull', entityType: 'employees', direction: 'inbound', recordsProcessed: 52, recordsCreated: 2, recordsUpdated: 3, recordsFailed: 0, errors: null, startedAt: '2026-02-10T14:55:00Z', completedAt: '2026-02-10T14:55:02Z', status: 'completed' },
  { id: 'sl-02', integrationId: 'ci-2', platform: 'quickbooks', platformDisplayName: 'QuickBooks Online', syncType: 'push', entityType: 'invoices', direction: 'outbound', recordsProcessed: 4, recordsCreated: 4, recordsUpdated: 0, recordsFailed: 0, errors: null, startedAt: '2026-02-10T13:30:00Z', completedAt: '2026-02-10T13:30:02Z', status: 'completed' },
  { id: 'sl-03', integrationId: 'ci-1', platform: 'restaurant365', platformDisplayName: 'Restaurant365', syncType: 'pull', entityType: 'locations', direction: 'inbound', recordsProcessed: 3, recordsCreated: 0, recordsUpdated: 1, recordsFailed: 0, errors: null, startedAt: '2026-02-10T14:00:00Z', completedAt: '2026-02-10T14:00:01Z', status: 'completed' },
  { id: 'sl-04', integrationId: 'ci-4', platform: 'adp', platformDisplayName: 'ADP Workforce Now', syncType: 'pull', entityType: 'employees', direction: 'inbound', recordsProcessed: 47, recordsCreated: 1, recordsUpdated: 2, recordsFailed: 2, errors: [{ message: 'Missing location_id', recordId: 'adp-w-4821' }, { message: 'Missing location_id', recordId: 'adp-w-4899' }], startedAt: '2026-02-10T03:00:00Z', completedAt: '2026-02-10T03:00:05Z', status: 'partial' },
  { id: 'sl-05', integrationId: 'ci-5', platform: 'google', platformDisplayName: 'Google Workspace', syncType: 'push', entityType: 'documents', direction: 'outbound', recordsProcessed: 3, recordsCreated: 3, recordsUpdated: 0, recordsFailed: 0, errors: null, startedAt: '2026-02-10T14:58:00Z', completedAt: '2026-02-10T14:58:03Z', status: 'completed' },
  { id: 'sl-06', integrationId: 'ci-3', platform: 'toast', platformDisplayName: 'Toast', syncType: 'webhook', entityType: 'employees', direction: 'inbound', recordsProcessed: 1, recordsCreated: 1, recordsUpdated: 0, recordsFailed: 0, errors: null, startedAt: '2026-02-10T11:22:00Z', completedAt: '2026-02-10T11:22:00Z', status: 'completed' },
  { id: 'sl-07', integrationId: 'ci-2', platform: 'quickbooks', platformDisplayName: 'QuickBooks Online', syncType: 'pull', entityType: 'vendors', direction: 'inbound', recordsProcessed: 18, recordsCreated: 0, recordsUpdated: 2, recordsFailed: 0, errors: null, startedAt: '2026-02-10T07:30:00Z', completedAt: '2026-02-10T07:30:02Z', status: 'completed' },
  { id: 'sl-08', integrationId: 'ci-1', platform: 'restaurant365', platformDisplayName: 'Restaurant365', syncType: 'push', entityType: 'invoices', direction: 'outbound', recordsProcessed: 6, recordsCreated: 6, recordsUpdated: 0, recordsFailed: 0, errors: null, startedAt: '2026-02-10T14:05:00Z', completedAt: '2026-02-10T14:05:03Z', status: 'completed' },
  { id: 'sl-09', integrationId: 'ci-3', platform: 'toast', platformDisplayName: 'Toast', syncType: 'pull', entityType: 'locations', direction: 'inbound', recordsProcessed: 3, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errors: null, startedAt: '2026-02-10T03:05:00Z', completedAt: '2026-02-10T03:05:01Z', status: 'completed' },
  { id: 'sl-10', integrationId: 'ci-4', platform: 'adp', platformDisplayName: 'ADP Workforce Now', syncType: 'webhook', entityType: 'employees', direction: 'inbound', recordsProcessed: 1, recordsCreated: 1, recordsUpdated: 0, recordsFailed: 0, errors: null, startedAt: '2026-02-10T09:15:00Z', completedAt: '2026-02-10T09:15:00Z', status: 'completed' },
];

export interface ApiWebhookSubscription {
  id: string;
  appName: string;
  url: string;
  events: string[];
  status: 'active' | 'paused' | 'failed';
  lastDeliveryAt: string | null;
  failureCount: number;
  createdAt: string;
}

export const apiWebhookSubscriptions: ApiWebhookSubscription[] = [
  { id: 'wh-01', appName: 'Restaurant365 Connector', url: 'https://hooks.restaurant365.com/evidly/compliance', events: ['compliance.score_changed', 'document.uploaded', 'vendor.service_completed'], status: 'active', lastDeliveryAt: '2026-02-10T14:32:00Z', failureCount: 0, createdAt: '2025-11-15T10:00:00Z' },
  { id: 'wh-02', appName: 'Aramark Compliance Hub', url: 'https://api.aramark.com/webhooks/evidly', events: ['compliance.score_changed', 'compliance.threshold_breach', 'temperature.violation', 'incident.created'], status: 'active', lastDeliveryAt: '2026-02-10T14:57:00Z', failureCount: 0, createdAt: '2026-01-05T09:00:00Z' },
  { id: 'wh-03', appName: 'Insurance Risk Monitor', url: 'https://insurance-partner.com/webhooks/evidly', events: ['compliance.score_changed', 'inspection.score_predicted'], status: 'active', lastDeliveryAt: '2026-02-10T12:00:00Z', failureCount: 1, createdAt: '2026-02-01T14:00:00Z' },
  { id: 'wh-04', appName: 'Custom Dashboard', url: 'https://internal.customer.com/api/evidly-hook', events: ['checklist.completed', 'checklist.missed', 'temperature.sustained_violation'], status: 'paused', lastDeliveryAt: '2026-02-08T16:00:00Z', failureCount: 5, createdAt: '2025-12-20T11:00:00Z' },
];

export interface ApiUsageStats {
  period: string;
  requestCount: number;
  webhookDeliveries: number;
  errorRate: number;
  avgResponseMs: number;
  topEndpoints: { endpoint: string; count: number }[];
}

export const apiUsageStats: ApiUsageStats = {
  period: 'Last 30 days',
  requestCount: 12847,
  webhookDeliveries: 1432,
  errorRate: 0.3,
  avgResponseMs: 145,
  topEndpoints: [
    { endpoint: 'GET /v1/locations/{id}/compliance', count: 4210 },
    { endpoint: 'GET /v1/locations/{id}/temperatures', count: 2890 },
    { endpoint: 'GET /v1/locations/{id}/scores', count: 1950 },
    { endpoint: 'POST /v1/locations/{id}/temperatures', count: 1420 },
    { endpoint: 'GET /v1/locations/{id}/documents', count: 890 },
  ],
};

// ── Training & Certification LMS Data ────────────────────────────────────────

export type TrainingCategory = 'food_safety_handler' | 'food_safety_manager' | 'fire_safety' | 'compliance_ops' | 'custom';

export interface TrainingCourse {
  id: string;
  organizationId: string | null;
  title: string;
  description: string;
  category: TrainingCategory;
  categoryLabel: string;
  language: string;
  estimatedDurationMin: number;
  passingScorePercent: number;
  maxAttempts: number;
  cooldownHours: number;
  isSystemCourse: boolean;
  isActive: boolean;
  thumbnailColor: string;
  moduleCount: number;
  enrolledCount: number;
  completedCount: number;
  createdAt: string;
}

export const trainingCourses: TrainingCourse[] = [
  { id: 'tc-01', organizationId: null, title: 'California Food Handler Card', description: 'Complete food handler training to satisfy CA SB 476 requirements. Covers personal hygiene, time & temperature, cross-contamination, cleaning & sanitizing, food storage, foodborne illness, receiving, and allergen awareness.', category: 'food_safety_handler', categoryLabel: 'Food Safety – Handler', language: 'en', estimatedDurationMin: 150, passingScorePercent: 70, maxAttempts: 0, cooldownHours: 24, isSystemCourse: true, isActive: true, thumbnailColor: '#15803d', moduleCount: 8, enrolledCount: 38, completedCount: 29, createdAt: '2025-08-01T00:00:00Z' },
  { id: 'tc-02', organizationId: null, title: 'ServSafe Manager Exam Prep', description: 'Comprehensive CFPM preparation covering HACCP, active managerial control, FDA Food Code, temperature management, and crisis response. Prepares employees to pass the ServSafe Manager certification exam.', category: 'food_safety_manager', categoryLabel: 'Food Safety – Manager', language: 'en', estimatedDurationMin: 480, passingScorePercent: 70, maxAttempts: 0, cooldownHours: 24, isSystemCourse: true, isActive: true, thumbnailColor: '#1e4d6b', moduleCount: 9, enrolledCount: 8, completedCount: 3, createdAt: '2025-08-01T00:00:00Z' },
  { id: 'tc-03', organizationId: null, title: 'Kitchen Fire Safety & Equipment', description: 'Fire extinguisher types, PASS technique, commercial hood systems, NFPA 96 (2025 Edition) compliance, fire suppression activation, grease fire response, and emergency evacuation.', category: 'fire_safety', categoryLabel: 'Fire Safety', language: 'en', estimatedDurationMin: 95, passingScorePercent: 70, maxAttempts: 0, cooldownHours: 24, isSystemCourse: true, isActive: true, thumbnailColor: '#dc2626', moduleCount: 7, enrolledCount: 42, completedCount: 35, createdAt: '2025-08-01T00:00:00Z' },
  { id: 'tc-04', organizationId: null, title: 'EvidLY Compliance Operations', description: 'Learn how to use EvidLY effectively: daily checklists, temperature logging, corrective actions, vendor verification, compliance scoring, and QR Passport.', category: 'compliance_ops', categoryLabel: 'Compliance Ops', language: 'en', estimatedDurationMin: 55, passingScorePercent: 70, maxAttempts: 0, cooldownHours: 0, isSystemCourse: true, isActive: true, thumbnailColor: '#d4af37', moduleCount: 6, enrolledCount: 52, completedCount: 48, createdAt: '2025-08-01T00:00:00Z' },
  { id: 'tc-05', organizationId: null, title: 'Tarjeta de Manipulador de Alimentos de California', description: 'Entrenamiento completo de manipulación de alimentos para cumplir con los requisitos de CA SB 476. En español.', category: 'food_safety_handler', categoryLabel: 'Food Safety – Handler', language: 'es', estimatedDurationMin: 150, passingScorePercent: 70, maxAttempts: 0, cooldownHours: 24, isSystemCourse: true, isActive: true, thumbnailColor: '#15803d', moduleCount: 8, enrolledCount: 12, completedCount: 8, createdAt: '2025-09-15T00:00:00Z' },
  { id: 'tc-06', organizationId: 'org-demo', title: 'New Hire Orientation — EvidLY Demo', description: 'Custom onboarding training for new employees. Covers company policies, kitchen layout, emergency contacts, and first-day procedures.', category: 'custom', categoryLabel: 'Custom', language: 'en', estimatedDurationMin: 30, passingScorePercent: 80, maxAttempts: 3, cooldownHours: 0, isSystemCourse: false, isActive: true, thumbnailColor: '#7c3aed', moduleCount: 3, enrolledCount: 14, completedCount: 12, createdAt: '2025-11-01T00:00:00Z' },
];

export interface TrainingModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  sortOrder: number;
  estimatedDurationMin: number;
  lessonCount: number;
  questionCount: number;
}

export const trainingModules: TrainingModule[] = [
  // Food Handler modules (tc-01)
  { id: 'tm-01', courseId: 'tc-01', title: 'Personal Hygiene & Handwashing', description: 'Proper handwashing technique, when to wash, personal hygiene standards, illness reporting policies', sortOrder: 1, estimatedDurationMin: 15, lessonCount: 4, questionCount: 20 },
  { id: 'tm-02', courseId: 'tc-01', title: 'Time & Temperature Control', description: 'Danger zone, safe holding temps, cooking temperatures for proteins, cooling and reheating requirements', sortOrder: 2, estimatedDurationMin: 20, lessonCount: 5, questionCount: 25 },
  { id: 'tm-03', courseId: 'tc-01', title: 'Cross-Contamination Prevention', description: 'Separate cutting boards, proper storage order, color-coded utensils, preventing allergen cross-contact', sortOrder: 3, estimatedDurationMin: 15, lessonCount: 4, questionCount: 20 },
  { id: 'tm-04', courseId: 'tc-01', title: 'Cleaning & Sanitizing', description: 'Three-compartment sink, sanitizer concentrations, food-contact vs non-food-contact surfaces, chemical storage', sortOrder: 4, estimatedDurationMin: 15, lessonCount: 4, questionCount: 20 },
  { id: 'tm-05', courseId: 'tc-01', title: 'Food Storage & Labeling', description: 'FIFO, date labeling, proper storage temperatures, storage order in walk-in coolers', sortOrder: 5, estimatedDurationMin: 15, lessonCount: 3, questionCount: 15 },
  { id: 'tm-06', courseId: 'tc-01', title: 'Foodborne Illness Prevention', description: 'Big 6 pathogens, high-risk populations, symptoms requiring exclusion, outbreak response', sortOrder: 6, estimatedDurationMin: 20, lessonCount: 5, questionCount: 25 },
  { id: 'tm-07', courseId: 'tc-01', title: 'Receiving & Inspecting Deliveries', description: 'Temperature checks on receipt, checking for damage, rejecting unsafe deliveries, documentation', sortOrder: 7, estimatedDurationMin: 10, lessonCount: 3, questionCount: 15 },
  { id: 'tm-08', courseId: 'tc-01', title: 'Allergen Awareness', description: 'Big 9 allergens, cross-contact prevention, communication with customers, allergen-free prep', sortOrder: 8, estimatedDurationMin: 15, lessonCount: 4, questionCount: 20 },
  // Fire Safety modules (tc-03)
  { id: 'tm-09', courseId: 'tc-03', title: 'Fire Extinguisher Types & PASS Technique', description: 'Class A/B/C/K extinguishers, PASS technique, when to fight vs. evacuate', sortOrder: 1, estimatedDurationMin: 15, lessonCount: 4, questionCount: 15 },
  { id: 'tm-10', courseId: 'tc-03', title: 'Commercial Hood System Basics', description: 'How hood systems work, filters, cleaning requirements, inspection schedules', sortOrder: 2, estimatedDurationMin: 15, lessonCount: 3, questionCount: 12 },
  { id: 'tm-11', courseId: 'tc-03', title: 'NFPA 96-2025 Compliance for Kitchen Staff', description: 'Key requirements every kitchen worker should know about hood and duct cleaning standards', sortOrder: 3, estimatedDurationMin: 15, lessonCount: 3, questionCount: 12 },
  { id: 'tm-12', courseId: 'tc-03', title: 'Fire Suppression System Activation', description: 'Ansul/wet chemical systems, manual pull stations, what happens during activation', sortOrder: 4, estimatedDurationMin: 10, lessonCount: 3, questionCount: 10 },
  { id: 'tm-13', courseId: 'tc-03', title: 'Grease Fire Response', description: 'Never use water on grease fires, proper response procedure, prevention techniques', sortOrder: 5, estimatedDurationMin: 10, lessonCount: 3, questionCount: 10 },
  { id: 'tm-14', courseId: 'tc-03', title: 'Kitchen Equipment Safety', description: 'Slicer safety, fryer operation, mixer guards, burn prevention, PPE requirements', sortOrder: 6, estimatedDurationMin: 20, lessonCount: 4, questionCount: 15 },
  { id: 'tm-15', courseId: 'tc-03', title: 'Emergency Evacuation Procedures', description: 'Exit routes, assembly points, headcount procedures, when to call 911', sortOrder: 7, estimatedDurationMin: 10, lessonCount: 3, questionCount: 10 },
];

export interface TrainingEnrollment {
  id: string;
  employeeId: string;
  employeeName: string;
  courseId: string;
  courseTitle: string;
  locationId: string;
  locationName: string;
  enrolledBy: string;
  enrollmentReason: 'new_hire' | 'expiring_cert' | 'failed_checklist' | 'regulatory_change' | 'manual' | 'manager_assigned';
  status: 'not_started' | 'in_progress' | 'completed' | 'expired' | 'failed';
  enrolledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  progressPercent: number;
  currentModuleId: string | null;
  currentLessonId: string | null;
  scorePercent: number | null;
}

export const trainingEnrollments: TrainingEnrollment[] = [
  // Food Handler — Downtown
  { id: 'te-01', employeeId: 'emp-01', employeeName: 'Maria Chen', courseId: 'tc-01', courseTitle: 'California Food Handler Card', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', enrolledBy: 'system', enrollmentReason: 'new_hire', status: 'completed', enrolledAt: '2025-09-01T00:00:00Z', startedAt: '2025-09-02T09:00:00Z', completedAt: '2025-09-05T14:30:00Z', expiresAt: '2028-09-05T00:00:00Z', progressPercent: 100, currentModuleId: null, currentLessonId: null, scorePercent: 88 },
  { id: 'te-02', employeeId: 'emp-02', employeeName: 'James Wilson', courseId: 'tc-01', courseTitle: 'California Food Handler Card', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', enrolledBy: 'system', enrollmentReason: 'new_hire', status: 'completed', enrolledAt: '2025-09-01T00:00:00Z', startedAt: '2025-09-03T10:00:00Z', completedAt: '2025-09-06T11:00:00Z', expiresAt: '2028-09-06T00:00:00Z', progressPercent: 100, currentModuleId: null, currentLessonId: null, scorePercent: 82 },
  { id: 'te-03', employeeId: 'emp-03', employeeName: 'Sofia Reyes', courseId: 'tc-05', courseTitle: 'Tarjeta de Manipulador de Alimentos de California', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', enrolledBy: 'system', enrollmentReason: 'new_hire', status: 'in_progress', enrolledAt: '2026-01-20T00:00:00Z', startedAt: '2026-01-22T08:00:00Z', completedAt: null, expiresAt: '2026-02-20T00:00:00Z', progressPercent: 62, currentModuleId: 'tm-05', currentLessonId: null, scorePercent: null },
  { id: 'te-04', employeeId: 'emp-04', employeeName: 'Tyler Brooks', courseId: 'tc-01', courseTitle: 'California Food Handler Card', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', enrolledBy: 'system', enrollmentReason: 'new_hire', status: 'not_started', enrolledAt: '2026-02-05T00:00:00Z', startedAt: null, completedAt: null, expiresAt: '2026-03-07T00:00:00Z', progressPercent: 0, currentModuleId: null, currentLessonId: null, scorePercent: null },
  // CFPM Prep — Downtown manager
  { id: 'te-05', employeeId: 'emp-01', employeeName: 'Maria Chen', courseId: 'tc-02', courseTitle: 'ServSafe Manager Exam Prep', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', enrolledBy: 'manager', enrollmentReason: 'manager_assigned', status: 'in_progress', enrolledAt: '2026-01-05T00:00:00Z', startedAt: '2026-01-08T09:00:00Z', completedAt: null, expiresAt: null, progressPercent: 45, currentModuleId: 'tm-cfpm-05', currentLessonId: null, scorePercent: null },
  // Fire Safety — Airport
  { id: 'te-06', employeeId: 'emp-05', employeeName: 'Sarah Lee', courseId: 'tc-03', courseTitle: 'Kitchen Fire Safety & Equipment', locationId: 'loc-airport', locationName: 'Airport Terminal', enrolledBy: 'system', enrollmentReason: 'expiring_cert', status: 'completed', enrolledAt: '2025-12-01T00:00:00Z', startedAt: '2025-12-03T10:00:00Z', completedAt: '2025-12-05T15:00:00Z', expiresAt: '2026-12-05T00:00:00Z', progressPercent: 100, currentModuleId: null, currentLessonId: null, scorePercent: 92 },
  { id: 'te-07', employeeId: 'emp-06', employeeName: 'David Park', courseId: 'tc-03', courseTitle: 'Kitchen Fire Safety & Equipment', locationId: 'loc-airport', locationName: 'Airport Terminal', enrolledBy: 'system', enrollmentReason: 'new_hire', status: 'in_progress', enrolledAt: '2026-02-01T00:00:00Z', startedAt: '2026-02-03T08:00:00Z', completedAt: null, expiresAt: '2026-03-03T00:00:00Z', progressPercent: 38, currentModuleId: 'tm-11', currentLessonId: null, scorePercent: null },
  // Compliance Ops — University
  { id: 'te-08', employeeId: 'emp-07', employeeName: 'Alex Johnson', courseId: 'tc-04', courseTitle: 'EvidLY Compliance Operations', locationId: 'loc-university', locationName: 'University Campus', enrolledBy: 'system', enrollmentReason: 'new_hire', status: 'completed', enrolledAt: '2025-10-15T00:00:00Z', startedAt: '2025-10-15T14:00:00Z', completedAt: '2025-10-16T10:00:00Z', expiresAt: null, progressPercent: 100, currentModuleId: null, currentLessonId: null, scorePercent: 95 },
  // New hires needing training
  { id: 'te-09', employeeId: 'emp-08', employeeName: 'Priya Patel', courseId: 'tc-01', courseTitle: 'California Food Handler Card', locationId: 'loc-university', locationName: 'University Campus', enrolledBy: 'system', enrollmentReason: 'new_hire', status: 'in_progress', enrolledAt: '2026-01-28T00:00:00Z', startedAt: '2026-01-30T09:00:00Z', completedAt: null, expiresAt: '2026-02-28T00:00:00Z', progressPercent: 78, currentModuleId: 'tm-07', currentLessonId: null, scorePercent: null },
  { id: 'te-10', employeeId: 'emp-09', employeeName: 'Carlos Mendoza', courseId: 'tc-01', courseTitle: 'California Food Handler Card', locationId: 'loc-airport', locationName: 'Airport Terminal', enrolledBy: 'system', enrollmentReason: 'expiring_cert', status: 'not_started', enrolledAt: '2026-02-08T00:00:00Z', startedAt: null, completedAt: null, expiresAt: '2026-04-15T00:00:00Z', progressPercent: 0, currentModuleId: null, currentLessonId: null, scorePercent: null },
  // Custom training
  { id: 'te-11', employeeId: 'emp-04', employeeName: 'Tyler Brooks', courseId: 'tc-06', courseTitle: 'New Hire Orientation — EvidLY Demo', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', enrolledBy: 'manager', enrollmentReason: 'new_hire', status: 'completed', enrolledAt: '2026-02-05T00:00:00Z', startedAt: '2026-02-05T09:00:00Z', completedAt: '2026-02-05T10:00:00Z', expiresAt: null, progressPercent: 100, currentModuleId: null, currentLessonId: null, scorePercent: 90 },
  { id: 'te-12', employeeId: 'emp-06', employeeName: 'David Park', courseId: 'tc-01', courseTitle: 'California Food Handler Card', locationId: 'loc-airport', locationName: 'Airport Terminal', enrolledBy: 'system', enrollmentReason: 'new_hire', status: 'completed', enrolledAt: '2025-10-01T00:00:00Z', startedAt: '2025-10-02T09:00:00Z', completedAt: '2025-10-05T16:00:00Z', expiresAt: '2028-10-05T00:00:00Z', progressPercent: 100, currentModuleId: null, currentLessonId: null, scorePercent: 76 },
];

export interface TrainingCertificate {
  id: string;
  employeeId: string;
  employeeName: string;
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  locationId: string;
  locationName: string;
  certificateType: 'food_handler' | 'food_manager_prep' | 'fire_safety' | 'custom';
  certificateNumber: string;
  issuedAt: string;
  expiresAt: string | null;
  scorePercent: number;
}

export const trainingCertificates: TrainingCertificate[] = [
  { id: 'tcert-01', employeeId: 'emp-01', employeeName: 'Maria Chen', enrollmentId: 'te-01', courseId: 'tc-01', courseTitle: 'California Food Handler Card', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', certificateType: 'food_handler', certificateNumber: 'EVD-FH-2025-00142', issuedAt: '2025-09-05T14:30:00Z', expiresAt: '2028-09-05T00:00:00Z', scorePercent: 88 },
  { id: 'tcert-02', employeeId: 'emp-02', employeeName: 'James Wilson', enrollmentId: 'te-02', courseId: 'tc-01', courseTitle: 'California Food Handler Card', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', certificateType: 'food_handler', certificateNumber: 'EVD-FH-2025-00158', issuedAt: '2025-09-06T11:00:00Z', expiresAt: '2028-09-06T00:00:00Z', scorePercent: 82 },
  { id: 'tcert-03', employeeId: 'emp-05', employeeName: 'Sarah Lee', enrollmentId: 'te-06', courseId: 'tc-03', courseTitle: 'Kitchen Fire Safety & Equipment', locationId: 'loc-airport', locationName: 'Airport Terminal', certificateType: 'fire_safety', certificateNumber: 'EVD-FS-2025-00089', issuedAt: '2025-12-05T15:00:00Z', expiresAt: '2026-12-05T00:00:00Z', scorePercent: 92 },
  { id: 'tcert-04', employeeId: 'emp-07', employeeName: 'Alex Johnson', enrollmentId: 'te-08', courseId: 'tc-04', courseTitle: 'EvidLY Compliance Operations', locationId: 'loc-university', locationName: 'University Campus', certificateType: 'custom', certificateNumber: 'EVD-CO-2025-00201', issuedAt: '2025-10-16T10:00:00Z', expiresAt: null, scorePercent: 95 },
  { id: 'tcert-05', employeeId: 'emp-04', employeeName: 'Tyler Brooks', enrollmentId: 'te-11', courseId: 'tc-06', courseTitle: 'New Hire Orientation — EvidLY Demo', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', certificateType: 'custom', certificateNumber: 'EVD-CU-2026-00015', issuedAt: '2026-02-05T10:00:00Z', expiresAt: null, scorePercent: 90 },
  { id: 'tcert-06', employeeId: 'emp-06', employeeName: 'David Park', enrollmentId: 'te-12', courseId: 'tc-01', courseTitle: 'California Food Handler Card', locationId: 'loc-airport', locationName: 'Airport Terminal', certificateType: 'food_handler', certificateNumber: 'EVD-FH-2025-00285', issuedAt: '2025-10-05T16:00:00Z', expiresAt: '2028-10-05T00:00:00Z', scorePercent: 76 },
];

export interface TrainingSB476Entry {
  id: string;
  employeeId: string;
  employeeName: string;
  enrollmentId: string;
  locationId: string;
  locationName: string;
  trainingCostCents: number;
  compensableHours: number;
  hourlyRateCents: number;
  totalCompensationCents: number;
  trainingDuringWorkHours: boolean;
  employeeRelievedOfDuties: boolean;
  completedWithin30Days: boolean;
  hireDate: string;
  trainingCompletedDate: string | null;
}

export const trainingSB476Log: TrainingSB476Entry[] = [
  { id: 'sb-01', employeeId: 'emp-01', employeeName: 'Maria Chen', enrollmentId: 'te-01', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', trainingCostCents: 1500, compensableHours: 2.5, hourlyRateCents: 2200, totalCompensationCents: 5500, trainingDuringWorkHours: true, employeeRelievedOfDuties: true, completedWithin30Days: true, hireDate: '2025-08-15', trainingCompletedDate: '2025-09-05' },
  { id: 'sb-02', employeeId: 'emp-02', employeeName: 'James Wilson', enrollmentId: 'te-02', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', trainingCostCents: 1500, compensableHours: 2.8, hourlyRateCents: 1800, totalCompensationCents: 5040, trainingDuringWorkHours: true, employeeRelievedOfDuties: true, completedWithin30Days: true, hireDate: '2025-08-20', trainingCompletedDate: '2025-09-06' },
  { id: 'sb-03', employeeId: 'emp-03', employeeName: 'Sofia Reyes', enrollmentId: 'te-03', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', trainingCostCents: 1500, compensableHours: 0, hourlyRateCents: 1900, totalCompensationCents: 0, trainingDuringWorkHours: true, employeeRelievedOfDuties: true, completedWithin30Days: false, hireDate: '2026-01-10', trainingCompletedDate: null },
  { id: 'sb-04', employeeId: 'emp-04', employeeName: 'Tyler Brooks', enrollmentId: 'te-04', locationId: 'loc-downtown', locationName: 'Downtown Kitchen', trainingCostCents: 1500, compensableHours: 0, hourlyRateCents: 1700, totalCompensationCents: 0, trainingDuringWorkHours: false, employeeRelievedOfDuties: false, completedWithin30Days: false, hireDate: '2026-02-03', trainingCompletedDate: null },
  { id: 'sb-05', employeeId: 'emp-06', employeeName: 'David Park', enrollmentId: 'te-12', locationId: 'loc-airport', locationName: 'Airport Terminal', trainingCostCents: 1500, compensableHours: 2.6, hourlyRateCents: 2000, totalCompensationCents: 5200, trainingDuringWorkHours: true, employeeRelievedOfDuties: true, completedWithin30Days: true, hireDate: '2025-09-15', trainingCompletedDate: '2025-10-05' },
  { id: 'sb-06', employeeId: 'emp-09', employeeName: 'Carlos Mendoza', enrollmentId: 'te-10', locationId: 'loc-airport', locationName: 'Airport Terminal', trainingCostCents: 1500, compensableHours: 0, hourlyRateCents: 1800, totalCompensationCents: 0, trainingDuringWorkHours: false, employeeRelievedOfDuties: false, completedWithin30Days: false, hireDate: '2026-01-15', trainingCompletedDate: null },
];

export interface TrainingQuizAttempt {
  id: string;
  enrollmentId: string;
  employeeName: string;
  moduleId: string | null;
  moduleTitle: string | null;
  courseId: string | null;
  attemptNumber: number;
  scorePercent: number;
  passed: boolean;
  questionsTotal: number;
  questionsCorrect: number;
  timeSpentSeconds: number;
  completedAt: string;
}

export const trainingQuizAttempts: TrainingQuizAttempt[] = [
  { id: 'tqa-01', enrollmentId: 'te-01', employeeName: 'Maria Chen', moduleId: 'tm-01', moduleTitle: 'Personal Hygiene & Handwashing', courseId: null, attemptNumber: 1, scorePercent: 90, passed: true, questionsTotal: 10, questionsCorrect: 9, timeSpentSeconds: 420, completedAt: '2025-09-02T10:15:00Z' },
  { id: 'tqa-02', enrollmentId: 'te-01', employeeName: 'Maria Chen', moduleId: 'tm-02', moduleTitle: 'Time & Temperature Control', courseId: null, attemptNumber: 1, scorePercent: 80, passed: true, questionsTotal: 10, questionsCorrect: 8, timeSpentSeconds: 540, completedAt: '2025-09-03T09:30:00Z' },
  { id: 'tqa-03', enrollmentId: 'te-01', employeeName: 'Maria Chen', moduleId: null, moduleTitle: null, courseId: 'tc-01', attemptNumber: 1, scorePercent: 88, passed: true, questionsTotal: 40, questionsCorrect: 35, timeSpentSeconds: 2100, completedAt: '2025-09-05T14:30:00Z' },
  { id: 'tqa-04', enrollmentId: 'te-02', employeeName: 'James Wilson', moduleId: 'tm-02', moduleTitle: 'Time & Temperature Control', courseId: null, attemptNumber: 1, scorePercent: 60, passed: false, questionsTotal: 10, questionsCorrect: 6, timeSpentSeconds: 380, completedAt: '2025-09-04T10:00:00Z' },
  { id: 'tqa-05', enrollmentId: 'te-02', employeeName: 'James Wilson', moduleId: 'tm-02', moduleTitle: 'Time & Temperature Control', courseId: null, attemptNumber: 2, scorePercent: 80, passed: true, questionsTotal: 10, questionsCorrect: 8, timeSpentSeconds: 450, completedAt: '2025-09-04T14:00:00Z' },
  { id: 'tqa-06', enrollmentId: 'te-06', employeeName: 'Sarah Lee', moduleId: null, moduleTitle: null, courseId: 'tc-03', attemptNumber: 1, scorePercent: 92, passed: true, questionsTotal: 30, questionsCorrect: 28, timeSpentSeconds: 1800, completedAt: '2025-12-05T15:00:00Z' },
  { id: 'tqa-07', enrollmentId: 'te-09', employeeName: 'Priya Patel', moduleId: 'tm-06', moduleTitle: 'Foodborne Illness Prevention', courseId: null, attemptNumber: 1, scorePercent: 70, passed: true, questionsTotal: 10, questionsCorrect: 7, timeSpentSeconds: 510, completedAt: '2026-02-07T11:00:00Z' },
];

/** Find marketplace vendors whose categories match overdue/upcoming services */
export function getSmartRecommendations(existingVendors: Vendor[]): { vendor: MarketplaceVendor; reason: string }[] {
  const serviceToSubcategory: Record<string, string> = {
    'Hood Cleaning': 'Hood Cleaning',
    'Fire Suppression': 'Fire Suppression',
    'Pest Control': 'Pest Control',
    'HVAC Service': 'HVAC Service',
    'Grease Trap': 'Grease Trap',
    'Fire Extinguisher': 'Fire Extinguisher',
  };
  const needs = existingVendors
    .filter(v => v.status === 'overdue' || v.status === 'upcoming')
    .map(v => ({ serviceType: v.serviceType, status: v.status, locationId: v.locationId }));
  const seen = new Set<string>();
  const results: { vendor: MarketplaceVendor; reason: string }[] = [];
  for (const need of needs) {
    const sub = serviceToSubcategory[need.serviceType] || need.serviceType;
    const match = marketplaceVendors.find(mv =>
      mv.subcategories.includes(sub) && !seen.has(mv.slug) && mv.tier !== 'verified'
    );
    if (match) {
      seen.add(match.slug);
      const loc = locations.find(l => l.id === need.locationId);
      const locName = loc ? loc.name : 'your location';
      const reason = need.status === 'overdue'
        ? `Your ${need.serviceType} at ${locName} is overdue`
        : `Your ${need.serviceType} at ${locName} is due soon`;
      results.push({ vendor: match, reason });
    }
    if (results.length >= 3) break;
  }
  return results;
}

// ── Incident Response Playbooks ─────────────────────────────────────────────

export type PlaybookSeverity = 'critical' | 'high' | 'medium' | 'low';
export type PlaybookCategory = 'environmental' | 'health_safety' | 'regulatory' | 'equipment';
export type IncidentPlaybookStatus = 'active' | 'completed' | 'abandoned';
export type PlaybookStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface PlaybookActionItem {
  id: string;
  label: string;
  required: boolean;
}

export interface PlaybookStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  actionItems: PlaybookActionItem[];
  photoRequired: boolean;
  photoPrompt?: string;
  notePrompt?: string;
  timerMinutes?: number;
  regulatoryReference?: string;
  criticalWarning?: string;
}

export interface PlaybookTemplate {
  id: string;
  title: string;
  shortDescription: string;
  category: PlaybookCategory;
  defaultSeverity: PlaybookSeverity;
  icon: string;
  color: string;
  stepCount: number;
  estimatedMinutes: number;
  regulatoryBasis: string;
  steps: PlaybookStep[];
}

export interface ActivePlaybookStepLog {
  stepId: string;
  status: PlaybookStepStatus;
  startedAt: string | null;
  completedAt: string | null;
  notes: string;
  photosTaken: number;
  actionItemsCompleted: string[];
}

export interface ActiveIncidentPlaybook {
  id: string;
  templateId: string;
  templateTitle: string;
  severity: PlaybookSeverity;
  status: IncidentPlaybookStatus;
  location: string;
  initiatedBy: string;
  initiatedAt: string;
  completedAt: string | null;
  currentStepNumber: number;
  totalSteps: number;
  stepLogs: ActivePlaybookStepLog[];
  incidentNotes: string;
  reportGenerated: boolean;
}

export const playbookTemplates: PlaybookTemplate[] = [
  {
    id: 'pb-power-outage',
    title: 'Power Outage Response',
    shortDescription: 'Systematic protocol for managing power loss, protecting food inventory, and FDA-compliant temperature monitoring with insurance documentation.',
    category: 'environmental',
    defaultSeverity: 'critical',
    icon: 'Zap',
    color: '#dc2626',
    stepCount: 9,
    estimatedMinutes: 240,
    regulatoryBasis: 'FDA Food Code 3-501.16, 3-501.17; CA Retail Food Code §113996',
    steps: [
      {
        id: 'po-1', stepNumber: 1, title: 'Immediate Response',
        description: 'Record the exact time power went out. DO NOT open walk-in cooler or freezer doors — each opening accelerates temperature rise significantly. If during food service, pause all food preparation and hold all plated food. Assign someone to monitor the front entrance for customer safety.',
        actionItems: [
          { id: 'po-1a', label: 'Record exact time of power loss', required: true },
          { id: 'po-1b', label: 'Post "DO NOT OPEN" signs on all coolers/freezers', required: true },
          { id: 'po-1c', label: 'Pause all food preparation if during service', required: true },
          { id: 'po-1d', label: 'Assign staff to monitor entrance', required: false },
        ],
        photoRequired: true, photoPrompt: 'Photograph any displays showing power status',
        criticalWarning: 'DO NOT open walk-in cooler or freezer doors. A closed unit maintains safe temperature for approximately 4 hours.',
      },
      {
        id: 'po-2', stepNumber: 2, title: 'Assess & Contact Utility',
        description: 'Contact the utility company to get an estimated restoration time and a reference/ticket number. Check if a backup generator is available and functioning. Notify the owner/operator immediately via phone or EvidLY notification.',
        actionItems: [
          { id: 'po-2a', label: 'Call utility company', required: true },
          { id: 'po-2b', label: 'Record estimated restoration time', required: true },
          { id: 'po-2c', label: 'Record utility ticket number', required: true },
          { id: 'po-2d', label: 'Check backup generator availability', required: true },
          { id: 'po-2e', label: 'Notify owner/operator', required: true },
        ],
        photoRequired: true, photoPrompt: 'Screenshot or photo of utility company response',
        notePrompt: 'Record utility company contact details and ticket number',
      },
      {
        id: 'po-3', stepNumber: 3, title: 'Secure Food — Initial Assessment',
        description: 'Record current temperature of all cold-holding and hot-holding units using a probe thermometer (digital displays may be off). Move any food currently in active prep back to cold storage if it can be done quickly without prolonged door opening. Discard any TCS food already in the danger zone (41°F–135°F) when power went out.',
        actionItems: [
          { id: 'po-3a', label: 'Record walk-in cooler temperature', required: true },
          { id: 'po-3b', label: 'Record walk-in freezer temperature', required: true },
          { id: 'po-3c', label: 'Record all reach-in unit temperatures', required: true },
          { id: 'po-3d', label: 'Return prep food to cold storage', required: false },
          { id: 'po-3e', label: 'Discard any TCS food already in danger zone', required: true },
        ],
        photoRequired: true, photoPrompt: 'Photograph each thermometer reading',
        notePrompt: 'Record exact temperature for each unit',
        regulatoryReference: 'FDA Food Code 3-501.16(A)(2)',
        criticalWarning: 'Do not open cooler/freezer doors unnecessarily. Each opening accelerates temperature rise.',
      },
      {
        id: 'po-4', stepNumber: 4, title: 'Hot Food Decision (1 Hour)',
        description: 'Evaluate all hot-held food. Items that have dropped below 135°F must be reheated to 165°F within 2 hours if power is restored, or discarded. If no power restoration is expected, all hot-held TCS food must be discarded after being in the danger zone for 4 hours total.',
        actionItems: [
          { id: 'po-4a', label: 'Check temperature of all hot-held items', required: true },
          { id: 'po-4b', label: 'Discard items below 135°F with no reheat capability', required: true },
          { id: 'po-4c', label: 'Document each discarded item with name, quantity, temp', required: true },
        ],
        photoRequired: true, photoPrompt: 'Photo of each hot-held item with temperature reading before discard',
        timerMinutes: 60,
        regulatoryReference: 'FDA Food Code 3-501.16(A)',
      },
      {
        id: 'po-5', stepNumber: 5, title: 'Cold Food Monitoring (Every 30 Min)',
        description: 'Continue temperature readings on all cold units every 30 minutes. FDA guideline: a closed refrigerator keeps food safe for approximately 4 hours. A full freezer maintains safe temperature for approximately 48 hours (24 hours if half full). If any cold unit rises above 41°F, begin the 4-hour countdown for TCS food in that unit.',
        actionItems: [
          { id: 'po-5a', label: 'Record all unit temperatures at 30-min mark', required: true },
          { id: 'po-5b', label: 'Flag any units above 41°F', required: true },
          { id: 'po-5c', label: 'Start 4-hour countdown for units above 41°F', required: false },
        ],
        photoRequired: true, photoPrompt: 'Photograph thermometer readings at each interval',
        timerMinutes: 30,
        regulatoryReference: 'FDA Food Code 3-501.16(A)(2), USDA Cold Storage Guidelines',
      },
      {
        id: 'po-6', stepNumber: 6, title: 'Food Disposition (4 Hours Without Power)',
        description: 'Evaluate ALL TCS food in refrigerated units: Below 41°F = SAFE, continue monitoring. 41°F–70°F for less than 2 hours = can be saved if immediately cooled when power returns. Above 41°F for more than 4 hours = DISCARD. Any food with off-odor, color, or texture = DISCARD regardless of temperature. Document EVERY item with name, quantity, unit cost (for insurance), temperature, and disposition decision.',
        actionItems: [
          { id: 'po-6a', label: 'Evaluate all TCS food in refrigerated units', required: true },
          { id: 'po-6b', label: 'Document each item: name, qty, cost, temp, decision', required: true },
          { id: 'po-6c', label: 'Photograph each discarded item individually', required: true },
          { id: 'po-6d', label: 'Photograph all discarded items together (insurance)', required: true },
        ],
        photoRequired: true, photoPrompt: 'Photo each item before disposal, then group photo of all discards',
        notePrompt: 'List every discarded item with estimated cost for insurance claim',
        regulatoryReference: 'FDA Food Code 3-501.17; 21 CFR 110',
        criticalWarning: 'When in doubt, throw it out. The cost of discarding food is always less than a foodborne illness lawsuit.',
      },
      {
        id: 'po-7', stepNumber: 7, title: 'Freezer Assessment (If >24 Hours)',
        description: 'Open freezer and evaluate: food still containing ice crystals is SAFE to refreeze (quality may suffer). Food above 40°F for more than 2 hours must be DISCARDED. Thawed food below 40°F should be cooked immediately or discarded. Same documentation protocol as Step 6.',
        actionItems: [
          { id: 'po-7a', label: 'Assess freezer contents for ice crystals', required: true },
          { id: 'po-7b', label: 'Discard items above 40°F for >2 hours', required: true },
          { id: 'po-7c', label: 'Document all freezer disposition decisions', required: true },
        ],
        photoRequired: true, photoPrompt: 'Photo freezer contents showing ice crystal status',
      },
      {
        id: 'po-8', stepNumber: 8, title: 'Power Restored — Verification',
        description: 'Verify all electrical equipment restarts properly. Check all circuit breakers. Verify refrigeration units are cooling properly (should reach 41°F within 4 hours). Verify hot-holding equipment reaches 135°F. Run water for 5 minutes to flush lines. Resume normal temperature monitoring schedule.',
        actionItems: [
          { id: 'po-8a', label: 'Verify all equipment restarts', required: true },
          { id: 'po-8b', label: 'Check all circuit breakers', required: true },
          { id: 'po-8c', label: 'Confirm refrigeration reaching 41°F', required: true },
          { id: 'po-8d', label: 'Flush water lines for 5 minutes', required: true },
          { id: 'po-8e', label: 'Resume normal temp monitoring', required: true },
        ],
        photoRequired: true, photoPrompt: 'Photo all equipment displays showing normal operation',
      },
      {
        id: 'po-9', stepNumber: 9, title: 'Post-Incident Report',
        description: 'Calculate total food loss value for insurance claim. Generate the incident summary report (auto-compiled from all steps). File insurance claim if loss exceeds deductible. Notify health department if required by jurisdiction. Review: was a generator available? Should one be purchased?',
        actionItems: [
          { id: 'po-9a', label: 'Calculate total food loss value', required: true },
          { id: 'po-9b', label: 'Generate incident summary report', required: true },
          { id: 'po-9c', label: 'File insurance claim if applicable', required: false },
          { id: 'po-9d', label: 'Notify health department if required', required: false },
          { id: 'po-9e', label: 'Document lessons learned', required: true },
        ],
        photoRequired: false,
        notePrompt: 'Record total estimated food loss value and any equipment damage',
      },
    ],
  },
  {
    id: 'pb-foodborne-illness',
    title: 'Foodborne Illness Complaint',
    shortDescription: 'Legal-compliant protocol for receiving, investigating, and documenting foodborne illness complaints while protecting the business.',
    category: 'health_safety',
    defaultSeverity: 'critical',
    icon: 'AlertTriangle',
    color: '#dc2626',
    stepCount: 8,
    estimatedMinutes: 180,
    regulatoryBasis: 'FDA Food Code 8-404.11; CA Health & Safety Code §113789',
    steps: [
      {
        id: 'fi-1', stepNumber: 1, title: 'Receive Complaint',
        description: 'Transfer the call or complaint to the designated manager — never let line staff handle. Express empathy without admitting fault: "I can hear you\'re upset. We take this very seriously and want to get to the bottom of this." Record complainant name, phone, email, and date/time of complaint.',
        actionItems: [
          { id: 'fi-1a', label: 'Transfer to designated manager', required: true },
          { id: 'fi-1b', label: 'Record complainant name and contact info', required: true },
          { id: 'fi-1c', label: 'Record date and time of complaint', required: true },
        ],
        photoRequired: false,
        notePrompt: 'Record complainant full name, phone, email',
        criticalWarning: 'DO NOT admit fault or responsibility. DO NOT deny their claim. DO NOT suggest symptoms to the complainant.',
      },
      {
        id: 'fi-2', stepNumber: 2, title: 'Gather Information',
        description: 'Ask what they ate (specific menu items), when (date, time, duration at restaurant), how many in their party, if others got sick, what symptoms they experienced (let THEM describe), when symptoms started (onset time is critical — most foodborne illness takes 6-72 hours), if they\'ve seen a doctor, and if they reported to the health department.',
        actionItems: [
          { id: 'fi-2a', label: 'Record specific menu items consumed', required: true },
          { id: 'fi-2b', label: 'Record date/time of visit and party size', required: true },
          { id: 'fi-2c', label: 'Record symptoms (in their words)', required: true },
          { id: 'fi-2d', label: 'Record symptom onset time', required: true },
          { id: 'fi-2e', label: 'Ask about doctor visit/stool sample', required: true },
          { id: 'fi-2f', label: 'Ask if reported to health department', required: true },
        ],
        photoRequired: false,
        notePrompt: 'Record all complaint details exactly as described by complainant',
      },
      {
        id: 'fi-3', stepNumber: 3, title: 'Internal Investigation',
        description: 'Within 2 hours, pull all food safety records for the date in question: temperature logs, cooling logs, receiving logs, employee illness records, cleaning logs, and any corrective actions. Interview staff who prepared/served the suspected items. Check vendor records for any supplier recalls.',
        actionItems: [
          { id: 'fi-3a', label: 'Pull temperature logs for the date', required: true },
          { id: 'fi-3b', label: 'Review employee illness records', required: true },
          { id: 'fi-3c', label: 'Interview prep/serving staff', required: true },
          { id: 'fi-3d', label: 'Check vendor recall notices', required: true },
          { id: 'fi-3e', label: 'Review cleaning/sanitizing logs', required: true },
        ],
        photoRequired: true, photoPrompt: 'Photo relevant log pages and any physical evidence',
        notePrompt: 'Document investigation findings',
        timerMinutes: 120,
      },
      {
        id: 'fi-4', stepNumber: 4, title: 'Notify Authorities',
        description: 'Contact local health department proactively: "We received a foodborne illness complaint and have documented it. We completed an internal investigation. Here are our findings." Record who you spoke with, what was communicated, and any instructions received. Contact insurance company to report the incident.',
        actionItems: [
          { id: 'fi-4a', label: 'Contact local health department', required: true },
          { id: 'fi-4b', label: 'Record health dept contact name and instructions', required: true },
          { id: 'fi-4c', label: 'Contact insurance company', required: true },
          { id: 'fi-4d', label: 'Contact attorney if multiple complaints or legal threat', required: false },
        ],
        photoRequired: false,
        notePrompt: 'Record health department contact name, time, instructions given',
      },
      {
        id: 'fi-5', stepNumber: 5, title: 'Food Hold (If Warranted)',
        description: 'If investigation identifies a potentially suspect food item: pull from service immediately, label and set aside in a sealed container (do NOT discard — may need for testing), store separately with date/time label, and check if the same item was used at other locations.',
        actionItems: [
          { id: 'fi-5a', label: 'Identify suspect food items', required: true },
          { id: 'fi-5b', label: 'Pull suspect items from service', required: true },
          { id: 'fi-5c', label: 'Label, seal, and store separately', required: true },
          { id: 'fi-5d', label: 'Check other locations for same item', required: false },
        ],
        photoRequired: true, photoPrompt: 'Photo held items with labels visible',
      },
      {
        id: 'fi-6', stepNumber: 6, title: 'Staff Communication',
        description: 'Brief staff on a need-to-know basis only. Reinforce: "If anyone else calls about illness, immediately transfer to [manager name]." Do NOT discuss the complaint with guests, on social media, or with uninvolved staff. Review food safety procedures with relevant kitchen staff as reinforcement.',
        actionItems: [
          { id: 'fi-6a', label: 'Brief relevant staff only', required: true },
          { id: 'fi-6b', label: 'Designate single point of contact for calls', required: true },
          { id: 'fi-6c', label: 'Reinforce food safety procedures with kitchen staff', required: true },
        ],
        photoRequired: false,
        criticalWarning: 'Treat the complaint as CONFIDENTIAL. Do not discuss with uninvolved staff, guests, or on social media.',
      },
      {
        id: 'fi-7', stepNumber: 7, title: 'Follow-Up With Complainant',
        description: 'Within 48 hours, call the complainant. Inform them of steps taken: "We conducted a thorough internal investigation, reviewed all our food safety records, and contacted the health department." Remain empathetic and professional regardless of their response. Document the follow-up call details.',
        actionItems: [
          { id: 'fi-7a', label: 'Call complainant within 48 hours', required: true },
          { id: 'fi-7b', label: 'Communicate investigation steps taken', required: true },
          { id: 'fi-7c', label: 'Document follow-up call details', required: true },
        ],
        photoRequired: false,
        notePrompt: 'Record follow-up conversation details and complainant response',
        timerMinutes: 2880,
      },
      {
        id: 'fi-8', stepNumber: 8, title: 'Post-Incident Review',
        description: 'If complaint was substantiated: implement corrective actions, schedule additional staff training, update procedures. If unsubstantiated: file documentation, no further action required. In either case, review and potentially increase monitoring frequency for implicated food items. Generate the full incident report.',
        actionItems: [
          { id: 'fi-8a', label: 'Determine if complaint was substantiated', required: true },
          { id: 'fi-8b', label: 'Implement corrective actions if needed', required: false },
          { id: 'fi-8c', label: 'Schedule staff training if indicated', required: false },
          { id: 'fi-8d', label: 'Generate full incident report', required: true },
        ],
        photoRequired: false,
        notePrompt: 'Final determination and corrective actions taken',
      },
    ],
  },
  {
    id: 'pb-kitchen-fire',
    title: 'Kitchen Fire Response',
    shortDescription: 'Emergency evacuation, fire suppression, regulatory notification, and facility restoration protocol following NFPA 96 (2025 Edition) requirements.',
    category: 'fire_safety',
    defaultSeverity: 'critical',
    icon: 'Flame',
    color: '#ea580c',
    stepCount: 7,
    estimatedMinutes: 480,
    regulatoryBasis: 'NFPA 96-2025; OSHA 29 CFR 1910.157; Local Fire Code',
    steps: [
      { id: 'kf-1', stepNumber: 1, title: 'Immediate Safety', description: 'EVACUATE all customers and staff if fire is not immediately containable. Call 911 if fire is beyond a small grease flare-up. For small grease fire: NEVER use water — use Class K fire extinguisher, smother with metal lid, or activate fire suppression system. Account for all staff members by name.', actionItems: [{ id: 'kf-1a', label: 'Evacuate all occupants', required: true }, { id: 'kf-1b', label: 'Call 911', required: true }, { id: 'kf-1c', label: 'Account for all staff members', required: true }, { id: 'kf-1d', label: 'Use Class K extinguisher if safe', required: false }], photoRequired: true, photoPrompt: 'Photo ONLY if safe from a safe distance', criticalWarning: 'NEVER use water on a grease fire. Evacuate IMMEDIATELY if fire is not containable.' },
      { id: 'kf-2', stepNumber: 2, title: 'Fire Department Response', description: 'Direct fire department to the specific location of fire. Provide access to hood/duct system if needed. Record time fire department arrived, incident number, and names of responding units. Follow all fire department instructions without exception.', actionItems: [{ id: 'kf-2a', label: 'Direct fire department to fire location', required: true }, { id: 'kf-2b', label: 'Record fire dept arrival time and incident #', required: true }, { id: 'kf-2c', label: 'Provide building access as needed', required: true }], photoRequired: false, notePrompt: 'Record fire department incident number and officer names' },
      { id: 'kf-3', stepNumber: 3, title: 'Immediate Aftermath', description: 'DO NOT re-enter kitchen until fire department clears the space. DO NOT attempt to clean or restore equipment. Shut off gas supply if not already done. Record extent of damage to equipment, structure, and inventory.', actionItems: [{ id: 'kf-3a', label: 'Wait for fire department all-clear', required: true }, { id: 'kf-3b', label: 'Verify gas supply shut off', required: true }, { id: 'kf-3c', label: 'Document extent of damage', required: true }], photoRequired: true, photoPrompt: 'Photo all damage from multiple angles BEFORE any cleanup', criticalWarning: 'DO NOT re-enter until fire department clears the space.' },
      { id: 'kf-4', stepNumber: 4, title: 'Food Safety Assessment', description: 'ALL exposed food must be discarded (smoke, chemical, water contamination). Evaluate food in sealed containers case by case. Frozen food that remained sealed and frozen may be safe. Document every item discarded with estimated value for insurance.', actionItems: [{ id: 'kf-4a', label: 'Discard all exposed food', required: true }, { id: 'kf-4b', label: 'Evaluate sealed/frozen items', required: true }, { id: 'kf-4c', label: 'Document all discarded items with values', required: true }], photoRequired: true, photoPrompt: 'Photo all food items before disposal', notePrompt: 'List each item with estimated replacement cost' },
      { id: 'kf-5', stepNumber: 5, title: 'Vendor & Insurance Notification', description: 'Contact hood cleaning company for fire suppression recharge and inspection. Contact equipment repair vendors. Contact insurance company to file claim. Contact landlord/property management. Fire suppression system MUST be professionally recharged and inspected before resuming cooking operations (NFPA 96-2025).', actionItems: [{ id: 'kf-5a', label: 'Contact hood cleaning company', required: true }, { id: 'kf-5b', label: 'Contact equipment repair vendors', required: true }, { id: 'kf-5c', label: 'File insurance claim', required: true }, { id: 'kf-5d', label: 'Contact landlord if applicable', required: false }], photoRequired: false, notePrompt: 'Record all vendor contact info, claim numbers, and estimated timelines', regulatoryReference: 'NFPA 96-2025 — Suppression system must be recharged before cooking resumes' },
      { id: 'kf-6', stepNumber: 6, title: 'Regulatory Notification', description: 'Notify local fire marshal (may be automatic via 911). Notify health department that kitchen will be offline. Obtain clearance from fire department before any restoration work. Obtain health department clearance before reopening.', actionItems: [{ id: 'kf-6a', label: 'Notify fire marshal', required: true }, { id: 'kf-6b', label: 'Notify health department', required: true }, { id: 'kf-6c', label: 'Obtain fire dept clearance for restoration', required: true }, { id: 'kf-6d', label: 'Obtain health dept clearance for reopening', required: true }], photoRequired: false, notePrompt: 'Record regulatory contact names and clearance dates' },
      { id: 'kf-7', stepNumber: 7, title: 'Reopening Verification', description: 'Complete all items: fire suppression recharged and certified, all equipment inspected and functional, entire kitchen deep-cleaned, contaminated food discarded and documented, fresh inventory received, health department clearance obtained, fire department clearance obtained, staff briefed.', actionItems: [{ id: 'kf-7a', label: 'Fire suppression recharged and certified', required: true }, { id: 'kf-7b', label: 'All equipment inspected and functional', required: true }, { id: 'kf-7c', label: 'Entire kitchen deep-cleaned', required: true }, { id: 'kf-7d', label: 'Fresh inventory received and stored', required: true }, { id: 'kf-7e', label: 'All clearances obtained', required: true }, { id: 'kf-7f', label: 'Staff briefed on incident and prevention', required: true }], photoRequired: true, photoPrompt: 'Photo all equipment operational, clean kitchen, new certifications posted' },
    ],
  },
  {
    id: 'pb-failed-inspection',
    title: 'Failed Health Inspection Response',
    shortDescription: 'Structured protocol for responding to critical health inspection violations with documented corrective actions and re-inspection preparation.',
    category: 'regulatory',
    defaultSeverity: 'high',
    icon: 'ClipboardCheck',
    color: '#d4af37',
    stepCount: 7,
    estimatedMinutes: 4320,
    regulatoryBasis: 'FDA Food Code 8-405.11; CA Retail Food Code §114390',
    steps: [
      { id: 'hi-1', stepNumber: 1, title: 'During Inspection', description: 'Cooperate fully with the inspector. Take notes on every item flagged. Ask for clarification on anything unclear. DO NOT argue with the inspector during the inspection. Request a copy of the inspection report before the inspector leaves.', actionItems: [{ id: 'hi-1a', label: 'Take notes on all flagged items', required: true }, { id: 'hi-1b', label: 'Request copy of inspection report', required: true }, { id: 'hi-1c', label: 'Ask for clarification on unclear items', required: false }], photoRequired: true, photoPrompt: 'Photo each cited violation' },
      { id: 'hi-2', stepNumber: 2, title: 'Immediate Review', description: 'Within 1 hour, enter each violation: code, description, severity (critical/non-critical), location, inspector comments. Categorize: items fixable immediately vs. items requiring time/resources. Assign each violation to a responsible staff member. Set correction deadlines (critical violations: typically 24-72 hours).', actionItems: [{ id: 'hi-2a', label: 'Enter all violations with details', required: true }, { id: 'hi-2b', label: 'Categorize by fixability timeline', required: true }, { id: 'hi-2c', label: 'Assign responsible staff for each', required: true }, { id: 'hi-2d', label: 'Set correction deadlines', required: true }], photoRequired: false, notePrompt: 'List each violation code with assigned owner and deadline', timerMinutes: 60 },
      { id: 'hi-3', stepNumber: 3, title: 'Immediate Corrections', description: 'Fix everything fixable right now: temperature violations (adjust equipment, discard unsafe food), handwashing violations (restock supplies, retrain), cross-contamination (reorganize storage, label containers), pest evidence (contact pest control), cleaning violations (clean cited areas immediately). Photo EACH correction: before and after.', actionItems: [{ id: 'hi-3a', label: 'Address all temperature violations', required: true }, { id: 'hi-3b', label: 'Restock handwashing stations', required: true }, { id: 'hi-3c', label: 'Fix storage/labeling issues', required: true }, { id: 'hi-3d', label: 'Address cleaning violations', required: true }, { id: 'hi-3e', label: 'Contact pest control if cited', required: false }], photoRequired: true, photoPrompt: 'Before and after photo for EACH corrected violation' },
      { id: 'hi-4', stepNumber: 4, title: 'Plan Longer-Term Corrections', description: 'Equipment repair/replacement: get quotes, order parts, schedule service. Structural issues: contact landlord/contractor. Staff training gaps: schedule training sessions. Policy/procedure changes: update SOPs, post new signage. Set specific dates for each correction.', actionItems: [{ id: 'hi-4a', label: 'Schedule equipment repairs', required: true }, { id: 'hi-4b', label: 'Contact contractors for structural issues', required: false }, { id: 'hi-4c', label: 'Schedule staff training sessions', required: true }, { id: 'hi-4d', label: 'Update SOPs and post signage', required: true }], photoRequired: false, notePrompt: 'Record scheduled dates for each longer-term correction' },
      { id: 'hi-5', stepNumber: 5, title: 'Regulatory Response', description: 'Submit corrective action plan to health department (if required by jurisdiction). EvidLY auto-generates this from your documented steps: violation → corrective action → evidence → timeline. Schedule re-inspection when all corrections are complete.', actionItems: [{ id: 'hi-5a', label: 'Submit corrective action plan to health dept', required: true }, { id: 'hi-5b', label: 'Schedule re-inspection date', required: true }], photoRequired: false, notePrompt: 'Record submission confirmation and re-inspection date' },
      { id: 'hi-6', stepNumber: 6, title: 'Staff Debrief', description: 'Hold team meeting within 24 hours. Review what was cited — no blame, focus on fixes. Retrain on specific procedures that were violated. Post key reminders in relevant kitchen areas. Assign ongoing monitoring responsibilities.', actionItems: [{ id: 'hi-6a', label: 'Hold team meeting', required: true }, { id: 'hi-6b', label: 'Retrain on violated procedures', required: true }, { id: 'hi-6c', label: 'Post reminder signage', required: true }, { id: 'hi-6d', label: 'Assign ongoing monitoring owners', required: true }], photoRequired: false },
      { id: 'hi-7', stepNumber: 7, title: 'Ongoing Monitoring', description: 'Increase monitoring frequency for cited items (daily checks for 30 days). Track compliance score impact and recovery. Schedule a mock self-inspection in 30 days. Document sustained compliance for the re-inspection visit.', actionItems: [{ id: 'hi-7a', label: 'Set daily monitoring schedule for 30 days', required: true }, { id: 'hi-7b', label: 'Schedule mock self-inspection in 30 days', required: true }, { id: 'hi-7c', label: 'Track compliance score recovery', required: true }], photoRequired: false },
    ],
  },
  {
    id: 'pb-equipment-failure',
    title: 'Equipment Failure Response',
    shortDescription: 'Protocol for managing critical equipment failures (cooler, freezer, hood system, dishwasher) with food protection and vendor coordination.',
    category: 'equipment',
    defaultSeverity: 'high',
    icon: 'Wrench',
    color: '#0369a1',
    stepCount: 6,
    estimatedMinutes: 120,
    regulatoryBasis: 'FDA Food Code 4-301.11; NFPA 96-2025 §11.4',
    steps: [
      { id: 'ef-1', stepNumber: 1, title: 'Identify & Assess', description: 'Determine what equipment failed, whether it is a total or partial failure, what food/operations are affected, and if there is a safety hazard (gas leak, electrical, water). If safety hazard exists: evacuate the area and call 911 or the utility company.', actionItems: [{ id: 'ef-1a', label: 'Identify failed equipment', required: true }, { id: 'ef-1b', label: 'Assess total vs partial failure', required: true }, { id: 'ef-1c', label: 'Identify affected food/operations', required: true }, { id: 'ef-1d', label: 'Check for safety hazards', required: true }], photoRequired: true, photoPrompt: 'Photo equipment error display, current temperature, visible damage' },
      { id: 'ef-2', stepNumber: 2, title: 'Food Protection', description: 'Walk-in cooler failure: transfer food to backup unit or coolers with ice. Freezer failure: keep door closed (holds 48 hrs if full). Hot-holding failure: serve within 4 hours or reheat to 165°F. Dishwasher failure: switch to 3-compartment sink. Hood system failure: CEASE ALL COOKING OPERATIONS per NFPA 96 (2025 Edition).', actionItems: [{ id: 'ef-2a', label: 'Transfer at-risk food to backup storage', required: true }, { id: 'ef-2b', label: 'Begin temperature monitoring every 30 min', required: true }, { id: 'ef-2c', label: 'Cease cooking if hood system failed', required: false }], photoRequired: true, photoPrompt: 'Photo food transfer process and temperature readings', criticalWarning: 'Hood system failure = NO COOKING until repaired (NFPA 96-2025). Cannot operate cooking equipment without functioning exhaust hood.', regulatoryReference: 'NFPA 96-2025 §11.4; FDA Food Code 4-301.11' },
      { id: 'ef-3', stepNumber: 3, title: 'Contact Repair Service', description: 'Call equipment repair service from your vendor directory. Request emergency/priority service. Record ticket number, estimated arrival, and estimated repair time. If repair will take >24 hours, arrange temporary equipment rental.', actionItems: [{ id: 'ef-3a', label: 'Contact equipment vendor/service', required: true }, { id: 'ef-3b', label: 'Record service ticket number', required: true }, { id: 'ef-3c', label: 'Record estimated repair timeline', required: true }, { id: 'ef-3d', label: 'Arrange temp equipment if >24hr repair', required: false }], photoRequired: false, notePrompt: 'Record vendor name, ticket #, ETA, and estimated cost' },
      { id: 'ef-4', stepNumber: 4, title: 'Operational Adjustment', description: 'Modify menu if needed based on what equipment is down. Notify staff of operational changes. If must close: notify customers, update online hours, post signage. Document estimated revenue impact for insurance.', actionItems: [{ id: 'ef-4a', label: 'Adjust menu/operations as needed', required: true }, { id: 'ef-4b', label: 'Brief staff on changes', required: true }, { id: 'ef-4c', label: 'Document revenue impact', required: true }], photoRequired: false, notePrompt: 'Record menu changes and estimated revenue impact' },
      { id: 'ef-5', stepNumber: 5, title: 'Repair & Restoration', description: 'Document the repair: what was wrong, what was fixed, parts replaced, cost. Verify equipment operating properly post-repair (temperature reaches safe range within expected time). Return food to repaired equipment only after verified safe.', actionItems: [{ id: 'ef-5a', label: 'Document repair details and cost', required: true }, { id: 'ef-5b', label: 'Verify equipment operating properly', required: true }, { id: 'ef-5c', label: 'Return food only after verified safe', required: true }], photoRequired: true, photoPrompt: 'Photo repaired equipment operating normally with temp display' },
      { id: 'ef-6', stepNumber: 6, title: 'Post-Incident Review', description: 'Document total food loss and operational cost. File insurance claim if applicable. Review: should equipment be replaced? Is it under warranty? Update preventive maintenance schedule.', actionItems: [{ id: 'ef-6a', label: 'Calculate total food loss and costs', required: true }, { id: 'ef-6b', label: 'File insurance claim if applicable', required: false }, { id: 'ef-6c', label: 'Update maintenance schedule', required: true }], photoRequired: false, notePrompt: 'Record total costs and maintenance plan updates' },
    ],
  },
  {
    id: 'pb-employee-injury',
    title: 'Employee Injury Response',
    shortDescription: 'Workplace injury protocol covering first aid, food safety, workers\' compensation, OSHA reporting, and root cause prevention.',
    category: 'health_safety',
    defaultSeverity: 'high',
    icon: 'UserX',
    color: '#7c3aed',
    stepCount: 7,
    estimatedMinutes: 60,
    regulatoryBasis: 'OSHA 29 CFR 1904; Cal/OSHA Title 8 §342; CA Labor Code §5401',
    steps: [
      { id: 'ei-1', stepNumber: 1, title: 'Immediate Response', description: 'Assess severity: minor (cut, small burn) vs. major (deep laceration, severe burn, fracture, chemical exposure). Minor: administer first aid, bandage wound, provide gloves (food handlers with open wounds MUST wear gloves AND fingerstalls). Major: call 911, do not move injured person unless in immediate danger.', actionItems: [{ id: 'ei-1a', label: 'Assess injury severity', required: true }, { id: 'ei-1b', label: 'Administer first aid or call 911', required: true }, { id: 'ei-1c', label: 'Remove contaminated food from prep area', required: true }], photoRequired: true, photoPrompt: 'Photo the hazard that caused the injury (NOT the injury itself)', criticalWarning: 'For major injuries: call 911 immediately. Do not move the injured person unless they are in immediate danger.' },
      { id: 'ei-2', stepNumber: 2, title: 'Food Safety Check', description: 'If blood or bodily fluids contacted ANY food, equipment, or surfaces: discard all potentially contaminated food immediately, clean and sanitize all affected surfaces, document what was discarded. If employee was handling food when injured, quarantine all food they were preparing.', actionItems: [{ id: 'ei-2a', label: 'Check for food/surface contamination', required: true }, { id: 'ei-2b', label: 'Discard contaminated food', required: true }, { id: 'ei-2c', label: 'Clean and sanitize affected surfaces', required: true }, { id: 'ei-2d', label: 'Assign replacement for injured employee station', required: true }], photoRequired: false },
      { id: 'ei-3', stepNumber: 3, title: 'Documentation', description: 'Record: employee name, date/time, location in kitchen, what they were doing, what happened, and witnesses. Record type of injury, body part, and severity assessment. DO NOT speculate on cause or assign blame. Have witnesses write statements in their own words.', actionItems: [{ id: 'ei-3a', label: 'Record complete incident details', required: true }, { id: 'ei-3b', label: 'Record injury type and severity', required: true }, { id: 'ei-3c', label: 'Collect witness statements', required: true }], photoRequired: true, photoPrompt: 'Photo the hazard that caused the injury (wet floor, broken equipment, etc.)', notePrompt: 'Record full incident details: who, what, when, where, witnesses' },
      { id: 'ei-4', stepNumber: 4, title: 'Workers\' Compensation', description: 'Provide employee with workers\' comp claim form (California: DWC-1 form within 1 business day). Direct employee to approved medical provider. Record medical provider visited, treatment received, and expected return date. File claim with insurance carrier within required timeframe.', actionItems: [{ id: 'ei-4a', label: 'Provide workers comp claim form (DWC-1)', required: true }, { id: 'ei-4b', label: 'Direct to approved medical provider', required: true }, { id: 'ei-4c', label: 'Record treatment details', required: true }, { id: 'ei-4d', label: 'File workers comp claim', required: true }], photoRequired: false, notePrompt: 'Record medical provider, treatment, and expected return date', regulatoryReference: 'CA Labor Code §5401 — DWC-1 within 1 business day' },
      { id: 'ei-5', stepNumber: 5, title: 'Hazard Correction', description: 'Identify what caused the injury and correct immediately if possible (clean spill, repair equipment, replace broken item). If not immediately fixable, barricade/mark the hazard and schedule repair.', actionItems: [{ id: 'ei-5a', label: 'Identify root cause of injury', required: true }, { id: 'ei-5b', label: 'Correct hazard immediately if possible', required: true }, { id: 'ei-5c', label: 'Barricade hazard if not immediately fixable', required: false }], photoRequired: true, photoPrompt: 'Photo corrected hazard (or barricaded if pending repair)' },
      { id: 'ei-6', stepNumber: 6, title: 'Regulatory Reporting', description: 'OSHA recordkeeping: record injury on OSHA 300 log if it meets criteria (hospitalization, amputation, loss of eye, or days away/restricted/transferred). California: report serious injuries to Cal/OSHA within 8 hours (hospitalization >24 hours, amputation, loss of eye, serious burn).', actionItems: [{ id: 'ei-6a', label: 'Determine if OSHA 300 log entry required', required: true }, { id: 'ei-6b', label: 'File OSHA 300 log if applicable', required: false }, { id: 'ei-6c', label: 'Report to Cal/OSHA within 8 hrs if serious', required: false }], photoRequired: false, regulatoryReference: 'OSHA 29 CFR 1904; Cal/OSHA Title 8 §342' },
      { id: 'ei-7', stepNumber: 7, title: 'Prevention Review', description: 'Investigate root cause thoroughly. Update safety procedures if needed. Retrain staff on safe practices related to the injury type. Add safety reminders/signage in the relevant area. Check if similar incidents have occurred (pattern analysis).', actionItems: [{ id: 'ei-7a', label: 'Complete root cause analysis', required: true }, { id: 'ei-7b', label: 'Update safety procedures', required: true }, { id: 'ei-7c', label: 'Retrain staff on relevant safety practices', required: true }, { id: 'ei-7d', label: 'Post safety reminders/signage', required: true }], photoRequired: false },
    ],
  },
  {
    id: 'pb-water-disruption',
    title: 'Water Service Disruption',
    shortDescription: 'Protocol for managing complete water loss or boil-water advisories, including operational shutdown procedures and restoration verification.',
    category: 'environmental',
    defaultSeverity: 'critical',
    icon: 'Droplets',
    color: '#0891b2',
    stepCount: 4,
    estimatedMinutes: 60,
    regulatoryBasis: 'FDA Food Code 5-101.11, 5-102.11; CA Retail Food Code §114099.4',
    steps: [
      { id: 'wd-1', stepNumber: 1, title: 'Assess Disruption', description: 'Determine: complete water loss OR boil-water advisory? Complete water loss = CEASE ALL FOOD OPERATIONS (cannot operate without potable water for handwashing, dishwashing, food prep). Boil-water advisory = can continue limited operations with precautions. Contact water utility for restoration estimate. Notify health department immediately.', actionItems: [{ id: 'wd-1a', label: 'Determine type: complete loss vs advisory', required: true }, { id: 'wd-1b', label: 'Contact water utility', required: true }, { id: 'wd-1c', label: 'Notify health department', required: true }, { id: 'wd-1d', label: 'Record estimated restoration time', required: true }], photoRequired: false, notePrompt: 'Record utility ticket # and estimated restoration time', criticalWarning: 'Complete water loss = CEASE ALL FOOD OPERATIONS. Cannot serve food without handwashing capability.' },
      { id: 'wd-2', stepNumber: 2, title: 'Operational Response', description: 'If complete loss: stop all food preparation, close to customers, protect all food in storage, use bottled water for critical needs only, document closure time and revenue loss. If boil-water advisory: boil water 1 minute before use, use only boiled/bottled water for food prep and ice, switch to disposable utensils, shut off ice machines, post staff signage.', actionItems: [{ id: 'wd-2a', label: 'Cease operations or implement boil-water procedures', required: true }, { id: 'wd-2b', label: 'Post signage for staff', required: true }, { id: 'wd-2c', label: 'Shut off ice machines and discard existing ice', required: true }, { id: 'wd-2d', label: 'Document closure time if applicable', required: true }], photoRequired: true, photoPrompt: 'Photo posted signage and operational adjustments' },
      { id: 'wd-3', stepNumber: 3, title: 'Restoration Verification', description: 'When water is restored or advisory lifted: flush all water lines for 5 minutes, discard ice made during advisory, run dishwasher through 2 empty cycles, clean and sanitize all food-contact surfaces, verify hot water heater producing adequate temp (171°F+ for hot-water sanitizing).', actionItems: [{ id: 'wd-3a', label: 'Flush all water lines for 5 minutes', required: true }, { id: 'wd-3b', label: 'Discard all ice from during disruption', required: true }, { id: 'wd-3c', label: 'Run dishwasher through 2 empty cycles', required: true }, { id: 'wd-3d', label: 'Verify hot water temp for sanitizing', required: true }], photoRequired: true, photoPrompt: 'Photo water running clear and equipment operational' },
      { id: 'wd-4', stepNumber: 4, title: 'Resume & Document', description: 'Resume normal operations only after all verification steps are complete. Document total downtime, revenue impact, and any food discarded. File insurance claim if applicable. Update emergency contact list for water utility.', actionItems: [{ id: 'wd-4a', label: 'Resume normal operations', required: true }, { id: 'wd-4b', label: 'Document downtime and revenue impact', required: true }, { id: 'wd-4c', label: 'File insurance claim if applicable', required: false }], photoRequired: false, notePrompt: 'Record total downtime hours and estimated revenue impact' },
    ],
  },
  {
    id: 'pb-gas-leak',
    title: 'Gas Leak / Chemical Exposure',
    shortDescription: 'Emergency evacuation and response protocol for gas leaks or chemical spills, following SDS procedures and utility company requirements.',
    category: 'health_safety',
    defaultSeverity: 'critical',
    icon: 'Wind',
    color: '#6b21a8',
    stepCount: 4,
    estimatedMinutes: 120,
    regulatoryBasis: 'OSHA 29 CFR 1910.1200 (HazCom); NFPA 54 (2025); Local Fire Code',
    steps: [
      { id: 'gl-1', stepNumber: 1, title: 'Immediate Evacuation', description: 'Gas leak: DO NOT turn on/off any electrical switches, DO NOT use phones inside the building, DO NOT light any flames. Evacuate the building immediately. Call 911 from OUTSIDE the building. Account for all staff and customers. Chemical spill: identify the chemical (check SDS), evacuate the area, ventilate if safe to do so.', actionItems: [{ id: 'gl-1a', label: 'Evacuate building immediately', required: true }, { id: 'gl-1b', label: 'Call 911 from OUTSIDE', required: true }, { id: 'gl-1c', label: 'Account for all staff and customers', required: true }, { id: 'gl-1d', label: 'Identify chemical if spill (check SDS)', required: false }], photoRequired: false, criticalWarning: 'Gas leak: DO NOT operate electrical switches, phones, or flames INSIDE the building. Evacuate IMMEDIATELY.' },
      { id: 'gl-2', stepNumber: 2, title: 'Utility & Emergency Contact', description: 'Gas leak: call gas company emergency line from outside. Do NOT re-enter until gas company clears the building. Chemical spill: follow SDS instructions for the specific chemical. Record all emergency contacts and response details.', actionItems: [{ id: 'gl-2a', label: 'Call gas company or hazmat', required: true }, { id: 'gl-2b', label: 'Wait for professional all-clear', required: true }, { id: 'gl-2c', label: 'Record emergency response details', required: true }], photoRequired: false, notePrompt: 'Record gas company ticket #, responder names, timeline', criticalWarning: 'Do NOT re-enter until gas company or fire department clears the building.' },
      { id: 'gl-3', stepNumber: 3, title: 'Food & Facility Assessment', description: 'After clearance to re-enter: all exposed food must be discarded (gas/chemical contamination). Evaluate sealed/packaged food based on exposure level. Clean and sanitize all surfaces thoroughly. Document all discarded food with replacement values.', actionItems: [{ id: 'gl-3a', label: 'Discard all exposed food', required: true }, { id: 'gl-3b', label: 'Evaluate sealed food items', required: true }, { id: 'gl-3c', label: 'Clean and sanitize all surfaces', required: true }, { id: 'gl-3d', label: 'Document discarded food with values', required: true }], photoRequired: true, photoPrompt: 'Photo all discarded items and cleaning process' },
      { id: 'gl-4', stepNumber: 4, title: 'Reopening & Documentation', description: 'Gas: utility company must verify no leak before operations resume. Chemical: area must be fully cleaned and ventilated per SDS. All cooking equipment must be inspected before use. Notify health department if operations were suspended for more than 2 hours. Generate full incident report.', actionItems: [{ id: 'gl-4a', label: 'Obtain utility/safety clearance', required: true }, { id: 'gl-4b', label: 'Inspect all equipment before use', required: true }, { id: 'gl-4c', label: 'Notify health department if >2hr suspension', required: true }, { id: 'gl-4d', label: 'Generate incident report', required: true }], photoRequired: true, photoPrompt: 'Photo equipment operational and clearance documentation' },
    ],
  },
];

const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
const fortyFiveMinAgo = new Date(Date.now() - 45 * 60000).toISOString();

export const activeIncidentPlaybooks: ActiveIncidentPlaybook[] = [
  {
    id: 'aip-001', templateId: 'pb-power-outage', templateTitle: 'Power Outage Response',
    severity: 'critical', status: 'active', location: 'Airport Terminal',
    initiatedBy: 'Sarah Lee', initiatedAt: twoHoursAgo, completedAt: null,
    currentStepNumber: 5, totalSteps: 9,
    stepLogs: [
      { stepId: 'po-1', status: 'completed', startedAt: twoHoursAgo, completedAt: new Date(Date.now() - 115 * 60000).toISOString(), notes: 'Power went out at 2:15 AM. All cooler doors secured.', photosTaken: 2, actionItemsCompleted: ['po-1a', 'po-1b', 'po-1c'] },
      { stepId: 'po-2', status: 'completed', startedAt: new Date(Date.now() - 115 * 60000).toISOString(), completedAt: new Date(Date.now() - 105 * 60000).toISOString(), notes: 'Power company ticket #PWR-20260211-4421. Est. 4-6 hours. No generator on site.', photosTaken: 1, actionItemsCompleted: ['po-2a', 'po-2b', 'po-2c', 'po-2d', 'po-2e'] },
      { stepId: 'po-3', status: 'completed', startedAt: new Date(Date.now() - 105 * 60000).toISOString(), completedAt: new Date(Date.now() - 90 * 60000).toISOString(), notes: 'Walk-in cooler: 38°F, Freezer: -2°F, Reach-in: 39°F. All within safe range.', photosTaken: 4, actionItemsCompleted: ['po-3a', 'po-3b', 'po-3c', 'po-3e'] },
      { stepId: 'po-4', status: 'completed', startedAt: new Date(Date.now() - 90 * 60000).toISOString(), completedAt: new Date(Date.now() - 60 * 60000).toISOString(), notes: 'All hot-held items discarded. 3 trays soup, 2 trays rice. Est. value $85.', photosTaken: 3, actionItemsCompleted: ['po-4a', 'po-4b', 'po-4c'] },
      { stepId: 'po-5', status: 'in_progress', startedAt: new Date(Date.now() - 60 * 60000).toISOString(), completedAt: null, notes: '30-min check: cooler 40°F, freezer 0°F. Still in safe range.', photosTaken: 2, actionItemsCompleted: ['po-5a'] },
      { stepId: 'po-6', status: 'pending', startedAt: null, completedAt: null, notes: '', photosTaken: 0, actionItemsCompleted: [] },
      { stepId: 'po-7', status: 'pending', startedAt: null, completedAt: null, notes: '', photosTaken: 0, actionItemsCompleted: [] },
      { stepId: 'po-8', status: 'pending', startedAt: null, completedAt: null, notes: '', photosTaken: 0, actionItemsCompleted: [] },
      { stepId: 'po-9', status: 'pending', startedAt: null, completedAt: null, notes: '', photosTaken: 0, actionItemsCompleted: [] },
    ],
    incidentNotes: 'Utility confirmed outage affecting entire building. No generator available. Backup coolers running on battery UPS.',
    reportGenerated: false,
  },
  {
    id: 'aip-002', templateId: 'pb-failed-inspection', templateTitle: 'Failed Health Inspection Response',
    severity: 'high', status: 'completed', location: 'University Campus',
    initiatedBy: 'Alex Johnson', initiatedAt: threeDaysAgo, completedAt: oneDayAgo,
    currentStepNumber: 7, totalSteps: 7,
    stepLogs: [
      { stepId: 'hi-1', status: 'completed', startedAt: threeDaysAgo, completedAt: threeDaysAgo, notes: 'Inspector found 3 critical, 5 non-critical violations.', photosTaken: 8, actionItemsCompleted: ['hi-1a', 'hi-1b'] },
      { stepId: 'hi-2', status: 'completed', startedAt: threeDaysAgo, completedAt: threeDaysAgo, notes: 'All violations cataloged. Critical: improper cold holding, missing date labels, handwash sink blocked.', photosTaken: 0, actionItemsCompleted: ['hi-2a', 'hi-2b', 'hi-2c', 'hi-2d'] },
      { stepId: 'hi-3', status: 'completed', startedAt: threeDaysAgo, completedAt: threeDaysAgo, notes: 'All 3 critical violations corrected same day. Handwash sink cleared, cold unit recalibrated, all items re-labeled.', photosTaken: 6, actionItemsCompleted: ['hi-3a', 'hi-3b', 'hi-3c', 'hi-3d'] },
      { stepId: 'hi-4', status: 'completed', startedAt: new Date(Date.now() - 2.5 * 86400000).toISOString(), completedAt: new Date(Date.now() - 2 * 86400000).toISOString(), notes: 'Scheduled thermometer calibration service. Training session for Wednesday.', photosTaken: 0, actionItemsCompleted: ['hi-4a', 'hi-4c', 'hi-4d'] },
      { stepId: 'hi-5', status: 'completed', startedAt: new Date(Date.now() - 2 * 86400000).toISOString(), completedAt: new Date(Date.now() - 1.5 * 86400000).toISOString(), notes: 'Corrective action plan submitted. Re-inspection scheduled for next Tuesday.', photosTaken: 0, actionItemsCompleted: ['hi-5a', 'hi-5b'] },
      { stepId: 'hi-6', status: 'completed', startedAt: new Date(Date.now() - 1.5 * 86400000).toISOString(), completedAt: new Date(Date.now() - 1.2 * 86400000).toISOString(), notes: 'Team meeting held. All staff retrained on cold holding and labeling procedures.', photosTaken: 0, actionItemsCompleted: ['hi-6a', 'hi-6b', 'hi-6c', 'hi-6d'] },
      { stepId: 'hi-7', status: 'completed', startedAt: new Date(Date.now() - 1.2 * 86400000).toISOString(), completedAt: oneDayAgo, notes: 'Daily monitoring schedule set. Mock inspection in 30 days.', photosTaken: 0, actionItemsCompleted: ['hi-7a', 'hi-7b', 'hi-7c'] },
    ],
    incidentNotes: 'Citation #HD-2026-0041 for improper food storage. All items corrected within 48 hours. Re-inspection scheduled.',
    reportGenerated: true,
  },
  {
    id: 'aip-003', templateId: 'pb-employee-injury', templateTitle: 'Employee Injury Response',
    severity: 'high', status: 'active', location: 'Downtown Kitchen',
    initiatedBy: 'Maria Garcia', initiatedAt: fortyFiveMinAgo, completedAt: null,
    currentStepNumber: 3, totalSteps: 7,
    stepLogs: [
      { stepId: 'ei-1', status: 'completed', startedAt: fortyFiveMinAgo, completedAt: new Date(Date.now() - 40 * 60000).toISOString(), notes: 'Line cook Carlos M. suffered burn on left forearm from fryer splash. Minor — first aid administered, cold water and burn cream applied.', photosTaken: 1, actionItemsCompleted: ['ei-1a', 'ei-1b', 'ei-1c'] },
      { stepId: 'ei-2', status: 'completed', startedAt: new Date(Date.now() - 40 * 60000).toISOString(), completedAt: new Date(Date.now() - 30 * 60000).toISOString(), notes: 'No food contamination. Prep area cleaned. Sofia R. covering station.', photosTaken: 0, actionItemsCompleted: ['ei-2a', 'ei-2b', 'ei-2c', 'ei-2d'] },
      { stepId: 'ei-3', status: 'in_progress', startedAt: new Date(Date.now() - 30 * 60000).toISOString(), completedAt: null, notes: 'Documenting incident details. Witness: Tyler B.', photosTaken: 1, actionItemsCompleted: ['ei-3a'] },
      { stepId: 'ei-4', status: 'pending', startedAt: null, completedAt: null, notes: '', photosTaken: 0, actionItemsCompleted: [] },
      { stepId: 'ei-5', status: 'pending', startedAt: null, completedAt: null, notes: '', photosTaken: 0, actionItemsCompleted: [] },
      { stepId: 'ei-6', status: 'pending', startedAt: null, completedAt: null, notes: '', photosTaken: 0, actionItemsCompleted: [] },
      { stepId: 'ei-7', status: 'pending', startedAt: null, completedAt: null, notes: '', photosTaken: 0, actionItemsCompleted: [] },
    ],
    incidentNotes: 'Line cook burn from fryer splash. First aid administered. Minor injury — no 911 needed.',
    reportGenerated: false,
  },
];

// ── Feature #18 Continued — Custom Playbooks, Food Disposition, AI, Analytics ──

export interface FoodDispositionEntry {
  id: string;
  foodName: string;
  category: 'meat' | 'dairy' | 'produce' | 'prepared' | 'frozen' | 'bakery' | 'seafood';
  quantity: number;
  unit: 'lbs' | 'oz' | 'each' | 'trays' | 'gallons';
  costPerUnit: number;
  currentTemp: number;
  timeInDangerZone: number;
  decision: 'keep' | 'discard' | 'cook_now' | 'refreeze';
  decisionBy: string;
  decisionAt: string;
  notes: string;
}

export interface CustomPlaybookStepDraft {
  id: string;
  stepNumber: number;
  title: string;
  instructions: string;
  requirePhoto: boolean;
  requireTemp: boolean;
  requireSignature: boolean;
  requireText: boolean;
  checklistItems: string[];
  timeLimitMinutes: number | null;
  escalationContact: string;
  escalationMinutes: number | null;
}

export interface CustomPlaybookDraft {
  id: string;
  title: string;
  description: string;
  category: PlaybookCategory;
  severity: PlaybookSeverity;
  icon: string;
  color: string;
  createdBy: string;
  createdAt: string;
  status: 'draft' | 'published';
  assignedLocations: string[];
  reviewSchedule: 'monthly' | 'quarterly' | 'annually';
  steps: CustomPlaybookStepDraft[];
}

export interface PlaybookVendorContact {
  id: string;
  activationId: string;
  vendorName: string;
  contactName: string;
  phone: string;
  email: string;
  role: string;
  contactedAt: string;
  response: string;
  ticketNumber: string;
}

export interface PlaybookInsuranceClaim {
  id: string;
  activationId: string;
  claimNumber: string;
  carrier: string;
  deductible: number;
  totalLoss: number;
  itemCount: number;
  status: 'draft' | 'filed' | 'under_review' | 'approved' | 'denied';
  filedAt: string;
  filedBy: string;
  notes: string;
}

export interface PlaybookAiMessage {
  id: string;
  playbookType: string;
  stepNumber: number;
  role: 'assistant' | 'system';
  content: string;
  suggestions: string[];
  triggerCondition: 'step_enter' | 'time_warning' | 'temp_warning' | 'user_request';
}

export interface PlaybookAnalyticsData {
  monthlyIncidents: { month: string; powerOutage: number; foodborne: number; fire: number; equipment: number; other: number }[];
  responseTimeTrend: { month: string; avgMinutes: number }[];
  stepCompletionRates: { stepTitle: string; completionRate: number; avgDurationMin: number }[];
  locationComparison: { location: string; totalIncidents: number; avgResponseMin: number; complianceRate: number; foodLossDollars: number }[];
}

// ── Demo Custom Playbooks ─────────────────────────────────────

export const demoCustomPlaybooks: CustomPlaybookDraft[] = [
  {
    id: 'cpb-allergen',
    title: 'Allergen Cross-Contact Protocol',
    description: 'Response protocol when a customer reports an allergic reaction or potential allergen cross-contact is discovered in the kitchen.',
    category: 'health_safety',
    severity: 'critical',
    icon: 'AlertTriangle',
    color: '#dc2626',
    createdBy: 'James Wilson',
    createdAt: '2026-01-15T10:00:00Z',
    status: 'published',
    assignedLocations: ['Downtown Kitchen', 'Airport Terminal', 'University Campus'],
    reviewSchedule: 'quarterly',
    steps: [
      { id: 'ac-1', stepNumber: 1, title: 'Assess Customer Condition', instructions: 'Determine severity: Is the customer having difficulty breathing, swelling, or hives? Call 911 immediately if anaphylaxis suspected. Retrieve the EpiPen from the first aid station if available.', requirePhoto: false, requireTemp: false, requireSignature: false, requireText: true, checklistItems: ['Assess customer symptoms', 'Call 911 if severe', 'Locate EpiPen kit'], timeLimitMinutes: 5, escalationContact: 'General Manager', escalationMinutes: 3 },
      { id: 'ac-2', stepNumber: 2, title: 'Identify the Allergen Source', instructions: 'Pull the customer order ticket. Identify which dish was served and cross-reference ingredients against the allergen matrix. Check if any substitutions or modifications were made.', requirePhoto: true, requireTemp: false, requireSignature: false, requireText: true, checklistItems: ['Pull order ticket', 'Cross-reference allergen matrix', 'Check for substitutions', 'Interview prep cook'], timeLimitMinutes: 10, escalationContact: '', escalationMinutes: null },
      { id: 'ac-3', stepNumber: 3, title: 'Secure the Kitchen Station', instructions: 'Stop all prep at the suspected station. Remove and hold all ingredients and tools for investigation. Clean and sanitize the entire station before any food preparation resumes.', requirePhoto: true, requireTemp: false, requireSignature: false, requireText: false, checklistItems: ['Stop prep at station', 'Hold all ingredients', 'Clean and sanitize station', 'Replace all utensils'], timeLimitMinutes: 15, escalationContact: '', escalationMinutes: null },
      { id: 'ac-4', stepNumber: 4, title: 'Document and Report', instructions: 'Complete the allergen incident form. Record customer information (with consent), symptoms, suspected allergen, actions taken, and outcome. Notify the owner/operator immediately.', requirePhoto: false, requireTemp: false, requireSignature: true, requireText: true, checklistItems: ['Complete incident form', 'Record customer information', 'Notify owner/operator', 'File with EvidLY'], timeLimitMinutes: null, escalationContact: '', escalationMinutes: null },
    ],
  },
  {
    id: 'cpb-delivery-reject',
    title: 'Vendor Delivery Rejection Protocol',
    description: 'Step-by-step procedure for rejecting a food delivery that fails temperature, quality, or documentation checks.',
    category: 'regulatory',
    severity: 'medium',
    icon: 'Truck',
    color: '#d4af37',
    createdBy: 'Sarah Chen',
    createdAt: '2026-01-20T14:30:00Z',
    status: 'published',
    assignedLocations: ['Downtown Kitchen', 'Airport Terminal'],
    reviewSchedule: 'annually',
    steps: [
      { id: 'dr-1', stepNumber: 1, title: 'Document the Failure', instructions: 'Record the vendor name, driver name, delivery invoice number, and the specific reason for rejection (temperature, damage, pest evidence, wrong items, expired dates).', requirePhoto: true, requireTemp: true, requireSignature: false, requireText: true, checklistItems: ['Record vendor/driver info', 'Record invoice number', 'Document rejection reason'], timeLimitMinutes: 10, escalationContact: '', escalationMinutes: null },
      { id: 'dr-2', stepNumber: 2, title: 'Notify Vendor', instructions: 'Contact the vendor account manager by phone. Explain the rejection, provide photo evidence. Request a replacement delivery or credit memo. Record the conversation and any reference numbers.', requirePhoto: false, requireTemp: false, requireSignature: false, requireText: true, checklistItems: ['Call vendor account manager', 'Explain rejection with evidence', 'Request replacement or credit', 'Record reference number'], timeLimitMinutes: 15, escalationContact: '', escalationMinutes: null },
      { id: 'dr-3', stepNumber: 3, title: 'Driver Acknowledgment', instructions: 'Have the delivery driver sign the rejection form acknowledging the refused delivery. Ensure all rejected items are returned to the truck. Do not allow rejected food to be left on premises.', requirePhoto: true, requireTemp: false, requireSignature: true, requireText: false, checklistItems: ['Driver signs rejection form', 'All items returned to truck', 'Verify truck departure'], timeLimitMinutes: null, escalationContact: '', escalationMinutes: null },
    ],
  },
];

// ── Demo Food Disposition (Power Outage aip-001) ──────────────

export const demoFoodDisposition: FoodDispositionEntry[] = [
  { id: 'fd-1', foodName: 'Chicken Breast (raw)', category: 'meat', quantity: 24, unit: 'lbs', costPerUnit: 4.50, currentTemp: 48, timeInDangerZone: 45, decision: 'discard', decisionBy: 'James Wilson', decisionAt: new Date(Date.now() - 90 * 60000).toISOString(), notes: 'Above 41°F for >45 min. FDA requires discard.' },
  { id: 'fd-2', foodName: 'Ground Beef (raw)', category: 'meat', quantity: 15, unit: 'lbs', costPerUnit: 5.25, currentTemp: 46, timeInDangerZone: 45, decision: 'discard', decisionBy: 'James Wilson', decisionAt: new Date(Date.now() - 89 * 60000).toISOString(), notes: 'Above 41°F. Discard per protocol.' },
  { id: 'fd-3', foodName: 'Shrimp (raw, peeled)', category: 'seafood', quantity: 10, unit: 'lbs', costPerUnit: 12.00, currentTemp: 47, timeInDangerZone: 40, decision: 'discard', decisionBy: 'James Wilson', decisionAt: new Date(Date.now() - 88 * 60000).toISOString(), notes: 'Seafood TCS — high risk. Discard.' },
  { id: 'fd-4', foodName: 'Whole Milk (gallons)', category: 'dairy', quantity: 6, unit: 'gallons', costPerUnit: 4.00, currentTemp: 44, timeInDangerZone: 30, decision: 'discard', decisionBy: 'James Wilson', decisionAt: new Date(Date.now() - 87 * 60000).toISOString(), notes: 'Dairy above 41°F for 30 min.' },
  { id: 'fd-5', foodName: 'Prep Salads (mixed)', category: 'prepared', quantity: 8, unit: 'trays', costPerUnit: 15.00, currentTemp: 50, timeInDangerZone: 60, decision: 'discard', decisionBy: 'James Wilson', decisionAt: new Date(Date.now() - 86 * 60000).toISOString(), notes: 'Pre-prepared TCS food — well above safe temp.' },
  { id: 'fd-6', foodName: 'Butter (sticks)', category: 'dairy', quantity: 20, unit: 'lbs', costPerUnit: 3.50, currentTemp: 55, timeInDangerZone: 60, decision: 'keep', decisionBy: 'James Wilson', decisionAt: new Date(Date.now() - 85 * 60000).toISOString(), notes: 'Butter is not TCS — safe to keep at room temp.' },
  { id: 'fd-7', foodName: 'Frozen Fries (cases)', category: 'frozen', quantity: 4, unit: 'each', costPerUnit: 22.00, currentTemp: 18, timeInDangerZone: 0, decision: 'refreeze', decisionBy: 'James Wilson', decisionAt: new Date(Date.now() - 84 * 60000).toISOString(), notes: 'Still solidly frozen at 18°F. Safe to refreeze when power returns.' },
  { id: 'fd-8', foodName: 'Chicken Stock (house-made)', category: 'prepared', quantity: 3, unit: 'gallons', costPerUnit: 8.00, currentTemp: 52, timeInDangerZone: 50, decision: 'cook_now', decisionBy: 'James Wilson', decisionAt: new Date(Date.now() - 83 * 60000).toISOString(), notes: 'Can be rapidly brought to boil on gas stove (gas still working) within 15 min.' },
];

// ── Demo Vendor Contacts ──────────────────────────────────────

export const demoVendorContacts: PlaybookVendorContact[] = [
  { id: 'pvc-1', activationId: 'aip-001', vendorName: 'Pacific Gas & Electric', contactName: 'Emergency Dispatch', phone: '1-800-743-5000', email: '', role: 'Utility Provider', contactedAt: new Date(Date.now() - 110 * 60000).toISOString(), response: 'Estimated restoration: 4-6 hours. Transformer failure on block affecting 200 customers. Crew dispatched.', ticketNumber: 'PGE-2026-0211-4782' },
  { id: 'pvc-2', activationId: 'aip-001', vendorName: 'All-Star Equipment Repair', contactName: 'Mike Torres', phone: '(415) 555-0142', email: 'mike@allstarequip.com', role: 'Equipment Service', contactedAt: new Date(Date.now() - 95 * 60000).toISOString(), response: 'Can send technician to verify refrigeration units once power restored. Earliest slot: tomorrow 8 AM if power returns today.', ticketNumber: 'ASR-8891' },
  { id: 'pvc-3', activationId: 'aip-001', vendorName: 'Pinnacle Insurance Group', contactName: 'Claims Dept', phone: '1-888-555-0199', email: 'claims@pinnacleins.com', role: 'Insurance Provider', contactedAt: new Date(Date.now() - 80 * 60000).toISOString(), response: 'Claim initiated. Adjuster will contact within 24 hours. Document all food loss with photos and itemized inventory.', ticketNumber: 'CLM-2026-02110547' },
];

// ── Demo Insurance Claim ──────────────────────────────────────

export const demoInsuranceClaim: PlaybookInsuranceClaim = {
  id: 'pic-001',
  activationId: 'aip-001',
  claimNumber: 'CLM-2026-02110547',
  carrier: 'Pinnacle Insurance Group',
  deductible: 500,
  totalLoss: 523,
  itemCount: 6,
  status: 'filed',
  filedAt: new Date(Date.now() - 60 * 60000).toISOString(),
  filedBy: 'James Wilson',
  notes: 'Power outage food loss. 6 items discarded, 1 cooked immediately, 1 refrozen. Total discarded value: $523.00. Exceeds $500 deductible.',
};

// ── Demo AI Copilot Messages ──────────────────────────────────

export const demoPlaybookAiMessages: PlaybookAiMessage[] = [
  { id: 'aim-1', playbookType: 'pb-power-outage', stepNumber: 1, role: 'assistant', content: 'Power outage detected. I\'ve started the clock. Remember: a closed walk-in cooler maintains safe temperature (≤41°F) for approximately 4 hours if doors remain shut. A full freezer holds for ~48 hours, half-full for ~24 hours.', suggestions: ['What temp is my cooler at?', 'When should I check food?', 'Do I need to notify health dept?'], triggerCondition: 'step_enter' },
  { id: 'aim-2', playbookType: 'pb-power-outage', stepNumber: 2, role: 'assistant', content: 'When calling your utility company, ask for: (1) estimated restoration time, (2) cause of outage, (3) ticket/reference number. Document everything — this becomes part of your insurance claim if needed.', suggestions: ['What if they don\'t give an ETA?', 'Should I start the generator?'], triggerCondition: 'step_enter' },
  { id: 'aim-3', playbookType: 'pb-power-outage', stepNumber: 3, role: 'assistant', content: 'Use your probe thermometer, not digital displays (which may be off without power). Check temps through the door seal if possible to minimize door openings. Each door opening can raise walk-in temps by 3-5°F.', suggestions: ['What\'s the danger zone?', 'How often should I check?'], triggerCondition: 'step_enter' },
  { id: 'aim-4', playbookType: 'pb-power-outage', stepNumber: 4, role: 'system', content: '⏰ It\'s been 1 hour since the power went out. Begin checking hot-holding food. Any hot TCS food that has dropped below 135°F should be evaluated for discard.', suggestions: ['Show hot-holding rules', 'What about soup on the line?'], triggerCondition: 'time_warning' },
  { id: 'aim-5', playbookType: 'pb-power-outage', stepNumber: 5, role: 'assistant', content: 'You\'re monitoring cold food temperatures. Per FDA Food Code 3-501.16, TCS food must be maintained at 41°F or below. If any item reaches 41°F+, start the danger zone clock — you have a maximum of 4 hours total (cumulative) in the danger zone before mandatory discard.', suggestions: ['Calculate danger zone time', 'Show FDA reference'], triggerCondition: 'step_enter' },
  { id: 'aim-6', playbookType: 'pb-power-outage', stepNumber: 5, role: 'system', content: '🌡️ Based on your logged temperatures, your walk-in cooler is at 44°F. It has entered the danger zone. You have approximately 3 hours and 15 minutes remaining before food disposition evaluation is required.', suggestions: ['What should I move first?', 'Can I use ice?'], triggerCondition: 'temp_warning' },
  { id: 'aim-7', playbookType: 'pb-power-outage', stepNumber: 6, role: 'assistant', content: 'Time for food disposition evaluation. Use the Food Disposition panel to log each TCS item. Remember: when in doubt, throw it out. The cost of food loss is always less than the cost of a foodborne illness outbreak. I\'ll help calculate your total loss for insurance.', suggestions: ['Open food disposition', 'Show TCS food list', 'Insurance deductible info'], triggerCondition: 'step_enter' },
  { id: 'aim-8', playbookType: 'pb-power-outage', stepNumber: 7, role: 'assistant', content: 'For your freezer assessment: a fully stocked freezer maintains safe temps for ~48 hours, half-full for ~24 hours. Check for ice crystals — if food still has ice crystals and is at or below 40°F, it can be safely refrozen.', suggestions: ['Ice crystal test', 'Partial thaw rules'], triggerCondition: 'step_enter' },
  { id: 'aim-9', playbookType: 'pb-power-outage', stepNumber: 8, role: 'assistant', content: 'Power is back! Before resuming food service: (1) verify all equipment reaches safe operating temps, (2) re-check all food items, (3) discard anything questionable. Document the restoration time — this is critical for your insurance claim timeline.', suggestions: ['Equipment verification checklist', 'When can I reopen?'], triggerCondition: 'step_enter' },
  { id: 'aim-10', playbookType: 'pb-power-outage', stepNumber: 9, role: 'assistant', content: 'Great work completing this playbook. I\'m generating your incident report now. Your total food loss was $523.00, which exceeds your $500 deductible. I recommend filing an insurance claim. I\'ve also drafted a compliance narrative for your records.', suggestions: ['View insurance summary', 'Download full report', 'View compliance narrative'], triggerCondition: 'step_enter' },
  { id: 'aim-11', playbookType: 'pb-foodborne-illness', stepNumber: 1, role: 'assistant', content: 'Foodborne illness complaint received. Stay calm and professional. Your first priority is documenting the complaint details accurately. Do NOT admit fault — simply gather facts. Ask: what did they eat, when did symptoms start, who else is affected.', suggestions: ['What questions to ask', 'Do I need to notify health dept?'], triggerCondition: 'step_enter' },
  { id: 'aim-12', playbookType: 'pb-kitchen-fire', stepNumber: 1, role: 'assistant', content: '🔥 FIRE EMERGENCY. Safety first: (1) Evacuate if fire is beyond a small contained grease fire, (2) Never use water on a grease fire, (3) Use Class K extinguisher for cooking oil fires, (4) The hood suppression system should activate automatically — if not, use the manual pull station.', suggestions: ['PASS technique', 'When to evacuate vs fight'], triggerCondition: 'step_enter' },
  { id: 'aim-13', playbookType: 'pb-failed-inspection', stepNumber: 1, role: 'assistant', content: 'Failed inspection — let\'s fix this systematically. Start by categorizing each violation as Critical (immediate health hazard), Major (potential hazard), or Minor (general maintenance). Critical violations need same-day correction. I\'ll help you prioritize.', suggestions: ['Show violation categories', 'Common critical violations'], triggerCondition: 'step_enter' },
  { id: 'aim-14', playbookType: 'pb-equipment-failure', stepNumber: 1, role: 'assistant', content: 'Equipment failure detected. First, identify which equipment and assess impact on food safety. If it\'s a refrigeration unit, this becomes a time-sensitive food safety issue similar to a power outage. If it\'s cooking equipment, assess whether you can continue service safely.', suggestions: ['Refrigeration failure protocol', 'Can I still serve food?'], triggerCondition: 'step_enter' },
  { id: 'aim-15', playbookType: 'pb-employee-injury', stepNumber: 1, role: 'assistant', content: 'Employee injury — address medical needs first, then food safety. If the injury involves bleeding near food prep areas, immediately secure all food in the area. Clean and sanitize all surfaces within 6 feet of the incident. Report any injury requiring medical attention to workers\' comp.', suggestions: ['First aid steps', 'Workers comp requirements', 'Blood cleanup protocol'], triggerCondition: 'step_enter' },
];

// ── Demo Playbook Analytics ───────────────────────────────────

export const demoPlaybookAnalytics: PlaybookAnalyticsData = {
  monthlyIncidents: [
    { month: 'Sep 2025', powerOutage: 1, foodborne: 0, fire: 0, equipment: 2, other: 1 },
    { month: 'Oct 2025', powerOutage: 0, foodborne: 1, fire: 0, equipment: 1, other: 0 },
    { month: 'Nov 2025', powerOutage: 2, foodborne: 0, fire: 1, equipment: 0, other: 1 },
    { month: 'Dec 2025', powerOutage: 1, foodborne: 1, fire: 0, equipment: 1, other: 0 },
    { month: 'Jan 2026', powerOutage: 0, foodborne: 0, fire: 0, equipment: 2, other: 1 },
    { month: 'Feb 2026', powerOutage: 1, foodborne: 0, fire: 0, equipment: 0, other: 1 },
  ],
  responseTimeTrend: [
    { month: 'Sep 2025', avgMinutes: 72 },
    { month: 'Oct 2025', avgMinutes: 65 },
    { month: 'Nov 2025', avgMinutes: 58 },
    { month: 'Dec 2025', avgMinutes: 52 },
    { month: 'Jan 2026', avgMinutes: 48 },
    { month: 'Feb 2026', avgMinutes: 47 },
  ],
  stepCompletionRates: [
    { stepTitle: 'Immediate Response', completionRate: 98, avgDurationMin: 4 },
    { stepTitle: 'Assess & Contact', completionRate: 95, avgDurationMin: 12 },
    { stepTitle: 'Secure Food / Area', completionRate: 92, avgDurationMin: 18 },
    { stepTitle: 'Documentation', completionRate: 88, avgDurationMin: 25 },
    { stepTitle: 'Notification / Escalation', completionRate: 85, avgDurationMin: 8 },
    { stepTitle: 'Food Disposition', completionRate: 90, avgDurationMin: 35 },
    { stepTitle: 'Vendor Coordination', completionRate: 82, avgDurationMin: 15 },
    { stepTitle: 'Restoration / Verification', completionRate: 94, avgDurationMin: 20 },
    { stepTitle: 'Post-Incident Report', completionRate: 78, avgDurationMin: 30 },
  ],
  locationComparison: [
    { location: 'Downtown Kitchen', totalIncidents: 5, avgResponseMin: 42, complianceRate: 96, foodLossDollars: 850 },
    { location: 'Airport Terminal', totalIncidents: 8, avgResponseMin: 55, complianceRate: 88, foodLossDollars: 2340 },
    { location: 'University Campus', totalIncidents: 3, avgResponseMin: 38, complianceRate: 94, foodLossDollars: 420 },
  ],
};

// ── Common TCS Foods (for food disposition quick-add) ─────────

export const commonTCSFoods: { name: string; category: string; avgCostPerUnit: number; unit: string }[] = [
  { name: 'Chicken Breast (raw)', category: 'meat', avgCostPerUnit: 4.50, unit: 'lbs' },
  { name: 'Ground Beef (raw)', category: 'meat', avgCostPerUnit: 5.25, unit: 'lbs' },
  { name: 'Pork Tenderloin (raw)', category: 'meat', avgCostPerUnit: 5.00, unit: 'lbs' },
  { name: 'Salmon Fillet (raw)', category: 'seafood', avgCostPerUnit: 14.00, unit: 'lbs' },
  { name: 'Shrimp (raw, peeled)', category: 'seafood', avgCostPerUnit: 12.00, unit: 'lbs' },
  { name: 'Whole Milk', category: 'dairy', avgCostPerUnit: 4.00, unit: 'gallons' },
  { name: 'Heavy Cream', category: 'dairy', avgCostPerUnit: 6.50, unit: 'gallons' },
  { name: 'Shredded Cheese (mixed)', category: 'dairy', avgCostPerUnit: 5.50, unit: 'lbs' },
  { name: 'Shell Eggs', category: 'dairy', avgCostPerUnit: 3.50, unit: 'each' },
  { name: 'Sliced Deli Turkey', category: 'meat', avgCostPerUnit: 7.00, unit: 'lbs' },
  { name: 'Cooked Rice (batch)', category: 'prepared', avgCostPerUnit: 8.00, unit: 'trays' },
  { name: 'Cooked Pasta (batch)', category: 'prepared', avgCostPerUnit: 6.00, unit: 'trays' },
  { name: 'House Soup (batch)', category: 'prepared', avgCostPerUnit: 12.00, unit: 'gallons' },
  { name: 'Prep Salads (mixed)', category: 'prepared', avgCostPerUnit: 15.00, unit: 'trays' },
  { name: 'Cut Melon', category: 'produce', avgCostPerUnit: 4.00, unit: 'trays' },
  { name: 'Sliced Tomatoes', category: 'produce', avgCostPerUnit: 3.00, unit: 'trays' },
  { name: 'Bean Sprouts', category: 'produce', avgCostPerUnit: 2.50, unit: 'lbs' },
  { name: 'Tofu (firm)', category: 'produce', avgCostPerUnit: 3.00, unit: 'lbs' },
  { name: 'Cream Sauce (house)', category: 'prepared', avgCostPerUnit: 10.00, unit: 'gallons' },
  { name: 'Chicken Stock (house)', category: 'prepared', avgCostPerUnit: 8.00, unit: 'gallons' },
];
