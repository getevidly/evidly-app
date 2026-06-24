# EvidLY Admin Data-Flow Audit

**Generated:** 2026-06-23
**PROD project:** irxgmhxhmxtzfwuieblc
**Scope:** Full data lineage — upstream ingestion, correlation/intelligence, downstream serving into admin console, user actions back out.
**Method:** Code-cited, exhaustive. Every claim references file:line, table+column, FK constraint, or query.

---

## LAYER A — EDGE FUNCTION CATALOG (195 in repo, 276 deployed, 18 in registry)

### A.1 — Complete Function Classification

Legend — Trigger: `C`=cron, `HP`=HTTP-public, `HA`=HTTP-authed, `IF`=invoked-by-fn, `U`=UNKNOWN
Legend — Class: `IN`=INGEST, `CO`=CORRELATE, `SE`=SERVE, `AC`=ACTION, `DI`=DISABLED, `OT`=OTHER

#### CRAWL + INTELLIGENCE STACK (20 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 1 | crawl-monitor | HP | 24+ intelligence URLs | intelligence_sources, crawl_health, intelligence_signals | intelligence_sources, crawl_health, admin_event_log, crawl_runs | IN |
| 2 | trigger-crawl | HP | Firecrawl API | intelligence_sources | intelligence_sources, admin_event_log, crawl_runs | IN |
| 3 | violation-crawl | HA | Public web + Claude Haiku | inspection_crawl_sources | violation_prospects, inspection_crawl_sources | IN |
| 4 | rfp-crawl | HA | SAM.gov, RSS, HTML | rfp_sources | rfp_listings, rfp_sources | IN |
| 5 | rfp-classify | HA | Claude Sonnet | rfp_classifications, rfp_listings, platform_settings | rfp_classifications, rfp_listings, notifications | CO |
| 6 | intelligence-collect | C (14:00 UTC) | 24 APIs + Claude Haiku | intelligence_signals, platform_settings | intelligence_signals, crawl_execution_log | IN |
| 7 | intelligence-feed | HP | None | intelligence_insights | — | SE |
| 8 | intelligence-deliver | IF | Resend email | client_advisories, intelligence_signals, intelligence_correlations, locations, organizations, user_profiles, jurisdiction_intel_updates, regulatory_changes | intelligence_signals, admin_event_log | AC |
| 9 | intelligence-approve | HA | None | intelligence_insights | intelligence_insights | AC |
| 10 | intelligence-auto-publish | C (hourly :30) | intelligence-deliver fn | platform_settings, intelligence_signals | intelligence_signals, intelligence_auto_publish_log | AC |
| 11 | intelligence-bridge-proxy | HA | External bridge URL | — | — | SE |
| 12 | intelligence-webhook | HP | Inbound webhook | — | intelligence_insights, notifications, notification_queue | IN |
| 13 | monitor-regulations | HA | Claude Sonnet | regulatory_sources, regulatory_changes, locations | regulatory_changes, intelligence_insights, notification_queue | CO |
| 14 | classify-signals | HA | Claude Haiku | — (body) | intelligence_classification_log | CO |
| 15 | canonical-correlate | HP | None | intelligence_signals, jurisdictions, locations | entity_correlations, intelligence_signals | CO |
| 16 | correlation-engine | HP | None | — | — | DI |
| 17 | detect-operational-drift | C (15 min) | None | organizations, locations, user_profiles, pl_extraction_runs, temp_logs, checklists, documents + many more | pl_extraction_runs, drift_catches, notifications | AC |
| 18 | generate-alerts | HA | None | documents, vendor_services, temp_logs, checklists, certifications, inspections, location_risk_predictions | predictive_alerts, location_risk_predictions, notifications | AC |
| 19 | generate-advisor-briefing | C+HA | None | user_profiles, locations, advisor_briefings, organizations | advisor_briefings | AC |
| 20 | ai-weekly-digest | C (Mon 6am) | Claude Sonnet | organizations, locations, user_profiles, temperature_logs, checklists, violations, documents, ai_insights | ai_weekly_digests, intelligence_insights | AC |

#### POLICY LENS STACK (22 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 21 | pl-intake-start | HP | Email, SMS | policy_lens_intakes, rate_limit_buckets | policy_lens_intakes, policy_lens_otp_codes, policy_lens_authorizations, policy_lens_events | IN |
| 22 | pl-intake-start-inapp | HA | None | user_profiles, organizations | policy_lens_intakes | IN |
| 23 | pl-otp-verify | HP | None | policy_lens_otp_codes, policy_lens_intakes | policy_lens_otp_codes, policy_lens_intakes | AC |
| 24 | pl-intake-finalize | HA | Email | policy_lens_intakes, policy_lens_authorizations | policy_lens_intakes, policy_lens_events | AC |
| 25 | pl-extract | HA | Anthropic (Sonnet+Opus) | policy_lens_intakes, pl_documents, pl_extraction_runs | pl_extraction_runs, policy_lens_intakes | IN |
| 26 | pl-reconcile | HA | None | profiles, pl_extraction_runs | pl_extraction_runs, policy_lens_intakes | CO |
| 27 | pl-build-findings | HA | None | pl_extraction_runs, pl_finding_templates, pl_standards_registry | pl_findings, pl_extraction_runs, policy_lens_intakes | CO |
| 28 | pl-compliance-eval | HA | None | user_profiles, locations, vendor_service_records, pl_standards_registry | drift_catches | CO |
| 29 | pl-compliance-eval-food | HA | None | user_profiles, locations, temperature_logs | drift_catches | CO |
| 30 | pl-pse-eval | HA | None | user_profiles, locations, pl_pse_conditions, pl_pse_symbol_registry, vendor_service_records | drift_catches | CO |
| 31 | pl-review-finding | HA | None | profiles | pl_findings | AC |
| 32 | pl-release-report | HA | None | profiles, pl_extraction_runs, pl_findings | pl_report_grants, pl_extraction_runs, policy_lens_events | AC |
| 33 | pl-get-findings | HP | None | pl_report_grants, pl_extraction_runs, pl_findings | pl_report_grants (access_count) | SE |
| 34 | pl-get-findings-insured | HA | None | user_profiles, policy_lens_intakes, pl_extraction_runs, pl_findings | — | SE |
| 35 | pl-admin | HA | Email | profiles, policy_lens_intakes | policy_lens_intakes | AC |
| 36 | pl-authorize-sign | HP | Email | policy_lens_authorizations, policy_lens_intakes | policy_lens_authorizations, policy_lens_events | AC |
| 37 | pl-authorize-status | HP | None | policy_lens_authorizations | — | SE |
| 38 | pl-event | HP | None | — | policy_lens_events | IN |
| 39 | pl-invite | HA | Email | policy_lens_intakes, rate_limit_buckets | policy_lens_invites, policy_lens_events | AC |
| 40 | pl-verify-agent | HA | Provider API | profiles, policy_lens_intakes | pl_agent_verifications, policy_lens_intakes, policy_lens_events | CO |

#### EVIDENCE / SEAL STACK (5 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 41 | seal-inspection-report | HA | Storage | user_profiles, retention_policies | inspection_reports | IN |
| 42 | seal-service-record | HA | Storage | user_profiles, location_service_schedules, retention_policies | vendor_service_records | IN |
| 43 | verify-inspection-report | HA | Storage | user_profiles, inspection_reports, inspection_verification_log, supersession_log | — | SE |
| 44 | verify-service-record | HA | Storage | user_profiles, vendor_service_records, service_supersession_log | — | SE |
| 45 | correct-inspection-report | HA | Storage | user_profiles, inspection_reports, supersession_log, retention_policies | RPC create_correction_with_log | AC |
| 46 | correct-service-record | HA | Storage | user_profiles, vendor_service_records, service_supersession_log, retention_policies | RPC create_service_correction_with_log | AC |

