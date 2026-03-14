/**
 * HoodOps Vendor App — Main router & provider stack
 */
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from '@shared/contexts/AuthContext';
import { RoleProvider } from '@shared/contexts/RoleContext';
import { OperatingHoursProvider } from '@shared/contexts/OperatingHoursContext';
import { DemoProvider, useDemo } from '@shared/contexts/DemoContext';
import { LanguageProvider } from '@shared/contexts/LanguageContext';
import { OfflineProvider } from '@shared/contexts/OfflineContext';
import { InactivityProvider } from '@shared/contexts/InactivityContext';
import { BrandingProvider } from '@shared/contexts/BrandingContext';
import { NotificationProvider } from '@shared/contexts/NotificationContext';
import { EmulationProvider } from '@shared/contexts/EmulationContext';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { EnvBadge } from '@shared/components/ui/EnvBadge';
import { Layout } from '@shared/components/layout/Layout';

const VendorLogin = lazy(() => import('@shared/pages/VendorLogin').then(m => ({ default: m.VendorLogin })));
const VendorRegister = lazy(() => import('@shared/pages/VendorRegister').then(m => ({ default: m.VendorRegister })));
const ForgotPassword = lazy(() => import('@shared/pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const VendorDashboard = lazy(() => import('./pages/VendorDashboard').then(m => ({ default: m.VendorDashboard })));
const VendorSetup = lazy(() => import('./pages/VendorSetup').then(m => ({ default: m.VendorSetup })));
const Timecards = lazy(() => import('./pages/Timecards').then(m => ({ default: m.Timecards })));
const EmployeesPage = lazy(() => import('./pages/Employees').then(m => ({ default: m.Employees })));
const EmployeeDetailPage = lazy(() => import('./pages/EmployeeDetail').then(m => ({ default: m.EmployeeDetail })));
const Deficiencies = lazy(() => import('./pages/Deficiencies').then(m => ({ default: m.Deficiencies })));
const DeficiencyDetail = lazy(() => import('./pages/DeficiencyDetail').then(m => ({ default: m.DeficiencyDetail })));
const EmergencyInfoPage = lazy(() => import('./pages/EmergencyInfoPage').then(m => ({ default: m.EmergencyInfoPage })));
const Leaderboard = lazy(() => import('./pages/Leaderboard').then(m => ({ default: m.Leaderboard })));
const LeaderboardPreview = lazy(() => import('./pages/LeaderboardPreview').then(m => ({ default: m.LeaderboardPreview })));
const SchedulePage = lazy(() => import('./pages/schedule/SchedulePage').then(m => ({ default: m.SchedulePage })));
const VehiclesPage = lazy(() => import('./pages/fleet/VehiclesPage').then(m => ({ default: m.VehiclesPage })));
const VehicleDetailPage = lazy(() => import('./pages/fleet/VehicleDetailPage').then(m => ({ default: m.VehicleDetailPage })));
const InsurancePage = lazy(() => import('./pages/insurance/InsurancePage').then(m => ({ default: m.InsurancePage })));
const InsurancePolicyPage = lazy(() => import('./pages/insurance/InsurancePolicyPage').then(m => ({ default: m.InsurancePolicyPage })));
const AvailabilitySubmissionPage = lazy(() => import('./pages/availability/AvailabilitySubmissionPage').then(m => ({ default: m.AvailabilitySubmissionPage })));
const TeamAvailabilityPage = lazy(() => import('./pages/availability/TeamAvailabilityPage').then(m => ({ default: m.TeamAvailabilityPage })));
const AvailabilityApprovalsPage = lazy(() => import('./pages/availability/AvailabilityApprovalsPage').then(m => ({ default: m.AvailabilityApprovalsPage })));
const BonusDashboardPage = lazy(() => import('./pages/bonuses/BonusDashboardPage').then(m => ({ default: m.BonusDashboardPage })));
const PerformanceMetricsPage = lazy(() => import('./pages/performance/PerformanceMetricsPage').then(m => ({ default: m.PerformanceMetricsPage })));
const MyPerformancePage = lazy(() => import('./pages/performance/MyPerformancePage').then(m => ({ default: m.MyPerformancePage })));
const CallbacksPage = lazy(() => import('./pages/quality/CallbacksPage').then(m => ({ default: m.CallbacksPage })));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })));
const InventoryItemPage = lazy(() => import('./pages/inventory/InventoryItemPage').then(m => ({ default: m.InventoryItemPage })));
const InventoryRequestsPage = lazy(() => import('./pages/inventory/InventoryRequestsPage').then(m => ({ default: m.InventoryRequestsPage })));
const EquipmentPage = lazy(() => import('./pages/equipment/EquipmentPage').then(m => ({ default: m.EquipmentPage })));
const EquipmentDetailPage = lazy(() => import('./pages/equipment/EquipmentDetailPage').then(m => ({ default: m.EquipmentDetailPage })));
const QRScanLandingPage = lazy(() => import('./pages/equipment/QRScanLandingPage').then(m => ({ default: m.QRScanLandingPage })));
const EquipmentIncidentsPage = lazy(() => import('./pages/equipment/EquipmentIncidentsPage').then(m => ({ default: m.EquipmentIncidentsPage })));
const IncidentReportsPage = lazy(() => import('./pages/safety/IncidentReportsPage').then(m => ({ default: m.IncidentReportsPage })));
const ReportIncidentPage = lazy(() => import('./pages/safety/ReportIncidentPage').then(m => ({ default: m.ReportIncidentPage })));
const IncidentDetailPage = lazy(() => import('./pages/safety/IncidentDetailPage').then(m => ({ default: m.IncidentDetailPage })));
const TimecardAlterationsPage = lazy(() => import('./pages/timecards/TimecardAlterationsPage').then(m => ({ default: m.TimecardAlterationsPage })));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const ReportGeneratorPage = lazy(() => import('./pages/reports/ReportGeneratorPage').then(m => ({ default: m.ReportGeneratorPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const CompanyProfilePage = lazy(() => import('./pages/settings/CompanyProfilePage').then(m => ({ default: m.CompanyProfilePage })));
const TeamRolesPage = lazy(() => import('./pages/settings/TeamRolesPage').then(m => ({ default: m.TeamRolesPage })));
const ServiceTypesPage = lazy(() => import('./pages/settings/ServiceTypesPage').then(m => ({ default: m.ServiceTypesPage })));
const SettingsIntegrationsPage = lazy(() => import('./pages/settings/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })));
const NotificationsPage = lazy(() => import('./pages/settings/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const BillingPage = lazy(() => import('./pages/settings/BillingPage').then(m => ({ default: m.BillingPage })));
const ClockRemindersPage = lazy(() => import('./pages/settings/ClockRemindersPage').then(m => ({ default: m.ClockRemindersPage })));

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37] mx-auto" />
        <p className="mt-3 text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isDemoMode } = useDemo();
  if (loading) return <PageSkeleton />;
  if (!user && !isDemoMode) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const { isDemoMode } = useDemo();
  const location = useLocation();
  if (loading) return <PageSkeleton />;
  if (!user && !isDemoMode) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <ErrorBoundary level="page" resetKey={location.pathname}>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
      <EnvBadge />
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Suspense fallback={<PageSkeleton />}><VendorLogin /></Suspense>} />
      <Route path="/register" element={<Suspense fallback={<PageSkeleton />}><VendorRegister /></Suspense>} />
      <Route path="/forgot-password" element={<Suspense fallback={<PageSkeleton />}><ForgotPassword /></Suspense>} />
      <Route path="/vendor/dashboard" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><VendorDashboard /></Suspense></ProtectedRoute>} />
      <Route path="/vendor/setup" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><VendorSetup /></Suspense></ProtectedRoute>} />
      <Route path="/leaderboard-preview" element={<Suspense fallback={<PageSkeleton />}><LeaderboardPreview /></Suspense>} />
      <Route path="/equipment/scan/:equipmentId" element={<Suspense fallback={<PageSkeleton />}><QRScanLandingPage /></Suspense>} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<VendorDashboard />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/fleet" element={<VehiclesPage />} />
        <Route path="/fleet/:id" element={<VehicleDetailPage />} />
        <Route path="/insurance" element={<InsurancePage />} />
        <Route path="/insurance/:id" element={<InsurancePolicyPage />} />
        <Route path="/emergency" element={<EmergencyInfoPage />} />
        <Route path="/availability" element={<AvailabilitySubmissionPage />} />
        <Route path="/availability/team" element={<TeamAvailabilityPage />} />
        <Route path="/availability/approvals" element={<AvailabilityApprovalsPage />} />
        <Route path="/bonuses" element={<BonusDashboardPage />} />
        <Route path="/performance" element={<PerformanceMetricsPage />} />
        <Route path="/performance/me" element={<MyPerformancePage />} />
        <Route path="/quality/callbacks" element={<CallbacksPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/requests" element={<InventoryRequestsPage />} />
        <Route path="/inventory/:id" element={<InventoryItemPage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
        <Route path="/equipment/incidents" element={<EquipmentIncidentsPage />} />
        <Route path="/safety/incidents" element={<IncidentReportsPage />} />
        <Route path="/safety/incidents/new" element={<ReportIncidentPage />} />
        <Route path="/safety/incidents/:id" element={<IncidentDetailPage />} />
        <Route path="/timecards" element={<Timecards />} />
        <Route path="/timecards/alterations" element={<TimecardAlterationsPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        <Route path="/deficiencies" element={<Deficiencies />} />
        <Route path="/deficiencies/:deficiencyId" element={<DeficiencyDetail />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:slug" element={<ReportGeneratorPage />} />
        <Route path="/settings/clock-reminders" element={<ClockRemindersPage />} />
        <Route path="/settings" element={<SettingsPage />}>
          <Route index element={<Navigate to="/settings/company" replace />} />
          <Route path="company" element={<CompanyProfilePage />} />
          <Route path="team-roles" element={<TeamRolesPage />} />
          <Route path="service-types" element={<ServiceTypesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="integrations" element={<SettingsIntegrationsPage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary level="page">
      <BrandingProvider>
        <Router>
          <AuthProvider>
            <DemoProvider>
              <LanguageProvider>
                <RoleProvider>
                  <EmulationProvider>
                    <OperatingHoursProvider>
                      <OfflineProvider>
                        <InactivityProvider>
                          <NotificationProvider>
                            <AppRoutes />
                          </NotificationProvider>
                          <Toaster position="top-right" richColors closeButton duration={3000} />
                        </InactivityProvider>
                      </OfflineProvider>
                    </OperatingHoursProvider>
                  </EmulationProvider>
                </RoleProvider>
              </LanguageProvider>
            </DemoProvider>
          </AuthProvider>
        </Router>
      </BrandingProvider>
    </ErrorBoundary>
  );
}
