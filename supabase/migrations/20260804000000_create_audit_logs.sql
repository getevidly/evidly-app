-- platform_audit_log: system audit log, service_role only
CREATE TABLE platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  actor_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_audit_log_org_created
  ON platform_audit_log (organization_id, created_at DESC);

CREATE INDEX idx_platform_audit_log_action_created
  ON platform_audit_log (action, created_at DESC);

ALTER TABLE platform_audit_log ENABLE ROW LEVEL SECURITY;
-- No authenticated policies. service_role bypasses RLS automatically.
-- Future admin-UI read access adds a policy then; not now.

-- service_action_log: operational, org-scoped
CREATE TABLE service_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  location_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  service_record_id uuid REFERENCES vendor_service_records(id) ON DELETE SET NULL,
  reschedule_request_id uuid REFERENCES service_reschedule_requests(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('reschedule_request', 'phone_call', 'email')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_action_log_org_created
  ON service_action_log (organization_id, created_at DESC);

CREATE INDEX idx_service_action_log_vendor_created
  ON service_action_log (vendor_id, created_at DESC);

ALTER TABLE service_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_action_log_select_own_org"
  ON service_action_log FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "service_action_log_insert_own_org"
  ON service_action_log FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "service_action_log_insert_service_role"
  ON service_action_log FOR INSERT
  TO service_role
  WITH CHECK (true);
