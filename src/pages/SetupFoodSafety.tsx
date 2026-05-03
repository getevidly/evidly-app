// src/pages/SetupFoodSafety.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { WizardShell } from '../components/setup/WizardShell';

const TOTAL_STEPS = 7;
const PRIMARY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_MUTED = '#5F5E5A';
const STEP_INACTIVE_TEXT = '#888780';
const SELECTED_BG = '#FFFDF5';
const ICON_BG_SELECTED = '#F4EDD9';
const ICON_BG_UNSELECTED = '#F1EFE8';
const BORDER_UNSELECTED = '#E5E2D5';
const RING_UNSELECTED = '#D3D1C7';

interface ProcessOption {
  key: string;
  name: string;
  code: string;
  description: string;
  iconPath: string;
}

const PROCESSES: ProcessOption[] = [
  {
    key: 'process_1',
    name: 'Receive and serve',
    code: 'PROCESS 1',
    description: 'No cooking step. Salads, sandwiches, sushi from cooked components.',
    iconPath: 'M3 11h18l-2 9H5l-2-9z M7 11V8a5 5 0 0 1 10 0v3',
  },
  {
    key: 'process_2',
    name: 'Cook and serve same day',
    code: 'PROCESS 2',
    description: 'Cook today, serve today. Hamburgers, grilled chicken, eggs to order, stir-fry.',
    iconPath: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  },
  {
    key: 'process_3',
    name: 'Cook ahead, store, reheat',
    code: 'PROCESS 3',
    description: 'Cook today, refrigerate, reheat tomorrow. Soups, stews, sauces, large roasts, batch-prepped proteins.',
    iconPath: 'M12 6 v6 l4 2',
  },
];

export function SetupFoodSafety() {
  usePageTitle('Set up food safety records');
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);

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

  const toggleProcess = (key: string) => {
    setSelectedProcesses((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isQ1Step = currentStep === 1;
  const isNextDisabled = isQ1Step && selectedProcesses.length === 0;

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
      isNextDisabled={isNextDisabled}
      nextLabel="Next"
    >
      {isQ1Step ? (
        <div>
          <h2 className="font-medium leading-tight" style={{ color: PRIMARY, fontSize: 22 }}>
            Which preparation methods does your kitchen run?
          </h2>
          <p className="mt-2 leading-relaxed" style={{ color: TEXT_MUTED, fontSize: 14 }}>
            We'll surface the right temperature records and reminders for the way you actually cook.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {PROCESSES.map((p) => {
              const isSelected = selectedProcesses.includes(p.key);
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => toggleProcess(p.key)}
                  className="text-left rounded-xl flex gap-3.5 items-start transition-colors"
                  style={{
                    border: isSelected ? `2px solid ${GOLD}` : `1px solid ${BORDER_UNSELECTED}`,
                    background: isSelected ? SELECTED_BG : '#ffffff',
                    padding: isSelected ? '13px 15px' : '14px 16px',
                  }}
                  aria-pressed={isSelected}
                >
                  <div
                    className="rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      background: isSelected ? ICON_BG_SELECTED : ICON_BG_UNSELECTED,
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isSelected ? GOLD : TEXT_MUTED}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {p.key === 'process_3' ? (
                        <>
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </>
                      ) : (
                        <path d={p.iconPath} />
                      )}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-medium" style={{ color: PRIMARY, fontSize: 15 }}>
                        {p.name}
                      </div>
                      <div className="font-medium" style={{ color: STEP_INACTIVE_TEXT, fontSize: 11 }}>
                        {p.code}
                      </div>
                    </div>
                    <p className="mt-1 leading-relaxed" style={{ color: TEXT_MUTED, fontSize: 13 }}>
                      {p.description}
                    </p>
                  </div>
                  <div
                    className="rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 22,
                      height: 22,
                      background: isSelected ? GOLD : '#ffffff',
                      border: isSelected ? 'none' : `1.5px solid ${RING_UNSELECTED}`,
                    }}
                  >
                    {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center" style={{ color: TEXT_MUTED, fontSize: 14 }}>
          Step {currentStep} content lands in upcoming commits.
        </div>
      )}
    </WizardShell>
  );
}
