-- ═══════════════════════════════════════════════════════════════════════
-- FK CHAIN BACKFILL — Phase 6: Link derived tables to compliance_score_snapshots
-- Fills score_snapshot_id gaps on all tables that should reference snapshots
-- Uses nearest-date matching: find the latest snapshot <= the derived record's date
-- All operations guarded for missing tables
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. insurance_risk_scores ═══
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insurance_risk_scores')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_score_snapshots')
  THEN
    UPDATE insurance_risk_scores irs
    SET score_snapshot_id = (
      SELECT css.id FROM compliance_score_snapshots css
      WHERE css.location_id = irs.location_id
        AND css.score_date <= irs.calculated_at::date
      ORDER BY css.score_date DESC
      LIMIT 1
    )
    WHERE irs.score_snapshot_id IS NULL
      AND EXISTS (
        SELECT 1 FROM compliance_score_snapshots css
        WHERE css.location_id = irs.location_id
      );
  END IF;
END $$;

-- ═══ 2. location_jurisdiction_scores ═══
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_jurisdiction_scores')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_score_snapshots')
  THEN
    UPDATE location_jurisdiction_scores ljs
    SET score_snapshot_id = (
      SELECT css.id FROM compliance_score_snapshots css
      WHERE css.location_id = ljs.location_id
        AND css.score_date <= ljs.calculated_at::date
      ORDER BY css.score_date DESC
      LIMIT 1
    )
    WHERE ljs.score_snapshot_id IS NULL
      AND EXISTS (
        SELECT 1 FROM compliance_score_snapshots css
        WHERE css.location_id = ljs.location_id
      );
  END IF;
END $$;

-- ═══ 3. location_benchmark_ranks ═══
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_benchmark_ranks')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_score_snapshots')
  THEN
    UPDATE location_benchmark_ranks lbr
    SET score_snapshot_id = (
      SELECT css.id FROM compliance_score_snapshots css
      WHERE css.location_id = lbr.location_id
        AND css.score_date <= lbr.snapshot_date
      ORDER BY css.score_date DESC
      LIMIT 1
    )
    WHERE lbr.score_snapshot_id IS NULL
      AND EXISTS (
        SELECT 1 FROM compliance_score_snapshots css
        WHERE css.location_id = lbr.location_id
      );
  END IF;
END $$;

-- ═══ 4. score_calculations ═══
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'score_calculations' AND column_name = 'snapshot_id'
  ) AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_score_snapshots')
  THEN
    UPDATE score_calculations sc
    SET snapshot_id = (
      SELECT css.id FROM compliance_score_snapshots css
      WHERE css.location_id = (sc.inputs_json->>'location_id')::uuid
        AND css.score_date <= sc.created_at::date
      ORDER BY css.score_date DESC
      LIMIT 1
    )
    WHERE sc.snapshot_id IS NULL
      AND sc.inputs_json->>'location_id' IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM compliance_score_snapshots css
        WHERE css.location_id = (sc.inputs_json->>'location_id')::uuid
      );
  END IF;
END $$;

-- ═══ Verification query (run manually after migration) ═══
-- SELECT 'insurance_risk_scores' AS tbl, COUNT(*) AS total, COUNT(score_snapshot_id) AS linked, COUNT(*) - COUNT(score_snapshot_id) AS gaps FROM insurance_risk_scores
-- UNION ALL SELECT 'location_jurisdiction_scores', COUNT(*), COUNT(score_snapshot_id), COUNT(*) - COUNT(score_snapshot_id) FROM location_jurisdiction_scores
-- UNION ALL SELECT 'location_benchmark_ranks', COUNT(*), COUNT(score_snapshot_id), COUNT(*) - COUNT(score_snapshot_id) FROM location_benchmark_ranks
-- UNION ALL SELECT 'score_calculations', COUNT(*), COUNT(snapshot_id), COUNT(*) - COUNT(snapshot_id) FROM score_calculations;
