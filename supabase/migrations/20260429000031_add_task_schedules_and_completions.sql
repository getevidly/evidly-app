-- Migration: Add task_schedules + task_completions for daily repetitive tasks
-- Why: Constitutional rule — daily repetitive tasks are key, leaders need
--      immediate insight. task_schedules defines what should happen and when;
--      task_completions records what actually did. Together they power the
--      "X tasks due today, Y done, Z overdue" leader view.
-- Design notes:
--   - 5-value task_recurrence enum (daily, weekly, multiple_per_day,
--     per_shift, ad_hoc) covers all expected scheduling patterns
--   - 4-value task_completion_status enum (due, completed, overdue, skipped)
--     drives the lifecycle
--   - task_completions has UNIQUE (task_schedule_id, due_at) preventing
--     duplicate instance generation by retried cron
--   - skip_reason CHECK enforces a reason when status='skipped'
--   - 4 source-FKs on task_completions link to readings (any may apply)
--   - RLS: schedules get full CRUD (config); completions get SELECT+UPDATE
--     only at user level (cron inserts via service role)
-- Cross-references:
--   - Phase 1 Schema Sprint commit 1 (haccp_step enum)
--   - Phase 1 Schema Sprint commit 5 (menu_items table)
--   - Phase 1 Schema Sprint commit 9 (step_alert_dispatch — overdue tasks
--     can fire alerts via the same dispatch table)

-- ── task_recurrence enum ─────────────────────────────────────────────

CREATE TYPE task_recurrence AS ENUM (
  'daily',
  'weekly',
  'multiple_per_day',
  'per_shift',
  'ad_hoc'
);

-- ── task_completion_status enum ──────────────────────────────────────

CREATE TYPE task_completion_status AS ENUM (
  'due',
  'completed',
  'overdue',
  'skipped'
);

-- ── task_schedules table ─────────────────────────────────────────────

CREATE TABLE task_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  step haccp_step NULL,
  equipment_id UUID NULL REFERENCES temperature_equipment(id) ON DELETE SET NULL,
  menu_item_id UUID NULL REFERENCES menu_items(id) ON DELETE SET NULL,
  recurrence task_recurrence NOT NULL,
  recurrence_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  due_window_minutes SMALLINT NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL REFERENCES user_profiles(id) ON DELETE SET NULL
);

-- task_schedules indexes

CREATE INDEX idx_task_schedules_organization_id
  ON task_schedules(organization_id);

CREATE INDEX idx_task_schedules_location_id
  ON task_schedules(location_id);

CREATE INDEX idx_task_schedules_active
  ON task_schedules(location_id, is_active);

CREATE INDEX idx_task_schedules_step
  ON task_schedules(step)
  WHERE step IS NOT NULL;

-- task_schedules RLS

ALTER TABLE task_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_schedules_select ON task_schedules
  FOR SELECT
  USING (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY task_schedules_insert ON task_schedules
  FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY task_schedules_update ON task_schedules
  FOR UPDATE
  USING (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY task_schedules_delete ON task_schedules
  FOR DELETE
  USING (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

-- ── task_completions table ───────────────────────────────────────────

CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  task_schedule_id UUID NOT NULL REFERENCES task_schedules(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ NOT NULL,
  due_window_ends_at TIMESTAMPTZ NOT NULL,
  status task_completion_status NOT NULL DEFAULT 'due',
  completed_at TIMESTAMPTZ NULL,
  completed_by UUID NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  temperature_log_id UUID NULL REFERENCES temperature_logs(id) ON DELETE SET NULL,
  receiving_temp_log_id UUID NULL REFERENCES receiving_temp_logs(id) ON DELETE SET NULL,
  cooldown_log_id UUID NULL REFERENCES cooldown_logs(id) ON DELETE SET NULL,
  cooldown_temp_check_id UUID NULL REFERENCES cooldown_temp_checks(id) ON DELETE SET NULL,
  skip_reason TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT task_completions_unique_due UNIQUE (task_schedule_id, due_at),
  CONSTRAINT task_completions_skip_reason_chk CHECK (
    (status = 'skipped' AND skip_reason IS NOT NULL)
    OR (status <> 'skipped')
  )
);

-- task_completions indexes

CREATE INDEX idx_task_completions_organization_id
  ON task_completions(organization_id);

CREATE INDEX idx_task_completions_location_id
  ON task_completions(location_id);

CREATE INDEX idx_task_completions_schedule_due
  ON task_completions(task_schedule_id, due_at DESC);

CREATE INDEX idx_task_completions_due_status
  ON task_completions(due_at, status);

CREATE INDEX idx_task_completions_overdue_open
  ON task_completions(location_id, due_at DESC)
  WHERE status IN ('due', 'overdue');

CREATE INDEX idx_task_completions_temperature_log_id
  ON task_completions(temperature_log_id)
  WHERE temperature_log_id IS NOT NULL;

CREATE INDEX idx_task_completions_cooldown_log_id
  ON task_completions(cooldown_log_id)
  WHERE cooldown_log_id IS NOT NULL;

-- task_completions RLS

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_completions_select ON task_completions
  FOR SELECT
  USING (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY task_completions_update ON task_completions
  FOR UPDATE
  USING (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

-- NOTE: task_completions has no INSERT or DELETE policy at user level.
-- Cron edge function generates instances via service role.
-- Deletes are not part of normal flow — completed/skipped is the terminal state.
