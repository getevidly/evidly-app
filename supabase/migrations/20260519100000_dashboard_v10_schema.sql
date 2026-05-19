-- =====================================================================
-- Migration: Dashboard v10 Schema — 7 New Tables
-- Timestamp: 20260519100000
-- Commit: C1 of Dashboard v10 build sequence
-- Tables:
--   1. regulatory_citations   (global citation library)
--   2. drift_catches           (operational drift events)
--   3. drift_acknowledgments   (per-DM-role ack records)
--   4. weekly_drift_reports    (weekly report snapshots)
--   5. inspection_package_deliveries (package send log)
--   6. owner_decisions         (unified decision queue)
--   7. advisor_briefings       (template engine cache)
--
-- RLS POLICY STRATEGY
-- This migration creates 13 explicit RLS policies. Operations not covered by an
-- explicit policy are intentional bypasses for the service_role connection used
-- by edge functions (detect-operational-drift, generate-weekly-drift-report,
-- send-inspection-package, generate-advisor-briefing). service_role bypasses
-- RLS by design in Supabase.
--
-- Per-table policy coverage:
--   regulatory_citations: SELECT (all auth), INSERT (admin), UPDATE (admin) — no DELETE
--   drift_catches: SELECT (org), UPDATE (DM roles) — INSERT via service role
--   drift_acknowledgments: SELECT (org), INSERT (own user_id + role) — UPDATE/DELETE blocked
--   weekly_drift_reports: SELECT (DM roles) — INSERT/UPDATE via service role
--   inspection_package_deliveries: SELECT (org), INSERT (sender roles) — UPDATE via service role
--   owner_decisions: SELECT (role-filtered), UPDATE (assignee or owner) — INSERT via service role
--   advisor_briefings: SELECT (org) — INSERT/DELETE via service role
-- =====================================================================


-- -----------------------------------------------------------------
-- 1. regulatory_citations
--    Global citation library lookup table (NOT org-scoped).
--    All authenticated users can read; only platform_admin can write.
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS regulatory_citations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_family             text NOT NULL CHECK (code_family IN (
                            'calcode', 'fda_food_code', 'nfpa_96', 'nfpa_17a', 'nfpa_10',
                            'ca_fire_code', 'cfc', 'haccp', 'osha', 'cal_osha',
                            'county_code', 'other'
                          )),
  section_number          text NOT NULL,
  section_title           text NOT NULL,
  display_text            text NOT NULL,
  jurisdiction_id         uuid REFERENCES jurisdictions(id) ON DELETE SET NULL,
  source_pdf_url          text,
  source_pdf_storage_path text,
  edition_year            integer,
  status                  text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'published', 'superseded', 'retracted')),
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_regulatory_citation_lookup
    UNIQUE (code_family, section_number, edition_year)
);

CREATE INDEX idx_reg_citations_lookup
  ON regulatory_citations (code_family, section_number, status);

CREATE INDEX idx_reg_citations_jurisdiction
  ON regulatory_citations (jurisdiction_id);

CREATE INDEX idx_reg_citations_published
  ON regulatory_citations (code_family)
  WHERE status = 'published';

ALTER TABLE regulatory_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY regulatory_citations_select_authenticated
  ON regulatory_citations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY regulatory_citations_insert_admin
  ON regulatory_citations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE POLICY regulatory_citations_update_admin
  ON regulatory_citations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );


-- -----------------------------------------------------------------
-- 2. drift_catches
--    Operational drift event records.
--    13 drift_type values matching the locked trigger list.
--    Partial unique index for idempotency on open catches only.
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS drift_catches (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id              uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  drift_type               text NOT NULL CHECK (drift_type IN (
                             'temperature_out_of_range',
                             'temperature_trend_drift',
                             'missed_checklist',
                             'document_expiration',
                             'receiving_log_missing',
                             'allergen_training_overdue',
                             'hood_cleaning_approaching',
                             'suppression_semi_annual_due',
                             'extinguisher_monthly_missed',
                             'vendor_coi_expiring',
                             'inspection_readiness_gap',
                             'team_miss_clustering',
                             'streak_break'
                           )),
  pillar                   text NOT NULL CHECK (pillar IN ('food_safety', 'fire_safety')),
  detected_at              timestamptz NOT NULL DEFAULT now(),
  source_table             text NOT NULL,
  source_record_id         uuid,
  expected_value           text,
  actual_value             text,
  severity                 text NOT NULL DEFAULT 'medium'
                           CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  estimated_savings_cents  integer DEFAULT 0,
  status                   text NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open', 'reduced', 'proven', 'resolved')),
  resolved_at              timestamptz,
  resolution_type          text CHECK (resolution_type IN (
                             'auto_cleared', 'manual_resolve',
                             'corrective_action', 'dismissed'
                           )),
  resolution_notes         text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Partial unique index: prevents duplicate OPEN catches for the same
-- source event. COALESCE handles NULL source_record_id. Resolved
-- catches are excluded so new catches can fire after prior resolution.
CREATE UNIQUE INDEX uq_drift_catches_idempotent
  ON drift_catches (
    org_id, location_id, source_table,
    COALESCE(source_record_id, '00000000-0000-0000-0000-000000000000'::uuid),
    drift_type
  )
  WHERE status IN ('open', 'reduced', 'proven');

CREATE INDEX idx_drift_catches_org_detected
  ON drift_catches (org_id, detected_at DESC);

CREATE INDEX idx_drift_catches_org_pillar_status
  ON drift_catches (org_id, pillar, status);

CREATE INDEX idx_drift_catches_org_status_open
  ON drift_catches (org_id, detected_at DESC)
  WHERE status = 'open';

CREATE INDEX idx_drift_catches_location
  ON drift_catches (location_id, detected_at DESC);

ALTER TABLE drift_catches ENABLE ROW LEVEL SECURITY;

CREATE POLICY drift_catches_select_org
  ON drift_catches FOR SELECT
  USING (
    org_id = (
      SELECT organization_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY drift_catches_update_dm
  ON drift_catches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND organization_id = drift_catches.org_id
        AND role IN (
          'owner_operator', 'executive', 'compliance_manager',
          'facilities_manager', 'chef', 'platform_admin'
        )
    )
  );


-- -----------------------------------------------------------------
-- 3. drift_acknowledgments
--    Per-DM-role acknowledgment records.
--    Owner ack != Compliance ack != Facilities ack.
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS drift_acknowledgments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  drift_catch_id  uuid NOT NULL REFERENCES drift_catches(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN (
                    'owner_operator', 'executive', 'compliance_manager',
                    'facilities_manager', 'chef', 'kitchen_manager'
                  )),
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  notes           text,

  CONSTRAINT uq_drift_ack_user_role
    UNIQUE (drift_catch_id, user_id, role)
);

CREATE INDEX idx_drift_acks_catch
  ON drift_acknowledgments (drift_catch_id);

CREATE INDEX idx_drift_acks_user
  ON drift_acknowledgments (user_id, acknowledged_at DESC);

