# EVIDLY-AUDIT-01 — Full Product Inventory Report

**Commit:** `8b5e0fae415f6650ef66661a8f26fb794ac732ef`
**Branch:** `main`
**Date:** 2026-04-24
**Auditor:** Claude Code (automated, READ-ONLY)
**Purpose:** Machine-readable inventory for Bacancy QA test plan

---

## Summary Counts

| Phase | Description | Count |
|-------|------------|-------|
| 01 | Total routes (non-redirect) | 276 |
| 01 | Public routes | 58 |
| 01 | Auth-gated public routes | 4 |
| 01 | Protected (no layout) | 11 |
| 01 | Protected (with layout) | 102 |
| 01 | Admin-only routes | 101 |
| 01 | Redirect routes | 18 |
| 02 | Features/actions cataloged | 82 |
| 03 | Tables referenced in code | 108 |
| 03 | Phantom tables (code but not DB) | 61 |
| 04 | Local edge functions | 171 |
| 04 | Deployed edge functions | 222 |
| 04 | Deployed-only (no local source) | 52 |
| 04 | Local-only (never deployed) | 1 |
| 05 | External integrations | 15 |
| 05 | Client env vars (VITE_) | 12 |
| 05 | Server env vars | 16 |
| 06 | Production tables | 173 |
| 06 | Tables with RLS disabled | 7 |
| 06 | DB triggers | 20 |
| 06 | Storage buckets | 10 |
| 07 | User roles | 8 |
| 08 | Signup paths | 3 (email, demo, invite) |
| 09 | Active cron jobs | 9 |
| 09 | DB triggers | 20 |
| 10 | Critical gaps | 3 |
| 10 | Warning gaps | 5 |
| 10 | Info gaps | 3 |

---

## Phase 1 — Route Inventory (01-routes.json)

**Source:** `src/App.tsx` lines 535–840, lazy imports lines 22–265
**Framework:** react-router v6, all routes lazy-loaded

- 276 non-redirect routes across 5 wrapper tiers:
  - **Public (58):** No auth required — scoretable, assessment, kitchen-check, compliance pages, vendor login, etc.
  - **PublicRoute-wrapped (4):** login, signup, forgot-password, admin-login (redirect if already authed)
  - **Protected no layout (11):** onboarding, MFA setup, suspended, direct-access pages
  - **Protected with layout (102):** Main app routes inside ProtectedLayout (sidebar, topbar)
  - **Admin-only (101):** Wrapped in `<RequireAdmin>` — platform_admin only

---

## Phase 2 — Features per Route (02-features.json)

82 user-facing features cataloged with:
- Trigger type (button click, form submit, toggle, etc.)
- Handler/line reference
- DB write targets
- Edge function invocations
- Demo-gate status

---

## Phase 3 — DB Operations Map (03-db-operations.json)

- **108 tables** referenced via `supabase.from()` in `src/`
- **173 tables** exist in production
- **61 phantom tables** — referenced in code but do NOT exist in production. These produce runtime errors.

Top phantom tables of concern:
- `profiles` (should be `user_profiles`)
- `calendar_events`, `incidents`, `inspections`, `equipment`
- `haccp_plans`, `haccp_critical_control_points`
- `notifications`, `alerts`
- `referrals` (HoodOps PRO — must NOT be created)

---

## Phase 4 — Edge Function Inventory (04-edge-functions.json)

| Category | Count |
|----------|-------|
| Local directories | 171 |
| Deployed functions | 222 |
| Local-only | 1 (`send-welcome-email`) |
| Deployed-only | 52 |
| Invoked from frontend | 4 |

**Frontend-invoked:** `stripe-customer-portal`, `crawl-monitor`, `trigger-crawl`, `intelligence-collect`

**Critical concern:** 52 deployed functions have no local source code. Includes cron-triggered functions (`expiration-alerts`, `weekly-digest`, `vendor-sms-reminder`, `send-email`, `send-sms`). Cannot be reviewed, tested, or recovered from source control.

---

## Phase 5 — External Integrations (05-integrations.json)

15 integrations across 9 categories:

| Category | Integration |
|----------|------------|
| Core Backend | Supabase |
| Payments | Stripe |
| AI | Anthropic/Claude (24 edge fns), OpenAI (1 edge fn) |
| Communications | Resend, Twilio, Crisp, Web Push (VAPID) |
| Data Collection | Firecrawl, SAM.gov |
| Security | Google reCAPTCHA |
| Observability | Sentry |
| CMS | Sanity |
| External Webhooks | HoodOps, Intelligence |

**No `.env.example` file exists.** All 36 env vars are undocumented.

---

## Phase 6 — Supabase Production Inspection (06-db-schema.json)

- **173 public tables** in production
- **7 tables with RLS disabled:**
  - `client_intelligence_feed`
  - `intelligence_insight_views`
  - `intelligence_insights`
  - `intelligence_subscriptions`
  - `jie_health_log`
  - `jurisdiction_intel_updates`
  - `scoretable_views`
- **20 DB triggers** (mostly `updated_at` + drift monitor + trial + SLA + temp deviation)
- **10 storage buckets**
- **9 active pg_cron jobs**

---

## Phase 7 — Auth Roles & Guards (07-auth-matrix.json)

**8 canonical roles:**
1. `platform_admin` — bypasses all route guards
2. `owner_operator` — full org access (aliases: `admin`, `owner`)
3. `executive` — read-heavy access
4. `compliance_manager` — compliance workflows
5. `chef` — kitchen operations
6. `kitchen_manager` — kitchen operations + scheduling
7. `facilities_manager` — equipment + facilities
8. `kitchen_staff` — limited task-based access

