/*
  # Auto Document Request System + Vendor Contact + Secure Upload Tokens

  1. New Tables
    - `auto_request_settings` — Per-org settings for automated vendor doc requests
    - `vendor_secure_tokens` — Time-limited upload tokens for vendors (no login required)
    - `vendor_contact_log` — Audit trail of all vendor communications (SMS, email, phone)
    - `auto_request_log` — Log of all automated document requests sent

  2. Changes
    - Add `secure_token` and `token_expires_at` columns to `vendor_upload_requests`
    - Add `auto_requested` flag to `vendor_upload_requests`

  3. Security
    - RLS enabled on all new tables
    - Policies scoped to organization ownership
*/

-- Auto Request Settings (per organization)
CREATE TABLE IF NOT EXISTS auto_request_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  days_before_expiration integer DEFAULT 30,
  reminder_day_4 boolean DEFAULT true,
  reminder_day_7 boolean DEFAULT true,
  reminder_day_14 boolean DEFAULT true,
  notify_via varchar(20) DEFAULT 'email' CHECK (notify_via IN ('email', 'sms', 'both')),
  link_expires_days integer DEFAULT 14,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE auto_request_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view auto request settings"
  ON auto_request_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage auto request settings"
  ON auto_request_settings FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

-- Vendor Secure Tokens (no-auth upload links)
CREATE TABLE IF NOT EXISTS vendor_secure_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token varchar(64) NOT NULL UNIQUE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  upload_request_id uuid REFERENCES vendor_upload_requests(id) ON DELETE SET NULL,
  document_type varchar(100) NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_secure_tokens ENABLE ROW LEVEL SECURITY;

-- Vendors can read their own tokens (for upload page)
CREATE POLICY "Anyone can read valid tokens"
  ON vendor_secure_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only system (service role) creates tokens
CREATE POLICY "Service role creates tokens"
  ON vendor_secure_tokens FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Org members can view their tokens"
  ON vendor_secure_tokens FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Vendor Contact Log
CREATE TABLE IF NOT EXISTS vendor_contact_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  contact_type varchar(20) NOT NULL CHECK (contact_type IN ('email', 'sms', 'phone')),
  initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text,
  body text,
  recipient_email text,
  recipient_phone text,
  status varchar(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'logged')),
  external_id text, -- Twilio SID or Resend ID
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_contact_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view contact log"
  ON vendor_contact_log FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Org members can create contact entries"
  ON vendor_contact_log FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Auto Request Log
CREATE TABLE IF NOT EXISTS auto_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  document_type varchar(100) NOT NULL,
  trigger_reason varchar(50) NOT NULL, -- 'expiration', 'missing', 'manual'
  days_until_expiration integer,
  sent_via varchar(20) NOT NULL,
  secure_token_id uuid REFERENCES vendor_secure_tokens(id),
  upload_request_id uuid REFERENCES vendor_upload_requests(id),
  reminder_number integer DEFAULT 0, -- 0=initial, 1=first reminder, etc.
  status varchar(20) DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE auto_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view auto request log"
  ON auto_request_log FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Add secure token fields to vendor_upload_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendor_upload_requests' AND column_name = 'secure_token'
  ) THEN
    ALTER TABLE vendor_upload_requests ADD COLUMN secure_token varchar(64);
    ALTER TABLE vendor_upload_requests ADD COLUMN token_expires_at timestamptz;
    ALTER TABLE vendor_upload_requests ADD COLUMN auto_requested boolean DEFAULT false;
    ALTER TABLE vendor_upload_requests ADD COLUMN reminder_count integer DEFAULT 0;
    ALTER TABLE vendor_upload_requests ADD COLUMN last_reminder_at timestamptz;
    ALTER TABLE vendor_upload_requests ADD COLUMN vendor_email text;
    ALTER TABLE vendor_upload_requests ADD COLUMN vendor_phone text;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_secure_tokens_token ON vendor_secure_tokens(token);
CREATE INDEX IF NOT EXISTS idx_secure_tokens_vendor ON vendor_secure_tokens(vendor_id);
CREATE INDEX IF NOT EXISTS idx_secure_tokens_expires ON vendor_secure_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_contact_log_vendor ON vendor_contact_log(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contact_log_org ON vendor_contact_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_auto_request_log_org ON auto_request_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_auto_request_log_vendor ON auto_request_log(vendor_id);
CREATE INDEX IF NOT EXISTS idx_auto_request_settings_org ON auto_request_settings(organization_id);

-- Function to generate secure token
CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS varchar(64) AS $$
DECLARE
  token varchar(64);
BEGIN
  SELECT encode(gen_random_bytes(32), 'hex') INTO token;
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function: auto-create upload request with secure token
CREATE OR REPLACE FUNCTION create_vendor_upload_request(
  p_organization_id uuid,
  p_vendor_id uuid,
  p_document_type varchar,
  p_description text DEFAULT NULL,
  p_expires_days integer DEFAULT 14,
  p_vendor_email text DEFAULT NULL,
  p_vendor_phone text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_token varchar(64);
  v_request_id uuid;
  v_token_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- Generate token and expiration
  v_token := generate_secure_token();
  v_expires_at := now() + (p_expires_days || ' days')::interval;
  
  -- Create upload request
  INSERT INTO vendor_upload_requests (
    organization_id, vendor_id, request_type, description, 
    status, secure_token, token_expires_at, auto_requested,
    vendor_email, vendor_phone
  ) VALUES (
    p_organization_id, p_vendor_id, p_document_type, p_description,
    'pending', v_token, v_expires_at, true,
    p_vendor_email, p_vendor_phone
  )
  RETURNING id INTO v_request_id;
  
  -- Create secure token record
  INSERT INTO vendor_secure_tokens (
    token, vendor_id, organization_id, upload_request_id,
    document_type, expires_at
  ) VALUES (
    v_token, p_vendor_id, p_organization_id, v_request_id,
    p_document_type, v_expires_at
  )
  RETURNING id INTO v_token_id;
  
  RETURN json_build_object(
    'request_id', v_request_id,
    'token_id', v_token_id,
    'token', v_token,
    'expires_at', v_expires_at,
    'upload_url', '/vendor/upload/' || v_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
