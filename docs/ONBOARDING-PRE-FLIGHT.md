# ONBOARDING PRE-FLIGHT — Phase 0 Inspection

> **Date:** 2026-05-11
> **Status:** READ-ONLY AUDIT — no code changes
> **Scope:** Audit current onboarding implementation, jurisdiction config, roles, temperature route-out, jurisdiction auto-detection
> **PROD data:** 3 orgs, 1 location, 0 invitations, 7 temp logs, 169 jurisdictions

---

## AUDIT 1 — Current Onboarding Implementation

### 1.1 What Currently Renders

**Route `/onboarding`:** Redirects to `/dashboard` (App.tsx line 612). No standalone onboarding page exists.

**Dashboard card:** `OnboardingChecklistCard.tsx` (509 lines) renders on the dashboard when `organizations.onboarding_completed = false`. Shows "Step X of Y — Z completed" with a 15-step wizard.

**"Getting Started with EvidLY — Step 2 of 15"** is rendered by `OnboardingChecklistCard.tsx` line ~280 (`Step ${currentStepIndex + 1} of ${totalCount}`). This is the UI Arthur screenshotted.

### 1.2 Legacy 15-Step Wizard (Still in Code)

The wizard is fully built and active. It is NOT dead code.

**Config:** `src/config/onboardingChecklistConfig.ts` (340 lines)

| # | Step ID | Label | Section | Dependencies | Completion Signal |
|---|---|---|---|---|---|
| 1 | profile | Complete Your Profile | Getting Started | — | user_profiles.full_name IS NOT NULL |
| 2 | setup_locations | Set Up Locations | Getting Started | — | locations table has rows |
| 3 | add_team | Add Team Members | Team & Vendors | — | — |
| 4 | invite_team | Invite Your Team | Team & Vendors | add_team | — |
| 5 | vendors_setup | Add Your Vendors | Team & Vendors | — | vendors table has rows |
| 6 | add_vendor_services | Add Vendor Services | Team & Vendors | vendors_setup | — |
| 7 | register_equipment | Register Equipment | Safety & Compliance | — | equipment table has rows |
| 8 | upload_documents | Upload Key Documents | Safety & Compliance | — | compliance_documents has rows |
| 9 | ai_document_routing | AI Document Routing | Safety & Compliance | — | — |
| 10 | request_documents | Request Missing Documents | Safety & Compliance | vendors_setup, upload_documents | — |
| 11 | sb1383_setup | Set up SB 1383 | Safety & Compliance | — (CA only) | — |
| 12 | k12_setup | Configure K-12 | Safety & Compliance | — (K-12 only) | — |
| 13 | iot_readiness | Sensor-Ready Setup | Safety & Compliance | — | — |
| 14 | take_tour | Platform Tour | Platform Tour | — | — |
| 15 | k2c_referral | Share Kitchen to Community | Grow & Connect | — | — |
| 16 | schedule_consultation | Schedule Consultation | Grow & Connect | — (external URL) | — |
| 17 | setup_complete | Setup Complete! | Grow & Connect | — (celebration) | — |

**Required steps for `organizations.onboarding_completed = true`:** `profile`, `setup_locations`, `register_equipment`, `upload_documents` (hardcoded in `useOnboardingChecklist.ts`).

### 1.3 Hook: useOnboardingChecklist.ts (410 lines)

**State management:**
- Reads org: `industry_type`, `planned_location_count`, `onboarding_completed`, `is_sb1383_enrolled`, `is_k12`
- Persists per-org completion state to localStorage (key: `evidly-onboarding-{orgId}`)
- Auto-detects completion by querying Supabase tables (documents, locations, equipment, vendors, etc.)
- Re-triggers detection on mount + page visibility change

**Completion write:** When all 4 required steps are done, writes `organizations.onboarding_completed = true` once per session.

### 1.4 Supporting Files

| File | Lines | Purpose |
|---|---|---|
| `src/components/OnboardingChecklist.tsx` | 2 | Legacy re-export |
| `src/components/dashboard/shared/OnboardingChecklistCard.tsx` | 509 | Main UI card |
| `src/config/onboardingChecklistConfig.ts` | 340 | 15-step config |
| `src/hooks/useOnboardingChecklist.ts` | 410 | State management hook |
| `src/data/onboardingDocuments.ts` | 646 | Document checklist (22 base docs, 4 pillars) |
| `src/components/OnboardingSummary.tsx` | ~40 | Legacy 8-step summary |
| `src/components/OnboardingProgressWidget.tsx` | ~40 | Progress percentage widget |
| `src/components/GuidedTour.tsx` | 276 | Platform tour (14 steps) |
| `src/pages/AdminClientOnboarding.tsx` | 453 | Admin client onboarding form |

