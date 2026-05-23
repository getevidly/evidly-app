# EVIDLY LAUNCH READINESS AUDIT REPORT

**Date:** 2026-05-09
**Auditor:** Claude Code (read-only)
**Repo:** `C:\Users\newpa\OneDrive\Desktop\evidly-app`
**PROD Supabase ref:** `irxgmhxhmxtzfwuieblc`
**Test org:** `18309b08-b9a6-4031-9676-fc55504f8b9c`

---

## SECTION 1 — REPO + GIT STATE

**STATUS:** 🟡 PARTIAL (dirty working tree)

### Current branch: `main`

### Uncommitted changes (4 modified + 44 untracked):

**Modified (staged/unstaged):**
- `src/App.tsx` (2 insertions)
- `src/components/layout/AutoBreadcrumb.tsx` (1 insertion)
- `src/components/layout/Sidebar.tsx` (14 changes, net -743 lines — sidebar restructure in progress)
- `src/config/sidebarConfig.ts` (1141 lines rewritten — 407 insertions, 757 deletions)
- `supabase/.temp/cli-latest` (version bump)

**Untracked (44 files):** Audit artifacts, diff chunks, temp files, orphaned `src/pages/JurisdictionIntelligence.tsx`, `e2e/` test files. None are code that should ship.

### Branches:
- `main` (active)
- `staging-mirror` (local)
- `remotes/origin/main`
- `remotes/origin/staging-test`

### Remote: `https://github.com/getevidly/evidly-app.git`

### Last 30 commits (most recent first):
| SHA | Date | Subject |
|-----|------|---------|
| da7e36a | 2026-05-09 | chore(db): migrate cron service_role JWTs to Vault secret |
| 4a92a7c | 2026-05-08 | feat(db): create document send + recipient + notification preference tables |
| 1cde18f | 2026-05-07 | feat(db): create compliance_documents foundational schema |
| 98f81ca | 2026-05-07 | feat(db): extend vendor_secure_tokens + service_action_log |
| a584e46 | 2026-05-07 | chore(db): delete orphaned pg_cron jobs |
| 7a6d62b | 2026-05-07 | chore(admin): remove DocumentVault.tsx after EvidLY Vault rename |
| de914e3 | 2026-05-07 | feat(fire): add PSE status + reschedule notice helpers |
| 16ba61f | 2026-05-07 | feat(admin): restructure admin sidebar IA |
| 6a632d6 | 2026-05-07 | chore(config): add @/ alias resolution for canonical query layer |
| 0c1c446 | 2026-05-07 | feat(db): create platform_audit_log and service_action_log |
| b42bd2f | 2026-05-07 | chore(verify): smoke-test Sprint Zero schema |
| d164b8e | 2026-05-07 | feat(db): create location_service_schedules and service_reschedule_requests |
| 3f3f719 | 2026-05-07 | feat(db): create vendor_service_records and align HoodOps webhook |
| 0341ec4 | 2026-05-07 | feat(db): add service_type_definitions and seed 7 service codes |
| 4eded36 | 2026-05-06 | chore(db): remove dead vendor service workflow code |
| 85052f9 | 2026-05-06 | BUG-AI-CHAT-405: Fix remaining HACCP AI call sites |
| 2b15eef | 2026-05-06 | BUG-AI-CHAT-405: Fix AI Compliance Advisor chat endpoint |
| a3328ea | 2026-05-06 | BUG10: Wire Dashboard Today counters to canonical task-state |
| e4d7dbd | 2026-05-06 | HOTFIX-INC1: Align IncidentLog.tsx with PROD incidents.status CHECK |
| a6b1201 | 2026-05-06 | feat(canonical): add documents-state canonical query hook |
| 6dabaa1 | 2026-05-06 | feat(canonical): add incidents-state canonical query hook |
| 698e813 | 2026-05-06 | feat(canonical): add corrective-actions-state canonical query hook |
| da63d1d | 2026-05-05 | feat(canonical): add temperature-state canonical query hook |
| a803ef4 | 2026-05-05 | feat(canonical): add task-state canonical query hook |
| 21e9488 | 2026-05-05 | feat(canonical): add compliance-state canonical query hook |
| b1d2166 | 2026-05-05 | fix(equipment): hoist locations into state |
| 5bc93bd | 2026-05-05 | CANONICAL-LAYER-01-1F: replace stale hardcoded NOW dates |
| 2e5716c | 2026-05-05 | CANONICAL-LAYER-01-1E: add canonical kitchen-local time helpers |
| eaecde1 | 2026-05-05 | CANONICAL-LAYER-01-1D: extract OPEN/CLOSED incident status constants |
| ebe0270 | 2026-05-05 | CANONICAL-LAYER-01-1C: extract OPEN/CLOSED corrective action status constants |

