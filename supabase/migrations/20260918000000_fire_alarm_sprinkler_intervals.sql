/*
 * 20260918000000_fire_alarm_sprinkler_intervals.sql
 *
 * Fire-alarm + sprinkler interval resolution in pl_standards_registry.
 *
 * Grounded intervals (Arthur-confirmed from NFPA source):
 *   fire_alarm → 365 days (NFPA 72 Table 14.3.1, annual control-unit test)
 *   sprinkler  → 365 days (NFPA 25 §5.2.1.1 annual inspection; §5.4.1.7 cooking nozzles)
 *
 * Changes (jsonb deep-merge — all sibling keys preserved):
 *
 *   fire_alarm:
 *     SET  requirement.national.frequency.intervals_days = {"default": 365}
 *
 *   sprinkler:
 *     SET  requirement.national.frequency.intervals_days = {"default": 365}
 *     SET  requirement.national.frequency.cite = corrected NFPA 25 citation
 *     SET  requirement.binds.frequency.tier = "national"   (was "pending")
 *     DEL  requirement.national.frequency._status          (source now supplied)
 */

-- (a) fire_alarm — add intervals_days into national.frequency (sibling keys untouched)
UPDATE public.pl_standards_registry
SET requirement = jsonb_set(
  requirement,
  '{national,frequency,intervals_days}',
  '{"default": 365}'::jsonb,
  true  -- create_missing
),
    updated_at = now()
WHERE topic = 'fire_alarm';

-- (b) sprinkler — four atomic changes chained inside-out:
--     1. Remove national.frequency._status  (#- path removal)
--     2. Add national.frequency.intervals_days
--     3. Set binds.frequency.tier to "national"
--     4. Correct national.frequency.cite (outermost)
UPDATE public.pl_standards_registry
SET requirement = jsonb_set(
  jsonb_set(
    jsonb_set(
      (requirement #- '{national,frequency,_status}'),
      '{national,frequency,intervals_days}',
      '{"default": 365}'::jsonb,
      true  -- create_missing
    ),
    '{binds,frequency,tier}',
    '"national"'::jsonb
  ),
  '{national,frequency,cite}',
  '"NFPA 25 §5.2.1.1 (annual sprinkler inspection); §5.4.1.7 (commercial cooking nozzles annual)"'::jsonb
),
    updated_at = now()
WHERE topic = 'sprinkler';

-- Migration tracker
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260918000000')
ON CONFLICT DO NOTHING;
