/**
 * EMPLOYEES-1 — Employee Types, Demo Data & Helpers
 *
 * 9 demo employees (d1-d9) aligned with Team.tsx + timecardsDemoData.ts.
 */

// ── Types ─────────────────────────────────────────────────────

export type EmployeeRole = 'owner' | 'admin' | 'supervisor' | 'technician' | 'office';
export type EmployeeStatus = 'active' | 'pending' | 'inactive' | 'terminated';
export type ClockState = 'clocked_in' | 'on_job' | 'off';
export type CertStatus = 'active' | 'expiring' | 'expired';

export interface EmployeeCert {
  id: string;
  employeeId: string;
  certType: string;
  certName: string;
  certNumber: string;
  issuedDate: string;
  expiryDate: string;
  status: CertStatus;
  documentUrl: string | null;
}

export interface PerformanceMetrics {
  jobsAllTime: number;
  jobsThisMonth: number;
  avgQaScore: number;
  deficienciesDocumented: number;
  customerCompliments: number;
  onTimeRate: number;
  pointsEarned: number;
  leaderboardPosition: number;
  achievements: { id: string; name: string; earnedDate: string }[];
  weeklyJobs: number[];       // last 8 weeks
  weeklyQaScores: number[];   // last 8 weeks
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  avatarUrl: string | null;
  locationId: string;
  locationName: string;
  hireDate: string;
  hourlyRate: number;
  serviceTypes: string[];
  lastLogin: string | null;
  clockState: ClockState;
  clockSince: string | null;
  jobLocation: string | null;
  hoursThisWeek: number;
  jobsAssignedThisWeek: number;
  certifications: EmployeeCert[];
  performance: PerformanceMetrics;
}

// ── Role Config ───────────────────────────────────────────────

export const ROLE_CONFIG: Record<EmployeeRole, { label: string; color: string; bg: string }> = {
  owner:      { label: 'Owner',      color: '#7c3aed', bg: '#f5f3ff' },
  admin:      { label: 'Admin',      color: '#4f46e5', bg: '#eef2ff' },
  supervisor: { label: 'Supervisor', color: '#1e4d6b', bg: '#eff6ff' },
  technician: { label: 'Technician', color: '#16a34a', bg: '#f0fdf4' },
  office:     { label: 'Office',     color: '#0d9488', bg: '#f0fdfa' },
};

export const STATUS_CONFIG: Record<EmployeeStatus, { label: string; color: string; bg: string }> = {
  active:     { label: 'Active',         color: '#16a34a', bg: '#f0fdf4' },
  pending:    { label: 'Pending Invite', color: '#d97706', bg: '#fffbeb' },
  inactive:   { label: 'Inactive',       color: '#6b7280', bg: '#f3f4f6' },
  terminated: { label: 'Terminated',     color: '#dc2626', bg: '#fef2f2' },
};

export const CLOCK_STATE_CONFIG: Record<ClockState, { label: string; color: string }> = {
  clocked_in: { label: 'Clocked In', color: '#16a34a' },
  on_job:     { label: 'On Job',     color: '#2563eb' },
  off:        { label: 'Off',        color: '#9ca3af' },
};

export const CERT_STATUS_CONFIG: Record<CertStatus, { label: string; color: string; bg: string }> = {
  active:   { label: 'Active',        color: '#16a34a', bg: '#f0fdf4' },
  expiring: { label: 'Expiring Soon', color: '#d97706', bg: '#fffbeb' },
  expired:  { label: 'Expired',       color: '#dc2626', bg: '#fef2f2' },
};

export const CERT_TYPES = [
  'IKECA Certified',
  'NFPA 96 Compliant',
  'OSHA 10-Hour',
  'OSHA 30-Hour',
  'Food Handler',
  'ServSafe Manager',
  'EPA Lead-Safe',
  'Fire Extinguisher Tech',
  'Grease Trap Cert',
  'First Aid / CPR',
];

