-- ============================================================
-- Security columns backfill — completes 20260520000000
-- 8 of 10 user_profiles security columns from the original
-- admin_security_hardening migration were never applied.
-- Tables (user_sessions, user_mfa_config, mfa_policy,
-- session_policy, rate_limit_buckets) + is_suspended +
-- last_login_at already exist. This adds the remaining 8.
-- All additive, all nullable or safe defaults, idempotent.
-- ============================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS suspended_at         timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by         uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS suspend_reason       text,
  ADD COLUMN IF NOT EXISTS failed_login_count   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until         timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_ip        inet,
  ADD COLUMN IF NOT EXISTS password_changed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS must_reset_password  boolean DEFAULT false;

-- Backfill defaults for existing rows
UPDATE public.user_profiles SET failed_login_count = 0   WHERE failed_login_count IS NULL;
UPDATE public.user_profiles SET must_reset_password = false WHERE must_reset_password IS NULL;
