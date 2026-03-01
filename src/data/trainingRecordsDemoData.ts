// ── Training Records Demo Data ─────────────────────────────────────────
// Employee-centric training & certification data for /dashboard/training
// Aligned with Team.tsx DEMO_MEMBERS (d1-d9) and EmployeeCertDetail.tsx

import { certificationRequirements, trainingCourses, type CertificationRequirement } from './demoData';

// ── Types ───────────────────────────────────────────────────────────────

export type TrainingStatus = 'current' | 'coming_due' | 'needs_renewal';

export interface TrainingEmployeeCert {
  id: string;
  type: string;
  name: string;
  number: string | null;
  authority: string;
  issued: string;
  expires: string | null;
  documentUrl: string | null;
}

export interface InternalTrainingRecord {
  id: string;
  courseId: string;
  courseTitle: string;
  category: string;
  status: 'completed' | 'in_progress' | 'not_started' | 'overdue';
  assignedBy: string;
  enrolledAt: string;
  completedAt: string | null;
  score: number | null;
  progressPercent: number;
}

export interface TrainingHistoryEntry {
  id: string;
  date: string;
  action: string;
  details: string;
  recordedBy: string;
}

export interface TrainingEmployee {
  id: string;
  name: string;
  role: string;
  appRole: string;
  email: string;
  locationId: string;
  locationName: string;
  hireDate: string;
  avatarUrl: string | null;
  certifications: TrainingEmployeeCert[];
  internalTraining: InternalTrainingRecord[];
  trainingHistory: TrainingHistoryEntry[];
}

// ── Demo Employees ──────────────────────────────────────────────────────