export const SERVICE_TYPES = [
  'Hood Cleaning',
  'Grease Trap',
  'Fire Suppression',
  'HVAC',
  'General Maintenance',
  'Pest Control',
  'Equipment Repair',
  'Deep Cleaning',
];

// ── Date helpers ──────────────────────────────────────────────

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  return daysFromNow(-days);
}

function getCertStatus(expiryDate: string): CertStatus {
  const now = new Date();
  const exp = new Date(expiryDate + 'T00:00:00');
  const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'expired';
  if (diff <= 30) return 'expiring';
  return 'active';
}

// ── Demo Certifications ───────────────────────────────────────

function makeCerts(employeeId: string, items: { type: string; name: string; num: string; issued: string; expiry: string }[]): EmployeeCert[] {
  return items.map((c, i) => ({
    id: `cert-${employeeId}-${i + 1}`,
    employeeId,
    certType: c.type,
    certName: c.name,
    certNumber: c.num,
    issuedDate: c.issued,
    expiryDate: c.expiry,
    status: getCertStatus(c.expiry),
    documentUrl: null,
  }));
}

// ── Demo Performance ──────────────────────────────────────────

function makePerf(overrides: Partial<PerformanceMetrics> & { jobsAllTime: number; avgQaScore: number }): PerformanceMetrics {
  return {
    jobsThisMonth: Math.floor(overrides.jobsAllTime / 24),
    deficienciesDocumented: Math.floor(overrides.jobsAllTime * 0.08),
    customerCompliments: Math.floor(overrides.jobsAllTime * 0.05),
    onTimeRate: 92,
    pointsEarned: overrides.jobsAllTime * 12,
    leaderboardPosition: 5,
    achievements: [],
    weeklyJobs: [4, 5, 3, 6, 5, 4, 5, 4],
    weeklyQaScores: [88, 90, 87, 92, 91, 89, 93, 90],
    ...overrides,
  };
}

// ── Demo Employees (d1-d9 aligned with Team.tsx) ──────────────

