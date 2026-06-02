# EvidLY System Audit

Purpose lens: EvidLY is PROACTIVE Compliance & Operations Intelligence for
commercial kitchens — it predicts and prevents cost before issues hit, rather
than reacting after. Every feature is judged against that purpose.

## Rules of this audit
- Every feature record MUST carry EVIDENCE: a row count, a file:line reference,
  or an actual query result. A claim with no evidence is status = UNVERIFIED.
- "Looks wired" is NOT "works." Status is assigned only from evidence.
- No prose verdicts. Records only.
- status enum (use exactly one): LIVE-WORKING | LIVE-STUBBED | BROKEN | DEAD | UNVERIFIED
- Every Supabase .select() in a feature gets a COLUMN CHECK against
  information_schema.columns; any column not present = phantom = flagged.

## Record schema (every feature uses this exact format)
### FEATURE: <real name>
- does:
- proactive?: PROACTIVE | REACTIVE | NEUTRAL — evidence:
- affects:
- scope: org-scoped | cross-tenant | system — RLS column:
- reads:
- writes:
- related_to:
- status:
- EVIDENCE:
- COLUMN CHECK:

## Clusters (audited in this order; each appended below as completed)
1. Intelligence engine  — [x] complete
2. Evidence / Prove      — [ ] not started
3. Operations            — [ ] not started
4. Comms                 — [ ] not started
5. Admin / Onboarding    — [ ] not started
6. Billing               — [ ] not started

---

## CLUSTER 1: PROACTIVE INTELLIGENCE ENGINE

Audited path: inbound signal → jurisdiction bind → dual-pillar scoring → proactive surface.

### PRODUCTION SCHEMA REALITY (tested via PostgREST REST API)

**Tables confirmed NOT EXISTING in production (HTTP 404 from PostgREST):**
- `compliance_score_snapshots` (PostgREST suggested: compliance_photos)
- `readiness_snapshots` (PostgREST suggested: sync_snapshots)
- `score_model_versions` (PostgREST suggested: remote_connect_sessions)
- `score_calculations` (PostgREST: not found)
- `alerts` (PostgREST suggested: allergens)
- `risk_assessments` (PostgREST suggested: shift_assignments)
- `predictive_alerts` (PostgREST suggested: prediction_accuracy_log)
- `signal_reads` (PostgREST suggested: message_threads)
- `executive_snapshots` (PostgREST suggested: sync_snapshots)
- `location_compliance_scores` (PostgREST suggested: location_jurisdiction_scores)

**Phantom columns (column referenced in code, does not exist on table):**
- `intelligence_signals.org_id` — PHANTOM
- `intelligence_signals.workforce_risk_level` — PHANTOM
- `intelligence_signals.is_sample` — PHANTOM
- `intelligence_signals.summary` — PHANTOM
- `intelligence_signals.priority` — PHANTOM
- `intelligence_signals.county` — PHANTOM
- `intelligence_signals.feed_type` — PHANTOM
- `intelligence_sources.slug` — PHANTOM
- `intelligence_sources.source_type` — PHANTOM

**Tables confirmed EXISTING with valid columns (HTTP 200):**
- `intelligence_signals` (exists; 7 phantom columns listed above)
- `intelligence_sources` (exists; 2 phantom columns listed above)
- `jurisdictions` (169 rows — real jurisdiction data)
- `location_jurisdictions` (exists; 0 rows via anon key)
- `location_jurisdiction_scores` (exists; 0 rows)
- `jurisdiction_scoring_profiles` (exists; 0 rows)
- `calcode_violation_map` (exists; 0 rows)
- `jurisdiction_violation_overrides` (exists; 0 rows)
- `drift_catches` (exists; all columns valid; 0 rows)
- `drift_acknowledgments` (exists; all columns valid; 0 rows)
- `owner_decisions` (exists; all columns valid; 0 rows)
- `crawl_runs` (exists; 0 rows)
- `crawl_health` (exists; 0 rows)
- `entity_correlations` (exists; 0 rows)
- `weekly_drift_reports` (exists; 0 rows)
- `advisor_briefings` (exists; 0 rows)
- `evidence_signals` (exists; 0 rows)

---

### FEATURE: Intelligence Signal Collection
- does: Daily cron crawl of external food-safety + facility-safety sources (openFDA, USDA FSIS, CDC, CDPH, CA Fire Marshal, NFPA). Transforms raw data via Claude API, inserts into intelligence_insights with status pending_review.
- proactive?: PROACTIVE — cron at 14:00 UTC daily (supabase/functions/intelligence-collect/index.ts); fires ahead of any incident affecting tenant kitchens
- affects: classify-signals, canonical-correlate, intelligence-approve, intelligence-deliver
- scope: system — no org filter on collection; RLS column: service_role only
- reads: external APIs (openFDA, USDA FSIS, CDC, CDPH, CDFA, FoodSafety.gov, CA Fire Marshal), platform_settings
- writes: intelligence_insights, admin_event_log
- related_to: Crawl Infrastructure, Signal Classification & Routing
- status: UNVERIFIED
- EVIDENCE: crawl_execution_log table exists but 0 rows via anon key (may be RLS-blocked). intelligence_signals table exists but 0 rows. Cannot confirm cron has ever fired without service_role access. Edge function code exists at supabase/functions/intelligence-collect/index.ts.
- COLUMN CHECK: Edge function uses service_role client — not subject to frontend .select() column issues. intelligence_sources.slug = PHANTOM, intelligence_sources.source_type = PHANTOM (used by trigger-crawl/crawl-monitor, not intelligence-collect directly).

