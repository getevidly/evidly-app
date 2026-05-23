# UI Sweep Report — EvidLY App

**Date:** 2026-04-21
**Scope:** Static code analysis of all authenticated pages, modals, and shared components
**User context:** verify9 (zero real data, non-demo org)
**Methodology:** Three parallel deep-read agents + codebase-wide grep sweeps
**Disposition:** DISCOVERY ONLY — no fixes applied

---

## Executive Summary

| Severity | Count |
|----------|-------|
| P0 — Security / Data Leak | 1 |
| P0 — Fake Data in Production | 6 |
| P1 — No Persistence (data lost on refresh) | 2 |
| P1 — Modal / Layout Bug | 1 (ALREADY FIXED) |
| P2 — Branding Bleed (HoodOps) | 15 files |
| P2 — Font Drift (DM Sans) | 10+ files |
| P3 — Hardcoded Locale / Jurisdiction | 8+ instances |
| P0 — Wrong Pricing Data | 1 |
| P3 — Minor UX | 7 |

---

## P0 — SECURITY

### 1. TempLogs — Cross-Org Data Leak
**File:** `src/pages/TempLogs.tsx:597-615`
**Issue:** `fetchHistory()` queries `temperature_logs` without `.eq('organization_id', ...)`. Returns up to 200 rows from ALL organizations.
**Evidence:**
```js
// Line 601-615
const { data, error } = await supabase
  .from('temperature_logs')
  .select(`id, equipment_id, temperature, temp_pass, ...`)
  .order('reading_time', { ascending: false })
  .limit(200);
// NO organization_id filter
```
**Note:** Other TempLogs queries (lines 548, 588) correctly filter by `organization_id`. Only `fetchHistory` is missing the filter.
**Mitigation:** RLS policies on `temperature_logs` may prevent leakage at the DB level. Verify RLS is enabled and has org-scoped policies. Regardless, add the `.eq()` filter for defense-in-depth.

---

## P0 — FAKE DATA IN PRODUCTION (Zero-Data Users See Fabricated Content)

### 2. WorkforceRisk — Demo Data Always Loaded, No Gate
**File:** `src/pages/WorkforceRisk.tsx:124-131`
**Issue:** `DEMO_WORKFORCE_SIGNALS` and `DEMO_EMPLOYEE_CERTS` are loaded unconditionally. The `isDemoMode` flag is imported (line 119) but never used to gate the data arrays.
```js
const signals = useMemo(
  () => filterByLocation(DEMO_WORKFORCE_SIGNALS, locationParam),
  [locationParam],
);
const certs = useMemo(
  () => filterByLocation(DEMO_EMPLOYEE_CERTS, locationParam),
  [locationParam],
);
```
**Impact:** Every user — demo and production — sees fabricated workforce risk signals and employee certifications.
**Fix:** `isDemoMode ? DEMO_WORKFORCE_SIGNALS : []` pattern.

### 3. CorrectiveActions — Zero Persistence, Fake Data for All
**File:** `src/pages/CorrectiveActions.tsx`
**Issue:** No Supabase queries exist anywhere in this file. Zero `.from()` calls. All state is local React state populated from `correctiveActionsDemoData.ts`. Data is lost on page refresh.
- `DEMO_LOCATIONS` at line 59-63 with fake location IDs shown to ALL users
- `KITCHEN_STAFF_NAME = 'Lisa Nguyen'` at line 66 — fake person name
- `DEMO_TEAM_MEMBERS` imported from constants (line 29) — fake team names used in assignment dropdown for ALL users
**Impact:** Production users create corrective actions that vanish on refresh. Fake names appear in dropdowns.

### 4. IncidentLog — Fake Team Members in Live Mode
**File:** `src/pages/IncidentLog.tsx:134-136, 706, 1730`
**Issue:** `TEAM_MEMBERS` array with fake names (`Sarah Chen`, `Maria Garcia`, `John Smith`, etc.) is used in production mode:
- Line 706: Randomly assigns created incidents to fake team members in live Supabase inserts
- Line 1730: Populates assignee dropdown with fake names for all users
```js
const TEAM_MEMBERS = [
  'Sarah Chen', 'Maria Garcia', 'John Smith', 'Emily Rogers', 'David Kim', 'Michael Torres',
];
// Line 706 (inside !isDemoMode block):
const assignee = TEAM_MEMBERS[Math.floor(Math.random() * TEAM_MEMBERS.length)];
```
**Impact:** Real incidents inserted into Supabase are assigned to fictional people.

