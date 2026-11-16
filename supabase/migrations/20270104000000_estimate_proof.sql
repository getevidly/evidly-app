-- ══════════════════════════════════════════════════════════════
-- Estimate Proof via EvidLY, Part 1 (EvidLY side).
-- Approved mock: Arthur, November 16, 2026.
--
-- A HoodOps company's certifications and insurance, kept in EvidLY and
-- shown to a client through one link per estimate:
--   /proof/<token>            certifications (always)
--   /proof/<token>/insurance  insurance, unlocked when HoodOps reports the
--                             estimate Approved; the client says what
--                             insurance it requires there.
--
-- The company is its records set: partner_applications.id, tied to its
-- HoodOps tenant by partner_applications.hoodops_tenant_id (20261231000000).
-- Every table below carries company_id and cascades from that row, so a
-- company is walled off by key and deleting the records set removes
-- everything. Company-level only: no organization, location or kitchen data.
--
-- No anon or authenticated access to any table here. Every read and write
-- goes through the service role in edge functions that resolve the company
-- from a verified HoodOps signature or a link token first.
--
-- The coverage and endorsement lists are settings (proof_requirement_options):
-- platform defaults have company_id NULL; a company row with the same kind and
-- code overrides the default for that company. The defaults inserted below are
-- configuration, not records.
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Company settings ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.company_proof_settings (
  company_id     uuid PRIMARY KEY
                 REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  broker_email   text,
  reminder_days  integer[] NOT NULL DEFAULT '{60,30}',
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_proof_settings_reminder_days_check
    CHECK (reminder_days <@ ARRAY[1,2,3,5,7,10,14,15,21,30,45,60,75,90,120,180])
);

-- ── 2. Certifications ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.company_certifications (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL
                       REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  name                 text NOT NULL CHECK (char_length(btrim(name)) > 0),
  cert_number          text,
  holder               text,
  expiration_date      date,
  file_path            text,
  file_type            text,
  sort_order           integer NOT NULL DEFAULT 0,
  -- Smallest reminder day already sent for the current expiration_date.
  -- Cleared whenever the expiration date changes.
  reminder_stage_sent  integer,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  archived_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_company_certifications_company
  ON public.company_certifications (company_id) WHERE archived_at IS NULL;

-- ── 3. Insurance policies ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.company_insurance_policies (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  uuid NOT NULL
                              REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  coverage_code               text NOT NULL,
  carrier                     text,
  policy_number               text,
  per_occurrence_limit        numeric(14,2),
  aggregate_limit             numeric(14,2),
  limits_text                 text,
  endorsements                text[] NOT NULL DEFAULT '{}',
  notice_of_cancellation_days integer,
  expiration_date             date,
  file_path                   text,
  file_type                   text,
  sort_order                  integer NOT NULL DEFAULT 0,
  reminder_stage_sent         integer,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  archived_at                 timestamptz
);

CREATE INDEX IF NOT EXISTS idx_company_insurance_policies_company
  ON public.company_insurance_policies (company_id) WHERE archived_at IS NULL;

-- ── 4. Coverage and endorsement lists (settings) ─────────────

CREATE TABLE IF NOT EXISTS public.proof_requirement_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('coverage', 'endorsement')),
  code        text NOT NULL CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  label       text NOT NULL,
  -- Which amounts the client fills in for this line:
  -- per_occurrence, aggregate, minimum, name, days, text.
  fields      text[] NOT NULL DEFAULT '{}'
              CHECK (fields <@ ARRAY['per_occurrence','aggregate','minimum','name','days','text']),
  sort_order  integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS proof_requirement_options_uidx
  ON public.proof_requirement_options (company_id, kind, code) NULLS NOT DISTINCT;

INSERT INTO public.proof_requirement_options (company_id, kind, code, label, fields, sort_order)
VALUES
  (NULL, 'coverage',    'general_liability',        'General Liability',            '{per_occurrence,aggregate}', 10),
  (NULL, 'coverage',    'workers_compensation',     'Workers'' Compensation',       '{}',                         20),
  (NULL, 'coverage',    'commercial_auto',          'Commercial Auto',              '{minimum}',                  30),
  (NULL, 'coverage',    'umbrella_excess',          'Umbrella or Excess',           '{minimum}',                  40),
  (NULL, 'endorsement', 'additional_insured',       'Additional Insured',           '{name}',                     10),
  (NULL, 'endorsement', 'waiver_of_subrogation',    'Waiver of Subrogation',        '{}',                         20),
  (NULL, 'endorsement', 'primary_non_contributory', 'Primary and Non-Contributory', '{}',                         30),
  (NULL, 'endorsement', 'notice_of_cancellation',   'Notice of Cancellation',       '{days}',                     40),
  (NULL, 'endorsement', 'other',                    'Other',                        '{text}',                     50)
