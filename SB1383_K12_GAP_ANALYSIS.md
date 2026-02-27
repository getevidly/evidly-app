# SB 1383 & USDA K-12 Module Readiness — Gap Analysis

> **Audit Date:** 2026-02-25
> **Scope:** Read-only codebase audit. No code changes made.
> **Methodology:** Parallel audits of database schema (42 migrations), edge functions (25+), frontend components, JIE jurisdiction data, and all configuration files.

---

## 1. SB 1383 Edible Food Recovery Recordkeeping — Current State

### What Exists Today

| # | Asset | Location | What It Provides |
|---|-------|----------|------------------|
| 1 | **Full SB 1383 law definition** | `src/lib/californiaLaws.ts:113-137` | Tier 1/2 thresholds, effective dates, requirements (written agreements, annual reporting, recovery org records), penalties ($1k-$10k/day), `status: 'phased'` |
| 2 | **Jurisdiction engine TODO** | `src/lib/jurisdictionEngine.ts:~250` | Explicit `// TODO: Add SB 1383 tier filtering based on food generation volume` |
| 3 | **Documents table with expiration** | `supabase/migrations/20260205003451:448` | `documents` table has `expiration_date`, `category`, `tags[]`; indexed on `expiration_date` (line 725) — can store recovery org contracts |
| 4 | **AI document classification** | `supabase/migrations/20260221000000` | `document_classifications` table with `ai_document_type`, `ai_expiry_date`, `ai_vendor_name` — AI can auto-classify recovery agreements and extract expiry dates |
| 5 | **Notification system** | `supabase/migrations/20260310000000` | `notifications` table with `type` field (supports `'document_expiry'`), `priority` (low/medium/high/critical), realtime-enabled |
| 6 | **Vendor service reminder pattern** | `supabase/migrations/20260308000000` | `vendor_service_records` with multi-stage reminders (30d, 14d, 7d, 3d, 1d) — reusable pattern for contract expiration alerts |
| 7 | **Feature override table** | `supabase/migrations/20260313000000` | `feature_overrides` table: per-org boolean feature flags (`org_id`, `feature_id`, `enabled`), RLS-protected |
| 8 | **Feature gating frontend** | `src/lib/featureGating.ts` | 11 features with tier-based access (`trial`/`founder`/`professional`/`enterprise`), admin kill-switch, `useFeatureAccess()` hook |
| 9 | **RFP classifier awareness** | `supabase/functions/rfp-classify/index.ts:24` | System prompt lists "SB 1383 edible food recovery recordkeeping" as core EvidLY coverage area |
| 10 | **CalRecycle source reference** | `intelligence/supabase/migrations/002_seed_sources.sql` | CalRecycle listed as intelligence source but NOT actively crawled |
| 11 | **Playbook food loss calculator** | `supabase/functions/playbook-food-loss-calculator/index.ts:169` | Returns `donate_items` array — partial foundation for diversion tracking (insurance-focused, not SB 1383) |
| 12 | **Correlation engine** | `supabase/functions/correlation-engine/index.ts` | 8 extensible rules — can add SB 1383 violation correlation rules |
| 13 | **Jurisdiction Settings UI** | `src/pages/JurisdictionSettings.tsx:118` | Shows SB 1383 summary in regulation list for CA jurisdictions |

### Audit Checklist Results

