import { ReactNode } from 'react';
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
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: '#eef4f8' }}
      >
        <Icon className="w-8 h-8" style={{ color: '#1e4d6b' }} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 text-white rounded-lg font-medium transition-all hover:-translate-y-0.5 hover:shadow-md min-h-[44px]"
          style={{ backgroundColor: '#1e4d6b' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
