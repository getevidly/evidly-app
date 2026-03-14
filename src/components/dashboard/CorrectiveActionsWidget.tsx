import { ChevronRight } from 'lucide-react';
import { NAVY } from './shared/constants';

interface Props {
  navigate: (path: string) => void;
}

export function CorrectiveActionsWidget({ navigate }: Props) {
  // No seeded data — widget only shows when live CA records exist.
  // With zero records, render nothing (returns null).
  // In production, this will query Supabase for open CAs.
  return null;
}
