-- MOBILE-EMOTIONAL-01: Push subscriptions + Shift handoffs
-- Requested explicitly in MOBILE-EMOTIONAL-01 prompt

-- ── Push subscriptions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Shift handoffs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_handoffs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     uuid REFERENCES locations(id),
  shift_date      date NOT NULL,
  shift_name      text,
  handed_off_by   uuid REFERENCES auth.users(id),
  notes           text,
  temp_count      int DEFAULT 0,
  checklist_count int DEFAULT 0,
  ca_resolved     int DEFAULT 0,
  open_items      jsonb,
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE shift_handoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users in org can read shift handoffs" ON shift_handoffs;
CREATE POLICY "Users in org can read shift handoffs"
  ON shift_handoffs
  FOR SELECT
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN user_profiles up ON up.organization_id = l.organization_id
      WHERE up.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create shift handoffs" ON shift_handoffs;
CREATE POLICY "Users can create shift handoffs"
  ON shift_handoffs
  FOR INSERT
  WITH CHECK (auth.uid() = handed_off_by);
