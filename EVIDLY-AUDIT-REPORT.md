# EVIDLY APP — FULL AUDIT REPORT

**Date:** 2026-02-28
**Branch:** `main` (commit `07a0e84`)
**Scope:** Production + Demo — Report Only (no fixes applied)

---

## 1. BUILD HEALTH

| Check | Result | Details |
|-------|--------|---------|
| **Vite Build** | **PASS** | Completed in 37.66s, 269 precache entries (7168.46 KiB) |
| **TypeScript** | **PASS** | 0 errors (`tsc --noEmit` clean) |
| **ESLint** | **FAIL** | 1,132 errors + 72 warnings (1,204 total) |

### Build Warnings (3)

| # | Warning | File |
|---|---------|------|
| 1 | Duplicate key `"Grease Trap"` in object literal | `src/config/vendorCategories.ts:114` |
| 2 | Mixed dynamic/static import of `supabase.ts` (4 dynamic, 50+ static) — no chunk benefit | `src/lib/supabase.ts` |
| 3 | Chunk size **940.59 kB** (gzip 263 kB) exceeds 500 kB limit | `dist/assets/index-DdK3iAv8.js` |

### ESLint Breakdown

| Count | Severity | Rule | Impact |
|-------|----------|------|--------|
| 535 | error | `@typescript-eslint/no-explicit-any` | Code quality |
| 489 | error | `@typescript-eslint/no-unused-vars` | Dead code |
| 75 | error | `react-hooks/rules-of-hooks` | **RUNTIME RISK** |
| 53 | warning | `react-hooks/exhaustive-deps` | Stale closure risk |
| 19 | warning | `react-refresh/only-export-components` | HMR issue |
| 14 | error | `no-empty` | Empty catch/if blocks |
| 8 | error | `prefer-const` | Style |
| 6 | error | `no-case-declarations` | Scoping |
| 3 | error | `@typescript-eslint/no-unused-expressions` | Dead code |
| 2 | error | `no-useless-escape` | Style |

> **75 `react-hooks/rules-of-hooks` errors are the most critical.** These indicate hooks called conditionally or inside non-component/non-hook functions and can cause runtime crashes.

---

## 2. ROUTE INVENTORY

**Total registered routes:** 103 (plus 13 alias redirects)
**Total page files:** 121 `.tsx` in `src/pages/`
**Broken routes:** 0
**Lazy import issues:** 0

### Orphan Pages (5 — no route points to them)

| File | Reason |
|------|--------|
| `src/pages/Help.tsx` | Superseded by `HelpSupport.tsx` (route goes to HelpSupport) |
| `src/pages/ComingSoon.tsx` | Shared UI component, not a routable page |
| `src/pages/FacilitiesDashboard.tsx` | Superseded by `FacilitiesDashboardNew` component |
| `src/pages/KitchenDashboard.tsx` | Dashboard variant, unused in routing |
| `src/pages/admin/IntelligenceAdmin.tsx` | Superseded by CommandCenter at `/admin/intelligence` |

### Complete Route List (103 routes)

<details>
<summary>Click to expand full route table</summary>