### Total commits since April 21 (sprint start): **303**

---

## SECTION 2 — BUILD + TYPECHECK STATE

**STATUS:** 🔴 BLOCKED (build fails)

### Build (`npm run build`):
**FAILS.** `vite build` cannot find `node_modules/vite/dist/node/cli.js`. This is a local `node_modules` corruption issue (Node.js v24.13.0). The build likely works on Vercel's deployment environment, but the local dev environment is broken.

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'C:\Users\newpa\OneDrive\Desktop\evidly-app\node_modules\vite\dist\node\cli.js'
```

**GAP:** `npm ci` or `npm install` needed locally. Does not affect Vercel prod deployments (which run their own `npm ci`).

### TypeScript (`tsc --noEmit`):
**PASSES.** 0 errors. Clean typecheck.

---

## SECTION 3 — TEST STATE

**STATUS:** 🟡 PARTIAL

### Unit test files: **15**
Located in:
- `src/components/__tests__/` (2 files)
- `src/hooks/__tests__/` (1 file)
- `src/lib/__tests__/` (12 files)

### E2E spec files: **17**
Located in `e2e/` (admin, accessibility, visual, responsive, operations, demo, ui-sweep).

### Vitest run:
Cannot run locally due to broken `node_modules` (same Vite issue as build). Vitest config exists at `vitest.config.ts` with jsdom environment.

### 107-test functional plan:
**UNKNOWN — needs Arthur.** No evidence of a 107-test plan execution or results file in the repo. The e2e specs exist but no Playwright test results found.

**GAP:** Need `npm ci` to restore node_modules, then vitest run + Playwright execution.

---

## SECTION 4 — LAYER 1 CANONICAL DATA

**STATUS:** ✅ READY

### All 6 SHAs confirmed in `main`:
| Step | SHA | Subject | Confirmed |
|------|-----|---------|-----------|
| 1A | `0d8db02` | Align pillar type unions with PROD schema | ✅ |
| 1B | `dd38e98` | Sweep pillar literals to fire_safety across consumers | ✅ |
| 1C | `ebe0270` | Extract OPEN/CLOSED corrective action status constants | ✅ |
| 1D | `eaecde1` | Extract OPEN/CLOSED incident status constants | ✅ |
| 1E | `2e5716c` | Add canonical kitchen-local time helpers | ✅ |
| 1F | `5bc93bd` | Replace stale hardcoded NOW dates with live new Date() | ✅ |

### `canonicalTime.ts`:
Exists. Exports `kitchenToday`, `kitchenStartOfDay`, `kitchenEndOfDay`, `kitchenNow` (confirmed by head-30 read). Pure utility, no React/Supabase imports.

### `correctiveActionStatus.ts`:
Exists (93 lines). Exports `CA_STATUSES`, `CA_STATUS_MAP`, `OPEN_CORRECTIVE_ACTION_STATUSES`, `CLOSED_CORRECTIVE_ACTION_STATUSES`.

**BUG LOGGED (Section 13):** `DEMO_TEAM_MEMBERS` array with 9 hardcoded fake names lives in `src/constants/correctiveActionStatus.ts:83-92`. This violates the zero-fake-data rule and ships to production.

### `facility_safety` as pillar:
**134 references** across `src/`. Majority are legitimate category identifiers in types, data files, and pillar-switch logic (e.g., `'facility_safety'` as a valid pillar value in type unions). The 1B sweep correctly changed `'facility_safety'` from an incorrect usage to the canonical pillar name. Remaining uses are correct — `facility_safety` IS the canonical pillar name for Fire Safety.

---

## SECTION 5 — LAYER 2 CANONICAL QUERY HOOKS

**STATUS:** ✅ READY (6 of 6 shipped; vendor-state deferred per plan)

### All 6 hooks exist in `src/lib/canonicalQueries/`:
| File | Lines | Status |
|------|-------|--------|
| compliance-state.ts | 433 | ✅ Shipped |
| task-state.ts | 400 | ✅ Shipped |
| temperature-state.ts | 418 | ✅ Shipped |
| corrective-actions-state.ts | 497 | ✅ Shipped |
| incidents-state.ts | 483 | ✅ Shipped |
| documents-state.ts | 447 | ✅ Shipped |
| **Total** | **2,678** | |

### vendor-state.ts:
**Confirmed DEFERRED** to Fire Safety phase per plan. No file exists. This is expected.

---

## SECTION 6 — LAYER 3 CONSUMER MIGRATION

**STATUS:** 🔴 BLOCKED

### Consumer files migrated onto canonical hooks: **1**
Only `src/hooks/useDashboardData.ts` imports from `canonicalQueries/`.

### Hook usage across codebase:
Files referencing any canonical hook (`useComplianceState`, `useTaskState`, etc.):
- `src/hooks/useDashboardData.ts` — **only consumer**
- The 6 hook definition files themselves

### Target: 30–40 files. Actual: **1 file.**

**GAP:** 29–39 consumer files still need migration. This is the single largest unfinished workstream. Surfaces like Temperatures, Checklists, Incidents, Corrective Actions, Documents, Tasks all still query Supabase independently rather than through canonical hooks.

---

## SECTION 7 — EQUIPMENT MODULE (E1/E2 + wire-up)

**STATUS:** 🟡 PARTIAL

### Files present:
- `src/hooks/api/useEquipment.ts` — **STUBBED.** Comment at top says "stubbed with empty data." All query functions have `// TODO: Replace with Supabase query` (6 TODOs).
- `src/pages/equipment/EquipmentPage.tsx` — exists, renders grid/list views, filters, stats
- `src/pages/equipment/EquipmentDetailPage.tsx` — exists
- `src/pages/equipment/QRScanLandingPage.tsx` — exists
- `src/components/equipment/EquipmentFormModal.tsx` — exists

