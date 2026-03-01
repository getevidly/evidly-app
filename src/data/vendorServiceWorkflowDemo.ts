// ── Demo Data: Vendor Service Day Workflow ──────────────────────────
// Notification timelines, verification records, and scorecard history
// for the vendor service day workflow feature in demo mode.

// ── Notification Timeline ──────────────────────────────────────────
export interface ServiceWorkflowStep {
  day: number;
  label: string;
  description: string;
  date: string;
  status: 'completed' | 'sent' | 'vendor_responded' | 'pending' | 'failed' | 'escalated';
  escalation?: string;
  vendorAction?: 'completed' | 'rescheduled' | 'canceled';
}

// ABC Fire Protection — hood cleaning, upcoming, full reminder flow
export const ABC_FIRE_WORKFLOW: ServiceWorkflowStep[] = [
  { day: -30, label: '30-Day Reminder', description: 'Initial service reminder sent to ABC Fire Protection for Hood Cleaning at Downtown Kitchen', date: '2026-02-13', status: 'sent' },
  { day: -14, label: '14-Day Reminder', description: 'Follow-up reminder sent — service due in 2 weeks', date: '2026-03-01', status: 'sent' },
  { day: -7, label: '7-Day Reminder', description: 'One week notice sent with service update link', date: '2026-03-08', status: 'sent' },
  { day: -3, label: '3-Day Reminder', description: 'Urgent reminder — service due in 3 days', date: '2026-03-12', status: 'pending' },
  { day: -1, label: '1-Day Reminder', description: 'Final reminder — service due tomorrow', date: '2026-03-14', status: 'pending' },
  { day: 0, label: 'Service Due', description: 'Hood Cleaning scheduled at Downtown Kitchen', date: '2026-03-15', status: 'pending' },
  { day: 7, label: 'Overdue Alert', description: 'Service is 7 days overdue — escalation to management', date: '2026-03-22', status: 'pending', escalation: 'CC: Owner/Manager' },
];

// Pacific Pest Control — completed on time
export const PACIFIC_PEST_WORKFLOW: ServiceWorkflowStep[] = [
  { day: -30, label: '30-Day Reminder', description: 'Service reminder sent to Pacific Pest Control for monthly service at Airport Cafe', date: '2026-01-29', status: 'sent' },
  { day: -14, label: '14-Day Reminder', description: 'Follow-up reminder sent', date: '2026-02-14', status: 'sent' },
  { day: -7, label: '7-Day Reminder', description: 'One week notice with service update link', date: '2026-02-21', status: 'sent' },
  { day: -1, label: '1-Day Reminder', description: 'Final reminder — service due tomorrow', date: '2026-02-27', status: 'sent' },
  { day: 0, label: 'Service Day', description: 'Vendor marked service as completed via update link', date: '2026-02-28', status: 'vendor_responded', vendorAction: 'completed' },
  { day: 1, label: 'Client Verification', description: 'Service confirmed by Kitchen Manager — Sarah Johnson performed monthly treatment', date: '2026-03-01', status: 'completed' },
];

// CleanAir HVAC — rescheduled
export const CLEANAIR_HVAC_WORKFLOW: ServiceWorkflowStep[] = [
  { day: -30, label: '30-Day Reminder', description: 'Service reminder sent to CleanAir HVAC for maintenance at University Dining', date: '2026-02-03', status: 'sent' },
  { day: -14, label: '14-Day Reminder', description: 'Follow-up reminder sent', date: '2026-02-19', status: 'sent' },
  { day: -7, label: '7-Day Reminder', description: 'One week notice with service update link', date: '2026-02-26', status: 'sent' },
  { day: -3, label: 'Vendor Rescheduled', description: 'CleanAir HVAC rescheduled to March 12 — reason: parts on backorder', date: '2026-03-02', status: 'vendor_responded', vendorAction: 'rescheduled' },
  { day: 0, label: 'Original Due Date', description: 'HVAC Service originally due (now rescheduled)', date: '2026-03-05', status: 'pending' },
  { day: 7, label: 'Rescheduled Service', description: 'New service date — March 12, 2026', date: '2026-03-12', status: 'pending' },
];

// Valley Fire — overdue, escalation
export const VALLEY_FIRE_WORKFLOW: ServiceWorkflowStep[] = [
  { day: -30, label: '30-Day Reminder', description: 'Service reminder sent to Valley Fire Systems for fire suppression inspection at Downtown Kitchen', date: '2026-01-25', status: 'sent' },
  { day: -14, label: '14-Day Reminder', description: 'Follow-up reminder sent', date: '2026-02-10', status: 'sent' },
  { day: -7, label: '7-Day Reminder', description: 'One week notice with service update link', date: '2026-02-17', status: 'sent' },
  { day: -3, label: '3-Day Reminder', description: 'Urgent reminder sent', date: '2026-02-21', status: 'sent' },
  { day: -1, label: '1-Day Reminder', description: 'Final reminder — service due tomorrow', date: '2026-02-23', status: 'sent' },
  { day: 0, label: 'Service Due', description: 'Fire Suppression Inspection due — no vendor response', date: '2026-02-24', status: 'failed' },
  { day: 4, label: 'Overdue — Day 4', description: 'Service is 4 days overdue. No response from vendor.', date: '2026-02-28', status: 'escalated', escalation: 'Marked Overdue' },
];

