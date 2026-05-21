// templates/fireSafety.ts — fire safety advisor briefing (fire_safety pillar only)

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Posture, DataSnapshot, BriefingInput } from '../types.ts';
import { resolveCitation, formatCitation } from '../citationResolver.ts';

function credentialStrap(snapshot: DataSnapshot): string {
  const base = 'NFPA 96, NFPA 17A, NFPA 10, CA Fire Code';
  const agencies = snapshot.fire_safety_agencies;
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
  if (sources.has('service_record_due')) return 'vendor service follow-up';
  if (sources.has('document_expiration') || sources.has('vendor_document_expiration'))
    return 'document renewal';
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

export async function renderFireSafety(
  supabase: SupabaseClient,
  posture: Posture,
  snapshot: DataSnapshot,
  _input: BriefingInput,
): Promise<string> {
  // Resolve common fire safety citations with fallback text
  const hoodCleaning = await resolveCitation(supabase, null, 'NFPA 96 Table 11.4 hood cleaning frequency');
  const suppression = await resolveCitation(supabase, null, 'NFPA 96 \u00A711.2 fire suppression system maintenance');

  if (posture === 'solid') {
    return [
      'Fire safety operations are in good standing.',
      `Hood cleaning, suppression service, and extinguisher inspections current per ${formatCitation(hoodCleaning, null)} and ${formatCitation(suppression, null)}, no recent drift activity.`,
      `Posture: solid \u2014 ${credentialStrap(snapshot)}`,
    ].join(' ');
  }

  if (posture === 'watch') {
    const n = snapshot.open_items.length;
    const items = topItemSummary(snapshot, 2);
    const verb = recommendVerb(snapshot);
    const tf = timeframe(snapshot);

    return [
      `Fire safety has ${pluralize(n, 'item')} pulling attention this week \u2014 ${items}.`,
      `Recommend ${verb} within ${tf}.`,
      `Posture: watch \u2014 ${pluralize(n, 'item')} pulling, no urgent fire safety exposure.`,
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
  let headline = `Fire safety has ${pluralize(uc, 'urgent item')}`;
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
      'Proven fire safety drift events carry measurable exposure \u2014 confirm hood cleaning records, suppression certifications, and extinguisher tags are documented before next fire marshal visit.',
    );
  }

  // Sentence 4: specific NFPA references when service-related
  const hasService = snapshot.open_items.some(
    (i) => i.source === 'service_record_due' || i.title.toLowerCase().includes('hood') || i.title.toLowerCase().includes('suppression'),
  );
  if (hasService) {
    parts.push(
      `Hood cleaning frequency per ${formatCitation(hoodCleaning, null)} and suppression inspection per ${formatCitation(suppression, null)} apply.`,
    );
  }

  // Sentence 5: recommendation
  parts.push('Recommend fire safety lead review and acknowledgment within 24 hours.');

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
