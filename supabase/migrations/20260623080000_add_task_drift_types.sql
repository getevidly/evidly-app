/*
 * 20260623080000_add_task_drift_types.sql
 *
 * Add 'task_overdue' and 'task_skipped' to drift_catches_drift_type_check.
 *
 * Preserves all 14 existing values. Enables detect-operational-drift
 * task-drift trigger to write these drift_types without CHECK violation.
 */

ALTER TABLE public.drift_catches
  DROP CONSTRAINT drift_catches_drift_type_check,
  ADD CONSTRAINT drift_catches_drift_type_check
    CHECK (drift_type = ANY (ARRAY[
      'temperature_out_of_range',
      'temperature_trend_drift',
      'missed_checklist',
      'document_expiration',
      'receiving_log_missing',
      'allergen_training_overdue',
      'hood_cleaning_approaching',
      'suppression_semi_annual_due',
      'extinguisher_monthly_missed',
      'vendor_coi_expiring',
      'inspection_readiness_gap',
      'team_miss_clustering',
      'streak_break',
      'compliance',
      'task_overdue',
      'task_skipped'
    ]));
