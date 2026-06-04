# Interface Configuration Audit — Findings Matrix

**C21 Phase 0 · 2026-06-03**
**PROD instance:** irxgmhxhmxtzfwuieblc
**Scope:** Every Supabase write path in `src/` and `supabase/functions/`
**Method:** Code inventory → SQL VALUES-list cross-check against PROD `information_schema` + `pg_proc` → Arthur ran queries in PROD → findings below

---

## Defect Classes

| Class | Name | Impact |
|-------|------|--------|
| **5** | SECURITY | Injection or data-loss risk under service role |
| **2** | MISSING RPC | Code calls `.rpc()` on function not in `pg_proc` |
| **1A** | PHANTOM COLUMN | Code writes column that doesn't exist on a real table → PostgREST 400 (42703) |
| **1B** | PHANTOM TABLE | Code writes to table that doesn't exist at all → PostgREST 400 |
| **3** | UNSATISFIED NOT NULL | PROD column NOT NULL with no default, write path omits it *(follow-up)* |
| **4** | RLS BLOCK | Policy USING/WITH CHECK can't be satisfied by caller context *(follow-up)* |

---

## Baseline

| Table | Status | Commits |
|-------|--------|---------|
| **locations** | FIXED | f927a165, b7d6b27b |

---

# P0 FINDINGS

## CLASS 5 — SECURITY (P0)

| ID | Sev | Surface | File:line | Table | Class | Finding | Fix direction |
|----|-----|---------|-----------|-------|-------|---------|---------------|
| S1 | P0 | EDGE | `supabase/functions/cleanup-demo-tour/index.ts:108` | locations | 5 | `.delete().eq('organization_id', orgId)` deletes ALL org locations — no `source` filter. Other tables in the same function correctly filter by source. Data loss bug. | Add `.eq('source', 'demo')` filter or equivalent demo-tag guard |
| S2 | P0 | EDGE | `supabase/functions/offline-sync-handler/index.ts:114` | *(dynamic)* | 5 | Client-supplied `action.table_name` used directly in `.from(table_name).delete()` under service role. Allows arbitrary table deletion. | Allowlist of permitted table names; reject anything else |
| S3 | P0 | EDGE | `supabase/functions/offline-conflict-resolver/index.ts:79` | *(dynamic)* | 5 | Client-supplied `conflict.table_name` + `conflict.client_data` used in `.from(table).upsert(data)` under service role. Allows arbitrary data injection into any table. | Allowlist of permitted tables; schema-validate client_data per table |

---

## CLASS 2 — MISSING RPCs (P0)

| ID | Sev | Surface | File:line | RPC | Class | Finding | Fix direction |
|----|-----|---------|-----------|-----|-------|---------|---------------|
| R1 | P0 | USER | `src/pages/settings/BillingPage.tsx:89` | `fn_founder_seats_taken` | 2 | Called on billing page load. Function does not exist in `pg_proc`. Founder seat display broken. July 4 launch-critical. | Create RPC or replace with direct query on organizations/user_profiles |
| R2 | P0 | USER | `src/pages/settings/BillingPage.tsx:90` | `fn_founder_seats_max` | 2 | Called on billing page load. Function does not exist in `pg_proc`. Same impact as R1. | Create RPC or replace with direct query |
| R3 | P0 | EDGE | `supabase/functions/evidly-referral-signup/index.ts:88` | `increment_referral_count` | 2 | Called when referral code is redeemed. Function does not exist. Referral tracking silently fails. | Create RPC or replace with `.update()` increment |
| R4 | P0 | EDGE | `supabase/functions/api-usage-aggregate/index.ts:30` | `avg_response_ms` | 2 | Called by API usage aggregation edge function. Function does not exist. API metrics broken. | Create RPC or compute average inline |

**All other RPCs verified present in PROD:** `log_audit_event` (8 call sites), `admin_get_user_emails` (5), `get_founder_count` (1), `get_evidence_thread_summaries` (1), `mark_evidence_messages_read` (1), `create_evidence_thread` (1), `create_vendor_upload_request` (2), `fn_seed_canonical_haccp` (1), `recalc_risk_free_eligibility` (1).

---

## CLASS 1A — PHANTOM COLUMNS ON REAL TABLES (P0)

### P0-01: organizations (10 phantom columns)

Write surfaces: ADMIN onboarding, ADMIN config

