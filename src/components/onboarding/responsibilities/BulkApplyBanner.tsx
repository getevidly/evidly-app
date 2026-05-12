import { UserPlus } from 'lucide-react';
import type { DelegationSuggestion } from '../../../hooks/onboarding/useDelegationSuggestion';

interface BulkApplyBannerProps {
  suggestion: DelegationSuggestion;
  onApply: (role: string) => void;
}

export function BulkApplyBanner({ suggestion, onApply }: BulkApplyBannerProps) {
  return (
    <div className="mx-4 my-3 px-4 py-3 bg-[#1E2D4D]/5 border border-[#1E2D4D]/10 rounded-lg flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-[#1E2D4D]/10 flex items-center justify-center flex-shrink-0">
        <UserPlus size={14} className="text-[#1E2D4D]" />
      </div>
      <p className="text-xs text-[#1E2D4D]/80 flex-1">
        <span className="font-medium">{suggestion.count} items</span> below typically go to{' '}
        <span className="font-medium">{suggestion.roleLabel}</span>.
      </p>
      <button
        type="button"
        onClick={() => onApply(suggestion.role)}
        className="text-xs font-medium text-[#1E2D4D] hover:underline whitespace-nowrap"
      >
        Apply to all &rarr;
      </button>
    </div>
  );
}
