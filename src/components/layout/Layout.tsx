import { lazy, ReactNode, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileTabBar } from './MobileTabBar';
import { QuickActionsBar } from './QuickActionsBar';
import { AutoBreadcrumb } from './AutoBreadcrumb';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEmulation } from '../../contexts/EmulationContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { useMobile } from '../../hooks/useMobile';
import { trackEvent } from '../../utils/analytics';

// Lazy-load all overlay components — none are needed for initial render
const GuidedTour = lazy(() => import('../GuidedTour').then(m => ({ default: m.GuidedTour })));
const DemoTour = lazy(() => import('../DemoTour').then(m => ({ default: m.DemoTour })));
const OfflineBanner = lazy(() => import('../OfflineBanner').then(m => ({ default: m.OfflineBanner })));
const DemoBanner = lazy(() => import('../DemoBanner').then(m => ({ default: m.DemoBanner })));
const AIChatPanel = lazy(() => import('../AIChatPanel').then(m => ({ default: m.AIChatPanel })));
const QuickSwitcher = lazy(() => import('../QuickSwitcher').then(m => ({ default: m.QuickSwitcher })));
const ReferralTouchpoint = lazy(() => import('../ReferralTouchpoint').then(m => ({ default: m.ReferralTouchpoint })));
const BiweeklyReferralBanner = lazy(() => import('../BiweeklyReferralBanner').then(m => ({ default: m.BiweeklyReferralBanner })));
const DemoCTABar = lazy(() => import('../DemoCTABar').then(m => ({ default: m.DemoCTABar })));
const DemoWatermark = lazy(() => import('../DemoWatermark').then(m => ({ default: m.DemoWatermark })));
const DemoRestrictions = lazy(() => import('../DemoRestrictions').then(m => ({ default: m.DemoRestrictions })));
const DemoButtonGuard = lazy(() => import('../DemoButtonGuard').then(m => ({ default: m.DemoButtonGuard })));
const MobileDailyTasks = lazy(() => import('../mobile/MobileDailyTasks').then(m => ({ default: m.MobileDailyTasks })));
const MobileDailyTasksProduction = lazy(() =>
  import('../mobile/MobileDailyTasksProduction').then(m => ({ default: m.MobileDailyTasksProduction }))
);

interface LocationOption {
  id: string;
  name: string;
}

interface LayoutProps {
  children: ReactNode;
  title?: string;
  locations?: LocationOption[];
  selectedLocation?: string | null;
  onLocationChange?: (locationId: string | null) => void;
  demoMode?: boolean;
}

export function Layout({ children, title, locations, selectedLocation, onLocationChange, demoMode = false }: LayoutProps) {
  const { tourActive, isDemoMode, presenterMode } = useDemo();
  const { session } = useAuth();
  const { isEmulating } = useEmulation();
  const { setNotifications, notifications: currentNotifications } = useNotifications();
  const [guidedTourActive, setGuidedTourActive] = useState(false);
  const handleGuidedTourActiveChange = useCallback((active: boolean) => setGuidedTourActive(active), []);
  const anyTourActive = tourActive || guidedTourActive;

  // Real-time notification subscription (no-op in demo mode — no org profile)
  useRealtimeNotifications(useCallback((notification) => {
    setNotifications([
      {
        id: notification.id,
        title: notification.title,
        time: notification.created_at,
        link: notification.action_url || '',
        type: notification.priority === 'high' || notification.priority === 'critical'
          ? 'alert' : notification.type === 'success' ? 'success' : 'info',
        locationId: '',
        read: false,
      },
      ...currentNotifications,
    ]);

    if (notification.priority === 'high' || notification.priority === 'critical') {
      toast.warning(notification.title, {
        description: notification.body || undefined,
        duration: 8000,
      });
    }
  }, [setNotifications, currentNotifications]));

  // Mobile daily tasks overlay (demo only, mobile/tablet, dashboard route)
  const { isMobile, isTablet } = useMobile();

  // Track page visits for demo CTAs (stored in sessionStorage for cross-component access)
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (isDemoMode && location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      const pageName = location.pathname.replace(/^\//, '') || 'dashboard';
      trackEvent('demo_page_view', { page: pageName });
      try {
        const count = parseInt(sessionStorage.getItem('evidly_demo_pages') || '0', 10);
        sessionStorage.setItem('evidly_demo_pages', String(count + 1));
      } catch { /* noop */ }
    }
  }, [location.pathname, isDemoMode]);

  // Load Zendesk Web Widget (hidden launcher — opened programmatically from Help page)
  useEffect(() => {
    if (document.getElementById('ze-snippet')) return;
    const script = document.createElement('script');
    script.id = 'ze-snippet';
    script.src = 'https://static.zdassets.com/ekr/snippet.js?key=REPLACE_WITH_ZENDESK_KEY';
    script.async = true;
    script.onload = () => {
      if (typeof window.zE === 'function') {
        window.zE('messenger', 'hide');
        window.zE('messenger:set', 'locale', 'en');
      }
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-main)', paddingTop: isEmulating ? '44px' : undefined }}>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* Gold top border when presenter mode is active */}
      {presenterMode && (
        <div className="fixed top-0 left-0 right-0 h-0.5 z-[99998]" style={{ backgroundColor: '#d4af37' }} />
      )}
      <Suspense fallback={null}><DemoBanner /></Suspense>
      <Sidebar />
      <div className="lg:pl-60 flex flex-col flex-1 overflow-hidden isolate">
        <TopBar
          title={title}
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={onLocationChange}
          demoMode={demoMode}
        />
        <Suspense fallback={null}><OfflineBanner /></Suspense>
        {/* BREADCRUMB BAR — fixed above scroll area, never scrolls away */}
        <div
          className="flex-shrink-0 z-40"
          style={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E8EDF5',
            boxShadow: '0 1px 3px rgba(11,22,40,0.04)',
          }}
        >
          <div className="px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto w-full py-2.5">
            <AutoBreadcrumb />
          </div>
        </div>
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto" id="layout-scroll-container">
          <main className={`flex-1 relative ${isDemoMode ? 'pb-48 md:pb-28' : 'pb-36 md:pb-[72px]'}`}>
            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>
      <QuickActionsBar />
      <MobileTabBar />
      {/* Lazy-loaded overlays — none needed for initial paint */}
      <Suspense fallback={null}>
        {tourActive ? <DemoTour /> : <GuidedTour onActiveChange={handleGuidedTourActiveChange} />}
        <AIChatPanel hidden={anyTourActive} />
        <ReferralTouchpoint />
        <BiweeklyReferralBanner />
        <QuickSwitcher />
        <DemoCTABar />
        <DemoWatermark />
        <DemoRestrictions />
        <DemoButtonGuard />
        {/* Mobile daily tasks overlay — demo mode, mobile/tablet, dashboard route only */}
        {isDemoMode && (isMobile || isTablet) && (location.pathname === '/dashboard' || location.pathname === '/') && (
          <MobileDailyTasks />
        )}
        {/* Production mobile daily tasks — authenticated, mobile/tablet, dashboard route only */}
        {!isDemoMode && !!session?.user && (isMobile || isTablet) && (location.pathname === '/dashboard' || location.pathname === '/') && (
          <MobileDailyTasksProduction />
        )}
      </Suspense>
    </div>
  );
}
