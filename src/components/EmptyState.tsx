import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#FAF7F0]">
        <Icon className="w-8 h-8 text-[#1E2D4D]" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-2">{title}</h3>
      <p className="text-sm text-[#1E2D4D]/50 max-w-md mb-6 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 bg-[#1E2D4D] text-white rounded-lg font-medium transition-all hover:bg-[#162340] hover:-translate-y-0.5 hover:shadow-md min-h-[44px]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
