-- ══════════════════════════════════════════════════════════════
-- Migration: partner documents backend — schema + storage
-- Purpose:   Backs the Trusted Partner Alliance application flow.
--            partner_applications holds one row per submitted
--            application from the landing form at /partners/apply.
--            partner_documents holds one row per required
--            compliance document for that application, with an
--            expiration date that a later daily scan reads.
--
--            Security precedent: 20261120000000_channel_cadences.
--            RLS on, admin_only + service_role_all, REVOKE from
--            anon and PUBLIC. Every read/write of the storage
--            bucket goes through the service role in later steps —
--            no anon or authenticated storage.objects policies are
--            created here, deliberately.
--
--            No seed data.
--
-- Every statement is defensive (IF NOT EXISTS / guarded / ON
-- CONFLICT) because migration history has drifted from live.
-- ══════════════════════════════════════════════════════════════


-- ── 1. public.partner_applications ────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_name       TEXT,
  last_name        TEXT,
  business_name    TEXT,
  service_type     TEXT,
  email            TEXT,
  phone            TEXT,
  website          TEXT,
  reviews_link     TEXT,
  bio              TEXT,
  upload_token     TEXT,
  token_expires_at TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'submitted',
  CONSTRAINT partner_applications_service_type_check
    CHECK (service_type IN (
      'Fire Suppression',
      'Fire Alarm',
      'Fire Sprinkler',
      'Hood Cleaning',
      'Pest Control',
      'Other'
    )),
  CONSTRAINT partner_applications_upload_token_key UNIQUE (upload_token)
);

-- Columns, in case the table predates this migration in some form.
ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS first_name       TEXT,
  ADD COLUMN IF NOT EXISTS last_name        TEXT,
  ADD COLUMN IF NOT EXISTS business_name    TEXT,
  ADD COLUMN IF NOT EXISTS service_type     TEXT,
  ADD COLUMN IF NOT EXISTS email            TEXT,
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS website          TEXT,
  ADD COLUMN IF NOT EXISTS reviews_link     TEXT,
  ADD COLUMN IF NOT EXISTS bio              TEXT,
  ADD COLUMN IF NOT EXISTS upload_token     TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'submitted';

-- service_type allow-list, mirrors the landing form dropdown exactly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.partner_applications'::regclass
      AND conname  = 'partner_applications_service_type_check'
  ) THEN
    ALTER TABLE public.partner_applications
      ADD CONSTRAINT partner_applications_service_type_check
      CHECK (service_type IN (
        'Fire Suppression',
        'Fire Alarm',
        'Fire Sprinkler',
        'Hood Cleaning',
        'Pest Control',
        'Other'
      ));
  END IF;
END $$;

-- upload_token must be unique — it is the only credential the
-- partner presents at the upload page.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.partner_applications'::regclass
      AND conname  = 'partner_applications_upload_token_key'
  ) THEN
    ALTER TABLE public.partner_applications
      ADD CONSTRAINT partner_applications_upload_token_key UNIQUE (upload_token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_applications_upload_token
  ON public.partner_applications (upload_token);

-- ── RLS — mirrors channel_cadences exactly ────────────────────

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only" ON public.partner_applications;

CREATE POLICY "admin_only" ON public.partner_applications
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

DROP POLICY IF EXISTS "service_role_all" ON public.partner_applications;

CREATE POLICY "service_role_all" ON public.partner_applications
  FOR ALL USING (auth.role() = 'service_role');

REVOKE ALL ON public.partner_applications FROM anon, PUBLIC;


-- ── 2. public.partner_documents ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL,
  doc_type        TEXT NOT NULL,
  file_path       TEXT,
  expiration_date DATE,
  uploaded_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending',
  CONSTRAINT partner_documents_application_id_fkey
    FOREIGN KEY (application_id)
    REFERENCES public.partner_applications (id) ON DELETE CASCADE,
  CONSTRAINT partner_documents_doc_type_check
    CHECK (doc_type IN (
      'business_license',
      'professional_license',
      'w9',
      'liability_insurance',
      'workers_comp',
      'auto_insurance'
    )),
  CONSTRAINT partner_documents_application_doc_type_key
    UNIQUE (application_id, doc_type)
);

ALTER TABLE public.partner_documents
  ADD COLUMN IF NOT EXISTS application_id  UUID,
  ADD COLUMN IF NOT EXISTS doc_type        TEXT,
  ADD COLUMN IF NOT EXISTS file_path       TEXT,
  ADD COLUMN IF NOT EXISTS expiration_date DATE,
  ADD COLUMN IF NOT EXISTS uploaded_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status          TEXT NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.partner_documents'::regclass
      AND conname  = 'partner_documents_application_id_fkey'
  ) THEN
    ALTER TABLE public.partner_documents
      ADD CONSTRAINT partner_documents_application_id_fkey
      FOREIGN KEY (application_id)
      REFERENCES public.partner_applications (id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.partner_documents'::regclass
      AND conname  = 'partner_documents_doc_type_check'
  ) THEN
    ALTER TABLE public.partner_documents
      ADD CONSTRAINT partner_documents_doc_type_check
      CHECK (doc_type IN (
        'business_license',
        'professional_license',
        'w9',
        'liability_insurance',
        'workers_comp',
        'auto_insurance'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.partner_documents'::regclass
      AND conname  = 'partner_documents_application_doc_type_key'
  ) THEN
    ALTER TABLE public.partner_documents
      ADD CONSTRAINT partner_documents_application_doc_type_key
      UNIQUE (application_id, doc_type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_documents_application_id
  ON public.partner_documents (application_id);

-- Partial index — the daily expiration scan in a later step reads
-- only rows that actually carry an expiration date.
CREATE INDEX IF NOT EXISTS idx_partner_documents_expiration_date
  ON public.partner_documents (expiration_date)
  WHERE expiration_date IS NOT NULL;

-- ── RLS — mirrors channel_cadences exactly ────────────────────

ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only" ON public.partner_documents;

CREATE POLICY "admin_only" ON public.partner_documents
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

DROP POLICY IF EXISTS "service_role_all" ON public.partner_documents;

CREATE POLICY "service_role_all" ON public.partner_documents
  FOR ALL USING (auth.role() = 'service_role');

REVOKE ALL ON public.partner_documents FROM anon, PUBLIC;


-- ── 3. Storage bucket ─────────────────────────────────────────
--
-- Private bucket. Object path convention:
--
--     {application_id}/{doc_type}.{ext}
--
--   e.g. 8f3c1d0a-4b7e-4d21-9c55-1a0e7f2b9b2e/liability_insurance.pdf
--
-- No storage.objects policies are created for anon or
-- authenticated. Every read and write goes through the service
-- role in a later step, so the bucket has no policy surface at
-- all. Signed URLs are issued server-side.

INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-documents', 'partner-documents', false)
ON CONFLICT (id) DO NOTHING;
