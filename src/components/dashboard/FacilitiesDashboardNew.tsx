import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useTooltip } from '../../hooks/useTooltip';
import { SectionTooltip } from '../ui/SectionTooltip';
import { useDemo } from '../../contexts/DemoContext';
import { DEMO_LOCATION_GRADE_OVERRIDES } from '../../data/demoJurisdictions';
import { DEMO_ORG } from '../../data/demoData';
import { FireStatusBars } from '../shared/FireStatusBars';
import { FONT, JIE_LOC_MAP, getGreeting, DEMO_ROLE_NAMES } from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { WhereDoIStartSection, type PriorityItem } from './shared/WhereDoIStartSection';
import { TabbedDetailSection } from './shared/TabbedDetailSection';

// --------------- Demo Data ---------------

const DEMO_EQUIPMENT_COUNT = 12;

interface FacilitiesAttentionItem {
  id: string;
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
  actionLabel: string;
  actionRoute: string;
}

const DEMO_FACILITIES_ATTENTION: FacilitiesAttentionItem[] = [
  {
    id: 'fac-1',
    severity: 'warning',
    title: 'Fire suppression inspection expires in 12 days',
    detail: 'ABC Fire Protection notified',
    actionLabel: 'Schedule Service',
    actionRoute: '/vendors',
  },
  {
    id: 'fac-2',
    severity: 'warning',
    title: 'Walk-in Freezer compressor — service overdue',
    detail: 'Last serviced: 8 months ago',
    actionLabel: 'View Equipment',
    actionRoute: '/equipment',
  },
];

interface VendorVisit {
  day: string;
  service: string;
  vendor: string;
  status: 'confirmed' | 'pending' | 'overdue';
}

const DEMO_VENDOR_SCHEDULE: VendorVisit[] = [
  { day: 'Mon', service: 'Hood Cleaning', vendor: 'Cleaning Pros Plus', status: 'confirmed' },
  { day: 'Wed', service: 'Pest Control', vendor: 'Western Pest', status: 'pending' },
  { day: 'Fri', service: 'Grease Trap', vendor: 'Valley Grease', status: 'confirmed' },
];

interface FacilitiesDoc {
  name: string;
  status: 'current' | 'expiring' | 'expired';
  expires: string;
}

const DEMO_FACILITIES_DOCS: FacilitiesDoc[] = [
  { name: 'Hood Cleaning Certificate', status: 'current', expires: 'Apr 15, 2026' },
  { name: 'Fire Suppression Inspection', status: 'expiring', expires: 'Feb 26, 2026' },
  { name: 'Fire Extinguisher Tags', status: 'current', expires: 'Aug 1, 2026' },
  { name: 'Hood Vendor IKECA Cert', status: 'current', expires: 'Dec 31, 2026' },
  { name: 'Vendor Insurance (GL)', status: 'current', expires: 'Jul 15, 2026' },
];

interface EquipmentAlert {
  name: string;
  alert: string | null;
  status?: string;
  severity?: 'warning' | 'critical';
}

const DEMO_EQUIPMENT_ALERTS: EquipmentAlert[] = [
  { name: 'Walk-in Freezer #1', alert: 'Compressor runtime up 23% this month', severity: 'warning' },
  { name: 'Hood System', alert: null, status: 'All normal' },
  { name: 'Fire Suppression System', alert: null, status: 'All normal' },
  { name: 'Walk-in Cooler #1', alert: null, status: 'All normal' },
  { name: 'Walk-in Cooler #2', alert: null, status: 'All normal' },
];

// --------------- Calendar Demo Data ---------------

interface FacilitiesCalendarEvent {
  date: string; // YYYY-MM-DD
  type: 'maintenance' | 'vendor' | 'permit' | 'inspection';
  title: string;
  location: string;
  priority: 'critical' | 'high' | 'medium';
}

const DEMO_FACILITIES_CALENDAR: FacilitiesCalendarEvent[] = [
  { date: '2026-02-20', type: 'maintenance', title: 'Hood Cleaning — Downtown Kitchen', location: 'Downtown Kitchen', priority: 'high' },
  { date: '2026-02-24', type: 'vendor', title: 'Ansul Inspection — Airport Cafe', location: 'Airport Cafe', priority: 'high' },
  { date: '2026-02-28', type: 'permit', title: 'Operational Permit Renewal — University Dining', location: 'University Dining', priority: 'critical' },
  { date: '2026-03-05', type: 'vendor', title: 'Grease Trap Service — Downtown Kitchen', location: 'Downtown Kitchen', priority: 'medium' },
  { date: '2026-03-12', type: 'inspection', title: 'Fire Safety Self-Inspection — Airport Cafe', location: 'Airport Cafe', priority: 'medium' },
  { date: '2026-03-18', type: 'maintenance', title: 'Extinguisher Annual Inspection — All Locations', location: 'All Locations', priority: 'high' },
  { date: '2026-03-25', type: 'vendor', title: 'Pest Control — University Dining', location: 'University Dining', priority: 'medium' },
];

