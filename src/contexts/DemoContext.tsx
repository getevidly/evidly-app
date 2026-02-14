import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import { trackEvent } from '../utils/analytics';

export interface DemoLead {
  fullName: string;
  email: string;
  companyName: string;
  businessType: string;
}

interface DemoContextType {
  isDemoMode: boolean;
  enterDemo: (lead?: DemoLead) => void;
  exitDemo: () => void;
  demoLead: DemoLead | null;
  setDemoLead: (lead: DemoLead) => void;
  tourActive: boolean;
  tourStep: number;
  setTourStep: (step: number) => void;
  startTour: () => void;
  completeTour: () => void;
  companyName: string;
  userName: string;
  firstName: string;
  presenterMode: boolean;
  togglePresenterMode: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const DEMO_KEY = 'evidly_demo_mode';
const LEAD_KEY = 'evidly_demo_lead';
const PRESENTER_KEY = 'evidly-presenter';
const PRESENTER_CODE = 'evidly';

function loadLead(): DemoLead | null {
  try {
    const raw = sessionStorage.getItem(LEAD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    try {
      return sessionStorage.getItem(DEMO_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [demoLead, setDemoLeadState] = useState<DemoLead | null>(loadLead);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // ── Presenter Mode ──────────────────────────────────
  const [presenterMode, setPresenterMode] = useState(() => {
    try {
      // Check URL param first
      const params = new URLSearchParams(window.location.search);
      if (params.get('presenter') === 'true') {
        sessionStorage.setItem(PRESENTER_KEY, 'true');
        return true;
      }
      return sessionStorage.getItem(PRESENTER_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const togglePresenterMode = useCallback(() => {
    setPresenterMode(prev => {
      const next = !prev;
      try {
        if (next) {
          sessionStorage.setItem(PRESENTER_KEY, 'true');
        } else {
          sessionStorage.removeItem(PRESENTER_KEY);
        }
      } catch {}
      return next;
    });
  }, []);

  // Keyboard konami code: type "evidly" (not in input fields)
  const bufferRef = useRef('');
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;

      bufferRef.current = (bufferRef.current + e.key).slice(-PRESENTER_CODE.length);

      if (bufferRef.current === PRESENTER_CODE) {
        bufferRef.current = '';
        setPresenterMode(prev => {
          const next = !prev;
          try {
            if (next) sessionStorage.setItem(PRESENTER_KEY, 'true');
            else sessionStorage.removeItem(PRESENTER_KEY);
          } catch {}
          return next;
        });
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const setDemoLead = (lead: DemoLead) => {
    setDemoLeadState(lead);
    try { sessionStorage.setItem(LEAD_KEY, JSON.stringify(lead)); } catch {}
  };

  const startTour = () => {
    setTourActive(true);
    setTourStep(0);
  };

  const completeTour = () => {
    setTourActive(false);
  };

  const enterDemo = (lead?: DemoLead) => {
    setIsDemoMode(true);
    trackEvent('demo_start');
    try { sessionStorage.setItem(DEMO_KEY, 'true'); } catch {}
    if (lead) {
      setDemoLead(lead);
      startTour();
    }
  };

  const exitDemo = () => {
    setIsDemoMode(false);
    setDemoLeadState(null);
    setTourActive(false);
    try {
      sessionStorage.removeItem(DEMO_KEY);
      sessionStorage.removeItem(LEAD_KEY);
    } catch {}
  };

  const companyName = useMemo(() => demoLead?.companyName || 'Pacific Coast Dining', [demoLead]);
  const userName = useMemo(() => demoLead?.fullName || 'James Wilson', [demoLead]);
  const firstName = useMemo(() => userName.split(' ')[0], [userName]);

  return (
    <DemoContext.Provider value={{
      isDemoMode, enterDemo, exitDemo,
      demoLead, setDemoLead,
      tourActive, tourStep, setTourStep,
      startTour, completeTour,
      companyName, userName, firstName,
      presenterMode, togglePresenterMode,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
