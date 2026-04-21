-- TASK-ASSIGN-01: Task Assignment & Scheduling System
-- Template → Instance architecture for recurring operational tasks

-- ══════════════════════════════════════════════════════════════
-- 1. task_definitions — recurring task templates
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS task_definitions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  task_type           TEXT NOT NULL CHECK (task_type IN (
    'temperature_log', 'checklist', 'corrective_action',
    'document_upload', 'equipment_check', 'vendor_service', 'custom'
  )),
  -- Schedule
  schedule_type       TEXT DEFAULT 'daily' CHECK (schedule_type IN (
    'once', 'daily', 'weekly', 'shift', 'custom'
  )),
  schedule_days       INTEGER[],          -- 0=Sun .. 6=Sat (for weekly)
  schedule_shifts     TEXT[],             -- 'morning','midday','evening','closing'
  due_time            TIME,               -- time of day task is due
  due_offset_minutes  INTEGER,            -- minutes after shift start
  -- Assignment
  assigned_to_role    TEXT,               -- anyone with this role
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Linked entities
  linked_checklist_id UUID,
  linked_equipment_id UUID,
  linked_vendor_id    UUID,
  custom_task_detail  TEXT,
  -- Notifications
  reminder_minutes    INTEGER DEFAULT 30,
  due_soon_minutes    INTEGER DEFAULT 15,
  -- Escalation (fully customizable)
  escalation_config   JSONB DEFAULT '{
    "enabled": true,
    "levels": [
      {"delay_minutes": 30, "notify_role": "kitchen_manager"},
      {"delay_minutes": 60, "notify_role": "owner_operator"}
    ]
  }'::jsonb,
  is_active           BOOLEAN DEFAULT true,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 2. task_instances — daily generated occurrences
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS task_instances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id       UUID NOT NULL REFERENCES task_definitions(id) ON DELETE CASCADE,
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,
  assigned_to         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  task_type           TEXT NOT NULL,
  due_at              TIMESTAMPTZ NOT NULL,
  status              TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'overdue', 'skipped', 'escalated'
  )),
  -- Completion
  completed_at        TIMESTAMPTZ,
  completed_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completion_note     TEXT,
  linked_record_id    UUID,               -- ID of the created temp log/checklist/etc
  -- Notification tracking
  reminder_sent_at    TIMESTAMPTZ,
  due_soon_sent_at    TIMESTAMPTZ,
  overdue_sent_at     TIMESTAMPTZ,
  escalation_level    INTEGER DEFAULT 0,
  last_escalated_at   TIMESTAMPTZ,
  -- Metadata
  date                DATE NOT NULL DEFAULT CURRENT_DATE,
  shift               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  -- Idempotent: one instance per definition per date per shift
  UNIQUE(definition_id, date, shift)
);

-- ══════════════════════════════════════════════════════════════
-- 3. task_notification_prefs — per-user per-task-type overrides
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS task_notification_prefs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_type           TEXT,               -- null = applies to all types
  notify_push         BOOLEAN DEFAULT true,
  notify_email        BOOLEAN DEFAULT true,
  notify_sms          BOOLEAN DEFAULT false,
  reminder_minutes    INTEGER DEFAULT 30,
  UNIQUE(user_id, org_id, task_type)
);

-- ══════════════════════════════════════════════════════════════
-- 4. Indexes
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_task_definitions_org
  ON task_definitions(org_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_task_instances_due_at
  ON task_instances(due_at);

CREATE INDEX IF NOT EXISTS idx_task_instances_status
  ON task_instances(status);

CREATE INDEX IF NOT EXISTS idx_task_instances_assigned_to
  ON task_instances(assigned_to);

CREATE INDEX IF NOT EXISTS idx_task_instances_org_date
  ON task_instances(org_id, date);

-- ══════════════════════════════════════════════════════════════
-- 5. Row Level Security
-- ══════════════════════════════════════════════════════════════
ALTER TABLE task_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_definitions_select" ON task_definitions;
CREATE POLICY "task_definitions_select" ON task_definitions FOR SELECT
  USING (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "task_definitions_insert" ON task_definitions;
CREATE POLICY "task_definitions_insert" ON task_definitions FOR INSERT
  WITH CHECK (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "task_definitions_update" ON task_definitions;
CREATE POLICY "task_definitions_update" ON task_definitions FOR UPDATE
  USING (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "task_instances_select" ON task_instances;
CREATE POLICY "task_instances_select" ON task_instances FOR SELECT
  USING (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "task_instances_insert" ON task_instances;
CREATE POLICY "task_instances_insert" ON task_instances FOR INSERT
  WITH CHECK (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "task_instances_update" ON task_instances;
CREATE POLICY "task_instances_update" ON task_instances FOR UPDATE
  USING (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "task_prefs_own" ON task_notification_prefs;
CREATE POLICY "task_prefs_own" ON task_notification_prefs FOR ALL
  USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- 6. Realtime
-- ══════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE task_instances;

-- ══════════════════════════════════════════════════════════════
-- 7. pg_cron schedules
-- ══════════════════════════════════════════════════════════════
DO $outer$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Generate task instances daily at 5 AM UTC (9 PM PT previous day)
    PERFORM cron.schedule(
      'generate-task-instances-daily',
      '0 5 * * *',
      $$SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/generate-task-instances',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      )$$
    );

    -- Check task notifications every 5 minutes
    PERFORM cron.schedule(
      'task-notifications-check',
      '*/5 * * * *',
      $$SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/task-notifications',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      )$$
    );
  END IF;
END $outer$;
