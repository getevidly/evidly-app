import { EvidLYWordmark } from './shared/EvidLYWordmark';

interface OnboardingHeaderProps {
  title: string;
  subtitle: string;
  progress: string;
}

export function OnboardingHeader({ title, subtitle, progress }: OnboardingHeaderProps) {
  return (
    <div className="bg-[#1E2D4D] rounded-t-xl px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <EvidLYWordmark className="text-lg" />
        <span className="text-[10px] font-medium text-[#FAF7F0]/60 uppercase tracking-wider">
          {progress}
        </span>
      </div>
      <h2 className="text-base font-semibold text-[#FAF7F0]">{title}</h2>
      <p className="text-xs text-[#FAF7F0]/70 mt-0.5">{subtitle}</p>
    </div>
  );
}
