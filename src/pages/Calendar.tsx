import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, X, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useOperatingHours, formatTime24to12, time24ToHour, DAY_LABELS as _DAY_LABELS } from '../contexts/OperatingHoursContext';
import type { LocationHours } from '../contexts/OperatingHoursContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';

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

const LOCATIONS = ['Downtown Kitchen', 'Airport Cafe', 'University Dining'];

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
  const locationCycle = ['Downtown Kitchen', 'Airport Cafe', 'University Dining'];

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
    { title: 'Staff Safety Meeting', type: 'meeting', date: d(todayDate), time: '2:00 PM', endTime: '3:00 PM', location: 'Downtown Kitchen', description: 'Monthly food safety briefing with all kitchen staff' },
    // Yesterday
    { title: 'Health Department Inspection', type: 'inspection', date: d(todayDate - 1), time: '10:00 AM', endTime: '12:00 PM', location: 'Airport Cafe', description: 'Annual routine health inspection' },
    // Tomorrow
    { title: 'Hood Cleaning Service', type: 'vendor', date: d(todayDate + 1), time: '11:00 PM', endTime: '3:00 AM', location: 'Downtown Kitchen', description: 'Quarterly hood and duct cleaning by ProClean Services' },
    // +2 days
    { title: 'Team Compliance Meeting', type: 'meeting', date: d(todayDate + 2), time: '2:00 PM', endTime: '4:00 PM', location: 'Downtown Kitchen', description: 'Weekly compliance review and corrective action follow-up' },
    { title: 'Grease Trap Service', type: 'vendor', date: d(todayDate + 2), time: '5:00 AM', endTime: '7:00 AM', location: 'Airport Cafe', description: 'Monthly grease trap pumping by GreenWaste' },
    // +3 days
    { title: 'Fire Suppression Inspection', type: 'inspection', date: d(todayDate + 3), time: '9:00 AM', endTime: '11:00 AM', location: 'Downtown Kitchen', description: 'Semi-annual fire suppression system inspection' },
    { title: 'HACCP Plan Review', type: 'checklist', date: d(todayDate + 3), time: '1:00 PM', endTime: '3:00 PM', location: 'University Dining' },
    // +5 days
    { title: 'ServSafe Certification Renewal', type: 'certification', date: d(todayDate + 5), time: '9:00 AM', endTime: '5:00 PM', location: 'Downtown Kitchen', description: 'Manager certification renewal exam' },
    { title: 'Pest Control Service', type: 'vendor', date: d(todayDate + 5), time: '6:00 AM', endTime: '8:00 AM', location: 'Airport Cafe' },
    // +7 days
    { title: 'Refrigeration Maintenance', type: 'vendor', date: d(todayDate + 7), time: '7:00 AM', endTime: '10:00 AM', location: 'University Dining', description: 'Quarterly refrigeration system maintenance' },
    { title: 'Manager Safety Meeting', type: 'meeting', date: d(todayDate + 7), time: '3:00 PM', endTime: '5:00 PM', location: 'Downtown Kitchen' },
    // -3 days
    { title: 'Fire Extinguisher Service', type: 'vendor', date: d(todayDate - 3), time: '8:00 AM', endTime: '10:00 AM', location: 'Downtown Kitchen', description: 'Annual fire extinguisher inspection and tagging' },
    // -5 days — overdue corrective action
    { title: 'Fix Walk-in Door Seal', type: 'corrective', date: d(todayDate - 5), time: '9:00 AM', endTime: '12:00 PM', location: 'Airport Cafe', description: 'Walk-in cooler door gasket is torn — replace seal to maintain temperature integrity', overdue: true },
    { title: 'HVAC Filter Replacement', type: 'vendor', date: d(todayDate - 5), time: '6:00 AM', endTime: '8:00 AM', location: 'Airport Cafe', description: 'Quarterly HVAC filter replacement' },
    // -7 days
    { title: 'Plumbing Inspection', type: 'vendor', date: d(todayDate - 7), time: '8:00 AM', endTime: '9:00 AM', location: 'Downtown Kitchen' },
    // +10 days
    { title: 'Health Permit Renewal', type: 'certification', date: d(todayDate + 10), time: '9:00 AM', location: 'Airport Cafe', allDay: true },
    { title: 'Deep Cleaning Service', type: 'vendor', date: d(todayDate + 10), time: '10:00 PM', endTime: '4:00 AM', location: 'University Dining' },
    // +14 days
    { title: 'Quarterly Compliance Review', type: 'inspection', date: d(todayDate + 14), time: '10:00 AM', endTime: '2:00 PM', location: 'Downtown Kitchen', description: 'Internal compliance audit across all pillars' },
    // -2 days — another overdue corrective
    { title: 'Recalibrate Freezer Thermometer', type: 'corrective', date: d(todayDate - 2), time: '8:00 AM', endTime: '9:00 AM', location: 'University Dining', description: 'Walk-in freezer thermometer reading 3°F high — recalibrate or replace', overdue: true },
    // -10 days
    { title: 'Walk-in Cooler Repair', type: 'vendor', date: d(todayDate - 10), time: '7:00 AM', endTime: '11:00 AM', location: 'Airport Cafe' },
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