| Column | File:line | Context |
|--------|-----------|---------|
| `county_jurisdiction_id` | `src/pages/AdminClientOnboarding.tsx:127` | Tribal onboarding: conditional insert |
| `food_safety_advisory_text` | `src/pages/AdminClientOnboarding.tsx:124` | Tribal onboarding: conditional insert |
| `food_safety_authority` | `src/pages/AdminClientOnboarding.tsx:123` | Tribal onboarding: conditional insert |
| `food_safety_mode` | `src/pages/AdminClientOnboarding.tsx:122` | Tribal onboarding: conditional insert |
| `is_tribal` | `src/pages/AdminClientOnboarding.tsx:121` | Tribal onboarding: conditional insert |
| `notes` | `src/pages/admin/Configure.tsx:332` | Admin org creation modal |
| `plan` | `src/pages/admin/Configure.tsx:329`, `src/pages/AdminClientOnboarding.tsx:133` | Both admin org creation and client onboarding |
| `primary_county` | `src/pages/admin/Configure.tsx:328` | Admin org creation modal |
| `status` | `src/pages/admin/Configure.tsx:329`, `src/pages/AdminClientOnboarding.tsx:131` | Both surfaces write 'pending' or similar |
| `tribal_jurisdiction_id` | `src/pages/AdminClientOnboarding.tsx:126` | Tribal onboarding: conditional insert |

**Fix direction:** Decide per column: create migration to add column, or strip from INSERT payload if feature is deferred.
- Tribal fields (6): `is_tribal`, `food_safety_mode`, `food_safety_authority`, `food_safety_advisory_text`, `tribal_jurisdiction_id`, `county_jurisdiction_id` — create columns if tribal feature is live, else strip.
- Config fields (4): `plan`, `status`, `notes`, `primary_county` — likely should exist; create migration.

### P0-02: user_profiles (6 phantom columns — Q1 ACCURACY NOTE)

Write surface: ADMIN user management

| Column (per Q1 result) | Actual code writes | File:line | Note |
|------------------------|--------------------|-----------|------|
| `is_locked` | `is_suspended` | `src/pages/admin/AdminUsers.tsx:179` | Q1 VALUES entry was wrong column name |
| `locked_at` | `suspended_at` | `src/pages/admin/AdminUsers.tsx:180` | Q1 VALUES entry was wrong column name |
| `is_active` | *(not written by code)* | — | Incorrect VALUES entry; no code writes this |
| `active_since` | *(not written by code)* | — | Incorrect VALUES entry; no code writes this |
| `onboarding_skipped_items` | Written to **organizations**, not user_profiles | `src/hooks/onboarding/useOnboardingState.ts:231` | Wrong table attribution in VALUES list |
| `planned_location_count` | Written to **organizations**, not user_profiles | `src/pages/AdminClientOnboarding.tsx:112` | Wrong table attribution in VALUES list |

**Q1 accuracy issue:** The VALUES list had incorrect column names and table attributions. The columns that PROD actually gets hit with are:

| Actual column | File:line | Untested? |
|---------------|-----------|-----------|
| `is_suspended` | `src/pages/admin/AdminUsers.tsx:179` | YES — not in Q1 |
| `suspended_at` | `src/pages/admin/AdminUsers.tsx:180` | YES — not in Q1 |
| `suspended_by` | `src/pages/admin/AdminUsers.tsx:181` | YES — not in Q1 |
| `suspend_reason` | `src/pages/admin/AdminUsers.tsx:182` | YES — not in Q1 |
| `failed_login_count` | `src/pages/admin/AdminUsers.tsx:214` | YES — not in Q1 |
| `locked_until` | `src/pages/admin/AdminUsers.tsx:215` | YES — not in Q1 |

**Fix direction:** Re-run Q1 for user_profiles with correct columns (`is_suspended`, `suspended_at`, `suspended_by`, `suspend_reason`, `failed_login_count`, `locked_until`). Also re-run for organizations with `onboarding_skipped_items`, `planned_location_count`.

### P0-03: intelligence_signals (8 phantom columns)

Write surface: ADMIN intelligence management (25+ write paths)

| Column | File:line | Context |
|--------|-----------|---------|
| `arthur_notes` | `src/pages/admin/IntelligenceAdmin.tsx:400` | Admin update: signal notes |
| `preview_sent` | `src/pages/admin/IntelligenceAdmin.tsx:410` | Admin update: preview flag |
| `description` | IntelligenceAdmin.tsx *(update path, line TBD)* | May be in one of the 25 update calls |
| `organization_id` | IntelligenceAdmin.tsx *(update path, line TBD)* | May be in one of the 25 update calls |
| `published` | IntelligenceAdmin.tsx *(update path, line TBD)* | Note: insert uses `is_published` at :549 |
| `severity` | IntelligenceAdmin.tsx *(update path, line TBD)* | Note: insert uses `severity_score` at :548 |
| `source` | IntelligenceAdmin.tsx *(update path, line TBD)* | Note: insert uses `source_url`, `source_name` |
| `status` | IntelligenceAdmin.tsx *(update path, line TBD)* | May be in one of the 25 update calls |

