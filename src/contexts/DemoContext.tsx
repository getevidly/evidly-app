import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { trackEvent } from '../utils/analytics';
import { setDemoWriteGuard, setDemoGuardMode } from '../lib/supabaseGuard';
import { supabase } from '../lib/supabase';

export interface DemoLead {
  fullName: string;
  email: string;
  companyName: string;
  businessType: string;
}

interface DemoContextType {
  isDemoMode: boolean;
  isAuthenticatedDemo: boolean;
  isAnyDemoMode: boolean;
  demoExpiresAt: Date | null;
  isDemoExpired: boolean;
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

// ─── Role Preview detection (module-level, runs once) ────────────────────
// When __rolePreview is in the URL, the entire app must behave as demo mode
// so tenant layout renders, demo data is used, and write guards activate.
// This must be module-level because DemoContext wraps RoleContext.
const _isRolePreview = (() => {
  try {
    return !!new URLSearchParams(window.location.search).get('__rolePreview');
  } catch { return false; }
})();
// ─────────────────────────────────────────────────────────────────────────

export function DemoProvider({ children }: { children: ReactNode }) {
  const { session, signOut, profile } = useAuth();

  const [rawDemoMode, setRawDemoMode] = useState(() => {
    // Role preview forces demo mode regardless of auth state
    if (_isRolePreview) return true;
    // If a Supabase token exists in localStorage, never start in demo mode
    if (hasStoredAuthToken()) return false;
    try {
      return sessionStorage.getItem(DEMO_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // ── Core invariant: authenticated sessions are NEVER in anonymous demo mode ──
  // Exception: __rolePreview overrides this — admin iframe must act as demo.
  const isAuthenticated = !!session?.user;
  const isDemoMode = _isRolePreview ? true : (rawDemoMode && !isAuthenticated);

  // ── Authenticated demo: user has session + org.is_demo = true ──
  const [orgIsDemo, setOrgIsDemo] = useState(false);
  const [orgDemoExpiresAt, setOrgDemoExpiresAt] = useState<Date | null>(null);

  // Fetch org demo status when session changes
  useEffect(() => {
    if (!isAuthenticated || !profile?.organization_id) {
      setOrgIsDemo(false);
      setOrgDemoExpiresAt(null);
      return;
    }

    let cancelled = false;

    async function fetchOrgDemoStatus() {
      const { data } = await supabase
        .from('organizations')
        .select('is_demo, demo_expires_at')
        .eq('id', profile!.organization_id)
        .single();

      if (cancelled) return;

      if (data) {
        setOrgIsDemo(data.is_demo === true);
        setOrgDemoExpiresAt(data.demo_expires_at ? new Date(data.demo_expires_at) : null);
      }
    }

    fetchOrgDemoStatus();

    return () => { cancelled = true; };
  }, [isAuthenticated, profile?.organization_id]);

  const isAuthenticatedDemo = isAuthenticated && orgIsDemo;
  const isAnyDemoMode = isDemoMode || isAuthenticatedDemo;
  const demoExpiresAt = isAuthenticatedDemo ? orgDemoExpiresAt : null;

  // Periodic expiration check (every 60 seconds)
  const [isDemoExpired, setIsDemoExpired] = useState(false);

  useEffect(() => {
    if (!isAuthenticatedDemo || !orgDemoExpiresAt) {
      setIsDemoExpired(false);
      return;
    }

    function checkExpiration() {
      if (orgDemoExpiresAt && orgDemoExpiresAt.getTime() < Date.now()) {
        setIsDemoExpired(true);
      }
    }

    checkExpiration();
    const interval = setInterval(checkExpiration, 60_000);
    return () => clearInterval(interval);
  }, [isAuthenticatedDemo, orgDemoExpiresAt]);

  // When user authenticates, clean up any stale anonymous demo state
  // Skip cleanup in role preview mode — admin needs demo mode to stay active
  useEffect(() => {
    if (_isRolePreview) return;
    if (isAuthenticated && rawDemoMode) {
      setRawDemoMode(false);
      try {
        sessionStorage.removeItem(DEMO_KEY);
        sessionStorage.removeItem(LEAD_KEY);
      } catch {}
    }
  }, [isAuthenticated, rawDemoMode]);

  const [demoLead, setDemoLeadState] = useState<DemoLead | null>(loadLead);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // ── Sync demo mode → Supabase write guard mode ─────────
  // platform_admin always gets 'live' — they need full write access
  // even when their org has is_demo = true.
  const isPlatformAdmin = profile?.role === 'platform_admin';
  useEffect(() => {
    if (isPlatformAdmin) {
      setDemoGuardMode('live');
    } else if (isDemoMode) {
      setDemoGuardMode('anonymous_demo');
    } else if (isAuthenticatedDemo) {
      setDemoGuardMode('authenticated_demo');
    } else {
      setDemoGuardMode('live');
    }
  }, [isDemoMode, isAuthenticatedDemo, isPlatformAdmin]);

  // ── Presenter Mode ──────────────────────────────────────
  const [presenterMode, setPresenterMode] = useState(() => {
    try {
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
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
    // Also sign out from Supabase to clear the in-memory session.
    if (session?.user) {
      signOut().catch(() => {});
    }
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
      isDemoMode, isAuthenticatedDemo, isAnyDemoMode,
      demoExpiresAt, isDemoExpired,
      enterDemo, exitDemo,
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

/**
 * Override provider for Role Preview — forces demo mode on
 * so preview content uses demo data instead of Supabase queries.
 */
export function DemoOverrideProvider({ children }: { children: ReactNode }) {
  const parent = useDemo();

  return (
    <DemoContext.Provider value={{
      ...parent,
      isDemoMode: false,
      isAnyDemoMode: parent.isAuthenticatedDemo,
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
