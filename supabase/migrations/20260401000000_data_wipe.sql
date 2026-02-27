-- ================================================================
-- DATA WIPE: Delete all user-generated data for a fresh start.
-- Preserves: schema, RLS, edge functions, reference data (JIE,
-- rfp_sources, calcode_violation_map), admin user (arthur@getevidly.com),
-- and score_model_versions seed row.
-- ================================================================

BEGIN;

-- ── Intelligence ──
TRUNCATE intelligence_insight_views CASCADE;
TRUNCATE intelligence_subscriptions CASCADE;
DELETE FROM intelligence_insights;

-- ── RFP (child tables only — keep rfp_sources) ──
TRUNCATE rfp_actions CASCADE;
TRUNCATE rfp_classifications CASCADE;
TRUNCATE rfp_listings CASCADE;

-- ── Scores / Compliance ──
TRUNCATE score_calculations CASCADE;
TRUNCATE location_jurisdiction_scores CASCADE;
TRUNCATE location_benchmark_ranks CASCADE;
TRUNCATE benchmark_snapshots CASCADE;
TRUNCATE benchmark_badges CASCADE;
TRUNCATE benchmark_index_reports CASCADE;
TRUNCATE compliance_requirements CASCADE;

-- ── Insurance ──
TRUNCATE insurance_risk_scores CASCADE;
TRUNCATE insurance_risk_factors CASCADE;
TRUNCATE insurance_score_history CASCADE;
TRUNCATE insurance_reports CASCADE;
TRUNCATE insurance_api_keys CASCADE;
TRUNCATE insurance_api_logs CASCADE;
TRUNCATE insurance_api_requests CASCADE;
TRUNCATE insurance_consent CASCADE;

-- ── Temperature / Cooling ──
TRUNCATE temp_logs CASCADE;
TRUNCATE temp_check_completions CASCADE;
TRUNCATE receiving_temp_logs CASCADE;
TRUNCATE cooldown_logs CASCADE;
TRUNCATE cooldown_temp_checks CASCADE;
TRUNCATE temperature_equipment CASCADE;

-- ── Checklists ──
TRUNCATE checklist_assignments CASCADE;
TRUNCATE checklist_completions CASCADE;
TRUNCATE checklist_responses CASCADE;
TRUNCATE checklist_items CASCADE;
TRUNCATE checklists CASCADE;
TRUNCATE checklist_template_completions CASCADE;
TRUNCATE checklist_template_items CASCADE;
TRUNCATE checklist_templates CASCADE;

-- ── Documents ──
TRUNCATE document_alerts CASCADE;
TRUNCATE document_reminders CASCADE;
TRUNCATE documents CASCADE;

-- ── Photos ──
TRUNCATE compliance_photos CASCADE;

-- ── Playbooks ──
TRUNCATE playbook_food_disposition CASCADE;
TRUNCATE playbook_insurance_claims CASCADE;
TRUNCATE playbook_notifications CASCADE;
TRUNCATE playbook_step_checklist_responses CASCADE;
TRUNCATE playbook_step_checklist_items CASCADE;
TRUNCATE playbook_step_photos CASCADE;
TRUNCATE playbook_step_responses CASCADE;
TRUNCATE playbook_steps CASCADE;
TRUNCATE playbook_vendor_contacts CASCADE;
TRUNCATE playbook_activations CASCADE;
TRUNCATE playbook_templates CASCADE;
TRUNCATE playbooks CASCADE;

-- ── Equipment ──
TRUNCATE service_completions CASCADE;
TRUNCATE service_quotes CASCADE;

-- ── Vendors ──
TRUNCATE vendor_upload_requests CASCADE;
TRUNCATE vendor_contact_log CASCADE;
TRUNCATE vendor_secure_tokens CASCADE;
TRUNCATE vendor_messages CASCADE;
TRUNCATE vendor_subscriptions CASCADE;
TRUNCATE vendor_certification_status CASCADE;
TRUNCATE vendor_analytics CASCADE;
TRUNCATE vendor_client_relationships CASCADE;
TRUNCATE vendor_users CASCADE;
TRUNCATE vendor_leads CASCADE;
TRUNCATE auto_request_log CASCADE;
TRUNCATE auto_request_settings CASCADE;
TRUNCATE vendors CASCADE;

-- ── Marketplace ──
TRUNCATE marketplace_reviews CASCADE;
TRUNCATE marketplace_service_requests CASCADE;
TRUNCATE marketplace_services CASCADE;
TRUNCATE marketplace_credentials CASCADE;
TRUNCATE marketplace_vendor_metrics CASCADE;
TRUNCATE marketplace_vendors CASCADE;

