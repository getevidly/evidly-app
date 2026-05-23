# EvidLY Gap Detection Report (Phase 10)

Generated: 2026-04-24

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 3     | Phantom tables, deployed-only functions, RLS-disabled tables |
| WARNING  | 3     | Orphan edge function, missing env docs, fake data candidates |
| INFO     | 5     | Orphan routes/pages (none), DB-only tables (expected), role match, JIE baseline |

---

## CRITICAL Gaps

### 1. Phantom Tables (61 tables referenced in code but missing from prod DB)

**Impact:** Runtime errors. Any `supabase.from('table_name')` call against a non-existent table will fail silently or return an RLS/404 error. Users hitting pages that query these tables will see broken UI.

The following 61 tables are referenced in source code but do not exist in the production database:

```
admin_backups               admin_security_config       ai_budget_config
alerts                      assessment_responses        assessment_results
billing_invoices            billing_subscriptions       calendar_events
client_advisories           corrective_action_history   demo_leads
emulation_audit_log         equipment                   equipment_qr_codes
feature_flag_audit          frequency_change_log        guided_tour_templates
haccp_corrective_actions    haccp_critical_control_points haccp_plans
incident_comments           incident_timeline           incidents
inspections                 intelligence_classification_log internal_reports
location_custom_vendors     marketing_campaigns         marketing_touchpoints
mfa_policy                  notifications               nslp_claim_periods
outreach_touches            platform_audit_log          platform_settings
profiles                    push_subscriptions          referrals
risk_plans                  sales_pipeline              sb1383_compliance
session_policy              signal_review_log           system_messages
testimonials                trial_email_sequences       user_mfa_config
user_milestones             user_sessions               vendor_changes
vendor_connect_applications vendor_connect_leads        vendor_connect_profiles
vendor_connect_spots        vendor_notification_log     vendor_outreach_pipeline
vendor_service_records      violation_prospects          workforce_risk_signals
x
```

**Key callouts:**

- `profiles` -- Should be `user_profiles`. This is a wrong table name in code.
- `referrals` -- This is a HoodOps PRO table. Per CLAUDE.md, it must NEVER be created in this repo. The code reference should be removed.
- `x` -- Likely a typo or test artifact. Should be removed.
- `calendar_events` -- May be intentionally deferred, but code referencing it will fail until created.

**Recommended action:** Audit each phantom table. For tables that are planned features, either create them or remove the code references. For tables that are wrong names or out-of-scope, fix the code.

---

### 2. Deployed-Only Edge Functions (52 functions with no local source)

**Impact:** These functions run in production but their source code is not in the local repository. This means:

- No code review is possible
- No local testing is possible
- If the Supabase project is reset or migrated, these functions are lost
- No disaster recovery path exists

**Examples of critical deployed-only functions:**

| Function | Purpose |
|----------|---------|
| expiration-alerts | Cron-triggered alert system |
| weekly-digest | Cron-triggered weekly email |
| vendor-sms-reminder | Cron-triggered SMS |
| vendor-upload-reminder | Cron-triggered reminder |
| send-email | Core email dispatch |
| send-sms | Core SMS dispatch |
| send-welcome | Onboarding email |
| trial-email-sender | Cron-triggered trial nurture |

**Recommended action:** Pull the deployed source code from Supabase and commit it to the repo under `supabase/functions/`. This is the highest-priority recovery task.

---

### 3. RLS-Disabled Tables (7 tables without Row-Level Security)

**Impact:** These tables are readable by any authenticated (or possibly unauthenticated) user. If they contain org-scoped or sensitive data, this is a data leak.

| Table | Risk |
|-------|------|
| client_intelligence_feed | May contain org-specific intelligence |
| intelligence_insight_views | View tracking -- may expose user behavior |
| intelligence_insights | May contain org-specific analysis |
| intelligence_subscriptions | Subscription data -- org-scoped |
| jie_health_log | Health check log -- likely low risk |
| jurisdiction_intel_updates | Jurisdiction data -- possibly public |
| scoretable_views | View tracking |

**Recommended action:** Review each table's contents. If any contain organization-scoped data, enable RLS and add policies scoping reads to `organization_id`. Tables with genuinely public data (e.g., jurisdiction references) can remain open but should be explicitly documented as intentionally public.

