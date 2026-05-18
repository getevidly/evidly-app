-- ================================================================
-- D1: Archived status constraint + location_name in enriched view
--
-- Build plan: D1 of D7 (Documents E2E workflow)
--
-- Context: The foundation migration (20260807000000) established the
-- design rule "Compliance documents can only be archived, never deleted.
-- Status='archived' is the sole deletion mechanism."
--
-- M2 (20260810000002) removed 'archived' from the CHECK constraint in
-- error when tightening to 6 values. This migration restores it as the
-- 7th value.
--
-- Additionally, v_documents_enriched was built without a JOIN to
-- locations, so location_name is always NULL. The view is rebuilt
-- with the locations LEFT JOIN.
--
-- Two fixes:
--   1. ALTER CHECK to 7 values (add 'archived')
--   2. CREATE OR REPLACE VIEW with LEFT JOIN locations for location_name
-- ================================================================

-- ── 1. ALTER CHECK CONSTRAINT ─────────────────────────────────

ALTER TABLE compliance_documents
  DROP CONSTRAINT IF EXISTS compliance_documents_status_check;

ALTER TABLE compliance_documents
  ADD CONSTRAINT compliance_documents_status_check
    CHECK (status IN (
      'current', 'expiring', 'expired',
      'pending_review', 'requested', 'overdue',
      'archived'
    ));

-- ── 2. REBUILD VIEW WITH LOCATION NAME ────────────────────────
-- DROP + CREATE required because inserting location_name between
-- subject_user_name and request_id changes column ordinal positions.
-- CREATE OR REPLACE VIEW cannot rename existing columns.

DROP VIEW IF EXISTS v_documents_enriched;

CREATE VIEW v_documents_enriched
WITH (security_invoker = true)
AS
SELECT
  -- Document core fields (exact prior order)
  cd.id,
  cd.organization_id,
  cd.location_id,
  cd.category,
  cd.type,
  cd.name,
  cd.status,
  cd.storage_path,
  cd.file_size_bytes,
  cd.mime_type,
  cd.issued_date,
  cd.expiry_date,
  cd.vendor_id,
  cd.subject_user_id,
  cd.parent_document_id,
  cd.import_source,
  cd.notes,
  cd.metadata,
  cd.created_at,
  cd.updated_at,

  -- Vendor name (LEFT JOIN — vendor_id is nullable)
  v.company_name AS vendor_name,

  -- Subject user name (LEFT JOIN — subject_user_id is nullable, employee docs only)
  sup.full_name AS subject_user_name,

  -- Location name (LEFT JOIN — location_id is nullable)
  l.name AS location_name,

  -- Latest request fields (lateral subquery — at most 1 row per document)
  lr.request_id,
  lr.requested_at,
  lr.secure_token_expires_at AS request_token_expires_at,
  lr.fulfilled_at AS request_fulfilled_at,
  lr.cancelled_at AS request_cancelled_at,
  lr.viewed_at AS request_viewed_at,
  lr.resend_count AS request_resend_count,
  lr.recipient_email AS request_recipient_email,
  lr.recipient_name AS request_recipient_name,

  -- Derived: request stage (for answer-line formula)
  CASE
    WHEN lr.request_id IS NULL THEN NULL
    WHEN lr.fulfilled_at IS NOT NULL THEN 'fulfilled'
    WHEN lr.cancelled_at IS NOT NULL THEN 'cancelled'
    WHEN lr.viewed_at IS NOT NULL AND lr.secure_token_expires_at > now() THEN 'viewed'
    WHEN lr.secure_token_expires_at <= now() THEN 'overdue'
    ELSE 'sent'
  END AS request_stage,

  -- Derived: token days remaining (for answer-line formula)
  CASE
    WHEN lr.secure_token_expires_at IS NULL THEN NULL
    ELSE GREATEST(0, EXTRACT(DAY FROM (lr.secure_token_expires_at - now()))::integer)
  END AS request_token_days_remaining,

  -- Derived: days until expiry (for answer-line formula)
  CASE
    WHEN cd.expiry_date IS NULL THEN NULL
    ELSE (cd.expiry_date - CURRENT_DATE)
  END AS days_until_expiry

FROM compliance_documents cd

LEFT JOIN vendors v
  ON v.id = cd.vendor_id

LEFT JOIN user_profiles sup
  ON sup.id = cd.subject_user_id

LEFT JOIN locations l
  ON l.id = cd.location_id