### 1.5 Schema: organizations table

| Column | Type | Default | Exists |
|---|---|---|---|
| onboarding_completed | boolean | false | ✅ |
| industry_type | varchar | null | ✅ |
| planned_location_count | integer | 1 | ✅ |
| is_sb1383_enrolled | boolean | false | ✅ |
| is_k12 | boolean | false | ✅ |
| onboarding_skipped_items | jsonb | — | ❌ MISSING |
| onboarding_team_invited | jsonb | — | ❌ MISSING |

### 1.6 Schema: user_profiles.onboarding_completed

**Dual-location tracking (naming collision):**
- `user_profiles.onboarding_completed` (boolean, default false) — tracks individual user's Welcome Modal dismissal
- `organizations.onboarding_completed` (boolean, default false) — tracks org-level setup completion

These are different concepts sharing the same column name. The user_profiles version is set by WelcomeModal.tsx on first dismiss. The organizations version is set by useOnboardingChecklist when 4 required steps complete.

### 1.7 Supporting Tables

| Table | Exists in PROD | Rows |
|---|---|---|
| onboarding_checklist_items | ✅ | (not queried — config-driven) |
| onboarding_document_progress | ❌ NOT IN PROD | — |
| onboarding_reminders | ✅ | (not queried) |
| document_reminders | ✅ | (not queried) |

### 1.8 PROD Data State

| Entity | Count |
|---|---|
| Organizations | 3 (Test Food, __SYSTEM_TEMPLATES__, EvidLY) |
| Locations | 1 |
| User invitations | 0 |
| Temperature logs | 7 |
| Compliance documents | 0 |
| Vendor service records | 0 |
| Location service schedules | 0 |

All 3 orgs have `onboarding_completed = false`.

### 1.9 Verdict: What Needs to Happen

The legacy wizard is a generic 15-step task list with no jurisdiction awareness, no pillar architecture, and no delegation pattern. It must be **replaced** (not extended). Key differences from locked architecture:

| Legacy | Locked Architecture |
|---|---|
| 15 generic steps | 4 essentials + 2 pillar sub-checklists |
| No jurisdiction awareness | Requirements derived from EHD/AHJ config |
| Equipment is a separate step | Equipment captured inline in Fire Safety |
| K2C in onboarding | K2C removed entirely |
| Vendor Network setup step | No VN setup (curated, invitation-only) |
| No delegation | Role delegation is first-class |
| Button-click completion | Data-driven completion (query proves Done) |
| localStorage persistence | DB-backed state |

---

## AUDIT 2 — Jurisdiction Config Readiness

### 2.1 Jurisdiction Data

| Table | Rows | Notes |
|---|---|---|
| jurisdictions | 169 | Master agency reference |
| location_jurisdictions | 1 | Only 1 location linked |
| calcode_violation_map | 44 | 44 CalCode sections mapped |
| service_type_definitions | 7 | 7 fire safety service codes |

### 2.2 Fresno County EHD (Food Safety)

**Present in PROD:** ✅

| Field | Value |
|---|---|
| ID | 29094922-8400-4c4d-b33a-3a170c5efd1c |
| Agency | Fresno County Department of Public Health — Environmental Health Division |
| State | CA |
| County | Fresno |
| Grading | report_only (no letter grades, no numeric scores) |

**Food Safety Requirements — CalCode Sections Mapped:**

The `calcode_violation_map` maps 44 CalCode sections to EvidLY modules. However, these are **violation categories** (for scoring), not **onboarding requirements**. The onboarding checklist needs a different structure:

| Onboarding Item | CalCode | Status | Notes |
|---|---|---|---|
| Health Permit | HSC §114381 | ✅ In calcode_violation_map | `evidly_module: 'documents'` |
| Food Handler Certificates | HSC §114197 (mapped as §113949 area) | ✅ In calcode_violation_map | `evidly_module: 'documents'` |
| Food Manager Certification | HSC §113716 (60-day requirement) | ⚠️ Referenced in Fresno config, NOT in calcode_violation_map as a separate item | CONTENT GAP |
| Temperature Monitoring | HSC §114000 area (§113996, §113996.5, §114002, etc.) | ✅ Multiple sections mapped | `evidly_module: 'temperatures'` |
| Pest Control | HSC §114259.1, §114259.4 | ✅ In calcode_violation_map | `evidly_module: 'equipment'` |
| HACCP Plan | HSC §113725.1 | ✅ In calcode_violation_map | `evidly_module: 'documents'` |

