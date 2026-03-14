-- Mobile Inspection System — Checklists, Photos, Voice, Reports, Offline Sync
-- Migration: 20260527000000_mobile_inspection_system.sql

-- =============================================
-- CHECKLIST TEMPLATES
-- =============================================

CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,

  name TEXT NOT NULL,
  service_type TEXT NOT NULL,        -- 'KEC', 'FSI', 'FES', 'FPM', 'GFX', 'RGC'
  checklist_phase TEXT NOT NULL CHECK (checklist_phase IN ('pre', 'during', 'post')),

  items JSONB NOT NULL DEFAULT '[]',
  -- [{
  --   id: 'item_1',
  --   label: 'Hood surfaces free of grease buildup',
  --   type: 'pass_fail' | 'yes_no' | 'rating' | 'text' | 'photo_required' | 'measurement',
  --   required: true,
  --   photo_required: false,
  --   min_photos: 1,
  --   help_text: 'Check all accessible surfaces',
  --   fail_creates_deficiency: true,
  --   deficiency_severity: 'major' | 'minor' | 'critical',
  --   options: ['Light', 'Moderate', 'Heavy', 'Excessive']
  -- }]

  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklist_templates_vendor ON checklist_templates(vendor_id);
CREATE INDEX idx_checklist_templates_service ON checklist_templates(service_type, checklist_phase);

-- =============================================
-- JOB CHECKLISTS (completed per job)
-- =============================================

CREATE TABLE IF NOT EXISTS job_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  job_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES checklist_templates(id),

  checklist_phase TEXT NOT NULL CHECK (checklist_phase IN ('pre', 'during', 'post')),

  responses JSONB NOT NULL DEFAULT '[]',
  -- [{
  --   item_id: 'item_1',
  --   value: 'pass' | 'fail' | true | false | '4.5' | 'text response',
  --   photo_ids: ['uuid1', 'uuid2'],
  --   notes: 'Additional notes',
  --   voice_note_url: 'https://...',
  --   ai_analysis: { ... },
  --   answered_at: '2026-03-15T10:30:00Z',
  --   location: { lat: 36.123, lng: -119.456 }
  -- }]

  completion_percent INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID,

  -- QA
  qa_status TEXT DEFAULT 'pending' CHECK (qa_status IN ('pending', 'approved', 'needs_revision')),
  qa_reviewed_by UUID,
  qa_reviewed_at TIMESTAMPTZ,
  qa_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_checklists_job ON job_checklists(job_id);
CREATE INDEX idx_job_checklists_qa ON job_checklists(vendor_id) WHERE qa_status = 'pending';

-- =============================================
-- JOB PHOTOS WITH AI ANALYSIS
-- =============================================

CREATE TABLE IF NOT EXISTS job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  job_id UUID NOT NULL,

  -- Photo metadata
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  phase TEXT NOT NULL CHECK (phase IN ('before', 'during', 'after')),
  category TEXT CHECK (category IN ('hood', 'duct', 'fan', 'filter', 'suppression', 'general', 'deficiency')),
  equipment_id UUID,

  -- Capture info
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  captured_by UUID,
  location JSONB,           -- { lat, lng, accuracy }
  device_info JSONB,        -- { model, os, app_version }

  -- AI Analysis
  ai_analyzed BOOLEAN DEFAULT false,
  ai_analysis JSONB,
  -- {
  --   grease_level: 'light' | 'moderate' | 'heavy' | 'excessive',
  --   grease_percentage: 35,
  --   cleanliness_score: 7.5,
  --   detected_issues: [{ type, location, severity, confidence }],
  --   condition_rating: 'good' | 'fair' | 'poor' | 'critical',
  --   recommended_actions: ['deep_clean_required'],
  --   confidence: 0.92,
  --   comparison_to_before: { improvement: 85, notes: '...' }
  -- }
  ai_analyzed_at TIMESTAMPTZ,

  -- Voice notes
  voice_note_url TEXT,
  voice_transcription TEXT,

  -- Manual notes
  notes TEXT,
  tags TEXT[],

  -- Linking
  checklist_item_id TEXT,
  deficiency_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_photos_job ON job_photos(job_id);
CREATE INDEX idx_job_photos_phase ON job_photos(job_id, phase);

-- =============================================
-- DEFICIENCY EXTENSIONS
-- =============================================

