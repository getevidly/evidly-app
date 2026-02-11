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
// Weights: Operational 50%, Equipment 25%, Documentation 25%
// Downtown: Everything current, fire suppression due in 15 days (−3.75 on Equipment)
//   Operational 94, Equipment 88, Documentation 91 → Overall 92
// Airport: Hood cleaning 5 days overdue (−30 Equipment), 1 vendor cert due in 12 days, checklist rate dropped
//   Operational 72, Equipment 62, Documentation 74 → Overall 70
// University: Health permit expired (−25 Docs), 2 food handler certs expired (−10 Docs), equipment overdue
//   Operational 62, Equipment 55, Documentation 42 → Overall 55
// ============================================================

export const locationScores: Record<string, { overall: number; operational: number; equipment: number; documentation: number }> = {
  'downtown': { operational: 94, equipment: 88, documentation: 91, overall: 92 },
  'airport':  { operational: 72, equipment: 62, documentation: 74, overall: 70 },
  'university': { operational: 62, equipment: 55, documentation: 42, overall: 55 },
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
    description: 'Full-service commercial kitchen fire protection specialists. IKECA-certified hood cleaning with NFPA 96 compliance documentation provided after every service. Serving the Central Valley since 2008.',
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
      { name: 'Hood & Duct Cleaning', description: 'Complete kitchen exhaust system cleaning per NFPA 96 schedule. Includes before/after photos and bare metal verification.', frequencyOptions: ['Monthly', 'Quarterly', 'Semi-Annual'], pricingDisplay: '$350 - $750' },
      { name: 'Fire Extinguisher Inspection', description: 'Annual inspection, 6-year maintenance, and 12-year hydrostatic testing per NFPA 10.', frequencyOptions: ['Annual'], pricingDisplay: '$25/unit' },
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
    description: 'Authorized dealer for Ansul and Amerex fire suppression systems. Factory-trained technicians provide semi-annual inspections per NFPA 17A with full documentation.',
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
      { name: 'Fire Suppression Inspection', description: 'Semi-annual inspection and testing of kitchen fire suppression systems per NFPA 17A/UL 300.', frequencyOptions: ['Semi-Annual'], pricingDisplay: '$275 - $450' },
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
      { name: 'Hood & Duct Cleaning (NFPA 96)', description: 'Full exhaust system cleaning to bare metal with before/after photos, sticker placement, and compliance report uploaded within 4 hours of service.', frequencyOptions: ['Monthly', 'Quarterly', 'Semi-Annual'], pricingDisplay: '$400 - $900' },
      { name: 'Rooftop Grease Containment', description: 'Installation and maintenance of rooftop grease containment systems for exhaust fan runoff.', frequencyOptions: ['Quarterly'], pricingDisplay: '$150 - $300' },
      { name: 'Fire Extinguisher Service', description: 'Annual inspection and 6-year maintenance per NFPA 10.', frequencyOptions: ['Annual'], pricingDisplay: '$20/unit' },
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
      { name: 'Fire Suppression Inspection', description: 'Semi-annual kitchen fire suppression system inspection per NFPA 17A with detailed compliance report.', frequencyOptions: ['Semi-Annual'], pricingDisplay: '$250 - $400' },
      { name: 'Fire Alarm Inspection', description: 'Annual fire alarm system testing and certification per NFPA 72.', frequencyOptions: ['Annual'], pricingDisplay: '$200 - $350' },
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
