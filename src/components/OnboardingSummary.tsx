import { useState, useEffect } from 'react';
import { CheckCircle, Circle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'evidly_onboarding_progress';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  link: string;
}

const STEPS: OnboardingStep[] = [
  { id: 'location', title: 'Add Your Location', description: 'Set up your kitchen with address and details.', link: '/settings' },
  { id: 'equipment', title: 'Add Your Equipment', description: 'Register walk-in coolers, freezers, and other temperature-monitored equipment.', link: '/equipment' },
  { id: 'documents', title: 'Upload Key Documents', description: 'Start with: Health Permit, Hood Cleaning Certificate, Fire Suppression Inspection.', link: '/documents' },
  { id: 'temp', title: 'Log Your First Temperature Reading', description: 'Walk to your cooler, check the thermometer, log it.', link: '/temp-logs' },
  { id: 'checklist', title: 'Complete Your First Daily Checklist', description: 'Run through the Opening Checklist to see how daily compliance tracking works.', link: '/checklists' },
  { id: 'vendors', title: 'Add Your Vendors', description: 'Register your hood cleaning company, pest control, and other service providers.', link: '/vendors' },
  { id: 'team', title: 'Invite Your Team', description: 'Add kitchen staff so they can log temps and complete checklists from their phones.', link: '/team' },
  { id: 'score', title: 'Review Your Compliance Score', description: 'See how your kitchen stacks up. Your goal: 90%+.', link: '/scoring-breakdown' },
];

function loadProgress(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function OnboardingSummary({ onClose }: { onClose?: () => void }) {
  const [completed, setCompleted] = useState<string[]>(loadProgress);
  const navigate = useNavigate();
  const progress = Math.round((completed.length / STEPS.length) * 100);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }, [completed]);

  const toggleStep = (id: string) => {
    setCompleted(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100" style={{ backgroundColor: '#eef4f8' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Getting Started with EvidLY</h2>
            <p className="text-sm text-gray-600 mt-1">Follow these steps to get your kitchen compliance-ready</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">Dismiss</button>
          )}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">{progress}% complete</span>
            <span className="text-gray-500">{completed.length}/{STEPS.length} steps</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#22c55e' : '#d4af37' }}
            />
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {STEPS.map((step, i) => {
          const done = completed.includes(step.id);
          return (
            <div
              key={step.id}
              className={`px-6 py-4 flex items-start gap-3 transition-colors ${done ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}
            >
              <button onClick={() => toggleStep(step.id)} className="mt-0.5 flex-shrink-0">
                {done ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {i + 1}. {step.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
              </div>
              <button
                onClick={() => navigate(step.link)}
                className="flex-shrink-0 text-[#1e4d6b] hover:text-[#2a6a8f] p-1"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {progress === 100 && (
        <div className="px-6 py-4 bg-green-50 border-t border-green-100 text-center">
          <p className="text-sm font-semibold text-green-700">You're all set! Your kitchen is compliance-ready.</p>
        </div>
      )}
    </div>
  );
}
