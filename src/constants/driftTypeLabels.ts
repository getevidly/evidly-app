/**
 * driftTypeLabels — C12
 *
 * drift_catches.drift_type → human-readable display label.
 * drift_catches.source_table → evidence trail label.
 */

const DRIFT_TYPE_LABELS: Record<string, string> = {
  temperature_out_of_range: 'Temperature drift prevented loss',
  temperature_trend_drift: 'Temperature trend caught early',
  missed_checklist: 'Missed checklist caught',
  document_expiration: 'Document expiration intercepted',
  receiving_log_missing: 'Receiving log gap caught',
  allergen_training_overdue: 'Allergen training gap closed',
  hood_cleaning_approaching: 'Hood cleaning scheduled before lapse',
  suppression_semi_annual_due: 'Suppression service caught before due',
  extinguisher_monthly_missed: 'Extinguisher check gap closed',
  vendor_coi_expiring: 'Vendor COI renewal caught',
  inspection_readiness_gap: 'Inspection readiness gap closed',
  team_miss_clustering: 'Team checklist pattern caught',
  streak_break: 'Compliance streak break caught',
};

export function getDriftLabel(driftType: string): string {
  return DRIFT_TYPE_LABELS[driftType] || 'Drift caught';
}

const SOURCE_TABLE_LABELS: Record<string, string> = {
  temperature_logs: 'temperature log series',
  receiving_temp_logs: 'receiving log record',
  documents: 'document on file',
  task_instances: 'checklist instance',
  equipment: 'equipment record',
  vendor_documents: 'vendor document',
  inspection_records: 'inspection record',
};

export function getSourceTableLabel(sourceTable: string): string {
  return SOURCE_TABLE_LABELS[sourceTable] || sourceTable.replace(/_/g, ' ');
}
