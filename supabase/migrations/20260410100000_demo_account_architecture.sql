-- ============================================================
-- ADMIN-02: Demo Account Architecture
-- Adds demo lifecycle tracking to organizations + demo_sessions
-- ============================================================

-- ── 1. Add demo columns to organizations ──────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demo_plan TEXT;
  -- demo_plan values: 'founder', 'standard', 'enterprise'

-- Index for finding active/expired demo orgs
CREATE INDEX IF NOT EXISTS idx_organizations_demo
  ON organizations(is_demo, demo_expires_at)
  WHERE is_demo = true;

-- ── 2. Add linking columns to demo_sessions ───────────────
-- demo_sessions already exists (migration 20260409000000)
-- Add columns to link generated demos to real auth accounts
ALTER TABLE demo_sessions
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS demo_credentials JSONB;
  -- demo_credentials: {email, temp_password} — encrypted at rest by Supabase

CREATE INDEX IF NOT EXISTS idx_demo_sessions_org
  ON demo_sessions(organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_demo_sessions_auth_user
  ON demo_sessions(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- ── 3. RLS: Admin full access for demo pipeline management ──
-- Admins already have SELECT via existing policy "Admins see all demos"
-- Add admin DELETE policy for cleanup
DROP POLICY IF EXISTS "Admins can delete demos" ON demo_sessions;
CREATE POLICY "Admins can delete demos" ON demo_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'admin', 'owner_operator', 'platform_admin')
    )
  );

-- ── 4. Auto-expiration SQL function ───────────────────────
-- Can be called via pg_cron or an Edge Function on a schedule
CREATE OR REPLACE FUNCTION expire_demo_accounts()
RETURNS void AS $$
BEGIN
  -- Mark expired demo sessions
  UPDATE demo_sessions
  SET status = 'expired', updated_at = NOW()
  WHERE status IN ('ready', 'active')
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  -- Mark stale scheduled sessions (30+ days old, never generated)
  UPDATE demo_sessions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Conversion helper function ─────────────────────────
CREATE OR REPLACE FUNCTION convert_demo_account(
  p_organization_id UUID,
  p_plan TEXT DEFAULT 'founder'
)
RETURNS void AS $$
BEGIN
  -- Flip the org flag
  UPDATE organizations
  SET is_demo = false,
      converted_at = NOW(),
      demo_plan = p_plan,
      updated_at = NOW()
  WHERE id = p_organization_id
    AND is_demo = true;

  -- Update linked demo session
  UPDATE demo_sessions
  SET status = 'converted',
      converted_at = NOW(),
      assigned_plan = p_plan,
      updated_at = NOW()
  WHERE organization_id = p_organization_id
    AND status IN ('ready', 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
