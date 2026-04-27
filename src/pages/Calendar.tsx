import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, MapPin, X, AlertTriangle, Loader2, CheckCircle, Plus } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useRole } from '../contexts/RoleContext';
import type { UserRole } from '../contexts/RoleContext';
import { useOperatingHours, formatTime24to12, time24ToHour, DAY_LABELS as _DAY_LABELS } from '../contexts/OperatingHoursContext';

import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import { useTooltip } from '../hooks/useTooltip';
import { Modal } from '../components/ui/Modal';
import ReadOnlyEventModal from '../components/calendar/ReadOnlyEventModal';

// ── Event Types ──────────────────────────────────────────────
interface EventType {
  id: string;
  label: string;
  color: string;
  bg: string;
  border: string;
}

const eventTypes: EventType[] = [
  { id: 'temp-check', label: 'Temperature Reading', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { id: 'checklist', label: 'Checklist', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'vendor', label: 'Vendor Service', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'inspection', label: 'Inspection', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  { id: 'corrective', label: 'Corrective Action', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  { id: 'certification', label: 'Certification', color: '#A08C5A', bg: '#fefce8', border: '#fde68a' },
];

const typeMap = Object.fromEntries(eventTypes.map(t => [t.id, t]));

const LOCATIONS = ['Location 1', 'Location 2', 'Location 3']; // demo

const FACILITY_SAFETY_CATEGORIES = [
  'Hood Cleaning Inspection',
  'Fire Suppression Inspection',
  'Fire Extinguisher Inspection',
  'Pest Control Service',
  'Grease Trap Service',
  'Elevator Inspection',
  'Backflow Prevention Test',
  'General Fire Safety',
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


// ── Demo Events ──────────────────────────────────────────────
export interface CalendarEvent {
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
  source: 'calendar_events';
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

const BUSINESS_HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
const FULL_DAY_HOURS = Array.from({ length: 24 }, (_, i) => i);   // 12 AM to 11 PM

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

  // 24-hour preference
  const { getPreference, setPreference } = useUserPreferences();
  const is24h = getPreference<boolean>('calendar_24h_view', false);
  const HOURS = is24h ? FULL_DAY_HOURS : BUSINESS_HOURS;

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const isMobileInit = typeof window !== 'undefined' && window.innerWidth < 640;
  const [view, setView] = useState<ViewMode>('day');
  const [isMobile, setIsMobile] = useState(isMobileInit);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [locationFilter, setLocationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(() =>
    CATEGORY_PARAM_MAP[categoryParam || ''] || 'all'
  );
  const { getHoursForLocation, getShiftsForLocation } = useOperatingHours();

  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  const ttCalendarSubtitle = useTooltip('calendarSubtitle', userRole);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
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
      // Query calendar_events only — calendar is a vendor service schedule view.
      // Source records (temp logs, checklists, equipment service, documents, HACCP)
      // live in their own modules and are never edited from the calendar.
      const { data: customCalRes } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('organization_id', orgId)
        .gte('date', startStr)
        .lte('date', endStr);

      for (const ce of (customCalRes || [])) {
        allEvents.push({
          id: ce.id,
          title: ce.title,
          type: ce.type || 'vendor',
          date: ce.date,
          time: ce.start_time,
          endTime: ce.end_time || undefined,
          location: locMap[ce.location_id] || 'Unknown',
          description: ce.description || undefined,
          category: ce.category || undefined,
          vendorId: ce.vendor_id || undefined,
          vendorName: ce.vendor_name || undefined,
          recurrence: ce.recurrence || undefined,
          recurrenceGroupId: ce.recurrence_group_id || undefined,
          source: 'calendar_events',
        });
      }

      setLiveEvents(allEvents);
      setLoading(false);
    }

    fetchCalendarEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, profile?.organization_id, viewMonth]);

  const events = useMemo(() => {
    return liveEvents;
  }, [liveEvents]);

  const filteredEvents = useMemo(() => {
    const roleTypes = ROLE_EVENT_TYPES[userRole];
    return events.filter(e =>
      (roleTypes === 'all' || roleTypes.includes(e.type)) &&
      (locationFilter === 'all' || e.location === locationFilter) &&
      (categoryFilter === 'all' || e.category === categoryFilter)
    );
  }, [events, locationFilter, categoryFilter, userRole]);

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


  // Upcoming events for sidebar
  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter(e => e.date >= todayKey && !e.overdue)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 6);
  }, [filteredEvents, todayKey]);

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

    // Mobile: compact day list
    if (isMobile) {
      const monthDays = days.filter((d): d is Date => d !== null);
      return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {monthDays.map((day, idx) => {
              const dateKey = formatDateKey(day);
              const dayEvents = eventsByDate[dateKey] || [];
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={idx}
                  onClick={() => { setCurrentDate(day); setView('day'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', cursor: 'pointer',
                    borderBottom: idx < monthDays.length - 1 ? '1px solid #f3f4f6' : 'none',
                    backgroundColor: isToday ? '#fffbeb' : 'white',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <div style={{ width: '40px', textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
                      {DAYS[day.getDay()].slice(0, 3)}
                    </div>
                    <div style={{
                      fontSize: '18px', fontWeight: 700,
                      color: isToday ? '#1E2D4D' : '#111827',
                      width: '32px', height: '32px', borderRadius: '50%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isToday ? 'transparent' : 'transparent',
                      border: isToday ? '2px solid #A08C5A' : 'none',
                    }}>
                      {day.getDate()}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {dayEvents.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#d1d5db' }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {dayEvents.slice(0, 3).map(event => renderEventChip(event))}
                        {dayEvents.length > 3 && (
                          <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600, padding: '1px 4px', fontFamily: "'DM Sans', sans-serif" }}>
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={14} color="#d1d5db" />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Desktop: 7-column grid
    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
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
                        backgroundColor: isToday ? '#1E2D4D' : 'transparent',
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

    // Mobile: stacked day cards
    if (isMobile) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {weekDays.map((day, idx) => {
            const isToday = isSameDay(day, today);
            const dateKey = formatDateKey(day);
            const dayEvents = eventsByDate[dateKey] || [];
            return (
              <div
                key={idx}
                onClick={() => { setCurrentDate(day); setView('day'); }}
                style={{
                  border: `1px solid ${isToday ? '#A08C5A' : '#e5e7eb'}`,
                  borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                  backgroundColor: isToday ? '#fffbeb' : 'white',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: dayEvents.length > 0 ? '1px solid #f3f4f6' : 'none',
                  backgroundColor: isToday ? '#fef3c7' : '#f9fafb',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: isToday ? '#1E2D4D' : '#374151' }}>
                      {DAYS[day.getDay()]}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isToday ? '#92400e' : '#6b7280' }}>
                      {MONTHS[day.getMonth()].slice(0, 3)} {day.getDate()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {dayEvents.length > 0 && (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, color: '#1E2D4D',
                        backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '10px',
                      }}>
                        {dayEvents.length}
                      </span>
                    )}
                    <ChevronRight size={14} color="#d1d5db" />
                  </div>
                </div>
                {dayEvents.length > 0 && (
                  <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {dayEvents.slice(0, 4).map(event => {
                      const t = typeMap[event.type];
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '6px 8px', borderRadius: '6px',
                            backgroundColor: t?.bg || '#f3f4f6',
                            borderLeft: `3px solid ${t?.color || '#999'}`,
                            fontSize: '12px', fontWeight: 600,
                            color: t?.color || '#333',
                          }}
                        >
                          <span style={{ fontSize: '11px', color: '#6b7280', flexShrink: 0 }}>{event.time}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 4 && (
                      <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, paddingLeft: '8px' }}>
                        +{dayEvents.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // Desktop: 8-column time grid
    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
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
                    color: isToday ? '#1E2D4D' : '#111827',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isToday ? '#fffbeb' : 'transparent',
                    border: isToday ? '2px solid #A08C5A' : 'none',
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
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E2D4D' }}>
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
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#A08C5A', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {shiftStart.name} Shift
                  </div>
                  <div style={{ flex: 1, borderBottom: '2px dashed #A08C5A' }} />
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
              <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', minHeight: '26px', backgroundColor: isOutside ? '#f3f4f6' : 'transparent' }}>
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
      {categoryParam && (
        <div className="px-3 sm:px-6" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <button
            onClick={() => navigate('/facility-safety')}
            className="flex items-center gap-1 text-sm font-medium mb-3 hover:underline"
            style={{ color: '#1E2D4D' }}
          >
            <ChevronLeft size={14} />
            Back to Fire Safety
          </button>
        </div>
      )}

      <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }} className="px-3 sm:px-6">
        {/* Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E2D4D', margin: '0 0 4px 0', fontFamily: "'DM Sans', sans-serif" }}>{tr('pages.calendar.title')}</h1>
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
          <div data-demo-allow style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            {/* Schedule a service */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button
                onClick={() => navigate('/vendors')}
                style={{
                  padding: '8px 16px', borderRadius: '8px',
                  border: 'none', backgroundColor: '#3B6D11',
                  fontWeight: 500, fontSize: '14px', color: 'white',
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2D5309'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#3B6D11'; }}
              >
                <Plus size={16} style={{ marginRight: '6px' }} />
                Schedule a service
              </button>
            </div>

            {/* Action row: Today + View toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Today button */}
              <button
                onClick={goToday}
                style={{
                  padding: '8px 16px', borderRadius: '8px',
                  border: '2px solid #A08C5A', backgroundColor: '#fffbeb',
                  fontWeight: 700, fontSize: '13px', color: '#92400e',
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef3c7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fffbeb'; }}
              >
                {tr('pages.calendar.today')}
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
                      backgroundColor: view === v ? '#1E2D4D' : 'white',
                      color: view === v ? 'white' : '#4b5563',
                      borderRight: v !== 'month' ? '1px solid #e5e7eb' : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tr(`pages.calendar.${v}`)}
                  </button>
                ))}
              </div>

              {/* 24h toggle */}
              <button
                type="button"
                onClick={() => setPreference('calendar_24h_view', !is24h)}
                style={{
                  padding: '8px 12px', fontSize: '13px', fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif", borderRadius: '8px',
                  border: '1px solid #e5e7eb', cursor: 'pointer',
                  backgroundColor: is24h ? '#1E2D4D' : 'white',
                  color: is24h ? 'white' : '#4b5563',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                24h
              </button>
            </div>

            {/* Filter row: Location → Event Type → Vendor Service (dependent). Stacks full-width on mobile. */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Location filter select — primary axis */}
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

              {/* Vendor Service filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={selectStyle}
                className="w-full sm:w-auto sm:min-w-[150px]"
              >
                <option value="all">All vendor services</option>
                {FACILITY_SAFETY_CATEGORIES.filter(c => c !== 'Other').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
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
              border: '1px solid #b8d4e8', fontSize: '13px', color: '#1E2D4D',
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
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1E2D4D' }} />
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


            {/* Today Card */}
            <div style={{
              backgroundColor: '#1E2D4D',
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
                  <div style={{ padding: '4px 0' }}>
                    <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 6px', fontFamily: "'DM Sans', sans-serif" }}>{tr('pages.calendar.noUpcomingEvents')}</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
                      EvidLY adds events automatically when vendor services are scheduled.
                    </p>
                  </div>
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
                  { label: tr('pages.calendar.totalEvents'), value: filteredEvents.filter(e => { const dd = new Date(e.date + 'T12:00:00'); return dd.getMonth() === today.getMonth() && dd.getFullYear() === today.getFullYear(); }).length, color: '#1E2D4D' },
                  { label: tr('pages.calendar.vendorVisits'), value: filteredEvents.filter(e => { const dd = new Date(e.date + 'T12:00:00'); return e.type === 'vendor' && dd.getMonth() === today.getMonth() && dd.getFullYear() === today.getFullYear(); }).length, color: '#7c3aed' },
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
        <ReadOnlyEventModal
          event={selectedEvent}
          isOpen={selectedEvent !== null}
          onClose={() => setSelectedEvent(null)}
        />



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
