-- Align trial window to 60 days (was 14).
-- The 15-day setup / 45-day use split is computed at the application layer
-- from trial_start_date. This migration only widens the DB window.

-- ── 1. Replace trigger function: trial_end_date = trial_start_date + 60 days ──

CREATE OR REPLACE FUNCTION set_trial_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_start_date IS NOT NULL THEN
    NEW.trial_end_date := NEW.trial_start_date + INTERVAL '60 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. Update pricing_config singleton: trial_days 30 → 60 ──

UPDATE pricing_config
SET trial_days = 60
WHERE id = 1;

-- ── 3. Recompute trial_end_date for existing trial orgs ──

UPDATE organizations
SET trial_end_date = trial_start_date + INTERVAL '60 days'
WHERE plan_tier = 'trial'
  AND trial_start_date IS NOT NULL;
