-- ============================================================
-- FIX-DRIFT-HASH-CAST: Replace text::bytea with convert_to()
-- in fn_jurisdiction_config_drift_check().
--
-- BUG: text::bytea interprets the string as a bytea literal
-- (expects \x hex or backslash-escape format). JSONB text
-- isn't valid bytea literal syntax → 22P02 error on every
-- UPDATE to jurisdictions.fire_jurisdiction_config or
-- grading_config.
--
-- FIX: convert_to(text, 'UTF-8') correctly encodes any
-- UTF-8 string to raw bytes. Same sha256 → hex pipeline.
--
-- Also re-hashes any existing baselines in
-- jurisdiction_config_baselines so hash comparisons remain
-- consistent with the corrected conversion.
-- ============================================================

-- ── Step 1: Replace the trigger function ──────────────────

CREATE OR REPLACE FUNCTION fn_jurisdiction_config_drift_check()
RETURNS TRIGGER AS $$
DECLARE
  baseline RECORD;
  new_grading_hash TEXT;
  new_fire_hash TEXT;
  grading_changed BOOLEAN := false;
  fire_changed BOOLEAN := false;
  config_changed_label TEXT;
  alert_id UUID;
  ticket_id UUID;
  execution_id UUID;
  start_ts TIMESTAMPTZ := clock_timestamp();
  exec_duration INTEGER;
  changer TEXT;