#### AI STACK (11 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 47 | ai-chat | HA | Claude | ai_interaction_logs, temperature_logs, checklists, documents, vendor_services | ai_interaction_logs | SE |
| 48 | ai-corrective-action-draft | HA | Claude | locations, violations, temperature_logs, checklists | ai_corrective_actions, intelligence_insights, ai_interaction_logs | AC |
| 49 | ai-document-analysis | HA | Claude Vision | — | documents (update) | SE |
| 50 | ai-flag-suggest | HP | Claude | — | — | SE |
| 51 | ai-pattern-analysis | C | Claude | locations, temperature_logs, checklists | intelligence_insights | CO |
| 52 | ai-photo-analysis | HA | Claude Vision | job_photos | job_photos | SE |
| 53 | ai-predictive-alerts | C (weekly) | None | locations, documents, vendor_services, intelligence_insights | intelligence_insights | CO |
| 54 | ai-text-assist | HA | Claude | — | ai_interaction_logs | SE |
| 55 | ai-voice-transcription | HA | OpenAI Whisper + Claude | job_photos | voice_notes | IN |
| 56 | ai-estimate-submit | HP | None | organizations, vendors, referral_codes | service_requests, referrals, referral_codes | IN |
| 57 | evidence-pattern-detect | HP | None | onboarding_item_threads, onboarding_item_thread_messages, evidence_signals | evidence_signals | CO |

#### IoT / SENSOR STACK (9 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 58 | iot-process-reading | HA | None | iot_sensors, temperature_equipment, iot_sensor_readings | temperature_logs, haccp_monitoring_logs, iot_sensor_alerts | IN |
| 59 | iot-sensor-alerts | HA | None | iot_sensor_alerts, iot_sensors, locations | iot_sensor_alerts | SE |
| 60 | iot-sensor-pull | HA | SensorPush/TempStick APIs | iot_integration_configs, iot_sensors | iot_sensor_readings, iot_sensors, iot_sensor_alerts, iot_ingestion_log | IN |
| 61 | iot-sensor-webhook | HP | IoT platform webhook | iot_integration_configs, iot_sensors | iot_sensor_readings, iot_sensors, iot_sensor_alerts, iot_ingestion_log | IN |
| 62 | sensor-alert-escalate | HA | None | iot_sensor_alerts, sensor_incidents | iot_sensor_alerts, sensor_incidents, sensor_escalation_history | CO |
| 63 | sensor-compliance-aggregate | HA | None | locations, iot_sensors, iot_sensor_readings, iot_integration_configs, temperature_logs | location_compliance_scores | CO |
| 64 | sensor-defrost-detect | HA | None | iot_sensors, iot_sensor_readings | iot_sensor_readings, iot_sensor_alerts | CO |
| 65 | sensor-device-health | HA | None | iot_sensors, iot_sensor_alerts | iot_sensors, iot_sensor_alerts | CO |
| 66 | sensor-threshold-evaluate | HA | None | iot_sensors, iot_sensor_readings | iot_sensor_alerts | CO |

#### VENDOR / SERVICE STACK (20 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 67 | hoodops-webhook | HP | HoodOps (webhook secret) | — | vendor_service_records, location_service_schedules, service_reschedule_requests, platform_audit_log | IN |
| 68 | route-service-request | HA | Email | service_requests, vendors, service_type_definitions, organizations, locations, vendor_secure_tokens | service_requests, vendor_message_threads, thread_messages, notifications | AC |
| 69 | process-service-reminders | C | Email, SMS | vendor_service_records, vendors, locations, user_profiles | vendor_service_records, vendor_service_reminder_log | AC |
| 70 | process-service-request | HA | Email | vendors, locations, organizations, cpp_availability_slots | service_requests, cpp_availability_slots, calendar_events, vendor_secure_tokens | AC |
| 71 | resend-service-request | HA | Email | service_requests, vendor_secure_tokens, organizations, locations | service_requests, vendor_secure_tokens | AC |
| 72 | vendor-connect-apply | HP | Email | vendor_connect_applications | vendor_connect_applications | IN |
| 73 | vendor-analytics-snapshot | C | None | marketplace_vendors, marketplace_vendor_metrics, marketplace_service_requests, service_completions | vendor_analytics | CO |
| 74 | vendor-certification-evaluate | HA | None | — | — | CO |
| 75 | vendor-secure-upload | HA | Storage | — | — | IN |
| 76 | validate-vendor-document | IF | Claude + Storage | vendor_documents, vendor_document_submissions, user_profiles | vendor_document_submissions, vendor_documents, notifications | CO |
| 77 | vendor-schedule-response | HA | Email | — | — | AC |
| 78 | vendor-portal-reply | HA | None | — | — | AC |
| 79 | vendor-document-notify | HA | Email | — | — | AC |
| 80 | vendor-document-reminders | C | Email | — | — | AC |
| 81 | vendor-lead-notify | HA | Email | — | — | AC |
| 82 | vendor-network-send-message | HA | Email | — | — | AC |
| 83 | vendor-notification-sender | HA | Email | — | — | AC |
| 84 | vendor-partner-outreach | HA | Email | — | — | AC |
| 85 | vendor-recommendation-engine | HA | None | — | — | CO |
| 86 | vendor-service-record-trigger | IF | None | — | — | AC |

#### DOCUMENT / COMPLIANCE STACK (14 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 87 | document-expiry-status | C (6am) | None | compliance_documents | compliance_documents, notifications | CO |
| 88 | document-review-action | HA | send-document-request fn | compliance_documents, user_profiles, compliance_document_requests, organizations | compliance_documents, compliance_document_activity_log, compliance_document_requests | AC |
| 89 | document-scan | HP | None | — | documents, security_events, admin_notifications | IN |
| 90 | send-document-request | HP | Resend | — | — | AC |
| 91 | send-document-alerts | C | Resend, Twilio | documents, user_profiles, notification_settings | document_alerts, notifications | AC |
| 92 | send-missing-doc-reminders | C | Resend | organizations, onboarding_checklist_items, documents, document_reminders, user_profiles | document_reminders | AC |
| 93 | issue-fresh-request | HA | send-document-request fn | compliance_documents, user_profiles, compliance_document_requests, organizations | compliance_document_requests, compliance_document_activity_log | AC |
| 94 | resend-document-request | HA | send-document-request fn | compliance_documents, user_profiles, compliance_document_requests, organizations | compliance_document_requests, compliance_document_activity_log | AC |
| 95 | classify-document | HA | Claude Vision | — | — | SE |
| 96 | auto-request-documents | HA | None | — | — | AC |
| 97 | check-expiries | C | None | — | — | CO |
| 98 | send-inspection-package | HA | generate-compliance-package fn, Resend | user_profiles | inspection_package_deliveries, notifications | AC |
| 99 | generate-compliance-package | HA | pdf-lib | user_profiles, documents, compliance_score_snapshots, violations, vw_haccp_evidence | activity_logs, storage | SE |
| 100 | portal-access | HP | Storage | compliance_document_send_records, organizations, compliance_document_send_items, compliance_documents | compliance_document_send_records | SE |

#### TRAINING STACK (11 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 101 | training-auto-enroll | IF | None | locations, user_profiles, training_certificates, training_enrollments, training_courses, training_sb476_log | training_enrollments, training_sb476_log | AC |
| 102 | training-completion-handler | IF | API webhooks | training_enrollments, training_quiz_attempts, training_courses, employee_certifications, training_sb476_log, api_webhook_subscriptions, locations | training_enrollments, training_certificates, employee_certifications, training_sb476_log, api_webhook_deliveries | AC |
| 103 | training-certificate-gen | HA | None | training_enrollments, training_courses, training_certificates | training_certificates, training_sb476_log | AC |
| 104 | training-ai-companion | HA | Claude | training_enrollments, training_modules, training_quiz_attempts | training_ai_interactions | SE |
| 105 | training-ai-quiz-gen | HA | Claude | training_modules | — | SE |
| 106 | training-analytics-aggregate | HA | None | training_enrollments, training_quiz_attempts | — | SE |
| 107 | training-enroll | HA | None | — | — | AC |
| 108 | training-progress-reminder | C | Email | — | — | AC |
| 109 | training-quiz-score | HA | None | — | — | AC |
| 110 | training-sb476-report | HA | None | — | — | SE |
| 111 | training-content-translate | HA | Claude | — | — | SE |

