-- ═══════════════════════════════════════════════════════════════════════════
-- FIRE-FIX-04: Remove incorrect casino monthly hood cleaning override
--
-- FIRE-FIX-02 and AZ-FIRE-01 set hood_cleaning_frequency_override: "monthly"
-- on all 16 tribal casino jurisdictions with reason "24-hour high-volume
-- casino operations."
--
-- This is WRONG. NFPA 96-2024 Table 12.4 determines cleaning frequency by
-- COOKING TYPE, not facility type. A casino with 5 food outlets might have:
--   Steakhouse with wood-fired grill → Monthly (solid fuel)
--   Buffet with charbroilers 24h     → Quarterly (high volume)
--   Café with standard cooking       → Semi-annually (moderate volume)
--   Bar with pizza oven              → Monthly (solid fuel)
--   Coffee shop                      → Annually (low volume)
--
-- Each outlet gets its own frequency based on what it cooks. There is no
-- blanket "casino = monthly" rule in NFPA 96.
-- ═══════════════════════════════════════════════════════════════════════════

-- Remove hood_cleaning_frequency_override and hood_cleaning_override_reason
-- from all tribal jurisdictions
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config
  - 'hood_cleaning_frequency_override'
  - 'hood_cleaning_override_reason'
WHERE governmental_level = 'tribal'
  AND fire_jurisdiction_config IS NOT NULL
  AND fire_jurisdiction_config ? 'hood_cleaning_frequency_override';

-- Safety check: remove from any non-tribal that may also have it
UPDATE jurisdictions
SET fire_jurisdiction_config = fire_jurisdiction_config
  - 'hood_cleaning_frequency_override'
  - 'hood_cleaning_override_reason'
WHERE governmental_level != 'tribal'
  AND fire_jurisdiction_config IS NOT NULL
  AND fire_jurisdiction_config ? 'hood_cleaning_frequency_override';
