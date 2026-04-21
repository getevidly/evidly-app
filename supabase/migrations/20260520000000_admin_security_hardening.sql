-- ============================================================================
-- ADMIN-SECURITY-01 — Platform Security Hardening
-- SOX audit readiness: unified audit log, session management, MFA enforcement,
-- user security fields, rate limiting, session policy
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. PLATFORM AUDIT LOG — SOX-grade immutable audit trail
-- ────────────────────────────────────────────────────────────────────────────
-- Complements existing admin_event_log with full SOX compliance fields:
-- actor context, resource tracking, old/new values, IP/user-agent.
-- IMMUTABLE: no UPDATE or DELETE policies. Insert via service role only.

CREATE TABLE IF NOT EXISTS platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  actor_id uuid REFERENCES auth.users(id),
  actor_email text,           -- denormalized for audit trail permanence
  actor_role text,
  actor_ip inet,
  actor_user_agent text,

  -- What
  action text NOT NULL,
  -- Categories:
  --   auth:     login, logout, mfa_enabled, mfa_disabled, password_changed, session_expired
  --   admin:    flag_toggled, user_role_changed, user_suspended, user_deleted
  --   data:     record_created, record_updated, record_deleted, record_exported
  --   security: rls_bypass_attempted, unauthorized_route_access, rate_limit_hit
  --   edge_fn:  function_invoked, function_failed

  resource_type text,         -- 'feature_flag', 'user', 'intelligence_signal', 'document', etc.
  resource_id text,           -- UUID or key of the affected record

  -- Detail
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,             -- IP, headers, additional context

  -- Result
  success boolean DEFAULT true,
  error_message text,

  -- When
  created_at timestamptz DEFAULT now()
);

-- Indexes for SOX audit queries
CREATE INDEX IF NOT EXISTS idx_pal_actor    ON platform_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pal_action   ON platform_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pal_resource ON platform_audit_log(resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pal_created  ON platform_audit_log(created_at DESC);

-- Immutable: no updates or deletes on audit log ever
ALTER TABLE platform_audit_log ENABLE ROW LEVEL SECURITY;

-- Only platform_admin can read. Nobody can update or delete.
DROP POLICY IF EXISTS "admin_read_audit_log" ON platform_audit_log;
CREATE POLICY "admin_read_audit_log" ON platform_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- Service role can insert (edge functions). Revoke insert from authenticated users.
DROP POLICY IF EXISTS "service_role_insert_audit" ON platform_audit_log;
CREATE POLICY "service_role_insert_audit" ON platform_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

REVOKE INSERT ON platform_audit_log FROM authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. USER SESSIONS — Active session tracking for security monitoring
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoke_reason text  -- 'logout', 'admin_forced', 'timeout', 'suspicious_activity'
);

CREATE INDEX IF NOT EXISTS idx_sessions_user  ON user_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_sessions" ON user_sessions;
CREATE POLICY "users_read_own_sessions" ON user_sessions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_sessions" ON user_sessions;
CREATE POLICY "admin_manage_sessions" ON user_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

DROP POLICY IF EXISTS "service_role_manage_sessions" ON user_sessions;
CREATE POLICY "service_role_manage_sessions" ON user_sessions
  FOR ALL USING (auth.role() = 'service_role');


-- ────────────────────────────────────────────────────────────────────────────
-- 3. MFA / 2FA ENFORCEMENT
-- ────────────────────────────────────────────────────────────────────────────
-- Tracks enrollment status alongside Supabase Auth built-in TOTP MFA.
-- mfa_policy defines which roles must have MFA enabled.

CREATE TABLE IF NOT EXISTS user_mfa_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  mfa_enabled boolean DEFAULT false,
  mfa_type text CHECK (mfa_type IN ('totp', 'sms')) DEFAULT 'totp',
  enrolled_at timestamptz,
  last_used_at timestamptz,
  backup_codes_generated boolean DEFAULT false,
  backup_codes_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_mfa_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_mfa" ON user_mfa_config;
