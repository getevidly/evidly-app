-- Fix inspection session RLS policies:
-- 1. Reference user_profiles (not profiles which doesn't exist)
-- 2. Match user_profiles.organization_id to sessions.org_id
-- 3. Add UPDATE policy for auto-save

-- ── Self Inspection Sessions ────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own org sessions" ON self_inspection_sessions;
DROP POLICY IF EXISTS "Users can insert own org sessions" ON self_inspection_sessions;

DROP POLICY IF EXISTS "Users can view own org sessions" ON self_inspection_sessions;
CREATE POLICY "Users can view own org sessions"
  ON self_inspection_sessions FOR SELECT
  USING (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own org sessions" ON self_inspection_sessions;
CREATE POLICY "Users can insert own org sessions"
  ON self_inspection_sessions FOR INSERT
  WITH CHECK (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own org sessions" ON self_inspection_sessions;
CREATE POLICY "Users can update own org sessions"
  ON self_inspection_sessions FOR UPDATE
  USING (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ── Mock Inspection Sessions ────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own org mock sessions" ON mock_inspection_sessions;
DROP POLICY IF EXISTS "Users can insert own org mock sessions" ON mock_inspection_sessions;

DROP POLICY IF EXISTS "Users can view own org mock sessions" ON mock_inspection_sessions;
CREATE POLICY "Users can view own org mock sessions"
  ON mock_inspection_sessions FOR SELECT
  USING (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own org mock sessions" ON mock_inspection_sessions;
CREATE POLICY "Users can insert own org mock sessions"
  ON mock_inspection_sessions FOR INSERT
  WITH CHECK (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own org mock sessions" ON mock_inspection_sessions;
CREATE POLICY "Users can update own org mock sessions"
  ON mock_inspection_sessions FOR UPDATE
  USING (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));