| # | Question | Finding |
|---|----------|---------|
| 1 | Tables referencing SB 1383, food recovery, food donation? | **NO.** Zero dedicated tables. `californiaLaws.ts` has the law definition only. `cooling_logs.food_item` (text) is the only food item field in the schema. |
| 2 | Onboarding captures T1/T2 classification? | **NO.** No tier classification anywhere in onboarding or org settings. |
| 3 | Org schema supports module-level feature flags? | **YES.** `feature_overrides` table (per-org `feature_id` + `enabled` boolean). Enterprise tenants also have `features_config` JSONB. |
| 4 | Document management for recovery org contracts? | **PARTIAL.** `documents` table has `expiration_date` + `category` + `tags[]`, but no category value for "food_donation_agreement". AI classification can auto-extract expiry dates. |
| 5 | Recurring log pattern for monthly donation tracking? | **YES (pattern only).** Checklist completions (`daily`/`weekly`/`monthly`/`quarterly`/`per_shift` frequencies), temp logs with shift tracking — extensible pattern but no donation-specific table. |
| 6 | Notification system for contract expiration alerts? | **YES.** `notifications` table with `type: 'document_expiry'`, plus `vendor_service_records` multi-stage reminder pattern (30d/14d/7d/3d/1d). |
| 7 | JIE has SB 1383-specific jurisdiction data? | **NO.** JIE crawls county health dept grading systems and fire safety AHJ only. No CalRecycle region mapping, no SB 1383 reporting deadlines (typically Aug 1), no enforcement contacts. SB 1383 enforcement is under CalRecycle, not health departments. |
| 8 | Compliance scoring hooks for SB 1383? | **NO.** Current model is two-pillar (Food Safety + Fire Safety) with jurisdiction-status labels, not numeric aggregation. `score_model_versions` table has `pillar_weights` JSONB (currently `{"food_safety": 0.5, "fire_safety": 0.5}`) — extensible but no SB 1383 pillar defined. |
| 9 | Reporting pipeline for SB 1383 annual reports? | **NO.** No CalRecycle EIR (Edible Food Recovery) report format. Export center exists but is page-level, not module-aware. |
| 10 | Frontend components/routes referencing SB 1383? | **NO.** No page, no sidebar item, no route. Only `JurisdictionSettings.tsx` shows SB 1383 in a regulation summary list. |

---

## 2. SB 1383 — Gaps

### Critical (Must-Have for MVP)

| ID | Gap | Description | Size |
|----|-----|-------------|------|
| G1 | **Food recovery log table** | `food_recovery_logs`: date, location_id, recovery_org_id, food_type, food_description, weight_lbs, disposition (donated/composted/landfill), temperature_at_pickup, logged_by, photo_url, notes, created_at. Index on (location_id, date). | S |
| G2 | **Recovery organization registry** | `food_recovery_organizations`: org_id, partner_name, partner_type (food_bank/shelter/charity/composting), address, contact_name, contact_email, contact_phone, agreement_signed_date, agreement_expiry_date, agreement_document_id (FK → documents), service_area, capacity_lbs_weekly, status. | S |
| G3 | **Collection/delivery schedule table** | `recovery_schedules`: recovery_org_id, location_id, day_of_week, time_window_start, time_window_end, frequency (weekly/biweekly/monthly), active. | XS |
| G4 | **Tier classification on organization** | Add `sb1383_tier` column (`tier1`/`tier2`/`exempt`/`not_applicable`) + `sb1383_effective_date` to `organizations` table. Add tier classification logic in `jurisdictionEngine.ts` (TODO already exists). | S |
| G5 | **Feature gate: `sb_1383_tracking`** | Add to `featureGating.ts` FEATURES registry; gate sidebar item + routes; auto-enable for orgs self-identifying as T1/T2 or in CA. | XS |
| G6 | **Food Recovery logging page** | Page at `/food-recovery`: daily log form (date, food type, weight, recovery org selector, disposition, photo upload), log history table with filtering. | M |
| G7 | **Diversion rate dashboard widget** | Calculate `(donated_lbs + composted_lbs) / total_generated_lbs` monthly; display with target line (20% by 2025); alert when below threshold. | M |
| G8 | **Inspection readiness dashboard** | "Is my SB 1383 documentation complete?" — check: recovery org contracts on file + not expired, monthly donation logs current, tier classification set, signage posted. | M |

### Important (Required for Full Compliance)

| ID | Gap | Description | Size |
|----|-----|-------------|------|
| G9 | **CalRecycle annual report export** | Generate CSV/PDF matching CalRecycle's EIR format: monthly lbs donated by recovery org, by food type, annual totals, diversion rate calculation. | M |
| G10 | **Contract expiration alerts** | Wire recovery org `agreement_expiry_date` into vendor service reminder pattern (30d/14d/7d/3d/1d notifications). Reuse existing `vendor_service_records` cadence logic. | S |
| G11 | **SB 1383 compliance scoring pillar** | Add optional `food_recovery` pillar to `score_model_versions.pillar_weights` JSONB. Score based on: diversion rate vs target, contract currency, log completeness. | M |
| G12 | **Jurisdiction SB 1383 data** | New table or JIE extension: `jurisdiction_sb1383_config` with reporting_deadline, calrecycle_region, enforcement_contact, local_threshold_overrides. CalRecycle has 12 regions — map counties to regions. | M |
| G13 | **SB 1383 checklist templates** | Pre-built checklist: daily recovery verification (food stored properly before pickup, temp at handoff, weight recorded), monthly compliance review. | S |
| G14 | **CalRecycle intelligence source** | Activate CalRecycle as crawled source in intelligence pipeline for enforcement actions, deadline changes, regulatory updates. | S |

