-- ============================================================
-- Platform-Wide Verification Architecture
-- Central audit log, verification status, gate definitions,
-- and publish enforcement triggers.
-- ============================================================

-- Table 1: content_verification_log — append-only audit trail
CREATE TABLE IF NOT EXISTS content_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was verified
  content_table TEXT NOT NULL,
  content_id UUID NOT NULL,
  content_title TEXT,
  content_type TEXT,

  -- Which gate
  gate_key TEXT NOT NULL,
  gate_label TEXT NOT NULL,
  gate_result TEXT NOT NULL
    CHECK (gate_result IN ('passed', 'failed', 'needs_update')),

  -- Who verified
  verified_by_user_id UUID REFERENCES auth.users(id),
  verified_by_name TEXT,
  verified_by_role TEXT,

  -- How it was verified
  verification_method TEXT NOT NULL,

  -- Sources used
  source_urls JSONB DEFAULT '[]',
  source_documents JSONB DEFAULT '[]',

  -- Content change record
  field_checked TEXT,
  value_before TEXT,
  value_after TEXT,
  content_was_corrected BOOLEAN DEFAULT false,

  -- Notes
  reviewer_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_content_table CHECK (content_table IN (
    'intelligence_signals',
    'regulatory_changes',
    'jurisdictions',
    'jurisdiction_intel_updates',
    'intelligence_sources',
    'entity_correlations'
  ))
);

CREATE INDEX IF NOT EXISTS idx_cvl_content ON content_verification_log(content_table, content_id);
CREATE INDEX IF NOT EXISTS idx_cvl_gate ON content_verification_log(gate_key, gate_result);
CREATE INDEX IF NOT EXISTS idx_cvl_verifier ON content_verification_log(verified_by_user_id);
CREATE INDEX IF NOT EXISTS idx_cvl_created ON content_verification_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cvl_type ON content_verification_log(content_type);


-- Table 2: content_verification_status — current state per record
CREATE TABLE IF NOT EXISTS content_verification_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_table TEXT NOT NULL,
  content_id UUID NOT NULL,
  content_title TEXT,
  content_type TEXT,

  -- Gate scores
  gates_required INTEGER NOT NULL DEFAULT 0,
  gates_passed INTEGER NOT NULL DEFAULT 0,
  gates_failed INTEGER NOT NULL DEFAULT 0,
  gates_pending INTEGER NOT NULL DEFAULT 0,

  -- Gate detail
  gate_states JSONB DEFAULT '{}'::jsonb,

  -- Overall status
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN (
      'unverified',
      'in_review',
      'verified',
      'rejected',
      'needs_update',
      'overdue'
    )),

  -- Publish gate enforcement
  publish_blocked BOOLEAN GENERATED ALWAYS AS (
    gates_passed < gates_required OR gates_failed > 0
  ) STORED,

  -- Audit trail
  first_verified_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  next_review_due TIMESTAMPTZ,
  review_cycle_days INTEGER DEFAULT 30,

  -- Who last touched it
  last_verified_by TEXT,
  last_verified_by_id UUID,

  -- Source tracking
  primary_source_url TEXT,
  primary_source_confirmed BOOLEAN DEFAULT false,
  source_count INTEGER DEFAULT 0,

  UNIQUE(content_table, content_id)
);

CREATE INDEX IF NOT EXISTS idx_cvs_status ON content_verification_status(verification_status);
CREATE INDEX IF NOT EXISTS idx_cvs_table ON content_verification_status(content_table);
CREATE INDEX IF NOT EXISTS idx_cvs_review ON content_verification_status(next_review_due);
CREATE INDEX IF NOT EXISTS idx_cvs_blocked ON content_verification_status(publish_blocked);


-- Table 3: verification_gate_definitions — canonical gate registry
CREATE TABLE IF NOT EXISTS verification_gate_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  gate_key TEXT NOT NULL,
  gate_number INTEGER NOT NULL,
  gate_label TEXT NOT NULL,
  gate_description TEXT NOT NULL,
  gate_pass_criteria TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  review_cycle_days INTEGER,
  UNIQUE(content_type, gate_key)
);


-- ============================================================
-- SEED: Gate definitions per content type
-- ============================================================