| # | Route | Component | Status |
|---|-------|-----------|--------|
| 1 | `/` | LandingPage (inline) | OK |
| 2 | `/verify/:code` | PublicVerification.tsx | OK |
| 3 | `/ref/:code` | ReferralRedirect.tsx | OK |
| 4 | `/risk/:shareToken` | InsuranceRiskShared.tsx | OK |
| 5 | `/passport/demo` | PassportDemo.tsx | OK |
| 6 | `/passport/:id` | Passport.tsx | OK |
| 7 | `/partners/insurance` | CarrierPartnership.tsx | OK |
| 8 | `/providers` | MarketplaceLanding.tsx | OK |
| 9 | `/enterprise` | EnterpriseLanding.tsx | OK |
| 10 | `/iot` | IoTSensorLanding.tsx | OK |
| 11 | `/terms` | TermsOfService.tsx | OK |
| 12 | `/privacy` | PrivacyPolicy.tsx | OK |
| 13 | `/compliance/california` | CaliforniaCompliance.tsx | OK |
| 14 | `/compliance/california/:countySlug` | CountyCompliance.tsx | OK |
| 15 | `/assessment` | AssessmentTool.tsx | OK |
| 16 | `/checkup` | KitchenCheckup.tsx | OK |
| 17 | `/kitchen-to-community` | KitchenToCommunity.tsx | OK |
| 18 | `/temp/log` | TempLogQuick.tsx | OK |
| 19 | `/temp-logs/scan` | TempLogScan.tsx | OK |
| 20 | `/login` | Login.tsx | OK |
| 21 | `/signup` | Signup.tsx | OK |
| 22 | `/signup/locations` | SignupLocations.tsx | OK |
| 23 | `/invite/:token` | InviteAccept.tsx | OK |
| 24 | `/forgot-password` | ForgotPassword.tsx | OK |
| 25 | `/reset-password` | ResetPassword.tsx | OK |
| 26 | `/email-confirmed` | EmailConfirmed.tsx | OK |
| 27 | `/demo` | DemoWizard.tsx | OK |
| 28 | `/auth/callback` | AuthCallback.tsx | OK |
| 29 | `/vendor/login` | VendorLogin.tsx | OK |
| 30 | `/vendor/register` | VendorRegister.tsx | OK |
| 31 | `/vendor/upload/:token` | VendorSecureUpload.tsx | OK |
| 32 | `/vendor/dashboard` | VendorDashboard.tsx | OK |
| 33 | `/enterprise/admin` | EnterpriseDashboard.tsx | OK |
| 34 | `/enterprise/dashboard` | EnterpriseExecutive.tsx | OK |
| 35 | `/enterprise/intelligence` | ComplianceIntelligence.tsx | OK |
| 36 | `/business-intelligence` | CorporateIntelligence.tsx | OK |
| 37 | `/iot/hub` | IoTSensorHub.tsx | OK |
| 38 | `/onboarding` | Onboarding.tsx | OK |
| 39 | `/dashboard` | Dashboard.tsx | OK |
| 40 | `/temp-logs` | TempLogs.tsx | OK |
| 41 | `/iot-monitoring` | IoTMonitoring.tsx | OK |
| 42 | `/checklists` | Checklists.tsx | OK |
| 43 | `/documents` | Documents.tsx | OK |
| 44 | `/document-checklist` | DocumentChecklist.tsx | OK |
| 45 | `/vendors` | Vendors.tsx | OK |
| 46 | `/vendors/:vendorId` | VendorDetail.tsx | OK |
| 47 | `/marketplace` | VendorMarketplace.tsx | OK |
| 48 | `/marketplace/:vendorSlug` | VendorProfile.tsx | OK |
| 49 | `/haccp` | HACCP.tsx | OK |
| 50 | `/alerts` | Alerts.tsx | OK |
| 51 | `/incidents` | IncidentLog.tsx | OK |
| 52 | `/ai-advisor` | AIAdvisor.tsx | OK |
| 53 | `/leaderboard` | Leaderboard.tsx | OK |
| 54 | `/referrals` | ReferralDashboard.tsx | OK |
| 55 | `/analysis` | Analysis.tsx | OK |
| 56 | `/team` | Team.tsx | OK |
| 57 | `/reports` | ReportCenter.tsx | OK |
| 58 | `/reports/:reportType` | ReportDetail.tsx | OK |
| 59 | `/settings` | Settings.tsx | OK |
| 60 | `/settings/branding` | BrandingSettings.tsx | OK |
| 61 | `/settings/sensors` | IoTSensorHub.tsx | OK |
| 62 | `/settings/roles-permissions` | RolesPermissions.tsx | OK |
| 63 | `/import` | ImportData.tsx | OK |
| 64 | `/calendar` | Calendar.tsx | OK |
| 65 | `/help` | HelpSupport.tsx | OK |
| 66 | `/weekly-digest` | WeeklyDigest.tsx | OK |
| 67 | `/audit-report` | AuditReport.tsx | OK |
| 68 | `/facility-safety` | FacilitySafety.tsx | OK |
| 69 | `/equipment` | Equipment.tsx | OK |
| 70 | `/equipment/:equipmentId` | EquipmentDetail.tsx | OK |
| 71 | `/equipment/:equipmentId/service/new` | ServiceRecordEntry.tsx | OK |
| 72 | `/regulatory-alerts` | RegulatoryAlerts.tsx | OK |
| 73 | `/jurisdiction` | JurisdictionSettings.tsx | OK |
| 74 | `/health-dept-report` | HealthDeptReport.tsx | OK |
| 75 | `/scoring-breakdown` | ScoringBreakdown.tsx | OK |
| 76 | `/benchmarks` | Benchmarks.tsx | OK |
| 77 | `/org-hierarchy` | OrgHierarchy.tsx | OK |
| 78 | `/compliance-index` | ComplianceIndex.tsx | OK |
| 79 | `/insurance-risk` | InsuranceRisk.tsx | OK |
| 80 | `/improve-score` | ImproveScore.tsx | OK |
| 81 | `/insurance-settings` | InsuranceSettings.tsx | OK |
| 82 | `/admin/onboard-client` | AdminClientOnboarding.tsx | OK |
| 83 | `/admin/usage-analytics` | UsageAnalytics.tsx | OK |
| 84 | `/iot-platform` | IoTSensorPlatform.tsx | OK |
| 85 | `/sensors` | SensorHub.tsx | OK |
| 86 | `/sensors/add` | SensorSetupWizard.tsx | OK |
| 87 | `/sensors/:id` | SensorDetail.tsx | OK |
| 88 | `/integrations` | IntegrationHub.tsx | OK |
| 89 | `/settings/integrations` | IntegrationHub.tsx | OK |
| 90 | `/settings/api-keys` | IntegrationHub.tsx | OK |
| 91 | `/settings/webhooks` | IntegrationHub.tsx | OK |
| 92 | `/developers` | DeveloperPortal.tsx | OK |
| 93 | `/training` | TrainingHub.tsx | OK |
| 94 | `/training/course/:id` | TrainingCourse.tsx | OK |
| 95 | `/training/courses/builder` | CourseBuilder.tsx | OK |
| 96 | `/training/certificates` | CertificateViewer.tsx | OK |
| 97 | `/training/employee/:userId` | EmployeeCertDetail.tsx | OK |
| 98 | `/dashboard/training` | TrainingRecords.tsx | OK |
| 99 | `/dashboard/training/:employeeId` | EmployeeTrainingProfile.tsx | OK |
| 100 | `/dashboard/training-catalog` | TrainingCatalog.tsx | OK |
| 101 | `/playbooks` | IncidentPlaybooks.tsx | OK |
| 102 | `/playbooks/active/:id` | PlaybookRunner.tsx | OK |
| 103 | `/playbooks/builder` | PlaybookBuilder.tsx | OK |

