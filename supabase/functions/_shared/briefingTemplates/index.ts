// briefingTemplates/index.ts — public API for the briefing template engine

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { BriefingInput, BriefingResult } from './types.ts';
import { loadData } from './dataLoader.ts';
import { computePosture } from './postureEngine.ts';
import { renderComplianceOfficer } from './templates/complianceOfficer.ts';
import { renderFoodSafety } from './templates/foodSafety.ts';
import { renderFireSafety } from './templates/fireSafety.ts';

export const TEMPLATE_VERSION = 1;

export async function generateBriefing(
  supabase: SupabaseClient,
  input: BriefingInput,
): Promise<BriefingResult> {
  const snapshot = await loadData(supabase, input);
  const posture = computePosture(snapshot);

  let briefing_text: string;
  switch (input.advisor_type) {
    case 'compliance_officer':
      briefing_text = await renderComplianceOfficer(supabase, posture, snapshot, input);
      break;
    case 'food_safety':
      briefing_text = await renderFoodSafety(supabase, posture, snapshot, input);
      break;
    case 'fire_safety':
      briefing_text = await renderFireSafety(supabase, posture, snapshot, input);
      break;
  }

  return {
    briefing_text,
    posture,
    open_items: snapshot.open_items,
    data_snapshot: snapshot,
    template_version: TEMPLATE_VERSION,
  };
}

export type {
  BriefingInput,
  BriefingResult,
  Posture,
  AdvisorType,
  DataSnapshot,
  OpenItem,
  Pillar,
  Urgency,
  CitationResolution,
} from './types.ts';
