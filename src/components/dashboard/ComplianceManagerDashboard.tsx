import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame, CalendarDays, ClipboardCheck,
  ChevronDown, ChevronUp, ExternalLink, Phone,
  AlertCircle, BookOpen,
} from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useRole } from '../../contexts/RoleContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { useTooltip } from '../../hooks/useTooltip';
import { SectionTooltip } from '../ui/SectionTooltip';
import { DEMO_ORG, LOCATIONS_WITH_SCORES } from '../../data/demoData';
import { useAllLocationJurisdictions } from '../../hooks/useJurisdiction';
import { useAllComplianceScores } from '../../hooks/useComplianceScore';
import { DEMO_LOCATION_GRADE_OVERRIDES } from '../../data/demoJurisdictions';
import { AlertBanner, type AlertBannerItem } from '../shared/AlertBanner';
import { FireStatusBars } from '../shared/FireStatusBars';
import { FoodSafetyWidget } from '../shared/FoodSafetyWidget';

// Shared dashboard infrastructure
import {
  GOLD, NAVY, PAGE_BG, BODY_TEXT, FONT,
  JIE_LOC_MAP, KEYFRAMES,
  stagger, DEMO_ROLE_NAMES,
} from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { HeroJurisdictionSummary } from './shared/HeroJurisdictionSummary';
import { WhereDoIStartSection, type PriorityItem } from './shared/WhereDoIStartSection';
import { TabbedDetailSection, type TabDef } from './shared/TabbedDetailSection';
import { CalendarCard } from './shared/CalendarCard';
import { COMPLIANCE_EVENTS, COMPLIANCE_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';

// ================================================================
// HELPERS (component-specific)
// ================================================================

function gradingTypeLabel(gradingType: string | null): string {
  if (!gradingType) return '';
  switch (gradingType) {
    case 'pass_reinspect': return 'CalCode Pass/Reinspect';
    case 'three_tier_rating': return 'Three-Tier Rating';
    case 'violation_based': return 'CalCode Violation-Based';
    case 'letter_grade': return 'Letter Grade';
    default: return gradingType;
  }
}

// ================================================================
// ALERT DATA
// ================================================================

const COMPLIANCE_ALERTS: AlertBannerItem[] = [
  {
    id: 'ca1',
    severity: 'critical',
    message: 'University Dining \u2014 3 open major violations require reinspection within 30 days',
    location: 'University Dining',
    pillar: 'Food Safety',
    actionLabel: 'View Details',
    route: '/dashboard?location=university',
  },
  {
    id: 'ca2',
    severity: 'warning',
    message: 'Airport Cafe approaching satisfactory threshold \u2014 9 violation points (limit: 13)',
    location: 'Airport Cafe',
    pillar: 'Food Safety',
    actionLabel: 'Review',
    route: '/dashboard?location=airport',
  },
  {
    id: 'ca3',
    severity: 'info',
    message: 'CalCode amendment AB-1228 effective March 1 \u2014 updated allergen labeling requirements',
    pillar: 'Regulatory',
    actionLabel: 'Read More',
    route: '/regulatory-alerts',
  },
];

// ================================================================
// WHERE DO I START — PRIORITY ITEMS
// ================================================================

const COMPLIANCE_PRIORITIES: PriorityItem[] = [
  {
    id: 'cp1',
    severity: 'critical',
    title: 'Prepare for reinspection \u2014 Airport',
    detail: '3 major violations must be corrected before Feb 28 reinspection',
    actionLabel: 'View Violations',
    route: '/dashboard?location=airport',
  },
  {
    id: 'cp2',
    severity: 'warning',
    title: 'Schedule self-inspection \u2014 Downtown',
    detail: 'Monthly self-inspection due Mar 10 \u2014 last score 94%',
    actionLabel: 'Start Inspection',
    route: '/self-inspection',
  },
  {
    id: 'cp3',
    severity: 'info',
    title: 'Resolve CFM assignment \u2014 University',
    detail: 'Certified Food Manager assignment lapsed \u2014 renewal required',
    actionLabel: 'Review',
    route: '/dashboard?location=university',
  },
];

// ================================================================
// DEMO DATA
// ================================================================

const DEMO_INSPECTIONS = [
  { location: 'Downtown Kitchen', type: 'Food Safety \u2014 Annual', agency: 'Fresno County DPH', date: 'Mar 15, 2026', status: 'scheduled' as const },
  { location: 'Airport Cafe', type: 'Fire Suppression Inspection', agency: 'Merced County Fire', date: 'Feb 28, 2026', status: 'scheduled' as const },
  { location: 'University Dining', type: 'Food Safety \u2014 Reinspection', agency: 'Stanislaus County DEH', date: 'Feb 22, 2026', status: 'urgent' as const },
];

const DEMO_SELF_INSPECTIONS = [
  { location: 'Downtown Kitchen', lastCompleted: 'Feb 10, 2026', score: '94%', nextDue: 'Mar 10, 2026', status: 'current' as const },
  { location: 'Airport Cafe', lastCompleted: 'Jan 28, 2026', score: '87%', nextDue: 'Feb 28, 2026', status: 'due_soon' as const },
  { location: 'University Dining', lastCompleted: 'Dec 15, 2025', score: '72%', nextDue: 'Jan 15, 2026', status: 'overdue' as const },
];

const DEMO_REGULATORY = [
  { date: 'Feb 12, 2026', title: 'CalCode Amendment AB-1228 \u2014 Allergen Labeling', summary: 'New allergen labeling requirements for commercial kitchens effective March 1.', impact: 'high' as const },
  { date: 'Feb 5, 2026', title: 'NFPA 96 (2024) Operational Permit Updates', summary: 'Revised operational fire permit requirements for commercial kitchen hoods.', impact: 'medium' as const },
  { date: 'Jan 20, 2026', title: 'HACCP Plan Verification Schedule Change', summary: 'Annual HACCP plan verification now required within 60 days of license renewal.', impact: 'low' as const },
];

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function ComplianceManagerDashboard() {
  const navigate = useNavigate();
  const { companyName, isDemoMode } = useDemo();
  const { userRole } = useRole();
  const { t } = useTranslation();

  // JIE: Dual-authority jurisdiction data per location
  const jieLocIds = useMemo(
    () => LOCATIONS_WITH_SCORES.map(l => JIE_LOC_MAP[l.id] || l.id),
    [],
  );
  const jurisdictions = useAllLocationJurisdictions(jieLocIds, isDemoMode);
  const jieScores = useAllComplianceScores(jurisdictions, isDemoMode);

  // Dismissed alerts (session-only), capped at 2 highest severity
  const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const allVisibleAlerts = COMPLIANCE_ALERTS
    .filter(a => !dismissedAlerts.has(a.id))
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  const hasMoreAlerts = allVisibleAlerts.length > 2;
  const visibleAlerts = allVisibleAlerts.slice(0, 2);
  const handleDismissAlert = (id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id));
  };

  // Expanded location cards
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const toggleExpanded = (locId: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev);
      if (next.has(locId)) next.delete(locId);
      else next.add(locId);
      return next;
    });
  };

  const locs = LOCATIONS_WITH_SCORES;

  // ================================================================
  // TABBED BOTTOM SECTION — tab definitions
  // ================================================================

  const bottomTabs: TabDef[] = useMemo(() => [
    {
      id: 'inspections',
      label: t('cards.allViolations'),
      content: (
        <div
          className="bg-white rounded-xl p-5"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={16} style={{ color: NAVY }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('cards.upcomingInspections')}</h3>
          </div>
          <div className="space-y-2">
            {DEMO_INSPECTIONS.map((insp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => navigate('/calendar')}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:opacity-90"
                style={{
                  backgroundColor: insp.status === 'urgent' ? '#fef2f2' : '#fafafa',
                  border: `1px solid ${insp.status === 'urgent' ? '#fecaca' : '#f0f0f0'}`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>{insp.location}</p>
                  <p className="text-[11px] text-gray-500">{insp.type}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{insp.agency}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-medium" style={{ color: BODY_TEXT }}>{insp.date}</p>
                  {insp.status === 'urgent' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded mt-1"
                      style={{ backgroundColor: '#dc2626', color: '#fff' }}>
                      <AlertCircle size={10} /> {t('status.urgent')}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block"
                      style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                      {t('status.scheduled')}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'documents',
      label: t('cards.documents'),
      content: (
        <div
          className="bg-white rounded-xl p-5"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} style={{ color: NAVY }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('cards.documentCompliance')}</h3>
          </div>
          <div className="space-y-2">
            {[
              { name: 'HACCP Plan — Downtown Kitchen', status: 'current', expires: 'Sep 2026' },
              { name: 'Food Handler Permits (12 staff)', status: 'current', expires: 'Various' },
              { name: 'Fire Suppression Cert — Airport', status: 'expiring', expires: 'Mar 15, 2026' },
              { name: 'Health Permit — University Dining', status: 'current', expires: 'Dec 2026' },
            ].map((doc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => navigate('/documents')}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:opacity-90"
                style={{
                  backgroundColor: doc.status === 'expiring' ? '#fffbeb' : '#fafafa',
                  border: `1px solid ${doc.status === 'expiring' ? '#fde68a' : '#f0f0f0'}`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>{doc.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Expires: {doc.expires}</p>
                </div>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    backgroundColor: doc.status === 'current' ? '#dcfce7' : '#fef3c7',
                    color: doc.status === 'current' ? '#16a34a' : '#d97706',
                  }}
                >
                  {doc.status === 'current' ? t('status.current') : t('status.expiringSoon')}
                </span>
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'regulatory',
      label: t('cards.regulatory'),
      content: (
        <div
          className="bg-white rounded-xl p-5"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={16} style={{ color: NAVY }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('cards.regulatoryUpdates')}</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/regulatory-alerts')}
              className="text-xs font-medium hover:underline"
              style={{ color: NAVY }}
            >
              {t('cards.viewAll')} &rarr;
            </button>
          </div>
          <div className="space-y-2">
            {DEMO_REGULATORY.map((reg, idx) => {
              const impactColor = reg.impact === 'high' ? '#dc2626'
                : reg.impact === 'medium' ? '#d97706'
                : '#6b7280';
              const impactBg = reg.impact === 'high' ? '#fef2f2'
                : reg.impact === 'medium' ? '#fef3c7'
                : '#f3f4f6';
              const impactLabel = reg.impact === 'high' ? t('status.highImpact')
                : reg.impact === 'medium' ? t('status.mediumImpact')
                : t('status.lowImpact');

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => navigate('/regulatory-alerts')}
                  className="w-full p-3 rounded-lg text-left transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#fafafa', border: '1px solid #f0f0f0' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>{reg.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{reg.summary}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{reg.date}</p>
                    </div>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: impactBg, color: impactColor }}
                    >
                      {impactLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      id: 'self-inspection',
      label: t('cards.selfInspection'),
      content: (
        <div
          className="bg-white rounded-xl p-5"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck size={16} style={{ color: NAVY }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('cards.selfInspectionStatus')}</h3>
          </div>
          <div className="space-y-2">
            {DEMO_SELF_INSPECTIONS.map((si, idx) => {
              const selfStatusColor = si.status === 'current' ? '#16a34a'
                : si.status === 'due_soon' ? '#d97706'
                : '#dc2626';
              const selfStatusLabel = si.status === 'current' ? t('status.current')
                : si.status === 'due_soon' ? t('status.dueSoon')
                : t('status.overdue');
              const selfStatusBg = si.status === 'current' ? '#dcfce7'
                : si.status === 'due_soon' ? '#fef3c7'
                : '#fef2f2';

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => navigate('/self-inspection')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: si.status === 'overdue' ? '#fef2f2' : '#fafafa',
                    border: `1px solid ${si.status === 'overdue' ? '#fecaca' : '#f0f0f0'}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>{si.location}</p>
                    <p className="text-[11px] text-gray-500">
                      Last: {si.lastCompleted} &middot; Score: {si.score}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Next due: {si.nextDue}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: selfStatusBg, color: selfStatusColor }}
                    >
                      {selfStatusLabel}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md"
                      style={{ backgroundColor: NAVY, color: '#fff' }}
                    >
                      {t('actions.startInspection')} &rarr;
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ),
    },
  ], [navigate, t]);

  // Live mode empty state
  if (!isDemoMode) {
    return (
      <div style={{ ...FONT, backgroundColor: PAGE_BG, minHeight: '100vh', paddingBottom: 80 }}>
        <div style={{ padding: '20px 24px 0' }}>
          <DashboardHero
            firstName={DEMO_ROLE_NAMES.compliance_manager.firstName}
            orgName={companyName || DEMO_ORG.name}
          />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
          <div className="bg-white rounded-xl p-8 text-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <p className="text-sm font-medium text-gray-500">No compliance data yet. Add a location to begin compliance tracking.</p>
            <button type="button" onClick={() => navigate('/locations')} className="mt-3 text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#1e4d6b' }}>
              Add Location
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...FONT, backgroundColor: PAGE_BG, minHeight: '100vh', paddingBottom: 80 }}>
      <style>{KEYFRAMES}</style>

      {/* ============================================================ */}
      {/* HERO BANNER — DashboardHero shared component                 */}
      {/* ============================================================ */}
      <div style={{ padding: '20px 24px 0' }}>
        <DashboardHero
          firstName={DEMO_ROLE_NAMES.compliance_manager.firstName}
          orgName={companyName || DEMO_ORG.name}
          subtitle={`${DEMO_ORG.locationCount} locations \u00b7 California`}
          onSubtitleClick={() => navigate('/org-hierarchy')}
        >
          <HeroJurisdictionSummary jieScores={jieScores} jurisdictions={jurisdictions} navigate={navigate} userRole={userRole} />
        </DashboardHero>
      </div>

      {/* ============================================================ */}
      {/* ABOVE THE FOLD — Score is this role's primary tool            */}
      {/* ============================================================ */}

      {/* Portfolio Score — large, prominent */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4">
        <div
          className="rounded-xl p-6 text-center"
          style={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Portfolio Compliance Score</p>
          <p className="text-5xl font-bold" style={{ color: '#d97706' }}>72<span className="text-2xl text-gray-400">%</span></p>
          <p className="text-xs text-gray-500 mt-1">Across 3 locations · 1 critical, 1 at risk, 1 compliant</p>
        </div>
      </div>

      {/* 4 Metric Tiles — Score · Open CAs · Next Deadline · Docs Current */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => navigate('/compliance')}
            className="rounded-xl p-4 text-left transition-all hover:shadow-md"
            style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Score</p>
            <p className="text-xl font-bold" style={{ color: '#92400e' }}>72%</p>
            <p className="text-[11px] text-amber-700">At risk</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/corrective-actions')}
            className="rounded-xl p-4 text-left transition-all hover:shadow-md"
            style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Open CAs</p>
            <p className="text-xl font-bold text-red-700">4</p>
            <p className="text-[11px] text-red-600">1 critical</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="rounded-xl p-4 text-left transition-all hover:shadow-md"
            style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Next Deadline</p>
            <p className="text-lg font-bold" style={{ color: '#92400e' }}>Feb 22</p>
            <p className="text-[11px] text-amber-700">Reinspection</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="rounded-xl p-4 text-left transition-all hover:shadow-md"
            style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Docs Current</p>
            <p className="text-xl font-bold text-green-700">11/12</p>
            <p className="text-[11px] text-green-600">1 expiring</p>
          </button>
        </div>
      </div>

      {/* ONE most urgent corrective action */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard?location=university')}
          className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:shadow-md"
          style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
        >
          <AlertCircle size={20} className="text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-900">University Dining — 3 open major violations</p>
            <p className="text-xs text-red-700 mt-0.5">Reinspection due Feb 22 · Stanislaus County DEH</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-md text-white shrink-0" style={{ backgroundColor: '#dc2626' }}>
            View All &rarr;
          </span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* BELOW THE FOLD                                                */}
      {/* ============================================================ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 space-y-6">

        {/* Alert Banners */}
        <div style={stagger(2)}>
          {visibleAlerts.length > 0 && (
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 flex items-center">{t('cards.alerts')}<SectionTooltip content={useTooltip('alertBanner', userRole)} /></h4>
          )}
          <AlertBanner alerts={visibleAlerts} onDismiss={handleDismissAlert} navigate={navigate} />
          {hasMoreAlerts && (
            <button
              type="button"
              onClick={() => navigate('/regulatory-alerts')}
              className="mt-2 text-xs font-medium hover:underline"
              style={{ color: NAVY }}
            >
              {t('cards.viewAll')} alerts &rarr;
            </button>
          )}
        </div>

        {/* Where Do I Start? */}
        <WhereDoIStartSection items={COMPLIANCE_PRIORITIES} staggerOffset={3} tooltipContent={useTooltip('urgentItems', userRole)} />

        {/* ============================================================ */}
        {/* 1. LOCATION COMPLIANCE OVERVIEW                              */}
        {/* ============================================================ */}
        <div style={stagger(4)}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center">{t('cards.locationComplianceOverview')}<SectionTooltip content={useTooltip('locationCards', userRole)} /></h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {locs.map(loc => {
              const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
              const score = jieScores[jieLocId];
              const jur = jurisdictions[jieLocId];
              const override = DEMO_LOCATION_GRADE_OVERRIDES[jieLocId];
              const isExpanded = expandedLocations.has(loc.id);

              const foodStatus = score?.foodSafety?.status ?? 'unknown';
              const foodGradeDisplay = score?.foodSafety?.gradeDisplay ?? 'Not assessed';
              const foodSummary = (score?.foodSafety?.details as Record<string, any>)?.summary ?? undefined;
              const foodGradingType = jur?.foodSafety?.grading_type ?? null;

              const fireStatus = score?.facilitySafety?.status ?? 'unknown';
              const fireAHJName = jur?.facilitySafety?.agency_name ?? 'Fire AHJ';
              const county = jur?.county ?? '';

              return (
                <div
                  key={loc.id}
                  className="bg-white rounded-xl p-5"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                >
                  {/* Name + County badge */}
                  <div className="flex items-center justify-between mb-4">
                    <button type="button" onClick={() => navigate(`/locations/${loc.id}`)} className="text-sm font-semibold text-left hover:opacity-70 transition-opacity" style={{ color: BODY_TEXT }}>{loc.name}</button>
                    {county && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                        {county}
                      </span>
                    )}
                  </div>

                  {/* Food Safety Widget */}
                  <button type="button" onClick={() => navigate('/compliance')} className="w-full text-left transition-opacity hover:opacity-90">
                    <FoodSafetyWidget
                      gradeDisplay={foodGradeDisplay}
                      summary={foodSummary}
                      status={foodStatus}
                      gradingTypeLabel={gradingTypeLabel(foodGradingType) || undefined}
                    />
                  </button>

                  {/* Facility Safety row */}
                  <button
                    type="button"
                    onClick={() => navigate('/facility-safety')}
                    className="w-full mt-3 p-3 rounded-lg text-left transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#f8f8f8' }}
                  >
                    <div className="flex items-center gap-2">
                      <Flame size={14} style={{ color: '#ea580c', flexShrink: 0 }} />
                      <span className="text-[13px] font-semibold flex-1" style={{ color: BODY_TEXT }}>{fireAHJName}</span>
                      {fireStatus === 'passing' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>{t('status.pass')}</span>
                      )}
                      {fireStatus === 'failing' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>{t('status.fail')}</span>
                      )}
                      {fireStatus === 'at_risk' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>{t('status.atRisk')}</span>
                      )}
                      {fireStatus === 'unknown' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f1f5f9', color: '#6B7F96' }}>{t('status.unknown')}</span>
                      )}
                    </div>
                    {/* FireStatusBars compact */}
                    {override && (
                      <div className="mt-2">
                        <FireStatusBars
                          permitStatus={override.facilitySafety.permitStatus}
                          hoodStatus={override.facilitySafety.hoodStatus}
                          extinguisherStatus={override.facilitySafety.extinguisherStatus}
                          ansulStatus={override.facilitySafety.ansulStatus}
                          compact
                        />
                      </div>
                    )}
                  </button>

                  {/* Expandable Details toggle */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(loc.id)}
                    className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    style={{ color: NAVY }}
                  >
                    {t('actions.viewDetails')} {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {/* Expanded section: agency contact info */}
                  {isExpanded && jur && (
                    <div
                      className="mt-2 p-3 rounded-lg space-y-3"
                      style={{ backgroundColor: '#fafbfc', border: '1px solid #f0f0f0', animation: 'slideDown 0.2s ease-out' }}
                    >
                      {/* Food Safety Agency */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{t('cards.foodSafetyAuthority')}</p>
                        <p className="text-[12px] font-medium" style={{ color: BODY_TEXT }}>{jur.foodSafety.agency_name}</p>
                        {jur.foodSafety.agency_phone && (
                          <a
                            href={`tel:${jur.foodSafety.agency_phone}`}
                            className="flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                            style={{ color: NAVY }}
                          >
                            <Phone size={10} /> {jur.foodSafety.agency_phone}
                          </a>
                        )}
                        {jur.foodSafety.agency_website && (
                          <a
                            href={jur.foodSafety.agency_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                            style={{ color: NAVY }}
                          >
                            <ExternalLink size={10} /> {t('cards.agencyWebsite')}
                          </a>
                        )}
                      </div>

                      {/* Facility Safety AHJ */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{t('cards.facilitySafetyAHJ')}</p>
                        <p className="text-[12px] font-medium" style={{ color: BODY_TEXT }}>{jur.facilitySafety.agency_name}</p>
                        {jur.facilitySafety.agency_phone && (
                          <a
                            href={`tel:${jur.facilitySafety.agency_phone}`}
                            className="flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                            style={{ color: NAVY }}
                          >
                            <Phone size={10} /> {jur.facilitySafety.agency_phone}
                          </a>
                        )}
                        {jur.facilitySafety.agency_website && (
                          <a
                            href={jur.facilitySafety.agency_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                            style={{ color: NAVY }}
                          >
                            <ExternalLink size={10} /> {t('cards.ahjWebsite')}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Calendar */}
        <div style={stagger(5)}>
          <ErrorBoundary level="widget">
            <CalendarCard
              events={COMPLIANCE_EVENTS}
              typeColors={COMPLIANCE_CALENDAR.typeColors}
              typeLabels={COMPLIANCE_CALENDAR.typeLabels}
              navigate={navigate}
              tooltipContent={useTooltip('scheduleCalendar', userRole)}
            />
          </ErrorBoundary>
        </div>

        {/* ============================================================ */}
        {/* 2. TABBED DETAIL SECTION                                     */}
        {/* ============================================================ */}
        <div style={stagger(5)}>
          <TabbedDetailSection tabs={bottomTabs} defaultTab="inspections" />
        </div>

        {/* ============================================================ */}
        {/* FOOTER                                                       */}
        {/* ============================================================ */}
        <div className="flex items-center justify-center py-6 mt-4">
          <span className="text-xs text-gray-400">{t('topBar.complianceSimplified')} </span>
          <span className="text-xs font-bold ml-1">
            <span style={{ color: GOLD }}>E</span>
            <span style={{ color: NAVY }}>vid</span>
            <span style={{ color: GOLD }}>LY</span>
          </span>
        </div>

      </div>
    </div>
  );
}
