-- ============================================================
-- API KEYS + INTEGRATIONS HUB — Schema & Seed
-- ============================================================

-- ── 1. api_keys ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label         text NOT NULL,
  key_type      text NOT NULL DEFAULT 'live' CHECK (key_type IN ('live','test','insurance')),
  key_hash      text NOT NULL,                     -- SHA-256 hash, never the raw key
  key_preview   text NOT NULL,                     -- e.g. "evd_live_****7a3f"
  permissions   jsonb NOT NULL DEFAULT '{}',       -- { "facilities": true, "risk_profile": true, ... }
  facility_scope text NOT NULL DEFAULT 'all',      -- 'all' or JSON array of facility IDs
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  last_used_at  timestamptz,
  request_count bigint NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  revoked_at    timestamptz,
  revoked_by    uuid REFERENCES auth.users(id)
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_keys_admin_all" ON public.api_keys;
CREATE POLICY "api_keys_admin_all" ON public.api_keys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('platform_admin','owner_operator','executive')
        AND user_profiles.organization_id = api_keys.org_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON public.api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);

-- ── 2. api_request_log ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_request_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id    uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint      text NOT NULL,
  method        text NOT NULL DEFAULT 'GET',
  response_code smallint NOT NULL,
  ip_address    inet,
  user_agent    text,
  requested_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_request_log' AND column_name = 'api_key_id') THEN
    DROP POLICY IF EXISTS "api_request_log_admin_read" ON public.api_request_log;
    CREATE POLICY "api_request_log_admin_read" ON public.api_request_log
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.api_keys ak
          JOIN public.user_profiles up ON up.organization_id = ak.org_id
          WHERE ak.id = api_request_log.api_key_id
            AND up.id = auth.uid()
            AND up.role IN ('platform_admin','owner_operator','executive')
        )
      );
    CREATE INDEX IF NOT EXISTS idx_api_request_log_key ON public.api_request_log(api_key_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_request_log' AND column_name = 'requested_at') THEN
    CREATE INDEX IF NOT EXISTS idx_api_request_log_ts ON public.api_request_log(requested_at DESC);
  END IF;
END $$;

-- ── 3. integrations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  description   text NOT NULL,
  category      text NOT NULL,
  logo_url      text,
  status        text NOT NULL DEFAULT 'available' CHECK (status IN ('available','beta','coming_soon','connected')),
  is_featured   boolean NOT NULL DEFAULT false,
  website_url   text,
  docs_url      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Everyone can read integrations (it's a catalog)
DO $$ BEGIN
  DROP POLICY IF EXISTS "integrations_public_read" ON public.integrations;
  CREATE POLICY "integrations_public_read" ON public.integrations FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only platform_admin can manage
DO $$ BEGIN
  DROP POLICY IF EXISTS "integrations_admin_write" ON public.integrations;
  CREATE POLICY "integrations_admin_write" ON public.integrations
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'platform_admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integrations' AND column_name = 'category') THEN
    CREATE INDEX IF NOT EXISTS idx_integrations_category ON public.integrations(category);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integrations' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_integrations_status ON public.integrations(status);
  END IF;
END $$;

-- ── 4. integration_connections ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id  uuid NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','error','disconnected')),
  config          jsonb NOT NULL DEFAULT '{}',
  connected_by    uuid REFERENCES auth.users(id),
  connected_at    timestamptz NOT NULL DEFAULT now(),
  last_sync_at    timestamptz,
  UNIQUE(org_id, integration_id)
);

ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integration_connections_org_access" ON public.integration_connections;
CREATE POLICY "integration_connections_org_access" ON public.integration_connections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.organization_id = integration_connections.org_id
        AND user_profiles.role IN ('platform_admin','owner_operator','executive')
    )
  );

CREATE INDEX IF NOT EXISTS idx_integration_connections_org ON public.integration_connections(org_id);

-- ── 5. Seed 25 integrations (only if category column exists) ──
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integrations' AND column_name = 'category') THEN

