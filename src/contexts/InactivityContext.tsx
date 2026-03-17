import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useDemo } from './DemoContext';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import { LockScreen } from '../components/LockScreen';
import { toast } from 'sonner';

const LOCK_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const LOGOUT_TIMEOUT = 180 * 60 * 1000; // 3 hours
const WARNING_TIMEOUT = 25 * 60 * 1000; // 25 minutes
const WARNING_COUNTDOWN = 120; // seconds until lock after warning fires

interface InactivityContextType {
  isLocked: boolean;
}

const InactivityContext = createContext<InactivityContextType>({ isLocked: false });

export function InactivityProvider({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();
  const [isLocked, setIsLocked] = useState(false);

  // Session warning modal state
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_COUNTDOWN);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Only track inactivity for real authenticated users, not demo mode
  const enabled = !isDemoMode && !!user;

  const handleLock = useCallback(() => {
    setShowWarning(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setIsLocked(true);
    try {
      localStorage.setItem('evidly_locked', '1');
    } catch {
      // localStorage unavailable
    }
  }, []);

  const performLogout = useCallback(async (message: string) => {
    setShowWarning(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setIsLocked(false);
    try {
      localStorage.removeItem('evidly_locked');
      localStorage.removeItem('evidly_last_activity');
      localStorage.setItem('evidly_force_logout', String(Date.now()));
    } catch {
      // localStorage unavailable
    }
    await signOut();
    const redirectPath = profile?.role === 'platform_admin' ? '/admin-login' : '/login';
    navigate(redirectPath, { replace: true });
    toast.info(message);
  }, [signOut, navigate, profile]);

  const handleLogout = useCallback(() => {
    performLogout('Logged out due to inactivity');
  }, [performLogout]);

  const handleWarning = useCallback(() => {
    setShowWarning(true);
    setSecondsRemaining(WARNING_COUNTDOWN);
  }, []);

  // Countdown interval when warning modal is showing
  useEffect(() => {
    if (!showWarning) return;
    countdownRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          // Time's up — lock the screen
          if (countdownRef.current) clearInterval(countdownRef.current);
          setShowWarning(false);
          handleLock();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showWarning, handleLock]);

  const { recordActivity, setLocked } = useIdleTimeout({
    lockTimeout: LOCK_TIMEOUT,
    logoutTimeout: LOGOUT_TIMEOUT,
    warningTimeout: WARNING_TIMEOUT,
    onLock: handleLock,
    onLogout: handleLogout,
    onWarning: handleWarning,
    enabled,
  });

  const handleStaySignedIn = useCallback(() => {
    setShowWarning(false);
    setSecondsRemaining(WARNING_COUNTDOWN);
    if (countdownRef.current) clearInterval(countdownRef.current);
    // Reset the idle timer
    recordActivity();
  }, [recordActivity]);

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
    setLocked(false);
  }, [setLocked]);

  const handleSwitchUser = useCallback(async () => {
    setIsLocked(false);
    try {
      localStorage.removeItem('evidly_locked');
      localStorage.removeItem('evidly_last_activity');
      localStorage.setItem('evidly_force_logout', String(Date.now()));
    } catch {
      // localStorage unavailable
    }
    await signOut();
    const redirectPath = profile?.role === 'platform_admin' ? '/admin-login' : '/login';
    navigate(redirectPath, { replace: true });
  }, [signOut, navigate, profile]);

  const handleMaxAttempts = useCallback(() => {
    performLogout('Logged out after too many failed unlock attempts');
  }, [performLogout]);

  return (
    <InactivityContext.Provider value={{ isLocked }}>
      {children}
      {isLocked && user && (
        <LockScreen
          userEmail={user.email || ''}
          userName={user.user_metadata?.full_name || ''}
          onUnlock={handleUnlock}
          onSwitchUser={handleSwitchUser}
          onMaxAttempts={handleMaxAttempts}
        />
      )}

      {/* Session warning modal */}
      {showWarning && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'white', borderRadius: 12, padding: '2rem',
            maxWidth: 400, width: '90%', textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>&#9201;</div>
            <h3 style={{ color: '#1E2D4D', marginBottom: 8, fontSize: 18, fontWeight: 700 }}>
              Session expiring soon
            </h3>
            <p style={{ color: '#6B7F96', marginBottom: 4, fontSize: 13 }}>
              Your session will expire due to inactivity in
            </p>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#A08C5A', marginBottom: 16, fontFamily: 'monospace' }}>
              {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, '0')}
            </div>
            <button
              onClick={handleStaySignedIn}
              style={{
                background: '#A08C5A', color: 'white', border: 'none',
                borderRadius: 6, padding: '10px 24px', cursor: 'pointer',
                fontSize: 14, fontWeight: 500, width: '100%',
              }}
            >
              Stay signed in
            </button>
          </div>
        </div>
      )}
    </InactivityContext.Provider>
  );
}

export function useInactivity() {
  return useContext(InactivityContext);
}
