import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RoleProvider } from './contexts/RoleContext';
import { OperatingHoursProvider } from './contexts/OperatingHoursContext';
import { DemoProvider, useDemo } from './contexts/DemoContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { InactivityProvider } from './contexts/InactivityContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EnvBadge } from './components/ui/EnvBadge';
import { reportError } from './lib/errorReporting';

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const SignupLocations = lazy(() => import('./pages/SignupLocations').then(m => ({ default: m.SignupLocations })));
const VendorLogin = lazy(() => import('./pages/VendorLogin').then(m => ({ default: m.VendorLogin })));
const VendorRegister = lazy(() => import('./pages/VendorRegister').then(m => ({ default: m.VendorRegister })));
const VendorDashboard = lazy(() => import('./pages/VendorDashboard').then(m => ({ default: m.VendorDashboard })));
const VendorSecureUpload = lazy(() => import('./pages/VendorSecureUpload').then(m => ({ default: m.VendorSecureUpload })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const EmailConfirmed = lazy(() => import('./pages/EmailConfirmed').then(m => ({ default: m.EmailConfirmed })));
const DemoWizard = lazy(() => import('./pages/DemoWizard').then(m => ({ default: m.DemoWizard })));
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const TempLogs = lazy(() => import('./pages/TempLogs').then(m => ({ default: m.TempLogs })));
const Checklists = lazy(() => import('./pages/Checklists').then(m => ({ default: m.Checklists })));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const Vendors = lazy(() => import('./pages/Vendors').then(m => ({ default: m.Vendors })));
const VendorDetail = lazy(() => import('./pages/VendorDetail'));
const HACCP = lazy(() => import('./pages/HACCP').then(m => ({ default: m.HACCP })));
const Alerts = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })));
const AIAdvisor = lazy(() => import('./pages/AIAdvisor').then(m => ({ default: m.AIAdvisor })));
const Leaderboard = lazy(() => import('./pages/Leaderboard').then(m => ({ default: m.Leaderboard })));
const Analysis = lazy(() => import('./pages/Analysis').then(m => ({ default: m.Analysis })));
const Team = lazy(() => import('./pages/Team').then(m => ({ default: m.Team })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const InviteAccept = lazy(() => import('./pages/InviteAccept').then(m => ({ default: m.InviteAccept })));
const AdminClientOnboarding = lazy(() => import('./pages/AdminClientOnboarding').then(m => ({ default: m.AdminClientOnboarding })));
const Help = lazy(() => import('./pages/HelpSupport').then(m => ({ default: m.HelpSupport })));
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const UsageAnalytics = lazy(() => import('./pages/UsageAnalytics').then(m => ({ default: m.UsageAnalytics })));
const WeeklyDigest = lazy(() => import('./pages/WeeklyDigest').then(m => ({ default: m.WeeklyDigest })));
const IncidentLog = lazy(() => import('./pages/IncidentLog').then(m => ({ default: m.IncidentLog })));
const AuditReport = lazy(() => import('./pages/AuditReport').then(m => ({ default: m.AuditReport })));
const FacilitySafety = lazy(() => import('./pages/FacilitySafety').then(m => ({ default: m.FacilitySafety })));
const Equipment = lazy(() => import('./pages/Equipment').then(m => ({ default: m.Equipment })));
const EquipmentDetail = lazy(() => import('./pages/EquipmentDetail').then(m => ({ default: m.EquipmentDetail })));
const ServiceRecordEntry = lazy(() => import('./pages/ServiceRecordEntry').then(m => ({ default: m.ServiceRecordEntry })));
const RegulatoryAlerts = lazy(() => import('./pages/RegulatoryAlerts').then(m => ({ default: m.RegulatoryAlerts })));
const JurisdictionSettings = lazy(() => import('./pages/JurisdictionSettings').then(m => ({ default: m.JurisdictionSettings })));
const HealthDeptReport = lazy(() => import('./pages/HealthDeptReport').then(m => ({ default: m.HealthDeptReport })));
const ScoringBreakdown = lazy(() => import('./pages/ScoringBreakdown').then(m => ({ default: m.ScoringBreakdown })));
const Benchmarks = lazy(() => import('./pages/Benchmarks').then(m => ({ default: m.Benchmarks })));
const ComplianceIndex = lazy(() => import('./pages/ComplianceIndex').then(m => ({ default: m.ComplianceIndex })));
const InsuranceRisk = lazy(() => import('./pages/InsuranceRisk').then(m => ({ default: m.InsuranceRisk })));
const InsuranceRiskShared = lazy(() => import('./pages/InsuranceRiskShared'));
const ImproveScore = lazy(() => import('./pages/ImproveScore').then(m => ({ default: m.ImproveScore })));
const InsuranceSettings = lazy(() => import('./pages/InsuranceSettings').then(m => ({ default: m.InsuranceSettings })));
const CarrierPartnership = lazy(() => import('./pages/CarrierPartnership').then(m => ({ default: m.CarrierPartnership })));
const VendorMarketplace = lazy(() => import('./pages/VendorMarketplace').then(m => ({ default: m.VendorMarketplace })));
const VendorProfile = lazy(() => import('./pages/VendorProfile').then(m => ({ default: m.VendorProfile })));
const MarketplaceLanding = lazy(() => import('./pages/MarketplaceLanding').then(m => ({ default: m.MarketplaceLanding })));
const PublicVerification = lazy(() => import('./pages/PublicVerification'));
const PassportDemo = lazy(() => import('./pages/PassportDemo'));
const Passport = lazy(() => import('./pages/Passport'));
const OrgHierarchy = lazy(() => import('./pages/OrgHierarchy').then(m => ({ default: m.OrgHierarchy })));
const EnterpriseDashboard = lazy(() => import('./pages/EnterpriseDashboard').then(m => ({ default: m.EnterpriseDashboard })));
const EnterpriseLanding = lazy(() => import('./pages/EnterpriseLanding').then(m => ({ default: m.EnterpriseLanding })));
const EnterpriseExecutive = lazy(() => import('./pages/EnterpriseExecutive').then(m => ({ default: m.EnterpriseExecutive })));
const ComplianceIntelligence = lazy(() => import('./pages/ComplianceIntelligence').then(m => ({ default: m.ComplianceIntelligence })));
const BusinessIntelligence = lazy(() => import('./pages/CorporateIntelligence').then(m => ({ default: m.BusinessIntelligence })));
const IntelligenceHub = lazy(() => import('./pages/IntelligenceHub').then(m => ({ default: m.IntelligenceHub })));
const RegulatoryUpdates = lazy(() => import('./pages/RegulatoryUpdates').then(m => ({ default: m.RegulatoryUpdates })));
const IoTSensorHub = lazy(() => import('./pages/IoTSensorHub').then(m => ({ default: m.IoTSensorHub })));
const IoTSensorLanding = lazy(() => import('./pages/IoTSensorLanding').then(m => ({ default: m.IoTSensorLanding })));
const SensorHub = lazy(() => import('./pages/SensorHub').then(m => ({ default: m.SensorHub })));
const SensorSetupWizard = lazy(() => import('./pages/SensorSetupWizard').then(m => ({ default: m.SensorSetupWizard })));
const SensorDetail = lazy(() => import('./pages/SensorDetail').then(m => ({ default: m.SensorDetail })));
const IoTSensorPlatform = lazy(() => import('./pages/IoTSensorPlatform').then(m => ({ default: m.IoTSensorPlatform })));

const CorrectiveActions = lazy(() => import('./pages/CorrectiveActions').then(m => ({ default: m.CorrectiveActions })));
const IntegrationHub = lazy(() => import('./pages/IntegrationHub').then(m => ({ default: m.IntegrationHub })));
const BrandingSettings = lazy(() => import('./pages/BrandingSettings').then(m => ({ default: m.BrandingSettings })));
const DeveloperPortal = lazy(() => import('./pages/DeveloperPortal').then(m => ({ default: m.DeveloperPortal })));
const TrainingHub = lazy(() => import('./pages/TrainingHub').then(m => ({ default: m.TrainingHub })));
const TrainingCourse = lazy(() => import('./pages/TrainingCourse').then(m => ({ default: m.TrainingCourse })));
const CourseBuilder = lazy(() => import('./pages/CourseBuilder').then(m => ({ default: m.CourseBuilder })));
const CertificateViewer = lazy(() => import('./pages/CertificateViewer').then(m => ({ default: m.CertificateViewer })));
const EmployeeCertDetail = lazy(() => import('./pages/EmployeeCertDetail').then(m => ({ default: m.EmployeeCertDetail })));
const IncidentPlaybooks = lazy(() => import('./pages/IncidentPlaybooks').then(m => ({ default: m.IncidentPlaybooks })));
const PlaybookRunner = lazy(() => import('./pages/PlaybookRunner').then(m => ({ default: m.PlaybookRunner })));
const PlaybookBuilder = lazy(() => import('./pages/PlaybookBuilder').then(m => ({ default: m.PlaybookBuilder })));
const PlaybookAnalytics = lazy(() => import('./pages/PlaybookAnalytics').then(m => ({ default: m.PlaybookAnalytics })));
const PlaybookTimeline = lazy(() => import('./pages/PlaybookTimeline').then(m => ({ default: m.PlaybookTimeline })));
const ImportData = lazy(() => import('./pages/ImportData').then(m => ({ default: m.ImportData })));
const InspectorView = lazy(() => import('./pages/InspectorView').then(m => ({ default: m.InspectorView })));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const SelfAudit = lazy(() => import('./pages/SelfAudit').then(m => ({ default: m.SelfAudit })));
const PhotoEvidencePage = lazy(() => import('./pages/PhotoEvidencePage').then(m => ({ default: m.PhotoEvidencePage })));
const AuditTrail = lazy(() => import('./pages/AuditTrail').then(m => ({ default: m.AuditTrail })));
const DocumentChecklist = lazy(() => import('./pages/DocumentChecklist').then(m => ({ default: m.DocumentChecklist })));
const CopilotInsights = lazy(() => import('./pages/CopilotInsights').then(m => ({ default: m.CopilotInsights })));
const AdminRegulatoryChanges = lazy(() => import('./pages/AdminRegulatoryChanges').then(m => ({ default: m.AdminRegulatoryChanges })));
const AdminIntelligenceQueue = lazy(() => import('./pages/AdminIntelligenceQueue'));
const CommandCenter = lazy(() => import('./pages/admin/CommandCenter'));
const RfpIntelligence = lazy(() => import('./pages/admin/RfpIntelligence'));
const EdgeFunctions = lazy(() => import('./pages/admin/system/EdgeFunctions'));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then(m => ({ default: m.AuthCallback })));
const ReferralDashboard = lazy(() => import('./pages/ReferralDashboard').then(m => ({ default: m.ReferralDashboard })));
const ReferralRedirect = lazy(() => import('./pages/ReferralRedirect'));
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TempLogQuick = lazy(() => import('./pages/TempLogQuick').then(m => ({ default: m.TempLogQuick })));
const TempLogScan = lazy(() => import('./pages/TempLogScan').then(m => ({ default: m.TempLogScan })));
const IoTMonitoring = lazy(() => import('./pages/IoTMonitoring'));
const SelfDiagnosis = lazy(() => import('./pages/SelfDiagnosis').then(m => ({ default: m.SelfDiagnosis })));
const RolesPermissions = lazy(() => import('./pages/RolesPermissions').then(m => ({ default: m.RolesPermissions })));
const CaliforniaCompliance = lazy(() => import('./pages/public/CaliforniaCompliance').then(m => ({ default: m.CaliforniaCompliance })));
const CountyCompliance = lazy(() => import('./pages/public/CountyCompliance').then(m => ({ default: m.CountyCompliance })));
const AssessmentTool = lazy(() => import('./pages/public/AssessmentTool').then(m => ({ default: m.AssessmentTool })));
const AssessmentLeads = lazy(() => import('./pages/admin/AssessmentLeads'));

import Navigation from './components/Navigation';
import Hero from './components/Hero';
import DailyOperations from './components/DailyOperations';
import Features from './components/Features';
import BeforeAfter from './components/BeforeAfter';
import QRFeature from './components/QRFeature';
import Pricing from './components/Pricing';
import AllFeatures from './components/AllFeatures';
import Trust from './components/Trust';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';
import MobileStickyBar from './components/MobileStickyBar';
import AIChatWidget from './components/landing/AIChatWidget';
import AppInstallSection from './components/landing/AppInstallSection';
import WebinarSection from './components/landing/WebinarSection';
import MobileInstallBanner from './components/landing/MobileInstallBanner';
import { CookieConsent } from './components/CookieConsent';
import { usePageTracking } from './hooks/usePageTracking';

const DemoBookingBanner = lazy(() => import('./components/landing/DemoBookingBanner'));
import { PageSkeleton } from './components/LoadingSkeleton';
import { Layout } from './components/layout/Layout';
import { PageTransition } from './components/PageTransition';
import { PageExplanation } from './components/PageExplanation';
import { AutoBreadcrumb } from './components/layout/AutoBreadcrumb';
import { useRole } from './contexts/RoleContext';
import { isRouteAllowedForRole } from './lib/routeGuards';
import type { UserRole } from './contexts/RoleContext';

/** Map a database user_profiles.role string to the demo UserRole enum.
 *  Authenticated users use this instead of the demo RoleContext. */
function dbRoleToUserRole(dbRole: string | undefined | null): UserRole {
  const MAP: Record<string, UserRole> = {
    platform_admin: 'platform_admin',
    admin: 'owner_operator',
    owner: 'owner_operator',
    owner_operator: 'owner_operator',
    executive: 'executive',
    compliance_manager: 'compliance_manager',
    chef: 'chef',
    facilities_manager: 'facilities_manager',
    kitchen_manager: 'kitchen_manager',
    kitchen_staff: 'kitchen_staff',
  };
  return MAP[dbRole || ''] || 'owner_operator';
}

function LandingPage() {
  return (
    <div className="min-h-screen">
      <MobileInstallBanner />
      <Navigation />
      <Hero />
      <DailyOperations />
      <Features />
      <BeforeAfter />
      <QRFeature />
      <AllFeatures />
      <AppInstallSection />
      <Pricing />
      <WebinarSection />
      <Trust />
      <FinalCTA />
      <Footer />
      <MobileStickyBar />
      <AIChatWidget />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  const location = useLocation();

  if (isDemoMode) {
    if (!isRouteAllowedForRole(location.pathname, userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated users: EvidlyAdmin bypasses route guards; others use DB role
  if (!isEvidlyAdmin) {
    const effectiveRole = dbRoleToUserRole(profile?.role);
    if (!isRouteAllowedForRole(location.pathname, effectiveRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function ProtectedLayout() {
  const { user, profile, loading, isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  const location = useLocation();

  if (!isDemoMode) {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }
    if (!user) {
      return <Navigate to="/login" replace />;
    }
  }

  // Role-based route guard — redirect to dashboard if role not allowed
  // Authenticated users: EvidlyAdmin bypasses guards; others use DB profile role
  if (isDemoMode) {
    if (!isRouteAllowedForRole(location.pathname, userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  } else if (!isEvidlyAdmin) {
    const effectiveRole = dbRoleToUserRole(profile?.role);
    if (!isRouteAllowedForRole(location.pathname, effectiveRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <Layout>
      <ErrorBoundary level="page" resetKey={location.pathname}>
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37] mx-auto"></div>
              <p className="mt-3 text-sm text-gray-500">Loading...</p>
            </div>
          </div>
        }>
          <PageTransition key={location.pathname}>
            <AutoBreadcrumb />
            <PageExplanation />
            <Outlet />
          </PageTransition>
        </Suspense>
      </ErrorBoundary>
      {isDemoMode && (
        <Suspense fallback={null}>
          <DemoBookingBanner />
        </Suspense>
      )}
      <EnvBadge />
    </Layout>
  );
}

function AppRoutes() {
  usePageTracking();

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Public routes */}
        <Route path="/verify/:code" element={<Suspense fallback={<PageSkeleton />}><PublicVerification /></Suspense>} />
        <Route path="/ref/:code" element={<Suspense fallback={<PageSkeleton />}><ReferralRedirect /></Suspense>} />
        <Route path="/risk/:shareToken" element={<Suspense fallback={<PageSkeleton />}><InsuranceRiskShared /></Suspense>} />
        <Route path="/passport/demo" element={<Suspense fallback={<PageSkeleton />}><PassportDemo /></Suspense>} />
        <Route path="/passport/:id" element={<Suspense fallback={<PageSkeleton />}><Passport /></Suspense>} />
        <Route path="/partners/insurance" element={<Suspense fallback={<PageSkeleton />}><CarrierPartnership /></Suspense>} />
        <Route path="/providers" element={<Suspense fallback={<PageSkeleton />}><MarketplaceLanding /></Suspense>} />
        <Route path="/enterprise" element={<Suspense fallback={<PageSkeleton />}><EnterpriseLanding /></Suspense>} />
        <Route path="/iot" element={<Suspense fallback={<PageSkeleton />}><IoTSensorLanding /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<PageSkeleton />}><TermsOfService /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<PageSkeleton />}><PrivacyPolicy /></Suspense>} />
        <Route path="/compliance/california" element={<Suspense fallback={<PageSkeleton />}><CaliforniaCompliance /></Suspense>} />
        <Route path="/compliance/california/:countySlug" element={<Suspense fallback={<PageSkeleton />}><CountyCompliance /></Suspense>} />
        <Route path="/assessment" element={<Suspense fallback={<PageSkeleton />}><AssessmentTool /></Suspense>} />
        <Route path="/temp/log" element={<Suspense fallback={<PageSkeleton />}><TempLogQuick /></Suspense>} />
        <Route path="/temp-logs/scan" element={<Suspense fallback={<PageSkeleton />}><TempLogScan /></Suspense>} />
        <Route path="/login" element={<PublicRoute><Suspense fallback={<PageSkeleton />}><Login /></Suspense></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Suspense fallback={<PageSkeleton />}><Signup /></Suspense></PublicRoute>} />
        <Route path="/signup/locations" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><SignupLocations /></Suspense></ProtectedRoute>} />
        <Route path="/invite/:token" element={<Suspense fallback={<PageSkeleton />}><InviteAccept /></Suspense>} />
        <Route path="/forgot-password" element={<PublicRoute><Suspense fallback={<PageSkeleton />}><ForgotPassword /></Suspense></PublicRoute>} />
        <Route path="/reset-password" element={<Suspense fallback={<PageSkeleton />}><ResetPassword /></Suspense>} />
        <Route path="/email-confirmed" element={<Suspense fallback={<PageSkeleton />}><EmailConfirmed /></Suspense>} />
        <Route path="/demo" element={<Suspense fallback={<PageSkeleton />}><DemoWizard /></Suspense>} />
        <Route path="/auth/callback" element={<Suspense fallback={<PageSkeleton />}><AuthCallback /></Suspense>} />
        <Route path="/vendor/login" element={<Suspense fallback={<PageSkeleton />}><VendorLogin /></Suspense>} />
        <Route path="/vendor/register" element={<Suspense fallback={<PageSkeleton />}><VendorRegister /></Suspense>} />
        <Route path="/vendor/upload/:token" element={<Suspense fallback={<PageSkeleton />}><VendorSecureUpload /></Suspense>} />

        {/* Protected routes without shared layout */}
        <Route path="/vendor/dashboard" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><VendorDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/enterprise/admin" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><EnterpriseDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/enterprise/dashboard" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><EnterpriseExecutive /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/enterprise/intelligence" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><ComplianceIntelligence /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/business-intelligence" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><BusinessIntelligence /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/iot/hub" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><IoTSensorHub /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><Onboarding /></Suspense></ErrorBoundary></ProtectedRoute>} />

        {/* Protected routes with shared layout — sidebar/topbar stay mounted */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/temp-logs" element={<TempLogs />} />
          <Route path="/iot-monitoring" element={<IoTMonitoring />} />
          <Route path="/checklists" element={<Checklists />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/document-checklist" element={<DocumentChecklist />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/vendors/:vendorId" element={<VendorDetail />} />
          <Route path="/marketplace" element={<VendorMarketplace />} />
          <Route path="/marketplace/:vendorSlug" element={<VendorProfile />} />
          <Route path="/haccp" element={<HACCP />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/incidents" element={<IncidentLog />} />
          <Route path="/ai-advisor" element={<AIAdvisor />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/referrals" element={<ReferralDashboard />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/team" element={<Team />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/branding" element={<BrandingSettings />} />
          <Route path="/settings/sensors" element={<IoTSensorHub />} />
          <Route path="/settings/roles-permissions" element={<RolesPermissions />} />
          <Route path="/import" element={<ImportData />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/help" element={<Help />} />
          <Route path="/weekly-digest" element={<WeeklyDigest />} />
          <Route path="/audit-report" element={<AuditReport />} />
          <Route path="/facility-safety" element={<FacilitySafety />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/equipment/:equipmentId" element={<EquipmentDetail />} />
          <Route path="/equipment/:equipmentId/service/new" element={<ServiceRecordEntry />} />
          <Route path="/regulatory-alerts" element={<RegulatoryAlerts />} />
          <Route path="/jurisdiction" element={<JurisdictionSettings />} />
          <Route path="/health-dept-report" element={<HealthDeptReport />} />
          <Route path="/scoring-breakdown" element={<ScoringBreakdown />} />
          <Route path="/benchmarks" element={<Benchmarks />} />
          <Route path="/org-hierarchy" element={<OrgHierarchy />} />
          <Route path="/compliance-index" element={<ComplianceIndex />} />
          <Route path="/insurance-risk" element={<InsuranceRisk />} />
          <Route path="/improve-score" element={<ImproveScore />} />
          <Route path="/insurance-settings" element={<InsuranceSettings />} />
          <Route path="/admin/onboard-client" element={<AdminClientOnboarding />} />
          <Route path="/admin/usage-analytics" element={<UsageAnalytics />} />
          <Route path="/iot-platform" element={<IoTSensorPlatform />} />
          <Route path="/sensors" element={<SensorHub />} />
          <Route path="/sensors/add" element={<SensorSetupWizard />} />
          <Route path="/sensors/:id" element={<SensorDetail />} />
          <Route path="/integrations" element={<IntegrationHub />} />
          <Route path="/settings/integrations" element={<IntegrationHub />} />
          <Route path="/settings/api-keys" element={<IntegrationHub />} />
          <Route path="/settings/webhooks" element={<IntegrationHub />} />
          <Route path="/developers" element={<DeveloperPortal />} />
          <Route path="/training" element={<TrainingHub />} />
          <Route path="/training/course/:id" element={<TrainingCourse />} />
          <Route path="/training/courses/builder" element={<CourseBuilder />} />
          <Route path="/training/certificates" element={<CertificateViewer />} />
          <Route path="/training/employee/:userId" element={<EmployeeCertDetail />} />
          <Route path="/playbooks" element={<IncidentPlaybooks />} />
          <Route path="/playbooks/active/:id" element={<PlaybookRunner />} />
          <Route path="/playbooks/builder" element={<PlaybookBuilder />} />
          <Route path="/playbooks/analytics" element={<PlaybookAnalytics />} />
          <Route path="/playbooks/history/:id" element={<PlaybookTimeline />} />
          <Route path="/inspector-view" element={<InspectorView />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/self-audit" element={<SelfAudit />} />
          <Route path="/self-inspection" element={<SelfAudit />} />
          <Route path="/photo-evidence" element={<PhotoEvidencePage />} />
          <Route path="/audit-trail" element={<AuditTrail />} />
          <Route path="/copilot" element={<CopilotInsights />} />
          <Route path="/intelligence" element={<IntelligenceHub />} />
          <Route path="/regulatory-updates" element={<RegulatoryUpdates />} />
          <Route path="/self-diagnosis" element={<SelfDiagnosis />} />
          <Route path="/admin/regulatory-changes" element={<AdminRegulatoryChanges />} />
          <Route path="/admin/intelligence-queue" element={<AdminIntelligenceQueue />} />
          <Route path="/admin/intelligence" element={<CommandCenter />} />
          <Route path="/admin/rfp-intelligence" element={<RfpIntelligence />} />
          <Route path="/admin/assessments" element={<AssessmentLeads />} />
          <Route path="/admin/system/edge-functions" element={<EdgeFunctions />} />
          {/* Stub routes for upcoming features */}
          <Route path="/corrective-actions" element={<CorrectiveActions />} />
          {/* Blueprint route aliases — FIX-03 */}
          <Route path="/incident-playbook" element={<Navigate to="/playbooks" replace />} />
          <Route path="/regulatory-tracking" element={<Navigate to="/regulatory-alerts" replace />} />
          <Route path="/ai-insights" element={<Navigate to="/ai-advisor" replace />} />
          <Route path="/analytics" element={<Navigate to="/analysis" replace />} />
          <Route path="/compliance" element={<Navigate to="/compliance-index" replace />} />
          <Route path="/locations" element={<Navigate to="/org-hierarchy" replace />} />
          <Route path="/inspections" element={<Navigate to="/self-audit" replace />} />
          <Route path="/certifications" element={<Navigate to="/training/certificates" replace />} />
          <Route path="/sensor-dashboard" element={<Navigate to="/sensors" replace />} />
        </Route>
      </Routes>
    </>
  );
}

function GlobalErrorHandlers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportError(event.error ?? new Error(event.message), { source: 'window.onerror', filename: event.filename, lineno: event.lineno });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      reportError(error, { source: 'unhandledrejection' });
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary level="page">
      <BrandingProvider>
      <Router>
        <AuthProvider>
          <DemoProvider>
            <LanguageProvider>
              <RoleProvider>
                <OperatingHoursProvider>
                  <OfflineProvider>
                    <InactivityProvider>
                      <NotificationProvider>
                        <GlobalErrorHandlers>
                          <AppRoutes />
                        </GlobalErrorHandlers>
                      </NotificationProvider>
                      <CookieConsent />
                      <Toaster position="top-right" richColors closeButton duration={3000} />
                    </InactivityProvider>
                  </OfflineProvider>
                </OperatingHoursProvider>
              </RoleProvider>
            </LanguageProvider>
          </DemoProvider>
        </AuthProvider>
      </Router>
      </BrandingProvider>
    </ErrorBoundary>
  );
}

export default App;

