-- Migration: operations_report_types
-- Adds operations Tier 1 report_type values to the internal_reports CHECK constraint.
-- New values: client_shift_intelligence, client_location_mirror, client_document_vault

ALTER TABLE internal_reports DROP CONSTRAINT IF EXISTS internal_reports_report_type_check;

ALTER TABLE internal_reports
  ADD CONSTRAINT internal_reports_report_type_check
  CHECK (report_type IN (
    'internal_weekly','internal_monthly','internal_quarterly',
    'client_compliance','client_executive','client_insurance',
    'client_vendor','client_regulatory','client_training',
    'client_temp_log','client_corrective_action','client_checklist','client_inspection_history',
    'client_exhaust_history','client_suppression','client_fire_schedule','client_fire_documentation',
    'client_shift_intelligence','client_location_mirror','client_document_vault',
    'partner_portfolio','partner_risk','partner_performance',
    'investor_mrr','investor_growth','investor_product'
  ));

-- Ledger
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260605000600', 'operations_report_types')
ON CONFLICT DO NOTHING;
