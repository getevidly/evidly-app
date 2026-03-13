/**
 * DEFICIENCIES-1 — Deficiency Types, Demo Data & Helpers
 *
 * 12 demo deficiencies spread across 3 locations with varied statuses/severities.
 * Follows the same pattern as correctiveActionsDemoData.ts.
 */

// ── Types ─────────────────────────────────────────────────────

export type DefSeverity = 'critical' | 'major' | 'minor' | 'advisory';
export type DefStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'deferred';

export interface DeficiencyTimelineEntry {
  status: DefStatus;
  date: string;
  by: string;
  notes?: string;
  notificationMethod?: 'in_person' | 'email' | 'phone';
}

export interface DeficiencyItem {
  id: string;
  code: string;
  title: string;
  description: string;
  locationDescription: string;
  severity: DefSeverity;
  status: DefStatus;
  locationId: string;
  locationName: string;
  customerName: string;
  equipmentId: string | null;
  equipmentName: string | null;
  serviceRecordId: string | null;
  foundBy: string;
  foundDate: string;
  requiredAction: string;
  timelineRequirement: 'immediate' | '30_days' | '90_days' | 'next_service';
  estimatedCost: number | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  followUpServiceRecordId: string | null;
  deferredReason: string | null;
  deferredUntil: string | null;
  timeline: DeficiencyTimelineEntry[];
  photoIds: string[];
  resolutionPhotoIds: string[];
  aiDetected: boolean;
  aiConfidence: number | null;
}

// ── Severity / Status Configs ─────────────────────────────────

export const SEVERITY_CONFIG: Record<DefSeverity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  major:    { label: 'Major',    color: '#9a3412', bg: '#fff7ed', border: '#fed7aa' },
  minor:    { label: 'Minor',    color: '#854d0e', bg: '#fefce8', border: '#fde68a' },
  advisory: { label: 'Advisory', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
};

export const STATUS_CONFIG: Record<DefStatus, { label: string; color: string; bg: string }> = {
  open:         { label: 'Open',         color: '#dc2626', bg: '#fef2f2' },
  acknowledged: { label: 'Acknowledged', color: '#d97706', bg: '#fffbeb' },
  in_progress:  { label: 'In Progress',  color: '#2563eb', bg: '#eff6ff' },
  resolved:     { label: 'Resolved',     color: '#16a34a', bg: '#f0fdf4' },
  deferred:     { label: 'Deferred',     color: '#6b7280', bg: '#f3f4f6' },
};

export const SEVERITY_ORDER: Record<DefSeverity, number> = {
  critical: 0,
  major: 1,
  minor: 2,
  advisory: 3,
};

export const TIMELINE_REQUIREMENT_LABELS: Record<string, string> = {
  immediate: 'Immediate',
  '30_days': 'Within 30 Days',
  '90_days': 'Within 90 Days',
  next_service: 'Next Service Visit',
};

// ── Date Helpers ──────────────────────────────────────────────

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

// ── 12 Demo Deficiencies ──────────────────────────────────────

