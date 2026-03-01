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
import { useTranslation } from '../../contexts/LanguageContext';
import { FONT, JIE_LOC_MAP, DEMO_ROLE_NAMES } from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { WhereDoIStartSection, type PriorityItem } from './shared/WhereDoIStartSection';
import { TabbedDetailSection } from './shared/TabbedDetailSection';
import { CalendarCard } from './shared/CalendarCard';
import { FACILITIES_EVENTS, FACILITIES_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';
import { SelfDiagCard } from './shared/SelfDiagCard';
import { ServiceCostSection } from './shared/ServiceCostSection';
import { ComplianceBanner } from './shared/ComplianceBanner';
import { NFPAReminder } from '../ui/NFPAReminder';
import { OnboardingChecklistCard } from './shared/OnboardingChecklistCard';

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
  { name: 'Walk-in Cooler #1', alert: null, status: 'All normal' }, // demo
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
  const { t: tBadge } = useTranslation();
  const config = {
    current: { bg: '#dcfce7', color: '#16a34a', labelKey: 'status.current' },
    confirmed: { bg: '#dcfce7', color: '#16a34a', labelKey: 'status.confirmed' },
    expiring: { bg: '#fef3c7', color: '#b45309', labelKey: 'status.expiring' },
    pending: { bg: '#fef3c7', color: '#b45309', labelKey: 'status.pending' },
    expired: { bg: '#fee2e2', color: '#dc2626', labelKey: 'status.expired' },
    overdue: { bg: '#fee2e2', color: '#dc2626', labelKey: 'status.overdue' },
  }[status];

  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {tBadge(config.labelKey)}
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
  downtown: 'Downtown Kitchen', // demo
  airport: 'Airport Cafe', // demo
  university: 'University Dining', // demo
};