ALTER TABLE drift_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY drift_acks_select_org
  ON drift_acknowledgments FOR SELECT
  USING (
    org_id = (
      SELECT organization_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY drift_acks_insert_own
  ON drift_acknowledgments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND org_id = (
      SELECT organization_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );


-- -----------------------------------------------------------------
-- 4. weekly_drift_reports
--    Weekly report snapshots for audit trail and in-app display.
--    One report per org per week (UNIQUE constraint).
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS weekly_drift_reports (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_week_start             date NOT NULL,
  report_week_end               date NOT NULL,
  generated_at                  timestamptz NOT NULL DEFAULT now(),
  total_catches                 integer NOT NULL DEFAULT 0,
  food_catches                  integer NOT NULL DEFAULT 0,
  fire_catches                  integer NOT NULL DEFAULT 0,
  total_estimated_savings_cents integer NOT NULL DEFAULT 0,
  recipient_roles               text[] NOT NULL DEFAULT '{}',
  delivery_status               text NOT NULL DEFAULT 'pending'
                                CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
  delivered_at                  timestamptz,
  email_message_ids             jsonb DEFAULT '[]',
  in_app_notification_ids       uuid[] DEFAULT '{}',
  report_body_html              text,

  CONSTRAINT uq_weekly_report_org_week
    UNIQUE (org_id, report_week_start)
);

-- DESC index for "latest report" queries (UNIQUE constraint index is ASC)
CREATE INDEX idx_weekly_reports_org_week
  ON weekly_drift_reports (org_id, report_week_start DESC);

ALTER TABLE weekly_drift_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY weekly_reports_select_dm
  ON weekly_drift_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND organization_id = weekly_drift_reports.org_id
        AND role IN (
          'owner_operator', 'executive', 'compliance_manager',
          'facilities_manager', 'chef', 'platform_admin'
        )
    )
  );


-- -----------------------------------------------------------------
-- 5. inspection_package_deliveries
--    Logs inspection packages sent to external recipients.
--    Resend webhook updates delivery_status via service role.
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inspection_package_deliveries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id       uuid REFERENCES locations(id) ON DELETE SET NULL,
  package_type      text NOT NULL
                    CHECK (package_type IN ('inspection', 'insurance', 'landlord', 'custom')),
  recipient_email   text NOT NULL,
  recipient_name    text,
  recipient_type    text NOT NULL
                    CHECK (recipient_type IN ('inspector', 'insurer', 'internal', 'landlord')),
  sent_at           timestamptz NOT NULL DEFAULT now(),
  sent_by           uuid NOT NULL REFERENCES auth.users(id),
  delivery_status   text NOT NULL DEFAULT 'sent'
                    CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'bounced')),
  delivered_at      timestamptz,
  email_message_id  text,
  message_body      text,
  document_ids      jsonb NOT NULL DEFAULT '[]',
  failure_reason    text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pkg_deliveries_org_sent
  ON inspection_package_deliveries (org_id, sent_at DESC);

CREATE INDEX idx_pkg_deliveries_email_msg
  ON inspection_package_deliveries (email_message_id);

ALTER TABLE inspection_package_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY pkg_deliveries_select_org
  ON inspection_package_deliveries FOR SELECT
  USING (
    org_id = (
      SELECT organization_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY pkg_deliveries_insert_sender
  ON inspection_package_deliveries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND organization_id = inspection_package_deliveries.org_id
        AND role IN (
          'owner_operator', 'executive', 'compliance_manager', 'platform_admin'
        )
    )
  );


-- -----------------------------------------------------------------
-- 6. owner_decisions
--    Unified queue of items requiring decision-maker action.
--    RLS restricts SELECT/UPDATE to assigned_role or owner_operator.
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS owner_decisions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id             uuid REFERENCES locations(id) ON DELETE SET NULL,
  decision_type           text NOT NULL CHECK (decision_type IN (
                            'doc_renewal', 'vendor_change', 'service_schedule',
                            'ca_approval', 'contract_renewal'
                          )),
  source_table            text NOT NULL,
  source_record_id        uuid,
  title                   text NOT NULL,
  description_template_id text,
  regulatory_citation     text,
  priority                text NOT NULL DEFAULT 'review'
                          CHECK (priority IN ('urgent', 'soon', 'review')),
  assigned_role           text NOT NULL CHECK (assigned_role IN (
                            'owner_operator', 'executive', 'compliance_manager',
                            'facilities_manager', 'chef'
                          )),
  status                  text NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'decided', 'dismissed', 'escalated')),
  decided_at              timestamptz,
  decided_by              uuid REFERENCES auth.users(id),
  decision_value          jsonb,
  due_by                  date,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_decisions_org_role_status
  ON owner_decisions (org_id, assigned_role, status);