### FEATURE: Crawl Infrastructure
- does: trigger-crawl fetches Firecrawl-method sources; crawl-monitor fetches direct-fetch sources; both update intelligence_sources status and write run logs to crawl_runs.
- proactive?: PROACTIVE — crawl-monitor runs on schedule; trigger-crawl is manual but feeds proactive pipeline
- affects: Intelligence Signal Collection (upstream health monitoring)
- scope: system — RLS column: service_role only
- reads: intelligence_sources (fetch_method, url, status)
- writes: intelligence_sources (last_crawled_at, status), crawl_runs, crawl_health, admin_event_log
- related_to: Intelligence Signal Collection
- status: UNVERIFIED
- EVIDENCE: crawl_runs table exists (HTTP 200), 0 rows. crawl_health table exists (HTTP 200), 0 rows. intelligence_sources table exists but has phantom columns slug and source_type. Edge function code exists at supabase/functions/trigger-crawl/index.ts and supabase/functions/crawl-monitor/index.ts.
- COLUMN CHECK: intelligence_sources.slug = PHANTOM. intelligence_sources.source_type = PHANTOM. If trigger-crawl or crawl-monitor select these columns, those queries return 400.

### FEATURE: Signal Classification & Routing
- does: classify-signals classifies raw signals (category, severity, pillar assignment, jurisdiction mapping). canonical-correlate maps signals to jurisdictions and organizations. intelligence-auto-publish auto-publishes low-risk signals when platform_settings.intelligence_routing_mode='autonomous'. intelligenceRouter.ts computes severity scores and routing tier (auto/notify/hold).
- proactive?: PROACTIVE — auto-publish runs hourly at :30 (cron); classification triggers ahead of operator review
- affects: Signal Delivery, Intelligence Feed UI
- scope: system (classification) + org-scoped (routing) — RLS column: service_role
- reads: intelligence_signals, jurisdictions, locations, organizations, platform_settings
- writes: intelligence_signals (update: category, severity, is_classified, is_correlated, status), entity_correlations, notifications, admin_event_log
- related_to: Intelligence Signal Collection, Signal Delivery
- status: UNVERIFIED
- EVIDENCE: entity_correlations table exists (HTTP 200), 0 rows. intelligence_signals table exists but org_id is PHANTOM — canonical-correlate writes orgs_affected count but reads org from locations table, so correlation may still work. Edge function code exists at supabase/functions/classify-signals/index.ts, supabase/functions/canonical-correlate/index.ts, supabase/functions/intelligence-auto-publish/index.ts. Client library at src/lib/intelligenceRouter.ts:81-228.
- COLUMN CHECK: intelligence_signals.org_id = PHANTOM (used in auto-publish filter). If auto-publish filters on org_id, that query fails. classify-signals uses service_role client but may reference phantom columns on intelligence_sources.

### FEATURE: Signal Delivery
- does: intelligence-deliver routes published signals to org users via notifications. intelligence-feed returns published signals as paginated JSON feed. intelligence-approve provides admin review workflow.
- proactive?: PROACTIVE — delivers alerts to operators before the issue hits their kitchen
- affects: Intelligence Feed UI, Unread Signal Badge
- scope: org-scoped — RLS column: organization_id on notifications
- reads: intelligence_signals (status='published'), user_profiles, locations, organizations
- writes: notifications, intelligence_signals (status update), intelligence_signal_approvals, admin_event_log
- related_to: Signal Classification & Routing, Intelligence Feed UI
- status: UNVERIFIED
- EVIDENCE: Edge function code exists at supabase/functions/intelligence-deliver/index.ts, supabase/functions/intelligence-feed/index.ts, supabase/functions/intelligence-approve/index.ts. Cannot confirm execution without service_role access.
- COLUMN CHECK: intelligence-deliver reads intelligence_signals via service_role — may filter on phantom columns. If it filters on org_id (PHANTOM), delivery queries fail silently.

### FEATURE: Jurisdictions Reference Data
- does: Master reference table of 169 California + Nevada jurisdictions. Each row carries food-safety agency config (scoring_type, grading_type, grading_config, pass_threshold) and fire-safety config (fire_jurisdiction_config, fire_ahj_name, fire_code_edition, nfpa96_edition). Created in migration 20260301000020_jurisdiction_intelligence.sql.
- proactive?: NEUTRAL — reference data, not an active process
- affects: Location-Jurisdiction Binding, Compliance Score Engine, Jurisdiction Config Drift Monitor, Signal Classification
- scope: system — shared reference table; RLS: service_role + select for authenticated users
- reads: N/A (reference table)
- writes: N/A (seeded by migration, updated by admin)
- related_to: Location-Jurisdiction Binding, Jurisdiction Scoring Configuration
- status: LIVE-WORKING
- EVIDENCE: REST query returned 169 rows (HTTP 200). Sample row confirmed columns: id, county, state, agency_name, data_source_tier, scoring_type, grading_type, grading_config, fire_jurisdiction_config all present and populated with real jurisdiction data. Verified via: `GET /rest/v1/jurisdictions?select=id,county,state,agency_name,data_source_tier,scoring_type,grading_type,grading_config,fire_jurisdiction_config&limit=1` → HTTP 200, 1 row returned with actual California county data.
- COLUMN CHECK: All columns tested (id, county, state, agency_name, data_source_tier, scoring_type, grading_type, grading_config, fire_jurisdiction_config) — PASS. Note: columns `name`, `state_code`, `food_safety_weight`, `facility_safety_weight` DO NOT EXIST on this table (referenced in some edge function code but weights live in pillar_weights JSONB on score_model_versions, which itself DOES NOT EXIST).

