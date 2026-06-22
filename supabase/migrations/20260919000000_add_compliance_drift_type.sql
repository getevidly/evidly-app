/*
 * 20260919000000_add_compliance_drift_type.sql
 *
 * Add 'compliance' to drift_catches_drift_type_check.
 *
 * Preserves all 13 existing values. Does NOT touch pillar_check.
 * Enables both pl-compliance-eval (fire) and pl-compliance-eval-food
 * to write drift_type='compliance' without CHECK violation.
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
      'compliance'
    ]));

-- Migration tracker
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260919000000')
ON CONFLICT DO NOTHING;
