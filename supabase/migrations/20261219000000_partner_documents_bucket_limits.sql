-- ══════════════════════════════════════════════════════════════
-- Migration: partner-documents bucket limits
-- Purpose:   Now that partner-upload enforces type and size before
--            anything reaches storage, put the same limits on the
--            bucket itself. Defense in depth — the edge function is
--            the real gate; this catches anything that ever reaches
--            the Storage API by another path.
--
--            Matches the server-side rules in partner-upload:
--            10MB, PDF/JPEG/PNG only.
--
--            Idempotent: a plain UPDATE, safe to re-run. No-op if
--            the bucket row does not exist.
-- ══════════════════════════════════════════════════════════════

UPDATE storage.buckets
SET file_size_limit    = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']
WHERE id = 'partner-documents';
