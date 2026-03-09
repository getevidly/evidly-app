// ── Workforce Risk Demo Data (CIC Pillar 5) ─────────────────────────────
// Signals, employee certs, and PSE safeguard sample data for Workforce Risk page.
// Aligned with trainingRecordsDemoData.ts employees (d1-d9) and 3 demo locations.

// ── Types ────────────────────────────────────────────────────────────────

export type WorkforceSignalType =
  | 'food_handler_cert_expired'
  | 'food_handler_cert_expiring_soon'
  | 'cfpm_cert_expired'
  | 'cfpm_cert_expiring_soon'
  | 'training_incomplete'
  | 'role_cert_gap'
  | 'fire_safety_training_missing'
  | 'fire_extinguisher_training_missing'
  | 'high_turnover_flag';

export interface WorkforceSignal {
  id: string;
  locationId: string;
  locationName: string;
  signalType: WorkforceSignalType;
  label: string;
  affectedCount: number;
  details: string;
  employeeName?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  resolvedAt: string | null;
}

export interface EmployeeCert {
  id: string;
  locationId: string;
  locationName: string;
  employeeName: string;
  certType: 'food_handler' | 'cfpm' | 'fire_safety' | 'fire_extinguisher' | 'haccp' | 'allergen_awareness' | 'other';
  certTypeLabel: string;
  certNumber: string | null;
  issuedDate: string;
  expirationDate: string | null;
  issuingBody: string;
  status: 'current' | 'expiring_soon' | 'expired';
}

export const SIGNAL_TYPE_LABELS: Record<WorkforceSignalType, string> = {
  food_handler_cert_expired: 'Food Handler Cert Expired',
  food_handler_cert_expiring_soon: 'Food Handler Cert Expiring (30 days)',
  cfpm_cert_expired: 'Food Manager (CFPM) Cert Expired',
  cfpm_cert_expiring_soon: 'Food Manager Cert Expiring (30 days)',
  training_incomplete: 'Required Training Incomplete',
  role_cert_gap: 'Staff Certification Gap Detected',
  fire_safety_training_missing: 'Fire Safety Training Not Documented',
  fire_extinguisher_training_missing: 'Fire Extinguisher Training Not Documented',
  high_turnover_flag: 'High Staff Turnover — Cert Review Recommended',
};

// ── Demo Workforce Signals ──────────────────────────────────────────────

export const DEMO_WORKFORCE_SIGNALS: WorkforceSignal[] = [
  {
    id: 'ws-1',
    locationId: 'downtown',
    locationName: 'Location 1',
    signalType: 'cfpm_cert_expiring_soon',
    label: 'Food Manager Cert Expiring (30 days)',
    affectedCount: 1,
    details: 'Sofia Chen — CFPM certification expires April 2, 2026. Schedule renewal exam.',
    employeeName: 'Sofia Chen',
    severity: 'high',
    createdAt: '2026-03-01T09:00:00Z',
    resolvedAt: null,
  },
  {
    id: 'ws-2',
    locationId: 'airport',
    locationName: 'Location 2',
    signalType: 'food_handler_cert_expired',
    label: 'Food Handler Cert Expired',
    affectedCount: 2,
    details: '2 kitchen staff members have expired food handler cards. Violation risk under CalCode §113948.',
    severity: 'critical',
    createdAt: '2026-02-28T14:30:00Z',
    resolvedAt: null,
  },
  {
    id: 'ws-3',
    locationId: 'airport',
    locationName: 'Location 2',
    signalType: 'fire_safety_training_missing',
    label: 'Fire Safety Training Not Documented',
    affectedCount: 3,
    details: '3 staff members have no documented fire safety training. Required for NFPA 96 compliance.',
    severity: 'high',
    createdAt: '2026-02-25T11:00:00Z',
    resolvedAt: null,
  },
  {
    id: 'ws-4',
    locationId: 'university',
    locationName: 'Location 3',
    signalType: 'role_cert_gap',
    label: 'Staff Certification Gap Detected',
    affectedCount: 1,
    details: 'No certified food protection manager (CFPM) on file for Location 3. CalCode §113947.1 requires at least one.',
    severity: 'critical',
    createdAt: '2026-02-20T08:15:00Z',
    resolvedAt: null,
  },
  {
    id: 'ws-5',
    locationId: 'university',
    locationName: 'Location 3',
    signalType: 'fire_extinguisher_training_missing',
    label: 'Fire Extinguisher Training Not Documented',
    affectedCount: 4,
    details: '4 staff members have no documented fire extinguisher training. Annual training recommended per OSHA 1910.157.',
    severity: 'medium',
    createdAt: '2026-02-18T16:45:00Z',
    resolvedAt: null,
  },
  {
    id: 'ws-6',
    locationId: 'downtown',
    locationName: 'Location 1',
    signalType: 'training_incomplete',
    label: 'Required Training Incomplete',
    affectedCount: 1,
    details: 'Ana Martinez — allergen awareness training assigned Jan 15, still not completed.',
    employeeName: 'Ana Martinez',
    severity: 'medium',
    createdAt: '2026-02-15T10:00:00Z',
    resolvedAt: null,
  },
  {
    id: 'ws-7',
    locationId: 'airport',
    locationName: 'Location 2',
    signalType: 'high_turnover_flag',
    label: 'High Staff Turnover — Cert Review Recommended',
    affectedCount: 5,
    details: '5 staff changes in 90 days. Recommend audit of all active certifications at this location.',
    severity: 'medium',
    createdAt: '2026-02-10T13:00:00Z',
    resolvedAt: null,
  },
];

