-- ============================================================
-- Sprint 1.3 — service_requests extensions
-- Adds request_subtype, service_code FK, service_configuration_id FK,
-- cadence change tracking, routing metadata, EvidLY/vendor decision
-- tracking. Status column is plain text (no enum) — no ALTER TYPE needed.
-- ============================================================

-- ── A. No status enum change needed ─────────────────────────
-- status is plain text with no CHECK constraint.
-- 'pending_evidly_admin' is just a new text value — no DDL required.


-- ── B. New columns on service_requests ──────────────────────

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS request_subtype text
    CHECK (request_subtype IN (
      'schedule', 'cadence_change', 'reschedule',
      'activate', 'deactivate', 'quote_request'
    ));

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS service_code text
    REFERENCES service_type_definitions(code);

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS service_configuration_id uuid
    REFERENCES service_configurations(id) ON DELETE SET NULL;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS current_cadence_days integer;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS proposed_cadence_days integer;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS proposed_visit_date timestamptz;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS is_floor_breach boolean NOT NULL DEFAULT false;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS routing_target text
    CHECK (routing_target IN ('evidly_admin', 'vendor_thread'));

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS routing_decided_at timestamptz;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS evidly_decision text
    CHECK (evidly_decision IN ('approved', 'denied') OR evidly_decision IS NULL);

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS evidly_decided_at timestamptz;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS evidly_decided_by_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS evidly_decision_note text;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS vendor_decision text
    CHECK (vendor_decision IN ('approved', 'denied', 'declined') OR vendor_decision IS NULL);

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS vendor_decided_at timestamptz;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS vendor_decision_note text;


-- ── C. Indexes for new lookups ──────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sr_request_subtype
  ON service_requests (request_subtype);

CREATE INDEX IF NOT EXISTS idx_sr_service_code
  ON service_requests (service_code);

CREATE INDEX IF NOT EXISTS idx_sr_service_config
  ON service_requests (service_configuration_id);

CREATE INDEX IF NOT EXISTS idx_sr_routing_target
  ON service_requests (routing_target);

CREATE INDEX IF NOT EXISTS idx_sr_floor_breach
  ON service_requests (is_floor_breach) WHERE is_floor_breach = true;

CREATE INDEX IF NOT EXISTS idx_sr_pending_evidly
  ON service_requests (status) WHERE status = 'pending_evidly_admin';


-- ── D. Done ─────────────────────────────────────────────────
