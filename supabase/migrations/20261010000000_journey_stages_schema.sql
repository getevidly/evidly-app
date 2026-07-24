-- Migration: journey_stages schema (matches prod as of 2026-07-23)
--
-- Queried prod via `supabase db query --linked` for:
--   pg_indexes, pg_constraint, pg_policies, pg_class (RLS), pg_trigger, pg_proc
--
-- Additive and idempotent only — no drops, no type changes, no constraint changes.
--
-- NOTE: fn_journey_training_immutable() and trg_journey_training_immutable
-- exist in prod but are deliberately NOT managed by this migration.
-- CREATE OR REPLACE FUNCTION is not a safe no-op (always replaces, even
-- when identical) and DROP TRIGGER briefly disables the billing-anchor
-- guard.  These objects were created manually and are left in place.
-- CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS per column.
--
-- Prod schema:
--   PK:          org_id uuid
--   Indexes:     journey_stages_pkey (btree org_id), idx_journey_stages_current_stage (btree current_stage)
--   FKs:         org_id → organizations(id) ON DELETE CASCADE
--                demo_completed_by → auth.users(id)
--                training_completed_by → auth.users(id)
--   Check:       journey_stages_current_stage_check (enum of 10 stages)
--                journey_manual_stages_attributed (manual _at requires _by)
--   Trigger:     trg_journey_training_immutable BEFORE UPDATE → fn_journey_training_immutable()
--                (training_completed_at is append-only; also sets updated_at = now())
--   RLS:         enabled
--   Policies:    SELECT for org members, INSERT + UPDATE for platform_admin

-- ─── Table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journey_stages (
  org_id                  uuid        NOT NULL PRIMARY KEY
                                      REFERENCES organizations(id) ON DELETE CASCADE,
  current_stage           text        NOT NULL DEFAULT 'invited',
  invited_at              timestamptz,
  record_viewed_at        timestamptz,
  demo_scheduled_at       timestamptz,
  demo_completed_at       timestamptz,
  demo_completed_by       uuid        REFERENCES auth.users(id),
  policies_uploaded_at    timestamptz,
  policies_read_at        timestamptz,
  cc_on_file_at           timestamptz,
  loa_signed_at           timestamptz,
  account_configured_at   timestamptz,
  training_completed_at   timestamptz,
  training_completed_by   uuid        REFERENCES auth.users(id),
  access_starts_at        timestamptz,
  first_charge_at         timestamptz,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ─── Additive columns (safe if table already exists with partial schema) ──
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS current_stage           text        NOT NULL DEFAULT 'invited';
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS invited_at              timestamptz;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS record_viewed_at        timestamptz;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS demo_scheduled_at       timestamptz;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS demo_completed_at       timestamptz;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS demo_completed_by       uuid;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS policies_uploaded_at    timestamptz;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS policies_read_at        timestamptz;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS cc_on_file_at           timestamptz;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS loa_signed_at           timestamptz;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS account_configured_at   timestamptz;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS training_completed_at   timestamptz;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS training_completed_by   uuid;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS access_starts_at        timestamptz;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS first_charge_at         timestamptz;
ALTER TABLE journey_stages ADD COLUMN IF NOT EXISTS updated_at              timestamptz NOT NULL DEFAULT now();

-- ─── Constraints (idempotent via DO/EXCEPTION) ───────────────────────

-- CHECK: current_stage must be one of the 10 defined stages
DO $$ BEGIN
  ALTER TABLE journey_stages ADD CONSTRAINT journey_stages_current_stage_check
    CHECK (current_stage IN (
      'invited', 'record_viewed', 'demo_scheduled', 'demo_completed',
      'policies_uploaded', 'policies_read', 'cc_on_file', 'loa_signed',
      'account_configured', 'training_completed'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CHECK: manual stages (demo_completed, training_completed) must have attribution
DO $$ BEGIN
  ALTER TABLE journey_stages ADD CONSTRAINT journey_manual_stages_attributed
    CHECK (
      (demo_completed_at IS NULL OR demo_completed_by IS NOT NULL) AND
      (training_completed_at IS NULL OR training_completed_by IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FK: demo_completed_by → auth.users(id)
DO $$ BEGIN
  ALTER TABLE journey_stages ADD CONSTRAINT journey_stages_demo_completed_by_fkey
    FOREIGN KEY (demo_completed_by) REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FK: training_completed_by → auth.users(id)
DO $$ BEGIN
  ALTER TABLE journey_stages ADD CONSTRAINT journey_stages_training_completed_by_fkey
    FOREIGN KEY (training_completed_by) REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Index ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_journey_stages_current_stage
  ON journey_stages (current_stage);

-- ─── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE journey_stages ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can read their own org's journey row
DO $$ BEGIN
  CREATE POLICY journey_stages_select_org_member ON journey_stages
    FOR SELECT USING (
      org_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- INSERT: platform_admin only
DO $$ BEGIN
  CREATE POLICY journey_stages_insert_platform_admin ON journey_stages
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'platform_admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UPDATE: platform_admin only
DO $$ BEGIN
  CREATE POLICY journey_stages_update_platform_admin ON journey_stages
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'platform_admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'platform_admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