### 5. AIChatPanel — Fake Location Names for All Users
**File:** `src/components/AIChatPanel.tsx:12-15`
**Issue:** `LOCATION_DISPLAY` maps location IDs to fake names ("Downtown Kitchen", "Airport Terminal", "University Dining") with NO `isDemoMode` gate. Used in AI conversation context for all users.
```js
const LOCATION_DISPLAY = { downtown: 'Downtown Kitchen', airport: 'Airport Terminal', university: 'University Dining' };
const loc1 = LOCATION_DISPLAY[demoLocations[0]?.urlId] ?? ...;
```
**Impact:** AI chat responses reference fake location names for production users.

### 6. BenchmarkWidget — Hardcoded "Fresno County" for All Users
**File:** `src/components/BenchmarkWidget.tsx:79`
**Issue:** Every user sees `"Restaurant — Fresno County, CA"` regardless of their actual jurisdiction/org.
```jsx
<p className="text-sm font-medium text-[#1E2D4D]/80">Restaurant — Fresno County, CA</p>
```
**Impact:** Misleading jurisdiction context for all non-Fresno-County organizations.

### 7. OwnerOperatorDashboard — Hardcoded Demo Locations in Dashboard Widgets
**File:** `src/components/dashboard/OwnerOperatorDashboard.tsx:162, 171`
**Issue:** `INSPECTION_READINESS_DEMO` and `BENCHMARK_DEMO` arrays hardcode `jurisdictionName: 'Fresno County'` and location names (`Downtown`) for all users.
**Impact:** Owner/operator dashboard shows fabricated inspection readiness and benchmark data.

---

## P0 — WRONG PRICING DATA

### 8. BillingPage — Standard Plan Pricing Incorrect
**File:** `src/pages/settings/BillingPage.tsx:8-27`
**Issue:** `PLAN_INFO` shows Standard plan at `$299/mo` + `$149/mo per additional location`. Per the pricing model (PRICING-UPDATE-01, 2026-03-30), Standard is `$199/mo` + `$99/loc`. Also missing `professional` tier entirely (`$349/mo` + `$175/loc`).
```js
standard: {
  name: 'Standard',
  price: '$299/mo',                                    // WRONG — should be $199/mo
  perLocation: '+ $149/mo per additional location',    // WRONG — should be $99/loc
},
// Missing: professional tier
```
**Impact:** Authenticated owner_operators and platform_admins see incorrect pricing on their billing page.

---

## P1 — NO PERSISTENCE

### 8. CorrectiveActions — No Supabase Backend
**File:** `src/pages/CorrectiveActions.tsx` (entire file)
**Status:** Already documented in item #3 above. All corrective action data lives in `useState` and is lost on refresh. Production users have no way to retain their work.

### 9. AuditTrail — Demo-Only, No Real Data Path
**File:** `src/pages/AuditTrail.tsx`
**Issue:** Entire page operates on module-level demo arrays (`LOCATIONS`, `USERS`, `EQUIPMENT`, `VENDOR_SERVICES`). No Supabase queries. "Demo Restaurant Group" appears in report header (line ~909). Non-demo users see demo data.
**Note:** This may be intentional as a demo-only feature. Verify intent.

---

## P1 — MODAL / LAYOUT (ALREADY FIXED)

### 10. Layout.tsx `isolate` — Containing Block for Fixed Modals
**File:** `src/components/layout/Layout.tsx:104`
**Status:** ALREADY FIXED — `isolate` class has been removed from the main content wrapper.
**Current state:** `<div className="lg:pl-60 flex flex-col flex-1 overflow-hidden">`
**Verification needed:** Confirm modals now position correctly in production after deploy.

---

## P1 — FK / QUERY (ALREADY FIXED)

### 11. Checklists FK — Two-Step Query
**File:** `src/pages/Checklists.tsx:808-841`
**Status:** ALREADY FIXED — Query now uses two-step approach:
1. Fetch completions without user join (lines 808-818)
2. Batch-fetch user names via `.in('id', userIds)` on `user_profiles` (lines 823-837)
3. Merge names into records (line 841+)

---

## P2 — BRANDING BLEED (HoodOps in EvidLY Codebase)

15 files still contain "HoodOps" references. These range from user-visible UI text to PDF exports:

| File | Context | User-Visible? |
|------|---------|---------------|
| `src/pages/CicPseView.tsx` | "Records appear automatically when HoodOps completes work" | Yes |
| `src/pages/settings/IntegrationsPage.tsx` | "Connect HoodOps with your favorite tools" | Yes |
| `src/pages/public/ReferralPage.tsx` | "Why Choose HoodOps?" | Yes (public) |
| `src/pages/equipment/QRScanLandingPage.tsx` | "Powered by HoodOps" | Yes (public) |
| `src/components/equipment/QRCodePrintModal.tsx` | "Powered by HoodOps" | Yes (printed) |
| `src/components/equipment/BulkQRPrintModal.tsx` | "Bulk QR Codes - HoodOps" | Yes (printed) |
| `src/components/equipment/EquipmentServiceHistory.tsx` | "View Certificate (from HoodOps)" | Yes |
| `src/components/services/ServiceComplianceList.jsx` | "connect your HoodOps account" | Yes |
| `src/components/dashboard/VendorServiceWidgets.tsx` | "Records appear automatically when HoodOps completes work" | Yes |
| `src/components/reports/HoodOpsReportCard.tsx` | Component name + content | Yes |
| `src/utils/reportExport.ts` | PDF headers/footers | Yes (exported) |
| `src/config/sidebarConfig.ts` | Sidebar item labels | Yes |
| `src/constants/serviceTypes.ts` | Service type constants | Indirect |
| `src/pages/admin/FeatureBaselineTracker.jsx` | Admin tracker | Admin only |
| `src/pages/admin/DemoDashboard.tsx` | Demo dashboard | Admin only |

---

## P2 — FONT DRIFT (DM Sans Instead of Montserrat/Inter)

The design system specifies Montserrat for headings and Inter/system-ui for body. Multiple files still use `'DM Sans'`:

| File | Line(s) |
|------|---------|
| `src/pages/WorkforceRisk.tsx` | 24 |
| `src/pages/WeeklyDigest.tsx` | 93, 182 |
| `src/pages/ComplianceIntelligence.tsx` | 112 |
| `src/pages/CertificateViewer.tsx` | 91, 153, 157, 161, 180, 182, 215, 218, 228, 257, 262, 271 |
| `src/pages/VendorMigration.jsx` | 96 |
| `src/pages/VendorMarketplace.tsx` | 734 |
| `src/pages/Calendar.tsx` | 905 |
| `src/components/SensorMonitorWidget.tsx` | 140, 193 |
| `src/components/ambassador/StandingCardModal.tsx` | 136, 146 |
| `src/components/ambassador/StandingCard.tsx` | 39 |
| `src/components/ambassador/MilestoneCelebrationModal.tsx` | 68 |
| `src/components/social-proof/TestimonialCollectionModal.tsx` | 116, 160 |
| `src/components/social-proof/InspectionBadgeModal.tsx` | 136, 146 |
| `src/components/social-proof/InspectionBadge.tsx` | 37 |

---

## P3 — HARDCODED LOCALE / JURISDICTION

"Fresno County" appears in 8+ locations beyond BenchmarkWidget:

| File | Line | Context |
|------|------|---------|
| `src/components/BenchmarkWidget.tsx` | 79 | "Restaurant — Fresno County, CA" |
| `src/components/benchmarks/BenchmarkOverallRanking.tsx` | 37 | GEO_BENCHMARKS lookup for 'Fresno County' |
| `src/components/dashboard/OwnerOperatorDashboard.tsx` | 162, 171 | Demo data arrays |
| `src/components/dashboard/IntelligenceFeedWidget.tsx` | 95, 106 | Feed items |
| `src/components/intelligence/ScenarioEngine.tsx` | 205 | Placeholder text |
| `src/types/jurisdiction.ts` | 9, 12, 16 | Comments (non-blocking) |

---

## P3 — MINOR UX ISSUES

### 12. HACCP — Hardcoded Demo Location IDs in Live Mode
**File:** `src/pages/HACCP.tsx:292`
**Issue:** `LOCATION_ID_MAP` hardcodes `downtown: '1'`, `airport: '2'`, `university: '3'`. Used in live mode for location filtering. Production orgs with different location IDs will see no matching data.

### 13. Documents — Module-Level Fake Data Array
**File:** `src/pages/Documents.tsx:65-107`
**Issue:** `SAMPLE_DOCUMENTS` with 30 hardcoded docs and fake names (Mike Johnson, Sarah Chen, Emma Davis) defined at module scope. Gated in `useEffect` at line 302, so production users don't see it. But the array bloats the bundle. Minor.

