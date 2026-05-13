import { OnboardingCard } from '../components/onboarding/OnboardingCard';
import { OnboardingViewProvider } from '../contexts/OnboardingViewContext';

export function OnboardingPage() {
  return (
    <OnboardingViewProvider>
      <OnboardingCard />
    </OnboardingViewProvider>
  );
}

export default OnboardingPage;
