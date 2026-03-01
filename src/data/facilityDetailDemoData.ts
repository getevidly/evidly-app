import type { AnyStatus } from '../components/shared/FireStatusBars';

// ── Types ────────────────────────────────────────────────────

export interface ServiceHistoryEntry {
  date: string;
  description: string;
  vendor: string;
  technician?: string;
  result: 'pass' | 'fail' | 'completed';
}

export interface VendorInfo {
  name: string;
  rating: number;
  lastService: string;
  nextDue: string;
  phone?: string;
}

export interface ComplianceRequirement {
  frequency: string;
  jurisdiction: string;
  authorityReference: string;
  notes?: string;
}

export interface DocumentEntry {
  name: string;
  uploadedDate: string;
  expiryDate?: string;
  status: 'current' | 'expired' | 'missing';
}

export interface FacilityDetailData {
  category: string;
  fullName: string;
  status: AnyStatus;
  serviceHistory: ServiceHistoryEntry[];
  vendor: VendorInfo | null;
  compliance: ComplianceRequirement;
  documents: DocumentEntry[];
}

// ── Static compliance requirements per category ──────────────

const COMPLIANCE: Record<string, Omit<ComplianceRequirement, 'jurisdiction'>> = {
  Permit: { frequency: 'Annual renewal', authorityReference: 'Local Fire Code', notes: 'Operational permit required for commercial cooking' },
  Hood: { frequency: 'Semi-annual / Quarterly', authorityReference: 'NFPA 96 Chapter 11, Table 12.4', notes: 'Frequency depends on cooking volume and type' },
  Ext: { frequency: 'Annual (professional) / Monthly (visual)', authorityReference: 'NFPA 10 Section 7.3', notes: 'K-class extinguisher required within 30ft of cooking equipment' },
  Extinguisher: { frequency: 'Annual (professional) / Monthly (visual)', authorityReference: 'NFPA 10 Section 7.3', notes: 'K-class extinguisher required within 30ft of cooking equipment' },
  Ansul: { frequency: 'Semi-annual', authorityReference: 'NFPA 17A §8.3 / UL 300', notes: 'Wet chemical fire suppression system inspection' },
  Pest: { frequency: 'Monthly / Quarterly', authorityReference: 'Local Health Code', notes: 'Integrated pest management program required' },
  Grease: { frequency: 'Per schedule (25% rule)', authorityReference: 'Local Plumbing Code / FOG Ordinance', notes: 'Pump when grease layer reaches 25% of trap capacity' },
  Elevator: { frequency: 'Annual', authorityReference: 'ASME A17.1 / Local Building Code', notes: 'Required for elevators and dumbwaiters' },
  Backflow: { frequency: 'Annual', authorityReference: 'Local Water Authority / EPA', notes: 'Backflow prevention assembly testing required annually' },
};

const FULL_NAMES: Record<string, string> = {
  Permit: 'Fire / Business Permit',
  Hood: 'Hood Cleaning',
  Ext: 'Fire Extinguisher',
  Extinguisher: 'Fire Extinguisher',
  Ansul: 'Ansul / Fire Suppression',
  Pest: 'Pest Control',
  Grease: 'Grease Trap / Interceptor',
  Elevator: 'Elevator / Dumbwaiter',
  Backflow: 'Backflow Prevention',
};

const JURISDICTIONS: Record<string, string> = {
  downtown: 'City of Fresno Fire Department',
  airport: 'Merced County Fire Dept (CAL FIRE MMU)',
  university: 'Modesto Fire Department',
};

// ── Airport demo data (mixed statuses — populated) ───────────