---

## WARNING Gaps

### 4. Orphan Edge Function (1)

**Function:** `send-welcome-email`

This function exists in the local `supabase/functions/` directory but has never been deployed. It is not invoked from any frontend code or other edge functions.

**Recommended action:** Either deploy it or remove it from the repo.

---

### 5. Missing Environment Variable Documentation

No `.env.example` file exists in the repository. All environment variables required to run the application locally are undocumented.

**Impact:** New developers or contributors have no reference for what environment variables are needed, their expected formats, or which are required vs. optional.

**Recommended action:** Create a `.env.example` file listing all required variables with placeholder values (never real secrets).

---

### 6. Fake Data Candidates (6 files, 1 needs review)

Five files contain hardcoded demo data (DEMO_ prefix) that is properly gated behind `isDemoMode`:

| File | Symbols | Verdict |
|------|---------|---------|
| src/contexts/OperatingHoursContext.tsx | DEMO_HOURS, DEMO_SHIFTS | OK -- demo-gated |
| src/hooks/useDashboardData.ts | DEMO_TASKS, DEMO_DEADLINES, DEMO_ALERTS, DEMO_ACTIVITY, DEMO_MODULE_STATUSES | OK -- demo-gated |
| src/utils/demoScoring.ts | DEMO_JURISDICTIONS, DEMO_LOCATIONS, DEMO_SCORE_BREAKDOWN | OK -- demo-gated |
| src/utils/inspectionReadiness.ts | DEMO_LOCATION_SCORES | OK -- demo-gated |
| src/constants/correctiveActionStatus.ts | DEMO_TEAM_MEMBERS | OK -- demo-gated |

**Needs manual review:**

| File | Symbol | Concern |
|------|--------|---------|
| src/utils/sampleData.ts | SAMPLE_DATA | Purpose unclear. Not prefixed with DEMO_. May violate zero-fake-data rule if rendered in production path. |

**Recommended action:** Inspect `sampleData.ts` to determine if its export is gated by demo mode. If not, it likely violates the zero-fake-data rule and should be removed or gated.

---

## INFO (No Action Required)

### 7. Orphan Routes -- PASS

All routes defined in `App.tsx` have valid lazy-imported component files. No orphan routes detected.

### 8. Orphan Pages -- PASS

All page components referenced by lazy imports in `App.tsx` exist on disk. No orphan pages detected.

### 9. DB Tables Not Referenced in Frontend Code -- EXPECTED

Many database tables have no `supabase.from()` reference in `src/`. This is expected behavior for tables that are:

- Accessed only by edge functions (e.g., playbook_* tables)
- Accessed only through RLS policies or database triggers
- Created for future features but not yet wired up (vendor/marketplace/enterprise tables with 0 rows)

No action required unless a table is confirmed to be fully abandoned.

### 10. Role Alignment -- PASS

Code defines 8 roles that match the database:

```
platform_admin, owner_operator, executive, compliance_manager,
chef, kitchen_manager, facilities_manager, kitchen_staff
```

Legacy aliases `admin` and `owner` map to `owner_operator` in code. No mismatch detected.

### 11. JIE Baseline -- PASS

Jurisdiction Intelligence Engine baseline counts verified:

| State | Count |
|-------|-------|
| CA | 62 |
| OR | 36 |
| WA | 39 |
| NV | 17 |
| AZ | 15 |
| **Total** | **169** |

**Note:** The audit specification referenced column `state_code` but the actual database column is `state`. This is a schema documentation mismatch that should be corrected in audit tooling.

---

## Priority Action Items

| Priority | Gap | Action |
|----------|-----|--------|
| P0 | 52 deployed-only functions | Pull source from Supabase, commit to repo |
| P0 | 61 phantom tables | Audit each: create missing tables OR remove dead code |
| P1 | 7 RLS-disabled tables | Review data sensitivity, enable RLS where needed |
| P2 | sampleData.ts | Verify demo gating or remove |
| P2 | .env.example | Create environment variable documentation |
| P3 | send-welcome-email | Deploy or remove orphan function |
| P3 | `profiles` table reference | Fix to `user_profiles` |
| P3 | `referrals` table reference | Remove (HoodOps PRO scope violation) |
| P3 | `x` table reference | Remove (typo/test artifact) |
