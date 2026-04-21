-- PSE-IRR-PROGRESS-01: Allow authenticated users to read their own IRR submissions
-- Matches by email claim in JWT — the same email used during Operations Check submission

DROP POLICY IF EXISTS "Users read own IRR submissions by email" ON irr_submissions;
CREATE POLICY "Users read own IRR submissions by email"
ON irr_submissions FOR SELECT
TO authenticated
USING (email = (auth.jwt() ->> 'email'));