-- ── Training ──
TRUNCATE training_ai_interactions CASCADE;
TRUNCATE training_quiz_attempts CASCADE;
TRUNCATE training_progress CASCADE;
TRUNCATE training_certificates CASCADE;
TRUNCATE training_enrollments CASCADE;
TRUNCATE training_sb476_log CASCADE;
TRUNCATE training_lessons CASCADE;
TRUNCATE training_questions CASCADE;
TRUNCATE training_modules CASCADE;
TRUNCATE training_courses CASCADE;
TRUNCATE employee_certifications CASCADE;

-- ── IoT / Sensors ──
TRUNCATE iot_sensor_alerts CASCADE;
TRUNCATE iot_sensor_readings CASCADE;
TRUNCATE iot_ingestion_log CASCADE;
TRUNCATE iot_sensors CASCADE;
TRUNCATE iot_integration_configs CASCADE;
TRUNCATE iot_sensor_providers CASCADE;
TRUNCATE sensor_incidents CASCADE;
TRUNCATE sensor_defrost_schedules CASCADE;
TRUNCATE sensor_cooling_logs CASCADE;
TRUNCATE sensor_csv_imports CASCADE;
TRUNCATE sensor_calibration_log CASCADE;
TRUNCATE sensor_door_events CASCADE;
TRUNCATE sensor_webhooks CASCADE;
TRUNCATE sensor_integrations CASCADE;
TRUNCATE sensor_devices CASCADE;
TRUNCATE sensor_alerts CASCADE;
TRUNCATE sensor_readings CASCADE;

-- ── AI ──
TRUNCATE ai_corrective_actions CASCADE;
TRUNCATE ai_weekly_digests CASCADE;
TRUNCATE ai_interaction_logs CASCADE;
TRUNCATE ai_insights CASCADE;

-- ── Notifications / Activity ──
TRUNCATE notification_settings CASCADE;
TRUNCATE activity_logs CASCADE;
TRUNCATE tasks CASCADE;

-- ── Team / Invitations ──
TRUNCATE user_invitations CASCADE;
TRUNCATE user_location_access CASCADE;
TRUNCATE report_subscriptions CASCADE;
TRUNCATE device_registrations CASCADE;

-- ── Onboarding ──
TRUNCATE onboarding_checklist_items CASCADE;
TRUNCATE onboarding_reminders CASCADE;

-- ── API / Integration ──
TRUNCATE api_webhook_deliveries CASCADE;
TRUNCATE api_webhook_subscriptions CASCADE;
TRUNCATE api_sandbox_keys CASCADE;
TRUNCATE api_marketplace_listings CASCADE;
TRUNCATE api_request_log CASCADE;
TRUNCATE api_tokens CASCADE;
TRUNCATE api_applications CASCADE;
TRUNCATE integration_webhook_config CASCADE;
TRUNCATE integration_entity_map CASCADE;
TRUNCATE integration_sync_log CASCADE;
TRUNCATE integrations CASCADE;

-- ── Stripe ──
TRUNCATE stripe_customers CASCADE;
TRUNCATE subscriptions CASCADE;

-- ── Sync ──
TRUNCATE sync_conflicts CASCADE;
TRUNCATE sync_snapshots CASCADE;
TRUNCATE sync_queue CASCADE;

-- ── Enterprise ──
TRUNCATE enterprise_bulk_operations CASCADE;
TRUNCATE enterprise_integration_config CASCADE;
TRUNCATE enterprise_report_schedules CASCADE;
TRUNCATE enterprise_report_templates CASCADE;
TRUNCATE enterprise_rollup_scores CASCADE;
TRUNCATE enterprise_scim_tokens CASCADE;
TRUNCATE enterprise_sso_configs CASCADE;
TRUNCATE enterprise_audit_log CASCADE;
TRUNCATE enterprise_user_mappings CASCADE;
TRUNCATE enterprise_hierarchy_config CASCADE;
TRUNCATE enterprise_hierarchy_nodes CASCADE;
TRUNCATE enterprise_location_assignments CASCADE;
TRUNCATE enterprise_api_keys CASCADE;
TRUNCATE enterprise_tenants CASCADE;

-- ── External ──
TRUNCATE external_violations CASCADE;
TRUNCATE external_inspections CASCADE;
TRUNCATE external_facilities CASCADE;
TRUNCATE violation_code_mappings CASCADE;

-- ── Jurisdiction scoring (user data, not reference) ──
TRUNCATE jurisdiction_violation_overrides CASCADE;
TRUNCATE jurisdiction_scoring_profiles CASCADE;

-- ── Locations (delete all — no real locations yet) ──
TRUNCATE location_jurisdictions CASCADE;
TRUNCATE locations CASCADE;

-- NOTE: user_profiles and organizations are NOT truncated.
-- The admin user (arthur@getevidly.com) and their org are preserved.
-- If there are test/demo orgs, delete them here:
-- DELETE FROM organizations WHERE id != '<admin-org-id>';

COMMIT;