### Nice-to-Have (Differentiation)

| ID | Gap | Description | Size |
|----|-----|-------------|------|
| G15 | Donation tax receipt generator | Auto-generate 501(c)(3) donation receipts with fair market value calculation for tax benefits. | M |
| G16 | Weight estimation AI | Photo-based food weight estimation using Claude Vision via edge function. | L |
| G17 | Recovery org capacity matching | Match surplus food events to recovery orgs by capacity, proximity, food type, schedule availability. | L |
| G18 | SB 1383 penalty risk calculator | Estimate penalty exposure ($1k-$10k/day) based on current diversion rate vs requirements. | S |

---

## 3. USDA K-12 Production Records — Current State

### What Exists Today

| # | Asset | Location | What It Provides |
|---|-------|----------|------------------|
| 1 | **K12_EDUCATION industry type** | `src/pages/Signup.tsx:27-32` | Captured during signup with subtypes: `School District`, `Private School`, `Charter School`. Custom weights: `foodSafety: 65, fireSafety: 35`. |
| 2 | **K-12 onboarding step** | `src/config/onboardingChecklistConfig.ts:103-110` | `setup_usda_tracking` step: "Configure USDA meal program requirements" — visible only for `K12_EDUCATION` orgs. Currently links to `/documents` (generic). |
| 3 | **Education industry template** | `src/config/industryTemplates.ts:104-125` | Includes: Walk-in cooler/freezer, hot holding, opening/closing/receiving checklists, **"USDA Compliance Documentation"** (required checklist), "Free/Reduced Meal Program Tracking" (optional), "Farm to School Documentation" (optional). |
| 4 | **K-12 laws documented** | `src/lib/californiaLaws.ts:419-459` | AB 2316 (CA School Food Safety Act — synthetic dye ban, effective 2027), AB 1264 (Real Food, Healthy Kids Act — ultra-processed food ban). Both reference K-12 school food programs. |
| 5 | **IndustryVertical type** | `src/lib/complianceScoring.ts:36` | `'K12_EDUCATION'` defined as industry vertical — used for benchmark segmentation. |
| 6 | **Benchmark segment** | `src/data/benchmarkData.ts:102` | `'K-12'` vertical with peer count 1,560. |
| 7 | **Temperature monitoring** | `src/pages/TempLogs.tsx`, migration `20260307000000` | Full temp logging with 3 methods (manual, QR, IoT), shift tracking (`morning`/`afternoon`/`evening`), `log_type` field (equipment_check, hot_holding, cold_holding, cooling, pre_shift, post_shift). |
| 8 | **Checklist system with frequencies** | Migration `20260304000000` | Template-based checklists with `daily`/`weekly`/`monthly`/`quarterly`/`per_shift` frequencies, pass/fail tracking, GPS stamping, reviewer signature. |
| 9 | **HACCP tables** | `supabase/migrations/20260328000003` | `haccp_plans`, `haccp_critical_control_points`, `haccp_monitoring_logs`, `haccp_corrective_actions` — production-oriented monitoring with CCP linkage. |
| 10 | **Cooling logs with food item** | Migration `20260307000000:58` | `cooling_logs.food_item` (text) + `batch_id` — the only food item reference in the entire schema. Multi-stage pass/fail validation. |
| 11 | **Multi-site support** | `locations` table + `user_location_access` | Multiple locations per org, user access control per location. |
| 12 | **Enterprise hierarchy with district level** | Migration `20260213000000` | `enterprise_hierarchy_nodes` supports `level: 'district'` — directly maps to K-12 school district structure (corporate → division → region → district → location). |
| 13 | **Score model versions** | Migration `20260318000000:27` | `pillar_weights` JSONB field — extensible for adding USDA compliance pillar without modifying schema. |
| 14 | **RFP demo data** | `src/data/rfpDemoData.ts:263-265` | "K-12 School Nutrition Production Record System" — 1.1M meals daily, K-12 production records, USDA compliance reporting. Keywords include `production record`, `school nutrition`, `K-12`. |

### Audit Checklist Results

