import type { PillarRequirement } from '../../../hooks/onboarding/usePillarRequirements';
import type { DelegationSuggestion } from '../../../hooks/onboarding/useDelegationSuggestion';
import { PillarHeader } from '../shared/PillarHeader';
import { RequirementChipRow, type ChipChoice } from './RequirementChipRow';
import { BulkApplyBanner } from './BulkApplyBanner';

interface PillarSectionProps {
  pillar: 'food_safety' | 'fire_safety';
  requirements: PillarRequirement[];
  choices: Record<string, ChipChoice>;
  suggestions: DelegationSuggestion[];
  /** Roles missing from team — used to show fallback owner hint on chips */
  missingRoles: string[];
  onChoose: (requirementCode: string, choice: 'me' | 'invite' | 'skip', skipReason?: string) => void;
  onBulkApply: (role: string) => void;
}

export function PillarSection({ pillar, requirements, choices, suggestions, missingRoles, onChoose, onBulkApply }: PillarSectionProps) {
  const committedCount = requirements.filter(r => choices[r.requirement_code] !== null && choices[r.requirement_code] !== undefined).length;

  // Show banners only for suggestions matching this pillar's requirements
  const pillarSuggestions = suggestions.filter(s =>
    requirements.some(r => r.typical_role === s.role && !choices[r.requirement_code])
  );

  return (
    <div className="mb-4">
      <div className="px-4">
        <PillarHeader
          pillar={pillar}
          completedCount={committedCount}
          totalCount={requirements.length}
        />
      </div>

      {pillarSuggestions.map(suggestion => (
        <BulkApplyBanner
          key={suggestion.role}
          suggestion={suggestion}
          onApply={onBulkApply}
        />
      ))}

      <div className="border-t border-[#E2DDD4]/50">
        {requirements.map(req => (
          <RequirementChipRow
            key={req.id}
            requirement={req}
            currentChoice={choices[req.requirement_code] ?? null}
            roleMissing={missingRoles.includes(req.typical_role)}
            onChoose={(choice, skipReason) => onChoose(req.requirement_code, choice, skipReason)}
          />
        ))}
      </div>
    </div>
  );
}
