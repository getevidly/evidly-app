/**
 * CORRECTIVE-ACTION-01 — Corrective Action Templates + Demo Data
 *
 * 25 system templates with regulatory references.
 * 8 demo corrective actions with full lifecycle history.
 *
 * Status pipeline: reported → assigned → in_progress → resolved → verified
 */

import type { CAStatus, CASeverity } from '../constants/correctiveActionStatus';

export type { CAStatus, CASeverity };

// ── Types ─────────────────────────────────────────────────────

export type CACategory = 'food_safety' | 'facility_safety' | 'operational';
export type CASourceType = 'inspection' | 'checklist' | 'temperature' | 'self_inspection' | 'manual' | 'incident';

export interface CANote {
  text: string;
  author: string;
  timestamp: string;
}

export interface CAAttachment {
  name: string;
  url: string;
  type: string;
}

export interface CAHistoryEntry {
  action: string; // 'status_changed' | 'reassigned' | 'note_added' | 'attachment_added'
  from?: string;
  to?: string;
  by: string;
  timestamp: string;
  detail?: string;
}

export interface CATemplate {
  id: string;
  title: string;
  description: string;
  category: CACategory;
  severity: CASeverity;
  suggested_root_cause: string;
  regulation_reference: string;
  recommended_timeframe_days: number;
  is_system: boolean;
  is_active: boolean;
}

export interface CorrectiveActionItem {
  id: string;
  title: string;
  description: string;
  location: string;
  locationId: string;
  category: CACategory;
  severity: CASeverity;
  status: CAStatus;
  source: string;
  source_type: CASourceType;
  source_id: string | null;
  assignee: string;
  assigned_by: string;
  assignedAt: string | null;
  createdAt: string;
  dueDate: string;
  resolvedAt: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  verifiedAt: string | null;
  verified_by: string | null;
  verification_note: string | null;
  rootCause: string;
  correctiveSteps: string;
  preventiveMeasures: string;
  regulationReference: string;
  templateId: string | null;
  ai_draft: string | null;
  notes: CANote[];
  attachments: CAAttachment[];
  history: CAHistoryEntry[];
}

// ── Date helpers ──────────────────────────────────────────────

const daysAgo = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().slice(0, 10);
};
const daysFromNow = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};

// ── 25 System Templates ──────────────────────────────────────