| # | Question | Finding |
|---|----------|---------|
| 1 | Tables referencing K-12, school nutrition, NSLP, production records, meal counts, grade groups? | **NO.** Zero dedicated tables. `K12_EDUCATION` exists as a freeform `industry_type` value only. |
| 2 | Onboarding captures K-12/education classification? | **YES.** `Signup.tsx` captures `K12_EDUCATION` with subtypes. Onboarding checklist has dedicated `setup_usda_tracking` step for K-12 orgs. |
| 3 | Org schema supports multi-site? | **YES.** `locations` table with FK to `organizations`. `user_location_access` for per-user site access. Enterprise hierarchy supports district→location nesting. |
| 4 | Daily log table pattern extensible for production records? | **YES (pattern).** Checklist completions with `items_data` JSONB, pass/fail counts, reviewer signature. Temp logs with shift tracking. Cooling logs with food_item + batch_id. All provide extensible patterns. |
| 5 | Temp monitoring linkable to menu items or meal periods? | **PARTIAL.** Temp logs have `shift` field (morning/afternoon/evening) and `log_type` — but NO `meal_period` field (breakfast/lunch/snack). No FK to menu items. |
| 6 | Checklist system supports meal-period-specific checklists? | **PARTIAL.** Templates have `frequency: 'per_shift'` — could be adapted for breakfast/lunch service checklists. But no `meal_period` metadata field on templates. |
| 7 | Reporting pipeline supports USDA-formatted exports? | **NO.** No Edit Check worksheet, no Claim Validation format, no production record export. Export center is page-level, not module-aware. |
| 8 | Frontend components/routes referencing K-12 or school nutrition? | **NO.** No page, no sidebar item, no route. Only the onboarding step `setup_usda_tracking` (links to generic `/documents`). |
| 9 | Compliance scoring hooks for USDA compliance? | **NO.** Current model is Food Safety + Fire Safety only. `score_model_versions.pillar_weights` JSONB is extensible but no USDA pillar defined. |
| 10 | Existing food item / menu item tracking? | **MINIMAL.** `cooling_logs.food_item` is a freeform text field. No `food_items`, `menu_items`, `recipes`, or `ingredients` tables anywhere in the schema. |

---

## 4. USDA K-12 — Gaps

### Critical (Must-Have for MVP)

| ID | Gap | Description | Size |
|----|-----|-------------|------|
| K1 | **Production records table** | `production_records`: date, location_id, meal_type (breakfast/lunch/snack/supper), menu_item_name, grade_group (K-5/6-8/9-12), planned_servings, actual_servings, leftover_servings, waste_servings, offer_vs_serve (boolean per grade group), seconds_served, production_start_time, production_end_time, produced_by, notes, school_year, serving_period. UNIQUE on (location_id, date, meal_type, menu_item_name, grade_group). | M |
| K2 | **Meal counts table** | `meal_counts`: date, location_id, meal_type, grade_group, reimbursable_free, reimbursable_reduced, reimbursable_paid, non_reimbursable, adult_meals, a_la_carte_count, total_count (computed), counted_by, school_year. UNIQUE on (location_id, date, meal_type, grade_group). | M |
| K3 | **Site/school identification** | Either extend `locations` with school-specific fields (school_id, school_name, grade_levels_served, SFA_agreement_number, CEP_status) or create a `school_sites` table FK'd to locations. | S |
| K4 | **Feature gate: `usda_k12_module`** | Add to `featureGating.ts`; auto-enable for orgs with `industry_type = 'K12_EDUCATION'`; gate sidebar + routes. | XS |
| K5 | **Org-type-adaptive sidebar** | Extend `sidebarConfig.ts` to show "USDA K-12" section when org is K-12. Current system is purely role-based — needs org-type dimension. | M |
| K6 | **Production Record entry page** | Page at `/usda/production-records`: daily form with date, meal period selector, menu items with planned/actual/leftover/waste per grade group, OVS tracking toggle, seconds tracking. | L |
| K7 | **Meal Count entry page** | Page at `/usda/meal-counts`: daily form with date, meal period, counts by eligibility (free/reduced/paid) per grade group, adult meals, a la carte, non-reimbursable. | M |
| K8 | **School year and serving period context** | Global context for current school year (e.g., `2025-2026`), serving periods (regular, summer), and operating days — needed for all K-12 records and reports. | S |

### Important (Required for Full Compliance)