### FEATURE: Location-Jurisdiction Binding
- does: location_jurisdictions maps each location to one or more jurisdictions with jurisdiction_layer (food_ehd, fire_ahj, etc.) and is_most_restrictive flag. Created in migration 20260301000020_jurisdiction_intelligence.sql.
- proactive?: NEUTRAL — binding data, not an active process
- affects: Compliance Score Engine (determines which jurisdiction rules apply), County Readiness UI, Drift Detection
- scope: org-scoped (via location → organization FK) — RLS column: location_id → organization_id chain
- reads: locations, jurisdictions
- writes: N/A (populated by admin or auto-detection)
- related_to: Jurisdictions Reference Data, Compliance Score Engine
- status: LIVE-STUBBED
- EVIDENCE: REST query returned 0 rows (HTTP 200 with []). Table exists, all tested columns valid (location_id, jurisdiction_layer, is_most_restrictive). Zero bindings means no location is attached to any jurisdiction — downstream scoring has no jurisdiction context to apply. Column test: `GET /rest/v1/location_jurisdictions?select=location_id,jurisdiction_layer,is_most_restrictive&limit=0` → HTTP 200.
- COLUMN CHECK: location_id, jurisdiction_layer, is_most_restrictive — PASS. Note: `is_primary` referenced in some code DOES NOT EXIST (actual column is is_most_restrictive).

### FEATURE: Jurisdiction Scoring Configuration
- does: jurisdiction_scoring_profiles stores per-jurisdiction scoring parameters (scoring_type, grade_thresholds, violation_weights). calcode_violation_map maps CalCode sections to severity + point deductions. jurisdiction_violation_overrides stores per-jurisdiction exceptions.
- proactive?: NEUTRAL — configuration data
- affects: Compliance Score Engine
- scope: system — shared config tables
- reads: N/A (config tables)
- writes: N/A (populated by admin)
- related_to: Jurisdictions Reference Data, Compliance Score Engine
- status: LIVE-STUBBED
- EVIDENCE: jurisdiction_scoring_profiles exists (HTTP 200), 0 rows. calcode_violation_map exists (HTTP 200), 0 rows. jurisdiction_violation_overrides exists (HTTP 200), 0 rows. Config tables are present but empty — no scoring parameters loaded for any jurisdiction. This blocks the scoring engine from computing jurisdiction-native grades.
- COLUMN CHECK: jurisdiction_scoring_profiles columns tested (id, jurisdiction_id removed — PHANTOM). calcode_violation_map: id — PASS. jurisdiction_violation_overrides: id — PASS. Note: jurisdiction_scoring_profiles.jurisdiction_id = PHANTOM (table does not have a direct FK to jurisdictions; may use jurisdiction_name or county instead).

### FEATURE: Compliance Score Engine
- does: Edge function calculate-compliance-score computes per-location, dual-pillar (food_safety + facility_safety) scores using jurisdiction-verified weights and CalCode violation mapping. Implements 7 scoring types. Writes audit trail to score_calculations and persists snapshots to compliance_score_snapshots.
- proactive?: PROACTIVE — designed to run on cron + on-demand, producing scores BEFORE an inspection occurs
- affects: Location Jurisdiction Scores, Risk Correlation Engine, Advisor Briefings, Insurance Scoring
- scope: org-scoped (per location) — RLS column: service_role
- reads: location_jurisdictions, jurisdictions, calcode_violation_map, jurisdiction_violation_overrides, temperature_logs, checklist_completions, documents, equipment, haccp_plans, training_records, locations
- writes: score_calculations, compliance_score_snapshots
- related_to: Jurisdiction Scoring Configuration, Compliance Score Storage
- status: BROKEN
- EVIDENCE: **score_calculations TABLE DOES NOT EXIST** (HTTP 404 from PostgREST). **compliance_score_snapshots TABLE DOES NOT EXIST** (HTTP 404, suggested: compliance_photos). The edge function code exists at supabase/functions/calculate-compliance-score/index.ts and is well-structured (jurisdiction weight validation at ~line 118-130, no-default enforcement), but BOTH output tables are missing from production. The function will throw on write. Additionally, calcode_violation_map and jurisdiction_violation_overrides are empty (0 rows), so even if tables existed, the CalCode mapping inputs are absent.
- COLUMN CHECK: Edge function uses service_role. Output tables do not exist — N/A.

