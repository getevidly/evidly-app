-- Service Report System — NFPA Codes, Reports, Systems, Photos, Deficiencies, Fire Safety
-- Migration: 20260528000000_service_report_system.sql

-- =============================================
-- NFPA CODE LIBRARY (admin-configurable)
-- =============================================

CREATE TABLE IF NOT EXISTS nfpa_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID,

  code TEXT NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  deficiency_text TEXT NOT NULL,
  corrective_action TEXT NOT NULL,
  severity TEXT DEFAULT 'major' CHECK (severity IN ('critical', 'major', 'minor')),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nfpa_codes_vendor ON nfpa_codes(vendor_id);
CREATE INDEX idx_nfpa_codes_code ON nfpa_codes(code, section);

-- =============================================
-- SERVICE REPORTS
-- =============================================

CREATE TABLE IF NOT EXISTS service_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  job_id UUID NOT NULL,

  certificate_id TEXT NOT NULL,
  service_type TEXT NOT NULL,
  service_date DATE NOT NULL,
  frequency TEXT NOT NULL,
  next_due_date DATE,

  overall_status TEXT DEFAULT 'pending' CHECK (overall_status IN ('pending', 'in_progress', 'completed', 'approved', 'sent')),

  technician_notes TEXT,

  -- Lead tech
  lead_tech_id UUID,
  lead_tech_signature_url TEXT,

  -- Reviewer
  reviewer_id UUID,
  reviewer_signature_url TEXT,

  -- Customer
  customer_name TEXT,
  customer_signature_url TEXT,

  -- PDF
  pdf_url TEXT,

  -- QA
  qa_status TEXT DEFAULT 'pending' CHECK (qa_status IN ('pending', 'approved', 'rejected', 'revision_requested')),

  -- Delivery
  sent_to_customer BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_job ON service_reports(job_id);
CREATE INDEX idx_reports_vendor ON service_reports(vendor_id, created_at DESC);
CREATE INDEX idx_reports_qa ON service_reports(vendor_id) WHERE qa_status = 'pending';

-- =============================================
-- REPORT SYSTEMS (hoods/equipment per report)
-- =============================================

CREATE TABLE IF NOT EXISTS report_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES service_reports(id) ON DELETE CASCADE,

  system_number INTEGER NOT NULL,
  location_name TEXT,

  -- Section data stored as JSONB for flexibility
  grease_levels JSONB DEFAULT '{}',
  hood_data JSONB DEFAULT '{}',
  filter_data JSONB DEFAULT '{}',
  duct_data JSONB DEFAULT '{}',
  fan_mechanical JSONB DEFAULT '{}',
  fan_electrical JSONB DEFAULT '{}',
  solid_fuel JSONB DEFAULT '{}',
  post_cleaning JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_systems ON report_systems(report_id);

-- =============================================
-- REPORT PHOTOS
-- =============================================

CREATE TABLE IF NOT EXISTS report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES service_reports(id) ON DELETE CASCADE,
  system_id UUID REFERENCES report_systems(id) ON DELETE CASCADE,

  component TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('before', 'during', 'after')),
  photo_url TEXT NOT NULL,

  no_access BOOLEAN DEFAULT false,
  no_access_reason TEXT,

  ai_analysis JSONB,

  captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_photos ON report_photos(report_id);
CREATE INDEX idx_report_photos_system ON report_photos(system_id);

-- =============================================
-- REPORT DEFICIENCIES
-- =============================================

