-- ═══════════════════════════════════════════════════════════
-- Evidence Trail Schema — Onboarding Phase 4
-- Per-item conversation surface for PPP-framed audit trail
-- ═══════════════════════════════════════════════════════════

-- 1. TABLES

CREATE TABLE IF NOT EXISTS onboarding_item_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requirement_code TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('food_safety', 'fire_safety')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  UNIQUE (organization_id, requirement_code)
);

CREATE TABLE IF NOT EXISTS onboarding_item_thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES onboarding_item_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_at_join TEXT CHECK (role_at_join IN ('owner', 'assignee', 'added')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID REFERENCES user_profiles(id),
  UNIQUE (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS onboarding_item_thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES onboarding_item_threads(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES user_profiles(id),
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_by JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS evidence_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pattern_text TEXT NOT NULL,
  thread_ids UUID[] NOT NULL DEFAULT '{}',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dashboard_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. INDEXES

CREATE INDEX idx_thread_messages_thread_created
  ON onboarding_item_thread_messages(thread_id, created_at);
CREATE INDEX idx_thread_participants_thread
  ON onboarding_item_thread_participants(thread_id);
CREATE INDEX idx_threads_org_req
  ON onboarding_item_threads(organization_id, requirement_code);
CREATE INDEX idx_evidence_signals_org
  ON evidence_signals(organization_id);

-- 3. ENABLE RLS

ALTER TABLE onboarding_item_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_item_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_item_thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_signals ENABLE ROW LEVEL SECURITY;

-- 4. HELPER FUNCTIONS (SECURITY DEFINER to avoid self-referencing RLS recursion)

CREATE OR REPLACE FUNCTION is_evidence_thread_participant(p_thread_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM onboarding_item_thread_participants
    WHERE thread_id = p_thread_id AND user_id = p_user_id
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_evidence_org_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id AND organization_id = p_org_id
    AND role IN ('owner', 'owner_operator', 'executive')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_evidence_thread_org_owner(p_thread_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM onboarding_item_threads t
    JOIN user_profiles up ON up.id = p_user_id
      AND up.organization_id = t.organization_id
      AND up.role IN ('owner', 'owner_operator', 'executive')
    WHERE t.id = p_thread_id
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_evidence_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = p_user_id AND organization_id = p_org_id
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. RLS POLICIES

-- threads
CREATE POLICY "threads_select" ON onboarding_item_threads FOR SELECT USING (
  is_evidence_thread_participant(id, auth.uid())
  OR is_evidence_org_owner(organization_id, auth.uid())
);
CREATE POLICY "threads_insert" ON onboarding_item_threads FOR INSERT WITH CHECK (
  is_evidence_org_member(organization_id, auth.uid())
);
CREATE POLICY "threads_update" ON onboarding_item_threads FOR UPDATE USING (
  is_evidence_thread_participant(id, auth.uid())
  OR is_evidence_org_owner(organization_id, auth.uid())
);

-- participants
CREATE POLICY "participants_select" ON onboarding_item_thread_participants FOR SELECT USING (
  is_evidence_thread_participant(thread_id, auth.uid())
  OR is_evidence_thread_org_owner(thread_id, auth.uid())
);
CREATE POLICY "participants_insert" ON onboarding_item_thread_participants FOR INSERT WITH CHECK (
  is_evidence_thread_participant(thread_id, auth.uid())
  OR is_evidence_thread_org_owner(thread_id, auth.uid())
);

-- messages
CREATE POLICY "messages_select" ON onboarding_item_thread_messages FOR SELECT USING (
  is_evidence_thread_participant(thread_id, auth.uid())
  OR is_evidence_thread_org_owner(thread_id, auth.uid())
);
CREATE POLICY "messages_insert" ON onboarding_item_thread_messages FOR INSERT WITH CHECK (
  sender_user_id = auth.uid()
  AND (
    is_evidence_thread_participant(thread_id, auth.uid())
    OR is_evidence_thread_org_owner(thread_id, auth.uid())
  )
);
CREATE POLICY "messages_update_readby" ON onboarding_item_thread_messages FOR UPDATE USING (
  is_evidence_thread_participant(thread_id, auth.uid())
  OR is_evidence_thread_org_owner(thread_id, auth.uid())
);

-- signals (org-wide read; edge function writes with service_role)
CREATE POLICY "signals_select" ON evidence_signals FOR SELECT USING (
  is_evidence_org_member(organization_id, auth.uid())
);

-- 6. IMMUTABILITY TRIGGER (Proof framing)

CREATE OR REPLACE FUNCTION enforce_message_immutability() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body
    OR NEW.attachments IS DISTINCT FROM OLD.attachments
    OR NEW.sender_user_id IS DISTINCT FROM OLD.sender_user_id
    OR NEW.thread_id IS DISTINCT FROM OLD.thread_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Message content is immutable — only read_by may be updated';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_immutability_check
  BEFORE UPDATE ON onboarding_item_thread_messages
  FOR EACH ROW EXECUTE FUNCTION enforce_message_immutability();

-- 7. RPC: create_evidence_thread

CREATE OR REPLACE FUNCTION create_evidence_thread(
  p_organization_id UUID,
  p_requirement_code TEXT,
  p_pillar TEXT,
  p_body TEXT,
  p_attachments JSONB DEFAULT '[]'::jsonb,
  p_assignee_user_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_thread_id UUID;
  v_message_id UUID;
  v_caller_id UUID := auth.uid();
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role
  FROM user_profiles WHERE id = v_caller_id AND organization_id = p_organization_id;
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  INSERT INTO onboarding_item_threads (organization_id, requirement_code, pillar, last_message_at)
  VALUES (p_organization_id, p_requirement_code, p_pillar, now())
  ON CONFLICT (organization_id, requirement_code)
    DO UPDATE SET last_message_at = now()
  RETURNING id INTO v_thread_id;

  INSERT INTO onboarding_item_thread_participants (thread_id, user_id, role_at_join)
  VALUES (v_thread_id, v_caller_id,
    CASE WHEN v_caller_role IN ('owner','owner_operator','executive') THEN 'owner' ELSE 'assignee' END)
  ON CONFLICT (thread_id, user_id) DO NOTHING;

  IF p_assignee_user_id IS NOT NULL AND p_assignee_user_id != v_caller_id THEN
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_assignee_user_id AND organization_id = p_organization_id) THEN
      RAISE EXCEPTION 'Assignee is not a member of this organization';
    END IF;
    INSERT INTO onboarding_item_thread_participants (thread_id, user_id, role_at_join, added_by)
    VALUES (v_thread_id, p_assignee_user_id, 'assignee', v_caller_id)
    ON CONFLICT (thread_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO onboarding_item_thread_messages (thread_id, sender_user_id, body, attachments, read_by)
  VALUES (v_thread_id, v_caller_id, p_body, p_attachments,
    jsonb_build_object(v_caller_id::text, now()::text))
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object('thread_id', v_thread_id, 'message_id', v_message_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: mark_evidence_messages_read

CREATE OR REPLACE FUNCTION mark_evidence_messages_read(p_message_ids UUID[])
RETURNS VOID AS $$
  UPDATE onboarding_item_thread_messages
  SET read_by = read_by || jsonb_build_object(auth.uid()::text, now()::text)
  WHERE id = ANY(p_message_ids)
    AND NOT (read_by ? auth.uid()::text)
$$ LANGUAGE sql;

-- 9. RPC: get_evidence_thread_summaries

CREATE OR REPLACE FUNCTION get_evidence_thread_summaries(p_org_id UUID)
RETURNS TABLE (
  requirement_code TEXT,
  thread_id UUID,
  message_count BIGINT,
  unread_count BIGINT,
  attachment_count BIGINT,
  last_message_at TIMESTAMPTZ
) AS $$
  SELECT
    t.requirement_code,
    t.id,
    COUNT(m.id),
    COUNT(m.id) FILTER (WHERE NOT (m.read_by ? auth.uid()::text)),
    COALESCE(SUM(jsonb_array_length(m.attachments)), 0),
    t.last_message_at
  FROM onboarding_item_threads t
  LEFT JOIN onboarding_item_thread_messages m ON m.thread_id = t.id
  WHERE t.organization_id = p_org_id
    AND (
      is_evidence_thread_participant(t.id, auth.uid())
      OR is_evidence_org_owner(t.organization_id, auth.uid())
    )
  GROUP BY t.id, t.requirement_code, t.last_message_at
$$ LANGUAGE sql STABLE;

-- 10. REALTIME PUBLICATION

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE onboarding_item_thread_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE onboarding_item_thread_participants;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE onboarding_item_threads;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