// Metro Backflow — canceled
export const METRO_BACKFLOW_WORKFLOW: ServiceWorkflowStep[] = [
  { day: -30, label: '30-Day Reminder', description: 'Service reminder sent to Metro Backflow Testing at Airport Cafe', date: '2026-02-18', status: 'sent' },
  { day: -14, label: '14-Day Reminder', description: 'Follow-up reminder sent', date: '2026-03-06', status: 'sent' },
  { day: -10, label: 'Vendor Canceled', description: 'Metro Backflow canceled service — reason: vendor change, client switching providers', date: '2026-03-10', status: 'vendor_responded', vendorAction: 'canceled' },
];

// ── Vendor → Workflow mapping ──────────────────────────────────────
export const VENDOR_WORKFLOW_MAP: Record<string, { workflow: ServiceWorkflowStep[]; serviceLabel: string; locationLabel: string }> = {
  '1': { workflow: ABC_FIRE_WORKFLOW, serviceLabel: 'Hood Cleaning', locationLabel: 'Downtown Kitchen' },
  '2': { workflow: PACIFIC_PEST_WORKFLOW, serviceLabel: 'Pest Control Service', locationLabel: 'Airport Cafe' },
  '4': { workflow: CLEANAIR_HVAC_WORKFLOW, serviceLabel: 'HVAC Service & Maintenance', locationLabel: 'University Dining' },
  '3': { workflow: VALLEY_FIRE_WORKFLOW, serviceLabel: 'Fire Suppression Inspection', locationLabel: 'Downtown Kitchen' },
  '5': { workflow: METRO_BACKFLOW_WORKFLOW, serviceLabel: 'Backflow Prevention Testing', locationLabel: 'Airport Cafe' },
};

// ── Verification Records ───────────────────────────────────────────
export interface DemoVerification {
  id: string;
  vendorId: string;
  vendorName: string;
  serviceName: string;
  locationName: string;
  updateType: 'completed' | 'rescheduled' | 'canceled';
  verificationStatus: 'confirmed' | 'disputed' | 'pending';
  disputeReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  submittedAt: string;
}

export const DEMO_VERIFICATIONS: DemoVerification[] = [
  {
    id: 'ver-1',
    vendorId: '2',
    vendorName: 'Pacific Pest Control',
    serviceName: 'Pest Control Service',
    locationName: 'Airport Cafe',
    updateType: 'completed',
    verificationStatus: 'confirmed',
    verifiedBy: 'Maria Rodriguez (Kitchen Manager)',
    verifiedAt: '2026-03-01T10:30:00Z',
    submittedAt: '2026-02-28T15:00:00Z',
  },
  {
    id: 'ver-2',
    vendorId: '3',
    vendorName: 'Valley Fire Systems',
    serviceName: 'Fire Suppression Inspection',
    locationName: 'Downtown Kitchen',
    updateType: 'completed',
    verificationStatus: 'disputed',
    disputeReason: 'Service was not performed — technician arrived but left without completing inspection. No tags updated.',
    verifiedBy: 'James Chen (Owner)',
    verifiedAt: '2026-02-25T09:00:00Z',
    submittedAt: '2026-02-24T16:30:00Z',
  },
  {
    id: 'ver-3',
    vendorId: '4',
    vendorName: 'CleanAir HVAC',
    serviceName: 'HVAC Service & Maintenance',
    locationName: 'University Dining',
    updateType: 'rescheduled',
    verificationStatus: 'pending',
    submittedAt: '2026-03-02T11:00:00Z',
  },
];

// ── Scorecard Metrics History ──────────────────────────────────────
export interface DemoScorecardPeriod {
  vendorId: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  reliabilityScore: number;
  onTimeRate: number;
  docComplianceRate: number;
  responseTimeAvgHours: number;
  totalServices: number;
  completedOnTime: number;
  rescheduledCount: number;
  canceledCount: number;
}

