// ============================================================
// Health Department Report Generator Engine
// ============================================================
// Generates inspection-ready compliance reports with:
// - County-specific templates (LA, San Diego, Kern, Orange, Sacramento, generic)
// - 7 report sections (Facility, Food Safety, Employee, Fire, Vendor, Corrective, Score)
// - Missing documentation alerts
// - Pre-inspection self-audit checklists
// - Trend analytics
// ============================================================

import { locations, locationScores, vendors, scoreImpactData, needsAttentionItems } from '../data/demoData';
import { calculateJurisdictionScore, extractCountySlug } from './jurisdictionScoring';

// ── Types ──────────────────────────────────────────────────

export type CountyTemplate = 'la' | 'san-diego' | 'kern' | 'orange' | 'sacramento' | 'generic';

export interface ReportConfig {
  locationId: string;
  countyTemplate: CountyTemplate;
  dateRange: '30' | '60' | '90' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  sections: {
    facilityInfo: boolean;
    foodSafety: boolean;
    employeeCerts: boolean;
    fireSafety: boolean;
    vendorDocs: boolean;
    correctiveActions: boolean;
    complianceScore: boolean;
  };
  isPaidTier: boolean;
}

export interface FacilityInfo {
  name: string;
  address: string;
  permitNumber: string;
  ownerOperator: string;
  phone: string;
  lastInspection: string;
  nextInspection: string;
  seatCapacity: number;
  county: string;
}

export interface FoodSafetyItem {
  category: string;
  item: string;
  status: 'compliant' | 'non-compliant' | 'needs-attention';
  details: string;
  lastChecked: string;
  pointDeduction: number;
}

export interface EmployeeCert {
  name: string;
  role: string;
  certType: string;
  certNumber: string;
  issueDate: string;
  expiryDate: string;
  status: 'current' | 'expiring' | 'expired';
  daysUntilExpiry: number;
}

export interface FireSafetyItem {
  equipment: string;
  location: string;
  lastInspection: string;
  nextDue: string;
  status: 'current' | 'due-soon' | 'overdue';
  inspector: string;
  certNumber: string;
}

export interface VendorDoc {
  vendor: string;
  docType: string;
  status: 'current' | 'expiring' | 'expired' | 'missing';
  expiryDate: string;
  daysUntilExpiry: number;
}

export interface CorrectiveAction {
  id: string;
  issue: string;
  dateIdentified: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'resolved';
  assignee: string;
  dueDate: string;
  resolvedDate?: string;
  action: string;
}

export interface ComplianceScoreSection {
  overall: number;
  foodSafety: number;
  fireSafety: number;
  countyGrade?: string;
  countyScoreLabel?: string;
  jurisdictionScore?: number;
  jurisdictionGrade?: string;
  jurisdictionSystemType?: string;
  jurisdictionViolationCount?: number;
  trend30Day: number;
  trend60Day: number;
  trend90Day: number;
}

export interface MissingDocAlert {
  document: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  requiredBy: string;
}

export interface SelfAuditItem {
  id: string;
  section: string;
  item: string;
  requirement: string;
  pointValue: number;
  status: 'pass' | 'fail' | 'needs-review';
  notes: string;
}

export interface TrendDataPoint {
  period: string;
  tempCompliance: number;
  checklistCompletion: number;
  overallScore: number;
}

export interface ReportHistory {
  id: string;
  locationId: string;
  locationName: string;
  reportType: string;
  countyTemplate: CountyTemplate;
  generatedAt: string;
  generatedBy: string;
  status: 'completed' | 'generating' | 'failed';
  sections: string[];
  dateRange: string;
  shareLink?: string;
  shareLinkExpiry?: string;
}

export interface HealthDeptReport {
  id: string;
  generatedAt: string;
  config: ReportConfig;
  facilityInfo: FacilityInfo;
  foodSafety: FoodSafetyItem[];
  employeeCerts: EmployeeCert[];
  fireSafety: FireSafetyItem[];
  vendorDocs: VendorDoc[];
  correctiveActions: CorrectiveAction[];
  complianceScore: ComplianceScoreSection;
  missingDocs: MissingDocAlert[];
  selfAudit: SelfAuditItem[];
  trendData: TrendDataPoint[];
}

// ── County Template Config ─────────────────────────────────

export interface CountyTemplateConfig {
  id: CountyTemplate;
  name: string;
  gradingSystem: string;
  gradingDescription: string;
  getGrade: (score: number) => string;
  getGradeColor: (score: number) => string;
  specialRequirements: string[];
}

