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

// ── No seeded demo data — corrective actions are created from ──
// ── inspections, checklists, temperature excursions, or manually ──

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

export function isOverdue(item: CorrectiveActionItem): boolean {
  if (['resolved', 'verified'].includes(item.status)) return false;
  return new Date(item.dueDate) < new Date(new Date().toISOString().slice(0, 10));
}
