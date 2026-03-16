-- Trial Email System: 14-day drip sequences, vendor partner outreach, vendor notifications
-- Tables: trial_email_log, vendor_partners
-- Columns: organizations.trial_start_date, organizations.trial_end_date, organizations.plan_tier

-- ── 1. Add trial fields to organizations ──────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_start_date timestamptz DEFAULT now();

-- trial_end_date as a generated column (start + 14 days)
-- Note: Supabase/Postgres supports GENERATED ALWAYS AS ... STORED
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_end_date timestamptz
    GENERATED ALWAYS AS (trial_start_date + INTERVAL '14 days') STORED;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'trial'
    CHECK (plan_tier IN ('trial','founder','standard','enterprise'));

-- Backfill trial_start_date for existing orgs from created_at
UPDATE organizations
SET trial_start_date = created_at
WHERE trial_start_date IS NULL;

-- ── 2. Trial email log — prevents duplicate sends ─────────────────

CREATE TABLE IF NOT EXISTS trial_email_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_key       text NOT NULL,
  sent_at         timestamptz DEFAULT now(),
  UNIQUE(user_id, email_key)
);

ALTER TABLE trial_email_log ENABLE ROW LEVEL SECURITY;

-- Service role inserts only (edge functions use service_role key)
-- No user-facing reads needed for this table

CREATE INDEX IF NOT EXISTS idx_trial_email_log_user ON trial_email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_email_log_org ON trial_email_log(organization_id);

-- ── 3. Vendor partners table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_partners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    text NOT NULL,
  contact_name    text,
  contact_email   text NOT NULL,
  vendor_category text,
  status          text DEFAULT 'prospect'
    CHECK (status IN ('prospect','contacted','partner','declined')),
  outreach_step   int DEFAULT 0,
  last_emailed_at timestamptz,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE vendor_partners ENABLE ROW LEVEL SECURITY;

-- Admin-only access via service_role key in edge functions
-- Platform admins can view via RPC if needed

-- ── 4. Indexes for daily cron queries ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_organizations_trial
  ON organizations(trial_start_date, plan_tier);

CREATE INDEX IF NOT EXISTS idx_vendor_partners_status
  ON vendor_partners(status, outreach_step);

-- ── 5. Notification tracking columns for vendor-notification-sender ─

-- COI expiry warning tracking on documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS coi_warning_sent_at timestamptz;

-- Service overdue + cert missing tracking on vendor_service_records
ALTER TABLE vendor_service_records
  ADD COLUMN IF NOT EXISTS overdue_notification_sent_at timestamptz;

ALTER TABLE vendor_service_records
  ADD COLUMN IF NOT EXISTS cert_missing_notification_sent_at timestamptz;