export const DEMO_EMPLOYEES: Employee[] = [
  {
    id: 'd1', firstName: 'Marcus', lastName: 'Johnson', name: 'Marcus Johnson',
    email: 'marcus@hoodops.com', phone: '(559) 555-0101',
    role: 'owner', status: 'active', avatarUrl: null,
    locationId: 'downtown', locationName: 'Downtown Kitchen',
    hireDate: '2021-03-15', hourlyRate: 0, serviceTypes: ['Hood Cleaning', 'Fire Suppression', 'Grease Trap'],
    lastLogin: daysAgo(0) + 'T08:15:00Z', clockState: 'off', clockSince: null, jobLocation: null,
    hoursThisWeek: 32, jobsAssignedThisWeek: 0,
    certifications: makeCerts('d1', [
      { type: 'IKECA Certified', name: 'IKECA Master Technician', num: 'IK-2024-0891', issued: daysAgo(400), expiry: daysFromNow(235) },
      { type: 'OSHA 30-Hour', name: 'OSHA 30-Hour Construction', num: 'OSHA-30-44210', issued: daysAgo(300), expiry: daysFromNow(65) },
    ]),
    performance: makePerf({ jobsAllTime: 847, avgQaScore: 96, leaderboardPosition: 1, pointsEarned: 12400, onTimeRate: 98,
      achievements: [
        { id: 'a1', name: '500 Jobs Completed', earnedDate: daysAgo(120) },
        { id: 'a2', name: 'Perfect Month', earnedDate: daysAgo(30) },
        { id: 'a3', name: 'Safety Champion', earnedDate: daysAgo(60) },
      ],
      weeklyJobs: [0, 0, 0, 0, 0, 0, 0, 0],
      weeklyQaScores: [96, 97, 95, 98, 96, 97, 96, 98],
    }),
  },
  {
    id: 'd2', firstName: 'Sofia', lastName: 'Chen', name: 'Sofia Chen',
    email: 'sofia@hoodops.com', phone: '(559) 555-0102',
    role: 'admin', status: 'active', avatarUrl: null,
    locationId: 'downtown', locationName: 'Downtown Kitchen',
    hireDate: '2022-01-10', hourlyRate: 35, serviceTypes: ['Hood Cleaning', 'Grease Trap', 'HVAC'],
    lastLogin: daysAgo(0) + 'T07:45:00Z', clockState: 'clocked_in', clockSince: new Date().toISOString().replace(/T.*/, 'T07:00:00Z'), jobLocation: null,
    hoursThisWeek: 28, jobsAssignedThisWeek: 3,
    certifications: makeCerts('d2', [
      { type: 'IKECA Certified', name: 'IKECA Certified Technician', num: 'IK-2023-1204', issued: daysAgo(500), expiry: daysFromNow(130) },
      { type: 'OSHA 10-Hour', name: 'OSHA 10-Hour General', num: 'OSHA-10-55321', issued: daysAgo(200), expiry: daysFromNow(165) },
      { type: 'ServSafe Manager', name: 'ServSafe Manager Certification', num: 'SS-887421', issued: daysAgo(100), expiry: daysFromNow(265) },
    ]),
    performance: makePerf({ jobsAllTime: 612, avgQaScore: 94, leaderboardPosition: 2, pointsEarned: 9200, onTimeRate: 97,
      achievements: [
        { id: 'a4', name: '500 Jobs Completed', earnedDate: daysAgo(45) },
        { id: 'a5', name: 'Quality Star', earnedDate: daysAgo(15) },
      ],
      weeklyJobs: [5, 4, 6, 5, 4, 5, 6, 5],
      weeklyQaScores: [93, 95, 92, 96, 94, 93, 95, 94],
    }),
  },
  {
    id: 'd3', firstName: 'David', lastName: 'Kim', name: 'David Kim',
    email: 'david@hoodops.com', phone: '(559) 555-0103',
    role: 'supervisor', status: 'active', avatarUrl: null,
    locationId: 'airport', locationName: 'Airport Concourse B',
    hireDate: '2022-06-01', hourlyRate: 32, serviceTypes: ['Hood Cleaning', 'Fire Suppression'],
    lastLogin: daysAgo(0) + 'T08:30:00Z', clockState: 'on_job', clockSince: new Date().toISOString().replace(/T.*/, 'T09:00:00Z'), jobLocation: 'Airport Terminal B - Gate 12',
    hoursThisWeek: 34, jobsAssignedThisWeek: 4,
    certifications: makeCerts('d3', [
      { type: 'IKECA Certified', name: 'IKECA Certified Technician', num: 'IK-2023-0776', issued: daysAgo(450), expiry: daysFromNow(15) }, // expiring soon!
      { type: 'NFPA 96 Compliant', name: 'NFPA 96 Compliance', num: 'NFPA-96-2290', issued: daysAgo(180), expiry: daysFromNow(185) },
      { type: 'First Aid / CPR', name: 'First Aid / CPR', num: 'CPR-2024-8812', issued: daysAgo(90), expiry: daysFromNow(275) },
    ]),
    performance: makePerf({ jobsAllTime: 423, avgQaScore: 91, leaderboardPosition: 3, pointsEarned: 6800,
      achievements: [
        { id: 'a6', name: '400 Jobs Completed', earnedDate: daysAgo(10) },
      ],
      weeklyJobs: [6, 5, 7, 6, 5, 6, 5, 6],
      weeklyQaScores: [90, 91, 88, 93, 92, 90, 91, 92],
    }),
  },
  {
    id: 'd4', firstName: 'Ana', lastName: 'Torres', name: 'Ana Torres',
    email: 'ana@hoodops.com', phone: '(559) 555-0104',
    role: 'technician', status: 'active', avatarUrl: null,
    locationId: 'downtown', locationName: 'Downtown Kitchen',
    hireDate: '2023-02-20', hourlyRate: 26, serviceTypes: ['Hood Cleaning', 'Deep Cleaning'],
    lastLogin: daysAgo(0) + 'T06:00:00Z', clockState: 'clocked_in', clockSince: new Date().toISOString().replace(/T.*/, 'T06:00:00Z'), jobLocation: null,
    hoursThisWeek: 24, jobsAssignedThisWeek: 5,
    certifications: makeCerts('d4', [
      { type: 'OSHA 10-Hour', name: 'OSHA 10-Hour General', num: 'OSHA-10-66102', issued: daysAgo(300), expiry: daysAgo(5) }, // expired!
      { type: 'Food Handler', name: 'CA Food Handler Card', num: 'FH-CA-88210', issued: daysAgo(350), expiry: daysFromNow(15) },
    ]),
    performance: makePerf({ jobsAllTime: 289, avgQaScore: 88, leaderboardPosition: 5, pointsEarned: 4200, onTimeRate: 90,
      weeklyJobs: [5, 6, 4, 5, 6, 5, 4, 5],
      weeklyQaScores: [87, 89, 86, 90, 88, 87, 89, 88],
    }),
  },
  {
    id: 'd5', firstName: 'Lisa', lastName: 'Nguyen', name: 'Lisa Nguyen',
    email: 'lisa@hoodops.com', phone: '(559) 555-0105',
    role: 'technician', status: 'active', avatarUrl: null,
    locationId: 'airport', locationName: 'Airport Concourse B',
    hireDate: '2023-04-10', hourlyRate: 25, serviceTypes: ['Hood Cleaning', 'Grease Trap', 'Equipment Repair'],
    lastLogin: daysAgo(1) + 'T16:00:00Z', clockState: 'off', clockSince: null, jobLocation: null,
    hoursThisWeek: 30, jobsAssignedThisWeek: 4,
    certifications: makeCerts('d5', [
      { type: 'IKECA Certified', name: 'IKECA Certified Technician', num: 'IK-2024-1105', issued: daysAgo(150), expiry: daysFromNow(215) },
      { type: 'Grease Trap Cert', name: 'Grease Trap Service Cert', num: 'GT-2024-3301', issued: daysAgo(100), expiry: daysFromNow(265) },
    ]),
    performance: makePerf({ jobsAllTime: 198, avgQaScore: 90, leaderboardPosition: 4, pointsEarned: 3100, onTimeRate: 94,
      weeklyJobs: [4, 5, 4, 5, 4, 5, 4, 5],
      weeklyQaScores: [89, 91, 88, 92, 90, 89, 91, 90],
    }),
  },
  {
    id: 'd6', firstName: 'Michael', lastName: 'Torres', name: 'Michael Torres',
    email: 'michael@hoodops.com', phone: '(559) 555-0106',
    role: 'technician', status: 'active', avatarUrl: null,
    locationId: 'university', locationName: 'University Dining Hall',
    hireDate: '2023-08-15', hourlyRate: 24, serviceTypes: ['Hood Cleaning', 'General Maintenance'],
    lastLogin: daysAgo(0) + 'T07:10:00Z', clockState: 'clocked_in', clockSince: new Date().toISOString().replace(/T.*/, 'T07:00:00Z'), jobLocation: null,
    hoursThisWeek: 26, jobsAssignedThisWeek: 5,
    certifications: makeCerts('d6', [
      { type: 'OSHA 10-Hour', name: 'OSHA 10-Hour General', num: 'OSHA-10-77403', issued: daysAgo(60), expiry: daysFromNow(305) },
    ]),
    performance: makePerf({ jobsAllTime: 134, avgQaScore: 86, leaderboardPosition: 7, pointsEarned: 1800, onTimeRate: 88,
      weeklyJobs: [4, 3, 5, 4, 3, 4, 5, 4],
      weeklyQaScores: [85, 87, 84, 88, 86, 85, 87, 86],
    }),
  },
  {
    id: 'd7', firstName: 'James', lastName: 'Park', name: 'James Park',
    email: 'james@hoodops.com', phone: '(559) 555-0107',
    role: 'technician', status: 'active', avatarUrl: null,
    locationId: 'university', locationName: 'University Dining Hall',
    hireDate: '2023-11-01', hourlyRate: 23, serviceTypes: ['Hood Cleaning', 'Pest Control'],
    lastLogin: daysAgo(0) + 'T08:00:00Z', clockState: 'off', clockSince: null, jobLocation: null,
    hoursThisWeek: 22, jobsAssignedThisWeek: 3,
    certifications: makeCerts('d7', [
      { type: 'EPA Lead-Safe', name: 'EPA Lead-Safe Renovator', num: 'EPA-LS-9901', issued: daysAgo(30), expiry: daysFromNow(335) },
      { type: 'OSHA 10-Hour', name: 'OSHA 10-Hour General', num: 'OSHA-10-88501', issued: daysAgo(45), expiry: daysFromNow(320) },
    ]),
    performance: makePerf({ jobsAllTime: 87, avgQaScore: 85, leaderboardPosition: 8, pointsEarned: 1100, onTimeRate: 86,
      weeklyJobs: [3, 4, 3, 4, 3, 3, 4, 3],
      weeklyQaScores: [84, 86, 83, 87, 85, 84, 86, 85],
    }),
  },
  {
    id: 'd8', firstName: 'Rachel', lastName: 'Green', name: 'Rachel Green',
    email: 'rachel@hoodops.com', phone: '(559) 555-0108',
    role: 'office', status: 'active', avatarUrl: null,
    locationId: 'downtown', locationName: 'Downtown Kitchen',
    hireDate: '2024-01-15', hourlyRate: 22, serviceTypes: [],
    lastLogin: daysAgo(0) + 'T08:30:00Z', clockState: 'clocked_in', clockSince: new Date().toISOString().replace(/T.*/, 'T08:30:00Z'), jobLocation: null,
    hoursThisWeek: 30, jobsAssignedThisWeek: 0,
    certifications: makeCerts('d8', [
      { type: 'First Aid / CPR', name: 'First Aid / CPR', num: 'CPR-2024-1120', issued: daysAgo(60), expiry: daysFromNow(305) },
    ]),
    performance: makePerf({ jobsAllTime: 0, avgQaScore: 0, leaderboardPosition: 9, pointsEarned: 400, onTimeRate: 95,
      weeklyJobs: [0, 0, 0, 0, 0, 0, 0, 0],
      weeklyQaScores: [],
    }),
  },
  {
    id: 'd9', firstName: 'Carlos', lastName: 'Mendez', name: 'Carlos Mendez',
    email: 'carlos@hoodops.com', phone: '(559) 555-0109',
    role: 'technician', status: 'pending', avatarUrl: null,
    locationId: 'airport', locationName: 'Airport Concourse B',
    hireDate: daysAgo(3), hourlyRate: 24, serviceTypes: ['Hood Cleaning'],
    lastLogin: null, clockState: 'off', clockSince: null, jobLocation: null,
    hoursThisWeek: 0, jobsAssignedThisWeek: 0,
    certifications: [],
    performance: makePerf({ jobsAllTime: 0, avgQaScore: 0, leaderboardPosition: 9, pointsEarned: 0, onTimeRate: 0,
      weeklyJobs: [0, 0, 0, 0, 0, 0, 0, 0],
      weeklyQaScores: [],
    }),
  },
];

// ── Helpers ───────────────────────────────────────────────────

export function getEmployeeById(id: string): Employee | undefined {
  return DEMO_EMPLOYEES.find(e => e.id === id);
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getStats() {
  const total = DEMO_EMPLOYEES.length;
  const active = DEMO_EMPLOYEES.filter(e => e.status === 'active').length;
  const technicians = DEMO_EMPLOYEES.filter(e => e.role === 'technician').length;
  const clockedIn = DEMO_EMPLOYEES.filter(e => e.clockState !== 'off').length;
  return { total, active, technicians, clockedIn };
}

export function hasExpiringCerts(employee: Employee): boolean {
  return employee.certifications.some(c => c.status === 'expiring' || c.status === 'expired');
}

export function formatDate(iso: string): string {
  return new Date(iso + (iso.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
