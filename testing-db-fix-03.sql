-- ═══════════════════════════════════════════════════════════
-- TESTING-DB-FIX-03: Fix Day 5 Schema Gaps
-- Testing DB: uroawofnyjzcqbmgdiqq
-- Date: Apr 11, 2026
-- ═════════════════════════════════════════════════════════���═

-- ────────────────────────────────────────────────────────────
-- Fix 1: notifications table (user-facing, realtime)
-- SOURCE: 20260310000000_notifications_table.sql
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  action_url      TEXT,
  priority        TEXT NOT NULL DEFAULT 'medium',
  severity        TEXT,
  read_at         TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  snoozed_until   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users see own org notifications') THEN
    CREATE POLICY "Users see own org notifications"
      ON notifications FOR SELECT
      USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users can mark own notifications read') THEN
    CREATE POLICY "Users can mark own notifications read"
      ON notifications FOR UPDATE
      USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      ))
      WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Service role insert notifications') THEN
    CREATE POLICY "Service role insert notifications"
      ON notifications FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_org_unread
  ON notifications(organization_id, created_at DESC)
  WHERE read_at IS NULL;

-- ────────────────────────────────────────────────────────────
-- Fix 2: readiness_snapshots table (SP3 Compliance Trajectory)
-- SOURCE: 20260625000000_readiness_snapshots.sql
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS readiness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  food_safety_score NUMERIC(5,2),
  facility_safety_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  open_violations INT DEFAULT 0,
  pending_corrective_actions INT DEFAULT 0,
  overdue_temp_checks INT DEFAULT 0,
  expired_documents INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, location_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_org_date
  ON readiness_snapshots(org_id, snapshot_date DESC);

ALTER TABLE readiness_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='readiness_snapshots' AND policyname='Users can view own org snapshots') THEN
    CREATE POLICY "Users can view own org snapshots"
      ON readiness_snapshots FOR SELECT
      USING (org_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='readiness_snapshots' AND policyname='Service role full access on readiness_snapshots') THEN
    CREATE POLICY "Service role full access on readiness_snapshots"
      ON readiness_snapshots FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- Fix 3: referrals + compliance_badges + network_scores + vendor_ripples
-- SOURCE: 20260228000000_referral_system_tables.sql
-- NOTE: k2c_donations already exists
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  referrer_user_id uuid REFERENCES auth.users(id),
  referral_code text UNIQUE NOT NULL,
  referred_email text,
  referred_org_id uuid REFERENCES organizations(id),
  mechanic text NOT NULL CHECK (mechanic IN ('champion_badge', 'network_leaderboard', 'inspection_hero', 'k2c_amplifier', 'vendor_ripple')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'clicked', 'signed_up', 'converted', 'expired')),
  reward_type text CHECK (reward_type IN ('month_free', 'feature_unlock', 'k2c_donation', 'badge_upgrade', 'vendor_credit')),
  reward_amount numeric(10,2),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  converted_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '90 days')
);

CREATE TABLE IF NOT EXISTS compliance_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid,
  badge_type text NOT NULL CHECK (badge_type IN ('compliance_champion', 'perfect_streak', 'zero_incidents', 'rapid_response', 'vendor_excellence')),
  badge_level text NOT NULL DEFAULT 'bronze' CHECK (badge_level IN ('bronze', 'silver', 'gold', 'platinum')),
  earned_at timestamptz DEFAULT now(),
  score_at_earning integer,
  shareable_url text,
  referral_code text REFERENCES referrals(referral_code),
  share_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  conversion_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS network_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  compliance_score integer NOT NULL DEFAULT 0,
  referral_points integer NOT NULL DEFAULT 0,
  badges_earned integer NOT NULL DEFAULT 0,
  k2c_donations numeric(10,2) DEFAULT 0,
  network_rank integer,
  total_referrals integer DEFAULT 0,
  successful_referrals integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendor_ripples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_org_id uuid REFERENCES organizations(id),
  vendor_id uuid,
  vendor_name text NOT NULL,
  referred_org_id uuid REFERENCES organizations(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'onboarded')),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_org ON referrals(organization_id);
CREATE INDEX IF NOT EXISTS idx_badges_org ON compliance_badges(organization_id);
CREATE INDEX IF NOT EXISTS idx_network_scores_rank ON network_scores(network_rank);

-- RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_ripples ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referrals' AND policyname='Users can view own org referrals') THEN
    CREATE POLICY "Users can view own org referrals" ON referrals
      FOR SELECT USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referrals' AND policyname='Users can insert own org referrals') THEN
    CREATE POLICY "Users can insert own org referrals" ON referrals
      FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='compliance_badges' AND policyname='Users can view own org badges') THEN
    CREATE POLICY "Users can view own org badges" ON compliance_badges
      FOR SELECT USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='network_scores' AND policyname='Anyone can view network scores') THEN
    CREATE POLICY "Anyone can view network scores" ON network_scores
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendor_ripples' AND policyname='Users can view own org vendor ripples') THEN
    CREATE POLICY "Users can view own org vendor ripples" ON vendor_ripples
      FOR SELECT USING (source_org_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- Fix 4: sb1383_compliance table
-- SOURCE: 20260505300000_sb1383_compliance_table.sql
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sb1383_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  reporting_period text NOT NULL,
  edible_food_recovery_lbs numeric DEFAULT 0,
  organic_waste_diverted_lbs numeric DEFAULT 0,
  food_recovery_partner text,
  food_recovery_partner_contact text,
  food_recovery_agreement_on_file boolean DEFAULT false,
  hauler_name text,
  hauler_service_frequency text,
  hauler_provides_organics boolean DEFAULT false,
  weight_tickets_on_file boolean DEFAULT false,
  generator_tier integer,
  recovery_plan_on_file boolean DEFAULT false,
  last_inspection_date date,
  inspection_notes text,
  notes text,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE sb1383_compliance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sb1383_compliance' AND policyname='org_access_sb1383') THEN
    CREATE POLICY "org_access_sb1383" ON sb1383_compliance
      FOR ALL USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      ));
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- Fix 5: leaderboard columns on organizations
-- SOURCE: 20260505100000_leaderboard_optin_and_view.sql
-- ─────────────────────────────────────────────────���──────────

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS leaderboard_opted_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS leaderboard_opted_in_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS leaderboard_opted_in_by uuid;

-- ═══════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════
-- SELECT 'notifications' as tbl, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='notifications') as ex;
-- SELECT 'readiness_snapshots' as tbl, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='readiness_snapshots') as ex;
-- SELECT 'referrals' as tbl, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='referrals') as ex;
-- SELECT 'sb1383_compliance' as tbl, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='sb1383_compliance') as ex;