export const DEMO_DEFICIENCIES: DeficiencyItem[] = [
  // ── OPEN (3) ────────────────────────────────────────────────
  {
    id: 'def-1',
    code: 'NFPA96-11.4.1',
    title: 'Grease buildup exceeds acceptable depth on hood filters',
    description: 'Kitchen exhaust hood filters show grease accumulation exceeding 1/4 inch depth, creating fire hazard per NFPA 96 Section 11.4.1.',
    locationDescription: 'Main hood system above fryer bank, filters #3 and #4',
    severity: 'critical',
    status: 'open',
    locationId: 'downtown',
    locationName: 'Downtown Kitchen',
    customerName: 'Maria Rodriguez',
    equipmentId: 'eq-hood-1',
    equipmentName: 'Main Exhaust Hood',
    serviceRecordId: 'sr-3',
    foundBy: 'James Wilson (Pacific Hood Cleaning)',
    foundDate: daysAgo(2),
    requiredAction: 'Clean all hood filters to bare metal. Increase cleaning frequency from quarterly to monthly until buildup pattern is addressed.',
    timelineRequirement: 'immediate',
    estimatedCost: 450,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    followUpServiceRecordId: null,
    deferredReason: null,
    deferredUntil: null,
    timeline: [
      { status: 'open', date: daysAgo(2), by: 'James Wilson', notes: 'Found during scheduled hood cleaning. Filters #3 and #4 exceeded acceptable grease depth.' },
    ],
    photoIds: [],
    resolutionPhotoIds: [],
    aiDetected: false,
    aiConfidence: null,
  },
  {
    id: 'def-2',
    code: 'NFPA96-10.2.1',
    title: 'Fire suppression system nozzle misaligned',
    description: 'Kitchen fire suppression nozzle above the charbroiler has shifted from its aimed position, potentially reducing coverage area per NFPA 96 Section 10.2.1.',
    locationDescription: 'Charbroiler station, nozzle #2 (center)',
    severity: 'major',
    status: 'open',
    locationId: 'airport',
    locationName: 'Airport Concourse B',
    customerName: 'Maria Rodriguez',
    equipmentId: 'eq-suppression-1',
    equipmentName: 'UL-300 Suppression System',
    serviceRecordId: 'sr-7',
    foundBy: 'Carlos Mendez (FireGuard Services)',
    foundDate: daysAgo(5),
    requiredAction: 'Realign suppression nozzle to manufacturer-specified aim point. Re-tag system after adjustment.',
    timelineRequirement: '30_days',
    estimatedCost: 275,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    followUpServiceRecordId: null,
    deferredReason: null,
    deferredUntil: null,
    timeline: [
      { status: 'open', date: daysAgo(5), by: 'Carlos Mendez', notes: 'Nozzle #2 found off-center during semi-annual inspection.' },
    ],
    photoIds: [],
    resolutionPhotoIds: [],
    aiDetected: false,
    aiConfidence: null,
  },
  {
    id: 'def-3',
    code: 'CalCode-114099',
    title: 'Wall-mounted thermometer missing from walk-in cooler',
    description: 'Required wall-mounted thermometer not present in walk-in cooler per California Retail Food Code Section 114099.',
    locationDescription: 'Walk-in cooler #1, main kitchen',
    severity: 'minor',
    status: 'open',
    locationId: 'university',
    locationName: 'University Dining Hall',
    customerName: 'Maria Rodriguez',
    equipmentId: null,
    equipmentName: null,
    serviceRecordId: null,
    foundBy: 'Sofia Chen',
    foundDate: daysAgo(1),
    requiredAction: 'Install NIST-traceable wall thermometer in a visible location inside the walk-in cooler.',
    timelineRequirement: '30_days',
    estimatedCost: 25,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    followUpServiceRecordId: null,
    deferredReason: null,
    deferredUntil: null,
    timeline: [
      { status: 'open', date: daysAgo(1), by: 'Sofia Chen', notes: 'Noticed during self-inspection walkthrough.' },
    ],
    photoIds: [],
    resolutionPhotoIds: [],
    aiDetected: false,
    aiConfidence: null,
  },

  // ── ACKNOWLEDGED (2) ────────────────────────────────────────
  {
    id: 'def-4',
    code: 'NFPA96-11.6.2',
    title: 'Access panel screws missing on exhaust duct',
    description: 'Two access panel screws missing on horizontal exhaust duct section, preventing proper seal per NFPA 96 Section 11.6.2.',
    locationDescription: 'Horizontal duct run between hood and fan, access panel #3',
    severity: 'major',
    status: 'acknowledged',
    locationId: 'downtown',
    locationName: 'Downtown Kitchen',
    customerName: 'Maria Rodriguez',
    equipmentId: 'eq-hood-1',
    equipmentName: 'Main Exhaust Hood',
    serviceRecordId: 'sr-3',
    foundBy: 'James Wilson (Pacific Hood Cleaning)',
    foundDate: daysAgo(8),
    requiredAction: 'Replace missing screws with proper quarter-turn access panel fasteners. Verify all other access panels are secured.',
    timelineRequirement: '30_days',
    estimatedCost: 50,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    followUpServiceRecordId: null,
    deferredReason: null,
    deferredUntil: null,
    timeline: [
      { status: 'open', date: daysAgo(8), by: 'James Wilson', notes: 'Found during hood cleaning — 2 screws missing on access panel #3.' },
      { status: 'acknowledged', date: daysAgo(6), by: 'Michael Torres', notes: 'Parts ordered from supplier.', notificationMethod: 'email' },
    ],
    photoIds: [],
    resolutionPhotoIds: [],
    aiDetected: false,
    aiConfidence: null,
  },
  {
    id: 'def-5',
    code: 'CalCode-114039',
    title: 'Floor tile cracked in food prep area',
    description: 'Cracked floor tile in food preparation area creating potential harborage point for bacteria per California Retail Food Code Section 114039.',
    locationDescription: 'Prep area, tile row 3 near hand sink',
    severity: 'minor',
    status: 'acknowledged',
    locationId: 'airport',
    locationName: 'Airport Concourse B',
    customerName: 'Maria Rodriguez',
    equipmentId: null,
    equipmentName: null,
    serviceRecordId: null,
    foundBy: 'David Kim',
    foundDate: daysAgo(12),
    requiredAction: 'Replace cracked tile and re-grout surrounding area. Ensure seamless, smooth finish.',
    timelineRequirement: '90_days',
    estimatedCost: 350,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    followUpServiceRecordId: null,
    deferredReason: null,
    deferredUntil: null,
    timeline: [
      { status: 'open', date: daysAgo(12), by: 'David Kim', notes: 'Spotted during morning walk-through.' },
      { status: 'acknowledged', date: daysAgo(10), by: 'Michael Torres', notes: 'Tile repair added to next facilities maintenance window.', notificationMethod: 'in_person' },
    ],
    photoIds: [],
    resolutionPhotoIds: [],
    aiDetected: false,
    aiConfidence: null,
  },

  // ── IN PROGRESS (2) ─────────────────────────────────────────
  {
    id: 'def-6',
    code: 'NFPA96-7.8.1',
    title: 'Rooftop grease containment system overflow',
    description: 'Rooftop grease containment unit has overflowed, causing grease runoff onto roof surface per NFPA 96 Section 7.8.1.',
    locationDescription: 'Rooftop, above main kitchen exhaust fan',
    severity: 'critical',
    status: 'in_progress',
    locationId: 'downtown',
    locationName: 'Downtown Kitchen',
    customerName: 'Maria Rodriguez',
    equipmentId: 'eq-fan-1',
    equipmentName: 'Rooftop Exhaust Fan',
    serviceRecordId: 'sr-3',
    foundBy: 'James Wilson (Pacific Hood Cleaning)',
    foundDate: daysAgo(10),
    requiredAction: 'Clean grease containment system. Replace absorbent pads. Clean grease from roof surface. Schedule monthly containment checks.',
    timelineRequirement: 'immediate',
    estimatedCost: 600,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    followUpServiceRecordId: null,
    deferredReason: null,
    deferredUntil: null,
    timeline: [
      { status: 'open', date: daysAgo(10), by: 'James Wilson', notes: 'Grease overflow found during hood cleaning. Containment unit full.' },
      { status: 'acknowledged', date: daysAgo(9), by: 'Michael Torres', notes: 'Vendor contacted for emergency cleanup.', notificationMethod: 'phone' },
      { status: 'in_progress', date: daysAgo(7), by: 'Michael Torres', notes: 'Cleanup crew scheduled. Absorbent pads on order.' },
    ],
    photoIds: [],
    resolutionPhotoIds: [],
    aiDetected: false,
    aiConfidence: null,
  },
  {
    id: 'def-7',
    code: 'CalCode-114097',
    title: 'Handwashing sign missing at prep sink',
    description: 'Required handwashing signage missing at food preparation area handwashing station per California Retail Food Code Section 114097.',
    locationDescription: 'Prep area hand sink, west wall',
    severity: 'minor',
    status: 'in_progress',
    locationId: 'university',
    locationName: 'University Dining Hall',
    customerName: 'Maria Rodriguez',
    equipmentId: null,
    equipmentName: null,
    serviceRecordId: null,
    foundBy: 'Ana Torres',
    foundDate: daysAgo(6),
    requiredAction: 'Install compliant handwashing signage at all handwashing stations. Verify all locations.',
    timelineRequirement: '30_days',
    estimatedCost: 15,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    followUpServiceRecordId: null,
    deferredReason: null,
    deferredUntil: null,
    timeline: [
      { status: 'open', date: daysAgo(6), by: 'Ana Torres', notes: 'Sign missing — may have fallen off during cleaning.' },
      { status: 'acknowledged', date: daysAgo(5), by: 'David Kim', notificationMethod: 'in_person' },
      { status: 'in_progress', date: daysAgo(3), by: 'David Kim', notes: 'New signs ordered from supplier. Arriving in 2 days.' },
    ],
    photoIds: [],
    resolutionPhotoIds: [],
    aiDetected: false,
    aiConfidence: null,
  },

  // ── RESOLVED (3) ────────────────────────────────────────────
  {
    id: 'def-8',
    code: 'NFPA96-11.4.1',
    title: 'Grease drip tray not properly seated',
    description: 'Hood grease drip tray found unseated, allowing grease to bypass collection system per NFPA 96 Section 11.4.1.',
    locationDescription: 'Main hood, grease tray slot #2',
    severity: 'major',
    status: 'resolved',
    locationId: 'airport',
    locationName: 'Airport Concourse B',
    customerName: 'Maria Rodriguez',
    equipmentId: 'eq-hood-2',
    equipmentName: 'Concourse Hood System',
    serviceRecordId: 'sr-7',
    foundBy: 'Carlos Mendez (FireGuard Services)',
    foundDate: daysAgo(20),
    requiredAction: 'Reseat grease tray. Inspect tray rails for damage. Replace tray if warped.',
    timelineRequirement: 'immediate',
    estimatedCost: null,
    resolvedAt: daysAgo(18),
    resolvedBy: 'Carlos Mendez',
    resolutionNotes: 'Tray reseated during service visit. Rails inspected — no damage. Added to cleaning checklist.',
    followUpServiceRecordId: 'sr-7',
    deferredReason: null,
    deferredUntil: null,
    timeline: [
      { status: 'open', date: daysAgo(20), by: 'Carlos Mendez', notes: 'Found during semi-annual inspection.' },
      { status: 'acknowledged', date: daysAgo(20), by: 'Michael Torres', notificationMethod: 'in_person' },
      { status: 'in_progress', date: daysAgo(18), by: 'Carlos Mendez', notes: 'Reseating tray on-site.' },
      { status: 'resolved', date: daysAgo(18), by: 'Carlos Mendez', notes: 'Tray reseated and verified. No replacement needed.' },
    ],
    photoIds: [],
    resolutionPhotoIds: [],
    aiDetected: false,
    aiConfidence: null,
  },
  {
    id: 'def-9',
    code: 'CalCode-114099',
    title: 'Thermometer out of calibration in hot holding',
    description: 'Hot holding unit thermometer reading 8 degrees high compared to reference thermometer per California Retail Food Code Section 114099.',
    locationDescription: 'Hot holding station #2, service line',
    severity: 'major',
    status: 'resolved',
    locationId: 'downtown',
    locationName: 'Downtown Kitchen',
    customerName: 'Maria Rodriguez',
    equipmentId: null,
    equipmentName: null,
    serviceRecordId: null,
    foundBy: 'Ana Torres',
    foundDate: daysAgo(15),
    requiredAction: 'Calibrate or replace thermometer. Verify with NIST-traceable reference.',
    timelineRequirement: '30_days',
    estimatedCost: 35,
    resolvedAt: daysAgo(12),
    resolvedBy: 'David Kim',
    resolutionNotes: 'Replaced thermometer with new calibrated unit. Old unit discarded. Verified accuracy with ice bath method.',
    followUpServiceRecordId: null,
    deferredReason: null,
    deferredUntil: null,
    timeline: [
      { status: 'open', date: daysAgo(15), by: 'Ana Torres', notes: 'Caught during temp log review — readings consistently high.' },
      { status: 'acknowledged', date: daysAgo(14), by: 'David Kim', notificationMethod: 'email' },
      { status: 'in_progress', date: daysAgo(13), by: 'David Kim', notes: 'New thermometer ordered.' },
      { status: 'resolved', date: daysAgo(12), by: 'David Kim', notes: 'Installed and verified new thermometer.' },
    ],
    photoIds: [],
    resolutionPhotoIds: [],
    aiDetected: false,
    aiConfidence: null,
  },
  {
    id: 'def-10',
    code: 'NFPA96-10.5.1',
    title: 'Manual pull station obstructed by shelving',
    description: 'Fire suppression manual pull station partially blocked by shelving unit per NFPA 96 Section 10.5.1.',
    locationDescription: 'East wall near back exit, pull station #1',
    severity: 'critical',
    status: 'resolved',
    locationId: 'university',
    locationName: 'University Dining Hall',
    customerName: 'Maria Rodriguez',
    equipmentId: 'eq-suppression-2',
    equipmentName: 'Hood Suppression System',
    serviceRecordId: null,
    foundBy: 'Fire Inspector L. Martinez',
    foundDate: daysAgo(25),
    requiredAction: 'Relocate shelving to maintain 36-inch clearance around manual pull station at all times.',
    timelineRequirement: 'immediate',
    estimatedCost: null,
    resolvedAt: daysAgo(25),
    resolvedBy: 'Michael Torres',
    resolutionNotes: 'Shelving unit relocated 4 feet south. 36-inch clearance verified. Staff briefed on keeping area clear.',
    followUpServiceRecordId: null,
    deferredReason: null,
    deferredUntil: null,
    timeline: [
      { status: 'open', date: daysAgo(25), by: 'Fire Inspector L. Martinez', notes: 'Cited during annual fire inspection.' },
      { status: 'acknowledged', date: daysAgo(25), by: 'Michael Torres', notificationMethod: 'in_person' },
      { status: 'in_progress', date: daysAgo(25), by: 'Michael Torres', notes: 'Moving shelving unit now.' },
      { status: 'resolved', date: daysAgo(25), by: 'Michael Torres', notes: 'Resolved same day. Clearance verified.' },
    ],
    photoIds: [],
    resolutionPhotoIds: [],
    aiDetected: false,
    aiConfidence: null,
  },

  // ── DEFERRED (1) ────────────────────────────────────────────
  {
    id: 'def-11',
    code: 'CalCode-114271',
    title: 'Ceiling tile stained above dish area',
    description: 'Ceiling tile above dish washing area showing water stain. Not currently leaking but indicates past moisture intrusion per California Retail Food Code Section 114271.',
    locationDescription: 'Dish pit area, ceiling tile row B, tile #4',
    severity: 'minor',
    status: 'deferred',
    locationId: 'airport',
    locationName: 'Airport Concourse B',
    customerName: 'Maria Rodriguez',
    equipmentId: null,
    equipmentName: null,
    serviceRecordId: null,
    foundBy: 'Sofia Chen',
    foundDate: daysAgo(30),
    requiredAction: 'Replace stained ceiling tile. Investigate source of moisture intrusion above ceiling.',
    timelineRequirement: '90_days',
    estimatedCost: 125,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    followUpServiceRecordId: null,
    deferredReason: 'Airport terminal renovations starting next month will include ceiling replacement in this area. Deferring to avoid duplicate work.',
    deferredUntil: daysFromNow(45),
    timeline: [
      { status: 'open', date: daysAgo(30), by: 'Sofia Chen', notes: 'Found during compliance walkthrough.' },
      { status: 'acknowledged', date: daysAgo(28), by: 'Michael Torres', notificationMethod: 'email' },
      { status: 'deferred', date: daysAgo(25), by: 'Michael Torres', notes: 'Deferred to align with terminal renovation project.' },
    ],
    photoIds: [],
    resolutionPhotoIds: [],
    aiDetected: false,
    aiConfidence: null,
  },

  // ── ADVISORY / AI-DETECTED (1) ──────────────────────────────
  {
    id: 'def-12',
    code: 'NFPA96-11.4',
    title: 'Potential grease accumulation pattern detected',
    description: 'AI analysis of recent service records and temperature patterns suggests accelerated grease accumulation rate on the hood system, which may require increased cleaning frequency per NFPA 96 Section 11.4.',
    locationDescription: 'Main hood system, full bank',
    severity: 'advisory',
    status: 'open',
    locationId: 'downtown',
    locationName: 'Downtown Kitchen',
    customerName: 'Maria Rodriguez',
    equipmentId: 'eq-hood-1',
    equipmentName: 'Main Exhaust Hood',
    serviceRecordId: null,
    foundBy: 'EvidLY Intelligence',
    foundDate: daysAgo(3),
    requiredAction: 'Review cleaning frequency with hood vendor. Consider switching from quarterly to bi-monthly schedule based on usage patterns.',
    timelineRequirement: 'next_service',
    estimatedCost: null,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    followUpServiceRecordId: null,
    deferredReason: null,
    deferredUntil: null,
    timeline: [
      { status: 'open', date: daysAgo(3), by: 'EvidLY Intelligence', notes: 'Pattern detected from service record analysis and temperature trend data.' },
    ],
    photoIds: [],
    resolutionPhotoIds: [],
    aiDetected: true,
    aiConfidence: 78,
  },
];

// ── Helpers ───────────────────────────────────────────────────

export function getDeficiencyById(id: string): DeficiencyItem | undefined {
  return DEMO_DEFICIENCIES.find(d => d.id === id);
}

export function daysOpen(item: DeficiencyItem): number {
  const end = item.resolvedAt ? new Date(item.resolvedAt) : new Date();
  const start = new Date(item.foundDate);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

export function isUrgent(item: DeficiencyItem): boolean {
  if (['resolved', 'deferred'].includes(item.status)) return false;
  if (item.timelineRequirement === 'immediate') return true;
  if (item.timelineRequirement === '30_days' && daysOpen(item) > 30) return true;
  if (item.timelineRequirement === '90_days' && daysOpen(item) > 90) return true;
  return false;
}
