-- ============================================================
-- 20260821000000_inbound_comms_infrastructure.sql
-- Stage A: Channel-agnostic inbound communication infrastructure
-- ============================================================

-- ── message_threads ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_threads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type   text NOT NULL,
  entity_id     uuid NOT NULL,
  subject       text,
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'closed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX idx_message_threads_entity
  ON message_threads (entity_type, entity_id);
CREATE INDEX idx_message_threads_org
  ON message_threads (organization_id);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view threads"
  ON message_threads FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Org members can insert threads"
  ON message_threads FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Org members can update threads"
  ON message_threads FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Service role full access on threads"
  ON message_threads FOR ALL
  USING (auth.role() = 'service_role');

-- ── messages ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id                   uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  organization_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel                     text NOT NULL
                                CHECK (channel IN ('email', 'sms', 'in_app')),
  direction                   text NOT NULL
                                CHECK (direction IN ('inbound', 'outbound')),
  sender_type                 text NOT NULL
                                CHECK (sender_type IN ('operator', 'vendor', 'system')),
  sender_identifier           text,
  subject                     text,
  body_text                   text,
  body_html                   text,
  inbound_provider_message_id text,
  metadata                    jsonb NOT NULL DEFAULT '{}',
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_thread_id ON messages (thread_id);
CREATE INDEX idx_messages_org_id    ON messages (organization_id);

CREATE UNIQUE INDEX idx_messages_provider_dedup
  ON messages (inbound_provider_message_id)
  WHERE inbound_provider_message_id IS NOT NULL;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view messages"
  ON messages FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Org members can insert messages"
  ON messages FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Service role full access on messages"
  ON messages FOR ALL
  USING (auth.role() = 'service_role');

-- ── message_attachments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name       text NOT NULL,
  file_type       text,
  file_size       integer,
  storage_path    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_attachments_message
  ON message_attachments (message_id);

ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view attachments"
  ON message_attachments FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Org members can insert attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Service role full access on attachments"
  ON message_attachments FOR ALL
  USING (auth.role() = 'service_role');

-- ── Storage bucket for message attachments ──────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org-scoped read on message-attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role upload to message-attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.role() = 'service_role'
  );

-- ── Backfill: create threads for existing service_requests ──
INSERT INTO message_threads (organization_id, entity_type, entity_id, subject, created_at)
SELECT
  sr.organization_id,
  'service_request',
  sr.id,
  'Service Request: ' || sr.service_type,
  sr.created_at
FROM service_requests sr
WHERE NOT EXISTS (
  SELECT 1 FROM message_threads mt
  WHERE mt.entity_type = 'service_request' AND mt.entity_id = sr.id
)
ON CONFLICT (entity_type, entity_id) DO NOTHING;
