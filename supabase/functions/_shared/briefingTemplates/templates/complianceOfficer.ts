// templates/complianceOfficer.ts — compliance officer briefing (both pillars)

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Posture, DataSnapshot, BriefingInput } from '../types.ts';
import { resolveCitation, formatCitation } from '../citationResolver.ts';

const CREDENTIAL_STRAP =
  'Current with FDA Food Code, CalCode, NFPA 96, and CA Fire Code as adopted by applicable county codes.';

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

export async function renderComplianceOfficer(
  supabase: SupabaseClient,
  posture: Posture,
  snapshot: DataSnapshot,
  _input: BriefingInput,
): Promise<string> {
  if (posture === 'solid') {
    return [
      'Portfolio is current across food safety and fire safety.',
      'No drift activity in the last 30 days and no items pulling attention this week.',
      `Posture: solid \u2014 ${CREDENTIAL_STRAP}`,
    ].join(' ');
  }

  if (posture === 'watch') {
    const n = snapshot.open_items.length;
    const items = topItemSummary(snapshot, 2);
    const verb = recommendVerb(snapshot);
    const tf = timeframe(snapshot);

    return [
      `Portfolio is steady but ${pluralize(n, 'item')} pulling attention this week \u2014 ${items}.`,
      `Recommend ${verb} within ${tf}.`,
      `Posture: watch \u2014 ${pluralize(n, 'item')} pulling, no urgent exposure.`,
      '',
      CREDENTIAL_STRAP,
    ].join(' ').replace('  ', '\n');
  }

  // alarm
  const uc = urgentCount(snapshot);
  const proven = snapshot.active_proven_drift_count;
  const topItem = snapshot.open_items[0];

  const parts: string[] = [];

  // Sentence 1: headline
  let headline = `Portfolio has ${pluralize(uc, 'urgent item')}`;
  if (proven > 0) headline += ` and ${pluralize(proven, 'proven drift event')}`;
  headline += ' requiring decision-maker attention.';
  parts.push(headline);

  // Sentence 2: top driver
  if (topItem) {
    const pillarLabel = topItem.pillar === 'food_safety'
      ? 'food safety'
      : topItem.pillar === 'fire_safety'
        ? 'fire safety'
        : 'operational';
    parts.push(`Top driver: ${topItem.title} (${pillarLabel}).`);
  }

  // Sentence 3: proven drift warning
  if (proven > 0) {
    parts.push(
      'Proven drift events carry measurable operational exposure \u2014 confirm corrective actions are documented before next jurisdiction interaction.',
    );
  }

  // Sentence 4: recommendation
  parts.push('Recommend compliance manager review and acknowledgment within 24 hours.');

  // Sentence 5: posture reason
  const reasons: string[] = [];
  if (uc > 0) reasons.push(`${pluralize(uc, 'urgent item')}`);
  if (proven > 0) reasons.push(`${pluralize(proven, 'proven drift')}`);
  if (reasons.length === 0) reasons.push(`${snapshot.open_items.length}+ open items`);
  parts.push(`Posture: alarm \u2014 ${reasons.join(' + ')}.`);

  parts.push('');
  parts.push(CREDENTIAL_STRAP);

  return parts.join(' ').replace(/  /g, '\n');
}
