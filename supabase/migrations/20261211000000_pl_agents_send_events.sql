-- ============================================================
-- POLICY LENS — agents + send tracking
--
-- 1. pl_agents      — the insurance professionals we send through,
--                     each with a referral code used to credit reads.
-- 2. pl_send_events — the send/engagement trail for an agent and,
--                     once a read starts, the intake it produced.
--
-- ref_code is generated app-side (uppercase surname + hyphen + 3
-- random alphanumerics, e.g. REYES-K4P). Deliberately NO database
-- default: the surname half cannot be derived in SQL.
--
-- DOWN NOTE (revert)
--   `git revert <commit>` removes this file from the repo but does
--   NOT drop the objects. To undo in the database, run:
--
--     DROP INDEX IF EXISTS public.idx_pl_send_events_intake;
--     DROP INDEX IF EXISTS public.idx_pl_send_events_agent_created;
--     DROP TABLE IF EXISTS public.pl_send_events;
--     DROP TABLE IF EXISTS public.pl_agents;
--
--   pl_send_events must go first — it references pl_agents(id).
--   Then repair the ledger:
--     supabase migration repair --status reverted 20261211000000
--
--   This migration creates NO functions, so there is nothing to
--   drop or REVOKE EXECUTE on beyond the table grants below.
-- ============================================================


-- ── 1. pl_agents ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pl_agents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  agency      text,
  license     text,
  email       text        NOT NULL,
  phone       text,
  ref_code    text        NOT NULL UNIQUE,
  created_by  uuid,
  created_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE public.pl_agents IS
  'Insurance professionals in the Policy Lens send flow. One row per agent.';
COMMENT ON COLUMN public.pl_agents.ref_code IS
  'Uppercase surname + hyphen + 3 random alphanumerics (e.g. REYES-K4P). Generated app-side — deliberately no database default.';


-- ── 2. pl_send_events ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pl_send_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid        REFERENCES public.pl_agents(id),
  intake_id       uuid,
  kind            text        NOT NULL
                  CHECK (kind IN (
                    'invite_sent',
                    'invite_opened',
                    'invite_clicked',
                    'client_requested',
                    'client_sent',
                    'client_opened',
                    'client_clicked',
                    'read_started',
                    'report_delivered',
                    'purged'
                  )),
  recipient_name  text,
  recipient_email text,
  sent_by         uuid,
  meta            jsonb       DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE public.pl_send_events IS
  'Send and engagement trail for Policy Lens invites. intake_id is NULL until a read actually starts.';

CREATE INDEX IF NOT EXISTS idx_pl_send_events_agent_created
  ON public.pl_send_events (agent_id, created_at);

CREATE INDEX IF NOT EXISTS idx_pl_send_events_intake
  ON public.pl_send_events (intake_id);


-- ── 3. RLS ──────────────────────────────────────────────────
-- Standard for new tables in this repo: RLS on, an explicit
-- service_role policy for the edge functions, and staff access via
-- the current_evidly_staff_role() SECURITY DEFINER helper
-- (migration 20261205000000). Nothing else reaches these tables.

ALTER TABLE public.pl_agents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pl_send_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pl_agents' AND policyname = 'pl_agents_service'
  ) THEN
    CREATE POLICY pl_agents_service ON public.pl_agents
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pl_agents' AND policyname = 'pl_agents_staff_rw'
  ) THEN
    CREATE POLICY pl_agents_staff_rw ON public.pl_agents
      FOR ALL USING  (public.current_evidly_staff_role() IN ('super_admin', 'sales'))
      WITH CHECK (public.current_evidly_staff_role() IN ('super_admin', 'sales'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pl_send_events' AND policyname = 'pl_send_events_service'
  ) THEN
    CREATE POLICY pl_send_events_service ON public.pl_send_events
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pl_send_events' AND policyname = 'pl_send_events_staff_rw'
  ) THEN
    CREATE POLICY pl_send_events_staff_rw ON public.pl_send_events
      FOR ALL USING  (public.current_evidly_staff_role() IN ('super_admin', 'sales'))
      WITH CHECK (public.current_evidly_staff_role() IN ('super_admin', 'sales'));
  END IF;
END $$;


-- ── 4. Grants ───────────────────────────────────────────────
-- anon gets nothing at all. authenticated is revoked first, then given
-- back only the four DML privileges the staff policy needs to be
-- evaluable — RLS then restricts every row to super_admin / sales.
--
-- The REVOKE is load-bearing: Supabase's default privileges hand
-- authenticated ALL on new public tables, and TRUNCATE is NOT subject
-- to RLS — without this, any logged-in user could empty either table.

REVOKE ALL ON public.pl_agents      FROM anon;
REVOKE ALL ON public.pl_send_events FROM anon;

REVOKE ALL ON public.pl_agents      FROM authenticated;
REVOKE ALL ON public.pl_send_events FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pl_agents      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pl_send_events TO authenticated;
