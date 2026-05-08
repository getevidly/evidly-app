-- Extends two tables for the Sprint A vendor service-record routing flow.
--
-- 1. vendor_secure_tokens: adds nullable FK to vendor_service_records so tokens
--    can be tied to a specific service record (today they're tied only to
--    document types via the legacy doc-expiry flow).
--
-- 2. service_action_log: extends the channel CHECK constraint to cover the
--    six new action channels emitted by the service-record routing flow:
--    service_record_request, service_record_reminder, service_record_upload,
--    service_record_review_accept, service_record_review_reject,
--    service_record_escalation.
--
-- Both tables are empty in PROD per Sprint A audit (Part A.1). No data migration
-- needed. Existing rows in vendor_secure_tokens get NULL service_record_id.

-- 1. Add service_record_id FK to vendor_secure_tokens
ALTER TABLE vendor_secure_tokens
  ADD COLUMN service_record_id uuid
    REFERENCES vendor_service_records(id) ON DELETE CASCADE;

CREATE INDEX idx_vendor_secure_tokens_service_record_id
  ON vendor_secure_tokens (service_record_id)
  WHERE service_record_id IS NOT NULL;

-- 2. Replace service_action_log channel CHECK with expanded value set
ALTER TABLE service_action_log
  DROP CONSTRAINT service_action_log_channel_check;

ALTER TABLE service_action_log
  ADD CONSTRAINT service_action_log_channel_check
    CHECK (channel IN (
      'reschedule_request',
      'phone_call',
      'email',
      'service_record_request',
      'service_record_reminder',
      'service_record_upload',
      'service_record_review_accept',
      'service_record_review_reject',
      'service_record_escalation'
    ));
