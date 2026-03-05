-- ═══════════════════════════════════════════
-- ADMIN CONSOLE COMPLETE BUILD
-- Staff roles, support tickets, remote connect,
-- entity correlations, intelligence seed data
-- ═══════════════════════════════════════════

-- 1A. EVIDLY STAFF ROLES
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS evidly_staff_role TEXT
  CHECK (evidly_staff_role IN ('super_admin','admin','support','sales'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS perm_billing         BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS perm_security        BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS perm_emulate         BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS perm_configure       BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS perm_support_tickets BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS perm_sales_pipeline  BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS perm_crawl_manage    BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS perm_remote_connect  BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS perm_intelligence    BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS perm_staff_manage    BOOLEAN DEFAULT false;

UPDATE user_profiles
SET
  evidly_staff_role    = 'super_admin',
  perm_billing         = true,
  perm_security        = true,
  perm_emulate         = true,
  perm_configure       = true,
  perm_support_tickets = true,
  perm_sales_pipeline  = true,
  perm_crawl_manage    = true,
  perm_remote_connect  = true,
  perm_intelligence    = true,
  perm_staff_manage    = true
WHERE role = 'platform_admin';

CREATE TABLE IF NOT EXISTS evidly_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name    TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description  TEXT,
  perm_billing         BOOLEAN DEFAULT false,
  perm_security        BOOLEAN DEFAULT false,
  perm_emulate         BOOLEAN DEFAULT true,
  perm_configure       BOOLEAN DEFAULT false,
  perm_support_tickets BOOLEAN DEFAULT true,
  perm_sales_pipeline  BOOLEAN DEFAULT false,
  perm_crawl_manage    BOOLEAN DEFAULT false,
  perm_remote_connect  BOOLEAN DEFAULT false,
  perm_intelligence    BOOLEAN DEFAULT false,
  perm_staff_manage    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO evidly_role_permissions
  (role_name, display_name, description,
   perm_billing, perm_security, perm_emulate, perm_configure,
   perm_support_tickets, perm_sales_pipeline, perm_crawl_manage,
   perm_remote_connect, perm_intelligence, perm_staff_manage)
VALUES
  ('super_admin','Super Admin','Full platform access — billing, security, schema, all operations',
   true,true,true,true,true,true,true,true,true,true),
  ('admin','Admin','Full operations — all except billing config and security settings',
   false,false,true,true,true,true,true,false,true,false),
  ('support','Support','Customer support — view data, respond to tickets, read-only emulation, no billing',
   false,false,true,false,true,false,false,true,false,false),
  ('sales','Sales','Sales & tours — leads, pipeline, campaigns, guided tours only',
   false,false,false,false,false,true,false,false,false,false)
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description;

ALTER TABLE evidly_role_permissions ENABLE ROW LEVEL SECURITY;

-- 1B. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number   TEXT UNIQUE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  submitted_by_user_id UUID,
  submitted_by_email   TEXT,
  submitted_by_name    TEXT,
  subject         TEXT NOT NULL,
  description     TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'technical'
    CHECK (category IN ('billing','technical','account','data','feature_request',
                        'bug','onboarding','inspection_question','other')),
  priority        TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','critical')),
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed','escalated')),
  resolution      TEXT,
  assigned_to     TEXT,
  assigned_at     TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  sla_due_at      TIMESTAMPTZ,
  source          TEXT DEFAULT 'in_app'
    CHECK (source IN ('in_app','email','phone','admin_created')),
  satisfaction_score   INT CHECK (satisfaction_score BETWEEN 1 AND 5),
  satisfaction_comment TEXT,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_email TEXT NOT NULL,
  author_name  TEXT,
  author_type  TEXT NOT NULL CHECK (author_type IN ('customer','staff','system')),
  body         TEXT NOT NULL,
  is_internal  BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_ticket_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  actor_email TEXT,
  action      TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE support_tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_replies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_activity ENABLE ROW LEVEL SECURITY;

-- 1C. REMOTE CONNECT SESSIONS
CREATE TABLE IF NOT EXISTS remote_connect_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token    TEXT UNIQUE NOT NULL DEFAULT substring(gen_random_uuid()::text,1,12),
  organization_id  UUID REFERENCES organizations(id),
  target_user_email TEXT,
  target_org_name  TEXT,
  ticket_id        UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
  initiated_by     TEXT NOT NULL,
  method           TEXT NOT NULL DEFAULT 'screen_share'
    CHECK (method IN ('screen_share','co_browse','diagnostic','guided_walkthrough')),
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','ended','expired','declined')),
  connection_url   TEXT,
  notes            TEXT,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  duration_seconds INT,
  expires_at       TIMESTAMPTZ DEFAULT now() + interval '1 hour',
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE remote_connect_sessions ENABLE ROW LEVEL SECURITY;

-- 1D. ENTITY CORRELATIONS
CREATE TABLE IF NOT EXISTS entity_correlations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type  TEXT NOT NULL CHECK (source_type IN (
    'crawl_result','intelligence_signal','support_ticket',
    'assessment_lead','rfp_listing','inspection_result',
    'corrective_action','admin_event','tour_session','regulatory_update'
  )),
  source_id    TEXT NOT NULL,
  organization_id    UUID REFERENCES organizations(id) ON DELETE CASCADE,
  location_id        UUID REFERENCES locations(id) ON DELETE SET NULL,
  jurisdiction_id    TEXT,
  user_id            UUID,
  correlation_type   TEXT,
  correlation_strength NUMERIC(3,2) DEFAULT 1.0,
  is_primary   BOOLEAN DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ec_org_idx  ON entity_correlations (organization_id);
CREATE INDEX IF NOT EXISTS ec_loc_idx  ON entity_correlations (location_id);
CREATE INDEX IF NOT EXISTS ec_src_idx  ON entity_correlations (source_type, source_id);
CREATE INDEX IF NOT EXISTS ec_jur_idx  ON entity_correlations (jurisdiction_id);

ALTER TABLE entity_correlations ENABLE ROW LEVEL SECURITY;

-- 1E. INTELLIGENCE TABLES (create if missing)
CREATE TABLE IF NOT EXISTS intelligence_sources (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN (
    'food_safety','fire_safety','regulatory','fda_recalls','labor',
    'legislative','environmental','competitive','rfp','weather'
  )),
  url           TEXT,
  county        TEXT,
  jurisdiction_id TEXT,
  status        TEXT NOT NULL DEFAULT 'live'
    CHECK (status IN ('live','degraded','waf_blocked','timeout','pending','disabled','error')),
  crawl_frequency TEXT DEFAULT 'daily',
  last_crawled_at TIMESTAMPTZ,
  last_status_at  TIMESTAMPTZ,
  records_this_month INT DEFAULT 0,
  error_message TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

INSERT INTO intelligence_sources (id, name, category, url, county, status, notes)
SELECT * FROM (VALUES
  ('src-la-eh',   'LA County Environmental Health',      'food_safety',  'https://ehservices.publichealth.lacounty.gov', 'Los Angeles',   'live',        'Largest county. Grade cards + inspection history'),
  ('src-sf-dph',  'SF Dept of Public Health',            'food_safety',  'https://www.sfdph.org',                        'San Francisco', 'live',        NULL),
  ('src-sd-deh',  'San Diego County DEH',                'food_safety',  'https://www.sandiegocounty.gov/deh',           'San Diego',     'live',        NULL),
  ('src-merced',  'Merced County Environmental Health',  'food_safety',  'https://www.co.merced.ca.us/env',              'Merced',        'live',        'Local county — CPP territory'),
  ('src-fresno',  'Fresno County Dept of Public Health', 'food_safety',  'https://www.co.fresno.ca.us/health',           'Fresno',        'live',        NULL),
  ('src-osfm',    'CA Office of State Fire Marshal',     'fire_safety',  'https://osfm.fire.ca.gov',                     NULL,            'waf_blocked', 'WAF blocked — needs Firecrawl Pro ~$25/mo'),
  ('src-calfire', 'CAL FIRE',                            'fire_safety',  'https://www.fire.ca.gov',                      NULL,            'waf_blocked', 'WAF blocked — needs Firecrawl Pro ~$25/mo'),
  ('src-nfpa',    'NFPA 96 Standard Updates',            'fire_safety',  'https://www.nfpa.org',                         NULL,            'live',        'Manual review — annual standard updates'),
  ('src-fda-r',   'FDA Food Recalls',                    'fda_recalls',  'https://www.fda.gov/food/recalls-outbreaks',   NULL,            'live',        'RSS feed — real-time recall alerts'),
  ('src-usda',    'USDA FSIS Recalls',                   'fda_recalls',  'https://www.fsis.usda.gov',                    NULL,            'live',        NULL),
  ('src-cal-leg', 'CA Legislature (Food/Fire Bills)',    'legislative',  'https://leginfo.legislature.ca.gov',           NULL,            'live',        'SB/AB tracking for food safety and fire'),
  ('src-sb1383',  'CalRecycle SB 1383 Enforcement',      'environmental','https://calrecycle.ca.gov/organics',           NULL,            'live',        NULL),
  ('src-cal-osha','Cal/OSHA (Kitchen)',                  'labor',        'https://www.dir.ca.gov/Cal-OSHA',              NULL,            'live',        'Kitchen heat illness + injury'),
  ('src-rds-ca',  'CA SAM.gov RFP Feed',                 'rfp',          'https://sam.gov',                              NULL,            'live',        'Government RFPs — food service/facility'),
  ('src-merced-rfp','Merced County Procurement',         'rfp',          'https://www.co.merced.ca.us/bids',             'Merced',        'live',        NULL)
) AS v(id, name, category, url, county, status, notes)
WHERE NOT EXISTS (SELECT 1 FROM intelligence_sources WHERE id = 'src-la-eh');

CREATE TABLE IF NOT EXISTS intelligence_signals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     TEXT REFERENCES intelligence_sources(id) ON DELETE SET NULL,
  source_name   TEXT,
  category      TEXT NOT NULL,
  signal_type   TEXT NOT NULL CHECK (signal_type IN (
    'recall','regulatory_change','inspection_result','enforcement_action',
    'weather_alert','rfp_detected','legislative_update','competitive_intel',
    'fire_safety_update','outbreak'
  )),
  title         TEXT NOT NULL,
  content_summary TEXT,
  original_url  TEXT,
  counties_affected TEXT[] DEFAULT '{}',
  is_correlated BOOLEAN DEFAULT false,
  orgs_affected INT DEFAULT 0,
  published_at  TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rfp_listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  issuing_agency TEXT NOT NULL,
  county        TEXT,
  state         TEXT DEFAULT 'CA',
  rfp_number    TEXT,
  description   TEXT,
  estimated_value NUMERIC,
  submission_deadline TIMESTAMPTZ,
  status        TEXT DEFAULT 'open'
    CHECK (status IN ('open','closed','awarded','cancelled','under_review')),
  relevance_score NUMERIC(3,2) DEFAULT 0.5,
  matched_modules TEXT[] DEFAULT '{}',
  ai_reasoning  TEXT,
  source_url    TEXT,
  contact_email TEXT,
  contact_name  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

INSERT INTO rfp_listings
  (title, issuing_agency, county, rfp_number, description, estimated_value,
   submission_deadline, status, relevance_score, matched_modules, ai_reasoning)
SELECT * FROM (VALUES
  ('Food Service Compliance Software — Commercial Kitchens',
   'LA County Dept of Public Health', 'Los Angeles', 'LAC-DPH-2026-0041',
   'LA County seeks SaaS platform for commercial kitchen inspection compliance.',
   480000.00, '2026-04-15'::timestamptz, 'open', 0.97,
   ARRAY['core_platform','jie','food_safety'],
   'Direct match. LA County has 14,000+ permitted kitchens.'),
  ('K-12 School Kitchen Compliance Management System',
   'Fresno Unified School District', 'Fresno', 'FUSD-PROC-2026-0012',
   'Fresno USD seeks compliance tracking system for 97 school kitchens.',
   95000.00, '2026-03-28'::timestamptz, 'open', 0.91,
   ARRAY['core_platform','k12_overlay','food_safety'],
   'K-12 school nutrition overlay module match.'),
  ('Healthcare Foodservice Compliance Platform',
   'Kaiser Permanente Northern California', NULL, 'KP-PROC-2026-FSD-7',
   'Kaiser NorCal seeks unified compliance tracking across 22 hospital cafeterias.',
   310000.00, '2026-05-01'::timestamptz, 'open', 0.88,
   ARRAY['core_platform','food_safety','fire_safety'],
   'Enterprise healthcare match. Multi-location complex.'),
  ('Contract Food Services Compliance — National Parks',
   'NPS Concessions Division', NULL, 'NPS-CON-2026-COMPLIANCE',
   'National Park Service seeks compliance software for concession food operations.',
   175000.00, '2026-06-15'::timestamptz, 'open', 0.95,
   ARRAY['core_platform','jie','food_safety','fire_safety'],
   'CRITICAL — Aramark already operates Yosemite.'),
  ('Commercial Kitchen Inspection Reporting System',
   'San Diego County Environmental Health', 'San Diego', 'SDCEH-2026-0089',
   'San Diego County seeks vendor reporting integration for commercial kitchens.',
   210000.00, '2026-04-30'::timestamptz, 'open', 0.82,
   ARRAY['core_platform','jie','food_safety'],
   'Government-side RFP. JIE already has San Diego County configured.'),
  ('Regional Food Safety Management — Hospital System',
   'Dignity Health Central California', 'Fresno', 'DH-CC-2026-FS-002',
   'Dignity Health seeks compliance platform for 6 Central California hospitals.',
   88000.00, '2026-04-20'::timestamptz, 'open', 0.79,
   ARRAY['core_platform','food_safety'],
   'Central Valley healthcare — our territory.')
) AS v(title, issuing_agency, county, rfp_number, description, estimated_value,
       submission_deadline, status, relevance_score, matched_modules, ai_reasoning)
WHERE NOT EXISTS (SELECT 1 FROM rfp_listings LIMIT 1);

CREATE TABLE IF NOT EXISTS regulatory_updates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  source        TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN (
    'food_safety','fire_safety','labor','environmental','building','federal','state','local'
  )),
  impact_level  TEXT NOT NULL DEFAULT 'moderate'
    CHECK (impact_level IN ('critical','high','moderate','low','informational')),
  summary       TEXT NOT NULL,
  effective_date DATE,
  counties_affected TEXT[] DEFAULT '{}',
  action_required TEXT,
  source_url    TEXT,
  is_published  BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

INSERT INTO regulatory_updates
  (title, source, category, impact_level, summary, effective_date, counties_affected, action_required)
SELECT * FROM (VALUES
  ('California Retail Food Code 2024 Amendment — Temperature Logging Frequency',
   'CA Dept of Public Health', 'food_safety', 'high',
   'CDPH amended CalCode Section 113996 to require temperature logs every 2 hours (was 4 hours) for TCS foods in hot hold.',
   '2026-01-01'::date, ARRAY['All California Counties'],
   'Update temperature monitoring schedules.'),
  ('NFPA 96 2024 Edition — Hood Cleaning Frequency Update (Table 12.4)',
   'National Fire Protection Association', 'fire_safety', 'critical',
   'NFPA 96 2024 Table 12.4 updates hood cleaning intervals. High-volume = monthly. Char-broiling/wok = weekly.',
   '2025-07-01'::date, ARRAY['All California Counties'],
   'Review all client hood cleaning schedules against NFPA 96 Table 12.4.'),
  ('SB 1383 Commercial Food Facility Compliance — Enforcement Phase 2',
   'CalRecycle', 'environmental', 'high',
   'CalRecycle SB 1383 Phase 2 enforcement now active. Fines up to $500/day.',
   '2025-10-01'::date, ARRAY['Los Angeles','San Francisco','San Diego','Fresno','Sacramento'],
   'Verify all clients are enrolled in compliant organics program.'),
  ('FDA FSMA — HACCP Documentation Update',
   'FDA Center for Food Safety', 'federal', 'moderate',
   'FDA updated FSMA guidance on HACCP plan documentation. Electronic records now accepted.',
   '2026-02-15'::date, ARRAY['All California Counties'],
   'EvidLY HACCP module will satisfy electronic record requirement.'),
  ('LA County Grade Card Methodology Change — Scoring Rubric Update',
   'LA County Dept of Public Health', 'food_safety', 'high',
   'LA County EH updated violation scoring rubric. Major violations now weight 4 points (was 3).',
   '2026-01-15'::date, ARRAY['Los Angeles'],
   'Update LA County jurisdiction profile with new scoring weights.'),
  ('Cal/OSHA Kitchen Heat Illness Prevention — Updated Standards',
   'Cal/OSHA Standards Board', 'labor', 'moderate',
   'Cal/OSHA updated heat illness prevention standards for indoor kitchen environments exceeding 87F.',
   '2026-03-01'::date, ARRAY['All California Counties'],
   'Add indoor heat illness compliance checklist to facility safety module.')
) AS v(title, source, category, impact_level, summary, effective_date, counties_affected, action_required)
WHERE NOT EXISTS (SELECT 1 FROM regulatory_updates LIMIT 1);

ALTER TABLE intelligence_sources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_signals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfp_listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_updates    ENABLE ROW LEVEL SECURITY;
