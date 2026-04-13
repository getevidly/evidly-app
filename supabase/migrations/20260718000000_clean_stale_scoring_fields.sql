-- ═══════════════════════════════════════════════════════════════════════════
-- SCORETABLE-DISPLAY-AUDIT FIX 6: Clean stale scoring fields
--
-- Removes numeric scoring fields (pass_threshold, max_score, fail_below,
-- passing_threshold, scoring_method) from grading_config JSONB on
-- jurisdictions whose grading_type is non-numeric (advisory, pass_fail,
-- violation_report_only, inspection_report, report_only, etc.)
--
-- These fields should not exist on non-scoring jurisdictions.
-- ═══════════════════════════════════════════════════════════════════════════

-- CA advisory tribal — remove passing_threshold, max_score, fail_below
UPDATE jurisdictions
SET grading_config = grading_config
  - 'passing_threshold'
  - 'max_score'
  - 'fail_below'
  - 'scoring_method'
  - 'pass_threshold'
WHERE grading_type = 'advisory'
  AND grading_config IS NOT NULL
  AND (
    grading_config ? 'passing_threshold'
    OR grading_config ? 'max_score'
    OR grading_config ? 'fail_below'
    OR grading_config ? 'scoring_method'
    OR grading_config ? 'pass_threshold'
  );

-- OR pass_fail — remove pass_threshold (internal threshold, not a public score)
UPDATE jurisdictions
SET grading_config = grading_config
  - 'pass_threshold'
  - 'passing_threshold'
  - 'max_score'
  - 'fail_below'
  - 'scoring_method'
WHERE grading_type IN ('pass_fail', 'pass_fail_placard', 'pass_conditional_closed')
  AND grading_config IS NOT NULL
  AND (
    grading_config ? 'pass_threshold'
    OR grading_config ? 'passing_threshold'
    OR grading_config ? 'max_score'
    OR grading_config ? 'fail_below'
    OR grading_config ? 'scoring_method'
  );

-- violation_report_only, inspection_report, report_only — same cleanup
UPDATE jurisdictions
SET grading_config = grading_config
  - 'pass_threshold'
  - 'passing_threshold'
  - 'max_score'
  - 'fail_below'
  - 'scoring_method'
WHERE grading_type IN ('violation_report_only', 'inspection_report', 'report_only')
  AND grading_config IS NOT NULL
  AND (
    grading_config ? 'pass_threshold'
    OR grading_config ? 'passing_threshold'
    OR grading_config ? 'max_score'
    OR grading_config ? 'fail_below'
    OR grading_config ? 'scoring_method'
  );
