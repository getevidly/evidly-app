import { useState, useCallback, useEffect } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * useDemoGuard: Protects demo-restricted actions.
 *
 * guardAction() only blocks when the user is genuinely in demo mode
 * (entered via /demo, no auth session, auth finished loading).
 * Authenticated users always pass through — they should never see
 * the DemoUpgradePrompt.
 */
export function useDemoGuard() {
  const { isDemoMode, presenterMode } = useDemo();
  const { session, loading: authLoading } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeAction, setUpgradeAction] = useState('edit');
  const [upgradeFeature, setUpgradeFeature] = useState('');

  // Safety net: if isDemoMode becomes false (user logged in, or auth loaded
  // and resolved the race), immediately dismiss any visible upgrade prompt.
  useEffect(() => {
    if (!isDemoMode && showUpgrade) {
      setShowUpgrade(false);
    }
  }, [isDemoMode, showUpgrade]);

  const guardAction = useCallback(
    (action: string, featureName: string, callback: () => void) => {
      // While auth is still loading, always let the action through
      // (ProtectedLayout already blocks rendering, but this is a safety net)
      if (authLoading) {
        callback();
        return;
      }
      // Authenticated users: always pass through, no demo restrictions
      if (session?.user) {
        callback();
        return;
      }
      // Presenter mode: bypass all demo gating
      if (isDemoMode && presenterMode) {
        callback();
        return;
      }
      // Demo mode (no auth): block the action, show upgrade prompt
      if (isDemoMode) {
        setUpgradeAction(action);
        setUpgradeFeature(featureName);
        setShowUpgrade(true);
        return;
      }
      // Not in demo: execute normally
      callback();
    },
    [isDemoMode, presenterMode, session, authLoading]
  );

  return { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature, isDemoMode };
}
