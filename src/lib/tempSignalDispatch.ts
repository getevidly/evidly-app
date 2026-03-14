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

    // Auto-create draft HACCP corrective action (operator must confirm)
    if (orgId) {
      await supabase.from('haccp_corrective_actions').insert({
        organization_id: orgId,
        plan_name: 'Temperature Monitoring',
        ccp_number: 'CCP-TEMP',
        ccp_hazard: 'Temperature abuse',
        deviation: `${violation.equipment_name} recorded ${violation.temperature}°F (safe range: ${rangeText})`,
        critical_limit: rangeText,
        recorded_value: `${violation.temperature}°F`,
        action_taken: violation.corrective_action || 'Pending operator review',
        action_by: 'System (auto-generated)',
        status: 'open',
        source: 'temp_log',
        location_id: locationId || null,
      });
    }
  } catch (err) {
    // Fire-and-forget — never block the temp logging flow
    console.error('[tempSignalDispatch] failed:', err);
  }
}