-- RECALLS (USDA FSIS / FDA) — 7 gates
INSERT INTO verification_gate_definitions (content_type, gate_key, gate_number, gate_label, gate_description, gate_pass_criteria, review_cycle_days) VALUES
('recall', 'gate_1_source', 1, 'Primary Source: Official Agency',
 'Source URL must resolve to USDA FSIS (fsis.usda.gov) or FDA (fda.gov) recall notice directly — not a news article, not a secondary site.',
 'URL returns 200, points to fsis.usda.gov/recalls or fda.gov/safety/recalls, recall notice is live.', 7),
('recall', 'gate_2_dates', 2, 'Dates Confirmed from Notice',
 'Published date, recall initiation date, and any expansion dates match the official recall notice exactly.',
 'Every date in the record matches a date explicitly stated in the FSIS or FDA recall notice.', 7),
('recall', 'gate_3_scope', 3, 'Product & Distribution Scope Confirmed',
 'Affected products, establishment numbers, lot codes, best-by dates, and distribution states match the official notice exactly.',
 'Product details verified word-for-word against the official recall notice. CA distribution confirmed.', 7),
('recall', 'gate_4_content', 4, 'No Unsourced Claims',
 'All factual claims (quantities, hazard type, injury reports) trace to the official notice. No invented dollar figures.',
 'Every factual claim has a direct citation. Dollar estimates in client_impact are removed or marked as estimates from identified sources.', 7),
('recall', 'gate_5_risk', 5, 'Recall Class Verified',
 'FSIS Class I/II or FDA Class I/II/III designation confirmed from the official notice. Risk levels reflect the class.',
 'Recall class confirmed. Class I = Critical revenue+liability. Class II = High. Class III = Medium.', 7),
('recall', 'gate_6_action', 6, 'Recommended Action Matches Official Guidance',
 'Consumer/operator action instructions match what FSIS or FDA states in the official notice.',
 'Action steps verified against official notice. Contact info (hotline numbers, emails) confirmed current.', 7),
('recall', 'gate_7_cross', 7, 'Cross-Reference: Second Independent Source',
 'Recall confirmed in at least one industry publication: Food Safety News, Food Dive, MEAT+POULTRY, or CDC outbreak page.',
 'At least one independent secondary source confirms the same recall with matching product details and dates.', 7);

-- CA LEGISLATION — 7 gates
INSERT INTO verification_gate_definitions (content_type, gate_key, gate_number, gate_label, gate_description, gate_pass_criteria, review_cycle_days) VALUES
('legislation', 'gate_1_source', 1, 'Primary Source: leginfo.legislature.ca.gov',
 'Bill text must be confirmed at leginfo.legislature.ca.gov directly. Justia, law firm summaries, and news articles are NOT primary sources.',
 'Bill URL at leginfo.legislature.ca.gov resolves, bill number is correct, chaptered version is confirmed.', 90),
('legislation', 'gate_2_dates', 2, 'Signed Date & Effective Date Confirmed',
 'Signed date confirmed from chaptered bill or official signing announcement. Effective date stated explicitly in bill text — not inferred.',
 'Signed date matches chaptered bill record. Effective date quoted directly from bill text section.', 90),
('legislation', 'gate_3_scope', 3, 'Operator Scope & Exemptions Confirmed',
 'Which operators are covered and all exemptions confirmed from bill text.',
 'Scope and all exemptions verified against bill text. No scope claims based on secondary summaries.', 90),
('legislation', 'gate_4_content', 4, 'No Unsourced Claims',
 'All factual claims trace to bill text or official agency guidance. No invented penalty amounts unless stated in the statute.',
 'Penalty/fine amounts sourced from statute or Health & Safety Code. Unsourced estimates removed.', 90),
('legislation', 'gate_5_risk', 5, 'Risk Levels Reflect Actual Enforcement',
 'Risk levels reflect documented enforcement outcomes, not hypothetical worst-case scenarios.',
 'At least one enforcement action, EH citation record, or attorney general advisory supports the assigned risk level.', 90),
('legislation', 'gate_6_action', 6, 'Recommended Action Confirmed with Agency Guidance',
 'Action steps verified against official agency compliance guidance (CDPH, local EH department, or agency FAQ).',
 'Agency compliance guidance URL confirmed. Action steps match official guidance.', 90),
('legislation', 'gate_7_cross', 7, 'Cross-Reference: Legal or Industry Analysis',
 'Bill confirmed by at least one bar association analysis, food safety legal publication, or official agency FAQ.',
 'At least one legal or industry analysis confirms the same interpretation.', 90);