| ID | Gap | Description | Size |
|----|-----|-------------|------|
| K9 | **OVS (Offer vs Serve) tracking** | Per grade group toggle: OVS mandatory for senior high (9-12), optional for K-8. Track which grade groups use OVS per location. Affects production planning. | S |
| K10 | **Meal-period temp logging** | Add `meal_period` field to temperature logs; show temps by breakfast/lunch/snack service windows. Link serving-line temps to specific meal period and optionally to menu items. | S |
| K11 | **Food safety integration path** | Confirm temp logs and HACCP monitoring can link to production records. Add optional `production_record_id` FK to `temperature_logs` and `haccp_monitoring_logs`. | S |
| K12 | **Edit Check report export** | USDA-required audit document: compare daily meal counts to attendance, flag discrepancies, generate formatted worksheet for state agency review. | M |
| K13 | **USDA audit-ready record export** | Generate bundled production records + meal counts + temp logs for a date range, formatted for Administrative Review. PDF or CSV export. | M |
| K14 | **USDA compliance scoring pillar** | Add to `score_model_versions.pillar_weights`: weighted on production record completion rate, meal count accuracy, temp log coverage during service. | M |
| K15 | **USDA checklist templates** | Pre-built: daily production record verification, breakfast service checklist, lunch service checklist, weekly commodity inventory, monthly claim preparation. | S |

### Nice-to-Have (Differentiation)

| ID | Gap | Description | Size |
|----|-----|-------------|------|
| K16 | Menu planning module | Cycle menu system with standardized recipes, CN label auto-linking, and nutritional analysis. | XL |
| K17 | Commodity allocation tracking | Track USDA commodity entitlements, usage, and inventory by school year and commodity type. | L |
| K18 | Claiming integration | Auto-generate monthly reimbursement claims from meal count data for state agency submission. | L |
| K19 | Student eligibility import | Import free/reduced eligibility files (Direct Certification) for cross-referencing with meal counts. | M |

---

## 5. Shared Infrastructure Gaps

| ID | Gap | Impact | Current State | Size |
|----|-----|--------|---------------|------|
| S1 | **Org-type-aware feature gating** | Both modules need conditional visibility based on org type + subscription tier, not just role | `featureGating.ts` has tier-based gates (trial/founder/professional/enterprise) but NO org-type dimension. `feature_overrides` table supports per-org booleans but frontend doesn't query it. | M |
| S2 | **Org-type-adaptive navigation** | Sidebar must show module-specific sections (SB 1383 for T1/T2 orgs, USDA K-12 for education orgs) | `sidebarConfig.ts` is purely role-based. `ROLE_CONFIGS` maps role → sections. No mechanism for org-type → sections. | M |
| S3 | **Module-scoped permission categories** | Both modules need entries in permission system for granular access control | `permissionCategories.ts` has 14 categories — no "Food Recovery" or "USDA K-12" category. Adding is straightforward (pattern documented in file header). | XS |
| S4 | **Compliance pillar extensibility** | Both modules want optional scoring pillars that don't disrupt existing Food Safety + Fire Safety model | `score_model_versions.pillar_weights` JSONB supports arbitrary pillars. No dynamic pillar registration UI. Frontend `complianceScoring.ts` hardcodes 2 pillars in `LocationCompliance` interface. | M |
| S5 | **Module-aware export framework** | Both modules need formatted exports (CalRecycle EIR, USDA Edit Check) beyond the existing page-level export center | Export center exists but has no module-specific report templates or format generators. | M |
| S6 | **Intelligence source expansion** | Neither module has dedicated intelligence sources for regulatory monitoring | Pipeline exists with 20+ sources. Need CalRecycle (SB 1383 enforcement) + USDA FNS (Child Nutrition rule changes). | S |

---

## 6. Reusable Foundations

### Can be extended without modification

| Foundation | Location | Reuse For |
|------------|----------|-----------|
| `feature_overrides` table | Migration `20260313000000` | `sb_1383_tracking` and `usda_k12_module` per-org feature gates |
| `notifications` table | Migration `20260310000000` | Contract expiration alerts (SB 1383), production record reminders (K-12) |
| Enterprise hierarchy (`district` level) | Migration `20260213000000` | K-12 school district → school nesting |
| `score_model_versions.pillar_weights` JSONB | Migration `20260318000000` | Add `food_recovery` and `usda_k12` scoring pillars |
| Permission categories pattern | `src/config/permissionCategories.ts` | Add new module categories — pattern is documented (lines 9-13) |
| Onboarding checklist adaptive logic | `src/config/onboardingChecklistConfig.ts` | Already has `industries` filter per step — add SB 1383 steps gated to `RESTAURANT` T1/T2 orgs |
| Industry templates | `src/config/industryTemplates.ts` | Education template already has "USDA Compliance Documentation" |
| RFP classifier | `supabase/functions/rfp-classify/index.ts` | Already mentions SB 1383 and K-12 in system prompt |
| Benchmark data | `src/data/benchmarkData.ts` | `'K-12'` vertical already defined with peer count |
| CalRecycle source | `intelligence/002_seed_sources.sql` | Listed but inactive — just activate |