CREATE POLICY "users_manage_own_mfa" ON user_mfa_config
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_read_all_mfa" ON user_mfa_config;
CREATE POLICY "admin_read_all_mfa" ON user_mfa_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- MFA enforcement rules: which roles MUST have MFA enabled
CREATE TABLE IF NOT EXISTS mfa_policy (
  role text PRIMARY KEY,
  mfa_required boolean DEFAULT false,
  grace_period_days integer DEFAULT 7,
  enforce_at timestamptz
);

INSERT INTO mfa_policy (role, mfa_required, grace_period_days) VALUES
  ('platform_admin',     true,  0),   -- immediate, no grace period
  ('owner_operator',     false, 30),
  ('executive',          false, 30),
  ('compliance_officer', false, 30),
  ('facilities',         false, 30),
  ('chef',               false, 30),
  ('kitchen_manager',    false, 30),
  ('kitchen_staff',      false, 30)
ON CONFLICT (role) DO NOTHING;

ALTER TABLE mfa_policy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_mfa_policy" ON mfa_policy;
CREATE POLICY "admin_manage_mfa_policy" ON mfa_policy
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

DROP POLICY IF EXISTS "authenticated_read_mfa_policy" ON mfa_policy;
CREATE POLICY "authenticated_read_mfa_policy" ON mfa_policy
  FOR SELECT USING (auth.role() = 'authenticated');


-- ────────────────────────────────────────────────────────────────────────────
-- 4. USER SECURITY FIELDS + SESSION POLICY
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS suspend_reason text,
  ADD COLUMN IF NOT EXISTS failed_login_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_ip inet,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS must_reset_password boolean DEFAULT false;

-- Session timeout config per role
-- Account lockout: 5 failed → 15 min, 10 → 1 hour, 20 → admin review
CREATE TABLE IF NOT EXISTS session_policy (
  role text PRIMARY KEY,
  idle_timeout_minutes integer DEFAULT 60,
  absolute_timeout_hours integer DEFAULT 24,
  admin_timeout_minutes integer DEFAULT 30
);

INSERT INTO session_policy (role, idle_timeout_minutes, absolute_timeout_hours, admin_timeout_minutes) VALUES
  ('platform_admin',     15,  8,  15),
  ('owner_operator',     60,  24, 30),
  ('executive',          60,  24, 30),
  ('compliance_officer', 60,  24, 30),
  ('facilities',         120, 48, 60),
  ('chef',               120, 48, 60),
  ('kitchen_manager',    120, 48, 60),
  ('kitchen_staff',      240, 72, 60)
ON CONFLICT (role) DO NOTHING;

ALTER TABLE session_policy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_session_policy" ON session_policy;
CREATE POLICY "admin_manage_session_policy" ON session_policy
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

DROP POLICY IF EXISTS "authenticated_read_session_policy" ON session_policy;
CREATE POLICY "authenticated_read_session_policy" ON session_policy
  FOR SELECT USING (auth.role() = 'authenticated');


-- ────────────────────────────────────────────────────────────────────────────
-- 5. RATE LIMITING
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key text PRIMARY KEY,         -- e.g. 'irr:192.168.1.1' or 'ai_suggest:user-uuid'
  count integer DEFAULT 0,
  window_start timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_expires ON rate_limit_buckets(expires_at);

ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Only service role manages rate limits (edge functions)
DROP POLICY IF EXISTS "service_role_manage_rate_limits" ON rate_limit_buckets;
CREATE POLICY "service_role_manage_rate_limits" ON rate_limit_buckets
  FOR ALL USING (auth.role() = 'service_role');


-- ────────────────────────────────────────────────────────────────────────────
-- SUMMARY OF TABLES CREATED / MODIFIED
-- ────────────────────────────────────────────────────────────────────────────
-- NEW: platform_audit_log  — SOX-grade immutable audit trail
-- NEW: user_sessions       — Active session tracking
-- NEW: user_mfa_config     — Per-user MFA enrollment status
-- NEW: mfa_policy          — Role-based MFA enforcement rules (8 roles seeded)
-- NEW: session_policy      — Role-based session timeout config (8 roles seeded)
-- NEW: rate_limit_buckets  — Edge function rate limiting
-- MOD: user_profiles       — +10 security columns (is_suspended, failed_login_count, etc.)