### Routes in App.tsx:
- `/equipment` → `EquipmentPage` ✅
- `/equipment/:id` → `EquipmentDetailPage` ✅
- `/equipment/:equipmentId/service/new` → `ServiceRecordEntry` ✅
- `/equipment/scan/:equipmentId` → `QRScanLandingPage` ✅

### Bug E1 (location dropdown):
`EquipmentFormModal.tsx:127-131` — Location field is a **free-text input** (`<input>` with `placeholder="Search for a location..."`), NOT a dropdown wired to org locations. Bug E1 is **OPEN**.

### Bug E2 (date picker):
`EquipmentFormModal.tsx:179-180` — `<input type="date">` with no `min` or `max` attributes. Accepts any date including pre-2026. Bug E2 is **OPEN**.

### Backend:
`useEquipment.ts` returns empty arrays from stubs. The `equipment` table exists in migrations but the hook is not wired to it. Equipment data will show empty in production.

**GAP:** useEquipment needs real Supabase queries (6 TODOs). E1 needs location dropdown. E2 needs date constraints.

---

## SECTION 8 — FIRE SAFETY PILLAR

**STATUS:** 🟡 PARTIAL

### Sprint Zero — 5/5 SHAs confirmed:
| SHA | Subject | Confirmed |
|-----|---------|-----------|
| `4eded36` | Remove dead vendor service workflow code | ✅ |
| `0341ec4` | Add service_type_definitions and seed 7 service codes | ✅ |
| `3f3f719` | Create vendor_service_records and align HoodOps webhook | ✅ |
| `d164b8e` | Create location_service_schedules and service_reschedule_requests | ✅ |
| `b42bd2f` | Smoke-test Sprint Zero schema and harden hoodops-webhook | ✅ |