### 2.3 Fire Safety (AHJ — NFPA)

**Service type definitions (7 codes) map directly to fire safety onboarding items:**

| Code | Service | NFPA | Frequency | Maps to Onboarding |
|---|---|---|---|---|
| KEC | Kitchen Exhaust Cleaning | NFPA 96 | quarterly | ✅ Identify vendor |
| FPM | Fan Performance Management | NFPA 96 | quarterly | ✅ Identify vendor (sub-service of KEC) |
| GFX | Grease Filter Exchange | NFPA 96 | monthly | ✅ Identify vendor (sub-service of KEC) |
| RGC | Rooftop Grease Containment | NFPA 96 | quarterly | ✅ Identify vendor (sub-service of KEC) |
| FS | Fire Suppression System | NFPA 17A | semi_annual | ✅ Identify vendor |
| FA | Auto Fire Alarm | NFPA 72 | annual | ✅ Identify vendor |
| SP | Fire Sprinkler | NFPA 25 | quarterly | ✅ Identify vendor |

**Note:** KEC/FPM/GFX/RGC are all NFPA 96 hood-related services. For onboarding, these should be grouped under "Hood Cleaning & Exhaust" as a single item (vendor handles all 4), with FS, FA, SP as 3 separate items. Total: 4 fire safety onboarding items (Hood/Exhaust, Suppression, Alarm, Sprinkler).

### 2.4 CONTENT GAP — No Jurisdiction-to-Requirements Mapping Table

**CRITICAL FINDING:** There is no table that maps `jurisdiction_id` → `pillar` → `onboarding_requirement_items[]`.

What exists:
- `calcode_violation_map`: Maps CalCode sections to EvidLY modules (scoring use case, not onboarding)
- `service_type_definitions`: Maps fire safety service codes to NFPA citations (service scheduling, not onboarding)
- `onboardingDocuments.ts`: Hardcoded 22-document checklist across 4 pillars (not jurisdiction-specific, not DB-backed)
- `compliance_requirements`: Table exists in PROD, 0 rows, generic structure (not jurisdiction-linked)

**What's needed:** A `pillar_onboarding_items` seed table (or equivalent) that defines:
- Per-pillar (food_safety, fire_safety) requirement items
- With: title, regulation citation, typical role, frequency, action type, completion query
- Jurisdiction-scoped (for v1: universal CalCode items for CA; jurisdiction-specific items in v2)

**Recommendation:** For v1, derive requirements from existing data:
- **Food Safety:** Derive from `calcode_violation_map` + `onboardingDocuments.ts` hardcoded list → seed into a new `pillar_onboarding_items` table
- **Fire Safety:** Derive from `service_type_definitions` (already perfect structure) → query directly

This is a **CONTENT GAP** — separate ticket from the UI build. The onboarding UI can use hardcoded requirements in v1 while the seed table is built.

---

## AUDIT 3 — Team / User Profiles Role Enum

### 3.1 Role Definition

**TypeScript:** `src/contexts/RoleContext.tsx` line 7:
```typescript
export type UserRole = 'platform_admin' | 'owner_operator' | 'executive' | 'compliance_manager' | 'chef' | 'facilities_manager' | 'kitchen_manager' | 'kitchen_staff';
```

**Database:** `user_profiles.role` is `varchar(50)` with DEFAULT `'member'`. **NO CHECK constraint.** Role validation is app-only.

**CHECK constraint found:** `user_profiles_evidly_staff_role_check` exists but it's for `evidly_staff_role` column (super_admin, admin, support, sales), NOT the user-facing `role` column.

### 3.2 Role Mapping (DB Name → Display Name)

