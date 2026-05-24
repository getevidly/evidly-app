-- Cooldown v2: accountability — who's responsible for monitoring
ALTER TABLE cooldown_events
  ADD COLUMN assigned_to uuid REFERENCES user_profiles(id);

CREATE INDEX idx_cooldown_events_assigned_to ON cooldown_events(assigned_to);
