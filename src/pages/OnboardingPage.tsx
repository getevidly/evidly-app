import { useSearchParams } from 'react-router-dom';
import { OnboardingCard } from '../components/onboarding/OnboardingCard';
import { OnboardingViewProvider } from '../contexts/OnboardingViewContext';

export function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const highlightReq = searchParams.get('req');

  return (
    <OnboardingViewProvider>
      <OnboardingCard highlightReq={highlightReq} />
    </OnboardingViewProvider>
  );
}

export default OnboardingPage;
