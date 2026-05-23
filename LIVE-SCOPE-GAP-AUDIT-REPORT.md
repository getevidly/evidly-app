# LIVE-SCOPE-GAP-AUDIT-REPORT

**Auditor:** Claude Opus 4.6
**Date:** 2026-05-09
**Mode:** Read-only — no mutations
**Supabase ref:** `irxgmhxhmxtzfwuieblc`

---

## Step 1 — Routes + Page Files for 31 LIVE Items

**STATUS:** ✅ All 31 routes present

### Evidence

All routes confirmed in `src/App.tsx`:

| # | LIVE Item | Route | Line | Status |
|---|-----------|-------|------|--------|
| 1 | Dashboard | `/dashboard` | 625 | ✅ |
| 2 | Compliance Overview | `/compliance-overview` | 698 | ✅ |
| 3 | Tasks | `/tasks` | 823 | ✅ |
| 4 | Calendar | `/calendar` | 669 | ✅ |
| 5 | Documents | `/documents` | 637 | ✅ |
| 6 | Kitchen to Community | `/kitchen-to-community` | 566 | ✅ |
| 7 | Food Safety Overview | `/food-safety/overview` | 627 | ✅ |
| 8 | Temperatures | `/temp-logs` | 633 | ✅ |
| 9 | Checklists | `/checklists` | 635 | ✅ |
| 10 | HACCP | `/haccp` | 646 | ✅ |
| 11 | Incidents | `/incidents` | 648 | ✅ |
| 12 | Corrective Actions | `/corrective-actions` | 825 | ✅ |
| 13 | Self-Inspection | `/self-inspection` | 736 | ✅ |
| 14 | Fire Safety Overview | `/fire-safety/overview` | 676 | ✅ |
| 15 | Fire Safety Calendar | `/calendar` (shared) | 669 | ✅ |
| 16 | Fire Safety Incidents | `/incidents` (shared) | 648 | ✅ |
| 17 | Fire Safety Corrective Actions | `/corrective-actions` (shared) | 825 | ✅ |
| 18 | Fire Safety Deficiencies | `/deficiencies` | 828 | ✅ |
| 19 | Jurisdiction Intelligence | `/jurisdiction-intelligence` | 691 | ✅ |
| 20 | Regulatory Updates | `/regulatory-alerts` | 689 | ✅ |
| 21 | Jurisdiction Signals | `/insights/signals` | 819 | ✅ |
| 22 | Vendor Network | `/vendors` | 639 | ✅ |
| 23 | Vendor Services | `/services` | 733 | ✅ |
| 24 | Equipment | `/equipment` | 686 | ✅ |
| 25 | Locations | `/org-hierarchy` | 696 | ✅ |
| 26 | Team | `/team` | 654 | ✅ |
| 27 | Role Permissions | `/settings/roles-permissions` | 667 | ✅ |
| 28 | IoT Sensors | `/settings/sensors` | 666 | ✅ |
| 29 | Integrations | `/integrations` | 712 | ✅ |
| 30 | Import Data | `/import` | 668 | ✅ |
| 31 | Settings | `/settings` | 657 | ✅ |

### Gaps

None — all 31 routes exist. Fire Safety items 15–17 share routes with Food Safety counterparts; pillar filtering is a Step 3 issue.

---

## Step 2 — Stubbed Hooks for LIVE Surfaces

**STATUS:** 🟡 3 stubbed hooks beyond plan coverage affect LIVE pages

### Evidence — All Stubbed Hooks Found

| Hook File | Stub Marker | Consumers (LIVE scope) | Plan Covers? |
|-----------|-------------|----------------------|--------------|
| `useDeficiencies.ts` | 3× TODO: Replace with Supabase | Deficiencies page | ✅ Yes |
| `useEquipment.ts` | "stubbed with empty data", 6× TODO | Equipment pages + components | ✅ Yes |
| `useSettings.ts` | "stubbed with empty data", 7× TODO | TeamRolesPage, IntegrationsPage, ServiceTypesPage, CompanyProfilePage, BillingPage | ✅ Yes |
| `useServiceRecords.ts` | 3× TODO: Replace with Supabase | Vendor Services page (ServicesPage.tsx) | ❓ Unclear |
| `useIncidents.ts` | "stubbed with empty data" | EquipmentIncidentsPage, safety incident pages | ❓ Unclear |
| `useReports.ts` | "stubbed with empty data", 3× TODO | ReportsPage, ReportGeneratorPage | ⛔ Not LIVE |
| `useSchedule.ts` | "stubbed with empty data", 5× TODO | SchedulePage + schedule components | ⛔ Not LIVE |
| `useBonuses.ts` | "stubbed with empty data" | BonusDashboard, Performance pages | ⛔ Not LIVE |
| `useInventory.ts` | "stubbed with empty data" | Inventory pages | ⛔ Not LIVE |

### Gaps

**GAP-1** — `useServiceRecords.ts` is stubbed. Vendor Services (`/services`, ServicesPage.tsx) is LIVE scope. If this page depends on useServiceRecords, it will render empty. Plan must explicitly wire this hook to `vendor_service_records` table. — **Day: Sun May 11 or Mon May 12** — **2h**

