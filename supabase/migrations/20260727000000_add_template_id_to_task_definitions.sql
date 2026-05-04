-- Migration: I0.5 — add template_id to task_definitions
-- Records which template a task definition was created from.
-- Enables usage detection in From Template grid (I1/I2).
-- Nullable: definitions created From Scratch have no template binding.

ALTER TABLE task_definitions
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES task_definition_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_task_definitions_template_id
  ON task_definitions (organization_id, template_id)
  WHERE template_id IS NOT NULL;
