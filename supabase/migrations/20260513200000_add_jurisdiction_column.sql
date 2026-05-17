-- Add jurisdiction column to organizations for signup county/jurisdiction persistence.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS jurisdiction text;
