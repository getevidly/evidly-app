// Industry-specific pillar weights — Operational is always 45%, Equipment & Documentation vary
export const INDUSTRY_WEIGHTS: Record<string, { operational: number; equipment: number; documentation: number }> = {
  RESTAURANT:       { operational: 0.45, equipment: 0.30, documentation: 0.25 },
  HEALTHCARE:       { operational: 0.45, equipment: 0.25, documentation: 0.30 },
  SENIOR_LIVING:    { operational: 0.45, equipment: 0.25, documentation: 0.30 },
  K12_EDUCATION:    { operational: 0.45, equipment: 0.20, documentation: 0.35 },
  HIGHER_EDUCATION: { operational: 0.45, equipment: 0.30, documentation: 0.25 },
};

// Default weights (Restaurant) — used for demo and when industry not set
export const PILLAR_WEIGHTS = INDUSTRY_WEIGHTS.RESTAURANT;

// Current org industry — in production, this comes from organization.industry_type
// For demo, defaults to RESTAURANT
let currentIndustry = 'RESTAURANT';
export function setIndustry(industry: string) {
  currentIndustry = industry;
}
export function getWeights() {
  return INDUSTRY_WEIGHTS[currentIndustry] || PILLAR_WEIGHTS;
}

export function computeOverall(scores: { operational: number; equipment: number; documentation: number }, weights?: { operational: number; equipment: number; documentation: number }): number {
  const w = weights || getWeights();
  return Math.round(scores.operational * w.operational + scores.equipment * w.equipment + scores.documentation * w.documentation);
}

export const locationScores: Record<string, { overall: number; operational: number; equipment: number; documentation: number }> = {
  'downtown': { operational: 95, equipment: 91, documentation: 89, get overall() { return computeOverall(this); } },
  'airport': { operational: 78, equipment: 70, documentation: 72, get overall() { return computeOverall(this); } },
  'university': { operational: 62, equipment: 55, documentation: 52, get overall() { return computeOverall(this); } },
};

export const locationScoresThirtyDaysAgo: Record<string, { overall: number; operational: number; equipment: number; documentation: number }> = {
  'downtown': { operational: 90, equipment: 88, documentation: 82, get overall() { return computeOverall(this); } },
  'airport': { operational: 75, equipment: 76, documentation: 72, get overall() { return computeOverall(this); } },
  'university': { operational: 55, equipment: 58, documentation: 48, get overall() { return computeOverall(this); } },
};

// Company-level scores = average of all location scores
function computeCompanyScores(locScores: Record<string, { overall: number; operational: number; equipment: number; documentation: number }>) {
  const locs = Object.values(locScores);
  const count = locs.length;
  if (count === 0) return { overall: 0, operational: 0, equipment: 0, documentation: 0 };
  const avg = {
    operational: Math.round(locs.reduce((s, l) => s + l.operational, 0) / count),
    equipment: Math.round(locs.reduce((s, l) => s + l.equipment, 0) / count),
    documentation: Math.round(locs.reduce((s, l) => s + l.documentation, 0) / count),
    get overall() { return Math.round(locs.reduce((s, l) => s + l.overall, 0) / count); },
  };
  return avg;
}

export const complianceScores = computeCompanyScores(locationScores);
export const complianceScoresThirtyDaysAgo = computeCompanyScores(locationScoresThirtyDaysAgo);

export const getGrade = (score: number) => {
  if (score >= 90) return { label: 'Inspection Ready', color: 'green', hex: '#22c55e' };
  if (score >= 80) return { label: 'Good Standing', color: 'green', hex: '#22c55e' };
  if (score >= 60) return { label: 'Needs Attention', color: 'amber', hex: '#d4af37' };
  return { label: 'Critical', color: 'red', hex: '#dc2626' };
};

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
  grade: string;
  status: string;
  actionItems: number;
}