#### ENTERPRISE STACK (6 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 112 | enterprise-scim-users | HP | None (SCIM inbound) | enterprise_scim_tokens, enterprise_user_mappings | enterprise_user_mappings, enterprise_audit_log | IN |
| 113 | enterprise-sso-callback | HP | None (SAML/OIDC) | enterprise_tenants, enterprise_sso_configs | enterprise_user_mappings, enterprise_audit_log | IN |
| 114 | enterprise-tenant-provision | HA | None | enterprise_tenants | enterprise_tenants, enterprise_sso_configs, enterprise_scim_tokens, enterprise_hierarchy_nodes, enterprise_audit_log | AC |
| 115 | enterprise-audit-export | HA | None | enterprise_audit_log | — | SE |
| 116 | enterprise-alert-rollup | HP | None | — | — | DI |
| 117 | enterprise-report-generate | HP | None | — | — | DI |
| 118 | enterprise-rollup-calculate | HP | None | — | — | DI |

#### PLAYBOOK STACK (6 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 119 | playbook-auto-trigger | HA | None | playbook_templates, location_members | playbook_activations, notifications | AC |
| 120 | playbook-completion-handler | HA | None | playbook_activations, playbook_step_responses, playbook_evidence_photos, playbook_food_disposition, locations, playbook_templates | playbook_activations | AC |
| 121 | playbook-escalation-monitor | C | None | playbook_activations, playbook_templates, playbook_step_responses, location_members | playbook_step_responses, notifications | AC |
| 122 | playbook-ai-assistant | HA | Claude (mock) | playbook_activations, playbook_step_responses, locations | playbook_ai_interactions | SE |
| 123 | playbook-food-loss-calculator | HA | None | playbook_food_disposition, playbook_activations, playbook_insurance_claims | — | SE |
| 124 | playbook-report-generator | HA | None | playbook_activations, playbook_step_responses, playbook_evidence_photos, playbook_food_disposition, locations, playbook_insurance_claims, playbook_templates | — | SE |

#### POS / INTEGRATION STACK (7 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 125 | pos-connect | HA | Toast/Square/Clover/etc | integrations | integration_connections | AC |
| 126 | pos-sync-all | C (2am) | None (invokes children) | integration_connections, integrations | — | AC |
| 127 | pos-sync-employees | IF | POS APIs | integration_connections, integrations | pos_employee_mappings, integration_sync_log | IN |
| 128 | pos-sync-locations | IF | POS APIs | integration_connections, integrations, integration_entity_map | locations, integration_entity_map, integration_sync_log, integration_connections | IN |
| 129 | integration-health-check | C | None | integrations, integration_sync_log | integrations | SE |
| 130 | integration-oauth-callback | HP | POS/payroll OAuth | — | integrations | IN |
| 131 | integration-sync-engine | HA | None | integrations | integration_sync_log, integrations | AC |

#### NOTIFICATION / EMAIL / SMS STACK (15 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 132 | send-daily-digest | C | Resend | organizations, user_profiles, notifications, notification_preferences | notification_deliveries | AC |
| 133 | send-reminders | C | Resend | organizations, onboarding_reminders, user_profiles | onboarding_reminders | AC |
| 134 | send-portal-link | HA | Resend | compliance_document_send_records, user_profiles, organizations | compliance_document_send_records | AC |
| 135 | send-service-request-reminder | HA | Resend | service_requests, user_profiles, vendors, organizations, locations, vendor_secure_tokens | service_requests, notifications | AC |
| 136 | send-welcome-email | HP | Resend | — | — | AC |
| 137 | send-team-invite | HP | Resend | — | — | AC |
| 138 | send-sms-invite | HP | Twilio | — | — | AC |
| 139 | send-vendor-recommendation | HP | Resend | vendor_recommendations, user_profiles | — | AC |
| 140 | shift-handoff-notify | HP | Resend | shift_handoffs, user_profiles, locations, shift_templates, shift_assignments | notifications, shift_handoffs | AC |
| 141 | assessment-notify | HP | Resend | — | — | AC |
| 142 | task-notifications | C (5min) | None | task_instances, task_definitions, user_profiles | task_instances, notifications | AC |
| 143 | resend-webhook | HP | Resend webhook | inspection_package_deliveries, compliance_document_send_records | inspection_package_deliveries, compliance_document_send_records | IN |
| 144 | resend-inbound-email | HP | Resend Svix | message_threads | message_threads, message_attachments | IN |
| 145 | twilio-inbound-sms | HP | Twilio | — | — | IN (stub) |
| 146 | jurisdiction-drift-alert | HA | Email | — | — | SE |

#### BILLING / PAYMENTS (3 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 147 | stripe-create-checkout | HA | Stripe | stripe_customers | stripe_customers | AC |
| 148 | stripe-customer-portal | HA | Stripe | stripe_customers | — | AC |
| 149 | stripe-webhook | HP | Stripe webhook | subscriptions, user_profiles | subscriptions, notifications; invokes k2c-processor | IN |

#### OPERATIONS / MISC (22 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 150 | ops-intelligence-generate | C/HA | None | vendor_service_records, documents, corrective_actions, temp_logs, checklists, checklist_completions, employee_certifications, readiness_snapshots, locations, intelligence_signals | ops_intelligence_insights, notifications | CO |
| 151 | ops-intelligence-coach | C/HA | Claude Sonnet | ops_intelligence_insights, organizations | ops_intelligence_insights | CO |
| 152 | platform-metrics-refresh | C/HA | None | temperature_logs, checklist_completions, documents, corrective_actions, incidents, equipment, organizations, locations | platform_metrics_daily, admin_event_log | AC |
| 153 | platform-stats | HP | None | organizations, temperature_logs, checklist_completions | — | SE |
| 154 | snapshot-readiness | C (6am) | None | locations, corrective_actions, temperature_logs, documents | readiness_snapshots | CO |
| 155 | analyze-temperature-patterns | HA | Claude | user_profiles, locations, temperature_logs, temperature_equipment, temperature_pattern_analysis | temperature_pattern_analysis | CO |
| 156 | risk-free-eligibility-calc | C (2am) | None | risk_free_eligibility | RPC recalc_risk_free_eligibility | CO |
| 157 | risk-score-api | HA | None | insurance_api_keys, insurance_api_requests, locations, compliance_score_snapshots, vendor_service_records, readiness_snapshots | insurance_api_requests, insurance_api_keys | SE |
| 158 | security-headers-check | HP | HTTP HEAD | — | admin_event_log | SE |
| 159 | generate-api-key | HA | None | user_profiles | api_keys | AC |
| 160 | generate-certificate | HP | None | service_records | certificates | AC |
| 161 | generate-report | HP | Claude | organizations, locations | (PDF) | SE |
| 162 | generate-outreach | HA | Claude | violation_prospects | outreach_touches, violation_prospects | SE |
| 163 | generate-haccp-from-checklists | HA | None | locations, checklist_template_items, checklist_templates, haccp_plans, haccp_critical_control_points | haccp_plans, haccp_critical_control_points | CO |
| 164 | generate-deficiency-plan | HA | Claude | deficiencies, corrective_actions | deficiency_resolution_plans, ai_interaction_logs | CO |
| 165 | generate-agreement-pdf | HP | None | service_agreements, agreement_templates, organizations, vendors | agreement_activities | SE |
| 166 | k2c-processor | IF | None | organizations, locations | k2c_donations, admin_event_log | AC |
| 167 | k2c-referral-invite | HA | Email | — | k2c_referrals | AC |
| 168 | landing-chat | HP | Claude Sonnet | — | — | SE |
| 169 | check-onboarding-progress | HA | None | — | — | SE |
| 170 | check-equipment-alerts | C | None | — | — | CO |
| 171 | cleanup-demo-tour | C/HA | None | demo_tours, partner_demos, demo_sessions | (bulk deletes: 15+ tables) | AC |
| 172 | form-submit | HP | Email | — | form_submissions | IN |

