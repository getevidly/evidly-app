-- compliance_documents foundational schema. Three tables:
--
-- 1. compliance_documents — canonical store for all compliance documents
--    (kitchen/employee records, vendor service records, vendor business records).
--    One row per document. Status machine governs lifecycle.
--
-- 2. compliance_document_requests — tracks the request -> upload -> fulfill flow
--    distinctly from the document itself. Holds the secure_token used by vendors
--    uploading via tokenized links.
--
-- 3. compliance_document_activity_log — append-only audit trail. Powers the
--    "Activity" timeline in the Documents preview modal.
--
-- Naming: prefixed with compliance_ to avoid collision with the legacy
-- documents table (15 cols, 30+ code consumers, different shape). Legacy table
-- is left untouched; consumer migration is a separate workstream.
--
-- Locked decisions encoded here:
-- - Compliance documents can only be archived, never deleted. RLS grants
--   SELECT/INSERT/UPDATE only; no DELETE policies. Status='archived' is the
--   sole deletion mechanism.
-- - Versioning chain is BACKWARD: parent_document_id references the
--   predecessor (older version).
-- - import_source enum + import_source_metadata jsonb captures how a doc
--   arrived (manual, camera, cloud, vendor secure link, etc.).
-- - employee_id FK targets user_profiles(id) — codebase pattern; no separate
--   employees table.

-- ============================================================================
-- 1. compliance_documents
-- ============================================================================
CREATE TABLE compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN (
    'kitchen_employee',
    'vendor_service',
    'vendor_business'
  )),
  type text NOT NULL,
  name text NOT NULL,
  status text NOT NULL CHECK (status IN (
    'requested',
    'pending',
    'current',
    'expiring',
    'expired',
    'rejected',
    'archived',
    'cancelled'
  )),
  storage_path text,
  file_size_bytes bigint,
  mime_type text,
  issued_date date,
  expiry_date date,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  parent_document_id uuid REFERENCES compliance_documents(id) ON DELETE SET NULL,
  import_source text NOT NULL DEFAULT 'manual_upload' CHECK (import_source IN (
    'manual_upload',
    'camera_capture',
    'google_drive',
    'onedrive',
    'dropbox',
    'box',
    'icloud',
    'email_forward',
    'vendor_secure_link',
    'api'
  )),
  import_source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  rejection_reason text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_documents_org_category_status
  ON compliance_documents (organization_id, category, status);

CREATE INDEX idx_compliance_documents_org_vendor_category
  ON compliance_documents (organization_id, vendor_id, category)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX idx_compliance_documents_org_employee_category
  ON compliance_documents (organization_id, employee_id, category)
  WHERE employee_id IS NOT NULL;

CREATE INDEX idx_compliance_documents_expiry_date
  ON compliance_documents (expiry_date)
  WHERE expiry_date IS NOT NULL AND status IN ('current', 'expiring');

CREATE INDEX idx_compliance_documents_org_pending
  ON compliance_documents (organization_id, status)
  WHERE status IN ('pending', 'requested');

CREATE INDEX idx_compliance_documents_parent
  ON compliance_documents (parent_document_id)
  WHERE parent_document_id IS NOT NULL;

CREATE INDEX idx_compliance_documents_search
  ON compliance_documents
  USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(type, '')));

CREATE OR REPLACE FUNCTION update_compliance_documents_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $TRIG$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$TRIG$;

CREATE TRIGGER trg_compliance_documents_updated_at
  BEFORE UPDATE ON compliance_documents
  FOR EACH ROW EXECUTE FUNCTION update_compliance_documents_updated_at();

ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_documents_select_own_org"
  ON compliance_documents FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "compliance_documents_insert_own_org"
  ON compliance_documents FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "compliance_documents_update_own_org"
  ON compliance_documents FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "compliance_documents_insert_service_role"
  ON compliance_documents FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "compliance_documents_update_service_role"
  ON compliance_documents FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- NO DELETE policies. Compliance documents are archived, never deleted.

-- ============================================================================
-- 2. compliance_document_requests
-- ============================================================================
CREATE TABLE compliance_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES compliance_documents(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  secure_token text NOT NULL UNIQUE,
  secure_token_expires_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  resend_count integer NOT NULL DEFAULT 0,
  last_resent_at timestamptz,
  recipient_email text,
  recipient_name text,
  note_to_recipient text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_document_requests_org_active
  ON compliance_document_requests (organization_id)
  WHERE fulfilled_at IS NULL AND cancelled_at IS NULL;

CREATE INDEX idx_compliance_document_requests_document
  ON compliance_document_requests (document_id);

CREATE INDEX idx_compliance_document_requests_secure_token
  ON compliance_document_requests (secure_token);

CREATE TRIGGER trg_compliance_document_requests_updated_at
  BEFORE UPDATE ON compliance_document_requests
  FOR EACH ROW EXECUTE FUNCTION update_compliance_documents_updated_at();

ALTER TABLE compliance_document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_document_requests_select_own_org"
  ON compliance_document_requests FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "compliance_document_requests_insert_own_org"
  ON compliance_document_requests FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "compliance_document_requests_update_own_org"
  ON compliance_document_requests FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "compliance_document_requests_insert_service_role"
  ON compliance_document_requests FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "compliance_document_requests_update_service_role"
  ON compliance_document_requests FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- NO DELETE policies — same archive-only rule.

-- ============================================================================
-- 3. compliance_document_activity_log
-- ============================================================================
CREATE TABLE compliance_document_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES compliance_documents(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'requested',
    'request_resent',
    'request_cancelled',
    'submitted',
    'viewed',
    'accepted',
    'rejected',
    'archived',
    'expired',
    'expiring_warning',
    'renewed',
    'sent_to_third_party',
    'send_revoked',
    'noted'
  )),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_document_activity_log_doc_time
  ON compliance_document_activity_log (document_id, occurred_at DESC);

CREATE INDEX idx_compliance_document_activity_log_org_event_time
  ON compliance_document_activity_log (organization_id, event_type, occurred_at DESC);

ALTER TABLE compliance_document_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_document_activity_log_select_own_org"
  ON compliance_document_activity_log FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "compliance_document_activity_log_insert_service_role"
  ON compliance_document_activity_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- NO UPDATE policies — append-only.
-- NO DELETE policies — archive-only rule.
