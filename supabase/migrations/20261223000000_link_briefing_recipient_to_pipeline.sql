ALTER TABLE county_briefing_recipients
  ADD COLUMN IF NOT EXISTS sales_pipeline_id uuid REFERENCES sales_pipeline(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cbr_sales_pipeline_id
  ON county_briefing_recipients (sales_pipeline_id);