#### SALES / GTM STACK (7 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 173 | demo-account-create | HA | None | competitor_blocked_domains | auth users, organizations, locations, user_profiles, user_location_access, demo_sessions | AC |
| 174 | demo-account-convert | HA | None | organizations, demo_sessions, demo_generated_data | organizations, demo_sessions, demo_generated_data | AC |
| 175 | generate-demo-template | HA | None | locations, demo_tours | temp_logs, checklists, checklist_completions, corrective_actions, vendors, documents, sb1383_compliance, demo_vendor_profiles | AC |
| 176 | generate-partner-demo | HA | None | partner_demos | locations, temp_logs, checklists, checklist_completions, documents, vendors, equipment_service_records, partner_demos | AC |
| 177 | client-invite-send | HA | Email | — | — | SE |
| 178 | evidly-referral-signup | HP | None | referral_codes, referrals | referrals, RPC increment_referral_count | IN |
| 179 | evidly-service-request | HP | None | organizations, vendors, locations | service_requests | IN |

#### OFFLINE STACK (5 functions, feature-gated OFF)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 180 | offline-sync-handler | HA | None | user_profiles, device_registrations | temperature_logs/corrective_actions (allowlist), device_registrations | AC |
| 181 | offline-sync-pull | HA | None | device_registrations | device_registrations | SE |
| 182 | offline-conflict-resolver | HA | None | user_profiles, sync_conflicts | sync_conflicts, temperature_logs/corrective_actions | CO |
| 183 | offline-device-manager | HA | None | device_registrations, sync_queue | device_registrations, sync_queue | AC |
| 184 | offline-photo-batch-upload | HA | Storage | device_registrations | storage:evidence-photos | IN |

#### REMAINING (11 functions)

| # | Function | Trigger | Ext Source | Tables READ | Tables WRITE | Class |
|---|----------|---------|-----------|-------------|--------------|-------|
| 185 | copilot-analyze | C (6am) | Claude | locations, temperature_logs, checklist_logs, equipment, documents | ai_insights, notification_queue | CO |
| 186 | extract-deficiencies-from-report | HA | Claude | deficiency_uploads, storage | deficiency_uploads, ai_interaction_logs | CO |
| 187 | draft-receiving-notes | HA | Claude | — | ai_interaction_logs | SE |
| 188 | generate-weekly-drift-report | C (Mon) | Email | drift_catches, org settings | notifications | CO |
| 189 | generate-task-instances | C (5am) | None | task_definitions | task_instances | AC |
| 190 | generate-service-report | HP | None | service_records, service_photos, deficiencies | — | SE |
| 191 | generate-job-report | HA | None | jobs, customers, job_equipment, job_checklists, job_photos, job_deficiencies, voice_notes, job_reports | job_reports, storage | SE |
| 192 | generate-kec-report | HP | None | service_reports, report_systems, report_photos, report_deficiencies, report_fire_safety | service_reports | SE |
| 193 | cloud-file-import | HA | GDrive/OneDrive/Dropbox | — | — | SE |
| 194 | api-marketplace-publish | HA | None | api_marketplace_listings | api_marketplace_listings | AC |
| 195 | webhook-dispatch | HP | HoodOps | — | webhook_logs | IN |

### A.2 — Three-Way Reconciliation

#### In repo (195) vs. Deployed (276) vs. Registry (18)

**DEPLOYED BUT NOT IN REPO (59 ghost functions):**
These are deployed to PROD but have no source in the current repo. They may be legacy, removed from source, or deployed from another branch.

| Function | Notes |
|----------|-------|
| ai-advisor | Legacy AI endpoint |
| ai-estimate | Superseded by ai-estimate-submit |
| analyze-kitchen-video | Legacy video analysis |
| apply-migration | Utility — run-once migration runner |
| assess-ground-truth-submission | Ground truth system |
| assign-ground-truth-mission | Ground truth system |
| check-unconfirmed-jobs | Legacy job tracker |
| checkup-notify | Legacy notification |
| compute-jpi | Legacy scoring (JPI) |
| crawl-orchestrator | Legacy crawl orchestrator |
| create-client | Legacy client creation |
| daily-intelligence | Superseded by intelligence-collect |
| demo-expire | Legacy demo expiry |
| demo-generate-data | Legacy demo generation |
| demo-send-magic-link | Legacy demo auth |
| drift-alert-sender | Legacy drift alerts |
| expiration-alerts | Legacy expiration alerts |
| extract-inspection | Legacy inspection extractor |
| fetch-jurisdiction | Legacy jurisdiction lookup |
| forum-moderate | Legacy forum moderation |
| generate-corrective-action | Legacy CA generator |
| generate-threshold-guidance | Legacy threshold helper |
| handle-sms-reply | Legacy SMS handler |
| hoodops-webhook-receiver | Replaced by hoodops-webhook |
| insurance-risk-calculate | Legacy insurance scoring |
| insurance-risk-fire-safety | Legacy insurance scoring |
| insurance-risk-history | Legacy insurance scoring |
| insurance-risk-incidents | Legacy insurance scoring |
| insurance-risk-verify | Legacy insurance scoring |
| intel-crawl-environmental | Registry entry, no repo source |
| intel-crawl-recalls | Registry entry, no repo source |
| job-availability | Legacy job scheduling |
| notify-affected-clients | Registry entry |
| parse-inspection-portal | Legacy parser |
| process-scheduled-emails | Legacy email processor |
| process-voice-command | Legacy voice command |
| public-resource-feed | Legacy public feed |
| read-thermometer-photo | Legacy thermometer OCR |
| reschedule-request | Legacy reschedule |
| route-arthur-alert | Registry entry |
| seed-distributions | Legacy data seeder |
| send-arthur-digest | Registry entry |
| send-email | Core email utility |
| send-essential-transition-email | Legacy transition email |
| send-ground-truth-nudge | Ground truth system |
| send-sms | Core SMS utility |
| send-trial-email | Legacy trial email |
| send-welcome | Legacy welcome email |
| smooth-processor | Legacy processor |
| triage-signal | Registry entry |
| trial-email-sender | Legacy trial email |
| user-invitation | Legacy invitation |
| vendor-connect-invite | Legacy vendor invite |
| vendor-doc-request | Legacy doc request |
| vendor-service-token | Legacy vendor token |
| vendor-sms-reminder | Legacy SMS reminder |
| vendor-upload-reminder | Legacy upload reminder |
| weekly-digest | Superseded by ai-weekly-digest |
| zoominfo-webhook | Legacy ZoomInfo integration |

**IN REPO BUT NOT DEPLOYED (1):**

| Function | Notes |
|----------|-------|
| portal-access | In repo, not yet deployed — vendor compliance portal |

**IN REGISTRY BUT NOT DEPLOYED (11 phantom entries):**
These are tracked in edge_function_registry but do NOT exist as deployed functions.

| Registry Entry | Category | Cron |
|----------------|----------|------|
| calculate-fire-safety-score | scoring | — |
| crawl-code-monitor | intelligence_crawl | 0 6 * * * |
| draft-prospect-outreach | sales_automation | — |
| generate-haccp-plan | compliance_generation | — |
| intel-aggregate-benchmarks | intelligence_aggregation | 0 5 * * * |
| intel-aggregate-penalties | intelligence_aggregation | 0 4 * * 0 |
| intel-crawl-benchmarks | intelligence_crawl | 0 4 1 * * |
| intel-crawl-enforcement | intelligence_crawl | 0 3 * * 2 |
| intel-crawl-inspections | intelligence_crawl | 0 2 * * * |
| intel-refresh-freshness | intelligence_maintenance | 0 6 * * * |
| send-client-digest | notification | 0 7 * * 1 |

