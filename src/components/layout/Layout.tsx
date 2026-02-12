import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileTabBar } from './MobileTabBar';
import { GuidedTour } from '../GuidedTour';
import { DemoTour } from '../DemoTour';
import { AIChatPanel } from '../AIChatPanel';
import { OfflineBanner } from '../OfflineBanner';
import { useDemo } from '../../contexts/DemoContext';

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
  const { tourActive } = useDemo();
  const [guidedTourActive, setGuidedTourActive] = useState(false);
  const handleGuidedTourActiveChange = useCallback((active: boolean) => setGuidedTourActive(active), []);
  const anyTourActive = tourActive || guidedTourActive;

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
    <div className="min-h-screen bg-[#faf8f3]">
      <Sidebar />
      <div className="lg:pl-60 flex flex-col flex-1 relative z-0">
        <TopBar
          title={title}
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={onLocationChange}
          demoMode={demoMode}
        />
        <OfflineBanner />
        <main className="flex-1 pb-20 md:pb-8">
          <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto w-full">{children}</div>
        </main>
      </div>
      <MobileTabBar />
      {tourActive ? <DemoTour /> : <GuidedTour onActiveChange={handleGuidedTourActiveChange} />}
      <AIChatPanel hidden={anyTourActive} />
    </div>
  );
}
