-- document_upload_email_queue
-- Batching layer for document-upload notification emails.
-- Both vendor-secure-upload and notify-document-upload INSERT here;
-- flush-upload-notifications processes batches after a debounce window.

CREATE TABLE IF NOT EXISTS document_upload_email_queue (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id          UUID NOT NULL,
  uploaded_by_type     TEXT NOT NULL CHECK (uploaded_by_type IN ('vendor', 'user')),
  uploaded_by_name     TEXT NOT NULL,
  uploaded_by_user_id  UUID,
  queued_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  status               TEXT NOT NULL DEFAULT 'queued'
                       CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
  batch_key            TEXT,
  sent_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup for flush: find queued items per org
CREATE INDEX idx_upload_email_queue_org_status
  ON document_upload_email_queue (organization_id, status, queued_at);

-- Prevent double-queuing the same document while it's still pending
CREATE UNIQUE INDEX idx_upload_email_queue_doc_pending
  ON document_upload_email_queue (document_id)
  WHERE status IN ('queued', 'processing');

-- RLS: service role only (edge functions use service_role_key)
ALTER TABLE document_upload_email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages upload email queue"
  ON document_upload_email_queue FOR ALL
  USING (true) WITH CHECK (true);

-- ── Atomic batch claim function ─────────────────────────────────
-- Claims all queued items for an org once the oldest item exceeds
-- the debounce window.  Uses FOR UPDATE SKIP LOCKED to prevent
-- concurrent flushes from double-claiming.

CREATE OR REPLACE FUNCTION claim_upload_queue_batch(
  p_org_id          UUID,
  p_batch_key       TEXT,
  p_window_seconds  INT DEFAULT 60
)
RETURNS SETOF document_upload_email_queue
LANGUAGE sql
VOLATILE
AS $$
  UPDATE document_upload_email_queue
  SET status    = 'processing',
      batch_key = p_batch_key
  WHERE id IN (
    SELECT id
    FROM document_upload_email_queue
    WHERE organization_id = p_org_id
      AND (
        -- Normal claim: batch window has elapsed
        (status = 'queued'
         AND (SELECT MIN(queued_at) FROM document_upload_email_queue
              WHERE organization_id = p_org_id AND status = 'queued')
             < now() - (p_window_seconds || ' seconds')::interval)
        OR
        -- Reclaim timed-out processing items (stuck > 5 min)
        (status = 'processing'
         AND queued_at < now() - interval '5 minutes')
      )
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;