**IN REGISTRY BUT NOT IN REPO (17):**
All 18 registry entries except `calculate-compliance-score` have no matching source directory. The registry is stale.

---

## LAYER B — UPSTREAM / INGESTION (what enters the system)

### B.1 — External Source → Function → Raw Table

| External Source | Function | Raw Table(s) Written | Evidence |
|----------------|----------|---------------------|----------|
| 24 public APIs (openFDA, USDA FSIS, CDC, CDPH, NWS, CPSC, Federal Register, etc.) | intelligence-collect | intelligence_signals, crawl_execution_log | intelligence-collect/index.ts:788,923 |
| Intelligence source URLs (direct fetch) | crawl-monitor | crawl_health, crawl_runs, admin_event_log | crawl-monitor/index.ts:148,215 |
| Firecrawl API (web scrape) | trigger-crawl | crawl_runs, admin_event_log | trigger-crawl/index.ts:176 |
| Health dept web pages + Claude | violation-crawl | violation_prospects | violation-crawl/index.ts:196 |
| SAM.gov + RSS + HTML | rfp-crawl | rfp_listings | rfp-crawl/index.ts:100 |
| EvidLY Intelligence webhook | intelligence-webhook | intelligence_insights, notifications, notification_queue | intelligence-webhook/index.ts:63,85,99 |
| Resend email delivery events | resend-webhook | inspection_package_deliveries, compliance_document_send_records | resend-webhook/index.ts:142,176 |
| Resend inbound email (reply+{threadId}@) | resend-inbound-email | message_threads, message_attachments | resend-inbound-email/index.ts:161,213 |
| Stripe payment events | stripe-webhook | subscriptions, notifications | stripe-webhook/index.ts:105 |
| HoodOps service completion webhook | hoodops-webhook | vendor_service_records, location_service_schedules, service_reschedule_requests | hoodops-webhook (shared tables) |
| SensorPush / TempStick API | iot-sensor-pull | iot_sensor_readings, iot_sensors, iot_sensor_alerts, iot_ingestion_log | iot-sensor-pull/index.ts:237,265,286,367 |
| IoT platform webhook | iot-sensor-webhook | iot_sensor_readings, iot_sensors, iot_sensor_alerts, iot_ingestion_log | iot-sensor-webhook/index.ts:110,138,159,240 |
| IoT validated reading | iot-process-reading | temperature_logs, haccp_monitoring_logs, iot_sensor_alerts | iot-process-reading/index.ts:92,119,168 |
| Policy PDF upload (Anthropic dual-pass) | pl-extract | pl_extraction_runs, policy_lens_intakes | pl-extract/index.ts:295,312 |
| Public prospect form | pl-intake-start | policy_lens_intakes, policy_lens_otp_codes, policy_lens_authorizations, policy_lens_events | pl-intake-start/index.ts:363,184,395 |
| In-app policy upload | pl-intake-start-inapp | policy_lens_intakes | pl-intake-start-inapp/index.ts:60 |
| Policy Lens frontend events | pl-event | policy_lens_events | pl-event/index.ts:57 |
| Inspection report seal | seal-inspection-report | inspection_reports | seal-inspection-report/index.ts:294 |
| Service record seal | seal-service-record | vendor_service_records | seal-service-record/index.ts:270 |
| OpenAI Whisper + Claude voice | ai-voice-transcription | voice_notes | ai-voice-transcription/index.ts:264 |
| Public estimate form | ai-estimate-submit | service_requests, referrals | ai-estimate-submit/index.ts:47,90 |
| Public form submission | form-submit | form_submissions | form-submit/index.ts:148 |
| File security scan | document-scan | documents, security_events | document-scan/index.ts:179,153 |
| POS employee sync | pos-sync-employees | pos_employee_mappings, integration_sync_log | pos-sync-employees/index.ts:51,69 |
| POS location sync | pos-sync-locations | locations, integration_entity_map, integration_sync_log | pos-sync-locations/index.ts:75,93,127 |
| POS/payroll OAuth callback | integration-oauth-callback | integrations | integration-oauth-callback/index.ts:65 |
| SCIM user provisioning | enterprise-scim-users | enterprise_user_mappings, enterprise_audit_log | enterprise-scim-users/index.ts:104,122 |
| SSO JIT provisioning | enterprise-sso-callback | enterprise_user_mappings, enterprise_audit_log | enterprise-sso-callback/index.ts:85,108 |
| Vendor connect application | vendor-connect-apply | vendor_connect_applications | vendor-connect-apply/index.ts:89 |
| Referral signup | evidly-referral-signup | referrals | evidly-referral-signup/index.ts:69 |
| Service request (public) | evidly-service-request | service_requests | evidly-service-request/index.ts:54 |
| Offline photo upload | offline-photo-batch-upload | storage:evidence-photos | offline-photo-batch-upload/index.ts:103 |
| HoodOps notification bridge | webhook-dispatch | webhook_logs | webhook-dispatch/index.ts:82 |
| Twilio SMS (stub) | twilio-inbound-sms | — | Stub only |

### B.2 — Orphan Sinks (tables written by ingest but never read by any function or admin screen)

| Table | Writer | Evidence of No Reader |
|-------|--------|----------------------|
| crawl_execution_log | intelligence-collect | No .from('crawl_execution_log').select found in any function or component |
| iot_ingestion_log | iot-sensor-pull, iot-sensor-webhook | No admin screen reads this table |
| form_submissions | form-submit | No admin screen reads this table |
| webhook_logs | webhook-dispatch | No admin screen reads this table |
| security_events | document-scan | No admin screen reads this table |
| pos_employee_mappings | pos-sync-employees | No admin screen reads this table |

---

## LAYER C — CORRELATION / INTELLIGENCE (raw → business context)

### C.1 — Derived / Intelligence Tables