export const COUNTY_TEMPLATES: Record<CountyTemplate, CountyTemplateConfig> = {
  'la': {
    id: 'la',
    name: 'Los Angeles County',
    gradingSystem: 'Letter Grade (A/B/C)',
    gradingDescription: 'Grade card prominently displayed at entrance',
    getGrade: (score: number) => score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'Score Card',
    getGradeColor: (score: number) => score >= 90 ? '#22c55e' : score >= 80 ? '#eab308' : '#ef4444',
    specialRequirements: [
      'Grade card must be posted at entrance visible to patrons',
      'Re-inspection required for any grade below A',
      'Facilities receiving score below 70 may face closure',
    ],
  },
  'san-diego': {
    id: 'san-diego',
    name: 'San Diego County',
    gradingSystem: 'Letter Grade (Major/Minor/Good Practice)',
    gradingDescription: 'Major Risk Factor = 4 pts, Minor = 2 pts, Good Practice = 1 pt',
    getGrade: (score: number) => score >= 90 ? 'A' : score >= 80 ? 'B' : 'C (Failing)',
    getGradeColor: (score: number) => score >= 90 ? '#22c55e' : score >= 80 ? '#eab308' : '#ef4444',
    specialRequirements: [
      'Major Risk Factor violations carry 4-point deductions',
      'Minor Risk Factor violations carry 2-point deductions',
      'Grade C or below triggers enforcement actions',
    ],
  },
  'kern': {
    id: 'kern',
    name: 'Kern County',
    gradingSystem: 'Color Placard (Blue/Green/Yellow/Red)',
    gradingDescription: 'Color-coded placard system based on inspection score',
    getGrade: (score: number) => score >= 90 ? 'A - Blue' : score >= 80 ? 'B - Green' : score >= 70 ? 'C - Yellow' : 'Closure - Red',
    getGradeColor: (score: number) => score >= 90 ? '#3b82f6' : score >= 80 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444',
    specialRequirements: [
      'Blue placard: Score 90-100, excellent compliance',
      'Green placard: Score 80-89, satisfactory with minor issues',
      'Yellow placard: Score 70-79, conditional pass with required corrections',
      'Red placard: Score below 70, facility closure until corrections verified',
    ],
  },
  'orange': {
    id: 'orange',
    name: 'Orange County',
    gradingSystem: 'Pass/Fail',
    gradingDescription: 'Binary pass/fail system — all critical violations must be resolved',
    getGrade: (score: number) => score >= 70 ? 'PASS' : 'FAIL',
    getGradeColor: (score: number) => score >= 70 ? '#22c55e' : '#ef4444',
    specialRequirements: [
      'All critical violations must be corrected during inspection',
      'Repeated failures may result in permit revocation',
      'Closure for imminent health hazards',
    ],
  },
  'sacramento': {
    id: 'sacramento',
    name: 'Sacramento County',
    gradingSystem: 'Color Status (Green/Yellow/Red)',
    gradingDescription: 'Three-tier color status system',
    getGrade: (score: number) => score >= 90 ? 'GREEN' : score >= 70 ? 'YELLOW' : 'RED',
    getGradeColor: (score: number) => score >= 90 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444',
    specialRequirements: [
      'Green status: Full compliance, routine inspection schedule',
      'Yellow status: Minor issues, increased inspection frequency',
      'Red status: Major violations, enforcement action',
    ],
  },
  'generic': {
    id: 'generic',
    name: 'California (CalCode Standard)',
    gradingSystem: 'Score-Based (CalCode)',
    gradingDescription: 'California Retail Food Code standard scoring',
    getGrade: (score: number) => score >= 90 ? 'Inspection Ready' : score >= 70 ? 'Needs Attention' : 'Critical',
    getGradeColor: (score: number) => score >= 90 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444',
    specialRequirements: [
      'CalCode §113700 et seq. compliance required',
      'Annual permit renewal required',
      'Food handler certifications required within 30 days of hire',
    ],
  },
};

// ── Demo Data Generators ───────────────────────────────────

const FACILITY_INFO: Record<string, FacilityInfo> = {
  'downtown': {
    name: 'Downtown Kitchen',
    address: '1245 Fulton Street, Fresno, CA 93721',
    permitNumber: 'FHD-2024-001245',
    ownerOperator: 'Central Valley Restaurant Group, LLC',
    phone: '(559) 555-0123',
    lastInspection: '2025-11-15',
    nextInspection: '2026-05-15',
    seatCapacity: 85,
    county: 'Fresno',
  },
  'airport': {
    name: 'Airport Cafe',
    address: '1636 Macready Drive, Merced, CA 95340',
    permitNumber: 'MHD-2024-001636',
    ownerOperator: 'Central Valley Restaurant Group, LLC',
    phone: '(209) 555-0456',
    lastInspection: '2025-10-22',
    nextInspection: '2026-04-22',
    seatCapacity: 45,
    county: 'Merced',
  },
  'university': {
    name: 'University Dining',
    address: '1 University Circle, Modesto, CA 95348',
    permitNumber: 'SHD-2024-000001',
    ownerOperator: 'Central Valley Restaurant Group, LLC',
    phone: '(209) 555-0789',
    lastInspection: '2025-09-10',
    nextInspection: '2026-03-10',
    seatCapacity: 200,
    county: 'Stanislaus',
  },
};