const AIRPORT_DATA: Record<string, Omit<FacilityDetailData, 'category' | 'fullName' | 'status' | 'compliance'>> = {
  Permit: {
    serviceHistory: [
      { date: '2026-01-15', description: 'Annual fire permit renewal approved', vendor: 'Merced County Fire', result: 'pass' },
      { date: '2025-01-12', description: 'Initial operational permit issued', vendor: 'Merced County Fire', result: 'pass' },
    ],
    vendor: null,
    documents: [
      { name: 'Operational Fire Permit 2026', uploadedDate: '2026-01-15', expiryDate: '2027-01-15', status: 'current' },
      { name: 'Business License 2026', uploadedDate: '2026-01-10', expiryDate: '2026-12-31', status: 'current' },
    ],
  },
  Hood: {
    serviceHistory: [
      { date: '2025-12-10', description: 'Full hood and duct cleaning — all areas passed', vendor: 'Valley Hood Cleaning, Inc.', technician: 'Mike Torres', result: 'completed' },
      { date: '2025-06-15', description: 'Semi-annual hood cleaning', vendor: 'Valley Hood Cleaning, Inc.', technician: 'Mike Torres', result: 'completed' },
    ],
    vendor: { name: 'Valley Hood Cleaning, Inc.', rating: 5, lastService: '2025-12-10', nextDue: '2026-06-10', phone: '(209) 555-0142' },
    documents: [
      { name: 'Hood Cleaning Certificate — Dec 2025', uploadedDate: '2025-12-10', expiryDate: '2026-06-10', status: 'current' },
      { name: 'IKECA Certification — Valley Hood', uploadedDate: '2025-06-15', status: 'current' },
    ],
  },
  Ext: {
    serviceHistory: [
      { date: '2025-08-20', description: 'Annual fire extinguisher inspection — all units', vendor: 'Pacific Fire Equipment Co.', technician: 'James Reilly', result: 'pass' },
    ],
    vendor: { name: 'Pacific Fire Equipment Co.', rating: 4, lastService: '2025-08-20', nextDue: '2026-08-20', phone: '(209) 555-0198' },
    documents: [
      { name: 'Extinguisher Inspection Report — Aug 2025', uploadedDate: '2025-08-20', expiryDate: '2026-08-20', status: 'current' },
    ],
  },
  Ansul: {
    serviceHistory: [
      { date: '2025-11-05', description: 'Semi-annual Ansul system inspection — passed', vendor: 'Guardian Fire Protection', technician: 'Carlos Mendez', result: 'pass' },
      { date: '2025-05-08', description: 'Semi-annual inspection + nozzle replacement', vendor: 'Guardian Fire Protection', technician: 'Carlos Mendez', result: 'completed' },
    ],
    vendor: { name: 'Guardian Fire Protection', rating: 5, lastService: '2025-11-05', nextDue: '2026-05-05', phone: '(209) 555-0267' },
    documents: [
      { name: 'Ansul Inspection Certificate — Nov 2025', uploadedDate: '2025-11-05', expiryDate: '2026-05-05', status: 'current' },
    ],
  },
  Pest: {
    serviceHistory: [
      { date: '2026-02-01', description: 'Monthly pest inspection — no findings', vendor: 'Orkin Commercial Services', technician: 'Sarah Kim', result: 'pass' },
      { date: '2026-01-04', description: 'Monthly inspection — minor ant activity treated', vendor: 'Orkin Commercial Services', technician: 'Sarah Kim', result: 'completed' },
    ],
    vendor: { name: 'Orkin Commercial Services', rating: 4, lastService: '2026-02-01', nextDue: '2026-03-01', phone: '(209) 555-0311' },
    documents: [
      { name: 'Pest Control Log — Feb 2026', uploadedDate: '2026-02-01', status: 'current' },
    ],
  },
  Grease: {
    serviceHistory: [
      { date: '2025-11-20', description: 'Grease trap pumped — 18% capacity', vendor: 'Central Valley Grease Hauling', technician: 'David Nguyen', result: 'completed' },
    ],
    vendor: { name: 'Central Valley Grease Hauling', rating: 4, lastService: '2025-11-20', nextDue: '2026-02-20', phone: '(209) 555-0455' },
    documents: [
      { name: 'Grease Trap Manifest — Nov 2025', uploadedDate: '2025-11-20', status: 'current' },
    ],
  },
  Elevator: {
    serviceHistory: [],
    vendor: null,
    documents: [],
  },
  Backflow: {
    serviceHistory: [
      { date: '2025-09-12', description: 'Annual backflow prevention test — passed', vendor: 'Valley Backflow Testing', technician: 'Tom Bradley', result: 'pass' },
    ],
    vendor: { name: 'Valley Backflow Testing', rating: 5, lastService: '2025-09-12', nextDue: '2026-09-12', phone: '(209) 555-0533' },
    documents: [
      { name: 'Backflow Test Report — Sep 2025', uploadedDate: '2025-09-12', expiryDate: '2026-09-12', status: 'current' },
    ],
  },
};

// ── University demo data (some overdue — mixed) ──────────────

