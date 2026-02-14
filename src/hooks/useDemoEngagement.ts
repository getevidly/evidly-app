import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useDemoEngagement() {
  const [timeSpent, setTimeSpent] = useState(0);
  const [pagesVisited, setPagesVisited] = useState<Set<string>>(new Set());
  const [showBooking, setShowBooking] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setPagesVisited(prev => {
      const next = new Set(prev);
      next.add(location.pathname);
      return next;
    });
  }, [location.pathname]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('calendly-dismissed');
    if (dismissed) return;

    if (timeSpent >= 120 || pagesVisited.size >= 3) {
      setShowBooking(true);
    }
  }, [timeSpent, pagesVisited.size]);

  function dismiss() {
    setShowBooking(false);
    sessionStorage.setItem('calendly-dismissed', 'true');
  }

  return { showBooking, dismiss, timeSpent, pagesVisited: pagesVisited.size };
}