### Can be extended with minor modifications

| Foundation | Location | Modification Needed | Reuse For |
|------------|----------|---------------------|-----------|
| Document management | `documents` table | Add `category` values for `'food_donation_agreement'`, `'usda_compliance'` | Recovery org contracts (SB 1383), CN labels (K-12) |
| AI document classification | `document_classifications` table | Train on new doc types | Auto-classify recovery agreements, USDA production records |
| Vendor service reminder cadence | `vendor_service_records` | Generalize to any contract entity (not just vendors) | SB 1383 recovery org contract expiration alerts |
| Temp logs with shift tracking | `temperature_logs` | Add `meal_period` column | K-12 production/service temp linkage |
| Checklist templates | `checklist_template_items` | Add meal-period metadata | Breakfast/lunch service checklists for K-12 |
| Cooling logs with food_item | `cooling_logs` | Add FK to future `food_items` or `production_records` table | Link cooling records to K-12 menu items |
| HACCP monitoring logs | `haccp_monitoring_logs` | Add `production_record_id` FK | Link CCP monitoring to K-12 production events |
| Correlation engine | `supabase/functions/correlation-engine` | Add SB 1383 and K-12 rules | "Diversion rate below target" → alert; "Production record missing" → alert |

---

## 7. Estimated Complexity

### SB 1383 Module

| Component | Size | Est. Days | Dependencies |
|-----------|------|-----------|--------------|
| DB: food_recovery_logs, recovery_organizations, recovery_schedules (G1-G3) | S | 1-2 | None |
| Tier classification column + logic (G4) | S | 1 | `jurisdictionEngine.ts` TODO |
| Feature gate (G5) | XS | 0.5 | `featureGating.ts` |
| Food Recovery logging page (G6) | M | 3-4 | G1, G2 |
| Diversion rate dashboard widget (G7) | M | 2-3 | G1 |
| Inspection readiness dashboard (G8) | M | 2-3 | G1, G2, G4 |
| CalRecycle annual export (G9) | M | 2-3 | G1 |
| Contract expiration alerts (G10) | S | 1 | G2, existing notification system |
| Compliance scoring pillar (G11) | M | 2-3 | S4 |
| Jurisdiction SB 1383 data (G12) | M | 2-3 | JIE pipeline |
| Checklist templates (G13) | S | 1 | Existing checklist system |
| Intelligence source (G14) | S | 1 | Existing pipeline |
| **SB 1383 MVP (G1-G8)** | | **~12-16** | |
| **SB 1383 Full (G1-G14)** | | **~20-26** | |

### USDA K-12 Module

| Component | Size | Est. Days | Dependencies |
|-----------|------|-----------|--------------|
| DB: production_records, meal_counts, school_sites (K1-K3) | M | 2-3 | None |
| Feature gate (K4) | XS | 0.5 | `featureGating.ts` |
| Org-type-adaptive sidebar (K5) | M | 2-3 | S2 |
| Production Record entry page (K6) | L | 5-6 | K1, K3 |
| Meal Count entry page (K7) | M | 3-4 | K2, K3 |
| School year context (K8) | S | 1-2 | K3 |
| OVS tracking (K9) | S | 1 | K1 |
| Meal-period temp logging (K10) | S | 1-2 | Existing temp system |
| Food safety integration (K11) | S | 1 | K1, existing HACCP/temp system |
| Edit Check export (K12) | M | 2-3 | K1, K2 |
| Audit-ready export bundle (K13) | M | 2-3 | K1, K2 |
| USDA compliance scoring (K14) | M | 2-3 | S4 |
| USDA checklist templates (K15) | S | 1-2 | Existing checklist system |
| **K-12 MVP (K1-K8)** | | **~16-22** | |
| **K-12 Full (K1-K15)** | | **~26-35** | |

### Shared Infrastructure