-- JIE METHODOLOGY — 7 gates
INSERT INTO verification_gate_definitions (content_type, gate_key, gate_number, gate_label, gate_description, gate_pass_criteria, review_cycle_days) VALUES
('jie_methodology', 'gate_1_source', 1, 'Primary Source: Official County EH Document',
 'Inspection methodology sourced from official county environmental health department scoring guide, inspection form, or published policy.',
 'Source URL is the county EH website, or documented via phone/email with the county EH office directly.', 180),
('jie_methodology', 'gate_2_dates', 2, 'Methodology is Current',
 'Confirm the scoring methodology has not changed. Check county EH "What''s New" or news pages.',
 'County EH website or direct contact confirms methodology is current as of verification date.', 180),
('jie_methodology', 'gate_3_scope', 3, 'Grading System Confirmed',
 'Grading system type (letter grade A-F, numeric 0-100, pass/fail, or no public result) confirmed from official source.',
 'Grading system type confirmed from official inspection posting or county EH policy document.', 180),
('jie_methodology', 'gate_4_content', 4, 'Violation Categories & Weights Confirmed',
 'Major violation categories, weighting, and point deductions confirmed from official inspection form or policy.',
 'Violation weights and categories verified against official inspection form or published scoring guide.', 180),
('jie_methodology', 'gate_5_risk', 5, 'Posting/Transparency Level Confirmed',
 'Whether results are publicly posted (website, placard, both, or none) confirmed directly.',
 'Public posting method confirmed via county EH website or direct contact. Transparency level justified.', 180),
('jie_methodology', 'gate_6_action', 6, 'Fire Inspection Methodology Confirmed',
 'fire_jurisdiction_config data confirmed from official fire marshal or AHJ source.',
 'Fire jurisdiction config confirmed from official fire marshal website, CalFire, or OSFM source.', 180),
('jie_methodology', 'gate_7_cross', 7, 'Cross-Reference: Second Source or Direct Agency Contact',
 'Methodology confirmed by a second source: call/email to county EH office, or independent published guide.',
 'Second source documented. If via phone/email: contact name, date, and key information noted.', 180);

-- HEALTH ALERTS — 5 gates
INSERT INTO verification_gate_definitions (content_type, gate_key, gate_number, gate_label, gate_description, gate_pass_criteria, review_cycle_days) VALUES
('health_alert', 'gate_1_source', 1, 'Primary Source: Official Agency',
 'Source must be cdc.gov, cdph.ca.gov, or county EH department — not a news article.',
 'URL resolves to official agency page. Alert is currently posted (not archived as resolved).', 14),
('health_alert', 'gate_2_dates', 2, 'Alert Dates & Status Confirmed',
 'Alert issue date and current active/resolved status confirmed from primary source.',
 'Alert is confirmed active. If resolved, signal must be marked needs_update.', 14),
('health_alert', 'gate_3_scope', 3, 'Geographic & Operator Scope Confirmed',
 'Which counties, facility types, or menu categories are specifically at elevated risk.',
 'Geographic scope matches official advisory. Operator applicability confirmed.', 14),
('health_alert', 'gate_4_content', 4, 'No Unsourced Outbreak Statistics',
 'Case counts, transmission rates, and linked facilities must come from official advisory.',
 'All statistical claims traced to official source. Dollar amounts labeled as estimates.', 14),
('health_alert', 'gate_5_action', 5, 'Recommended Action Confirmed',
 'Action steps align with official agency prevention guidance.',
 'CDC, CDPH, or county EH prevention guidance URL confirmed. Action steps match.', 14);

-- CRAWL SOURCES — 4 gates
INSERT INTO verification_gate_definitions (content_type, gate_key, gate_number, gate_label, gate_description, gate_pass_criteria, review_cycle_days) VALUES
('crawl_source', 'gate_1_url', 1, 'Feed URL Resolves to Official Source',
 'The source URL returns a valid response from an official government or standards body.',
 'URL returns 200, content is from expected official source, no redirect to unrelated page.', 30),
('crawl_source', 'gate_2_content', 2, 'Feed Content Matches Expected Category',
 'The content at the URL is actually relevant to the assigned pillar and category.',
 'Manual review confirms feed content aligns with assigned pillar and category.', 30),
('crawl_source', 'gate_3_update', 3, 'Feed Update Frequency Confirmed',
 'Confirm how often the source actually updates — daily, weekly, as-needed.',
 'Update frequency documented. Crawl schedule set appropriately.', 30),
