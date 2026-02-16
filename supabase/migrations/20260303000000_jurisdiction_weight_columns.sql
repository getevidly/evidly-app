-- ═══════════════════════════════════════════════════════════════════════
-- JURISDICTION INTELLIGENCE — JI-3: Scoring Engine Weight Columns
-- Adds pillar and sub-component weights to jurisdictions table
-- These vary per jurisdiction — nothing is hardcoded in the scoring engine
-- ═══════════════════════════════════════════════════════════════════════

-- Pillar weights: how much food vs fire matters in THIS jurisdiction
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS food_safety_weight NUMERIC DEFAULT 60;
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS fire_safety_weight NUMERIC DEFAULT 40;

-- Sub-component weights: how much ops vs docs matters in THIS jurisdiction
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS ops_weight NUMERIC DEFAULT 60;
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS docs_weight NUMERIC DEFAULT 40;

-- Yosemite/NPS: federal overlay means fire is weighted more heavily
UPDATE jurisdictions SET fire_safety_weight = 50, food_safety_weight = 50
WHERE county = 'Mariposa' AND notes LIKE '%Yosemite%';

-- Santa Clara: heavy weighted majors means ops matters more
UPDATE jurisdictions SET ops_weight = 70, docs_weight = 30
WHERE county = 'Santa Clara' AND scoring_type = 'heavy_weighted';