| Derived Table | Producer Function | Input Tables/Streams | Correlation Key/Logic | Consumer |
|--------------|-------------------|---------------------|----------------------|----------|
| **entity_correlations** | canonical-correlate | intelligence_signals → jurisdictions → locations | Signal county → jurisdiction.county → location.jurisdiction_id (canonical-correlate/index.ts:33-46) | EvidLYIntelligence.tsx:446, intelligence-deliver |
| **intelligence_signals** (enriched) | intelligence-collect, canonical-correlate, classify-signals | 24 external APIs, intelligence_sources | source_id FK → intelligence_sources (FK: intelligence_signals_source_id_fkey); county → jurisdiction match | EvidLYIntelligence.tsx:445, IntelligenceAdmin, intelligence-deliver, intelligence-auto-publish |
| **intelligence_insights** | intelligence-webhook, monitor-regulations, ai-pattern-analysis, ai-predictive-alerts, ai-corrective-action-draft, copilot-analyze, ai-weekly-digest | Various: webhook payloads, regulatory_sources, temperature_logs, documents, violations | organization_id FK (intelligence_insights_organization_id_fkey); location_id FK | intelligence-feed (public), intelligence-approve (admin) |
| **client_advisories** | EvidLYIntelligence.tsx:738 (admin action) | intelligence_signals, organizations | signal_id FK → intelligence_signals (FK: client_advisories_signal_id_fkey); org_id FK → organizations (FK: client_advisories_org_id_fkey) | intelligence-deliver reads for email dispatch |
| **client_intelligence_feed** | UNKNOWN — no writer function found | — | organization_id FK (FK: client_intelligence_feed_organization_id_fkey) | UNKNOWN — needs runtime check |
| **ai_insights** | copilot-analyze | locations, temperature_logs, checklist_logs, equipment, documents | organization_id FK (FK: ai_insights_organization_id_fkey); location_id FK | ai-weekly-digest reads; ai-chat reads |
| **ai_corrective_actions** | ai-corrective-action-draft | locations, violations, temperature_logs, checklists + Claude | insight_id FK → ai_insights (FK: ai_corrective_actions_insight_id_fkey); location_id FK | UNKNOWN — no admin screen reads this directly |
| **ai_weekly_digests** | ai-weekly-digest | organizations, locations, user_profiles, temperature_logs, checklists, violations, documents, ai_insights + Claude | organization_id FK (FK: ai_weekly_digests_organization_id_fkey); location_id FK | Email delivery (in function); no admin screen |
| **advisor_briefings** | generate-advisor-briefing | user_profiles, locations, organizations | org_id FK (FK: advisor_briefings_org_id_fkey); location_id FK | Tenant UI (not admin) |
| **content_verification_status** | UNKNOWN — no writer function found | — | — | VerificationReport.tsx:100 |
| **content_verification_log** | UNKNOWN — no writer function found | — | — | VerificationReport.tsx:105 |
| **regulatory_changes** | monitor-regulations | regulatory_sources + Claude | source_id FK → regulatory_sources (FK: regulatory_changes_source_id_fkey) | EvidLYIntelligence.tsx:448, intelligence-deliver |
| **rfp_classifications** | rfp-classify | rfp_listings + Claude | rfp_id (no FK found — join by rfp_id column) | RfpIntelligence.tsx (via hook) |
| **location_risk_predictions** | generate-alerts | documents, vendor_services, temp_logs, checklists, certifications, inspections | location_id FK (FK: location_risk_predictions_location_id_fkey); organization_id FK | EvidLYIntelligence.tsx:476 |
| **drift_catches** | detect-operational-drift, pl-compliance-eval, pl-compliance-eval-food, pl-pse-eval | organizations, locations, vendor_service_records, temperature_logs, checklists, documents, pl_standards_registry | org_id FK (FK: drift_catches_org_id_fkey); location_id FK (FK: drift_catches_location_id_fkey) | generate-weekly-drift-report; tenant UI |
| **ops_intelligence_insights** | ops-intelligence-generate, ops-intelligence-coach | vendor_service_records, documents, corrective_actions, temp_logs, checklists, employee_certifications, readiness_snapshots, intelligence_signals | organization_id (column match) | Tenant UI (Ops Intelligence) |
| **readiness_snapshots** | snapshot-readiness | locations, corrective_actions, temperature_logs, documents | location_id (column match) | risk-score-api, ops-intelligence-generate |
| **pl_findings** | pl-build-findings | pl_extraction_runs, pl_finding_templates, pl_standards_registry | run_id FK → pl_extraction_runs (FK: pl_findings_run_id_fkey); intake_id FK → policy_lens_intakes (FK: pl_findings_intake_id_fkey) | PolicyLensQueue.jsx:88, ExtractionDetail.jsx:144, pl-get-findings, pl-get-findings-insured |
| **pl_extraction_runs** | pl-extract, pl-reconcile, pl-build-findings | policy_lens_intakes, pl_documents, Anthropic dual-pass | intake_id FK → policy_lens_intakes (FK: pl_extraction_runs_intake_id_fkey); document_id FK → pl_documents | PolicyLensQueue.jsx:84, ExtractionDetail.jsx:130 |
| **predictive_alerts** | generate-alerts | 7 operational check types | organization_id (column match) | Tenant UI |
| **crawl_health** | crawl-monitor | intelligence_sources (content hash comparison) | feed_id (column match to intelligence_sources) | AdminDashboard.tsx:161, AdminCrawlMonitor.tsx |
| **intelligence_classification_log** | classify-signals | Claude Haiku 4D risk scoring | (no FK — standalone log) | IntelligenceAdmin.tsx (AI cost tracking) |
| **vendor_analytics** | vendor-analytics-snapshot | marketplace_vendors, marketplace_vendor_metrics, marketplace_service_requests | (vendor join) | No admin screen found |
| **location_compliance_scores** | sensor-compliance-aggregate | locations, iot_sensors, iot_sensor_readings, temperature_logs | location_id (column match) | Tenant UI (not admin) |

### C.2 — How Raw Data Becomes Business Intelligence (the core join/derivation logic)

**Intelligence Signal Correlation Chain:**
1. `intelligence-collect` fetches 24 external APIs → writes `intelligence_signals` with county/state metadata (index.ts:788)
2. `canonical-correlate` reads uncorrelated signals (`is_correlated=false`), looks up `jurisdictions` by county (index.ts:33), then `locations` by jurisdiction_id (index.ts:43), upserts `entity_correlations` linking signal → jurisdiction → organization → location (index.ts:63)
3. `classify-signals` sends signal text to Claude Haiku for 4D risk scoring (revenue/liability/cost/operational) — logs to `intelligence_classification_log` (index.ts:191)
4. `intelligence-auto-publish` promotes auto-tier signals to published status (index.ts:97), then invokes `intelligence-deliver`
5. `intelligence-deliver` reads `entity_correlations` for the signal (index.ts:102), finds affected `locations` (index.ts:113) and `organizations` (index.ts:125), sends targeted email+notification

**Policy Lens Extraction Pipeline:**
1. `pl-intake-start` creates `policy_lens_intakes` row (index.ts:363)
2. `pl-intake-finalize` sets status=review, fires `pl-extract` (index.ts:94,105)
3. `pl-extract` creates `pl_extraction_runs`, sets intake status=extracting, dual-pass Anthropic (Sonnet+Opus), writes pass_a/pass_b, fires `pl-reconcile` (index.ts:295,312,379)
4. `pl-reconcile` merges passes into reconciled JSON, sets status=reconciled, fires `pl-build-findings` (index.ts:410)
5. `pl-build-findings` evaluates 30+ trigger templates from `pl_finding_templates` against reconciled data, inserts `pl_findings`, sets intake status=verified (index.ts:950,986)

**Drift Detection Chain:**
1. `detect-operational-drift` runs 13 trigger checks across operational data (temp_logs, checklists, documents, etc.) → writes `drift_catches` per location
2. `pl-compliance-eval` / `pl-compliance-eval-food` / `pl-pse-eval` write additional drift_catches for policy-specific compliance gaps
3. `generate-weekly-drift-report` aggregates drift_catches per org → sends email digest

---

## LAYER D — DOWNSTREAM / SERVING (intelligence → admin user)

### D.1 — Every /admin Route and Its Data Reads

#### Nav-Reachable (16 AdminShell items)