</details>

---

## 3. DEMO MODE STATUS

**Overall: WORKING**

### isDemoMode Logic (src/contexts/DemoContext.tsx:81)

```typescript
const isDemoMode = rawDemoMode && !isAuthenticated && !authLoading && !hasStoredAuthToken();
```

**Three-layer protection:**
1. Synchronous localStorage check for Supabase auth token (blocks before async)
2. Active session check (`!isAuthenticated`)
3. Auth loading guard (`!authLoading`)

| Check | Result |
|-------|--------|
| Returns `false` for authenticated users | YES |
| Returns `true` ONLY on /demo routes | YES |
| Demo wizard 7-step flow complete | YES |
| All demo pages navigable | YES |
| Demo data loaded (3 locations) | YES |
| DemoUpgradePrompt on blocked actions | YES |

### Supabase Write Proxy (src/lib/supabaseGuard.ts)

- **Blocks:** `.insert()`, `.update()`, `.upsert()`, `.delete()`, `.rpc()`, storage ops
- **Allow-listed:** `demo_leads`, `assessment_leads`, `assessment_responses`, `assessment_results`
- **Blocked response:** No-op thenable `{ data: null, error: null, status: 200, statusText: 'demo-blocked' }`

### useDemoGuard Coverage

**51+ pages** use the `useDemoGuard` hook to gate write actions in demo mode.

---

## 4. HARDCODED DATA LEAKS

**Status: CLEAN**

All hardcoded demo names (locations, people, vendors) are properly containerized in:
- `src/data/demoData.ts`
- `src/data/vendorData.ts`
- `src/data/trainingRecordsDemoData.ts`
- Other `src/data/*` files

No fake names, locations, or vendor names found in production-path code outside `src/data/` files.

---

## 5. AUTH & SESSION ISSUES

### SignOut Call Sites (8 total)

| File | Line | Trigger |
|------|------|---------|
| `src/contexts/AuthContext.tsx` | 213 | Core `signOut()` function definition |
| `src/contexts/InactivityContext.tsx` | 46 | Auto-logout after 3 hours |
| `src/contexts/InactivityContext.tsx` | 85 | User switch on lock screen |
| `src/components/layout/TopBar.tsx` | 107 | "Sign Out" button click |
| `src/components/layout/Sidebar.tsx` | 353 | "Logout" button click |
| `src/components/layout/MobileTabBar.tsx` | 124 | Mobile menu logout |
| `src/pages/ResetPassword.tsx` | 78 | Password reset completion |
| `src/pages/VendorDashboard.tsx` | 123 | Vendor portal logout |