export const CA_SYSTEM_TEMPLATES: CATemplate[] = [
  // Food Safety (12)
  {
    id: 'tpl-fs-01', title: 'Walk-in Cooler Temperature Excursion',
    description: 'Walk-in cooler recorded temperature above 41\u00B0F limit. Verify door seal, compressor operation, and product temperatures. Discard any TCS foods held above 41\u00B0F for more than 4 hours.',
    category: 'food_safety', severity: 'critical',
    suggested_root_cause: 'Door left ajar, compressor failure, or overloading',
    regulation_reference: 'FDA 21 CFR 117.150', recommended_timeframe_days: 1,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fs-02', title: 'Hot Holding Below Minimum Temperature',
    description: 'Hot holding unit recorded below 135\u00B0F minimum. Reheat food to 165\u00B0F before returning to holding. Check equipment calibration.',
    category: 'food_safety', severity: 'critical',
    suggested_root_cause: 'Equipment malfunction, improper preheating, or lid left open',
    regulation_reference: 'FDA Food Code 3-501.16', recommended_timeframe_days: 1,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fs-03', title: 'Handwashing Station Non-Compliance',
    description: 'Handwashing station found without soap, paper towels, or warm water. Restock immediately and verify all stations.',
    category: 'food_safety', severity: 'high',
    suggested_root_cause: 'Supply not restocked, plumbing issue, or blocked access',
    regulation_reference: 'FDA Food Code 2-301.14', recommended_timeframe_days: 1,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fs-04', title: 'Cross-Contamination Risk Identified',
    description: 'Cross-contamination risk found \u2014 raw proteins stored above ready-to-eat foods, shared cutting boards, or improper utensil use.',
    category: 'food_safety', severity: 'high',
    suggested_root_cause: 'Staff not following SOP, inadequate storage organization, or training gap',
    regulation_reference: 'FDA Food Code 3-302.11', recommended_timeframe_days: 1,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fs-05', title: 'Receiving Log Missing or Incomplete',
    description: 'Delivery not logged in receiving log. Temperatures, quantities, and vendor info must be recorded for every delivery.',
    category: 'food_safety', severity: 'medium',
    suggested_root_cause: 'Staff forgot to log, form not available, or delivery during rush',
    regulation_reference: 'FDA Food Code 3-202.11', recommended_timeframe_days: 3,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fs-06', title: 'Food Handler Card Expired or Missing',
    description: 'One or more staff members have expired or missing food handler certifications. Schedule renewal immediately.',
    category: 'food_safety', severity: 'high',
    suggested_root_cause: 'Certification renewal overlooked, new hire not yet certified',
    regulation_reference: 'State Health Code', recommended_timeframe_days: 7,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fs-07', title: 'Allergen Labeling Deficiency',
    description: 'Menu items or prep containers missing required allergen labeling. Update labels and verify staff awareness of major allergens.',
    category: 'food_safety', severity: 'high',
    suggested_root_cause: 'Label not updated after recipe change, missing prep labels',
    regulation_reference: 'FALCPA / FDA Food Code 3-602.11', recommended_timeframe_days: 2,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fs-08', title: 'HACCP Critical Control Point Deviation',
    description: 'Critical control point out of range \u2014 CCP monitoring log shows deviation from established limits. Implement corrective action per HACCP plan.',
    category: 'food_safety', severity: 'critical',
    suggested_root_cause: 'Process deviation, monitoring lapse, or equipment failure',
    regulation_reference: '21 CFR 120 / HACCP Plan', recommended_timeframe_days: 1,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fs-09', title: 'Improper Cooling Procedure',
    description: 'Food not cooled from 135\u00B0F to 70\u00B0F within 2 hours or to 41\u00B0F within 6 hours total. Evaluate cooling method and batch sizes.',
    category: 'food_safety', severity: 'critical',
    suggested_root_cause: 'Cooling container too deep, insufficient ice bath, or large batch size',
    regulation_reference: 'FDA Food Code 3-501.14', recommended_timeframe_days: 1,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fs-10', title: 'Sanitizer Concentration Out of Range',
    description: 'Sanitizer test strips show concentration outside acceptable range. Adjust solution and re-test.',
    category: 'food_safety', severity: 'medium',
    suggested_root_cause: 'Incorrect dilution ratio, depleted chemical supply, or dispenser malfunction',
    regulation_reference: 'FDA Food Code 4-501.114', recommended_timeframe_days: 1,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fs-11', title: 'Date Marking / Labeling Missing',
    description: 'Ready-to-eat TCS foods in cold storage missing date marks. Label all items with prep date and 7-day discard date.',
    category: 'food_safety', severity: 'medium',
    suggested_root_cause: 'Staff not labeling during prep, labels fell off, or new staff not trained',
    regulation_reference: 'FDA Food Code 3-501.17', recommended_timeframe_days: 1,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fs-12', title: 'Personal Hygiene Violation',
    description: 'Staff observed not following personal hygiene requirements \u2014 improper handwashing, eating in prep area, or working while ill.',
    category: 'food_safety', severity: 'medium',
    suggested_root_cause: 'Training gap, supervision lapse, or policy not enforced',
    regulation_reference: 'FDA Food Code 2-301.11', recommended_timeframe_days: 1,
    is_system: true, is_active: true,
  },
  // Facility Safety (10)
  {
    id: 'tpl-fac-01', title: 'Fire Suppression System Inspection Overdue',
    description: 'Annual fire suppression system inspection certificate has expired. Schedule re-inspection with certified vendor immediately.',
    category: 'facility_safety', severity: 'critical',
    suggested_root_cause: 'Vendor scheduling oversight, expired contract, or vendor unavailability',
    regulation_reference: 'NFPA 96', recommended_timeframe_days: 3,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fac-02', title: 'Fire Extinguisher Inspection Overdue',
    description: 'Monthly visual inspection or annual service inspection for fire extinguisher(s) is overdue. Inspect and tag all units.',
    category: 'facility_safety', severity: 'high',
    suggested_root_cause: 'Inspection schedule not tracked, inspector not available',
    regulation_reference: 'NFPA 10', recommended_timeframe_days: 7,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fac-03', title: 'Emergency Exit Blocked or Obstructed',
    description: 'Emergency exit found blocked by equipment, boxes, or other obstructions. Clear immediately and verify all exit paths.',
    category: 'facility_safety', severity: 'critical',
    suggested_root_cause: 'Storage overflow, delivery staging, or staff unaware of requirement',
    regulation_reference: 'OSHA 29 CFR 1910.37', recommended_timeframe_days: 1,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fac-04', title: 'Slip/Trip Hazard Identified',
    description: 'Wet floor, damaged flooring, loose mats, or cables creating slip/trip hazard. Address immediately and post warning signage.',
    category: 'facility_safety', severity: 'high',
    suggested_root_cause: 'Spill not cleaned, damaged floor tile, or missing floor mat',
    regulation_reference: 'OSHA 29 CFR 1910.22', recommended_timeframe_days: 1,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fac-05', title: 'Pest Evidence Found',
    description: 'Evidence of pest activity (droppings, gnaw marks, live insects) found in food prep or storage area. Contact pest control vendor.',
    category: 'facility_safety', severity: 'high',
    suggested_root_cause: 'Gap in pest exclusion, sanitation issue, or door propped open',
    regulation_reference: 'FDA Food Code 6-501.111', recommended_timeframe_days: 2,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fac-06', title: 'Hood Cleaning Certificate Expired',
    description: 'Kitchen exhaust hood cleaning certificate has expired. Schedule cleaning with certified vendor per NFPA 96 frequency requirements.',
    category: 'facility_safety', severity: 'high',
    suggested_root_cause: 'Cleaning schedule not tracked, vendor contract lapsed',
    regulation_reference: 'NFPA 96', recommended_timeframe_days: 7,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fac-07', title: 'Grease Trap Maintenance Overdue',
    description: 'Grease trap / interceptor maintenance is past due. Schedule pumping and cleaning per local code requirements.',
    category: 'facility_safety', severity: 'medium',
    suggested_root_cause: 'Maintenance schedule not tracked, vendor scheduling issue',
    regulation_reference: 'Local plumbing code', recommended_timeframe_days: 7,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fac-08', title: 'Lighting Deficiency in Prep Area',
    description: 'Lighting in food prep, cooking, or warewashing area below minimum required foot-candles. Replace bulbs or fixtures.',
    category: 'facility_safety', severity: 'medium',
    suggested_root_cause: 'Burned out bulbs, broken fixture, or shield missing',
    regulation_reference: 'FDA Food Code 6-303.11', recommended_timeframe_days: 3,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fac-09', title: 'Ventilation System Not Operating',
    description: 'Kitchen ventilation / exhaust system not operating properly. Check fan belts, filters, and motor.',
    category: 'facility_safety', severity: 'high',
    suggested_root_cause: 'Fan motor failure, clogged filters, or electrical issue',
    regulation_reference: 'OSHA / Local building code', recommended_timeframe_days: 2,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-fac-10', title: 'First Aid Kit Missing or Incomplete',
    description: 'First aid kit not present or missing required supplies. Restock and verify contents meet OSHA requirements.',
    category: 'facility_safety', severity: 'low',
    suggested_root_cause: 'Supplies used and not restocked, kit relocated',
    regulation_reference: 'OSHA 29 CFR 1910.151', recommended_timeframe_days: 7,
    is_system: true, is_active: true,
  },
  // Operational (3)
  {
    id: 'tpl-op-01', title: 'Pest Control Service Overdue',
    description: 'Scheduled pest control service visit is overdue. Contact vendor to reschedule.',
    category: 'operational', severity: 'medium',
    suggested_root_cause: 'Vendor scheduling conflict, contract renewal pending',
    regulation_reference: 'Vendor SLA / FDA Food Code', recommended_timeframe_days: 3,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-op-02', title: 'Equipment Calibration Overdue',
    description: 'Thermometer or other measuring equipment calibration is overdue. Calibrate using ice-point or boiling-point method and document.',
    category: 'operational', severity: 'medium',
    suggested_root_cause: 'Calibration schedule not maintained, thermometer damaged',
    regulation_reference: 'FDA Food Code 4-502.11', recommended_timeframe_days: 7,
    is_system: true, is_active: true,
  },
  {
    id: 'tpl-op-03', title: 'Training Documentation Gap',
    description: 'Required training records missing or incomplete for one or more employees. Update training log and schedule any needed sessions.',
    category: 'operational', severity: 'low',
    suggested_root_cause: 'New hire onboarding incomplete, records not filed after training',
    regulation_reference: 'FDA Food Code 2-103.11', recommended_timeframe_days: 14,
    is_system: true, is_active: true,
  },
];

