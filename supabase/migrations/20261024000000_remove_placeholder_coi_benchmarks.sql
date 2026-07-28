-- Remove placeholder COI benchmark rows so all segments (including casual dining)
-- fall back to count-only mode until real benchmarks are finalized.
-- The 6 placeholder rows were seeded in 20260705174005_coi_benchmarks.sql with
-- fabricated dollar ranges sourced as "PLACEHOLDER — pending report."
-- useWhatsAtRisk already handles the empty-benchmarks case as count-only mode.

DELETE FROM coi_benchmarks
WHERE is_placeholder = true
  AND version = 'v1-placeholder';
