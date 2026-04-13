-- LEADERBOARD-BUILD-02: Opt-in columns + leaderboard view
-- Adds opt-in tracking to organizations and creates the community leaderboard view

-- Step 1: Add opt-in columns to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS leaderboard_opted_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS leaderboard_opted_in_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS leaderboard_opted_in_by uuid REFERENCES user_profiles(id);

-- Step 2: Create leaderboard view (only opted-in orgs)
DROP VIEW IF EXISTS v_location_leaderboard;

CREATE VIEW v_location_leaderboard AS
SELECT
  l.id,
  l.name,
  l.city,
  l.state,
  l.organization_id,
  o.name AS organization_name,
  o.industry_type,
  o.leaderboard_opted_in,
  -- Temp log compliance rate (last 30 days)
  COALESCE(
    (SELECT ROUND(100.0 * COUNT(CASE WHEN tl.status = 'compliant' THEN 1 END) / NULLIF(COUNT(*), 0), 1)
     FROM temp_logs tl
     WHERE tl.location_id = l.id
     AND tl.created_at > NOW() - INTERVAL '30 days'),
    NULL
  ) AS temp_compliance_pct,
  -- Checklist completion rate (last 30 days)
  COALESCE(
    (SELECT ROUND(100.0 * COUNT(CASE WHEN cc.status = 'completed' THEN 1 END) / NULLIF(COUNT(*), 0), 1)
     FROM checklist_completions cc
     WHERE cc.location_id = l.id
     AND cc.created_at > NOW() - INTERVAL '30 days'),
    NULL
  ) AS checklist_completion_pct,
  -- Streak: consecutive days with at least one log in last 60 days
  (SELECT COUNT(DISTINCT DATE(created_at))
   FROM temp_logs
   WHERE location_id = l.id
   AND created_at > NOW() - INTERVAL '60 days') AS streak_days,
  l.created_at
FROM locations l
JOIN organizations o ON o.id = l.organization_id
WHERE l.status = 'active'
AND o.leaderboard_opted_in = true;
