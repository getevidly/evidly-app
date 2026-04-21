-- Demo Sessions table — tracks personalized demo launches from admin Demo Launcher
CREATE TABLE IF NOT EXISTS demo_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_name  TEXT NOT NULL,
  company        TEXT NOT NULL,
  counties       TEXT[],
  industry       TEXT,
  location_count INTEGER,
  notes          TEXT,
  launched_by    TEXT,
  launched_at    TIMESTAMPTZ DEFAULT now(),
  status         TEXT DEFAULT 'active',
  converted      BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_sessions_staff" ON demo_sessions;
CREATE POLICY "demo_sessions_staff" ON demo_sessions FOR ALL
  USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com' OR auth.role() = 'service_role');
