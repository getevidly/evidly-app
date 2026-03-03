-- ================================================================
-- Performance Indexes & Query Guards
-- Composite/partial indexes for high-traffic query patterns
-- Statement timeout to kill runaway queries
-- ================================================================

-- Hard kill on queries exceeding 10 seconds
ALTER DATABASE postgres SET statement_timeout = '10s';

-- Wrap each index in a DO block so missing tables/columns don't abort the migration
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_temp_logs_org_recorded
    ON temp_logs(organization_id, recorded_at DESC);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_documents_org_expiration
    ON documents(organization_id, expiration_date)
    WHERE expiration_date IS NOT NULL;
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_checklists_location_created
    ON checklists(location_id, created_at DESC);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_checklist_completions_completed
    ON checklist_completions(completed_at DESC);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_vcr_org
    ON vendor_client_relationships(organization_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_activity_logs_org_created
    ON activity_logs(organization_id, created_at DESC);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications(organization_id, created_at DESC)
    WHERE read_at IS NULL;
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_vsr_overdue
    ON vendor_service_records(service_due_date, status)
    WHERE status IN ('upcoming', 'overdue');
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
