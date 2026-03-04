-- ============================================================================
-- GAP-09: Incident & Complaint Documentation — Schema Enhancements
-- ============================================================================
-- The incidents, incident_timeline, and incident_comments tables already exist
-- (migration 20260223000000_incident_log_tables.sql).
-- This migration adds:
--   1. Regulatory report tracking fields
--   2. Corrective action linking
--   3. Compliance risk tagging for GAP-11
-- ============================================================================

-- Add regulatory report and corrective action fields to incidents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'regulatory_report_required'
  ) THEN
    ALTER TABLE incidents ADD COLUMN regulatory_report_required boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'regulatory_report_filed_at'
  ) THEN
    ALTER TABLE incidents ADD COLUMN regulatory_report_filed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'regulatory_report_filed_by'
  ) THEN
    ALTER TABLE incidents ADD COLUMN regulatory_report_filed_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'linked_corrective_action_id'
  ) THEN
    ALTER TABLE incidents ADD COLUMN linked_corrective_action_id uuid;
  END IF;
END $$;

-- Add comment for compliance risk querying (GAP-11 forward-looking)
COMMENT ON TABLE incidents IS
  'GAP-09: Incident & complaint documentation with regulatory reporting. '
  'Open critical incidents (severity=critical AND status NOT IN (resolved,verified)) = '
  'compliance risk flag for GAP-11 scoring. '
  'Regulatory report required but not filed = high-priority compliance risk. '
  'linked_corrective_action_id links to corrective_actions.id (GAP-01).';

-- Index for regulatory report tracking
CREATE INDEX IF NOT EXISTS idx_incidents_regulatory
  ON incidents(organization_id)
  WHERE regulatory_report_required = true;

-- Index for open critical incidents (compliance risk)
CREATE INDEX IF NOT EXISTS idx_incidents_critical_open
  ON incidents(organization_id, severity)
  WHERE status NOT IN ('resolved', 'verified') AND severity = 'critical';

-- Index for corrective action linking
CREATE INDEX IF NOT EXISTS idx_incidents_ca_link
  ON incidents(linked_corrective_action_id)
  WHERE linked_corrective_action_id IS NOT NULL;
