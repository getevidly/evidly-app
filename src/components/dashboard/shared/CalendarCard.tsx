/**
 * Shared mini-calendar card for dashboard views.
 *
 * Renders a month-view grid with event dots, day selection,
 * event detail list, and "View Full Calendar" link.
 * Accepts role-specific demo events and color config via props.
 */

import { useState, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionTooltip } from '../../ui/SectionTooltip';

// ── Types ──────────────────────────────────────────────

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  type: string;
  title: string;
  location: string;
  priority: 'critical' | 'high' | 'medium';
}

export interface CalendarCardProps {
  events: CalendarEvent[];
  typeColors: Record<string, string>;
  typeLabels: Record<string, string>;
  navigate: (path: string) => void;
  tooltipContent?: string;
}

// ── Helpers ──────────────────────────────────────────────

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Component ──────────────────────────────────────────────

export function CalendarCard({ events, typeColors, typeLabels, navigate, tooltipContent }: CalendarCardProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // Group events by date key
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const evt of events) {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    }
    return map;
  }, [events]);

  // Events for selected day
  const selectedDateKey = selectedDay ? toDateKey(viewYear, viewMonth, selectedDay) : null;
  const selectedEvents = selectedDateKey ? (eventsByDate[selectedDateKey] || []) : [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Build day cells
  const dayCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) dayCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) dayCells.push(d);

  return (
    <div
      className="bg-white rounded-lg p-4"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-gray-400" />
          <h3
            className="text-xs font-semibold uppercase"
            style={{ letterSpacing: '0.1em', color: '#6b7280', fontFamily: 'Inter, sans-serif' }}
          >
            Schedule
          </h3>
          {tooltipContent && <SectionTooltip content={tooltipContent} />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{formatMonthYear(viewYear, viewMonth)}</span>
          <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {WEEKDAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0">
        {dayCells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="py-1.5" />;
          const dateKey = toDateKey(viewYear, viewMonth, day);
          const dayEvents = eventsByDate[dateKey] || [];
          const isToday = dateKey === todayKey;
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`relative flex flex-col items-center py-1.5 rounded-md transition-colors ${
                isSelected ? 'bg-[#eef4f8]' : 'hover:bg-gray-50'
              }`}
            >
              <span
                className={`text-xs font-medium leading-none ${
                  isToday ? 'text-white' : isSelected ? 'text-[#1e4d6b]' : 'text-gray-700'
                }`}
                style={isToday ? {
                  backgroundColor: '#1e4d6b',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                } : undefined}
              >
                {day}
              </span>
              {/* Event dots */}
              {dayEvents.length > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((evt, i) => (
                    <span
                      key={i}
                      className="rounded-full"
                      style={{
                        width: 5,
                        height: 5,
                        backgroundColor: typeColors[evt.type] || '#6b7280',
                      }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">
        {Object.keys(typeColors).map(type => (
          <div key={type} className="flex items-center gap-1">
            <span className="rounded-full" style={{ width: 6, height: 6, backgroundColor: typeColors[type] }} />
            <span className="text-[10px] text-gray-500">{typeLabels[type] || type}</span>
          </div>
        ))}
      </div>

      {/* Selected day events */}
      {selectedDay !== null && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 mb-2">
            {new Date(viewYear, viewMonth, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-gray-400">No events scheduled</p>
          ) : (
            <div className="space-y-1.5">
              {selectedEvents.map((evt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => navigate('/calendar')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left hover:bg-gray-50 transition-colors"
                  style={{ borderLeft: `3px solid ${typeColors[evt.type] || '#6b7280'}` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 truncate">{evt.title}</p>
                    <p className="text-[11px] text-gray-500">{evt.location}</p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      backgroundColor: evt.priority === 'critical' ? '#fef2f2' : evt.priority === 'high' ? '#fef3c7' : '#f1f5f9',
                      color: evt.priority === 'critical' ? '#dc2626' : evt.priority === 'high' ? '#b45309' : '#6b7280',
                    }}
                  >
                    {evt.priority === 'critical' ? 'Critical' : evt.priority === 'high' ? 'High' : 'Medium'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Full Calendar link */}
      <button
        type="button"
        onClick={() => navigate('/calendar')}
        className="mt-3 w-full text-center text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
        style={{ color: '#1e4d6b' }}
      >
        View Full Calendar &rarr;
      </button>
    </div>
  );
}
