-- Add food_batches table and food_batch_id FK columns.
-- Food is a first-class entity. One batch (e.g., "chicken delivered Monday
-- 7am") gets one food_batches row. Every reading on that food across its
-- lifecycle — received → storage → cooking → hot holding → cooldown →
-- reheating — links back via food_batch_id.
--
-- Inspector asks "show me everything that happened to this batch of chicken"
-- — one query on food_batch_id, one timeline.
--
-- food_batch_id is nullable on all three reading tables. Existing rows
-- (currently 0 in all three) stay NULL until the redesign UI links them.

CREATE TYPE food_batch_status AS ENUM (
  'received',
  'storage',
  'prep',
  'cooking',
  'hot_holding',
  'cold_holding',
  'cooling',
  'reheating',
  'served',
  'discarded'
);

CREATE TABLE food_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  food_item_name text NOT NULL,
  food_category text,
  batch_label text,
  batch_date date NOT NULL DEFAULT CURRENT_DATE,
  prepared_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  prepared_at timestamptz,
  current_status food_batch_status NOT NULL DEFAULT 'received',
  expiration_date date,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_batches_organization_id ON food_batches(organization_id);
CREATE INDEX idx_food_batches_location_id ON food_batches(location_id);
CREATE INDEX idx_food_batches_batch_date ON food_batches(batch_date DESC);
CREATE INDEX idx_food_batches_current_status ON food_batches(current_status);

ALTER TABLE food_batches ENABLE ROW LEVEL SECURITY;

-- No DELETE policy — food_batches use soft deletion via is_active = false.
-- Hard deletion would orphan linked readings (food_batch_id SET NULL),
-- losing the audit trail of what happened to a given batch. Soft delete
-- preserves the record for inspector audits and historical lookup.

CREATE POLICY food_batches_select ON food_batches FOR SELECT
  USING (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));
CREATE POLICY food_batches_insert ON food_batches FOR INSERT
  WITH CHECK (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));
CREATE POLICY food_batches_update ON food_batches FOR UPDATE
  USING (location_id IN (SELECT location_id FROM user_location_access WHERE user_id = auth.uid()));

-- Add food_batch_id FK columns to reading tables.
ALTER TABLE temperature_logs
  ADD COLUMN IF NOT EXISTS food_batch_id uuid REFERENCES food_batches(id) ON DELETE SET NULL;

ALTER TABLE cooldown_logs
  ADD COLUMN IF NOT EXISTS food_batch_id uuid REFERENCES food_batches(id) ON DELETE SET NULL;

ALTER TABLE receiving_temp_logs
  ADD COLUMN IF NOT EXISTS food_batch_id uuid REFERENCES food_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_temperature_logs_food_batch_id ON temperature_logs(food_batch_id);
CREATE INDEX IF NOT EXISTS idx_cooldown_logs_food_batch_id ON cooldown_logs(food_batch_id);
CREATE INDEX IF NOT EXISTS idx_receiving_temp_logs_food_batch_id ON receiving_temp_logs(food_batch_id);
