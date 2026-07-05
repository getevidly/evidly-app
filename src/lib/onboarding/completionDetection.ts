import { supabase } from '../supabase';

const FOOD_SAFETY_CODES = [
  'health_permit', 'food_manager_cert', 'food_handler_cards',
  'haccp_plan', 'temperature_logs', 'pest_control',
];

const FIRE_SAFETY_CODES = [
  'hood_cleaning', 'fire_suppression', 'fire_extinguishers',
  'fire_alarm', 'sprinkler_system', 'ahj_inspection',
];

/**
 * Read-only check: are the 4 onboarding conditions met?
 * Does NOT write to the database.
 *
 * Conditions:
 * 1. user_profiles has ≥1 row with role != 'member' AND full_name != ''
 * 2. ≥1 location exists
 * 3. Food Safety: ≥1 item done or skipped
 * 4. Fire Safety: ≥1 item done or skipped
 */
export async function checkOnboardingConditions(orgId: string): Promise<boolean> {
  try {
    // Condition 1: user_profiles with meaningful role + name
    const { count: profileCount } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .neq('role', 'member')
      .neq('full_name', '');

    if (!profileCount || profileCount === 0) return false;

    // Condition 2: at least 1 location
    const { count: locCount } = await supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    if (!locCount || locCount === 0) return false;

    // Get skipped + confirmed items for pillar checks
    const { data: orgData } = await supabase
      .from('organizations')
      .select('onboarding_skipped_items, onboarding_confirmed_items')
      .eq('id', orgId)
      .maybeSingle();

    const skipped: string[] = (orgData?.onboarding_skipped_items as string[]) || [];
    const confirmed: string[] = (orgData?.onboarding_confirmed_items as string[]) || [];

    // Condition 3: Food Safety ≥1 done, skipped, or confirmed
    const foodSkipped = skipped.some(code => FOOD_SAFETY_CODES.includes(code))
      || confirmed.some(code => FOOD_SAFETY_CODES.includes(code));
    let foodDone = false;
    if (!foodSkipped) {
      // Check compliance_documents for food safety upload items
      const { count: docCount } = await supabase
        .from('compliance_documents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .in('type', FOOD_SAFETY_CODES);

      foodDone = (docCount ?? 0) > 0;

      if (!foodDone) {
        // Also check temperature_logs (route_out item)
        const { data: locs } = await supabase
          .from('locations')
          .select('id')
          .eq('organization_id', orgId);

        if (locs && locs.length > 0) {
          const { count: tempCount } = await supabase
            .from('temperature_logs')
            .select('id', { count: 'exact', head: true })
            .in('facility_id', locs.map(l => l.id));

          foodDone = (tempCount ?? 0) > 0;
        }
      }

      if (!foodDone) return false;
    }

    // Condition 4: Fire Safety ≥1 done, skipped, or confirmed
    const fireSkipped = skipped.some(code => FIRE_SAFETY_CODES.includes(code))
      || confirmed.some(code => FIRE_SAFETY_CODES.includes(code));
    let fireDone = false;
    if (!fireSkipped) {
      const { count: schedCount } = await supabase
        .from('location_service_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .not('vendor_id', 'is', null);

      fireDone = (schedCount ?? 0) > 0;

      if (!fireDone) {
        // Also check compliance_documents for fire safety items
        const { count: fireDocCount } = await supabase
          .from('compliance_documents')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .in('type', FIRE_SAFETY_CODES);

        fireDone = (fireDocCount ?? 0) > 0;
      }

      if (!fireDone) return false;
    }

    return true;
  } catch (err) {
    console.error('[completionDetection] Error checking conditions:', err);
    return false;
  }
}

/**
 * Evaluates conditions + idempotently sets organizations.onboarding_completed = true.
 * Safe to call multiple times (fire-and-forget). Only flips false → true.
 */
export async function evaluateOnboardingComplete(orgId: string): Promise<boolean> {
  const complete = await checkOnboardingConditions(orgId);
  if (complete) {
    await supabase
      .from('organizations')
      .update({ onboarding_completed: true })
      .eq('id', orgId)
      .eq('onboarding_completed', false);
  }
  return complete;
}