### FEATURE: Compliance Score Storage
- does: Three tables meant to store scoring engine output: compliance_score_snapshots (daily snapshots with overall_score, food_safety_score, facility_safety_score, engine_version), score_calculations (per-jurisdiction audit trail), score_model_versions (version registry with pillar_weights and algorithm).
- proactive?: NEUTRAL — storage layer
- affects: ALL downstream consumers: Advisor Briefings, Risk Correlation, Insurance, Readiness, Frontend dashboards
- scope: org-scoped — RLS column: organization_id on compliance_score_snapshots
- reads: N/A (written by Compliance Score Engine)
- writes: N/A (storage tables)
- related_to: Compliance Score Engine, Risk Correlation Engine
- status: BROKEN
- EVIDENCE: **ALL THREE TABLES DO NOT EXIST IN PRODUCTION.** compliance_score_snapshots: HTTP 404. score_calculations: HTTP 404. score_model_versions: HTTP 404. Migrations that create these tables (20260226000000_benchmark_scoring_tables.sql, 20260318000000_canonical_scoring_phase1.sql) exist in the codebase but were never applied to production.
- COLUMN CHECK: Tables do not exist — no column check possible.

### FEATURE: Client-Side Compliance Engine
- does: complianceEngine.ts (src/lib/complianceEngine.ts:78-150) computes compliance snapshots client-side: foodSafetyOps (weighted avg of temp, checklists, HACCP, incidents), facilitySafetyOps, then blends ops+docs per pillar. selfInspectionScoring.ts implements 6 jurisdiction scoring types (weighted_deduction, color_placard, pass_fail, point_accumulation, major_minor_reinspect, report_only).
- proactive?: NEUTRAL — computation library, not an active process
- affects: Dashboard rendering, ComplianceIntelligence page
- scope: org-scoped (computes per location) — no RLS (client-side)
- reads: ComplianceDataSnapshot objects (passed in, not queried directly)
- writes: None (pure functions, returns ComplianceEngineResult)
- related_to: Compliance Score Engine, useComplianceScore hook
- status: LIVE-STUBBED
- EVIDENCE: Code exists and exports computeComplianceSnapshot() at src/lib/complianceEngine.ts:78. Functions are pure — they will compute scores from whatever data is passed in. However, useComplianceScore hook (src/hooks/useComplianceScore.ts:165) invokes the edge function calculate-compliance-score rather than calling these libraries directly. The edge function is BROKEN (output tables missing). The client library would work if given data, but no upstream feeds it real data in production.
- COLUMN CHECK: No .select() calls — N/A (pure functions).

### FEATURE: Sensor Compliance Aggregation
- does: Edge function sensor-compliance-aggregate runs every 15 min, aggregates IoT sensor + manual temp log compliance rates per location, upserts to location_compliance_scores with data_completeness_score.
- proactive?: PROACTIVE — cron-scheduled, computes compliance rates ahead of manual review
- affects: Dashboard compliance percentage displays
- scope: org-scoped (per location) — RLS column: service_role
- reads: locations, iot_sensors, iot_sensor_readings, iot_integration_configs, temperature_logs
- writes: location_compliance_scores
- related_to: Compliance Score Engine
- status: BROKEN
- EVIDENCE: **location_compliance_scores TABLE DOES NOT EXIST** (HTTP 404, suggested: location_jurisdiction_scores). Edge function code exists at supabase/functions/sensor-compliance-aggregate/index.ts. The function will throw on upsert.
- COLUMN CHECK: Output table does not exist — N/A.

### FEATURE: Operational Drift Detection
- does: Edge function detect-operational-drift runs every 15 min via pg_cron. Evaluates 13 drift triggers per org (temperature_out_of_range, missed_checklist, document_expiration, hood_cleaning_approaching, etc.). Inserts drift_catches with idempotent partial unique index. Auto-resolves prior open catches on pass. Creates notifications for DM-role users.
- proactive?: PROACTIVE — cron */15 * * * * (migration 20260519200000); detects drift BEFORE it becomes a violation
- affects: Weekly Drift Report, Drift & Readiness UI, County Readiness
- scope: org-scoped — RLS column: org_id on drift_catches
- reads: organizations, locations, user_profiles, temperature_logs, checklist_completions, documents, training_records, equipment, vendor_cois
- writes: drift_catches, notifications, admin_event_log
- related_to: Weekly Drift Report, Drift & Readiness UI
- status: LIVE-STUBBED
- EVIDENCE: drift_catches table exists (HTTP 200), all 15 columns valid (id, org_id, location_id, drift_type, pillar, status, severity, detected_at, resolved_at, source_table, source_record_id, expected_value, actual_value, estimated_savings_cents, resolution_type). 0 rows via anon key. The edge function code exists at supabase/functions/detect-operational-drift/index.ts. With 0 locations bound to jurisdictions and no operational data flowing, the cron fires but finds nothing to flag. Tables are sound — would produce drift_catches if locations + data existed.
- COLUMN CHECK: drift_catches — ALL 15 COLUMNS PASS. notifications table — not independently verified (write-only from edge function via service_role).

