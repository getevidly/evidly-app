-- Drop client_intelligence_feed — confirmed dead.
-- 0 rows, writer (intelligence-deliver) explicitly removed,
-- superseded by intelligence_signals.
-- No .from('client_intelligence_feed') references in codebase.

-- Pre-drop guard: abort if any rows exist
DO $$
BEGIN
  IF (SELECT count(*) FROM client_intelligence_feed) > 0 THEN
    RAISE EXCEPTION 'client_intelligence_feed is not empty — aborting drop';
  END IF;
END $$;

DROP TABLE IF EXISTS client_intelligence_feed;