### onAuthStateChange Listeners (3 total — all properly cleaned up)

| File | Purpose | Cleanup |
|------|---------|---------|
| `AuthContext.tsx:86` | Primary auth state tracking | Unsubscribed (line 98) |
| `EmailConfirmed.tsx:12` | Email verification detection | Unsubscribed (line 33) |
| `ResetPassword.tsx:29` | PASSWORD_RECOVERY event | Unsubscribed (line 47) |

### Inactivity Timeout (src/contexts/InactivityContext.tsx)

| Timer | Duration | Action |
|-------|----------|--------|
| Warning | 14 minutes | Toast: "Session will lock in 1 minute" |
| Lock | 15 minutes | Lock screen appears (`evidly_locked=1`) |
| Logout | 180 minutes (3 hours) | Auto-logout + redirect to `/login` |

**Event listeners:** `mousedown`, `keydown`, `touchstart`, `scroll`, `click`, `mousemove` (5s throttle)
**Check interval:** 30 seconds
**Cross-tab sync:** localStorage events propagate lock state
**Cleanup:** All listeners properly removed on unmount
**Demo mode:** Inactivity disabled entirely

**Status: NO ISSUES FOUND**

---

## 6. SIDEBAR / NAVIGATION

### Roles Configured: 8/8

| Role | Sections | Items |
|------|----------|-------|
| platform_admin | 11 | 68+ |
| owner_operator | 7 | 52+ |
| executive | 6 | 30+ |
| kitchen_manager | 6 | 32+ |
| compliance_manager | 5 | 40+ |
| facilities_manager | 9 | 34+ |
| chef | 8 | 28+ |
| kitchen_staff | 3 | 6 |

### Critical Item Verification

| Item | In Sidebar? | Roles | Route Exists? |
|------|-------------|-------|---------------|
| Training Records | YES | admin, owner, exec, km, cm, chef | YES (`/dashboard/training`) |
| Training Catalog | YES | admin, owner | YES (`/dashboard/training-catalog`) |
| Reports | YES | admin, owner, exec, km, cm | YES (`/reports`) |
| Facility Safety | YES | admin, owner, exec, fm, cm | YES (`/facility-safety`) |
| Security (Settings) | YES | All roles (Settings page tab) | YES |

### Fire Safety Remnants

**ZERO** — Confirmed clean. All instances properly renamed to "Facility Safety".

### Mobile Bottom Nav (per role)

All 8 roles have properly configured bottom nav tabs (4-5 items each). "More" drawer dynamically pulls from sidebarConfig. Kitchen staff has dedicated 5-tab layout (no More drawer).

### Broken Route Links: 0

**Status: NO ISSUES FOUND**

---

## 7. DATABASE TABLE COVERAGE

**Tables referenced in code:** 73 (including 2 views)
**Migration files exist:** YES for all referenced tables

### Full Table List

<details>
<summary>Click to expand (73 tables)</summary>

ai_insights, ai_interaction_logs, alerts, assessment_leads, assessment_responses, assessment_results, auto_request_log, auto_request_settings, checklist_completions, checklist_responses, checklist_template_completions, checklist_template_items, checklist_templates, client_notifications, compliance_photos, compliance_score_snapshots, crawl_execution_log, demo_leads, documents, edge_function_invocations, edge_function_registry, employee_certifications, enterprise_audit_log, enterprise_rollup_scores, enterprise_tenants, equipment, executive_snapshots, haccp_corrective_actions, haccp_critical_control_points, haccp_monitoring_logs, haccp_plans, incident_comments, incident_timeline, incidents, inspections, intelligence_game_plans, intelligence_insights, intelligence_signals, intelligence_subscriptions, jurisdictions, location_jurisdictions, locations, notification_settings, onboarding_checklist_items, organizations, platform_updates, predictive_alerts, profiles, receiving_temp_logs, report_subscriptions, rfp_actions, rfp_listings, rfp_sources, risk_assessments, role_permissions, temp_check_completions, temp_logs, temperature_equipment, user_certifications, user_invitations, user_location_access, user_permission_overrides, user_profiles, v_location_leaderboard (VIEW), v_platform_stats (VIEW), vendor_certificates, vendor_client_relationships, vendor_contact_log, vendor_service_requests, vendor_services, vendor_upload_requests, vendor_users, vendors

</details>

**Status: FULL COVERAGE — no orphaned references**

---

## 8. FEATURE CHECKLIST