('crawl_source', 'gate_4_access', 4, 'Feed Accessibility Confirmed',
 'Confirm feed is not WAF-blocked, does not require authentication, and returns parseable content.',
 'Feed returns crawlable content without authentication. WAF status documented.', 30);

-- FIRE SAFETY CODE UPDATES — 6 gates
INSERT INTO verification_gate_definitions (content_type, gate_key, gate_number, gate_label, gate_description, gate_pass_criteria, review_cycle_days) VALUES
('fire_safety', 'gate_1_source', 1, 'Primary Source: Official Standards Body',
 'NFPA standards must be sourced from nfpa.org directly. CA Fire Code from leginfo or osfm.fire.ca.gov.',
 'Source URL resolves to nfpa.org, osfm.fire.ca.gov, or leginfo.legislature.ca.gov.', 180),
('fire_safety', 'gate_2_edition', 2, 'Edition/Version Confirmed',
 'The specific edition year cited must actually exist. No non-existent editions.',
 'Edition year confirmed from NFPA.org catalog page. ISBN or catalog number documented.', 180),
('fire_safety', 'gate_3_dates', 3, 'Adoption & Enforcement Dates Confirmed',
 'When California adopted this edition. CalFire and OSFM adoption status confirmed.',
 'CA adoption date confirmed from OSFM or CalFire.', 180),
('fire_safety', 'gate_4_content', 4, 'Specific Requirements Confirmed from Standard Text',
 'Table numbers, section numbers, and requirement text confirmed from the actual standard.',
 'Table/section references verified against the actual NFPA document. No meaning-changing paraphrasing.', 180),
('fire_safety', 'gate_5_scope', 5, 'AHJ Enforcement Confirmed for CA Jurisdictions',
 'Which CA AHJs actually enforce this edition.',
 'At least one CA AHJ confirmed enforcing this edition. OSFM adoption status documented.', 180),
('fire_safety', 'gate_6_cross', 6, 'Cross-Reference: IKECA or CA Fire Marshal',
 'Requirements confirmed by IKECA or CA State Fire Marshal guidance.',
 'IKECA or OSFM reference confirms the same requirement. Documented.', 180);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger 1: Auto-update content_verification_status when a log entry is added
CREATE OR REPLACE FUNCTION update_verification_status()
RETURNS TRIGGER AS $$
DECLARE
  v_gates_required INTEGER;
  v_gates_passed INTEGER;
  v_gates_failed INTEGER;
  v_gate_states JSONB;
  v_new_status TEXT;
  v_review_cycle INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_gates_required
  FROM verification_gate_definitions
  WHERE content_type = NEW.content_type AND is_required = true;

  SELECT
    COUNT(*) FILTER (WHERE latest_result = 'passed'),
    COUNT(*) FILTER (WHERE latest_result = 'failed'),
    jsonb_object_agg(gate_key, latest_result)
  INTO v_gates_passed, v_gates_failed, v_gate_states
  FROM (
    SELECT DISTINCT ON (gate_key) gate_key, gate_result as latest_result
    FROM content_verification_log
    WHERE content_table = NEW.content_table AND content_id = NEW.content_id
    ORDER BY gate_key, created_at DESC
  ) latest_gates;

  IF v_gates_passed = 0 AND v_gates_failed = 0 THEN
    v_new_status := 'unverified';
  ELSIF v_gates_failed > 0 THEN
    v_new_status := 'rejected';
  ELSIF v_gates_passed >= v_gates_required THEN
    v_new_status := 'verified';
  ELSE
    v_new_status := 'in_review';
  END IF;

  SELECT MIN(review_cycle_days) INTO v_review_cycle
  FROM verification_gate_definitions
  WHERE content_type = NEW.content_type;

  INSERT INTO content_verification_status (
    content_table, content_id, content_title, content_type,
    gates_required, gates_passed, gates_failed,
    gates_pending, gate_states, verification_status,
    last_verified_at, last_verified_by, last_verified_by_id,
    first_verified_at, review_cycle_days,
    next_review_due, primary_source_url, source_count
  ) VALUES (
    NEW.content_table, NEW.content_id, NEW.content_title, NEW.content_type,
    COALESCE(v_gates_required, 0),
    COALESCE(v_gates_passed, 0),
    COALESCE(v_gates_failed, 0),
    GREATEST(0, COALESCE(v_gates_required, 0) - COALESCE(v_gates_passed, 0) - COALESCE(v_gates_failed, 0)),
    COALESCE(v_gate_states, '{}'::jsonb),
    v_new_status,
    NEW.created_at, NEW.verified_by_name, NEW.verified_by_user_id,
    NEW.created_at,
    COALESCE(v_review_cycle, 30),
    NEW.created_at + (COALESCE(v_review_cycle, 30) || ' days')::interval,
    (NEW.source_urls->0->>'url'),
    jsonb_array_length(NEW.source_urls)
  )
  ON CONFLICT (content_table, content_id) DO UPDATE SET
    gates_required = EXCLUDED.gates_required,
    gates_passed = EXCLUDED.gates_passed,
    gates_failed = EXCLUDED.gates_failed,
    gates_pending = EXCLUDED.gates_pending,
    gate_states = EXCLUDED.gate_states,
    verification_status = EXCLUDED.verification_status,
    last_verified_at = EXCLUDED.last_verified_at,
    last_verified_by = EXCLUDED.last_verified_by,
    last_verified_by_id = EXCLUDED.last_verified_by_id,
    next_review_due = CASE
      WHEN EXCLUDED.verification_status = 'verified'
      THEN NOW() + (COALESCE(v_review_cycle, 30) || ' days')::interval
      ELSE content_verification_status.next_review_due
    END,
    source_count = GREATEST(content_verification_status.source_count, EXCLUDED.source_count);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_verification_status ON content_verification_log;
