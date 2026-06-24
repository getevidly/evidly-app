// Trigger 4 — document_expiration
// Reads compliance_documents (canonical table) for Food + Fire documents
// with expiry_date approaching within 30 days.
// Excludes category='business' (vendor COIs/W-9s = vendor mgmt, not compliance drift).
// Pillar determined by document type using canonical DOCUMENT_TYPE_OPTIONS mapping.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

// Canonical fire_safety document types from documentClassifier.ts DOCUMENT_TYPE_OPTIONS
const FIRE_TYPES = new Set([
  'hood_cleaning_cert', 'fire_suppression_report', 'fire_extinguisher_tag',
  'ansul_cert', 'exhaust_fan_service', 'building_fire_inspection',
  'elevator_inspection_cert', 'elevator_maintenance_record', 'elevator_permit',
  'pest_control_contract', 'pest_activity_log',
  'grease_trap_pumping_receipt', 'grease_trap_inspection_report',
  'grease_interceptor_maintenance_log', 'fog_compliance_report',
  'backflow_preventer_certification', 'backflow_compliance_letter',
  'suppression_inspection_report', 'fire_alarm_inspection_cert',
  'sprinkler_inspection_report', 'hood_cleaning_service_record',
]);

// Canonical food_safety document types
const FOOD_TYPES = new Set([
  'health_permit', 'food_handler_cert', 'food_manager_cert',
  'haccp_plan', 'allergen_training', 'pest_control_report',
]);

// Fire keywords for fallback heuristic on free-text types
const FIRE_KEYWORDS = ['fire', 'hood', 'suppression', 'extinguisher', 'sprinkler', 'alarm', 'ansul', 'grease', 'backflow', 'elevator', 'fog'];

function determinePillar(type: string | null, category: string): 'food_safety' | 'fire_safety' {
  if (type) {
    if (FIRE_TYPES.has(type)) return 'fire_safety';
    if (FOOD_TYPES.has(type)) return 'food_safety';
    // Fallback: check if the free-text type contains fire keywords
    const lower = type.toLowerCase();
    if (FIRE_KEYWORDS.some((kw) => lower.includes(kw))) return 'fire_safety';
  }
  // Category-based fallback: service docs are predominantly fire safety (hood/suppression certs)
  if (category === 'service') return 'fire_safety';
  // kitchen + employee = food safety (health permits, food handler certs)
  return 'food_safety';
}

function determineSeverity(daysRemaining: number): 'critical' | 'high' | 'medium' {
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 14) return 'high';
  return 'medium';
}

export async function detectDocumentExpiration(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];
  const today = ctx.now.toISOString().substring(0, 10);
  const thirtyDaysOut = new Date(ctx.now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);

  // Read from compliance_documents (canonical table).
  // Scope: Food + Fire only — category IN (kitchen, employee, service).
  // Exclude category='business' (vendor COIs, W-9s, licenses = vendor management alerts).
  // Status: current or expiring (already in the expiry lifecycle).
  const { data: docs, error } = await ctx.supabase
    .from('compliance_documents')
    .select('id, organization_id, category, type, expiry_date, location_id')
    .eq('organization_id', ctx.orgId)
    .in('status', ['current', 'expiring'])
    .in('category', ['kitchen', 'employee', 'service'])
    .not('expiry_date', 'is', null)
    .gte('expiry_date', today)
    .lte('expiry_date', thirtyDaysOut);

  if (error || !docs?.length) return catches;

  for (const doc of docs) {
    // Check if a replacement document exists (same type + category, later expiry, not archived)
    const { count } = await ctx.supabase
      .from('compliance_documents')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ctx.orgId)
      .eq('category', doc.category)
      .eq('type', doc.type)
      .in('status', ['current', 'expiring'])
      .gt('expiry_date', doc.expiry_date);

    if (count && count > 0) continue; // Replacement exists

    const daysRemaining = Math.ceil(
      (new Date(doc.expiry_date).getTime() - ctx.now.getTime()) / (24 * 60 * 60 * 1000),
    );

    // Assign to a location — use doc.location_id, or first org location as fallback
    const locationId = doc.location_id || ctx.locations[0]?.id;
    if (!locationId) continue;

    catches.push({
      org_id: ctx.orgId,
      location_id: locationId,
      drift_type: 'document_expiration',
      pillar: determinePillar(doc.type, doc.category),
      source_table: 'compliance_documents',
      source_record_id: doc.id,
      expected_value: doc.expiry_date,
      actual_value: `${daysRemaining} days remaining`,
      severity: determineSeverity(daysRemaining),
      estimated_savings_cents: 0,
    });
  }

  return catches;
}
