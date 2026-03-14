/**
 * setup-vendor-app.mjs
 * Creates the entire apps/web-vendor/ directory in one shot.
 * Run: node setup-vendor-app.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const ROOT_SRC = path.join(ROOT, 'src');
const VENDOR = path.join(ROOT, 'apps/web-vendor');
const VENDOR_SRC = path.join(VENDOR, 'src');

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function write(p, c) { ensureDir(path.dirname(p)); fs.writeFileSync(p, c); }
function copy(src, dest) { ensureDir(path.dirname(dest)); fs.copyFileSync(src, dest); }

// ═══════════════════════════════════════════════════════════
// STEP 1: Scaffold files
// ═══════════════════════════════════════════════════════════

write(path.join(VENDOR, 'package.json'), JSON.stringify({
  name: "hoodops-web", private: true, version: "0.0.0", type: "module",
  scripts: { dev: "vite", build: "vite build", preview: "vite preview" }
}, null, 2) + '\n');

write(path.join(VENDOR, 'vite.config.ts'), `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) return 'vendor-react';
          if (id.includes('node_modules/@supabase/')) return 'vendor-supabase';
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) return 'vendor-charts';
          if (id.includes('node_modules/sonner')) return 'vendor-sonner';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  optimizeDeps: { exclude: ['lucide-react'] },
});
`);

write(path.join(VENDOR, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    target: "ES2020", useDefineForClassFields: true,
    lib: ["ES2020", "DOM", "DOM.Iterable"],
    module: "ESNext", skipLibCheck: true, moduleResolution: "bundler",
    allowImportingTsExtensions: true, isolatedModules: true,
    moduleDetection: "force", noEmit: true, jsx: "react-jsx",
    strict: true, noUnusedLocals: false, noUnusedParameters: false,
    noFallthroughCasesInSwitch: true,
    paths: { "@shared/*": ["../../src/*"], "@/*": ["./src/*"] },
    baseUrl: "."
  },
  include: ["src", "../../src"]
}, null, 2) + '\n');

write(path.join(VENDOR, 'index.html'), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HoodOps \u2014 Service Provider Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);

write(path.join(VENDOR, 'vercel.json'), JSON.stringify({
  rewrites: [{ source: "/(.*)", destination: "/index.html" }],
  headers: [{ source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]
}, null, 2) + '\n');

write(path.join(VENDOR, 'postcss.config.js'), `export default {
  plugins: {
    tailwindcss: { config: '../../tailwind.config.js' },
    autoprefixer: {},
  },
};
`);

console.log('Scaffold files created.');

// ═══════════════════════════════════════════════════════════
// STEP 2: Copy vendor files from root src/
// ═══════════════════════════════════════════════════════════

const FILES_TO_COPY = [
  // Pages
  'pages/VendorDashboard.tsx', 'pages/VendorSetup.tsx', 'pages/Timecards.tsx',
  'pages/Employees.tsx', 'pages/EmployeeDetail.tsx', 'pages/Deficiencies.tsx',
  'pages/DeficiencyDetail.tsx', 'pages/EmergencyInfoPage.tsx',
  'pages/Leaderboard.tsx', 'pages/LeaderboardPreview.tsx',
  'pages/availability/AvailabilitySubmissionPage.tsx',
  'pages/availability/TeamAvailabilityPage.tsx',
  'pages/availability/AvailabilityApprovalsPage.tsx',
  'pages/bonuses/BonusDashboardPage.tsx',
  'pages/fleet/VehiclesPage.tsx', 'pages/fleet/VehicleDetailPage.tsx',
  'pages/insurance/InsurancePage.tsx', 'pages/insurance/InsurancePolicyPage.tsx',
  'pages/inventory/InventoryPage.tsx', 'pages/inventory/InventoryItemPage.tsx',
  'pages/inventory/InventoryRequestsPage.tsx',
  'pages/performance/PerformanceMetricsPage.tsx', 'pages/performance/MyPerformancePage.tsx',
  'pages/quality/CallbacksPage.tsx',
  'pages/safety/IncidentReportsPage.tsx', 'pages/safety/ReportIncidentPage.tsx',
  'pages/safety/IncidentDetailPage.tsx',
  'pages/schedule/SchedulePage.tsx',
  'pages/timecards/TimecardAlterationsPage.tsx',
  'pages/reports/ReportsPage.tsx', 'pages/reports/ReportGeneratorPage.tsx',
  'pages/settings/SettingsPage.tsx', 'pages/settings/CompanyProfilePage.tsx',
  'pages/settings/TeamRolesPage.tsx', 'pages/settings/ServiceTypesPage.tsx',
  'pages/settings/IntegrationsPage.tsx', 'pages/settings/NotificationsPage.tsx',
  'pages/settings/BillingPage.tsx', 'pages/settings/ClockRemindersPage.tsx',
  'pages/equipment/EquipmentPage.tsx', 'pages/equipment/EquipmentDetailPage.tsx',
  'pages/equipment/QRScanLandingPage.tsx', 'pages/equipment/EquipmentIncidentsPage.tsx',
  // Hooks
  'hooks/api/useAvailability.ts', 'hooks/api/useBonuses.ts',
  'hooks/api/useClockReminders.ts', 'hooks/api/useDeficiencies.ts',
  'hooks/api/useEmployees.ts', 'hooks/api/useEquipment.ts',
  'hooks/api/useIncidents.ts', 'hooks/api/useInsurance.ts',
  'hooks/api/useInventory.ts', 'hooks/api/useReports.ts',
  'hooks/api/useSchedule.ts', 'hooks/api/useSettings.ts',
  'hooks/api/useTimecards.ts', 'hooks/api/useVehicles.ts',
  // Data
  'data/timecardsDemoData.ts', 'data/employeesDemoData.ts', 'data/deficienciesDemoData.ts',
  // Config
  'config/vendorCategories.ts',
];

// Component directories to copy entirely
const COMPONENT_DIRS = [
  'components/schedule', 'components/timecards', 'components/equipment',
  'components/inventory', 'components/fleet', 'components/deficiencies',
  'components/availability', 'components/insurance', 'components/settings',
];

let copied = 0;
for (const f of FILES_TO_COPY) {
  const src = path.join(ROOT_SRC, f);
  if (fs.existsSync(src)) { copy(src, path.join(VENDOR_SRC, f)); copied++; }
  else console.log(`  SKIP: ${f}`);
}

for (const dir of COMPONENT_DIRS) {
  const fullDir = path.join(ROOT_SRC, dir);
  if (!fs.existsSync(fullDir)) continue;
  for (const f of fs.readdirSync(fullDir)) {
    if (/\.(ts|tsx)$/.test(f)) {
      copy(path.join(fullDir, f), path.join(VENDOR_SRC, dir, f));
      copied++;
    }
  }
}

console.log(`Copied ${copied} files.`);

// ═══════════════════════════════════════════════════════════
// STEP 3: Rewrite imports
// ═══════════════════════════════════════════════════════════

const SHARED_PATTERNS = [
  'contexts/', 'lib/', 'components/dashboard/shared/constants',
  'components/dashboard/shared/', 'components/layout/', 'components/ui/',
  'components/shared/', 'components/Breadcrumb', 'components/DemoUpgradePrompt',
  'components/ErrorBoundary', 'components/feature-flags/', 'components/employees/',
  'components/vendor/', 'components/LoadingSkeleton', 'components/PageTransition',
  'components/PageExplanation', 'hooks/useDemoGuard', 'hooks/useOrgType',
  'hooks/api/useApiQuery', 'constants/', 'index.css',
  'data/demoData', 'data/serviceProviderDemoData',
];

function isShared(stripped) {
  return SHARED_PATTERNS.some(sp => stripped.startsWith(sp) || stripped === sp.replace(/\/$/, ''));
}

function walk(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(full);
  }
  return files;
}

let rewritten = 0;
for (const f of walk(VENDOR_SRC)) {
  let content = fs.readFileSync(f, 'utf8');
  const orig = content;

  // ../../xyz → @shared/xyz if shared
  content = content.replace(/(?:from\s+['"])(\.\.\/.+?)(?=['"])/g, (match, relPath) => {
    const stripped = relPath.replace(/^(\.\.\/)+/, '');
    if (isShared(stripped)) return match.replace(relPath, `@shared/${stripped}`);
    return match;
  });

  // ../dashboard/shared/constants from component subdirs
  content = content.replaceAll("from '../dashboard/shared/constants'", "from '@shared/components/dashboard/shared/constants'");

  // ./useApiQuery from hooks
  content = content.replaceAll("from './useApiQuery'", "from '@shared/hooks/api/useApiQuery'");

  // Barrel imports
  content = content.replaceAll("from '../../hooks/api'", "from '../../hooks/api/useClockReminders'");

  if (content !== orig) { fs.writeFileSync(f, content); rewritten++; }
}

console.log(`Rewrote imports in ${rewritten} files.`);

// ═══════════════════════════════════════════════════════════
// STEP 4: Create main.tsx
// ═══════════════════════════════════════════════════════════

write(path.join(VENDOR_SRC, 'main.tsx'), `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { initSentry } from '@shared/lib/sentry';
import App from './App.tsx';
import '@shared/index.css';

initSentry();

window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
`);

// ═══════════════════════════════════════════════════════════
// STEP 5: Create App.tsx
// ═══════════════════════════════════════════════════════════

write(path.join(VENDOR_SRC, 'App.tsx'), `/**
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
`);

// ═══════════════════════════════════════════════════════════
// STEP 6: Create vendorSidebarConfig.ts
// ═══════════════════════════════════════════════════════════

write(path.join(VENDOR_SRC, 'config/vendorSidebarConfig.ts'), `/**
 * HoodOps Vendor Sidebar Configuration
 */