CREATE TABLE IF NOT EXISTS report_deficiencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES service_reports(id) ON DELETE CASCADE,
  system_id UUID REFERENCES report_systems(id) ON DELETE CASCADE,

  component TEXT NOT NULL,
  field TEXT NOT NULL,
  value TEXT NOT NULL,

  nfpa_code_id UUID REFERENCES nfpa_codes(id),
  deficiency_text TEXT NOT NULL,
  corrective_action TEXT,
  severity TEXT DEFAULT 'major' CHECK (severity IN ('critical', 'major', 'minor')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_deficiencies ON report_deficiencies(report_id);
CREATE INDEX idx_report_deficiencies_system ON report_deficiencies(system_id);

-- =============================================
-- FIRE SAFETY (courtesy section)
-- =============================================

CREATE TABLE IF NOT EXISTS report_fire_safety (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES service_reports(id) ON DELETE CASCADE,

  -- Suppression system
  suppression_system_type TEXT,
  suppression_company_name TEXT,
  suppression_company_phone TEXT,
  suppression_company_email TEXT,
  suppression_last_inspection DATE,
  suppression_next_due DATE,
  suppression_nozzle_caps TEXT,
  suppression_nozzles_clean TEXT,
  suppression_inspection_current TEXT,
  suppression_tag_photo_url TEXT,
  suppression_notes TEXT,

  -- Extinguishers (array of objects)
  extinguishers JSONB DEFAULT '[]',
  -- [{ location, type, size, last_inspection, expiry, condition, tag_current }]

  extinguisher_company_name TEXT,
  extinguisher_company_phone TEXT,
  extinguisher_company_email TEXT,

  -- Courtesy report delivery
  courtesy_report_sent BOOLEAN DEFAULT false,
  courtesy_report_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_fire_safety ON report_fire_safety(report_id);

-- =============================================
-- NFPA CODE SEED DATA (global — vendor_id IS NULL)
-- =============================================

INSERT INTO nfpa_codes (vendor_id, code, section, title, deficiency_text, corrective_action, severity) VALUES
(NULL, 'NFPA 96', '4.1.8',       'Access',         'Interior surfaces not accessible for cleaning.',  'Install access panels per 7.4.1',                'major'),
(NULL, 'NFPA 96', '6.1.2',       'Filter UL',      'Filters not UL 1046 listed.',                     'Purchase UL 1046 filters.',                      'major'),
(NULL, 'NFPA 96', '6.1.3',       'Mesh',           'Mesh filters non-compliant.',                     'Replace with stainless/galvanized/aluminum.',     'critical'),
(NULL, 'NFPA 96', '6.2.4.2',     'Drip Pans',      'Drip pans not installed.',                        'Install drip pans.',                             'major'),
(NULL, 'NFPA 96', '7.4.1',       'Access Panel',   'Access panels not installed.',                     'Install 20x20 inch or every 12 feet.',           'major'),
(NULL, 'NFPA 96', '7.5.2.1',     'Leak',           'Exhaust system not leak-free.',                   'Have ducts fixed by contractor.',                 'major'),
(NULL, 'NFPA 96', '8.1.2.1',     'Hinge',          'Upblast fan not hinged.',                         'Install hinge for safe cleaning.',                'major'),
(NULL, 'NFPA 96', '8.1.2.3',     'Containment',    'No rooftop grease containment.',                  'Install grease receptacle.',                      'major'),
(NULL, 'NFPA 96', '8.1.6.3.1',   'Cleanout',       'No clean-out port.',                              'Install 3x5 or 4 inch port.',                    'major'),
(NULL, 'NFPA 96', '8.2.2.3',     'Fan Op',         'Exhaust fan not operational.',                     'Cease cooking until repaired.',                   'critical'),
(NULL, 'NFPA 96', '9.2.3.1.1',   'Lights',         'Hood lights not working.',                        'Fix or replace lights.',                          'minor'),
(NULL, 'NFPA 96', '12.6.1.1.3',  'Grease 2000',    'Grease exceeds 2000 microns.',                    'Clean to 50 microns.',                            'major'),
(NULL, 'NFPA 96', '12.6.1.1.4',  'Fan Bowl 3175',  'Fan bowl grease exceeds 3175 microns.',           'Clean to 50 microns.',                            'major'),
(NULL, 'NFPA 96', '12.6.13',     'Cert Posted',    'Certificate not posted.',                         'Post certificate on premises.',                   'minor'),
(NULL, 'NFPA 96', '12.6.14',     'Report',         'Written report not provided.',                    'Provide written report.',                         'minor');

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_service_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_service_reports_updated_at
  BEFORE UPDATE ON service_reports
  FOR EACH ROW EXECUTE FUNCTION update_service_report_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE nfpa_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_deficiencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_fire_safety ENABLE ROW LEVEL SECURITY;

-- NFPA codes: vendor-specific + global (vendor_id IS NULL)
CREATE POLICY nfpa_codes_access ON nfpa_codes
  FOR ALL USING (
    vendor_id IS NULL
    OR vendor_id = auth.uid()
    OR vendor_id IN (SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid())
  );

CREATE POLICY service_reports_vendor ON service_reports
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

CREATE POLICY report_systems_vendor ON report_systems
  FOR ALL USING (report_id IN (
    SELECT id FROM service_reports WHERE vendor_id = auth.uid() OR vendor_id IN (
      SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
    )
  ));

CREATE POLICY report_photos_vendor ON report_photos
  FOR ALL USING (report_id IN (
    SELECT id FROM service_reports WHERE vendor_id = auth.uid() OR vendor_id IN (
      SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
    )
  ));

CREATE POLICY report_deficiencies_vendor ON report_deficiencies
  FOR ALL USING (report_id IN (
    SELECT id FROM service_reports WHERE vendor_id = auth.uid() OR vendor_id IN (
      SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
    )
  ));

CREATE POLICY report_fire_safety_vendor ON report_fire_safety
  FOR ALL USING (report_id IN (
    SELECT id FROM service_reports WHERE vendor_id = auth.uid() OR vendor_id IN (
      SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
    )
  ));
