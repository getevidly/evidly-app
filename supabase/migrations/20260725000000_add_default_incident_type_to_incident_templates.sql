-- Migration: D2-pre — add default_incident_type to incident_templates
-- Pre-binds each template to its IncidentType so the From Template tab
-- in IncidentLog can populate the Incident Type dropdown without
-- string-matching the title. Backfills the existing 18 system templates.

ALTER TABLE incident_templates
  ADD COLUMN IF NOT EXISTS default_incident_type text;

UPDATE incident_templates SET default_incident_type = CASE title
  WHEN 'Blocked Emergency Exit'                    THEN 'staff_safety'
  WHEN 'Fire Extinguisher Inspection Failure'      THEN 'equipment_failure'
  WHEN 'Grease Fire'                               THEN 'staff_safety'
  WHEN 'Hood Suppression System Discharge'         THEN 'equipment_failure'
  WHEN 'Smoke Detector Activation'                 THEN 'equipment_failure'
  WHEN 'Suppression System Inspection Failure'     THEN 'equipment_failure'
  WHEN 'Allergen Exposure Event'                   THEN 'customer_complaint'
  WHEN 'Chemical Contamination'                    THEN 'other'
  WHEN 'Cross-Contamination Event'                 THEN 'other'
  WHEN 'Employee Illness / Exclusion'              THEN 'staff_safety'
  WHEN 'Foodborne Illness Report'                  THEN 'customer_complaint'
  WHEN 'Foreign Object in Food'                    THEN 'customer_complaint'
  WHEN 'Pest Sighting'                             THEN 'pest_sighting'
  WHEN 'Power Outage - Cold Chain'                 THEN 'equipment_failure'
  WHEN 'Sewage / Plumbing Backup'                  THEN 'other'
  WHEN 'Spoiled / Expired Product Found'           THEN 'other'
  WHEN 'Temperature Violation - Refrigeration'     THEN 'temperature_violation'
  WHEN 'Equipment Failure - Critical'              THEN 'equipment_failure'
  ELSE default_incident_type
END
WHERE is_system = true AND default_incident_type IS NULL;
