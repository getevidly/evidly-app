-- Migration: Checklist template occurrence model
-- Adds cadence + due_windows + active_days for occurrence-based scheduling.
-- Backfills from legacy frequency column (kept for backward compatibility).
-- Dedupes pre-existing duplicate Opening Checklist for Test Food org.
-- Adds (organization_id, name) unique constraint to prevent future duplicates.

-- ============================================================================
-- Section 1: Add cadence, due_windows, active_days columns
-- ============================================================================
ALTER TABLE checklist_templates
  ADD COLUMN cadence text NOT NULL DEFAULT 'on_demand'
    CHECK (cadence IN ('once_daily', 'multiple_daily', 'weekly', 'on_demand')),
  ADD COLUMN due_windows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN active_days text NOT NULL DEFAULT 'MTWRFSU'
    CHECK (length(active_days) > 0 AND translate(active_days, 'MTWRFSU', '') = '');

-- ============================================================================
-- Section 2: Backfill cadence from legacy frequency column
-- ============================================================================
UPDATE checklist_templates SET cadence = 'once_daily' WHERE frequency = 'daily';
UPDATE checklist_templates SET cadence = 'weekly'     WHERE frequency = 'weekly';
UPDATE checklist_templates SET cadence = 'on_demand'  WHERE frequency = 'monthly';

-- ============================================================================
-- Section 3: Name-pattern refinement for cadence + due_windows
-- ============================================================================
-- Multi-daily detection (overrides Section 2's once_daily backfill for matching rows)
UPDATE checklist_templates
SET cadence = 'multiple_daily',
    due_windows = '[
      {"start_time": "10:00", "end_time": "12:00", "label": "Pre-Lunch"},
      {"start_time": "13:00", "end_time": "15:00", "label": "Post-Lunch"},
      {"start_time": "16:00", "end_time": "18:00", "label": "Pre-Dinner"},
      {"start_time": "19:00", "end_time": "21:00", "label": "Post-Dinner"}
    ]'::jsonb
WHERE name ILIKE '%temp%'
   OR name ILIKE '%temperature%'
   OR name ILIKE '%hot holding%'
   OR name ILIKE '%cold holding%'
   OR name ILIKE '%cooking temp%'
   OR name ILIKE '%cooling%';

-- Once-daily window: Opening
UPDATE checklist_templates
SET due_windows = '[{"start_time": "05:00", "end_time": "11:00", "label": "Opening"}]'::jsonb
WHERE (name ILIKE '%opening%' OR name ILIKE '%morning%')
  AND cadence = 'once_daily';

-- Once-daily window: Closing
UPDATE checklist_templates
SET due_windows = '[{"start_time": "17:00", "end_time": "23:00", "label": "Closing"}]'::jsonb
WHERE (name ILIKE '%closing%' OR name ILIKE '%evening%' OR name ILIKE '%night%')
  AND cadence = 'once_daily';

-- Once-daily window: Receiving / Delivery
UPDATE checklist_templates
SET due_windows = '[{"start_time": "06:00", "end_time": "11:00", "label": "Delivery"}]'::jsonb
WHERE (name ILIKE '%receiving%' OR name ILIKE '%delivery%')
  AND cadence = 'once_daily';

-- ============================================================================
-- Section 4: Dedupe duplicate Opening Checklist (Test Food org)
-- ============================================================================
DELETE FROM checklist_templates
WHERE id = 'b09923ed-d873-4762-ba75-cf44bde5fc8b'
  AND organization_id = '18309b08-b9a6-4031-9676-fc55504f8b9c'
  AND NOT EXISTS (
    SELECT 1 FROM checklist_template_completions
    WHERE template_id = 'b09923ed-d873-4762-ba75-cf44bde5fc8b'
  );

-- ============================================================================
-- Section 5: Prevent future duplicates within an organization
-- ============================================================================
ALTER TABLE checklist_templates
  ADD CONSTRAINT checklist_templates_org_name_unique
  UNIQUE (organization_id, name);