BEGIN
  -- Identify who made the change
  changer := COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'sub',
    auth.uid()::text,
    current_user,
    'unknown'
  );

  -- Compute hashes of the NEW config values
  -- FIX: convert_to() instead of ::bytea (was 22P02 on JSONB text)
  new_grading_hash := encode(sha256(convert_to(COALESCE(NEW.grading_config::text, 'null'), 'UTF-8')), 'hex');
  new_fire_hash := encode(sha256(convert_to(COALESCE(NEW.fire_jurisdiction_config::text, 'null'), 'UTF-8')), 'hex');

  -- Look up baseline
  SELECT * INTO baseline
  FROM jurisdiction_config_baselines
  WHERE jurisdiction_id = NEW.id;

  -- ── NO BASELINE — log execution, create ticket, alert, exit ──
  IF NOT FOUND THEN
    exec_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_ts)::integer;

    -- Log execution
    INSERT INTO drift_monitor_executions (
      jurisdiction_id, jurisdiction_name, grading_config_hash, fire_config_hash,
      baseline_grading_hash, baseline_fire_hash, grading_match, fire_match,
      drift_detected, execution_duration_ms, changed_by
    ) VALUES (
      NEW.id, NEW.agency_name, new_grading_hash, new_fire_hash,
      NULL, NULL, false, false,
      true, exec_duration, changer
    );

    -- Log drift alert
    INSERT INTO drift_alert_log (
      jurisdiction_id, jurisdiction_name, config_changed,
      old_hash, new_hash, new_value, changed_by
    ) VALUES (
      NEW.id, NEW.agency_name, 'NO_BASELINE',
      'none', new_grading_hash, NEW.grading_config, changer
    ) RETURNING id INTO alert_id;

    -- Create support ticket
    INSERT INTO support_tickets (
      title, description, category, priority,
      related_jurisdiction_id, related_drift_alert_id, metadata
    ) VALUES (
      'DRIFT: No baseline — ' || NEW.agency_name,
      'Jurisdiction "' || NEW.agency_name || '" was updated but has no audit baseline. '
        || 'This jurisdiction may have been added after the last audit or was missed. '
        || 'Changed by: ' || changer || '. '
        || 'Action: Run JURISDICTION-AUDIT-TRIPLE-PASS to establish a baseline.',
      'jurisdiction_drift', 'critical',
      NEW.id, alert_id,
      jsonb_build_object(
        'alert_type', 'NO_BASELINE',
        'changed_by', changer,
        'new_grading_hash', new_grading_hash,
        'new_fire_hash', new_fire_hash
      )
    ) RETURNING id INTO ticket_id;

    -- Fire Edge Function (skip if URL not configured)
    IF current_setting('app.settings.drift_alert_url', true) IS NOT NULL THEN
      PERFORM net.http_post(
        url := current_setting('app.settings.drift_alert_url', true),
        body := jsonb_build_object(
          'alert_id', alert_id,
          'ticket_id', ticket_id,
          'jurisdiction_name', NEW.agency_name,
          'alert_type', 'NO_BASELINE',
          'changed_by', changer,
          'message', 'Jurisdiction has no audit baseline — may be newly added or missed by audit'
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  -- ── Compare hashes ──
  grading_changed := (new_grading_hash IS DISTINCT FROM baseline.grading_config_hash);
  fire_changed := (new_fire_hash IS DISTINCT FROM baseline.fire_config_hash);

  -- Calculate duration
  exec_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_ts)::integer;

  -- ── NO DRIFT — log clean execution and exit ──
  IF NOT grading_changed AND NOT fire_changed THEN
    INSERT INTO drift_monitor_executions (
      jurisdiction_id, jurisdiction_name, grading_config_hash, fire_config_hash,
      baseline_grading_hash, baseline_fire_hash, grading_match, fire_match,
      drift_detected, execution_duration_ms, changed_by
    ) VALUES (
      NEW.id, NEW.agency_name, new_grading_hash, new_fire_hash,
      baseline.grading_config_hash, baseline.fire_config_hash, true, true,
      false, exec_duration, changer
    );
    RETURN NEW;
  END IF;

  -- ── DRIFT DETECTED ──
  config_changed_label := CASE
    WHEN grading_changed AND fire_changed THEN 'both'
    WHEN grading_changed THEN 'grading_config'
    ELSE 'fire_jurisdiction_config'
  END;

  -- Log drift alert
  INSERT INTO drift_alert_log (
    jurisdiction_id, jurisdiction_name, config_changed,
    old_hash, new_hash, old_value, new_value, changed_by
  ) VALUES (
    NEW.id, NEW.agency_name, config_changed_label,
    CASE WHEN grading_changed THEN baseline.grading_config_hash ELSE baseline.fire_config_hash END,
    CASE WHEN grading_changed THEN new_grading_hash ELSE new_fire_hash END,
    CASE WHEN grading_changed THEN OLD.grading_config ELSE OLD.fire_jurisdiction_config END,
    CASE WHEN grading_changed THEN NEW.grading_config ELSE NEW.fire_jurisdiction_config END,
    changer
  ) RETURNING id INTO alert_id;

  -- Create support ticket
  INSERT INTO support_tickets (
    title, description, category, priority,
    related_jurisdiction_id, related_drift_alert_id, metadata
  ) VALUES (
    'DRIFT: Unauthorized change — ' || NEW.agency_name || ' (' || config_changed_label || ')',
    'Jurisdiction "' || NEW.agency_name || '" config was modified. '
      || 'Config changed: ' || config_changed_label || '. '
      || 'Changed by: ' || changer || '. '
      || 'Old hash: ' || CASE WHEN grading_changed THEN baseline.grading_config_hash ELSE baseline.fire_config_hash END || '. '
      || 'New hash: ' || CASE WHEN grading_changed THEN new_grading_hash ELSE new_fire_hash END || '. '
      || 'Action: Review the change in drift_alert_log (id: ' || alert_id || '). '
      || 'If unauthorized, revert immediately and investigate source. '
      || 'If authorized, update the baseline by running JURISDICTION-AUDIT-TRIPLE-PASS.',
    'jurisdiction_drift', 'critical',
    NEW.id, alert_id,
    jsonb_build_object(
      'config_changed', config_changed_label,
      'changed_by', changer,
      'old_grading_hash', baseline.grading_config_hash,
      'new_grading_hash', new_grading_hash,
      'old_fire_hash', baseline.fire_config_hash,
      'new_fire_hash', new_fire_hash,
      'grading_changed', grading_changed,
      'fire_changed', fire_changed
    )
  ) RETURNING id INTO ticket_id;

  -- Log execution with drift
  INSERT INTO drift_monitor_executions (
    jurisdiction_id, jurisdiction_name, grading_config_hash, fire_config_hash,
    baseline_grading_hash, baseline_fire_hash, grading_match, fire_match,
    drift_detected, drift_alert_id, ticket_id, execution_duration_ms, changed_by
  ) VALUES (
    NEW.id, NEW.agency_name, new_grading_hash, new_fire_hash,
    baseline.grading_config_hash, baseline.fire_config_hash,
    NOT grading_changed, NOT fire_changed,
    true, alert_id, ticket_id, exec_duration, changer
  );

  -- Fire Edge Function for email alert (skip if URL not configured)
  IF current_setting('app.settings.drift_alert_url', true) IS NOT NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.drift_alert_url', true),
      body := jsonb_build_object(
      'alert_id', alert_id,
      'ticket_id', ticket_id,
      'ticket_number', (SELECT ticket_number FROM support_tickets WHERE id = ticket_id),
      'jurisdiction_name', NEW.agency_name,
      'jurisdiction_id', NEW.id,
      'config_changed', config_changed_label,
      'changed_by', changer,
      'old_hash', CASE WHEN grading_changed THEN baseline.grading_config_hash ELSE baseline.fire_config_hash END,
      'new_hash', CASE WHEN grading_changed THEN new_grading_hash ELSE new_fire_hash END,
      'detected_at', now()
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── Step 2: Re-hash existing baselines ────────────────────
-- Any rows stored with the old ::bytea method need to be
-- re-computed with convert_to() so comparisons stay valid.
-- This is a no-op if the table is empty.

UPDATE jurisdiction_config_baselines b
SET
  grading_config_hash = encode(
    sha256(convert_to(COALESCE(j.grading_config::text, 'null'), 'UTF-8')),
    'hex'
  ),
  fire_config_hash = encode(
    sha256(convert_to(COALESCE(j.fire_jurisdiction_config::text, 'null'), 'UTF-8')),
    'hex'
  )
FROM jurisdictions j
WHERE j.id = b.jurisdiction_id;
