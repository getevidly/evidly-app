-- ============================================================================
-- H16-FIX: create_vendor_upload_request RPC
--
-- lib/api.ts calls supabase.rpc('create_vendor_upload_request', {...}) but the
-- RPC was never applied to PROD. This migration ensures the supporting schema
-- and creates the function with proper authorization + GRANT.
--
-- Dependencies satisfied inline (all IF NOT EXISTS / CREATE OR REPLACE):
--   1. Extra columns on vendor_upload_requests (secure_token, vendor_email, etc.)
--   2. vendor_secure_tokens table
--   3. generate_secure_token() helper
--   4. create_vendor_upload_request() RPC
--
-- BE-4 token gap fix: RPC now also writes to compliance_documents (status=
-- 'requested') and compliance_document_requests (with secure_token), because
-- vendor-secure-upload validates tokens against compliance_document_requests,
-- NOT vendor_secure_tokens.
-- ============================================================================

-- 1. Ensure extra columns exist on vendor_upload_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendor_upload_requests' AND column_name = 'secure_token'
  ) THEN
    ALTER TABLE public.vendor_upload_requests ADD COLUMN secure_token varchar(64);
    ALTER TABLE public.vendor_upload_requests ADD COLUMN token_expires_at timestamptz;
    ALTER TABLE public.vendor_upload_requests ADD COLUMN auto_requested boolean DEFAULT false;
    ALTER TABLE public.vendor_upload_requests ADD COLUMN reminder_count integer DEFAULT 0;
    ALTER TABLE public.vendor_upload_requests ADD COLUMN last_reminder_at timestamptz;
    ALTER TABLE public.vendor_upload_requests ADD COLUMN vendor_email text;
    ALTER TABLE public.vendor_upload_requests ADD COLUMN vendor_phone text;
  END IF;
END $$;

-- 2. vendor_secure_tokens table (no-auth upload links)
CREATE TABLE IF NOT EXISTS public.vendor_secure_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token varchar(64) NOT NULL UNIQUE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  upload_request_id uuid REFERENCES public.vendor_upload_requests(id) ON DELETE SET NULL,
  document_type varchar(100) NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  document_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.vendor_secure_tokens ENABLE ROW LEVEL SECURITY;

-- Org members can view their tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vendor_secure_tokens' AND policyname = 'org_members_read_tokens'
  ) THEN
    CREATE POLICY "org_members_read_tokens"
      ON public.vendor_secure_tokens FOR SELECT
      TO authenticated
      USING (
        organization_id IN (
          SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_secure_tokens_token ON public.vendor_secure_tokens(token);
CREATE INDEX IF NOT EXISTS idx_secure_tokens_vendor ON public.vendor_secure_tokens(vendor_id);
CREATE INDEX IF NOT EXISTS idx_secure_tokens_expires ON public.vendor_secure_tokens(expires_at);

-- 3. generate_secure_token() — 64-char hex token
CREATE OR REPLACE FUNCTION public.generate_secure_token()
RETURNS varchar(64)
LANGUAGE plpgsql
AS $$
DECLARE
  token varchar(64);
BEGIN
  SELECT encode(gen_random_bytes(32), 'hex') INTO token;
  RETURN token;
END;
$$;

-- 4. create_vendor_upload_request RPC
--    SECURITY DEFINER so it bypasses RLS for the insert.
--    Authorization enforced explicitly: caller must belong to the org.
CREATE OR REPLACE FUNCTION public.create_vendor_upload_request(
  p_organization_id uuid,
  p_vendor_id       uuid,
  p_document_type   varchar,
  p_description     text    DEFAULT NULL,
  p_expires_days    integer DEFAULT 14,
  p_vendor_email    text    DEFAULT NULL,
  p_vendor_phone    text    DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid;
  v_token varchar(64);
  v_request_id uuid;
  v_token_id uuid;
  v_expires_at timestamptz;
  v_doc_id uuid;
  v_cdr_id uuid;
BEGIN
  -- Identify caller
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Authorization: caller must belong to the specified organization
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = v_caller AND organization_id = p_organization_id
  ) THEN
    -- Also allow via user_location_access (multi-org users)
    IF NOT EXISTS (
      SELECT 1 FROM public.user_location_access
      WHERE user_id = v_caller AND organization_id = p_organization_id
    ) THEN
      RAISE EXCEPTION 'Not authorized for this organization';
    END IF;
  END IF;

  -- Generate token and expiration
  v_token := generate_secure_token();
  v_expires_at := now() + (p_expires_days || ' days')::interval;

  -- Create upload request
  INSERT INTO public.vendor_upload_requests (
    organization_id, vendor_id, request_type, description,
    status, requested_by, secure_token, token_expires_at,
    auto_requested, vendor_email, vendor_phone
  ) VALUES (
    p_organization_id, p_vendor_id, p_document_type, p_description,
    'pending', v_caller, v_token, v_expires_at,
    false, p_vendor_email, p_vendor_phone
  )
  RETURNING id INTO v_request_id;

  -- Create compliance_documents row (status='requested') so vendor-secure-upload
  -- can find and update it when the vendor submits the file via the token link.
  INSERT INTO public.compliance_documents (
    organization_id, vendor_id, category, type, name,
    status, import_source, requested_by, requested_at
  ) VALUES (
    p_organization_id, p_vendor_id, 'vendor_service', p_document_type,
    COALESCE(p_description, p_document_type),
    'requested', 'vendor_secure_link', v_caller, now()
  )
  RETURNING id INTO v_doc_id;

  -- Create compliance_document_requests row — this is the table vendor-secure-upload
  -- validates tokens against (compliance_document_requests.secure_token).
  INSERT INTO public.compliance_document_requests (
    organization_id, document_id, vendor_id, requested_by,
    secure_token, secure_token_expires_at,
    recipient_email
  ) VALUES (
    p_organization_id, v_doc_id, p_vendor_id, v_caller,
    v_token, v_expires_at,
    p_vendor_email
  )
  RETURNING id INTO v_cdr_id;

  -- Create secure token record (secondary index for vendor_secure_tokens table)
  INSERT INTO public.vendor_secure_tokens (
    token, vendor_id, organization_id, upload_request_id,
    document_type, expires_at, document_id
  ) VALUES (
    v_token, p_vendor_id, p_organization_id, v_request_id,
    p_document_type, v_expires_at, v_doc_id
  )
  RETURNING id INTO v_token_id;

  RETURN json_build_object(
    'request_id', v_request_id,
    'token_id', v_token_id,
    'token', v_token,
    'expires_at', v_expires_at,
    'upload_url', '/vendor/upload/' || v_token,
    'document_id', v_doc_id
  );
END;
$$;

-- 5. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_vendor_upload_request(uuid, uuid, varchar, text, integer, text, text)
  TO authenticated;

-- 6. Migration tracker
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260903000000',
  'create_vendor_upload_request_rpc',
  ARRAY[
    'ALTER TABLE vendor_upload_requests ADD COLUMN secure_token (+ 6 more columns)',
    'CREATE TABLE IF NOT EXISTS vendor_secure_tokens',
    'CREATE OR REPLACE FUNCTION generate_secure_token()',
    'CREATE OR REPLACE FUNCTION create_vendor_upload_request(...) SECURITY DEFINER — writes to vendor_upload_requests + compliance_documents + compliance_document_requests + vendor_secure_tokens',
    'GRANT EXECUTE ON FUNCTION create_vendor_upload_request TO authenticated'
  ]
);
