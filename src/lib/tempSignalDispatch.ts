// ── Temperature Violation → Intelligence Signal Dispatch ─────────
// Closes the loop between temp logging and the Intelligence system.
// Fire-and-forget: never blocks the UI.

import type { SupabaseClient } from '@supabase/supabase-js';

interface TempViolation {
  facility_id: string;
  equipment_name: string;
  temperature: number;
  required_min: number | null;
  required_max: number | null;
  log_type: string;
  corrective_action: string | null;
}

function estimateTempRisk(violation: TempViolation) {
  const isHolding = violation.log_type === 'hot_holding' || violation.log_type === 'cold_holding';
  const base = isHolding
    ? { low: 5000, high: 25000 }
    : { low: 1000, high: 10000 };

  if (!violation.corrective_action) {
    return { low: Math.round(base.low * 1.5), high: base.high * 2 };
  }
  return base;
}

export async function dispatchTempViolationSignal(
  supabase: SupabaseClient,
  violation: TempViolation,
  orgId?: string,
  locationId?: string
) {
  try {
    const dollarRisk = estimateTempRisk(violation);
    const rangeText = violation.required_min !== null && violation.required_max !== null
      ? `${violation.required_min}–${violation.required_max}°F`
      : 'unknown range';

    await supabase.from('intelligence_signals').insert({
      signal_type: 'temperature_violation',
      priority: violation.corrective_action ? 'medium' : 'high',
      title: `Temperature Violation — ${violation.equipment_name}`,
      summary: `${violation.equipment_name} recorded ${violation.temperature}°F. ` +
        `Safe range: ${rangeText}.` +
        (violation.corrective_action ? ` Corrective action taken.` : ` No corrective action recorded.`),
      source_name: 'manual_entry',
      risk_revenue: null,
      risk_liability: violation.corrective_action ? 'medium' : 'high',
      risk_cost: 'low',
      risk_operational: 'medium',
      is_published: true,
      created_at: new Date().toISOString(),
    });

    // Auto-create corrective action (status = reported, operator must confirm)
    if (orgId) {
      const { data: ca } = await supabase.from('corrective_actions').insert({
        organization_id: orgId,
        location_id: locationId || null,
        title: `Temperature excursion — ${violation.equipment_name}`,
        description: `Out-of-range temperature: ${violation.temperature}°F (safe range: ${rangeText}). Auto-created from temperature log.`,
        category: 'food_safety',
        severity: 'critical',
        status: 'reported',
        source: 'temperature_log',
        ai_draft: `Immediate action: Remove affected food items held in the danger zone for more than 4 hours and check equipment calibration. Re-log temperature within 1 hour. Consult your CFPM and EHD for official guidance.`,
        due_date: new Date(Date.now() + 24 * 3600000).toISOString().split('T')[0],
      }).select('id').single();

      if (ca?.id) {
        await supabase.from('corrective_action_history').insert({
          corrective_action_id: ca.id,
          action: 'status_changed',
          from_value: null,
          to_value: 'reported',
          detail: 'Auto-created from temperature excursion log.',
        });
      }
    }
  } catch (err) {
    // Fire-and-forget — never block the temp logging flow
    console.error('[tempSignalDispatch] failed:', err);
  }
}