import type { NavItem, SidebarSection, RoleSidebarConfig, RoleHomeItem } from '@shared/config/sidebarConfig';

const I: Record<string, NavItem> = {
  schedule: { id: 'schedule', label: 'Schedule', path: '/schedule', icon: '📅', roles: [], description: 'Service job scheduling.' },
  fleet: { id: 'fleet', label: 'Fleet', path: '/fleet', icon: '🚛', roles: [], description: 'Vehicle inventory and maintenance.' },
  insurance: { id: 'insurance', label: 'Insurance', path: '/insurance', icon: '🛡️', roles: [], description: 'Insurance policies and coverage.' },
  emergencyInfo: { id: 'emergency-info', label: 'Emergency Info', path: '/emergency', icon: '📞', roles: [], description: 'Roadside assistance and contacts.' },
  timecards: { id: 'timecards', label: 'Timecards', path: '/timecards', icon: '⏱️', roles: [], description: 'Clock in/out and shift tracking.' },
  timecardAlterations: { id: 'timecard-alterations', label: 'Timecard Alterations', path: '/timecards/alterations', icon: '📝', roles: [], description: 'Timecard modification audit trail.' },
  employees: { id: 'employees', label: 'Employees', path: '/employees', icon: '👷', roles: [], description: 'Employee directory and certifications.' },
  bonuses: { id: 'bonuses', label: 'Bonus Management', path: '/bonuses', icon: '💰', roles: [], description: 'Bonus calculations and payouts.' },
  performanceMetrics: { id: 'performance-metrics', label: 'Performance Metrics', path: '/performance', icon: '🎯', roles: [], description: 'QA rates and bonus multipliers.' },
  myPerformance: { id: 'my-performance', label: 'My Performance', path: '/performance/me', icon: '📊', roles: [], description: 'Personal performance metrics.' },
  callbacks: { id: 'callbacks', label: 'Callbacks', path: '/quality/callbacks', icon: '🔄', roles: [], description: 'Job callback tracking.' },
  inventory: { id: 'inventory', label: 'Inventory', path: '/inventory', icon: '📦', roles: [], description: 'Stock levels and usage.' },
  equipment: { id: 'equipment', label: 'Equipment', path: '/equipment', icon: '⚙️', roles: [], description: 'Equipment asset register.' },
  equipmentIncidents: { id: 'equipment-incidents', label: 'Equipment Incidents', path: '/equipment/incidents', icon: '⚠️', roles: [], description: 'Equipment damage and loss reports.' },
  deficiencies: { id: 'deficiencies', label: 'Deficiencies', path: '/deficiencies', icon: '⚠️', roles: [], description: 'Compliance violation tracking.' },
  safetyIncidents: { id: 'safety-incidents', label: 'Safety Incidents', path: '/safety/incidents', icon: '🛡️', roles: [], description: 'Injury and near-miss reports.' },
  myAvailability: { id: 'my-availability', label: 'My Availability', path: '/availability', icon: '📅', roles: [], description: 'Submit availability.' },
  teamAvailability: { id: 'team-availability', label: 'Team Availability', path: '/availability/team', icon: '👥', roles: [], description: 'Manage team availability.' },
  availabilityApprovals: { id: 'availability-approvals', label: 'Availability Approvals', path: '/availability/approvals', icon: '✅', roles: [], description: 'Approve late submissions.' },
  clockReminders: { id: 'clock-reminders', label: 'Clock & Attendance', path: '/settings/clock-reminders', icon: '⏰', roles: [], description: 'Clock-in/out reminders.' },
  reports: { id: 'reports', label: 'Reports', path: '/reports', icon: '📊', roles: [], description: 'Operational reports.' },
  leaderboard: { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', icon: '🏆', roles: [], description: 'Performance rankings.' },
  settings: { id: 'settings', label: 'Settings', path: '/settings', icon: '⚙️', roles: [], description: 'Company settings.' },
};

function section(id: string, label: string, icon: string, tt: string, td: string, items: NavItem[], path?: string): SidebarSection {
  return { id, label, icon, roles: [], tooltipTitle: tt, tooltipDescription: td, items, ...(path ? { path } : {}) };
}

const VENDOR_HOME: RoleHomeItem = {
  label: 'Dashboard', labelEs: 'Panel de Control', path: '/dashboard', icon: 'LayoutDashboard',
  description: 'Service provider operations dashboard', descriptionEs: 'Panel de operaciones',
};

const ROLE_CONFIGS: Record<string, RoleSidebarConfig> = {
  vendor_admin: { home: VENDOR_HOME, sections: [
    section('operations', 'Operations', '📋', 'Operations', 'Schedule, timecards, employees.', [I.schedule, I.timecards, I.timecardAlterations, I.employees, I.leaderboard]),
    section('performance', 'Performance', '🎯', 'Performance', 'Bonuses and quality.', [I.bonuses, I.performanceMetrics, I.callbacks]),
    section('assets', 'Assets', '📦', 'Assets', 'Equipment, inventory, fleet.', [I.equipment, I.equipmentIncidents, I.inventory, I.fleet, I.insurance]),
    section('compliance', 'Compliance', '⚠️', 'Compliance', 'Deficiencies and safety.', [I.deficiencies, I.safetyIncidents]),
    section('team', 'Team', '👥', 'Team', 'Availability management.', [I.myAvailability, I.teamAvailability, I.availabilityApprovals]),
    section('reports', 'Reports', '📊', 'Reports', 'Operational reports.', [I.reports]),
    section('admin', 'Administration', '⚙️', 'Admin', 'Settings and config.', [I.settings, I.clockReminders, I.emergencyInfo]),
  ]},
  hood_technician: { home: VENDOR_HOME, sections: [
    section('operations', 'Operations', '📋', 'Operations', 'Schedule and timecards.', [I.schedule, I.timecards, I.leaderboard]),
    section('performance', 'Performance', '🎯', 'Performance', 'Your performance.', [I.myPerformance, I.callbacks]),
    section('assets', 'Assets', '📦', 'Assets', 'Equipment and inventory.', [I.equipment, I.equipmentIncidents, I.inventory]),
    section('compliance', 'Compliance', '⚠️', 'Compliance', 'Deficiencies and safety.', [I.deficiencies, I.safetyIncidents]),
    section('team', 'Team', '👥', 'Team', 'Your availability.', [I.myAvailability]),
    section('tools', 'Tools', '🔧', 'Tools', 'Emergency info.', [I.emergencyInfo]),
  ]},
  owner_operator: { home: VENDOR_HOME, sections: [
    section('operations', 'Operations', '📋', 'Operations', 'Schedule, timecards, employees.', [I.schedule, I.timecards, I.timecardAlterations, I.employees, I.leaderboard]),
    section('performance', 'Performance', '🎯', 'Performance', 'Bonuses and quality.', [I.bonuses, I.performanceMetrics, I.callbacks]),
    section('assets', 'Assets', '📦', 'Assets', 'Equipment, inventory, fleet.', [I.equipment, I.equipmentIncidents, I.inventory, I.fleet, I.insurance]),
    section('compliance', 'Compliance', '⚠️', 'Compliance', 'Deficiencies and safety.', [I.deficiencies, I.safetyIncidents]),
    section('team', 'Team', '👥', 'Team', 'Availability management.', [I.myAvailability, I.teamAvailability, I.availabilityApprovals]),
    section('reports', 'Reports', '📊', 'Reports', 'Operational reports.', [I.reports]),
    section('admin', 'Administration', '⚙️', 'Admin', 'Settings and config.', [I.settings, I.clockReminders, I.emergencyInfo]),
  ]},
};

export function getVendorRoleConfig(role: string): RoleSidebarConfig {
  return ROLE_CONFIGS[role] || ROLE_CONFIGS.vendor_admin;
}

export { I as VENDOR_NAV_ITEMS };
`);

console.log('\\nAll vendor app files created successfully!');
console.log('Run: npm run build:vendor');
