-- ═══════════════════════════════════════════════════════════════════════
-- HOOD CLEANING LOCAL OVERRIDE
-- Top-level JSONB column on jurisdictions, parallel to hood_cleaning_default.
-- NOT inside fire_jurisdiction_config (which is in HASH_FIELDS and would
-- lapse approvals on every override edit).
--
-- Shape:
--   {
--     "minimum_frequency": "semi_annual",
--     "ordinance_citation": "SFFC §609.3.3.1",
--     "verification_status": "verified" | "claimed_unverified"
--   }
--
-- Renders in briefing email ONLY when verification_status = 'verified'.
-- Ships empty — no county data written in this migration.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE jurisdictions
  ADD COLUMN IF NOT EXISTS hood_cleaning_local_override JSONB DEFAULT NULL;

COMMENT ON COLUMN jurisdictions.hood_cleaning_local_override IS
  'Local fire override for hood cleaning minimum frequency. '
  'Shape: { minimum_frequency, ordinance_citation, verification_status }. '
  'Only renders in briefing email when verification_status = verified.';
