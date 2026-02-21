import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileTabBar } from './MobileTabBar';
import { GuidedTour } from '../GuidedTour';
import { DemoTour } from '../DemoTour';
import { AIChatPanel } from '../AIChatPanel';
import { OfflineBanner } from '../OfflineBanner';
import { DemoBanner } from '../DemoBanner';
import MobileStickyBar from '../MobileStickyBar';
import { QuickSwitcher } from '../QuickSwitcher';
import { ReferralTouchpoint } from '../ReferralTouchpoint';
import { DemoCTABar } from '../DemoCTABar';
import { DemoWatermark } from '../DemoWatermark';
import { DemoRestrictions } from '../DemoRestrictions';
import { QuickActionsBar } from './QuickActionsBar';
import { useDemo } from '../../contexts/DemoContext';
import { trackEvent } from '../../utils/analytics';

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
  const [guidedTourActive, setGuidedTourActive] = useState(false);
  const handleGuidedTourActiveChange = useCallback((active: boolean) => setGuidedTourActive(active), []);
  const anyTourActive = tourActive || guidedTourActive;

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
    <div className="min-h-screen" style={{ background: 'var(--bg-main)' }}>
      {/* Gold top border when presenter mode is active */}
      {presenterMode && (
        <div className="fixed top-0 left-0 right-0 h-0.5 z-[99998]" style={{ backgroundColor: '#d4af37' }} />
      )}
      <DemoBanner />
      <Sidebar />
      <div className="lg:pl-60 flex flex-col flex-1 isolate">
        <TopBar
          title={title}
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={onLocationChange}
          demoMode={demoMode}
        />
        <OfflineBanner />
        <main className={`flex-1 relative md:pb-[72px] ${isDemoMode ? 'pb-44' : 'pb-36'}`}>
          <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto w-full">{children}</div>
        </main>
      </div>
      <QuickActionsBar />
      <MobileTabBar />
      {isDemoMode && !presenterMode && <MobileStickyBar demoMode />}
      {tourActive ? <DemoTour /> : <GuidedTour onActiveChange={handleGuidedTourActiveChange} />}
      <AIChatPanel hidden={anyTourActive} />
      <ReferralTouchpoint />
      <QuickSwitcher />
      <DemoCTABar />
      <DemoWatermark />
      <DemoRestrictions />
    </div>
  );
}