**Guard layers:**
- `ProtectedRoute` — auth check + role check via `ROUTE_ROLE_MAP`
- `RequireAdmin` — `platform_admin` only
- `SalesGuard` — sales pipeline access
- `QRAuthGuard` — QR-scanned temp logging (no full auth needed)
- `DemoContext` — `isDemoMode` gating for demo orgs

---

## Phase 8 — Signup & Onboarding (08-onboarding.json)

**3 signup paths:**
1. `/signup` — email/password with 9 form fields
2. `/demo` — demo account creation (auto-generates org + data)
3. `/invite/:token` — team invite acceptance

**Onboarding flow:** Multi-step wizard (organization profile → location setup → first checklist)

**Demo mode:** SessionStorage-based + `organizations.is_demo` flag. Demo data generated via `demo-generate-data` edge function. Guided tour with step-by-step tooltips.

---

## Phase 9 — Background Jobs & Triggers (09-background-jobs.json)

**9 active pg_cron jobs:**

| Job | Schedule | Edge Function |
|-----|----------|---------------|
| vendor-sms-reminders | 9:15 AM daily | vendor-sms-reminder |
| vendor-upload-reminders | 9:00 AM daily | vendor-upload-reminder |
| expiration-alerts | 8:00 AM daily | expiration-alerts |
| weekly-digest | 3:00 PM Monday | weekly-digest |
| onboarding-reminders | 9:00 AM daily | onboarding-reminders |
| document-reminders | 9:15 AM daily | document-reminders |
| trial-email-daily | 3:00 PM daily | trial-email-sender |
| vendor-notifications-daily | 4:00 PM daily | vendor-notification-sender |
| vendor-partner-outreach-daily | 5:00 PM daily | vendor-partner-outreach |

**20 DB triggers** across 15 tables (see 09-background-jobs.json for full list).

**Drift monitor:** `trg_jurisdiction_config_drift` on `jurisdictions` table → `fn_jurisdiction_config_drift_check()` → `jurisdiction-drift-alert` edge function. 53 executions logged.

---

## Phase 10 — Gap Detection (10-gaps.json)

### Critical (3)

1. **Phantom tables (61):** Code references 61 tables that don't exist in production. Will cause runtime errors on any page that queries them.

2. **Deployed-only edge functions (52):** 52 functions exist on Supabase server with no local source. Cannot be reviewed, tested, or disaster-recovered.

3. **RLS disabled tables (7):** 7 tables lack row-level security. If any contain org-scoped or sensitive data, this is a security vulnerability.

### Warning (5)

1. **Orphan edge function (1):** `send-welcome-email` exists locally but was never deployed.

2. **Missing .env.example:** No environment variable documentation. 36 env vars across client/server are undocumented.

3. **Fake data candidate (1):** `src/utils/sampleData.ts` — purpose unclear, may violate zero-fake-data rule. Needs manual review.

4. **Schema documentation mismatch:** Audit spec referenced `state_code` column but actual column is `state`. No data issue — documentation mismatch only.

5. **Mixed cron auth methods:** Some cron jobs use `hardcoded_service_role_jwt`, others use `current_setting('app.settings.service_role_key')` or `current_setting('app.service_role_key')`. Inconsistent auth patterns.

### Info (3)

1. **Orphan routes:** PASS — all routes have valid component files.
2. **Orphan pages:** PASS — all lazy imports resolve to existing files.
3. **Role mismatch:** PASS — code roles match DB roles. 8 canonical roles.

---

## JIE Baseline Assertion

| State | Expected | Actual | Status |
|-------|----------|--------|--------|
| AZ | 15 | 15 | PASS |
| CA | 62 | 62 | PASS |
| NV | 17 | 17 | PASS |
| OR | 36 | 36 | PASS |
| WA | 39 | 39 | PASS |
| **Total** | **169** | **169** | **PASS** |

**Note:** Column is `state` (not `state_code` as spec stated). Schema doc mismatch — not a data issue.

---

## Reconciliation

| Check | Result |
|-------|--------|
| Routes ↔ components | All routes resolve to valid lazy imports |
| Code tables ↔ prod tables | 61 phantom tables (FAIL) |
| Local functions ↔ deployed | 52 deployed-only, 1 local-only |
| Code roles ↔ DB roles | Match (8 roles) |
| JIE baseline | PASS (169 jurisdictions, 5 states) |
| RLS coverage | 7 tables missing RLS |
| .env documentation | No .env.example (FAIL) |

---

## Output Files

| File | Size | Description |
|------|------|-------------|
| `01-routes.json` | Route inventory (276 routes) |
| `02-features.json` | Features/actions (82 features) |
| `03-db-operations.json` | DB operations + phantom tables |
| `04-edge-functions.json` | Edge function inventory |
| `05-integrations.json` | 15 integrations + env vars |
| `06-db-schema.json` | Production DB schema (173 tables) |
| `07-auth-matrix.json` | Auth/role matrix (8 roles) |
| `08-onboarding.json` | Signup/onboarding/demo flows |
| `09-background-jobs.json` | 9 cron jobs + 20 triggers |
| `10-gaps.json` | Gap detection (3 critical, 5 warn, 3 info) |
| `master-inventory.json` | All phases combined |
| `baseline-check.md` | JIE baseline verification |
| `gaps.md` | Human-readable gap report |
| `06-db-raw/` | Raw SQL output files |

---

## Git Status Verification

This audit was **READ-ONLY**. No source code, migrations, or edge functions were modified. Only `audit-output/` was created. Verified on commit `8b5e0fae415f6650ef66661a8f26fb794ac732ef`.

---

*Generated by EVIDLY-AUDIT-01 on 2026-04-24*