INSERT INTO public.integrations (name, slug, description, category, status, is_featured) VALUES
  -- POS Systems
  ('Toast POS',           'toast-pos',          'Real-time sales data, menu sync, and location management from Toast.',                       'pos',              'available',    true),
  ('Square for Restaurants','square-pos',        'Square POS integration for transaction data and menu management.',                           'pos',              'available',    true),
  ('Clover',              'clover-pos',          'Clover POS data sync for sales, inventory, and employee management.',                       'pos',              'available',    false),
  ('Aloha (NCR)',         'aloha-ncr',           'NCR Aloha integration for enterprise restaurant POS data.',                                  'pos',              'coming_soon',  false),
  -- Accounting
  ('QuickBooks Online',   'quickbooks',          'Sync financial data, invoices, and expense tracking with QuickBooks.',                      'accounting',       'available',    true),
  ('Xero',                'xero',                'Accounting integration for invoices, bills, and financial reporting.',                      'accounting',       'available',    false),
  ('FreshBooks',          'freshbooks',          'Time tracking, invoicing, and expense management integration.',                             'accounting',       'coming_soon',  false),
  -- HR & Payroll
  ('Gusto',               'gusto',               'Employee onboarding, payroll, and benefits data sync.',                                    'hr_payroll',       'available',    false),
  ('ADP Workforce Now',   'adp',                 'Enterprise HR, payroll, and time & attendance integration.',                               'hr_payroll',       'coming_soon',  false),
  ('7shifts',             '7shifts',             'Restaurant scheduling, labor compliance, and tip management.',                              'hr_payroll',       'available',    true),
  -- Inventory & Supply Chain
  ('BlueCart',            'bluecart',            'Ordering, inventory tracking, and supplier management for food service.',                    'inventory',        'available',    false),
  ('MarketMan',           'marketman',           'Inventory management, purchasing, and recipe costing integration.',                          'inventory',        'beta',         false),
  ('Sysco SHOP',          'sysco-shop',          'Direct integration with Sysco ordering and delivery tracking.',                             'inventory',        'coming_soon',  false),
  -- Food Safety & IoT
  ('ComplianceMate',      'compliancemate',      'Automated temperature monitoring and HACCP compliance sensors.',                            'food_safety_iot',  'available',    false),
  ('Thermoworks',         'thermoworks',         'Professional temperature monitoring probes and data logging.',                              'food_safety_iot',  'beta',         false),
  ('Cooper-Atkins',       'cooper-atkins',       'Enterprise IoT sensor network for cold chain monitoring.',                                  'food_safety_iot',  'available',    false),
  -- Insurance & Risk
  ('Society Insurance',   'society-insurance',   'Automated risk data sharing for restaurant insurance underwriting.',                        'insurance',        'available',    true),
  ('The Hartford',        'hartford',            'Commercial insurance API for real-time compliance data exchange.',                          'insurance',        'coming_soon',  false),
  -- Delivery & Online
  ('DoorDash Drive',      'doordash',            'Delivery logistics, order tracking, and kitchen display integration.',                      'delivery',         'available',    false),
  ('Uber Eats',           'uber-eats',           'Online ordering, delivery status, and menu management sync.',                              'delivery',         'coming_soon',  false),
  -- Communication
  ('Slack',               'slack',               'Real-time compliance alerts, shift notifications, and team messaging.',                    'communication',    'available',    true),
  ('Microsoft Teams',     'ms-teams',            'Compliance notifications, task assignments, and team collaboration.',                       'communication',    'available',    false),
  -- Analytics & BI
  ('Looker (Google)',     'looker',              'Advanced business intelligence dashboards and compliance analytics.',                        'analytics',        'coming_soon',  false),
  ('Tableau',             'tableau',             'Visual analytics and interactive compliance reporting dashboards.',                          'analytics',        'coming_soon',  false),
  -- Government & Regulatory
  ('CalRecycle SB 1383',  'calrecycle',          'Automated SB 1383 organic waste diversion reporting for California.',                       'government',       'beta',         false)
ON CONFLICT (slug) DO NOTHING;

END IF;
END $$;

-- ── 6. Seed 2 demo API keys (hashes are dummy SHA-256) ─────
INSERT INTO public.api_keys (org_id, label, key_type, key_hash, key_preview, permissions, facility_scope, expires_at, request_count, last_used_at, is_active)
SELECT
  o.id,
  'Carrier Partnership — Pilot',
  'insurance',
  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  'evd_ins_****7a3f',
  '{"facilities": true, "risk_profile": true, "history": true}'::jsonb,
  'all',
  now() + interval '320 days',
  1247,
  now() - interval '3 hours',
  true
FROM public.organizations o LIMIT 1;

INSERT INTO public.api_keys (org_id, label, key_type, key_hash, key_preview, permissions, facility_scope, expires_at, request_count, last_used_at, is_active)
SELECT
  o.id,
  'Broker Portal — Read Only',
  'insurance',
  'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6b2c3',
  'evd_ins_****b912',
  '{"facilities": true, "risk_profile": true, "history": false}'::jsonb,
  'all',
  now() + interval '345 days',
  89,
  now() - interval '1 day',
  true
FROM public.organizations o LIMIT 1;
