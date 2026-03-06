import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useTooltip } from '../../hooks/useTooltip';
import { SectionTooltip } from '../ui/SectionTooltip';
import { useDemo } from '../../contexts/DemoContext';
import { DEMO_LOCATION_GRADE_OVERRIDES } from '../../data/demoJurisdictions';
import { DEMO_ORG } from '../../data/demoData';
import { FireStatusBars } from '../shared/FireStatusBars';
import { useTranslation } from '../../contexts/LanguageContext';
import { FONT, NAVY, JIE_LOC_MAP, DEMO_ROLE_NAMES } from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { TabbedDetailSection } from './shared/TabbedDetailSection';
import { CalendarCard } from './shared/CalendarCard';
import { FACILITIES_EVENTS, FACILITIES_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';
import { SelfDiagCard } from './shared/SelfDiagCard';
import { ServiceCostSection } from './shared/ServiceCostSection';
import { HealthBanner, type HealthStatus } from './shared/HealthBanner';
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
  riskType: 'liability' | 'cost' | 'operational';
}

const DEMO_FACILITIES_ATTENTION: FacilitiesAttentionItem[] = [
  {
    id: 'fac-1',
    severity: 'warning',
    title: 'Fire suppression inspection expires in 12 days',
    detail: 'Vendor notified',
    actionLabel: 'Schedule Service',
    actionRoute: '/vendors',
    riskType: 'liability',
  },
  {
    id: 'fac-2',
    severity: 'warning',
    title: 'Walk-in Freezer compressor — service overdue',
    detail: 'Last serviced: 8 months ago',
    actionLabel: 'View Equipment',
    actionRoute: '/equipment',
    riskType: 'cost',
  },
  {
    id: 'fac-3',
    severity: 'critical',
    title: 'Fire extinguisher annual tag expired — Location 3',
    detail: 'AHJ requires current tags for occupancy',
    actionLabel: 'Schedule Inspection',
    actionRoute: '/equipment?category=fire_extinguisher',
    riskType: 'liability',
  },
  {
    id: 'fac-4',
    severity: 'warning',
    title: 'Exhaust fan bearing noise reported by kitchen staff',
    detail: 'Submitted via Self-Diagnosis 2 days ago',
    actionLabel: 'View Report',
    actionRoute: '/self-diagnosis',
    riskType: 'operational',
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

// --------------- Do This Next actions ---------------

interface DoThisNextAction {
  id: string;
  label: string;
  route: string;
}

const DEMO_DO_THIS_NEXT: DoThisNextAction[] = [
  { id: 'dtn-1', label: 'Schedule fire suppression re-inspection before expiry', route: '/vendors' },
  { id: 'dtn-2', label: 'Replace expired extinguisher tags at Location 3', route: '/equipment?category=fire_extinguisher' },
  { id: 'dtn-3', label: 'Follow up on exhaust fan noise report', route: '/self-diagnosis' },
];

// --------------- Risk type badge config ---------------

const RISK_BADGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  liability: { label: 'Liability', bg: '#fef2f2', text: '#dc2626' },
  cost: { label: 'Cost', bg: '#fffbeb', text: '#b45309' },
  operational: { label: 'Operational', bg: '#eff6ff', text: '#2563eb' },
};


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
  downtown: 'Location 1',
  airport: 'Location 2',
  university: 'Location 3',
};

