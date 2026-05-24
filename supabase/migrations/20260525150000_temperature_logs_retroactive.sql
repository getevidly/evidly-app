-- Retroactive entry audit trail for temperature_logs
ALTER TABLE temperature_logs
  ADD COLUMN logged_retroactively boolean NOT NULL DEFAULT false,
  ADD COLUMN retroactive_reason text,
  ADD COLUMN retroactive_logged_at timestamptz;

CREATE INDEX idx_temperature_logs_retroactive
  ON temperature_logs(equipment_id, logged_retroactively)
  WHERE logged_retroactively = true;
