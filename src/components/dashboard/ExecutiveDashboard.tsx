import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, Flame,
  BarChart3, LineChart as LineChartIcon,
  AlertTriangle, AlertCircle, ArrowRight,
} from 'lucide-react';
import { EvidlyIcon } from '../ui/EvidlyIcon';
import { useDemo } from '../../contexts/DemoContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { useRole } from '../../contexts/RoleContext';
import { useTooltip } from '../../hooks/useTooltip';
import { useAllLocationJurisdictions } from '../../hooks/useJurisdiction';
import { useAllComplianceScores } from '../../hooks/useComplianceScore';
import {
  LOCATIONS_WITH_SCORES,
  DEMO_ORG,
} from '../../data/demoData';
import { GOLD, NAVY, PAGE_BG, BODY_TEXT, MUTED, FONT, JIE_LOC_MAP, KEYFRAMES, DEMO_ROLE_NAMES } from './shared/constants';
import { DashboardHero } from './shared/DashboardHero';
import { CalendarCard } from './shared/CalendarCard';
import { EXECUTIVE_EVENTS, EXECUTIVE_CALENDAR } from '../../data/calendarDemoEvents';
import { ErrorBoundary } from '../ErrorBoundary';
import { OnboardingChecklistCard } from './shared/OnboardingChecklistCard';
import { HealthBanner, type HealthStatus } from './shared/HealthBanner';


// ================================================================
// DEMO ATTENTION ITEMS (cross-location)
// ================================================================

interface AttentionItem {
  id: string;
  severity: 'critical' | 'warning';
  action: string;
  location: string;
  pillar: string;
  riskType: 'liability' | 'revenue' | 'cost' | 'operational';
  route: string;
}

const EXEC_ATTENTION_ITEMS: AttentionItem[] = [
  { id: 'ea1', severity: 'critical', action: 'Resolve 3 overdue equipment inspections', location: 'Location 3', pillar: 'Facility Safety', riskType: 'liability', route: '/dashboard?location=university' },
  { id: 'ea2', severity: 'warning', action: 'Address walk-in cooler trending warm', location: 'Location 2', pillar: 'Food Safety', riskType: 'revenue', route: '/temp-logs?location=airport' },
  { id: 'ea3', severity: 'warning', action: 'Fire suppression certificate expiring', location: 'Location 3', pillar: 'Facility Safety', riskType: 'liability', route: '/documents' },
  { id: 'ea4', severity: 'warning', action: 'Schedule reinspection', location: 'Location 2', pillar: 'Food Safety', riskType: 'revenue', route: '/calendar' },
];