function generateFoodSafety(locationUrlId: string): FoodSafetyItem[] {
  const items: Record<string, FoodSafetyItem[]> = {
    'downtown': [
      { category: 'Temperature Control', item: 'Cold holding units (walk-in, reach-in)', status: 'compliant', details: 'All units 38-40°F, within range', lastChecked: '2026-02-10', pointDeduction: 0 },
      { category: 'Temperature Control', item: 'Hot holding equipment', status: 'compliant', details: 'Steam table maintained at 140°F+', lastChecked: '2026-02-10', pointDeduction: 0 },
      { category: 'Food Storage', item: 'Dry storage organization', status: 'compliant', details: 'FIFO rotation observed, 6" off floor', lastChecked: '2026-02-09', pointDeduction: 0 },
      { category: 'Hygiene', item: 'Handwashing stations', status: 'compliant', details: 'Soap, towels, signage present at all 3 stations', lastChecked: '2026-02-10', pointDeduction: 0 },
      { category: 'Pest Control', item: 'Evidence of pest activity', status: 'compliant', details: 'No evidence, last service Jan 28', lastChecked: '2026-02-05', pointDeduction: 0 },
      { category: 'Cross-Contamination', item: 'Cutting board separation', status: 'compliant', details: 'Color-coded system in use', lastChecked: '2026-02-10', pointDeduction: 0 },
      { category: 'Sanitization', item: 'Sanitizer concentration (3-compartment sink)', status: 'needs-attention', details: 'Test strips show 180ppm — slightly above 200ppm target', lastChecked: '2026-02-10', pointDeduction: 1 },
    ],
    'airport': [
      { category: 'Temperature Control', item: 'Cold holding units', status: 'needs-attention', details: 'Walk-in at 42°F — calibration needed', lastChecked: '2026-02-10', pointDeduction: 2 },
      { category: 'Temperature Control', item: 'Hot holding equipment', status: 'compliant', details: 'Within range at 145°F', lastChecked: '2026-02-10', pointDeduction: 0 },
      { category: 'Food Storage', item: 'Dry storage organization', status: 'needs-attention', details: 'Some items below 6" from floor', lastChecked: '2026-02-08', pointDeduction: 1 },
      { category: 'Hygiene', item: 'Handwashing stations', status: 'non-compliant', details: 'Paper towel dispenser empty at station #2', lastChecked: '2026-02-10', pointDeduction: 4 },
      { category: 'Pest Control', item: 'Evidence of pest activity', status: 'needs-attention', details: 'Minor fly activity near back door', lastChecked: '2026-02-05', pointDeduction: 2 },
      { category: 'Cross-Contamination', item: 'Cutting board separation', status: 'compliant', details: 'Separate boards for raw/cooked', lastChecked: '2026-02-10', pointDeduction: 0 },
      { category: 'Sanitization', item: 'Sanitizer concentration', status: 'compliant', details: '200ppm chlorine verified', lastChecked: '2026-02-10', pointDeduction: 0 },
    ],
    'university': [
      { category: 'Temperature Control', item: 'Cold holding units', status: 'non-compliant', details: 'Reach-in cooler at 48°F — exceeds 41°F max', lastChecked: '2026-02-10', pointDeduction: 4 },
      { category: 'Temperature Control', item: 'Hot holding equipment', status: 'non-compliant', details: 'Steam table found at 127°F — below 135°F min', lastChecked: '2026-02-10', pointDeduction: 4 },
      { category: 'Food Storage', item: 'Dry storage organization', status: 'non-compliant', details: 'Expired products found, no FIFO', lastChecked: '2026-02-07', pointDeduction: 2 },
      { category: 'Hygiene', item: 'Handwashing stations', status: 'non-compliant', details: 'No soap at station #1, no signage at station #3', lastChecked: '2026-02-10', pointDeduction: 4 },
      { category: 'Pest Control', item: 'Evidence of pest activity', status: 'non-compliant', details: 'Rodent droppings found in storage area', lastChecked: '2026-02-03', pointDeduction: 4 },
      { category: 'Cross-Contamination', item: 'Cutting board separation', status: 'needs-attention', details: 'Color-coded but worn, replacement needed', lastChecked: '2026-02-10', pointDeduction: 1 },
      { category: 'Sanitization', item: 'Sanitizer concentration', status: 'non-compliant', details: 'Concentration at 50ppm — below 100ppm minimum', lastChecked: '2026-02-10', pointDeduction: 2 },
    ],
  };
  return items[locationUrlId] || items['downtown'];
}

