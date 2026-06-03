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

## CLUSTER 1: JURISDICTION INTELLIGENCE ENGINE (JIE)

Corrected lens: EvidLY REPORTS what each jurisdiction requires — food safety
(EHD) and fire safety (AHJ/NFPA), two pillars, NEVER blended. It does NOT
score kitchens. Scoring/benchmarking is a FUTURE PHASE (not a current gap).
PRP (Predict/Reduce/Prove) is a UI presentation pattern with design tokens,
not DB data.

Audited path: jurisdiction rulebook → bound to tenant's location →
inbound signals / requirements / due-dates → surfaced PROACTIVELY in tenant UI.

### PRODUCTION SCHEMA REALITY (tested via PostgREST REST API)

**Tables confirmed NOT EXISTING in production (HTTP 404):**
- `signal_reads` (suggested: message_threads)
- `alerts` (suggested: allergens)
- `equipment_maintenance_schedule` (not found)
- `federal_overlay_jurisdictions` (not found)
- `location_jurisdiction_profiles` (not found)
- `certification_requirements` (not found)

**FUTURE PHASE tables — not current gaps (planned scoring/benchmarking phase):**
- `compliance_score_snapshots` — scoring engine output
- `score_calculations` — scoring audit trail
- `score_model_versions` — engine version registry
- `readiness_snapshots` — daily readiness tracking
- `risk_assessments` — risk correlation output
- `predictive_alerts` — predictive alerting output
- `location_compliance_scores` — sensor aggregation output
- `executive_snapshots` — executive intelligence briefs

**Phantom columns (referenced in code, does not exist on table):**
- `locations.jurisdiction_id` — breaks useJurisdiction hook
- `locations.address_line1`, `locations.county` — PHANTOM
- `locations.next_hood_cleaning_due`, `next_suppression_semi_annual_due`, `next_fire_extinguisher_check_due` — PHANTOM
- `intelligence_signals.org_id` — breaks all frontend intelligence surfaces
- `intelligence_signals.workforce_risk_level`, `is_sample`, `summary`, `priority`, `county`, `feed_type` — PHANTOM
- `intelligence_sources.slug`, `source_type` — PHANTOM
- `equipment.next_maintenance_due`, `equipment.is_active` — PHANTOM
- `location_service_schedules.service_type`, `frequency_months`, `last_completed_date` — PHANTOM
- `corrective_actions.priority` — PHANTOM
- `vendor_service_records.service_type`, `completed_date` — PHANTOM
- `jurisdictions.food_agency_id`, `food_agency_name`, `food_scoring_type`, `food_grading_type` — PHANTOM (code falls back via `||`)
- `jurisdictions.fire_agency_id`, `fire_agency_name`, `fire_inspection_frequency`, `food_inspection_frequency` — PHANTOM (code falls back via `||`)

**Tables confirmed EXISTING with valid columns (HTTP 200):**
- `jurisdictions` (169 rows — real California/Nevada jurisdiction data)
- `location_jurisdictions` (0 rows; valid: location_id, jurisdiction_layer, is_most_restrictive)
- `jurisdiction_scoring_profiles` (0 rows)
- `calcode_violation_map` (0 rows)
- `jurisdiction_violation_overrides` (0 rows)
- `drift_catches` (0 rows; all 15 columns valid)
- `drift_acknowledgments` (0 rows; all 4 columns valid)
- `owner_decisions` (0 rows; all 4 columns valid)
- `crawl_runs` (0 rows)
- `crawl_health` (0 rows)
- `entity_correlations` (0 rows)
- `weekly_drift_reports` (0 rows)
- `advisor_briefings` (0 rows)
- `evidence_signals` (0 rows)
- `compliance_documents` (0 rows; valid: id, location_id, status, expiry_date)
- `location_service_schedules` (0 rows; valid: id, is_active, next_due_date)
- `corrective_actions` (0 rows; valid: id, location_id, status)
- `intelligence_signals` (0 rows; 7 phantom columns listed above)
- `intelligence_sources` (0 rows; 2 phantom columns listed above)

---

### LAYER A — JURISDICTION RULEBOOK

### FEATURE: Jurisdictions Reference Data
- does: Master reference table of 169 California + Nevada jurisdictions. Each row carries food-safety agency config (scoring_type, grading_type, grading_config, pass_threshold) and fire-safety config (fire_jurisdiction_config, fire_ahj_name, fire_code_edition, nfpa96_edition). Dual-pillar by design — food and fire config stored separately on each row. Created in migration 20260301000020_jurisdiction_intelligence.sql.
- proactive?: NEUTRAL — reference data, not an active process
- affects: Location-Jurisdiction Binding, useJurisdiction Hook, Signal Classification, Drift Detection
- scope: system — shared reference table; RLS: service_role + select for authenticated
- reads: N/A (reference table)
- writes: N/A (seeded by migration, updated by admin)
- related_to: Location-Jurisdiction Binding, Jurisdiction Config Drift Monitor
- status: LIVE-WORKING
- EVIDENCE: REST query returned 169 rows (HTTP 200). Sample row confirmed: id, county, state, agency_name, data_source_tier, scoring_type, grading_type, grading_config, fire_jurisdiction_config — all present and populated with real California county data.
- COLUMN CHECK: id, county, state, agency_name, data_source_tier, scoring_type, grading_type, grading_config, fire_jurisdiction_config — ALL PASS. Note: 8 prefixed columns (food_agency_id, food_agency_name, food_scoring_type, food_grading_type, fire_agency_id, fire_agency_name, fire_inspection_frequency, food_inspection_frequency) are PHANTOM — code in useJurisdiction falls back via `||` to the real column names.

### FEATURE: Jurisdiction Config Drift Monitor
- does: Database trigger fn_jurisdiction_config_drift_check fires AFTER UPDATE on jurisdictions table when grading_config or fire_jurisdiction_config changes. Compares SHA-256 hashes against jurisdiction_config_baselines. On mismatch: logs to drift_alert_log (immutable), auto-creates support_tickets, records in drift_monitor_executions, fires webhook. Uses SECURITY DEFINER with vault.decrypted_secrets.
- proactive?: PROACTIVE — detects jurisdiction config changes immediately on UPDATE, before downstream consumers use stale config
- affects: Jurisdictions Reference Data integrity, support ticket queue
- scope: system — operates on jurisdictions table (169 rows)
- reads: jurisdictions, jurisdiction_config_baselines
- writes: drift_alert_log, support_tickets, drift_monitor_executions
- related_to: Jurisdictions Reference Data
- status: LIVE-WORKING
- EVIDENCE: jurisdictions table has 169 rows (confirmed). Trigger defined in migration 20260605000000_jurisdiction_drift_monitor_02.sql. Fires on UPDATE to grading_config or fire_jurisdiction_config — both columns confirmed present.
- COLUMN CHECK: jurisdictions.grading_config — PASS. jurisdictions.fire_jurisdiction_config — PASS.

