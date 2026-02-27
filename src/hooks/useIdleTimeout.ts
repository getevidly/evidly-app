import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
const CHECK_INTERVAL = 30_000; // Check every 30 seconds
const MOUSEMOVE_THROTTLE = 5_000; // Only register mousemove every 5s

interface UseIdleTimeoutOptions {
  lockTimeout: number;
  logoutTimeout: number;
  warningTimeout: number;
  onLock: () => void;
  onLogout: () => void;
  onWarning: () => void;
  enabled: boolean;
}

export function useIdleTimeout(options: UseIdleTimeoutOptions) {
  // Use ref for options to avoid re-creating effects on every callback change
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const lastActivityRef = useRef((() => {
    try {
      const s = localStorage.getItem('evidly_last_activity');
      return s ? parseInt(s, 10) : Date.now();
    } catch { return Date.now(); }
  })());
  const warningFiredRef = useRef(false);
  const lockedRef = useRef((() => {
    try { return localStorage.getItem('evidly_locked') === '1'; }
    catch { return false; }
  })());

  const recordActivity = useCallback(() => {
    if (!optionsRef.current.enabled || lockedRef.current) return;
    lastActivityRef.current = Date.now();
    warningFiredRef.current = false;
    try {
      localStorage.setItem('evidly_last_activity', String(lastActivityRef.current));
    } catch {
      // localStorage unavailable
    }
  }, []);

  // User activity event listeners
  useEffect(() => {
    if (!options.enabled) return;

    let lastMouseMoveTime = 0;
    const handleMouseMove = () => {
      if (Date.now() - lastMouseMoveTime > MOUSEMOVE_THROTTLE) {
        lastMouseMoveTime = Date.now();
        recordActivity();
      }
    };

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, recordActivity, { passive: true }));
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, recordActivity));
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [options.enabled, recordActivity]);

  // Periodic inactivity check
  useEffect(() => {
    if (!options.enabled) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const { lockTimeout, logoutTimeout, warningTimeout } = optionsRef.current;

      if (elapsed >= logoutTimeout) {
        optionsRef.current.onLogout();
        return;
      }

      if (elapsed >= lockTimeout && !lockedRef.current) {
        lockedRef.current = true;
        optionsRef.current.onLock();
        return;
      }

      if (elapsed >= warningTimeout && !warningFiredRef.current && !lockedRef.current) {
        warningFiredRef.current = true;
        optionsRef.current.onWarning();
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [options.enabled]);

  // Handle visibility change (laptop lid close/reopen, tab switch)
  useEffect(() => {
    if (!options.enabled) return;

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const elapsed = Date.now() - lastActivityRef.current;
      const { lockTimeout, logoutTimeout } = optionsRef.current;

      if (elapsed >= logoutTimeout) {
        optionsRef.current.onLogout();
      } else if (elapsed >= lockTimeout && !lockedRef.current) {
        lockedRef.current = true;
        optionsRef.current.onLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [options.enabled]);

  // Cross-tab sync via localStorage events
  useEffect(() => {
    if (!options.enabled) return;

    const handleStorage = (e: StorageEvent) => {
      // Another tab locked
      if (e.key === 'evidly_locked' && e.newValue === '1' && !lockedRef.current) {
        lockedRef.current = true;
        optionsRef.current.onLock();
      }
      // Another tab unlocked
      if (e.key === 'evidly_locked' && e.newValue === '0' && lockedRef.current) {
        lockedRef.current = false;
        lastActivityRef.current = Date.now();
        warningFiredRef.current = false;
      }
      // Another tab had activity
      if (e.key === 'evidly_last_activity' && e.newValue) {
        const ts = parseInt(e.newValue, 10);
        if (ts > lastActivityRef.current) {
          lastActivityRef.current = ts;
          warningFiredRef.current = false;
        }
      }
      // Another tab forced logout
      if (e.key === 'evidly_force_logout') {
        optionsRef.current.onLogout();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [options.enabled]);

  const setLocked = useCallback((locked: boolean) => {
    lockedRef.current = locked;
    try {
      localStorage.setItem('evidly_locked', locked ? '1' : '0');
    } catch {
      // localStorage unavailable
    }
    if (!locked) {
      recordActivity();
    }
  }, [recordActivity]);

  return { recordActivity, setLocked };
}
