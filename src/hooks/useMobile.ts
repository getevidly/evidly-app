import { useState, useEffect } from 'react';

interface MobileState {
  isMobile: boolean;
  isTablet: boolean;
  isStandalone: boolean;
}

export function useMobile(): MobileState {
  const [state, setState] = useState<MobileState>(() => ({
    isMobile: typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
    isTablet: typeof window !== 'undefined' && window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches,
    isStandalone: typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  }));

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const tq = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const sq = window.matchMedia('(display-mode: standalone)');

    const update = () =>
      setState({
        isMobile: mq.matches,
        isTablet: tq.matches,
        isStandalone: sq.matches,
      });

    mq.addEventListener('change', update);
    tq.addEventListener('change', update);
    sq.addEventListener('change', update);

    return () => {
      mq.removeEventListener('change', update);
      tq.removeEventListener('change', update);
      sq.removeEventListener('change', update);
    };
  }, []);

  return state;
}