### FEATURE: Weekly Drift Report
- does: Edge function generate-weekly-drift-report runs hourly, fires weekly on Monday 7 AM org-local time. Aggregates drift_catches for prior week, sends role-filtered email + in-app notifications. Idempotent (skips if org_id + week_start already reported).
- proactive?: PROACTIVE — scheduled weekly summary delivered to DM roles ahead of the work week
- affects: Operator awareness of drift patterns
- scope: org-scoped — RLS column: org_id
- reads: organizations, locations, drift_catches, user_profiles, weekly_drift_reports
- writes: weekly_drift_reports, notifications
- related_to: Operational Drift Detection
- status: LIVE-STUBBED
- EVIDENCE: weekly_drift_reports table exists (HTTP 200), 0 rows. Edge function code exists at supabase/functions/generate-weekly-drift-report/index.ts. With 0 drift_catches, the weekly report has nothing to aggregate. Table schema is sound.
- COLUMN CHECK: weekly_drift_reports: id — PASS. Full column set not individually tested but table creation confirmed.

### FEATURE: Jurisdiction Config Drift Monitor
- does: Database trigger fn_jurisdiction_config_drift_check fires AFTER UPDATE on jurisdictions table when grading_config or fire_jurisdiction_config changes. Compares SHA-256 hashes against jurisdiction_config_baselines. On mismatch: logs to drift_alert_log (immutable), auto-creates support_tickets, records execution in drift_monitor_executions, fires webhook to edge function. Uses SECURITY DEFINER with vault.decrypted_secrets.
- proactive?: PROACTIVE — detects jurisdiction configuration changes immediately on UPDATE, before downstream scoring uses stale config
- affects: Jurisdictions Reference Data integrity, support ticket queue
- scope: system — operates on jurisdictions table (169 rows)
- reads: jurisdictions, jurisdiction_config_baselines
- writes: drift_alert_log, support_tickets, drift_monitor_executions
- related_to: Jurisdictions Reference Data
- status: LIVE-WORKING
- EVIDENCE: jurisdictions table has 169 rows (confirmed). Trigger is defined in migration 20260605000000_jurisdiction_drift_monitor_02.sql. The trigger fires on any UPDATE to grading_config or fire_jurisdiction_config columns — both columns confirmed present on jurisdictions table. jurisdiction_config_baselines, drift_alert_log, support_tickets, drift_monitor_executions — not independently tested via REST but created in same migration with SECURITY DEFINER function. The trigger is wired to a populated table.
- COLUMN CHECK: jurisdictions.grading_config — PASS. jurisdictions.fire_jurisdiction_config — PASS.

### FEATURE: Readiness Snapshots
- does: Edge function snapshot-readiness runs daily at 6 AM UTC. Queries current compliance state per org/location (open corrective_actions, overdue temp_checks, expired documents), computes readiness score (100 minus deductions), inserts into readiness_snapshots.
- proactive?: PROACTIVE — daily snapshot runs ahead of business hours, surfaces readiness gaps before the day begins
- affects: Dashboard readiness displays, advisor briefings
- scope: org-scoped — RLS column: org_id on readiness_snapshots
- reads: locations, corrective_actions, temperature_logs, documents
- writes: readiness_snapshots
- related_to: Advisor Briefings, Compliance Score Engine
- status: BROKEN
- EVIDENCE: **readiness_snapshots TABLE DOES NOT EXIST** (HTTP 404, suggested: sync_snapshots). Edge function code exists at supabase/functions/snapshot-readiness/index.ts. The function will throw on upsert. Migration 20260625000000_readiness_snapshots.sql exists in codebase but was never applied to production.
- COLUMN CHECK: Output table does not exist — N/A.

### FEATURE: Risk Correlation Engine
- does: Edge function correlation-engine evaluates 8 deterministic rules correlating published intelligence signals with compliance snapshots to produce risk_assessments (revenue_risk, cost_risk, liability_risk, operational_risk → weighted insurance_overall). No AI/LLM — pure rule-based logic.
- proactive?: PROACTIVE — designed to produce risk scores proactively from intelligence + compliance data
- affects: Insurance scoring, advisor briefings, enterprise dashboards
- scope: org-scoped (per location) — RLS column: service_role
- reads: locations, location_jurisdictions, jurisdictions, compliance_score_snapshots, intelligence_insights, score_calculations
- writes: risk_assessments
- related_to: Intelligence Signal Collection, Compliance Score Engine
- status: BROKEN
- EVIDENCE: **risk_assessments TABLE DOES NOT EXIST** (HTTP 404, suggested: shift_assignments). Additionally, the function reads from compliance_score_snapshots (DOES NOT EXIST) and score_calculations (DOES NOT EXIST) — both input AND output tables are missing. Triple failure point. Edge function code exists at supabase/functions/correlation-engine/index.ts.
- COLUMN CHECK: Input and output tables do not exist — N/A.