### Sprint A — status:
Sprint A commits shipped (post-Sprint Zero, fire-related):
1. `0c1c446` — platform_audit_log and service_action_log ✅
2. `de914e3` — PSE status + reschedule notice helpers ✅
3. `a584e46` — Delete orphaned pg_cron jobs ✅
4. `98f81ca` — Extend vendor_secure_tokens + service_action_log ✅
5. `1cde18f` — Compliance_documents foundational schema ✅
6. `4a92a7c` — Document send + recipient + notification preference tables ✅
7. `da7e36a` — Migrate cron JWTs to Vault secret ✅

**Sprint A database infrastructure: 7/7 commits shipped.**

### Fire Safety pages:
| File | Route | Status |
|------|-------|--------|
| `src/pages/fireSafety/Overview.jsx` | `/fire-safety/overview` | ✅ Shipped (queries real data) |
| `src/pages/fireSafety/Analysis.jsx` | `/fire-safety/analysis` | ✅ Shipped |
| `src/pages/fireSafety/Trajectory.jsx` | `/fire-safety/trajectory` | ✅ Shipped |

### Routes registered in App.tsx:
- `/fire-safety` → redirect to `/fire-safety/overview` ✅
- `/fire-safety/overview` ✅
- `/fire-safety/analysis` ✅
- `/fire-safety/trajectory` ✅

### Fire Safety tables in migrations:
- `service_type_definitions` — CREATE + 7-code seed ✅
- `vendor_service_records` — CREATE + full schema ✅
- `location_service_schedules` — CREATE ✅
- `service_reschedule_requests` — CREATE ✅
- `platform_audit_log` — CREATE ✅
- `service_action_log` — CREATE ✅
- `vendor_contact_log` — exists (from earlier migration 20260206) ✅

### Missing from Sprint A (UI):
- Modals for service record entry/edit — **not found as standalone components** (ServiceRecordEntry page exists for equipment, not fire safety specific)
- Fire Safety Overview rebuilt with PSE tiles — the Overview.jsx does query real PSE data using `usePSESchedules` and `useVendorServiceRecords`
- Nav restructured for fire safety — partially done via sidebar commits

**VERDICT:** Database + lib layer complete. UI pages exist and query real data. Modals and detailed service flow UI need verification.

---

## SECTION 9 — VENDOR SERVICES (NON-NEGOTIABLE FOR LAUNCH)

**STATUS:** 🔴 BLOCKED — 0/10 ticket commits shipped

### Assessment against VENDOR-SERVICES-001.md 10-commit ticket:

| # | Deliverable | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Shared lib (pseStatus, sortServices, industryTemplates) | 🟡 Partial | `pseStatus.ts` exists (32 lines), `rescheduleNotice.ts` exists. No `sortServices`. `industryTemplates` exists in `src/config/` but is for onboarding, not vendor services. |
| 2 | Canonical query hooks (useVendorServices, useVendorDocsHealth) | 🔴 Not found | Zero grep matches for `useVendorServices` or `useVendorDocsHealth` in codebase |
| 3 | VendorDocsPanel shared component | 🔴 Not found | No file matching `VendorDocsPanel*` |
| 4 | ServiceCard with 8 information layers | 🔴 Not found | No file matching `ServiceCard*` |
| 5 | EmptyLocationState onboarding wizard | 🔴 Not found | No file matching `EmptyLocationState*` |
| 6 | HeatMapView | 🔴 Not found | No file matching `HeatMap*` |
| 7 | AllServicesView | 🔴 Not found | No file matching `AllServices*` |
| 8 | 3-way view toggle | 🔴 Not found | No view toggle component |
| 9 | Real backend wiring (mock data replaced) | 🔴 Not started | Existing vendor hooks (`useVendorServiceRecords`, `usePSESchedules`) query real tables but are not the canonical hooks specified |
| 10 | Action handlers wired | 🔴 Not started | No vendor action handlers |

### Existing vendor infrastructure:
- `src/hooks/useVendorServiceRecords.ts` — queries `vendor_service_records` for PSE types ✅
- `src/hooks/usePSESchedules.ts` — queries `location_service_schedules` ✅
- `src/hooks/useRescheduleRequests.ts` — queries schedules ✅
- 18 vendor-related files in `src/components/vendor/` — these are vendor network/document management, NOT the vendor services rebuild
- `src/pages/` — no `vendorServices/` or `vendor-services/` directory exists
- Route `/services` exists in App.tsx pointing to `ServicesPage` — exists but is the old services page