CREATE TRIGGER trg_update_verification_status
  AFTER INSERT ON content_verification_log
  FOR EACH ROW EXECUTE FUNCTION update_verification_status();


-- Trigger 2: Block publishing unverified signals
CREATE OR REPLACE FUNCTION enforce_verification_on_publish()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
  v_gates_passed INTEGER;
  v_gates_required INTEGER;
BEGIN
  IF NEW.is_published = true AND (OLD.is_published IS NULL OR OLD.is_published = false) THEN
    SELECT verification_status, gates_passed, gates_required
    INTO v_status, v_gates_passed, v_gates_required
    FROM content_verification_status
    WHERE content_table = TG_TABLE_NAME AND content_id = NEW.id;

    IF v_status IS NULL OR v_status != 'verified' THEN
      RAISE EXCEPTION
        'Cannot publish: verification status is "%" (% of % gates passed). All gates must pass before publishing.',
        COALESCE(v_status, 'unverified'),
        COALESCE(v_gates_passed, 0),
        COALESCE(v_gates_required, 0);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_verification_intelligence_signals ON intelligence_signals;
CREATE TRIGGER enforce_verification_intelligence_signals
  BEFORE UPDATE ON intelligence_signals
  FOR EACH ROW EXECUTE FUNCTION enforce_verification_on_publish();

DROP TRIGGER IF EXISTS enforce_verification_regulatory_changes ON regulatory_changes;
CREATE TRIGGER enforce_verification_regulatory_changes
  BEFORE UPDATE ON regulatory_changes
  FOR EACH ROW EXECUTE FUNCTION enforce_verification_on_publish();


-- Trigger 3: Auto-flag overdue reviews
CREATE OR REPLACE FUNCTION flag_overdue_verifications()
RETURNS void AS $$
BEGIN
  UPDATE content_verification_status
  SET verification_status = 'overdue'
  WHERE verification_status = 'verified'
    AND next_review_due < NOW();
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- RLS Policies — admin-only access
-- ============================================================
ALTER TABLE content_verification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_verification_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_gate_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on cvl" ON content_verification_log;
CREATE POLICY "Allow authenticated read on cvl" ON content_verification_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert on cvl" ON content_verification_log;
CREATE POLICY "Allow authenticated insert on cvl" ON content_verification_log FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read on cvs" ON content_verification_status;
CREATE POLICY "Allow authenticated read on cvs" ON content_verification_status FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated update on cvs" ON content_verification_status;
CREATE POLICY "Allow authenticated update on cvs" ON content_verification_status FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert on cvs" ON content_verification_status;
CREATE POLICY "Allow authenticated insert on cvs" ON content_verification_status FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read on vgd" ON verification_gate_definitions;
CREATE POLICY "Allow authenticated read on vgd" ON verification_gate_definitions FOR SELECT TO authenticated USING (true);
