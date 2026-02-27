import { useState, useCallback } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * useDemoGuard: Protects demo-restricted actions.
 *
 * guardAction() only blocks when the user is genuinely in demo mode
 * (entered via /demo, no auth session). Authenticated users always
 * pass through — they should never see the DemoUpgradePrompt.
 */
export function useDemoGuard() {
  const { isDemoMode, presenterMode } = useDemo();
  const { session } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeAction, setUpgradeAction] = useState('edit');
  const [upgradeFeature, setUpgradeFeature] = useState('');

  const guardAction = useCallback(
    (action: string, featureName: string, callback: () => void) => {
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
    [isDemoMode, presenterMode, session]
  );

  return { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature, isDemoMode };
}