function generateEmployeeCerts(locationUrlId: string): EmployeeCert[] {
  const certs: Record<string, EmployeeCert[]> = {
    'downtown': [
      { name: 'Marcus Johnson', role: 'Head Chef', certType: 'Food Manager Certificate', certNumber: 'FM-2024-8812', issueDate: '2024-08-15', expiryDate: '2029-08-15', status: 'current', daysUntilExpiry: 1282 },
      { name: 'Sarah Chen', role: 'Line Cook', certType: 'Food Handler Card', certNumber: 'FH-2025-3345', issueDate: '2025-03-01', expiryDate: '2028-03-01', status: 'current', daysUntilExpiry: 750 },
      { name: 'David Park', role: 'Sous Chef', certType: 'Food Handler Card', certNumber: 'FH-2025-3412', issueDate: '2025-04-10', expiryDate: '2028-04-10', status: 'current', daysUntilExpiry: 790 },
      { name: 'Emma Rodriguez', role: 'Prep Cook', certType: 'Food Handler Card', certNumber: 'FH-2024-9901', issueDate: '2024-01-15', expiryDate: '2027-01-15', status: 'current', daysUntilExpiry: 340 },
      { name: 'Alex Thompson', role: 'Dishwasher', certType: 'Food Handler Card', certNumber: 'FH-2025-5567', issueDate: '2025-06-01', expiryDate: '2028-06-01', status: 'current', daysUntilExpiry: 842 },
      { name: 'Lisa Martinez', role: 'Server Lead', certType: 'Allergen Awareness', certNumber: 'AA-2025-1122', issueDate: '2025-01-10', expiryDate: '2027-01-10', status: 'current', daysUntilExpiry: 335 },
    ],
    'airport': [
      { name: 'Tom Wilson', role: 'Manager', certType: 'Food Manager Certificate', certNumber: 'FM-2024-7734', issueDate: '2024-06-20', expiryDate: '2029-06-20', status: 'current', daysUntilExpiry: 1226 },
      { name: 'Sarah Johnson', role: 'Lead Cook', certType: 'Food Handler Card', certNumber: 'FH-2023-8890', issueDate: '2023-02-20', expiryDate: '2026-02-20', status: 'expiring', daysUntilExpiry: 10 },
      { name: 'Mike Chen', role: 'Prep Cook', certType: 'Food Handler Card', certNumber: 'FH-2025-2201', issueDate: '2025-02-15', expiryDate: '2028-02-15', status: 'current', daysUntilExpiry: 736 },
      { name: 'Karen Brown', role: 'Cashier', certType: 'Food Handler Card', certNumber: 'FH-2024-6655', issueDate: '2024-07-01', expiryDate: '2027-07-01', status: 'current', daysUntilExpiry: 507 },
      { name: 'James Lee', role: 'Server', certType: 'Food Handler Card', certNumber: 'FH-2025-4410', issueDate: '2025-05-01', expiryDate: '2028-05-01', status: 'current', daysUntilExpiry: 811 },
    ],
    'university': [
      { name: 'Robert Davis', role: 'Kitchen Manager', certType: 'Food Manager Certificate', certNumber: 'FM-2023-5521', issueDate: '2023-05-10', expiryDate: '2028-05-10', status: 'current', daysUntilExpiry: 820 },
      { name: 'Emily Chen', role: 'Lead Cook', certType: 'Food Handler Card', certNumber: 'FH-2022-9988', issueDate: '2022-12-01', expiryDate: '2025-12-01', status: 'expired', daysUntilExpiry: -71 },
      { name: 'Mike Davis', role: 'Line Cook', certType: 'Food Handler Card', certNumber: 'FH-2023-1133', issueDate: '2023-03-10', expiryDate: '2026-03-10', status: 'expiring', daysUntilExpiry: 28 },
      { name: 'Ana Gonzalez', role: 'Prep Cook', certType: 'Food Handler Card', certNumber: 'FH-2022-7744', issueDate: '2022-08-15', expiryDate: '2025-08-15', status: 'expired', daysUntilExpiry: -179 },
      { name: 'Chris Taylor', role: 'Dishwasher', certType: 'Food Handler Card', certNumber: 'FH-2025-8800', issueDate: '2025-09-01', expiryDate: '2028-09-01', status: 'current', daysUntilExpiry: 934 },
    ],
  };
  return certs[locationUrlId] || certs['downtown'];
}

