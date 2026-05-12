-- Phase 2 pre-requisite: organizations.metadata JSONB
-- Used for: feature flag (new_onboarding_enabled), responsibilities lock state
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
