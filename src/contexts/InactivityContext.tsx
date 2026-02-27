import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useDemo } from './DemoContext';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import { LockScreen } from '../components/LockScreen';
import { toast } from 'sonner';

const LOCK_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const LOGOUT_TIMEOUT = 180 * 60 * 1000; // 3 hours
const WARNING_TIMEOUT = 14 * 60 * 1000; // 14 minutes

interface InactivityContextType {
  isLocked: boolean;
}

const InactivityContext = createContext<InactivityContextType>({ isLocked: false });

export function InactivityProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();
  const [isLocked, setIsLocked] = useState(() => {
    try { return localStorage.getItem('evidly_locked') === '1'; }
    catch { return false; }
  });

  // Only track inactivity for real authenticated users, not demo mode
  const enabled = !isDemoMode && !!user;

  const handleLock = useCallback(() => {
    setIsLocked(true);
    try {
      localStorage.setItem('evidly_locked', '1');
    } catch {
      // localStorage unavailable
    }
  }, []);

  const performLogout = useCallback(async (message: string) => {
    setIsLocked(false);
    try {
      localStorage.removeItem('evidly_locked');
      localStorage.removeItem('evidly_last_activity');
      localStorage.setItem('evidly_force_logout', String(Date.now()));
    } catch {
      // localStorage unavailable
    }
    await signOut();
    navigate('/login');
    toast.info(message);
  }, [signOut, navigate]);

  const handleLogout = useCallback(() => {
    performLogout('Logged out due to inactivity');
  }, [performLogout]);

  const handleWarning = useCallback(() => {
    toast.warning('Session will lock in 1 minute due to inactivity', {
      duration: 10000,
    });
  }, []);

  const { setLocked } = useIdleTimeout({
    lockTimeout: LOCK_TIMEOUT,
    logoutTimeout: LOGOUT_TIMEOUT,
    warningTimeout: WARNING_TIMEOUT,
    onLock: handleLock,
    onLogout: handleLogout,
    onWarning: handleWarning,
    enabled,
  });

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
    navigate('/login');
  }, [signOut, navigate]);

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
    </InactivityContext.Provider>
  );
}

export function useInactivity() {
  return useContext(InactivityContext);
}
