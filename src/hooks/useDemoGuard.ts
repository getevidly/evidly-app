import { useState, useCallback } from 'react';
import { useDemo } from '../contexts/DemoContext';

export function useDemoGuard() {
  const { isDemoMode } = useDemo();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeAction, setUpgradeAction] = useState('edit');
  const [upgradeFeature, setUpgradeFeature] = useState('');

  const guardAction = useCallback(
    (action: string, featureName: string, callback: () => void) => {
      if (isDemoMode) {
        setUpgradeAction(action);
        setUpgradeFeature(featureName);
        setShowUpgrade(true);
        return;
      }
      callback();
    },
    [isDemoMode]
  );

  return { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature, isDemoMode };
}
