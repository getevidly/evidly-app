import { useState, useCallback } from 'react';
import { useDemo } from '../contexts/DemoContext';

const OVERRIDE_SESSION_KEY = 'evidly_demo_override';

function isOverridden(): boolean {
  try {
    return sessionStorage.getItem(OVERRIDE_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

function setOverridden(): void {
  try {
    sessionStorage.setItem(OVERRIDE_SESSION_KEY, 'true');
  } catch {}
}

export function useDemoGuard() {
  const { isDemoMode, presenterMode } = useDemo();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeAction, setUpgradeAction] = useState('edit');
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const [, setForceUpdate] = useState(0);

  const guardAction = useCallback(
    (action: string, featureName: string, callback: () => void) => {
      // Presenter mode: bypass all demo gating
      if (isDemoMode && presenterMode) {
        callback();
        return;
      }
      // If override code has been entered for this session, allow
      if (isDemoMode && isOverridden()) {
        callback();
        return;
      }
      if (isDemoMode) {
        setUpgradeAction(action);
        setUpgradeFeature(featureName);
        setShowUpgrade(true);
        return;
      }
      callback();
    },
    [isDemoMode, presenterMode]
  );

  const handleOverride = useCallback(() => {
    setOverridden();
    setShowUpgrade(false);
    setForceUpdate(n => n + 1);
  }, []);

  return { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature, isDemoMode, handleOverride };
}
