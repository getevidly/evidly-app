import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Wrench,
  AlertTriangle,
  CheckCircle2,
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
import { CalendarCard } from './shared/CalendarCard';
import { FACILITIES_EVENTS, FACILITIES_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';

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
      <ErrorBoundary level="widget">
        <CalendarCard
          events={FACILITIES_EVENTS}
          typeColors={FACILITIES_CALENDAR.typeColors}
          typeLabels={FACILITIES_CALENDAR.typeLabels}
          navigate={navigate}
          tooltipContent={useTooltip('scheduleCalendar', userRole)}
        />
      </ErrorBoundary>

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
