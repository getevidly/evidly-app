// ── Reports Demo Data — Consolidation layer for all 12 report types ─────
// Imports from existing demo sources; new inline data where needed.

import {
  locations, locationScores, locationScoresThirtyDaysAgo, vendors,
  demoReferral, DEMO_ORG_SCORES,
} from './demoData';
import { DEMO_SERVICE_RECORDS } from './demoServiceRecords';
import { TRAINING_EMPLOYEES, getTrainingStatus, getNextExpiration } from './trainingRecordsDemoData';
import { getScoreStatus, getScoreColor } from '../lib/complianceScoring';

// ── Shared types ───────────────────────────────────────────────────────
export interface LocationScore {
  location: string;
  urlId: string;
  foodSafety: number;
  facilitySafety: number;
  foodStatus: string;
  facilityStatus: string;
}

// ── Score trend data (from old Reports.tsx) ─────────────────────────────
const SCORE_TRENDS: Record<string, { week: string; foodSafety: number; facilitySafety: number }[]> = {
  downtown: [
    { week: 'Wk 1', foodSafety: 86, facilitySafety: 82 }, { week: 'Wk 2', foodSafety: 87, facilitySafety: 83 },
    { week: 'Wk 3', foodSafety: 87, facilitySafety: 83 }, { week: 'Wk 4', foodSafety: 88, facilitySafety: 85 },
    { week: 'Wk 5', foodSafety: 89, facilitySafety: 86 }, { week: 'Wk 6', foodSafety: 90, facilitySafety: 87 },
    { week: 'Wk 7', foodSafety: 89, facilitySafety: 86 }, { week: 'Wk 8', foodSafety: 91, facilitySafety: 88 },
    { week: 'Wk 9', foodSafety: 90, facilitySafety: 87 }, { week: 'Wk 10', foodSafety: 92, facilitySafety: 89 },
    { week: 'Wk 11', foodSafety: 91, facilitySafety: 88 }, { week: 'Wk 12', foodSafety: 92, facilitySafety: 89 },
  ],
  airport: [
    { week: 'Wk 1', foodSafety: 66, facilitySafety: 58 }, { week: 'Wk 2', foodSafety: 67, facilitySafety: 59 },
    { week: 'Wk 3', foodSafety: 67, facilitySafety: 60 }, { week: 'Wk 4', foodSafety: 68, facilitySafety: 61 },
    { week: 'Wk 5', foodSafety: 68, facilitySafety: 60 }, { week: 'Wk 6', foodSafety: 69, facilitySafety: 62 },
    { week: 'Wk 7', foodSafety: 70, facilitySafety: 63 }, { week: 'Wk 8', foodSafety: 69, facilitySafety: 62 },
    { week: 'Wk 9', foodSafety: 70, facilitySafety: 64 }, { week: 'Wk 10', foodSafety: 72, facilitySafety: 65 },
    { week: 'Wk 11', foodSafety: 71, facilitySafety: 64 }, { week: 'Wk 12', foodSafety: 72, facilitySafety: 65 },
  ],
  university: [
    { week: 'Wk 1', foodSafety: 44, facilitySafety: 38 }, { week: 'Wk 2', foodSafety: 46, facilitySafety: 40 },
    { week: 'Wk 3', foodSafety: 47, facilitySafety: 42 }, { week: 'Wk 4', foodSafety: 49, facilitySafety: 44 },
    { week: 'Wk 5', foodSafety: 48, facilitySafety: 43 }, { week: 'Wk 6', foodSafety: 50, facilitySafety: 45 },
    { week: 'Wk 7', foodSafety: 52, facilitySafety: 47 }, { week: 'Wk 8', foodSafety: 51, facilitySafety: 46 },
    { week: 'Wk 9', foodSafety: 53, facilitySafety: 48 }, { week: 'Wk 10', foodSafety: 55, facilitySafety: 50 },
    { week: 'Wk 11', foodSafety: 55, facilitySafety: 49 }, { week: 'Wk 12', foodSafety: 58, facilitySafety: 52 },
  ],
};

