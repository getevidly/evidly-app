// templates/foodSafety.ts — food safety advisor briefing (food_safety pillar only)

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Posture, DataSnapshot, BriefingInput } from '../types.ts';
import { resolveCitation, formatCitation } from '../citationResolver.ts';

function credentialStrap(snapshot: DataSnapshot): string {
  const base = 'FDA Food Code, CalCode';
  const agencies = snapshot.food_safety_agencies;
  return agencies.length > 0
    ? `Current with ${base}, and the requirements of ${agencies.join('; ')}.`
    : `Current with ${base}.`;
}

function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural || singular + 's'}`;
}

function topItemSummary(snapshot: DataSnapshot, max: number): string {
  const top = snapshot.open_items.slice(0, max);
  if (top.length === 0) return '';
  return top.map((i) => i.title).join(', ');
}

function urgentCount(snapshot: DataSnapshot): number {
  return snapshot.open_items.filter((i) => i.urgency === 'urgent').length;
}

function recommendVerb(snapshot: DataSnapshot): string {
  const sources = new Set(snapshot.open_items.map((i) => i.source));
  if (sources.has('corrective_action')) return 'corrective action close-out';
  if (sources.has('document_expiration') || sources.has('vendor_document_expiration'))
    return 'document renewal';
  if (sources.has('service_record_due')) return 'vendor service follow-up';
  if (sources.has('inspection_window')) return 'inspection prep review';
  if (sources.has('owner_decision')) return 'decision-maker review';
  return 'item review';
}

function timeframe(snapshot: DataSnapshot): string {
  const hasUrgent = snapshot.open_items.some((i) => i.urgency === 'urgent');
  if (hasUrgent) return '24 hours';
  const hasPulling = snapshot.open_items.some((i) => i.urgency === 'pulling');
  if (hasPulling) return '7 days';
  return '14 days';
}

export async function renderFoodSafety(
  supabase: SupabaseClient,
  posture: Posture,
  snapshot: DataSnapshot,
  _input: BriefingInput,
): Promise<string> {
  // Resolve common citations with fallback text (regulatory_citations is empty)
  const coldHold = await resolveCitation(supabase, null, 'CalCode \u00A7113996 cold-holding');
  const hotHold = await resolveCitation(supabase, null, 'CalCode \u00A7113996 hot-holding');

  if (posture === 'solid') {
    return [
      'Food safety operations are running clean.',
      `Cold-hold and hot-hold temps current per ${formatCitation(coldHold, null)}, employee certifications in good standing, no recent drift activity.`,
      `Posture: solid \u2014 ${credentialStrap(snapshot)}`,
    ].join(' ');
  }

  if (posture === 'watch') {
    const n = snapshot.open_items.length;
    const items = topItemSummary(snapshot, 2);
    const verb = recommendVerb(snapshot);
    const tf = timeframe(snapshot);

    return [
      `Food safety has ${pluralize(n, 'item')} pulling attention this week \u2014 ${items}.`,
      `Recommend ${verb} within ${tf}.`,
      `Posture: watch \u2014 ${pluralize(n, 'item')} pulling, no urgent food safety exposure.`,
      '',
      credentialStrap(snapshot),
    ].join(' ').replace('  ', '\n');
  }

  // alarm
  const uc = urgentCount(snapshot);
  const proven = snapshot.active_proven_drift_count;
  const topItem = snapshot.open_items[0];

  const parts: string[] = [];

  // Sentence 1
  let headline = `Food safety has ${pluralize(uc, 'urgent item')}`;
  if (proven > 0) headline += ` and ${pluralize(proven, 'proven drift event')}`;
  headline += ' requiring immediate attention.';
  parts.push(headline);

  // Sentence 2: top driver
  if (topItem) {
    parts.push(`Top driver: ${topItem.title}.`);
  }

  // Sentence 3: proven drift
  if (proven > 0) {
    parts.push(
      'Proven food safety drift events carry measurable exposure during jurisdiction interactions \u2014 confirm corrective actions are documented.',
    );
  }

  // Sentence 4: specific reg reference when applicable
  const hasTemp = snapshot.open_items.some(
    (i) => i.title.toLowerCase().includes('temp') || i.title.toLowerCase().includes('cold') || i.title.toLowerCase().includes('hot'),
  );
  if (hasTemp) {
    parts.push(
      `Temperature control requirements per ${formatCitation(coldHold, null)} and ${formatCitation(hotHold, null)} apply.`,
    );
  }

  // Sentence 5: recommendation
  parts.push('Recommend food safety lead review and acknowledgment within 24 hours.');

  // Sentence 6: posture
  const reasons: string[] = [];
  if (uc > 0) reasons.push(`${pluralize(uc, 'urgent item')}`);
  if (proven > 0) reasons.push(`${pluralize(proven, 'proven drift')}`);
  if (reasons.length === 0) reasons.push(`${snapshot.open_items.length}+ open items`);
  parts.push(`Posture: alarm \u2014 ${reasons.join(' + ')}.`);

  parts.push('');
  parts.push(credentialStrap(snapshot));

  return parts.join(' ').replace(/  /g, '\n');
}
