import { tooltipContent, type TooltipSection } from '../data/tooltipContent';
import type { UserRole } from '../contexts/RoleContext';

export function useTooltip(section: TooltipSection, role: UserRole): string {
  return tooltipContent[section]?.[role] ?? '';
}