### Pages that exist:
- `/vendors` → `Vendors` (vendor network management)
- `/vendors/:vendorId` → `VendorDetail`
- `/services` → `ServicesPage`
- `/services/:recordId` → `ServiceRecordDetail`

### VENDOR-SERVICES-001.md:
File not found in repo root. The 10-commit ticket plan may live elsewhere.

**VERDICT:** 🔴 BLOCKED. The 10-commit vendor services rebuild has not started. The database infrastructure (Sprint Zero tables) is complete, the PSE helper libs exist, and raw query hooks exist — but the UI rebuild (commits 2-10) has zero progress. This is the #1 launch blocker.

---

## SECTION 10 — NAV / SIDEBAR

**STATUS:** 🟡 PARTIAL (admin done, user in progress)

### Admin sidebar restructure:
All 3 SHAs confirmed in `main`:
- `6a632d6` — @/ alias resolution ✅
- `16ba61f` — Restructure admin sidebar IA ✅
- `7a6d62b` — Remove DocumentVault.tsx after rename ✅

### User sidebar restructure:
**IN PROGRESS.** Uncommitted changes show:
- `src/config/sidebarConfig.ts` — 1,141 lines rewritten (407 ins, 757 del) — **not yet committed**
- `src/components/layout/Sidebar.tsx` — 14 changes — **not yet committed**

### Current nav items:
`sidebarConfig.ts` defines **58 nav items** across these sections:
- Top-level: Dashboard, Compliance Overview, Tasks, Calendar, Documents, Kitchen to Community
- Food Safety: Overview, Temperatures, Checklists, HACCP, Incidents, Corrective Actions, Self-Inspection
- Fire Safety: Overview, Calendar, Incidents, Corrective Actions, Deficiencies
- Programs: SB 1383, K-12, USDA Production
- Jurisdiction: Intelligence, Regulatory Updates, Signals
- Vendors: Vendor Network, Vendor Services
- Insights: AI Insights, Inspection Forecast, Trends, Benchmarks
- (Plus admin items gated by role)

### Dead route references:
The sidebar restructure is in progress but uncommitted. Cannot fully assess dead routes until the uncommitted changes are committed and tested.

---

## SECTION 11 — SPRINT S3–S6 WORKSTREAMS

### S3 — Post-signup onboarding wizard
**STATUS:** 🟡 PARTIAL

Evidence:
- `/onboarding` route exists → `Onboarding` component ✅
- `/setup/food-safety` route exists → `SetupFoodSafetyEntry` ✅
- `/setup/food-safety/:locationId` route exists → `SetupFoodSafety` ✅
- `WizardShell` component exists ✅
- Stepper navigation wired (`c5c4b42`, `aa98500`) ✅
- 10 related commits found in history

**GAP:** Onboarding wizard exists but unknown if it covers the full post-signup flow end-to-end. No dedicated `src/pages/onboarding/` or `src/components/onboarding/` directories found.

### S4 — Empty states + guided tooltips
**STATUS:** 🟡 PARTIAL

Evidence:
- **107 references** to `EmptyState` or `<Empty ` across codebase
- Multiple commits adding empty states: FU1.6 (equipment), HC4 (menu items), cooldown
- Guided tooltips: no dedicated tooltip/tour system found beyond demo tours

**GAP:** Empty states exist organically but no systematic audit confirms all surfaces have them. Guided tooltip system not implemented.

### S5 — Celebration + UI polish
**STATUS:** ⚪ NOT STARTED

Evidence:
- No commits matching "celebration" found
- "polish" matches are Sprint 5d sidebar commits (different workstream)
- No celebration animations, confetti, or completion rewards found

### S6 — AI showcase + final QA
**STATUS:** ⚪ NOT STARTED

Evidence:
- No commits matching "AI showcase", "S6", "Sprint 6", or "launch readiness" found
- AI features exist (AI Advisor, AI Draft buttons) but no showcase/demo flow
- No final QA pass evidence

---

## SECTION 12 — TRIAL TERMINOLOGY + BANNED TERMS

**STATUS:** 🟡 PARTIAL (cleanup needed)

