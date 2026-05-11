-- M9b: Backfill vendor_id from vendor_name and optionally constrain NOT NULL
-- IMPORTANT: Run ONLY after M9a is applied AND all new inserts populate vendor_id
--
-- Today: 0 rows in vendor_service_records, so backfill is a no-op.
-- This migration exists for when rows accumulate before NOT NULL is enforced.

-- Step 1: Best-effort backfill from vendor_name → vendors.name match (case-insensitive, same org)
UPDATE vendor_service_records vsr
SET vendor_id = v.id
FROM vendors v
WHERE vsr.vendor_id IS NULL
  AND vsr.organization_id = v.organization_id
  AND lower(trim(vsr.vendor_name)) = lower(trim(v.name));

-- Step 2: Report unmatched rows (vendor_id still NULL but vendor_name is not null)
-- DO NOT add NOT NULL constraint if unmatched rows exist
DO $$
DECLARE unmatched integer;
BEGIN
  SELECT count(*) INTO unmatched
  FROM vendor_service_records
  WHERE vendor_id IS NULL AND vendor_name IS NOT NULL AND vendor_name <> '';

  IF unmatched > 0 THEN
    RAISE WARNING 'M9b: % rows have vendor_name but no matching vendors.id. Manual review required. NOT NULL constraint NOT applied.', unmatched;
  ELSE
    RAISE NOTICE 'M9b: All rows matched or empty. NOT NULL constraint is safe to apply in a follow-up.';
  END IF;
END $$;

-- Step 3: NOT NULL constraint — UNCOMMENT ONLY after unmatched = 0 verified
-- ALTER TABLE vendor_service_records ALTER COLUMN vendor_id SET NOT NULL;
