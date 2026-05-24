-- Cached temperature pattern analysis results
CREATE TABLE temperature_pattern_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  facility_id uuid,
  window_days integer NOT NULL,
  readings_count integer NOT NULL,
  tier integer NOT NULL DEFAULT 0,
  patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_disclaimer text NOT NULL,
  ai_summarized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX idx_tpa_org_window
  ON temperature_pattern_analysis(organization_id, window_days, created_at DESC);
