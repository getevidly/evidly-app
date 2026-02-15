import { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  ArrowLeft,
  Info,
  Share2,
  ShieldAlert,
  FileText,
  QrCode,
  Bell,
  Clock,
  X,
  Brain,
  AlertTriangle,
  ArrowRight,
  Building2,
  Flame,
  UtensilsCrossed,
  Truck,
  TrendingDown,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { complianceScores, locationScores, getGrade, locations, scoreImpactData, complianceScoresThirtyDaysAgo, locationScoresThirtyDaysAgo, getTrend, getWeights, needsAttentionItems, vendors as demoVendors } from '../data/demoData';
import { loadDashboardData, type DashboardData } from '../lib/dashboardQueries';
import { useRole } from '../contexts/RoleContext';
import { QRCodeSVG } from 'qrcode.react';
import { ShareModal } from '../components/ShareModal';
import { AnimatedComplianceScore } from '../components/AnimatedComplianceScore';
import { AnimatedPillarBar } from '../components/AnimatedPillarBar';
import { TimeSavedCounter } from '../components/TimeSavedCounter';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { KitchenDashboard } from './KitchenDashboard';
import { FacilitiesDashboard } from './FacilitiesDashboard';
import { BenchmarkWidget } from '../components/BenchmarkWidget';
import { InsuranceReadinessWidget } from '../components/InsuranceReadinessWidget';
import { SensorMonitorWidget } from '../components/SensorMonitorWidget';
import { EquipmentHealthWidget } from '../components/EquipmentHealthWidget';
import { useTranslation } from '../contexts/LanguageContext';
import { startInspectorVisit, type InspectorVisit } from '../lib/reportGenerator';
import { calculateJurisdictionScore, extractCountySlug } from '../lib/jurisdictionScoring';
import { JurisdictionScoreDisplay } from '../components/JurisdictionScoreDisplay';
import { DEMO_LOCATION_JURISDICTIONS } from '../lib/jurisdictions';
import { getStateLabel } from '../lib/stateCodes';
import { DashboardUpgradeCard } from '../components/DashboardUpgradeCard';
import { K2CWidget } from '../components/K2CWidget';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { FeatureGate } from '../components/FeatureGate';
import { Gift } from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';
import { WelcomeModal } from '../components/WelcomeModal';
import { WelcomeBack } from '../components/WelcomeBack';
import { OnboardingProgressWidget } from '../components/OnboardingProgressWidget';
import { CopilotCard } from '../components/CopilotCard';
import { DEMO_CHECKLIST_STATUS, getDocumentsForState } from '../data/onboardingDocuments';
import { Tooltip as InfoTooltip } from '../components/Tooltip';
import OperatorDashboard from '../components/dashboard/OperatorDashboard';

// --------------- Role-Based Dashboard Router ---------------

export function Dashboard() {
  const { userRole } = useRole();

  switch (userRole) {
    case 'management':
      return <OperatorDashboard />;
    case 'executive':
      return <LegacyDashboard />;
    case 'kitchen':
      return <KitchenDashboard />;
    case 'facilities':
      return <FacilitiesDashboard />;
    default:
      return <OperatorDashboard />;
  }
}

// --------------- Legacy Dashboard (Executive/Management View) ---------------

function LegacyDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { t } = useTranslation();

  const params = new URLSearchParams(window.location.search);
  const locationParam = params.get('location') || 'all';
  const selectedLocation = locationParam;
  const tabParam = params.get('tab');
  const validTabs = ['overview', 'progress', 'action', 'vendors', 'history', 'metrics', 'passport'];

  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'action' | 'vendors' | 'history' | 'metrics' | 'passport'>(
    tabParam && validTabs.includes(tabParam) ? tabParam as any : 'overview'
  );
  const [showShareModal, setShowShareModal] = useState(false);
  const [pillarFilter, setPillarFilter] = useState<string | null>(null);
  const [inspectorMode, setInspectorMode] = useState(false);
  const [inspectorVisit, setInspectorVisit] = useState<InspectorVisit | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const { isDemoMode, userName: demoUserName } = useDemo();

  // Welcome experience — first login vs returning user
  const isFirstLogin = !profile?.onboarding_completed && !localStorage.getItem('evidly_welcome_seen');
  const [showWelcome, setShowWelcome] = useState(isFirstLogin);
  const welcomeName = isDemoMode
    ? (demoUserName?.split(' ')[0] || 'there')
    : (profile?.full_name?.split(' ')[0] || 'there');
  const lastLoginAt = isDemoMode ? null : (profile as any)?.last_login_at;

  // Onboarding document progress (for dashboard widget)
  const onboardingDocs = useMemo(() => getDocumentsForState(), []);
  const onboardingRequired = useMemo(() => onboardingDocs.filter(d => d.required), [onboardingDocs]);
  const onboardingComplete = useMemo(() =>
    onboardingRequired.filter(d => {
      const entry = DEMO_CHECKLIST_STATUS[d.id];
      return entry && (entry.status === 'uploaded' || entry.status === 'not_applicable');
    }).length,
  [onboardingRequired]);
  const nextOnboardingDoc = useMemo(() =>
    onboardingRequired.find(d => {
      const entry = DEMO_CHECKLIST_STATUS[d.id];
      return !entry || entry.status === 'pending';
    }),
  [onboardingRequired]);

  // Load real Supabase data with demo fallback
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setDataLoading(true);
      try {
        const data = await loadDashboardData(profile?.organization_id);
        if (!cancelled) {
          setDashboardData(data);
        }
      } catch (err) {
        console.error('Dashboard data load failed, using demo data:', err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [profile?.organization_id]);

  // Resolve data: prefer loaded Supabase data, fall back to demo imports
  const resolvedLocations = dashboardData?.locations ?? locations;
  const resolvedLocationScores = dashboardData?.complianceData.locationScores ?? locationScores;
  const resolvedLocationScoresThirtyDaysAgo = dashboardData?.complianceData.locationScoresThirtyDaysAgo ?? locationScoresThirtyDaysAgo;
  const resolvedComplianceScores = dashboardData?.complianceData.scores ?? complianceScores;
  const resolvedComplianceScoresThirtyDaysAgo = dashboardData?.complianceData.scoresThirtyDaysAgo ?? complianceScoresThirtyDaysAgo;
  const resolvedVendors = dashboardData?.vendors ?? demoVendors;
  const resolvedNeedsAttention = dashboardData?.needsAttention ?? needsAttentionItems;
  const resolvedScoreImpact = dashboardData?.scoreImpact ?? scoreImpactData;
  const resolvedActivity = dashboardData?.activity ?? [];
  const resolvedProgress = dashboardData?.progress ?? {};

  const currentScores = selectedLocation === 'all' ? resolvedComplianceScores : resolvedLocationScores[selectedLocation] || resolvedComplianceScores;
  const currentScoresThirtyDaysAgo = selectedLocation === 'all' ? resolvedComplianceScoresThirtyDaysAgo : resolvedLocationScoresThirtyDaysAgo[selectedLocation] || resolvedComplianceScoresThirtyDaysAgo;
  const complianceScore = currentScores.overall;
  const foodSafetyScore = currentScores.foodSafety;
  const fireSafetyScore = currentScores.fireSafety;
  const vendorComplianceScore = currentScores.vendorCompliance;

  const overallTrend = getTrend(currentScores.overall, currentScoresThirtyDaysAgo.overall);
  const foodSafetyTrend = getTrend(currentScores.foodSafety, currentScoresThirtyDaysAgo.foodSafety);
  const fireSafetyTrend = getTrend(currentScores.fireSafety, currentScoresThirtyDaysAgo.fireSafety);
  const vendorComplianceTrend = getTrend(currentScores.vendorCompliance, currentScoresThirtyDaysAgo.vendorCompliance);

  const weights = getWeights();
  const pillarScores = [
    { name: t('dashboard.foodSafety'), weight: Math.round(weights.foodSafety * 100), score: foodSafetyScore, tooltip: t('dashboard.foodSafetyTooltip'), trend: foodSafetyTrend },
    { name: t('dashboard.fireSafety'), weight: Math.round(weights.fireSafety * 100), score: fireSafetyScore, tooltip: t('dashboard.fireSafetyTooltip'), trend: fireSafetyTrend },
    { name: t('dashboard.vendorCompliance'), weight: Math.round(weights.vendorCompliance * 100), score: vendorComplianceScore, tooltip: t('dashboard.vendorComplianceTooltip'), trend: vendorComplianceTrend },
  ];

  const scoreInfo = getGrade(complianceScore);

  const { getAccessibleLocationUrlIds, hasMultipleLocations, canAccessLocation } = useRole();
  const accessibleUrlIds = getAccessibleLocationUrlIds();
  const availableLocations = hasMultipleLocations() ? ['all', ...accessibleUrlIds] : accessibleUrlIds;
  const filteredLocationOptions = resolvedLocations.filter(loc => accessibleUrlIds.includes(loc.urlId));

  const getScoreHexColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 75) return '#eab308';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Jurisdiction score for single-location view
  const jurisdictionResult = selectedLocation !== 'all' ? (() => {
    const selectedLocationObj = resolvedLocations.find(loc => loc.urlId === selectedLocation);
    const jurisdictionMapping = DEMO_LOCATION_JURISDICTIONS.find(j => j.locationName === selectedLocationObj?.name);
    const countySlug = jurisdictionMapping ? extractCountySlug(jurisdictionMapping.county) : 'generic';
    const locationItems = resolvedScoreImpact.filter(item => item.locationId === selectedLocationObj?.id);
    return calculateJurisdictionScore(locationItems, countySlug);
  })() : null;

  const historicalData = {
    downtown: [
      { week: 'Week 1', score: 85, date: '12/1' },
      { week: 'Week 2', score: 87, date: '12/8' },
      { week: 'Week 3', score: 86, date: '12/15' },
      { week: 'Week 4', score: 88, date: '12/22' },
      { week: 'Week 5', score: 89, date: '12/29' },
      { week: 'Week 6', score: 90, date: '1/5' },
      { week: 'Week 7', score: 89, date: '1/12' },
      { week: 'Week 8', score: 91, date: '1/19' },
      { week: 'Week 9', score: 90, date: '1/26' },
      { week: 'Week 10', score: 92, date: '2/2' },
      { week: 'Week 11', score: 91, date: '2/9' },
      { week: 'Week 12', score: 92, date: '2/16' },
    ],
    airport: [
      { week: 'Week 1', score: 64, date: '12/1' },
      { week: 'Week 2', score: 65, date: '12/8' },
      { week: 'Week 3', score: 66, date: '12/15' },
      { week: 'Week 4', score: 67, date: '12/22' },
      { week: 'Week 5', score: 66, date: '12/29' },
      { week: 'Week 6', score: 68, date: '1/5' },
      { week: 'Week 7', score: 69, date: '1/12' },
      { week: 'Week 8', score: 68, date: '1/19' },
      { week: 'Week 9', score: 69, date: '1/26' },
      { week: 'Week 10', score: 71, date: '2/2' },
      { week: 'Week 11', score: 70, date: '2/9' },
      { week: 'Week 12', score: 70, date: '2/16' },
    ],
    university: [
      { week: 'Week 1', score: 42, date: '12/1' },
      { week: 'Week 2', score: 44, date: '12/8' },
      { week: 'Week 3', score: 46, date: '12/15' },
      { week: 'Week 4', score: 48, date: '12/22' },
      { week: 'Week 5', score: 47, date: '12/29' },
      { week: 'Week 6', score: 49, date: '1/5' },
      { week: 'Week 7', score: 51, date: '1/12' },
      { week: 'Week 8', score: 50, date: '1/19' },
      { week: 'Week 9', score: 52, date: '1/26' },
      { week: 'Week 10', score: 53, date: '2/2' },
      { week: 'Week 11', score: 53, date: '2/9' },
      { week: 'Week 12', score: 54, date: '2/16' },
    ],
  };

  const locationDropdownOptions = filteredLocationOptions.map(loc => ({ id: loc.urlId, name: loc.name }));
  const showLocationDropdown = locationDropdownOptions.length > 1;

  // Today's Progress — per-location data from Supabase or demo fallback
  const todaysProgressData = resolvedProgress;
  const progress = selectedLocation === 'all'
    ? Object.values(todaysProgressData).reduce((acc, d) => ({
        tempDone: acc.tempDone + d.tempDone,
        tempTotal: acc.tempTotal + d.tempTotal,
        checkDone: acc.checkDone + d.checkDone,
        checkTotal: acc.checkTotal + d.checkTotal,
      }), { tempDone: 0, tempTotal: 0, checkDone: 0, checkTotal: 0 })
    : todaysProgressData[selectedLocation] || todaysProgressData['downtown'] || { tempDone: 0, tempTotal: 0, checkDone: 0, checkTotal: 0 };
  const tempPct = progress.tempTotal > 0 ? Math.round((progress.tempDone / progress.tempTotal) * 100) : 0;
  const checkPct = progress.checkTotal > 0 ? Math.round((progress.checkDone / progress.checkTotal) * 100) : 0;
  const pctColor = (p: number) => p >= 90 ? '#22c55e' : p >= 75 ? '#eab308' : p >= 60 ? '#f59e0b' : '#ef4444';

  useEffect(() => {
    const loadMap = () => {
      const L = (window as any).L;
      const mapContainer = document.getElementById('dashboard-map');

      if (L && mapContainer && !mapContainer.classList.contains('leaflet-container')) {
        try {
          const map = L.map('dashboard-map').setView([37.05, -120.25], 8);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
          }).addTo(map);

          (window as any).dashboardMap = map;

          resolvedLocations.forEach((loc) => {
            const color = loc.score >= 90 ? '#22c55e' : loc.score >= 75 ? '#eab308' : loc.score >= 60 ? '#f59e0b' : '#ef4444';
            const icon = L.divIcon({
              className: 'custom-marker',
              html: `<div style="background: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: pointer;"></div>`,
            });

            const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
            marker.bindTooltip(`<strong>${loc.name}</strong><br/>Score: ${loc.score}<br/>Status: ${loc.status}<br/>Action Items: ${loc.actionItems}`, {
              permanent: false,
              direction: 'top',
            });

            marker.on('click', () => {
              navigate(`/dashboard?location=${loc.urlId}`);
            });
          });
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      }
    };

    if (resolvedLocations.length > 1) {
      setTimeout(loadMap, 100);
    }
  }, [resolvedLocations]);

  useEffect(() => {
    const map = (window as any).dashboardMap;
    if (map) {
      if (selectedLocation === 'all') {
        map.setView([37.05, -120.25], 8);
      } else {
        const location = resolvedLocations.find(loc => loc.urlId === selectedLocation);
        if (location) {
          map.setView([location.lat, location.lng], 13);
        }
      }
    }
  }, [selectedLocation]);

  // Role routing is now handled by the Dashboard() wrapper above

  // Loading skeleton — only shows on first load
  if (dataLoading && !dashboardData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-[#1e4d6b] text-white px-6 py-3 flex items-center space-x-2 rounded-lg">
          <Info className="h-5 w-5" />
          <span className="font-medium">{t('dashboard.demoMode')}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 h-24 bg-gray-100 rounded-lg"></div>
            <div className="flex-1 h-24 bg-gray-100 rounded-lg"></div>
            <div className="flex-1 h-24 bg-gray-100 rounded-lg"></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-200">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-100 rounded"></div>
            <div className="h-12 bg-gray-100 rounded"></div>
            <div className="h-12 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#1e4d6b] text-white px-3 sm:px-6 py-2 sm:py-3 flex items-center space-x-2 rounded-lg mb-6">
        <Info className="h-5 w-5" />
        <span className="font-medium">{t('dashboard.demoMode')}</span>
      </div>

      {/* Trial Status Banner */}
      <div className="bg-gradient-to-r from-[#16a34a] to-[#15803d] text-white px-3 sm:px-6 py-3 sm:py-4 rounded-lg mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5 flex-shrink-0" />
            <div>
              <span className="font-semibold">Free Trial — 18 days remaining</span>
              <span className="hidden sm:inline text-white/80 ml-2 text-sm">Full access to all features, no charge until trial ends</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/settings?tab=billing')}
            className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
          >
            View Billing
          </button>
        </div>
      </div>

      {/* First Login Welcome Modal */}
      {showWelcome && (
        <WelcomeModal
          firstName={welcomeName}
          onDismiss={() => setShowWelcome(false)}
        />
      )}

      {/* Welcome Back Greeting (shown when not first login) */}
      {!showWelcome && (
        <WelcomeBack
          userName={isDemoMode ? demoUserName : profile?.full_name || null}
          lastLoginAt={lastLoginAt}
          isDemoMode={isDemoMode}
        />
      )}

      {/* Onboarding Document Progress Widget */}
      {onboardingComplete < onboardingRequired.length && (
        <div className="mb-6">
          <OnboardingProgressWidget
            totalRequired={onboardingRequired.length}
            completedRequired={onboardingComplete}
            nextDocumentName={nextOnboardingDoc?.name}
          />
        </div>
      )}

      {/* Inspector Mode Panel */}
      {inspectorMode && inspectorVisit && (
        <div style={{ backgroundColor: '#fef2f2', border: '2px solid #ef4444', borderRadius: 12, marginBottom: 24 }} className="p-3 sm:p-5">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert className="h-6 w-6 text-white" />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#991b1b' }}>Inspector On-Site Mode Active</div>
                <div style={{ fontSize: 13, color: '#991b1b' }}>
                  Started at {new Date(inspectorVisit.startedAt).toLocaleTimeString()} — {inspectorVisit.locationName}
                </div>
              </div>
            </div>
            <button
              onClick={() => { setInspectorMode(false); setInspectorVisit(null); }}
              className="flex items-center gap-1 px-3 py-1.5 bg-white text-red-600 border border-red-300 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <X className="h-4 w-4" />
              End Visit
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 16, textAlign: 'center', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: inspectorVisit.gradeColor, lineHeight: 1 }}>{inspectorVisit.score}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: inspectorVisit.gradeColor, marginTop: 4 }}>{inspectorVisit.grade}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Real-Time Score</div>
            </div>
            <button
              onClick={() => navigate('/health-dept-report')}
              style={{ backgroundColor: 'white', borderRadius: 8, padding: 16, textAlign: 'center', border: '1px solid #fecaca', cursor: 'pointer' }}
              className="hover:bg-red-50 transition-colors"
            >
              <FileText className="h-8 w-8 text-[#1e4d6b] mx-auto" />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 4 }}>Instant Report</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Generated automatically</div>
            </button>
            <button
              onClick={() => window.open(inspectorVisit.qrPassportUrl, '_blank')}
              style={{ backgroundColor: 'white', borderRadius: 8, padding: 16, textAlign: 'center', border: '1px solid #fecaca', cursor: 'pointer' }}
              className="hover:bg-red-50 transition-colors"
            >
              <QrCode className="h-8 w-8 text-[#1e4d6b] mx-auto" />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 4 }}>QR Passport</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Show to inspector</div>
            </button>
            <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 16, textAlign: 'center', border: '1px solid #fecaca' }}>
              <Bell className="h-8 w-8 text-green-500 mx-auto" />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 4 }}>Owner Notified</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Notification sent</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {selectedLocation !== 'all' && (() => {
          const locationMap: Record<string, { name: string; address: string }> = {
            'downtown': { name: 'Downtown Kitchen', address: '1245 Fulton Street, Fresno, CA 93721' },
            'airport': { name: 'Airport Cafe', address: '1636 Macready Drive, Merced, CA 95340' },
            'university': { name: 'University Dining', address: '1 University Circle, Modesto, CA 95348' },
          };
          const locationInfo = locationMap[selectedLocation] || { name: 'Location', address: '' };
          const selectedLocationObj = resolvedLocations.find(loc => loc.urlId === selectedLocation);
          const stateLabel = selectedLocationObj?.stateCode ? getStateLabel(selectedLocationObj.stateCode) : null;
          return (
            <div className="mb-6">
              <button
                onClick={() => { navigate('/dashboard'); }}
                className="flex items-center space-x-1 mb-3 text-sm font-medium text-[#1e4d6b] hover:text-[#163a52] transition-colors duration-150"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{t('dashboard.backToAllLocations')}</span>
              </button>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">
                {locationInfo.name}
                {stateLabel && (
                  <span className="text-xs text-gray-500 ml-2 font-normal">{stateLabel}</span>
                )}
              </h1>
              <p className="text-gray-600">
                {locationInfo.address}
              </p>
            </div>
          );
        })()}

        {['executive', 'management'].includes(userRole) && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('dashboard.complianceOverview')}</h2>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <InfoTooltip text="Your overall compliance health across all three pillars">
              <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.complianceScore')}</h3>
            </InfoTooltip>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedLocation !== 'all' && !inspectorMode && (
                <button
                  onClick={() => {
                    const visit = startInspectorVisit(selectedLocation);
                    setInspectorVisit(visit);
                    setInspectorMode(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-150 text-sm font-medium"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Inspector On-Site
                </button>
              )}
              <button
                onClick={() => navigate('/health-dept-report')}
                className="flex items-center gap-2 px-4 py-2 bg-[#d4af37] text-white rounded-lg hover:bg-[#b8962f] transition-colors duration-150 text-sm font-medium"
              >
                <FileText className="h-4 w-4" />
                Generate Report
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150 text-sm"
              >
                <Share2 className="h-4 w-4" />
                {t('dashboard.shareReport')}
              </button>
            </div>
          </div>

          {/* Dual-Layer Score Display */}
          {selectedLocation !== 'all' && jurisdictionResult ? (
            <>
              <div className="flex items-start justify-center gap-8 flex-wrap">
                <div className="flex flex-col items-center">
                  <InfoTooltip text="Your overall compliance health across all three pillars">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">EvidLY Score</div>
                  </InfoTooltip>
                  <AnimatedComplianceScore
                    score={complianceScore}
                    label={scoreInfo.label}
                    color={scoreInfo.color}
                    trend={overallTrend}
                  />
                </div>
                <div className="hidden sm:flex items-center self-center">
                  <div className="w-px h-32 bg-gray-200"></div>
                </div>
                <div className="flex flex-col items-center pt-6">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Inspector Grade</div>
                  <JurisdictionScoreDisplay result={jurisdictionResult} />
                </div>
              </div>
              <div className="text-center mt-4">
                <span
                  onClick={() => navigate(`/scoring-breakdown?location=${selectedLocation}`)}
                  className="text-sm font-medium text-[#1e4d6b] hover:text-[#163a52] cursor-pointer transition-colors"
                >
                  View Full Breakdown &rarr;
                </span>
              </div>
            </>
          ) : (
            <AnimatedComplianceScore
              score={complianceScore}
              label={scoreInfo.label}
              color={scoreInfo.color}
              trend={overallTrend}
            />
          )}

          <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full">
              {pillarScores.map((pillar, index) => (
                <AnimatedPillarBar
                  key={pillar.name}
                  name={pillar.name}
                  score={pillar.score}
                  tooltip={pillar.tooltip}
                  trend={pillar.trend}
                  delay={index * 300}
                  onClick={() => {
                    if (selectedLocation !== 'all') {
                      setExpandedPillar(expandedPillar === pillar.name ? null : pillar.name);
                    }
                    setPillarFilter(pillar.name);
                    setActiveTab('action');
                  }}
                  isExpanded={selectedLocation !== 'all' && expandedPillar === pillar.name}
                />
              ))}
            </div>

          {expandedPillar && selectedLocation !== 'all' && (() => {
            const selectedLocationObj = resolvedLocations.find(loc => loc.urlId === selectedLocation);
            const pillarItems = resolvedScoreImpact
              .filter(item => item.locationId === selectedLocationObj?.id && item.pillar === expandedPillar)
              .sort((a, b) => {
                const statusOrder: Record<string, number> = { overdue: 0, expired: 0, missing: 0, due_soon: 1, current: 2 };
                return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
              });

            const getStatusIcon = (status: string) => {
              switch (status) {
                case 'current': return <span style={{ color: '#22c55e', fontSize: '16px' }}>&#10003;</span>;
                case 'overdue':
                case 'expired':
                case 'missing': return <span style={{ color: '#ef4444', fontSize: '16px' }}>&#10007;</span>;
                case 'due_soon': return <span style={{ color: '#d4af37', fontSize: '16px' }}>&#9888;</span>;
                default: return null;
              }
            };

            return (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                {pillarItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1 sm:gap-0"
                    style={{
                      padding: '12px 0',
                      borderBottom: idx < pillarItems.length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      {getStatusIcon(item.status)}
                      <span style={{
                        fontSize: '14px',
                        color: item.status !== 'current' ? '#ef4444' : '#334155',
                        fontWeight: item.status !== 'current' ? '600' : '400'
                      }}>
                        {item.label}
                      </span>
                    </div>
                    <div className="hidden sm:block" style={{ fontSize: '13px', color: '#64748b', width: '100px', textAlign: 'center', flexShrink: 0 }}>
                      {item.impact}
                    </div>
                    {item.action && item.actionLink ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(item.actionLink);
                        }}
                        className="w-auto sm:w-[160px] text-right flex-shrink-0"
                        style={{
                          fontSize: '13px',
                          color: '#1e4d6b',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        {item.action} &rarr;
                      </div>
                    ) : (
                      <div className="hidden sm:block" style={{ width: '160px', flexShrink: 0 }}></div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

        </div>
        {/* End of static top section (Compliance Score + Pillars) */}

        {/* Demo upgrade CTA — shows after visiting 2+ pages */}
        <DashboardUpgradeCard pagesVisited={parseInt(sessionStorage.getItem('evidly_demo_pages') || '0', 10)} />

        {/* K2C — Kitchen to Community widget */}
        {isDemoMode && (
          <div className="mt-4">
            <K2CWidget />
          </div>
        )}

        {/* Tab Navigation + Location Filter — stays in fixed position */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-3 sm:px-6 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex overflow-x-auto flex-1 -mx-1">
              {[
                { id: 'overview', label: t('dashboard.overview') },
                { id: 'progress', label: t('dashboard.todaysProgress') },
                { id: 'action', label: t('dashboard.actionCenter') },
                { id: 'history', label: t('dashboard.scoreHistory') },
                { id: 'vendors', label: t('dashboard.vendorServices') },
                { id: 'metrics', label: t('dashboard.keyMetrics') },
                { id: 'passport', label: t('dashboard.qrPassport') }
              ].map(tab => (
                <div key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? '2px solid #1e4d6b' : '2px solid transparent',
                  color: activeTab === tab.id ? '#1e4d6b' : '#64748b',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}>
                  {tab.label}
                </div>
              ))}
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => {
                const val = e.target.value;
                navigate(val === 'all' ? '/dashboard' : `/dashboard?location=${val}`);
              }}
              className="w-full sm:w-auto mb-2 sm:mb-0 flex-shrink-0"
              style={{
                padding: '8px 32px 8px 12px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#1e4d6b',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
                appearance: 'auto',
              }}
            >
              <option value="all">{t('common.allLocations')}</option>
              {locationDropdownOptions.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Content — only this section changes when switching tabs */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 mt-4" style={{ minHeight: '300px' }}>

          {/* Overview — All Locations (Enterprise Command Center) */}
          {activeTab === 'overview' && selectedLocation === 'all' && (
            <div className="mt-6 space-y-6">
              <h3 style={{ fontSize: '20px', fontWeight: '600' }}>{t('dashboard.overview')}</h3>
              <OnboardingChecklist />

              {/* ── Enterprise KPI Cards ── */}
              {resolvedLocations.length >= 2 && (() => {
                const avgScore = Math.round(resolvedLocations.reduce((sum, loc) => sum + (resolvedLocationScores[loc.urlId]?.overall ?? 0), 0) / resolvedLocations.length);
                const openIncidents = resolvedNeedsAttention.filter(item => item.color === 'red').length;
                const overdueVendors = resolvedVendors.filter(v => v.status === 'overdue').length;
                const avgGrade = getGrade(avgScore);
                const lowestLoc = resolvedLocations.reduce((min, loc) => {
                  const s = resolvedLocationScores[loc.urlId]?.overall ?? 100;
                  return s < (resolvedLocationScores[min.urlId]?.overall ?? 100) ? loc : min;
                }, resolvedLocations[0]);
                const lowestScore = resolvedLocationScores[lowestLoc.urlId]?.overall ?? 0;
                return (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
                          <ShieldAlert className="h-4 w-4" style={{ color: '#1e4d6b' }} />
                        </div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Score</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: avgGrade.hex }}>{avgScore}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{avgGrade.label}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
                          <Building2 className="h-4 w-4" style={{ color: '#1e4d6b' }} />
                        </div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Locations</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{resolvedLocations.length}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{resolvedLocations.filter(l => (resolvedLocationScores[l.urlId]?.overall ?? 0) >= 75).length} on track</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: openIncidents > 0 ? '#fef2f2' : '#f0fdf4' }}>
                          <AlertTriangle className="h-4 w-4" style={{ color: openIncidents > 0 ? '#ef4444' : '#22c55e' }} />
                        </div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Open Incidents</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: openIncidents > 0 ? '#ef4444' : '#22c55e' }}>{openIncidents}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{openIncidents > 0 ? 'Requires attention' : 'All clear'}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: overdueVendors > 0 ? '#fffbeb' : '#f0fdf4' }}>
                          <Wrench className="h-4 w-4" style={{ color: overdueVendors > 0 ? '#d97706' : '#22c55e' }} />
                        </div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Overdue Services</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: overdueVendors > 0 ? '#d97706' : '#22c55e' }}>{overdueVendors}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{overdueVendors > 0 ? `Lowest: ${lowestLoc.name} (${lowestScore})` : 'All current'}</div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Pillar Heatmap ── */}
              {resolvedLocations.length >= 2 && (
                <div>
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Compliance Heatmap</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <InfoTooltip text="Based on temperature logs, checklists, and food handler documentation">
                              <div className="flex items-center justify-center gap-1"><UtensilsCrossed className="h-3 w-3" /> Food Safety</div>
                            </InfoTooltip>
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <InfoTooltip text="Based on hood cleaning, fire suppression, and extinguisher records">
                              <div className="flex items-center justify-center gap-1"><Flame className="h-3 w-3" /> Fire Safety</div>
                            </InfoTooltip>
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <InfoTooltip text="Based on vendor certifications and service schedules">
                              <div className="flex items-center justify-center gap-1"><Truck className="h-3 w-3" /> Vendors</div>
                            </InfoTooltip>
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Overall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resolvedLocations.map((loc) => {
                          const locScores = resolvedLocationScores[loc.urlId];
                          const cellStyle = (score: number) => ({
                            backgroundColor: score >= 90 ? '#dcfce7' : score >= 75 ? '#fef9c3' : score >= 60 ? '#ffedd5' : '#fee2e2',
                            color: score >= 90 ? '#166534' : score >= 75 ? '#854d0e' : score >= 60 ? '#9a3412' : '#991b1b',
                          });
                          return (
                            <tr
                              key={loc.id}
                              onClick={() => navigate(`/dashboard?location=${loc.urlId}`)}
                              className="hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                            >
                              <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{loc.name}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={cellStyle(locScores.foodSafety)}>{locScores.foodSafety}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={cellStyle(locScores.fireSafety)}>{locScores.fireSafety}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={cellStyle(locScores.vendorCompliance)}>{locScores.vendorCompliance}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="inline-block px-2.5 py-0.5 rounded text-sm font-bold" style={cellStyle(locScores.overall)}>{locScores.overall}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Cross-Location Copilot Alerts ── */}
              {resolvedLocations.length >= 2 && (() => {
                const crossLocationAlerts = [
                  {
                    severity: 'high' as const,
                    title: 'University Dining score dropped below 60',
                    desc: 'Overall compliance fell to 56 — 3 critical items overdue across food safety and vendor compliance.',
                    location: 'University Dining',
                    link: '/dashboard?location=university',
                  },
                  {
                    severity: 'high' as const,
                    title: 'Hood cleaning overdue at Airport Cafe',
                    desc: '95 days since last cleaning. Fire code requires 90-day maximum cycle.',
                    location: 'Airport Cafe',
                    link: '/dashboard?location=airport',
                  },
                  {
                    severity: 'medium' as const,
                    title: 'Vendor compliance gap widening',
                    desc: '2 of 3 locations have overdue vendor services. Average vendor score: 71.',
                    location: 'All Locations',
                    link: '/vendors',
                  },
                ];
                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" style={{ color: '#d4af37' }} />
                        <h3 className="text-md font-semibold text-gray-900">Copilot Alerts</h3>
                      </div>
                      <button
                        onClick={() => navigate('/copilot')}
                        className="text-xs font-medium flex items-center gap-1 hover:underline"
                        style={{ color: '#1e4d6b' }}
                      >
                        Open Copilot <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {crossLocationAlerts.map((alert, i) => {
                        const sev = alert.severity === 'high'
                          ? { dot: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Critical' }
                          : { dot: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Warning' };
                        return (
                          <div
                            key={i}
                            onClick={() => navigate(alert.link)}
                            className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                            style={{ border: `1px solid ${sev.border}`, backgroundColor: sev.bg }}
                          >
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: sev.dot }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <span className="text-sm font-semibold text-gray-900">{alert.title}</span>
                                <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '6px', backgroundColor: sev.bg, color: sev.dot, border: `1px solid ${sev.border}` }}>
                                  {sev.label}
                                </span>
                                <span className="text-[10px] font-medium text-gray-400">{alert.location}</span>
                              </div>
                              <p className="text-xs text-gray-600">{alert.desc}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <h3 className="text-md font-semibold text-gray-900 mb-3">{t('common.location')}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'left' }}>{t('common.location')}</th>
                      <th className="px-3 sm:px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center' }}>{t('dashboard.complianceScore')}</th>
                      <th className="px-3 sm:px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center' }}>
                        <InfoTooltip text="Based on temperature logs, checklists, and food handler documentation">{t('dashboard.foodSafety')}</InfoTooltip>
                      </th>
                      <th className="hidden sm:table-cell px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center' }}>
                        <InfoTooltip text="Based on hood cleaning, fire suppression, and extinguisher records">{t('dashboard.fireSafety')}</InfoTooltip>
                      </th>
                      <th className="hidden sm:table-cell px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center' }}>
                        <InfoTooltip text="Based on vendor certifications and service schedules">{t('dashboard.vendorCompliance')}</InfoTooltip>
                      </th>
                      <th className="hidden sm:table-cell px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center' }}>
                        <InfoTooltip text="Score change compared to 30 days ago">{t('dashboard.trend')}</InfoTooltip>
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center', minWidth: '100px' }}>{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {resolvedLocations.map((loc) => {
                      const locScores = resolvedLocationScores[loc.urlId];
                      const locScoresThirtyDaysAgo = resolvedLocationScoresThirtyDaysAgo[loc.urlId];
                      const locTrend = getTrend(locScores.overall, locScoresThirtyDaysAgo.overall);
                      const grade = getGrade(locScores.overall);
                      return (
                        <tr
                          key={loc.id}
                          onClick={() => { navigate(`/dashboard?location=${loc.urlId}`); }}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap" style={{ textAlign: 'left' }}>
                            <div className="text-sm font-medium text-gray-900">{loc.name}</div>
                            {(() => {
                              const jur = DEMO_LOCATION_JURISDICTIONS.find(j => j.locationName === loc.name);
                              return jur ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[10px] text-gray-400 font-medium">{jur.county}, {jur.state}</span>
                                </div>
                              ) : null;
                            })()}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap" style={{ textAlign: 'center' }}>
                            <span className="text-sm font-bold" style={{ color: grade.hex }}>{locScores.overall}</span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap" style={{ textAlign: 'center' }}>
                            <span className="text-sm font-bold" style={{ color: getScoreHexColor(locScores.foodSafety) }}>{locScores.foodSafety}</span>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap" style={{ textAlign: 'center' }}>
                            <span className="text-sm font-bold" style={{ color: getScoreHexColor(locScores.fireSafety) }}>{locScores.fireSafety}</span>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap" style={{ textAlign: 'center' }}>
                            <span className="text-sm font-bold" style={{ color: getScoreHexColor(locScores.vendorCompliance) }}>{locScores.vendorCompliance}</span>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap" style={{ textAlign: 'center' }}>
                            <InfoTooltip text="Score change compared to 30 days ago">
                              <span className="text-sm font-semibold" style={{ color: locTrend.color }}>{locTrend.icon} {locTrend.diff}</span>
                            </InfoTooltip>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap" style={{ textAlign: 'center' }}>
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              grade.color === 'green' ? 'bg-green-100 text-green-800' : grade.color === 'blue' ? 'bg-blue-100 text-blue-800' : grade.color === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {grade.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <LiveActivityFeed />
            </div>
          )}

          {/* Overview — Specific Location */}
          {activeTab === 'overview' && selectedLocation !== 'all' && (
            <div className="mt-6">
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>{t('dashboard.overview')}</h3>
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.recentActivity')}</h3>
              </div>

              <div className="space-y-3">
                {resolvedActivity.map((activity, idx) => (
                  <div
                    key={idx}
                    onClick={() => { navigate(activity.url); }}
                    style={{ cursor: 'pointer', borderLeft: `2px solid ${activity.borderColor}` }}
                    className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors pl-3"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ backgroundColor: '#1e4d6b' }}
                    >
                      {activity.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.name}</span> {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { navigate('/alerts'); }}
                className="mt-4 w-full text-sm font-medium text-[#1e4d6b] hover:text-[#163a52] transition-colors duration-150"
              >
                {t('dashboard.viewAllActivity')}
              </button>
            </div>
          )}

          {/* Today's Progress — dynamically computed, All = sum of locations */}
          {activeTab === 'progress' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>{t('dashboard.todaysProgress')}</h3>
              <div onClick={() => navigate('/temp-logs')} style={{ marginBottom: '20px', cursor: 'pointer', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} className="hover:bg-gray-50 transition-colors">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>{t('nav.temperatures')}</span>
                  <span style={{ fontWeight: '500', color: '#475569' }}>{progress.tempDone}/{progress.tempTotal}</span>
                </div>
                <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '10px', borderRadius: '5px', width: `${tempPct}%`, backgroundColor: pctColor(tempPct), transition: 'width 0.5s ease' }}></div>
                </div>
              </div>
              <div onClick={() => navigate('/checklists')} style={{ marginBottom: '20px', cursor: 'pointer', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} className="hover:bg-gray-50 transition-colors">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>{t('nav.checklists')}</span>
                  <span style={{ fontWeight: '500', color: '#475569' }}>{progress.checkDone}/{progress.checkTotal}</span>
                </div>
                <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '10px', borderRadius: '5px', width: `${checkPct}%`, backgroundColor: pctColor(checkPct), transition: 'width 0.5s ease' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Action Center */}
          {activeTab === 'action' && (() => {
            const selectedLocationObj = resolvedLocations.find(loc => loc.urlId === selectedLocation);
            const locationFilteredItems = selectedLocation === 'all'
              ? resolvedNeedsAttention
              : resolvedNeedsAttention.filter(item => item.locationId === selectedLocationObj?.id);
            const allActionItems = locationFilteredItems.map(item => ({
              priority: item.color === 'red' ? 'high' as const : item.color === 'amber' ? 'medium' as const : 'low' as const,
              pillar: (() => {
                if (item.url === '/temp-logs' || item.url === '/checklists' || item.url === '/haccp') return 'Food Safety';
                if (item.url === '/vendors') return 'Fire Safety';
                return 'Vendor Compliance';
              })(),
              title: item.title,
              desc: item.detail,
              link: item.url,
            }));
            const filteredItems = pillarFilter ? allActionItems.filter(item => item.pillar === pillarFilter) : allActionItems;
            const pillarCounts: Record<string, number> = { 'Food Safety': 0, 'Fire Safety': 0, 'Vendor Compliance': 0 };
            allActionItems.forEach(item => { if (pillarCounts[item.pillar] !== undefined) pillarCounts[item.pillar]++; });

            return (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>{t('dashboard.actionCenter')}</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {[
                    { key: null, label: t('common.all'), count: allActionItems.length },
                    { key: 'Food Safety', label: t('dashboard.foodSafety'), count: pillarCounts['Food Safety'] },
                    { key: 'Fire Safety', label: t('dashboard.fireSafety'), count: pillarCounts['Fire Safety'] },
                    { key: 'Vendor Compliance', label: t('dashboard.vendorCompliance'), count: pillarCounts['Vendor Compliance'] },
                  ].map(chip => (
                    <button
                      key={chip.label}
                      onClick={() => setPillarFilter(chip.key)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: pillarFilter === chip.key ? '2px solid #1e4d6b' : '1px solid #d1d5db',
                        backgroundColor: pillarFilter === chip.key ? '#1e4d6b' : 'white',
                        color: pillarFilter === chip.key ? 'white' : '#475569',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {chip.label} ({chip.count})
                    </button>
                  ))}
                </div>
                {filteredItems.map((item, i) => {
                  const priorityStyles = {
                    high: { dot: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: t('dashboard.urgent') },
                    medium: { dot: '#d4af37', bg: '#fffbeb', border: '#fef3c7', label: t('dashboard.soon') },
                    low: { dot: '#1e4d6b', bg: '#eff6ff', border: '#dbeafe', label: t('dashboard.info') },
                  };
                  const ps = priorityStyles[item.priority];
                  return (
                    <div key={i} onClick={() => { navigate(item.link) }} className="flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2 sm:gap-3 p-3 cursor-pointer rounded-lg hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: ps.dot, flexShrink: 0, marginTop: '6px' }}></div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#1e293b' }}>{item.title}</div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>{item.desc}</div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="hidden sm:inline" style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>{item.pillar}</span>
                        <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', backgroundColor: ps.bg, color: ps.dot, border: `1px solid ${ps.border}` }}>{ps.label}</span>
                        <span style={{ color: '#94a3b8', fontSize: '18px' }}>&rsaquo;</span>
                      </div>
                    </div>
                  );
                })}
                {filteredItems.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>{t('dashboard.noActionItems')}</div>
                )}
              </div>
            );
          })()}

          {/* Vendor Services */}
          {activeTab === 'vendors' && (() => {
            const selectedLocationObj = resolvedLocations.find(loc => loc.urlId === selectedLocation);
            const filteredVendors = selectedLocation === 'all'
              ? resolvedVendors
              : resolvedVendors.filter(v => v.locationId === selectedLocationObj?.id);
            const locationMap: Record<string, string> = {};
            resolvedLocations.forEach(l => { locationMap[l.id] = l.name; });
            const statusColor = (s: string) => s === 'overdue' ? '#ef4444' : s === 'upcoming' ? '#d4af37' : '#22c55e';
            const statusLabel = (s: string) => s === 'overdue' ? t('common.overdue') : s === 'upcoming' ? t('dashboard.dueSoon') : t('dashboard.onTrack');
            const formatDate = (d: string) => { const dt = new Date(d); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
            return (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>{t('dashboard.vendorServices')}</h3>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('dashboard.vendor')}</th>
                      <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('dashboard.service')}</th>
                      {selectedLocation === 'all' && <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('common.location')}</th>}
                      <th style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('dashboard.lastService')}</th>
                      <th style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('dashboard.nextDue')}</th>
                      <th style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((v) => (
                      <tr key={v.id} onClick={() => { navigate('/vendors') }} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} className="hover:bg-gray-50 transition-colors">
                        <td style={{ padding: '12px 10px', fontWeight: '500', color: '#1e293b' }}>{v.companyName}</td>
                        <td style={{ padding: '12px 10px', color: '#475569' }}>{v.serviceType}</td>
                        {selectedLocation === 'all' && <td style={{ padding: '12px 10px', color: '#475569', fontSize: '13px' }}>{locationMap[v.locationId] || ''}</td>}
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#475569' }}>{formatDate(v.lastService)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#475569' }}>{formatDate(v.nextDue)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: statusColor(v.status), border: '1px solid ' + statusColor(v.status) }}>{statusLabel(v.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })()}

          {/* Score History */}
          {activeTab === 'history' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>{t('dashboard.scoreHistory')}</h3>
              <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>{t('dashboard.weekTrend')}</p>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  {selectedLocation === 'all' ? (
                    <LineChart data={historicalData.downtown.map((item, i) => ({
                      date: item.date,
                      [t('dashboard.average')]: Math.round((item.score + historicalData.airport[i].score + historicalData.university[i].score) / 3),
                      Downtown: item.score,
                      Airport: historicalData.airport[i].score,
                      University: historicalData.university[i].score,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '90', position: 'right', fontSize: 11 }} />
                      <ReferenceLine y={75} stroke="#eab308" strokeDasharray="3 3" label={{ value: '75', position: 'right', fontSize: 11 }} />
                      <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '60', position: 'right', fontSize: 11 }} />
                      <Line type="monotone" dataKey={t('dashboard.average')} stroke="#1e4d6b" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Downtown" stroke="#22c55e" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="Airport" stroke="#d4af37" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="University" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
                    </LineChart>
                  ) : (
                    <LineChart data={historicalData[selectedLocation as keyof typeof historicalData] || historicalData.downtown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip />
                      <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '90', position: 'right', fontSize: 11 }} />
                      <ReferenceLine y={75} stroke="#eab308" strokeDasharray="3 3" label={{ value: '75', position: 'right', fontSize: 11 }} />
                      <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '60', position: 'right', fontSize: 11 }} />
                      <Line type="monotone" dataKey="score" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 3 }} name={t('dashboard.complianceScore')} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          {activeTab === 'metrics' && (() => {
            const metricsPerLocation: Record<string, { hoursSaved: number; moneySaved: number; logsCompleted: number; docsStored: number }> = {
              downtown: { hoursSaved: 38, moneySaved: 1330, logsCompleted: 144, docsStored: 21 },
              airport: { hoursSaved: 28, moneySaved: 980, logsCompleted: 102, docsStored: 15 },
              university: { hoursSaved: 20, moneySaved: 700, logsCompleted: 66, docsStored: 11 },
            };
            // All = sum: 38+28+20=86, 1330+980+700=3010, 144+102+66=312, 21+15+11=47
            const m = selectedLocation === 'all'
              ? { hoursSaved: 86, moneySaved: 3010, logsCompleted: 312, docsStored: 47 }
              : metricsPerLocation[selectedLocation] || { hoursSaved: 86, moneySaved: 3010, logsCompleted: 312, docsStored: 47 };
            return (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>{t('dashboard.keyMetrics')}</h3>
              <TimeSavedCounter
                hoursSaved={m.hoursSaved}
                moneySaved={m.moneySaved}
                logsCompleted={m.logsCompleted}
                docsStored={m.docsStored}
              />
            </div>
            );
          })()}

          {/* QR Passport */}
          {activeTab === 'passport' && (() => {
            const allQrLocations = resolvedLocations.map(loc => {
              const locScore = resolvedLocationScores[loc.urlId];
              const score = locScore?.overall ?? 0;
              return {
                id: loc.urlId,
                name: loc.name,
                address: loc.address || '',
                score,
                color: getGrade(score).hex,
              };
            });
            const qrLocations = selectedLocation === 'all' ? allQrLocations : allQrLocations.filter(l => l.id === selectedLocation);
            return (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>{t('dashboard.qrCompliancePassport')}</h3>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {qrLocations.map((loc, i) => (
                  <div key={i} className="p-4 sm:p-6" style={{ flex: '1 1 250px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px', color: '#1e293b' }}>{loc.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>{loc.address}</div>
                    <div style={{ margin: '0 auto 16px', display: 'flex', justifyContent: 'center' }}>
                      <QRCodeSVG value={`https://evidly-app.vercel.app/passport/${loc.id}`} size={150} level="M" />
                    </div>
                    <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', color: loc.color, border: '2px solid ' + loc.color }}>{loc.score}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
                      <button onClick={() => window.print()} className="bg-[#1e4d6b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#163a52] transition-colors duration-150">{t('common.print')}</button>
                      <button onClick={() => navigate(`/passport/${loc.id}`)} className="bg-white text-[#1e4d6b] border border-[#1e4d6b] px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors duration-150">{t('dashboard.viewPassport')}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            );
          })()}
        </div>
          </>
        )}

        {/* AI Insights Widget */}
        {['executive', 'management'].includes(userRole) && (
          <ErrorBoundary level="section">
          <FeatureGate featureId="ai-predictive-insights">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fdf8e8' }}>
                  <Brain className="h-5 w-5" style={{ color: '#d4af37' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
                  <p className="text-xs text-gray-500">Predictive alerts from compliance analysis</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/analysis')}
                className="text-sm font-medium flex items-center gap-1 hover:underline"
                style={{ color: '#1e4d6b' }}
              >
                See All Insights <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { severity: 'high' as const, title: 'Hood Cleaning Overdue — Airport Cafe', desc: '95 days since last cleaning. 90-day cycle exceeded.', link: '/vendors' },
                { severity: 'high' as const, title: 'Walk-in Cooler Temp Trending Up — University Dining', desc: '3 readings above 38°F this week. Upward trend over 7 days.', link: '/temp-logs' },
                { severity: 'medium' as const, title: 'Checklist Completion Dropped 12% — University Dining', desc: 'Weekly completion rate fell from 89% to 78%.', link: '/checklists' },
              ].map((alert, i) => {
                const sevStyles = alert.severity === 'high'
                  ? { dot: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Critical' }
                  : { dot: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Warning' };
                return (
                  <div
                    key={i}
                    onClick={() => navigate(alert.link)}
                    className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ border: `1px solid ${sevStyles.border}`, backgroundColor: sevStyles.bg }}
                  >
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: sevStyles.dot }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900 break-words">{alert.title}</span>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '6px', backgroundColor: sevStyles.bg, color: sevStyles.dot, border: `1px solid ${sevStyles.border}`, flexShrink: 0 }}>
                          {sevStyles.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{alert.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
          </FeatureGate>
          </ErrorBoundary>
        )}

        {/* Compliance Copilot Card */}
        {['executive', 'management'].includes(userRole) && (
          <ErrorBoundary level="section">
            <div className="mt-4">
              <CopilotCard locationId={selectedLocation === 'all' ? 'all' : selectedLocation} />
            </div>
          </ErrorBoundary>
        )}

        {/* Industry Benchmark Widget */}
        {['executive', 'management'].includes(userRole) && (
          <ErrorBoundary level="section">
            <FeatureGate featureId="industry-benchmarks">
              <div className="mt-4">
                <BenchmarkWidget locationId={selectedLocation === 'all' ? 'all' : selectedLocation} />
              </div>
            </FeatureGate>
          </ErrorBoundary>
        )}

        {/* Insurance Risk Score Widget */}
        {['executive', 'management'].includes(userRole) && (
          <ErrorBoundary level="section">
            <FeatureGate featureId="insurance-risk-score">
              <div className="mt-4">
                <InsuranceReadinessWidget locationId={selectedLocation === 'all' ? 'all' : selectedLocation} />
              </div>
            </FeatureGate>
          </ErrorBoundary>
        )}

        {/* Equipment Health Widget */}
        {['executive', 'management', 'facilities'].includes(userRole) && (
          <ErrorBoundary level="section">
            <div className="mt-4">
              <EquipmentHealthWidget locationId={selectedLocation === 'all' ? 'all' : selectedLocation} />
            </div>
          </ErrorBoundary>
        )}

        {/* Live Sensor Monitor Widget */}
        {['executive', 'management', 'kitchen'].includes(userRole) && (
          <ErrorBoundary level="section">
            <div className="mt-4">
              <SensorMonitorWidget locationFilter={selectedLocation === 'all' ? 'all' : selectedLocation} />
            </div>
          </ErrorBoundary>
        )}

        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          documentType="compliance"
        />
      </div>
    </>
  );
}
