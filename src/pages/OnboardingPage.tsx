import { Navigate } from 'react-router-dom';
import { useNewOnboarding } from '../lib/onboarding/featureFlag';
import { OnboardingCard } from '../components/onboarding/OnboardingCard';

export function OnboardingPage() {
  const enabled = useNewOnboarding();

  if (!enabled) {
    return <Navigate to="/dashboard" replace />;
  }

  return <OnboardingCard />;
}

export default OnboardingPage;
