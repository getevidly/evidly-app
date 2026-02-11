-- =====================================================
-- Vendor Marketplace Tables
-- =====================================================
-- Extended vendor profiles, services, reviews,
-- credentials, service requests, and cached performance
-- metrics for the EvidLY vendor marketplace.
-- =====================================================

-- 1. marketplace_vendors — extended vendor profiles for marketplace
CREATE TABLE IF NOT EXISTS marketplace_vendors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  slug text UNIQUE NOT NULL,
  company_name text NOT NULL,
  description text,
  logo_url text,
  years_in_business integer DEFAULT 0,
  service_area jsonb DEFAULT '[]'::jsonb,
  languages jsonb DEFAULT '["English"]'::jsonb,
  response_time_hours integer DEFAULT 24,
  certifications jsonb DEFAULT '[]'::jsonb,
  tier varchar(20) DEFAULT 'verified' CHECK (tier IN ('verified', 'certified', 'preferred')),
  contact_name text,
  phone varchar(20),
  email text,
  website text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_mp_vendors_slug ON marketplace_vendors(slug);
CREATE INDEX idx_mp_vendors_tier ON marketplace_vendors(tier) WHERE is_active = true;

-- 2. marketplace_services — services offered by marketplace vendors
CREATE TABLE IF NOT EXISTS marketplace_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_vendor_id uuid NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
  category varchar(100) NOT NULL,
  subcategory varchar(100),
  name text NOT NULL,
  description text,
  frequency_options jsonb DEFAULT '[]'::jsonb,
  pricing_display text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_mp_services_vendor ON marketplace_services(marketplace_vendor_id);
CREATE INDEX idx_mp_services_category ON marketplace_services(category);

-- 3. marketplace_reviews — operator reviews of marketplace vendors
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_vendor_id uuid NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
  reviewer_org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  reviewer_name text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  service_type varchar(100),
  vendor_response text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_mp_reviews_vendor ON marketplace_reviews(marketplace_vendor_id);
CREATE INDEX idx_mp_reviews_rating ON marketplace_reviews(rating);

-- 4. marketplace_credentials — verified vendor credentials
CREATE TABLE IF NOT EXISTS marketplace_credentials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_vendor_id uuid NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
  credential_type varchar(100) NOT NULL,
  document_url text,
  verified boolean DEFAULT false,
  expiration_date date,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_mp_credentials_vendor ON marketplace_credentials(marketplace_vendor_id);

-- 5. marketplace_service_requests — quote/booking requests
CREATE TABLE IF NOT EXISTS marketplace_service_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_vendor_id uuid NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
  requesting_org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requesting_user_id uuid,
  service_type varchar(100) NOT NULL,
  location_details text,
  preferred_dates jsonb DEFAULT '[]'::jsonb,
  description text,
  urgency varchar(20) DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'emergency')),
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'quoted', 'accepted', 'declined', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_mp_requests_vendor_status ON marketplace_service_requests(marketplace_vendor_id, status);
CREATE INDEX idx_mp_requests_org ON marketplace_service_requests(requesting_org_id);

-- 6. marketplace_vendor_metrics — cached performance metrics
CREATE TABLE IF NOT EXISTS marketplace_vendor_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_vendor_id uuid UNIQUE NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
  total_services integer DEFAULT 0,
  on_time_rate numeric(5,2) DEFAULT 0,
  doc_upload_rate numeric(5,2) DEFAULT 0,
  avg_rating numeric(3,2) DEFAULT 0,
  review_count integer DEFAULT 0,
  profile_views integer DEFAULT 0,
  quote_requests integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_mp_metrics_vendor ON marketplace_vendor_metrics(marketplace_vendor_id);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE marketplace_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_vendor_metrics ENABLE ROW LEVEL SECURITY;

-- marketplace_vendors: authenticated users can read active vendors
CREATE POLICY "Authenticated users can read active marketplace vendors"
  ON marketplace_vendors FOR SELECT
  TO authenticated
  USING (is_active = true);

-- marketplace_services: authenticated users can read active services
CREATE POLICY "Authenticated users can read active marketplace services"
  ON marketplace_services FOR SELECT
  TO authenticated
  USING (is_active = true);

-- marketplace_reviews: authenticated users can read all reviews
CREATE POLICY "Authenticated users can read marketplace reviews"
  ON marketplace_reviews FOR SELECT
  TO authenticated
  USING (true);

-- marketplace_reviews: authenticated users can insert reviews
CREATE POLICY "Authenticated users can create marketplace reviews"
  ON marketplace_reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- marketplace_credentials: authenticated users can read all credentials
CREATE POLICY "Authenticated users can read marketplace credentials"
  ON marketplace_credentials FOR SELECT
  TO authenticated
  USING (true);

-- marketplace_service_requests: authenticated users can create requests
CREATE POLICY "Authenticated users can create service requests"
  ON marketplace_service_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- marketplace_service_requests: users can read their own requests
CREATE POLICY "Users can read own service requests"
  ON marketplace_service_requests FOR SELECT
  TO authenticated
  USING (requesting_user_id = auth.uid());

-- marketplace_vendor_metrics: authenticated users can read all metrics
CREATE POLICY "Authenticated users can read vendor metrics"
  ON marketplace_vendor_metrics FOR SELECT
  TO authenticated
  USING (true);