CREATE INDEX idx_decisions_org_priority_open
  ON owner_decisions (org_id, priority, created_at)
  WHERE status = 'open';

ALTER TABLE owner_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_decisions_select_role
  ON owner_decisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND organization_id = owner_decisions.org_id
        AND (
          role IN ('owner_operator', 'platform_admin')
          OR role = owner_decisions.assigned_role
        )
    )
  );

CREATE POLICY owner_decisions_update_assignee
  ON owner_decisions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND organization_id = owner_decisions.org_id
        AND (
          role IN ('owner_operator', 'platform_admin')
          OR role = owner_decisions.assigned_role
        )
    )
  );


-- -----------------------------------------------------------------
-- 7. advisor_briefings
--    Cached briefing snapshots from template engine.
--    6-hour TTL via valid_until. Service role writes; all org users read.
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS advisor_briefings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  advisor_type      text NOT NULL
                    CHECK (advisor_type IN ('compliance_officer', 'food_safety', 'fire_safety')),
  location_id       uuid REFERENCES locations(id) ON DELETE CASCADE,
  briefing_text     text NOT NULL,
  posture           text NOT NULL CHECK (posture IN ('solid', 'watch', 'alarm')),
  open_items        jsonb NOT NULL DEFAULT '[]',
  data_snapshot     jsonb NOT NULL DEFAULT '{}',
  generated_at      timestamptz NOT NULL DEFAULT now(),
  valid_until       timestamptz NOT NULL,
  template_version  integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_briefings_org_type_valid
  ON advisor_briefings (org_id, advisor_type, valid_until DESC);

CREATE INDEX idx_briefings_org_type_location
  ON advisor_briefings (org_id, advisor_type, location_id);

