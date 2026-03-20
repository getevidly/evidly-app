-- VOICE-01: Add source column to temperature_logs and corrective_actions
-- Tracks whether entry came from voice, manual, or other input methods

ALTER TABLE temperature_logs
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  CHECK (source IN ('manual', 'voice', 'iot', 'qr', 'simulated'));

ALTER TABLE corrective_actions
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  CHECK (source IN ('manual', 'voice', 'checklist', 'inspection', 'ai'));
