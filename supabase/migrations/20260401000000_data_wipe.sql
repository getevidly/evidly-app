-- ================================================================
-- DATA WIPE: Delete all user-generated data for a fresh start.
-- Preserves: schema, RLS, edge functions, reference data (JIE,
-- rfp_sources, calcode_violation_map), admin user (arthur@getevidly.com),
-- and score_model_versions seed row.
-- Collects all existing tables into a single TRUNCATE to avoid deadlocks.
-- ================================================================

DO $$
DECLARE
  tbl TEXT;
  existing_tables TEXT[] := '{}';
  all_tables TEXT[] := ARRAY[
    'intelligence_insight_views', 'intelligence_subscriptions', 'intelligence_insights',
    'rfp_actions', 'rfp_classifications', 'rfp_listings',
    'score_calculations', 'location_jurisdiction_scores', 'location_benchmark_ranks',
    'benchmark_snapshots', 'benchmark_badges', 'benchmark_index_reports', 'compliance_requirements',
    'insurance_risk_scores', 'insurance_risk_factors', 'insurance_score_history',
    'insurance_reports', 'insurance_api_keys', 'insurance_api_logs',
    'insurance_api_requests', 'insurance_consent',
    'temp_logs', 'temp_check_completions', 'receiving_temp_logs',
    'cooldown_logs', 'cooldown_temp_checks', 'temperature_equipment',
    'checklist_assignments', 'checklist_completions', 'checklist_responses',
    'checklist_items', 'checklists', 'checklist_template_completions',
    'checklist_template_items', 'checklist_templates',
    'document_alerts', 'document_reminders', 'documents',
    'compliance_photos',
    'playbook_food_disposition', 'playbook_insurance_claims', 'playbook_notifications',
    'playbook_step_checklist_responses', 'playbook_step_checklist_items',
    'playbook_step_photos', 'playbook_step_responses', 'playbook_steps',
    'playbook_vendor_contacts', 'playbook_activations', 'playbook_templates', 'playbooks',
    'service_completions', 'service_quotes',
    'vendor_upload_requests', 'vendor_contact_log', 'vendor_secure_tokens',
    'vendor_messages', 'vendor_subscriptions', 'vendor_certification_status',
    'vendor_analytics', 'vendor_client_relationships', 'vendor_users',
    'vendor_leads', 'auto_request_log', 'auto_request_settings', 'vendors',
    'marketplace_reviews', 'marketplace_service_requests', 'marketplace_services',
    'marketplace_credentials', 'marketplace_vendor_metrics', 'marketplace_vendors',
    'training_ai_interactions', 'training_quiz_attempts', 'training_progress',
    'training_certificates', 'training_enrollments', 'training_sb476_log',
    'training_lessons', 'training_questions', 'training_modules',
    'training_courses', 'employee_certifications',
    'iot_sensor_alerts', 'iot_sensor_readings', 'iot_ingestion_log',
    'iot_sensors', 'iot_integration_configs', 'iot_sensor_providers',
    'sensor_incidents', 'sensor_defrost_schedules', 'sensor_cooling_logs',
    'sensor_csv_imports', 'sensor_calibration_log', 'sensor_door_events',
    'sensor_webhooks', 'sensor_integrations', 'sensor_devices',
    'sensor_alerts', 'sensor_readings',
    'ai_corrective_actions', 'ai_weekly_digests', 'ai_interaction_logs', 'ai_insights',
    'notification_settings', 'activity_logs', 'tasks',
    'user_invitations', 'user_location_access', 'report_subscriptions', 'device_registrations',
    'onboarding_checklist_items', 'onboarding_reminders',
    'api_webhook_deliveries', 'api_webhook_subscriptions', 'api_sandbox_keys',
    'api_marketplace_listings', 'api_request_log', 'api_tokens', 'api_applications',
    'integration_webhook_config', 'integration_entity_map', 'integration_sync_log', 'integrations',
    'stripe_customers', 'subscriptions',
    'sync_conflicts', 'sync_snapshots', 'sync_queue',
    'enterprise_bulk_operations', 'enterprise_integration_config',
    'enterprise_report_schedules', 'enterprise_report_templates',
    'enterprise_rollup_scores', 'enterprise_scim_tokens',
    'enterprise_sso_configs', 'enterprise_audit_log',
    'enterprise_user_mappings', 'enterprise_hierarchy_config',
    'enterprise_hierarchy_nodes', 'enterprise_location_assignments',
    'enterprise_api_keys', 'enterprise_tenants',
    'external_violations', 'external_inspections', 'external_facilities', 'violation_code_mappings',
    'jurisdiction_violation_overrides', 'jurisdiction_scoring_profiles',
    'location_jurisdictions', 'locations'
  ];
BEGIN
  -- Collect only tables that actually exist
  FOREACH tbl IN ARRAY all_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      existing_tables := existing_tables || tbl;
    END IF;
  END LOOP;

  -- Single TRUNCATE for all existing tables to avoid deadlocks
  IF array_length(existing_tables, 1) > 0 THEN
    EXECUTE 'TRUNCATE ' || array_to_string(
      (SELECT array_agg(format('%I', t)) FROM unnest(existing_tables) AS t),
      ', '
    ) || ' CASCADE';
  END IF;
END $$;

-- NOTE: user_profiles and organizations are NOT truncated.
-- The admin user (arthur@getevidly.com) and their org are preserved.
