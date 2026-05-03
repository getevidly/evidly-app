// src/pages/SetupFoodSafety.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { WizardShell } from '../components/setup/WizardShell';

const TOTAL_STEPS = 7;
const PRIMARY = '#1E2D4D';
const TEXT_MUTED = '#5F5E5A';
const BORDER_DASHED = '#D3D1C7';

export function SetupFoodSafety() {
  usePageTitle('Set up food safety records');
  const navigate = useNavigate();

  // Step navigation lives here in 3d-3 as local state.
  // 3d-6 replaces this with the useSetupWizard reducer hook
  // (handles persistence, resume, dependency unlocking).
  const [currentStep, setCurrentStep] = useState(1);

    const handleNext = () => {
      setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
    };

    const handleBack = () => {
      setCurrentStep((s) => Math.max(s - 1, 1));
    };

    const handleStepClick = (step: number) => {
      setCurrentStep(step);
    };

  const handleSaveExit = () => {
    navigate('/dashboard');
  };

  return (
    <WizardShell
      eyebrow="Food safety profile"
      title="Set up your food safety records"
      currentStep={currentStep}
      totalSteps={TOTAL_STEPS}
      onBack={handleBack}
      onNext={handleNext}
      onSaveExit={handleSaveExit}
      onStepClick={handleStepClick}
      isBackHidden={currentStep === 1}
      nextLabel="Next"
    >
      <div>
        <h2
          className="text-2xl font-medium leading-tight"
          style={{ color: PRIMARY }}
        >
          Which preparation methods does your kitchen run?
        </h2>
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{ color: TEXT_MUTED }}
        >
          We'll surface the right temperature records and reminders for the way
          you actually cook.
        </p>

        <div
          className="mt-6 rounded-xl py-12 px-6 text-center"
          style={{
            border: `1px dashed ${BORDER_DASHED}`,
            color: TEXT_MUTED,
          }}
        >
          <p className="text-sm">
            Process selection wires up in 3d-7 (Q1 component) and 3d-8 (page
            integration). This commit ships the page wrapper and renders the
            wizard scaffold from 3d-1.
          </p>
        </div>
      </div>
    </WizardShell>
  );
}