| DB Value | Display Label | Pillar Focus | Can Manage Team | Can Invite |
|---|---|---|---|---|
| platform_admin | Admin | all | ✅ | ✅ |
| owner_operator | Owner / Operator | all | ✅ | ✅ |
| executive | Executive | all | ✅ | ✅ |
| compliance_manager | Compliance Officer | all | ❌ | ❌ |
| chef | Chef | food_safety | ❌ | ❌ |
| facilities_manager | Facilities Manager | fire_safety | ❌ | ❌ |
| kitchen_manager | Kitchen Manager | food_safety | ❌ | ❌ |
| kitchen_staff | Kitchen Staff | food_safety | ❌ | ❌ |

**UserMemories mapping note:**
- "Compliance Officer" in userMemories = `compliance_manager` in DB
- "Facilities" in userMemories = `facilities_manager` in DB

### 3.3 Invite Mechanism

**Table:** `user_invitations` — fully built, 0 rows in PROD

| Feature | Status |
|---|---|
| Email invite | ✅ (Resend integration) |
| SMS invite | ✅ (schema supports, Twilio integration) |
| Role pre-fill | ✅ (role varchar in invitation) |
| Location assignment | ✅ (location_ids uuid[] array) |
| Token-based accept | ✅ (secure_token, 7-day expiry) |
| Duplicate detection | ✅ (UNIQUE on org_id + email + status) |

**Edge function:** `supabase/functions/send-team-invite/index.ts` — sends branded email via Resend with invite URL, role label, inviter name.

**UI component:** `src/components/TeamInviteModal.tsx` — full invite form with role picker, location assignment, bulk mode.

### 3.4 Gap: No Role CHECK Constraint

`user_profiles.role` accepts ANY varchar value. The 8-role enum is enforced only in TypeScript. A DB CHECK constraint would prevent invalid roles from being written.

**Recommendation:** Add CHECK constraint in Phase 1.5 schema (non-blocking — 0 invalid rows exist since role values are set by app code).

---

## AUDIT 4 — Temperature Route-Out Completion Detection

### 4.1 Temperature Tables

| Table | Exists | Rows | Notes |
|---|---|---|---|
| temperature_logs | ✅ | 7 | Unified: manual + QR + IoT |
| cooling_logs | ✅ | (not counted) | FDA 2-stage cooling tracking |
| temperature_equipment | ✅ | (not counted) | Equipment inventory |
| equipment_qr_codes | ✅ | (not counted) | QR code assets |
| receiving_temp_logs | ✅ | (not counted) | Delivery receiving temps |

### 4.2 Completion Signal for Route-Out

**How to know "temperature logging is set up":**

Option A (simplest): `SELECT 1 FROM temperature_logs WHERE organization_id = $1 LIMIT 1` — at least one temp log exists.

Option B (better): `SELECT 1 FROM temperature_equipment WHERE organization_id = $1 AND is_active = true LIMIT 1` — at least one active temperature equipment item configured.

Option C (strictest): Both equipment configured AND at least one log recorded.

