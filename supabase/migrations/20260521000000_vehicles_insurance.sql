-- ============================================================
-- VEHICLES & INSURANCE MODULE
-- Tables: vehicles, vehicle_insurance, roadside_assistance,
--         vehicle_maintenance, vehicle_incidents, company_insurance,
--         webhook_logs
-- ============================================================

-- 1. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('truck','van','trailer')),
  year INTEGER,
  make TEXT,
  model TEXT,
  color TEXT,
  vin TEXT,
  license_plate TEXT,
  license_state TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','maintenance','out_of_service','sold')),
  assigned_employee_id UUID REFERENCES employees(id),
  current_odometer INTEGER,
  odometer_updated_at TIMESTAMPTZ,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  purchase_odometer INTEGER,
  registration_expiry DATE,
  registration_document_url TEXT,
  last_inspection_date DATE,
  next_inspection_due DATE,
  inspection_document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_vendor ON vehicles(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned ON vehicles(assigned_employee_id);

-- 2. Vehicle Insurance
CREATE TABLE IF NOT EXISTS vehicle_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  vehicle_id UUID REFERENCES vehicles(id),
  policy_type TEXT NOT NULL CHECK (policy_type IN ('liability','collision','comprehensive','commercial_auto','umbrella')),
  insurance_company TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  coverage_amount DECIMAL(12,2),
  deductible DECIMAL(10,2),
  effective_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  premium_amount DECIMAL(10,2),
  payment_frequency TEXT CHECK (payment_frequency IN ('monthly','quarterly','semi_annual','annual')),
  agent_name TEXT,
  agent_phone TEXT,
  agent_email TEXT,
  policy_document_url TEXT,
  insurance_card_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_vendor ON vehicle_insurance(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_vehicle ON vehicle_insurance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_expiry ON vehicle_insurance(expiry_date);

-- 3. Roadside Assistance
CREATE TABLE IF NOT EXISTS roadside_assistance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  provider_name TEXT NOT NULL,
  membership_number TEXT,
  phone_number TEXT NOT NULL,
  phone_number_alt TEXT,
  website TEXT,
  app_name TEXT,
  coverage_type TEXT CHECK (coverage_type IN ('basic','plus','premier')),
  towing_miles_included INTEGER,
  effective_date DATE,
  expiry_date DATE,
  vehicles_covered TEXT[],
  membership_card_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roadside_vendor ON roadside_assistance(vendor_id);

-- 4. Vehicle Maintenance
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('oil_change','tires','brakes','inspection','repair','other')),
  description TEXT NOT NULL,
  service_date DATE NOT NULL,
  odometer_reading INTEGER,
  service_provider TEXT,
  parts_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (parts_cost + labor_cost) STORED,
  next_service_date DATE,
  next_service_odometer INTEGER,
  receipt_url TEXT,
  logged_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_date ON vehicle_maintenance(service_date);

-- 5. Vehicle Incidents
CREATE TABLE IF NOT EXISTS vehicle_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  employee_id UUID REFERENCES employees(id),
  incident_type TEXT NOT NULL CHECK (incident_type IN ('accident','breakdown','theft','vandalism','citation')),
  incident_date DATE NOT NULL,
  incident_time TIME,
  location TEXT,
  description TEXT NOT NULL,
  police_report_number TEXT,
  citation_number TEXT,
  damage_description TEXT,
  estimated_repair_cost DECIMAL(10,2),
  actual_repair_cost DECIMAL(10,2),
  insurance_claim_filed BOOLEAN DEFAULT false,
  insurance_claim_number TEXT,
  insurance_claim_status TEXT CHECK (insurance_claim_status IN ('pending','approved','denied','paid')),
  third_party_involved BOOLEAN DEFAULT false,
  third_party_name TEXT,
  third_party_phone TEXT,
  third_party_insurance TEXT,
  third_party_policy_number TEXT,
  photos JSONB DEFAULT '[]',
  status TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_incidents_vehicle ON vehicle_incidents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_incidents_status ON vehicle_incidents(status);

-- 6. Company Insurance (GL, WC, etc.)
CREATE TABLE IF NOT EXISTS company_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  policy_type TEXT NOT NULL CHECK (policy_type IN ('general_liability','workers_comp','professional_liability','property','cyber','umbrella')),
  insurance_company TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  coverage_amount DECIMAL(12,2),
  aggregate_limit DECIMAL(12,2),
  deductible DECIMAL(10,2),
  effective_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  premium_amount DECIMAL(10,2),
  payment_frequency TEXT CHECK (payment_frequency IN ('monthly','quarterly','semi_annual','annual')),
  agent_name TEXT,
  agent_company TEXT,
  agent_phone TEXT,
  agent_email TEXT,
  policy_document_url TEXT,
  certificate_of_insurance_url TEXT,
  experience_mod_rate DECIMAL(4,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_insurance_vendor ON company_insurance(vendor_id);
CREATE INDEX IF NOT EXISTS idx_company_insurance_expiry ON company_insurance(expiry_date);

-- 7. Webhook Logs (for EvidLY integration)
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_sent ON webhook_logs(sent_at);

-- RLS policies
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadside_assistance ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