| Nav Section | Route | Component | Tables READ | Intelligence Surfaced | Layer C Stream |
|------------|-------|-----------|-------------|----------------------|----------------|
| Tenants | /admin/orgs | AdminOrgs | organizations | Org management (plans, industry, timezone) | — |
| Tenants | /admin/users | AdminUsers | user_profiles | User management (roles, suspension, sessions) | — |
| Tenants | /admin/staff | StaffRoles | user_profiles, evidly_role_permissions, admin_event_log | Internal staff accounts & permissions | — |
| Tenants | /admin/onboarding | AdminClientOnboarding | (unknown — not fully audited) | Client onboarding progress | — |
| Operations | /admin | AdminHome | billing_subscriptions, organizations, locations, intelligence_sources, intelligence_signals, support_tickets | Platform KPIs (MRR, org/loc counts, signals pending) | intelligence_signals |
| Operations | /admin/configure | Configure | organizations, locations, user_profiles, vendors, admin_event_log, jurisdictions | CRUD for orgs, locations, users, vendors | — |
| Operations | /admin/support | SupportTickets | support_tickets, organizations, support_ticket_replies | Ticket management (SLA, CSAT) | — |
| Operations | /admin/billing | AdminBilling | billing_subscriptions, billing_invoices | MRR, ARR, invoice management | — |
| Policy Lens | /admin/policy-lens | PolicyLensQueue | policy_lens_intakes, pl_extraction_runs, pl_findings | Extraction pipeline queue + Failed stage | pl_extraction_runs, pl_findings |
| Content & Intel | /admin/intelligence | EvidLYIntelligence | intelligence_sources, intelligence_signals, entity_correlations, jurisdiction_intel_updates, regulatory_changes, rfp_listings, jurisdictions, location_risk_predictions, prediction_accuracy_log, platform_settings | THE intelligence moat: 7 tabs, signal triage, correlation view, predictions | entity_correlations, intelligence_signals, location_risk_predictions, regulatory_changes |
| Content & Intel | /admin/scoretable | AdminScoreTable | scoretable_views | SEO analytics for ScoreTable pages | — |
| System Status | /admin/dashboard | AdminDashboard | crawl_health, crawl_runs, admin_event_log, admin_api_keys, assessment_leads, demo_sessions, k2c_donations, organizations, locations | System health rollup (crawl, events, keys, leads) | crawl_health |
| System Status | /admin/audit-log | AdminAuditLog | platform_audit_log | SOX-grade audit trail | — |
| System Status | /admin/system/edge-functions | EdgeFunctions | edge_function_registry, edge_function_invocations | Edge function health & timing | — |
| System Status | /admin/feature-flags | FeatureFlags | feature_flags | Feature toggle control | — |
| Security | /admin/security | AdminSecurity | mfa_policy, session_policy, user_sessions, user_profiles | MFA enforcement, session management | — |
| Security | /admin/security-settings | SecuritySettings | admin_security_config | Domain security (HTTPS, HSTS, CSP) | — |
| Security | /admin/api-keys | InsuranceApiKeys | api_keys, api_request_log | Carrier API key management + usage | — |

#### Route-Reachable (not in nav, 20+ routes)

| Route | Component | Tables READ | Intelligence Surfaced | Layer C Stream |
|-------|-----------|-------------|----------------------|----------------|
| /admin/policy-lens/:intakeId | ExtractionDetail | policy_lens_intakes, pl_extraction_runs, pl_findings, pl_standards_registry | Three-column finding review (source / interpretation / verdict) | pl_findings, pl_extraction_runs |
| /admin/crawl-monitor | AdminCrawlMonitor | intelligence_sources, crawl_runs | Crawl source health, run history | crawl_health (indirect) |
| /admin/rfp-monitor | RfpIntelligence | rfp_listings, rfp_sources, rfp_actions | RFP opportunity discovery | rfp_classifications |
| /admin/jurisdiction-intelligence | JurisdictionIntelligence | jurisdiction_intel_updates, jurisdictions | Jurisdiction regulatory changes | — |
| /admin/intelligence-admin | IntelligenceAdmin | intelligence_signals, intelligence_classification_log | Signal approval queue, AI cost | intelligence_signals |
| /admin/k2c | AdminK2C | k2c_donations | Kitchen-to-Community donations | — |
| /admin/event-log | EventLog | admin_event_log (realtime) | Live admin event stream | — |
| /admin/evidly-vault | EvidlyVault | — (placeholder) | — | — |
| /admin/reports | AdminReports | internal_reports | Internal reporting system | — |
| /admin/verification | VerificationReport | content_verification_status, content_verification_log | Verification coverage audit | content_verification_status |
| /admin/vendor-connect | AdminVendorConnect | vendor_connect_applications, vendor_connect_profiles, vendor_connect_spots, vendor_connect_leads | Vendor Connect marketplace | — |
| /admin/command-center | CommandCenter | admin_event_log, intelligence_sources, support_tickets, organizations, locations | Platform ops health dashboard | — |
| /admin/sales | SalesPipeline | sales_pipeline, demo_sessions | Sales deal management | — |
| /admin/gtm | GtmDashboard | demo_sessions, sales_pipeline_deals, assessment_leads | GTM conversion metrics | — |
| /admin/campaigns | MarketingCampaigns | marketing_campaigns, marketing_touchpoints, sales_pipeline, demo_sessions | Campaign management | — |
| /admin/demo-generator | DemoGenerator | demo_sessions | Demo account creation | — |
| /admin/demo-pipeline | DemoPipeline | demo_sessions, organizations | Demo lifecycle management | — |
| /admin/demo-tours | DemoTours | demo_tours, demo_templates, organizations, locations, user_profiles | Demo tour management | — |
| /admin/violation-outreach | ViolationOutreach | violation_prospects, outreach_touches | Violation prospect outreach | violation_prospects |

### D.2 — Dead Reads (admin screen reads a table nothing writes)

| Admin Screen | Table Read | Issue |
|-------------|-----------|-------|
| VerificationReport | content_verification_status | **No writer function found in any edge function** |
| VerificationReport | content_verification_log | **No writer function found in any edge function** |
| EvidlyVault | — | Placeholder UI — no table created |
| AdminClientOnboarding | (not fully audited) | Needs verification |

### D.3 — Orphan Intelligence (Layer C derived, no admin screen consumes)

| Derived Table | Producer | Issue |
|--------------|----------|-------|
| ai_corrective_actions | ai-corrective-action-draft | No admin screen reads directly |
| ai_weekly_digests | ai-weekly-digest | No admin screen — email delivery only |
| advisor_briefings | generate-advisor-briefing | Tenant UI only, not admin |
| ops_intelligence_insights | ops-intelligence-generate | Tenant UI only, not admin |
| vendor_analytics | vendor-analytics-snapshot | No consumer found anywhere |
| location_compliance_scores | sensor-compliance-aggregate | Tenant UI only, not admin |
| client_intelligence_feed | UNKNOWN writer | UNKNOWN consumer — fully orphaned |

---

## LAYER E — USER ACTIONS (admin user → downstream out)

### E.1 — Admin Actions Catalog

| UI Control | Component | Edge Fn / Write | Tables Written / External Push | Feeds Back to Layer C? |
|-----------|-----------|-----------------|-------------------------------|----------------------|
| Publish signal | EvidLYIntelligence | intelligence_signals.update() | intelligence_signals (status→published) | YES — published signal available for delivery |
| Deliver advisory | EvidLYIntelligence | intelligence-deliver fn | intelligence_signals (delivery_status), admin_event_log, email to clients | YES — creates client_advisories |
| Create advisory | EvidLYIntelligence | client_advisories.insert() | client_advisories | YES — new advisory for delivery |
| Update risk dimensions | EvidLYIntelligence | intelligence_signals.update() | intelligence_signals (risk levels, targeting) | YES — enriches signal |
| Set routing mode | EvidLYIntelligence | platform_settings.upsert() | platform_settings (autonomous/supervised) | YES — controls auto-publish behavior |
| Trigger crawl | CommandCenter | trigger-crawl fn | crawl_runs, intelligence_sources | YES — may produce new signals |
| Trigger intelligence-collect | EvidLYIntelligence | intelligence-collect fn | intelligence_signals, crawl_execution_log | YES — new signals |
| Publish jurisdiction update | EvidLYIntelligence/JurisdictionIntel | jurisdiction_intel_updates.update() | jurisdiction_intel_updates (published flag) | YES — available for delivery |
| Verify jurisdiction update | EvidLYIntelligence | jurisdiction_intel_updates.update() | jurisdiction_intel_updates (verified flag) | — |
| Accept/Correct/Flag finding | ExtractionDetail | pl-review-finding fn | pl_findings (review_state, reviewer_corrected) | YES — reviewed findings ready for release |
| Release report to agent | ExtractionDetail | pl-release-report fn | pl_report_grants, pl_extraction_runs (release_status→released), policy_lens_events | YES — agent can view findings |
| Update org settings | AdminOrgs | organizations.update() | organizations | — |
| Suspend/unsuspend user | AdminUsers | user_profiles.update() | user_profiles (is_suspended) | — |
| Change user role | AdminUsers | user_profiles.update() | user_profiles (role) | — |
| Revoke session | AdminUsers | user_sessions.update() | user_sessions (revoked_at) | — |
| Toggle feature flag | FeatureFlags | feature_flags.update() | feature_flags | — |
| Set MFA policy | AdminSecurity | mfa_policy.update() | mfa_policy | — |
| Create org/location/vendor | Configure | organizations/locations/vendors.insert() | organizations, locations, vendors | — |
| Review document | document-review-action | compliance_documents.update() | compliance_documents, compliance_document_activity_log, compliance_document_requests | — |
| Create K2C donation | AdminK2C | k2c_donations.insert() | k2c_donations | — |
| Approve/reject vendor app | AdminVendorConnect | vendor_connect_applications.update() | vendor_connect_applications | — |
| Update RFP action | RfpIntelligence | rfp_actions.insert() + rfp_listings.update() | rfp_actions, rfp_listings | — |
| Publish jurisdiction intel | JurisdictionIntelligence | jurisdiction_intel_updates.update() | jurisdiction_intel_updates | YES |
| Create demo account | DemoGenerator/DemoTours | demo-account-create fn | auth users, organizations, locations, user_profiles, demo_sessions | — |
| Convert demo | DemoPipeline | demo-account-convert fn | organizations, demo_sessions, demo_generated_data | — |
| Generate outreach | ViolationOutreach | generate-outreach fn | outreach_touches, violation_prospects | — |
| Update sales deal | SalesPipeline | sales_pipeline.update() | sales_pipeline | — |
| Create campaign | MarketingCampaigns | marketing_campaigns.insert() | marketing_campaigns | — |
| Send CSAT survey | SupportTickets | send-email fn | (email only) | — |

