-- ============================================================
-- ARTHUR: REVIEW THIS ENTIRE SCRIPT BEFORE RUNNING
-- Removes the 3 seed locations and ALL associated data
-- Run in Supabase SQL Editor (https://supabase.com/dashboard)
--
-- 55 tables with location_id / facility_id references:
--   36 CASCADE (auto-deleted)
--   13 SET NULL (location_id nullified, rows kept)
--    6 BLOCKING (must SET NULL manually before deleting locations)
--  +10 ORPHAN  (no FK, stale UUIDs — cleaned up explicitly)
-- ============================================================


-- ============================================================
-- STEP 1: IDENTIFY THE SEED LOCATIONS
-- Run this first to see their IDs and names:
-- ============================================================

SELECT id, name, address, city, state, status, created_at
FROM locations
ORDER BY created_at;

-- Look for locations named:
--   "Location 1", "Location 2", "Location 3"
--   OR "Downtown Kitchen", "Airport Cafe", "University Dining"
--   OR similar seed/test names
--
-- Copy their UUIDs and paste them below (replacing the placeholders).


-- ============================================================
-- STEP 2: SET THE SEED LOCATION IDS
-- Replace these 3 placeholders with the actual UUIDs from Step 1
-- ============================================================

-- UNCOMMENT and fill in:
-- \set seed1 '''PUT-UUID-1-HERE'''
-- \set seed2 '''PUT-UUID-2-HERE'''
-- \set seed3 '''PUT-UUID-3-HERE'''

-- For the Supabase SQL Editor (which doesn't support \set), use this pattern instead:
-- Copy the 3 UUIDs into the IN (...) clauses below.


-- ============================================================
-- STEP 3: PREVIEW — count rows that will be deleted/nulled
-- ============================================================

WITH seed_ids AS (
  SELECT id FROM locations
  WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  -- OR use: WHERE id IN ('SEED_ID_1', 'SEED_ID_2', 'SEED_ID_3')
)
SELECT 'locations' AS table_name, count(*) AS row_count FROM locations WHERE id IN (SELECT id FROM seed_ids)

-- ─── CASCADE tables (auto-deleted when location is deleted) ─────

-- Core tables (20260205003451, 20260204500000)
UNION ALL SELECT 'user_location_access (CASCADE)', count(*) FROM user_location_access WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'temp_logs (CASCADE)', count(*) FROM temp_logs WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'temperature_equipment (CASCADE)', count(*) FROM temperature_equipment WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'location_jurisdictions (CASCADE)', count(*) FROM location_jurisdictions WHERE location_id IN (SELECT id FROM seed_ids)

-- Temperature & checklist enhancements (20260205201922)
UNION ALL SELECT 'temp_check_completions (CASCADE)', count(*) FROM temp_check_completions WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'checklist_assignments (CASCADE)', count(*) FROM checklist_assignments WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'checklist_completions (CASCADE)', count(*) FROM checklist_completions WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'checklist_template_completions (CASCADE)', count(*) FROM checklist_template_completions WHERE location_id IN (SELECT id FROM seed_ids)

-- Receiving & cooldown (20260205215132)
UNION ALL SELECT 'receiving_temp_logs (CASCADE)', count(*) FROM receiving_temp_logs WHERE location_id IN (SELECT id FROM seed_ids)

-- Report subscriptions (20260205215738)
UNION ALL SELECT 'report_subscriptions (CASCADE)', count(*) FROM report_subscriptions WHERE location_id IN (SELECT id FROM seed_ids)

-- Jurisdiction scoring (20260210120000)
UNION ALL SELECT 'location_jurisdiction_scores (CASCADE)', count(*) FROM location_jurisdiction_scores WHERE location_id IN (SELECT id FROM seed_ids)

-- AI Copilot (20260210140000)
UNION ALL SELECT 'ai_insights (CASCADE)', count(*) FROM ai_insights WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'ai_corrective_actions (CASCADE)', count(*) FROM ai_corrective_actions WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'ai_weekly_digests (CASCADE)', count(*) FROM ai_weekly_digests WHERE location_id IN (SELECT id FROM seed_ids)

-- IoT sensors (20260210200000)
UNION ALL SELECT 'iot_sensors (CASCADE)', count(*) FROM iot_sensors WHERE location_id IN (SELECT id FROM seed_ids)

-- Sensor platform v2 (20260215000000)
UNION ALL SELECT 'sensor_integrations (CASCADE)', count(*) FROM sensor_integrations WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'sensor_devices (CASCADE)', count(*) FROM sensor_devices WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'sensor_readings (CASCADE)', count(*) FROM sensor_readings WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'sensor_alerts (CASCADE)', count(*) FROM sensor_alerts WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'sensor_webhooks (CASCADE)', count(*) FROM sensor_webhooks WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'sensor_csv_imports (CASCADE)', count(*) FROM sensor_csv_imports WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'sensor_door_events (CASCADE)', count(*) FROM sensor_door_events WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'sensor_cooling_logs (CASCADE)', count(*) FROM sensor_cooling_logs WHERE location_id IN (SELECT id FROM seed_ids)

-- Fire/Facility safety equipment (20260222000000)
UNION ALL SELECT 'fire_safety_equipment (CASCADE)', count(*) FROM fire_safety_equipment WHERE location_id IN (SELECT id FROM seed_ids)

-- Jurisdiction profiles (20260225000000)
UNION ALL SELECT 'location_jurisdiction_profiles (CASCADE)', count(*) FROM location_jurisdiction_profiles WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'jurisdiction_change_log (CASCADE)', count(*) FROM jurisdiction_change_log WHERE location_id IN (SELECT id FROM seed_ids)

-- Insurance risk API (20260227000000)
UNION ALL SELECT 'insurance_risk_scores (CASCADE)', count(*) FROM insurance_risk_scores WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'risk_score_shares (CASCADE)', count(*) FROM risk_score_shares WHERE location_id IN (SELECT id FROM seed_ids)

-- Daily checklists — alerts table (20260304000000, uses facility_id)
UNION ALL SELECT 'alerts (CASCADE via facility_id)', count(*) FROM alerts WHERE facility_id IN (SELECT id FROM seed_ids)

-- Training cert requirements (20260305000000, uses facility_id)
UNION ALL SELECT 'employee_certifications (CASCADE via facility_id)', count(*) FROM employee_certifications WHERE facility_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'training_records (CASCADE via facility_id)', count(*) FROM training_records WHERE facility_id IN (SELECT id FROM seed_ids)

-- Temperature QR & input method (20260306000000)
UNION ALL SELECT 'equipment_qr_codes (CASCADE)', count(*) FROM equipment_qr_codes WHERE location_id IN (SELECT id FROM seed_ids)

-- Temperature monitoring unified (20260307000000, uses facility_id)
UNION ALL SELECT 'temperature_logs (CASCADE via facility_id)', count(*) FROM temperature_logs WHERE facility_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'cooling_logs (CASCADE via facility_id)', count(*) FROM cooling_logs WHERE facility_id IN (SELECT id FROM seed_ids)

-- Vendor service reminders (20260308000000)
UNION ALL SELECT 'vendor_service_reminders (CASCADE)', count(*) FROM vendor_service_reminders WHERE location_id IN (SELECT id FROM seed_ids)

-- FOG compliance (20260402000000)
UNION ALL SELECT 'grease_trap_services (CASCADE)', count(*) FROM grease_trap_services WHERE location_id IN (SELECT id FROM seed_ids)


-- ─── SET NULL tables (location_id nullified, rows kept) ─────

UNION ALL SELECT 'documents (SET NULL)', count(*) FROM documents WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'tasks (SET NULL)', count(*) FROM tasks WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'incidents (SET NULL)', count(*) FROM incidents WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'calendar_events (SET NULL)', count(*) FROM calendar_events WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'compliance_photos (SET NULL)', count(*) FROM compliance_photos WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'ai_interaction_logs (SET NULL)', count(*) FROM ai_interaction_logs WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'haccp_plans (SET NULL via location_id)', count(*) FROM haccp_plans WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'haccp_corrective_actions (SET NULL)', count(*) FROM haccp_corrective_actions WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'insurance_share_links (SET NULL)', count(*) FROM insurance_share_links WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'frequency_change_log (SET NULL)', count(*) FROM frequency_change_log WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'vendor_document_notifications (SET NULL)', count(*) FROM vendor_document_notifications WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'corrective_action_templates (SET NULL)', count(*) FROM corrective_action_templates WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'corrective_actions (SET NULL)', count(*) FROM corrective_actions WHERE location_id IN (SELECT id FROM seed_ids)


-- ─── BLOCKING tables (NO CASCADE — must SET NULL before delete) ─────

-- Training LMS tables (20260217000000, location_id with no ON DELETE)
UNION ALL SELECT 'training_enrollments (BLOCKING)', count(*) FROM training_enrollments WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'training_certificates (BLOCKING)', count(*) FROM training_certificates WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'training_sb476_log (BLOCKING)', count(*) FROM training_sb476_log WHERE location_id IN (SELECT id FROM seed_ids)

-- Daily checklists module (20260304000000, facility_id added via ALTER TABLE, no ON DELETE)
UNION ALL SELECT 'checklist_templates (BLOCKING via facility_id)', count(*) FROM checklist_templates WHERE facility_id IN (SELECT id FROM seed_ids)

-- HACCP columns (20260328100000, facility_id added via ALTER TABLE, no ON DELETE)
UNION ALL SELECT 'haccp_plans (BLOCKING via facility_id)', count(*) FROM haccp_plans WHERE facility_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'haccp_monitoring_logs (BLOCKING via facility_id)', count(*) FROM haccp_monitoring_logs WHERE facility_id IN (SELECT id FROM seed_ids)


-- ─── ORPHAN tables (no FK constraint, but store location UUIDs) ─────
-- These won't block the delete but data becomes stale

UNION ALL SELECT 'location_benchmark_ranks (ORPHAN)', count(*) FROM location_benchmark_ranks WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'benchmark_badges (ORPHAN)', count(*) FROM benchmark_badges WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'insurance_score_history (ORPHAN)', count(*) FROM insurance_score_history WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'insurance_consent (ORPHAN)', count(*) FROM insurance_consent WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'insurance_reports (ORPHAN)', count(*) FROM insurance_reports WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'insurance_risk_factors (ORPHAN)', count(*) FROM insurance_risk_factors WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'service_completions (ORPHAN)', count(*) FROM service_completions WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'compliance_score_snapshots (ORPHAN)', count(*) FROM compliance_score_snapshots WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'risk_assessments (ORPHAN)', count(*) FROM risk_assessments WHERE location_id IN (SELECT id FROM seed_ids)
UNION ALL SELECT 'playbook_activations (ORPHAN)', count(*) FROM playbook_activations WHERE location_id IN (SELECT id FROM seed_ids)

ORDER BY table_name;


-- ============================================================
-- STEP 4: DELETE
-- Only run after reviewing Step 3 counts!
--
-- Order matters:
--   1. SET NULL on all 6 BLOCKING tables (no cascade)
--   2. DELETE orphan data (no FK, won't cascade)
--   3. DELETE FROM locations (cascades handle the 36 CASCADE tables)
-- ============================================================

BEGIN;

-- ── 4a. Clear the 6 BLOCKING tables (no cascade) ────────────
-- These would block the locations delete with a FK violation.
-- We SET NULL instead of DELETE to preserve the records.

-- Training LMS tables (location_id, no ON DELETE)
UPDATE training_sb476_log
  SET location_id = NULL
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

UPDATE training_certificates
  SET location_id = NULL
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

UPDATE training_enrollments
  SET location_id = NULL
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

-- Checklist templates (facility_id added via ALTER TABLE, no ON DELETE)
UPDATE checklist_templates
  SET facility_id = NULL
  WHERE facility_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

-- HACCP tables (facility_id added via ALTER TABLE, no ON DELETE)
UPDATE haccp_plans
  SET facility_id = NULL
  WHERE facility_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

UPDATE haccp_monitoring_logs
  SET facility_id = NULL
  WHERE facility_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );


-- ── 4b. Clean up ORPHAN tables (no FK, stale data) ──────────
-- These won't block the delete but leave dangling location UUIDs.

DELETE FROM location_benchmark_ranks
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

DELETE FROM benchmark_badges
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

DELETE FROM insurance_score_history
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

DELETE FROM insurance_consent
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

DELETE FROM insurance_reports
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

DELETE FROM insurance_risk_factors
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

DELETE FROM service_completions
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

DELETE FROM compliance_score_snapshots
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

DELETE FROM risk_assessments
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );

DELETE FROM playbook_activations
  WHERE location_id IN (
    SELECT id FROM locations
    WHERE name IN ('Location 1', 'Location 2', 'Location 3')
  );


-- ── 4c. Delete the seed locations ────────────────────────────
-- ON DELETE CASCADE handles (36 tables):
--   user_location_access, temp_logs, temperature_equipment,
--   location_jurisdictions, temp_check_completions,
--   checklist_assignments, checklist_completions,
--   checklist_template_completions, receiving_temp_logs,
--   report_subscriptions, location_jurisdiction_scores,
--   ai_insights, ai_corrective_actions, ai_weekly_digests,
--   iot_sensors, sensor_integrations, sensor_devices,
--   sensor_readings, sensor_alerts, sensor_webhooks,
--   sensor_csv_imports, sensor_door_events, sensor_cooling_logs,
--   fire_safety_equipment, location_jurisdiction_profiles,
--   jurisdiction_change_log, insurance_risk_scores,
--   risk_score_shares, alerts (facility_id),
--   employee_certifications (facility_id),
--   training_records (facility_id),
--   equipment_qr_codes, temperature_logs (facility_id),
--   cooling_logs (facility_id), vendor_service_reminders,
--   grease_trap_services
--
-- ON DELETE SET NULL handles (13 tables):
--   documents, tasks, incidents, calendar_events,
--   compliance_photos, ai_interaction_logs,
--   haccp_plans (location_id), haccp_corrective_actions,
--   insurance_share_links, frequency_change_log,
--   vendor_document_notifications, corrective_action_templates,
--   corrective_actions

DELETE FROM locations
WHERE name IN ('Location 1', 'Location 2', 'Location 3');

-- If the names don't match, use UUIDs instead:
-- DELETE FROM locations
-- WHERE id IN ('SEED_ID_1', 'SEED_ID_2', 'SEED_ID_3');

COMMIT;


-- ============================================================
-- STEP 5: VERIFY — confirm locations are gone
-- ============================================================

SELECT id, name, status, created_at
FROM locations
ORDER BY created_at;

-- Expected: 0 rows (or only real locations if any exist)