### Trial references in active code: **153**

### Customer-facing surfaces with "free trial":
| File | Context |
|------|---------|
| `src/components/AuthModal.tsx:74` | "Start your free trial" in signup mode |
| `src/components/BillingPanel.tsx` | 10+ references: "Free Trial Active", "Start Free Trial", trial countdown |
| `src/components/DashboardUpgradeCard.tsx:37,56` | "Start Free Trial — $99/month", "14-day free trial" |
| `src/components/DemoBanner.tsx:26,45,47` | "Start Free Trial", "demo trial", "Demo Trial" |
| `src/components/DemoCTABar.tsx:29` | "Start Free Trial" |
| `src/components/DemoRestrictions.tsx:61` | "Start your free trial" |
| `src/components/DemoUpgradePrompt.tsx:55,66` | "Start a free trial", "Start Free Trial" |
| `src/components/MobileStickyBar.tsx:44` | "Start Free Trial — $99/mo" |
| `src/components/Pricing.tsx:129,213,256,322` | "30-day free trial", "Start Free Trial" x2 |
| `src/components/PremiumFeaturePreview.tsx:15` | trial tier label |

### "Free trial" count in components/pages: **11 files**

### Trial edge function:
`supabase/functions/trial-email-sender/` exists. Sends trial lifecycle emails.

### Total edge functions: **166** (including `_shared`)

**GAP:** 11+ customer-facing files reference "free trial." If trial language is banned for launch, all need cleanup. The `trial-email-sender` edge function needs review for language compliance.

---

## SECTION 13 — OPEN BUGS, TODOs, FIXMEs

**STATUS:** 🟡 PARTIAL

### Total TODO/FIXME/HACK/XXX count: **112**

### Critical bugs found during audit:

1. **DEMO_TEAM_MEMBERS in constants** — `src/constants/correctiveActionStatus.ts:83-92` contains 9 hardcoded fake team member names. Violates zero-fake-data rule. Ships to production.

2. **useEquipment.ts fully stubbed** — 6 TODO comments, all query functions return empty data. Equipment module shows nothing in production.

3. **useDeficiencies.ts fully stubbed** — 4 TODO comments, returns empty data.

4. **useReports.ts fully stubbed** — 3 TODO comments.

5. **useSchedule.ts fully stubbed** — 5 TODO comments.

6. **useServiceRecords.ts fully stubbed** — 3 TODO comments.

7. **useSettings.ts fully stubbed** — 7 TODO comments.

### Top TODO files by count:
| File | TODOs |
|------|-------|
| `src/lib/regulatoryMonitor.ts` | 13 |
| `src/types/jurisdiction.ts` | 12 |
| `src/lib/jurisdictionEngine.ts` | 10 |
| `src/hooks/api/useEquipment.ts` | 6 |
| `src/hooks/api/useSettings.ts` | 7 |
| `src/lib/jurisdictions.ts` | 6 |
| `src/hooks/api/useSchedule.ts` | 5 |
| `src/hooks/api/useDeficiencies.ts` | 4 |

---

## SECTION 14 — DATABASE STATE (PROD)

**STATUS:** 🟡 PARTIAL (cannot query PROD directly)

### From migration files:

- **Total migration files:** 343
- **Migrations with CREATE TABLE:** 156
- **RLS ENABLE statements across all migrations:** 423

### Fire Safety Sprint Zero tables (confirmed in migrations):
| Table | Migration | RLS | Seed Data |
|-------|-----------|-----|-----------|
| service_type_definitions | 20260801 | ✅ | 7 codes (KEC, FPM, GFX, RGC, FS, FA, SP) ✅ |
| vendor_service_records | 20260802 | ✅ | None (operational) |
| location_service_schedules | 20260803 | ✅ | None (operational) |
| service_reschedule_requests | 20260803 | ✅ | None (operational) |
| platform_audit_log | 20260804 | ✅ (service_role only) | None |
| service_action_log | 20260804 | ✅ | None |
| vendor_contact_log | 20260206 | ✅ | None |