---

## LAYER F — END-TO-END LINEAGE + GAPS

### F.1 — Complete Chains (external source → admin screen → user action → output)

| Chain | Source | Ingest Fn | Raw Table | Correlate Fn | Derived Table | Admin Screen | User Action | Output |
|-------|--------|-----------|-----------|-------------|--------------|-------------|-------------|--------|
| 1 | 24 public APIs | intelligence-collect | intelligence_signals | canonical-correlate | entity_correlations | EvidLYIntelligence | Publish + Deliver | Email to affected orgs |
| 2 | Intelligence URLs | crawl-monitor | crawl_health, crawl_runs | — | crawl_health | AdminDashboard, AdminCrawlMonitor | Trigger crawl | New crawl run |
| 3 | SAM.gov/RSS/HTML | rfp-crawl | rfp_listings | rfp-classify | rfp_classifications | RfpIntelligence | Log action | rfp_actions |
| 4 | Health dept pages | violation-crawl | violation_prospects | — | — | ViolationOutreach | Generate outreach | outreach_touches + email |
| 5 | Regulatory sources | monitor-regulations | regulatory_changes | — | regulatory_changes | EvidLYIntelligence / JurisdictionIntel | Publish | notification_queue |
| 6 | Policy PDF upload | pl-extract | pl_extraction_runs | pl-reconcile → pl-build-findings | pl_findings | PolicyLensQueue → ExtractionDetail | Accept/Correct/Flag → Release | pl_report_grants → agent view |
| 7 | IoT sensors | iot-sensor-pull/webhook | iot_sensor_readings | sensor-compliance-aggregate | location_compliance_scores | (tenant only) | — | — |
| 8 | Stripe payments | stripe-webhook | subscriptions | — | — | AdminBilling | — | — |
| 9 | HoodOps webhook | hoodops-webhook | vendor_service_records | pl-compliance-eval / pl-pse-eval | drift_catches | (tenant only) | — | — |
| 10 | Daily cron | copilot-analyze | ai_insights | ai-weekly-digest | ai_weekly_digests | (no admin screen) | — | Email to orgs |
| 11 | Daily cron | ops-intelligence-generate | ops_intelligence_insights | ops-intelligence-coach | ops_intelligence_insights (enriched) | (tenant only) | — | — |
| 12 | Daily cron | snapshot-readiness | readiness_snapshots | generate-alerts | location_risk_predictions | EvidLYIntelligence (predictions tab) | — | — |
| 13 | 13 operational triggers | detect-operational-drift | drift_catches | generate-weekly-drift-report | (email) | (tenant only) | — | Email digest |
| 14 | SCIM / SSO | enterprise-scim-users, enterprise-sso-callback | enterprise_user_mappings | — | — | (no admin screen for SCIM) | — | — |
| 15 | POS APIs | pos-sync-locations | locations | — | — | Configure | — | — |

### F.2 — GAPS TABLE (the honesty section)

#### Orphan Sinks (written, never read by any function or admin screen)

| Table | Writer(s) | Evidence |
|-------|-----------|----------|
| crawl_execution_log | intelligence-collect | No .from('crawl_execution_log').select found in codebase |
| iot_ingestion_log | iot-sensor-pull, iot-sensor-webhook | No consumer found |
| form_submissions | form-submit | No admin screen reads it |
| webhook_logs | webhook-dispatch | No consumer found |
| security_events | document-scan | No consumer found |
| pos_employee_mappings | pos-sync-employees | No admin screen for POS employee review |
| vendor_analytics | vendor-analytics-snapshot | No consumer found anywhere |
| intelligence_auto_publish_log | intelligence-auto-publish | No consumer found |

#### Dead Reads (admin screen reads, nothing writes)

| Table | Reader | Issue |
|-------|--------|-------|
| content_verification_status | VerificationReport.tsx:100 | No writer function found in any edge function |
| content_verification_log | VerificationReport.tsx:105 | No writer function found in any edge function |
| client_intelligence_feed | FK exists (organization_id) | No writer AND no reader admin screen — fully orphaned table |

#### Orphan Intelligence (derived, never surfaced to admin)

| Table | Producer | Issue |
|-------|----------|-------|
| ai_corrective_actions | ai-corrective-action-draft | No admin screen reads; tenant-only |
| ai_weekly_digests | ai-weekly-digest | Email-only delivery; no admin screen |
| advisor_briefings | generate-advisor-briefing | Tenant-only; no admin visibility |
| ops_intelligence_insights | ops-intelligence-generate | Tenant-only; no admin visibility |
| vendor_analytics | vendor-analytics-snapshot | No consumer found at all |
| location_compliance_scores | sensor-compliance-aggregate | Tenant-only; no admin visibility |

#### Registry/Deploy Mismatches

| Type | Count | Details |
|------|-------|---------|
| Deployed but not in repo | 59 | Ghost functions — deployed from prior branches, source removed |
| In repo but not deployed | 1 | portal-access |
| In registry but not deployed | 11 | Phantom cron entries (calculate-fire-safety-score, crawl-code-monitor, intel-aggregate-*, intel-crawl-*, intel-refresh-freshness, send-client-digest, etc.) |
| In registry but not in repo | 17 | Registry is stale — 17 of 18 entries have no matching source directory |

#### UNKNOWN-Trigger Functions

| Function | Issue |
|----------|-------|
| 59 deployed-but-not-in-repo functions | Trigger type cannot be determined — no source to read |
| correlation-engine | DISABLED — returns `{ disabled: true }` |
| enterprise-alert-rollup | DISABLED — manufactured-score removal |
| enterprise-report-generate | DISABLED — manufactured-score removal |
| enterprise-rollup-calculate | DISABLED — manufactured-score removal |

#### Broken Chains

| Chain | Break Point | Issue |
|-------|------------|-------|
| client_intelligence_feed | Table exists with FK but no writer or reader | Fully orphaned — may be a legacy table or planned feature |
| content_verification_status/log | Tables exist and are read by VerificationReport | No edge function writes to them — data source unknown (may be RPC, trigger, or manual) |
| SCIM/SSO provisioning | enterprise_user_mappings written | No admin screen shows SCIM-provisioned users separately |

---

*End of audit. No edits, no commits, no deploys performed. File left uncommitted per instructions.*
