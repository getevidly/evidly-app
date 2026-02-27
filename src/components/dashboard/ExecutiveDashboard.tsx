import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, Flame,
  BarChart3, LineChart as LineChartIcon,
} from 'lucide-react';
import { EvidlyIcon } from '../ui/EvidlyIcon';
import { useDemo } from '../../contexts/DemoContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { useRole } from '../../contexts/RoleContext';
import type { UserRole } from '../../contexts/RoleContext';
import { useTooltip } from '../../hooks/useTooltip';
import { SectionTooltip } from '../ui/SectionTooltip';
import { useAllLocationJurisdictions } from '../../hooks/useJurisdiction';
import { useAllComplianceScores } from '../../hooks/useComplianceScore';
import type { LocationScore, LocationJurisdiction } from '../../types/jurisdiction';
import { AlertBanner, type AlertBannerItem } from '../shared/AlertBanner';
import {
  LOCATIONS_WITH_SCORES,
  DEMO_ORG,
} from '../../data/demoData';
import { GOLD, NAVY, PAGE_BG, BODY_TEXT, MUTED, FONT, JIE_LOC_MAP, KEYFRAMES, DEMO_ROLE_NAMES } from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { HeroJurisdictionSummary } from './shared/HeroJurisdictionSummary';
import { CalendarCard } from './shared/CalendarCard';
import { EXECUTIVE_EVENTS, EXECUTIVE_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';

// ================================================================
// ALERT BANNERS
// ================================================================

interface AlertItem {
  id: string;
  severity: 'critical' | 'warning';
  message: string;
  location: string;
  pillar: string;
  actionLabel: string;
  route: string;
}

const EXEC_ALERTS: AlertItem[] = [
  { id: 'ea1', severity: 'critical', message: 'University Dining Facility Safety dropped below 65 — 3 equipment inspections overdue', location: 'University Dining', pillar: 'Facility Safety', actionLabel: 'Take Action', route: '/dashboard?location=university' },
  { id: 'ea2', severity: 'warning', message: 'Airport Cafe walk-in cooler trending warm — 3 out-of-range readings this week', location: 'Airport Cafe', pillar: 'Food Safety', actionLabel: 'View Temps', route: '/temp-logs?location=airport' },
];

// ================================================================
// WIDGET: Location Status
// ================================================================

function WidgetLocations({ jieScores, jurisdictions, navigate, userRole }: {
  jieScores: Record<string, LocationScore>;
  jurisdictions: Record<string, LocationJurisdiction>;
  navigate: (path: string) => void;
  userRole: UserRole;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center">{t('cards.locationStatus')}<SectionTooltip content={useTooltip('locationCards', userRole)} /></h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {LOCATIONS_WITH_SCORES.map(loc => {
          const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
          const score = jieScores[jieLocId];
          const jur = jurisdictions[jieLocId];

          const foodStatus = score?.foodSafety?.status || 'unknown';
          const foodStatusColor = foodStatus === 'passing' ? '#16a34a' : foodStatus === 'failing' ? '#dc2626' : foodStatus === 'at_risk' ? '#d97706' : '#6b7280';

          return (
            <div
              key={loc.id}
              className="rounded-xl p-5 transition-all hover:shadow-lg"
              style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = GOLD;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              {/* Name + County */}
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => navigate(`/locations/${loc.id}`)} className="text-sm font-bold text-left hover:opacity-70 transition-opacity" style={{ color: BODY_TEXT }}>{loc.name}</button>
                {jur?.county && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {jur.county} County
                  </span>
                )}
              </div>

              {/* Food Safety */}
              <button
                type="button"
                onClick={() => navigate('/compliance')}
                className="w-full p-3 rounded-lg mb-2 text-left transition-colors hover:opacity-90"
                style={{ borderLeft: `3px solid ${foodStatusColor}`, backgroundColor: '#fafbfc' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <UtensilsCrossed size={14} style={{ color: MUTED }} />
                  <span className="text-[13px] text-gray-700 flex-1">{t('cards.foodSafety')}</span>
                  <span className="text-sm font-bold" style={{ color: foodStatusColor }}>
                    {score?.foodSafety?.gradeDisplay || t('status.pending')}
                  </span>
                </div>
                {score?.foodSafety?.details?.summary && (
                  <p className="text-[11px] text-gray-500 ml-6">{score.foodSafety.details.summary}</p>
                )}
              </button>

              {/* Facility Safety */}
              <button
                type="button"
                onClick={() => navigate('/facility-safety')}
                className="w-full p-3 rounded-lg mb-3 text-left transition-colors hover:opacity-90"
                style={{ backgroundColor: '#f8fafc' }}
              >
                <div className="flex items-center gap-2">
                  <Flame size={14} style={{ color: MUTED }} />
                  <span className="text-[13px] text-gray-700 flex-1">{t('cards.facilitySafety')}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    score?.facilitySafety?.status === 'passing'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {score?.facilitySafety?.grade || t('status.pending')}
                  </span>
                </div>
                {jur?.facilitySafety?.agency_name && (
                  <p className="text-[10px] text-gray-400 ml-6 mt-0.5">{jur.facilitySafety.agency_name}</p>
                )}
              </button>

              {/* View Details */}
              <button
                type="button"
                onClick={() => navigate(`/dashboard?location=${loc.id}`)}
                className="w-full text-center text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: NAVY }}
              >
                {t('actions.viewDetails')} &rarr;
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================
// STRATEGIC ACTIONS BAR (fixed bottom)
// ================================================================

function StrategicActionsBar({ navigate }: { navigate: (path: string) => void }) {
  const { t } = useTranslation();
  const actions = [
    { icon: <BarChart3 size={16} />, title: t('actions.generateOrgReport'), cta: t('actions.generateReport'), route: '/reports' },
    { icon: <LineChartIcon size={16} />, title: t('actions.viewBenchmarks'), cta: t('actions.viewBenchmarks'), route: '/benchmarks' },
    { icon: <EvidlyIcon size={16} />, title: t('actions.riskAssessment'), cta: t('actions.viewRiskReport'), route: '/risk-score' },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100]"
      style={{
        backgroundColor: 'white',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div className="max-w-[1100px] mx-auto px-4 py-2.5 flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
        {actions.map(a => (
          <button
            key={a.title}
            type="button"
            onClick={() => navigate(a.route)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-[10px] flex-1 transition-all text-left cursor-pointer"
            style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = GOLD;
              (e.currentTarget as HTMLElement).style.backgroundColor = '#fefce8';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
              (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
            }}
          >
            <span style={{ color: NAVY }}>{a.icon}</span>
            <span className="text-[13px] font-semibold flex-1" style={{ color: BODY_TEXT }}>{a.title}</span>
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-md shrink-0"
              style={{ border: `1px solid ${NAVY}`, color: NAVY }}
            >
              {a.cta}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ================================================================
// EVIDLY FOOTER
// ================================================================

function EvidlyFooter() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 py-6 mt-6" style={{ borderTop: '1px solid #eef1f5' }}>
      <span className="text-[15px] font-bold">
        <span style={{ color: GOLD }}>E</span>
        <span style={{ color: NAVY }}>vid</span>
        <span style={{ color: GOLD }}>LY</span>
      </span>
      <span className="text-[12px] text-gray-400">{t('topBar.complianceSimplified')}</span>
    </div>
  );
}


// ================================================================
// MAIN COMPONENT
// ================================================================

// ================================================================
// INTELLIGENCE BRIEF CARD (INTEL-HUB-1)
// ================================================================

function IntelligenceBriefCard({ navigate }: { navigate: (path: string) => void }) {
  // Static demo data — top critical insight
  const topInsight = {
    title: 'Class I Recall: Romaine Lettuce E.coli O157:H7 — California Distribution',
    headline: 'URGENT: Class I recall for romaine lettuce affects California distributors.',
    action: 'Check inventory at all locations immediately',
    criticalCount: 3,
    highCount: 6,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
      <button
        type="button"
        onClick={() => navigate('/intelligence')}
        className="w-full rounded-xl p-4 text-left transition-all hover:shadow-md group"
        style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#dc2626' }}>
            <span className="text-white text-sm">🧠</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#991b1b' }}>Intelligence Alert</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-200 text-red-800">{topInsight.criticalCount} Critical</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">{topInsight.highCount} High</span>
            </div>
            <p className="text-sm font-semibold leading-tight" style={{ color: '#991b1b' }}>{topInsight.title}</p>
            <p className="text-xs mt-1" style={{ color: '#7f1d1d' }}>{topInsight.action}</p>
          </div>
          <span className="text-xs font-medium shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: '#991b1b' }}>
            View Full Intelligence →
          </span>
        </div>
      </button>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { companyName, isDemoMode } = useDemo();
  const { userRole } = useRole();
  const { t } = useTranslation();

  const jieLocIds = useMemo(
    () => LOCATIONS_WITH_SCORES.map(l => JIE_LOC_MAP[l.id] || l.id),
    [],
  );
  const jurisdictions = useAllLocationJurisdictions(jieLocIds, isDemoMode);
  const jieScores = useAllComplianceScores(jurisdictions, isDemoMode);

  // Dismissed alerts (session-only)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id));
  }, []);

  // Show only the highest-severity undismissed alert
  const topAlert = EXEC_ALERTS.find(a => !dismissedAlerts.has(a.id));

  return (
    <div style={{ ...FONT, backgroundColor: PAGE_BG, minHeight: '100vh', paddingBottom: 80 }}>
      <style>{KEYFRAMES}</style>

      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <DashboardHero
        firstName={DEMO_ROLE_NAMES.executive.firstName}
        orgName={companyName || DEMO_ORG.name}
        subtitle={`${DEMO_ORG.locationCount} locations \u00b7 California`}
        onSubtitleClick={() => navigate('/org-hierarchy')}
      >
        <HeroJurisdictionSummary jieScores={jieScores} jurisdictions={jurisdictions} navigate={navigate} userRole={userRole} />
      </DashboardHero>

      {/* ── 1b. INTELLIGENCE BRIEF CARD ────────────────────── */}
      <IntelligenceBriefCard navigate={navigate} />

      {/* ── 2. KPI TILES (5: Score, Risk, Locations, Deadline, AI Risk) ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => navigate('/compliance')}
            className="rounded-xl p-4 text-left transition-all hover:shadow-md"
            style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Portfolio Score</p>
            <p className="text-2xl font-bold" style={{ color: BODY_TEXT }}>72%</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Across 3 locations</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/risk-score')}
            className="rounded-xl p-4 text-left transition-all hover:shadow-md"
            style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Risk Exposure</p>
            <p className="text-2xl font-bold text-red-700">$12.4K</p>
            <p className="text-[11px] text-red-600 mt-0.5">Potential liability</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/org-hierarchy')}
            className="rounded-xl p-4 text-left transition-all hover:shadow-md"
            style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Locations</p>
            <p className="text-2xl font-bold" style={{ color: BODY_TEXT }}>3</p>
            <p className="text-[11px] text-gray-500 mt-0.5">1 needs attention</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="rounded-xl p-4 text-left transition-all hover:shadow-md"
            style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Next Deadline</p>
            <p className="text-lg font-bold" style={{ color: '#92400e' }}>Feb 28</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Reinspection due</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/ai-advisor')}
            className="rounded-xl p-4 text-left transition-all hover:shadow-md"
            style={{ backgroundColor: '#f0f4ff', border: '1px solid #c7d2fe', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <EvidlyIcon size={12} />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">AI Risk Exposure</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#4338ca' }}>$12.4K</p>
            <p className="text-[11px] text-indigo-600 mt-0.5">AI-identified liability</p>
          </button>
        </div>
      </div>

      {/* ── BELOW THE FOLD ──────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-6">

        {/* 3. Single most-critical alert */}
        {topAlert && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 flex items-center">{t('cards.alerts')}<SectionTooltip content={useTooltip('alertBanner', userRole)} /></h4>
            <AlertBanner alerts={[topAlert] as AlertBannerItem[]} onDismiss={handleDismissAlert} navigate={navigate} />
          </div>
        )}

        {/* 4. Location Status Cards */}
        <WidgetLocations jieScores={jieScores} jurisdictions={jurisdictions} navigate={navigate} userRole={userRole} />

        {/* 5. Calendar */}
        <ErrorBoundary level="widget">
          <CalendarCard
            events={EXECUTIVE_EVENTS}
            typeColors={EXECUTIVE_CALENDAR.typeColors}
            typeLabels={EXECUTIVE_CALENDAR.typeLabels}
            navigate={navigate}
            tooltipContent={useTooltip('scheduleCalendar', userRole)}
          />
        </ErrorBoundary>

        {/* Footer */}
        <EvidlyFooter />
      </div>

      {/* Strategic Actions Bar (fixed bottom) */}
      <StrategicActionsBar navigate={navigate} />
    </div>
  );
}
