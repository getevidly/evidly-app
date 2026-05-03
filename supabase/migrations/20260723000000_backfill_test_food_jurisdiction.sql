-- Migration: [3d-X-8a] backfill location_jurisdictions for Test Food
-- Anchors "Test Food — Main Kitchen" to Merced County Environmental Health
-- (food_safety layer → CalCode framework). Manual pre-launch backfill to
-- unblock 3d-5c useFrameworkProcessCategories hook. Auto-link via
-- linkJurisdictionToLocation in Onboarding.tsx step 3 deferred to 3d-X-8b.

INSERT INTO location_jurisdictions (
  location_id,
  jurisdiction_id,
  jurisdiction_layer,
  is_most_restrictive,
  auto_detected,
  override_reason
)
SELECT
  '5b9a9960-462c-4d29-a9cd-38bbca3d157e'::uuid,
  '81e6c154-dd33-4499-8344-1dcf2f7fe5fa'::uuid,
  'food_safety',
  true,
  false,
  'Manual backfill — Test Food anchored to Merced County for pre-launch wizard testing (sprint 3d-X-8a)'
WHERE NOT EXISTS (
  SELECT 1 FROM location_jurisdictions
  WHERE location_id = '5b9a9960-462c-4d29-a9cd-38bbca3d157e'
    AND jurisdiction_id = '81e6c154-dd33-4499-8344-1dcf2f7fe5fa'
    AND jurisdiction_layer = 'food_safety'
);
