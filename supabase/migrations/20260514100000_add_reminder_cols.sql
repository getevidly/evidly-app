-- Add reminder tracking columns to service_requests
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS reminders_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;