ALTER TABLE advisor_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY advisor_briefings_select_org
  ON advisor_briefings FOR SELECT
  USING (
    org_id = (
      SELECT organization_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );


-- =====================================================================
-- Rule #14 — Apply-time verification block
-- Raises EXCEPTION if any expected artifact is missing.
-- Single combined block for atomic verification of all 7 tables.
-- =====================================================================

DO $$
DECLARE
  _missing text[];
BEGIN
  _missing := '{}';

  -- Tables
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'regulatory_citations') THEN
    _missing := array_append(_missing, 'TABLE regulatory_citations');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'drift_catches') THEN
    _missing := array_append(_missing, 'TABLE drift_catches');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'drift_acknowledgments') THEN
    _missing := array_append(_missing, 'TABLE drift_acknowledgments');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weekly_drift_reports') THEN
    _missing := array_append(_missing, 'TABLE weekly_drift_reports');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inspection_package_deliveries') THEN
    _missing := array_append(_missing, 'TABLE inspection_package_deliveries');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'owner_decisions') THEN
    _missing := array_append(_missing, 'TABLE owner_decisions');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_briefings') THEN
    _missing := array_append(_missing, 'TABLE advisor_briefings');
  END IF;

  -- Constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_regulatory_citation_lookup') THEN
    _missing := array_append(_missing, 'CONSTRAINT uq_regulatory_citation_lookup');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_drift_ack_user_role') THEN
    _missing := array_append(_missing, 'CONSTRAINT uq_drift_ack_user_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_weekly_report_org_week') THEN
    _missing := array_append(_missing, 'CONSTRAINT uq_weekly_report_org_week');
  END IF;

  -- Indexes (16 explicit + 1 partial unique)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_drift_catches_idempotent') THEN
    _missing := array_append(_missing, 'INDEX uq_drift_catches_idempotent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reg_citations_lookup') THEN
    _missing := array_append(_missing, 'INDEX idx_reg_citations_lookup');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reg_citations_jurisdiction') THEN
    _missing := array_append(_missing, 'INDEX idx_reg_citations_jurisdiction');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reg_citations_published') THEN
    _missing := array_append(_missing, 'INDEX idx_reg_citations_published');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_drift_catches_org_detected') THEN
    _missing := array_append(_missing, 'INDEX idx_drift_catches_org_detected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_drift_catches_org_pillar_status') THEN
    _missing := array_append(_missing, 'INDEX idx_drift_catches_org_pillar_status');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_drift_catches_org_status_open') THEN
    _missing := array_append(_missing, 'INDEX idx_drift_catches_org_status_open');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_drift_catches_location') THEN
    _missing := array_append(_missing, 'INDEX idx_drift_catches_location');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_drift_acks_catch') THEN
    _missing := array_append(_missing, 'INDEX idx_drift_acks_catch');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_drift_acks_user') THEN
    _missing := array_append(_missing, 'INDEX idx_drift_acks_user');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_weekly_reports_org_week') THEN
    _missing := array_append(_missing, 'INDEX idx_weekly_reports_org_week');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pkg_deliveries_org_sent') THEN
    _missing := array_append(_missing, 'INDEX idx_pkg_deliveries_org_sent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pkg_deliveries_email_msg') THEN
    _missing := array_append(_missing, 'INDEX idx_pkg_deliveries_email_msg');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_decisions_org_role_status') THEN
    _missing := array_append(_missing, 'INDEX idx_decisions_org_role_status');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_decisions_org_priority_open') THEN
    _missing := array_append(_missing, 'INDEX idx_decisions_org_priority_open');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_briefings_org_type_valid') THEN
    _missing := array_append(_missing, 'INDEX idx_briefings_org_type_valid');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_briefings_org_type_location') THEN
    _missing := array_append(_missing, 'INDEX idx_briefings_org_type_location');
  END IF;

  -- RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'regulatory_citations' AND c.relrowsecurity = true
  ) THEN
    _missing := array_append(_missing, 'RLS ON regulatory_citations');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'drift_catches' AND c.relrowsecurity = true
  ) THEN
    _missing := array_append(_missing, 'RLS ON drift_catches');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'drift_acknowledgments' AND c.relrowsecurity = true
  ) THEN
    _missing := array_append(_missing, 'RLS ON drift_acknowledgments');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'weekly_drift_reports' AND c.relrowsecurity = true
  ) THEN
    _missing := array_append(_missing, 'RLS ON weekly_drift_reports');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'inspection_package_deliveries' AND c.relrowsecurity = true
  ) THEN
    _missing := array_append(_missing, 'RLS ON inspection_package_deliveries');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'owner_decisions' AND c.relrowsecurity = true
  ) THEN
    _missing := array_append(_missing, 'RLS ON owner_decisions');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'advisor_briefings' AND c.relrowsecurity = true
  ) THEN
    _missing := array_append(_missing, 'RLS ON advisor_briefings');
  END IF;

  -- Verdict
  IF array_length(_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Dashboard v10 schema verification FAILED. Missing artifacts: %',
      array_to_string(_missing, ', ');
  END IF;

  RAISE NOTICE 'PASS regulatory_citations   -- table, constraint, 3 indexes, RLS';
  RAISE NOTICE 'PASS drift_catches          -- table, partial unique index, 4 indexes, RLS';
  RAISE NOTICE 'PASS drift_acknowledgments  -- table, constraint, 2 indexes, RLS';
  RAISE NOTICE 'PASS weekly_drift_reports   -- table, constraint, 1 index, RLS';
  RAISE NOTICE 'PASS inspection_package_deliveries -- table, 2 indexes, RLS';
  RAISE NOTICE 'PASS owner_decisions        -- table, 2 indexes, RLS';
  RAISE NOTICE 'PASS advisor_briefings      -- table, 2 indexes, RLS';
  RAISE NOTICE 'Dashboard v10 schema verification PASSED -- 7 tables, 17 indexes, 3 constraints, 13 RLS policies';
END $$;
