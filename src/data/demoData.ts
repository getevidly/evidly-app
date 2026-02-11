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

// ============================================================
// Cleaning Pros Plus — Launch Vendor (EvidLY Preferred)
// ============================================================
// Append to marketplaceVendors after initialization below

export const cleaningProsPlus: MarketplaceVendor = {
  id: 'mv-16', slug: 'cleaning-pros-plus', companyName: 'Cleaning Pros Plus',
  description: 'Central Valley\'s premier commercial kitchen exhaust cleaning company. IKECA Master Certified with 90+ active accounts including Aramark and Yosemite National Park hospitality. Specializing in NFPA 96 compliant hood and duct cleaning with bare-metal verification photography on every job. Family-owned since 2008.',
  tier: 'preferred', rating: 4.8, reviewCount: 34, yearsInBusiness: 18,
  serviceArea: ['Fresno', 'Clovis', 'Madera', 'Merced', 'Visalia', 'Tulare', 'Stanislaus', 'Mariposa'],
  responseTimeHours: 2, categories: ['Fire Safety'], subcategories: ['Hood Cleaning'],
  languages: ['English', 'Spanish'], kitchensServed: 92, totalServices: 1450, onTimeRate: 99, docUploadRate: 98,
  certifications: [
    { name: 'IKECA Master Certified', verified: true, expirationDate: '2027-06-30' },
    { name: 'State Fire Marshal Licensed', verified: true, expirationDate: '2027-01-31' },
    { name: 'OSHA 30-Hour Construction', verified: true },
    { name: 'NFPA 96 Compliance Specialist', verified: true },
  ],
  insurance: [
    { type: 'General Liability ($2M)', verified: true, expirationDate: '2026-12-31' },
    { type: 'Workers Compensation', verified: true, expirationDate: '2026-12-31' },
    { type: 'Commercial Auto', verified: true, expirationDate: '2026-12-31' },
    { type: 'Pollution Liability', verified: true, expirationDate: '2026-12-31' },
  ],
  serviceOfferings: [
    { name: 'Hood & Duct Cleaning (NFPA 96)', description: 'Complete exhaust system cleaning to bare metal per NFPA 96 and IKECA standards. Includes before/after photographic documentation, access panel installation if needed, and compliance certificate.', frequencyOptions: ['Monthly', 'Quarterly', 'Semi-Annual'], pricingDisplay: '$450 - $1,200' },
    { name: 'Kitchen Equipment Cleaning', description: 'Deep cleaning of all commercial kitchen equipment including grills, fryers, ovens, and prep surfaces. Restaurant-grade degreasers and sanitizers used.', frequencyOptions: ['Weekly', 'Monthly', 'Quarterly'], pricingDisplay: '$200 - $600' },
    { name: 'Rooftop Grease Containment', description: 'Installation and maintenance of rooftop grease containment systems. Prevents grease buildup on roofs that can cause structural damage and fire hazard.', frequencyOptions: ['Quarterly', 'Semi-Annual'], pricingDisplay: '$150 - $350' },
  ],
  contactName: 'Marco Reyes', phone: '(559) 555-0100', email: 'marco@cleaningprosplus.com', website: 'cleaningprosplus.com',
};

// Inject Cleaning Pros Plus into the vendors array
marketplaceVendors.push(cleaningProsPlus);