ON CONFLICT (company_id, kind, code) DO NOTHING;

-- ── 5. One proof link per estimate ───────────────────────────

CREATE TABLE IF NOT EXISTS public.estimate_proof_links (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL
                 REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  token          text NOT NULL UNIQUE CHECK (char_length(token) >= 43),
  estimate_ref   text NOT NULL CHECK (char_length(btrim(estimate_ref)) > 0),
  location_name  text NOT NULL CHECK (char_length(btrim(location_name)) > 0),
  location_ref   text,
  client_name    text,
  client_email   text,
  approved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS estimate_proof_links_live_uidx
  ON public.estimate_proof_links (company_id, estimate_ref)
  WHERE revoked_at IS NULL;

-- ── 6. Every view, logged for the company ────────────────────

CREATE TABLE IF NOT EXISTS public.estimate_proof_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id     uuid NOT NULL REFERENCES public.estimate_proof_links(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  page        text NOT NULL CHECK (page IN (
                'certifications', 'insurance', 'certification_file',
                'policy_file', 'updated_certificate_file')),
  item_id     uuid,
  ip          text,
  user_agent  text,
  viewed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_proof_views_company
  ON public.estimate_proof_views (company_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimate_proof_views_link
  ON public.estimate_proof_views (link_id, viewed_at DESC);

-- ── 7. What the client requires ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.insurance_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL
                       REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  link_id              uuid NOT NULL
                       REFERENCES public.estimate_proof_links(id) ON DELETE CASCADE,
  -- 'requirements': Send Requirements. 'current_enough': Our Current
  -- Certificates Are Enough (recorded, closed, nothing for the company to do).
  kind                 text NOT NULL CHECK (kind IN ('requirements', 'current_enough')),
  status               text NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open', 'answered', 'closed')),
  holder_name          text,
  holder_address       text,
  who_is_asking        text CHECK (who_is_asking IN (
                         'our_company', 'landlord_or_property_manager', 'franchisor', 'other')),
  who_is_asking_other  text,
  coverages            jsonb NOT NULL DEFAULT '[]'::jsonb,
  endorsements         jsonb NOT NULL DEFAULT '[]'::jsonb,
  upload_path          text,
  upload_type          text,
  submitted_at         timestamptz NOT NULL DEFAULT now(),
  broker_emailed_at    timestamptz,
  answered_at          timestamptz,
  answer_file_path     text,
  answer_file_type     text,
  client_notified_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_insurance_requests_company_status
  ON public.insurance_requests (company_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_insurance_requests_link
  ON public.insurance_requests (link_id);

-- ── 8. The company's own way in (no password) ────────────────
-- A short-lived token link to the company's Estimate Proof area in EvidLY,
-- minted for HoodOps through the API or emailed to the address on the
-- records set.

CREATE TABLE IF NOT EXISTS public.company_area_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL
              REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE CHECK (char_length(token) >= 43),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz
);

-- ── 9. Walls: service role only ──────────────────────────────

ALTER TABLE public.company_proof_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_certifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_insurance_policies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_requirement_options   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_proof_links        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_proof_views        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_area_links          ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.company_proof_settings      FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.company_certifications      FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.company_insurance_policies  FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.proof_requirement_options   FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.estimate_proof_links        FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.estimate_proof_views        FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.insurance_requests          FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.company_area_links          FROM anon, authenticated, PUBLIC;

-- ── 10. Private bucket ───────────────────────────────────────
-- Paths: {company_id}/certifications/{id}-{stamp}.{ext}
--        {company_id}/policies/{id}-{stamp}.{ext}
--        {company_id}/requests/{request_id}/requirements.{ext}
--        {company_id}/requests/{request_id}/updated-certificate-{stamp}.{ext}
-- No storage.objects policies: signed URLs are issued server-side only.

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-proof', 'company-proof', false)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ── 11. Daily expiry reminders (60 and 30 days, a setting) ───
-- 11:30 UTC, after partner-expiry-scan (11:00). Same registration shape.
DO $BODY$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'proof-expiry-reminders') THEN
    PERFORM cron.unschedule('proof-expiry-reminders');
  END IF;
  PERFORM cron.schedule(
    'proof-expiry-reminders',
    '30 11 * * *',
    $job$
    SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/proof-expiry-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := '{}'::jsonb
    );
    $job$
  );
END
$BODY$;