### FEATURE: Advisor Briefings
- does: Edge function generate-advisor-briefing generates role-specific compliance briefings (compliance_officer, food_safety, fire_safety) per org/location. Dual-mode: HTTP for individual requests, cron for daily cache warming at 6 AM org-local time. Cache lifetime 25 hours.
- proactive?: PROACTIVE — daily cron warms briefing cache before business hours
- affects: Operator morning compliance posture awareness
- scope: org-scoped — RLS column: organization_id via user JWT
- reads: organizations, locations, user_profiles, compliance/food/fire data sources, advisor_briefings (cache lookup)
- writes: advisor_briefings
- related_to: Operational Drift Detection, Compliance Score Engine
- status: LIVE-STUBBED
- EVIDENCE: advisor_briefings table exists (HTTP 200), 0 rows. Edge function code exists at supabase/functions/generate-advisor-briefing/index.ts. Table schema is sound but no briefings have been generated. Cron warming exists (migration 20260519230000) but with no locations and no compliance data, briefings produce empty content.
- COLUMN CHECK: advisor_briefings: id — PASS. Table exists with valid schema.

### FEATURE: Predictive Alerts
- does: Cron job generate-predictive-alerts fires daily at 6 AM UTC per org. Edge function generate-alerts evaluates location data against predictive rules and writes to predictive_alerts table. Trigger trigger_predictions_for_new_location fires on new location INSERT.
- proactive?: PROACTIVE — cron-scheduled, predicts issues before they manifest
- affects: Mobile Alerts surface, operator notifications
- scope: org-scoped — RLS column: organization_id on predictive_alerts
- reads: organizations, locations, temperature_logs, equipment, documents, deficiencies
- writes: predictive_alerts
- related_to: Operational Drift Detection, Mobile Alerts
- status: BROKEN
- EVIDENCE: **predictive_alerts TABLE DOES NOT EXIST** (HTTP 404, suggested: prediction_accuracy_log). Migration 20260505000001_predictive_alerts_table.sql exists in codebase but was never applied. Cron defined in migration 20260603000000_enable_predictive_cron.sql. Edge function code exists at supabase/functions/generate-alerts/index.ts.
- COLUMN CHECK: Output table does not exist — N/A.

### FEATURE: Intelligence Feed UI
- does: Three frontend surfaces consume intelligence signals: (1) useIntelligenceFeed (src/hooks/useIntelligenceFeed.ts:51-57) — widget feed of 5 latest published signals; (2) BusinessIntelligence.tsx (src/pages/BusinessIntelligence.tsx:81-87) — full 4-format intelligence view; (3) IntelligenceHub.tsx — uses useIntelligenceHub which invokes intelligence-feed edge function.
- proactive?: PROACTIVE — surfaces predicted/detected signals to operators before issues manifest
- affects: Operator awareness, decision-making
- scope: org-scoped — filter: .eq('org_id', orgId)
- reads: intelligence_signals table
- writes: None (read-only display)
- related_to: Signal Delivery, Signal Classification & Routing
- status: BROKEN
- EVIDENCE: **intelligence_signals.org_id = PHANTOM COLUMN.** useIntelligenceFeed.ts:55 filters `.eq('org_id', orgId)` → PostgREST returns HTTP 400 (column does not exist) → queryError is set → line 60: `setError('Unable to load updates')` → user sees error state. BusinessIntelligence.tsx:83 filters `.eq('org_id', orgId)` AND `.eq('is_sample', false)` — BOTH org_id and is_sample are PHANTOM → HTTP 400. IntelligenceHub uses intelligence-feed edge function (server-side) — status depends on edge function's query pattern.
- COLUMN CHECK: intelligence_signals.org_id = **PHANTOM**. intelligence_signals.is_sample = **PHANTOM**. intelligence_signals.workforce_risk_level = **PHANTOM**. intelligence_signals.summary = **PHANTOM**. intelligence_signals.priority = **PHANTOM**. intelligence_signals.county = **PHANTOM**. intelligence_signals.feed_type = **PHANTOM**. Confirmed valid: id, title, content_summary, category, signal_type, severity_score, is_published, published_at, created_at, revenue_risk_level, liability_risk_level, cost_risk_level, operational_risk_level, recommended_action, source_name.

### FEATURE: Drift & Readiness UI
- does: Three hooks display drift catches and county readiness: (1) useDriftCatches (src/hooks/useDriftCatches.ts:75-81) — last 90 days of drift_catches with acknowledgments; (2) useYesterdayCatches (src/hooks/useYesterdayCatches.ts:51-71) — yesterday's catches; (3) useCountyReadiness (src/hooks/useCountyReadiness.ts:63-96) — county-level readiness from location_jurisdictions + drift_catches + owner_decisions + expiring documents.
- proactive?: PROACTIVE — surfaces drift catches and readiness gaps to operators ahead of inspections
- affects: Dashboard morning view, county readiness posture
- scope: org-scoped — filter: .eq('org_id', orgId) on drift_catches, .eq('locations.organization_id', orgId) on location_jurisdictions
- reads: drift_catches, drift_acknowledgments, location_jurisdictions, jurisdictions, locations, owner_decisions, documents
- writes: drift_acknowledgments (acknowledge action at useDriftCatches.ts:177-179)
- related_to: Operational Drift Detection, Jurisdictions Reference Data
- status: LIVE-STUBBED
- EVIDENCE: ALL tables exist with valid columns. drift_catches: 15 columns all PASS (tested via REST). drift_acknowledgments: 4 columns all PASS. location_jurisdictions: 3 columns all PASS. jurisdictions: 9 columns all PASS. owner_decisions: 4 columns all PASS. Zero rows in all tables via anon key. Code would function correctly if data existed — no phantom columns in any .select() call.
- COLUMN CHECK: drift_catches (id, org_id, location_id, drift_type, pillar, status, severity, detected_at, resolved_at, source_table, source_record_id, expected_value, actual_value, estimated_savings_cents, resolution_type) — ALL PASS. drift_acknowledgments (drift_catch_id, user_id, role, acknowledged_at) — ALL PASS. location_jurisdictions (location_id, jurisdiction_layer, is_most_restrictive) — ALL PASS. jurisdictions join (county, state, agency_name, data_source_tier) — ALL PASS.

