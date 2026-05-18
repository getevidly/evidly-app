-- Notification trigger: fire on new evidence trail messages.
-- Notifies all thread participants except the sender.
-- Uses human-readable requirement label from onboarding_pillar_requirements.
-- Gracefully no-ops if notifications table does not yet exist.

CREATE OR REPLACE FUNCTION notify_evidence_trail_message()
RETURNS TRIGGER AS $$
DECLARE
  v_thread RECORD;
  v_sender RECORD;
  v_participant RECORD;
  v_table_exists BOOLEAN;
BEGIN
  -- Guard: skip if notifications table is not yet provisioned
  SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications')
  INTO v_table_exists;
  IF NOT v_table_exists THEN RETURN NEW; END IF;

  -- Resolve thread metadata + human-readable label
  SELECT t.organization_id, t.requirement_code, t.pillar, r.label
  INTO v_thread
  FROM onboarding_item_threads t
  LEFT JOIN onboarding_pillar_requirements r
    ON r.requirement_code = t.requirement_code
  WHERE t.id = NEW.thread_id;

  IF v_thread IS NULL THEN RETURN NEW; END IF;

  -- Resolve sender name
  SELECT full_name INTO v_sender
  FROM user_profiles WHERE id = NEW.sender_user_id;

  -- Notify each participant except sender
  FOR v_participant IN
    SELECT p.user_id
    FROM onboarding_item_thread_participants p
    WHERE p.thread_id = NEW.thread_id
      AND p.user_id != NEW.sender_user_id
  LOOP
    INSERT INTO notifications (
      organization_id, user_id, type, category, title, body,
      action_url, action_label, priority, severity,
      source_type, source_id
    ) VALUES (
      v_thread.organization_id,
      v_participant.user_id,
      'evidence_trail_message',
      'team',
      'New message on ' || COALESCE(v_thread.label, v_thread.requirement_code),
      COALESCE(v_sender.full_name, 'A team member') || ' added a message',
      '/onboarding?req=' || v_thread.requirement_code,
      'View discussion',
      'medium',
      'info',
      'onboarding_item_thread_messages',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_evidence_trail_notify
  AFTER INSERT ON onboarding_item_thread_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_evidence_trail_message();
