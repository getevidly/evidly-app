/**
 * Role-specific demo calendar events for dashboard CalendarCard widgets.
 * Each role sees events relevant to their responsibilities.
 */

import type { CalendarEvent } from '../components/dashboard/shared/CalendarCard';

// ── Type/Color configs per role ────────────────────────

export const OWNER_OPERATOR_CALENDAR = {
  typeColors: {
    inspection: '#7c3aed',
    vendor: '#2563eb',
    meeting: '#0891b2',
    certification: '#d97706',
    corrective: '#dc2626',
  } as Record<string, string>,
  typeLabels: {
    inspection: 'Inspection',
    vendor: 'Vendor',
    meeting: 'Meeting',
    certification: 'Certification',
    corrective: 'Corrective',
  } as Record<string, string>,
};

export const EXECUTIVE_CALENDAR = {
  typeColors: {
    review: '#1E2D4D',
    inspection: '#7c3aed',
    certification: '#d97706',
    meeting: '#0891b2',
  } as Record<string, string>,
  typeLabels: {
    review: 'Review',
    inspection: 'Inspection',
    certification: 'Certification',
    meeting: 'Meeting',
  } as Record<string, string>,
};

export const COMPLIANCE_CALENDAR = {
  typeColors: {
    inspection: '#7c3aed',
    reinspection: '#dc2626',
    'self-inspection': '#16a34a',
    regulatory: '#d97706',
  } as Record<string, string>,
  typeLabels: {
    inspection: 'Inspection',
    reinspection: 'Reinspection',
    'self-inspection': 'Self-Inspection',
    regulatory: 'Regulatory',
  } as Record<string, string>,
};

export const KITCHEN_MANAGER_CALENDAR = {
  typeColors: {
    checklist: '#2563eb',
    'temp-check': '#dc2626',
    vendor: '#7c3aed',
    meeting: '#0891b2',
  } as Record<string, string>,
  typeLabels: {
    checklist: 'Checklist',
    'temp-check': 'Temp Check',
    vendor: 'Vendor',
    meeting: 'Meeting',
  } as Record<string, string>,
};

export const FACILITIES_CALENDAR = {
  typeColors: {
    maintenance: '#d97706',
    vendor: '#2563eb',
    permit: '#dc2626',
    inspection: '#7c3aed',
  } as Record<string, string>,
  typeLabels: {
    maintenance: 'Maintenance',
    vendor: 'Vendor',
    permit: 'Permit',
    inspection: 'Inspection',
  } as Record<string, string>,
};

// ── Demo events (relative to current date) ────────────────────

