-- study_email_log — tracks automated study email sends for dedup + visibility
CREATE TABLE IF NOT EXISTS study_email_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id      UUID REFERENCES market_research_responses(id) ON DELETE SET NULL,
  email_type       TEXT NOT NULL,
  recipient_email  TEXT NOT NULL,
  resend_id        TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE study_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON study_email_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY platform_admin_read ON study_email_log
  FOR SELECT TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'platform_admin'
  );

CREATE INDEX idx_study_email_log_response ON study_email_log(response_id);
CREATE INDEX idx_study_email_log_dedup ON study_email_log(response_id, email_type, status);