function generateFireSafety(locationUrlId: string): FireSafetyItem[] {
  const items: Record<string, FireSafetyItem[]> = {
    'downtown': [
      { equipment: 'Kitchen Hood Suppression System', location: 'Main kitchen', lastInspection: '2026-01-15', nextDue: '2026-07-15', status: 'current', inspector: 'ABC Fire Protection', certNumber: 'FS-2026-0115' },
      { equipment: 'Fire Extinguishers (4)', location: 'Kitchen, dining, storage, office', lastInspection: '2025-12-10', nextDue: '2026-12-10', status: 'current', inspector: 'Valley Fire Systems', certNumber: 'FE-2025-1210' },
      { equipment: 'Fire Alarm System', location: 'Building-wide', lastInspection: '2026-02-01', nextDue: '2027-02-01', status: 'current', inspector: 'A1 Fire Protection', certNumber: 'FA-2026-0201' },
      { equipment: 'Emergency Exit Lighting', location: 'All exits (3)', lastInspection: '2026-01-20', nextDue: '2026-07-20', status: 'current', inspector: 'Valley Fire Systems', certNumber: 'EL-2026-0120' },
    ],
    'airport': [
      { equipment: 'Kitchen Hood Suppression System', location: 'Kitchen', lastInspection: '2026-01-20', nextDue: '2026-07-20', status: 'current', inspector: 'Valley Fire Systems', certNumber: 'FS-2026-0120' },
      { equipment: 'Fire Extinguishers (3)', location: 'Kitchen, dining, storage', lastInspection: '2026-01-20', nextDue: '2026-07-20', status: 'current', inspector: 'Valley Fire Systems', certNumber: 'FE-2026-0120' },
      { equipment: 'Fire Alarm System', location: 'Building-wide', lastInspection: '2025-08-15', nextDue: '2026-08-15', status: 'current', inspector: 'Valley Fire Systems', certNumber: 'FA-2025-0815' },
      { equipment: 'Ansul System', location: 'Fryer station', lastInspection: '2025-10-04', nextDue: '2026-04-04', status: 'due-soon', inspector: 'ABC Fire Protection', certNumber: 'AN-2025-1004' },
    ],
    'university': [
      { equipment: 'Kitchen Hood Suppression System', location: 'Main kitchen', lastInspection: '2025-04-10', nextDue: '2025-10-10', status: 'overdue', inspector: 'Valley Fire Systems', certNumber: 'FS-2025-0410' },
      { equipment: 'Fire Extinguishers (6)', location: 'Kitchen, dining (3), storage, office', lastInspection: '2025-11-15', nextDue: '2026-11-15', status: 'current', inspector: 'ABC Fire Protection', certNumber: 'FE-2025-1115' },
      { equipment: 'Fire Alarm System', location: 'Building-wide', lastInspection: '2025-06-01', nextDue: '2026-06-01', status: 'current', inspector: 'Valley Fire Systems', certNumber: 'FA-2025-0601' },
      { equipment: 'Ansul System', location: 'Fryer station', lastInspection: '2025-07-20', nextDue: '2026-01-20', status: 'overdue', inspector: 'Valley Fire Systems', certNumber: 'AN-2025-0720' },
    ],
  };
  return items[locationUrlId] || items['downtown'];
}

