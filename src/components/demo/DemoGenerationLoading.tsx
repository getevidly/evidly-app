import { CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react';
import type { GenerationProgress } from '../../lib/demoDataGenerator';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

interface Props {
  companyName: string;
  city: string;
  state: string;
  steps: GenerationProgress[];
}

export function DemoGenerationLoading({ companyName, city, state, steps }: Props) {
  const completedCount = steps.filter(s => s.status === 'complete').length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8 text-center">
        {/* Header */}
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse" style={{ backgroundColor: `${GOLD}20` }}>
          <Sparkles className="w-7 h-7" style={{ color: GOLD }} />
        </div>
        <h2 className="text-lg font-bold mb-1" style={{ color: NAVY }}>
          Building Your Personalized Demo
        </h2>
        <p className="text-sm text-[#1E2D4D]/50 mb-6">
          Setting up <span className="font-semibold">{companyName}</span> in {city}, {state}...
        </p>

        {/* Steps */}
        <div className="text-left space-y-2 mb-6">
          {steps.map(step => (
            <div key={step.step} className="flex items-center gap-3 py-1">
              {step.status === 'complete' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : step.status === 'in_progress' ? (
                <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" style={{ color: NAVY }} />
              ) : (
                <Circle className="w-5 h-5 text-[#1E2D4D]/30 flex-shrink-0" />
              )}
              <span className={`text-sm ${
                step.status === 'complete' ? 'text-[#1E2D4D]/80' :
                step.status === 'in_progress' ? 'text-[#1E2D4D] font-medium' :
                'text-[#1E2D4D]/30'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="w-full h-2 rounded-full bg-[#1E2D4D]/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, backgroundColor: NAVY }}
            />
          </div>
        </div>
        <p className="text-xs text-[#1E2D4D]/30">
          {progress < 100 ? 'This takes about 30 seconds.' : 'Almost done...'}
        </p>
      </div>
    </div>
  );
}
