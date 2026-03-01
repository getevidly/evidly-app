import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { trackEvent } from '../utils/analytics';
import { setDemoWriteGuard } from '../lib/supabaseGuard';

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

/**
 * Synchronous check: does localStorage contain a Supabase auth token?
 * This runs BEFORE any async getSession() call, eliminating race conditions.
 * If a token exists, the user is authenticated → isDemoMode = false, always.
 */
function hasStoredAuthToken(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) return true;
    }
  } catch {}
  return false;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  const [rawDemoMode, setRawDemoMode] = useState(() => {
    // If a Supabase token exists in localStorage, never start in demo mode
    if (hasStoredAuthToken()) return false;
    try {
      return sessionStorage.getItem(DEMO_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // ── Core invariant: authenticated sessions are NEVER in demo mode ──
  // Two layers of protection:
  //   1. rawDemoMode initializes to false if localStorage has auth token (prevents flash on refresh)
  //   2. isAuthenticated check blocks demo mode when session is active
  // Note: we do NOT gate on authLoading or hasStoredAuthToken() at runtime —
  // when the user explicitly clicks "Try Demo", isDemoMode must be true immediately.
  const isAuthenticated = !!session?.user;
  const isDemoMode = rawDemoMode && !isAuthenticated;

  // When user authenticates, clean up any stale demo state from sessionStorage
  useEffect(() => {
    if (isAuthenticated && rawDemoMode) {
      setRawDemoMode(false);
      setDemoWriteGuard(false);
      try {
        sessionStorage.removeItem(DEMO_KEY);
        sessionStorage.removeItem(LEAD_KEY);
      } catch {}
    }
  }, [isAuthenticated, rawDemoMode]);

  const [demoLead, setDemoLeadState] = useState<DemoLead | null>(loadLead);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // ── Sync demo mode → Supabase write guard ─────────
  useEffect(() => {
    setDemoWriteGuard(isDemoMode);
  }, [isDemoMode]);

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
    // Clear any stale Supabase auth tokens so isDemoMode activates immediately
    // and persists on page refresh (the rawDemoMode initializer checks hasStoredAuthToken)
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
    setRawDemoMode(true);
    trackEvent('demo_start');
    try { sessionStorage.setItem(DEMO_KEY, 'true'); } catch {}
    if (lead) {
      setDemoLead(lead);
      startTour();
    }
  };

  const exitDemo = () => {
    setRawDemoMode(false);
    setDemoLeadState(null);
    setTourActive(false);
    try {
      sessionStorage.removeItem(DEMO_KEY);
      sessionStorage.removeItem(LEAD_KEY);
    } catch {}
  };

  const companyName = useMemo(() => demoLead?.companyName || 'Pacific Coast Dining', [demoLead]);
  const userName = useMemo(() => demoLead?.fullName || 'Maria Rodriguez', [demoLead]);
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
