-- ============================================================
-- Service Cost Benchmarks — Materialized View
-- ============================================================
-- Aggregates price_charged from vendor_service_records by
-- jurisdiction + safeguard_type for percentile benchmarking.
-- Requires 50+ samples per group for statistical significance.
-- Schedule nightly refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY service_cost_benchmarks;
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS service_cost_benchmarks AS
SELECT
  l.jurisdiction_id,
  sr.safeguard_type AS service_category,
  COUNT(*)::int AS sample_size,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY sr.price_charged) AS p25,
  PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY sr.price_charged) AS p50,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY sr.price_charged) AS p75,
  MAX(sr.service_date) AS last_data_point
FROM vendor_service_records sr
JOIN locations l ON l.id = sr.location_id
WHERE sr.price_charged IS NOT NULL
  AND sr.is_sample = false
  AND sr.service_date >= now() - interval '24 months'
GROUP BY l.jurisdiction_id, sr.safeguard_type
HAVING COUNT(*) >= 50;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_cost_benchmarks_unique
  ON service_cost_benchmarks(jurisdiction_id, service_category);