### Pages

| Route | Status | Actual Path / Notes |
|-------|--------|---------------------|
| `/demo` | **EXISTS** | DemoWizard.tsx — 7-step wizard |
| `/checkup` | **EXISTS** | KitchenCheckup.tsx — public, no auth |
| `/kitchen-to-community` | **EXISTS** | KitchenToCommunity.tsx — public |
| `/dashboard` | **EXISTS** | Dashboard.tsx — role-dispatched to 7 variants |
| `/dashboard/food-safety` | **MISSING** | No `/dashboard/food-safety` route. Food safety is embedded in compliance scoring, not a standalone page. Compliance pillar data is in `/scoring-breakdown` and dashboard widgets |
| `/dashboard/facility-safety` | **EXISTS** | Route is `/facility-safety` (not `/dashboard/facility-safety`) |
| `/dashboard/locations` | **MISSING** | Route is `/org-hierarchy` instead of `/dashboard/locations` |
| `/dashboard/team` | **EXISTS** | Route is `/team` (not `/dashboard/team`) |
| `/dashboard/training` | **EXISTS** | TrainingRecords.tsx |
| `/dashboard/vendors` | **EXISTS** | Route is `/vendors` |
| `/dashboard/vendor-services` | **PARTIAL** | No dedicated page. Vendor services accessed via VendorDetail.tsx (`/vendors/:vendorId`) |
| `/dashboard/documents` | **EXISTS** | Route is `/documents` |
| `/dashboard/equipment` | **EXISTS** | Route is `/equipment` |
| `/dashboard/checklists` | **EXISTS** | Route is `/checklists` |
| `/dashboard/temp-logs` | **EXISTS** | Route is `/temp-logs` |
| `/dashboard/reports` | **EXISTS** | Route is `/reports` — 12 report types |
| `/dashboard/calendar` | **EXISTS** | Route is `/calendar` |
| `/dashboard/alerts` | **EXISTS** | Route is `/alerts` |
| `/dashboard/iot` | **EXISTS** | Route is `/iot-monitoring` |
| `/dashboard/settings/profile` | **PARTIAL** | No dedicated profile route. Profile is a modal within Settings.tsx |
| `/dashboard/settings/security` | **EXISTS** | Security tab within Settings.tsx (password change) |
| `/admin/assessments` | **EXISTS** | AssessmentLeads.tsx |

> **Note:** Most routes are at root level (e.g., `/team`, `/vendors`, `/calendar`) rather than nested under `/dashboard/`. They are all inside the ProtectedLayout with sidebar, so they function as dashboard sub-pages despite the flat URL structure.

### Dashboard Widgets

| Widget | Status | Notes |
|--------|--------|-------|
| K2C Widget | **EXISTS** | `K2CWidget.tsx` on owner dashboard |
| Quick Actions Bar | **EXISTS** | `QuickActionsBar.tsx`, `SelfDiagCard.tsx`, `OnboardingChecklistCard.tsx` |
| Calendar Widget | **EXISTS** | Calendar.tsx with full month view |
| HACCP Control Points | **EXISTS** | Full HACCP module at `/haccp` |
| Score/Grade Display | **EXISTS** | Dashboard pillar cards with compliance scores |

### Functionality

| Feature | Status | Details |
|---------|--------|---------|
| Calendar add/edit/delete | **PARTIAL** | Add works; edit/delete demo-guarded (blocked in demo mode) |
| Team invite (name + role + location + status) | **EXISTS** | TeamInviteModal.tsx with SMS + Email support |
| Vendor invite (company + contact + services + status) | **PARTIAL** | `invite_status` field exists; uses VendorDetail, no dedicated invite modal |
| Training catalog with assign/bulk assign | **EXISTS** | TrainingCatalog.tsx + AssignTrainingModal.tsx |
| Report generation + PDF export | **EXISTS** | 12 reports, jsPDF export via ReportPdfButton |
| isDemoMode false for authenticated users | **EXISTS** | Three-layer protection confirmed |
| isDemoMode true ONLY on /demo routes | **EXISTS** | Confirmed via DemoContext logic |
| Inactivity timeout | **EXISTS** | 15 min lock, 3 hour logout |
| Cancel buttons on all forms | **EXISTS** | Verified across sampled forms |

---

## 9. MESSAGING VIOLATIONS

### Fire Safety Remnants

**0 matches** — Clean across all `.ts` and `.tsx` files.

### Compliance-Heavy Language