// ── Component ────────────────────────────────────────────────
export function Calendar() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [view, setView] = useState<ViewMode>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const { locationHours: opHours, getHoursForLocation, getShiftsForLocation } = useOperatingHours();

  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [loading, setLoading] = useState(false);
  const [liveEvents, setLiveEvents] = useState<CalendarEvent[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

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

      // Query 5 tables in parallel
      const [tempRes, checklistRes, equipRes, docsRes, correctiveRes] = await Promise.all([
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

      setLiveEvents(allEvents);
      setLoading(false);
    }

    fetchCalendarEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, profile?.organization_id, viewMonth]);

  // Use live events or demo events
  const demoEvents = useMemo(() => generateDemoEvents(opHours), [opHours]);
  const events = isDemoMode ? demoEvents : liveEvents.length > 0 ? liveEvents : demoEvents;

  const filteredEvents = useMemo(() =>
    events.filter(e =>
      (typeFilter === 'all' || e.type === typeFilter) &&
      (locationFilter === 'all' || e.location === locationFilter)
    ),
    [events, typeFilter, locationFilter]
  );

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
                          +{dayEvents.length - 3} more
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
            {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled
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
                <div key={`shift-${hour}`} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px 6px 80px', gap: '10px' }}>
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
                <div style={{ width: '80px', padding: '8px 12px', textAlign: 'right', fontSize: '12px', color: isOutside ? '#c9cdd2' : '#9ca3af', fontWeight: 500, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
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
                      Closed
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
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            maxWidth: '440px',
            width: '100%',
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
                    OVERDUE
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4b5563' }}>
                <Clock size={16} color="#6b7280" />
                <span>{selectedEvent.time}{selectedEvent.endTime ? ` – ${selectedEvent.endTime}` : ''}</span>
                <span style={{ color: '#d1d5db' }}>|</span>
                <span>{new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4b5563' }}>
                <MapPin size={16} color="#6b7280" />
                <span>{selectedEvent.location}</span>
              </div>
              {selectedEvent.description && (
                <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#4b5563', lineHeight: '1.6', marginTop: '4px' }}>
                  {selectedEvent.description}
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { showToast('Edit event — available in full version'); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: '2px solid #e5e7eb', backgroundColor: 'white',
                  fontWeight: 600, fontSize: '13px', color: '#374151',
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Edit
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
                Close
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
    minWidth: '150px',
  };

  // ── Main Render ──
  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]} />

      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
        {/* Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e4d6b', margin: '0 0 4px 0', fontFamily: "'DM Sans', sans-serif" }}>Calendar</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Schedule and track compliance events, inspections, and vendor services</p>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {/* Left: Nav arrows + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
              {headerTitle()}
            </h2>
          </div>

          {/* Right: Today + View toggle + Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
              Today
            </button>

            {/* View toggle */}
            <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {(['month', 'week', 'day'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif", border: 'none', cursor: 'pointer',
                    backgroundColor: view === v ? '#1e4d6b' : 'white',
                    color: view === v ? 'white' : '#4b5563',
                    borderRight: v !== 'day' ? '1px solid #e5e7eb' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>

            {/* Type filter select */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Types</option>
              {eventTypes.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>

            {/* Location filter select */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Locations</option>
              {LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
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
              fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
            }}>
              <Clock size={14} />
              <span><strong>{locationFilter}</strong>: {openDays} · {formatTime24to12(locH.openTime)} – {formatTime24to12(locH.closeTime)}</span>
            </div>
          );
        })()}

        {/* Content area: Calendar + Sidebar */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
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
          <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Legend */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 12px 0', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Event Types
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
                    Overdue ({overdueEvents.length})
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
                          {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
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
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px 0', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Today
              </h3>
              <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: "'DM Sans', sans-serif", marginBottom: '4px' }}>
                {todayEvents.length}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px', fontFamily: "'DM Sans', sans-serif" }}>
                scheduled items
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
                Upcoming
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upcomingEvents.length === 0 && (
                  <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>No upcoming events</p>
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
                        {isEventToday ? 'Today' : eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {event.time}
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
                This Month
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Total Events', value: filteredEvents.filter(e => { const dd = new Date(e.date + 'T12:00:00'); return dd.getMonth() === today.getMonth() && dd.getFullYear() === today.getFullYear(); }).length, color: '#1e4d6b' },
                  { label: 'Inspections', value: filteredEvents.filter(e => { const dd = new Date(e.date + 'T12:00:00'); return e.type === 'inspection' && dd.getMonth() === today.getMonth() && dd.getFullYear() === today.getFullYear(); }).length, color: '#ea580c' },
                  { label: 'Vendor Visits', value: filteredEvents.filter(e => { const dd = new Date(e.date + 'T12:00:00'); return e.type === 'vendor' && dd.getMonth() === today.getMonth() && dd.getFullYear() === today.getFullYear(); }).length, color: '#7c3aed' },
                  { label: 'Meetings', value: filteredEvents.filter(e => { const dd = new Date(e.date + 'T12:00:00'); return e.type === 'meeting' && dd.getMonth() === today.getMonth() && dd.getFullYear() === today.getFullYear(); }).length, color: '#0891b2' },
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
    </>
  );
}

export default Calendar;
