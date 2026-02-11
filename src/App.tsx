// TODO: Re-enable auth guards before launch — restore Navigate import
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
// TODO: Re-enable auth guards before launch — restore useAuth import
import { AuthProvider } from './contexts/AuthContext';
import { RoleProvider } from './contexts/RoleContext';
import { OperatingHoursProvider } from './contexts/OperatingHoursContext';
// TODO: Re-enable auth guards before launch — restore useDemo import
import { DemoProvider } from './contexts/DemoContext';
import { LanguageProvider } from './contexts/LanguageContext';

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
const Equipment = lazy(() => import('./pages/Equipment').then(m => ({ default: m.Equipment })));
const RegulatoryAlerts = lazy(() => import('./pages/RegulatoryAlerts').then(m => ({ default: m.RegulatoryAlerts })));
const JurisdictionSettings = lazy(() => import('./pages/JurisdictionSettings').then(m => ({ default: m.JurisdictionSettings })));
const HealthDeptReport = lazy(() => import('./pages/HealthDeptReport').then(m => ({ default: m.HealthDeptReport })));
const ScoringBreakdown = lazy(() => import('./pages/ScoringBreakdown').then(m => ({ default: m.ScoringBreakdown })));
const Benchmarks = lazy(() => import('./pages/Benchmarks').then(m => ({ default: m.Benchmarks })));
const ComplianceIndex = lazy(() => import('./pages/ComplianceIndex').then(m => ({ default: m.ComplianceIndex })));
const InsuranceRisk = lazy(() => import('./pages/InsuranceRisk').then(m => ({ default: m.InsuranceRisk })));
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
import { PageSkeleton } from './components/LoadingSkeleton';
import { DemoBanner } from './components/DemoBanner';
import { Layout } from './components/layout/Layout';

function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <DailyOperations />
      <Features />
      <BeforeAfter />
      <QRFeature />
      <AllFeatures />
      <Pricing />
      <Trust />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // TODO: Re-enable auth guards before launch
  // const { user, loading } = useAuth();
  // const { isDemoMode } = useDemo();

  // if (isDemoMode) {
  //   return <>{children}</>;
  // }

  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto"></div>
  //         <p className="mt-4 text-gray-600">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // if (!user) {
  //   return <Navigate to="/login" replace />;
  // }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  // TODO: Re-enable auth guards before launch
  // const { user, loading } = useAuth();

  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto"></div>
  //         <p className="mt-4 text-gray-600">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // if (user) {
  //   return <Navigate to="/dashboard" replace />;
  // }

  return <>{children}</>;
}

function ProtectedLayout() {
  // TODO: Re-enable auth guards before launch
  // const { user, loading } = useAuth();
  // const { isDemoMode } = useDemo();

  // if (!isDemoMode) {
  //   if (loading) {
  //     return (
  //       <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center">
  //         <div className="text-center">
  //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto"></div>
  //           <p className="mt-4 text-gray-600">Loading...</p>
  //         </div>
  //       </div>
  //     );
  //   }
  //   if (!user) {
  //     return <Navigate to="/login" replace />;
  //   }
  // }

  return (
    <Layout>
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37] mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      }>
        <Outlet />
      </Suspense>
    </Layout>
  );
}

function AppRoutes() {
  return (
    <>
      <DemoBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Public routes */}
        <Route path="/verify/:code" element={<Suspense fallback={<PageSkeleton />}><PublicVerification /></Suspense>} />
        <Route path="/passport/demo" element={<Suspense fallback={<PageSkeleton />}><PassportDemo /></Suspense>} />
        <Route path="/passport/:id" element={<Suspense fallback={<PageSkeleton />}><Passport /></Suspense>} />
        <Route path="/partners/insurance" element={<Suspense fallback={<PageSkeleton />}><CarrierPartnership /></Suspense>} />
        <Route path="/providers" element={<Suspense fallback={<PageSkeleton />}><MarketplaceLanding /></Suspense>} />
        <Route path="/enterprise" element={<Suspense fallback={<PageSkeleton />}><EnterpriseLanding /></Suspense>} />
        <Route path="/login" element={<PublicRoute><Suspense fallback={<PageSkeleton />}><Login /></Suspense></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Suspense fallback={<PageSkeleton />}><Signup /></Suspense></PublicRoute>} />
        <Route path="/signup/locations" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><SignupLocations /></Suspense></ProtectedRoute>} />
        <Route path="/invite/:token" element={<Suspense fallback={<PageSkeleton />}><InviteAccept /></Suspense>} />
        <Route path="/forgot-password" element={<PublicRoute><Suspense fallback={<PageSkeleton />}><ForgotPassword /></Suspense></PublicRoute>} />
        <Route path="/reset-password" element={<Suspense fallback={<PageSkeleton />}><ResetPassword /></Suspense>} />
        <Route path="/email-confirmed" element={<Suspense fallback={<PageSkeleton />}><EmailConfirmed /></Suspense>} />
        <Route path="/demo" element={<Suspense fallback={<PageSkeleton />}><DemoWizard /></Suspense>} />
        <Route path="/vendor/login" element={<Suspense fallback={<PageSkeleton />}><VendorLogin /></Suspense>} />
        <Route path="/vendor/register" element={<Suspense fallback={<PageSkeleton />}><VendorRegister /></Suspense>} />
        <Route path="/vendor/upload/:token" element={<Suspense fallback={<PageSkeleton />}><VendorSecureUpload /></Suspense>} />

        {/* Protected routes without shared layout */}
        <Route path="/vendor/dashboard" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><VendorDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/enterprise/admin" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><EnterpriseDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/enterprise/dashboard" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><EnterpriseExecutive /></Suspense></ProtectedRoute>} />
        <Route path="/enterprise/intelligence" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><ComplianceIntelligence /></Suspense></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Onboarding /></Suspense></ProtectedRoute>} />

        {/* Protected routes with shared layout — sidebar/topbar stay mounted */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/temp-logs" element={<TempLogs />} />
          <Route path="/checklists" element={<Checklists />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/vendors/:vendorId" element={<VendorDetail />} />
          <Route path="/marketplace" element={<VendorMarketplace />} />
          <Route path="/marketplace/:vendorSlug" element={<VendorProfile />} />
          <Route path="/haccp" element={<HACCP />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/incidents" element={<IncidentLog />} />
          <Route path="/ai-advisor" element={<AIAdvisor />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/team" element={<Team />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/help" element={<Help />} />
          <Route path="/weekly-digest" element={<WeeklyDigest />} />
          <Route path="/audit-report" element={<AuditReport />} />
          <Route path="/equipment" element={<Equipment />} />
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
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <DemoProvider>
          <LanguageProvider>
            <RoleProvider>
              <OperatingHoursProvider>
                <AppRoutes />
              </OperatingHoursProvider>
            </RoleProvider>
          </LanguageProvider>
        </DemoProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