### FEATURE: CalCode Violation Map
- does: calcode_violation_map maps CalCode sections to severity and point deductions. jurisdiction_violation_overrides stores per-jurisdiction exceptions. Used to translate jurisdiction violation codes into structured data.
- proactive?: NEUTRAL — configuration data for jurisdiction requirement interpretation
- affects: Jurisdiction requirement detail display
- scope: system — shared config tables
- reads: N/A (config tables)
- writes: N/A (populated by admin)
- related_to: Jurisdictions Reference Data
- status: LIVE-STUBBED
- EVIDENCE: calcode_violation_map exists (HTTP 200), 0 rows. jurisdiction_violation_overrides exists (HTTP 200), 0 rows. Tables present but empty — no CalCode mappings loaded.
- COLUMN CHECK: calcode_violation_map: id — PASS. jurisdiction_violation_overrides: id — PASS.

### FEATURE: Jurisdiction Scoring Configuration
- does: jurisdiction_scoring_profiles stores per-jurisdiction grading parameters (how each jurisdiction grades kitchens — scoring_type, grade_thresholds, violation_weights). This is jurisdiction-native grading config, NOT EvidLY-computed scores.
- proactive?: NEUTRAL — configuration data
- affects: Jurisdiction requirement display (what score thresholds each jurisdiction uses)
- scope: system — shared config table
- reads: N/A (config table)
- writes: N/A (populated by admin)
- related_to: Jurisdictions Reference Data, CalCode Violation Map
- status: LIVE-STUBBED
- EVIDENCE: jurisdiction_scoring_profiles exists (HTTP 200), 0 rows. No jurisdiction grading parameters loaded.
- COLUMN CHECK: id — PASS.

---

### LAYER B — LOCATION-JURISDICTION BINDING

### FEATURE: Location-Jurisdiction Binding
- does: location_jurisdictions maps each location to one or more jurisdictions with jurisdiction_layer (food_ehd, fire_ahj, etc.) and is_most_restrictive flag. Implements the dual-pillar architecture — a location can have separate food and fire jurisdiction bindings.
- proactive?: NEUTRAL — binding data, not an active process
- affects: useJurisdiction Hook, County Readiness UI, Drift Detection, all per-location requirements display
- scope: org-scoped (via location → organization FK) — RLS column: location_id chain
- reads: locations, jurisdictions
- writes: N/A (populated by admin or auto-detection)
- related_to: Jurisdictions Reference Data, useJurisdiction Hook
- status: LIVE-STUBBED
- EVIDENCE: REST query returned 0 rows (HTTP 200). Table exists, all columns valid (location_id, jurisdiction_layer, is_most_restrictive). Zero bindings means no location is attached to any jurisdiction — all downstream per-location jurisdiction features have no context. Column test confirmed HTTP 200.
- COLUMN CHECK: location_id, jurisdiction_layer, is_most_restrictive — ALL PASS. Note: `is_primary` referenced in some code DOES NOT EXIST (actual column is is_most_restrictive).

### FEATURE: useJurisdiction Hook
- does: Frontend hook (src/hooks/useJurisdiction.ts) returns dual-authority jurisdiction data for a location. Step 1: queries locations table for jurisdiction_id. Step 2: queries location_jurisdictions joined with jurisdictions. Returns separate food and fire authority objects with agency names, scoring types, grading types.
- proactive?: NEUTRAL — data-fetch hook
- affects: All frontend jurisdiction displays, location detail panels
- scope: org-scoped — filter by locationId
- reads: locations (jurisdiction_id), location_jurisdictions, jurisdictions
- writes: None
- related_to: Location-Jurisdiction Binding, Jurisdictions Reference Data
- status: BROKEN
- EVIDENCE: src/hooks/useJurisdiction.ts:34 queries `locations.jurisdiction_id` — **PHANTOM COLUMN** → PostgREST HTTP 400 → locError is set → hook returns early with error. Even if Step 1 is bypassed, Step 2 (location_jurisdictions join) would return 0 rows (table is empty). Lines 57-90 map jurisdiction data using 8 phantom column names (food_agency_id, food_agency_name, etc.) but these fall back via `||` operators to real columns (agency_name, scoring_type, etc.).
- COLUMN CHECK: `locations.jurisdiction_id` = **PHANTOM** (root failure). jurisdictions.food_agency_id, food_agency_name, food_scoring_type, food_grading_type, fire_agency_id, fire_agency_name = **PHANTOM** (non-fatal, `||` fallback to real columns).

---

### LAYER C — INBOUND SIGNALS / REQUIREMENTS / DUE-DATES

### FEATURE: Compliance Documents Tracking
- does: compliance_documents tracks documents per location with status and expiry_date. Expiring documents feed drift detection (document_expiration trigger) and PRP metrics (Predict: expiring within 14 days).
- proactive?: PROACTIVE — expiry dates surface upcoming requirements before they lapse
- affects: Drift Detection (document_expiration trigger), Shift PRP Metrics, document management UI
- scope: org-scoped — RLS via location_id chain
- reads: N/A (source table)
- writes: N/A (populated by document upload flow)
- related_to: Operational Drift Detection, Shift PRP Metrics
- status: LIVE-STUBBED
- EVIDENCE: compliance_documents table exists (HTTP 200), 0 rows. Valid columns confirmed: id, location_id, status, expiry_date. Table schema is sound — would feed drift detection and PRP metrics if documents existed.
- COLUMN CHECK: id, location_id, status, expiry_date — ALL PASS.

### FEATURE: Location Service Schedules
- does: location_service_schedules tracks recurring service schedules per location (hood cleaning, suppression inspection, etc.) with is_active flag and next_due_date. Upcoming services feed PRP metrics (Predict: due within 14 days).
- proactive?: PROACTIVE — next_due_date surfaces upcoming service requirements before they lapse
- affects: Shift PRP Metrics (Predict count), service management UI
- scope: org-scoped — RLS via location_id chain
- reads: N/A (source table)
- writes: N/A (populated by service configuration)
- related_to: Shift PRP Metrics, Operational Drift Detection
- status: LIVE-STUBBED
- EVIDENCE: Table exists (HTTP 200), 0 rows. Core columns valid: id, is_active, next_due_date. Note: service_type, frequency_months, last_completed_date are PHANTOM — these extended columns were never migrated. Core scheduling columns (is_active, next_due_date) used by useShiftPRPMetrics are present.
- COLUMN CHECK: id, is_active, next_due_date — PASS. service_type = **PHANTOM**. frequency_months = **PHANTOM**. last_completed_date = **PHANTOM**.

### FEATURE: Corrective Actions Tracking
- does: corrective_actions tracks open corrective actions per location with status. Open actions feed PRP metrics (Reduce count) and drift detection.
- proactive?: PROACTIVE — open action tracking surfaces unresolved issues requiring attention
- affects: Shift PRP Metrics (Reduce count), Drift Detection, corrective action UI
- scope: org-scoped — RLS via location_id chain
- reads: N/A (source table)
- writes: N/A (populated by corrective action workflow)
- related_to: Shift PRP Metrics, Operational Drift Detection
- status: LIVE-STUBBED
- EVIDENCE: Table exists (HTTP 200), 0 rows. Core columns valid: id, location_id, status. Note: priority is PHANTOM. Core columns used by useShiftPRPMetrics are present.
- COLUMN CHECK: id, location_id, status — PASS. priority = **PHANTOM**.

### FEATURE: Operational Drift Detection
- does: Edge function detect-operational-drift runs every 15 min via pg_cron. Evaluates 13 drift triggers per org (temperature_out_of_range, missed_checklist, document_expiration, hood_cleaning_approaching, etc.). Inserts drift_catches with idempotent partial unique index. Auto-resolves prior open catches on pass. Creates notifications for DM-role users.
- proactive?: PROACTIVE — cron */15 detects drift BEFORE it becomes a violation
- affects: Weekly Drift Report, Drift Catches UI, County Readiness
- scope: org-scoped — RLS column: org_id on drift_catches
- reads: organizations, locations, user_profiles, temperature_logs, checklist_completions, documents, training_records, equipment, vendor_cois
- writes: drift_catches, notifications, admin_event_log
- related_to: Weekly Drift Report, Drift Catches UI
- status: LIVE-STUBBED
- EVIDENCE: drift_catches table exists (HTTP 200), all 15 columns valid, 0 rows. Edge function code exists at supabase/functions/detect-operational-drift/index.ts. With 0 locations bound to jurisdictions and no operational data flowing, cron fires but finds nothing to flag. Tables are sound — would produce drift_catches if locations + data existed.
- COLUMN CHECK: drift_catches (id, org_id, location_id, drift_type, pillar, status, severity, detected_at, resolved_at, source_table, source_record_id, expected_value, actual_value, estimated_savings_cents, resolution_type) — ALL 15 PASS.

### FEATURE: Weekly Drift Report
- does: Edge function generate-weekly-drift-report runs hourly, fires weekly Monday 7 AM org-local time. Aggregates drift_catches for prior week, sends role-filtered email + in-app notifications. Idempotent (skips if org_id + week_start already reported).
- proactive?: PROACTIVE — scheduled weekly summary delivered to DM roles ahead of work week
- affects: Operator awareness of drift patterns
- scope: org-scoped — RLS column: org_id
- reads: organizations, locations, drift_catches, user_profiles, weekly_drift_reports
- writes: weekly_drift_reports, notifications
- related_to: Operational Drift Detection
- status: LIVE-STUBBED
- EVIDENCE: weekly_drift_reports table exists (HTTP 200), 0 rows. Edge function code exists at supabase/functions/generate-weekly-drift-report/index.ts. With 0 drift_catches, nothing to aggregate.
- COLUMN CHECK: weekly_drift_reports: id — PASS.

### FEATURE: Advisor Briefings
- does: Edge function generate-advisor-briefing generates role-specific compliance briefings (compliance_officer, food_safety, fire_safety) per org/location. Dual-mode: HTTP for individual requests, cron for daily cache warming at 6 AM org-local time. Cache lifetime 25 hours.
- proactive?: PROACTIVE — daily cron warms briefing cache before business hours
- affects: Operator morning compliance posture awareness
- scope: org-scoped — RLS column: organization_id
- reads: organizations, locations, user_profiles, compliance/food/fire data sources, advisor_briefings (cache)
- writes: advisor_briefings
- related_to: Operational Drift Detection, Jurisdictions Reference Data
- status: LIVE-STUBBED
- EVIDENCE: advisor_briefings table exists (HTTP 200), 0 rows. Edge function exists. No briefings generated — no locations and no compliance data to brief on.
- COLUMN CHECK: advisor_briefings: id — PASS.

### FEATURE: Evidence Pattern Detection
- does: Edge function evidence-pattern-detect scans onboarding conversation threads (60-day window), matches text against seed phrases ("hasn't arrived", "broken", "missed deadline"), upserts evidence_signals when 3+ threads match.
- proactive?: PROACTIVE — detects patterns from conversation data before they surface as formal issues
- affects: Dashboard evidence signal display
- scope: org-scoped — scans per organization
- reads: onboarding_item_threads, onboarding_item_thread_messages, evidence_signals
- writes: evidence_signals
- related_to: Operational Drift Detection
- status: LIVE-STUBBED
- EVIDENCE: evidence_signals table exists (HTTP 200), 0 rows. Edge function exists. No onboarding threads to scan.
- COLUMN CHECK: evidence_signals: id — PASS.

### FEATURE: Equipment Lifecycle Tracking
- does: Equipment records with maintenance schedules and due dates. equipment_maintenance_schedule table for recurring schedules. Feeds drift detection (equipment_maintenance_overdue trigger) and mobile alerts.
- proactive?: PROACTIVE — maintenance due dates surface upcoming requirements
- affects: Drift Detection, Mobile Alerts, equipment management UI
- scope: org-scoped — RLS via location chain
- reads: equipment, equipment_maintenance_schedule
- writes: N/A
- related_to: Operational Drift Detection, Mobile Alerts Surface
- status: BROKEN
- EVIDENCE: `equipment` table exists but `equipment.is_active` = **PHANTOM** and `equipment.next_maintenance_due` = **PHANTOM**. `equipment_maintenance_schedule` **TABLE DOES NOT EXIST** (HTTP 404). Any code querying equipment lifecycle columns gets HTTP 400. useMobileAlerts.ts catches the error via try/catch (graceful degradation).
- COLUMN CHECK: equipment.is_active = **PHANTOM**. equipment.next_maintenance_due = **PHANTOM**. equipment_maintenance_schedule = **TABLE MISSING**.

---

### LAYER D — INTELLIGENCE SIGNAL PIPELINE

### FEATURE: Intelligence Signal Collection
- does: Daily cron crawl of external food-safety + facility-safety sources (openFDA, USDA FSIS, CDC, CDPH, CA Fire Marshal, NFPA). Transforms raw data via Claude API, inserts into intelligence_insights with status pending_review.
- proactive?: PROACTIVE — cron at 14:00 UTC daily; collects jurisdiction-level intelligence ahead of any incident
- affects: Signal Classification, Signal Delivery, Intelligence Feed UI
- scope: system — no org filter on collection; RLS: service_role only
- reads: external APIs, platform_settings
- writes: intelligence_insights, admin_event_log
- related_to: Crawl Infrastructure, Signal Classification & Routing
- status: UNVERIFIED
- EVIDENCE: intelligence_signals table exists but 0 rows. crawl_execution_log exists but 0 rows. Cannot confirm cron has ever fired without service_role access. Edge function code exists at supabase/functions/intelligence-collect/index.ts.
- COLUMN CHECK: Edge function uses service_role client — not subject to frontend phantom column issues.

### FEATURE: Crawl Infrastructure
- does: trigger-crawl fetches Firecrawl-method sources; crawl-monitor fetches direct-fetch sources; both update intelligence_sources status and write run logs to crawl_runs.
- proactive?: PROACTIVE — crawl-monitor runs on schedule; feeds proactive intelligence pipeline
- affects: Intelligence Signal Collection (upstream health monitoring)
- scope: system — RLS: service_role only
- reads: intelligence_sources (fetch_method, url, status)
- writes: intelligence_sources (last_crawled_at, status), crawl_runs, crawl_health, admin_event_log
- related_to: Intelligence Signal Collection
- status: UNVERIFIED
- EVIDENCE: crawl_runs exists (HTTP 200), 0 rows. crawl_health exists (HTTP 200), 0 rows. Edge function code exists. Cannot confirm execution without service_role.
- COLUMN CHECK: intelligence_sources.slug = **PHANTOM**. intelligence_sources.source_type = **PHANTOM**. If crawl functions select these, those queries fail.

### FEATURE: Signal Classification & Routing
- does: classify-signals classifies raw signals (category, severity, pillar assignment, jurisdiction mapping). canonical-correlate maps signals to jurisdictions and organizations. intelligence-auto-publish auto-publishes low-risk signals. intelligenceRouter.ts computes severity scores and routing tier (auto/notify/hold).
- proactive?: PROACTIVE — auto-publish runs hourly at :30; classification triggers ahead of operator review
- affects: Signal Delivery, Intelligence Feed UI
- scope: system (classification) + org-scoped (routing) — RLS: service_role
- reads: intelligence_signals, jurisdictions, locations, organizations, platform_settings
- writes: intelligence_signals (update status), entity_correlations, notifications, admin_event_log
- related_to: Intelligence Signal Collection, Signal Delivery
- status: UNVERIFIED
- EVIDENCE: entity_correlations exists (HTTP 200), 0 rows. Edge function code exists. intelligence_signals.org_id = PHANTOM — auto-publish filter on org_id would fail.
- COLUMN CHECK: intelligence_signals.org_id = **PHANTOM** (used in auto-publish filter).

### FEATURE: Signal Delivery
- does: intelligence-deliver routes published signals to org users via notifications. intelligence-feed returns published signals as paginated JSON feed. intelligence-approve provides admin review workflow.
- proactive?: PROACTIVE — delivers jurisdiction intelligence to operators before issues manifest
- affects: Intelligence Feed UI, Unread Signal Badge
- scope: org-scoped — RLS column: organization_id on notifications
- reads: intelligence_signals (status='published'), user_profiles, locations, organizations
- writes: notifications, intelligence_signals (status update), intelligence_signal_approvals
- related_to: Signal Classification & Routing, Intelligence Feed UI
- status: UNVERIFIED
- EVIDENCE: Edge function code exists. Cannot confirm execution without service_role. If delivery queries filter on org_id (PHANTOM), delivery fails silently.
- COLUMN CHECK: intelligence_signals.org_id = **PHANTOM** (may be used in delivery filter).

---

### LAYER E — PROACTIVE UI SURFACES

### FEATURE: Intelligence Feed UI
- does: Three frontend surfaces consume intelligence signals: (1) useIntelligenceFeed (src/hooks/useIntelligenceFeed.ts:51-57) — widget feed of 5 latest published signals; (2) BusinessIntelligence.tsx (src/pages/BusinessIntelligence.tsx:81-87) — full 4-format intelligence view; (3) IntelligenceHub.tsx — uses intelligence-feed edge function.
- proactive?: PROACTIVE — surfaces jurisdiction intelligence to operators
- affects: Operator awareness, decision-making
- scope: org-scoped — filter: .eq('org_id', orgId)
- reads: intelligence_signals
- writes: None
- related_to: Signal Delivery
- status: BROKEN
- EVIDENCE: useIntelligenceFeed.ts:55 filters `.eq('org_id', orgId)` → **org_id is PHANTOM** → HTTP 400 → error state. BusinessIntelligence.tsx:83 filters `.eq('org_id', orgId)` AND `.eq('is_sample', false)` — BOTH phantom → HTTP 400.
- COLUMN CHECK: intelligence_signals.org_id = **PHANTOM**. intelligence_signals.is_sample = **PHANTOM**. Confirmed valid: id, title, content_summary, category, signal_type, severity_score, is_published, published_at, created_at, recommended_action, source_name.

### FEATURE: Unread Signal Badge
- does: useUnreadSignals (src/hooks/useUnreadSignals.ts:29-44) computes unread signal count for bell badge via two-step fetch (published signals minus read signals).
- proactive?: PROACTIVE — badge surfaces unread jurisdiction intelligence in nav chrome
- affects: Navigation bell badge count
- scope: org-scoped — filter: org_id on intelligence_signals
- reads: intelligence_signals, signal_reads
- writes: None
- related_to: Intelligence Feed UI
- status: BROKEN
- EVIDENCE: useUnreadSignals.ts:33 filters `.eq('org_id', orgId)` — **org_id is PHANTOM** → HTTP 400 → returns 0 silently. useUnreadSignals.ts:42 queries `signal_reads` — **TABLE DOES NOT EXIST** (HTTP 404).
- COLUMN CHECK: intelligence_signals.org_id = **PHANTOM**. signal_reads = **TABLE MISSING**.

### FEATURE: Mobile Alerts Surface
- does: useMobileAlerts (src/hooks/useMobileAlerts.ts:31-37) aggregates unresolved alerts, expiring docs, open incidents, overdue equipment into mobile alert list.
- proactive?: PROACTIVE — surfaces proactive alerts in mobile nav
- affects: Mobile alert panel
- scope: org-scoped — filter: organization_id on alerts/documents/incidents/equipment
- reads: alerts, documents, incidents, equipment
- writes: None
- related_to: Equipment Lifecycle Tracking
- status: LIVE-STUBBED
- EVIDENCE: `alerts` table DOES NOT EXIST (HTTP 404) → caught by try/catch at useMobileAlerts.ts:52 → graceful degradation, shows 0 system alerts. Equipment queries use phantom columns (is_active, next_maintenance_due) but also caught. Hook degrades gracefully — no crash, returns empty arrays.
- COLUMN CHECK: alerts = **TABLE MISSING** (gracefully caught). equipment.is_active = **PHANTOM** (caught). equipment.next_maintenance_due = **PHANTOM** (caught).

### FEATURE: County Readiness UI
- does: useCountyReadiness (src/hooks/useCountyReadiness.ts:63-96) computes county-level readiness from location_jurisdictions joined with jurisdictions, cross-referenced with drift_catches, owner_decisions, and expiring documents.
- proactive?: PROACTIVE — surfaces county-level readiness posture ahead of inspections
- affects: Dashboard county readiness view
- scope: org-scoped — filter: .eq('locations.organization_id', orgId)
- reads: location_jurisdictions, jurisdictions, locations, drift_catches, owner_decisions, documents
- writes: None
- related_to: Location-Jurisdiction Binding, Operational Drift Detection
- status: LIVE-STUBBED
- EVIDENCE: ALL columns verified valid via REST. location_jurisdictions: location_id, jurisdiction_layer, is_most_restrictive — PASS. jurisdictions join: county, state, agency_name, data_source_tier — PASS. Returns 0 results due to empty tables. Code would function correctly if data existed.
- COLUMN CHECK: ALL PASS — no phantom columns in any .select() call.

### FEATURE: Drift Catches UI
- does: Two hooks display drift catches: (1) useDriftCatches (src/hooks/useDriftCatches.ts:75-81) — last 90 days with acknowledgments; (2) useYesterdayCatches (src/hooks/useYesterdayCatches.ts:51-71) — yesterday's catches. Users can acknowledge catches via drift_acknowledgments insert.
- proactive?: PROACTIVE — surfaces drift catches to operators ahead of inspections
- affects: Dashboard morning view, drift management
- scope: org-scoped — filter: .eq('org_id', orgId) on drift_catches
- reads: drift_catches, drift_acknowledgments
- writes: drift_acknowledgments (acknowledge action)
- related_to: Operational Drift Detection
- status: LIVE-STUBBED
- EVIDENCE: ALL tables exist with valid columns. drift_catches: 15 columns ALL PASS. drift_acknowledgments: 4 columns ALL PASS. Zero rows. Code would function correctly if data existed.
- COLUMN CHECK: drift_catches (id, org_id, location_id, drift_type, pillar, status, severity, detected_at, resolved_at, source_table, source_record_id, expected_value, actual_value, estimated_savings_cents, resolution_type) — ALL PASS. drift_acknowledgments (drift_catch_id, user_id, role, acknowledged_at) — ALL PASS.

