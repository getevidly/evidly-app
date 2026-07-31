-- Rename onboarding_pillar_requirements → pillar_requirements.
-- The table is the canonical requirements catalog, not an onboarding artifact.

ALTER TABLE onboarding_pillar_requirements RENAME TO pillar_requirements;

-- Rename constraints to match new table name
ALTER TABLE pillar_requirements
  RENAME CONSTRAINT onboarding_pillar_requirements_pillar_check
  TO pillar_requirements_pillar_check;

-- Update the trigger function that joins to this table for notification labels
CREATE OR REPLACE FUNCTION notify_evidence_trail_message()
RETURNS TRIGGER AS $$
DECLARE
  v_thread RECORD;
  v_sender RECORD;
  v_participant RECORD;
BEGIN
  -- Resolve thread metadata + human-readable label
  SELECT t.organization_id, t.requirement_code, t.pillar, r.label
  INTO v_thread
  FROM onboarding_item_threads t
  LEFT JOIN pillar_requirements r
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

-- RLS policy rename — drop old, create new with matching name
DROP POLICY IF EXISTS "Authenticated users can read onboarding requirements" ON pillar_requirements;
CREATE POLICY "Authenticated users can read pillar requirements"
  ON pillar_requirements FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE pillar_requirements IS
  'Canonical requirements catalog per state and pillar. CA seeded at launch. counts_toward_total drives the "X of Y required" denominator; is_conditional flags items that only apply to some facilities. scope = vendor means one instance per active vendor per location.';