const RISK_LABEL_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  liability: { bg: '#fef2f2', text: '#991b1b', label: 'Liability' },
  revenue: { bg: '#fffbeb', text: '#92400e', label: 'Revenue' },
  cost: { bg: '#f0f4ff', text: '#3730a3', label: 'Cost' },
  operational: { bg: '#f0fdf4', text: '#166534', label: 'Operational' },
};


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
      className="fixed bottom-0 left-0 right-0 z-40"
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
// MAIN COMPONENT
// ================================================================

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { companyName, isDemoMode } = useDemo();
  const { userRole } = useRole();
  const { t } = useTranslation();

  const scheduleCalendarTooltip = useTooltip('scheduleCalendar', userRole);

  const jieLocIds = useMemo(
    () => isDemoMode ? LOCATIONS_WITH_SCORES.map(l => JIE_LOC_MAP[l.id] || l.id) : [],
    [isDemoMode],
  );
  const jurisdictions = useAllLocationJurisdictions(jieLocIds, isDemoMode);
  const jieScores = useAllComplianceScores(jurisdictions, isDemoMode);

  // ── Health Banner derivation ──
  const locs = isDemoMode ? LOCATIONS_WITH_SCORES : [];
  const healthStatus: HealthStatus = useMemo(() => {
    const anyFailing = locs.some(loc => {
      const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
      const score = jieScores[jieLocId];
      return score?.foodSafety?.status === 'failing' || score?.facilitySafety?.status === 'failing';
    });
    if (anyFailing) return 'risk';

    const anyAtRisk = locs.some(loc => {
      const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
      const score = jieScores[jieLocId];
      return score?.foodSafety?.status === 'at_risk' || score?.facilitySafety?.status === 'at_risk';
    });
    if (anyAtRisk) return 'attention';

    return 'healthy';
  }, [jieScores, locs]);

  const healthMessage = useMemo(() => {
    if (healthStatus === 'healthy') return 'All locations current across both pillars.';
    if (healthStatus === 'risk') return 'One or more locations have overdue fire safety or failed food safety standing.';
    return 'Some locations have open CAs or approaching deadlines.';
  }, [healthStatus]);

  // Live mode empty state
  if (!isDemoMode) {
    return (
      <div style={{ ...FONT, backgroundColor: PAGE_BG, minHeight: '100vh', paddingBottom: 80 }}>
        <DashboardHero
          firstName={DEMO_ROLE_NAMES.executive.firstName}
          orgName={companyName || DEMO_ORG.name}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
          <div className="bg-white rounded-xl p-8 text-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <p className="text-sm font-medium text-gray-500">No portfolio data yet. Add locations to see your executive overview.</p>
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

      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <DashboardHero
        firstName={DEMO_ROLE_NAMES.executive.firstName}
        orgName={companyName || DEMO_ORG.name}
        subtitle={`${DEMO_ORG.locationCount} locations \u00b7 California`}
        onSubtitleClick={() => navigate('/org-hierarchy')}
      />

      {/* ── 2. ONBOARDING CHECKLIST ──────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <OnboardingChecklistCard />
      </div>

      {/* ── 3. HEALTH BANNER ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <HealthBanner status={healthStatus} scope="Portfolio Health" message={healthMessage} />
      </div>

      {/* ── 4. LOCATION HEALTH — per-location pillar cards ──── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Location Health</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {locs.map(loc => {
            const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
            const score = jieScores[jieLocId];
            const jur = jurisdictions[jieLocId];

            const foodStatus = score?.foodSafety?.status || 'unknown';
            const foodStatusColor = foodStatus === 'passing' ? '#16a34a' : foodStatus === 'failing' ? '#dc2626' : foodStatus === 'at_risk' ? '#d97706' : '#6b7280';
            const fireStatus = score?.facilitySafety?.status || 'unknown';
            const fireStatusColor = fireStatus === 'passing' ? '#16a34a' : fireStatus === 'failing' ? '#dc2626' : fireStatus === 'at_risk' ? '#d97706' : '#6b7280';

            return (
              <div
                key={loc.id}
                className="bg-white rounded-xl p-5 transition-all hover:shadow-lg"
                style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
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

                {/* Food Safety Pillar */}
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

                {/* Facility Safety Pillar */}
                <button
                  type="button"
                  onClick={() => navigate('/facility-safety')}
                  className="w-full p-3 rounded-lg mb-3 text-left transition-colors hover:opacity-90"
                  style={{ borderLeft: `3px solid ${fireStatusColor}`, backgroundColor: '#f8fafc' }}
                >
                  <div className="flex items-center gap-2">
                    <Flame size={14} style={{ color: MUTED }} />
                    <span className="text-[13px] text-gray-700 flex-1">{t('cards.facilitySafety')}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                      backgroundColor: fireStatus === 'passing' ? '#dcfce7' : fireStatus === 'failing' ? '#fef2f2' : '#fffbeb',
                      color: fireStatusColor,
                    }}>
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

      {/* ── BELOW THE FOLD ──────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-6">

        {/* 5. What Needs Attention */}
        {EXEC_ATTENTION_ITEMS.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">What Needs Attention</h3>
            <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
              {EXEC_ATTENTION_ITEMS.map(item => {
                const riskStyle = RISK_LABEL_COLOR[item.riskType];
                const isCritical = item.severity === 'critical';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.route)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                    style={{ borderBottom: '1px solid #F0F0F0' }}
                  >
                    {isCritical
                      ? <AlertTriangle size={16} className="text-red-500 shrink-0" />
                      : <AlertCircle size={16} className="text-amber-500 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800">{item.action}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{item.location} &middot; {item.pillar}</p>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: riskStyle.bg, color: riskStyle.text }}
                    >
                      {riskStyle.label}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0" style={{
                      backgroundColor: isCritical ? '#fef2f2' : '#fffbeb',
                      color: isCritical ? '#991b1b' : '#92400e',
                    }}>
                      {isCritical ? 'High' : 'Medium'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Do This Next */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Do This Next</h3>
          <div className="space-y-2">
            {EXEC_ATTENTION_ITEMS.slice(0, 3).map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white text-left transition-all hover:shadow-md"
                style={{ border: '1px solid #e5e7eb' }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: NAVY }}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800">{item.action}</p>
                  <p className="text-[11px] text-gray-500">{item.location}</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* 7. Calendar */}
        <ErrorBoundary level="widget">
          <CalendarCard
            events={EXECUTIVE_EVENTS}
            typeColors={EXECUTIVE_CALENDAR.typeColors}
            typeLabels={EXECUTIVE_CALENDAR.typeLabels}
            navigate={navigate}
            tooltipContent={scheduleCalendarTooltip}
          />
        </ErrorBoundary>
      </div>

      {/* Strategic Actions Bar (fixed bottom) */}
      <StrategicActionsBar navigate={navigate} />
    </div>
  );
}
