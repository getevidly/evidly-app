-- ═══════════════════════════════════════════════════════════
-- TESTING-DB-FIX-02: Fix Day 4 Schema Gaps
-- Testing DB: uroawofnyjzcqbmgdiqq
-- Date: Apr 11, 2026
-- ═══════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- Fix 1: vendor_service_records — PSE Safeguard Tracking
-- SOURCE: 20260512000000_vendor_service_records.sql
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_service_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  location_id      UUID REFERENCES locations(id) ON DELETE CASCADE,
  safeguard_type   TEXT NOT NULL CHECK (safeguard_type IN (
    'hood_cleaning', 'fire_suppression', 'fire_alarm', 'sprinklers'
  )),
  vendor_name      TEXT,
  cert_number      TEXT,
  service_date     DATE,
  next_due_date    DATE,
  interval_label   TEXT,
  notes            TEXT,
  is_sample        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_service_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendor_service_records' AND policyname='Org members manage service records') THEN
    CREATE POLICY "Org members manage service records"
      ON vendor_service_records FOR ALL
      USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vendor_service_records_org_loc
  ON vendor_service_records (organization_id, location_id, safeguard_type);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_vendor_service_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendor_service_records_updated_at ON vendor_service_records;
CREATE TRIGGER trg_vendor_service_records_updated_at
  BEFORE UPDATE ON vendor_service_records
  FOR EACH ROW EXECUTE FUNCTION update_vendor_service_records_updated_at();

-- ────────────────────────────────────────────────────────────
-- Fix 2: irr_submissions — Operations Check lead persistence
-- SOURCE: 20260527000000_irr_submissions.sql
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS irr_submissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name     TEXT NOT NULL,
  last_name      TEXT,
  email          TEXT NOT NULL,
  phone          TEXT,
  business_name  TEXT,
  street         TEXT,
  city           TEXT,
  state          TEXT DEFAULT 'CA',
  zip            TEXT,
  county         TEXT NOT NULL,
  locations      TEXT,
  op_type        TEXT,
  q1_receiving_temps       SMALLINT CHECK (q1_receiving_temps    IN (1,2,3)),
  q2_cold_hot_holding      SMALLINT CHECK (q2_cold_hot_holding   IN (1,2,3)),
  q3_cooldown_logs         SMALLINT CHECK (q3_cooldown_logs      IN (1,2,3)),
  q4_checklists_haccp      SMALLINT CHECK (q4_checklists_haccp   IN (1,2,3)),
  q5_food_handler_cards    SMALLINT CHECK (q5_food_handler_cards IN (1,2,3)),
  q6_staff_cert_tracking   SMALLINT CHECK (q6_staff_cert_tracking IN (1,2,3)),
  q7_hood_cleaning         SMALLINT CHECK (q7_hood_cleaning      IN (1,2,3)),
  q8_fire_suppression      SMALLINT CHECK (q8_fire_suppression   IN (1,2,3)),
  q9_vendor_performance    SMALLINT CHECK (q9_vendor_performance IN (1,2,3)),
  q10_vendor_records       SMALLINT CHECK (q10_vendor_records    IN (1,2,3)),
  q11_vendor_coi           SMALLINT CHECK (q11_vendor_coi        IN (1,2,3)),
  posture                  TEXT CHECK (posture IN ('critical','high','moderate','strong')),
  food_safety_score        SMALLINT,
  facility_safety_score    SMALLINT,
  source_page              TEXT DEFAULT 'operations-check',
  account_created          BOOLEAN DEFAULT FALSE,
  created_at               TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE irr_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='irr_submissions' AND policyname='Anyone can insert irr_submissions') THEN
    CREATE POLICY "Anyone can insert irr_submissions"
      ON irr_submissions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='irr_submissions' AND policyname='Service role reads irr_submissions') THEN
    CREATE POLICY "Service role reads irr_submissions"
      ON irr_submissions FOR SELECT USING (auth.role() = 'service_role');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_irr_submissions_email   ON irr_submissions (email);
CREATE INDEX IF NOT EXISTS idx_irr_submissions_created ON irr_submissions (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- Fix 3: Add missing columns to vendor_service_records
-- from 20260308000000 and 20260505500002 migrations
-- ────────────────────────────────────────────────────────────
ALTER TABLE vendor_service_records
  ADD COLUMN IF NOT EXISTS service_type_code TEXT,
  ADD COLUMN IF NOT EXISTS price_charged NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS certificate_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_payload JSONB,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS entered_by UUID,
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS document_filename TEXT;

-- ═══════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════
-- SELECT 'vendor_service_records' as tbl, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='vendor_service_records') as ex;
-- SELECT 'irr_submissions' as tbl, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='irr_submissions') as ex;
-- SELECT count(*) as col_count FROM information_schema.columns WHERE table_name='vendor_service_records';