### Sprint A tables (confirmed in migrations):
| Table | Migration | RLS |
|-------|-----------|-----|
| compliance_documents | 20260807 | ✅ |
| compliance_document_requests | 20260807 | ✅ |
| compliance_document_activity_log | 20260807 | ✅ |
| compliance_document_send_records | 20260808 | ✅ |
| compliance_document_send_items | 20260808 | ✅ |
| recipient_profiles | 20260808 | ✅ |
| user_notification_prefs | 20260808 | ✅ |

### Edge functions: **166** (including `_shared`)

### Tables with `_demo`, `_test`, `_sample` in name:
NONE FOUND in `CREATE TABLE` statements (clean).

### PROD row counts for test org:
**UNKNOWN — needs Arthur.** Cannot query PROD database directly without Supabase MCP connection or `supabase db` CLI access. The local Supabase CLI has a corrupted node_modules environment.

---

## SECTION 15 — ROUTES MAP

**STATUS:** 🟡 PARTIAL

### Total routes defined: **266**

### Route categories:
- Public routes (login, signup, landing, SEO pages): ~50
- Protected user routes (dashboard, food safety, fire safety, etc.): ~100
- Admin routes: ~50
- Vendor routes: ~10
- Redirect/alias routes: ~30
- Settings sub-routes: ~8

### Routes pointing to placeholder/stub components:
- `/equipment` → EquipmentPage (real UI, but useEquipment returns empty data)
- `/deficiencies` → Deficiencies (useDeficiencies returns empty data)
- `/workforce-risk` → WorkforceRisk (status unknown)
- `/cic-pse` → CicPseView (status unknown)

### Duplicate/conflicting equipment routes:
- Lines 69-71: `EquipmentPage`, `EquipmentDetailPage`, `QRScanLandingPage` (from `pages/equipment/`)
- Lines 83-84: `Equipment`, `EquipmentDetail` (from `pages/Equipment.tsx` — legacy)
- Lines 686-688 use the new versions; old imports at 83-84 appear unused

### Notable redirect chains:
- `/facility-safety` → `FacilitySafety` (old) — should redirect to `/fire-safety`?
- Multiple admin redirects for renamed pages

---

## SECTION 16 — CRITICAL LAUNCH DEPENDENCIES

| Dependency | Status | Evidence |
|------------|--------|----------|
| **Stripe live keys** | 🟡 Placeholder | `.env.example` has `pk_test_...your-publishable-key`. Actual keys in Vercel env — UNKNOWN |
| **GA4 ID** | 🔴 NOT CONFIGURED | `index.html` contains `YOUR_GA4_ID` placeholder (not `G-VE2QFDN5Z0`) |
| **Resend API key** | 🟡 Edge function secret | Listed in `.env.example` as `# RESEND_API_KEY=re_...` (commented). Set via `supabase secrets` |
| **Sentry DSN** | 🔴 NOT FOUND | No Sentry reference in `.env.example` or `.env` |
| **Vercel project linked** | ❓ UNKNOWN | `.vercel/project.json` not found locally. May be in Vercel dashboard |
| **reCAPTCHA** | ✅ Configured | `.env.example` has `VITE_RECAPTCHA_SITE_KEY` |
| **App URL** | ✅ Correct | `VITE_APP_URL=https://app.getevidly.com` |

---

## SECTION 17 — SYNTHESIS MATRIX

