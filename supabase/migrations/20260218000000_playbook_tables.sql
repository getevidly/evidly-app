-- ============================================================
-- Incident Response Playbooks — Database Tables
-- Adds: playbooks, steps, checklists, activations, responses,
--        photos, food disposition, notifications, vendor contacts,
--        insurance claims, templates
-- 12 tables with RLS enabled, indexes on FKs and status columns
-- ============================================================

-- ── Helper: updated_at trigger function (idempotent) ────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 1. Playbooks ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS playbooks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid,
  title               text NOT NULL,
  description         text,
  category            text,
  severity            text,
  icon                text,
  color               text,
  regulatory_basis    text,
  estimated_minutes   integer,
  status              text NOT NULL DEFAULT 'published',
  version             integer NOT NULL DEFAULT 1,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_playbooks_org        ON playbooks (org_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_status     ON playbooks (status);
CREATE INDEX IF NOT EXISTS idx_playbooks_category   ON playbooks (category);
CREATE INDEX IF NOT EXISTS idx_playbooks_created_by ON playbooks (created_by);

CREATE TRIGGER trg_playbooks_updated_at
  BEFORE UPDATE ON playbooks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. Playbook Steps ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS playbook_steps (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id           uuid NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  step_number           integer NOT NULL,
  title                 text NOT NULL,
  description           text,
  critical_warning      text,
  regulatory_reference  text,
  photo_required        boolean NOT NULL DEFAULT false,
  photo_prompt          text,
  note_prompt           text,
  timer_minutes         integer,
  require_signature     boolean NOT NULL DEFAULT false,
  require_temperature   boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playbook_steps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_playbook_steps_playbook ON playbook_steps (playbook_id, step_number);

-- ── 3. Playbook Step Checklist Items ────────────────────────

CREATE TABLE IF NOT EXISTS playbook_step_checklist_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id     uuid NOT NULL REFERENCES playbook_steps(id) ON DELETE CASCADE,
  label       text NOT NULL,
  required    boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0
);

ALTER TABLE playbook_step_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_checklist_items_step ON playbook_step_checklist_items (step_id, sort_order);

-- ── 4. Playbook Activations ────────────────────────────────

CREATE TABLE IF NOT EXISTS playbook_activations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id           uuid NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  org_id                uuid,
  location_id           uuid,
  status                text NOT NULL DEFAULT 'active',
  severity              text,
  initiated_by          uuid REFERENCES auth.users(id),
  initiated_at          timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  current_step_number   integer NOT NULL DEFAULT 1,
  notes                 text,
  report_generated      boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playbook_activations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activations_playbook    ON playbook_activations (playbook_id);
CREATE INDEX IF NOT EXISTS idx_activations_org         ON playbook_activations (org_id);
CREATE INDEX IF NOT EXISTS idx_activations_location    ON playbook_activations (location_id);
CREATE INDEX IF NOT EXISTS idx_activations_status      ON playbook_activations (status);
CREATE INDEX IF NOT EXISTS idx_activations_initiated   ON playbook_activations (initiated_by);

CREATE TRIGGER trg_playbook_activations_updated_at
  BEFORE UPDATE ON playbook_activations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. Playbook Step Responses ─────────────────────────────

CREATE TABLE IF NOT EXISTS playbook_step_responses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id       uuid NOT NULL REFERENCES playbook_activations(id) ON DELETE CASCADE,
  step_id             uuid NOT NULL REFERENCES playbook_steps(id) ON DELETE CASCADE,
  step_number         integer NOT NULL,
  status              text NOT NULL DEFAULT 'pending',
  started_at          timestamptz,
  completed_at        timestamptz,
  skipped             boolean NOT NULL DEFAULT false,
  skip_reason         text,
  notes               text,
  temperature_reading decimal,
  signature_data      text,
  completed_by        uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playbook_step_responses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_step_responses_activation ON playbook_step_responses (activation_id, step_number);
CREATE INDEX IF NOT EXISTS idx_step_responses_step       ON playbook_step_responses (step_id);
CREATE INDEX IF NOT EXISTS idx_step_responses_status     ON playbook_step_responses (status);

-- ── 6. Playbook Step Photos ────────────────────────────────

CREATE TABLE IF NOT EXISTS playbook_step_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES playbook_step_responses(id) ON DELETE CASCADE,
  photo_url   text NOT NULL,
  caption     text,
  taken_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playbook_step_photos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_step_photos_response ON playbook_step_photos (response_id);

-- ── 7. Playbook Step Checklist Responses ────────────────────

CREATE TABLE IF NOT EXISTS playbook_step_checklist_responses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id       uuid NOT NULL REFERENCES playbook_step_responses(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES playbook_step_checklist_items(id) ON DELETE CASCADE,
  checked           boolean NOT NULL DEFAULT false,
  checked_at        timestamptz,
  checked_by        uuid REFERENCES auth.users(id)
);

ALTER TABLE playbook_step_checklist_responses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_checklist_responses_response ON playbook_step_checklist_responses (response_id);
CREATE INDEX IF NOT EXISTS idx_checklist_responses_item     ON playbook_step_checklist_responses (checklist_item_id);

-- ── 8. Playbook Food Disposition ────────────────────────────

CREATE TABLE IF NOT EXISTS playbook_food_disposition (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id       uuid NOT NULL REFERENCES playbook_activations(id) ON DELETE CASCADE,
  food_name           text NOT NULL,
  category            text,
  quantity            decimal,
  unit                text,
  cost_per_unit       decimal,
  current_temp        decimal,
  time_in_danger_zone decimal,
  decision            text,
  decided_by          uuid REFERENCES auth.users(id),
  decided_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playbook_food_disposition ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_food_disposition_activation ON playbook_food_disposition (activation_id);

-- ── 9. Playbook Notifications ──────────────────────────────

CREATE TABLE IF NOT EXISTS playbook_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id   uuid NOT NULL REFERENCES playbook_activations(id) ON DELETE CASCADE,
  type            text NOT NULL,
  recipient_id    uuid REFERENCES auth.users(id),
  message         text,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz
);

ALTER TABLE playbook_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_activation ON playbook_notifications (activation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient  ON playbook_notifications (recipient_id);

-- ── 10. Playbook Vendor Contacts ────────────────────────────

CREATE TABLE IF NOT EXISTS playbook_vendor_contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id   uuid NOT NULL REFERENCES playbook_activations(id) ON DELETE CASCADE,
  vendor_name     text NOT NULL,
  contact_name    text,
  phone           text,
  ticket_number   text,
  response        text,
  contacted_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playbook_vendor_contacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vendor_contacts_activation ON playbook_vendor_contacts (activation_id);

-- ── 11. Playbook Insurance Claims ───────────────────────────

CREATE TABLE IF NOT EXISTS playbook_insurance_claims (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id   uuid NOT NULL REFERENCES playbook_activations(id) ON DELETE CASCADE,
  claim_number    text,
  carrier         text,
  deductible      decimal,
  total_loss      decimal,
  status          text NOT NULL DEFAULT 'pending',
  filed_at        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playbook_insurance_claims ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_insurance_claims_activation ON playbook_insurance_claims (activation_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status     ON playbook_insurance_claims (status);

-- ── 12. Playbook Templates ──────────────────────────────────

CREATE TABLE IF NOT EXISTS playbook_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id     uuid NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  is_system       boolean NOT NULL DEFAULT false,
  category        text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playbook_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_templates_playbook ON playbook_templates (playbook_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON playbook_templates (category);

-- ============================================================
-- End of Incident Response Playbooks migration
-- ============================================================
