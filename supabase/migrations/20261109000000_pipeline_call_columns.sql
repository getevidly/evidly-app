-- ══════════════════════════════════════════════════════════════
-- Migration: add call-related columns to sales_pipeline
-- Purpose:   Outbound Calls tab captures phone, address, call
--            date, and call summary per prospect. Existing
--            contact_name / contact_title / contact_email columns
--            already cover name/title/email — no duplication.
--            All columns nullable, no backfill needed.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS contact_phone   TEXT;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS contact_address TEXT;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS call_date       DATE;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS call_summary    TEXT;
