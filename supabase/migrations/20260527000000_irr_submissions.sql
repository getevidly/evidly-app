-- IRR-LEAD-MAGNET-01: Operations Check lead persistence
CREATE TABLE IF NOT EXISTS irr_submissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- intake fields
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

  -- assessment answers (1=yes, 2=partial, 3=no)
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

  -- computed
  posture                  TEXT CHECK (posture IN ('critical','high','moderate','strong')),
  food_safety_score        SMALLINT,
  facility_safety_score    SMALLINT,

  -- metadata
  source_page              TEXT DEFAULT 'operations-check',
  account_created          BOOLEAN DEFAULT FALSE,
  created_at               TIMESTAMPTZ DEFAULT now()
);

-- RLS: public insert, service-role read
ALTER TABLE irr_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert irr_submissions"
  ON irr_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role reads irr_submissions"
  ON irr_submissions FOR SELECT USING (auth.role() = 'service_role');

-- Indexes for admin queries
CREATE INDEX idx_irr_submissions_email   ON irr_submissions (email);
CREATE INDEX idx_irr_submissions_created ON irr_submissions (created_at DESC);
