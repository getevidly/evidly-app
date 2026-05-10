-- Rename incidents.pillar → incidents.category and expand to 3 values
-- Also rename incident_templates.category value 'operational' → 'facility_services'

-- 1. Rename column
ALTER TABLE incidents RENAME COLUMN pillar TO category;

-- 2. Drop old constraint, add new 3-value constraint
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_pillar_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_category_check
  CHECK (category IN ('food_safety', 'fire_safety', 'facility_services'));

-- 3. Index for category filter queries
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);

-- 4. Rename 'operational' → 'facility_services' in incident_templates.category
UPDATE incident_templates SET category = 'facility_services' WHERE category = 'operational';

-- 5. Expand incident_templates.pillar CHECK to include facility_services
ALTER TABLE incident_templates DROP CONSTRAINT IF EXISTS incident_templates_pillar_check;
ALTER TABLE incident_templates ADD CONSTRAINT incident_templates_pillar_check
  CHECK (pillar IN ('food_safety', 'fire_safety', 'facility_services'));
