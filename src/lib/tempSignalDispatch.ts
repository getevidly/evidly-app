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
  violation: TempViolation
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
  } catch (err) {
    // Fire-and-forget — never block the temp logging flow
    console.error('[tempSignalDispatch] failed:', err);
  }
}
