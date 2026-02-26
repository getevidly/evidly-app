-- ═══════════════════════════════════════════════════════════════════════
-- JURISDICTION SEO — Phase 5: Public distribution + data versioning
-- Adds anon RLS for public compliance pages
-- Adds data versioning columns for JIE crawl tracking
-- ═══════════════════════════════════════════════════════════════════════

-- ── Anon read policy: public jurisdiction pages ──
CREATE POLICY "Jurisdictions readable by anon"
  ON jurisdictions FOR SELECT
  TO anon
  USING (is_active = true);

-- ── Data versioning columns ──
ALTER TABLE jurisdictions
  ADD COLUMN IF NOT EXISTS data_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crawl_confidence TEXT DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_jurisdictions_data_version ON jurisdictions(data_version);

-- Backfill existing records
UPDATE jurisdictions SET data_version = 1, crawl_confidence = 'medium' WHERE data_version IS NULL;
