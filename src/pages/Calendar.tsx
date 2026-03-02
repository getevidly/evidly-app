import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, MapPin, X, AlertTriangle, Loader2, CheckCircle, Plus, Trash2, Edit3 } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useTranslation } from '../contexts/LanguageContext';
import { useRole } from '../contexts/RoleContext';
import type { UserRole } from '../contexts/RoleContext';
import { useOperatingHours, formatTime24to12, time24ToHour, DAY_LABELS as _DAY_LABELS } from '../contexts/OperatingHoursContext';
import type { LocationHours } from '../contexts/OperatingHoursContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import { useTooltip } from '../hooks/useTooltip';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';
import { vendors as demoVendors } from '../data/demoData';
import { ENHANCED_VENDOR_PERFORMANCE } from '../data/vendorServiceWorkflowDemo';

// ── Event Types ──────────────────────────────────────────────
interface EventType {
  id: string;
  label: string;
  color: string;
  bg: string;
  border: string;
}

const eventTypes: EventType[] = [
  { id: 'temp-check', label: 'Temperature Check', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { id: 'checklist', label: 'Checklist', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'vendor', label: 'Vendor Service', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'inspection', label: 'Inspection', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  { id: 'corrective', label: 'Corrective Action', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  { id: 'certification', label: 'Certification', color: '#d4af37', bg: '#fefce8', border: '#fde68a' },
  { id: 'meeting', label: 'Meeting', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
];

const typeMap = Object.fromEntries(eventTypes.map(t => [t.id, t]));

const LOCATIONS = ['Downtown Kitchen', 'Airport Cafe', 'University Dining']; // demo

const FACILITY_SAFETY_CATEGORIES = [
  'Hood Cleaning Inspection',
  'Fire Suppression Inspection',
  'Fire Extinguisher Inspection',
  'Pest Control Service',
  'Grease Trap Service',
  'Elevator Inspection',
  'Backflow Prevention Test',
  'General Facility Safety',
  'Other',
];

const CATEGORY_PARAM_MAP: Record<string, string> = {
  hood_cleaning: 'Hood Cleaning Inspection',
  fire_suppression: 'Fire Suppression Inspection',
  fire_extinguisher: 'Fire Extinguisher Inspection',
  pest_control: 'Pest Control Service',
  grease_trap: 'Grease Trap Service',
  elevator: 'Elevator Inspection',
  backflow: 'Backflow Prevention Test',
};

const TIME_OPTIONS = [
  '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM',
  '11:00 PM', '11:30 PM',
];

// ── Vendor-Category Mapping ──────────────────────────────────
const CATEGORY_TO_SERVICE_TYPE: Record<string, string> = {
  'Hood Cleaning Inspection': 'Hood Cleaning',
  'Fire Suppression Inspection': 'Fire Suppression',
  'Fire Extinguisher Inspection': 'Fire Extinguisher',
  'Pest Control Service': 'Pest Control',
  'Grease Trap Service': 'Grease Trap',
  'Elevator Inspection': 'Elevator Inspection',
  'Backflow Prevention Test': 'Backflow Prevention',
};

const LOCATION_ID_MAP: Record<string, string> = {
  'Downtown Kitchen': '1',
  'Airport Cafe': '2',
  'University Dining': '3',
};

const CHANGE_REASONS = [
  'Consistent late arrivals / missed services',
  'Poor quality of service',
  'Incomplete documentation / missing reports',
  'Pricing / contract dispute',
  'Vendor no longer available',
  'Vendor lost certification / licensing',
  'Safety concern during service',
  'Unresponsive to communications',
  'Client requested change',
  'Better option available',
  'Other',
];

const RECURRENCE_OPTIONS = [
  { value: 'one-time',    label: 'One-Time',    eventsPerYear: 1  },
  { value: 'weekly',      label: 'Weekly',       eventsPerYear: 52 },
  { value: 'bi-weekly',   label: 'Bi-Weekly',    eventsPerYear: 26 },
  { value: 'monthly',     label: 'Monthly',      eventsPerYear: 12 },
  { value: 'bi-monthly',  label: 'Bi-Monthly',   eventsPerYear: 6  },
  { value: 'quarterly',   label: 'Quarterly',    eventsPerYear: 4  },
  { value: 'semi-annual', label: 'Semi-Annual',  eventsPerYear: 2  },
  { value: 'annual',      label: 'Annual',       eventsPerYear: 1  },
];

// ── Frequency Safety Check ────────────────────────────────────
const FREQUENCY_HIERARCHY: Record<string, number> = {
  'weekly': 1,
  'bi-weekly': 2,
  'monthly': 3,
  'bi-monthly': 4,
  'quarterly': 5,
  'semi-annual': 6,
  'annual': 7,
  'one-time': 8,
};

const CATEGORY_MIN_FREQUENCY: Record<string, { freq: string; regulation: string }> = {
  'Hood Cleaning Inspection': { freq: 'quarterly', regulation: 'NFPA 96 Table 12.4 (high volume)' },
  'Fire Suppression Inspection': { freq: 'semi-annual', regulation: 'NFPA 17A / local fire code' },
  'Fire Extinguisher Inspection': { freq: 'annual', regulation: 'NFPA 10' },
  'Pest Control Service': { freq: 'monthly', regulation: 'State health department' },
  'Grease Trap Service': { freq: 'quarterly', regulation: 'Local sewer authority' },
  'Elevator Inspection': { freq: 'annual', regulation: 'State elevator code' },
  'Backflow Prevention Test': { freq: 'annual', regulation: 'Local water authority' },
};

const FREQ_REDUCTION_REASONS = [
  'Budget constraints',
  'Vendor recommendation based on assessment',
  'Reduced cooking volume / equipment change',
  'Seasonal operation (reduced hours)',
  'Transitioning to new vendor',
  'Other',
];

// ── Recurrence Helper ────────────────────────────────────────
function generateRecurringDates(startDate: string, recurrence: string, maxOccurrences: number): string[] {
  if (!recurrence || recurrence === 'one-time') return [startDate];
  const dates: string[] = [startDate];
  const d = new Date(startDate + 'T12:00:00');
  for (let i = 1; i < maxOccurrences; i++) {
    switch (recurrence) {
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'bi-weekly': d.setDate(d.getDate() + 14); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'bi-monthly': d.setMonth(d.getMonth() + 2); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
      case 'semi-annual': d.setMonth(d.getMonth() + 6); break;
      case 'annual': d.setFullYear(d.getFullYear() + 1); break;
      default: return dates;
    }
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// ── Demo Events ──────────────────────────────────────────────
interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  date: string; // YYYY-MM-DD
  time: string;
  endTime?: string;
  location: string;
  description?: string;
  allDay?: boolean;
  overdue?: boolean;
  vendorId?: string;
  vendorName?: string;
  category?: string;
  recurrence?: string;
  recurrenceGroupId?: string;
}

function generateDemoEvents(locationHoursData: LocationHours[]): CalendarEvent[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayDate = now.getDate();

  const d = (day: number) => {
    const date = new Date(y, m, day);
    return date.toISOString().split('T')[0];
  };

  const events: CalendarEvent[] = [];
  let nextId = 1;

  // ── Recurring daily events (Mon-Sat) for the visible month window ──
  const recurring = [
    { title: 'Morning Temp Check', type: 'temp-check', time: '6:00 AM', endTime: '6:15 AM' },
    { title: 'Freezer Temp Check', type: 'temp-check', time: '6:15 AM', endTime: '6:30 AM' },
    { title: 'Opening Checklist', type: 'checklist', time: '6:30 AM', endTime: '7:00 AM' },
    { title: 'Hot Hold Temp Check', type: 'temp-check', time: '11:00 AM', endTime: '11:15 AM' },
    { title: 'Lunch Temp Check', type: 'temp-check', time: '11:30 AM', endTime: '11:45 AM' },
    { title: 'Closing Checklist', type: 'checklist', time: '10:00 PM', endTime: '10:30 PM' },
  ];

  // Generate for the visible range: from 7 days before start of month to 7 days after end
  const firstOfMonth = new Date(y, m, 1);
  const lastOfMonth = new Date(y, m + 1, 0);
  const rangeStart = new Date(firstOfMonth);
  rangeStart.setDate(rangeStart.getDate() - rangeStart.getDay()); // back to Sunday
  const rangeEnd = new Date(lastOfMonth);
  rangeEnd.setDate(rangeEnd.getDate() + (6 - rangeEnd.getDay())); // forward to Saturday

  // Cycle locations for recurring events
  const locationCycle = ['Downtown Kitchen', 'Airport Cafe', 'University Dining']; // demo

  for (let dt = new Date(rangeStart); dt <= rangeEnd; dt.setDate(dt.getDate() + 1)) {
    const dayOfWeek = dt.getDay();
    const dateStr = dt.toISOString().split('T')[0];
    const locIdx = dt.getDate() % 3;
    const locName = locationCycle[locIdx];

    // Check if location is open on this day using operating hours
    const locHours = locationHoursData.find(h => h.locationName === locName);
    if (!locHours || !locHours.days[dayOfWeek]) continue;

    for (const r of recurring) {
      events.push({
        id: String(nextId++),
        title: r.title,
        type: r.type,
        date: dateStr,
        time: r.time,
        endTime: r.endTime,
        location: locName,
      });
    }
  }

  // ── One-off events ──
  const oneOffs: Omit<CalendarEvent, 'id'>[] = [
    // Today
    { title: 'Staff Safety Meeting', type: 'meeting', date: d(todayDate), time: '2:00 PM', endTime: '3:00 PM', location: 'Downtown Kitchen', description: 'Monthly food safety briefing with all kitchen staff' }, // demo
    // Yesterday
    { title: 'Health Department Inspection', type: 'inspection', date: d(todayDate - 1), time: '10:00 AM', endTime: '12:00 PM', location: 'Airport Cafe', description: 'Annual routine health inspection' }, // demo
    // Tomorrow
    { title: 'Hood Cleaning Service', type: 'vendor', date: d(todayDate + 1), time: '11:00 PM', endTime: '3:00 AM', location: 'Downtown Kitchen', description: 'Quarterly hood and duct cleaning', vendorId: '1', vendorName: 'ABC Fire Protection', category: 'Hood Cleaning Inspection', recurrence: 'quarterly' }, // demo
    // +2 days
    { title: 'Team Compliance Meeting', type: 'meeting', date: d(todayDate + 2), time: '2:00 PM', endTime: '4:00 PM', location: 'Downtown Kitchen', description: 'Weekly compliance review and corrective action follow-up' }, // demo
    { title: 'Grease Trap Service', type: 'vendor', date: d(todayDate + 2), time: '5:00 AM', endTime: '7:00 AM', location: 'Airport Cafe', description: 'Monthly grease trap pumping', vendorId: '8', vendorName: 'Valley Grease Solutions', category: 'Grease Trap Service', recurrence: 'monthly' }, // demo
    // +3 days
    { title: 'Fire Suppression Inspection', type: 'vendor', date: d(todayDate + 3), time: '9:00 AM', endTime: '11:00 AM', location: 'Downtown Kitchen', description: 'Semi-annual fire suppression system inspection', vendorId: '3', vendorName: 'Valley Fire Systems', category: 'Fire Suppression Inspection', recurrence: 'semi-annual' }, // demo
    { title: 'HACCP Plan Review', type: 'checklist', date: d(todayDate + 3), time: '1:00 PM', endTime: '3:00 PM', location: 'University Dining' }, // demo
    // +5 days
    { title: 'ServSafe Certification Renewal', type: 'certification', date: d(todayDate + 5), time: '9:00 AM', endTime: '5:00 PM', location: 'Downtown Kitchen', description: 'Manager certification renewal exam' }, // demo
    { title: 'Pest Control Service', type: 'vendor', date: d(todayDate + 5), time: '6:00 AM', endTime: '8:00 AM', location: 'Airport Cafe', vendorId: '6', vendorName: 'Pacific Pest Control', category: 'Pest Control Service', recurrence: 'monthly' }, // demo
    // +7 days
    { title: 'Refrigeration Maintenance', type: 'vendor', date: d(todayDate + 7), time: '7:00 AM', endTime: '10:00 AM', location: 'University Dining', description: 'Quarterly refrigeration system maintenance' }, // demo
    { title: 'Manager Safety Meeting', type: 'meeting', date: d(todayDate + 7), time: '3:00 PM', endTime: '5:00 PM', location: 'Downtown Kitchen' }, // demo
    // -3 days
    { title: 'Fire Extinguisher Service', type: 'vendor', date: d(todayDate - 3), time: '8:00 AM', endTime: '10:00 AM', location: 'Downtown Kitchen', description: 'Annual fire extinguisher inspection and tagging', vendorId: '17', vendorName: 'ABC Fire Protection', category: 'Fire Extinguisher Inspection', recurrence: 'annual' }, // demo
    // -5 days — overdue corrective action
    { title: 'Fix Walk-in Door Seal', type: 'corrective', date: d(todayDate - 5), time: '9:00 AM', endTime: '12:00 PM', location: 'Airport Cafe', description: 'Walk-in cooler door gasket is torn — replace seal to maintain temperature integrity', overdue: true }, // demo
    { title: 'HVAC Filter Replacement', type: 'vendor', date: d(todayDate - 5), time: '6:00 AM', endTime: '8:00 AM', location: 'Airport Cafe', description: 'Quarterly HVAC filter replacement' }, // demo
    // -7 days
    { title: 'Plumbing Inspection', type: 'vendor', date: d(todayDate - 7), time: '8:00 AM', endTime: '9:00 AM', location: 'Downtown Kitchen' }, // demo
    // +10 days
    { title: 'Health Permit Renewal', type: 'certification', date: d(todayDate + 10), time: '9:00 AM', location: 'Airport Cafe', allDay: true }, // demo
    { title: 'Deep Cleaning Service', type: 'vendor', date: d(todayDate + 10), time: '10:00 PM', endTime: '4:00 AM', location: 'University Dining' }, // demo
    // +14 days
    { title: 'Quarterly Compliance Review', type: 'inspection', date: d(todayDate + 14), time: '10:00 AM', endTime: '2:00 PM', location: 'Downtown Kitchen', description: 'Internal compliance inspection across all pillars' }, // demo
    // -2 days — another overdue corrective
    { title: 'Recalibrate Freezer Thermometer', type: 'corrective', date: d(todayDate - 2), time: '8:00 AM', endTime: '9:00 AM', location: 'University Dining', description: 'Walk-in freezer thermometer reading 3°F high — recalibrate or replace', overdue: true }, // demo
    // -10 days
    { title: 'Walk-in Cooler Repair', type: 'vendor', date: d(todayDate - 10), time: '7:00 AM', endTime: '11:00 AM', location: 'Airport Cafe' }, // demo
    // +20 days — Facility Safety seed events
    { title: 'Backflow Prevention Test', type: 'vendor', date: d(todayDate + 20), time: '7:00 AM', endTime: '9:00 AM', location: 'Downtown Kitchen', description: 'Annual backflow preventer certification test', vendorId: '5', vendorName: 'Central Cal Backflow', category: 'Backflow Prevention Test', recurrence: 'annual' }, // demo
    // +25 days
    { title: 'Elevator Inspection', type: 'vendor', date: d(todayDate + 25), time: '8:00 AM', endTime: '10:00 AM', location: 'University Dining', description: 'Annual elevator safety inspection and certification', vendorId: '16', vendorName: 'Valley Elevator Co.', category: 'Elevator Inspection', recurrence: 'annual' }, // demo
  ];

  for (const e of oneOffs) {
    events.push({ ...e, id: String(nextId++) });
  }

  return events;
}

// ── Helpers ──────────────────────────────────────────────────
type ViewMode = 'month' | 'week' | 'day';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function getWeekDays(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateKey(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 AM to 10 PM

function hourLabel(h: number) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

// ── Role-based event type visibility ─────────────────────────
const ROLE_EVENT_TYPES: Record<UserRole, string[] | 'all'> = {
  owner_operator: 'all',
  executive: ['inspection', 'certification', 'meeting', 'corrective'],
  compliance_manager: ['inspection', 'certification', 'meeting', 'corrective', 'checklist'],
  chef: ['temp-check', 'checklist', 'corrective'],
  facilities_manager: ['vendor', 'inspection', 'certification', 'corrective'],
  kitchen_manager: ['temp-check', 'checklist', 'vendor', 'inspection', 'meeting', 'corrective'],
  kitchen_staff: ['temp-check', 'checklist', 'corrective'],
};

// ── Component ────────────────────────────────────────────────
export function Calendar() {
  const { t: tr } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [view, setView] = useState<ViewMode>('week');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(() =>
    CATEGORY_PARAM_MAP[categoryParam || ''] || 'all'
  );
  const { locationHours: opHours, getHoursForLocation, getShiftsForLocation } = useOperatingHours();

  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  const ttCalendarSubtitle = useTooltip('calendarSubtitle', userRole);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const [loading, setLoading] = useState(false);
  const [liveEvents, setLiveEvents] = useState<CalendarEvent[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);
  const [eventForm, setEventForm] = useState({
    title: '',
    category: FACILITY_SAFETY_CATEGORIES[0],
    date: '',
    startTime: '9:00 AM',
    endTime: '10:00 AM',
    location: 'Downtown Kitchen',
    description: '',
    vendorId: '',
    vendorName: '',
    recurrence: 'one-time',
  });
  const [showVendorChange, setShowVendorChange] = useState(false);
  const [vendorChangeForm, setVendorChangeForm] = useState({
    newVendorId: '',
    newVendorName: '',
    reason: '',
    reasonDetails: '',
    scope: 'single_event' as 'single_event' | 'all_future',
  });
  const [confirmedVendorChange, setConfirmedVendorChange] = useState<{ previousName: string; reason: string } | null>(null);

  // Frequency reduction warning state
  const [frequencyWarning, setFrequencyWarning] = useState<{
    show: boolean;
    previousFreq: string;
    newFreq: string;
    reductionPercent: number;
    belowMinimum: boolean;
    jurisdictionMinimum: string;
    jurisdictionLabel: string;
  } | null>(null);
  const [freqReductionAck, setFreqReductionAck] = useState(false);
  const [freqReductionReason, setFreqReductionReason] = useState('');
  const [freqReductionDetails, setFreqReductionDetails] = useState('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ── Vendor Lookup ──────────────────────────────────────────────
  const getVendorForCategory = useCallback((category: string, location: string) => {
    const serviceType = CATEGORY_TO_SERVICE_TYPE[category];
    if (!serviceType) return null;
    const locId = LOCATION_ID_MAP[location];
    if (!locId) return null;
    const vendor = demoVendors.find(v => v.serviceType === serviceType && v.locationId === locId);
    return vendor ? { id: vendor.id, name: vendor.companyName } : null;
  }, []);

  const getVendorsForCategory = useCallback((category: string, location: string, excludeId?: string) => {
    const serviceType = CATEGORY_TO_SERVICE_TYPE[category];
    if (!serviceType) return [];
    // In demo mode, show all vendors with this service type (any location)
    return demoVendors
      .filter(v => v.serviceType === serviceType && v.id !== excludeId)
      .reduce((acc, v) => {
        if (!acc.find(a => a.companyName === v.companyName)) acc.push(v);
        return acc;
      }, [] as typeof demoVendors);
  }, []);

  // ── Frequency Lookup ──────────────────────────────────────────
  const getExistingFrequency = useCallback((category: string): string | null => {
    const allEvents = [...customEvents, ...liveEvents];
    const existing = allEvents.find(e => e.category === category && e.recurrence && e.recurrence !== 'one-time');
    return existing?.recurrence || null;
  }, [customEvents, liveEvents]);

  const checkFrequencyChange = useCallback((newFreq: string, category: string) => {
    const oldFreq = editingEvent?.recurrence || getExistingFrequency(category);
    if (oldFreq && oldFreq !== 'one-time' && newFreq !== 'one-time') {
      const oldRank = FREQUENCY_HIERARCHY[oldFreq] ?? 7;
      const newRank = FREQUENCY_HIERARCHY[newFreq] ?? 7;
      if (newRank > oldRank) {
        const catMin = CATEGORY_MIN_FREQUENCY[category];
        const belowMin = catMin ? (FREQUENCY_HIERARCHY[newFreq] ?? 7) > (FREQUENCY_HIERARCHY[catMin.freq] ?? 7) : false;
        const reductionPercent = Math.round((1 - oldRank / newRank) * 100);
        setFrequencyWarning({
          show: true,
          previousFreq: oldFreq,
          newFreq,
          reductionPercent,
          belowMinimum: belowMin,
          jurisdictionMinimum: catMin?.freq || '',
          jurisdictionLabel: catMin?.regulation || '',
        });
        setFreqReductionAck(false);
        setFreqReductionReason('');
        setFreqReductionDetails('');
      } else {
        setFrequencyWarning(null);
      }
    } else {
      setFrequencyWarning(null);
    }
  }, [editingEvent, getExistingFrequency]);

  // ── CRUD Handlers ──────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setShowVendorChange(false);
    setVendorChangeForm({ newVendorId: '', newVendorName: '', reason: '', reasonDetails: '', scope: 'single_event' });
    setConfirmedVendorChange(null);
    setFrequencyWarning(null);
    setFreqReductionAck(false);
    setFreqReductionReason('');
    setFreqReductionDetails('');
    setEventForm({
      title: '',
      category: FACILITY_SAFETY_CATEGORIES[0],
      date: '',
      startTime: '9:00 AM',
      endTime: '10:00 AM',
      location: 'Downtown Kitchen',
      description: '',
      vendorId: '',
      vendorName: '',
      recurrence: 'one-time',
    });
  }, []);

  const openCreateForm = useCallback(() => {
    resetForm();
    setEditingEvent(null);
    setShowEventForm(true);
  }, [resetForm]);

  const openEditForm = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setShowVendorChange(false);
    setEventForm({
      title: event.title,
      category: event.category || (FACILITY_SAFETY_CATEGORIES.includes(event.description?.split(' - ')[0] || '') ? event.description?.split(' - ')[0] || FACILITY_SAFETY_CATEGORIES[0] : FACILITY_SAFETY_CATEGORIES[0]),
      date: event.date,
      startTime: event.time,
      endTime: event.endTime || '10:00 AM',
      location: event.location,
      description: event.description || '',
      vendorId: event.vendorId || '',
      vendorName: event.vendorName || '',
      recurrence: event.recurrence || 'one-time',
    });
    setShowEventForm(true);
  }, []);

  const handleSaveEvent = useCallback(async () => {
    if (!eventForm.title.trim() || !eventForm.date) return;

    const vendorId = eventForm.vendorId || undefined;
    const vendorName = eventForm.vendorName || undefined;
    const category = eventForm.category;
    const recurrence = eventForm.recurrence;
    const recOpt = RECURRENCE_OPTIONS.find(o => o.value === recurrence);
    const maxEvents = recOpt?.eventsPerYear ?? 1;

    if (isDemoMode) {
      if (editingEvent) {
        setCustomEvents(prev => prev.map(e =>
          e.id === editingEvent.id
            ? {
                ...e,
                title: eventForm.title,
                date: eventForm.date,
                time: eventForm.startTime,
                endTime: eventForm.endTime,
                location: eventForm.location,
                description: eventForm.description || undefined,
                vendorId,
                vendorName,
                category,
                recurrence,
              }
            : e
        ));
        showToast('Event updated successfully');
      } else {
        // Generate recurring events if recurrence is set
        const dates = generateRecurringDates(eventForm.date, recurrence, maxEvents);
        const groupId = `grp-${Date.now()}`;
        const newEvents: CalendarEvent[] = dates.map((d, i) => ({
          id: `custom-${Date.now()}-${i}`,
          title: eventForm.title,
          type: 'vendor',
          date: d,
          time: eventForm.startTime,
          endTime: eventForm.endTime,
          location: eventForm.location,
          description: eventForm.description || undefined,
          vendorId,
          vendorName,
          category,
          recurrence,
          recurrenceGroupId: dates.length > 1 ? groupId : undefined,
        }));
        setCustomEvents(prev => [...prev, ...newEvents]);
        showToast(dates.length > 1 ? `${dates.length} events created successfully` : 'Event created successfully');
      }
    } else {
      const orgId = profile?.organization_id;
      if (!orgId) return;

      try {
        if (editingEvent) {
          const { error } = await supabase
            .from('calendar_events')
            .update({
              title: eventForm.title,
              category,
              date: eventForm.date,
              start_time: eventForm.startTime,
              end_time: eventForm.endTime,
              description: eventForm.description || null,
              vendor_name: vendorName || null,
              recurrence: recurrence || 'one-time',
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingEvent.id);

          if (error) throw error;
          showToast('Event updated successfully');
        } else {
          const dates = generateRecurringDates(eventForm.date, recurrence, maxEvents);
          const rows = dates.map(d => ({
            organization_id: orgId,
            title: eventForm.title,
            type: 'vendor',
            category,
            date: d,
            start_time: eventForm.startTime,
            end_time: eventForm.endTime,
            description: eventForm.description || null,
            vendor_name: vendorName || null,
            recurrence: recurrence || 'one-time',
          }));
          const { error } = await supabase.from('calendar_events').insert(rows);
          if (error) throw error;
          showToast(dates.length > 1 ? `${dates.length} events created successfully` : 'Event created successfully');
        }

        setLiveEvents(prev => [...prev]); // trigger re-render
      } catch (err) {
        console.error('Failed to save event:', err);
        showToast('Failed to save event');
      }
    }

    // ── Audit: frequency reduction ──────────────────────────────
    if (frequencyWarning?.show) {
      if (isDemoMode) {
        console.log('[Audit] Frequency reduction:', {
          category: eventForm.category,
          from: frequencyWarning.previousFreq,
          to: frequencyWarning.newFreq,
          reductionPercent: frequencyWarning.reductionPercent,
          belowMinimum: frequencyWarning.belowMinimum,
          reason: freqReductionReason,
          details: freqReductionDetails,
        });
      } else {
        const orgId = profile?.organization_id;
        if (orgId) {
          supabase.from('frequency_change_log').insert({
            organization_id: orgId,
            category: eventForm.category,
            previous_frequency: frequencyWarning.previousFreq,
            new_frequency: frequencyWarning.newFreq,
            percentage_reduction: frequencyWarning.reductionPercent,
            jurisdiction_minimum: frequencyWarning.jurisdictionMinimum || null,
            below_jurisdiction_minimum: frequencyWarning.belowMinimum,
            risk_acknowledged: freqReductionAck,
            reduction_reason: freqReductionReason,
            reduction_details: freqReductionDetails,
          }).then(({ error }) => { if (error) console.error('Failed to log frequency change:', error); });
        }
      }
    }

    // ── Audit: vendor change ─────────────────────────────────────
    if (confirmedVendorChange) {
      if (isDemoMode) {
        console.log('[Audit] Vendor change:', {
          category: eventForm.category,
          previousVendor: confirmedVendorChange.previousName,
          newVendor: eventForm.vendorName,
          reason: confirmedVendorChange.reason,
          scope: vendorChangeForm.scope,
        });
      } else {
        const orgId = profile?.organization_id;
        if (orgId) {
          supabase.from('vendor_changes').insert({
            organization_id: orgId,
            category: eventForm.category,
            previous_vendor_name: confirmedVendorChange.previousName,
            new_vendor_name: eventForm.vendorName,
            change_reason: confirmedVendorChange.reason,
            scope: vendorChangeForm.scope,
          }).then(({ error }) => { if (error) console.error('Failed to log vendor change:', error); });
        }
      }
    }

    setShowEventForm(false);
    setEditingEvent(null);
    resetForm();
  }, [eventForm, editingEvent, isDemoMode, profile?.organization_id, showToast, resetForm, frequencyWarning, freqReductionAck, freqReductionReason, freqReductionDetails, confirmedVendorChange, vendorChangeForm.scope]);

  const handleDeleteEvent = useCallback(async () => {
    if (!selectedEvent) return;

    if (isDemoMode) {
      setCustomEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      showToast('Event deleted successfully');
    } else {
      try {
        const { error } = await supabase
          .from('calendar_events')
          .delete()
          .eq('id', selectedEvent.id);

        if (error) throw error;
        showToast('Event deleted successfully');
        // Trigger re-fetch
        setLiveEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      } catch (err) {
        console.error('Failed to delete event:', err);
        showToast('Failed to delete event');
      }
    }

    setShowDeleteConfirm(false);
    setSelectedEvent(null);
  }, [selectedEvent, isDemoMode, showToast]);

  // Fetch calendar events from multiple Supabase tables in live mode
  const viewMonth = currentDate.getFullYear() * 12 + currentDate.getMonth();
  useEffect(() => {
    if (isDemoMode || !profile?.organization_id) return;

    async function fetchCalendarEvents() {
      setLoading(true);
      const orgId = profile!.organization_id;

      // Generous date range: current month ± 15 days
      const rangeStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), -14);
      const rangeEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 15);
      const startStr = formatDateKey(rangeStartDate);
      const endStr = formatDateKey(rangeEndDate);

      // Fetch location map
      const { data: locData } = await supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', orgId);
      const locMap: Record<string, string> = {};
      (locData || []).forEach((l: any) => { locMap[l.id] = l.name; });

      const allEvents: CalendarEvent[] = [];
      let nextId = 10000;

      // Query 6 tables in parallel
      const [tempRes, checklistRes, equipRes, docsRes, correctiveRes, customCalRes] = await Promise.all([
        supabase
          .from('temp_check_completions')
          .select('*, temperature_equipment(name)')
          .eq('organization_id', orgId)
          .gte('created_at', startStr)
          .lte('created_at', endStr),
        supabase
          .from('checklist_template_completions')
          .select('*, checklist_templates(name)')
          .eq('organization_id', orgId)
          .gte('completed_at', startStr)
          .lte('completed_at', endStr),
        supabase
          .from('equipment')
          .select('*, equipment_service_records(*)')
          .eq('organization_id', orgId)
          .eq('is_active', true),
        supabase
          .from('documents')
          .select('*')
          .eq('organization_id', orgId)
          .not('expiration_date', 'is', null)
          .gte('expiration_date', startStr)
          .lte('expiration_date', endStr),
        supabase
          .from('haccp_corrective_actions')
          .select('*')
          .eq('organization_id', orgId)
          .in('status', ['open', 'in_progress']),
        supabase
          .from('calendar_events')
          .select('*')
          .eq('organization_id', orgId)
          .gte('date', startStr)
          .lte('date', endStr),
      ]);

      // 1. Temperature checks → temp-check events
      for (const t of (tempRes.data || [])) {
        const createdAt = new Date(t.created_at);
        const eqName = t.temperature_equipment?.name || 'Equipment';
        allEvents.push({
          id: String(nextId++),
          title: `Temp Check: ${eqName}`,
          type: 'temp-check',
          date: formatDateKey(createdAt),
          time: createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          location: locMap[t.location_id] || 'Unknown',
          description: `${t.temperature_value}° — ${t.is_within_range ? 'Within range' : 'OUT OF RANGE'}`,
        });
      }

      // 2. Checklist completions → checklist events
      for (const c of (checklistRes.data || [])) {
        const completedAt = new Date(c.completed_at);
        const tmplName = c.checklist_templates?.name || 'Checklist';
        allEvents.push({
          id: String(nextId++),
          title: tmplName,
          type: 'checklist',
          date: formatDateKey(completedAt),
          time: completedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          location: locMap[c.location_id] || 'Unknown',
          description: c.score_percentage != null ? `Score: ${c.score_percentage}%` : undefined,
        });
      }

      // 3. Equipment maintenance due dates + service records → vendor events
      for (const eq of (equipRes.data || [])) {
        if (eq.next_maintenance_due && eq.next_maintenance_due >= startStr && eq.next_maintenance_due <= endStr) {
          allEvents.push({
            id: String(nextId++),
            title: `Maintenance Due: ${eq.name}`,
            type: 'vendor',
            date: eq.next_maintenance_due,
            time: '9:00 AM',
            location: locMap[eq.location_id] || 'Unknown',
            description: `${eq.maintenance_interval || ''} maintenance — ${eq.linked_vendor || 'Unassigned'}`,
          });
        }
        for (const sr of (eq.equipment_service_records || [])) {
          if (sr.service_date >= startStr && sr.service_date <= endStr) {
            allEvents.push({
              id: String(nextId++),
              title: `Service: ${sr.service_type}`,
              type: 'vendor',
              date: sr.service_date,
              time: '8:00 AM',
              location: locMap[eq.location_id] || 'Unknown',
              description: `${sr.vendor} — $${sr.cost || 0}`,
            });
          }
        }
      }

      // 4. Document expirations → certification events
      for (const doc of (docsRes.data || [])) {
        allEvents.push({
          id: String(nextId++),
          title: `Expiring: ${doc.title}`,
          type: 'certification',
          date: doc.expiration_date,
          time: '9:00 AM',
          location: locMap[doc.location_id] || 'All Locations',
          allDay: true,
          description: `${doc.category} — Status: ${doc.status}`,
        });
      }

      // 5. Corrective actions → corrective events
      for (const ca of (correctiveRes.data || [])) {
        const createdAt = new Date(ca.created_at);
        const daysOld = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
        allEvents.push({
          id: String(nextId++),
          title: `CA: ${ca.deviation}`,
          type: 'corrective',
          date: formatDateKey(createdAt),
          time: createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          location: locMap[ca.location_id] || 'Unknown',
          description: `${ca.ccp_hazard} — ${ca.action_taken}`,
          overdue: ca.status === 'open' && daysOld > 2,
        });
      }

      // 6. Custom calendar events → vendor events
      for (const ce of (customCalRes.data || [])) {
        allEvents.push({
          id: ce.id,
          title: ce.title,
          type: ce.type || 'vendor',
          date: ce.date,
          time: ce.start_time,
          endTime: ce.end_time || undefined,
          location: locMap[ce.location_id] || 'Unknown',
          description: ce.description || undefined,
        });
      }

      setLiveEvents(allEvents);
      setLoading(false);
    }

    fetchCalendarEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, profile?.organization_id, viewMonth]);

  // Use live events or demo events, merged with custom events
  const demoEvents = useMemo(() => generateDemoEvents(opHours), [opHours]);
  const events = useMemo(() => {
    const base = isDemoMode ? demoEvents : liveEvents;
    return [...base, ...customEvents];
  }, [isDemoMode, demoEvents, liveEvents, customEvents]);

  const filteredEvents = useMemo(() => {
    const roleTypes = ROLE_EVENT_TYPES[userRole];
    return events.filter(e =>
      (roleTypes === 'all' || roleTypes.includes(e.type)) &&
      (typeFilter === 'all' || e.type === typeFilter) &&
      (locationFilter === 'all' || e.location === locationFilter) &&
      (categoryFilter === 'all' || e.category === categoryFilter)
    );
  }, [events, typeFilter, locationFilter, categoryFilter, userRole]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of filteredEvents) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [filteredEvents]);

  // Navigation
  const navCalendar = (dir: number) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // Header title
  const headerTitle = () => {
    if (view === 'month') return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === 'week') {
      const week = getWeekDays(currentDate);
      const start = week[0];
      const end = week[6];
      if (start.getMonth() === end.getMonth()) {
        return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${MONTHS[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${DAYS[currentDate.getDay()]}, ${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  };

  // Today's events for sidebar card
  const todayKey = formatDateKey(today);
  const todayEvents = useMemo(() => filteredEvents.filter(e => e.date === todayKey), [filteredEvents, todayKey]);
  const todayByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of todayEvents) {
      counts[e.type] = (counts[e.type] || 0) + 1;
    }
    return counts;
  }, [todayEvents]);

  // Overdue events
  const overdueEvents = useMemo(() =>
    events.filter(e => e.overdue),
    [events]
  );

  // Upcoming events for sidebar
  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter(e => e.date >= todayKey && !e.overdue)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 6);
  }, [filteredEvents, todayKey]);

  // Daily temp/checklist completion status for month view indicators
  const dailyStatus = useMemo(() => {
    const status: Record<string, { tempDone: boolean; checklistDone: boolean }> = {};
    for (const e of events) {
      if (!status[e.date]) status[e.date] = { tempDone: false, checklistDone: false };
      if (e.type === 'temp-check') status[e.date].tempDone = true;
      if (e.type === 'checklist') status[e.date].checklistDone = true;
    }
    return status;
  }, [events]);

  // ── Render Event Chip (month view) ──
  const renderEventChip = (event: CalendarEvent) => {
    const t = typeMap[event.type];
    if (!t) return null;
    return (
      <div
        key={event.id}
        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
        style={{
          padding: '1px 5px',
          borderRadius: '3px',
          fontSize: '10px',
          fontWeight: 600,
          color: t.color,
          backgroundColor: t.bg,
          borderLeft: `2px solid ${t.color}`,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: '1.5',
          marginBottom: '1px',
          fontFamily: "'DM Sans', sans-serif",
        }}
        title={`${event.time} ${event.title}`}
      >
        {event.title}
      </div>
    );
  };

  // ── Month View ──
  const renderMonthView = () => {
    const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());

    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', minWidth: '840px' }}>
          {DAYS.map(day => (
            <div key={day} style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: '12px', color: '#6b7280', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {day}
            </div>
          ))}
          {days.map((day, idx) => {
            const isToday = day && isSameDay(day, today);
            const isCurrentMonth = day !== null;
            const dateKey = day ? formatDateKey(day) : '';
            const dayEvents = dateKey ? (eventsByDate[dateKey] || []) : [];

            return (
              <div
                key={idx}
                onClick={() => {
                  if (day) {
                    setCurrentDate(day);
                    setView('day');
                  }
                }}
                style={{
                  minHeight: '100px',
                  padding: '4px',
                  borderRight: (idx + 1) % 7 !== 0 ? '1px solid #e5e7eb' : 'none',
                  borderBottom: idx < days.length - 7 ? '1px solid #e5e7eb' : 'none',
                  backgroundColor: isToday ? '#fffbeb' : !isCurrentMonth ? '#f9fafb' : 'white',
                  cursor: day ? 'pointer' : 'default',
                  transition: 'background-color 0.15s',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => { if (day && !isToday) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                onMouseLeave={(e) => { if (day && !isToday) e.currentTarget.style.backgroundColor = 'white'; }}
              >
                {day && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2px' }}>
                      <span style={{
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        fontSize: '12px',
                        fontWeight: isToday ? 700 : 500,
                        fontFamily: "'DM Sans', sans-serif",
                        color: isToday ? 'white' : '#374151',
                        backgroundColor: isToday ? '#1e4d6b' : 'transparent',
                      }}>
                        {day.getDate()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                      {dayEvents.slice(0, 3).map(renderEventChip)}
                      {dayEvents.length > 3 && (
                        <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600, padding: '1px 5px', fontFamily: "'DM Sans', sans-serif" }}>
                          +{dayEvents.length - 3} {tr('pages.calendar.more')}
                        </div>
                      )}
                    </div>
                    {/* Daily temp/checklist status indicators */}
                    {dateKey <= todayKey && (() => {
                      const ds = dailyStatus[dateKey];
                      const isPast = dateKey < todayKey;
                      return (
                        <div style={{ display: 'flex', gap: '3px', marginTop: 'auto', padding: '1px 2px 0' }}>
                          <span style={{
                            fontSize: '9px', fontWeight: 700, padding: '0 3px', borderRadius: '3px', fontFamily: "'DM Sans', sans-serif",
                            backgroundColor: ds?.tempDone ? '#f0fdf4' : isPast ? '#fef2f2' : '#fffbeb',
                            color: ds?.tempDone ? '#16a34a' : isPast ? '#dc2626' : '#d97706',
                          }}>
                            T{ds?.tempDone ? '✓' : isPast ? '✗' : '…'}
                          </span>
                          <span style={{
                            fontSize: '9px', fontWeight: 700, padding: '0 3px', borderRadius: '3px', fontFamily: "'DM Sans', sans-serif",
                            backgroundColor: ds?.checklistDone ? '#f0fdf4' : isPast ? '#fef2f2' : '#fffbeb',
                            color: ds?.checklistDone ? '#16a34a' : isPast ? '#dc2626' : '#d97706',
                          }}>
                            C{ds?.checklistDone ? '✓' : isPast ? '✗' : '…'}
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Week View ──
  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);

    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', minWidth: '840px' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ padding: '10px 4px' }} />
            {weekDays.map((day, idx) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={idx}
                  onClick={() => { setCurrentDate(day); setView('day'); }}
                  style={{
                    padding: '10px 8px',
                    textAlign: 'center',
                    borderLeft: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {DAYS[day.getDay()]}
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: isToday ? '#1e4d6b' : '#111827',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isToday ? '#fffbeb' : 'transparent',
                    border: isToday ? '2px solid #d4af37' : 'none',
                    marginTop: '2px',
                  }}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', maxHeight: '600px', overflowY: 'auto' }}>
            {HOURS.map(hour => (
              <div key={hour} style={{ display: 'contents' }}>
                <div style={{ padding: '4px 8px', textAlign: 'right', fontSize: '11px', color: '#9ca3af', fontWeight: 500, fontFamily: "'DM Sans', sans-serif", height: '60px', borderBottom: '1px solid #f3f4f6' }}>
                  {hourLabel(hour)}
                </div>
                {weekDays.map((day, dayIdx) => {
                  const dateKey = formatDateKey(day);
                  const hourEvents = (eventsByDate[dateKey] || []).filter(e => {
                    const h = parseInt(e.time);
                    const isPM = e.time.includes('PM');
                    let eventHour = h;
                    if (isPM && h !== 12) eventHour += 12;
                    if (!isPM && h === 12) eventHour = 0;
                    return eventHour === hour;
                  });

                  return (
                    <div
                      key={dayIdx}
                      style={{
                        borderLeft: '1px solid #e5e7eb',
                        borderBottom: '1px solid #f3f4f6',
                        height: '60px',
                        padding: '2px',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {hourEvents.slice(0, 2).map(event => {
                        const t = typeMap[event.type];
                        return (
                          <div
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            style={{
                              padding: '2px 4px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: t?.color || '#333',
                              backgroundColor: t?.bg || '#f3f4f6',
                              borderLeft: `2px solid ${t?.color || '#999'}`,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontFamily: "'DM Sans', sans-serif",
                              marginBottom: '1px',
                            }}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                      {hourEvents.length > 2 && (
                        <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 600, padding: '0 4px', fontFamily: "'DM Sans', sans-serif" }}>
                          +{hourEvents.length - 2}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Day View ──
  const renderDayView = () => {
    const dateKey = formatDateKey(currentDate);
    const dayEvents = eventsByDate[dateKey] || [];

    // Operating hours for graying out
    const selectedLocHours = locationFilter !== 'all' ? getHoursForLocation(locationFilter) : null;
    const openHour = selectedLocHours ? time24ToHour(selectedLocHours.openTime) : null;
    const closeHour = selectedLocHours ? time24ToHour(selectedLocHours.closeTime) : null;

    // Shifts for boundary dividers
    const dayOfWeek = currentDate.getDay();
    const activeShifts = locationFilter !== 'all'
      ? getShiftsForLocation(locationFilter).filter(s => s.days[dayOfWeek])
      : [];

    return (
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e4d6b' }}>
            {DAYS[currentDate.getDay()]}, {MONTHS[currentDate.getMonth()]} {currentDate.getDate()}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            {dayEvents.length} {tr('pages.calendar.eventsScheduled')}
          </div>
        </div>

        {/* Time slots */}
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {HOURS.flatMap(hour => {
            const elements: React.ReactNode[] = [];

            // Shift boundary divider
            const shiftStart = activeShifts.find(s => parseInt(s.startTime.split(':')[0]) === hour);
            if (shiftStart) {
              elements.push(
                <div key={`shift-${hour}`} className="pl-[60px] sm:pl-[80px]" style={{ display: 'flex', alignItems: 'center', paddingTop: '6px', paddingRight: '12px', paddingBottom: '6px', gap: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#d4af37', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {shiftStart.name} Shift
                  </div>
                  <div style={{ flex: 1, borderBottom: '2px dashed #d4af37' }} />
                </div>
              );
            }

            // Check if hour is outside operating hours
            const isOutside = openHour !== null && closeHour !== null && (hour < openHour || hour >= closeHour);

            const hourEvents = dayEvents.filter(e => {
              const h = parseInt(e.time);
              const isPM = e.time.includes('PM');
              let eventHour = h;
              if (isPM && h !== 12) eventHour += 12;
              if (!isPM && h === 12) eventHour = 0;
              return eventHour === hour;
            });

            elements.push(
              <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', minHeight: '64px', backgroundColor: isOutside ? '#f3f4f6' : 'transparent' }}>
                <div className="w-[56px] sm:w-[80px]" style={{ padding: '8px 6px', textAlign: 'right', fontSize: '12px', color: isOutside ? '#c9cdd2' : '#9ca3af', fontWeight: 500, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
                  {hourLabel(hour)}
                </div>
                <div style={{ flex: 1, padding: '4px 8px', borderLeft: '1px solid #e5e7eb', opacity: isOutside ? 0.5 : 1 }}>
                  {hourEvents.map(event => {
                    const t = typeMap[event.type];
                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: t?.bg || '#f3f4f6',
                          borderLeft: `4px solid ${t?.color || '#999'}`,
                          cursor: 'pointer',
                          marginBottom: '4px',
                          fontFamily: "'DM Sans', sans-serif",
                          transition: 'box-shadow 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>{event.title}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                            {event.time}{event.endTime ? ` – ${event.endTime}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280' }}>
                          <MapPin size={12} />
                          {event.location}
                        </div>
                      </div>
                    );
                  })}
                  {isOutside && hourEvents.length === 0 && (
                    <div style={{ fontSize: '11px', color: '#c9cdd2', fontStyle: 'italic', padding: '4px 0', fontFamily: "'DM Sans', sans-serif" }}>
                      {tr('pages.calendar.closed')}
                    </div>
                  )}
                </div>
              </div>
            );

            return elements;
          })}
        </div>
      </div>
    );
  };

  // ── Event Detail Modal ──
  const renderEventModal = () => {
    if (!selectedEvent) return null;
    const t = typeMap[selectedEvent.type];

    return (
      <div
        onClick={() => setSelectedEvent(null)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          padding: '16px',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-[95vw] sm:w-full"
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            maxWidth: '440px',
            overflow: 'hidden',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{ height: '6px', backgroundColor: t?.color || '#6b7280' }} />
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: t?.color || '#6b7280',
                  backgroundColor: t?.bg || '#f3f4f6',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {t?.label || selectedEvent.type}
                </span>
                {selectedEvent.overdue && (
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#dc2626',
                    backgroundColor: '#fef2f2',
                    marginBottom: '8px',
                    marginLeft: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {tr('pages.calendar.overdue')}
                  </span>
                )}
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
              >
                <X size={20} color="#9ca3af" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4b5563', flexWrap: 'wrap' }}>
                <Clock size={16} color="#6b7280" />
                <span>{selectedEvent.time}{selectedEvent.endTime ? ` – ${selectedEvent.endTime}` : ''}</span>
                <span style={{ color: '#d1d5db' }}>|</span>
                <span>{new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4b5563' }}>
                <MapPin size={16} color="#6b7280" />
                <span>{selectedEvent.location}</span>
              </div>
              {selectedEvent.vendorName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4b5563' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span>Vendor: <strong>{selectedEvent.vendorName}</strong></span>
                </div>
              )}
              {selectedEvent.category && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4b5563' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
                  <span>{selectedEvent.category}</span>
                </div>
              )}
              {selectedEvent.description && (
                <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#4b5563', lineHeight: '1.6', marginTop: '4px' }}>
                  {selectedEvent.description}
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  openEditForm(selectedEvent);
                  setSelectedEvent(null);
                }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: '2px solid #e5e7eb', backgroundColor: 'white',
                  fontWeight: 600, fontSize: '13px', color: '#374151',
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <Edit3 size={14} />
                {tr('common.edit')}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: '2px solid #fecdd3', backgroundColor: '#fff1f2',
                  fontWeight: 600, fontSize: '13px', color: '#dc2626',
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: 'none', backgroundColor: '#1e4d6b',
                  fontWeight: 600, fontSize: '13px', color: 'white',
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {tr('common.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Select Dropdown Style ──
  const selectStyle: React.CSSProperties = {
    padding: '8px 32px 8px 12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: 'white',
    fontWeight: 600,
    fontSize: '13px',
    color: '#374151',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    minWidth: 0,
  };

  // ── Main Render ──
  return (
    <>
      <Breadcrumb items={[{ label: tr('nav.dashboard'), href: '/dashboard' }, { label: tr('pages.calendar.title') }]} />

      {categoryParam && (
        <div className="px-3 sm:px-6" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <button
            onClick={() => navigate('/facility-safety')}
            className="flex items-center gap-1 text-sm font-medium mb-3 hover:underline"
            style={{ color: '#1e4d6b' }}
          >
            <ChevronLeft size={14} />
            Back to Facility Safety
          </button>
        </div>
      )}

      <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }} className="px-3 sm:px-6">
        {/* Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e4d6b', margin: '0 0 4px 0', fontFamily: "'DM Sans', sans-serif" }}>{tr('pages.calendar.title')} <InfoTooltip content={ttCalendarSubtitle} /></h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{tr('pages.calendar.subtitle')}</p>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {/* Left: Nav arrows + title */}
          <div data-demo-allow style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navCalendar(-1)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '8px',
                border: '1px solid #e5e7eb', backgroundColor: 'white',
                cursor: 'pointer', transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
            >
              <ChevronLeft size={18} color="#374151" />
            </button>
            <button
              onClick={() => navCalendar(1)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '8px',
                border: '1px solid #e5e7eb', backgroundColor: 'white',
                cursor: 'pointer', transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
            >
              <ChevronRight size={18} color="#374151" />
            </button>
            <h2 className="text-sm sm:text-lg" style={{ fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
              {headerTitle()}
            </h2>
          </div>

          {/* Right: Today + View toggle + Filters */}
          <div data-demo-allow style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Today button */}
            <button
              onClick={goToday}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                border: '2px solid #d4af37', backgroundColor: '#fffbeb',
                fontWeight: 700, fontSize: '13px', color: '#92400e',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef3c7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fffbeb'; }}
            >
              {tr('pages.calendar.today')}
            </button>

            {/* Add Event button */}
            <button
              onClick={openCreateForm}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                border: 'none', backgroundColor: '#1e4d6b',
                fontWeight: 700, fontSize: '13px', color: 'white',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2a6a8f'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1e4d6b'; }}
            >
              <Plus size={16} /> Add Event
            </button>

            {/* View toggle */}
            <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {(['day', 'week', 'month'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '8px 12px', fontSize: '13px', fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif", border: 'none', cursor: 'pointer',
                    backgroundColor: view === v ? '#1e4d6b' : 'white',
                    color: view === v ? 'white' : '#4b5563',
                    borderRight: v !== 'month' ? '1px solid #e5e7eb' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {tr(`pages.calendar.${v}`)}
                </button>
              ))}
            </div>

            {/* Type filter select */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={selectStyle}
              className="w-full sm:w-auto sm:min-w-[150px]"
            >
              <option value="all">{tr('pages.calendar.allTypes')}</option>
              {eventTypes.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>

            {/* Location filter select */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              style={selectStyle}
              className="w-full sm:w-auto sm:min-w-[150px]"
            >
              <option value="all">{tr('pages.calendar.allLocations')}</option>
              {isDemoMode && LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>

            {/* Category filter select */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={selectStyle}
              className="w-full sm:w-auto sm:min-w-[150px]"
            >
              <option value="all">All Categories</option>
              {FACILITY_SAFETY_CATEGORIES.filter(c => c !== 'Other').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location hours info when specific location is filtered */}
        {locationFilter !== 'all' && (() => {
          const locH = getHoursForLocation(locationFilter);
          if (!locH) return null;
          const openDays = _DAY_LABELS.filter((_, i) => locH.days[i]).join(', ');
          return (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
              padding: '8px 14px', borderRadius: '8px', backgroundColor: '#eef4f8',
              border: '1px solid #b8d4e8', fontSize: '13px', color: '#1e4d6b',
              fontFamily: "'DM Sans', sans-serif", fontWeight: 500, flexWrap: 'wrap',
            }}>
              <Clock size={14} />
              <span><strong>{locationFilter}</strong>: {openDays} · {formatTime24to12(locH.openTime)} – {formatTime24to12(locH.closeTime)}</span>
            </div>
          );
        })()}

        {/* Content area: Calendar + Sidebar */}
        <div className="flex flex-col lg:flex-row" style={{ gap: '24px', alignItems: 'flex-start' }}>
          {/* Calendar */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1e4d6b' }} />
              </div>
            ) : (
              <>
                {view === 'month' && renderMonthView()}
                {view === 'week' && renderWeekView()}
                {view === 'day' && renderDayView()}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-[280px]" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Legend */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 12px 0', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {tr('pages.calendar.eventTypes')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {eventTypes.map(type => (
                  <div
                    key={type.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontSize: '12px', fontWeight: 500,
                      color: (typeFilter === 'all' || typeFilter === type.id) ? '#374151' : '#9ca3af',
                      fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', transition: 'color 0.15s',
                    }}
                    onClick={() => setTypeFilter(typeFilter === type.id ? 'all' : type.id)}
                  >
                    <span style={{
                      width: '10px', height: '10px', borderRadius: '3px',
                      backgroundColor: (typeFilter === 'all' || typeFilter === type.id) ? type.color : '#d1d5db',
                      flexShrink: 0, transition: 'background-color 0.15s',
                    }} />
                    {type.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Overdue Items */}
            {overdueEvents.length > 0 && (
              <div style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <AlertTriangle size={16} color="#dc2626" />
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', margin: 0, fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {tr('pages.calendar.overdue')} ({overdueEvents.length})
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {overdueEvents.map(event => {
                    const eventDate = new Date(event.date + 'T12:00:00');
                    const daysOverdue = Math.floor((today.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: 'white',
                          borderLeft: '3px solid #dc2626',
                          cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif",
                          transition: 'box-shadow 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '12px', color: '#111827', marginBottom: '2px' }}>{event.title}</div>
                        <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                          {daysOverdue} {daysOverdue !== 1 ? tr('pages.calendar.daysOverdue') : tr('pages.calendar.dayOverdue')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>{event.location}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Today Card */}
            <div style={{
              backgroundColor: '#1b4965',
              borderRadius: '12px',
              padding: '16px',
              color: 'white',
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px 0', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {tr('pages.calendar.today')}
              </h3>
              <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: "'DM Sans', sans-serif", marginBottom: '4px' }}>
                {todayEvents.length}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px', fontFamily: "'DM Sans', sans-serif" }}>
                {tr('pages.calendar.scheduledItems')}
              </div>
              {Object.keys(todayByType).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '10px' }}>
                  {Object.entries(todayByType).map(([typeId, count]) => {
                    const t = typeMap[typeId];
                    return (
                      <div key={typeId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontFamily: "'DM Sans', sans-serif" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: t?.color || '#999' }} />
                          <span style={{ color: 'rgba(255,255,255,0.85)' }}>{t?.label || typeId}</span>
                        </div>
                        <span style={{ fontWeight: 700 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Events */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 12px 0', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {tr('pages.calendar.upcoming')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upcomingEvents.length === 0 && (
                  <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{tr('pages.calendar.noUpcomingEvents')}</p>
                )}
                {upcomingEvents.map(event => {
                  const t = typeMap[event.type];
                  const eventDate = new Date(event.date + 'T12:00:00');
                  const isEventToday = isSameDay(eventDate, today);

                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      style={{
                        padding: '10px', borderRadius: '8px',
                        backgroundColor: t?.bg || '#f3f4f6',
                        borderLeft: `3px solid ${t?.color || '#999'}`,
                        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        transition: 'box-shadow 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '12px', color: '#111827', marginBottom: '2px' }}>{event.title}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        {isEventToday ? tr('pages.calendar.today') : eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {event.time}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>{event.location}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 12px 0', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {tr('pages.calendar.thisMonth')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: tr('pages.calendar.totalEvents'), value: filteredEvents.filter(e => { const dd = new Date(e.date + 'T12:00:00'); return dd.getMonth() === today.getMonth() && dd.getFullYear() === today.getFullYear(); }).length, color: '#1e4d6b' },
                  { label: tr('pages.calendar.inspections'), value: filteredEvents.filter(e => { const dd = new Date(e.date + 'T12:00:00'); return e.type === 'inspection' && dd.getMonth() === today.getMonth() && dd.getFullYear() === today.getFullYear(); }).length, color: '#ea580c' },
                  { label: tr('pages.calendar.vendorVisits'), value: filteredEvents.filter(e => { const dd = new Date(e.date + 'T12:00:00'); return e.type === 'vendor' && dd.getMonth() === today.getMonth() && dd.getFullYear() === today.getFullYear(); }).length, color: '#7c3aed' },
                  { label: tr('pages.calendar.meetings'), value: filteredEvents.filter(e => { const dd = new Date(e.date + 'T12:00:00'); return e.type === 'meeting' && dd.getMonth() === today.getMonth() && dd.getFullYear() === today.getFullYear(); }).length, color: '#0891b2' },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: stat.color, fontFamily: "'DM Sans', sans-serif" }}>{stat.value}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Event detail modal */}
        {renderEventModal()}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && selectedEvent && (
          <div
            onClick={() => setShowDeleteConfirm(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 55,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
              padding: '16px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white', borderRadius: '16px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                maxWidth: '400px', width: '100%', padding: '24px',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: '#fef2f2', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Trash2 size={20} color="#dc2626" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>Delete Event</h3>
              </div>
              <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                Are you sure you want to delete <strong>{selectedEvent.title}</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    border: '2px solid #e5e7eb', backgroundColor: 'white',
                    fontWeight: 600, fontSize: '13px', color: '#374151',
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    border: 'none', backgroundColor: '#dc2626',
                    fontWeight: 600, fontSize: '13px', color: 'white',
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Form Modal (Create / Edit) */}
        {showEventForm && (
          <div
            onClick={() => { setShowEventForm(false); setEditingEvent(null); resetForm(); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
              padding: '16px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-[95vw] sm:w-full"
              style={{
                backgroundColor: 'white', borderRadius: '16px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                maxWidth: '480px', overflow: 'hidden',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {/* Header bar */}
              <div style={{ height: '6px', backgroundColor: '#1e4d6b' }} />
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    {editingEvent ? 'Edit Event' : 'Add Facility Safety Event'}
                  </h3>
                  <button
                    onClick={() => { setShowEventForm(false); setEditingEvent(null); resetForm(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
                  >
                    <X size={20} color="#9ca3af" />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Title */}
                  <div style={{ order: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Title *
                    </label>
                    <input
                      type="text"
                      value={eventForm.title}
                      onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Hood Cleaning Service"
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827',
                        fontFamily: "'DM Sans', sans-serif", outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#1e4d6b'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                    />
                  </div>

                  {/* Category */}
                  <div style={{ order: 2 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Category
                    </label>
                    <select
                      value={eventForm.category}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setEventForm(prev => ({ ...prev, category: newCat, vendorId: '', vendorName: '' }));
                        setConfirmedVendorChange(null);
                        setShowVendorChange(false);
                      }}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827',
                        fontFamily: "'DM Sans', sans-serif", outline: 'none',
                        backgroundColor: 'white', boxSizing: 'border-box',
                        appearance: 'none' as const,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                      }}
                    >
                      {FACILITY_SAFETY_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div style={{ order: 4 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      value={eventForm.date}
                      onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827',
                        fontFamily: "'DM Sans', sans-serif", outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#1e4d6b'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                    />
                  </div>

                  {/* Start Time + End Time */}
                  <div style={{ order: 5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Start Time
                      </label>
                      <select
                        value={eventForm.startTime}
                        onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: '8px',
                          border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827',
                          fontFamily: "'DM Sans', sans-serif", outline: 'none',
                          backgroundColor: 'white', boxSizing: 'border-box',
                          appearance: 'none' as const,
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 10px center',
                        }}
                      >
                        {TIME_OPTIONS.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        End Time
                      </label>
                      <select
                        value={eventForm.endTime}
                        onChange={(e) => setEventForm(prev => ({ ...prev, endTime: e.target.value }))}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: '8px',
                          border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827',
                          fontFamily: "'DM Sans', sans-serif", outline: 'none',
                          backgroundColor: 'white', boxSizing: 'border-box',
                          appearance: 'none' as const,
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 10px center',
                        }}
                      >
                        {TIME_OPTIONS.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Location */}
                  <div style={{ order: 6 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Location
                    </label>
                    <select
                      value={eventForm.location}
                      onChange={(e) => {
                        setEventForm(prev => ({ ...prev, location: e.target.value, vendorId: '', vendorName: '' }));
                        setConfirmedVendorChange(null);
                        setShowVendorChange(false);
                      }}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827',
                        fontFamily: "'DM Sans', sans-serif", outline: 'none',
                        backgroundColor: 'white', boxSizing: 'border-box',
                        appearance: 'none' as const,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                      }}
                    >
                      {LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  {/* Current Vendor (auto-populated, grayed out) */}
                  {(() => {
                    const currentVendor = eventForm.vendorName || getVendorForCategory(eventForm.category, eventForm.location)?.name;
                    const currentVendorId = eventForm.vendorId || getVendorForCategory(eventForm.category, eventForm.location)?.id;
                    const serviceType = CATEGORY_TO_SERVICE_TYPE[eventForm.category];
                    return serviceType ? (
                      <div style={{ order: 3 }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Current Vendor
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            flex: 1, padding: '10px 12px', borderRadius: '8px',
                            border: '1px solid #e5e7eb', fontSize: '14px',
                            color: '#6b7280', backgroundColor: '#f9fafb',
                            fontFamily: "'DM Sans', sans-serif",
                            boxSizing: 'border-box',
                          }}>
                            {currentVendor || 'No vendor assigned'}
                          </div>
                          {currentVendor && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowVendorChange(!showVendorChange);
                                if (!showVendorChange) {
                                  setVendorChangeForm({ newVendorId: '', newVendorName: '', reason: '', reasonDetails: '', scope: 'single_event' });
                                }
                              }}
                              style={{
                                padding: '8px 12px', borderRadius: '6px', border: 'none',
                                backgroundColor: showVendorChange ? '#fef2f2' : 'transparent',
                                color: showVendorChange ? '#dc2626' : '#1e4d6b',
                                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                              }}
                            >
                              {showVendorChange ? 'Cancel' : 'Change Vendor'}
                            </button>
                          )}
                        </div>

                        {/* Change Vendor Sub-Form */}
                        {showVendorChange && currentVendor && (
                          <div style={{
                            marginTop: '12px', padding: '16px', borderRadius: '10px',
                            border: '1px solid #fde68a', backgroundColor: '#fffbeb',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                              <AlertTriangle size={16} color="#d97706" />
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
                                Change Vendor for {eventForm.category}
                              </span>
                            </div>

                            {/* New Vendor dropdown */}
                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                New Vendor
                              </label>
                              <select
                                value={vendorChangeForm.newVendorId}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === '__add_new__') {
                                    return;
                                  }
                                  const found = demoVendors.find(dv => dv.id === v);
                                  setVendorChangeForm(prev => ({ ...prev, newVendorId: v, newVendorName: found?.companyName || '' }));
                                }}
                                style={{
                                  width: '100%', padding: '8px 10px', borderRadius: '6px',
                                  border: '1px solid #e5e7eb', fontSize: '13px', color: '#111827',
                                  fontFamily: "'DM Sans', sans-serif", outline: 'none',
                                  backgroundColor: 'white', boxSizing: 'border-box',
                                }}
                              >
                                <option value="">Select a vendor...</option>
                                {getVendorsForCategory(eventForm.category, eventForm.location, currentVendorId).map(v => {
                                  const perf = ENHANCED_VENDOR_PERFORMANCE.find(p => p.vendorId === v.id);
                                  const rating = perf ? ` — ${perf.reliabilityScore}/100` : '';
                                  return <option key={v.id} value={v.id}>{v.companyName}{rating}</option>;
                                })}
                                <option value="__add_new__">+ Add New Vendor</option>
                              </select>
                            </div>

                            {/* Reason dropdown (required) */}
                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Reason for Change *
                              </label>
                              <select
                                value={vendorChangeForm.reason}
                                onChange={(e) => setVendorChangeForm(prev => ({ ...prev, reason: e.target.value }))}
                                style={{
                                  width: '100%', padding: '8px 10px', borderRadius: '6px',
                                  border: `1px solid ${!vendorChangeForm.reason && vendorChangeForm.newVendorId ? '#fca5a5' : '#e5e7eb'}`,
                                  fontSize: '13px', color: '#111827',
                                  fontFamily: "'DM Sans', sans-serif", outline: 'none',
                                  backgroundColor: 'white', boxSizing: 'border-box',
                                }}
                              >
                                <option value="">Select reason...</option>
                                {CHANGE_REASONS.map(r => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            </div>

                            {/* Details textarea */}
                            <div style={{ marginBottom: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Details (optional)
                                </label>
                                <AIAssistButton
                                  fieldLabel="Details"
                                  context={{ type: 'vendor_change', vendorName: vendorChangeForm.newVendorName || eventForm.vendorName }}
                                  currentValue={vendorChangeForm.reasonDetails}
                                  onGenerated={(text) => { setVendorChangeForm(prev => ({ ...prev, reasonDetails: text })); setAiFields(prev => new Set(prev).add('vendorChangeDetails')); }}
                                />
                              </div>
                              <textarea
                                value={vendorChangeForm.reasonDetails}
                                onChange={(e) => { setVendorChangeForm(prev => ({ ...prev, reasonDetails: e.target.value })); setAiFields(prev => { const s = new Set(prev); s.delete('vendorChangeDetails'); return s; }); }}
                                placeholder="e.g., Missed 3 of last 5 scheduled cleanings..."
                                rows={2}
                                style={{
                                  width: '100%', padding: '8px 10px', borderRadius: '6px',
                                  border: '1px solid #e5e7eb', fontSize: '13px', color: '#111827',
                                  fontFamily: "'DM Sans', sans-serif", outline: 'none',
                                  resize: 'vertical', boxSizing: 'border-box',
                                }}
                              />
                              {aiFields.has('vendorChangeDetails') && <AIGeneratedIndicator />}
                            </div>

                            {/* Scope radio */}
                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', marginBottom: '6px' }}>
                                <input type="radio" name="vendor-scope" checked={vendorChangeForm.scope === 'single_event'} onChange={() => setVendorChangeForm(prev => ({ ...prev, scope: 'single_event' }))} />
                                Apply to this event only
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                                <input type="radio" name="vendor-scope" checked={vendorChangeForm.scope === 'all_future'} onChange={() => setVendorChangeForm(prev => ({ ...prev, scope: 'all_future' }))} />
                                Apply to ALL future events in this category
                              </label>
                            </div>

                            {/* Confirm / Keep buttons */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                disabled={!vendorChangeForm.newVendorId || !vendorChangeForm.reason}
                                onClick={() => {
                                  const prevName = currentVendor || '';
                                  setConfirmedVendorChange({ previousName: prevName, reason: vendorChangeForm.reason });
                                  setEventForm(prev => ({
                                    ...prev,
                                    vendorId: vendorChangeForm.newVendorId,
                                    vendorName: vendorChangeForm.newVendorName,
                                  }));
                                  setShowVendorChange(false);
                                  showToast('Vendor changed — save event to confirm');
                                }}
                                style={{
                                  flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                                  backgroundColor: (!vendorChangeForm.newVendorId || !vendorChangeForm.reason) ? '#d1d5db' : '#1e4d6b',
                                  color: 'white', fontWeight: 600, fontSize: '12px',
                                  cursor: (!vendorChangeForm.newVendorId || !vendorChangeForm.reason) ? 'not-allowed' : 'pointer',
                                  fontFamily: "'DM Sans', sans-serif",
                                }}
                              >
                                Confirm Change
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowVendorChange(false)}
                                style={{
                                  flex: 1, padding: '8px', borderRadius: '6px',
                                  border: '1px solid #e5e7eb', backgroundColor: 'white',
                                  color: '#374151', fontWeight: 600, fontSize: '12px',
                                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                                }}
                              >
                                Keep Current Vendor
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Changed from note */}
                        {confirmedVendorChange && !showVendorChange && (
                          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#92400e' }}>
                            Changed from {confirmedVendorChange.previousName} — {confirmedVendorChange.reason}
                          </p>
                        )}
                      </div>
                    ) : null;
                  })()}

                  {/* Description */}
                  <div style={{ order: 7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Description
                      </label>
                      <AIAssistButton
                        fieldLabel="Description"
                        context={{ eventType: eventForm.category, title: eventForm.title, vendorName: eventForm.vendorName }}
                        currentValue={eventForm.description}
                        onGenerated={(text) => { setEventForm(prev => ({ ...prev, description: text })); setAiFields(prev => new Set(prev).add('eventDescription')); }}
                      />
                    </div>
                    <textarea
                      value={eventForm.description}
                      onChange={(e) => { setEventForm(prev => ({ ...prev, description: e.target.value })); setAiFields(prev => { const s = new Set(prev); s.delete('eventDescription'); return s; }); }}
                      placeholder="Optional details about this event..."
                      rows={3}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827',
                        fontFamily: "'DM Sans', sans-serif", outline: 'none',
                        resize: 'vertical', boxSizing: 'border-box',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#1e4d6b'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                    />
                    {aiFields.has('eventDescription') && <AIGeneratedIndicator />}
                  </div>

                  {/* Recurrence */}
                  <div style={{ order: 8 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Recurrence
                    </label>
                    <select
                      value={eventForm.recurrence}
                      onChange={(e) => {
                        const newFreq = e.target.value;
                        setEventForm(prev => ({ ...prev, recurrence: newFreq }));
                        checkFrequencyChange(newFreq, eventForm.category);
                      }}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827',
                        fontFamily: "'DM Sans', sans-serif", outline: 'none',
                        backgroundColor: 'white', boxSizing: 'border-box',
                        appearance: 'none' as const,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                      }}
                    >
                      {RECURRENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {(() => {
                      const opt = RECURRENCE_OPTIONS.find(o => o.value === eventForm.recurrence);
                      if (!opt || opt.value === 'one-time') {
                        return <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280' }}>This event will occur once on the selected date.</p>;
                      }
                      return (
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280' }}>
                          {opt.eventsPerYear} {opt.label.toLowerCase()} event{opt.eventsPerYear !== 1 ? 's' : ''} will be created from the start date.
                        </p>
                      );
                    })()}
                  </div>

                  {/* Frequency Reduction Warning */}
                  {frequencyWarning?.show && (
                    <div style={{ order: 9 }}>
                      <div style={{
                        padding: '16px', borderRadius: '10px',
                        border: '2px solid #f59e0b', backgroundColor: '#fffbeb',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <AlertTriangle size={20} color="#d97706" />
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#92400e' }}>
                            FREQUENCY REDUCTION WARNING
                          </span>
                        </div>

                        <p style={{ fontSize: '13px', color: '#78350f', margin: '0 0 8px 0' }}>
                          You are changing <strong>{eventForm.category}</strong> from{' '}
                          <strong>{frequencyWarning.previousFreq.replace(/^./, c => c.toUpperCase())}</strong> to{' '}
                          <strong>{frequencyWarning.newFreq.replace(/^./, c => c.toUpperCase())}</strong>.
                          This reduces service frequency by <strong>{frequencyWarning.reductionPercent}%</strong>.
                        </p>

                        <ul style={{ fontSize: '12px', color: '#92400e', margin: '0 0 12px 0', padding: '0 0 0 16px', lineHeight: '1.8' }}>
                          <li>Your compliance score may decrease</li>
                          <li>Insurance documentation may require updated service schedules</li>
                          <li>Inspection readiness could be impacted</li>
                        </ul>

                        {frequencyWarning.belowMinimum && (
                          <div style={{
                            padding: '10px 12px', borderRadius: '8px',
                            backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                            fontSize: '12px', color: '#991b1b', marginBottom: '12px',
                          }}>
                            This frequency is <strong>BELOW</strong> the minimum required by <strong>{frequencyWarning.jurisdictionLabel}</strong>.
                            Minimum: <strong>{frequencyWarning.jurisdictionMinimum}</strong>. Setting this may result in automatic non-compliance status.
                          </div>
                        )}

                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}>
                          <input
                            type="checkbox"
                            checked={freqReductionAck}
                            onChange={(e) => setFreqReductionAck(e.target.checked)}
                            style={{ marginTop: '2px' }}
                          />
                          <span style={{ fontSize: '13px', color: '#374151' }}>
                            I understand the risks and want to proceed with reduced frequency
                          </span>
                        </label>

                        <select
                          value={freqReductionReason}
                          onChange={(e) => setFreqReductionReason(e.target.value)}
                          style={{
                            width: '100%', padding: '8px 10px', borderRadius: '6px',
                            border: `1px solid ${!freqReductionReason && freqReductionAck ? '#fca5a5' : '#e5e7eb'}`,
                            fontSize: '13px', color: '#111827', marginBottom: '8px',
                            fontFamily: "'DM Sans', sans-serif", outline: 'none',
                            backgroundColor: 'white', boxSizing: 'border-box',
                          }}
                        >
                          <option value="">Select reason for reduction...</option>
                          {FREQ_REDUCTION_REASONS.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '4px' }}>
                          <AIAssistButton
                            fieldLabel="Frequency Reduction Details"
                            context={{ type: 'frequency_reduction' }}
                            currentValue={freqReductionDetails}
                            onGenerated={(text) => { setFreqReductionDetails(text); setAiFields(prev => new Set(prev).add('freqReductionDetails')); }}
                          />
                        </div>
                        <textarea
                          value={freqReductionDetails}
                          onChange={(e) => { setFreqReductionDetails(e.target.value); setAiFields(prev => { const s = new Set(prev); s.delete('freqReductionDetails'); return s; }); }}
                          placeholder="Explain why this reduction is acceptable..."
                          rows={2}
                          style={{
                            width: '100%', padding: '8px 10px', borderRadius: '6px',
                            border: `1px solid ${!freqReductionDetails.trim() && freqReductionAck ? '#fca5a5' : '#e5e7eb'}`,
                            fontSize: '13px', color: '#111827',
                            fontFamily: "'DM Sans', sans-serif", outline: 'none',
                            resize: 'vertical', boxSizing: 'border-box',
                          }}
                        />
                        {aiFields.has('freqReductionDetails') && <AIGeneratedIndicator />}
                      </div>
                    </div>
                  )}

                  {/* Positive confirmation for frequency INCREASE */}
                  {!frequencyWarning?.show && eventForm.recurrence !== 'one-time' && (() => {
                    const oldFreq = editingEvent?.recurrence || getExistingFrequency(eventForm.category);
                    if (oldFreq && oldFreq !== 'one-time' && (FREQUENCY_HIERARCHY[eventForm.recurrence] ?? 8) < (FREQUENCY_HIERARCHY[oldFreq] ?? 8)) {
                      return (
                        <div style={{ order: 9 }}>
                          <p style={{ margin: '0', fontSize: '12px', color: '#16a34a' }}>
                            Increasing {eventForm.category} frequency from {oldFreq} to {eventForm.recurrence}. This strengthens your compliance posture.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Form buttons */}
                <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setShowEventForm(false); setEditingEvent(null); resetForm(); }}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px',
                      border: '2px solid #e5e7eb', backgroundColor: 'white',
                      fontWeight: 600, fontSize: '13px', color: '#374151',
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEvent}
                    disabled={!eventForm.title.trim() || !eventForm.date || !!(frequencyWarning?.show && (!freqReductionAck || !freqReductionReason || !freqReductionDetails.trim()))}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px',
                      border: 'none',
                      backgroundColor: (!eventForm.title.trim() || !eventForm.date || (frequencyWarning?.show && (!freqReductionAck || !freqReductionReason || !freqReductionDetails.trim()))) ? '#9ca3af' : '#1e4d6b',
                      fontWeight: 600, fontSize: '13px', color: 'white',
                      cursor: (!eventForm.title.trim() || !eventForm.date || (frequencyWarning?.show && (!freqReductionAck || !freqReductionReason || !freqReductionDetails.trim()))) ? 'not-allowed' : 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast notification */}
        {toastMessage && (
          <div style={{
            position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 60,
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#16a34a', color: 'white',
            padding: '12px 20px', borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '14px', fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
          }}>
            <CheckCircle size={16} />
            {toastMessage}
          </div>
        )}
      </div>

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}

export default Calendar;
