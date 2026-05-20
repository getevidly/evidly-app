import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { SignalAlertBanner } from '../components/SignalAlertBanner';
import { WelcomeModal } from '../components/WelcomeModal';
import { PushOptInBanner } from '../components/PushOptInBanner';
import { usePageTitle } from '../hooks/usePageTitle';
import { DashboardSplash } from '../components/dashboard/DashboardSplash';
import { DashboardComposition } from '../components/dashboard/DashboardComposition';
import { DashboardWelcome } from '../components/dashboard/DashboardWelcome';

export function Dashboard() {
  const { user, profile } = useAuth();
  const { isDemoMode, firstName: demoFirstName } = useDemo();
  usePageTitle('Dashboard');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const seen = localStorage.getItem('evidly_welcome_seen');
    if (!seen) {
      setShowWelcome(true);
    }
  }, []);

  const welcomeFirstName = isDemoMode
    ? (demoFirstName || 'there')
    : (profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there');

  if (showSplash) return <DashboardSplash />;

  return (
    <div>
      {showWelcome && (
        <WelcomeModal
          firstName={welcomeFirstName}
          onDismiss={() => setShowWelcome(false)}
        />
      )}
      <SignalAlertBanner />
      {!showWelcome && <PushOptInBanner />}
      <DashboardWelcome />
      <DashboardComposition />
    </div>
  );
}
