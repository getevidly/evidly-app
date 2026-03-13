-- ============================================================
-- BONUSES, INVENTORY & INCIDENT REPORTING
-- Migration: 20260523000000_bonuses_inventory_incidents.sql
-- ============================================================

-- ── 1. Bonus configuration ──────────────────────────────────
CREATE TABLE IF NOT EXISTS bonus_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  employee_id UUID REFERENCES employees(id),
  role TEXT,
  bonus_rate DECIMAL(5,4) NOT NULL DEFAULT 0.01,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, employee_id)
);
ALTER TABLE bonus_configurations ENABLE ROW LEVEL SECURITY;

-- ── 2. Performance metrics ──────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  quarter TEXT NOT NULL,
  jobs_completed INTEGER DEFAULT 0,
  employee_job_revenue DECIMAL(12,2) DEFAULT 0,
  total_company_revenue DECIMAL(12,2) DEFAULT 0,
  callbacks INTEGER DEFAULT 0,
  safety_violations INTEGER DEFAULT 0,
  no_call_no_shows INTEGER DEFAULT 0,
  verified_complaints INTEGER DEFAULT 0,
  qa_first_pass_rate DECIMAL(5,2),
  on_time_arrival_rate DECIMAL(5,2),
  deficiency_documentation_rate DECIMAL(5,2),
  photo_compliance_rate DECIMAL(5,2),
  average_customer_rating DECIMAL(3,2),
  timecard_accuracy_rate DECIMAL(5,2),
  availability_submission_rate DECIMAL(5,2),
  equipment_damage_count INTEGER DEFAULT 0,
  equipment_loss_count INTEGER DEFAULT 0,
  inventory_variance_rate DECIMAL(5,2),
  safety_incidents INTEGER DEFAULT 0,
  bonus_eligible BOOLEAN GENERATED ALWAYS AS (
    callbacks = 0 AND
    safety_violations = 0 AND
    no_call_no_shows = 0 AND
    verified_complaints = 0
  ) STORED,
  bonus_multiplier DECIMAL(5,2),
  calculated_bonus DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, employee_id, quarter)
);
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- ── 3. Job callbacks ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  original_job_id UUID NOT NULL,
  callback_job_id UUID,
  employee_id UUID NOT NULL REFERENCES employees(id),
  reason TEXT NOT NULL,
  description TEXT,
  customer_reported BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE job_callbacks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_job_callbacks_employee ON job_callbacks(employee_id);
CREATE INDEX idx_job_callbacks_vendor ON job_callbacks(vendor_id);

-- ── 4. Inventory items ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT NOT NULL CHECK (category IN ('chemicals','parts','equipment','ppe','supplies')),
  unit TEXT NOT NULL,
  current_quantity INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 5,
  reorder_quantity INTEGER DEFAULT 10,
  unit_cost DECIMAL(10,2),
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_inventory_items_vendor ON inventory_items(vendor_id);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);

-- ── 5. Inventory transactions ───────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('use','restock','adjustment','transfer','damage','loss')),
  quantity INTEGER NOT NULL,
  job_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_inventory_txn_item ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_txn_employee ON inventory_transactions(employee_id);

-- ── 6. Inventory requests ───────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','ordered','received')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  notes TEXT,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inventory_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS inventory_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES inventory_requests(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id),
  item_name TEXT NOT NULL,
  quantity_requested INTEGER NOT NULL,
  quantity_approved INTEGER,
  notes TEXT
);
ALTER TABLE inventory_request_items ENABLE ROW LEVEL SECURITY;

-- ── 7. Equipment incidents ──────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  incident_type TEXT NOT NULL CHECK (incident_type IN ('damage','loss','theft','malfunction')),
  equipment_name TEXT NOT NULL,
  equipment_id UUID REFERENCES inventory_items(id),
  serial_number TEXT,
  description TEXT NOT NULL,
  incident_date DATE NOT NULL,
  location TEXT,
  estimated_cost DECIMAL(10,2),
  photos JSONB DEFAULT '[]',
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  impacts_bonus BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE equipment_incidents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_equipment_incidents_employee ON equipment_incidents(employee_id);

-- ── 8. Incident reports (safety / injury) ───────────────────
CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  reported_by UUID NOT NULL REFERENCES employees(id),
  incident_type TEXT NOT NULL CHECK (incident_type IN ('injury','near_miss','property_damage','vehicle_accident','chemical_exposure')),
  severity TEXT NOT NULL CHECK (severity IN ('minor','moderate','serious','critical')),
  incident_date DATE NOT NULL,
  incident_time TIME,
  location TEXT NOT NULL,
  job_id UUID,
  injured_employee_id UUID REFERENCES employees(id),
  third_party_involved BOOLEAN DEFAULT false,
  third_party_name TEXT,
  description TEXT NOT NULL,
  immediate_actions TEXT,
  witnesses TEXT,
  photos JSONB DEFAULT '[]',
  medical_attention_required BOOLEAN DEFAULT false,
  medical_facility TEXT,
  workers_comp_filed BOOLEAN DEFAULT false,
  workers_comp_claim_number TEXT,
  root_cause TEXT,
  preventive_measures TEXT,
  investigated_by UUID REFERENCES employees(id),
  investigated_at TIMESTAMPTZ,
  status TEXT DEFAULT 'reported' CHECK (status IN ('reported','investigating','resolved','closed')),
  caused_by_negligence BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_incident_reports_vendor ON incident_reports(vendor_id);
CREATE INDEX idx_incident_reports_status ON incident_reports(status);