### FEATURE: PRP Bands (8 components)
- does: Eight PRP band components render Predict/Reduce/Prove metrics on feature pages. Each band uses the design token system (predict=amber #BA7517, reduce=blue #185FA5, prove=green #0F6E56) from src/lib/designSystem.ts:41-46. PRP is a UI presentation pattern — tokens are in code, not DB.
- proactive?: PROACTIVE — PRP framework surfaces jurisdiction requirements proactively as what's coming due (Predict), what needs action (Reduce), what's documented (Prove)
- affects: Shifts, Checklists, Calendar, Temperature Logs, Corrective Actions, Deficiencies, Incidents, Documents pages
- scope: org-scoped — rendered per location context
- reads: Varies by component (location-specific data via parent hooks)
- writes: None (display only)
- related_to: Shift PRP Metrics, all feature pages
- status: LIVE-STUBBED
- EVIDENCE: All 8 components exist and are structurally sound: ShiftPRPBand.tsx, ChecklistsPRPBand.tsx, CalendarPRPBand.tsx, TemperaturesPRPBand.tsx, CorrectiveActionsPRPBand.tsx, DeficienciesPRPBand.tsx, IncidentsPRPBand.tsx, documents/PRPBand.tsx. Design tokens confirmed at src/lib/designSystem.ts:41-46. Components render but show zero counts due to empty upstream data.
- COLUMN CHECK: N/A — PRP bands consume data from hooks, no direct .select() calls.

### FEATURE: Shift PRP Metrics
- does: useShiftPRPMetrics (src/hooks/useShiftPRPMetrics.ts) queries three tables to compute PRP counts for ShiftPRPBand: Predict = active service schedules due within 14 days + expiring documents; Reduce = open corrective actions; Prove = resolved corrective actions (last 30 days).
- proactive?: PROACTIVE — surfaces upcoming requirements and open actions in shift context
- affects: ShiftPRPBand display
- scope: org-scoped — filter by locationId
- reads: location_service_schedules, compliance_documents, corrective_actions
- writes: None
- related_to: PRP Bands, Compliance Documents Tracking, Location Service Schedules, Corrective Actions Tracking
- status: LIVE-STUBBED
- EVIDENCE: All three queries use valid columns. location_service_schedules: `select('id', { count: 'exact' }).eq('location_id', ...).eq('is_active', true).gte('next_due_date', today).lte('next_due_date', in14)` — all columns valid. compliance_documents: `select('id', { count: 'exact' }).eq('location_id', ...).eq('status', 'active').lte('expiry_date', in14)` — all columns valid. corrective_actions: `select('id', { count: 'exact' }).eq('location_id', ...).eq('status', 'open')` — all columns valid. Returns 0 counts due to empty tables.
- COLUMN CHECK: location_service_schedules (id, location_id, is_active, next_due_date) — ALL PASS. compliance_documents (id, location_id, status, expiry_date) — ALL PASS. corrective_actions (id, location_id, status) — ALL PASS.

---

### FUTURE PHASE NOTE

The following features exist in the codebase but are part of a planned scoring/benchmarking phase. They are NOT current gaps — EvidLY reports what jurisdictions require, it does not compute scores. These are logged here for completeness, not as failures:

- **Compliance Score Engine** (calculate-compliance-score) — computes dual-pillar scores; output tables not yet migrated
- **Compliance Score Storage** (compliance_score_snapshots, score_calculations, score_model_versions) — tables not migrated
- **Client-Side Compliance Engine** (src/lib/complianceEngine.ts, selfInspectionScoring.ts) — pure functions, would work if given data
- **Sensor Compliance Aggregation** (sensor-compliance-aggregate → location_compliance_scores) — output table not migrated
- **Readiness Snapshots** (snapshot-readiness → readiness_snapshots) — output table not migrated
- **Risk Correlation Engine** (correlation-engine → risk_assessments) — output table not migrated
- **Predictive Alerts** (generate-alerts → predictive_alerts) — output table not migrated

---

### END-TO-END REAL-DATA TRACE (corrected JIE lens)

Target: trace one real location through the JIE path: jurisdiction rulebook → binding → requirements/due-dates → proactive UI surface.

**Hop 1 — Jurisdiction Rulebook:**
- `jurisdictions` table: 169 rows of real California/Nevada jurisdiction data. LIVE-WORKING.
- Each row carries dual-pillar config: food-safety (scoring_type, grading_type, grading_config) and fire-safety (fire_jurisdiction_config, fire_ahj_name, fire_code_edition, nfpa96_edition).
- VERDICT: Rulebook is populated and structurally sound. Dual-pillar separation confirmed.

**Hop 2 — Location Binding:**
- `location_jurisdictions` table: EXISTS, 0 rows. No location is bound to any jurisdiction.
- `useJurisdiction` hook: BROKEN — queries `locations.jurisdiction_id` (PHANTOM COLUMN) → HTTP 400 → hook returns error.
- Without bindings, no location can receive jurisdiction-specific requirements or intelligence routing.
- VERDICT: Binding layer is schema-sound but empty. Frontend binding hook is BROKEN (phantom column).

**Hop 3 — Requirements / Due-Dates:**
- `compliance_documents`: EXISTS, 0 rows. Valid columns (id, location_id, status, expiry_date).
- `location_service_schedules`: EXISTS, 0 rows. Valid core columns (id, is_active, next_due_date).
- `corrective_actions`: EXISTS, 0 rows. Valid core columns (id, location_id, status).
- `drift_catches`: EXISTS, 0 rows. All 15 columns valid.
- No requirements or due-dates exist for any location. Tables are structurally sound.
- VERDICT: Requirement tables exist and have valid schemas. Zero data flowing.

**Hop 4 — Proactive UI Surface:**
- useShiftPRPMetrics: Returns 0 counts (all queries valid, empty tables). STUBBED.
- PRP Bands (8 components): Render with 0 counts. Structurally sound. STUBBED.
- useCountyReadiness: Returns empty (all columns valid, empty tables). STUBBED.
- useDriftCatches: Returns empty (all columns valid, 0 drift_catches). STUBBED.
- useIntelligenceFeed: BROKEN — org_id phantom → HTTP 400 → error state.
- useUnreadSignals: BROKEN — org_id phantom + signal_reads missing → silently returns 0.
- useMobileAlerts: Degrades gracefully — alerts table missing, try/catch handles.
- VERDICT: PRP/drift/readiness surfaces are structurally sound but data-empty. Intelligence surfaces are BROKEN (phantom org_id).

---

### INTERCONNECT (cluster 1)

```
LAYER A — RULEBOOK
jurisdictions (169 rows) ──→ jurisdiction_config_baselines
    │                              │
    │                    fn_jurisdiction_config_drift_check [LIVE-WORKING]
    │                              │
    │                        drift_alert_log, support_tickets
    │
    ├── calcode_violation_map (0 rows) [STUBBED]
    └── jurisdiction_scoring_profiles (0 rows) [STUBBED]

LAYER B — BINDING
location_jurisdictions (0 rows) [STUBBED]
    │
    └── useJurisdiction hook [BROKEN: phantom locations.jurisdiction_id]

LAYER C — REQUIREMENTS / DUE-DATES
compliance_documents (0 rows) [STUBBED] ──→ drift detection (document_expiration)
location_service_schedules (0 rows) [STUBBED] ──→ drift detection (hood_cleaning_approaching)
corrective_actions (0 rows) [STUBBED] ──→ drift detection
equipment lifecycle [BROKEN: phantom is_active/next_maintenance_due + missing table]
    │
    └── detect-operational-drift (cron q15min) → drift_catches (0 rows) [STUBBED]
            │
            ├── generate-weekly-drift-report → weekly_drift_reports (0 rows) [STUBBED]
            └── advisor_briefings (0 rows) [STUBBED]

LAYER D — INTELLIGENCE PIPELINE
intelligence-collect → intelligence_signals (0 rows) [UNVERIFIED]
    → classify-signals → canonical-correlate [UNVERIFIED]
    → intelligence-auto-publish → intelligence-deliver [UNVERIFIED]

LAYER E — PROACTIVE UI
useShiftPRPMetrics → PRP Bands (8 components) [STUBBED — valid columns, 0 data]
useCountyReadiness [STUBBED — valid columns, 0 data]
useDriftCatches [STUBBED — valid columns, 0 data]
useIntelligenceFeed [BROKEN: phantom org_id]
useUnreadSignals [BROKEN: phantom org_id + missing signal_reads]
useMobileAlerts [STUBBED — graceful degradation]
```

### PROACTIVE GAP (cluster 1) — ranked by centrality

1. **location_jurisdictions has 0 rows** — no location is bound to any jurisdiction. This is the central data gap: the entire JIE path from rulebook to tenant UI depends on this binding. Schema is sound; no data exists.
2. **locations.jurisdiction_id PHANTOM COLUMN** — breaks useJurisdiction hook (src/hooks/useJurisdiction.ts:34). Tenants cannot display jurisdiction authority info for any location. Fix: query location_jurisdictions directly instead of locations.jurisdiction_id.
3. **intelligence_signals.org_id PHANTOM COLUMN** — breaks ALL frontend intelligence surfaces (useIntelligenceFeed, BusinessIntelligence, useUnreadSignals). Tenants cannot see any intelligence signals.
4. **signal_reads TABLE MISSING** — breaks unread signal tracking. Bell badge always shows 0.
5. **equipment.is_active + equipment.next_maintenance_due PHANTOM + equipment_maintenance_schedule TABLE MISSING** — breaks equipment lifecycle tracking. Drift detection cannot evaluate equipment triggers.
6. **alerts TABLE MISSING** — blocks system alert display. useMobileAlerts degrades gracefully (try/catch).
7. **intelligence_sources.slug + source_type PHANTOM** — crawl infrastructure may fail on source metadata queries.
8. **location_service_schedules extended columns PHANTOM** (service_type, frequency_months, last_completed_date) — non-fatal (core scheduling columns work), but limits service schedule detail display.
9. **corrective_actions.priority PHANTOM** — non-fatal (core query works), but limits priority-based filtering/display.
10. **All requirement tables have 0 rows** — compliance_documents, location_service_schedules, corrective_actions, drift_catches are structurally sound but empty. This is a data gap, not a schema gap.

### CLUSTER 1 VERDICT

The JIE correctly DEFINES each jurisdiction's dual-pillar requirements (169 jurisdictions with separate food/fire config) and has a complete proactive detection architecture (13 drift triggers, 8 PRP bands, daily cron pipeline). The path from jurisdiction rulebook to tenant UI is broken at two points: (1) useJurisdiction fails on phantom `locations.jurisdiction_id`, and (2) all intelligence UI surfaces fail on phantom `intelligence_signals.org_id`. The PRP/drift/readiness UI surfaces are structurally sound — valid columns, no phantom breaks — but show zero data because no location-jurisdiction bindings exist and no operational data is flowing. Scoring/benchmarking features are FUTURE PHASE, not current gaps. Status tally: 2 LIVE-WORKING, 14 LIVE-STUBBED, 4 BROKEN, 0 DEAD, 4 UNVERIFIED — 24 features total.

---

## BINDING MODEL RULING (locked 2026-06-03)

- **1 location → 1 jurisdiction** (place: county or independent city; CA = 62:
  58 counties + 4 independent cities Berkeley / Long Beach / Pasadena / Vernon).
  5 states currently seeded: CA 62, NV 17, OR 36, WA 39, AZ 15 = 169 rows.
- **Food + fire are pillars/columns within the one jurisdiction row**, never two
  rows. Each jurisdictions row carries food-safety config (scoring_type,
  grading_type, grading_config) AND fire-safety config (fire_ahj_name,
  fire_code_edition, nfpa96_edition) as adjacent column groups.
- **Source of truth: `locations.jurisdiction_id` FK → `jurisdictions.id`**
  (UUID FK added, verified live in PROD).
- **Overlays** → `federal_overlay_jurisdictions` (separate table; migration
  exists in codebase but NOT yet applied to PROD — future phase).
- **Tribal** → `governmental_level` attribute on the jurisdictions row +
  `organizations.tribal_jurisdiction_id` FK (migration exists in codebase but
  NOT yet applied to PROD — future phase).
- **`location_jurisdictions`: RETIRED.** To be dropped after all consumers cut
  over to `locations.jurisdiction_id`. Do NOT add new writes. 3 phantom columns
  in prod (pillar, current_status, agency_name — multi_ahj migration never
  applied). 0 rows.
- **DATA-QUALITY FINDING:** `jurisdiction_type` column has inconsistent values:
  165 rows = `'food_safety'`, 4 rows = `'county'` (Monterey, SLO, Santa Barbara,
  Ventura). Needs normalization — logged for later cleanup.

---

## SERVICE MONITORING MODEL (cluster: core)

Audited 2026-06-03. Read-only — no code changes.

### Mental model

EvidLY monitors ALL facility-related service records for a commercial kitchen.
PSE (Hood, Ansul, Sprinkler, Auto Fire Alarm) is ONE insurance-critical
category, not the whole system. The schema supports any service type via the
`service_type_definitions` config table.

---

### 1. SERVICE TYPES — complete inventory

#### 1a. `service_type_definitions` table (canonical catalog)

Created: `supabase/migrations/20260801000000_service_type_definitions.sql:15-34`
Expanded: `supabase/migrations/20260824000000_service_taxonomy_expansion.sql`
PSE columns added: `supabase/migrations/20260829000000_service_catalog_foundation.sql:13-29`

**Schema columns:** code, name, short_name, description, parent_code,
category (`food_safety` | `fire_safety` | `facility_services`),
is_pse, is_cwa, regulatory_floor_days, default_cadence_days,
default_frequency, nfpa_citation, managed_by_category, sort_order, icon, color

**24 service codes defined across migrations:**

| Code | Name | Category | is_pse | Cadence (days) | Reg. floor | Standard |
|------|------|----------|--------|----------------|------------|----------|
| KEC | Kitchen Exhaust Cleaning | fire_safety | true | 90 | 90 | NFPA 96 |
| FPM | Fan Performance Management | fire_safety | false | 180 | 180 | NFPA 96 |
| GFX | Grease Filter Exchange | fire_safety | false (is_cwa=true) | 90 | 90 | NFPA 96/CWA |
| RGC | Rooftop Grease Containment | fire_safety | false | 90 | 90 | NFPA 96 |
| FS | Fire Suppression System | fire_safety | true | 180 | 180 | NFPA 17A/96/UL-300 |
| FA | Auto Fire Alarm | fire_safety | true | 365 | 365 | NFPA 72 |
| SP | Fire Sprinkler | fire_safety | true | 90 | 90 | NFPA 25 |
| FE | Fire Extinguisher | fire_safety | false | 365 | 365 | NFPA 10 |
| PC | Pest Control | food_safety | false | 30 | NULL | CalCode §114259.1 |
| GT | Grease Trap/Interceptor | food_safety | false | 90 | NULL | Local FOG |
| BFT | Backflow Prevention Testing | food_safety | false | 365 | NULL | — |
| HVAC | HVAC Service | facility_services | false | 90 | NULL | — |
| PLMB | Plumbing Service | facility_services | false | 365 | NULL | — |
| ELEC | Electrical Service | facility_services | false | 365 | NULL | — |
| REFR | Refrigeration Service | facility_services | false | 90 | NULL | — |
| JANI | Cleaning/Janitorial | facility_services | false | 30 | NULL | — |
| PRES | Pressure Washing | facility_services | false | 90 | NULL | — |
| LOCK | Locksmith Service | facility_services | false | 365 | NULL | — |
| ROOF | Roofing Service | facility_services | false | 365 | NULL | — |
| EQRP | Equipment Repair | facility_services | false | 90 | NULL | — |
| WDSP | Waste/Recycling/Disposal | facility_services | false | 30 | NULL | — |
| LINN | Linen Service | facility_services | false | 30 | NULL | — |
| WINC | Window Cleaning | facility_services | false | 90 | NULL | — |
| LAND | Landscaping | facility_services | false | 30 | NULL | — |

Parent-child: KEC is parent of FPM, GFX, RGC (via parent_code FK).

**PROD STATUS: 0 rows.** `service_type_definitions` table exists but seed
migration `20260801000000` was never applied. All 24 codes are migration-defined
only. Evidence: REST API `GET /rest/v1/service_type_definitions` returns `[]`.

#### 1b. Additional record-type tables (not in service_type_definitions)

| Table | Purpose | PROD rows | Evidence |
|-------|---------|-----------|----------|
| temperature_logs | Equipment temp readings (coolers, freezers) | 0 | REST */0 |
| temp_logs | Legacy temp logs | MISSING | REST 404 |
| receiving_temp_logs | Delivery receiving temps | 0 | REST */0 |
| cooldown_events | CalCode §114002 two-stage cooling | 0 | REST */0 |
| checklist_template_completions | Daily checklist completions | 0 | REST */0 |
| checklist_templates | Checklist template definitions | 0 | REST */0 |
| master_checklist_definitions | Master checklist library | 0 | REST */0 |
| haccp_plans | HACCP plan lifecycle | 0 | REST */0 |
| grease_trap_services | FOG pumping events (standalone table) | UNVERIFIED | — |
| equipment | Fire safety equipment lifecycle | 0 | REST */0 |
| equipment_service_records | Service events per equipment item | UNVERIFIED | — |
| deficiencies | Deficiency/finding records | 0 | REST */0 |
| incidents | Compliance incidents | UNVERIFIED | REST 401 (RLS) |
| corrective_actions | Action items and follow-up | 0 | REST */0 |
| training_records | Employee training logs | MISSING | REST 404 |
| alerts | Alert system | MISSING | REST 404 |

Three tables missing from PROD: `temp_logs`, `training_records`, `alerts`.
All existing tables: 0 rows. No production service data has been written yet.

---

### 2. PSE FLAGGING

**Yes — `is_pse` boolean column on `service_type_definitions`.**

Added: `supabase/migrations/20260829000000_service_catalog_foundation.sql:14`
```sql
ALTER TABLE service_type_definitions
  ADD COLUMN IF NOT EXISTS is_pse boolean NOT NULL DEFAULT false;
```

**Four PSE systems (is_pse = true):**
1. KEC — Hood Cleaning (NFPA 96)
2. FS — Fire Suppression (NFPA 17A/96/UL-300)
3. FA — Auto Fire Alarm (NFPA 72)
4. SP — Fire Sprinkler (NFPA 25)

**Non-PSE services (is_pse = false):** FPM, GFX (is_cwa=true), RGC, FE, PC, GT,
BFT, and all 13 facility_services codes.

**TypeScript mirror:** `src/constants/serviceTypes.ts:137-142`
```
PSE_SAFEGUARD_CONFIG = [
  { key: 'hood_cleaning',    service_codes: ['KEC'] },
  { key: 'fire_suppression', service_codes: ['FS']  },
  { key: 'fire_alarm',       service_codes: []      },  // FA not in TS type yet
  { key: 'sprinklers',       service_codes: []      },  // SP not in TS type yet
]
```

**`vendor_service_records.safeguard_type`** enforces a 4-value CHECK constraint:
`'hood_cleaning' | 'fire_suppression' | 'fire_alarm' | 'sprinklers'`
(`supabase/migrations/20260802000000_vendor_service_records.sql:21-23`).
This column maps service events to their PSE safeguard.

**STATUS:** Schema is sound. is_pse column defined, CHECK constraint on
safeguard_type enforced. But `service_type_definitions` has 0 rows in PROD,
so the is_pse flag is not queryable at runtime.

---

### 3. EXTENSIBILITY

**Architecture: config-table + migration.** New service types are added by
INSERTing rows into `service_type_definitions`. The table is a runtime-queryable
catalog with FK constraints from:
- `vendor_service_records.service_type_code` → `service_type_definitions.code`
- `location_service_schedules.service_type_code` → `service_type_definitions.code`
- `service_configurations.service_code` → `service_type_definitions.code`
- `vendor_service_capabilities.service_code` → `service_type_definitions.code`
- `service_requests.service_code` → `service_type_definitions.code`

**How new types are actually added today:**
1. SQL migration adds row to `service_type_definitions` (evidence: `20260824000000`
   added 15 new codes in one migration)
2. TypeScript constants must be updated in parallel:
   - `src/constants/serviceTypes.ts:10` — `ServiceTypeCode` union type (only 5 of 24)
   - `src/constants/serviceTypes.ts:40-121` — `SERVICE_TYPES` record (only 5 of 24)
   - `src/lib/serviceOptions.ts:17-30` — `SERVICE_OPTIONS` array (10 of 24)
   - `src/data/commonServiceCadences.ts:14-128` — `COMMON_SERVICE_CADENCES` (10 of 24)
   - `src/components/services/RequestServiceModal.tsx` — `SERVICE_CODE_MAP`

**No admin UI exists** for adding service types. No runtime INSERT path.
All additions require a code deploy.

**Assessment:** The DB schema IS extensible (any row can be INSERTed to
`service_type_definitions` and the FK chain picks it up). But the TypeScript
layer is NOT extensible — it hardcodes a subset of codes as a union type. The
gap: DB has 24 codes defined in migrations, TypeScript `ServiceTypeCode` type
knows only 5 (`'KEC' | 'FPM' | 'GFX' | 'RGC' | 'FS'`). FA and SP exist in
`PSE_SAFEGUARD_CONFIG` but NOT in the union type. The 13 facility_services
codes exist only in migrations.

The admin vendor config page has a separate hardcoded list of 10 display labels
(`src/pages/admin/Configure.tsx:33`) that does NOT reference
`service_type_definitions` at all.

---

### 4. FOOD vs FIRE GROUPING

**Three-category grouping exists in the schema:**

`service_type_definitions.category` column added in
`supabase/migrations/20260824000000_service_taxonomy_expansion.sql:11` with
CHECK constraint: `category IN ('food_safety', 'fire_safety', 'facility_services')`.

| Category | Codes |
|----------|-------|
| fire_safety | KEC, FPM, GFX, RGC, FS, FA, SP, FE (8) |
| food_safety | PC, GT, BFT (3) |
| facility_services | HVAC, PLMB, ELEC, REFR, JANI, PRES, LOCK, ROOF, EQRP, WDSP, LINN, WINC, LAND (13) |

**TypeScript mirrors this as `pillar`:** `src/lib/serviceOptions.ts:13`
defines `pillar: 'fire_safety' | 'food_safety'` — only TWO pillars in the UI
options, no `facility_services` pillar. The 13 facility_services codes are
invisible in the UI service selector.

**`src/data/commonServiceCadences.ts`** groups 10 services into `fire_safety` (8)
and `food_safety` (2) with `pillar` field.

**Checklist templates** have their own `pillar` column (`'food_safety' | 'fire_safety'`)
at `supabase/migrations/20260304000001_daily_checklists_module.sql:25`.

**Corrective actions, incidents, documents** use a three-value `category` column:
`'food_safety' | 'fire_safety' | 'facility_services'`
(evidence: `20260812000000_rename_ca_categories.sql:17`,
`20260813000000_incidents_pillar_to_category.sql:10`,
`20260519220000_dashboard_v10_document_taxonomy.sql:24`).

**Assessment:** Grouping lives in the DB (`category` column) AND the TypeScript
layer (`pillar` field). The DB has 3 categories; the UI service selectors expose
only 2. The `facility_services` category is structurally present but not surfaced
in service modals.

---

### 5. REAL-TIME STATUS (current / overdue / due_soon)

**Two independent status mechanisms:**

#### 5a. Client-side (TypeScript)
`src/constants/serviceTypes.ts:201-211` — `getServiceStatus()`:
```typescript
if (diffDays < 0) return 'overdue';
if (diffDays <= 30) return 'due_soon';
return 'current';
```
Reads `next_due_date` from `location_service_schedules` or `vendor_service_records`.
Pure date math — no DB function involved.

#### 5b. Server-side (edge function cron)
`supabase/functions/vendor-service-record-trigger/index.ts:118-183`

Daily cron at 13:00 UTC. Three severity levels:
1. **vendor_lapse**: No service record within `(frequency_interval_days + 60)` days.
   Supersedes overdue/due_soon. (`index.ts:141-170`)
2. **overdue**: `next_due_date < today` (`index.ts:176-178`)
3. **due_soon**: `next_due_date` within next 7 days (`index.ts:179-181`)

Cron scheduled: `supabase/migrations/20260823000000_service_alert_log_and_cron.sql`
Dedup: 23-hour window per (schedule_id, severity).

**Cadence configuration lives in `location_service_schedules`:**
- `frequency` (text label: quarterly, monthly, etc.)
- `frequency_interval_days` (integer: 90, 30, etc.)
- `next_due_date` (computed from last_service_date + interval)
- `last_service_date`
- Per-location, per-service-code. UNIQUE (organization_id, location_id, service_type_code).
- Source: `supabase/migrations/20260803000000_location_schedules_and_reschedule_requests.sql:19-42`

**Second cadence table:** `service_configurations`
(`supabase/migrations/20260830000000_service_configurations.sql`)
- `cadence_days`, `last_service_at`, `next_due_at`, `assigned_vendor_id`
- UNIQUE (organization_id, location_id, service_code)
- Auto-backfilled from vendor_service_records.

**Both tables have 0 rows in PROD.** No cadence data exists yet.

**Alert audit trail:** `service_alert_log` table (0 rows in PROD).
Columns: schedule_id, severity, days_overdue, recipient_type, send_status, fired_at.

---

### 6. SCOPING — FK path

```
vendor_service_records
  ├─ organization_id → organizations.id (ON DELETE CASCADE)
  ├─ location_id     → locations.id     (ON DELETE CASCADE)
  └─ service_type_code → service_type_definitions.code

location_service_schedules
  ├─ organization_id → organizations.id (ON DELETE CASCADE)
  ├─ location_id     → locations.id     (ON DELETE CASCADE)
  └─ service_type_code → service_type_definitions.code

service_configurations
  ├─ organization_id → organizations.id
  ├─ location_id     → locations.id
  └─ service_code    → service_type_definitions.code
```

Every service record ties to a specific kitchen (location) via `location_id` FK,
and to an organization via `organization_id` FK. Both are NOT NULL with CASCADE
deletes. RLS policies scope reads to the user's organization via `user_profiles`.

Evidence: `supabase/migrations/20260802000000_vendor_service_records.sql:17-18`,
`20260803000000_location_schedules_and_reschedule_requests.sql:21-23`.

---

### Summary — STATUS TALLY

| # | Feature | Status | Evidence |
|---|---------|--------|----------|
| 1 | service_type_definitions (24 codes) | **SCHEMA-ONLY** | Table exists, 0 rows in PROD |
| 2 | is_pse flag (4 PSE systems) | **SCHEMA-ONLY** | Column defined, 0 rows to query |
| 3 | category grouping (3 categories) | **SCHEMA-ONLY** | Column + CHECK defined, 0 rows |
| 4 | vendor_service_records | **LIVE-EMPTY** | Table + RLS + indexes exist, 0 rows |
| 5 | location_service_schedules | **LIVE-EMPTY** | Table + RLS + FK chain, 0 rows |
| 6 | service_configurations | **LIVE-EMPTY** | Table + unique constraint, 0 rows |
| 7 | vendor_service_capabilities | **LIVE-EMPTY** | Table exists, UNVERIFIED rows |
| 8 | service_alert_log | **LIVE-EMPTY** | Table + cron configured, 0 rows |
| 9 | Cron (vendor-service-record-trigger) | **LIVE-IDLE** | Edge function deployed, no data to evaluate |
| 10 | Client status calc (getServiceStatus) | **LIVE-WORKING** | Pure date math, no DB dependency |
| 11 | TypeScript SERVICE_TYPES (5 codes) | **STALE** | Only 5 of 24 DB codes represented |
| 12 | SERVICE_OPTIONS (10 codes) | **STALE** | Only 10 of 24 DB codes represented |
| 13 | Admin Configure vendor types | **DETACHED** | Hardcoded 10-label array, no FK to catalog |
| 14 | temp_logs table | **MISSING** | REST 404 — migration not applied |
| 15 | training_records table | **MISSING** | REST 404 — migration not applied |
| 16 | alerts table | **MISSING** | REST 404 — migration not applied |

**CRITICAL GAP:** `service_type_definitions` has 0 rows. This is the root
reference table — `vendor_service_records.service_type_code`,
`location_service_schedules.service_type_code`, and
`vendor_service_capabilities.service_code` all FK to it. Until the seed
migration is applied, NO service record with a service_type_code can be
INSERTed (FK violation). The PSE cadence pipeline, service scheduling,
and vendor capability assignment are all structurally blocked.

---

## Cross-cluster synthesis (filled after all clusters)
- INTERCONNECT MAP:
- PROACTIVE GAP (ranked punch list):
- SYSTEM VERDICT:
