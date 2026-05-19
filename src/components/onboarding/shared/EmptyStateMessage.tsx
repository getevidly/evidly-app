import { MapPin } from 'lucide-react';

interface EmptyStateMessageProps {
  stateName?: string;
}

export function EmptyStateMessage({ stateName }: EmptyStateMessageProps) {
  const displayState = stateName || 'your state';

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-[#FAF7F0] flex items-center justify-center mb-4">
        <MapPin size={24} className="text-[#1E2D4D]/40" />
      </div>
      <p className="text-sm text-[#1E2D4D]/70 max-w-sm leading-relaxed">
        Onboarding requirements for {displayState} are coming soon. Your county data is
        active — predictions, evaluations, and evidence all work. Reach out at{' '}
        <a href="mailto:founders@getevidly.com" className="underline text-[#1E2D4D]">
          founders@getevidly.com
        </a>{' '}
        if you need to onboard now.
      </p>
    </div>
  );
}