**Recommendation:** Option A for v1 (matches the legacy wizard's `completionTable: 'temperature_logs'` approach). The route-out goes to `/temp-logs`, user sets up equipment and records first reading, returns to onboarding, row auto-completes.

### 4.3 HACCP Route-Out

**Tables:** `haccp_plans`, `haccp_critical_control_points`, `haccp_monitoring_logs`

**Completion signal:** `SELECT 1 FROM haccp_plans WHERE organization_id = $1 AND status IN ('active', 'complete') LIMIT 1`

**Route:** `/haccp` — HACCP dashboard with AI-assisted plan builder (7-step wizard + PDF generation)

### 4.4 Routes Available

| Route | Page | Purpose |
|---|---|---|
| `/temp-logs` | TempLogs.tsx | Temperature logging dashboard |
| `/temp/log` | TempLogQuick.tsx | Quick temp entry (QR/manual) |
| `/haccp` | HACCP.tsx | HACCP plan management |
| `/equipment` | EquipmentPage.tsx | Equipment management |

---

## AUDIT 5 — Jurisdiction Auto-Detection

### 5.1 Auto-Detection Flow

When a user adds a location with an address:

1. **`src/lib/zipToCounty.ts`** — `detectJurisdiction({ zip, state, city })` maps zip code ranges to CA counties (58 counties mapped + key TX/FL/NY counties)
2. **`src/lib/jurisdictionEngine.ts`** — `autoDetectJurisdiction(input)` calls zipToCounty, computes regulation statuses for all applicable state laws
3. **`src/utils/jurisdictionLookup.ts`** — `lookupJurisdiction(address, city, county, state, zip)` checks for independent city matches (Long Beach, Pasadena, etc.), then county-level food/fire, then federal overlays (NPS, military)
4. **`src/pages/JurisdictionSettings.tsx`** — User enters address, auto-detection fires, displays detected regulations, allows overrides

**Result:** Jurisdiction auto-detection exists and works. When a location is created in CA, EHD (food safety) and AHJ (fire safety) are auto-linked.

### 5.2 Current Limitation

Auto-detection populates `location_jurisdictions` (jurisdiction linkage) and `location_jurisdiction_profiles` (regulation config). But it does NOT generate onboarding requirement items. The gap is:

**jurisdiction detected → (MISSING STEP) → onboarding items populated**

The locked architecture needs: once jurisdiction is linked, derive pillar requirements from:
- Food Safety: CalCode sections applicable to this jurisdiction + required documents
- Fire Safety: service_type_definitions applicable to commercial kitchens + NFPA codes

This derivation is a **code task** (Phase 1 hook logic), not a schema task.

---

## SUMMARY — Gaps and Blockers

### Schema Gaps (require migration)

| # | Gap | Table | Column(s) | Blocking |
|---|---|---|---|---|
| S1 | Skip tracking | organizations | `onboarding_skipped_items` JSONB DEFAULT '[]' | Phase 1 skip/done logic |
| S2 | Invite tracking | organizations | `onboarding_team_invited` JSONB DEFAULT '[]' | Phase 1 delegation audit |
| S3 | Role CHECK | user_profiles | CHECK constraint on `role` column (8 values + 'member') | Non-blocking (nice-to-have) |

### Content Gaps (require seed data or derivation logic)

| # | Gap | Description | Resolution |
|---|---|---|---|
| C1 | No pillar requirements table | No DB table mapping jurisdiction → pillar → onboarding items | v1: Hardcode in hook from existing data (calcode_violation_map + service_type_definitions). v2: Seed table. |
| C2 | Food Manager Cert not in calcode_violation_map | HSC §113716 (required within 60 days) referenced in Fresno config but not mapped | Add to calcode_violation_map OR hardcode in food safety requirements |
| C3 | Hood service grouping | 4 NFPA 96 service codes (KEC/FPM/GFX/RGC) should present as 1 onboarding item | Handle in usePillarRequirements hook — group by parent code |

### Code Gaps (require implementation)

| # | Gap | Description | Phase |
|---|---|---|---|
| K1 | useOnboardingState() | New hook replacing useOnboardingChecklist | Phase 1 |
| K2 | usePillarRequirements() | New hook deriving requirements from jurisdiction | Phase 1 |
| K3 | useTeamRoles() | New hook for team role analysis | Phase 1 |
| K4 | useDelegationSuggestion() | New hook for 3+ items → invite banner | Phase 1 |
| K5 | Completion queries | Per-item data-existence checks | Phase 1 |
| K6 | Jurisdiction → Requirements derivation | Code to translate calcode_violation_map + service_type_definitions into onboarding items | Phase 1 |

### No Blockers for Phase 1

All gaps are addressable. Schema gaps S1 and S2 are small column additions (same as Phase 2 pattern). Content gap C1 is resolved by deriving from existing data in the hook. No external dependencies.

### Files to Preserve (Legacy)

| File | Action |
|---|---|
| src/config/onboardingChecklistConfig.ts | KEEP — remove from active imports |
| src/hooks/useOnboardingChecklist.ts | KEEP — remove from active imports |
| src/components/dashboard/shared/OnboardingChecklistCard.tsx | KEEP — stop mounting on dashboard |
| src/data/onboardingDocuments.ts | KEEP — reference data for food safety requirements derivation |
| src/components/GuidedTour.tsx | KEEP — still used for platform tour (unrelated to onboarding flow) |
| src/pages/AdminClientOnboarding.tsx | KEEP — admin tool, separate from user onboarding |

---

## PROD DATA SAFETY NOTE

3 trial orgs exist. All have `onboarding_completed = false`. Zero compliance documents, zero vendor service records, zero invitations. Schema additions (S1, S2) are nullable JSONB columns with defaults — zero risk to existing data. The onboarding rebuild only ADDS new components and hooks; it does not modify or delete any existing tables or data.

---

*End of ONBOARDING-PRE-FLIGHT.md. HARD STOP. Awaiting Arthur's review before Phase 1.*
