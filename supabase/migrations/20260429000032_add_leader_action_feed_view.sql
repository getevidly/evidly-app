-- Migration: Add leader_action_feed view aggregating all capture sources
-- Why: Constitutional rule — leaders need immediate insight on all actions.
--      One SELECT returns every action, alert, and overdue item across
--      the kitchen, sorted by urgency. Powers the real-time leader view.
-- Design notes:
--   - 14-column uniform shape across all UNION ALL legs:
--     feed_id, source, organization_id, location_id, step, severity,
--     title, body, event_at, equipment_id, food_batch_id,
--     temperature_log_id, task_completion_id, metadata
--   - feed_id format: '<source>:<row_id>' for deduplication and React keys
--   - severity normalized to text ('info', 'warning', 'critical') —
--     alert_severity 'escalated' maps to 'critical'
--   - security_invoker = true — view inherits RLS from underlying tables,
--     matching the pattern from unified_temp_readings_granular and
--     unified_temp_readings_current (original schema sprint commits 14, 15)
--   - View is unbounded; application code filters by event_at window
--
-- Legs shipped in this commit (2 of 6):
--   1. step_alert_dispatch (unresolved) — active alerts on any HACCP step
--   2. task_completions (due or overdue) — open scheduled tasks
--
-- Deferred legs (4 of 6) — blocked on threshold-from-config integration:
--   3. temperature_logs (out of range, recent) — needs jurisdiction
--      threshold config to define "out of range" without hardcoding
--   4. receiving_temp_logs (out of range, recent) — same dependency
--   5. cooldown_logs (overdue checkpoints) — needs checkpoint deadline
--      calculation from config
--   6. cooldown_temp_checks (failed, recent) — needs threshold config
--
-- Schema column drift notes for future legs:
--   - temperature_logs uses 'facility_id' (not 'location_id') and has
--     no 'organization_id' — requires aliasing in future leg
--   - temperature_logs value column is 'temperature' (not 'temperature_value')
--   - receiving_temp_logs value column is 'temperature_value'
--   - cooldown_temp_checks has no organization_id/location_id — scoped
--     via cooldown_log_id parent FK; future leg JOINs through cooldown_logs
--
-- Cross-references:
--   - Phase 1 Schema Sprint commit 9 (step_alert_dispatch)
--   - Phase 1 Schema Sprint commit 10 (task_schedules + task_completions)
--   - Original schema sprint commits 14, 15 (security_invoker view pattern)

CREATE OR REPLACE VIEW leader_action_feed
WITH (security_invoker = true)
AS

-- ── 1. Active alerts (unresolved) ───────────────────────────────────
SELECT
  'alert:' || sad.id::text                                 AS feed_id,
  'alert'::text                                            AS source,
  sad.organization_id,
  sad.location_id,
  sad.step,
  CASE sad.severity
    WHEN 'info'      THEN 'info'
    WHEN 'warning'   THEN 'warning'
    WHEN 'critical'  THEN 'critical'
    WHEN 'escalated' THEN 'critical'
  END::text                                                AS severity,
  sad.title,
  sad.body,
  sad.triggered_at                                         AS event_at,
  sad.equipment_id,
  sad.food_batch_id,
  sad.temperature_log_id,
  NULL::uuid                                               AS task_completion_id,
  jsonb_build_object(
    'rule_key',          sad.rule_key,
    'severity_raw',      sad.severity::text,
    'status',            sad.status::text,
    'escalation_count',  sad.escalation_count,
    'metadata',          sad.metadata
  )                                                        AS metadata

FROM step_alert_dispatch sad
WHERE sad.resolved_at IS NULL

UNION ALL

-- ── 2. Open task completions (due or overdue) ───────────────────────
SELECT
  'task:' || tc.id::text                                   AS feed_id,
  'task'::text                                             AS source,
  tc.organization_id,
  tc.location_id,
  ts.step,
  CASE tc.status
    WHEN 'overdue' THEN 'warning'
    WHEN 'due'     THEN 'info'
  END::text                                                AS severity,
  ts.name                                                  AS title,
  COALESCE(ts.description, '')                             AS body,
  tc.due_at                                                AS event_at,
  ts.equipment_id,
  NULL::uuid                                               AS food_batch_id,
  tc.temperature_log_id,
  tc.id                                                    AS task_completion_id,
  jsonb_build_object(
    'task_schedule_id',     tc.task_schedule_id,
    'recurrence',           ts.recurrence::text,
    'due_window_ends_at',   tc.due_window_ends_at,
    'status',               tc.status::text,
    'menu_item_id',         ts.menu_item_id
  )                                                        AS metadata

FROM task_completions tc
JOIN task_schedules ts ON ts.id = tc.task_schedule_id
WHERE tc.status IN ('due', 'overdue')
;
