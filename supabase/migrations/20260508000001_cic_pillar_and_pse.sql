-- ════════════════════════════════════════════════════════════
-- CIC FIVE-PILLAR ARCHITECTURE + PSE SIGNAL TYPES
--
-- Adds cic_pillar column to intelligence_signals for the
-- Compliance Intelligence & Correlation (CIC) engine.
-- Five pillars: P1 Revenue, P2 Liability, P3 Cost,
-- P4 Operational, P5 Workforce.
--
-- Also documents PSE and Workforce Risk signal_type values.
-- No signal_type CHECK constraint to alter — it was dropped
-- by 20260506100000_intelligence_signals_schema_align.sql.
-- ════════════════════════════════════════════════════════════

-- Add cic_pillar column
ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS cic_pillar TEXT;

-- Add CHECK constraint (safe — won't fail if column already exists with data)
DO $$ BEGIN
  ALTER TABLE intelligence_signals
    ADD CONSTRAINT intelligence_signals_cic_pillar_check
    CHECK (cic_pillar IN (
      'revenue_risk',
      'liability_risk',
      'cost_risk',
      'operational_risk',
      'workforce_risk'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for pillar-based queries
CREATE INDEX IF NOT EXISTS idx_signals_cic_pillar
  ON intelligence_signals (cic_pillar)
  WHERE cic_pillar IS NOT NULL;

-- Backfill cic_pillar from existing signal_type values
UPDATE intelligence_signals SET cic_pillar = 'revenue_risk'
  WHERE signal_type IN ('permit_change', 'enforcement_action')
  AND cic_pillar IS NULL;

UPDATE intelligence_signals SET cic_pillar = 'liability_risk'
  WHERE signal_type IN ('recall', 'outbreak', 'allergen_alert', 'health_alert',
    'pse_hood_cleaning_overdue', 'pse_suppression_service_overdue',
    'pse_alarm_inspection_overdue', 'pse_sprinkler_inspection_overdue',
    'pse_compliance_gap')
  AND cic_pillar IS NULL;

UPDATE intelligence_signals SET cic_pillar = 'cost_risk'
  WHERE signal_type IN ('nfpa_update', 'fire_inspection_change', 'osfm_update', 'calfire_update')
  AND cic_pillar IS NULL;

UPDATE intelligence_signals SET cic_pillar = 'operational_risk'
  WHERE signal_type IN ('regulatory_change', 'inspection_methodology', 'legislation',
    'competitor_activity', 'industry_trend')
  AND cic_pillar IS NULL;

UPDATE intelligence_signals SET cic_pillar = 'workforce_risk'
  WHERE signal_type IN ('food_handler_cert_expired', 'food_handler_cert_expiring_soon',
    'cfpm_cert_expired', 'cfpm_cert_expiring_soon', 'training_incomplete',
    'role_cert_gap', 'fire_safety_training_missing', 'fire_extinguisher_training_missing',
    'high_turnover_flag')
  AND cic_pillar IS NULL;

COMMENT ON COLUMN intelligence_signals.cic_pillar IS 'CIC risk pillar: revenue_risk (P1), liability_risk (P2), cost_risk (P3), operational_risk (P4), workforce_risk (P5)';
