import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, Filter, X } from 'lucide-react';

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
  { id: 'training', label: 'Training', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { id: 'maintenance', label: 'Maintenance', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
  { id: 'certification', label: 'Certification', color: '#d4af37', bg: '#fefce8', border: '#fde68a' },
];

const typeMap = Object.fromEntries(eventTypes.map(t => [t.id, t]));

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
}

function generateDemoEvents(): CalendarEvent[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const d = (day: number) => {
    const date = new Date(y, m, day);
    return date.toISOString().split('T')[0];
  };

  const today = now.getDate();

  return [
    // Today
    { id: '1', title: 'Morning Temperature Check', type: 'temp-check', date: d(today), time: '6:00 AM', endTime: '6:30 AM', location: 'Downtown', description: 'Walk-in coolers, freezers, hot hold stations' },
    { id: '2', title: 'Opening Checklist', type: 'checklist', date: d(today), time: '6:30 AM', endTime: '7:00 AM', location: 'Downtown', description: 'Kitchen prep and sanitization verification' },
    { id: '3', title: 'Midday Temp Check', type: 'temp-check', date: d(today), time: '12:00 PM', endTime: '12:30 PM', location: 'Downtown' },
    { id: '4', title: 'Evening Checklist', type: 'checklist', date: d(today), time: '9:00 PM', endTime: '9:30 PM', location: 'Downtown', description: 'Closing procedures and final sanitization' },
    // Yesterday
    { id: '5', title: 'Health Department Inspection', type: 'inspection', date: d(today - 1), time: '10:00 AM', endTime: '12:00 PM', location: 'Airport', description: 'Annual routine health inspection' },
    { id: '6', title: 'Morning Temperature Check', type: 'temp-check', date: d(today - 1), time: '6:00 AM', endTime: '6:30 AM', location: 'Airport' },
    // Tomorrow
    { id: '7', title: 'Hood Cleaning Service', type: 'vendor', date: d(today + 1), time: '11:00 PM', endTime: '3:00 AM', location: 'Downtown', description: 'Quarterly hood and duct cleaning by ProClean Services' },
    { id: '8', title: 'Morning Temperature Check', type: 'temp-check', date: d(today + 1), time: '6:00 AM', endTime: '6:30 AM', location: 'University' },
    { id: '9', title: 'Opening Checklist', type: 'checklist', date: d(today + 1), time: '6:30 AM', endTime: '7:00 AM', location: 'University' },
    // +2 days
    { id: '10', title: 'Food Safety Training', type: 'training', date: d(today + 2), time: '2:00 PM', endTime: '4:00 PM', location: 'Downtown', description: 'New hire food handler certification training' },
    { id: '11', title: 'Grease Trap Service', type: 'vendor', date: d(today + 2), time: '5:00 AM', endTime: '7:00 AM', location: 'Airport', description: 'Monthly grease trap pumping by GreenWaste' },
    // +3 days
    { id: '12', title: 'Fire Suppression Inspection', type: 'inspection', date: d(today + 3), time: '9:00 AM', endTime: '11:00 AM', location: 'Downtown', description: 'Semi-annual fire suppression system inspection' },
    { id: '13', title: 'HACCP Plan Review', type: 'checklist', date: d(today + 3), time: '1:00 PM', endTime: '3:00 PM', location: 'University' },
    // +5 days
    { id: '14', title: 'ServSafe Certification Renewal', type: 'certification', date: d(today + 5), time: '9:00 AM', endTime: '5:00 PM', location: 'Downtown', description: 'Manager certification renewal exam' },
    { id: '15', title: 'Pest Control Service', type: 'vendor', date: d(today + 5), time: '6:00 AM', endTime: '8:00 AM', location: 'Airport' },
    // +7 days
    { id: '16', title: 'Equipment Maintenance', type: 'maintenance', date: d(today + 7), time: '7:00 AM', endTime: '10:00 AM', location: 'University', description: 'Quarterly refrigeration system maintenance' },
    { id: '17', title: 'Allergen Training', type: 'training', date: d(today + 7), time: '3:00 PM', endTime: '5:00 PM', location: 'Downtown' },
    // -3 days
    { id: '18', title: 'Fire Extinguisher Service', type: 'vendor', date: d(today - 3), time: '8:00 AM', endTime: '10:00 AM', location: 'Downtown', description: 'Annual fire extinguisher inspection and tagging' },
    { id: '19', title: 'Morning Temperature Check', type: 'temp-check', date: d(today - 3), time: '6:00 AM', endTime: '6:30 AM', location: 'Downtown' },
    // -5 days
    { id: '20', title: 'HVAC Filter Replacement', type: 'maintenance', date: d(today - 5), time: '6:00 AM', endTime: '8:00 AM', location: 'Airport', description: 'Quarterly HVAC filter replacement' },
    { id: '21', title: 'Food Handler Training', type: 'training', date: d(today - 5), time: '10:00 AM', endTime: '12:00 PM', location: 'University' },
    // -7 days
    { id: '22', title: 'Plumbing Inspection', type: 'maintenance', date: d(today - 7), time: '8:00 AM', endTime: '9:00 AM', location: 'Downtown' },
    // +10 days
    { id: '23', title: 'Health Permit Renewal', type: 'certification', date: d(today + 10), time: '9:00 AM', location: 'Airport', allDay: true },
    { id: '24', title: 'Deep Cleaning Service', type: 'vendor', date: d(today + 10), time: '10:00 PM', endTime: '4:00 AM', location: 'University' },
    // +14 days
    { id: '25', title: 'Quarterly Compliance Review', type: 'inspection', date: d(today + 14), time: '10:00 AM', endTime: '2:00 PM', location: 'Downtown', description: 'Internal compliance audit across all pillars' },
    // -10 days
    { id: '26', title: 'Walk-in Cooler Repair', type: 'maintenance', date: d(today - 10), time: '7:00 AM', endTime: '11:00 AM', location: 'Airport' },
  ];
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
  return d.toISOString().split('T')[0];
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
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(eventTypes.map(t => t.id)));
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const events = useMemo(() => generateDemoEvents(), []);

  const filteredEvents = useMemo(() =>
    events.filter(e => activeFilters.has(e.type)),
    [events, activeFilters]
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of filteredEvents) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    // Sort each day's events by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [filteredEvents]);

  // Navigation
  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  // Upcoming events for sidebar
  const upcomingEvents = useMemo(() => {
    const todayKey = formatDateKey(today);
    return filteredEvents
      .filter(e => e.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 8);
  }, [filteredEvents, today]);

  // ── Render Event Chip (month view) ──
  const renderEventChip = (event: CalendarEvent) => {
    const t = typeMap[event.type];
    if (!t) return null;
    return (
      <div
        key={event.id}
        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
        style={{
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          color: t.color,
          backgroundColor: t.bg,
          borderLeft: `3px solid ${t.color}`,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: '1.4',
          marginBottom: '1px',
          fontFamily: "'DM Sans', sans-serif",
        }}
        title={event.title}
      >
        {event.time.replace(':00', '').replace(' ', '')} {event.title}
      </div>
    );
  };

  // ── Month View ──
  const renderMonthView = () => {
    const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
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
                  setSelectedDay(day);
                  setCurrentDate(day);
                  setView('day');
                }
              }}
              style={{
                minHeight: '110px',
                padding: '6px',
                borderRight: (idx + 1) % 7 !== 0 ? '1px solid #e5e7eb' : 'none',
                borderBottom: idx < days.length - 7 ? '1px solid #e5e7eb' : 'none',
                backgroundColor: isToday ? '#fffbeb' : !isCurrentMonth ? '#f9fafb' : 'white',
                cursor: day ? 'pointer' : 'default',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { if (day && !isToday) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
              onMouseLeave={(e) => { if (day && !isToday) e.currentTarget.style.backgroundColor = 'white'; }}
            >
              {day && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      fontSize: '13px',
                      fontWeight: isToday ? 700 : 500,
                      fontFamily: "'DM Sans', sans-serif",
                      color: isToday ? 'white' : '#374151',
                      backgroundColor: isToday ? '#1e4d6b' : 'transparent',
                    }}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {dayEvents.slice(0, 3).map(renderEventChip)}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, padding: '2px 6px', fontFamily: "'DM Sans', sans-serif" }}>
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Week View ──
  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);

    return (
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
                    }}
                  >
                    {hourEvents.map(event => {
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
                            borderLeft: `3px solid ${t?.color || '#999'}`,
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
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Day View ──
  const renderDayView = () => {
    const dateKey = formatDateKey(currentDate);
    const dayEvents = eventsByDate[dateKey] || [];

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
          {HOURS.map(hour => {
            const hourEvents = dayEvents.filter(e => {
              const h = parseInt(e.time);
              const isPM = e.time.includes('PM');
              let eventHour = h;
              if (isPM && h !== 12) eventHour += 12;
              if (!isPM && h === 12) eventHour = 0;
              return eventHour === hour;
            });

            return (
              <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', minHeight: '64px' }}>
                <div style={{ width: '80px', padding: '8px 12px', textAlign: 'right', fontSize: '12px', color: '#9ca3af', fontWeight: 500, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
                  {hourLabel(hour)}
                </div>
                <div style={{ flex: 1, padding: '4px 8px', borderLeft: '1px solid #e5e7eb' }}>
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
                </div>
              </div>
            );
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
          {/* Header bar */}
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
                onClick={() => { alert('Edit event — available in full version'); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  backgroundColor: 'white',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: '#374151',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Edit
              </button>
              <button
                onClick={() => { setSelectedEvent(null); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1e4d6b',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: 'white',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
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

  // ── Filter Panel ──
  const renderFilterPanel = () => {
    if (!showFilters) return null;
    return (
      <div style={{
        position: 'absolute',
        top: '48px',
        right: '0',
        zIndex: 30,
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        border: '1px solid #e5e7eb',
        padding: '16px',
        width: '240px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>Filter Events</span>
          <button
            onClick={() => {
              if (activeFilters.size === eventTypes.length) setActiveFilters(new Set());
              else setActiveFilters(new Set(eventTypes.map(t => t.id)));
            }}
            style={{ background: 'none', border: 'none', fontSize: '12px', color: '#1e4d6b', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            {activeFilters.size === eventTypes.length ? 'Clear All' : 'Select All'}
          </button>
        </div>
        {eventTypes.map(type => (
          <label
            key={type.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 6px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#374151',
              fontWeight: 500,
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <input
              type="checkbox"
              checked={activeFilters.has(type.id)}
              onChange={() => toggleFilter(type.id)}
              style={{ accentColor: type.color, width: '16px', height: '16px' }}
            />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: type.color, flexShrink: 0 }} />
            {type.label}
          </label>
        ))}
      </div>
    );
  };

  // ── Main Render ──
  return (
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
            onClick={() => navigate(-1)}
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
            onClick={() => navigate(1)}
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

        {/* Right: Today button + View toggle + Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Today button — separate */}
          <button
            onClick={goToday}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '2px solid #d4af37',
              backgroundColor: '#fffbeb',
              fontWeight: 700,
              fontSize: '13px',
              color: '#92400e',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef3c7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fffbeb'; }}
          >
            Today
          </button>

          {/* View toggle group */}
          <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {(['month', 'week', 'day'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  border: 'none',
                  cursor: 'pointer',
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

          {/* Filter button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: showFilters ? '#f3f4f6' : 'white',
                fontWeight: 600,
                fontSize: '13px',
                color: '#374151',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'background-color 0.15s',
              }}
            >
              <Filter size={14} />
              Filter
              {activeFilters.size < eventTypes.length && (
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  backgroundColor: '#1e4d6b', color: 'white',
                  fontSize: '10px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {activeFilters.size}
                </span>
              )}
            </button>
            {renderFilterPanel()}
          </div>
        </div>
      </div>

      {/* Content area: Calendar + Sidebar */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Calendar */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </div>

        {/* Sidebar */}
        <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Legend */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 12px 0', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Event Types
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {eventTypes.map(type => (
                <div
                  key={type.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: activeFilters.has(type.id) ? '#374151' : '#9ca3af',
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}
                  onClick={() => toggleFilter(type.id)}
                >
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    backgroundColor: activeFilters.has(type.id) ? type.color : '#d1d5db',
                    flexShrink: 0,
                    transition: 'background-color 0.15s',
                  }} />
                  {type.label}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
          }}>
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
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: t?.bg || '#f3f4f6',
                      borderLeft: `3px solid ${t?.color || '#999'}`,
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
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
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 12px 0', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              This Month
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Total Events', value: filteredEvents.filter(e => { const d = new Date(e.date + 'T12:00:00'); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); }).length, color: '#1e4d6b' },
                { label: 'Inspections', value: filteredEvents.filter(e => { const d = new Date(e.date + 'T12:00:00'); return e.type === 'inspection' && d.getMonth() === today.getMonth(); }).length, color: '#ea580c' },
                { label: 'Vendor Visits', value: filteredEvents.filter(e => { const d = new Date(e.date + 'T12:00:00'); return e.type === 'vendor' && d.getMonth() === today.getMonth(); }).length, color: '#7c3aed' },
                { label: 'Training', value: filteredEvents.filter(e => { const d = new Date(e.date + 'T12:00:00'); return e.type === 'training' && d.getMonth() === today.getMonth(); }).length, color: '#0891b2' },
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

      {/* Close filter dropdown when clicking outside */}
      {showFilters && (
        <div
          onClick={() => setShowFilters(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 20 }}
        />
      )}

      {/* Event detail modal */}
      {renderEventModal()}
    </div>
  );
}

export default Calendar;