export const locations: Location[] = [
  { id: '1', urlId: 'downtown', name: 'Downtown Kitchen', lat: 37.7749, lng: -122.4194, score: locationScores['downtown'].overall, grade: getGrade(locationScores['downtown'].overall).label, status: getGrade(locationScores['downtown'].overall).label, actionItems: 2 },
  { id: '2', urlId: 'airport', name: 'Airport Cafe', lat: 37.6213, lng: -122.379, score: locationScores['airport'].overall, grade: getGrade(locationScores['airport'].overall).label, status: getGrade(locationScores['airport'].overall).label, actionItems: 5 },
  { id: '3', urlId: 'university', name: 'University Dining', lat: 37.8719, lng: -122.2585, score: locationScores['university'].overall, grade: getGrade(locationScores['university'].overall).label, status: getGrade(locationScores['university'].overall).label, actionItems: 12 },
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
    nextDue: '2026-06-10',
    documentsCount: 4,
    status: 'current',
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
  // Airport Cafe - mixed status
  {
    id: '6',
    companyName: 'ABC Fire Protection',
    contactName: 'John Smith',
    email: 'john@abcfire.com',
    phone: '(555) 123-4567',
    serviceType: 'Hood Cleaning',
    lastService: '2026-01-15',
    nextDue: '2026-04-15',
    documentsCount: 3,
    status: 'current',
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
    status: 'overdue',
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
  { id: '1', title: 'Fire Suppression Report Expired', time: '2h ago', link: '/documents', type: 'alert', locationId: '2' },
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
  { id: '2', title: 'Health Permit Renewal in 60 Days', detail: 'Downtown Kitchen — expires Apr 6', color: 'amber', url: '/documents', roles: ['management', 'facilities'], locationId: '1' },
  // Airport Cafe - 7 items
  { id: '3', title: '3 Temperature Checks Missed', detail: 'Airport Cafe — missed this week', color: 'red', url: '/temp-logs', roles: ['management', 'kitchen'], locationId: '2' },
  { id: '4', title: 'Opening Checklist Late 2 Days This Week', detail: 'Airport Cafe — Feb 4, Feb 5', color: 'red', url: '/checklists', roles: ['management', 'kitchen'], locationId: '2' },
  { id: '5', title: 'Fire Suppression Inspection Overdue', detail: 'Valley Fire — due Feb 10', color: 'red', url: '/vendors', roles: ['management', 'facilities'], locationId: '2' },
  { id: '6', title: 'Grease Trap Service Due Soon', detail: 'Grease Masters — due Mar 20', color: 'amber', url: '/vendors', roles: ['management', 'facilities'], locationId: '2' },
  { id: '7', title: 'Valley Fire COI Expired', detail: 'Airport Cafe — expired Jan 15', color: 'red', url: '/documents', roles: ['management', 'facilities'], locationId: '2' },
  { id: '8', title: 'Food Handler Cert Expiring', detail: 'Airport Cafe — expires in 14 days', color: 'amber', url: '/team', roles: ['management', 'kitchen'], locationId: '2' },
  { id: '9', title: 'Pest Control Report Missing', detail: 'Airport Cafe — last visit Feb 1', color: 'amber', url: '/documents', roles: ['management', 'facilities'], locationId: '2' },
  // University Dining - 12 items
  { id: '10', title: '8 Temperature Checks Missed', detail: 'University Dining — missed this week', color: 'red', url: '/temp-logs', roles: ['management', 'kitchen'], locationId: '3' },
  { id: '11', title: 'Opening Checklists Missed 3 Days', detail: 'University Dining — Feb 3, 4, 5', color: 'red', url: '/checklists', roles: ['management', 'kitchen'], locationId: '3' },
  { id: '12', title: 'HACCP Monitoring Overdue', detail: 'University Dining — no logs this month', color: 'red', url: '/haccp', roles: ['management', 'kitchen'], locationId: '3' },
  { id: '13', title: 'Fire Suppression 4 Months Overdue', detail: 'Valley Fire — due Jan 10', color: 'red', url: '/vendors', roles: ['management', 'facilities'], locationId: '3' },
  { id: '14', title: 'Grease Trap 2 Months Overdue', detail: 'Grease Masters — due Jan 20', color: 'red', url: '/vendors', roles: ['management', 'facilities'], locationId: '3' },
  { id: '15', title: 'Hood Cleaning Due in 5 Days', detail: 'ABC Fire — due Feb 15', color: 'amber', url: '/vendors', roles: ['management', 'facilities'], locationId: '3' },
  { id: '16', title: 'Health Permit EXPIRED', detail: 'University Dining — expired Jan 6', color: 'red', url: '/documents', roles: ['management', 'facilities'], locationId: '3' },
  { id: '17', title: '3 Vendor COIs Expired', detail: 'University Dining — action required', color: 'red', url: '/documents', roles: ['management', 'facilities'], locationId: '3' },
  { id: '18', title: '2 Food Handler Certs Expired', detail: 'University Dining — action required', color: 'red', url: '/team', roles: ['management', 'kitchen'], locationId: '3' },
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

export const scoreImpactData: ScoreImpactItem[] = [
  // Downtown Kitchen - Operational (95 out of 100)
  { status: 'current', label: 'Temperature Logs On Schedule', impact: '+35 of 35', action: null, actionLink: null, pillar: 'Operational', locationId: '1' },
  { status: 'current', label: 'Opening Checklists Complete', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Operational', locationId: '1' },
  { status: 'current', label: 'Closing Checklists Complete', impact: '+15 of 20', action: 'View Late Submission', actionLink: '/checklists', pillar: 'Operational', locationId: '1' },
  { status: 'current', label: 'HACCP Monitoring Current', impact: '+15 of 15', action: null, actionLink: null, pillar: 'Operational', locationId: '1' },
  { status: 'current', label: 'Corrective Actions Resolved', impact: '+10 of 10', action: null, actionLink: null, pillar: 'Operational', locationId: '1' },

  // Downtown Kitchen - Equipment (91 out of 100)
  { status: 'current', label: 'Hood Cleaning Certificate', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Equipment', locationId: '1' },
  { status: 'current', label: 'Fire Suppression Inspection', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Equipment', locationId: '1' },
  { status: 'due_soon', label: 'Fire Extinguisher Inspection (45 days)', impact: '+11 of 20', action: 'Schedule Inspection', actionLink: '/vendors', pillar: 'Equipment', locationId: '1' },
  { status: 'current', label: 'Grease Trap Service', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Equipment', locationId: '1' },
  { status: 'current', label: 'HVAC Service', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Equipment', locationId: '1' },

  // Downtown Kitchen - Documentation (89 out of 100)
  { status: 'current', label: 'Health Permit', impact: '+15 of 20', action: 'Renewal in 60 Days', actionLink: '/documents', pillar: 'Documentation', locationId: '1' },
  { status: 'current', label: 'Business License', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Documentation', locationId: '1' },
  { status: 'current', label: 'Vendor COIs (All Current)', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Documentation', locationId: '1' },
  { status: 'due_soon', label: 'Food Handler Cert (1 staff, 30 days)', impact: '+14 of 20', action: 'View Team Certs', actionLink: '/team', pillar: 'Documentation', locationId: '1' },
  { status: 'current', label: 'Insurance Certificate', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Documentation', locationId: '1' },

  // Airport Cafe - Operational (78 out of 100)
  { status: 'overdue', label: '3 Temperature Checks Missed This Week', impact: '-12', action: 'Log Now', actionLink: '/temp-logs', pillar: 'Operational', locationId: '2' },
  { status: 'current', label: 'Temperature Logs', impact: '+23 of 35', action: '3 Checks Missed', actionLink: '/temp-logs', pillar: 'Operational', locationId: '2' },
  { status: 'current', label: 'Opening Checklists', impact: '+14 of 20', action: 'Late 2 Days This Week', actionLink: '/checklists', pillar: 'Operational', locationId: '2' },
  { status: 'current', label: 'Closing Checklists Complete', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Operational', locationId: '2' },
  { status: 'current', label: 'HACCP Monitoring', impact: '+12 of 15', action: null, actionLink: null, pillar: 'Operational', locationId: '2' },
  { status: 'current', label: 'Corrective Actions', impact: '+9 of 10', action: null, actionLink: null, pillar: 'Operational', locationId: '2' },

  // Airport Cafe - Equipment (70 out of 100)
  { status: 'current', label: 'Hood Cleaning Certificate', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Equipment', locationId: '2' },
  { status: 'overdue', label: 'Fire Suppression Inspection OVERDUE', impact: '0 of 20', action: 'Contact Valley Fire', actionLink: '/vendors', pillar: 'Equipment', locationId: '2' },
  { status: 'current', label: 'Fire Extinguisher', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Equipment', locationId: '2' },
  { status: 'due_soon', label: 'Grease Trap Service (approaching overdue)', impact: '+10 of 20', action: 'Schedule Service', actionLink: '/vendors', pillar: 'Equipment', locationId: '2' },
  { status: 'current', label: 'HVAC Service', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Equipment', locationId: '2' },

  // Airport Cafe - Documentation (72 out of 100)
  { status: 'current', label: 'Health Permit', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Documentation', locationId: '2' },
  { status: 'current', label: 'Business License', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Documentation', locationId: '2' },
  { status: 'expired', label: 'Valley Fire COI EXPIRED', impact: '0 of 20', action: 'Request Updated COI', actionLink: '/vendors', pillar: 'Documentation', locationId: '2' },
  { status: 'due_soon', label: 'Food Handler Cert (1 staff, 14 days)', impact: '+12 of 20', action: 'View Team Certs', actionLink: '/team', pillar: 'Documentation', locationId: '2' },
  { status: 'missing', label: 'Pest Control Report Missing', impact: '0 of 20', action: 'Request from Vendor', actionLink: '/vendors', pillar: 'Documentation', locationId: '2' },

  // University Dining - Operational (62 out of 100)
  { status: 'overdue', label: '8 Temperature Checks Missed This Week', impact: '0 of 35', action: 'Log Now', actionLink: '/temp-logs', pillar: 'Operational', locationId: '3' },
  { status: 'overdue', label: 'Opening Checklists Missed 3 Days', impact: '6 of 20', action: 'Complete Now', actionLink: '/checklists', pillar: 'Operational', locationId: '3' },
  { status: 'current', label: 'Closing Checklists', impact: '+16 of 20', action: null, actionLink: null, pillar: 'Operational', locationId: '3' },
  { status: 'overdue', label: 'HACCP Monitoring Not Done This Month', impact: '0 of 15', action: 'Start HACCP Review', actionLink: '/haccp', pillar: 'Operational', locationId: '3' },
  { status: 'current', label: 'Corrective Actions', impact: '+10 of 10', action: null, actionLink: null, pillar: 'Operational', locationId: '3' },

  // University Dining - Equipment (55 out of 100)
  { status: 'due_soon', label: 'Hood Cleaning Due in 5 Days', impact: '+10 of 20', action: 'Confirm Scheduled', actionLink: '/vendors', pillar: 'Equipment', locationId: '3' },
  { status: 'overdue', label: 'Fire Suppression 4 MONTHS OVERDUE', impact: '0 of 20', action: 'URGENT: Schedule Now', actionLink: '/vendors', pillar: 'Equipment', locationId: '3' },
  { status: 'current', label: 'Fire Extinguisher', impact: '+15 of 20', action: null, actionLink: null, pillar: 'Equipment', locationId: '3' },
  { status: 'overdue', label: 'Grease Trap 2 MONTHS OVERDUE', impact: '0 of 20', action: 'Schedule Service', actionLink: '/vendors', pillar: 'Equipment', locationId: '3' },
  { status: 'current', label: 'HVAC Service', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Equipment', locationId: '3' },

  // University Dining - Documentation (52 out of 100)
  { status: 'expired', label: 'Health Permit EXPIRED Last Month', impact: '0 of 20', action: 'URGENT: Renew Now', actionLink: '/documents', pillar: 'Documentation', locationId: '3' },
  { status: 'current', label: 'Business License', impact: '+20 of 20', action: null, actionLink: null, pillar: 'Documentation', locationId: '3' },
  { status: 'expired', label: '3 Vendor COIs EXPIRED', impact: '0 of 20', action: 'Request All COIs', actionLink: '/vendors', pillar: 'Documentation', locationId: '3' },
  { status: 'expired', label: '2 Food Handler Certs EXPIRED', impact: '0 of 20', action: 'Notify Staff', actionLink: '/team', pillar: 'Documentation', locationId: '3' },
  { status: 'current', label: 'Insurance Certificate', impact: '+12 of 20', action: null, actionLink: null, pillar: 'Documentation', locationId: '3' },
];