function d(offset: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const OWNER_OPERATOR_EVENTS: CalendarEvent[] = [
  { date: d(0), type: 'meeting', title: 'Staff Safety Meeting — Location 1', location: 'Location 1', priority: 'medium' },
  { date: d(1), type: 'vendor', title: 'Hood Cleaning Service', location: 'Location 1', priority: 'high' },
  { date: d(2), type: 'meeting', title: 'Team Compliance Review', location: 'Location 1', priority: 'medium' },
  { date: d(2), type: 'vendor', title: 'Grease Trap Service', location: 'Location 2', priority: 'medium' },
  { date: d(3), type: 'inspection', title: 'Fire Suppression Inspection', location: 'Location 1', priority: 'high' },
  { date: d(5), type: 'certification', title: 'ServSafe Certification Renewal', location: 'Location 1', priority: 'high' },
  { date: d(5), type: 'vendor', title: 'Pest Control Service', location: 'Location 2', priority: 'medium' },
  { date: d(7), type: 'vendor', title: 'Refrigeration Maintenance', location: 'Location 3', priority: 'medium' },
  { date: d(10), type: 'certification', title: 'Health Permit Renewal', location: 'Location 2', priority: 'critical' },
  { date: d(14), type: 'inspection', title: 'Quarterly Compliance Review', location: 'Location 1', priority: 'high' },
  { date: d(-2), type: 'corrective', title: 'Recalibrate Freezer Thermometer', location: 'Location 3', priority: 'critical' },
  { date: d(-5), type: 'corrective', title: 'Fix Walk-in Door Seal', location: 'Location 2', priority: 'critical' },
];

export const EXECUTIVE_EVENTS: CalendarEvent[] = [
  { date: d(0), type: 'meeting', title: 'Quarterly Board Meeting', location: 'Corporate', priority: 'high' },
  { date: d(3), type: 'review', title: 'Q1 Compliance Review', location: 'All Locations', priority: 'high' },
  { date: d(5), type: 'certification', title: 'ServSafe Certification Renewal', location: 'Location 1', priority: 'medium' },
  { date: d(7), type: 'inspection', title: 'Facility Safety Audit', location: 'Location 1', priority: 'high' },
  { date: d(10), type: 'certification', title: 'Health Permit Renewal', location: 'Location 2', priority: 'critical' },
  { date: d(14), type: 'review', title: 'Insurance Risk Assessment', location: 'All Locations', priority: 'high' },
  { date: d(21), type: 'meeting', title: 'Monthly Executive Sync', location: 'Corporate', priority: 'medium' },
  { date: d(-1), type: 'inspection', title: 'Health Department Inspection', location: 'Location 2', priority: 'high' },
];

export const COMPLIANCE_EVENTS: CalendarEvent[] = [
  { date: d(0), type: 'inspection', title: 'Prep for Location 2 Reinspection', location: 'Location 2', priority: 'critical' },
  { date: d(4), type: 'reinspection', title: 'Location 2 Reinspection', location: 'Location 2', priority: 'critical' },
  { date: d(7), type: 'self-inspection', title: 'Monthly Self-Inspection — Location 1', location: 'Location 1', priority: 'medium' },
  { date: d(10), type: 'regulatory', title: 'CalCode AB-1228 Effective Date', location: 'All Locations', priority: 'high' },
  { date: d(14), type: 'inspection', title: 'Annual Food Safety Inspection', location: 'Location 1', priority: 'high' },
  { date: d(21), type: 'self-inspection', title: 'Monthly Self-Inspection — Location 2', location: 'Location 2', priority: 'medium' },
  { date: d(-5), type: 'reinspection', title: 'Location 3 Reinspection Overdue', location: 'Location 3', priority: 'critical' },
  { date: d(28), type: 'self-inspection', title: 'Monthly Self-Inspection — Location 3', location: 'Location 3', priority: 'medium' },
];

export const KITCHEN_MANAGER_EVENTS: CalendarEvent[] = [
  { date: d(0), type: 'checklist', title: 'Opening Checklist', location: 'Location 1', priority: 'medium' },
  { date: d(0), type: 'meeting', title: 'Staff Safety Meeting', location: 'Location 1', priority: 'medium' },
  { date: d(1), type: 'vendor', title: 'Hood Cleaning Service', location: 'Location 1', priority: 'high' },
  { date: d(2), type: 'meeting', title: 'Team Compliance Meeting', location: 'Location 1', priority: 'medium' },
  { date: d(3), type: 'checklist', title: 'HACCP Plan Review', location: 'Location 1', priority: 'high' },
  { date: d(5), type: 'vendor', title: 'Pest Control Service', location: 'Location 1', priority: 'medium' },
  { date: d(7), type: 'meeting', title: 'Manager Safety Meeting', location: 'Location 1', priority: 'medium' },
  { date: d(10), type: 'checklist', title: 'Monthly Equipment Audit', location: 'Location 1', priority: 'high' },
  { date: d(-2), type: 'temp-check', title: 'Freezer Thermometer Recalibration', location: 'Location 1', priority: 'critical' },
];

export const FACILITIES_EVENTS: CalendarEvent[] = [
  { date: d(2), type: 'maintenance', title: 'Hood Cleaning — Location 1', location: 'Location 1', priority: 'high' },
  { date: d(6), type: 'vendor', title: 'Ansul Inspection — Location 2', location: 'Location 2', priority: 'high' },
  { date: d(10), type: 'permit', title: 'Operational Permit Renewal — Location 3', location: 'Location 3', priority: 'critical' },
  { date: d(15), type: 'vendor', title: 'Grease Trap Service — Location 1', location: 'Location 1', priority: 'medium' },
  { date: d(22), type: 'inspection', title: 'Facility Safety Self-Inspection — Location 2', location: 'Location 2', priority: 'medium' },
  { date: d(28), type: 'maintenance', title: 'Extinguisher Annual Inspection', location: 'All Locations', priority: 'high' },
  { date: d(-3), type: 'vendor', title: 'Fire Extinguisher Service', location: 'Location 1', priority: 'medium' },
];
