import { tooltipContent, tooltipContentEs, type TooltipSection } from '../data/tooltipContent';
import type { UserRole } from '../contexts/RoleContext';
import { useTranslation } from '../contexts/LanguageContext';

export function useTooltip(section: TooltipSection, role: UserRole): string {
  const { locale } = useTranslation();
  const content = locale === 'es' ? tooltipContentEs : tooltipContent;
  return content[section]?.[role] ?? '';
}