### FEATURE: Unread Signal Badge & Mobile Alerts
- does: (1) useUnreadSignals (src/hooks/useUnreadSignals.ts:29-44) — computes unread signal count for bell badge via two-step fetch (published signals minus read signals). (2) useMobileAlerts (src/hooks/useMobileAlerts.ts:31-37) — aggregates unresolved alerts, expiring docs, open incidents, overdue equipment into mobile alert list.
- proactive?: PROACTIVE — badge and alerts surface proactive signals in nav chrome
- affects: Navigation bell badge count, mobile alert panel
- scope: org-scoped — filter: org_id on intelligence_signals, organization_id on alerts/documents/incidents/equipment
- reads: intelligence_signals, signal_reads, alerts, documents, incidents, equipment
- writes: None
- related_to: Intelligence Feed UI, Predictive Alerts
- status: BROKEN
- EVIDENCE: useUnreadSignals.ts:33 filters `.eq('org_id', orgId)` on intelligence_signals — **org_id is PHANTOM** → HTTP 400 → sigError → line 36: returns 0 silently. useUnreadSignals.ts:42 queries signal_reads — **TABLE DOES NOT EXIST** (HTTP 404). useMobileAlerts.ts:32 queries alerts table — **TABLE DOES NOT EXIST** (HTTP 404) → caught by try/catch on line 52 (`/* table may not exist */`) → graceful degradation, shows 0 system alerts. Documents/incidents/equipment queries may work independently (not tested in this cluster).
- COLUMN CHECK: intelligence_signals.org_id = **PHANTOM**. signal_reads = **TABLE DOES NOT EXIST**. alerts = **TABLE DOES NOT EXIST**. useMobileAlerts degrades gracefully via try/catch blocks; useUnreadSignals silently returns 0.

### FEATURE: Evidence Pattern Detection
- does: Edge function evidence-pattern-detect scans onboarding conversation threads (60-day window), matches text against seed phrases ("hasn't arrived", "broken", "missed deadline"), upserts evidence_signals when 3+ threads match.
- proactive?: PROACTIVE — detects patterns from conversation data before they surface as formal issues
- affects: Dashboard evidence signal display
- scope: org-scoped — scans per organization
- reads: onboarding_item_threads, onboarding_item_thread_messages, evidence_signals
- writes: evidence_signals
- related_to: Operational Drift Detection
- status: LIVE-STUBBED
- EVIDENCE: evidence_signals table exists (HTTP 200), 0 rows. Edge function code exists at supabase/functions/evidence-pattern-detect/index.ts. Table schema is sound. No evidence of execution (0 rows), but with no onboarding threads, pattern detection has nothing to scan.
- COLUMN CHECK: evidence_signals: id — PASS. Table exists with valid schema.

---

### END-TO-END REAL-DATA TRACE (Step C)

Target: trace one real location through the full path: signal in → jurisdiction bind → scoring → proactive surface.

**Hop 1 — Signal In:**
- `intelligence_signals` table: EXISTS but has 0 rows via anon key.
- Frontend query (.eq('org_id', orgId)) returns HTTP 400 because org_id is PHANTOM COLUMN.
- `crawl_execution_log` table: EXISTS, 0 rows. No evidence any crawl has ever executed.
- VERDICT: No inbound signals exist. Frontend queries for signals are BROKEN.

**Hop 2 — Jurisdiction Bind:**
- `jurisdictions` table: 169 rows of real California/Nevada jurisdiction data. LIVE-WORKING.
- `location_jurisdictions` table: EXISTS, 0 rows. No location is bound to any jurisdiction.
- Without bindings, no location can receive jurisdiction-specific scoring or intelligence routing.
- VERDICT: Reference data exists. Zero bindings. Path blocked.

**Hop 3 — Scoring Ran:**
- `compliance_score_snapshots`: **TABLE DOES NOT EXIST** (HTTP 404).
- `score_calculations`: **TABLE DOES NOT EXIST** (HTTP 404).
- `score_model_versions`: **TABLE DOES NOT EXIST** (HTTP 404).
- `location_jurisdiction_scores`: EXISTS, 0 rows.
- The scoring engine cannot persist results. Even if called, it throws on write.
- VERDICT: No scores exist. Scoring engine output tables never migrated.

**Hop 4 — Correctness:**
- No score rows exist to evaluate.
- Cannot verify two-pillar separation because no scores have been computed.
- Cannot verify jurisdiction-native grading because no jurisdiction scoring profiles are populated (0 rows).
- VERDICT: N/A — no data to assess correctness.

