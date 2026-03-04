import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame, CalendarDays, ClipboardCheck, UtensilsCrossed,
  ChevronDown, ChevronUp, ExternalLink, Phone,
  AlertCircle, AlertTriangle, BookOpen, ArrowRight,
  FileWarning, ShieldAlert, Info,
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
import { FireStatusBars } from '../shared/FireStatusBars';
import { FoodSafetyWidget } from '../shared/FoodSafetyWidget';

// Shared dashboard infrastructure
import {
  GOLD, NAVY, PAGE_BG, BODY_TEXT, MUTED, FONT,
  JIE_LOC_MAP, KEYFRAMES,
  stagger, DEMO_ROLE_NAMES, statusColor,
} from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { HeroJurisdictionSummary } from './shared/HeroJurisdictionSummary';
import { TabbedDetailSection, type TabDef } from './shared/TabbedDetailSection';
import { CalendarCard } from './shared/CalendarCard';
import { COMPLIANCE_EVENTS, COMPLIANCE_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';
import { OnboardingChecklistCard } from './shared/OnboardingChecklistCard';
import { HealthBanner, type HealthStatus } from './shared/HealthBanner';

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

const COMPLIANCE_ALERTS: {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  location?: string;
  pillar?: string;
  actionLabel: string;
  route: string;
  riskType: 'liability' | 'revenue' | 'cost' | 'operational';
}[] = [
  {
    id: 'ca1',
    severity: 'critical',
    message: 'Location 3 \u2014 3 open major violations require reinspection within 30 days',
    location: 'Location 3',
    pillar: 'Food Safety',
    actionLabel: 'View Details',
    route: '/dashboard?location=university',
    riskType: 'liability',
  },
  {
    id: 'ca2',
    severity: 'warning',
    message: 'Fire Suppression Cert expiring Mar 15 \u2014 Location 2',
    location: 'Location 2',
    pillar: 'Facility Safety',
    actionLabel: 'Review',
    route: '/documents',
    riskType: 'cost',
  },
  {
    id: 'ca3',
    severity: 'warning',
    message: 'Location 2 approaching satisfactory threshold \u2014 9 violation points (limit: 13)',
    location: 'Location 2',
    pillar: 'Food Safety',
    actionLabel: 'Review',
    route: '/dashboard?location=airport',
    riskType: 'revenue',
  },
  {
    id: 'ca4',
    severity: 'info',
    message: 'CalCode amendment AB-1228 effective March 1 \u2014 updated allergen labeling requirements',
    pillar: 'Regulatory',
    actionLabel: 'Read More',
    route: '/regulatory-alerts',
    riskType: 'operational',
  },
];

// ================================================================
// WHERE DO I START — PRIORITY ITEMS
// ================================================================

const COMPLIANCE_PRIORITIES = [
  {
    id: 'cp1',
    title: 'Prepare for reinspection \u2014 Location 3',
    detail: '3 major violations must be corrected before Feb 28 reinspection',
    route: '/dashboard?location=university',
  },
  {
    id: 'cp2',
    title: 'Schedule self-inspection \u2014 Location 1',
    detail: 'Monthly self-inspection due Mar 10 \u2014 last score 94%',
    route: '/self-inspection',
  },
  {
    id: 'cp3',
    title: 'Resolve CFM assignment \u2014 Location 3',
    detail: 'Certified Food Manager assignment lapsed \u2014 renewal required',
    route: '/dashboard?location=university',
  },
];

// ================================================================
// DEMO DATA
// ================================================================

const DEMO_INSPECTIONS = [
  { location: 'Location 1', type: 'Food Safety \u2014 Annual', agency: 'Fresno County DPH', date: 'Mar 15, 2026', status: 'scheduled' as const },
  { location: 'Location 2', type: 'Fire Suppression Inspection', agency: 'Merced County Fire', date: 'Feb 28, 2026', status: 'scheduled' as const },
  { location: 'Location 3', type: 'Food Safety \u2014 Reinspection', agency: 'Stanislaus County DEH', date: 'Feb 22, 2026', status: 'urgent' as const },
];

const DEMO_SELF_INSPECTIONS = [
  { location: 'Location 1', lastCompleted: 'Feb 10, 2026', score: '94%', nextDue: 'Mar 10, 2026', status: 'current' as const },
  { location: 'Location 2', lastCompleted: 'Jan 28, 2026', score: '87%', nextDue: 'Feb 28, 2026', status: 'due_soon' as const },
  { location: 'Location 3', lastCompleted: 'Dec 15, 2025', score: '72%', nextDue: 'Jan 15, 2026', status: 'overdue' as const },
];

const DEMO_REGULATORY = [
  { date: 'Feb 12, 2026', title: 'CalCode Amendment AB-1228 \u2014 Allergen Labeling', summary: 'New allergen labeling requirements for commercial kitchens effective March 1.', impact: 'high' as const },
  { date: 'Feb 5, 2026', title: 'NFPA 96 (2024) Operational Permit Updates', summary: 'Revised operational fire permit requirements for commercial kitchen hoods.', impact: 'medium' as const },
  { date: 'Jan 20, 2026', title: 'HACCP Plan Verification Schedule Change', summary: 'Annual HACCP plan verification now required within 60 days of license renewal.', impact: 'low' as const },
];

// ================================================================
// RISK TYPE CONFIG
// ================================================================

const RISK_TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  liability: { label: 'Liability', bg: '#fef2f2', color: '#991b1b' },
  revenue:   { label: 'Revenue',   bg: '#fffbeb', color: '#92400e' },
  cost:      { label: 'Cost',      bg: '#fff7ed', color: '#9a3412' },
  operational: { label: 'Operational', bg: '#eff6ff', color: '#1e40af' },
};

const SEVERITY_BADGE_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: '#dc2626', color: '#fff', label: 'Critical' },
  warning:  { bg: '#d97706', color: '#fff', label: 'Warning' },
  info:     { bg: '#2563eb', color: '#fff', label: 'Info' },
};

const SEVERITY_ICON_MAP: Record<string, typeof AlertCircle> = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
};

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function ComplianceManagerDashboard() {
  const navigate = useNavigate();
  const { companyName, isDemoMode } = useDemo();
  const { userRole } = useRole();
  const { t } = useTranslation();

  // Pre-extract tooltip strings (hooks cannot be called inside JSX)
  const locationCardsTooltip = useTooltip('locationCards', userRole);
  const scheduleCalendarTooltip = useTooltip('scheduleCalendar', userRole);

  // JIE: Dual-authority jurisdiction data per location
  const jieLocIds = useMemo(
    () => LOCATIONS_WITH_SCORES.map(l => JIE_LOC_MAP[l.id] || l.id),
    [],
  );
  const jurisdictions = useAllLocationJurisdictions(jieLocIds, isDemoMode);
  const jieScores = useAllComplianceScores(jurisdictions, isDemoMode);

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
  // DERIVE HEALTH STATUS FROM jieScores
  // ================================================================
  const healthStatus: HealthStatus = useMemo(() => {
    const scores = Object.values(jieScores);
    if (scores.length === 0) return 'healthy';
    const hasFailing = scores.some(
      s => s.foodSafety?.status === 'failing' || s.facilitySafety?.status === 'failing',
    );
    if (hasFailing) return 'risk';
    const hasAtRisk = scores.some(
      s => s.foodSafety?.status === 'at_risk' || s.facilitySafety?.status === 'at_risk',
    );
    if (hasAtRisk) return 'attention';
    return 'healthy';
  }, [jieScores]);

  const healthMessage = useMemo(() => {
    if (healthStatus === 'risk') return '1 location has failing status \u2014 immediate attention required';
    if (healthStatus === 'attention') return '1 location approaching threshold \u2014 review recommended';
    return 'All locations in good standing across both pillars';
  }, [healthStatus]);

  // ================================================================
  // TABBED BOTTOM SECTION -- tab definitions
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
              { name: 'HACCP Plan \u2014 Location 1', status: 'current', expires: 'Sep 2026' },
              { name: 'Food Handler Permits (12 staff)', status: 'current', expires: 'Various' },
              { name: 'Fire Suppression Cert \u2014 Location 2', status: 'expiring', expires: 'Mar 15, 2026' },
              { name: 'Health Permit \u2014 Location 3', status: 'current', expires: 'Dec 2026' },
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
      {/* 1. HERO BANNER                                               */}
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
      {/* 2. ONBOARDING CHECKLIST                                      */}
      {/* ============================================================ */}
      <div style={{ padding: '0 24px' }}>
        <div className="mt-4">
          <OnboardingChecklistCard />
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. HEALTH BANNER                                             */}
      {/* ============================================================ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4" style={stagger(1)}>
        <HealthBanner
          status={healthStatus}
          scope="Compliance Health"
          message={healthMessage}
        />
      </div>

      {/* ============================================================ */}
      {/* 4. STANDING BY JURISDICTION                                   */}
      {/* ============================================================ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6" style={stagger(2)}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: MUTED }}>
          Standing by Jurisdiction
        </h3>
        <div className="space-y-4">
          {locs.map(loc => {
            const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
            const score = jieScores[jieLocId];
            const jur = jurisdictions[jieLocId];
            const override = DEMO_LOCATION_GRADE_OVERRIDES[jieLocId];

            const foodStatus = score?.foodSafety?.status ?? 'unknown';
            const foodGradeDisplay = score?.foodSafety?.gradeDisplay ?? 'Not assessed';
            const foodSummary = (score?.foodSafety?.details as Record<string, any>)?.summary ?? undefined;
            const foodGradingType = jur?.foodSafety?.grading_type ?? null;
            const foodAgencyName = jur?.foodSafety?.agency_name ?? 'Health Dept';
            const foodScoringMethod = jur?.foodSafety?.scoring_method ?? null;

            const fireStatus = score?.facilitySafety?.status ?? 'unknown';
            const fireGradeDisplay = score?.facilitySafety?.gradeDisplay ?? 'Not assessed';
            const fireAHJName = jur?.facilitySafety?.agency_name ?? 'Fire AHJ';
            const fireConfig = jur?.facilitySafety?.fire_jurisdiction_config;
            const nfpaEdition = fireConfig?.fire_code_edition ?? 'NFPA 96 (2024)';
            const county = jur?.county ?? '';

            return (
              <div key={loc.id} style={stagger(2)}>
                {/* Location header */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/locations/${loc.id}`)}
                    className="text-sm font-semibold hover:opacity-70 transition-opacity"
                    style={{ color: BODY_TEXT }}
                  >
                    {loc.name}
                  </button>
                  {county && (
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
                    >
                      {county}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Food Safety Card */}
                  <button
                    type="button"
                    onClick={() => navigate('/compliance')}
                    className="w-full text-left bg-white rounded-xl p-4 transition-all hover:shadow-md"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `3px solid ${statusColor(foodStatus)}` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <UtensilsCrossed size={14} style={{ color: statusColor(foodStatus) }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                        Food Safety
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>{foodGradeDisplay}</p>
                    {foodSummary && (
                      <p className="text-[11px] text-gray-500 mt-0.5">{foodSummary}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px]" style={{ color: MUTED }}>{foodAgencyName}</span>
                      {(gradingTypeLabel(foodGradingType) || foodScoringMethod) && (
                        <>
                          <span className="text-[10px] text-gray-300">&middot;</span>
                          <span className="text-[10px]" style={{ color: MUTED }}>
                            {gradingTypeLabel(foodGradingType) || foodScoringMethod}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: foodStatus === 'passing' ? '#dcfce7'
                            : foodStatus === 'failing' ? '#fef2f2'
                            : foodStatus === 'at_risk' ? '#fffbeb'
                            : '#f1f5f9',
                          color: statusColor(foodStatus),
                        }}
                      >
                        {foodStatus === 'passing' ? 'Compliant'
                          : foodStatus === 'failing' ? 'Action Required'
                          : foodStatus === 'at_risk' ? 'At Risk'
                          : 'Unknown'}
                      </span>
                    </div>
                  </button>

                  {/* Facility Safety Card */}
                  <button
                    type="button"
                    onClick={() => navigate('/facility-safety')}
                    className="w-full text-left bg-white rounded-xl p-4 transition-all hover:shadow-md"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `3px solid ${statusColor(fireStatus)}` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Flame size={14} style={{ color: statusColor(fireStatus) }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                        Facility Safety
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>
                      {fireAHJName}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{nfpaEdition}</p>
                    <div className="mt-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: fireStatus === 'passing' ? '#dcfce7'
                            : fireStatus === 'failing' ? '#fef2f2'
                            : fireStatus === 'at_risk' ? '#fffbeb'
                            : '#f1f5f9',
                          color: statusColor(fireStatus),
                        }}
                      >
                        {fireStatus === 'passing' ? 'Pass'
                          : fireStatus === 'failing' ? 'Fail'
                          : fireStatus === 'at_risk' ? 'At Risk'
                          : 'Unknown'}
                      </span>
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
                      </div>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. WHAT NEEDS ATTENTION                                       */}
      {/* ============================================================ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8" style={stagger(3)}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: MUTED }}>
          What Needs Attention
        </h3>
        <div className="space-y-2">
          {COMPLIANCE_ALERTS.map(alert => {
            const SevIcon = SEVERITY_ICON_MAP[alert.severity] || Info;
            const sevBadge = SEVERITY_BADGE_CONFIG[alert.severity];
            const riskBadge = RISK_TYPE_CONFIG[alert.riskType];

            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => navigate(alert.route)}
                className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:shadow-md bg-white"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
              >
                <SevIcon
                  size={18}
                  className="shrink-0"
                  style={{ color: sevBadge.bg }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {alert.location && (
                      <span className="text-[10px] text-gray-500">{alert.location}</span>
                    )}
                    {alert.pillar && (
                      <>
                        <span className="text-[10px] text-gray-300">&middot;</span>
                        <span className="text-[10px] text-gray-500">{alert.pillar}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: riskBadge.bg, color: riskBadge.color }}
                  >
                    {riskBadge.label}
                  </span>
                  <span
                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: sevBadge.bg, color: sevBadge.color }}
                  >
                    {sevBadge.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. DO THIS NEXT                                               */}
      {/* ============================================================ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8" style={stagger(4)}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: MUTED }}>
          Do This Next
        </h3>
        <div className="space-y-2">
          {COMPLIANCE_PRIORITIES.slice(0, 3).map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.route)}
              className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:shadow-md bg-white"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            >
              {/* Numbered circle */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                style={{ backgroundColor: NAVY }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>
                  {item.title}
                </p>
                {item.detail && (
                  <p className="text-[11px] text-gray-500 mt-0.5">{item.detail}</p>
                )}
              </div>
              <ArrowRight size={16} className="shrink-0" style={{ color: NAVY }} />
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* BELOW THE FOLD                                                */}
      {/* ============================================================ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 space-y-6">

        {/* ============================================================ */}
        {/* LOCATION COMPLIANCE OVERVIEW (expandable per-location cards) */}
        {/* ============================================================ */}
        <div style={stagger(5)}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center">
            {t('cards.locationComplianceOverview')}
            <SectionTooltip content={locationCardsTooltip} />
          </h3>
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
        <div style={stagger(6)}>
          <ErrorBoundary level="widget">
            <CalendarCard
              events={COMPLIANCE_EVENTS}
              typeColors={COMPLIANCE_CALENDAR.typeColors}
              typeLabels={COMPLIANCE_CALENDAR.typeLabels}
              navigate={navigate}
              tooltipContent={scheduleCalendarTooltip}
            />
          </ErrorBoundary>
        </div>

        {/* ============================================================ */}
        {/* TABBED DETAIL SECTION                                        */}
        {/* ============================================================ */}
        <div style={stagger(7)}>
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
