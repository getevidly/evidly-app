/**
 * driftTypeLabels — C12
 *
 * drift_catches.drift_type → human-readable display label.
 * drift_catches.source_table → evidence trail label.
 *
 * Each entry has a verb form (action sentence for cards) and
 * a noun form (short label for banners / summaries).
 */

const DRIFT_TYPE_LABELS: Record<string, { verb: string; noun: string }> = {
  temperature_out_of_range:    { verb: 'Temperature reading prevented loss',    noun: 'Temperature reading' },
  temperature_trend_drift:     { verb: 'Temperature trend caught early',        noun: 'Temperature trend' },
  missed_checklist:            { verb: 'Missed checklist caught',               noun: 'Missed checklist' },
  document_expiration:         { verb: 'Document expiration intercepted',       noun: 'Document expiration' },
  receiving_log_missing:       { verb: 'Receiving log gap caught',              noun: 'Receiving log gap' },
  allergen_training_overdue:   { verb: 'Allergen training gap closed',          noun: 'Allergen training gap' },
  hood_cleaning_approaching:   { verb: 'Hood cleaning scheduled before lapse',  noun: 'Hood cleaning due' },
  suppression_semi_annual_due: { verb: 'Suppression service caught before due', noun: 'Suppression service due' },
  extinguisher_monthly_missed: { verb: 'Extinguisher check gap closed',         noun: 'Extinguisher check gap' },
  inspection_readiness_gap:    { verb: 'Inspection readiness gap closed',       noun: 'Inspection readiness gap' },
  team_miss_clustering:        { verb: 'Team checklist pattern caught',         noun: 'Team checklist pattern' },
  streak_break:                { verb: 'Compliance streak break caught',        noun: 'Compliance streak break' },
};

export function getDriftLabel(driftType: string, opts?: { form?: 'verb' | 'noun' }): string {
  const entry = DRIFT_TYPE_LABELS[driftType];
  if (!entry) return driftType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return entry[opts?.form ?? 'verb'];
}

const SOURCE_TABLE_LABELS: Record<string, string> = {
  temperature_logs: 'temperature log series',
  receiving_temp_logs: 'receiving log record',
  compliance_documents: 'compliance document',
  documents: 'document on file',
  task_instances: 'checklist instance',
  equipment: 'equipment record',
  vendor_documents: 'vendor document',
  inspection_records: 'inspection record',
};

export function getSourceTableLabel(sourceTable: string): string {
  return SOURCE_TABLE_LABELS[sourceTable] || sourceTable.replace(/_/g, ' ');
}