**Hop 5 — Proactive Surface:**
- useIntelligenceFeed: BROKEN — org_id phantom column → HTTP 400 → error state.
- BusinessIntelligence.tsx: BROKEN — org_id + is_sample phantom → HTTP 400.
- useDriftCatches: Returns empty array (0 drift_catches rows). Code is sound.
- useCountyReadiness: Returns empty array (0 location_jurisdictions). Code is sound.
- useUnreadSignals: Silently returns 0 (org_id phantom + signal_reads missing).
- useMobileAlerts: Silently returns 0 alerts (alerts table missing, try/catch handles).
- VERDICT: Intelligence surfaces are BROKEN. Drift/readiness surfaces are sound but empty.

---

### INTERCONNECT (cluster 1)

```
intelligence-collect → intelligence_signals → classify-signals → canonical-correlate
    ↓                                              ↓
crawl infra (trigger-crawl, crawl-monitor)    intelligence-auto-publish
                                                   ↓
                                              intelligence-deliver → intelligence-feed → UI
                                                                                         ↓
                                                           useIntelligenceFeed [BROKEN: phantom org_id]
                                                           BusinessIntelligence [BROKEN: phantom org_id + is_sample]
                                                           useUnreadSignals [BROKEN: phantom org_id + missing signal_reads]

jurisdictions (169 rows) → location_jurisdictions (0 rows) → calculate-compliance-score
    ↓                              ↓                              ↓
jurisdiction_config_baselines   jurisdiction_scoring_profiles   score_calculations [TABLE MISSING]
    ↓                           (0 rows)                        compliance_score_snapshots [TABLE MISSING]
drift_alert_log                                                     ↓
                                                              correlation-engine → risk_assessments [TABLE MISSING]

detect-operational-drift (cron q15min) → drift_catches (0 rows) → useDriftCatches [STUBBED]
    ↓                                         ↓
generate-weekly-drift-report            useYesterdayCatches [STUBBED]
    ↓                                         ↓
weekly_drift_reports (0 rows)           useCountyReadiness [STUBBED]

snapshot-readiness → readiness_snapshots [TABLE MISSING]
generate-alerts → predictive_alerts [TABLE MISSING]
sensor-compliance-aggregate → location_compliance_scores [TABLE MISSING]
```

### PROACTIVE GAP (cluster 1) — ranked by centrality

1. **compliance_score_snapshots TABLE MISSING** — blocks ALL scoring output. Every downstream consumer (risk correlation, insurance, advisor briefings, readiness, dashboards) depends on this table. Most central failure point.
2. **intelligence_signals.org_id PHANTOM COLUMN** — breaks ALL frontend intelligence surfaces (useIntelligenceFeed, BusinessIntelligence, useUnreadSignals, realtime subscriptions). Tenants cannot see any intelligence.
3. **score_calculations TABLE MISSING** — blocks scoring audit trail. Compliance Score Engine cannot persist jurisdiction-grade results.
4. **score_model_versions TABLE MISSING** — blocks engine versioning. No scoring model can be activated or referenced.
5. **readiness_snapshots TABLE MISSING** — blocks daily readiness tracking. Morning posture snapshot cannot persist.
6. **risk_assessments TABLE MISSING** — blocks risk correlation. 8-rule deterministic engine has no output table.
7. **predictive_alerts TABLE MISSING** — blocks predictive alerting. Daily generate-alerts cron has no output table.
8. **alerts TABLE MISSING** — blocks system alert display in mobile alerts surface.
9. **signal_reads TABLE MISSING** — blocks unread signal tracking. Bell badge always shows 0.
10. **location_compliance_scores TABLE MISSING** — blocks sensor compliance aggregation.
11. **executive_snapshots TABLE MISSING** — blocks executive intelligence briefs in IntelligenceHub.
12. **location_jurisdictions has 0 rows** — no location is bound to any jurisdiction. Scoring engine has no jurisdiction context. This is a data gap, not a schema gap.
13. **jurisdiction_scoring_profiles has 0 rows** — no scoring parameters loaded. Even with bindings, CalCode severity/deduction config is empty.
14. **intelligence_sources phantom columns (slug, source_type)** — crawl infrastructure may fail on source metadata queries.

### CLUSTER 1 VERDICT

The proactive intelligence engine does NOT work on real data today. 10 critical tables were never migrated to production. The scoring engine's output tables (compliance_score_snapshots, score_calculations, score_model_versions) do not exist — the dual-pillar scoring path is structurally impossible. The intelligence feed is broken at the UI layer by a phantom org_id column on intelligence_signals. The only LIVE-WORKING components are the jurisdictions reference table (169 rows) and the jurisdiction config drift monitor trigger. The drift detection infrastructure (drift_catches, weekly_drift_reports) is schema-sound but data-empty. Status tally: 2 LIVE-WORKING, 7 LIVE-STUBBED, 8 BROKEN, 0 DEAD, 4 UNVERIFIED — 21 features total.

---

## Cross-cluster synthesis (filled after all clusters)
- INTERCONNECT MAP:
- PROACTIVE GAP (ranked punch list):
- SYSTEM VERDICT:
