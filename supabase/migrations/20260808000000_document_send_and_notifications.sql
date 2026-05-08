-- Documents architecture: send infrastructure + recipient profiles + notification prefs.
--
-- Four tables added:
--
-- 1. compliance_document_send_records — third-party share sends. Holds recipient
--    info, secure_token, expiry timestamp (computed per-send by edge function),
--    open/download tracking, revoke timestamp.
--
-- 2. compliance_document_send_items — junction between send records and
--    compliance_documents. Captures which docs were in which send and the tier
--    (required/recommended/optional/manual) at the time of send.
--
-- 3. recipient_profiles — saved recipients (EHD inspector, insurance broker,
--    property manager, custom). Org-scoped. use_count + last_used_at power the
--    "recently used" picker in the Send wizard.
--
-- 4. user_notification_prefs — per-user-per-org notification preferences. A user
--    can belong to multiple orgs and have different prefs in each.
--
-- Locked rules:
-- - Archive-only. No DELETE policies on any of the 4 tables.
-- - secure_token_expires_at is a direct timestamptz; per-send validity computed
--   by the edge function at insert (org default 14d, override 1-90d).
-- - RLS uses user_profiles.organization_id pattern.
-- - service_role bypass for send_records INSERT/UPDATE (recipient-side flows).

-- ============================================================================
-- 1. compliance_document_send_records
-- ============================================================================
CREATE TABLE compliance_document_send_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipient_type text NOT NULL CHECK (recipient_type IN (
    'government',
    'insurance',
    'property',
    'custom'
  )),
  recipient_name text NOT NULL,
  recipient_org text,
  recipient_email text,
  purpose text,
  cover_message text,
  cover_message_ai_original text,
  secure_token text NOT NULL UNIQUE,
  secure_token_expires_at timestamptz NOT NULL,
  opened_at timestamptz,
  opened_count integer NOT NULL DEFAULT 0,
  last_opened_at timestamptz,
  download_count integer NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_recommendations_used boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_document_send_records_org_sent
  ON compliance_document_send_records (organization_id, sent_at DESC);

CREATE INDEX idx_compliance_document_send_records_token
  ON compliance_document_send_records (secure_token);

CREATE INDEX idx_compliance_document_send_records_active
  ON compliance_document_send_records (organization_id, secure_token_expires_at)
  WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION update_doc_send_tables_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $TRIG$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$TRIG$;

CREATE TRIGGER trg_compliance_doc_send_records_updated_at
  BEFORE UPDATE ON compliance_document_send_records
  FOR EACH ROW EXECUTE FUNCTION update_doc_send_tables_updated_at();

ALTER TABLE compliance_document_send_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_send_records_select_own_org"
  ON compliance_document_send_records FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "doc_send_records_insert_own_org"
  ON compliance_document_send_records FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "doc_send_records_update_own_org"
  ON compliance_document_send_records FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "doc_send_records_insert_service_role"
  ON compliance_document_send_records FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "doc_send_records_update_service_role"
  ON compliance_document_send_records FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- NO DELETE policies.

-- ============================================================================
-- 2. compliance_document_send_items
-- ============================================================================
CREATE TABLE compliance_document_send_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  send_record_id uuid NOT NULL REFERENCES compliance_document_send_records(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES compliance_documents(id) ON DELETE CASCADE,
  recommendation_tier text NOT NULL CHECK (recommendation_tier IN (
    'required',
    'recommended',
    'optional',
    'manual'
  )),
  included_in_send boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (send_record_id, document_id)
);

CREATE INDEX idx_compliance_document_send_items_record
  ON compliance_document_send_items (send_record_id);

CREATE INDEX idx_compliance_document_send_items_document
  ON compliance_document_send_items (document_id);

ALTER TABLE compliance_document_send_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_send_items_select_via_record"
  ON compliance_document_send_items FOR SELECT
  TO authenticated
  USING (send_record_id IN (
    SELECT id FROM compliance_document_send_records
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "doc_send_items_insert_via_record"
  ON compliance_document_send_items FOR INSERT
  TO authenticated
  WITH CHECK (send_record_id IN (
    SELECT id FROM compliance_document_send_records
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "doc_send_items_update_via_record"
  ON compliance_document_send_items FOR UPDATE
  TO authenticated
  USING (send_record_id IN (
    SELECT id FROM compliance_document_send_records
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ))
  WITH CHECK (send_record_id IN (
    SELECT id FROM compliance_document_send_records
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "doc_send_items_insert_service_role"
  ON compliance_document_send_items FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "doc_send_items_update_service_role"
  ON compliance_document_send_items FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- NO DELETE policies.

-- ============================================================================
-- 3. recipient_profiles
-- ============================================================================
CREATE TABLE recipient_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_type text NOT NULL CHECK (recipient_type IN (
    'government',
    'insurance',
    'property',
    'custom'
  )),
  name text NOT NULL,
  organization_label text,
  email text,
  phone text,
  default_purpose text,
  notes text,
  last_used_at timestamptz,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipient_profiles_org_type_recent
  ON recipient_profiles (organization_id, recipient_type, last_used_at DESC NULLS LAST);

CREATE INDEX idx_recipient_profiles_org_name
  ON recipient_profiles (organization_id, name);

CREATE TRIGGER trg_recipient_profiles_updated_at
  BEFORE UPDATE ON recipient_profiles
  FOR EACH ROW EXECUTE FUNCTION update_doc_send_tables_updated_at();

ALTER TABLE recipient_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipient_profiles_select_own_org"
  ON recipient_profiles FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "recipient_profiles_insert_own_org"
  ON recipient_profiles FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "recipient_profiles_update_own_org"
  ON recipient_profiles FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- NO DELETE policies.

-- ============================================================================
-- 4. user_notification_prefs
-- ============================================================================
CREATE TABLE user_notification_prefs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  new_pending_email boolean NOT NULL DEFAULT true,
  new_pending_in_app boolean NOT NULL DEFAULT true,
  expiring_email_days_before integer NOT NULL DEFAULT 30,
  expiring_email_frequency text NOT NULL DEFAULT 'weekly' CHECK (expiring_email_frequency IN (
    'daily',
    'weekly',
    'off'
  )),
  expired_email boolean NOT NULL DEFAULT true,
  sent_to_third_party_email boolean NOT NULL DEFAULT false,
  revoke_third_party_email boolean NOT NULL DEFAULT true,
  recipient_opened_email boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX idx_user_notification_prefs_org
  ON user_notification_prefs (organization_id);

CREATE TRIGGER trg_user_notification_prefs_updated_at
  BEFORE UPDATE ON user_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION update_doc_send_tables_updated_at();

ALTER TABLE user_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notification_prefs_select_own"
  ON user_notification_prefs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_notification_prefs_insert_own"
  ON user_notification_prefs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_notification_prefs_update_own"
  ON user_notification_prefs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- NO DELETE policies.