// ── Demo Employee Certifications ────────────────────────────────────────

export const DEMO_EMPLOYEE_CERTS: EmployeeCert[] = [
  {
    id: 'ec-1', locationId: 'downtown', locationName: 'Location 1',
    employeeName: 'Maria Rodriguez', certType: 'cfpm', certTypeLabel: 'Food Protection Manager (CFPM)',
    certNumber: 'FPM-2024-8821', issuedDate: '2024-05-15', expirationDate: '2029-05-15',
    issuingBody: 'National Registry of Food Safety Professionals', status: 'current',
  },
  {
    id: 'ec-2', locationId: 'downtown', locationName: 'Location 1',
    employeeName: 'Sofia Chen', certType: 'cfpm', certTypeLabel: 'Food Protection Manager (CFPM)',
    certNumber: 'FPM-2023-4410', issuedDate: '2023-04-02', expirationDate: '2026-04-02',
    issuingBody: 'ServSafe', status: 'expiring_soon',
  },
  {
    id: 'ec-3', locationId: 'downtown', locationName: 'Location 1',
    employeeName: 'Ana Martinez', certType: 'food_handler', certTypeLabel: 'Food Handler Card',
    certNumber: null, issuedDate: '2024-11-20', expirationDate: '2027-11-20',
    issuingBody: 'CA Food Handler Card Program', status: 'current',
  },
  {
    id: 'ec-4', locationId: 'airport', locationName: 'Location 2',
    employeeName: 'James Park', certType: 'cfpm', certTypeLabel: 'Food Protection Manager (CFPM)',
    certNumber: 'FPM-2024-1190', issuedDate: '2024-08-10', expirationDate: '2029-08-10',
    issuingBody: 'ServSafe', status: 'current',
  },
  {
    id: 'ec-5', locationId: 'airport', locationName: 'Location 2',
    employeeName: 'Carlos Reyes', certType: 'food_handler', certTypeLabel: 'Food Handler Card',
    certNumber: null, issuedDate: '2023-01-15', expirationDate: '2026-01-15',
    issuingBody: 'CA Food Handler Card Program', status: 'expired',
  },
  {
    id: 'ec-6', locationId: 'airport', locationName: 'Location 2',
    employeeName: 'Lisa Kim', certType: 'food_handler', certTypeLabel: 'Food Handler Card',
    certNumber: null, issuedDate: '2023-03-01', expirationDate: '2026-03-01',
    issuingBody: 'CA Food Handler Card Program', status: 'expired',
  },
  {
    id: 'ec-7', locationId: 'airport', locationName: 'Location 2',
    employeeName: 'James Park', certType: 'fire_safety', certTypeLabel: 'Fire Safety Training',
    certNumber: null, issuedDate: '2025-06-01', expirationDate: '2026-06-01',
    issuingBody: 'National Fire Protection Association', status: 'current',
  },
  {
    id: 'ec-8', locationId: 'university', locationName: 'Location 3',
    employeeName: 'David Nguyen', certType: 'food_handler', certTypeLabel: 'Food Handler Card',
    certNumber: null, issuedDate: '2025-01-10', expirationDate: '2028-01-10',
    issuingBody: 'CA Food Handler Card Program', status: 'current',
  },
  {
    id: 'ec-9', locationId: 'university', locationName: 'Location 3',
    employeeName: 'Michael Torres', certType: 'fire_extinguisher', certTypeLabel: 'Fire Extinguisher Training',
    certNumber: null, issuedDate: '2024-09-15', expirationDate: '2025-09-15',
    issuingBody: 'OSHA Compliant Provider', status: 'expired',
  },
];

// ── PSE Sample Safeguards (Guided Tour only — not production) ───────────

export interface PSESafeguard {
  label: string;
  standard: string;
  authority: string;
  vendor: string | null;
  cert: string | null;
  lastService: string | null;
  nextDue: string | null;
  interval: string;
  status: 'current' | 'expiring' | 'overdue' | 'unverified';
}

export const SAMPLE_PSE_SAFEGUARDS: PSESafeguard[] = [
  {
    label: 'Hood & Exhaust Cleaning',
    standard: 'NFPA 96-2024 \u00B7 Table 12.4',
    authority: 'AHJ (Fire)',
    vendor: 'Cleaning Pros Plus',
    cert: 'IKECA CECS #CPP-2024-0042',
    lastService: 'January 14, 2026',
    nextDue: 'April 14, 2026',
    interval: 'Quarterly \u2014 high volume fryer',
    status: 'current',
  },
  {
    label: 'Fire Suppression System',
    standard: 'NFPA 96 \u00B7 Semi-annual + Annual',
    authority: 'AHJ (Fire)',
    vendor: 'Pacific Fire Protection',
    cert: 'CA C-16 #892441',
    lastService: 'October 3, 2025',
    nextDue: 'April 3, 2026',
    interval: 'Semi-annual',
    status: 'expiring',
  },
  {
    label: 'Fire Alarm & Detection',
    standard: 'NFPA 72 \u00B7 Annual',
    authority: 'AHJ (Fire)',
    vendor: 'Valley Alarm Systems',
    cert: 'CA C-10 #441892',
    lastService: 'March 10, 2025',
    nextDue: 'March 10, 2026',
    interval: 'Annual',
    status: 'overdue',
  },
  {
    label: 'Sprinkler System',
    standard: 'NFPA 25 \u00B7 Annual',
    authority: 'AHJ (Fire)',
    vendor: null,
    cert: null,
    lastService: null,
    nextDue: null,
    interval: 'Annual',
    status: 'unverified',
  },
];
