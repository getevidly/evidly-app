-- M8: Add missing FK constraint on location_service_schedules.vendor_id
-- Pre-check: 0 orphaned vendor_ids (verified 2026-05-11)

DO $$
DECLARE orphan_count integer;
BEGIN
  SELECT count(*) INTO orphan_count
  FROM location_service_schedules lss
  WHERE lss.vendor_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM vendors v WHERE v.id = lss.vendor_id);

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'ABORT: % orphaned vendor_ids in location_service_schedules. Fix before adding FK.', orphan_count;
  END IF;
END $$;

ALTER TABLE location_service_schedules
  ADD CONSTRAINT lss_vendor_id_fkey
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;
