-- Allow authenticated users to read crawl_runs
-- The existing "admin_only" policy restricts to @getevidly.com emails,
-- which blocks the admin UI (anon key has no matching JWT).
-- This policy grants SELECT to any authenticated user.

DROP POLICY IF EXISTS "Authenticated users can read crawl_runs" ON crawl_runs;
CREATE POLICY "Authenticated users can read crawl_runs"
ON crawl_runs FOR SELECT
TO authenticated
USING (true);
