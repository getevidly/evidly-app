-- M20: CREATE VIEW v_documents_enriched
-- Gap: G7 from ANSWER-LINE-PATTERN.md §8
-- Security: INVOKER mode — RLS on compliance_documents applies to all queries through this view
-- Pre-condition: M11 RLS policies (8 policies) on compliance_documents

CREATE OR REPLACE VIEW v_documents_enriched
WITH (security_invoker = true)
AS
SELECT
  -- Document core fields
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
  v.name AS vendor_name,

  -- Subject user name (LEFT JOIN — subject_user_id is nullable, employee docs only)
  sup.full_name AS subject_user_name,

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

COMMENT ON VIEW v_documents_enriched IS
  'Enriched compliance_documents view for answer-line rendering. JOINs vendor name, subject user name, and latest active request. Security: INVOKER mode — RLS on compliance_documents applies. See ANSWER-LINE-PATTERN.md S7.';
