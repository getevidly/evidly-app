-- ================================================================
-- Performance Indexes & Query Guards
-- Composite/partial indexes for high-traffic query patterns
-- Statement timeout to kill runaway queries
-- ================================================================

-- Hard kill on queries exceeding 10 seconds
ALTER DATABASE postgres SET statement_timeout = '10s';

-- Composite: temp_logs by org + recorded date (dashboard recent activity)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_temp_logs_org_recorded
  ON temp_logs(organization_id, recorded_at DESC);

-- Composite: documents by org + expiration (expiry alert cron job)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_org_expiration
  ON documents(organization_id, expiration_date)
  WHERE expiration_date IS NOT NULL;

-- Composite: checklists by location + created date (daily ops page)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_checklists_location_created
  ON checklists(location_id, created_at DESC);

-- Composite: checklist_completions by completed date (today's progress)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_checklist_completions_completed
  ON checklist_completions(completed_at DESC);

-- Composite: vendor_client_relationships by org (vendor lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vcr_org
  ON vendor_client_relationships(organization_id);

-- Composite: activity_logs by org + created date (audit trail page)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_org_created
  ON activity_logs(organization_id, created_at DESC);

-- Partial: unread notifications per org (notification dropdown)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread
  ON notifications(organization_id, created_at DESC)
  WHERE read_at IS NULL;

-- Partial: vendor_service_records by due date + active status (reminder cron)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vsr_overdue
  ON vendor_service_records(service_due_date, status)
  WHERE status IN ('upcoming', 'overdue');
