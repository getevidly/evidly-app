import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutGrid, List, Plus, ChevronDown, ChevronRight,
  DollarSign, Wrench, Shield, AlertTriangle, Clock,
  MapPin, X, Calendar, TrendingUp, TrendingDown, Edit3, Truck, Package, Loader2, CheckCircle, Link2, Phone, Mail,
  Radio, Wifi, WifiOff, Battery, Signal, Flame, UtensilsCrossed,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Breadcrumb } from '../components/Breadcrumb';
import { getScoreColor } from '../lib/complianceScoring';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { PhotoEvidence, type PhotoRecord } from '../components/PhotoEvidence';
import { PhotoGallery } from '../components/PhotoGallery';
import { iotSensors, iotSensorReadings, iotSensorProviders } from '../data/demoData';

// ── Types ──────────────────────────────────────────────────────────

type Condition = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
type EquipmentStatus = 'operational' | 'needs_repair' | 'out_of_service' | 'decommissioned';

interface ServiceRecord {
  date: string;
  vendor: string;
  type: string;
  cost: number;
  notes: string;
}

interface ScheduleItem {
  task: string;
  interval: string;
  lastDone: string;
  nextDue: string;
}

interface VendorLink {
  vendor: string;
  serviceType: string;
  isPrimary: boolean;
}

interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  make: string;
  model: string;
  serial: string;
  locationId: string;
  location: string;
  installDate: string;
  purchasePrice: number;
  warrantyExpiry: string;
  warrantyProvider: string;
  warrantyTerms: string;
  warrantyContact?: string;
  condition: Condition;
  nextMaintenanceDue: string;
  maintenanceInterval: string;
  linkedVendor: string;
  linkedVendors?: VendorLink[];
  usefulLifeYears: number;
  replacementCost: number;
  status?: EquipmentStatus;
  pillar?: 'fire_safety' | 'food_safety';
  notes: string;
  serviceHistory: ServiceRecord[];
  schedule: ScheduleItem[];
}

// ── Constants ──────────────────────────────────────────────────────

const NOW = new Date('2026-02-09');
const LOCATIONS = [
  { id: '1', name: 'Downtown Kitchen' },
  { id: '2', name: 'Airport Cafe' },
  { id: '3', name: 'University Dining' },
];

const EQUIPMENT_TYPES = [
  'Walk-in Cooler', 'Walk-in Freezer', 'Hood System', 'Exhaust Fan', 'Fire Suppression System',
  'Commercial Fryer', 'Commercial Oven', 'Commercial Dishwasher', 'Ice Machine',
  'Grease Trap', 'Prep Cooler', 'Other',
];

const MAINTENANCE_INTERVALS = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Custom'];

// ── Helpers ────────────────────────────────────────────────────────