function generateVendorDocs(locationUrlId: string): VendorDoc[] {
  const locId = locationUrlId === 'downtown' ? '1' : locationUrlId === 'airport' ? '2' : '3';
  const locVendors = vendors.filter(v => v.locationId === locId);
  return locVendors.map(v => ({
    vendor: v.companyName,
    docType: 'Certificate of Insurance (COI)',
    status: v.status === 'overdue' ? 'expired' as const : v.status === 'upcoming' ? 'expiring' as const : 'current' as const,
    expiryDate: v.nextDue,
    daysUntilExpiry: Math.round((new Date(v.nextDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  }));
}

function generateCorrectiveActions(locationUrlId: string): CorrectiveAction[] {
  const actions: Record<string, CorrectiveAction[]> = {
    'downtown': [
      { id: 'CA-001', issue: 'Sanitizer concentration slightly elevated', dateIdentified: '2026-02-10', priority: 'low', status: 'in-progress', assignee: 'Marcus Johnson', dueDate: '2026-02-17', action: 'Recalibrate chemical dispenser and retrain staff on proper concentration testing' },
      { id: 'CA-002', issue: 'Fire suppression inspection due in 15 days', dateIdentified: '2026-02-09', priority: 'medium', status: 'in-progress', assignee: 'Lisa Martinez', dueDate: '2026-02-24', action: 'Scheduled with Valley Fire Systems for Feb 22' },
    ],
    'airport': [
      { id: 'CA-003', issue: 'Hood cleaning 5 days overdue', dateIdentified: '2026-02-04', priority: 'critical', status: 'open', assignee: 'Tom Wilson', dueDate: '2026-02-11', action: 'Emergency scheduling with ABC Fire Protection' },
      { id: 'CA-004', issue: 'Walk-in cooler running warm (42°F)', dateIdentified: '2026-02-10', priority: 'high', status: 'open', assignee: 'Tom Wilson', dueDate: '2026-02-12', action: 'Called CleanAir HVAC for emergency service' },
      { id: 'CA-005', issue: 'Paper towel dispenser empty at handwash station', dateIdentified: '2026-02-10', priority: 'high', status: 'in-progress', assignee: 'Karen Brown', dueDate: '2026-02-10', action: 'Restocked and added to daily opening checklist verification' },
      { id: 'CA-006', issue: 'Food handler cert expiring in 10 days', dateIdentified: '2026-02-10', priority: 'medium', status: 'in-progress', assignee: 'Sarah Johnson', dueDate: '2026-02-18', action: 'Renewal class scheduled for Feb 15' },
    ],
    'university': [
      { id: 'CA-007', issue: 'Reach-in cooler exceeding 41°F max', dateIdentified: '2026-02-10', priority: 'critical', status: 'open', assignee: 'Robert Davis', dueDate: '2026-02-11', action: 'Equipment repair requested, temporary use of walk-in' },
      { id: 'CA-008', issue: 'Steam table below 135°F minimum', dateIdentified: '2026-02-10', priority: 'critical', status: 'open', assignee: 'Robert Davis', dueDate: '2026-02-11', action: 'Equipment needs thermostat replacement' },
      { id: 'CA-009', issue: 'Rodent droppings in storage area', dateIdentified: '2026-02-03', priority: 'critical', status: 'in-progress', assignee: 'Robert Davis', dueDate: '2026-02-07', action: 'Emergency pest control called, deep cleaning scheduled' },
      { id: 'CA-010', issue: 'Health permit expired', dateIdentified: '2026-01-06', priority: 'critical', status: 'open', assignee: 'Robert Davis', dueDate: '2026-01-20', action: 'Renewal application submitted, awaiting processing' },
      { id: 'CA-011', issue: '2 food handler certificates expired', dateIdentified: '2026-02-01', priority: 'high', status: 'open', assignee: 'Robert Davis', dueDate: '2026-02-15', action: 'Staff notified, renewal classes booked' },
      { id: 'CA-012', issue: 'Fire suppression system 4 months overdue', dateIdentified: '2025-10-10', priority: 'critical', status: 'open', assignee: 'Robert Davis', dueDate: '2025-11-10', action: 'Urgent scheduling with Valley Fire Systems' },
    ],
  };
  return actions[locationUrlId] || actions['downtown'];
}

function generateMissingDocs(locationUrlId: string): MissingDocAlert[] {
  const alerts: Record<string, MissingDocAlert[]> = {
    'downtown': [],
    'airport': [
      { document: 'Pest Control Service Report (Feb)', category: 'Service Records', severity: 'warning', message: 'Last service Feb 1 — report not uploaded', requiredBy: 'CalCode §114259' },
      { document: 'Food Handler Card — Sarah Johnson', category: 'Employee Certifications', severity: 'warning', message: 'Expires Feb 20 — renewal needed', requiredBy: 'CalCode §113948' },
    ],
    'university': [
      { document: 'Health Permit', category: 'Business Permits', severity: 'critical', message: 'Expired Jan 6, 2026 — facility operating without valid permit', requiredBy: 'CalCode §114381' },
      { document: 'Food Handler Card — Emily Chen', category: 'Employee Certifications', severity: 'critical', message: 'Expired Dec 1, 2025', requiredBy: 'CalCode §113948' },
      { document: 'Food Handler Card — Ana Gonzalez', category: 'Employee Certifications', severity: 'critical', message: 'Expired Aug 15, 2025', requiredBy: 'CalCode §113948' },
      { document: 'Fire Suppression Inspection Certificate', category: 'Fire Safety', severity: 'critical', message: 'Last inspection Apr 10, 2025 — 4 months overdue', requiredBy: 'CFC §904.12.5' },
      { document: 'Grease Trap Service Record', category: 'Service Records', severity: 'critical', message: 'Last service Jul 20, 2025 — severely overdue', requiredBy: 'CalCode §114149' },
      { document: '3 Vendor COI Documents', category: 'Insurance', severity: 'warning', message: 'Multiple vendor certificates of insurance expired', requiredBy: 'Business policy' },
    ],
  };
  return alerts[locationUrlId] || alerts['downtown'];
}

function generateSelfAudit(locationUrlId: string): SelfAuditItem[] {
  const scores = locationScores[locationUrlId];
  const isGood = scores?.overall >= 90;
  const isMedium = scores?.overall >= 70;

  return [
    // Temperature & Food Safety
    { id: 'SA-01', section: 'Temperature Control', item: 'All cold-holding units at or below 41°F', requirement: 'CalCode §113996', pointValue: 4, status: isGood ? 'pass' : isMedium ? 'needs-review' : 'fail', notes: isGood ? 'All units verified' : 'Verify all units with calibrated thermometer' },
    { id: 'SA-02', section: 'Temperature Control', item: 'All hot-holding at or above 135°F', requirement: 'CalCode §113996', pointValue: 4, status: isGood ? 'pass' : 'fail', notes: isGood ? 'Steam table and holding cabinets checked' : 'Steam table reading below minimum' },
    { id: 'SA-03', section: 'Temperature Control', item: 'Thermometers present and calibrated', requirement: 'CalCode §114157', pointValue: 1, status: isGood ? 'pass' : 'needs-review', notes: '' },
    { id: 'SA-04', section: 'Food Storage', item: 'Food stored 6 inches off floor', requirement: 'CalCode §114047', pointValue: 1, status: isGood ? 'pass' : isMedium ? 'needs-review' : 'fail', notes: '' },
    { id: 'SA-05', section: 'Food Storage', item: 'FIFO (First In, First Out) rotation', requirement: 'CalCode §114057', pointValue: 2, status: isGood ? 'pass' : 'fail', notes: '' },
    { id: 'SA-06', section: 'Food Storage', item: 'No expired products', requirement: 'CalCode §113980', pointValue: 4, status: isGood ? 'pass' : 'fail', notes: '' },
    // Hygiene
    { id: 'SA-07', section: 'Personal Hygiene', item: 'Handwashing stations fully stocked (soap, towels, signage)', requirement: 'CalCode §113953', pointValue: 4, status: isGood ? 'pass' : isMedium ? 'fail' : 'fail', notes: '' },
    { id: 'SA-08', section: 'Personal Hygiene', item: 'All food handlers wearing proper hair restraints', requirement: 'CalCode §113969', pointValue: 1, status: 'pass', notes: '' },
    { id: 'SA-09', section: 'Personal Hygiene', item: 'No bare hand contact with ready-to-eat food', requirement: 'CalCode §113961', pointValue: 4, status: 'pass', notes: '' },
    // Cleaning & Sanitization
    { id: 'SA-10', section: 'Sanitization', item: 'Sanitizer at proper concentration (100-200ppm chlorine)', requirement: 'CalCode §114099', pointValue: 2, status: isGood ? 'needs-review' : isMedium ? 'pass' : 'fail', notes: '' },
    { id: 'SA-11', section: 'Sanitization', item: 'Clean and sanitized food-contact surfaces', requirement: 'CalCode §114097', pointValue: 2, status: isGood ? 'pass' : 'needs-review', notes: '' },
    { id: 'SA-12', section: 'Pest Control', item: 'No evidence of pest activity', requirement: 'CalCode §114259', pointValue: 4, status: isGood ? 'pass' : isMedium ? 'needs-review' : 'fail', notes: '' },
    // Equipment & Facility
    { id: 'SA-13', section: 'Equipment', item: 'Hood suppression system current', requirement: 'CFC §904.12.5', pointValue: 2, status: isGood ? 'pass' : isMedium ? 'pass' : 'fail', notes: '' },
    { id: 'SA-14', section: 'Equipment', item: 'Fire extinguishers accessible and inspected', requirement: 'CFC §906.1', pointValue: 2, status: 'pass', notes: '' },
    { id: 'SA-15', section: 'Facility', item: 'Floors, walls, ceilings clean and in good repair', requirement: 'CalCode §114143', pointValue: 1, status: isGood ? 'pass' : 'needs-review', notes: '' },
    { id: 'SA-16', section: 'Facility', item: 'Adequate lighting in food prep areas', requirement: 'CalCode §114252', pointValue: 1, status: 'pass', notes: '' },
    // Documentation
    { id: 'SA-17', section: 'Documentation', item: 'Valid health permit posted', requirement: 'CalCode §114381', pointValue: 4, status: isGood ? 'pass' : isMedium ? 'pass' : 'fail', notes: '' },
    { id: 'SA-18', section: 'Documentation', item: 'All food handler certifications current', requirement: 'CalCode §113948', pointValue: 2, status: isGood ? 'pass' : isMedium ? 'needs-review' : 'fail', notes: '' },
    { id: 'SA-19', section: 'Documentation', item: 'Food manager certificate on-site', requirement: 'CalCode §113947.1', pointValue: 2, status: 'pass', notes: '' },
    { id: 'SA-20', section: 'Documentation', item: 'Last inspection report available', requirement: 'CalCode §113725.1', pointValue: 1, status: 'pass', notes: '' },
  ];
}

function generateTrendData(locationUrlId: string): TrendDataPoint[] {
  const trends: Record<string, TrendDataPoint[]> = {
    'downtown': [
      { period: '12 Weeks Ago', tempCompliance: 94, checklistCompletion: 92, overallScore: 85 },
      { period: '8 Weeks Ago', tempCompliance: 96, checklistCompletion: 95, overallScore: 88 },
      { period: '4 Weeks Ago', tempCompliance: 98, checklistCompletion: 97, overallScore: 90 },
      { period: 'Current', tempCompliance: 98, checklistCompletion: 97, overallScore: 92 },
    ],
    'airport': [
      { period: '12 Weeks Ago', tempCompliance: 82, checklistCompletion: 85, overallScore: 64 },
      { period: '8 Weeks Ago', tempCompliance: 85, checklistCompletion: 82, overallScore: 67 },
      { period: '4 Weeks Ago', tempCompliance: 87, checklistCompletion: 80, overallScore: 69 },
      { period: 'Current', tempCompliance: 88, checklistCompletion: 85, overallScore: 70 },
    ],
    'university': [
      { period: '12 Weeks Ago', tempCompliance: 75, checklistCompletion: 72, overallScore: 42 },
      { period: '8 Weeks Ago', tempCompliance: 78, checklistCompletion: 75, overallScore: 48 },
      { period: '4 Weeks Ago', tempCompliance: 80, checklistCompletion: 70, overallScore: 52 },
      { period: 'Current', tempCompliance: 81, checklistCompletion: 73, overallScore: 54 },
    ],
  };
  return trends[locationUrlId] || trends['downtown'];
}

// ── Main Report Generator ──────────────────────────────────

export function generateHealthDeptReport(config: ReportConfig): HealthDeptReport {
  const loc = locations.find(l => l.urlId === config.locationId) || locations[0];
  const scores = locationScores[config.locationId] || locationScores['downtown'];
  const template = COUNTY_TEMPLATES[config.countyTemplate];

  return {
    id: `RPT-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    config,
    facilityInfo: FACILITY_INFO[config.locationId] || FACILITY_INFO['downtown'],
    foodSafety: generateFoodSafety(config.locationId),
    employeeCerts: generateEmployeeCerts(config.locationId),
    fireSafety: generateFireSafety(config.locationId),
    vendorDocs: generateVendorDocs(config.locationId),
    correctiveActions: generateCorrectiveActions(config.locationId),
    complianceScore: (() => {
      const countySlug = extractCountySlug(FACILITY_INFO[config.locationId]?.county || 'generic');
      const locObj = locations.find(l => l.urlId === config.locationId);
      const locationItems = scoreImpactData.filter(item => item.locationId === locObj?.id);
      const jResult = calculateJurisdictionScore(locationItems, countySlug);
      return {
        overall: scores.overall,
        foodSafety: scores.foodSafety,
        fireSafety: scores.fireSafety,
        countyGrade: template.getGrade(scores.overall),
        countyScoreLabel: template.gradingSystem,
        jurisdictionScore: jResult.numericScore,
        jurisdictionGrade: jResult.grade.label,
        jurisdictionSystemType: jResult.systemType,
        jurisdictionViolationCount: jResult.violations.length,
        trend30Day: config.locationId === 'downtown' ? 4 : config.locationId === 'airport' ? -4 : 1,
        trend60Day: config.locationId === 'downtown' ? 7 : config.locationId === 'airport' ? 3 : 6,
        trend90Day: config.locationId === 'downtown' ? 7 : config.locationId === 'airport' ? 6 : 12,
      };
    })(),
    missingDocs: generateMissingDocs(config.locationId),
    selfAudit: generateSelfAudit(config.locationId),
    trendData: generateTrendData(config.locationId),
  };
}

// ── Inspector Mode ─────────────────────────────────────────

export interface InspectorVisit {
  id: string;
  locationId: string;
  locationName: string;
  startedAt: string;
  score: number;
  grade: string;
  gradeColor: string;
  reportId: string;
  notificationSent: boolean;
  qrPassportUrl: string;
}

export function startInspectorVisit(locationUrlId: string, countyTemplate: CountyTemplate = 'generic'): InspectorVisit {
  const loc = locations.find(l => l.urlId === locationUrlId) || locations[0];
  const scores = locationScores[locationUrlId] || locationScores['downtown'];
  const template = COUNTY_TEMPLATES[countyTemplate];

  const report = generateHealthDeptReport({
    locationId: locationUrlId,
    countyTemplate,
    dateRange: '30',
    sections: {
      facilityInfo: true,
      foodSafety: true,
      employeeCerts: true,
      fireSafety: true,
      vendorDocs: true,
      correctiveActions: true,
      complianceScore: true,
    },
    isPaidTier: true,
  });

  return {
    id: `VISIT-${Date.now()}`,
    locationId: locationUrlId,
    locationName: loc.name,
    startedAt: new Date().toISOString(),
    score: scores.overall,
    grade: template.getGrade(scores.overall),
    gradeColor: template.getGradeColor(scores.overall),
    reportId: report.id,
    notificationSent: true,
    qrPassportUrl: `https://evidly-app.vercel.app/passport/${locationUrlId}`,
  };
}

// ── Demo Report History ────────────────────────────────────

export function getDemoReportHistory(): ReportHistory[] {
  return [
    {
      id: 'RPT-HIST-001',
      locationId: 'downtown',
      locationName: 'Downtown Kitchen',
      reportType: 'Health Department Inspection Report',
      countyTemplate: 'generic',
      generatedAt: '2026-02-01T09:00:00Z',
      generatedBy: 'System (Monthly Auto-Report)',
      status: 'completed',
      sections: ['Facility Info', 'Food Safety', 'Employee Certs', 'Fire Safety', 'Vendor Docs', 'Corrective Actions', 'Compliance Score'],
      dateRange: 'Last 30 Days',
    },
    {
      id: 'RPT-HIST-002',
      locationId: 'airport',
      locationName: 'Airport Cafe',
      reportType: 'Health Department Inspection Report',
      countyTemplate: 'generic',
      generatedAt: '2026-02-01T09:00:00Z',
      generatedBy: 'System (Monthly Auto-Report)',
      status: 'completed',
      sections: ['Facility Info', 'Food Safety', 'Employee Certs', 'Fire Safety', 'Compliance Score'],
      dateRange: 'Last 30 Days',
    },
    {
      id: 'RPT-HIST-003',
      locationId: 'university',
      locationName: 'University Dining',
      reportType: 'Inspector Visit Report',
      countyTemplate: 'generic',
      generatedAt: '2026-01-15T14:30:00Z',
      generatedBy: 'Tom Wilson (Inspector On-Site)',
      status: 'completed',
      sections: ['Facility Info', 'Food Safety', 'Employee Certs', 'Fire Safety', 'Vendor Docs', 'Corrective Actions', 'Compliance Score'],
      dateRange: 'Last 30 Days',
      shareLink: 'https://evidly-app.vercel.app/shared/RPT-HIST-003',
      shareLinkExpiry: '2026-01-22T14:30:00Z',
    },
    {
      id: 'RPT-HIST-004',
      locationId: 'downtown',
      locationName: 'Downtown Kitchen',
      reportType: 'Quarterly Compliance Summary',
      countyTemplate: 'generic',
      generatedAt: '2026-01-01T00:00:00Z',
      generatedBy: 'System (Quarterly Auto-Report)',
      status: 'completed',
      sections: ['Facility Info', 'Compliance Score'],
      dateRange: 'Last 90 Days',
    },
  ];
}