const TOP_ISSUES = [
  { issue: 'Food handler certifications expiring', priority: 'HIGH', affected: '3 locations' },
  { issue: 'Missing temperature logs on weekends', priority: 'MEDIUM', affected: '2 locations' },
  { issue: 'Fire suppression inspection due', priority: 'HIGH', affected: '1 location' },
  { issue: 'Incomplete closing checklists', priority: 'MEDIUM', affected: '2 locations' },
  { issue: 'Vendor COI documents expiring', priority: 'LOW', affected: '2 vendors' },
];

const TOP_POSITIVES = [
  { item: 'Daily opening checklists 100% at Downtown', category: 'Checklists' },
  { item: 'Temperature logging compliance improving weekly', category: 'Temp Logs' },
  { item: 'All hood cleaning certificates current', category: 'Facility Safety' },
  { item: 'Zero health department violations this quarter', category: 'Food Safety' },
  { item: 'Staff training completion up 15% month-over-month', category: 'Training' },
];

// ── 1. Executive Summary ───────────────────────────────────────────────
export function getExecutiveSummaryData(location: string) {
  const locScores: LocationScore[] = locations.map(loc => {
    const scores = locationScores[loc.urlId];
    return {
      location: loc.name, urlId: loc.urlId,
      foodSafety: scores?.foodSafety || 0, facilitySafety: scores?.facilitySafety || 0,
      foodStatus: getScoreStatus(scores?.foodSafety || 0),
      facilityStatus: getScoreStatus(scores?.facilitySafety || 0),
    };
  });
  const trendByLoc = { ...SCORE_TRENDS } as Record<string, typeof SCORE_TRENDS['downtown']>;
  trendByLoc['all'] = SCORE_TRENDS.downtown.map((item, i) => ({
    week: item.week,
    foodSafety: Math.round((item.foodSafety + SCORE_TRENDS.airport[i].foodSafety + SCORE_TRENDS.university[i].foodSafety) / 3),
    facilitySafety: Math.round((item.facilitySafety + SCORE_TRENDS.airport[i].facilitySafety + SCORE_TRENDS.university[i].facilitySafety) / 3),
  }));
  return {
    orgScores: DEMO_ORG_SCORES,
    locationScores: locScores,
    prevScores: locationScoresThirtyDaysAgo,
    trendData: trendByLoc[location] || trendByLoc['all'],
    topIssues: TOP_ISSUES,
    topPositives: TOP_POSITIVES,
  };
}

// ── Checklist completion data ──────────────────────────────────────────
const CHECKLIST_COMPLETION: Record<string, { template: string; rate: number; completed: number; missed: number }[]> = {
  downtown: [
    { template: 'Opening Checklist', rate: 100, completed: 10, missed: 0 },
    { template: 'Closing Checklist', rate: 95, completed: 9, missed: 1 },
    { template: 'Daily Cleaning', rate: 100, completed: 10, missed: 0 },
    { template: 'Equipment Check', rate: 90, completed: 9, missed: 1 },
    { template: 'Weekly Deep Clean', rate: 100, completed: 1, missed: 0 },
  ],
  airport: [
    { template: 'Opening Checklist', rate: 90, completed: 9, missed: 1 },
    { template: 'Closing Checklist', rate: 80, completed: 8, missed: 2 },
    { template: 'Daily Cleaning', rate: 85, completed: 8, missed: 2 },
    { template: 'Equipment Check', rate: 80, completed: 8, missed: 2 },
    { template: 'Weekly Deep Clean', rate: 75, completed: 1, missed: 0 },
  ],
  university: [
    { template: 'Opening Checklist', rate: 80, completed: 8, missed: 2 },
    { template: 'Closing Checklist', rate: 70, completed: 7, missed: 3 },
    { template: 'Daily Cleaning', rate: 75, completed: 7, missed: 3 },
    { template: 'Equipment Check', rate: 65, completed: 6, missed: 4 },
    { template: 'Weekly Deep Clean', rate: 50, completed: 1, missed: 1 },
  ],
};