export default function FacilitiesDashboardNew() {
  const navigate = useNavigate();
  const { getAccessibleLocations, userRole } = useRole();
  const { companyName, isDemoMode } = useDemo();
  const { t } = useTranslation();

  // Extract useTooltip calls to top of component (rules-of-hooks)
  const equipmentCardTooltip = useTooltip('equipmentCard', userRole);
  const scheduleCalendarTooltip = useTooltip('scheduleCalendar', userRole);

  const accessibleLocations = useMemo(() => getAccessibleLocations(), [getAccessibleLocations]);
  const defaultLoc = accessibleLocations[0]?.locationUrlId || 'downtown';

  const jieKey = JIE_LOC_MAP[defaultLoc] || `demo-loc-${defaultLoc}`;
  const override = DEMO_LOCATION_GRADE_OVERRIDES[jieKey];
  const locationName = FAC_LOC_NAMES[defaultLoc] || 'Location 1';

  const fireDisplay = override?.facilitySafety?.gradeDisplay || 'Pending Verification';
  const fireSummary = override?.facilitySafety?.summary || '';

  // Equipment status counts for exception-based view
  const equipmentOverdue = DEMO_EQUIPMENT_ALERTS.filter(e => e.severity === 'critical').length;
  const equipmentWarning = DEMO_EQUIPMENT_ALERTS.filter(e => e.severity === 'warning').length;
  const equipmentCurrent = DEMO_EQUIPMENT_ALERTS.filter(e => !e.alert).length;
  const allCurrent = equipmentOverdue === 0 && equipmentWarning === 0;

  // Derive health status from DEMO_FACILITIES_ATTENTION data
  const healthStatus: HealthStatus = useMemo(() => {
    const hasOverdue = DEMO_FACILITIES_ATTENTION.some(item => item.severity === 'critical');
    if (hasOverdue) return 'risk';
    const hasDueSoon = DEMO_FACILITIES_ATTENTION.some(item => item.severity === 'warning');
    if (hasDueSoon) return 'attention';
    return 'healthy';
  }, []);

  const healthMessage = useMemo(() => {
    if (healthStatus === 'risk') {
      const overdueCount = DEMO_FACILITIES_ATTENTION.filter(i => i.severity === 'critical').length;
      return `${overdueCount} overdue fire safety item${overdueCount > 1 ? 's' : ''} require immediate action`;
    }
    if (healthStatus === 'attention') {
      const warningCount = DEMO_FACILITIES_ATTENTION.filter(i => i.severity === 'warning').length;
      return `${warningCount} item${warningCount > 1 ? 's' : ''} due within 30 days — schedule service now`;
    }
    return 'All fire safety and equipment items are current';
  }, [healthStatus]);

  // Live mode empty state
  if (!isDemoMode) {
    return (
      <div className="space-y-6" style={FONT}>
        <DashboardHero
          orgName={companyName || 'Your Organization'}
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
      {/* ============================================================ */}
      {/* 1. DashboardHero                                              */}
      {/* ============================================================ */}
      <DashboardHero
        orgName={companyName || DEMO_ORG.name}
        locationName={locationName}
      />

      {/* ============================================================ */}
      {/* 2. OnboardingChecklistCard                                    */}
      {/* ============================================================ */}
      <OnboardingChecklistCard />

      {/* ============================================================ */}
      {/* 3. HealthBanner — Facility Health scope                       */}
      {/* ============================================================ */}
      <HealthBanner
        status={healthStatus}
        scope="Facility Health"
        message={healthMessage}
      />

      {/* ============================================================ */}
      {/* 4. Fire Safety Standing — NFPA 96 compliance via FireStatusBars */}
      {/* ============================================================ */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <Flame size={16} className="text-gray-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Fire Safety Standing
          </h3>
        </div>

        {/* AHJ name + grade display */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">{fireSummary}</p>
            <p className="text-xs text-gray-400 mt-0.5">{fireDisplay}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/facility-safety')}
            className="text-xs font-medium px-2.5 py-1 rounded-full hover:bg-gray-100 transition-colors"
            style={{ color: '#1e4d6b', border: '1px solid #D1D9E6' }}
          >
            View Details
          </button>
        </div>

        {/* FireStatusBars for permit/hood/extinguisher/ansul */}
        {override && (
          <FireStatusBars
            permitStatus={override.facilitySafety.permitStatus}
            hoodStatus={override.facilitySafety.hoodStatus}
            extinguisherStatus={override.facilitySafety.extinguisherStatus}
            ansulStatus={override.facilitySafety.ansulStatus}
            onCardClick={(key) => {
              const routes: Record<string, string> = {
                permit: '/equipment?category=permit',
                extinguisher: '/equipment?category=fire_extinguisher',
                hood: '/calendar?category=hood_cleaning',
                ansul: '/calendar?category=fire_suppression',
              };
              navigate(routes[key] || '/equipment');
            }}
          />
        )}
      </Card>

      {/* ============================================================ */}
      {/* 5. What Needs Attention — equipment + fire safety gaps         */}
      {/* ============================================================ */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-gray-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            What Needs Attention
          </h3>
        </div>
        <div className="space-y-2">
          {DEMO_FACILITIES_ATTENTION.map(item => {
            const badgeCfg = RISK_BADGE_CONFIG[item.riskType];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.actionRoute)}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-gray-50 transition-colors"
                style={{ borderLeft: `3px solid ${SEVERITY_BORDER[item.severity]}` }}
              >
                <AlertTriangle
                  size={16}
                  className="shrink-0"
                  style={{ color: item.severity === 'critical' ? '#dc2626' : '#d97706' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: badgeCfg.bg, color: badgeCfg.text }}
                    >
                      {badgeCfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md shrink-0 text-white" style={{ backgroundColor: item.severity === 'critical' ? '#dc2626' : '#d97706' }}>
                  {item.actionLabel}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ============================================================ */}
      {/* 6. Do This Next — max 3 prioritized actions                   */}
      {/* ============================================================ */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight size={16} className="text-gray-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Do This Next
          </h3>
        </div>
        <div className="space-y-2">
          {DEMO_DO_THIS_NEXT.slice(0, 3).map((action, i) => (
            <button
              key={action.id}
              type="button"
              onClick={() => navigate(action.route)}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-gray-50 transition-colors"
              style={{ border: '1px solid #E8EDF5' }}
            >
              {/* Numbered circle with NAVY background */}
              <span
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: NAVY }}
              >
                {i + 1}
              </span>
              <p className="text-sm font-medium text-gray-800 flex-1">{action.label}</p>
              <ArrowRight size={16} style={{ color: NAVY }} className="shrink-0" />
            </button>
          ))}
        </div>
      </Card>

      {/* ============================================================ */}
      {/* 7. Equipment Summary — current/due soon/overdue counts        */}
      {/* ============================================================ */}
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

      {/* ============================================================ */}
      {/* BELOW THE FOLD                                                */}
      {/* ============================================================ */}

      {/* NFPA Monthly Reminder */}
      <NFPAReminder />

      {/* Self-Diagnosis — Kitchen Problem */}
      <SelfDiagCard />

      {/* Service Cost & Risk Calculator */}
      <ServiceCostSection />

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