**Also confirmed NOT phantom:** `routing_tier` was written at IntelligenceAdmin.tsx:419 but not in Arthur's phantom list — either it exists in PROD or was not in the Q1 VALUES list.

**Fix direction:** Line-level audit of all 25 IntelligenceAdmin.tsx write paths needed. For each phantom column, decide: create column (if the feature needs it) or strip from update payload.

### P0-04: receiving_temp_logs (1 phantom column)

| Column | File:line | Context |
|--------|-----------|---------|
| `food_category` | `src/pages/TempLogs.tsx:1086` | Receiving temp log INSERT — daily food-safety flow |

**Fix direction:** Create `food_category` column on `receiving_temp_logs`, or strip from INSERT payload. This is a daily-use path — P0 priority.

### P0-05: equipment (8 phantom columns)

Write surface: USER equipment creation

| Column | File:line |
|--------|-----------|
| `compliance_pillar` | `src/pages/Equipment.tsx:1818` |
| `linked_vendor` | `src/pages/Equipment.tsx:1816` |
| `maintenance_interval` | `src/pages/Equipment.tsx:1815` |
| `make` | `src/pages/Equipment.tsx:1809` |
| `purchase_price` | `src/pages/Equipment.tsx:1811` |
| `warranty_expiry` | `src/pages/Equipment.tsx:1812` |
| `warranty_provider` | `src/pages/Equipment.tsx:1813` |
| `warranty_terms` | `src/pages/Equipment.tsx:1814` |

**Fix direction:** These are standard equipment fields a user fills out in the creation form. Recommend creating all 8 columns on the `equipment` table. Equipment creation is completely broken in PROD without them.

### P0-06: calendar_events (2 phantom columns — Q1 ACCURACY NOTE)

| Column (per Q1 result) | Actual code writes | File:line |
|------------------------|--------------------|-----------|
| `event_type` | `type` | `src/hooks/useServiceRequests.ts:136` |
| `scheduled_date` | `date` | `src/hooks/useServiceRequests.ts:138` |

Also written at: `src/hooks/useServiceRequestDetail.ts:144` (type), `:146` (date)

**Q1 accuracy issue:** The VALUES list had incorrect column names. The code writes `type` and `date`, not `event_type` and `scheduled_date`. The columns `event_type` and `scheduled_date` genuinely don't exist — but the code doesn't write them either. Whether `type` and `date` exist on `calendar_events` is **untested**.

**Fix direction:** Re-run Q1 for calendar_events with correct columns (`type`, `date`, `start_time`, `end_time`, `vendor_id`, `vendor_name`, `service_request_id`).

---

# P1 FINDINGS

## CLASS 1A — PHANTOM COLUMNS ON REAL TABLES (P1)

| ID | Table | Phantom columns | File:line(s) | Fix direction |
|----|-------|----------------|--------------|---------------|
| P1-01 | vendors | `certifications`, `counties_served`, `is_partner` | `src/pages/admin/Configure.tsx:546-556` | Create columns or strip from vendor creation modal |
| P1-02 | vendor_upload_requests | `document_type`, `expires_at` | `src/pages/Vendors.tsx:896`, `:983`, `:1627` | Create columns or strip from upload request flow |
| P1-03 | vendor_client_relationships | `location_id` | `src/hooks/useCreateVendor.ts:55` | Create column or strip from vendor creation |
| P1-04 | vendor_contact_log | `contacted_by`, `notes` | `supabase/functions/vendor-contact/index.ts:161` | Create columns or strip from edge function |
| P1-05 | shift_handoffs | `incoming_user_id`, `outgoing_user_id`, `status` | *(no write found in codebase — columns on table but no write path exercises them)* | Verify if table/feature is active; may be dead |
| P1-06 | platform_updates | `body`, `org_id`, `read_at`, `type` | `src/hooks/useCommandCenter.ts:445`, `:514`, `:532` | Create columns — Command Center feature depends on these |
| P1-07 | client_notifications | `dismissed_at`, `read_at` | `src/hooks/useCommandCenter.ts:552`, `:570`, `:600`, `:614`, `:628` | Create columns — notification dismiss/read tracking |
| P1-08 | demo_sessions | `follow_up_at`, `organization_id`, `outcome_notes`, `status` | `src/pages/admin/GuidedTours.tsx:553`, `:935`, `:957`, `:965`; `src/pages/admin/SalesPipeline.tsx:100` | Create columns — admin demo/sales flow |
| P1-09 | capture_artifacts | `content` | *(no write found in codebase)* | Verify if feature is active; may be dead |
| P1-10 | employee_certifications | `certification_type`, `expiry_date`, `issued_date` | `src/components/training/AddCertificationModal.tsx:127`, `:134` | **Note: table itself doesn't exist (CLASS 1B).** See 1B section. |
| P1-11 | intelligence_subscriptions | `organization_id` | *(no write found in codebase)* | Verify if feature is active; may be dead |
| P1-12 | k2c_donations | `amount`, `status` | `src/pages/admin/AdminK2C.tsx:68`; `supabase/functions/k2c-processor/index.ts:63` | Create columns — K2C donation tracking |
| P1-13 | marketplace_vendors | `listing_type` | `src/pages/VendorMarketplace.tsx:240`, `:270`, `:290` | Create column or strip |
| P1-14 | support_ticket_replies | `content` | `src/pages/admin/SupportTickets.tsx:327` | Create column — support reply flow |
| P1-15 | testimonials | `content`, `organization_id` | `src/lib/testimonialSystem.ts:39` | Create columns or strip |
| P1-16 | trial_email_sequences | `name` | `src/pages/admin/EmailSequenceManager.tsx:409`, `:446`, `:585` | Create column — email sequence naming |
| P1-17 | vendor_recommendations | `notes`, `service_type`, `vendor_id` | `src/components/vendors/RecommendVendorModal.jsx:74` | Create columns — vendor recommendation flow |
| P1-18 | location_service_schedules | `last_price` | `src/components/onboarding/work/modals/IdentifyVendorModal.tsx:186`, `:275` | Create column or strip |

---

# P2 FINDINGS

## CLASS 1A — PHANTOM COLUMNS ON REAL TABLES (P2)

| ID | Table | Phantom columns | File:line(s) | Fix direction |
|----|-------|----------------|--------------|---------------|
| P2-01 | haccp_corrective_actions | `resolution_notes` | `src/pages/HACCP.tsx:1019` | Create column or strip |
| P2-02 | self_inspection_sessions | `failed_items` | `src/pages/SelfInspection.tsx:517` (writes `failed_items_json`) | Verify actual column name — code may write `failed_items_json` not `failed_items` |
| P2-03 | ai_interaction_logs | `feature`, `model`, `organization_id`, `prompt` | `src/lib/aiLogger.ts:68`; `supabase/functions/ai-text-assist/index.ts:92`; `supabase/functions/ai-chat/index.ts:150`, `:179`; `supabase/functions/draft-receiving-notes/index.ts:118`; `supabase/functions/ai-corrective-action-draft/index.ts:201`; `supabase/functions/generate-deficiency-plan/index.ts:241`; `supabase/functions/extract-deficiencies-from-report/index.ts:298` | Create columns — AI audit logging needs these |
| P2-04 | api_applications | `description` | *(no write found in codebase)* | May be dead; verify |
| P2-05 | onboarding_item_thread_messages | `sender_id` | *(no write found in codebase)* | May be dead; verify |
| P2-06 | remote_connect_sessions | `target_user_id` | `src/pages/admin/RemoteConnect.tsx:157` | Create column — admin remote connect |
| P2-07 | incident_comments | `content` | `src/pages/IncidentLog.tsx:1084` | Create column — incident comment flow |

---

## CLASS 1B — WRITES TO NONEXISTENT TABLES (P2)

These 31 tables do not exist in PROD at all. All writes silently fail with PostgREST 400.
Recommendation per table: **delete the dead code** or **create the table** if the feature is planned.

