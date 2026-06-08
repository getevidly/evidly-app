// briefingTemplates/dataLoader.ts — load and normalize data from 7 PROD sources

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type {
  BriefingInput,
  DataSnapshot,
  OpenItem,
  Pillar,
  Urgency,
} from './types.ts';
import { itemLabel } from './itemLabels.ts';

// ── Pillar filter from advisor type ────────────────────────────────
function pillarFilterFor(advisor_type: string): Pillar | null {
  if (advisor_type === 'food_safety') return 'food_safety';
  if (advisor_type === 'fire_safety') return 'fire_safety';
  return null; // compliance_officer sees both pillars
}

// ── Urgency helpers ────────────────────────────────────────────────
function severityToUrgency(severity: string): Urgency {
  if (severity === 'critical' || severity === 'high') return 'urgent';
  if (severity === 'medium') return 'pulling';
  return 'review';
}

function priorityToUrgency(priority: string): Urgency {
  if (priority === 'urgent') return 'urgent';
  if (priority === 'soon') return 'pulling';
  return 'review';
}

function daysToUrgency(daysUntil: number | null): Urgency {
  if (daysUntil === null) return 'review';
  if (daysUntil <= 7) return 'urgent';
  if (daysUntil <= 14) return 'pulling';
  return 'review';
}

function serviceUrgencyToUrgency(su: string | null): Urgency {
  if (su === 'urgent' || su === 'critical') return 'urgent';
  if (su === 'high' || su === 'soon') return 'pulling';
  return 'review';
}

function daysBetween(dateStr: string, now: Date): number {
  const target = new Date(dateStr + 'T00:00:00Z');
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

const URGENCY_RANK: Record<Urgency, number> = { urgent: 0, pulling: 1, review: 2 };

// ── Main loader ────────────────────────────────────────────────────
export async function loadData(
  supabase: SupabaseClient,
  input: BriefingInput,
): Promise<DataSnapshot> {
  const { org_id, advisor_type, location_id } = input;
  const pf = pillarFilterFor(advisor_type);
  const now = new Date();
  const nowISO = now.toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86_400_000)
    .toISOString()
    .split('T')[0]; // date only for comparison with date columns

  const items: OpenItem[] = [];

  // ── SOURCE 1: open drift_catches ─────────────────────────────────
  // drift_catches uses org_id (not organization_id)
  {
    let q = supabase
      .from('drift_catches')
      .select('id, pillar, severity, drift_type, detected_at, location_id')
      .eq('org_id', org_id)
      .in('status', ['open', 'reduced', 'proven']);

    if (pf) q = q.eq('pillar', pf);
    if (location_id) q = q.eq('location_id', location_id);

    const { data: rows } = await q;
    for (const r of rows || []) {
      items.push({
        source: 'drift_catch',
        source_id: r.id,
        pillar: r.pillar as Pillar,
        urgency: severityToUrgency(r.severity),
        title: itemLabel(r.drift_type || 'unknown'),
        location_id: r.location_id,
        detected_at: r.detected_at || nowISO,
      });
    }
  }

  // ── SOURCE 2: open owner_decisions ───────────────────────────────
  // owner_decisions uses org_id (not organization_id)
  {
    let q = supabase
      .from('owner_decisions')
      .select('id, decision_type, priority, title, source_table, source_record_id, location_id, created_at')
      .eq('org_id', org_id)
      .eq('status', 'open');

    if (location_id) q = q.eq('location_id', location_id);

    const { data: rows } = await q;
    for (const r of rows || []) {
      const derivedPillar = await deriveDecisionPillar(supabase, r);
      // Apply pillar filter
      if (pf && derivedPillar !== null && derivedPillar !== pf) continue;
      // If pillar is null and filter is non-null, exclude from food/fire advisors
      if (pf && derivedPillar === null) continue;

      items.push({
        source: 'owner_decision',
        source_id: r.id,
        pillar: derivedPillar,
        urgency: priorityToUrgency(r.priority),
        title: r.title || `Decision: ${r.decision_type}`,
        location_id: r.location_id,
        detected_at: r.created_at || nowISO,
      });
    }
  }

  // ── SOURCE 3: open corrective_actions ────────────────────────────
  // corrective_actions uses organization_id
  {
    let q = supabase
      .from('corrective_actions')
      .select('id, pillar, title, due_date, location_id, created_at')
      .eq('organization_id', org_id)
      .eq('status', 'open');

    if (pf) q = q.eq('pillar', pf);
    if (location_id) q = q.eq('location_id', location_id);

    const { data: rows } = await q;
    for (const r of rows || []) {
      const daysUntil = r.due_date ? daysBetween(r.due_date, now) : null;
      items.push({
        source: 'corrective_action',
        source_id: r.id,
        pillar: (r.pillar as Pillar) || null,
        urgency: daysToUrgency(daysUntil),
        title: r.title || 'Corrective action open',
        location_id: r.location_id,
        detected_at: r.created_at || nowISO,
      });
    }
  }

  // ── SOURCE 4: expiring documents (next 30 days) ──────────────────
  // documents uses organization_id
  {
    const todayStr = nowISO.split('T')[0];
    let q = supabase
      .from('documents')
      .select('id, title, category, expiration_date, location_id, created_at')
      .eq('organization_id', org_id)
      .gte('expiration_date', todayStr)
      .lte('expiration_date', thirtyDaysFromNow);

    if (location_id) q = q.eq('location_id', location_id);

    const { data: rows } = await q;
    for (const r of rows || []) {
      const docPillar = await resolveDocPillar(supabase, r.category);
      if (pf && docPillar !== null && docPillar !== pf) continue;
      if (pf && docPillar === null) continue;

      const daysUntil = daysBetween(r.expiration_date, now);
      items.push({
        source: 'document_expiration',
        source_id: r.id,
        pillar: docPillar,
        urgency: daysToUrgency(daysUntil),
        title: r.title || 'Document expiring',
        location_id: r.location_id,
        detected_at: r.created_at || nowISO,
      });
    }
  }

  // ── SOURCE 5: expiring vendor_documents (next 30 days) ───────────
  // vendor_documents uses organization_id
  {
    const todayStr = nowISO.split('T')[0];
    let q = supabase
      .from('vendor_documents')
      .select('id, title, document_type, expiration_date, location_id, created_at, status')
      .eq('organization_id', org_id)
      .gte('expiration_date', todayStr)
      .lte('expiration_date', thirtyDaysFromNow);

    if (location_id) q = q.eq('location_id', location_id);

    const { data: rows } = await q;
    for (const r of rows || []) {
      // Skip rejected or superseded documents
      if (r.status === 'rejected' || r.status === 'superseded') continue;

      const docPillar = await resolveDocPillar(supabase, r.document_type);
      if (pf && docPillar !== null && docPillar !== pf) continue;
      if (pf && docPillar === null) continue;

      const daysUntil = daysBetween(r.expiration_date, now);
      items.push({
        source: 'vendor_document_expiration',
        source_id: r.id,
        pillar: docPillar,
        urgency: daysToUrgency(daysUntil),
        title: r.title || 'Vendor document expiring',
        location_id: r.location_id,
        detected_at: r.created_at || nowISO,
      });
    }
  }

  // ── SOURCE 6: upcoming service records due (next 30 days) ────────
  // vendor_service_records uses organization_id
  {
    const todayStr = nowISO.split('T')[0];
    let q = supabase
      .from('vendor_service_records')
      .select('id, service_type_code, next_due_date, location_id, created_at')
      .eq('organization_id', org_id)
      .gte('next_due_date', todayStr)
      .lte('next_due_date', thirtyDaysFromNow);

    if (location_id) q = q.eq('location_id', location_id);

    const { data: rows } = await q;
    for (const r of rows || []) {
      const svcPillar = await resolveServicePillar(supabase, r.service_type_code);
      // facility_services: only Compliance Officer sees these
      if (svcPillar === 'facility_services' as string && pf !== null) continue;
      // Apply pillar filter for food/fire
      if (pf && svcPillar !== null && svcPillar !== pf) continue;

      const daysUntil = daysBetween(r.next_due_date, now);
      const shortName = await resolveServiceShortName(supabase, r.service_type_code);
      items.push({
        source: 'service_record_due',
        source_id: r.id,
        pillar: (svcPillar === 'food_safety' || svcPillar === 'fire_safety') ? svcPillar as Pillar : null,
        urgency: daysToUrgency(daysUntil),
        title: `${shortName || 'Service'} due ${r.next_due_date}`,
        location_id: r.location_id,
        detected_at: r.created_at || nowISO,
      });
    }
  }

  // ── SOURCE 7: location_risk_predictions (inspection windows) ─────
  // location_risk_predictions uses organization_id
  {
    let q = supabase
      .from('location_risk_predictions')
      .select('id, risk_level, service_urgency, top_risk_pillars, input_days_to_next_inspection, location_id, predicted_at')
      .eq('organization_id', org_id)
      .gt('expires_at', nowISO)
      .not('input_days_to_next_inspection', 'is', null)
      .lte('input_days_to_next_inspection', 30);

    if (location_id) q = q.eq('location_id', location_id);

    const { data: rows } = await q;
    for (const r of rows || []) {
      const pillars: string[] = r.top_risk_pillars || [];

      // Pillar filter: include row only if filter matches a top_risk_pillar
      if (pf && !pillars.includes(pf)) continue;

      // Pick first matching pillar for the OpenItem
      let matchedPillar: Pillar | null = null;
      if (pf) {
        matchedPillar = pf;
      } else if (pillars.length > 0) {
        const first = pillars.find((p) => p === 'food_safety' || p === 'fire_safety');
        matchedPillar = (first as Pillar) || null;
      }

      items.push({
        source: 'inspection_window',
        source_id: r.id,
        pillar: matchedPillar,
        urgency: serviceUrgencyToUrgency(r.service_urgency),
        title: `Inspection predicted in ${r.input_days_to_next_inspection} days \u2014 risk level: ${r.risk_level || 'unknown'}`,
        location_id: r.location_id,
        detected_at: r.predicted_at || nowISO,
      });
    }
  }

  // ── Sort: urgency rank ascending, then detected_at descending ────
  items.sort((a, b) => {
    const urgDiff = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (urgDiff !== 0) return urgDiff;
    return b.detected_at.localeCompare(a.detected_at);
  });

  // ── Aggregate counts ─────────────────────────────────────────────
  let recentDriftCount30d = 0;
  let activeProvenDriftCount = 0;
  {
    let q1 = supabase
      .from('drift_catches')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .gte('detected_at', thirtyDaysAgo);
    if (pf) q1 = q1.eq('pillar', pf);
    if (location_id) q1 = q1.eq('location_id', location_id);
    const { count: c1 } = await q1;
    recentDriftCount30d = c1 || 0;

    let q2 = supabase
      .from('drift_catches')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .eq('status', 'proven');
    if (pf) q2 = q2.eq('pillar', pf);
    if (location_id) q2 = q2.eq('location_id', location_id);
    const { count: c2 } = await q2;
    activeProvenDriftCount = c2 || 0;
  }

  let openCorrectiveActions = 0;
  {
    let q = supabase
      .from('corrective_actions')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org_id)
      .eq('status', 'open');
    if (pf) q = q.eq('pillar', pf);
    if (location_id) q = q.eq('location_id', location_id);
    const { count: c } = await q;
    openCorrectiveActions = c || 0;
  }

  const expiringDocuments30d =
    items.filter((i) => i.source === 'document_expiration' || i.source === 'vendor_document_expiration').length;
  const upcomingServiceDue30d =
    items.filter((i) => i.source === 'service_record_due').length;
  const upcomingInspections30d =
    items.filter((i) => i.source === 'inspection_window').length;

  // ── Jurisdiction agencies + IDs for credential straps + citation delta lookups
  const food_safety_agencies: string[] = [];
  const fire_safety_agencies: string[] = [];
  let food_safety_jurisdiction_id: string | null = null;
  let fire_safety_jurisdiction_id: string | null = null;
  {
    let locQ = supabase
      .from('locations')
      .select('id, jurisdiction_id, jurisdictions(id, agency_name, fire_ahj_name)')
      .eq('organization_id', org_id);
    if (location_id) locQ = locQ.eq('id', location_id);
    const { data: orgLocs } = await locQ;

    for (const loc of orgLocs || []) {
      const j = (loc as any).jurisdictions;
      if (!j) continue;
      const agencyName = j.agency_name as string | undefined;
      const fireAhj = j.fire_ahj_name as string | undefined;
      const jId = (loc as any).jurisdiction_id as string | undefined;

      if (agencyName && !food_safety_agencies.includes(agencyName)) {
        food_safety_agencies.push(agencyName);
      }
      if (!food_safety_jurisdiction_id && jId) {
        food_safety_jurisdiction_id = jId;
      }
      if (fireAhj && !fire_safety_agencies.includes(fireAhj)) {
        fire_safety_agencies.push(fireAhj);
      }
      if (!fire_safety_jurisdiction_id && jId) {
        fire_safety_jurisdiction_id = jId;
      }
    }
  }

  return {
    open_items: items,
    recent_drift_count_30d: recentDriftCount30d,
    active_proven_drift_count: activeProvenDriftCount,
    expiring_documents_30d: expiringDocuments30d,
    upcoming_service_due_30d: upcomingServiceDue30d,
    upcoming_inspections_30d: upcomingInspections30d,
    open_corrective_actions: openCorrectiveActions,
    food_safety_agencies,
    fire_safety_agencies,
    food_safety_jurisdiction_id,
    fire_safety_jurisdiction_id,
    scope: {
      advisor_type: input.advisor_type,
      location_id: input.location_id,
      pillar_filter: pf,
    },
  };
}

// ── Pillar derivation helpers ──────────────────────────────────────

// Cache for document_type_definitions and service_type_definitions lookups
const docTypeCache = new Map<string, string | null>();
const svcTypeCache = new Map<string, string | null>();
const svcNameCache = new Map<string, string | null>();

/**
 * Resolve documents.category or vendor_documents.document_type → pillar
 * via soft-join to document_type_definitions.code → .category.
 * Returns null on miss (no FK assumption).
 */
async function resolveDocPillar(
  supabase: SupabaseClient,
  categoryCode: string | null,
): Promise<Pillar | null> {
  if (!categoryCode) return null;
  if (docTypeCache.has(categoryCode)) {
    const cached = docTypeCache.get(categoryCode)!;
    return (cached === 'food_safety' || cached === 'fire_safety') ? cached as Pillar : null;
  }

  const { data } = await supabase
    .from('document_type_definitions')
    .select('category')
    .eq('code', categoryCode)
    .eq('is_active', true)
    .maybeSingle();

  const cat = data?.category || null;
  docTypeCache.set(categoryCode, cat);
  return (cat === 'food_safety' || cat === 'fire_safety') ? cat as Pillar : null;
}

/**
 * Resolve vendor_service_records.service_type_code → pillar
 * via join to service_type_definitions.code → .category.
 * Returns the raw category string (food_safety, fire_safety, or facility_services).
 */
async function resolveServicePillar(
  supabase: SupabaseClient,
  serviceTypeCode: string | null,
): Promise<string | null> {
  if (!serviceTypeCode) return null;
  if (svcTypeCache.has(serviceTypeCode)) return svcTypeCache.get(serviceTypeCode)!;

  const { data } = await supabase
    .from('service_type_definitions')
    .select('category')
    .eq('code', serviceTypeCode)
    .eq('is_active', true)
    .maybeSingle();

  const cat = data?.category || null;
  svcTypeCache.set(serviceTypeCode, cat);
  return cat;
}

/**
 * Resolve service_type_code → short_name for display in open item titles.
 */
async function resolveServiceShortName(
  supabase: SupabaseClient,
  serviceTypeCode: string | null,
): Promise<string | null> {
  if (!serviceTypeCode) return null;
  if (svcNameCache.has(serviceTypeCode)) return svcNameCache.get(serviceTypeCode)!;

  const { data } = await supabase
    .from('service_type_definitions')
    .select('short_name')
    .eq('code', serviceTypeCode)
    .eq('is_active', true)
    .maybeSingle();

  const name = data?.short_name || null;
  svcNameCache.set(serviceTypeCode, name);
  return name;
}

/**
 * Derive pillar for an owner_decision row based on decision_type:
 * - vendor_change, contract_renewal → fire_safety
 * - service_schedule → look up source_record in vendor_service_records → service_type_definitions
 * - ca_approval → look up source_record in corrective_actions → inherit .pillar
 * - doc_renewal → look up source_record in documents → document_type_definitions
 */
async function deriveDecisionPillar(
  supabase: SupabaseClient,
  decision: {
    decision_type: string;
    source_table: string | null;
    source_record_id: string | null;
  },
): Promise<Pillar | null> {
  const { decision_type, source_table, source_record_id } = decision;

  if (decision_type === 'vendor_change' || decision_type === 'contract_renewal') {
    return 'fire_safety';
  }

  if (decision_type === 'service_schedule' && source_record_id) {
    const { data } = await supabase
      .from('vendor_service_records')
      .select('service_type_code')
      .eq('id', source_record_id)
      .maybeSingle();
    if (data?.service_type_code) {
      const cat = await resolveServicePillar(supabase, data.service_type_code);
      return (cat === 'food_safety' || cat === 'fire_safety') ? cat as Pillar : null;
    }
    return null;
  }

  if (decision_type === 'ca_approval' && source_record_id) {
    const { data } = await supabase
      .from('corrective_actions')
      .select('pillar')
      .eq('id', source_record_id)
      .maybeSingle();
    const p = data?.pillar;
    return (p === 'food_safety' || p === 'fire_safety') ? p as Pillar : null;
  }

  if (decision_type === 'doc_renewal' && source_record_id) {
    const table = source_table || 'documents';
    if (table === 'documents') {
      const { data } = await supabase
        .from('documents')
        .select('category')
        .eq('id', source_record_id)
        .maybeSingle();
      return resolveDocPillar(supabase, data?.category || null);
    }
    if (table === 'vendor_documents') {
      const { data } = await supabase
        .from('vendor_documents')
        .select('document_type')
        .eq('id', source_record_id)
        .maybeSingle();
      return resolveDocPillar(supabase, data?.document_type || null);
    }
  }

  return null;
}