| Term | Files Found | Assessment |
|------|-------------|------------|
| `non-compliant` / `Non-Compliant` | 0 | Clean |
| `violation` / `Violation` | 48 files | Used in legitimate compliance context (IoT sensor alerts, compliance intelligence, jurisdiction settings, audit reports). These are **technical compliance terms**, not customer-facing shaming language. Acceptable usage. |
| `overdue` / `Overdue` | 55 files | Used for genuinely overdue items (temp checks, vendor certs, equipment service, document expiry). Correct terminology per spec: "Coming Due" (amber), "Needs Renewal" (red) for training; "Overdue" for operational items. Acceptable usage. |

### Broken i18n Keys

**0 matches** — App uses hardcoded English strings, no i18n framework. No orphaned translation keys.

---

## 10. DEPLOYMENT STATUS

### Git

| Field | Value |
|-------|-------|
| Branch | `main` |
| Remote sync | Up to date with `origin/main` |
| Uncommitted changes | `.claude/settings.local.json` (unstaged, non-production) |

### Recent Commits

```
07a0e84 Add Training Catalog UI page with route and sidebar registration
881e388 INVITE-FLOW-1: add migration for invite flow enhancements
24ed36b Refine Reports, Team, and Vendors pages with UI cleanup and dependency updates
7156e97 Add training_catalog table migration and demo data
a0e32c2 CHECKUP-1B: Kitchen Checkup results pages, PDF export, email notification
c5603f8 REPORTS-1: Report Center with 12 report types, PDF export, and role-based access
db9c791 CHECKUP-1: Kitchen Checkup public tool
721c244 TRAINING-RECORDS-1: employee-centric training records module
30db2b1 DEMO-GATE-2: extend demo gating and refinements
23bc846 DEMO-GATE-1: gate all hardcoded demo data behind isDemoMode
```

### Vercel

Could not verify deployment status from CLI (sandbox restriction). Run manually:
```bash
npx vercel ls --limit 3
npx vercel env ls
```

---

## 11. CRITICAL ISSUES (Top 5)

| Priority | Issue | Severity | Impact |
|----------|-------|----------|--------|
| **1** | **75 `react-hooks/rules-of-hooks` ESLint errors** — hooks called conditionally or in non-component contexts. These can cause React runtime crashes, state corruption, and inconsistent renders. | **HIGH** | Runtime crashes |
| **2** | **940 kB main chunk** exceeds 500 kB recommended limit. Initial page load will be slow, especially on mobile/3G connections. | **MEDIUM** | Performance |
| **3** | **489 unused variables/imports** across the codebase. Dead code increases bundle size and reduces maintainability. | **LOW** | Bundle size, maintainability |
| **4** | **5 orphan page files** with no routes (Help.tsx, ComingSoon.tsx, FacilitiesDashboard.tsx, KitchenDashboard.tsx, IntelligenceAdmin.tsx). Dead code that could confuse developers. | **LOW** | Code hygiene |
| **5** | **Vendor invite flow is partial** — no dedicated invite modal; uses field on VendorDetail. Team invite has full modal with SMS+Email but vendor invite lacks parity. | **LOW** | Feature gap |

---

## 12. RECOMMENDED FIX ORDER

1. **Fix `react-hooks/rules-of-hooks` violations (75 errors)** — Highest risk of runtime crashes. Audit each violation; most are likely hooks used inside callbacks or conditional branches. Restructure to follow Rules of Hooks.

2. **Code-split the 940 kB main chunk** — Use route-based lazy loading (already partially in place) and identify large dependencies that can be split. Consider lazy-loading `recharts`, heavy admin pages, and intelligence modules.

3. **Clean up 489 unused variables/imports** — Run `npx eslint src/ --ext .tsx,.ts --fix` for the 7 auto-fixable errors, then manually remove remaining unused imports. This will also reduce chunk size.

4. **Delete 5 orphan page files** — Remove `Help.tsx`, `ComingSoon.tsx`, `FacilitiesDashboard.tsx`, `KitchenDashboard.tsx`, `admin/IntelligenceAdmin.tsx`. Verify no dynamic imports reference them first.

5. **Fix duplicate `"Grease Trap"` key** in `src/config/vendorCategories.ts:114` — Second key silently overwrites the first.

6. **Build vendor invite modal** to match team invite flow (lower priority, feature enhancement).

7. **Address remaining 53 `exhaustive-deps` warnings** — Review each for potential stale closure bugs; add to dependency arrays or suppress with documented reason.

---

*This report was generated as a read-only audit. No code changes were made. No deployments were triggered.*