function daysBetween(a: string | Date, b: string | Date): number {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function ageLabel(installDate: string): string {
  const months = Math.floor((NOW.getTime() - new Date(installDate).getTime()) / (30.44 * 86400000));
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} yr${y !== 1 ? 's' : ''} ${m} mo`;
}

function ageYears(installDate: string): number {
  return (NOW.getTime() - new Date(installDate).getTime()) / (365.25 * 86400000);
}

function warrantyInfo(expiry: string) {
  const d = daysBetween(NOW, expiry);
  if (d < 0) return { label: 'Expired', color: '#dc2626', bg: '#fef2f2', days: d };
  if (d <= 90) return { label: 'Expiring Soon', color: '#d97706', bg: '#fffbeb', days: d };
  return { label: 'Active', color: '#16a34a', bg: '#f0fdf4', days: d };
}

function conditionStyle(c: string) {
  switch (c) {
    case 'Excellent': return { color: '#16a34a', bg: '#f0fdf4' };
    case 'Good': return { color: '#22c55e', bg: '#f0fdf4' };
    case 'Fair': return { color: '#d97706', bg: '#fffbeb' };
    case 'Poor': return { color: '#f97316', bg: '#fff7ed' };
    case 'Critical': return { color: '#dc2626', bg: '#fef2f2' };
    default: return { color: '#6b7280', bg: '#f9fafb' };
  }
}

function maintenanceStatus(nextDue: string) {
  const d = daysBetween(NOW, nextDue);
  if (d < 0) return { label: `${Math.abs(d)}d overdue`, color: '#dc2626', bg: '#fef2f2', overdue: true };
  if (d <= 7) return { label: `Due in ${d}d`, color: '#d97706', bg: '#fffbeb', overdue: false };
  if (d <= 30) return { label: `Due in ${d}d`, color: '#2563eb', bg: '#eff6ff', overdue: false };
  return { label: format(new Date(nextDue), 'MMM d, yyyy'), color: '#6b7280', bg: '#f9fafb', overdue: false };
}

function currency(n: number) {
  return '$' + n.toLocaleString();
}

const badge = (text: string, color: string, bg: string): React.CSSProperties => ({
  fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
  color, backgroundColor: bg, display: 'inline-block', whiteSpace: 'nowrap',
});

function statusStyle(s?: EquipmentStatus) {
  switch (s) {
    case 'needs_repair': return { label: 'Needs Repair', color: '#d97706', bg: '#fffbeb' };
    case 'out_of_service': return { label: 'Out of Service', color: '#dc2626', bg: '#fef2f2' };
    case 'decommissioned': return { label: 'Decommissioned', color: '#6b7280', bg: '#f3f4f6' };
    default: return { label: 'Operational', color: '#16a34a', bg: '#f0fdf4' };
  }
}

function bookValue(purchasePrice: number, installDate: string, usefulLife: number): number {
  const age = ageYears(installDate);
  const annualDep = purchasePrice / usefulLife;
  return Math.max(0, Math.round(purchasePrice - annualDep * age));
}

function annualCosts(history: ServiceRecord[]): { year: number; cost: number }[] {
  const grouped: Record<number, number> = {};
  history.forEach(r => {
    const yr = new Date(r.date).getFullYear();
    grouped[yr] = (grouped[yr] || 0) + r.cost;
  });
  return Object.entries(grouped)
    .map(([y, c]) => ({ year: parseInt(y), cost: c }))
    .sort((a, b) => a.year - b.year);
}

function maintenanceTrend(history: ServiceRecord[]): 'increasing' | 'stable' | 'decreasing' {
  const ac = annualCosts(history);
  if (ac.length < 2) return 'stable';
  const recent = ac.slice(-2);
  const diff = recent[1].cost - recent[0].cost;
  const pct = recent[0].cost > 0 ? diff / recent[0].cost : 0;
  if (pct > 0.15) return 'increasing';
  if (pct < -0.15) return 'decreasing';
  return 'stable';
}

const DEFAULT_LIFESPANS: Record<string, number> = {
  'Walk-in Cooler': 15, 'Walk-in Freezer': 15, 'Prep Cooler': 10,
  'Ice Machine': 8, 'Hood System': 20, 'Exhaust Fan': 15,
  'Fire Suppression System': 12, 'Grease Trap': 20, 'Commercial Fryer': 10,
  'Commercial Oven': 12, 'Commercial Dishwasher': 8,
};

const FIRE_SAFETY_TYPES = new Set(['Hood System', 'Fire Suppression System', 'Exhaust Fan']);

function getEquipmentPillar(item: EquipmentItem): 'fire_safety' | 'food_safety' {
  return item.pillar || (FIRE_SAFETY_TYPES.has(item.type) ? 'fire_safety' : 'food_safety');
}

// ── Demo Data ──────────────────────────────────────────────────────

const DEMO_EQUIPMENT: EquipmentItem[] = [
  // ─── Downtown Kitchen ───
  {
    id: 'EQ-001', name: 'Walk-in Cooler #1', type: 'Walk-in Cooler',
    make: 'True Manufacturing', model: 'TG2R-2S', serial: 'TM-2019-04821',
    locationId: '1', location: 'Downtown Kitchen',
    installDate: '2019-01-15', purchasePrice: 9500,
    warrantyExpiry: '2024-01-15', warrantyProvider: 'True Manufacturing', warrantyTerms: '5-year parts and labor',
    warrantyContact: '1-800-878-3633 / warranty@truemfg.com',
    condition: 'Good', nextMaintenanceDue: '2026-02-28', maintenanceInterval: 'Quarterly',
    linkedVendor: 'CleanAir HVAC', usefulLifeYears: 15, replacementCost: 11000,
    status: 'operational' as EquipmentStatus,
    pillar: 'food_safety' as const,
    linkedVendors: [
      { vendor: 'CleanAir HVAC', serviceType: 'Repair & Maintenance', isPrimary: true },
    ],
    notes: 'Replaced door gaskets Oct 2025. Running well.',
    serviceHistory: [
      { date: '2025-10-12', vendor: 'CleanAir HVAC', type: 'Door Gasket Replacement', cost: 450, notes: 'Replaced both door gaskets, checked refrigerant levels' },
      { date: '2025-07-08', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance', cost: 275, notes: 'Cleaned condenser coils, thermostat calibration' },
      { date: '2025-04-15', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance', cost: 275, notes: 'Routine inspection, all systems nominal' },
    ],
    schedule: [
      { task: 'Condenser coil cleaning', interval: 'Quarterly', lastDone: '2025-10-12', nextDue: '2026-01-12' },
      { task: 'Thermostat calibration', interval: 'Semi-Annual', lastDone: '2025-07-08', nextDue: '2026-01-08' },
      { task: 'Door gasket inspection', interval: 'Annual', lastDone: '2025-10-12', nextDue: '2026-10-12' },
    ],
  },
  {
    id: 'EQ-002', name: 'Walk-in Freezer', type: 'Walk-in Freezer',
    make: 'Kolpak', model: 'QS7-1010-FT', serial: 'KP-2021-11247',
    locationId: '1', location: 'Downtown Kitchen',
    installDate: '2021-03-10', purchasePrice: 12500,
    warrantyExpiry: '2027-03-10', warrantyProvider: 'Kolpak', warrantyTerms: '6-year compressor, 3-year parts',
    warrantyContact: '1-800-965-5727 / support@kolpak.com',
    condition: 'Excellent', nextMaintenanceDue: '2026-03-15', maintenanceInterval: 'Quarterly',
    linkedVendor: 'CleanAir HVAC', usefulLifeYears: 15, replacementCost: 14000,
    status: 'operational' as EquipmentStatus,
    linkedVendors: [
      { vendor: 'CleanAir HVAC', serviceType: 'Maintenance', isPrimary: true },
    ],
    notes: 'Under warranty. No issues.',
    serviceHistory: [
      { date: '2025-12-15', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance', cost: 0, notes: 'Covered under warranty. Coils cleaned, defrost cycle tested.' },
      { date: '2025-09-10', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance', cost: 0, notes: 'Warranty service. All OK.' },
    ],
    schedule: [
      { task: 'Defrost cycle test', interval: 'Quarterly', lastDone: '2025-12-15', nextDue: '2026-03-15' },
      { task: 'Condenser coil cleaning', interval: 'Quarterly', lastDone: '2025-12-15', nextDue: '2026-03-15' },
    ],
  },
  {
    id: 'EQ-003', name: 'Hood Ventilation System', type: 'Hood System',
    make: 'Captive Aire', model: 'CK-48', serial: 'CA-2018-30982',
    locationId: '1', location: 'Downtown Kitchen',
    installDate: '2018-08-20', purchasePrice: 18000,
    warrantyExpiry: '2023-08-20', warrantyProvider: 'Captive Aire', warrantyTerms: '5-year limited',
    warrantyContact: '1-800-334-9256',
    condition: 'Fair', nextMaintenanceDue: '2026-01-20', maintenanceInterval: 'Quarterly',
    linkedVendor: 'ABC Fire Protection', usefulLifeYears: 20, replacementCost: 22000,
    status: 'operational' as EquipmentStatus,
    linkedVendors: [
      { vendor: 'ABC Fire Protection', serviceType: 'Hood Cleaning', isPrimary: true },
      { vendor: 'Valley Fire Systems', serviceType: 'Fire Suppression Inspection', isPrimary: false },
    ],
    notes: 'Fan belt showing wear. Schedule replacement next service.',
    serviceHistory: [
      { date: '2025-10-20', vendor: 'ABC Fire Protection', type: 'Hood Cleaning', cost: 850, notes: 'Full hood and duct cleaning. Fan belt showing wear.' },
      { date: '2025-07-20', vendor: 'ABC Fire Protection', type: 'Hood Cleaning', cost: 850, notes: 'Quarterly deep clean. Grease buildup moderate.' },
      { date: '2025-04-18', vendor: 'ABC Fire Protection', type: 'Hood Cleaning + Filter Replace', cost: 1100, notes: 'Replaced all baffle filters. Hood cleaned.' },
    ],
    schedule: [
      { task: 'Hood & duct cleaning', interval: 'Quarterly', lastDone: '2025-10-20', nextDue: '2026-01-20' },
      { task: 'Baffle filter replacement', interval: 'Annual', lastDone: '2025-04-18', nextDue: '2026-04-18' },
      { task: 'Fan belt inspection', interval: 'Semi-Annual', lastDone: '2025-10-20', nextDue: '2026-04-20' },
    ],
  },
  {
    id: 'EQ-004', name: 'Fire Suppression System', type: 'Fire Suppression System',
    make: 'Ansul', model: 'R-102', serial: 'AN-2020-78543',
    locationId: '1', location: 'Downtown Kitchen',
    installDate: '2020-11-05', purchasePrice: 6500,
    warrantyExpiry: '2026-11-05', warrantyProvider: 'Ansul / Tyco', warrantyTerms: '6-year system warranty',
    condition: 'Good', nextMaintenanceDue: '2026-05-05', maintenanceInterval: 'Semi-Annual',
    linkedVendor: 'Valley Fire Systems', usefulLifeYears: 12, replacementCost: 7500,
    notes: 'Semi-annual inspection by Valley Fire. Under warranty.',
    serviceHistory: [
      { date: '2025-11-05', vendor: 'Valley Fire Systems', type: 'Semi-Annual Inspection', cost: 0, notes: 'Warranty inspection. All nozzles clear, agent level OK.' },
      { date: '2025-05-05', vendor: 'Valley Fire Systems', type: 'Semi-Annual Inspection', cost: 0, notes: 'System test passed. Links inspected.' },
    ],
    schedule: [
      { task: 'System inspection & test', interval: 'Semi-Annual', lastDone: '2025-11-05', nextDue: '2026-05-05' },
      { task: 'Agent level check', interval: 'Annual', lastDone: '2025-11-05', nextDue: '2026-11-05' },
    ],
  },
  {
    id: 'EQ-005', name: 'Commercial Fryer #1', type: 'Commercial Fryer',
    make: 'Frymaster', model: 'PH155', serial: 'FM-2020-45210',
    locationId: '1', location: 'Downtown Kitchen',
    installDate: '2020-06-12', purchasePrice: 4200,
    warrantyExpiry: '2025-06-12', warrantyProvider: 'Frymaster', warrantyTerms: '5-year parts, 1-year labor',
    condition: 'Good', nextMaintenanceDue: '2026-06-12', maintenanceInterval: 'Annual',
    linkedVendor: 'CleanAir HVAC', usefulLifeYears: 10, replacementCost: 4800,
    notes: 'Oil changed regularly by kitchen staff.',
    serviceHistory: [
      { date: '2025-06-12', vendor: 'CleanAir HVAC', type: 'Annual Service', cost: 325, notes: 'Cleaned burners, tested thermostat, replaced pilot assembly.' },
      { date: '2024-06-10', vendor: 'CleanAir HVAC', type: 'Annual Service', cost: 300, notes: 'Standard annual maintenance.' },
    ],
    schedule: [
      { task: 'Burner cleaning & thermostat test', interval: 'Annual', lastDone: '2025-06-12', nextDue: '2026-06-12' },
    ],
  },
  {
    id: 'EQ-006', name: 'Commercial Fryer #2', type: 'Commercial Fryer',
    make: 'Frymaster', model: 'PH155', serial: 'FM-2022-62187',
    locationId: '1', location: 'Downtown Kitchen',
    installDate: '2022-01-18', purchasePrice: 4500,
    warrantyExpiry: '2027-01-18', warrantyProvider: 'Frymaster', warrantyTerms: '5-year parts, 1-year labor',
    condition: 'Excellent', nextMaintenanceDue: '2026-07-18', maintenanceInterval: 'Annual',
    linkedVendor: 'CleanAir HVAC', usefulLifeYears: 10, replacementCost: 4800,
    notes: 'Newer unit. Under warranty.',
    serviceHistory: [
      { date: '2025-07-18', vendor: 'CleanAir HVAC', type: 'Annual Service', cost: 0, notes: 'Warranty service. All OK.' },
    ],
    schedule: [
      { task: 'Burner cleaning & thermostat test', interval: 'Annual', lastDone: '2025-07-18', nextDue: '2026-07-18' },
    ],
  },
  {
    id: 'EQ-007', name: 'Commercial Dishwasher', type: 'Commercial Dishwasher',
    make: 'Hobart', model: 'AM15', serial: 'HB-2017-19843',
    locationId: '1', location: 'Downtown Kitchen',
    installDate: '2017-09-01', purchasePrice: 12000,
    warrantyExpiry: '2022-09-01', warrantyProvider: 'Hobart', warrantyTerms: '5-year parts and labor',
    warrantyContact: '1-888-446-2278 / hobart.service@itw.com',
    condition: 'Poor', nextMaintenanceDue: '2026-01-01', maintenanceInterval: 'Quarterly',
    linkedVendor: 'CleanAir HVAC', usefulLifeYears: 8, replacementCost: 14500,
    status: 'needs_repair' as EquipmentStatus,
    linkedVendors: [
      { vendor: 'CleanAir HVAC', serviceType: 'Repair & Maintenance', isPrimary: true },
    ],
    notes: 'Past useful life. Frequent repairs. Replacement recommended for Q2 2026. Rising maintenance costs — $1,200 emergency repair Dec 2025.',
    serviceHistory: [
      { date: '2025-12-18', vendor: 'CleanAir HVAC', type: 'Emergency Repair', cost: 1200, notes: 'Replaced wash pump motor. Unit struggling.' },
      { date: '2025-10-01', vendor: 'CleanAir HVAC', type: 'Quarterly Service', cost: 375, notes: 'Cleaned spray arms, descaled booster heater.' },
      { date: '2025-07-14', vendor: 'CleanAir HVAC', type: 'Emergency Repair', cost: 850, notes: 'Replaced rinse solenoid valve. Leaking.' },
      { date: '2025-03-10', vendor: 'CleanAir HVAC', type: 'Quarterly Service', cost: 375, notes: 'Standard quarterly. Booster heater descaled.' },
      { date: '2024-12-15', vendor: 'CleanAir HVAC', type: 'Quarterly Service', cost: 350, notes: 'Routine maintenance. Spray arm gaskets worn.' },
      { date: '2024-06-20', vendor: 'CleanAir HVAC', type: 'Annual Inspection', cost: 425, notes: 'Full inspection. Pump showing age.' },
    ],
    schedule: [
      { task: 'Spray arm cleaning & descale', interval: 'Quarterly', lastDone: '2025-10-01', nextDue: '2026-01-01' },
      { task: 'Full mechanical inspection', interval: 'Annual', lastDone: '2025-06-15', nextDue: '2026-06-15' },
    ],
  },
  // ─── Airport Cafe ───
  {
    id: 'EQ-008', name: 'Walk-in Cooler', type: 'Walk-in Cooler',
    make: 'True Manufacturing', model: 'T-49', serial: 'TM-2022-58293',
    locationId: '2', location: 'Airport Cafe',
    installDate: '2022-02-14', purchasePrice: 8500,
    warrantyExpiry: '2027-02-14', warrantyProvider: 'True Manufacturing', warrantyTerms: '5-year parts and labor',
    condition: 'Excellent', nextMaintenanceDue: '2026-02-14', maintenanceInterval: 'Quarterly',
    linkedVendor: 'CleanAir HVAC', usefulLifeYears: 15, replacementCost: 10000,
    notes: 'Under warranty. Excellent condition.',
    serviceHistory: [
      { date: '2025-11-14', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance', cost: 0, notes: 'Warranty service. Coils cleaned.' },
      { date: '2025-08-14', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance', cost: 0, notes: 'Warranty service. All nominal.' },
    ],
    schedule: [
      { task: 'Condenser coil cleaning', interval: 'Quarterly', lastDone: '2025-11-14', nextDue: '2026-02-14' },
      { task: 'Thermostat calibration', interval: 'Semi-Annual', lastDone: '2025-08-14', nextDue: '2026-02-14' },
    ],
  },
  {
    id: 'EQ-009', name: 'Hood Ventilation System', type: 'Hood System',
    make: 'Captive Aire', model: 'CK-36', serial: 'CA-2020-41567',
    locationId: '2', location: 'Airport Cafe',
    installDate: '2020-05-22', purchasePrice: 14000,
    warrantyExpiry: '2025-05-22', warrantyProvider: 'Captive Aire', warrantyTerms: '5-year limited',
    condition: 'Good', nextMaintenanceDue: '2026-02-22', maintenanceInterval: 'Quarterly',
    linkedVendor: 'ABC Fire Protection', usefulLifeYears: 20, replacementCost: 18000,
    linkedVendors: [
      { vendor: 'ABC Fire Protection', serviceType: 'Hood Cleaning', isPrimary: true },
      { vendor: 'Valley Fire Systems', serviceType: 'Fire Suppression Inspection', isPrimary: false },
    ],
    notes: 'Warranty recently expired. Good shape.',
    serviceHistory: [
      { date: '2025-11-22', vendor: 'ABC Fire Protection', type: 'Hood Cleaning', cost: 750, notes: 'Full cleaning. Good condition.' },
      { date: '2025-08-22', vendor: 'ABC Fire Protection', type: 'Hood Cleaning', cost: 750, notes: 'Quarterly clean. Light grease.' },
    ],
    schedule: [
      { task: 'Hood & duct cleaning', interval: 'Quarterly', lastDone: '2025-11-22', nextDue: '2026-02-22' },
      { task: 'Baffle filter replacement', interval: 'Annual', lastDone: '2025-05-22', nextDue: '2026-05-22' },
    ],
  },
  {
    id: 'EQ-010', name: 'Ice Machine', type: 'Ice Machine',
    make: 'Manitowoc', model: 'IYT-0620A', serial: 'MW-2021-33901',
    locationId: '2', location: 'Airport Cafe',
    installDate: '2021-07-08', purchasePrice: 5200,
    warrantyExpiry: '2024-07-08', warrantyProvider: 'Manitowoc Ice', warrantyTerms: '3-year parts and labor',
    condition: 'Fair', nextMaintenanceDue: '2026-01-08', maintenanceInterval: 'Quarterly',
    linkedVendor: 'CleanAir HVAC', usefulLifeYears: 8, replacementCost: 6000,
    notes: 'Maintenance overdue — monthly cleaning cycle and condenser service past due. Scale buildup reported. FDA Food Code §4-602.11 requires food contact surfaces (including ice machines) cleaned at frequency to prevent buildup. Schedule descaling ASAP.',
    serviceHistory: [
      { date: '2025-10-08', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance', cost: 325, notes: 'Cleaned condenser, sanitized bin. Noted early scale buildup.' },
      { date: '2025-07-08', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance + Descale', cost: 425, notes: 'Full descale treatment. Water filter replaced.' },
    ],
    schedule: [
      { task: 'Daily ice quality & scoop storage check', interval: 'Daily', lastDone: '2026-02-08', nextDue: '2026-02-09' },
      { task: 'Weekly bin cleaning & gasket wipe', interval: 'Weekly', lastDone: '2026-02-03', nextDue: '2026-02-10' },
      { task: 'Monthly cleaning & sanitizer cycle (FDA §4-602.11)', interval: 'Monthly', lastDone: '2026-01-08', nextDue: '2026-02-08' },
      { task: 'Condenser coil cleaning', interval: 'Quarterly', lastDone: '2025-10-08', nextDue: '2026-01-08' },
      { task: 'Water filter replacement', interval: 'Semi-Annual', lastDone: '2025-07-08', nextDue: '2026-01-08' },
      { task: 'Deep clean — full disassembly per manufacturer specs', interval: 'Semi-Annual', lastDone: '2025-07-08', nextDue: '2026-01-08' },
    ],
  },
  // ─── University Dining ───
  {
    id: 'EQ-011', name: 'Walk-in Cooler', type: 'Walk-in Cooler',
    make: 'True Manufacturing', model: 'TG2R-2S', serial: 'TM-2018-28410',
    locationId: '3', location: 'University Dining',
    installDate: '2018-04-10', purchasePrice: 9500,
    warrantyExpiry: '2023-04-10', warrantyProvider: 'True Manufacturing', warrantyTerms: '5-year parts and labor',
    condition: 'Fair', nextMaintenanceDue: '2026-04-10', maintenanceInterval: 'Quarterly',
    linkedVendor: 'CleanAir HVAC', usefulLifeYears: 15, replacementCost: 11000,
    notes: 'Compressor running louder. Monitor closely.',
    serviceHistory: [
      { date: '2025-10-10', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance', cost: 325, notes: 'Coils cleaned. Compressor louder than normal — monitor.' },
      { date: '2025-07-10', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance', cost: 275, notes: 'Routine service.' },
    ],
    schedule: [
      { task: 'Condenser coil cleaning', interval: 'Quarterly', lastDone: '2025-10-10', nextDue: '2026-01-10' },
      { task: 'Compressor health check', interval: 'Semi-Annual', lastDone: '2025-10-10', nextDue: '2026-04-10' },
    ],
  },
  {
    id: 'EQ-012', name: 'Walk-in Freezer', type: 'Walk-in Freezer',
    make: 'Kolpak', model: 'QS7-810-FT', serial: 'KP-2019-22014',
    locationId: '3', location: 'University Dining',
    installDate: '2019-10-01', purchasePrice: 11000,
    warrantyExpiry: '2024-10-01', warrantyProvider: 'Kolpak', warrantyTerms: '5-year compressor, 3-year parts',
    condition: 'Good', nextMaintenanceDue: '2026-04-01', maintenanceInterval: 'Quarterly',
    linkedVendor: 'CleanAir HVAC', usefulLifeYears: 15, replacementCost: 13000,
    notes: 'Warranty expired. Runs well.',
    serviceHistory: [
      { date: '2025-10-01', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance', cost: 300, notes: 'Defrost tested, coils cleaned.' },
      { date: '2025-07-01', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance', cost: 300, notes: 'All systems OK.' },
    ],
    schedule: [
      { task: 'Defrost cycle test', interval: 'Quarterly', lastDone: '2025-10-01', nextDue: '2026-01-01' },
      { task: 'Condenser coil cleaning', interval: 'Quarterly', lastDone: '2025-10-01', nextDue: '2026-01-01' },
    ],
  },
  {
    id: 'EQ-013', name: 'Hood Ventilation System', type: 'Hood System',
    make: 'Captive Aire', model: 'CK-48', serial: 'CA-2017-18765',
    locationId: '3', location: 'University Dining',
    installDate: '2017-02-15', purchasePrice: 18000,
    warrantyExpiry: '2022-02-15', warrantyProvider: 'Captive Aire', warrantyTerms: '5-year limited',
    condition: 'Fair', nextMaintenanceDue: '2026-02-15', maintenanceInterval: 'Quarterly',
    linkedVendor: 'ABC Fire Protection', usefulLifeYears: 20, replacementCost: 24000,
    notes: 'Aging system. Filters need more frequent attention.',
    serviceHistory: [
      { date: '2025-11-15', vendor: 'ABC Fire Protection', type: 'Hood Cleaning', cost: 900, notes: 'Heavy grease buildup. Recommended quarterly instead of semi-annual.' },
      { date: '2025-05-15', vendor: 'ABC Fire Protection', type: 'Hood Cleaning + Filter Replace', cost: 1200, notes: 'Replaced all filters. Deep cleaned ductwork.' },
    ],
    schedule: [
      { task: 'Hood & duct cleaning', interval: 'Quarterly', lastDone: '2025-11-15', nextDue: '2026-02-15' },
      { task: 'Baffle filter replacement', interval: 'Semi-Annual', lastDone: '2025-11-15', nextDue: '2026-05-15' },
    ],
  },
  {
    id: 'EQ-014', name: 'Commercial Oven #1', type: 'Commercial Oven',
    make: 'Vulcan', model: 'VC5ED', serial: 'VL-2020-50321',
    locationId: '3', location: 'University Dining',
    installDate: '2020-03-20', purchasePrice: 7800,
    warrantyExpiry: '2025-03-20', warrantyProvider: 'Vulcan', warrantyTerms: '5-year limited parts',
    condition: 'Good', nextMaintenanceDue: '2026-03-20', maintenanceInterval: 'Annual',
    linkedVendor: 'CleanAir HVAC', usefulLifeYears: 15, replacementCost: 9000,
    notes: 'Reliable unit.',
    serviceHistory: [
      { date: '2025-03-20', vendor: 'CleanAir HVAC', type: 'Annual Inspection', cost: 350, notes: 'Calibrated thermostat, cleaned burners, inspected gas lines.' },
    ],
    schedule: [
      { task: 'Thermostat calibration & burner cleaning', interval: 'Annual', lastDone: '2025-03-20', nextDue: '2026-03-20' },
    ],
  },
  {
    id: 'EQ-015', name: 'Commercial Oven #2', type: 'Commercial Oven',
    make: 'Vulcan', model: 'VC5GD', serial: 'VL-2021-61482',
    locationId: '3', location: 'University Dining',
    installDate: '2021-08-10', purchasePrice: 8200,
    warrantyExpiry: '2026-08-10', warrantyProvider: 'Vulcan', warrantyTerms: '5-year limited parts',
    warrantyContact: '1-800-814-2028 / vulcan.service@itw.com',
    condition: 'Poor', nextMaintenanceDue: '2026-02-10', maintenanceInterval: 'Annual',
    linkedVendor: 'CleanAir HVAC', usefulLifeYears: 15, replacementCost: 9000,
    status: 'out_of_service' as EquipmentStatus,
    notes: 'Gas valve failure Jan 2026. Pulled from service pending warranty repair. Vulcan warranty claim #WC-2026-0142 filed.',
    serviceHistory: [
      { date: '2026-01-22', vendor: 'CleanAir HVAC', type: 'Emergency Diagnostic', cost: 0, notes: 'Gas valve stuck closed. Unit cannot heat. Warranty claim initiated with Vulcan.' },
      { date: '2025-08-10', vendor: 'CleanAir HVAC', type: 'Annual Inspection', cost: 0, notes: 'Warranty service. All good.' },
    ],
    schedule: [
      { task: 'Thermostat calibration & burner cleaning', interval: 'Annual', lastDone: '2025-08-10', nextDue: '2026-08-10' },
    ],
  },
  // ─── Downtown Kitchen — Ice Machine ───
  {
    id: 'EQ-016', name: 'Ice Machine', type: 'Ice Machine',
    make: 'Hoshizaki', model: 'KM-660MAJ', serial: 'HZ-2022-55123',
    locationId: '1', location: 'Downtown Kitchen',
    installDate: '2022-03-15', purchasePrice: 7800,
    warrantyExpiry: '2025-03-15', warrantyProvider: 'Hoshizaki', warrantyTerms: '3-year parts and labor',
    condition: 'Good', nextMaintenanceDue: '2026-02-28', maintenanceInterval: 'Monthly',
    linkedVendor: 'CleanAir HVAC', usefulLifeYears: 10, replacementCost: 8500,
    notes: 'Monthly cleaning on schedule. Last deep clean July 2025. Water filter due March 2026. FDA Food Code §4-602.11 — food contact surface, monthly cleaning minimum.',
    serviceHistory: [
      { date: '2026-01-28', vendor: 'CleanAir HVAC', type: 'Monthly Cleaning & Sanitize', cost: 150, notes: 'Cleaning cycle run, bin sanitized, ice quality good.' },
      { date: '2025-12-28', vendor: 'CleanAir HVAC', type: 'Monthly Cleaning & Sanitize', cost: 150, notes: 'Routine monthly service. No issues.' },
    ],
    schedule: [
      { task: 'Daily ice quality & scoop storage check', interval: 'Daily', lastDone: '2026-02-08', nextDue: '2026-02-09' },
      { task: 'Weekly bin cleaning & gasket wipe', interval: 'Weekly', lastDone: '2026-02-03', nextDue: '2026-02-10' },
      { task: 'Monthly cleaning & sanitizer cycle (FDA §4-602.11)', interval: 'Monthly', lastDone: '2026-01-28', nextDue: '2026-02-28' },
      { task: 'Condenser coil cleaning', interval: 'Quarterly', lastDone: '2025-12-28', nextDue: '2026-03-28' },
      { task: 'Water filter replacement', interval: 'Semi-Annual', lastDone: '2025-09-15', nextDue: '2026-03-15' },
      { task: 'Deep clean — full disassembly per manufacturer specs', interval: 'Semi-Annual', lastDone: '2025-07-15', nextDue: '2026-01-15' },
    ],
  },
  // ─── Exhaust Fans ───
  {
    id: 'EQ-017', name: 'Upblast Exhaust Fan — Main Hood', type: 'Exhaust Fan',
    make: 'Captive Aire', model: 'DU33HFA', serial: 'CA-2021-44812',
    locationId: '1', location: 'Downtown Kitchen',
    installDate: '2021-03-15', purchasePrice: 3200,
    warrantyExpiry: '2026-03-15', warrantyProvider: 'Captive Aire', warrantyTerms: '5-year limited',
    condition: 'Good', nextMaintenanceDue: '2026-03-10', maintenanceInterval: 'Quarterly',
    linkedVendor: 'ABC Fire Protection', usefulLifeYears: 15, replacementCost: 3800,
    notes: 'Cleaned with main hood system by ABC Fire Protection. Hinge kit operational. NFPA 96 §7.8 — listed for grease-laden vapor service. Belt replaced Oct 2025.',
    serviceHistory: [
      { date: '2025-12-10', vendor: 'ABC Fire Protection', type: 'Quarterly Cleaning (with hood)', cost: 0, notes: 'Fan blades cleaned, hinge kit lubricated, grease drain cleared. Included with hood cleaning.' },
      { date: '2025-10-20', vendor: 'ABC Fire Protection', type: 'Belt Replacement + Quarterly Clean', cost: 185, notes: 'Replaced drive belt (showing cracks). Fan blades cleaned. Bearings lubricated.' },
      { date: '2025-07-20', vendor: 'ABC Fire Protection', type: 'Quarterly Cleaning (with hood)', cost: 0, notes: 'Cleaned with hood service. Moderate grease on blades. Hinge kit good.' },
    ],
    schedule: [
      { task: 'Visual check — fan running during cooking (NFPA 96 §11.4)', interval: 'Daily', lastDone: '2026-02-08', nextDue: '2026-02-09' },
      { task: 'Belt tension & condition, hinge kit, grease containment', interval: 'Monthly', lastDone: '2026-01-15', nextDue: '2026-02-15' },
      { task: 'Clean blades & housing, lubricate bearings, check motor amps', interval: 'Quarterly', lastDone: '2025-12-10', nextDue: '2026-03-10' },
      { task: 'Professional service — airflow verification & full inspection', interval: 'Semi-Annual', lastDone: '2025-10-20', nextDue: '2026-04-20' },
    ],
  },
  {
    id: 'EQ-018', name: 'Upblast Exhaust Fan', type: 'Exhaust Fan',
    make: 'Greenheck', model: 'CUBE-141', serial: 'GH-2020-31290',
    locationId: '2', location: 'Airport Cafe',
    installDate: '2020-05-22', purchasePrice: 2800,
    warrantyExpiry: '2025-05-22', warrantyProvider: 'Greenheck', warrantyTerms: '5-year parts',
    condition: 'Fair', nextMaintenanceDue: '2026-02-22', maintenanceInterval: 'Quarterly',
    linkedVendor: 'ABC Fire Protection', usefulLifeYears: 15, replacementCost: 3400,
    notes: 'Bearing noise noted last service — monitor closely. NFPA 96 §7.8.2 hinge kit installed. Warranty expired.',
    serviceHistory: [
      { date: '2025-11-22', vendor: 'ABC Fire Protection', type: 'Quarterly Cleaning (with hood)', cost: 0, notes: 'Cleaned with hood. Bearing noise at startup — minor. Monitor next quarter.' },
      { date: '2025-08-22', vendor: 'ABC Fire Protection', type: 'Quarterly Cleaning (with hood)', cost: 0, notes: 'Fan blades cleaned. Grease containment drain cleared.' },
    ],
    schedule: [
      { task: 'Visual check — fan running during cooking (NFPA 96 §11.4)', interval: 'Daily', lastDone: '2026-02-08', nextDue: '2026-02-09' },
      { task: 'Belt tension & condition, hinge kit, grease containment', interval: 'Monthly', lastDone: '2026-01-22', nextDue: '2026-02-22' },
      { task: 'Clean blades & housing, lubricate bearings, check motor amps', interval: 'Quarterly', lastDone: '2025-11-22', nextDue: '2026-02-22' },
      { task: 'Professional service — airflow verification & full inspection', interval: 'Semi-Annual', lastDone: '2025-08-22', nextDue: '2026-02-22' },
    ],
  },
  {
    id: 'EQ-019', name: 'Upblast Exhaust Fan — Main Line', type: 'Exhaust Fan',
    make: 'Captive Aire', model: 'DU40HFA', serial: 'CA-2017-18901',
    locationId: '3', location: 'University Dining',
    installDate: '2017-02-15', purchasePrice: 3500,
    warrantyExpiry: '2022-02-15', warrantyProvider: 'Captive Aire', warrantyTerms: '5-year limited',
    condition: 'Fair', nextMaintenanceDue: '2026-02-15', maintenanceInterval: 'Quarterly',
    linkedVendor: 'ABC Fire Protection', usefulLifeYears: 15, replacementCost: 4200,
    notes: 'Older unit matching hood system age. Heavy grease buildup requires more frequent cleaning. NFPA 96 §11.6.1 — accessible for cleaning.',
    serviceHistory: [
      { date: '2025-11-15', vendor: 'ABC Fire Protection', type: 'Quarterly Cleaning (with hood)', cost: 0, notes: 'Heavy grease on blades — needed extra cleaning time. Hinge kit working.' },
      { date: '2025-05-15', vendor: 'ABC Fire Protection', type: 'Quarterly Cleaning + Belt Replace', cost: 165, notes: 'Belt replaced (glazed). Bearings lubricated. Airflow tested — within spec.' },
    ],
    schedule: [
      { task: 'Visual check — fan running during cooking (NFPA 96 §11.4)', interval: 'Daily', lastDone: '2026-02-08', nextDue: '2026-02-09' },
      { task: 'Belt tension & condition, hinge kit, grease containment', interval: 'Monthly', lastDone: '2026-01-15', nextDue: '2026-02-15' },
      { task: 'Clean blades & housing, lubricate bearings, check motor amps', interval: 'Quarterly', lastDone: '2025-11-15', nextDue: '2026-02-15' },
      { task: 'Professional service — airflow verification & full inspection', interval: 'Semi-Annual', lastDone: '2025-05-15', nextDue: '2026-11-15' },
    ],
  },
];

// ── Component ──────────────────────────────────────────────────────

export function Equipment() {
  const navigate = useNavigate();
  const [locationFilter, setLocationFilter] = useState('all');
  const [pillarFilter, setPillarFilter] = useState<'all' | 'fire_safety' | 'food_safety'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'warranty' | 'service' | 'schedule' | 'forecast' | 'costs' | 'vendors' | 'iot'>('overview');

  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const [loading, setLoading] = useState(false);
  const [liveEquipment, setLiveEquipment] = useState<EquipmentItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [equipmentPhotos, setEquipmentPhotos] = useState<PhotoRecord[]>([]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Fetch equipment from Supabase in live mode
  useEffect(() => {
    if (isDemoMode || !profile?.organization_id) return;

    async function fetchEquipment() {
      setLoading(true);
      const { data, error } = await supabase
        .from('equipment')
        .select('*, equipment_service_records(*), equipment_maintenance_schedule(*)')
        .eq('organization_id', profile!.organization_id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching equipment:', error);
        setLoading(false);
        return;
      }

      // Map location IDs to names
      const { data: locData } = await supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', profile!.organization_id);
      const locMap: Record<string, string> = {};
      (locData || []).forEach((l: any) => { locMap[l.id] = l.name; });

      const mapped: EquipmentItem[] = (data || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        type: e.equipment_type,
        make: e.make || '',
        model: e.model || '',
        serial: e.serial_number || '',
        locationId: e.location_id,
        location: locMap[e.location_id] || 'Unknown',
        installDate: e.install_date || '',
        purchasePrice: e.purchase_price || 0,
        warrantyExpiry: e.warranty_expiry || '',
        warrantyProvider: e.warranty_provider || '',
        warrantyTerms: e.warranty_terms || '',
        condition: (e.condition || 'Good') as Condition,
        nextMaintenanceDue: e.next_maintenance_due || '',
        maintenanceInterval: e.maintenance_interval || '',
        linkedVendor: e.linked_vendor || '',
        usefulLifeYears: e.useful_life_years || 10,
        replacementCost: e.replacement_cost || 0,
        notes: e.notes || '',
        serviceHistory: (e.equipment_service_records || []).map((s: any) => ({
          date: s.service_date,
          vendor: s.vendor,
          type: s.service_type,
          cost: s.cost || 0,
          notes: s.notes || '',
        })),
        schedule: (e.equipment_maintenance_schedule || []).map((s: any) => ({
          task: s.task,
          interval: s.interval,
          lastDone: s.last_done || '',
          nextDue: s.next_due || '',
        })),
      }));

      setLiveEquipment(mapped);
      setLoading(false);
    }

    fetchEquipment();
  }, [isDemoMode, profile?.organization_id]);

  // Use live data or demo data
  const allEquipment = isDemoMode ? DEMO_EQUIPMENT : liveEquipment.length > 0 ? liveEquipment : DEMO_EQUIPMENT;

  // Filtered equipment
  const filtered = useMemo(() => {
    let items = allEquipment;
    if (locationFilter !== 'all') items = items.filter(e => e.location === locationFilter);
    if (pillarFilter !== 'all') items = items.filter(e => getEquipmentPillar(e) === pillarFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(e =>
        e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) ||
        e.make.toLowerCase().includes(q) || e.model.toLowerCase().includes(q) ||
        e.serial.toLowerCase().includes(q)
      );
    }
    return items;
  }, [allEquipment, locationFilter, pillarFilter, search]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const warrantyExpiring = filtered.filter(e => { const w = warrantyInfo(e.warrantyExpiry); return w.label === 'Expiring Soon'; }).length;
    const maintenanceOverdue = filtered.filter(e => maintenanceStatus(e.nextMaintenanceDue).overdue).length;
    const avgAge = total > 0 ? filtered.reduce((s, e) => s + ageYears(e.installDate), 0) / total : 0;
    return { total, warrantyExpiring, maintenanceOverdue, avgAge: avgAge.toFixed(1) };
  }, [filtered]);

  const selected = selectedId ? allEquipment.find(e => e.id === selectedId) ?? null : null;

  // TODO: Scoring integration — Equipment condition and maintenance compliance
  // feed into calculateEquipmentScore() in src/lib/complianceScoring.ts.
  // Wire each equipment item's condition rating as a conditionScore (Excellent=100, Good=85, Fair=60, Poor=35, Critical=10)
  // and maintenance due dates into getGraduatedPenalty() for warranty expiration urgency.
  // Warranty expiration uses graduated urgency model:
  //   30+ days out: 0% penalty
  //   15-30 days:   15% of weight penalty
  //   7-14 days:    30% of weight penalty
  //   1-7 days:     50% of weight penalty
  //   Expired:      100% full penalty

  const handleSelectEquipment = (id: string) => {
    setSelectedId(prev => prev === id ? null : id);
    setDetailTab('overview');
  };

  // ── Table/card styles ────────────────────────────────────────────
  const thStyle: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600,
    color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: '13px', color: '#374151',
    borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap',
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Equipment' }]} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Equipment Lifecycle</h1>
            <p className="text-sm text-gray-600 mt-1">Track warranties, maintenance schedules, and replacement timelines</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              <option value="all">All Locations</option>
              {LOCATIONS.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
            <select
              value={pillarFilter}
              onChange={e => setPillarFilter(e.target.value as 'all' | 'fire_safety' | 'food_safety')}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              <option value="all">All Pillars</option>
              <option value="fire_safety">Fire Safety</option>
              <option value="food_safety">Food Safety</option>
            </select>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Add Equipment
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2"><Package className="h-5 w-5 text-[#1e4d6b]" /><span className="text-xs text-gray-500 uppercase font-semibold">Total Equipment</span></div>
            <div className="text-xl sm:text-3xl font-bold text-[#1e4d6b]">{kpis.total}</div>
            <div className="text-xs text-gray-400 mt-1">across {locationFilter === 'all' ? '3 locations' : '1 location'}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2"><Shield className="h-5 w-5 text-[#d97706]" /><span className="text-xs text-gray-500 uppercase font-semibold">Warranty Expiring</span></div>
            <div className="text-xl sm:text-3xl font-bold text-[#d97706]">{kpis.warrantyExpiring}</div>
            <div className="text-xs text-gray-400 mt-1">within 90 days</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-5 w-5 text-[#dc2626]" /><span className="text-xs text-gray-500 uppercase font-semibold">Maintenance Overdue</span></div>
            <div className="text-xl sm:text-3xl font-bold text-[#dc2626]">{kpis.maintenanceOverdue}</div>
            <div className="text-xs text-gray-400 mt-1">needs immediate attention</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2"><Clock className="h-5 w-5 text-[#1e4d6b]" /><span className="text-xs text-gray-500 uppercase font-semibold">Avg Equipment Age</span></div>
            <div className="text-xl sm:text-3xl font-bold text-[#1e4d6b]">{kpis.avgAge}</div>
            <div className="text-xs text-gray-400 mt-1">years</div>
          </div>
        </div>

        {/* Search + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search equipment, make, model, serial..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            />
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setViewMode('card')} className={`p-2 rounded ${viewMode === 'card' ? 'bg-white shadow-sm' : 'text-gray-400'}`}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('table')} className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : 'text-gray-400'}`}><List className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e4d6b]" />
          </div>
        )}

        {/* Equipment List — Card View */}
        {!loading && viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(eq => {
              const w = warrantyInfo(eq.warrantyExpiry);
              const c = conditionStyle(eq.condition);
              const m = maintenanceStatus(eq.nextMaintenanceDue);
              const isSelected = selectedId === eq.id;
              return (
                <div
                  key={eq.id}
                  onClick={() => handleSelectEquipment(eq.id)}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-[#1e4d6b]' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{eq.name}</h3>
                      <p className="text-xs text-gray-500">{eq.make} {eq.model}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const p = getEquipmentPillar(eq);
                        const isF = p === 'fire_safety';
                        return (
                          <span style={{ ...badge(isF ? 'Fire' : 'Food', isF ? '#b91c1c' : '#166534', isF ? '#fef2f2' : '#f0fdf4'), display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            {isF ? <Flame size={10} /> : <UtensilsCrossed size={10} />}
                            {isF ? 'Fire' : 'Food'}
                          </span>
                        );
                      })()}
                      <span style={badge(eq.condition, c.color, c.bg)}>{eq.condition}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-gray-400" />{eq.location}</div>
                    <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-gray-400" />Installed {format(new Date(eq.installDate), 'MMM yyyy')} · {ageLabel(eq.installDate)}</div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3" style={{ color: w.color }} />
                      <span>Warranty: </span><span style={badge(w.label, w.color, w.bg)}>{w.label}</span>
                      {w.label === 'Active' && <span className="text-gray-400">exp {format(new Date(eq.warrantyExpiry), 'MMM yyyy')}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Wrench className="h-3 w-3" style={{ color: m.color }} />
                      <span>Maintenance: </span><span style={badge(m.label, m.color, m.bg)}>{m.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5"><Truck className="h-3 w-3 text-gray-400" />{eq.linkedVendor}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Equipment List — Table View */}
        {!loading && viewMode === 'table' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th style={thStyle}>Equipment</th><th style={thStyle}>Type</th><th style={thStyle} className="hidden sm:table-cell">Location</th>
                <th style={thStyle} className="hidden md:table-cell">Age</th><th style={thStyle}>Condition</th><th style={thStyle} className="hidden sm:table-cell">Warranty</th>
                <th style={thStyle} className="hidden md:table-cell">Next Maintenance</th><th style={thStyle} className="hidden lg:table-cell">Vendor</th>
              </tr></thead>
              <tbody>
                {filtered.map(eq => {
                  const w = warrantyInfo(eq.warrantyExpiry);
                  const c = conditionStyle(eq.condition);
                  const m = maintenanceStatus(eq.nextMaintenanceDue);
                  return (
                    <tr key={eq.id} onClick={() => handleSelectEquipment(eq.id)} className="cursor-pointer hover:bg-gray-50">
                      <td style={tdStyle}>
                        <div className="font-medium text-gray-900">{eq.name}</div>
                        <div className="text-xs text-gray-400">{eq.make} {eq.model}</div>
                      </td>
                      <td style={tdStyle}>{eq.type}</td>
                      <td style={tdStyle} className="hidden sm:table-cell">{eq.location}</td>
                      <td style={tdStyle} className="hidden md:table-cell">{ageLabel(eq.installDate)}</td>
                      <td style={tdStyle}><span style={badge(eq.condition, c.color, c.bg)}>{eq.condition}</span></td>
                      <td style={tdStyle} className="hidden sm:table-cell"><span style={badge(w.label, w.color, w.bg)}>{w.label}</span></td>
                      <td style={tdStyle} className="hidden md:table-cell"><span style={badge(m.label, m.color, m.bg)}>{m.label}</span></td>
                      <td style={tdStyle} className="hidden lg:table-cell">{eq.linkedVendor}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
            No equipment matches your filters.
          </div>
        )}

        {/* ── Detail Panel ─────────────────────────────────────────── */}
        {selected && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Detail header */}
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-start justify-between gap-2" style={{ backgroundColor: '#eef4f8' }}>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                <p className="text-sm text-gray-600">{selected.make} {selected.model} · S/N: {selected.serial}</p>
                <div className="flex gap-3 mt-2 flex-wrap">
                  {(() => { const ss = statusStyle(selected.status); return <span style={badge(ss.label, ss.color, ss.bg)}>{ss.label}</span>; })()}
                  {(() => { const p = getEquipmentPillar(selected); const isF = p === 'fire_safety'; return <span style={{ ...badge(isF ? 'Fire Safety' : 'Food Safety', isF ? '#b91c1c' : '#166534', isF ? '#fef2f2' : '#f0fdf4'), display: 'inline-flex', alignItems: 'center', gap: '3px' }}>{isF ? <Flame size={10} /> : <UtensilsCrossed size={10} />}{isF ? 'Fire Safety' : 'Food Safety'}</span>; })()}
                  <span style={badge(selected.condition, conditionStyle(selected.condition).color, conditionStyle(selected.condition).bg)}>{selected.condition}</span>
                  <span style={badge(warrantyInfo(selected.warrantyExpiry).label, warrantyInfo(selected.warrantyExpiry).color, warrantyInfo(selected.warrantyExpiry).bg)}>
                    Warranty: {warrantyInfo(selected.warrantyExpiry).label}
                  </span>
                  <span style={badge(maintenanceStatus(selected.nextMaintenanceDue).label, maintenanceStatus(selected.nextMaintenanceDue).color, maintenanceStatus(selected.nextMaintenanceDue).bg)}>
                    {maintenanceStatus(selected.nextMaintenanceDue).label}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(`/equipment/${selected.id}`)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors">View Full Detail</button>
                <button onClick={() => setSelectedId(null)} className="p-1 rounded hover:bg-gray-200"><X className="h-5 w-5 text-gray-400" /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {(() => {
                const linkedSensor = iotSensors.find(s =>
                  s.name.toLowerCase() === selected.name.toLowerCase() ||
                  s.zone.toLowerCase() === selected.name.toLowerCase() ||
                  (selected.name.toLowerCase().includes('cooler') && s.name.toLowerCase().includes('cooler') && s.locationName.toLowerCase().includes(selected.location?.toLowerCase().split(' ')[0] || '___')) ||
                  (selected.name.toLowerCase().includes('freezer') && s.name.toLowerCase().includes('freezer') && s.locationName.toLowerCase().includes(selected.location?.toLowerCase().split(' ')[0] || '___'))
                );
                const baseTabs: [string, string][] = [
                  ['overview', 'Overview'], ['warranty', 'Warranty'], ['service', 'Service History'],
                  ['schedule', 'Schedule'], ['forecast', 'Lifecycle & Cost'], ['costs', 'Cost Breakdown'], ['vendors', 'Vendors'],
                ];
                if (linkedSensor) baseTabs.push(['iot', 'IoT Sensor']);
                return baseTabs;
              })().map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab as typeof detailTab)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    detailTab === tab ? 'border-[#1e4d6b] text-[#1e4d6b]' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-3 sm:p-5">
              {/* ── Tab: Overview ─── */}
              {detailTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Specifications</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-400 block text-xs">Type</span><span className="font-medium">{selected.type}</span></div>
                      <div><span className="text-gray-400 block text-xs">Make</span><span className="font-medium">{selected.make}</span></div>
                      <div><span className="text-gray-400 block text-xs">Model</span><span className="font-medium">{selected.model}</span></div>
                      <div><span className="text-gray-400 block text-xs">Serial Number</span><span className="font-medium font-mono text-xs">{selected.serial}</span></div>
                      <div><span className="text-gray-400 block text-xs">Location</span><span className="font-medium">{selected.location}</span></div>
                      <div><span className="text-gray-400 block text-xs">Installation Date</span><span className="font-medium">{format(new Date(selected.installDate), 'MMM d, yyyy')}</span></div>
                      <div><span className="text-gray-400 block text-xs">Age</span><span className="font-medium">{ageLabel(selected.installDate)}</span></div>
                      <div><span className="text-gray-400 block text-xs">Purchase Price</span><span className="font-medium">{currency(selected.purchasePrice)}</span></div>
                      <div><span className="text-gray-400 block text-xs">Maintenance Interval</span><span className="font-medium">{selected.maintenanceInterval}</span></div>
                      <div><span className="text-gray-400 block text-xs">Linked Vendor</span><span className="font-medium text-[#1e4d6b]">{selected.linkedVendor}</span></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Warranty Information</h4>
                    <div className="p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="h-5 w-5" style={{ color: warrantyInfo(selected.warrantyExpiry).color }} />
                        <span className="font-bold text-sm" style={{ color: warrantyInfo(selected.warrantyExpiry).color }}>
                          {warrantyInfo(selected.warrantyExpiry).label}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-400 block text-xs">Provider</span><span className="font-medium">{selected.warrantyProvider}</span></div>
                        <div><span className="text-gray-400 block text-xs">Expiry Date</span><span className="font-medium">{format(new Date(selected.warrantyExpiry), 'MMM d, yyyy')}</span></div>
                        <div className="col-span-2"><span className="text-gray-400 block text-xs">Terms</span><span className="font-medium">{selected.warrantyTerms}</span></div>
                      </div>
                    </div>
                    {selected.notes && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Notes</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selected.notes}</p>
                      </div>
                    )}
                    {equipmentPhotos.length > 0 && (
                      <PhotoGallery photos={equipmentPhotos} title="Equipment Photos" />
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab: Warranty ─── */}
              {detailTab === 'warranty' && (() => {
                const wi = warrantyInfo(selected.warrantyExpiry);
                const installMs = new Date(selected.installDate).getTime();
                const expiryMs = new Date(selected.warrantyExpiry).getTime();
                const nowMs = NOW.getTime();
                const totalWarrantyDays = Math.max(1, (expiryMs - installMs) / 86400000);
                const elapsedDays = Math.max(0, (nowMs - installMs) / 86400000);
                const warPct = Math.min(100, Math.round((elapsedDays / totalWarrantyDays) * 100));
                const warrantyClaims = selected.serviceHistory.filter(r => r.cost === 0);
                return (
                  <div className="space-y-6">
                    <div className="p-4 rounded-lg border border-gray-200">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5" style={{ color: wi.color }} />
                          <span className="font-bold text-sm" style={{ color: wi.color }}>{wi.label}</span>
                        </div>
                        {wi.days > 0 && <span className="text-xs text-gray-500">{wi.days} days remaining</span>}
                        {wi.days < 0 && <span className="text-xs text-red-500">Expired {Math.abs(wi.days)} days ago</span>}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
                        <div className="h-3 rounded-full transition-all" style={{ width: `${warPct}%`, backgroundColor: wi.color }} />
                      </div>
                      <div className="flex flex-wrap justify-between gap-1 text-xs text-gray-400">
                        <span>Start: {format(new Date(selected.installDate), 'MMM d, yyyy')}</span>
                        <span>{warPct}% through warranty period</span>
                        <span>Expires: {format(new Date(selected.warrantyExpiry), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-bold text-gray-700 mb-3">Warranty Details</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400 text-xs block">Provider</span><span className="font-medium">{selected.warrantyProvider}</span></div>
                          <div><span className="text-gray-400 text-xs block">Terms</span><span className="font-medium">{selected.warrantyTerms}</span></div>
                          {selected.warrantyContact && (
                            <div><span className="text-gray-400 text-xs block">Contact</span><span className="font-medium text-[#1e4d6b]">{selected.warrantyContact}</span></div>
                          )}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-bold text-gray-700 mb-3">Warranty Claims ({warrantyClaims.length})</h4>
                        {warrantyClaims.length === 0 ? (
                          <p className="text-sm text-gray-400">No warranty claims on record.</p>
                        ) : (
                          <div className="space-y-2">
                            {warrantyClaims.slice(0, 5).map((c, i) => (
                              <div key={i} className="text-sm flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <div>
                                  <div className="font-medium text-gray-800">{c.type}</div>
                                  <div className="text-xs text-gray-500">{format(new Date(c.date), 'MMM d, yyyy')} · {c.vendor}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {wi.label === 'Expiring Soon' && (
                      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-sm text-amber-700">Warranty Expiring Soon</h4>
                          <p className="text-xs text-amber-600 mt-1">
                            Only {wi.days} days remaining. Consider scheduling any pending warranty service and evaluate extended warranty options from {selected.warrantyProvider}.
                          </p>
                        </div>
                      </div>
                    )}
                    {wi.label === 'Expired' && (
                      <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-sm text-red-700">Warranty Expired</h4>
                          <p className="text-xs text-red-600 mt-1">
                            This equipment is no longer under warranty. All future repairs will be at full cost. Ensure maintenance schedule is current to maximize lifespan.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Tab: Service History ─── */}
              {detailTab === 'service' && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-bold text-gray-700">{selected.serviceHistory.length} service records</span>
                    <span className="text-xs text-gray-400">· Total spend: {currency(selected.serviceHistory.reduce((s, r) => s + r.cost, 0))}</span>
                  </div>
                  <div className="space-y-0">
                    {selected.serviceHistory.map((rec, i) => (
                      <div key={i} className="flex gap-4 py-3 border-b border-gray-100 last:border-0">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-[#1e4d6b] mt-1" />
                          {i < selected.serviceHistory.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-1">
                            <div>
                              <div className="font-medium text-sm text-gray-900">{rec.type}</div>
                              <div className="text-xs text-gray-500">{rec.vendor} · {format(new Date(rec.date), 'MMM d, yyyy')}</div>
                            </div>
                            <span className="text-sm font-semibold" style={{ color: rec.cost > 0 ? '#1e4d6b' : '#16a34a' }}>
                              {rec.cost > 0 ? currency(rec.cost) : 'Warranty'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{rec.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab: Maintenance Schedule ─── */}
              {detailTab === 'schedule' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr>
                      <th style={thStyle}>Task</th><th style={thStyle}>Interval</th>
                      <th style={thStyle}>Last Completed</th><th style={thStyle}>Next Due</th><th style={thStyle}>Status</th>
                    </tr></thead>
                    <tbody>
                      {selected.schedule.map((s, i) => {
                        const ms = maintenanceStatus(s.nextDue);
                        return (
                          <tr key={i}>
                            <td style={{ ...tdStyle, fontWeight: 500 }}>{s.task}</td>
                            <td style={tdStyle}>{s.interval}</td>
                            <td style={tdStyle}>{format(new Date(s.lastDone), 'MMM d, yyyy')}</td>
                            <td style={tdStyle}>{format(new Date(s.nextDue), 'MMM d, yyyy')}</td>
                            <td style={tdStyle}><span style={badge(ms.label, ms.color, ms.bg)}>{ms.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Tab: Lifecycle & Cost ─── */}
              {detailTab === 'forecast' && (() => {
                const age = ageYears(selected.installDate);
                const pct = Math.min((age / selected.usefulLifeYears) * 100, 100);
                const remainingYears = Math.max(selected.usefulLifeYears - age, 0);
                const replacementDate = new Date(selected.installDate);
                replacementDate.setFullYear(replacementDate.getFullYear() + selected.usefulLifeYears);
                const pastLife = age >= selected.usefulLifeYears;
                const statusLabel = pastLife ? 'Past Expected Life' : pct > 75 ? 'Approaching End of Life' : 'On Track';
                const statusColor = pastLife ? '#dc2626' : pct > 75 ? '#d97706' : '#16a34a';
                const bv = bookValue(selected.purchasePrice, selected.installDate, selected.usefulLifeYears);
                const totalSpend = selected.serviceHistory.reduce((s, r) => s + r.cost, 0);
                const trend = maintenanceTrend(selected.serviceHistory);
                const ac = annualCosts(selected.serviceHistory);
                const trendColor = trend === 'increasing' ? '#dc2626' : trend === 'decreasing' ? '#16a34a' : '#6b7280';
                const trendLabel = trend === 'increasing' ? 'Rising' : trend === 'decreasing' ? 'Declining' : 'Stable';
                return (
                  <div className="space-y-6">
                    {/* Lifecycle Progress Bar */}
                    <div className="p-4 rounded-lg border border-gray-200">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="text-sm font-bold text-gray-700">Lifecycle Progress</span>
                        <span className="text-sm font-bold" style={{ color: statusColor }}>{statusLabel}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div className="h-4 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: statusColor }} />
                      </div>
                      <div className="flex flex-wrap justify-between gap-1 text-xs text-gray-400 mt-1">
                        <span>Installed {format(new Date(selected.installDate), 'yyyy')}</span>
                        <span>{age.toFixed(1)} of {selected.usefulLifeYears} years ({pct.toFixed(0)}%)</span>
                        <span>Expected {format(replacementDate, 'yyyy')}</span>
                      </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400">Purchase Price</div>
                        <div className="text-lg font-bold text-gray-900">{currency(selected.purchasePrice)}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400">Book Value</div>
                        <div className="text-lg font-bold text-[#1e4d6b]">{currency(bv)}</div>
                        <div className="text-[10px] text-gray-400">Straight-line depreciation</div>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400">Total Maintenance</div>
                        <div className="text-lg font-bold text-gray-900">{currency(totalSpend)}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400">Total Cost of Ownership</div>
                        <div className="text-lg font-bold text-gray-900">{currency(selected.purchasePrice + totalSpend)}</div>
                      </div>
                    </div>

                    {/* Second row KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400">Current Age</div>
                        <div className="text-lg font-bold text-gray-900">{ageLabel(selected.installDate)}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400">Remaining Life</div>
                        <div className="text-lg font-bold" style={{ color: statusColor }}>{pastLife ? 'Overdue' : `${remainingYears.toFixed(1)} yrs`}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400">Replacement Cost</div>
                        <div className="text-lg font-bold text-gray-900">{currency(selected.replacementCost)}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400">Maintenance Trend</div>
                        <div className="flex items-center gap-1">
                          {trend === 'increasing' && <TrendingUp className="h-4 w-4" style={{ color: trendColor }} />}
                          {trend === 'decreasing' && <TrendingDown className="h-4 w-4" style={{ color: trendColor }} />}
                          <span className="text-lg font-bold" style={{ color: trendColor }}>{trendLabel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Annual Maintenance Cost Trend */}
                    {ac.length > 1 && (
                      <div className="p-4 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-bold text-gray-700 mb-3">Annual Maintenance Cost Trend</h4>
                        <div className="flex items-end gap-3 h-24">
                          {ac.map((y, i) => {
                            const maxCost = Math.max(...ac.map(a => a.cost), 1);
                            const h = Math.max(4, (y.cost / maxCost) * 80);
                            return (
                              <div key={i} className="flex flex-col items-center flex-1">
                                <span className="text-[10px] font-bold text-gray-600 mb-1">{currency(y.cost)}</span>
                                <div className="w-full rounded-t" style={{ height: `${h}px`, backgroundColor: y.cost === Math.max(...ac.map(a => a.cost)) && trend === 'increasing' ? '#dc2626' : '#1e4d6b' }} />
                                <span className="text-[10px] text-gray-400 mt-1">{y.year}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Alerts */}
                    {pastLife && (
                      <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-sm text-red-700">Replacement Recommended</h4>
                          <p className="text-xs text-red-600 mt-1">
                            This equipment has exceeded its expected useful life of {selected.usefulLifeYears} years.
                            Current condition: {selected.condition}. Budget {currency(selected.replacementCost)} for replacement.
                          </p>
                        </div>
                      </div>
                    )}
                    {trend === 'increasing' && !pastLife && pct > 50 && (
                      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-sm text-amber-700">Rising Maintenance Costs</h4>
                          <p className="text-xs text-amber-600 mt-1">
                            Maintenance costs are increasing year-over-year. This equipment is {pct.toFixed(0)}% through its expected lifespan.
                            Consider scheduling a replacement evaluation before costs exceed repair-vs-replace threshold.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Tab: Cost History ─── */}
              {detailTab === 'costs' && (() => {
                const totalSpend = selected.serviceHistory.reduce((s, r) => s + r.cost, 0);
                const warrantySaved = selected.serviceHistory.filter(r => r.cost === 0).length;
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400">Purchase Price</div>
                        <div className="text-lg font-bold text-gray-900">{currency(selected.purchasePrice)}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400">Total Maintenance Spend</div>
                        <div className="text-lg font-bold text-[#1e4d6b]">{currency(totalSpend)}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400">Total Cost of Ownership</div>
                        <div className="text-lg font-bold text-gray-900">{currency(selected.purchasePrice + totalSpend)}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400">Warranty Services</div>
                        <div className="text-lg font-bold text-green-600">{warrantySaved} free</div>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-gray-700">Service Cost Breakdown</h4>
                    <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr>
                        <th style={thStyle}>Date</th><th style={thStyle}>Service</th><th style={thStyle}>Vendor</th><th style={thStyle}>Cost</th>
                      </tr></thead>
                      <tbody>
                        {selected.serviceHistory.map((r, i) => (
                          <tr key={i}>
                            <td style={tdStyle}>{format(new Date(r.date), 'MMM d, yyyy')}</td>
                            <td style={{ ...tdStyle, fontWeight: 500 }}>{r.type}</td>
                            <td style={tdStyle}>{r.vendor}</td>
                            <td style={{ ...tdStyle, fontWeight: 600, color: r.cost > 0 ? '#1e4d6b' : '#16a34a' }}>
                              {r.cost > 0 ? currency(r.cost) : 'Warranty'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                );
              })()}

              {/* ── Tab: Linked Vendors ─── */}
              {detailTab === 'vendors' && (() => {
                const vendors = selected.linkedVendors || [{ vendor: selected.linkedVendor, serviceType: 'Primary Service', isPrimary: true }];
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-700">{vendors.length} Linked Vendor{vendors.length !== 1 ? 's' : ''}</h4>
                      <button
                        onClick={() => guardAction('edit', 'vendor links', () => showToast('Vendor link saved.'))}
                        className="flex items-center gap-1 text-xs font-medium text-[#1e4d6b] hover:text-[#163a52]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Link Vendor
                      </button>
                    </div>
                    <div className="space-y-3">
                      {vendors.map((v, i) => (
                        <div key={i} className="p-4 rounded-lg border border-gray-200 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#eef4f8' }}>
                              <Wrench className="h-5 w-5 text-[#1e4d6b]" />
                            </div>
                            <div>
                              <div className="font-medium text-sm text-gray-900">{v.vendor}</div>
                              <div className="text-xs text-gray-500">{v.serviceType}</div>
                              {v.isPrimary && <span style={badge('Primary', '#1e4d6b', '#eef4f8')}>Primary</span>}
                              {(() => {
                                const lastSvc = selected.serviceHistory.find(s => s.vendor === v.vendor);
                                return lastSvc ? (
                                  <div className="text-xs text-gray-400 mt-1">Last service: {format(new Date(lastSvc.date), 'MMM d, yyyy')}</div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { window.location.href = `/vendors?id=${encodeURIComponent(v.vendor.toLowerCase().replace(/\s+/g, '-'))}`; }}
                              className="text-xs text-[#1e4d6b] hover:underline"
                            >
                              View Vendor
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selected.warrantyProvider && !vendors.some(v => v.vendor === selected.warrantyProvider) && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-[#1e4d6b]" />
                          <span className="text-sm font-medium text-[#1e4d6b]">Warranty Provider: {selected.warrantyProvider}</span>
                        </div>
                        {selected.warrantyContact && (
                          <div className="text-xs text-gray-500 mt-1 ml-6">{selected.warrantyContact}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Tab: IoT Sensor ─── */}
              {detailTab === 'iot' && (() => {
                const sensor = iotSensors.find(s =>
                  s.name.toLowerCase() === selected.name.toLowerCase() ||
                  s.zone.toLowerCase() === selected.name.toLowerCase() ||
                  (selected.name.toLowerCase().includes('cooler') && s.name.toLowerCase().includes('cooler') && s.locationName.toLowerCase().includes(selected.location?.toLowerCase().split(' ')[0] || '___')) ||
                  (selected.name.toLowerCase().includes('freezer') && s.name.toLowerCase().includes('freezer') && s.locationName.toLowerCase().includes(selected.location?.toLowerCase().split(' ')[0] || '___'))
                );
                if (!sensor) return <p className="text-sm text-gray-500">No IoT sensor linked to this equipment.</p>;

                const provider = iotSensorProviders.find(p => p.slug === sensor.providerSlug);
                const readings = iotSensorReadings.filter(r => r.sensorId === sensor.id);
                const lastSeen = formatDistanceToNow(new Date(sensor.lastSeenAt), { addSuffix: true });
                const isOnline = sensor.status === 'online';
                const statusColor = isOnline ? '#16a34a' : sensor.status === 'warning' ? '#f59e0b' : '#dc2626';

                // Get threshold range
                const zone = sensor.zone.toLowerCase();
                let thMin = 32, thMax = 41;
                if (zone.includes('freezer')) { thMin = -10; thMax = 0; }
                else if (zone.includes('hot')) { thMin = 135; thMax = 200; }
                else if (zone.includes('dry')) { thMin = 50; thMax = 75; }
                const inRange = sensor.currentTempF >= thMin && sensor.currentTempF <= thMax;

                // Generate 24h chart data
                const chartData = [];
                for (let i = 23; i >= 0; i--) {
                  const h = new Date();
                  h.setHours(h.getHours() - i, 0, 0, 0);
                  const jitter = (Math.sin(i * 2.1 + sensor.id.charCodeAt(5)) * 1.5) + (Math.cos(i * 0.7) * 0.5);
                  chartData.push({ hour: format(h, 'ha'), temp: Math.round((sensor.currentTempF + jitter) * 10) / 10, max: thMax, min: thMin });
                }

                const todayReadings = 288;
                const outOfRange = readings.filter(r => r.complianceStatus === 'violation').length;

                return (
                  <div className="space-y-5">
                    {/* Sensor Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg" style={{ backgroundColor: (provider?.color || '#1e4d6b') + '15' }}>
                          <Radio className="h-5 w-5" style={{ color: provider?.color || '#1e4d6b' }} />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{sensor.name}</h4>
                          <p className="text-xs text-gray-500">{provider?.name || sensor.providerSlug} &middot; {sensor.macAddress}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor }} />
                        <span className="text-xs font-medium" style={{ color: statusColor }}>
                          {isOnline ? 'Connected' : sensor.status === 'warning' ? 'Warning' : 'Disconnected'}
                        </span>
                      </div>
                    </div>

                    {/* Current Reading + Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Current</p>
                        <p className={`text-2xl font-bold ${inRange ? 'text-gray-900' : 'text-red-600'}`}>{sensor.currentTempF}°F</p>
                        <p className="text-xs mt-0.5">{inRange ? <span className="text-green-600">In Range</span> : <span className="text-red-600">Out of Range</span>}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Range</p>
                        <p className="text-lg font-semibold text-gray-900">{thMin}–{thMax}°F</p>
                        <p className="text-xs text-gray-400 mt-0.5">Threshold</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Today</p>
                        <p className="text-lg font-semibold text-gray-900">{todayReadings}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{outOfRange > 0 ? <span className="text-amber-600">{outOfRange} out of range</span> : <span className="text-green-600">All in range</span>}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Last Seen</p>
                        <p className="text-sm font-semibold text-gray-900">{lastSeen}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400 flex items-center gap-0.5"><Battery className="h-3 w-3" /> {sensor.batteryPct}%</span>
                          <span className="text-xs text-gray-400 flex items-center gap-0.5"><Signal className="h-3 w-3" /> {sensor.signalRssi}dBm</span>
                        </div>
                      </div>
                    </div>

                    {/* 24-Hour Chart */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">24-Hour Temperature Chart</h4>
                      <div className="bg-white border border-gray-200 rounded-xl p-3" style={{ height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                            <YAxis tick={{ fontSize: 10 }} domain={[thMin - 5, thMax + 5]} />
                            <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [`${v}°F`, 'Temperature']} />
                            <ReferenceLine y={thMax} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `${thMax}°F max`, fontSize: 9, fill: '#f59e0b', position: 'right' }} />
                            {thMin > -20 && <ReferenceLine y={thMin} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: `${thMin}°F min`, fontSize: 9, fill: '#3b82f6', position: 'right' }} />}
                            <Line type="monotone" dataKey="temp" stroke={inRange ? '#16a34a' : '#dc2626'} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Recent Readings Table */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Recent Readings</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Time</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Temp</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Humidity</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Status</th>
                          </tr></thead>
                          <tbody>
                            {readings.map((r, i) => (
                              <tr key={i} className="border-t border-gray-100">
                                <td className="px-3 py-2 text-xs text-gray-600">{format(new Date(r.timestamp), 'h:mm:ss a')}</td>
                                <td className="px-3 py-2 text-sm font-medium text-right">{r.temperatureF}°F</td>
                                <td className="px-3 py-2 text-xs text-gray-500 text-right">{r.humidityPct != null ? `${r.humidityPct}%` : '—'}</td>
                                <td className="px-3 py-2 text-center">
                                  {r.complianceStatus === 'in_range' ? (
                                    <span className="text-green-600 text-xs font-medium">In Range</span>
                                  ) : r.complianceStatus === 'warning' ? (
                                    <span className="text-amber-600 text-xs font-medium">Warning</span>
                                  ) : (
                                    <span className="text-red-600 text-xs font-medium">Violation</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => toast.info('Opening sensor detail page...')} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1e4d6b] bg-[#eef4f8] rounded-lg hover:bg-[#d9e8f0]">
                        <Wifi className="h-3.5 w-3.5" /> View Full History
                      </button>
                      <button onClick={() => toast.info('CSV export started...')} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                        <TrendingDown className="h-3.5 w-3.5" /> Download CSV
                      </button>
                      <button onClick={() => toast.info('Opening sensor settings...')} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                        <Wrench className="h-3.5 w-3.5" /> Configure Sensor
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── Add / Edit Equipment Modal ─────────────────────────── */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Add Equipment</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100"><X className="h-5 w-5 text-gray-400" /></button>
              </div>
              <form id="equipment-form" className="p-5 space-y-4" onSubmit={e => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
                    <select name="equipment_type" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
                      <option value="">Select type...</option>
                      {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <select name="location" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
                      {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    <input name="make" type="text" placeholder="e.g. True Manufacturing" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input name="model" type="text" placeholder="e.g. TG2R-2S" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                    <input name="serial_number" type="text" placeholder="e.g. TM-2019-04821" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Installation Date</label>
                    <input name="install_date" type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                    <input name="purchase_price" type="number" placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiration</label>
                    <input name="warranty_expiry" type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Provider</label>
                    <input name="warranty_provider" type="text" placeholder="e.g. True Manufacturing" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Interval</label>
                    <select name="maintenance_interval" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
                      {MAINTENANCE_INTERVALS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Vendor</label>
                    <select name="linked_vendor" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
                      <option value="">Select vendor...</option>
                      <option value="CleanAir HVAC">CleanAir HVAC</option>
                      <option value="ABC Fire Protection">ABC Fire Protection</option>
                      <option value="Valley Fire Systems">Valley Fire Systems</option>
                      <option value="Pacific Pest Control">Pacific Pest Control</option>
                      <option value="Grease Masters">Grease Masters</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo Evidence</label>
                    <PhotoEvidence
                      photos={equipmentPhotos}
                      onChange={setEquipmentPhotos}
                      maxPhotos={5}
                      compact
                      label="Equipment Photo"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Terms</label>
                    <input name="warranty_terms" type="text" placeholder="e.g. 5-year parts and labor" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Contact</label>
                    <input name="warranty_contact" type="text" placeholder="e.g. 1-800-555-0123" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Useful Life (years)</label>
                    <input name="useful_life_years" type="number" placeholder="e.g. 10" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Replacement Cost ($)</label>
                    <input name="replacement_cost" type="number" placeholder="e.g. 12000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea name="notes" rows={3} placeholder="Additional notes..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => guardAction('edit', 'equipment records', async () => {
                      if (!isDemoMode && profile?.organization_id) {
                        const form = document.querySelector('#equipment-form') as HTMLFormElement | null;
                        const formData = form ? new FormData(form) : null;
                        if (formData) {
                          const { error } = await supabase.from('equipment').insert({
                            organization_id: profile.organization_id,
                            location_id: formData.get('location') || LOCATIONS[0].id,
                            name: `${formData.get('equipment_type') || 'Equipment'} - New`,
                            equipment_type: formData.get('equipment_type') || 'Other',
                            make: formData.get('make') || '',
                            model: formData.get('model') || '',
                            serial_number: formData.get('serial_number') || '',
                            install_date: formData.get('install_date') || null,
                            purchase_price: parseFloat(formData.get('purchase_price') as string) || 0,
                            warranty_expiry: formData.get('warranty_expiry') || null,
                            warranty_provider: formData.get('warranty_provider') || '',
                            warranty_terms: formData.get('warranty_terms') || '',
                            maintenance_interval: formData.get('maintenance_interval') || 'Quarterly',
                            linked_vendor: formData.get('linked_vendor') || '',
                            notes: formData.get('notes') || '',
                            compliance_pillar: 'fire_safety',
                          });
                          if (error) {
                            console.error('Error saving equipment:', error);
                            showToast('Failed to save equipment.');
                            return;
                          }
                        }
                      }
                      showToast('Equipment saved successfully.');
                      setShowForm(false);
                    })}
                    className="flex-1 px-4 py-2.5 bg-[#1e4d6b] text-white rounded-lg font-medium hover:bg-[#163a52] text-sm"
                  >
                    Save Equipment
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast notification */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-sm text-sm font-medium">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {toastMessage}
          </div>
        )}
      </div>

      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
}
