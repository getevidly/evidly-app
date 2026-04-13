-- ============================================================================
-- SIGNAL-NOTIFY-01: Intelligence Signal Notification Trigger
--
-- When Arthur publishes a signal (is_published flips to true), this trigger
-- creates a notification row for every organization so operators see it in
-- the existing NotificationCenter bell + realtime pipeline.
-- ============================================================================

-- ── 1. Add signal reference columns to notifications table ──────────
DO $$ BEGIN
  ALTER TABLE notifications
    ADD COLUMN signal_id UUID REFERENCES intelligence_signals(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notifications
    ADD COLUMN cic_pillar TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Index for deduplication: one notification per signal per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_signal_org
  ON notifications (signal_id, organization_id)
  WHERE signal_id IS NOT NULL;

-- ── 2. Ensure risk level columns exist on intelligence_signals ──────
-- IntelligenceAdmin writes these on publish; some may already exist
-- from earlier migrations. Safe to re-add with IF NOT EXISTS pattern.
DO $$ BEGIN
  ALTER TABLE intelligence_signals
    ADD COLUMN revenue_risk_level TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE intelligence_signals
    ADD COLUMN liability_risk_level TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE intelligence_signals
    ADD COLUMN cost_risk_level TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE intelligence_signals
    ADD COLUMN operational_risk_level TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ── 3. Trigger function: insert notifications on signal publish ─────
CREATE OR REPLACE FUNCTION notify_on_signal_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when is_published flips from false/null to true
  IF NEW.is_published = true AND (OLD.is_published IS DISTINCT FROM true) THEN
    INSERT INTO notifications (
      organization_id, signal_id, type, title, body, action_url, cic_pillar, priority
    )
    SELECT
      o.id,
      NEW.id,
      'intelligence_signal',
      NEW.title,
      COALESCE(NEW.summary, NEW.ai_summary, NEW.content_summary),
      '/insights/intelligence',
      NEW.cic_pillar,
      CASE
        WHEN COALESCE(NEW.revenue_risk_level,'none')   = 'critical'
          OR COALESCE(NEW.liability_risk_level,'none')  = 'critical'
          OR COALESCE(NEW.ai_urgency,'medium')          = 'critical'
          THEN 'critical'
        WHEN COALESCE(NEW.revenue_risk_level,'none')   = 'high'
          OR COALESCE(NEW.liability_risk_level,'none')  = 'high'
          OR COALESCE(NEW.ai_urgency,'medium')          = 'high'
          THEN 'high'
        WHEN COALESCE(NEW.cost_risk_level,'none')      = 'high'
          OR COALESCE(NEW.operational_risk_level,'none') = 'high'
          THEN 'medium'
        ELSE 'low'
      END
    FROM organizations o
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.signal_id = NEW.id AND n.organization_id = o.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Attach AFTER UPDATE trigger ──────────────────────────────────
-- (AFTER so it runs after the BEFORE verification trigger)
DROP TRIGGER IF EXISTS on_signal_published ON intelligence_signals;
CREATE TRIGGER on_signal_published
  AFTER UPDATE ON intelligence_signals
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_signal_publish();