const UNIVERSITY_DATA: Record<string, Omit<FacilityDetailData, 'category' | 'fullName' | 'status' | 'compliance'>> = {
  Permit: {
    serviceHistory: [
      { date: '2025-03-20', description: 'Annual fire permit renewal', vendor: 'Modesto Fire Dept', result: 'pass' },
    ],
    vendor: null,
    documents: [
      { name: 'Operational Fire Permit 2025', uploadedDate: '2025-03-20', expiryDate: '2026-03-20', status: 'current' },
    ],
  },
  Hood: {
    serviceHistory: [
      { date: '2025-05-18', description: 'Semi-annual hood cleaning — passed', vendor: 'Valley Hood Cleaning, Inc.', technician: 'Mike Torres', result: 'completed' },
      { date: '2024-11-10', description: 'Semi-annual hood cleaning', vendor: 'Valley Hood Cleaning, Inc.', technician: 'Mike Torres', result: 'completed' },
    ],
    vendor: { name: 'Valley Hood Cleaning, Inc.', rating: 5, lastService: '2025-05-18', nextDue: '2025-11-18', phone: '(209) 555-0142' },
    documents: [
      { name: 'Hood Cleaning Certificate — May 2025', uploadedDate: '2025-05-18', expiryDate: '2025-11-18', status: 'expired' },
    ],
  },
  Ext: {
    serviceHistory: [
      { date: '2025-10-15', description: 'Annual fire extinguisher inspection — all passed', vendor: 'Pacific Fire Equipment Co.', technician: 'James Reilly', result: 'pass' },
    ],
    vendor: { name: 'Pacific Fire Equipment Co.', rating: 4, lastService: '2025-10-15', nextDue: '2026-10-15', phone: '(209) 555-0198' },
    documents: [
      { name: 'Extinguisher Inspection Report — Oct 2025', uploadedDate: '2025-10-15', expiryDate: '2026-10-15', status: 'current' },
    ],
  },
  Ansul: {
    serviceHistory: [
      { date: '2025-09-22', description: 'Semi-annual Ansul inspection — passed', vendor: 'Guardian Fire Protection', technician: 'Carlos Mendez', result: 'pass' },
    ],
    vendor: { name: 'Guardian Fire Protection', rating: 5, lastService: '2025-09-22', nextDue: '2026-03-22', phone: '(209) 555-0267' },
    documents: [
      { name: 'Ansul Inspection Certificate — Sep 2025', uploadedDate: '2025-09-22', expiryDate: '2026-03-22', status: 'current' },
    ],
  },
  Pest: {
    serviceHistory: [
      { date: '2025-10-05', description: 'Monthly pest inspection — rodent activity found in storage', vendor: 'Orkin Commercial Services', technician: 'Sarah Kim', result: 'fail' },
      { date: '2025-09-03', description: 'Monthly pest inspection — no findings', vendor: 'Orkin Commercial Services', technician: 'Sarah Kim', result: 'pass' },
    ],
    vendor: { name: 'Orkin Commercial Services', rating: 3, lastService: '2025-10-05', nextDue: '2025-11-05', phone: '(209) 555-0311' },
    documents: [
      { name: 'Pest Control Log — Oct 2025', uploadedDate: '2025-10-05', status: 'current' },
      { name: 'Corrective Action — Rodent Bait Stations', uploadedDate: '2025-10-06', status: 'current' },
    ],
  },
  Grease: {
    serviceHistory: [
      { date: '2025-12-08', description: 'Grease trap pumped — 22% capacity', vendor: 'Central Valley Grease Hauling', technician: 'David Nguyen', result: 'completed' },
    ],
    vendor: { name: 'Central Valley Grease Hauling', rating: 4, lastService: '2025-12-08', nextDue: '2026-03-08', phone: '(209) 555-0455' },
    documents: [
      { name: 'Grease Trap Manifest — Dec 2025', uploadedDate: '2025-12-08', status: 'current' },
    ],
  },
  Elevator: {
    serviceHistory: [],
    vendor: null,
    documents: [],
  },
  Backflow: {
    serviceHistory: [
      { date: '2024-11-30', description: 'Annual backflow test — passed', vendor: 'Valley Backflow Testing', technician: 'Tom Bradley', result: 'pass' },
    ],
    vendor: { name: 'Valley Backflow Testing', rating: 5, lastService: '2024-11-30', nextDue: '2025-11-30', phone: '(209) 555-0533' },
    documents: [
      { name: 'Backflow Test Report — Nov 2024', uploadedDate: '2024-11-30', expiryDate: '2025-11-30', status: 'expired' },
    ],
  },
};

// ── Lookup per location ──────────────────────────────────────

const DATA_BY_LOCATION: Record<string, Record<string, Omit<FacilityDetailData, 'category' | 'fullName' | 'status' | 'compliance'>>> = {
  'demo-loc-airport': AIRPORT_DATA,
  'demo-loc-university': UNIVERSITY_DATA,
};

// ── Public API ───────────────────────────────────────────────

// Normalize label variations for data lookup
const ALIASES: Record<string, string> = { Extinguisher: 'Ext' };

export function getFacilityDetail(
  locationId: string,
  category: string,
  status: AnyStatus,
): FacilityDetailData {
  const dataKey = ALIASES[category] || category;
  const locKey = locationId.replace('demo-loc-', '');
  const jurisdiction = JURISDICTIONS[locKey] || 'Local Fire Authority';
  const complianceBase = COMPLIANCE[category] || COMPLIANCE[dataKey] || { frequency: 'Per schedule', authorityReference: 'Local Code' };

  const locationData = DATA_BY_LOCATION[locationId]?.[dataKey];

  return {
    category,
    fullName: FULL_NAMES[category] || category,
    status,
    serviceHistory: locationData?.serviceHistory ?? [],
    vendor: locationData?.vendor ?? null,
    compliance: { ...complianceBase, jurisdiction },
    documents: locationData?.documents ?? [],
  };
}