LEFT JOIN LATERAL (
  SELECT
    cdr.id AS request_id,
    cdr.requested_at,
    cdr.secure_token_expires_at,
    cdr.fulfilled_at,
    cdr.cancelled_at,
    cdr.viewed_at,
    cdr.resend_count,
    cdr.recipient_email,
    cdr.recipient_name
  FROM compliance_document_requests cdr
  WHERE cdr.document_id = cd.id
    AND cdr.cancelled_at IS NULL
  ORDER BY cdr.requested_at DESC
  LIMIT 1
) lr ON true;

-- ── 3. RULE #14 VERIFICATION BLOCK ───────────────────────────

DO $$
DECLARE
  v_constraint_def TEXT;
  v_missing_status TEXT[] := '{}';
  v_status TEXT;
  v_missing_cols TEXT[] := '{}';
  v_col TEXT;
  v_view_count BIGINT;
  v_table_count BIGINT;
  v_reloptions TEXT[];
BEGIN
  -- a. CHECK constraint contains exactly 7 values
  SELECT pg_get_constraintdef(oid)
  INTO v_constraint_def
  FROM pg_constraint
  WHERE conrelid = 'compliance_documents'::regclass
    AND conname = 'compliance_documents_status_check';

  IF v_constraint_def IS NULL THEN
    RAISE EXCEPTION 'VERIFY FAIL: compliance_documents_status_check constraint not found';
  END IF;

  FOREACH v_status IN ARRAY ARRAY[
    'current', 'expiring', 'expired', 'pending_review',
    'requested', 'overdue', 'archived'
  ] LOOP
    IF position(quote_literal(v_status) IN v_constraint_def) = 0 THEN
      v_missing_status := v_missing_status || v_status;
    END IF;
  END LOOP;

  IF array_length(v_missing_status, 1) > 0 THEN
    RAISE EXCEPTION 'VERIFY FAIL: CHECK constraint missing values: %', array_to_string(v_missing_status, ', ');
  END IF;

  -- b. View exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'v_documents_enriched'
  ) THEN
    RAISE EXCEPTION 'VERIFY FAIL: v_documents_enriched view does not exist';
  END IF;

  -- c. View has security_invoker = true
  SELECT reloptions INTO v_reloptions
  FROM pg_class
  WHERE relname = 'v_documents_enriched'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF v_reloptions IS NULL OR NOT ('security_invoker=true' = ANY(v_reloptions)) THEN
    RAISE EXCEPTION 'VERIFY FAIL: v_documents_enriched missing security_invoker=true (reloptions: %)', v_reloptions;
  END IF;

  -- d + e. All 35 columns present (20 core + vendor_name + subject_user_name + location_name + 9 request + 3 derived)
  FOREACH v_col IN ARRAY ARRAY[
    'id', 'organization_id', 'location_id', 'category', 'type', 'name',
    'status', 'storage_path', 'file_size_bytes', 'mime_type', 'issued_date',
    'expiry_date', 'vendor_id', 'subject_user_id', 'parent_document_id',
    'import_source', 'notes', 'metadata', 'created_at', 'updated_at',
    'vendor_name', 'subject_user_name', 'location_name',
    'request_id', 'requested_at', 'request_token_expires_at',
    'request_fulfilled_at', 'request_cancelled_at', 'request_viewed_at',
    'request_resend_count', 'request_recipient_email', 'request_recipient_name',
    'request_stage', 'request_token_days_remaining', 'days_until_expiry'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'v_documents_enriched'
        AND column_name = v_col
    ) THEN
      v_missing_cols := v_missing_cols || v_col;
    END IF;
  END LOOP;

  IF array_length(v_missing_cols, 1) > 0 THEN
    RAISE EXCEPTION 'VERIFY FAIL: v_documents_enriched missing columns: %', array_to_string(v_missing_cols, ', ');
  END IF;

  -- f. Row count parity (LEFT JOIN must not drop or duplicate rows)
  SELECT COUNT(*) INTO v_view_count FROM v_documents_enriched;
  SELECT COUNT(*) INTO v_table_count FROM compliance_documents;

  IF v_view_count <> v_table_count THEN
    RAISE EXCEPTION 'VERIFY FAIL: row count mismatch — view=% table=%', v_view_count, v_table_count;
  END IF;

  RAISE WARNING 'VERIFY PASS: D1 — CHECK 7 values, v_documents_enriched 35 columns, security_invoker, row parity (% rows)', v_table_count;
END $$;