// ── Temperature compliance data ────────────────────────────────────────
const TEMP_COMPLIANCE: Record<string, { week: string; compliance: number }[]> = {
  downtown: [
    { week: 'Wk 1', compliance: 94 }, { week: 'Wk 2', compliance: 96 }, { week: 'Wk 3', compliance: 95 },
    { week: 'Wk 4', compliance: 97 }, { week: 'Wk 5', compliance: 98 }, { week: 'Wk 6', compliance: 97 },
    { week: 'Wk 7', compliance: 99 }, { week: 'Wk 8', compliance: 98 }, { week: 'Wk 9', compliance: 100 },
    { week: 'Wk 10', compliance: 97 }, { week: 'Wk 11', compliance: 100 }, { week: 'Wk 12', compliance: 98 },
  ],
  airport: [
    { week: 'Wk 1', compliance: 82 }, { week: 'Wk 2', compliance: 84 }, { week: 'Wk 3', compliance: 83 },
    { week: 'Wk 4', compliance: 85 }, { week: 'Wk 5', compliance: 87 }, { week: 'Wk 6', compliance: 86 },
    { week: 'Wk 7', compliance: 88 }, { week: 'Wk 8', compliance: 87 }, { week: 'Wk 9', compliance: 89 },
    { week: 'Wk 10', compliance: 86 }, { week: 'Wk 11', compliance: 91 }, { week: 'Wk 12', compliance: 88 },
  ],
  university: [
    { week: 'Wk 1', compliance: 75 }, { week: 'Wk 2', compliance: 77 }, { week: 'Wk 3', compliance: 76 },
    { week: 'Wk 4', compliance: 78 }, { week: 'Wk 5', compliance: 80 }, { week: 'Wk 6', compliance: 79 },
    { week: 'Wk 7', compliance: 81 }, { week: 'Wk 8', compliance: 80 }, { week: 'Wk 9', compliance: 82 },
    { week: 'Wk 10', compliance: 79 }, { week: 'Wk 11', compliance: 84 }, { week: 'Wk 12', compliance: 81 },
  ],
};

const STAFF_CERTS = [
  { name: 'John Smith', location: 'Downtown Kitchen', locationId: '1', status: 'Current', expires: '2026-08-15', daysLeft: 190 },
  { name: 'Sarah Johnson', location: 'Airport Cafe', locationId: '2', status: 'Coming Due', expires: '2026-03-20', daysLeft: 20 },
  { name: 'Mike Davis', location: 'University Dining', locationId: '3', status: 'Coming Due', expires: '2026-03-10', daysLeft: 10 },
  { name: 'Emily Chen', location: 'Downtown Kitchen', locationId: '1', status: 'Needs Renewal', expires: '2026-01-30', daysLeft: -29 },
];

const OPEN_CORRECTIVE_ACTIONS = [
  { action: 'Replace walk-in cooler thermometer', status: 'Open', daysOpen: 2, location: 'Downtown Kitchen', locationId: '1' },
  { action: 'Retrain staff on temp log procedures', status: 'In Progress', daysOpen: 5, location: 'Airport Cafe', locationId: '2' },
  { action: 'Schedule fire suppression inspection', status: 'Resolved', daysOpen: 0, location: 'University Dining', locationId: '3' },
];