export const DEMO_SCORECARD_HISTORY: DemoScorecardPeriod[] = [
  // ABC Fire Protection — vendor '1'
  { vendorId: '1', periodLabel: 'Q4 2025', periodStart: '2025-10-01', periodEnd: '2025-12-31', reliabilityScore: 96, onTimeRate: 100, docComplianceRate: 80, responseTimeAvgHours: 4.2, totalServices: 3, completedOnTime: 3, rescheduledCount: 0, canceledCount: 0 },
  { vendorId: '1', periodLabel: 'Q1 2026', periodStart: '2026-01-01', periodEnd: '2026-03-31', reliabilityScore: 98, onTimeRate: 100, docComplianceRate: 86, responseTimeAvgHours: 3.1, totalServices: 2, completedOnTime: 2, rescheduledCount: 0, canceledCount: 0 },

  // Pacific Pest Control — vendor '2'
  { vendorId: '2', periodLabel: 'Q4 2025', periodStart: '2025-10-01', periodEnd: '2025-12-31', reliabilityScore: 90, onTimeRate: 92, docComplianceRate: 100, responseTimeAvgHours: 2.8, totalServices: 3, completedOnTime: 3, rescheduledCount: 0, canceledCount: 0 },
  { vendorId: '2', periodLabel: 'Q1 2026', periodStart: '2026-01-01', periodEnd: '2026-03-31', reliabilityScore: 92, onTimeRate: 95, docComplianceRate: 100, responseTimeAvgHours: 2.1, totalServices: 3, completedOnTime: 3, rescheduledCount: 0, canceledCount: 0 },

  // Valley Fire — vendor '3'
  { vendorId: '3', periodLabel: 'Q4 2025', periodStart: '2025-10-01', periodEnd: '2025-12-31', reliabilityScore: 78, onTimeRate: 85, docComplianceRate: 60, responseTimeAvgHours: 18.5, totalServices: 2, completedOnTime: 1, rescheduledCount: 1, canceledCount: 0 },
  { vendorId: '3', periodLabel: 'Q1 2026', periodStart: '2026-01-01', periodEnd: '2026-03-31', reliabilityScore: 72, onTimeRate: 80, docComplianceRate: 50, responseTimeAvgHours: 24.0, totalServices: 2, completedOnTime: 1, rescheduledCount: 0, canceledCount: 1 },

  // CleanAir HVAC — vendor '4'
  { vendorId: '4', periodLabel: 'Q4 2025', periodStart: '2025-10-01', periodEnd: '2025-12-31', reliabilityScore: 92, onTimeRate: 95, docComplianceRate: 100, responseTimeAvgHours: 6.0, totalServices: 2, completedOnTime: 2, rescheduledCount: 0, canceledCount: 0 },
  { vendorId: '4', periodLabel: 'Q1 2026', periodStart: '2026-01-01', periodEnd: '2026-03-31', reliabilityScore: 95, onTimeRate: 97, docComplianceRate: 100, responseTimeAvgHours: 5.2, totalServices: 2, completedOnTime: 1, rescheduledCount: 1, canceledCount: 0 },

  // Metro Backflow — vendor '5'
  { vendorId: '5', periodLabel: 'Q4 2025', periodStart: '2025-10-01', periodEnd: '2025-12-31', reliabilityScore: 85, onTimeRate: 90, docComplianceRate: 75, responseTimeAvgHours: 12.0, totalServices: 1, completedOnTime: 1, rescheduledCount: 0, canceledCount: 0 },
  { vendorId: '5', periodLabel: 'Q1 2026', periodStart: '2026-01-01', periodEnd: '2026-03-31', reliabilityScore: 88, onTimeRate: 85, docComplianceRate: 80, responseTimeAvgHours: 8.5, totalServices: 2, completedOnTime: 1, rescheduledCount: 0, canceledCount: 1 },
];

// ── Enhanced Vendor Performance (extends existing VendorPerformance) ─
export interface EnhancedVendorPerformance {
  vendorId: string;
  reliabilityScore: number;
  onTimeRate: number;
  docComplianceRate: number;
  trend: 'improving' | 'declining' | 'stable';
  responseTimeAvgHours: number;
  servicesThisQuarter: number;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
}

export const ENHANCED_VENDOR_PERFORMANCE: EnhancedVendorPerformance[] = [
  { vendorId: '1', reliabilityScore: 98, onTimeRate: 100, docComplianceRate: 86, trend: 'stable', responseTimeAvgHours: 3.1, servicesThisQuarter: 2, lastServiceDate: '2026-01-15', nextServiceDate: '2026-03-15' },
  { vendorId: '2', reliabilityScore: 92, onTimeRate: 95, docComplianceRate: 100, trend: 'stable', responseTimeAvgHours: 2.1, servicesThisQuarter: 3, lastServiceDate: '2026-02-28', nextServiceDate: '2026-03-28' },
  { vendorId: '3', reliabilityScore: 72, onTimeRate: 80, docComplianceRate: 50, trend: 'declining', responseTimeAvgHours: 24.0, servicesThisQuarter: 2, lastServiceDate: '2025-12-10', nextServiceDate: '2026-02-24' },
  { vendorId: '4', reliabilityScore: 95, onTimeRate: 97, docComplianceRate: 100, trend: 'improving', responseTimeAvgHours: 5.2, servicesThisQuarter: 2, lastServiceDate: '2026-01-08', nextServiceDate: '2026-03-05' },
  { vendorId: '5', reliabilityScore: 88, onTimeRate: 85, docComplianceRate: 80, trend: 'stable', responseTimeAvgHours: 8.5, servicesThisQuarter: 2, lastServiceDate: '2025-11-20', nextServiceDate: '2026-03-20' },
];