| # | Table | Write surface(s) | Fix direction |
|---|-------|-------------------|---------------|
| 1 | `admin_backups` | ADMIN | Dead feature — delete code |
| 2 | `admin_security_config` | ADMIN | Dead feature — delete code |
| 3 | `ai_budget_config` | ADMIN | Dead feature — delete code |
| 4 | `checklist_instances` | EDGE/USER | Dead feature — delete code |
| 5 | `client_advisories` | ADMIN | Dead feature — delete code |
| 6 | `demo_leads` | ADMIN | Dead feature — delete code |
| 7 | `drift_catch_acknowledgements` | USER | Dead feature — delete code |
| 8 | `feature_flag_notifications` | ADMIN | Dead feature — delete code |
| 9 | `guided_tour_templates` | ADMIN | Dead feature — delete code |
| 10 | `integration_connections` | EDGE | May be planned — verify with Arthur |
| 11 | `internal_reports` | ADMIN | Dead feature — delete code |
| 12 | `iot_sensors` | EDGE | Dead feature — delete code |
| 13 | `location_custom_vendors` | USER | Dead feature — delete code |
| 14 | `marketing_campaigns` | ADMIN | Dead feature — delete code |
| 15 | `mfa_policy` | ADMIN | Dead feature — delete code |
| 16 | `mock_inspections` | USER | Dead feature — delete code |
| 17 | `nslp_claim_periods` | USER | Dead feature — delete code |
| 18 | `photo_evidence` | USER | Dead feature — delete code |
| 19 | `platform_settings` | ADMIN | Dead feature — delete code |
| 20 | `report_schedules` | USER | Dead feature — delete code |
| 21 | `risk_plans` | ADMIN | Dead feature — delete code |
| 22 | `sales_pipeline` | ADMIN | Dead feature — delete code |
| 23 | `sb1383_compliance` | USER | Dead feature — delete code |
| 24 | `session_policy` | ADMIN | Dead feature — delete code |
| 25 | `signal_reads` | USER | Dead feature — delete code |
| 26 | `signal_review_log` | ADMIN | Dead feature — delete code |
| 27 | `system_messages` | ADMIN | Dead feature — delete code |
| 28 | `user_mfa_config` | ADMIN | Dead feature — delete code |
| 29 | `user_sessions` | ADMIN | Dead feature — delete code |
| 30 | `vendor_invitations` | USER | Dead feature — delete code |
| 31 | `workforce_risk_signals` | EDGE | Dead feature — delete code |

**Notable:** `employee_certifications`, `training_records`, `regulatory_changes`, `api_keys`, `demo_tours`, `training_modules` were listed in the original nonexistent-table inventory but have extensive read/write paths:

| Table | Write locations | Read locations | Recommendation |
|-------|----------------|----------------|----------------|
| `employee_certifications` | `AddCertificationModal.tsx:127/:134` | Team.tsx, K12Compliance.tsx, opsIntelligenceEngine.js, workforceRiskScanner.ts, 5+ edge functions | **Create table** — heavily referenced |
| `training_records` | — | Team.tsx:275, calculate-compliance-score | **Create table** if training feature ships |
| `regulatory_changes` | `scripts/seed-real-intel.ts:465`, `intelligence-deliver:398` | EvidLYIntelligence.tsx, useRegulatoryChanges.ts (4 reads), intelligence-deliver, monitor-regulations (3 reads) | **Create table** — intelligence feature core |
| `api_keys` | `InsuranceApiKeys.tsx:218`, `generate-api-key/index.ts:88` | InsuranceApiKeys.tsx:131 | **Create table** if API key feature ships |
| `demo_tours` | `DemoTours.jsx:304/:362`, `generate-demo-template:125`, `cleanup-demo-tour:160` | DemoTours.jsx:201, generate-demo-template:78, cleanup-demo-tour:135/:143 | **Create table** — demo system core |
| `training_modules` | — | training-ai-quiz-gen:25, training-ai-companion:59 | **Create table** if training AI ships |

---

## CLASS 3 — UNSATISFIED NOT NULL (follow-up)

Partial cross-check only. Full pass deferred to next audit cycle.

Known pattern from locations fix: `jurisdiction_id` was NOT NULL with no default, write paths omitted it. Fixed in f927a165 / b7d6b27b. Same pattern likely exists on other tables. Requires Q3 results to enumerate.

---

## CLASS 4 — RLS BLOCK (follow-up)

Policies retrieved but not fully cross-checked this pass.

Known pattern: Admin onboarding flows insert into tables where `user_location_access` WITH CHECK requires a matching row. The admin user may not have a `user_location_access` row for the new org being created. Same pattern as the locations RLS fix.

Tables at risk: `organizations`, `user_profiles`, `user_location_access` (bootstrap chicken-and-egg during onboarding).

---

## Q1 ACCURACY NOTES

The Q1 VALUES list was built by reading code and extracting (table, column) pairs. Three attribution errors were discovered during file:line verification:

| Error | Impact |
|-------|--------|
| `user_profiles.is_locked` / `locked_at` / `is_active` / `active_since` — code actually writes `is_suspended` / `suspended_at` / `suspended_by` / `suspend_reason` / `failed_login_count` / `locked_until` to this table | Q1 tested wrong column names. Real columns UNTESTED against PROD schema. |
| `user_profiles.onboarding_skipped_items` / `planned_location_count` — code writes these to **organizations**, not user_profiles | Q1 tested against wrong table. Status on organizations UNTESTED. |
| `calendar_events.event_type` / `scheduled_date` — code writes `type` / `date` | Q1 tested wrong column names. Real columns UNTESTED. |

**Recommended re-run:** Targeted Q1 for these 8 columns on correct tables:

```sql
WITH code_cols(tbl, col) AS (VALUES
  ('user_profiles', 'is_suspended'),
  ('user_profiles', 'suspended_at'),
  ('user_profiles', 'suspended_by'),
  ('user_profiles', 'suspend_reason'),
  ('user_profiles', 'failed_login_count'),
  ('user_profiles', 'locked_until'),
  ('organizations', 'onboarding_skipped_items'),
  ('organizations', 'planned_location_count'),
  ('organizations', 'industry_subtype'),
  ('organizations', 'onboarding_team_invited'),
  ('organizations', 'jurisdiction'),
  ('calendar_events', 'type'),
  ('calendar_events', 'date'),
  ('calendar_events', 'start_time'),
  ('calendar_events', 'end_time'),
  ('calendar_events', 'vendor_id'),
  ('calendar_events', 'vendor_name'),
  ('calendar_events', 'service_request_id')
)
SELECT c.tbl, c.col
FROM code_cols c
LEFT JOIN information_schema.columns ic
  ON ic.table_schema = 'public'
  AND ic.table_name = c.tbl
  AND ic.column_name = c.col
WHERE ic.column_name IS NULL
ORDER BY c.tbl, c.col;
```

---

## INVENTORY STATISTICS

| Metric | Count |
|--------|-------|
| Total write paths inventoried | ~644 |
| Distinct tables written | ~120 |
| CLASS 5 security findings | 3 |
| CLASS 2 missing RPCs | 4 |
| CLASS 1A phantom columns (P0 tables) | 6 tables, ~31 columns |
| CLASS 1A phantom columns (P1 tables) | 18 tables, ~38 columns |
| CLASS 1A phantom columns (P2 tables) | 7 tables, ~11 columns |
| CLASS 1B nonexistent tables | 31 tables |
| RPC call sites audited | 29 across 15 distinct functions |
| Surfaces: ADMIN / USER / EDGE / HOOK | ~180 / ~220 / ~200 / ~44 |

---

## RPC INVENTORY (complete)

All 15 distinct RPCs and their verification status:

| RPC | Call sites | Status |
|-----|------------|--------|
| `log_audit_event` | 8 (AdminOrgs, AdminUsers, AdminSecurity×3, IntelligenceAdmin×2, AdminAuditLog) + 2 edge (hoodops-webhook, classify-signals) | **PRESENT** |
| `admin_get_user_emails` | 5 (Configure, AdminUsers, UserProvisioning, UserEmulation, AdminSecurity) | **PRESENT** |
| `create_vendor_upload_request` | 2 (api.ts, auto-request-documents) | **PRESENT** |
| `get_founder_count` | 1 (useFounderCount.ts) | **PRESENT** |
| `get_evidence_thread_summaries` | 1 (useItemEvidenceTrail.ts:65) | **PRESENT** |
| `mark_evidence_messages_read` | 1 (useItemEvidenceTrail.ts:289) | **PRESENT** |
| `create_evidence_thread` | 1 (useItemEvidenceTrail.ts:346) | **PRESENT** |
| `fn_seed_canonical_haccp` | 1 (demo-account-create:226) | **PRESENT** |
| `recalc_risk_free_eligibility` | 1 (risk-free-eligibility-calc:37) | **PRESENT** |
| `fn_founder_seats_taken` | 1 (BillingPage.tsx:89) | **MISSING** |
| `fn_founder_seats_max` | 1 (BillingPage.tsx:90) | **MISSING** |
| `increment_referral_count` | 1 (evidly-referral-signup:88) | **MISSING** |
| `avg_response_ms` | 1 (api-usage-aggregate:30) | **MISSING** |

---

*Generated by C21 Phase 0 audit. Zero code changes in this pass.*