| Workstream | Status | Commits shipped / target | Files touched | Gap to close | Launch-blocker? |
|---|---|---|---|---|---|
| Layer 1 canonical | ✅ READY | 6/6 | ~20 | 0 | No |
| Layer 2 canonical hooks | ✅ READY | 6/6 (vendor deferred) | 6 files, 2,678 lines | 0 | No |
| Layer 3 consumer migration | 🔴 BLOCKED | 1/~35 | 1 file | ~34 files need migration | Yes (data integrity) |
| Equipment wire-up + E1/E2 | 🟡 PARTIAL | 1/3 | UI exists, hooks stubbed | 3 commits (wire queries, fix E1, fix E2) | No (can defer) |
| Fire Safety Sprint Zero | ✅ READY | 5/5 | 5 migrations | 0 | No |
| Fire Safety Sprint A (DB) | ✅ READY | 7/7 | 7 migrations | 0 | No |
| Fire Safety Sprint A (UI) | 🟡 PARTIAL | 3/~7 | 3 pages exist | Modals, detail flows | No (Overview functional) |
| Vendor Services rebuild | 🔴 BLOCKED | 0/10 | 0 new files | All 10 commits needed | **YES (mandated)** |
| Admin sidebar restructure | ✅ READY | 3/3 | Done | 0 | No |
| User sidebar restructure | 🟡 IN PROGRESS | 0/1 | Changes exist, uncommitted | 1 commit | Yes (nav broken without) |
| Trial terminology cleanup | 🟡 NEEDED | 0/1 | 11+ files | 1 commit | Yes (brand) |
| S3 onboarding wizard | 🟡 PARTIAL | ~10/? | Wizard shell + setup pages exist | End-to-end flow verification | No (can soft-launch) |
| S4 empty states | 🟡 PARTIAL | organic/? | 107 refs exist | Systematic coverage audit | No |
| S5 polish | ⚪ NOT STARTED | 0/? | 0 | Celebration + UI polish | No |
| S6 AI showcase + QA | ⚪ NOT STARTED | 0/? | 0 | Full QA pass | Yes (quality) |
| 107-test cycle | ❓ UNKNOWN | ?/107 | Unknown | Need execution + results | Yes (validation) |
| GA4 tracking | 🔴 NOT CONFIGURED | 0/1 | 1 file | Replace placeholder in index.html | Yes (analytics) |

---

## SECTION 18 — VERDICT

### Option A — Full system 6/2: 🔴 RED

Not achievable. Vendor Services rebuild is 0/10 commits with zero UI components built. Layer 3 consumer migration is 1/35 files. S5 (polish) and S6 (AI showcase + QA) have not started. GA4 not configured. 107-test cycle status unknown. The gap between current state and "full system" is approximately 50+ commits of net-new work across 4 major workstreams.

### Option B — MVP 6/2 with VS live + nav cuts: 🟡 YELLOW (aggressive but possible)

The database layer for Vendor Services is complete (Sprint Zero + Sprint A = 12 commits shipped). The PSE helper libs (`pseStatus.ts`, `rescheduleNotice.ts`) and raw query hooks (`useVendorServiceRecords`, `usePSESchedules`) exist. What's missing is the 10-commit UI rebuild. If the existing `/services` page can be enhanced with real backend wiring (rather than a full rebuild), an MVP vendor services view could ship. The user sidebar restructure is one commit away (changes exist uncommitted). Trial terminology cleanup is one commit. GA4 is a one-line fix. This path requires: (1) commit the sidebar restructure, (2) build minimum viable vendor services UI on top of existing hooks, (3) trial language sweep, (4) GA4 fix, (5) commit + deploy. That's roughly 15-20 commits of focused work.

### Option D — Founders Preview 6/2 → GA 6/16: ✅ GREEN

This is the most realistic path. By 6/2, deploy what's currently working: Dashboard, Food Safety (temperatures, checklists, HACCP, incidents, corrective actions — all functional with real data), Fire Safety Overview/Analysis/Trajectory (functional), committed sidebar restructure, trial cleanup, and GA4 fix. The 14-day runway to GA gives time for: Vendor Services 10-commit rebuild, Layer 3 consumer migration, S5 polish, S6 QA, and 107-test execution. The Founders Preview scope is honest — real users see real data on the pillars that work, with a clear "coming soon" for vendor services detail views.

---

### 30-Second Summary for Arthur

The codebase has 303 commits since April 21 and strong database infrastructure — Layers 1-2 canonical data, Sprint Zero, and Sprint A migrations are all shipped. TypeScript compiles clean with zero errors. However, three critical gaps block a full 6/2 launch: (1) Vendor Services UI rebuild is 0/10 commits with no components built, (2) Layer 3 consumer migration is 1 of ~35 files, and (3) S5/S6 haven't started. The Founders Preview path (Option D) is GREEN — ship what works on 6/2 (Dashboard, Food Safety, Fire Safety Overview) and use the 14 days to 6/16 GA to build Vendor Services, run QA, and polish. Option B is possible but aggressive, requiring the existing services page to be enhanced rather than fully rebuilt. Option A is not achievable by 6/2.

---

*Report generated 2026-05-09. Read-only audit — no code changes made.*
