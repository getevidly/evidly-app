-- M18: Trigger to maintain completed_count on location_service_schedules
-- Gap: G3 from ANSWER-LINE-PATTERN.md §8, part 2 (trigger)
-- Pre-condition: 0 rows in vendor_service_records — trigger will not fire on existing data
-- Pre-condition: M17 applied (completed_count column exists)
-- Join key: composite (organization_id, location_id, service_type_code) — no schedule_id FK exists

CREATE OR REPLACE FUNCTION fn_update_lss_completed_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE location_service_schedules
      SET completed_count = completed_count + 1,
          updated_at = now()
      WHERE organization_id = NEW.organization_id
        AND location_id = NEW.location_id
        AND service_type_code = NEW.service_type_code
        AND NEW.organization_id IS NOT NULL
        AND NEW.location_id IS NOT NULL
        AND NEW.service_type_code IS NOT NULL;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE location_service_schedules
      SET completed_count = GREATEST(0, completed_count - 1),
          updated_at = now()
      WHERE organization_id = OLD.organization_id
        AND location_id = OLD.location_id
        AND service_type_code = OLD.service_type_code
        AND OLD.organization_id IS NOT NULL
        AND OLD.location_id IS NOT NULL
        AND OLD.service_type_code IS NOT NULL;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_vsr_completed_count ON vendor_service_records;

CREATE TRIGGER trg_vsr_completed_count
  AFTER INSERT OR DELETE ON vendor_service_records
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_lss_completed_count();

COMMENT ON FUNCTION fn_update_lss_completed_count() IS
  'Maintains location_service_schedules.completed_count. Increments on VSR INSERT, decrements on VSR DELETE. Matches via composite key (organization_id, location_id, service_type_code). Ignores rows where any key column IS NULL.';
