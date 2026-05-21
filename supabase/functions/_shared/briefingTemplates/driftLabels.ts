// briefingTemplates/driftLabels.ts — drift_type → human-readable noun label
// Mirrors src/constants/driftTypeLabels.ts (noun form only).
// Shared across dataLoader and all template renderers.

const DRIFT_TYPE_NOUNS: Record<string, string> = {
  temperature_out_of_range: 'Temperature drift',
  temperature_trend_drift: 'Temperature trend',
  missed_checklist: 'Missed checklist',
  document_expiration: 'Document expiration',
  receiving_log_missing: 'Receiving log gap',
  allergen_training_overdue: 'Allergen training gap',
  hood_cleaning_approaching: 'Hood cleaning due',
  suppression_semi_annual_due: 'Suppression service due',
  extinguisher_monthly_missed: 'Extinguisher check gap',
  vendor_coi_expiring: 'Vendor COI expiring',
  inspection_readiness_gap: 'Inspection readiness gap',
  team_miss_clustering: 'Team checklist pattern',
  streak_break: 'Compliance streak break',
};

export function driftLabel(driftType: string): string {
  return DRIFT_TYPE_NOUNS[driftType] || driftType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