| Component | Size | Est. Days | Dependencies |
|-----------|------|-----------|--------------|
| Org-type feature gating (S1) | M | 2-3 | None |
| Org-type-adaptive nav (S2) | M | 2-3 | S1 |
| Permission categories (S3) | XS | 0.5 | Existing permission system |
| Compliance pillar extensibility (S4) | M | 2-3 | `score_model_versions` |
| Export framework (S5) | M | 3-4 | None |
| Intelligence source expansion (S6) | S | 1-2 | Existing pipeline |
| **Shared Total** | | **~11-16** | |

### Grand Total: ~47-77 days

---

## 8. Recommended Build Order

### Phase 0: Shared Foundation (Week 1-2)
> Unblocks both modules. Build once, use twice.

| Order | ID | Task | Blocks |
|-------|-----|------|--------|
| 1 | S1 | Org-type-aware feature gating — extend `featureGating.ts` to accept `orgType` in access checks; query `feature_overrides` table from frontend | S2, G5, K4 |
| 2 | S2 | Org-type-adaptive navigation — extend `sidebarConfig.ts` with `orgType` filter on sections (alongside existing `role` filter) | G6, K5 |
| 3 | S3 | Add "Food Recovery" and "USDA K-12" permission categories to `permissionCategories.ts` | G6, K6 |
| 4 | S6 | Add CalRecycle + USDA FNS intelligence sources to pipeline | G14, independent |

### Phase 1: SB 1383 MVP (Weeks 3-4)
> SB 1383 ships first — broader addressable market (all CA T1/T2 food generators), simpler data model, clear regulatory deadline pressure.

| Order | ID | Task | Blocks |
|-------|-----|------|--------|
| 1 | G1-G3 | Create `food_recovery_logs`, `recovery_organizations`, `recovery_schedules` tables + RLS | G6, G7, G8 |
| 2 | G4 | Add `sb1383_tier` to organizations; implement tier classification in `jurisdictionEngine.ts` | G6 (tier display) |
| 3 | G5 | Add `sb_1383_tracking` feature gate | G6 |
| 4 | G6 | Food Recovery logging page at `/food-recovery` | — |
| 5 | G7 | Diversion rate dashboard widget | — |
| 6 | G8 | Inspection readiness dashboard | — |
| 7 | G10 | Wire contract expiration into notification system | — |
| 8 | G13 | SB 1383 inspection readiness checklist template | — |

### Phase 2: USDA K-12 MVP (Weeks 5-7)
> More complex data model with grade groups, OVS, and meal-period awareness.

| Order | ID | Task | Blocks |
|-------|-----|------|--------|
| 1 | K1-K3 | Create `production_records`, `meal_counts`, school site fields + RLS | K6, K7 |
| 2 | K4 | Add `usda_k12_module` feature gate (auto-enable for K-12 orgs) | K5 |
| 3 | K5 | K-12 sidebar section (org-type-adaptive) | K6, K7 |
| 4 | K8 | School year + serving period context | K6, K7 |
| 5 | K6 | Production Record entry page at `/usda/production-records` | — |
| 6 | K7 | Meal Count entry page at `/usda/meal-counts` | — |
| 7 | K9 | OVS tracking per grade group | — |
| 8 | K10 | Add meal_period field to temperature logging | — |

### Phase 3: Compliance Scoring & Reporting (Weeks 8-9)
> Scoring integration and export capabilities for both modules.

| Order | ID | Task |
|-------|-----|------|
| 1 | S4 | Dynamic compliance pillar registration — extend `LocationCompliance` interface + `score_model_versions` to support optional pillars |
| 2 | S5 | Module-aware export framework with template system |
| 3 | G11 | SB 1383 compliance scoring pillar |
| 4 | K14 | USDA K-12 compliance scoring pillar |
| 5 | G9 | CalRecycle EIR annual report export |
| 6 | K12 | USDA Edit Check worksheet export |
| 7 | K13 | USDA audit-ready record export bundle |
| 8 | G14 | CalRecycle enforcement intelligence source |

### Phase 4: Audit Readiness & Polish (Week 10)
> Production-ready compliance audit support.

| Order | ID | Task |
|-------|-----|------|
| 1 | G12 | Jurisdiction-level SB 1383 data (CalRecycle regions, deadlines) |
| 2 | K11 | Link temp logs + HACCP to production records (FKs) |
| 3 | K15 | USDA-specific checklist templates (breakfast/lunch service) |
| 4 | — | End-to-end audit simulation for both modules |
| 5 | — | Demo data generation for K-12 and SB 1383 demo mode |

### Phase 5: Differentiation (Backlog)
> Nice-to-haves for competitive positioning.