// Cleaning Pros Plus reviews
marketplaceReviews.push(
  { id: 'mr-26', vendorSlug: 'cleaning-pros-plus', reviewerName: 'Richard T.', reviewerOrg: 'Aramark Food Services', rating: 5, text: 'Cleaning Pros Plus handles all our Yosemite hospitality locations. Marco\'s crew does bare-metal cleaning every time with photographic proof. Their IKECA Master Certification gives us full confidence in NFPA 96 compliance.', serviceType: 'Hood Cleaning', date: '2026-01-20', vendorResponse: 'Thank you Richard! We\'re proud to partner with Aramark across your Yosemite properties. Safety is always job one.' },
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
  { id: 'vl-1', operatorName: 'James Wilson', operatorOrg: 'Pacific Coast Dining', serviceType: 'Hood Cleaning', locationDetails: '1247 Fulton St, Fresno', urgency: 'high', status: 'new', receivedAt: '2026-02-10T08:30:00', description: 'Hood system cleaning for 3 stations. Last cleaned 7 months ago. Need NFPA 96 compliance cert for upcoming inspection.' },
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
  operational: number;
  equipment: number;
  documentation: number;
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
  complianceScore: 90, locationCount: 1847, operational: 92, equipment: 88, documentation: 89,
  children: [
    {
      id: 'h-higher-ed', tenantId: 'ent-aramark', parentId: 'h-corp', level: 'division', name: 'Higher Education', code: 'ARMK-HE',
      complianceScore: 91, locationCount: 847, operational: 93, equipment: 89, documentation: 90,
      children: [
        {
          id: 'h-he-west', tenantId: 'ent-aramark', parentId: 'h-higher-ed', level: 'region', name: 'Western Region', code: 'ARMK-HE-W',
          complianceScore: 90, locationCount: 254, operational: 92, equipment: 88, documentation: 89,
          children: [
            { id: 'h-he-w-pac', tenantId: 'ent-aramark', parentId: 'h-he-west', level: 'district', name: 'Pacific Northwest', code: 'ARMK-HE-W-PNW', complianceScore: 91, locationCount: 86, operational: 93, equipment: 89, documentation: 90 },
            { id: 'h-he-w-cal', tenantId: 'ent-aramark', parentId: 'h-he-west', level: 'district', name: 'California', code: 'ARMK-HE-W-CA', complianceScore: 89, locationCount: 102, operational: 91, equipment: 87, documentation: 88 },
            { id: 'h-he-w-sw', tenantId: 'ent-aramark', parentId: 'h-he-west', level: 'district', name: 'Southwest', code: 'ARMK-HE-W-SW', complianceScore: 90, locationCount: 66, operational: 92, equipment: 88, documentation: 89 },
          ],
        },
        {
          id: 'h-he-central', tenantId: 'ent-aramark', parentId: 'h-higher-ed', level: 'region', name: 'Central Region', code: 'ARMK-HE-C',
          complianceScore: 92, locationCount: 298, operational: 94, equipment: 90, documentation: 91,
        },
        {
          id: 'h-he-east', tenantId: 'ent-aramark', parentId: 'h-higher-ed', level: 'region', name: 'Eastern Region', code: 'ARMK-HE-E',
          complianceScore: 91, locationCount: 295, operational: 93, equipment: 89, documentation: 90,
          children: [
            { id: 'h-he-e-ne', tenantId: 'ent-aramark', parentId: 'h-he-east', level: 'district', name: 'New England', code: 'ARMK-HE-E-NE', complianceScore: 93, locationCount: 98, operational: 95, equipment: 91, documentation: 92 },
            { id: 'h-he-e-ma', tenantId: 'ent-aramark', parentId: 'h-he-east', level: 'district', name: 'Mid-Atlantic', code: 'ARMK-HE-E-MA', complianceScore: 90, locationCount: 112, operational: 92, equipment: 88, documentation: 89,
              children: [
                { id: 'h-he-e-ma-temple', tenantId: 'ent-aramark', parentId: 'h-he-e-ma', level: 'location', name: 'Temple University', code: 'ARMK-TU-001', complianceScore: 68, locationCount: 1, operational: 72, equipment: 64, documentation: 66 },
              ],
            },
            { id: 'h-he-e-se', tenantId: 'ent-aramark', parentId: 'h-he-east', level: 'district', name: 'Southeast', code: 'ARMK-HE-E-SE', complianceScore: 91, locationCount: 85, operational: 93, equipment: 89, documentation: 90 },
          ],
        },
      ],
    },
    {
      id: 'h-healthcare', tenantId: 'ent-aramark', parentId: 'h-corp', level: 'division', name: 'Healthcare', code: 'ARMK-HC',
      complianceScore: 95, locationCount: 312, operational: 96, equipment: 93, documentation: 94,
      children: [
        { id: 'h-hc-west', tenantId: 'ent-aramark', parentId: 'h-healthcare', level: 'region', name: 'Western Region', code: 'ARMK-HC-W', complianceScore: 94, locationCount: 94, operational: 95, equipment: 92, documentation: 93 },
        { id: 'h-hc-central', tenantId: 'ent-aramark', parentId: 'h-healthcare', level: 'region', name: 'Central Region', code: 'ARMK-HC-C', complianceScore: 95, locationCount: 112, operational: 97, equipment: 93, documentation: 94 },
        { id: 'h-hc-east', tenantId: 'ent-aramark', parentId: 'h-healthcare', level: 'region', name: 'Eastern Region', code: 'ARMK-HC-E', complianceScore: 95, locationCount: 106, operational: 96, equipment: 94, documentation: 95 },
      ],
    },
    {
      id: 'h-destinations', tenantId: 'ent-aramark', parentId: 'h-corp', level: 'division', name: 'Destinations', code: 'ARMK-DEST',
      complianceScore: 88, locationCount: 89, operational: 90, equipment: 86, documentation: 87,
      children: [
        {
          id: 'h-dest-parks', tenantId: 'ent-aramark', parentId: 'h-destinations', level: 'region', name: 'National Parks', code: 'ARMK-DEST-NP',
          complianceScore: 89, locationCount: 32, operational: 91, equipment: 87, documentation: 88,
          children: [
            {
              id: 'h-dest-np-yosemite', tenantId: 'ent-aramark', parentId: 'h-dest-parks', level: 'district', name: 'Yosemite District', code: 'ARMK-DEST-YOS',
              complianceScore: 89, locationCount: 7, operational: 91, equipment: 87, documentation: 88,
              children: [
                { id: 'h-yos-lodge', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'Yosemite Valley Lodge', code: 'YOS-001', complianceScore: 92, locationCount: 1, operational: 94, equipment: 90, documentation: 91 },
                { id: 'h-yos-ahwahnee', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'The Ahwahnee Dining Room', code: 'YOS-002', complianceScore: 94, locationCount: 1, operational: 96, equipment: 92, documentation: 93 },
                { id: 'h-yos-curry', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'Half Dome Village Pavilion', code: 'YOS-003', complianceScore: 87, locationCount: 1, operational: 89, equipment: 85, documentation: 86 },
                { id: 'h-yos-tuolumne', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'Tuolumne Meadows Grill', code: 'YOS-004', complianceScore: 83, locationCount: 1, operational: 85, equipment: 81, documentation: 82 },
                { id: 'h-yos-glacier', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'Glacier Point Snack Stand', code: 'YOS-005', complianceScore: 86, locationCount: 1, operational: 88, equipment: 84, documentation: 85 },
                { id: 'h-yos-village', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'Village Grill & Pizza Deck', code: 'YOS-006', complianceScore: 90, locationCount: 1, operational: 92, equipment: 88, documentation: 89 },
                { id: 'h-yos-white-wolf', tenantId: 'ent-aramark', parentId: 'h-dest-np-yosemite', level: 'location', name: 'White Wolf Lodge Dining', code: 'YOS-007', complianceScore: 88, locationCount: 1, operational: 90, equipment: 86, documentation: 87 },
              ],
            },
            { id: 'h-dest-np-glacier', tenantId: 'ent-aramark', parentId: 'h-dest-parks', level: 'district', name: 'Glacier National Park', code: 'ARMK-DEST-GNP', complianceScore: 88, locationCount: 8, operational: 90, equipment: 86, documentation: 87 },
            { id: 'h-dest-np-grandcanyon', tenantId: 'ent-aramark', parentId: 'h-dest-parks', level: 'district', name: 'Grand Canyon District', code: 'ARMK-DEST-GC', complianceScore: 91, locationCount: 6, operational: 93, equipment: 89, documentation: 90 },
            { id: 'h-dest-np-other', tenantId: 'ent-aramark', parentId: 'h-dest-parks', level: 'district', name: 'Other National Parks', code: 'ARMK-DEST-ONP', complianceScore: 90, locationCount: 11, operational: 92, equipment: 88, documentation: 89 },
          ],
        },
        {
          id: 'h-dest-ski', tenantId: 'ent-aramark', parentId: 'h-destinations', level: 'region', name: 'Ski Resorts', code: 'ARMK-DEST-SKI',
          complianceScore: 87, locationCount: 28, operational: 89, equipment: 85, documentation: 86,
          children: [
            { id: 'h-dest-ski-badger', tenantId: 'ent-aramark', parentId: 'h-dest-ski', level: 'location', name: 'Badger Pass Ski Area', code: 'ARMK-DEST-BP', complianceScore: 74, locationCount: 1, operational: 78, equipment: 70, documentation: 72 },
            { id: 'h-dest-ski-mammoth', tenantId: 'ent-aramark', parentId: 'h-dest-ski', level: 'location', name: 'Mammoth Mountain Lodge', code: 'ARMK-DEST-MM', complianceScore: 88, locationCount: 1, operational: 90, equipment: 86, documentation: 87 },
          ],
        },
        {
          id: 'h-dest-conv', tenantId: 'ent-aramark', parentId: 'h-destinations', level: 'region', name: 'Convention Centers', code: 'ARMK-DEST-CC',
          complianceScore: 89, locationCount: 29, operational: 91, equipment: 87, documentation: 88,
        },
      ],
    },
    {
      id: 'h-corrections', tenantId: 'ent-aramark', parentId: 'h-corp', level: 'division', name: 'Corrections', code: 'ARMK-CR',
      complianceScore: 86, locationCount: 156, operational: 88, equipment: 84, documentation: 85,
      children: [
        { id: 'h-cr-federal', tenantId: 'ent-aramark', parentId: 'h-corrections', level: 'region', name: 'Federal Facilities', code: 'ARMK-CR-FED', complianceScore: 87, locationCount: 42, operational: 89, equipment: 85, documentation: 86 },
        { id: 'h-cr-state', tenantId: 'ent-aramark', parentId: 'h-corrections', level: 'region', name: 'State Facilities', code: 'ARMK-CR-ST', complianceScore: 85, locationCount: 78, operational: 87, equipment: 83, documentation: 84 },
        { id: 'h-cr-county', tenantId: 'ent-aramark', parentId: 'h-corrections', level: 'region', name: 'County Facilities', code: 'ARMK-CR-CTY', complianceScore: 86, locationCount: 36, operational: 88, equipment: 84, documentation: 85 },
      ],
    },
    {
      id: 'h-sports', tenantId: 'ent-aramark', parentId: 'h-corp', level: 'division', name: 'Sports & Entertainment', code: 'ARMK-SE',
      complianceScore: 88, locationCount: 443, operational: 90, equipment: 86, documentation: 87,
      children: [
        {
          id: 'h-se-west', tenantId: 'ent-aramark', parentId: 'h-sports', level: 'region', name: 'Western Region', code: 'ARMK-SE-W',
          complianceScore: 87, locationCount: 133, operational: 89, equipment: 85, documentation: 86,
          children: [
            { id: 'h-se-w-bay', tenantId: 'ent-aramark', parentId: 'h-se-west', level: 'district', name: 'Bay Area District', code: 'ARMK-SE-W-BAY', complianceScore: 86, locationCount: 42, operational: 88, equipment: 84, documentation: 85 },
            { id: 'h-se-w-socal', tenantId: 'ent-aramark', parentId: 'h-se-west', level: 'district', name: 'SoCal District', code: 'ARMK-SE-W-SC', complianceScore: 85, locationCount: 48, operational: 87, equipment: 83, documentation: 84 },
            { id: 'h-se-w-pnw', tenantId: 'ent-aramark', parentId: 'h-se-west', level: 'district', name: 'Pacific Northwest', code: 'ARMK-SE-W-PNW', complianceScore: 89, locationCount: 43, operational: 91, equipment: 87, documentation: 88 },
          ],
        },
        { id: 'h-se-central', tenantId: 'ent-aramark', parentId: 'h-sports', level: 'region', name: 'Central Region', code: 'ARMK-SE-C', complianceScore: 88, locationCount: 155, operational: 90, equipment: 86, documentation: 87 },
        { id: 'h-se-east', tenantId: 'ent-aramark', parentId: 'h-sports', level: 'region', name: 'Eastern Region', code: 'ARMK-SE-E', complianceScore: 88, locationCount: 155, operational: 90, equipment: 86, documentation: 87 },
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
  operational: number;
  equipment: number;
  documentation: number;
}

export const enterpriseTrendData: EnterpriseTrendPoint[] = [
  { month: 'Mar 25', overall: 82.1, operational: 84.0, equipment: 80.2, documentation: 81.5 },
  { month: 'Apr 25', overall: 83.4, operational: 85.1, equipment: 81.0, documentation: 83.2 },
  { month: 'May 25', overall: 83.8, operational: 85.6, equipment: 81.5, documentation: 83.8 },
  { month: 'Jun 25', overall: 84.5, operational: 86.2, equipment: 82.1, documentation: 84.4 },
  { month: 'Jul 25', overall: 83.9, operational: 85.8, equipment: 81.8, documentation: 83.5 },
  { month: 'Aug 25', overall: 84.8, operational: 86.5, equipment: 82.6, documentation: 84.8 },
  { month: 'Sep 25', overall: 85.6, operational: 87.2, equipment: 83.4, documentation: 85.6 },
  { month: 'Oct 25', overall: 86.2, operational: 87.8, equipment: 84.1, documentation: 86.1 },
  { month: 'Nov 25', overall: 86.8, operational: 88.2, equipment: 84.8, documentation: 86.9 },
  { month: 'Dec 25', overall: 85.9, operational: 87.5, equipment: 84.0, documentation: 85.8 },
  { month: 'Jan 26', overall: 87.1, operational: 88.8, equipment: 85.2, documentation: 86.8 },
  { month: 'Feb 26', overall: 90.0, operational: 92.0, equipment: 88.0, documentation: 89.0 },
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