**GAP-2** — `useIncidents.ts` is stubbed. The `/incidents` route (IncidentLog.tsx) is LIVE scope. If IncidentLog uses a different data path (direct Supabase query) it may be fine, but EquipmentIncidentsPage and safety incident pages consume this stubbed hook. Confirm whether the LIVE incidents path is affected. — **Day: Sun May 11** — **1h investigation**

---

## Step 3 — Pillar `?pillar=` Support on 5 Shared Components

**STATUS:** 🔴 0 of 5 shared components support `?pillar=` filtering

### Evidence

| Component | useSearchParams? | Reads `pillar`? | Params Actually Read | Verdict |
|-----------|-----------------|-----------------|---------------------|---------|
| Calendar.tsx | ✅ Yes | ❌ No | `category` | DOES NOT SUPPORT |
| IncidentLog.tsx | ❌ No | ❌ No | (none) | DOES NOT SUPPORT |
| CorrectiveActions.tsx | ✅ Yes | ❌ No | `location`, `from` | DOES NOT SUPPORT |
| Deficiencies.tsx | ✅ Yes | ❌ No | `status`, `severity`, `q`, `sort` | DOES NOT SUPPORT |
| SelfAudit.tsx | ✅ Yes | ❌ No | `location` | DOES NOT SUPPORT |

### Sidebar Config Wiring (Already Done)

The sidebar already passes pillar params for 3 of 5 Fire Safety sub-items:

- `fr-calendar` → `/calendar` (NO pillar param — sidebar bug)
- `fr-incidents` → `/incidents?pillar=fire` ✅ (but page ignores it)
- `fr-corrective` → `/corrective-actions?pillar=fire` ✅ (but page ignores it)
- `fr-deficiencies` → `/deficiencies?pillar=fire` ✅ (but page ignores it)

### Gaps

**GAP-3** — All 5 shared pages need `?pillar=` wiring to filter data by compliance pillar. Currently, navigating from Fire Safety sidebar shows ALL incidents/CAs/deficiencies (food + fire), not just fire. This is a launch blocker for Fire Safety UX. — **Day: must be sized into pillar wiring task** — **4h total (IncidentLog needs searchParams added from scratch; others need pillar filter added to existing param reads)**

**GAP-4** — Sidebar config `fr-calendar` links to `/calendar` without `?pillar=fire` param. Should be `/calendar?pillar=fire` for consistency. — **Day: sidebar restructure task** — **0.5h**

---

## Step 4 — Schema for LIVE Features

**STATUS:** 🟡 All 10 tables exist with RLS. 1 column-level gap on legacy `documents` table.

### Evidence (from migration file audit — no Supabase MCP available)

| # | Table | Migration File | Exists | RLS | Notes |
|---|-------|---------------|--------|-----|-------|
| 1 | `service_type_definitions` | `20260801000000` | ✅ | ✅ | 7 seed rows: KEC, FPM, GFX, RGC, FS, FA, SP ✅ |
| 2 | `vendor_service_records` | `20260802000000` | ✅ | ✅ | org-scoped, webhook idempotency, reconciliation |
| 3 | `location_service_schedules` | `20260803000000` | ✅ | ✅ | UNIQUE(org, location, service_type_code) |
| 4 | `service_reschedule_requests` | `20260803000000` | ✅ | ✅ | 1-3 preferred dates, reconciliation status |
| 5 | `platform_audit_log` | `20260804000000` | ✅ | ✅ | service_role only (no authenticated read policy yet) |
| 6 | `vendor_contact_log` | `20260206000001` | ✅ | ✅ | email/sms/phone tracking |
| 7 | `compliance_documents` | `20260807000000` | ✅ | ✅ | Archive-only (no DELETE), parent_id versioning |
| 8 | `documents` (legacy) | `20260205003451` | ✅ | ✅ | **Missing `vendor_id`** — see GAP-5 |
| 9 | `equipment` | `20260222000000` | ✅ | ✅ | Extended with lifecycle cols in `20260222100000` |
| 10 | `deficiencies` | `20260516000000` | ✅ | ✅ | severity/status/timeline, ai_detected flag |

### Gaps

**GAP-5** — Legacy `documents` table does NOT have a `vendor_id` column. The newer `compliance_documents` table DOES have `vendor_id`. If any LIVE-scope page (Documents at `/documents`) needs to filter documents by vendor, it must query `compliance_documents` or join through another path. Confirm which table the Documents page reads from and whether vendor filtering is needed for 6/2 launch. — **Day: investigation needed** — **1h**

**GAP-6** — `platform_audit_log` has NO authenticated read policies. Only service_role can access it. If any LIVE admin page needs to display audit logs (Settings, Admin), a SELECT policy for platform_admin role must be added. — **Day: when admin audit UI is built** — **1h**

---

## Step 5 — Foundation Commits on `origin/main` + Working Tree

**STATUS:** ✅ All 18 SHAs present. Working tree confirms uncommitted sidebar restructure.

