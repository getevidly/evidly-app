// templates/fireSafety.ts — fire safety advisor briefing (fire_safety pillar only)
//
// TODO C17-NFPA: rewire to citations table when NFPA codes are seeded.
// Hood cleaning = NFPA 96 Table 12.4.
// Suppression service = NFPA 17A / UL 300.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Posture, DataSnapshot, BriefingInput } from '../types.ts';

// Fire safety citation strings — plain text until NFPA is seeded in citations table
const HOOD_CLEANING_REF = 'NFPA 96 Table 12.4 hood cleaning';
const SUPPRESSION_REF = 'NFPA 17A / UL 300 suppression service';

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
  _supabase: SupabaseClient,
  posture: Posture,
  snapshot: DataSnapshot,
  _input: BriefingInput,
): Promise<string> {
  if (posture === 'solid') {
    return [
      'Fire safety operations are in good standing.',
      `Hood cleaning, suppression service, and extinguisher inspections current per ${HOOD_CLEANING_REF} and ${SUPPRESSION_REF}, nothing missing this period.`,
      `Posture: solid \u2014 ${credentialStrap(snapshot)}`,
    ].join(' ');
  }

  if (posture === 'watch') {
    const n = snapshot.open_items.length;
    const items = topItemSummary(snapshot, 2);
    const verb = recommendVerb(snapshot);
    const tf = timeframe(snapshot);

    return [
      `Fire safety has ${pluralize(n, 'item')} running late this week \u2014 ${items}.`,
      `Recommend ${verb} within ${tf}.`,
      `Posture: watch \u2014 ${pluralize(n, 'item')} running late, no urgent fire safety exposure.`,
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
  if (proven > 0) headline += ` and ${pluralize(proven, 'confirmed gap')}`;
  headline += ' requiring immediate attention.';
  parts.push(headline);

  // Sentence 2: top driver
  if (topItem) {
    parts.push(`Top driver: ${topItem.title}.`);
  }

  // Sentence 3: confirmed gaps
  if (proven > 0) {
    parts.push(
      'Confirmed fire safety gaps carry measurable exposure \u2014 confirm hood cleaning records, suppression certifications, and extinguisher tags are documented before next fire marshal visit.',
    );
  }

  // Sentence 4: specific NFPA references when service-related
  const hasService = snapshot.open_items.some(
    (i) => i.source === 'service_record_due' || i.title.toLowerCase().includes('hood') || i.title.toLowerCase().includes('suppression'),
  );
  if (hasService) {
    parts.push(
      `Hood cleaning per ${HOOD_CLEANING_REF} and suppression service per ${SUPPRESSION_REF} apply.`,
    );
  }

  // Sentence 5: recommendation
  parts.push('Recommend fire safety lead review and acknowledgment within 24 hours.');

  // Sentence 6: posture
  const reasons: string[] = [];
  if (uc > 0) reasons.push(`${pluralize(uc, 'urgent item')}`);
  if (proven > 0) reasons.push(`${pluralize(proven, 'confirmed gap')}`);
  if (reasons.length === 0) reasons.push(`${snapshot.open_items.length}+ open items`);
  parts.push(`Posture: alarm \u2014 ${reasons.join(' + ')}.`);

  parts.push('');
  parts.push(credentialStrap(snapshot));

  return parts.join(' ').replace(/  /g, '\n');
}