const EVENT_TYPE_COLORS: Record<FacilitiesCalendarEvent['type'], string> = {
  maintenance: '#d97706',
  vendor: '#2563eb',
  permit: '#dc2626',
  inspection: '#7c3aed',
};

const EVENT_TYPE_LABELS: Record<FacilitiesCalendarEvent['type'], string> = {
  maintenance: 'Maintenance',
  vendor: 'Vendor',
  permit: 'Permit',
  inspection: 'Inspection',
};

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

// --------------- Helpers ---------------

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-lg p-4 ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif' }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, children }: { icon: typeof Flame; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} className="text-gray-400" />
      <h3
        className="text-xs font-semibold uppercase"
        style={{ letterSpacing: '0.1em', color: '#6b7280', fontFamily: 'Inter, sans-serif' }}
      >
        {children}
      </h3>
    </div>
  );
}

function StatusBadge({ status }: { status: 'current' | 'expiring' | 'expired' | 'confirmed' | 'pending' | 'overdue' }) {
  const config = {
    current: { bg: '#dcfce7', color: '#16a34a', label: 'Current' },
    confirmed: { bg: '#dcfce7', color: '#16a34a', label: 'Confirmed' },
    expiring: { bg: '#fef3c7', color: '#b45309', label: 'Expiring' },
    pending: { bg: '#fef3c7', color: '#b45309', label: 'Pending' },
    expired: { bg: '#fee2e2', color: '#dc2626', label: 'Expired' },
    overdue: { bg: '#fee2e2', color: '#dc2626', label: 'Overdue' },
  }[status];

  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: '#dc2626',
  warning: '#d4af37',
};

// ===============================================
// FACILITIES CALENDAR CARD
// ===============================================