export const TRAINING_EMPLOYEES: TrainingEmployee[] = [
  {
    id: 'd1', name: 'Marcus Johnson', role: 'Admin', appRole: 'owner_operator',
    email: 'marcus@pacificcoast.com', locationId: '1', locationName: 'Downtown Kitchen',
    hireDate: '2024-01-15', avatarUrl: null,
    certifications: [
      { id: 'tc-1', type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2025-4481', authority: 'ANSI-accredited provider', issued: '2025-06-15', expires: '2028-06-15', documentUrl: null },
      { id: 'tc-2', type: 'cfpm', name: 'ServSafe Food Protection Manager', number: 'SM-2025-7721', authority: 'National Restaurant Association', issued: '2025-03-10', expires: '2030-03-10', documentUrl: null },
      { id: 'tc-3', type: 'haccp_training', name: 'HACCP Principles Training', number: 'HACCP-2025-102', authority: 'International HACCP Alliance', issued: '2025-05-20', expires: null, documentUrl: null },
      { id: 'tc-4', type: 'fire_extinguisher_training', name: 'Fire Extinguisher Training', number: null, authority: 'OSHA / Local Fire Dept', issued: '2025-11-15', expires: '2026-11-15', documentUrl: null },
    ],
    internalTraining: [
      { id: 'it-1', courseId: 'course-1', courseTitle: 'Food Handler Essentials', category: 'food_safety_handler', status: 'completed', assignedBy: 'System', enrolledAt: '2024-02-01', completedAt: '2024-02-15', score: 96, progressPercent: 100 },
      { id: 'it-2', courseId: 'course-2', courseTitle: 'ServSafe Manager Prep', category: 'food_safety_manager', status: 'completed', assignedBy: 'System', enrolledAt: '2024-03-01', completedAt: '2024-04-10', score: 92, progressPercent: 100 },
      { id: 'it-3', courseId: 'course-3', courseTitle: 'Facility Safety Fundamentals', category: 'facility_safety', status: 'completed', assignedBy: 'System', enrolledAt: '2025-01-10', completedAt: '2025-02-05', score: 88, progressPercent: 100 },
      { id: 'it-4', courseId: 'course-4', courseTitle: 'Compliance Operations', category: 'compliance_ops', status: 'completed', assignedBy: 'System', enrolledAt: '2025-06-01', completedAt: '2025-06-20', score: 94, progressPercent: 100 },
    ],
    trainingHistory: [
      { id: 'th-1', date: '2025-11-15', action: 'Cert uploaded', details: 'Fire Extinguisher Training certificate uploaded', recordedBy: 'Marcus Johnson' },
      { id: 'th-2', date: '2025-06-20', action: 'Training completed', details: 'Compliance Operations — Score: 94%', recordedBy: 'System' },
      { id: 'th-3', date: '2025-06-15', action: 'Cert uploaded', details: 'California Food Handler Card renewed (FH-2025-4481)', recordedBy: 'Marcus Johnson' },
      { id: 'th-4', date: '2025-05-20', action: 'Cert uploaded', details: 'HACCP Principles Training certificate uploaded', recordedBy: 'Marcus Johnson' },
      { id: 'th-5', date: '2025-03-10', action: 'Cert uploaded', details: 'ServSafe Manager Certification uploaded (SM-2025-7721)', recordedBy: 'Marcus Johnson' },
      { id: 'th-6', date: '2025-02-05', action: 'Training completed', details: 'Facility Safety Fundamentals — Score: 88%', recordedBy: 'System' },
      { id: 'th-7', date: '2024-04-10', action: 'Training completed', details: 'ServSafe Manager Prep — Score: 92%', recordedBy: 'System' },
      { id: 'th-8', date: '2024-02-15', action: 'Training completed', details: 'Food Handler Essentials — Score: 96%', recordedBy: 'System' },
    ],
  },
  {
    id: 'd2', name: 'Sarah Chen', role: 'Manager', appRole: 'kitchen_manager',
    email: 'sarah@pacificcoast.com', locationId: '1', locationName: 'Downtown Kitchen',
    hireDate: '2024-03-01', avatarUrl: null,
    certifications: [
      { id: 'tc-5', type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2025-5502', authority: 'ANSI-accredited provider', issued: '2025-08-20', expires: '2028-08-20', documentUrl: null },
      // Coming due — expires within 30 days
      { id: 'tc-6', type: 'cfpm', name: 'ServSafe Food Protection Manager', number: 'SM-2025-8832', authority: 'National Restaurant Association', issued: '2025-04-05', expires: '2026-03-15', documentUrl: null },
    ],
    internalTraining: [
      { id: 'it-5', courseId: 'course-1', courseTitle: 'Food Handler Essentials', category: 'food_safety_handler', status: 'completed', assignedBy: 'Marcus Johnson', enrolledAt: '2024-04-01', completedAt: '2024-04-20', score: 90, progressPercent: 100 },
      { id: 'it-6', courseId: 'course-2', courseTitle: 'ServSafe Manager Prep', category: 'food_safety_manager', status: 'completed', assignedBy: 'Marcus Johnson', enrolledAt: '2024-05-01', completedAt: '2024-06-15', score: 88, progressPercent: 100 },
      { id: 'it-7', courseId: 'course-3', courseTitle: 'Facility Safety Fundamentals', category: 'facility_safety', status: 'completed', assignedBy: 'Marcus Johnson', enrolledAt: '2025-03-01', completedAt: '2025-03-25', score: 85, progressPercent: 100 },
    ],
    trainingHistory: [
      { id: 'th-9', date: '2025-08-20', action: 'Cert uploaded', details: 'California Food Handler Card renewed (FH-2025-5502)', recordedBy: 'Sarah Chen' },
      { id: 'th-10', date: '2025-04-05', action: 'Cert uploaded', details: 'ServSafe Manager Certification uploaded (SM-2025-8832)', recordedBy: 'Sarah Chen' },
      { id: 'th-11', date: '2025-03-25', action: 'Training completed', details: 'Facility Safety Fundamentals — Score: 85%', recordedBy: 'System' },
      { id: 'th-12', date: '2024-06-15', action: 'Training completed', details: 'ServSafe Manager Prep — Score: 88%', recordedBy: 'System' },
      { id: 'th-13', date: '2024-04-20', action: 'Training completed', details: 'Food Handler Essentials — Score: 90%', recordedBy: 'System' },
    ],
  },
  {
    id: 'd3', name: 'Maria Garcia', role: 'Manager', appRole: 'kitchen_manager',
    email: 'maria@pacificcoast.com', locationId: '2', locationName: 'Airport Cafe',
    hireDate: '2024-06-10', avatarUrl: null,
    certifications: [
      { id: 'tc-7', type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2025-3390', authority: 'ANSI-accredited provider', issued: '2025-09-01', expires: '2028-09-01', documentUrl: null },
      { id: 'tc-8', type: 'cfpm', name: 'ServSafe Food Protection Manager', number: 'SM-2025-6643', authority: 'National Restaurant Association', issued: '2025-07-20', expires: '2030-07-20', documentUrl: null },
    ],
    internalTraining: [
      { id: 'it-8', courseId: 'course-1', courseTitle: 'Food Handler Essentials', category: 'food_safety_handler', status: 'completed', assignedBy: 'Marcus Johnson', enrolledAt: '2024-07-01', completedAt: '2024-07-18', score: 94, progressPercent: 100 },
      { id: 'it-9', courseId: 'course-2', courseTitle: 'ServSafe Manager Prep', category: 'food_safety_manager', status: 'completed', assignedBy: 'Marcus Johnson', enrolledAt: '2024-08-01', completedAt: '2024-09-20', score: 91, progressPercent: 100 },
      { id: 'it-10', courseId: 'course-4', courseTitle: 'Compliance Operations', category: 'compliance_ops', status: 'in_progress', assignedBy: 'Marcus Johnson', enrolledAt: '2025-12-01', completedAt: null, score: null, progressPercent: 65 },
    ],
    trainingHistory: [
      { id: 'th-14', date: '2025-12-01', action: 'Training assigned', details: 'Compliance Operations assigned by Marcus Johnson', recordedBy: 'Marcus Johnson' },
      { id: 'th-15', date: '2025-09-01', action: 'Cert uploaded', details: 'California Food Handler Card renewed (FH-2025-3390)', recordedBy: 'Maria Garcia' },
      { id: 'th-16', date: '2025-07-20', action: 'Cert uploaded', details: 'ServSafe Manager Certification uploaded (SM-2025-6643)', recordedBy: 'Maria Garcia' },
      { id: 'th-17', date: '2024-09-20', action: 'Training completed', details: 'ServSafe Manager Prep — Score: 91%', recordedBy: 'System' },
      { id: 'th-18', date: '2024-07-18', action: 'Training completed', details: 'Food Handler Essentials — Score: 94%', recordedBy: 'System' },
    ],
  },
  {
    id: 'd4', name: 'David Park', role: 'Staff', appRole: 'kitchen_staff',
    email: 'david@pacificcoast.com', locationId: '3', locationName: 'University Dining',
    hireDate: '2024-04-02', avatarUrl: null,
    certifications: [
      { id: 'tc-9', type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2024-2201', authority: 'ANSI-accredited provider', issued: '2024-04-02', expires: '2027-04-02', documentUrl: null },
    ],
    internalTraining: [
      { id: 'it-11', courseId: 'course-1', courseTitle: 'Food Handler Essentials', category: 'food_safety_handler', status: 'completed', assignedBy: 'Marcus Johnson', enrolledAt: '2024-04-10', completedAt: '2024-05-01', score: 82, progressPercent: 100 },
      { id: 'it-12', courseId: 'course-3', courseTitle: 'Facility Safety Fundamentals', category: 'facility_safety', status: 'in_progress', assignedBy: 'Marcus Johnson', enrolledAt: '2025-11-15', completedAt: null, score: null, progressPercent: 40 },
      { id: 'it-13', courseId: 'course-5', courseTitle: 'Allergen Awareness', category: 'food_safety_handler', status: 'not_started', assignedBy: 'Marcus Johnson', enrolledAt: '2026-01-15', completedAt: null, score: null, progressPercent: 0 },
    ],
    trainingHistory: [
      { id: 'th-19', date: '2026-01-15', action: 'Training assigned', details: 'Allergen Awareness assigned by Marcus Johnson', recordedBy: 'Marcus Johnson' },
      { id: 'th-20', date: '2025-11-15', action: 'Training assigned', details: 'Facility Safety Fundamentals assigned by Marcus Johnson', recordedBy: 'Marcus Johnson' },
      { id: 'th-21', date: '2024-05-01', action: 'Training completed', details: 'Food Handler Essentials — Score: 82%', recordedBy: 'System' },
      { id: 'th-22', date: '2024-04-02', action: 'Cert uploaded', details: 'California Food Handler Card uploaded (FH-2024-2201)', recordedBy: 'David Park' },
    ],
  },
  {
    // Needs renewal — cert expired
    id: 'd5', name: 'Michael Torres', role: 'Staff', appRole: 'kitchen_staff',
    email: 'michael@pacificcoast.com', locationId: '2', locationName: 'Airport Cafe',
    hireDate: '2023-02-26', avatarUrl: null,
    certifications: [
      { id: 'tc-10', type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2023-1188', authority: 'ANSI-accredited provider', issued: '2023-02-26', expires: '2026-02-26', documentUrl: null },
    ],
    internalTraining: [
      { id: 'it-14', courseId: 'course-1', courseTitle: 'Food Handler Essentials', category: 'food_safety_handler', status: 'completed', assignedBy: 'Maria Garcia', enrolledAt: '2023-03-10', completedAt: '2023-04-01', score: 78, progressPercent: 100 },
      { id: 'it-15', courseId: 'course-3', courseTitle: 'Facility Safety Fundamentals', category: 'facility_safety', status: 'completed', assignedBy: 'Maria Garcia', enrolledAt: '2024-09-01', completedAt: '2024-10-05', score: 80, progressPercent: 100 },
    ],
    trainingHistory: [
      { id: 'th-23', date: '2024-10-05', action: 'Training completed', details: 'Facility Safety Fundamentals — Score: 80%', recordedBy: 'System' },
      { id: 'th-24', date: '2023-04-01', action: 'Training completed', details: 'Food Handler Essentials — Score: 78%', recordedBy: 'System' },
      { id: 'th-25', date: '2023-02-26', action: 'Cert uploaded', details: 'California Food Handler Card uploaded (FH-2023-1188)', recordedBy: 'Michael Torres' },
    ],
  },
  {
    id: 'd6', name: 'Emma Rodriguez', role: 'Staff', appRole: 'kitchen_staff',
    email: 'emma@pacificcoast.com', locationId: '1', locationName: 'Downtown Kitchen',
    hireDate: '2025-07-10', avatarUrl: null,
    certifications: [
      { id: 'tc-11', type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2025-9912', authority: 'ANSI-accredited provider', issued: '2025-07-10', expires: '2028-07-10', documentUrl: null },
      { id: 'tc-12', type: 'allergen_awareness', name: 'Allergen Awareness Training', number: 'AA-2025-445', authority: 'State of California', issued: '2025-07-12', expires: '2027-07-12', documentUrl: null },
    ],
    internalTraining: [
      { id: 'it-16', courseId: 'course-1', courseTitle: 'Food Handler Essentials', category: 'food_safety_handler', status: 'completed', assignedBy: 'Sarah Chen', enrolledAt: '2025-07-15', completedAt: '2025-07-28', score: 92, progressPercent: 100 },
      { id: 'it-17', courseId: 'course-3', courseTitle: 'Facility Safety Fundamentals', category: 'facility_safety', status: 'completed', assignedBy: 'Sarah Chen', enrolledAt: '2025-08-01', completedAt: '2025-08-20', score: 86, progressPercent: 100 },
      { id: 'it-18', courseId: 'course-5', courseTitle: 'Allergen Awareness', category: 'food_safety_handler', status: 'completed', assignedBy: 'Sarah Chen', enrolledAt: '2025-07-12', completedAt: '2025-07-25', score: 95, progressPercent: 100 },
    ],
    trainingHistory: [
      { id: 'th-26', date: '2025-08-20', action: 'Training completed', details: 'Facility Safety Fundamentals — Score: 86%', recordedBy: 'System' },
      { id: 'th-27', date: '2025-07-28', action: 'Training completed', details: 'Food Handler Essentials — Score: 92%', recordedBy: 'System' },
      { id: 'th-28', date: '2025-07-25', action: 'Training completed', details: 'Allergen Awareness — Score: 95%', recordedBy: 'System' },
      { id: 'th-29', date: '2025-07-12', action: 'Cert uploaded', details: 'Allergen Awareness Training certificate uploaded (AA-2025-445)', recordedBy: 'Emma Rodriguez' },
      { id: 'th-30', date: '2025-07-10', action: 'Cert uploaded', details: 'California Food Handler Card uploaded (FH-2025-9912)', recordedBy: 'Emma Rodriguez' },
    ],
  },
  {
    id: 'd7', name: 'Alex Thompson', role: 'Staff', appRole: 'kitchen_staff',
    email: 'alex@pacificcoast.com', locationId: '1', locationName: 'Downtown Kitchen',
    hireDate: '2024-12-10', avatarUrl: null,
    certifications: [
      { id: 'tc-13', type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2024-8834', authority: 'ANSI-accredited provider', issued: '2024-12-10', expires: '2027-12-10', documentUrl: null },
    ],
    internalTraining: [
      { id: 'it-19', courseId: 'course-1', courseTitle: 'Food Handler Essentials', category: 'food_safety_handler', status: 'completed', assignedBy: 'Sarah Chen', enrolledAt: '2024-12-15', completedAt: '2025-01-08', score: 84, progressPercent: 100 },
      { id: 'it-20', courseId: 'course-3', courseTitle: 'Facility Safety Fundamentals', category: 'facility_safety', status: 'in_progress', assignedBy: 'Sarah Chen', enrolledAt: '2025-12-01', completedAt: null, score: null, progressPercent: 55 },
    ],
    trainingHistory: [
      { id: 'th-31', date: '2025-12-01', action: 'Training assigned', details: 'Facility Safety Fundamentals assigned by Sarah Chen', recordedBy: 'Sarah Chen' },
      { id: 'th-32', date: '2025-01-08', action: 'Training completed', details: 'Food Handler Essentials — Score: 84%', recordedBy: 'System' },
      { id: 'th-33', date: '2024-12-10', action: 'Cert uploaded', details: 'California Food Handler Card uploaded (FH-2024-8834)', recordedBy: 'Alex Thompson' },
    ],
  },
  {
    // Coming due — cert expires within 60 days
    id: 'd8', name: 'Lisa Wang', role: 'Staff', appRole: 'kitchen_staff',
    email: 'lisa@pacificcoast.com', locationId: '2', locationName: 'Airport Cafe',
    hireDate: '2025-01-25', avatarUrl: null,
    certifications: [
      { id: 'tc-14', type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2025-1105', authority: 'ANSI-accredited provider', issued: '2025-01-25', expires: '2026-04-25', documentUrl: null },
    ],
    internalTraining: [
      { id: 'it-21', courseId: 'course-1', courseTitle: 'Food Handler Essentials', category: 'food_safety_handler', status: 'completed', assignedBy: 'Maria Garcia', enrolledAt: '2025-02-01', completedAt: '2025-02-20', score: 76, progressPercent: 100 },
      { id: 'it-22', courseId: 'course-5', courseTitle: 'Allergen Awareness', category: 'food_safety_handler', status: 'not_started', assignedBy: 'Maria Garcia', enrolledAt: '2026-02-01', completedAt: null, score: null, progressPercent: 0 },
    ],
    trainingHistory: [
      { id: 'th-34', date: '2026-02-01', action: 'Training assigned', details: 'Allergen Awareness assigned by Maria Garcia', recordedBy: 'Maria Garcia' },
      { id: 'th-35', date: '2025-02-20', action: 'Training completed', details: 'Food Handler Essentials — Score: 76%', recordedBy: 'System' },
      { id: 'th-36', date: '2025-01-25', action: 'Cert uploaded', details: 'California Food Handler Card uploaded (FH-2025-1105)', recordedBy: 'Lisa Wang' },
    ],
  },
  {
    id: 'd9', name: 'James Wilson', role: 'Staff', appRole: 'kitchen_staff',
    email: 'james@pacificcoast.com', locationId: '3', locationName: 'University Dining',
    hireDate: '2025-02-05', avatarUrl: null,
    certifications: [
      { id: 'tc-15', type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2025-2206', authority: 'ANSI-accredited provider', issued: '2025-02-05', expires: '2028-02-05', documentUrl: null },
    ],
    internalTraining: [
      { id: 'it-23', courseId: 'course-1', courseTitle: 'Food Handler Essentials', category: 'food_safety_handler', status: 'in_progress', assignedBy: 'Marcus Johnson', enrolledAt: '2025-02-10', completedAt: null, score: null, progressPercent: 30 },
    ],
    trainingHistory: [
      { id: 'th-37', date: '2025-02-10', action: 'Training assigned', details: 'Food Handler Essentials assigned by Marcus Johnson', recordedBy: 'Marcus Johnson' },
      { id: 'th-38', date: '2025-02-05', action: 'Cert uploaded', details: 'California Food Handler Card uploaded (FH-2025-2206)', recordedBy: 'James Wilson' },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────

/** Days until a cert expires. Negative = already past. null = no expiry. */
export function daysUntilExpiry(expiresDate: string | null): number | null {
  if (!expiresDate) return null;
  return Math.ceil((new Date(expiresDate).getTime() - Date.now()) / 86400000);
}

/** Get the overall training status for an employee based on cert expirations. */
export function getTrainingStatus(employee: TrainingEmployee): TrainingStatus {
  let worst: TrainingStatus = 'current';
  for (const cert of employee.certifications) {
    const days = daysUntilExpiry(cert.expires);
    if (days === null) continue;
    if (days < 0) return 'needs_renewal';
    if (days <= 90 && worst !== 'needs_renewal') worst = 'coming_due';
  }
  return worst;
}

/** Status label for display */
export function getStatusLabel(status: TrainingStatus): string {
  switch (status) {
    case 'current': return 'All Current';
    case 'coming_due': return 'Coming Due';
    case 'needs_renewal': return 'Needs Renewal';
  }
}

/** Status badge colors */
export function getStatusColors(status: TrainingStatus): { bg: string; text: string } {
  switch (status) {
    case 'current': return { bg: '#dcfce7', text: '#15803d' };
    case 'coming_due': return { bg: '#fef3c7', text: '#92400e' };
    case 'needs_renewal': return { bg: '#fee2e2', text: '#dc2626' };
  }
}

/** Get the nearest cert expiration date for an employee */
export function getNextExpiration(employee: TrainingEmployee): string | null {
  let earliest: string | null = null;
  for (const cert of employee.certifications) {
    if (!cert.expires) continue;
    if (!earliest || cert.expires < earliest) earliest = cert.expires;
  }
  return earliest;
}

/** Compute aggregate stats across all employees */
export function getCertStats(employees: TrainingEmployee[]) {
  let totalCerts = 0;
  let currentCerts = 0;
  let comingDue = 0;
  let needsRenewal = 0;
  let totalTraining = 0;
  let completedTraining = 0;

  for (const emp of employees) {
    for (const cert of emp.certifications) {
      totalCerts++;
      const days = daysUntilExpiry(cert.expires);
      if (days === null || days > 90) currentCerts++;
      else if (days >= 0) comingDue++;
      else needsRenewal++;
    }
    for (const t of emp.internalTraining) {
      totalTraining++;
      if (t.status === 'completed') completedTraining++;
    }
  }

  return {
    teamMembers: employees.length,
    totalCerts,
    currentCerts,
    comingDue,
    needsRenewal,
    completionPct: totalTraining > 0 ? Math.round((completedTraining / totalTraining) * 100) : 100,
  };
}

/** Location options for filter dropdown */
export const LOCATION_OPTIONS = [
  { id: '1', name: 'Downtown Kitchen' },
  { id: '2', name: 'Airport Cafe' },
  { id: '3', name: 'University Dining' },
];