### Evidence — All 18 Foundation SHAs on `origin/main`

```
4a92a7c feat(db): create document send + recipient + notification preference tables
1cde18f feat(db): create compliance_documents foundational schema
7a6d62b chore(admin): remove DocumentVault.tsx after EvidLY Vault rename
de914e3 feat(fire): add PSE status + reschedule notice helpers
16ba61f feat(admin): restructure admin sidebar IA per ADMIN-SIDEBAR-RESTRUCTURE-001
6a632d6 chore(config): add @/ alias resolution for canonical query layer
0c1c446 feat(db): create platform_audit_log and service_action_log
b42bd2f chore(verify): smoke-test Sprint Zero schema and harden hoodops-webhook audit logging
d164b8e feat(db): create location_service_schedules and service_reschedule_requests
3f3f719 feat(db): create vendor_service_records and align HoodOps webhook
0341ec4 feat(db): add service_type_definitions and seed 7 service codes
4eded36 chore(db): remove dead vendor service workflow code
5bc93bd CANONICAL-LAYER-01-1F: replace stale hardcoded NOW dates with live new Date()
2e5716c CANONICAL-LAYER-01-1E: add canonical kitchen-local time helpers
eaecde1 CANONICAL-LAYER-01-1D: extract OPEN/CLOSED incident status canonical constants
ebe0270 CANONICAL-LAYER-01-1C: extract OPEN/CLOSED corrective action status canonical constants
dd38e98 CANONICAL-LAYER-01-1B: sweep pillar literals to fire_safety across consumers
0d8db02 CANONICAL-LAYER-01-1A: align pillar type unions with PROD schema
```

**18/18 present** ✅

### Working Tree Status

Modified (staged/unstaged):
- `src/config/sidebarConfig.ts` ✅ (expected — sidebar restructure)
- `src/components/layout/Sidebar.tsx` ✅ (expected — sidebar restructure)
- `src/App.tsx` (additional route changes)
- `src/components/layout/AutoBreadcrumb.tsx` (breadcrumb updates)
- `src/components/layout/QuickActionsBar.tsx` (quick actions updates)
- `src/data/defaultPermissions.ts` (permissions updates)
- `package.json`, `package-lock.json` (dependency changes)

Working tree is NOT clean — confirms sidebar restructure is uncommitted as expected.

### Gaps

None.

---

## SYNTHESIS

### 🔴 Launch Blockers (1)

1. **GAP-3** — Pillar filtering broken on all 5 shared components (Calendar, IncidentLog, CorrectiveActions, Deficiencies, SelfAudit). Fire Safety sidebar links pass `?pillar=fire` but pages ignore it entirely. Fire Safety users see all-pillar data with no filtering. **Must be fixed before 6/2.**

### 🟡 Plan Adjustments (5)

1. **GAP-1** — `useServiceRecords.ts` stubbed; Vendor Services (`/services`) is LIVE scope. Wire hook to `vendor_service_records` table. (2h)
2. **GAP-2** — `useIncidents.ts` stubbed; verify whether LIVE `/incidents` path (IncidentLog.tsx) is affected or uses a different data layer. (1h)
3. **GAP-4** — Sidebar `fr-calendar` missing `?pillar=fire` param in path. (0.5h)
4. **GAP-5** — Legacy `documents` table missing `vendor_id`. Confirm whether LIVE Documents page needs vendor filtering via `compliance_documents`. (1h)
5. **GAP-6** — `platform_audit_log` has no authenticated read policy. Add when admin audit UI is built. (1h)

### ⚪ Confirmations the Plan Got Right

- All 31 LIVE routes exist with lazy-loaded page components
- All 18 foundation commits landed on `origin/main`
- All 10 required schema tables exist with RLS enabled
- `service_type_definitions` has correct 7 seed rows (KEC/FPM/GFX/RGC/FS/FA/SP)
- `useDeficiencies`, `useEquipment`, `useSettings` stubs are covered by plan
- Sidebar restructure is in progress (uncommitted) as expected
- `compliance_documents` has full lifecycle schema with archive-only deletion
- `deficiencies` table has severity/status/timeline with ai_detected support
- Non-LIVE hooks (useBonuses, useSchedule, useInventory, useReports) correctly excluded from launch scope

---

## Executive Summary

All 31 LIVE-scope routes and 10 required database tables are in place. The 18 foundation commits are confirmed on `origin/main`. The single launch blocker is pillar filtering: all 5 shared components (Calendar, IncidentLog, CorrectiveActions, Deficiencies, SelfAudit) ignore the `?pillar=` query parameter, meaning Fire Safety sidebar links render unfiltered cross-pillar data. Five plan adjustments are needed: wire `useServiceRecords` for the LIVE Vendor Services page, verify the incidents data path, fix the `fr-calendar` sidebar link, confirm vendor-filtered document requirements on the legacy table, and plan an authenticated read policy for `platform_audit_log`. Total additional effort across all gaps: ~9.5 hours. The plan's existing coverage of `useDeficiencies`, `useEquipment`, `useSettings`, and the sidebar restructure is confirmed correct.
