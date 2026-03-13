-- VIOLATION-OUTREACH-01: Violation-triggered prospect outreach system
-- Crawl public health inspection data → identify prospects → auto-generate outreach

-- ═══════════════════════════════════════════════════════════════════
-- 1. Prospects identified from violation crawls
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS violation_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business info
  business_name text NOT NULL,
  address text,
  city text,
  county text,
  state text DEFAULT 'CA',
  phone text,
  email text,

  -- Violation data
  inspection_date date,
  inspection_source_url text,
  violation_count integer DEFAULT 0,
  critical_violation_count integer DEFAULT 0,
  violation_summary text,
  violation_types text[],
  raw_inspection_data jsonb,

  -- EvidLY relevance scoring
  relevance_score integer CHECK (relevance_score BETWEEN 0 AND 100),
  relevant_offerings text[],

  -- Outreach status
  outreach_status text CHECK (outreach_status IN (
    'new', 'queued', 'letter_sent', 'called', 'emailed',
    'contacted', 'interested', 'converted',
    'not_interested', 'do_not_contact', 'inactive'
  )) DEFAULT 'new',

  -- Tracking
  last_outreach_at timestamptz,
  next_followup_at timestamptz,
  outreach_count integer DEFAULT 0,
  notes text,
  assigned_to text,

  -- Meta
  crawled_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(business_name, address)
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. Outreach touch log — every letter, call, email
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS outreach_touches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES violation_prospects(id) ON DELETE CASCADE,

  touch_type text CHECK (touch_type IN ('letter', 'email', 'call', 'voicemail', 'text', 'in_person')),
  touch_date timestamptz DEFAULT now(),
  outcome text CHECK (outcome IN ('sent', 'delivered', 'opened', 'answered', 'voicemail', 'no_answer', 'bounced', 'replied')),

  subject text,
  body text,
  generated_by text DEFAULT 'ai',

  followup_due_at timestamptz,
  followup_type text CHECK (followup_type IN ('letter', 'email', 'call', 'text', 'in_person')),

  notes text,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. Inspection crawl sources (public health dept databases)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inspection_crawl_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county text NOT NULL,
  source_name text NOT NULL,
  source_url text NOT NULL UNIQUE,
  crawl_type text CHECK (crawl_type IN ('html', 'api', 'pdf', 'rss')),
  is_active boolean DEFAULT true,
  last_crawled_at timestamptz,
  last_error text,
  records_found_last_crawl integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. Seed top 10 CA county inspection sources
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO inspection_crawl_sources (county, source_name, source_url, crawl_type) VALUES
  ('Los Angeles', 'LA County Restaurant Inspection Results', 'https://ehservices.publichealth.lacounty.gov/servlet/guest', 'html'),
  ('San Diego', 'SD County Food Facility Inspections', 'https://www.sandiegocounty.gov/content/sdc/deh/fhd/ffis/intro.html', 'html'),
  ('Fresno', 'Fresno County Food Safety Inspections', 'https://www.co.fresno.ca.us/departments/public-health/environmental-health/food-safety', 'html'),
  ('Stanislaus', 'Stanislaus County Food Inspections', 'https://www.stancounty.com/er/environmental-health.shtm', 'html'),
  ('Merced', 'Merced County Food Inspections', 'https://www.countyofmerced.com/departments/public-health', 'html'),
  ('Sacramento', 'Sacramento County Food Inspections', 'https://www.emd.saccounty.gov/EnvHealth/FoodProtect.html', 'html'),
  ('Alameda', 'Alameda County Food Inspections', 'https://www.acgov.org/aceh/food/', 'html'),
  ('Santa Clara', 'Santa Clara County Food Inspections', 'https://www.sccgov.org/sites/deh/Pages/deh.aspx', 'html'),
  ('Riverside', 'Riverside County Food Inspections', 'https://www.rivcoeh.org/Food-Safety', 'html'),
  ('San Bernardino', 'San Bernardino County Food Inspections', 'https://www.sbcounty.gov/dph/dehs/food-inspections', 'html')
ON CONFLICT (source_url) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 5. Indexes
-- ═══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_vp_status ON violation_prospects(outreach_status);
CREATE INDEX IF NOT EXISTS idx_vp_county ON violation_prospects(county);
CREATE INDEX IF NOT EXISTS idx_vp_relevance ON violation_prospects(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_vp_followup ON violation_prospects(next_followup_at) WHERE next_followup_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ot_prospect ON outreach_touches(prospect_id);
CREATE INDEX IF NOT EXISTS idx_ot_followup ON outreach_touches(followup_due_at) WHERE followup_due_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 6. RLS — platform_admin only
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE violation_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_touches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_crawl_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_prospects" ON violation_prospects FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
CREATE POLICY "admin_only_touches" ON outreach_touches FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
CREATE POLICY "admin_only_crawl_sources" ON inspection_crawl_sources FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