// ── 2. Inspection Readiness ────────────────────────────────────────────
export function getInspectionReadinessData(location: string) {
  const checklistByLoc = { ...CHECKLIST_COMPLETION } as Record<string, typeof CHECKLIST_COMPLETION['downtown']>;
  checklistByLoc['all'] = CHECKLIST_COMPLETION.downtown.map((item, i) => {
    const completed = item.completed + CHECKLIST_COMPLETION.airport[i].completed + CHECKLIST_COMPLETION.university[i].completed;
    const missed = item.missed + CHECKLIST_COMPLETION.airport[i].missed + CHECKLIST_COMPLETION.university[i].missed;
    const total = completed + missed;
    return { template: item.template, completed, missed, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });
  const tempByLoc = { ...TEMP_COMPLIANCE } as Record<string, typeof TEMP_COMPLIANCE['downtown']>;
  tempByLoc['all'] = TEMP_COMPLIANCE.downtown.map((item, i) => ({
    week: item.week,
    compliance: Math.round((item.compliance + TEMP_COMPLIANCE.airport[i].compliance + TEMP_COMPLIANCE.university[i].compliance) / 3),
  }));
  const locId = locations.find(l => l.urlId === location)?.id;
  const filteredCerts = location === 'all' ? STAFF_CERTS : STAFF_CERTS.filter(s => s.locationId === locId);
  const filteredCA = location === 'all' ? OPEN_CORRECTIVE_ACTIONS : OPEN_CORRECTIVE_ACTIONS.filter(a => a.locationId === locId);
  const locName = location === 'all' ? 'All Locations' : locations.find(l => l.urlId === location)?.name || 'Unknown';
  const checklists = checklistByLoc[location] || checklistByLoc['all'];
  const temps = tempByLoc[location] || tempByLoc['all'];
  const checklistAvg = Math.round(checklists.reduce((s, c) => s + c.rate, 0) / checklists.length);
  const tempAvg = Math.round(temps.reduce((s, c) => s + c.compliance, 0) / temps.length);
  const readiness = checklistAvg > 90 && tempAvg > 90 && filteredCerts.every(c => c.status === 'Current') ? 'Ready' : checklistAvg > 75 ? 'Mostly Ready' : 'Not Ready';
  return { locationName: locName, readinessGrade: readiness, checklists, tempCompliance: temps, staffCerts: filteredCerts, correctiveActions: filteredCA, checklistAvg, tempAvg };
}

// ── Vendor document compliance ─────────────────────────────────────────
const VENDOR_DOC_COMPLIANCE = [
  { vendor: 'A1 Fire Protection', coi: 'Current', certs: 'Current', insurance: 'Current', status: 'Current' },
  { vendor: 'Valley Fire Equipment', coi: 'Coming Due', certs: 'Current', insurance: 'Current', status: 'Coming Due' },
  { vendor: 'CoolTech HVAC', coi: 'Needs Renewal', certs: 'Current', insurance: 'Current', status: 'Needs Renewal' },
  { vendor: 'Pest Solutions', coi: 'Missing', certs: 'Current', insurance: 'Missing', status: 'Needs Renewal' },
];

const VENDOR_SPEND = [
  { category: 'Fire Protection', amount: 850, services: 3 },
  { category: 'HVAC/Hood', amount: 650, services: 2 },
  { category: 'Pest Control', amount: 400, services: 3 },
  { category: 'Grease Trap', amount: 300, services: 1 },
];

// ── 3. Vendor Service Summary ──────────────────────────────────────────
export function getVendorServiceData(location: string) {
  const locId = locations.find(l => l.urlId === location)?.id;
  const records = location === 'all' ? DEMO_SERVICE_RECORDS : DEMO_SERVICE_RECORDS.filter(r => r.locationId === locId);
  const vendorList = location === 'all' ? vendors : vendors.filter(v => v.locationId === locId);
  return {
    serviceRecords: records, vendors: vendorList, vendorDocCompliance: VENDOR_DOC_COMPLIANCE, vendorSpend: VENDOR_SPEND,
    totalSpend: VENDOR_SPEND.reduce((s, v) => s + v.amount, 0),
    totalServices: records.length,
    currentVendors: vendorList.filter(v => v.status === 'current').length,
    overdueVendors: vendorList.filter(v => v.status === 'overdue').length,
  };
}

// ── Document inventory ─────────────────────────────────────────────────
const DOCUMENT_INVENTORY: Record<string, { type: string; total: number; current: number; expiring: number; expired: number }[]> = {
  all: [
    { type: 'Insurance COI', total: 15, current: 12, expiring: 2, expired: 1 },
    { type: 'Vendor Certificates', total: 22, current: 18, expiring: 3, expired: 1 },
    { type: 'Food Handler Certs', total: 18, current: 14, expiring: 3, expired: 1 },
    { type: 'Business Licenses', total: 3, current: 3, expiring: 0, expired: 0 },
  ],
  downtown: [
    { type: 'Insurance COI', total: 5, current: 5, expiring: 0, expired: 0 },
    { type: 'Vendor Certificates', total: 8, current: 7, expiring: 1, expired: 0 },
    { type: 'Food Handler Certs', total: 7, current: 6, expiring: 1, expired: 0 },
    { type: 'Business Licenses', total: 1, current: 1, expiring: 0, expired: 0 },
  ],
  airport: [
    { type: 'Insurance COI', total: 5, current: 4, expiring: 1, expired: 0 },
    { type: 'Vendor Certificates', total: 7, current: 5, expiring: 1, expired: 1 },
    { type: 'Food Handler Certs', total: 6, current: 4, expiring: 1, expired: 1 },
    { type: 'Business Licenses', total: 1, current: 1, expiring: 0, expired: 0 },
  ],
  university: [
    { type: 'Insurance COI', total: 5, current: 3, expiring: 1, expired: 1 },
    { type: 'Vendor Certificates', total: 7, current: 6, expiring: 1, expired: 0 },
    { type: 'Food Handler Certs', total: 5, current: 4, expiring: 1, expired: 0 },
    { type: 'Business Licenses', total: 1, current: 1, expiring: 0, expired: 0 },
  ],
};

const EXPIRATION_TIMELINE = [
  { document: 'Valley Fire - COI', type: 'Insurance', expires: '2026-02-15', daysLeft: 9, location: 'Downtown Kitchen' },
  { document: 'Sarah Johnson - Food Handler', type: 'Certification', expires: '2026-03-20', daysLeft: 20, location: 'Airport Cafe' },
  { document: 'A1 Fire - Workers Comp', type: 'Insurance', expires: '2026-03-01', daysLeft: 1, location: 'All Locations' },
  { document: 'Mike Davis - Food Handler', type: 'Certification', expires: '2026-03-10', daysLeft: 10, location: 'University Dining' },
];

const MISSING_DOCS = [
  { document: 'Pest Control COI', location: 'Airport Cafe', category: 'Insurance', daysOverdue: 5 },
  { document: 'Hood Cleaning Certificate', location: 'University Dining', category: 'Service', daysOverdue: 2 },
  { document: 'Fire Alarm Inspection', location: 'Downtown Kitchen', category: 'Certification', daysOverdue: 0 },
];

// ── 4. Document Status ─────────────────────────────────────────────────
export function getDocumentStatusData(location: string) {
  const inventory = DOCUMENT_INVENTORY[location] || DOCUMENT_INVENTORY['all'];
  const locName = location === 'all' ? '' : locations.find(l => l.urlId === location)?.name || '';
  const timeline = locName ? EXPIRATION_TIMELINE.filter(e => e.location === locName || e.location === 'All Locations') : EXPIRATION_TIMELINE;
  const missing = locName ? MISSING_DOCS.filter(d => d.location === locName) : MISSING_DOCS;
  const totals = inventory.reduce((acc, d) => ({ total: acc.total + d.total, current: acc.current + d.current, expiring: acc.expiring + d.expiring, expired: acc.expired + d.expired }), { total: 0, current: 0, expiring: 0, expired: 0 });
  return { inventory, expirationTimeline: timeline, missingDocs: missing, totals, vendorDocCompliance: VENDOR_DOC_COMPLIANCE };
}

// ── Equipment data ─────────────────────────────────────────────────────
const EQUIPMENT_CERTS = [
  { equipment: 'Fire Suppression System', location: 'Downtown Kitchen', locationId: '1', status: 'Current', expires: '2026-07-15' },
  { equipment: 'Fire Suppression System', location: 'Airport Cafe', locationId: '2', status: 'Coming Due', expires: '2026-03-20' },
  { equipment: 'Hood System', location: 'University Dining', locationId: '3', status: 'Current', expires: '2026-05-10' },
  { equipment: 'Fire Alarm', location: 'Downtown Kitchen', locationId: '1', status: 'Current', expires: '2026-08-01' },
];

const MAINTENANCE_SCHEDULE = [
  { equipment: 'Hood Cleaning', dueDate: '2026-02-15', lastService: '2026-01-15', adherence: 'On Track' },
  { equipment: 'Fire Extinguisher Inspection', dueDate: '2026-02-20', lastService: '2026-01-20', adherence: 'On Track' },
  { equipment: 'HVAC Filter Change', dueDate: '2026-02-10', lastService: '2025-12-10', adherence: 'Overdue' },
  { equipment: 'Grease Trap Service', dueDate: '2026-02-25', lastService: '2026-01-25', adherence: 'On Track' },
];

// ── 5. Equipment Service History ───────────────────────────────────────
export function getEquipmentServiceData(location: string) {
  const locId = locations.find(l => l.urlId === location)?.id;
  const records = location === 'all' ? DEMO_SERVICE_RECORDS : DEMO_SERVICE_RECORDS.filter(r => r.locationId === locId);
  const certs = location === 'all' ? EQUIPMENT_CERTS : EQUIPMENT_CERTS.filter(e => e.locationId === locId);
  return { serviceRecords: records, equipmentCerts: certs, maintenanceSchedule: MAINTENANCE_SCHEDULE };
}

// ── 6. Temperature Log Summary ─────────────────────────────────────────
export function getTempLogSummaryData(location: string) {
  const tempByLoc = { ...TEMP_COMPLIANCE } as Record<string, typeof TEMP_COMPLIANCE['downtown']>;
  tempByLoc['all'] = TEMP_COMPLIANCE.downtown.map((item, i) => ({
    week: item.week,
    compliance: Math.round((item.compliance + TEMP_COMPLIANCE.airport[i].compliance + TEMP_COMPLIANCE.university[i].compliance) / 3),
  }));
  return { tempCompliance: tempByLoc[location] || tempByLoc['all'] };
}

// ── HACCP data ─────────────────────────────────────────────────────────
const HACCP_COMPLIANCE = [
  { location: 'Downtown Kitchen', monitoring: 98, records: 100, corrective: 95 },
  { location: 'Airport Cafe', monitoring: 92, records: 95, corrective: 90 },
  { location: 'University Dining', monitoring: 88, records: 92, corrective: 85 },
];

const HACCP_DEVIATIONS = [
  { date: '2026-02-12', controlPoint: 'CCP-1: Cooking', reading: '148°F (req 165°F)', correctiveAction: 'Continued cooking to 165°F', resolved: '2026-02-12', location: 'Airport Cafe' },
  { date: '2026-02-08', controlPoint: 'CCP-2: Cold Storage', reading: '43°F (req ≤41°F)', correctiveAction: 'Adjusted thermostat, rechecked in 1 hr', resolved: '2026-02-08', location: 'University Dining' },
  { date: '2026-01-28', controlPoint: 'CCP-3: Receiving', reading: '45°F (req ≤41°F)', correctiveAction: 'Rejected delivery, notified vendor', resolved: '2026-01-28', location: 'Downtown Kitchen' },
];

// ── 7. HACCP Summary ───────────────────────────────────────────────────
export function getHACCPSummaryData(location: string) {
  const locName = location === 'all' ? '' : locations.find(l => l.urlId === location)?.name || '';
  const compliance = locName ? HACCP_COMPLIANCE.filter(h => h.location === locName) : HACCP_COMPLIANCE;
  const deviations = locName ? HACCP_DEVIATIONS.filter(d => d.location === locName) : HACCP_DEVIATIONS;
  return { compliance, deviations, totalDeviations: deviations.length, resolvedRate: 100 };
}

// ── Insurance data ─────────────────────────────────────────────────────
const INSURANCE_ITEMS = [
  { item: 'Hood Cleaning Certificate', provider: 'ABC Fire Protection', status: 'Current', expires: '2026-04-15' },
  { item: 'Fire Suppression Inspection', provider: 'Valley Fire Systems', status: 'Current', expires: '2026-07-15' },
  { item: 'Fire Extinguisher Inspection', provider: 'Valley Fire Equipment', status: 'Coming Due', expires: '2026-03-20' },
  { item: 'Pest Control Contract', provider: 'Pacific Pest Control', status: 'Current', expires: '2026-12-31' },
  { item: 'General Liability COI', provider: 'SafeGuard Insurance', status: 'Current', expires: '2027-01-15' },
  { item: 'Workers Comp COI', provider: 'SafeGuard Insurance', status: 'Current', expires: '2027-01-15' },
];

const INSURANCE_GAPS = [
  'Fire extinguisher inspection coming due at Airport Cafe (20 days)',
  'Pest Control COI missing for Airport Cafe',
  'NFPA 96 documentation incomplete for University Dining',
];

// ── 8. Insurance Documentation ─────────────────────────────────────────
export function getInsuranceDocData(_location: string) {
  return { items: INSURANCE_ITEMS, gaps: INSURANCE_GAPS, readiness: 'Gaps Exist' as const, vendorDocCompliance: VENDOR_DOC_COMPLIANCE };
}

// ── Training completion data ───────────────────────────────────────────
const TRAINING_COMPLETION: Record<string, { training: string; completed: number; pending: number; rate: number }[]> = {
  all: [
    { training: 'Food Handler Certification', completed: 15, pending: 3, rate: 83 },
    { training: 'Allergen Awareness', completed: 12, pending: 6, rate: 67 },
    { training: 'Temperature Logging', completed: 18, pending: 0, rate: 100 },
    { training: 'Cleaning Procedures', completed: 14, pending: 4, rate: 78 },
  ],
  downtown: [
    { training: 'Food Handler Certification', completed: 6, pending: 0, rate: 100 },
    { training: 'Allergen Awareness', completed: 5, pending: 1, rate: 83 },
    { training: 'Temperature Logging', completed: 6, pending: 0, rate: 100 },
    { training: 'Cleaning Procedures', completed: 6, pending: 0, rate: 100 },
  ],
  airport: [
    { training: 'Food Handler Certification', completed: 5, pending: 1, rate: 83 },
    { training: 'Allergen Awareness', completed: 4, pending: 2, rate: 67 },
    { training: 'Temperature Logging', completed: 6, pending: 0, rate: 100 },
    { training: 'Cleaning Procedures', completed: 4, pending: 2, rate: 67 },
  ],
  university: [
    { training: 'Food Handler Certification', completed: 4, pending: 2, rate: 67 },
    { training: 'Allergen Awareness', completed: 3, pending: 3, rate: 50 },
    { training: 'Temperature Logging', completed: 6, pending: 0, rate: 100 },
    { training: 'Cleaning Procedures', completed: 4, pending: 2, rate: 67 },
  ],
};

// ── 9. Training & Certification ────────────────────────────────────────
export function getTrainingCertData(location: string) {
  const locId = locations.find(l => l.urlId === location)?.id;
  const employees = location === 'all' ? TRAINING_EMPLOYEES : TRAINING_EMPLOYEES.filter(e => e.locationId === locId);
  const training = TRAINING_COMPLETION[location] || TRAINING_COMPLETION['all'];
  const expiring30 = employees.filter(e => {
    const next = getNextExpiration(e);
    if (!next) return false;
    const days = Math.ceil((new Date(next).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 30;
  }).length;
  const expired = employees.filter(e => getTrainingStatus(e) === 'needs_renewal').length;
  return { employees, training, expiring30, expired, totalEmployees: employees.length };
}

// ── Grease trap data ───────────────────────────────────────────────────
const GREASE_TRAP_HISTORY = [
  { date: '2026-01-25', vendor: 'Valley Pumping Co.', gallons: 180, facility: 'Fresno Recycling Center', manifest: 'GT-2026-0125-DT', location: 'Downtown Kitchen' },
  { date: '2025-12-20', vendor: 'Valley Pumping Co.', gallons: 165, facility: 'Fresno Recycling Center', manifest: 'GT-2025-1220-DT', location: 'Downtown Kitchen' },
  { date: '2026-01-28', vendor: 'Valley Pumping Co.', gallons: 120, facility: 'Fresno Recycling Center', manifest: 'GT-2026-0128-AP', location: 'Airport Cafe' },
  { date: '2026-02-01', vendor: 'Central Valley Grease', gallons: 200, facility: 'Tulare Oil Recyclers', manifest: 'GT-2026-0201-UN', location: 'University Dining' },
];

// ── 10. Grease Trap / FOG ──────────────────────────────────────────────
export function getGreaseTrapData(location: string) {
  const locName = location === 'all' ? '' : locations.find(l => l.urlId === location)?.name || '';
  const history = locName ? GREASE_TRAP_HISTORY.filter(h => h.location === locName) : GREASE_TRAP_HISTORY;
  return { history, totalGallons: history.reduce((s, h) => s + h.gallons, 0), totalPumpings: history.length, schedule: 'Monthly', compliance: 'On Schedule' };
}

// ── 11. Kitchen to Community Impact ────────────────────────────────────
export function getK2CImpactData() {
  const monthlyDonation = locations.length * 10;
  return {
    totalMealsFunded: demoReferral.mealsGenerated + 120,
    monthlyDonation,
    referralsCount: demoReferral.referralsCount,
    referralCode: demoReferral.referralCode,
    donationHistory: [
      { month: 'Sep 2025', amount: monthlyDonation, meals: 12 },
      { month: 'Oct 2025', amount: monthlyDonation, meals: 12 },
      { month: 'Nov 2025', amount: monthlyDonation, meals: 12 },
      { month: 'Dec 2025', amount: monthlyDonation + 10, meals: 14 },
      { month: 'Jan 2026', amount: monthlyDonation + 20, meals: 16 },
      { month: 'Feb 2026', amount: monthlyDonation + 20, meals: 16 },
    ],
    impactComparison: `Your kitchen has funded ${demoReferral.mealsGenerated + 120} meals — that's ${Math.round((demoReferral.mealsGenerated + 120) / 5)} school breakfasts`,
  };
}

// ── 12. Location Comparison ────────────────────────────────────────────
export function getLocationComparisonData() {
  return locations.map(loc => {
    const scores = locationScores[loc.urlId];
    const food = scores?.foodSafety || 0;
    const facility = scores?.facilitySafety || 0;
    const checklists = CHECKLIST_COMPLETION[loc.urlId];
    const checklistAvg = checklists ? Math.round(checklists.reduce((s, c) => s + c.rate, 0) / checklists.length) : 0;
    const temp = TEMP_COMPLIANCE[loc.urlId];
    const tempAvg = temp ? Math.round(temp.reduce((s, t) => s + t.compliance, 0) / temp.length) : 0;
    return {
      location: loc.name, urlId: loc.urlId, foodSafety: food, facilitySafety: facility,
      overall: Math.round((food + facility) / 2),
      foodStatus: getScoreStatus(food), facilityStatus: getScoreStatus(facility),
      checklistCompletion: checklistAvg, tempCompliance: tempAvg, openItems: loc.actionItems,
    };
  });
}

// Re-export for convenience
export { locations, locationScores, vendors, DEMO_SERVICE_RECORDS, TRAINING_EMPLOYEES, getScoreColor, getScoreStatus };
