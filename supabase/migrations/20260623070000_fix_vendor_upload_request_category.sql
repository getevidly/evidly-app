-- Fix create_vendor_upload_request RPC: 'vendor_service' → 'service'
--
-- The RPC inserts category='vendor_service' into compliance_documents, but
-- the CHECK constraint (since 20260810000001) only allows:
--   kitchen, employee, service, business
-- This causes a runtime CHECK violation on every call.
-- The correct category for vendor service certificates is 'service'.

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
    p_organization_id, p_vendor_id, 'service', p_document_type,
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

-- Re-grant (CREATE OR REPLACE doesn't preserve grants)
GRANT EXECUTE ON FUNCTION public.create_vendor_upload_request(uuid, uuid, varchar, text, integer, text, text)
  TO authenticated;
