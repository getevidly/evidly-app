-- Phase 1.5: CHECK constraint updates for Step 3 readiness
-- Two ALTER TABLE blocks in one transaction
-- Pre-condition: 0 send_records rows; 0 activity_log rows

BEGIN;

-- ============================================================
-- 1. compliance_document_activity_log.event_type CHECK replacement
-- Locked 12-value set per Documents flow
-- ============================================================
ALTER TABLE compliance_document_activity_log
  DROP CONSTRAINT IF EXISTS compliance_document_activity_log_event_type_check;

ALTER TABLE compliance_document_activity_log
  ADD CONSTRAINT compliance_document_activity_log_event_type_check
    CHECK (event_type IN (
      'requested',
      'viewed',
      'accepted',
      'rejected',
      'resent',
      'shared',
      'viewed_share',
      'downloaded_share',
      'expired',
      'overdue',
      'uploaded',
      'noted'
    ));

-- ============================================================
-- 2. compliance_document_send_records.recipient_type CHECK replacement
-- Full replacement: 4 generic → 6 specific recipient types
-- ============================================================
ALTER TABLE compliance_document_send_records
  DROP CONSTRAINT IF EXISTS compliance_document_send_records_recipient_type_check;

ALTER TABLE compliance_document_send_records
  ADD CONSTRAINT compliance_document_send_records_recipient_type_check
    CHECK (recipient_type IN (
      'ehd',
      'ahj',
      'insurance_broker',
      'insurance_carrier',
      'auditor',
      'client_legal'
    ));

COMMIT;