export default function FacilitiesDashboardNew() {
  const navigate = useNavigate();
  const { getAccessibleLocations, userRole } = useRole();
  const { companyName, isDemoMode } = useDemo();
  const { t } = useTranslation();

  // Extract useTooltip calls to top of component (rules-of-hooks)
  const equipmentCardTooltip = useTooltip('equipmentCard', userRole);
  const urgentItemsTooltip = useTooltip('urgentItems', userRole);
  const facilitySafetyTooltip = useTooltip('facilitySafety', userRole);
  const scheduleCalendarTooltip = useTooltip('scheduleCalendar', userRole);

  const accessibleLocations = useMemo(() => getAccessibleLocations(), [getAccessibleLocations]);
  const defaultLoc = accessibleLocations[0]?.locationUrlId || 'downtown';

  const jieKey = JIE_LOC_MAP[defaultLoc] || `demo-loc-${defaultLoc}`;
  const override = DEMO_LOCATION_GRADE_OVERRIDES[jieKey];
  const locationName = FAC_LOC_NAMES[defaultLoc] || 'Downtown Kitchen'; // demo

  const fireGrade = override?.facilitySafety?.grade || 'Pending';
  const fireDisplay = override?.facilitySafety?.gradeDisplay || 'Pending Verification';
  const fireSummary = override?.facilitySafety?.summary || '';
  const fireStatus = override?.facilitySafety?.status || 'unknown';

  const priorityItems: PriorityItem[] = DEMO_FACILITIES_ATTENTION.map(item => ({
    id: item.id,
    severity: item.severity,
    title: item.title,
    detail: item.detail,
    actionLabel: item.actionLabel,
    route: item.actionRoute,
  }));

  // Equipment status counts for exception-based view
  const equipmentOverdue = DEMO_EQUIPMENT_ALERTS.filter(e => e.severity === 'critical').length;
  const equipmentWarning = DEMO_EQUIPMENT_ALERTS.filter(e => e.severity === 'warning').length;
  const equipmentCurrent = DEMO_EQUIPMENT_ALERTS.filter(e => !e.alert).length;
  const allCurrent = equipmentOverdue === 0 && equipmentWarning === 0;

  // Live mode empty state
  if (!isDemoMode) {
    return (
      <div className="space-y-6" style={FONT}>
        <DashboardHero
          orgName={companyName || DEMO_ORG.name}
          locationName={locationName}
        />
        <Card>
          <div className="text-center py-8">
            <p className="text-sm font-medium text-gray-500">No facilities data yet. Add equipment and vendors to track maintenance.</p>
            <button type="button" onClick={() => navigate('/equipment')} className="mt-3 text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#1e4d6b' }}>
              Add Equipment
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={FONT}>
      {/* Steel-Slate Hero Banner */}
      <DashboardHero
        orgName={companyName || DEMO_ORG.name}
        locationName={locationName}
      />

      {/* Onboarding checklist */}
      <OnboardingChecklistCard />

      {/* Compliance Score Banner — threshold-based alerts */}
      <ComplianceBanner />

      {/* ============================================================ */}
      {/* ABOVE THE FOLD — Exception-based equipment status             */}
      {/* ============================================================ */}

      {/* Equipment Issue Status — red/yellow/green counts */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Wrench size={16} className="text-gray-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Equipment Status
          </h3>
          <SectionTooltip content={equipmentCardTooltip} />
        </div>
        {allCurrent ? (
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CheckCircle2 size={18} className="text-green-500" />
            <p className="text-sm font-medium text-green-800">All equipment current — nothing overdue</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {equipmentOverdue > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-semibold text-red-700">{equipmentOverdue} Overdue</span>
              </div>
            )}
            {equipmentWarning > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm font-semibold text-amber-700">{equipmentWarning} Due Soon</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-semibold text-green-700">{equipmentCurrent} Current</span>
            </div>
          </div>
        )}
      </Card>

      {/* ONE Overdue Item — most urgent, only if exists */}
      {!allCurrent && (
        <Card>
          {(() => {
            const urgentItem = DEMO_FACILITIES_ATTENTION[0];
            if (!urgentItem) return null;
            return (
              <button
                type="button"
                onClick={() => navigate(urgentItem.actionRoute)}
                className="w-full flex items-center gap-3 text-left"
              >
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{urgentItem.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{urgentItem.detail}</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-md shrink-0" style={{ backgroundColor: '#d97706', color: '#fff' }}>
                  {urgentItem.actionLabel} &rarr;
                </span>
              </button>
            );
          })()}
        </Card>
      )}

      {/* ============================================================ */}
      {/* BELOW THE FOLD                                                */}
      {/* ============================================================ */}

      {/* NFPA Monthly Reminder */}
      <NFPAReminder />

      {/* Self-Diagnosis — Kitchen Problem */}
      <SelfDiagCard />

      {/* Service Cost & Risk Calculator */}
      <ServiceCostSection />

      {/* Where Do I Start */}
      <WhereDoIStartSection items={priorityItems} staggerOffset={1} tooltipContent={urgentItemsTooltip} />

      {/* Facility Safety Detail — moved below fold, no score shown */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Flame size={24} style={{ color: fireStatus === 'passing' ? '#16a34a' : '#dc2626' }} />
            <div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => navigate('/facility-safety')} className="text-sm font-semibold text-gray-700 hover:opacity-70 transition-opacity">Facility Safety Equipment</button>
                <SectionTooltip content={facilitySafetyTooltip} />
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
            permitStatus={override.facilitySafety.permitStatus}
            hoodStatus={override.facilitySafety.hoodStatus}
            extinguisherStatus={override.facilitySafety.extinguisherStatus}
            ansulStatus={override.facilitySafety.ansulStatus}
          />
        )}
      </Card>

      {/* Schedule Calendar */}
      <ErrorBoundary level="widget">
        <CalendarCard
          events={FACILITIES_EVENTS}
          typeColors={FACILITIES_CALENDAR.typeColors}
          typeLabels={FACILITIES_CALENDAR.typeLabels}
          navigate={navigate}
          tooltipContent={scheduleCalendarTooltip}
        />
      </ErrorBoundary>

      {/* Tabbed Detail Section: Equipment | Service Schedule | Vendors */}
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center">{t('cards.equipmentAndServices')}<SectionTooltip content={equipmentCardTooltip} /></h4>
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