// ── 8 Demo Corrective Actions ─────────────────────────────────

export const DEMO_CORRECTIVE_ACTIONS: CorrectiveActionItem[] = [
  {
    id: 'ca-1', title: 'Walk-in cooler temperature excursion',
    description: 'Walk-in cooler recorded 44.8\u00B0F \u2014 exceeds 41\u00B0F limit. Door was found ajar. Recheck required within 30 minutes.',
    location: 'Location 2', locationId: 'airport', category: 'food_safety', severity: 'critical', status: 'in_progress',
    source: 'Temperature Log', source_type: 'temperature', source_id: null,
    assignee: 'David Kim', assigned_by: 'Sofia Chen', assignedAt: daysAgo(1),
    createdAt: daysAgo(1), dueDate: daysFromNow(0),
    resolvedAt: null, resolved_by: null, resolution_note: null,
    verifiedAt: null, verified_by: null, verification_note: null,
    rootCause: 'Walk-in cooler door found ajar after delivery. Door gasket worn.',
    correctiveSteps: 'Door closed immediately. All TCS items checked \u2014 product temps verified under 41\u00B0F. Gasket replacement ordered.',
    preventiveMeasures: 'Install door alarm sensor. Add gasket inspection to monthly PM checklist.',
    regulationReference: 'FDA 21 CFR 117.150', templateId: 'tpl-fs-01', ai_draft: null,
    notes: [
      { text: 'Door gasket ordered from supplier. ETA 2 days.', author: 'David Kim', timestamp: daysAgo(0) + 'T14:30:00Z' },
      { text: 'Confirmed all TCS product temps still within range after door was closed.', author: 'Ana Torres', timestamp: daysAgo(1) + 'T09:15:00Z' },
    ],
    attachments: [
      { name: 'temp-log-walk-in-feb28.pdf', url: '#', type: 'application/pdf' },
    ],
    history: [
      { action: 'status_changed', to: 'reported', by: 'Sofia Chen', timestamp: daysAgo(1) + 'T08:00:00Z' },
      { action: 'status_changed', from: 'reported', to: 'assigned', by: 'Sofia Chen', timestamp: daysAgo(1) + 'T08:05:00Z', detail: 'Assigned to David Kim' },
      { action: 'status_changed', from: 'assigned', to: 'in_progress', by: 'David Kim', timestamp: daysAgo(1) + 'T08:30:00Z' },
    ],
  },
  {
    id: 'ca-2', title: 'Missing hood suppression inspection certificate',
    description: 'Annual hood suppression system inspection certificate expired. Schedule re-inspection with certified vendor.',
    location: 'Location 3', locationId: 'university', category: 'facility_safety', severity: 'high', status: 'reported',
    source: 'Facility Safety Audit', source_type: 'inspection', source_id: null,
    assignee: '', assigned_by: '', assignedAt: null,
    createdAt: daysAgo(5), dueDate: daysFromNow(2),
    resolvedAt: null, resolved_by: null, resolution_note: null,
    verifiedAt: null, verified_by: null, verification_note: null,
    rootCause: 'Vendor contract lapsed \u2014 annual inspection not scheduled.',
    correctiveSteps: '', preventiveMeasures: '',
    regulationReference: 'NFPA 96', templateId: 'tpl-fac-01', ai_draft: null,
    notes: [], attachments: [],
    history: [
      { action: 'status_changed', to: 'reported', by: 'Sofia Chen', timestamp: daysAgo(5) + 'T10:00:00Z' },
    ],
  },
  {
    id: 'ca-3', title: 'Handwashing station soap dispenser empty',
    description: 'Prep area handwashing station found without soap during morning inspection. Restocked and verified.',
    location: 'Location 1', locationId: 'downtown', category: 'food_safety', severity: 'medium', status: 'resolved',
    source: 'Self-Inspection', source_type: 'self_inspection', source_id: null,
    assignee: 'Lisa Nguyen', assigned_by: 'David Kim', assignedAt: daysAgo(3),
    createdAt: daysAgo(3), dueDate: daysAgo(1),
    resolvedAt: daysAgo(2), resolved_by: 'Lisa Nguyen', resolution_note: 'All 4 handwashing stations restocked with soap and paper towels. Verified operational.',
    verifiedAt: null, verified_by: null, verification_note: null,
    rootCause: 'Closing crew did not restock soap dispensers.',
    correctiveSteps: 'Soap restocked. All 4 handwashing stations checked and verified.',
    preventiveMeasures: 'Added soap dispenser check to closing checklist.',
    regulationReference: 'FDA Food Code 2-301.14', templateId: 'tpl-fs-03', ai_draft: null,
    notes: [
      { text: 'All 4 stations restocked and operational.', author: 'Lisa Nguyen', timestamp: daysAgo(2) + 'T10:00:00Z' },
    ],
    attachments: [],
    history: [
      { action: 'status_changed', to: 'reported', by: 'David Kim', timestamp: daysAgo(3) + 'T07:30:00Z' },
      { action: 'status_changed', from: 'reported', to: 'assigned', by: 'David Kim', timestamp: daysAgo(3) + 'T07:35:00Z', detail: 'Assigned to Lisa Nguyen' },
      { action: 'status_changed', from: 'assigned', to: 'in_progress', by: 'Lisa Nguyen', timestamp: daysAgo(3) + 'T08:00:00Z' },
      { action: 'status_changed', from: 'in_progress', to: 'resolved', by: 'Lisa Nguyen', timestamp: daysAgo(2) + 'T10:00:00Z', detail: 'All 4 handwashing stations restocked with soap and paper towels.' },
    ],
  },
  {
    id: 'ca-4', title: 'Hot holding unit below minimum temperature',
    description: 'Hot holding unit recorded 131\u00B0F \u2014 below 135\u00B0F minimum. Food reheated to 165\u00B0F and returned to holding.',
    location: 'Location 1', locationId: 'downtown', category: 'food_safety', severity: 'high', status: 'verified',
    source: 'Temperature Log', source_type: 'temperature', source_id: null,
    assignee: 'Ana Torres', assigned_by: 'Sofia Chen', assignedAt: daysAgo(4),
    createdAt: daysAgo(4), dueDate: daysAgo(2),
    resolvedAt: daysAgo(3), resolved_by: 'Ana Torres', resolution_note: 'Thermostat recalibrated. Unit now holding steady at 138\u00B0F. Monitored for 4 hours.',
    verifiedAt: daysAgo(2), verified_by: 'Sofia Chen', verification_note: 'Verified unit performing within spec. Calibration documented.',
    rootCause: 'Holding unit thermostat drifting low. Calibration overdue.',
    correctiveSteps: 'Food reheated to 165\u00B0F. Thermostat recalibrated. Unit monitored every 30 min for 4 hours.',
    preventiveMeasures: 'Added thermostat calibration to monthly PM schedule.',
    regulationReference: 'FDA Food Code 3-501.16', templateId: 'tpl-fs-02', ai_draft: null,
    notes: [
      { text: 'Thermostat recalibrated successfully. Holding steady at 138\u00B0F.', author: 'Ana Torres', timestamp: daysAgo(3) + 'T16:00:00Z' },
      { text: 'Verified corrective action complete. Unit performing within spec.', author: 'Sofia Chen', timestamp: daysAgo(2) + 'T09:30:00Z' },
    ],
    attachments: [],
    history: [
      { action: 'status_changed', to: 'reported', by: 'Sofia Chen', timestamp: daysAgo(4) + 'T11:00:00Z' },
      { action: 'status_changed', from: 'reported', to: 'assigned', by: 'Sofia Chen', timestamp: daysAgo(4) + 'T11:05:00Z', detail: 'Assigned to Ana Torres' },
      { action: 'status_changed', from: 'assigned', to: 'in_progress', by: 'Ana Torres', timestamp: daysAgo(4) + 'T12:00:00Z' },
      { action: 'status_changed', from: 'in_progress', to: 'resolved', by: 'Ana Torres', timestamp: daysAgo(3) + 'T16:00:00Z', detail: 'Thermostat recalibrated. Unit holding at 138\u00B0F.' },
      { action: 'status_changed', from: 'resolved', to: 'verified', by: 'Sofia Chen', timestamp: daysAgo(2) + 'T09:30:00Z', detail: 'Verified unit performing within spec.' },
    ],
  },
  {
    id: 'ca-5', title: 'Pest control service overdue',
    description: 'Monthly pest control service is 10 days overdue. Contact vendor to reschedule immediately.',
    location: 'Location 2', locationId: 'airport', category: 'operational', severity: 'medium', status: 'assigned',
    source: 'Vendor Tracking', source_type: 'manual', source_id: null,
    assignee: 'Michael Torres', assigned_by: 'Sofia Chen', assignedAt: daysAgo(8),
    createdAt: daysAgo(10), dueDate: daysAgo(3),
    resolvedAt: null, resolved_by: null, resolution_note: null,
    verifiedAt: null, verified_by: null, verification_note: null,
    rootCause: 'Vendor had scheduling conflict. Rescheduling not followed up.',
    correctiveSteps: '', preventiveMeasures: '',
    regulationReference: 'Vendor SLA / FDA Food Code', templateId: 'tpl-op-01', ai_draft: null,
    notes: [], attachments: [],
    history: [
      { action: 'status_changed', to: 'reported', by: 'Sofia Chen', timestamp: daysAgo(10) + 'T09:00:00Z' },
      { action: 'status_changed', from: 'reported', to: 'assigned', by: 'Sofia Chen', timestamp: daysAgo(8) + 'T10:00:00Z', detail: 'Assigned to Michael Torres' },
    ],
  },
  {
    id: 'ca-6', title: 'Employee food handler card expiring',
    description: 'Food handler certification for two staff members expires within 14 days. Schedule renewal.',
    location: 'Location 3', locationId: 'university', category: 'food_safety', severity: 'low', status: 'in_progress',
    source: 'Regulatory Tracking', source_type: 'manual', source_id: null,
    assignee: 'Sofia Chen', assigned_by: 'David Kim', assignedAt: daysAgo(6),
    createdAt: daysAgo(7), dueDate: daysFromNow(7),
    resolvedAt: null, resolved_by: null, resolution_note: null,
    verifiedAt: null, verified_by: null, verification_note: null,
    rootCause: 'Certification renewal not flagged until 14-day warning.',
    correctiveSteps: 'Both staff members registered for online renewal course.',
    preventiveMeasures: 'Set 90-day advance reminder for all certifications.',
    regulationReference: 'State Health Code', templateId: 'tpl-fs-06', ai_draft: null,
    notes: [], attachments: [],
    history: [
      { action: 'status_changed', to: 'reported', by: 'David Kim', timestamp: daysAgo(7) + 'T08:00:00Z' },
      { action: 'status_changed', from: 'reported', to: 'assigned', by: 'David Kim', timestamp: daysAgo(6) + 'T09:00:00Z', detail: 'Assigned to Sofia Chen' },
      { action: 'status_changed', from: 'assigned', to: 'in_progress', by: 'Sofia Chen', timestamp: daysAgo(5) + 'T10:00:00Z' },
    ],
  },
  {
    id: 'ca-7', title: 'Cutting board cross-contamination risk',
    description: 'Color-coded cutting boards not separated by protein type during prep. Staff retrained on SOP.',
    location: 'Location 1', locationId: 'downtown', category: 'food_safety', severity: 'high', status: 'resolved',
    source: 'HACCP Monitoring', source_type: 'checklist', source_id: null,
    assignee: 'David Kim', assigned_by: 'Ana Torres', assignedAt: daysAgo(6),
    createdAt: daysAgo(6), dueDate: daysAgo(4),
    resolvedAt: daysAgo(5), resolved_by: 'David Kim', resolution_note: 'All cutting boards sanitized. Staff retrained on color-coded board system. Chart posted at prep station.',
    verifiedAt: null, verified_by: null, verification_note: null,
    rootCause: 'New prep cook not trained on color-coded board system.',
    correctiveSteps: 'All cutting boards sanitized. Staff retrained on SOP. Color chart posted at prep station.',
    preventiveMeasures: 'Added color-coded board training to new hire orientation checklist.',
    regulationReference: 'FDA Food Code 3-302.11', templateId: 'tpl-fs-04', ai_draft: null,
    notes: [], attachments: [],
    history: [
      { action: 'status_changed', to: 'reported', by: 'Ana Torres', timestamp: daysAgo(6) + 'T14:00:00Z' },
      { action: 'status_changed', from: 'reported', to: 'assigned', by: 'Ana Torres', timestamp: daysAgo(6) + 'T14:05:00Z', detail: 'Assigned to David Kim' },
      { action: 'status_changed', from: 'assigned', to: 'in_progress', by: 'David Kim', timestamp: daysAgo(6) + 'T15:00:00Z' },
      { action: 'status_changed', from: 'in_progress', to: 'resolved', by: 'David Kim', timestamp: daysAgo(5) + 'T11:00:00Z', detail: 'Staff retrained on SOP. Color chart posted.' },
    ],
  },
  {
    id: 'ca-8', title: 'Receiving log missing for Thursday delivery',
    description: 'Produce delivery on Thursday was not logged in the receiving log. Vendor invoice used to backfill record.',
    location: 'Location 2', locationId: 'airport', category: 'food_safety', severity: 'medium', status: 'verified',
    source: 'Audit Trail Review', source_type: 'inspection', source_id: null,
    assignee: 'Lisa Nguyen', assigned_by: 'Sofia Chen', assignedAt: daysAgo(7),
    createdAt: daysAgo(8), dueDate: daysAgo(5),
    resolvedAt: daysAgo(6), resolved_by: 'Lisa Nguyen', resolution_note: 'Record backfilled from vendor invoice #4821. All product temperatures verified acceptable.',
    verifiedAt: daysAgo(5), verified_by: 'Sofia Chen', verification_note: 'Backfilled record verified against vendor invoice. Process gap addressed.',
    rootCause: 'Delivery arrived during lunch rush. Receiving staff pulled to front-of-house.',
    correctiveSteps: 'Record backfilled from vendor invoice. All product temps verified acceptable.',
    preventiveMeasures: 'Assigned backup receiver for high-volume periods.',
    regulationReference: 'FDA Food Code 3-202.11', templateId: 'tpl-fs-05', ai_draft: null,
    notes: [
      { text: 'Backfilled record from vendor invoice #4821.', author: 'Lisa Nguyen', timestamp: daysAgo(6) + 'T11:00:00Z' },
    ],
    attachments: [
      { name: 'vendor-invoice-4821.pdf', url: '#', type: 'application/pdf' },
    ],
    history: [
      { action: 'status_changed', to: 'reported', by: 'Sofia Chen', timestamp: daysAgo(8) + 'T09:00:00Z' },
      { action: 'status_changed', from: 'reported', to: 'assigned', by: 'Sofia Chen', timestamp: daysAgo(7) + 'T10:00:00Z', detail: 'Assigned to Lisa Nguyen' },
      { action: 'status_changed', from: 'assigned', to: 'in_progress', by: 'Lisa Nguyen', timestamp: daysAgo(7) + 'T11:00:00Z' },
      { action: 'status_changed', from: 'in_progress', to: 'resolved', by: 'Lisa Nguyen', timestamp: daysAgo(6) + 'T11:00:00Z', detail: 'Record backfilled from vendor invoice.' },
      { action: 'status_changed', from: 'resolved', to: 'verified', by: 'Sofia Chen', timestamp: daysAgo(5) + 'T09:00:00Z', detail: 'Verified against vendor invoice. Gap addressed.' },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────

export function getTemplatesByCategory(category: CACategory | 'all'): CATemplate[] {
  if (category === 'all') return CA_SYSTEM_TEMPLATES.filter(t => t.is_active);
  return CA_SYSTEM_TEMPLATES.filter(t => t.category === category && t.is_active);
}

export function getTemplateById(id: string): CATemplate | undefined {
  return CA_SYSTEM_TEMPLATES.find(t => t.id === id);
}

export const CATEGORY_LABELS: Record<CACategory, string> = {
  food_safety: 'Food Safety',
  facility_safety: 'Facility Safety',
  operational: 'Operational',
};

export const SEVERITY_LABELS: Record<CASeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const SOURCE_TYPE_LABELS: Record<CASourceType, string> = {
  inspection: 'Inspection',
  checklist: 'Checklist',
  temperature: 'Temperature Log',
  self_inspection: 'Self-Inspection',
  manual: 'Manual',
  incident: 'Incident Report',
};

export function getCAById(id: string): CorrectiveActionItem | undefined {
  return DEMO_CORRECTIVE_ACTIONS.find(a => a.id === id);
}

export function isOverdue(item: CorrectiveActionItem): boolean {
  if (['resolved', 'verified'].includes(item.status)) return false;
  return new Date(item.dueDate) < new Date(new Date().toISOString().slice(0, 10));
}
