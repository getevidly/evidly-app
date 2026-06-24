// detect-operational-drift — auto-resolution for open drift catches
//
// Auto-resolve is implemented for triggers where the resolution condition
// is clean and deterministic:
//   - temperature_out_of_range: last 4 readings for same equipment all pass
//   - document_expiration: newer compliance_document with same type+category exists
//   - missed_checklist: completion now exists for the missed period
//   - receiving_log_missing: receiving log now exists for that day
//
// Manual-resolution-only triggers (resolution condition is ambiguous or
// requires human judgment):
//   - temperature_trend_drift (trend may re-emerge)
//   - allergen_training_overdue (training process is multi-step)
//   - hood_cleaning_approaching (scheduling confirmation needed)
//   - suppression_semi_annual_due (service confirmation needed)
//   - extinguisher_monthly_missed (inspection confirmation needed)
//   - inspection_readiness_gap (multi-factor resolution)
//   - team_miss_clustering (management review needed)
//   - streak_break (pattern re-establishment is gradual)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function autoResolveDriftCatches(
  supabase: SupabaseClient,
  orgId: string,
): Promise<number> {
  let resolved = 0;

  // Fetch all open catches for this org that are auto-resolvable types
  const { data: openCatches, error } = await supabase
    .from('drift_catches')
    .select('id, drift_type, location_id, source_table, source_record_id')
    .eq('org_id', orgId)
    .in('status', ['open', 'reduced', 'proven'])
    .in('drift_type', [
      'temperature_out_of_range',
      'document_expiration',
      'missed_checklist',
      'receiving_log_missing',
    ]);

  if (error || !openCatches?.length) return 0;

  for (const catch_ of openCatches) {
    let shouldResolve = false;

    try {
      if (catch_.drift_type === 'temperature_out_of_range' && catch_.source_record_id) {
        // Check if last 4 readings for this equipment now all pass
        const { data: src } = await supabase
          .from('temperature_logs')
          .select('equipment_id')
          .eq('id', catch_.source_record_id)
          .maybeSingle();

        if (src?.equipment_id) {
          const { data: recent } = await supabase
            .from('temperature_logs')
            .select('temp_pass')
            .eq('equipment_id', src.equipment_id)
            .order('reading_time', { ascending: false })
            .limit(4);

          if (recent && recent.length >= 4 && recent.every((r) => r.temp_pass === true)) {
            shouldResolve = true;
          }
        }
      } else if (catch_.drift_type === 'document_expiration' && catch_.source_record_id) {
        // Check if a newer document with same type+category now exists
        const { data: srcDoc } = await supabase
          .from('compliance_documents')
          .select('category, type, expiry_date')
          .eq('id', catch_.source_record_id)
          .maybeSingle();

        if (srcDoc) {
          const { count } = await supabase
            .from('compliance_documents')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('category', srcDoc.category)
            .eq('type', srcDoc.type)
            .in('status', ['current', 'expiring'])
            .gt('expiry_date', srcDoc.expiry_date);

          if (count && count > 0) shouldResolve = true;
        }
      } else if (catch_.drift_type === 'missed_checklist' && catch_.source_record_id) {
        // Check if a completion now exists for this checklist today
        const { count } = await supabase
          .from('checklist_completions')
          .select('*', { count: 'exact', head: true })
          .eq('checklist_id', catch_.source_record_id)
          .eq('location_id', catch_.location_id)
          .gte('completed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

        if (count && count > 0) shouldResolve = true;
      } else if (catch_.drift_type === 'receiving_log_missing') {
        // Check if a receiving log now exists for this location today
        const { count } = await supabase
          .from('receiving_temp_logs')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', catch_.location_id)
          .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

        if (count && count > 0) shouldResolve = true;
      }

      if (shouldResolve) {
        const { error: updateErr } = await supabase
          .from('drift_catches')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolution_type: 'auto_cleared',
            updated_at: new Date().toISOString(),
          })
          .eq('id', catch_.id);

        if (!updateErr) resolved++;
      }
    } catch (err) {
      console.error(`[auto-resolve] Error checking ${catch_.drift_type} catch ${catch_.id}:`, (err as Error).message);
    }
  }

  return resolved;
}