function FacilitiesCalendarCard({ navigate, userRole }: { navigate: (path: string) => void; userRole: string }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // Group events by date key
  const eventsByDate = useMemo(() => {
    const map: Record<string, FacilitiesCalendarEvent[]> = {};
    for (const evt of DEMO_FACILITIES_CALENDAR) {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    }
    return map;
  }, []);

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
    <Card>
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
          <SectionTooltip content={useTooltip('scheduleCalendar', userRole as any)} />
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
          const events = eventsByDate[dateKey] || [];
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
              {events.length > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {events.slice(0, 3).map((evt, i) => (
                    <span
                      key={i}
                      className="rounded-full"
                      style={{
                        width: 5,
                        height: 5,
                        backgroundColor: EVENT_TYPE_COLORS[evt.type],
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
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
        {(Object.keys(EVENT_TYPE_COLORS) as FacilitiesCalendarEvent['type'][]).map(type => (
          <div key={type} className="flex items-center gap-1">
            <span className="rounded-full" style={{ width: 6, height: 6, backgroundColor: EVENT_TYPE_COLORS[type] }} />
            <span className="text-[10px] text-gray-500">{EVENT_TYPE_LABELS[type]}</span>
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
                  style={{ borderLeft: `3px solid ${EVENT_TYPE_COLORS[evt.type]}` }}
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
    </Card>
  );
}

// ===============================================
// FACILITIES MANAGER DASHBOARD
// ===============================================

const FAC_LOC_NAMES: Record<string, string> = {
  downtown: 'Downtown Kitchen',
  airport: 'Airport Cafe',
  university: 'University Dining',
};

export default function FacilitiesDashboardNew() {
  const navigate = useNavigate();
  const { getAccessibleLocations, userRole } = useRole();
  const { companyName } = useDemo();

  const accessibleLocations = useMemo(() => getAccessibleLocations(), [getAccessibleLocations]);
  const defaultLoc = accessibleLocations[0]?.locationUrlId || 'downtown';

  const jieKey = JIE_LOC_MAP[defaultLoc] || `demo-loc-${defaultLoc}`;
  const override = DEMO_LOCATION_GRADE_OVERRIDES[jieKey];
  const locationName = FAC_LOC_NAMES[defaultLoc] || 'Downtown Kitchen';

  const fireGrade = override?.fireSafety?.grade || 'Pending';
  const fireDisplay = override?.fireSafety?.gradeDisplay || 'Pending Verification';
  const fireSummary = override?.fireSafety?.summary || '';
  const fireStatus = override?.fireSafety?.status || 'unknown';

  const priorityItems: PriorityItem[] = DEMO_FACILITIES_ATTENTION.map(item => ({
    id: item.id,
    severity: item.severity,
    title: item.title,
    detail: item.detail,
    actionLabel: item.actionLabel,
    route: item.actionRoute,
  }));

  return (
    <div className="space-y-6" style={FONT}>
      {/* Steel-Slate Hero Banner */}
      <DashboardHero
        greeting={`${getGreeting()}, ${DEMO_ROLE_NAMES.facilities_manager.firstName}.`}
        orgName={companyName || DEMO_ORG.name}
        locationName={locationName}
      />

      {/* Fire Safety Hero — Jurisdiction-Native */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Flame size={24} style={{ color: fireStatus === 'passing' ? '#16a34a' : '#dc2626' }} />
            <div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => navigate('/fire-safety')} className="text-sm font-semibold text-gray-700 hover:opacity-70 transition-opacity">Fire Safety</button>
                <SectionTooltip content={useTooltip('fireSafety', userRole)} />
                <button
                  type="button"
                  onClick={() => navigate('/fire-safety')}
                  className={`text-sm font-bold px-2.5 py-0.5 rounded-full hover:opacity-80 transition-opacity ${
                    fireStatus === 'passing'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {fireGrade}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{fireDisplay}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/equipment')}
            className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <Wrench size={14} className="text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Equipment: {DEMO_EQUIPMENT_COUNT} units</span>
          </button>
        </div>

        {/* Fire AHJ */}
        <p className="text-xs text-gray-400 mb-3">{fireSummary}</p>

        {/* Status indicators */}
        {override && (
          <FireStatusBars
            permitStatus={override.fireSafety.permitStatus}
            hoodStatus={override.fireSafety.hoodStatus}
            extinguisherStatus={override.fireSafety.extinguisherStatus}
            ansulStatus={override.fireSafety.ansulStatus}
          />
        )}
      </Card>

      {/* Where Do I Start */}
      <WhereDoIStartSection items={priorityItems} staggerOffset={1} tooltipContent={useTooltip('urgentItems', userRole)} />

      {/* Schedule Calendar */}
      <FacilitiesCalendarCard navigate={navigate} userRole={userRole} />

      {/* Tabbed Detail Section: Equipment | Service Schedule | Vendors */}
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center">Equipment &amp; Services<SectionTooltip content={useTooltip('equipmentCard', userRole)} /></h4>
      <Card>
        <TabbedDetailSection
          tabs={[
            {
              id: 'equipment',
              label: 'Equipment',
              content: (
                <div className="space-y-1">
                  {DEMO_EQUIPMENT_ALERTS.map((eq, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => navigate('/equipment')}
                      className="w-full flex items-start gap-3 p-3 rounded-lg text-left hover:bg-gray-50 transition-colors"
                      style={eq.alert ? { borderLeft: `3px solid ${SEVERITY_BORDER[eq.severity || 'warning']}` } : undefined}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${eq.alert ? 'text-gray-900' : 'text-gray-500'}`}>
                          {eq.name}
                        </p>
                        {eq.alert ? (
                          <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>{eq.alert}</p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5">{eq.status}</p>
                        )}
                      </div>
                      {eq.alert ? (
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: '#b45309' }} />
                      ) : (
                        <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              ),
            },
            {
              id: 'schedule',
              label: 'Service Schedule',
              content: (
                <div className="space-y-1">
                  {DEMO_VENDOR_SCHEDULE.map((visit, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => navigate('/vendors')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-gray-500 w-10 shrink-0">{visit.day}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{visit.service}</p>
                        <p className="text-xs text-gray-500">{visit.vendor}</p>
                      </div>
                      <StatusBadge status={visit.status} />
                    </button>
                  ))}
                </div>
              ),
            },
            {
              id: 'vendors',
              label: 'Vendors',
              content: (
                <div className="space-y-1">
                  {DEMO_FACILITIES_DOCS.map((doc, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => navigate('/documents')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                      </div>
                      <StatusBadge status={doc.status} />
                      <span className="text-xs text-gray-400 shrink-0 ml-1">Exp: {doc.expires}</span>
                    </button>
                  ))}
                </div>
              ),
            },
          ]}
          defaultTab="equipment"
        />
      </Card>
    </div>
  );
}
