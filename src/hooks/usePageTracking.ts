import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';
import { useEmulation } from '../contexts/EmulationContext';

export function usePageTracking() {
  const location = useLocation();
  const { isEmulating } = useEmulation();

  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (isEmulating) return; // skip all tracking during emulation
    trackPageView(location.pathname + location.search);
  }, [location, isEmulating]);
}
