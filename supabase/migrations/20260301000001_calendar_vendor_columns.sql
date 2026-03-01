-- Add vendor and recurrence columns to calendar_events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS vendor_id UUID;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'one-time';

-- Vendor change audit trail
CREATE TABLE IF NOT EXISTS vendor_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  previous_vendor_id UUID,
  new_vendor_id UUID,
  reason TEXT NOT NULL,
  reason_details TEXT,
  scope TEXT NOT NULL DEFAULT 'single_event'
    CHECK (scope IN ('single_event', 'all_future')),
  calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_vendor_notified BOOLEAN DEFAULT false,
  new_vendor_notified BOOLEAN DEFAULT false
);

ALTER TABLE vendor_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage vendor changes in their org" ON vendor_changes
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX idx_vendor_changes_org ON vendor_changes(organization_id, changed_at DESC);