- G15-G18: Donation tax receipts, AI weight estimation, capacity matching, penalty risk calculator
- K16-K19: Menu planning, commodity tracking, claiming integration, eligibility import

---

## Appendix A: Key File References

| File | Line(s) | Relevance |
|------|---------|-----------|
| `src/lib/californiaLaws.ts` | 113-137 | SB 1383 full legal definition with tier thresholds |
| `src/lib/californiaLaws.ts` | 419-459 | AB 2316 + AB 1264 K-12 school food safety laws |
| `src/lib/jurisdictionEngine.ts` | ~250 | `// TODO: Add SB 1383 tier filtering` |
| `src/lib/complianceScoring.ts` | 13-28 | `LocationCompliance` interface (2 pillars only) |
| `src/lib/complianceScoring.ts` | 32-37 | `IndustryVertical` includes `K12_EDUCATION` |
| `src/lib/featureGating.ts` | 36-159 | 11 features, tier-based access, admin kill-switch |
| `src/config/onboardingChecklistConfig.ts` | 7-12 | `IndustryCode` enum includes `K12_EDUCATION` |
| `src/config/onboardingChecklistConfig.ts` | 103-110 | `setup_usda_tracking` step for K-12 orgs |
| `src/config/industryTemplates.ts` | 104-125 | Education template with USDA Compliance item |
| `src/config/sidebarConfig.ts` | full file | Role-based nav (needs org-type extension) |
| `src/config/permissionCategories.ts` | 72-264 | 14 module categories (needs SB 1383 + K-12) |
| `src/pages/Signup.tsx` | 27-32 | K-12 signup with subtypes and custom weights |
| `src/pages/JurisdictionSettings.tsx` | 118 | SB 1383 regulation summary display |
| `supabase/migrations/20260204500000` | — | Organizations + locations core tables |
| `supabase/migrations/20260205003451` | 448-460 | Documents table with expiration_date, tags[] |
| `supabase/migrations/20260307000000` | — | Temperature logs + cooling logs (food_item field) |
| `supabase/migrations/20260304000000` | — | Checklist templates with frequency support |
| `supabase/migrations/20260310000000` | — | Notifications table (realtime, typed alerts) |
| `supabase/migrations/20260313000000` | — | Per-org feature_overrides table |
| `supabase/migrations/20260318000000` | 27-32 | score_model_versions with pillar_weights JSONB |
| `supabase/migrations/20260328000003` | — | HACCP plans, CCPs, monitoring logs |
| `supabase/migrations/20260213000000` | — | Enterprise hierarchy (supports district level) |
| `supabase/functions/rfp-classify/index.ts` | 24-25 | System prompt references SB 1383 + K-12 |
| `supabase/functions/playbook-food-loss-calculator` | 169 | `donate_items` array (partial diversion foundation) |
| `supabase/functions/correlation-engine` | — | 8 extensible rules |
| `scripts/jie/jurisdictions/` | — | JIE pipeline — NO SB 1383 or K-12 jurisdiction data |

## Appendix B: Cross-Module Audit Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Does architecture support module-level feature gating per org? | **YES (backend), PARTIAL (frontend).** `feature_overrides` table exists. `featureGating.ts` has tier-based gates but doesn't query `feature_overrides` — needs wiring. |
| 2 | Does role permissions system support per-module access? | **YES (extensible).** `permissionCategories.ts` documents the pattern for adding new modules (lines 9-13). Just add new category entries. |
| 3 | Does onboarding have adaptive logic for SB 1383 / K-12? | **PARTIAL.** K-12 has `setup_usda_tracking` step gated to `K12_EDUCATION`. SB 1383 has NO onboarding steps. Onboarding checklist supports `industries` filter per step — ready to add SB 1383 steps. |
| 4 | Can intelligence pipeline accept SB 1383 correlation rules? | **YES.** Correlation engine has 8 rules and is designed for extension. CalRecycle source is listed but inactive. |
| 5 | Does scoring engine support new domains without core modification? | **PARTIAL.** `score_model_versions.pillar_weights` JSONB accepts arbitrary keys. But frontend `LocationCompliance` interface hardcodes `foodSafety` + `fireSafety` — needs interface extension. |
| 6 | Does sidebar support conditional module visibility by org type? | **NO.** `sidebarConfig.ts` is purely role-based via `ROLE_CONFIGS`. No org-type dimension. This is the single biggest shared infrastructure gap. |