ALTER TABLE deficiencies ADD COLUMN IF NOT EXISTS detected_by TEXT DEFAULT 'manual';
ALTER TABLE deficiencies ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2);
ALTER TABLE deficiencies ADD COLUMN IF NOT EXISTS voice_description_url TEXT;
ALTER TABLE deficiencies ADD COLUMN IF NOT EXISTS voice_transcription TEXT;
ALTER TABLE deficiencies ADD COLUMN IF NOT EXISTS equipment_component TEXT;
ALTER TABLE deficiencies ADD COLUMN IF NOT EXISTS measurements JSONB;
ALTER TABLE deficiencies ADD COLUMN IF NOT EXISTS nfpa_reference TEXT;
ALTER TABLE deficiencies ADD COLUMN IF NOT EXISTS recommended_action TEXT;
ALTER TABLE deficiencies ADD COLUMN IF NOT EXISTS estimated_repair_cost DECIMAL(10,2);
ALTER TABLE deficiencies ADD COLUMN IF NOT EXISTS customer_notified BOOLEAN DEFAULT false;
ALTER TABLE deficiencies ADD COLUMN IF NOT EXISTS customer_notified_at TIMESTAMPTZ;
ALTER TABLE deficiencies ADD COLUMN IF NOT EXISTS customer_signature_url TEXT;

-- =============================================
-- ON-SITE JOB REPORTS
-- =============================================

CREATE TABLE IF NOT EXISTS job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  job_id UUID NOT NULL,

  report_type TEXT NOT NULL CHECK (report_type IN ('service_report', 'inspection_report', 'deficiency_report', 'certificate')),
  report_number TEXT NOT NULL,

  -- Content
  content_json JSONB,
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Signatures
  tech_signature_url TEXT,
  tech_signed_at TIMESTAMPTZ,
  customer_signature_url TEXT,
  customer_signed_at TIMESTAMPTZ,
  customer_signer_name TEXT,
  customer_signer_title TEXT,

  -- Delivery
  emailed_to TEXT[],
  emailed_at TIMESTAMPTZ,

  -- QA
  qa_status TEXT DEFAULT 'pending' CHECK (qa_status IN ('pending', 'approved', 'rejected')),
  qa_approved_by UUID,
  qa_approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_reports_job ON job_reports(job_id);
CREATE INDEX idx_job_reports_qa ON job_reports(vendor_id) WHERE qa_status = 'pending';

-- =============================================
-- VOICE NOTES
-- =============================================

CREATE TABLE IF NOT EXISTS voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  job_id UUID NOT NULL,

  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,

  -- Transcription
  transcription TEXT,
  transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  transcription_confidence DECIMAL(3,2),

  -- AI extraction
  extracted_deficiencies JSONB,
  extracted_measurements JSONB,
  extracted_notes TEXT,

  -- Context
  context_type TEXT CHECK (context_type IN ('general', 'deficiency', 'checklist_item', 'equipment')),
  context_id TEXT,

  recorded_by UUID,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  location JSONB
);

CREATE INDEX idx_voice_notes_job ON voice_notes(job_id);

-- =============================================
-- OFFLINE SYNC QUEUE
-- =============================================

CREATE TABLE IF NOT EXISTS mobile_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  employee_id UUID NOT NULL,

  entity_type TEXT NOT NULL CHECK (entity_type IN ('photo', 'checklist', 'deficiency', 'voice_note', 'time_entry', 'report', 'signature')),
  entity_local_id TEXT NOT NULL,
  entity_server_id UUID,

  action TEXT NOT NULL CHECK (action IN ('create', 'update')),
  payload JSONB NOT NULL,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX idx_mobile_sync_device ON mobile_sync_queue(device_id, status);
CREATE INDEX idx_mobile_sync_pending ON mobile_sync_queue(status) WHERE status = 'pending';

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_mobile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checklist_templates_updated_at
  BEFORE UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION update_mobile_updated_at();

CREATE TRIGGER trg_job_checklists_updated_at
  BEFORE UPDATE ON job_checklists
  FOR EACH ROW EXECUTE FUNCTION update_mobile_updated_at();

CREATE TRIGGER trg_job_reports_updated_at
  BEFORE UPDATE ON job_reports
  FOR EACH ROW EXECUTE FUNCTION update_mobile_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY checklist_templates_vendor ON checklist_templates
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

CREATE POLICY job_checklists_vendor ON job_checklists
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

CREATE POLICY job_photos_vendor ON job_photos
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

CREATE POLICY job_reports_vendor ON job_reports
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

CREATE POLICY voice_notes_vendor ON voice_notes
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

CREATE POLICY mobile_sync_own ON mobile_sync_queue
  FOR ALL USING (employee_id = auth.uid());