### 14. WorkforceRisk — Stale Font Variable
**File:** `src/pages/WorkforceRisk.tsx:24`
**Issue:** `const F: React.CSSProperties = { fontFamily: "'Inter', 'DM Sans', sans-serif" };` — defined but may not be applied consistently. DM Sans is not the design system font.

### 15. IoTSensorPlatform — Pre-Filled Cost Calculator
**File:** `src/pages/IoTSensorPlatform.tsx` (from plan)
**Issue:** Cost of Manual calculator defaults to `units=9`, `checksPerDay=6`, `minsPerCheck=2`, showing pre-filled $6,570 savings to all users.
**Status:** Flagged in plan but not yet verified if fixed.

### 16. Calendar — LOCATIONS Array Not Gated on isDemoMode
**File:** `src/pages/Calendar.tsx:44`
**Issue:** `const LOCATIONS = ['Location 1', 'Location 2', 'Location 3']; // demo` is at module scope with NO isDemoMode gate. Used in event creation form (`location: 'Location 1'` default at line 296). Live users see these demo location names in the event form dropdown.

### 17. SensorHub — Demo Data Leaks Outside isDemoMode Gate
**File:** `src/pages/SensorHub.tsx:68-78, 157-182`
**Issue:** Two ungated constants:
- `EQUIPMENT_OPTIONS` (lines 68-78): Hardcoded equipment list (`Walk-in Cooler #1`, etc.) shown to all users
- `METHODS` array (lines 157-182): References `iotIngestionLog` from demoData outside any isDemoMode gate

### 18. VendorDocumentReview — Wrong Navy Color
**File:** `src/pages/VendorDocumentReview.jsx:15`
**Issue:** `NAVY = '#163a5f'` instead of design system `#1E2D4D`.

### 19. CorrectiveActions — LOCATIONS Array Not Generic Enough
**File:** `src/pages/CorrectiveActions.tsx:59-63`
**Issue:** `DEMO_LOCATIONS` uses IDs like `downtown`, `airport`, `university` — these leak through to production users' location dropdowns even though names are "Location 1/2/3".

---

## PREVIOUSLY FIXED ITEMS (Verified)

| Item | File | Status |
|------|------|--------|
| Layout.tsx `isolate` class | `src/components/layout/Layout.tsx:104` | FIXED — removed |
| Checklists FK join | `src/pages/Checklists.tsx:808-841` | FIXED — two-step query |
| Settings HoodOps placeholders | `src/pages/settings/CompanyProfilePage.tsx` | FIXED — generic text |
| CSS keyframe transforms | `src/index.css:115-122, 406-417` | FIXED — opacity only |
| Deficiencies demo gate | `src/pages/Deficiencies.tsx:64` | FIXED — `isDemoMode` gate |

---

## PLAYWRIGHT SCRIPT

A comprehensive Playwright test is ready at `e2e/ui-sweep.spec.ts` covering:
- 65+ routes at 3 viewports (Desktop 1440px, Tablet 768px, Mobile 375px)
- Console error capture
- Network failure detection
- Fake data string matching in rendered DOM
- Modal open/positioning verification
- Screenshot capture per page

Run: `npx playwright test e2e/ui-sweep.spec.ts`
Output: `test-results/ui-sweep-report.md`

---

## RECOMMENDED FIX ORDER

1. **P0-SECURITY:** TempLogs `fetchHistory` org filter (line 601) — add `.eq('organization_id', profile?.organization_id)` + verify RLS
2. **P0-PRICING:** BillingPage Standard plan: $299→$199, $149/loc→$99/loc, add Professional tier
3. **P0-FAKE:** WorkforceRisk isDemoMode gate (lines 124-131)
4. **P0-FAKE:** CorrectiveActions — add Supabase persistence + isDemoMode gate
5. **P0-FAKE:** IncidentLog — replace `TEAM_MEMBERS` with real org users in live mode (lines 134-136, 706, 1730)
6. **P0-FAKE:** AIChatPanel — gate `LOCATION_DISPLAY` on isDemoMode (line 12)
7. **P0-FAKE:** BenchmarkWidget — use org's actual jurisdiction (line 79)
8. **P0-FAKE:** OwnerOperatorDashboard — gate demo arrays on isDemoMode
9. **P2-BRAND:** HoodOps sweep (15 files)
10. **P2-FONT:** DM Sans → Montserrat/Inter (10+ files)
11. **P3:** Calendar LOCATIONS gate, SensorHub demo leak, HACCP location IDs, Fresno County hardcoding, VendorDocumentReview navy color
