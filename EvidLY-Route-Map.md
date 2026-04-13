# EvidLY Route Map

## Admin Home (ADMIN-HOME-01)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/admin` | `AdminHome.tsx` | platform_admin / @getevidly.com | Admin dashboard — welcome header, KPI cards, quick access, recent activity, platform status |
| `/admin/home` | Redirect → `/admin` | Same | Alias for admin home |

### Login Redirect
- `@getevidly.com` and `platform_admin` users redirect to `/admin` on login (not `/dashboard`)
- Vendor users still redirect to `/vendor/dashboard`
- All other users redirect to `/dashboard`

### Sections
1. Welcome header with personalized greeting + launch countdown chip
2. Alert bar (pending signals, crawl errors, DB health) — shown only when alerts exist
3. 6 KPI stat cards: MRR, Organizations, Locations, Crawl Sources, Signals Pending, Countdown
4. Quick Access (8-card grid) + Recent Activity (timeline) — two-column layout
5. Platform Status bar (Supabase, Vercel, Crawl Engine status)

---

## Leaderboard Routes (LEADERBOARD-BUILD-02)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/leaderboard` | `Leaderboard.tsx` | Protected | Production leaderboard — queries `v_location_leaderboard` view, shows only opted-in orgs, gamified UI with XP/badges/podium |
| `/leaderboard-preview` | `LeaderboardPreview.tsx` | Public | Marketing preview — hardcoded demo data, zero Supabase calls, sticky CTA banner + bottom CTA |

### Settings Integration
- Opt-in toggle in Settings > Privacy tab (owner_operator only)
- Writes `leaderboard_opted_in` to `organizations` table

---

## Fire Safety & Equipment Routes (FS-1)

| Route | Component | Description |
|-------|-----------|-------------|
| `/fire-safety` | `FireSafety.tsx` | Fire Safety Checklist — Daily/Weekly/Monthly tabs, pass/fail, authority citations |
| `/equipment` | `Equipment.tsx` | Equipment Inventory — pillar filter (food/fire), badges, inline detail |
| `/equipment/:equipmentId` | `EquipmentDetail.tsx` | Equipment Detail — full-page view, tabs (Overview/Service History/Schedule/Lifecycle) |
| `/equipment/:equipmentId/service/new` | `ServiceRecordEntry.tsx` | Service Record Entry — form with validation, pass/fail, demo submit |

## Role Access

| Route | Roles |
|-------|-------|
| `/fire-safety` | All (executive, management, kitchen_manager, kitchen, facilities) |
| `/equipment` | executive, management, kitchen_manager, facilities |
| `/equipment/:equipmentId` | Same as `/equipment` |
| `/equipment/:equipmentId/service/new` | Same as `/equipment` |

## Quick Actions (QuickActionsBar)

- **Management:** Fire Check → `/fire-safety` (after Checklist)
- **Kitchen Manager:** Fire Check → `/fire-safety` (after Checklist)
- **Facilities:** Fire Check → `/fire-safety` (first item)

## Dashboard Widget

- **Fire Safety Widget** in OwnerOperatorDashboard: org score, per-location bars, equipment alerts

---

## Daily Checklists & HACCP (FS-2)

### Checklists Route

| Route | Component | Description |
|-------|-----------|-------------|
| `/checklists` | `Checklists.tsx` | Daily Checklists — Templates/Today/History tabs, CalCode authority citations, CCP auto-mapping |

**Features:**
- 4 checklist templates: Opening (9 items), Mid-Shift (6), Closing (8), Receiving (8)
- CalCode authority badges on every item (§113953, §113996, §114097, etc.)
- CCP tag pills (CCP-01 through CCP-04) on temperature-critical items
- Temperature auto-evaluation: real-time PASS/FAIL against min/max limits
- Required corrective action for failed CCP items (blocks submission until filled)
- CCP auto-mapping on submit: collects results, shows summary banner, creates notifications

**CCP Mapping:**
| CCP | Category | Items |
|-----|----------|-------|
| CCP-01 | Cold Storage | Walk-in cooler ≤41°F, walk-in freezer ≤0°F |
| CCP-02 | Hot/Cold Holding | Hot holding ≥135°F, cold holding ≤41°F |
| CCP-03 | Cooling | Cooling items completed to 41°F |
| CCP-04 | Receiving | Poultry, beef, seafood, frozen, dairy temps at delivery |

### HACCP Route

| Route | Component | Description |
|-------|-----------|-------------|
| `/haccp` | `HACCP.tsx` | HACCP Management — Plans/Monitoring/Corrective Actions/Template tabs, Inspector Package PDF |

**Features:**
- 6 HACCP plans with 8 CCPs (roll-up from temp logs + checklists)
- Real-time CCP monitoring grid with pass/fail status
- Corrective action workflow (Identified → Assigned → In Progress → Resolved)
- HACCP Plan Builder (7-section template form)
- **Inspector Package PDF export** (jsPDF): cover page, plans+CCPs, monitoring log, corrective actions, verification statement

### Role Access (FS-2)

| Route | Roles |
|-------|-------|
| `/checklists` | All (executive, management, kitchen_manager, kitchen, facilities) |
| `/haccp` | All (executive, management, kitchen_manager, kitchen, facilities) |
| Inspector Package export | management, executive, kitchen_manager only |

---

## Training & Certificates (FS-3)

### Training Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/training` | `TrainingHub.tsx` | Training Hub — 8 tabs: Course Catalog, My Learning, Certifications, Requirements, Compliance Overview, SB 476 Tracker, Admin, Pricing |
| `/training/course/:id` | `TrainingCourse.tsx` | Course viewer with lessons, quizzes, progress tracking |
| `/training/courses/builder` | `CourseBuilder.tsx` | 6-step course creation wizard |
| `/training/certificates` | `CertificateViewer.tsx` | Certificate grid viewer |
| `/training/employee/:userId` | `EmployeeCertDetail.tsx` | Employee Cert Detail — cert cards, missing requirements, training history, quiz results |

**Features:**
- 7 CA certification requirements (food_handler, cfpm, fire_extinguisher_training, hood_safety, allergen_awareness, first_aid_cpr, haccp_training)
- Requirements tab: authority citations (CalCode, OSHA, NFPA, FDA), role badges, renewal periods, compliance %
- Compliance Overview tab: org-wide compliance %, per-location CFPM coverage, expiration windows (30/60/90d), gap analysis
- Inspector View "Show Certs" quick-pull panel (CFPM, Food Handler, Fire Safety tables)
- Scoring integration: cert data feeds into Vendor Compliance pillar via `buildCertComplianceItem()`
- SB 476 cost/compensation tracking for food handler training

### Role Access (FS-3)

| Route | Roles |
|-------|-------|
| `/training` | All (executive, management, kitchen_manager, kitchen, facilities) |
| `/training/employee/:userId` | All |
| `/training/courses/builder` | management only |

### Sidebar Position
- Training appears in "Documents & Assets" section between Equipment and HACCP

---

## Temperature Monitoring — Three-Method System (FS-5)

### Temperature Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/temp-logs` | `TempLogs.tsx` | Temperature Logs — 7 tabs: Equipment, History, Receiving, Cooldown, IoT Live View, Hot/Cold Holding, Analytics |
| `/temp/log` | `TempLogQuick.tsx` | Quick temp entry — standalone mobile form, URL param `?equipment=eq-1&method=qr_scan` |
| `/temp-logs/scan` | `TempLogScan.tsx` | QR Scanner — camera viewfinder (demo: tap-to-scan), equipment lookup, inline temp entry |
| `/iot-monitoring` | `IoTMonitoring.tsx` | IoT Monitoring — 4-tab dashboard: Live Dashboard, Sensors, Alerts, Settings |
| `/iot-sensors` | `IoTSensorHub.tsx` | IoT Sensor Hub — 6-tab sensor management platform |
| `/iot/platform` | `IoTSensorPlatform.tsx` | Sensor platform landing — readiness score, cost calculator, device ecosystem, zero lock-in |
| `/iot/hub` | `IoTSensorHub.tsx` | Live sensor dashboard — real-time readings, fleet, alerts, analytics |
| `/iot/setup` | `SensorSetupWizard.tsx` | Step-by-step sensor pairing wizard — equipment → type → connection → alerts → activate |
| `/migrate` | `VendorMigration.jsx` | Competitor migration wizard — CSV data import from Zenput/Squadle/ComplianceMate |
| `/sensors` | `SensorHub.tsx` | Sensor Hub — 8 provider integrations |
| `/sensors/:sensorId` | `SensorDetail.tsx` | Sensor Detail — history chart, calibration |
| `/sensors/setup` | `SensorSetupWizard.tsx` | Sensor Setup — 5-step onboarding wizard |

### Features (FS-5)
- Three input methods: Manual, QR Scan, IoT Sensor — all produce identical compliance records
- `input_method` tracking on all temperature logs with method icon badges
- QR code labels on equipment (EquipmentQRCode component in Equipment Detail)
- Hot/Cold Holding tab: CalCode §113996 compliance status cards
- Analytics tab: method breakdown pie chart, weekly compliance trend, equipment heatmap, time-of-day distribution
- HACCP IoT source integration: CCP-01 (cold storage) and CCP-02 (hot/cold holding) auto-logged from sensors
- IoT process reading Edge Function with 15-min alert delay (prevents door-open false alarms)
- History tab: CCP column (CCP-01/CCP-02), shift filter (morning/afternoon/evening), enhanced CSV export
- Holding tab: 2-hour check reminder indicators (CHECK OVERDUE / CHECK DUE SOON badges)
- Equipment Detail: QR code section uses `getPillar()` for correct visibility in demo
- Equipment page: "QR Label" button in detail panel — generates printable QR label with equipment ID, name, temp threshold, CalCode §113996
- QR Scan entry points: navy button on TempLogs header + "QR Scan" sidebar item in Operations section
- QR scan workflow: equipment type display, CCP mapping (CCP-01/CCP-02), corrective action required for failed readings

### Role Access (FS-5)

| Route | Roles |
|-------|-------|
| `/temp-logs` | management, kitchen_manager |
| `/temp/log` | kitchen (also accessible via QR scan) |
| `/temp-logs/scan` | All (standalone page, no layout) |
| `/iot-monitoring` | executive, management, kitchen_manager, facilities |
| `/iot-sensors` | executive, management, facilities |

### Quick Actions
- **Management/Kitchen Manager/Kitchen:** Scan QR → `/temp-logs/scan`
- **Management/Kitchen Manager:** Log Temp → `/temp-logs`

### Sidebar Position
- QR Scan appears in "Operations" section after Log Temp (all roles)
- IoT Monitoring appears in "Operations" section after QR Scan

---

## Training Records (GAP-06)

### Training Records Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard/training` | `TrainingRecords.tsx` | Employee training grid — cert status, filters, assignment |
| `/dashboard/training/:employeeId` | `EmployeeTrainingProfile.tsx` | 5-section employee profile — certs, internal training, jurisdiction reqs, timeline, history |
| `/dashboard/training-catalog` | `TrainingCatalog.tsx` | Training catalog browser — 22 system + org-specific items |

### Features (GAP-06)
- Add/edit certification per employee via AddCertificationModal
- 9 certification types (food_handler, cfpm, haccp, fire_extinguisher, etc.)
- Expiration tracking: Current (>90d), Coming Due (1-90d), Needs Renewal (past due)
- TrainingComplianceWidget on OwnerOperatorDashboard
- Role filtering: kitchen_staff sees only their own records

### Role Access (GAP-06)

| Route | Roles |
|-------|-------|
| `/dashboard/training` | owner_operator, executive, kitchen_manager, chef, compliance_manager, platform_admin |
| `/dashboard/training/:employeeId` | All roles (kitchen_staff sees only self) |
| `/dashboard/training-catalog` | owner_operator, executive, platform_admin |

---

## Equipment Maintenance & Calibration (GAP-07)

### Equipment Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/equipment` | `Equipment.tsx` | Equipment registry — list/card view, status badges, QR labels |
| `/equipment/:equipmentId` | `EquipmentDetail.tsx` | Equipment detail — 4 tabs (Overview, Service, Schedule, Lifecycle) |
| `/equipment/:equipmentId/service/new` | `ServiceRecordEntry.tsx` | Service/calibration record entry — auto-calculates next due date |

### Features (GAP-07)
- 7 service types including Calibration
- Auto-calculate next due date from service interval when recording service
- Equipment-specific interval overrides (Hood=90d cleaning, Fire Suppression=365d cert)
- EquipmentHealthWidget on OwnerOperatorDashboard
- Overdue maintenance surfaced as compliance risk flag

### Role Access (GAP-07)

| Route | Roles |
|-------|-------|
| `/equipment` | owner_operator, executive, facilities_manager, platform_admin |
| `/equipment/:equipmentId` | Same as above |
| `/equipment/:equipmentId/service/new` | owner_operator, compliance_manager, facilities_manager |

---

## Incident & Complaint Documentation (GAP-09)

### Incident Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/incidents` | `IncidentLog.tsx` | Incident list — 8 types, 3 severities, create/action/resolve/verify modals |

### Features (GAP-09)
- Case number auto-generation (INC-XXX)
- 8-dimension filtering (status, severity, type, location, assignee, date, sort, regulatory)
- Full incident detail with timeline, comments, photo evidence
- Regulatory report flag — prominent badge, "Mark as Filed" workflow
- Create Corrective Action from incident — links to corrective_actions module
- Role-based list filtering: kitchen_staff sees only own reported/assigned incidents
- IncidentSummaryWidget on OwnerOperatorDashboard

### Role Access (GAP-09)

| Route | Roles |
|-------|-------|
| `/incidents` (full access) | owner_operator, executive, compliance_manager, facilities_manager, kitchen_manager |
| `/incidents` (view only) | chef, kitchen_staff |
| Create incident | All roles |
| Verify/Reject | owner_operator, executive only |

---

## Re-Score Alerts (GAP-11)

### Dashboard Widget

- **ReScoreAlertsWidget** on OwnerOperatorDashboard: severity breakdown (Critical/High/Medium), top 3 alerts preview with acknowledge, click-through to Command Center

### Features (GAP-11)
- Trigger evaluation engine: evaluates corrective actions, certifications, equipment, incidents, and intelligence signals
- Alert severities: critical (overdue CA >48hrs, hood system overdue, critical incident), high (expired cert, equipment overdue), medium (cert expiring within 7 days)
- Alert pillars: food, fire (facility safety), both
- Acknowledge workflow — local state management in demo, Supabase in live
- Demo data: 7 pre-built alerts (3 critical, 2 high, 1 medium, 1 resolved)

### Data Files
- `src/data/rescoreAlertsDemoData.ts` — types, trigger evaluation engine, demo alerts, helpers
- `src/components/dashboard/ReScoreAlertsWidget.tsx` — dashboard widget

---

## Insurance Export API (GAP-08)

### Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin/api-keys` | `InsuranceApiKeys.tsx` | API key management — create, revoke, view request logs, API docs |
| `/admin/demo-launcher` | `DemoLauncher.tsx` | Launch personalized demo sessions — jurisdiction + industry filtered (super_admin, sales) |

### Features (GAP-08)
- API key CRUD with one-time key reveal on creation
- SHA-256 hashed key storage (never plaintext)
- 3 permission scopes: compliance_score, inspection_history, risk_summary
- Facility-scoped access (all facilities or specific facility IDs)
- Request log with endpoint, method, status code, timestamp
- KPI cards: Active Keys, Total Requests, Revoked/Expired
- API documentation reference panel showing 3 endpoints

### Edge Function
- `supabase/functions/insurance-export/` — read-only API with Bearer token auth
- Endpoints: compliance-score, inspection-history, risk-summary
- Auth: Bearer token → SHA-256 hash → lookup in insurance_api_keys table
- Permissions checked per-endpoint, facility scope enforced
- All requests logged to insurance_api_request_log

### Role Access (GAP-08)

| Route | Roles |
|-------|-------|
| `/admin/api-keys` | platform_admin only |

---

## Document Workflow — Vendor Config (AUDIT 2026-03-04)

### Audit Findings

| # | Question | Finding | Status |
|---|----------|---------|--------|
| 1 | Document types vendors can upload | VendorSecureUpload: PDF, JPG, PNG, HEIC, DOC, DOCX (25MB). SmartUploadModal: PDF, DOCX, XLSX, JPG, PNG, CSV (10MB). AI classifies 20+ types across 4 pillars. | OK |
| 2 | Cross-vendor visibility | **GAP**: `vendor_documents` RLS was org-scoped only. Any user in the org could query ALL vendor documents. Vendor portal users could see other vendors' docs. | FIXED |
| 3 | RLS enforcement level | `documents` table: org-scoped via `user_location_access` (correct). `vendor_documents`: was app-layer only, **now DB-enforced** via `linked_vendor_id` check. | FIXED |
| 4 | Workflow triggers | **GAP**: `vendor-secure-upload` sent `new_upload` to hardcoded `team@getevidly.com`. Compliance Officer was NOT notified. | FIXED |
| 5 | Location scoping | `vendor_documents.location_id` correctly scopes to facilities. Nullable for org-wide docs (COI, Business License). | OK |

### Corrective Actions

1. **Migration `20260304040000_vendor_document_rls_vendor_scoping.sql`**
   - Added `linked_vendor_id UUID` column to `user_profiles` (nullable, references `vendors.id`)
   - Replaced `vendor_documents` SELECT/INSERT/UPDATE policies with vendor-scoped check
   - Internal org users (linked_vendor_id IS NULL): retain full org-scoped access
   - Vendor portal users (linked_vendor_id IS NOT NULL): restricted to own `vendor_id` only
   - Applied same scoping to `vendor_document_notifications` SELECT policy

2. **Fixed `vendor-secure-upload` edge function**
   - Now queries `user_profiles` for `compliance_manager` + `owner_operator` users in the org
   - Sends individual `new_upload` notification to each (parallel, fire-and-forget)
   - Falls back to `team@getevidly.com` only if no recipients found
   - Timeout increased from 5s to 8s for parallel notifications

3. **Audit comment block** added to `src/pages/VendorDetail.tsx` (lines 1-48)

### Regression Test Cases

| # | Test Case | Expected Result | Priority |
|---|-----------|-----------------|----------|
| T1 | Internal user queries `vendor_documents` via Supabase | Returns all vendor docs in their org (unchanged) | P0 |
| T2 | Vendor portal user (linked_vendor_id = V1) queries `vendor_documents` | Returns only docs where vendor_id = V1 | P0 |
| T3 | Vendor portal user tries to INSERT doc for different vendor_id | Rejected by RLS policy | P0 |
| T4 | Vendor portal user queries `vendor_document_notifications` | Returns only notifications for their vendor_id | P1 |
| T5 | Vendor uploads via secure link | compliance_manager + owner_operator receive email notification | P0 |
| T6 | Vendor uploads via secure link (org has no compliance_manager) | Falls back to team@getevidly.com | P1 |
| T7 | VendorDetail page filters docs by vendorId from URL params | Shows only docs for selected vendor (app-layer check) | P1 |
| T8 | Documents page filters by role | kitchen_staff sees operational docs only; exec sees all | P1 |
| T9 | Vendor document with location_id = specific facility | Correctly scoped in UI; org-wide docs show for all locations | P2 |
| T10 | Service role access to vendor_documents | Full access (edge functions work correctly) | P0 |

---

## Business Intelligence (BUSINESS-INTELLIGENCE-01)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/insights/intelligence` | `BusinessIntelligence.tsx` | Protected (owner_operator, executive, compliance_manager) | 4-format intelligence view: Executive Summary, Formal Document, PDF/Print Ready, Risk Register. Replaces ClientIntelligenceFeed. |

### Format Tabs
- **Executive Summary** — narrative + RiskCards + action list
- **Formal Document** — CONFIDENTIAL report with numbered sections + attestation
- **PDF / Print Ready** — compact, print-optimized, `@media print` styles
- **Risk Register** — table with expandable rows + inline Risk Plan drawer

### Risk Plans
- `risk_plans` table: upsert on `(org_id, signal_id)`
- Statuses: not_started, in_progress, completed, accepted
- Risk Accepted requires justification (logged + timestamped)
- AI suggestions pre-populate fields from signal content

### Data Flow
- **Demo mode**: static `DEMO_SIGNALS` array (6 signals), local-state risk plans
- **Production**: `intelligence_signals WHERE is_published=true AND org_id=current_org`
- **Empty state**: "No active intelligence signals" — zero sample data in production

---

## Operations Check / IRR Lead Magnet (IRR-LEAD-MAGNET-01)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/operations-check` | `OperationsCheck.jsx` | Public | 3-step lead magnet: intake → 11-question assessment → instant risk report |

### Features
- **Intake**: firstName, lastName, email, phone, businessName, street, city, state, zip, county, locations, opType
- **Assessment**: 11 questions across Food Safety (6) and Fire & Facility Safety (5)
- **Report**: posture banner, executive narrative, PSE advisory, priority-ranked action items, grouped breakdown
- **Persistence**: `irr_submissions` table (fire-and-forget), Formspree backup
- **Auto account**: magic link via `signInWithOtp` → redirects to `/onboarding`
- **URL params**: `?county=Los+Angeles&source=scoretable` for pre-fill from ScoreTable pages

### Entry Points
- Landing page NavBar gold button, IRRAboveFold section, IRRSection
- ScoreTable county pages cross-links grid
- Direct link: `/operations-check`

---

## 404 Catch-All (AUDIT-FIX-01)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/*` | `NotFound.jsx` | Public | 404 catch-all — unmatched URLs show "This page doesn't exist" with link to Dashboard |

---

## Auth Routes

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/` | Redirect → `/login` | None | Root redirect |
| `/login` | `Login.tsx` | PublicRoute | Login form (redirects to dashboard if already logged in) |
| `/admin-login` | `AdminLogin.tsx` | PublicRoute | Admin login — redirects to `/admin` |
| `/signup` | `Signup.tsx` | PublicRoute | Signup form |
| `/signup/locations` | `SignupLocations.tsx` | ProtectedRoute | Add locations during signup flow |
| `/forgot-password` | `ForgotPassword.tsx` | PublicRoute | Password reset request |
| `/reset-password` | `ResetPassword.tsx` | Protected | Password reset completion |
| `/email-confirmed` | `EmailConfirmed.tsx` | Protected | Email confirmation landing |
| `/auth/callback` | `AuthCallback.tsx` | Protected | OAuth callback handler |
| `/setup-mfa` | `SetupMFA.tsx` | Protected | MFA setup page |
| `/suspended` | `Suspended.tsx` | Protected | Account suspended notice |
| `/invite/:token` | `InviteAccept.tsx` | Protected | Team invitation acceptance |

---

## Public Marketing & Legal Pages

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/partners/insurance` | `CarrierPartnership.tsx` | Public | Insurance carrier partnership landing |
| `/providers` | `MarketplaceLanding.tsx` | Public | Provider marketplace landing |
| `/enterprise` | `EnterpriseLanding.tsx` | Public | Enterprise solution landing |
| `/iot` | `IoTSensorLanding.tsx` | Public | IoT sensor solution landing |
| `/kitchen-to-community` | `KitchenToCommunity.tsx` | Public | Kitchen to Community program landing |
| `/terms` | `TermsOfService.tsx` | Public | Terms of Service |
| `/privacy` | `PrivacyPolicy.tsx` | Public | Privacy Policy |
| `/blog` | `BlogList.tsx` | Public | Blog list |
| `/blog/:slug` | `BlogPost.tsx` | Public | Blog post detail |

---

## Public Compliance & ScoreTable Pages

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/compliance/california` | `CaliforniaCompliance.tsx` | Public | California compliance overview |
| `/compliance/california/:countySlug` | `CountyCompliance.tsx` | Public | County-specific compliance page |
| `/scoretable/washington` | `ScoreTableWashington.jsx` | Public | Washington state ScoreTable — all 39 counties |
| `/scoretable/washington/:countySlug` | `ScoreTableWACounty.jsx` | Public | Washington county ScoreTable — DB-driven |
| `/scoretable/:slug` | `ScoreTableCountyPage.tsx` | Public | County score table with cross-links |
| `/scoretable/city/:citySlug` | `ScoreTableCityPage.tsx` | Public | City-level score table |
| `/kitchen-check/:slug` | `KitchenCheck.tsx` | Public | County kitchen check tool |
| `/city/:citySlug` | `CityPage.tsx` | Public | City landing page |
| `/:slug` | `CountyLanding.tsx` | Public | Catch-all county landing (URL param slug) |

---

## Public Tools & Shared Views

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/assessment` | `AssessmentTool.tsx` | Public | Kitchen Checkup assessment tool |
| `/verify/:code` | `PublicVerification.tsx` | Public | Email/document verification |
| `/ref/:code` | `ReferralRedirect.tsx` | Public | Referral link redirect |
| `/r/:code` | `ReferralPage.tsx` | Public | Referral landing page |
| `/risk/:shareToken` | `InsuranceRiskShared.tsx` | Public | Shared insurance risk report |
| `/report/:token` | `SharedReport.tsx` | Public | Shared report view |
| `/passport/demo` | `PassportDemo.tsx` | Public | Passport demo |
| `/passport/:id` | `Passport.tsx` | Public | Public passport view |
| `/leaderboard-preview` | `LeaderboardPreview.tsx` | Public | Leaderboard marketing preview |
| `/equipment/scan/:equipmentId` | `QRScanLandingPage.tsx` | Public | QR scan equipment landing |

---

## Demo & Onboarding (No Shared Layout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/onboarding` | `Onboarding.tsx` | ProtectedRoute | New org onboarding wizard |
| `/demo` | `DemoWizard.tsx` | Protected | Demo entry wizard |
| `/demo/request` | `DemoRequest.tsx` | Protected | Demo request form |
| `/demo/schedule/:sessionId` | `DemoSchedule.tsx` | Protected | Schedule demo session |
| `/demo-expired` | `DemoExpired.tsx` | Protected | Demo period expired notice |

---

## Vendor Portal (No Shared Layout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/vendor/login` | `VendorLogin.tsx` | None | Vendor-specific login |
| `/vendor/register` | `VendorRegister.tsx` | None | Vendor registration |
| `/vendor/dashboard` | `VendorDashboard.tsx` | ProtectedRoute | Vendor dashboard (no sidebar) |
| `/vendor/setup` | `VendorSetup.tsx` | ProtectedRoute | Vendor onboarding setup |
| `/vendor/upload/:token` | `VendorSecureUpload.tsx` | None | Token-based secure file upload |
| `/vendor/invite/:code` | `VendorInviteLanding.tsx` | None | Vendor invitation landing |
| `/vendor-update/:token` | `VendorServiceUpdate.tsx` | None | Vendor service update form |

---

## Enterprise Portal (No Shared Layout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/enterprise/admin` | `EnterpriseDashboard.tsx` | ProtectedRoute | Enterprise admin dashboard |
| `/enterprise/dashboard` | `EnterpriseExecutive.tsx` | ProtectedRoute | Enterprise executive dashboard |
| `/enterprise/intelligence` | `ComplianceIntelligence.tsx` | ProtectedRoute | Enterprise compliance intelligence |

---

## QR-Protected Routes

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/temp/log` | `TempLogQuick.tsx` | QRAuthGuard | Quick temp entry via QR scan |
| `/temp-logs/scan` | `TempLogScan.tsx` | QRAuthGuard | QR scanner for temp logging |

---

## Core Dashboard Routes (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/dashboard` | `Dashboard.tsx` | Protected | Main dashboard — role-specific widgets |
| `/food-safety` | `FoodSafetyHub.tsx` | Protected | Food safety hub — pillar overview |
| `/compliance` | `ComplianceHub.tsx` | Protected | Compliance hub — scoring, trends |
| `/insights` | `InsightsHub.tsx` | Protected | Insights hub — analytics overview |
| `/tools` | `ToolsHub.tsx` | Protected | Tools hub — utility index |
| `/admin` | `AdminHome.tsx` / `AdminHub.tsx` | platform_admin | Admin dashboard (documented above) |

---

## Vendor Management (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/vendors` | `Vendors.tsx` | Protected | Vendor list — 3 tabs (List, Services, Scorecard) |
| `/vendors/:vendorId` | `VendorDetail.tsx` | Protected | Vendor detail — docs, contacts, services |
| `/marketplace` | `VendorMarketplace.tsx` | Protected | Vendor marketplace — browse providers |
| `/marketplace/vendor/:vendorSlug` | `VendorProfile.tsx` | Protected | Vendor profile in marketplace |
| `/marketplace/:vendorSlug` | `VendorProfile.tsx` | Protected | Vendor profile (alternate path) |

---

## Insurance & Risk (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/insurance-risk` | `InsuranceRisk.tsx` | Protected | Insurance risk assessment — CIC five-pillar view |
| `/improve-score` | `ImproveScore.tsx` | Protected | Score improvement recommendations |
| `/insurance-settings` | `InsuranceSettings.tsx` | Protected | Insurance configuration |
| `/workforce-risk` | `WorkforceRisk.tsx` | Protected | Workforce risk analysis (P5 pillar) |
| `/cic-pse` | `CicPseView.tsx` | Protected | PSE coverage & safeguards |

---

## AI & Intelligence (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/ai-advisor` | `AIAdvisor.tsx` | Protected | AI-powered compliance advisor chat |
| `/intelligence` | `IntelligenceHub.tsx` | Protected | Intelligence hub overview |
| `/insights/intelligence` | `BusinessIntelligence.tsx` | Protected | Business Intelligence — 4 format tabs (documented above) |
| `/copilot` | `CopilotInsights.tsx` | Protected | AI copilot insights |
| `/self-diagnosis` | `SelfDiagnosis.tsx` | Protected | Self-diagnosis assessment |

---

## Intelligence Superpowers (ProtectedLayout) — SUPERPOWERS-APP-01

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/insights/inspection-forecast` | `InspectionForecast.jsx` | Protected | SP1: Inspection window forecast based on jurisdiction frequency + last inspection date |
| `/insights/violation-radar` | `ViolationRadar.jsx` | Protected | SP2: Ranked violation risk list from CAs, temp failures, expired docs, overdue services |
| `/insights/trajectory` | `ComplianceTrajectory.jsx` | Protected | SP3: 90-day readiness history + 30/60/90 day linear projection (recharts) |
| `/insights/vendor-performance` | `VendorPerformance.jsx` | Protected | SP4: Vendor grade cards (A-F) — timeliness, cert quality, COI, reliability |
| `/insights/signals` | `JurisdictionSignals.jsx` | Protected | SP6: Real-time regulatory signal feed from intelligence_signals by county |
| `/insights/leaderboard` | `TeamLeaderboard.jsx` | Protected | SP7: Staff leaderboard — checklists (40) + temp logs (35) + CA speed (25) |

**SP5 (Shift Intelligence)** has no separate route — integrated into `/shift-handoff` via `ShiftSummaryCard`.

### Role Access (Superpowers)

| Route | Roles |
|-------|-------|
| `/insights/inspection-forecast` | owner_operator, executive, compliance_manager, kitchen_manager, chef, facilities_manager |
| `/insights/violation-radar` | owner_operator, executive, compliance_manager, kitchen_manager, chef |
| `/insights/trajectory` | owner_operator, executive, compliance_manager, kitchen_manager |
| `/insights/vendor-performance` | owner_operator, executive, compliance_manager, facilities_manager |
| `/insights/signals` | owner_operator, executive, compliance_manager |
| `/insights/leaderboard` | owner_operator, executive, compliance_manager, kitchen_manager |

---

## Reports & Analytics (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/reports` | `ReportCenter.tsx` | Protected | Report center — 12-card grid |
| `/reports/:slug` | `ReportDetail.tsx` | Protected | Individual report detail with PDF export |
| `/insights/reports` | `ClientReports.tsx` | Protected | Client-facing reports |
| `/analysis` | `Analysis.tsx` | Protected | Predictive analytics dashboard |
| `/referrals` | `ReferralDashboard.tsx` | Protected | Referral program dashboard |

---

## Compliance & Regulatory (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/facility-safety` | `FacilitySafety.tsx` | Protected | Facility Safety checklist (was Fire Safety) |
| `/food-recovery` | `FoodRecovery.tsx` | Protected | Food recovery tracking |
| `/sb1383` | `SB1383Compliance.tsx` | Protected | SB 1383 compliance tracker |
| `/k12` | `K12Compliance.tsx` | Protected | K-12 compliance module |
| `/usda/production-records` | `USDAProductionRecords.tsx` | Protected | USDA production records |
| `/compliance-index` | `ComplianceIndex.tsx` | Protected | Compliance index overview |
| `/compliance-overview` | `ComplianceOverview.tsx` | Protected | Compliance overview dashboard |
| `/compliance-trends` | `ComplianceTrends.tsx` | Protected | Compliance trend analysis |
| `/scoring-breakdown` | `ScoringBreakdown.tsx` | Protected | Score breakdown by category |
| `/benchmarks` | `Benchmarks.tsx` | Protected | Benchmarking against industry |
| `/health-dept-report` | `HealthDeptReport.tsx` | Protected | Health department report generator |
| `/jurisdiction` | `JurisdictionSettings.tsx` | Protected | Jurisdiction configuration |
| `/regulatory-alerts` | `RegulatoryAlerts.tsx` | Protected | Regulatory change alerts |

---

## Team & HR (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/team` | `Team.tsx` | Protected | Team management — roster, roles |
| `/employees` | `EmployeesPage.tsx` | Protected | Employee directory |
| `/employees/:id` | `EmployeeDetailPage.tsx` | Protected | Employee detail profile |
| `/timecards` | `Timecards.tsx` | Protected | Timecard management |
| `/timecards/alterations` | `TimecardAlterationsPage.tsx` | Protected | Timecard alteration requests |
| `/schedule` | `SchedulePage.tsx` | Protected | Shift scheduling |
| `/availability` | `AvailabilitySubmissionPage.tsx` | Protected | Submit availability |
| `/availability/team` | `TeamAvailabilityPage.tsx` | Protected | Team availability overview |
| `/availability/approvals` | `AvailabilityApprovalsPage.tsx` | Protected | Approve availability requests |
| `/performance` | `PerformanceMetricsPage.tsx` | Protected | Performance metrics dashboard |
| `/performance/me` | `MyPerformancePage.tsx` | Protected | Personal performance view |
| `/bonuses` | `BonusDashboardPage.tsx` | Protected | Bonus tracking dashboard |

---

## Settings (ProtectedLayout, nested under /settings)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/settings` | `SettingsPage.tsx` | Protected | Settings index → redirects to `/settings/company` |
| `/settings/company` | `CompanyProfilePage.tsx` | Protected | Company profile settings |
| `/settings/team-roles` | `TeamRolesPage.tsx` | Protected | Team roles configuration |
| `/settings/service-types` | `ServiceTypesPage.tsx` | Protected | Service type configuration |
| `/settings/notifications` | `NotificationsPage.tsx` | Protected | Notification preferences |
| `/settings/billing` | `BillingPage.tsx` | Protected | Billing & subscription |
| `/settings/branding` | `BrandingSettings.tsx` | Protected | Branding customization |
| `/settings/sensors` | `IoTSensorHub.tsx` | Protected | IoT sensor settings |
| `/settings/roles-permissions` | `RolesPermissions.tsx` | Protected | Role permissions management (owner/exec/admin only) |
| `/settings/integrations` | `SettingsIntegrationsPage.tsx` | Protected | Integration settings |
| `/settings/api-keys` | `IntegrationHub.tsx` | Protected | API key management |
| `/settings/webhooks` | `IntegrationHub.tsx` | Protected | Webhook configuration |
| `/settings/clock-reminders` | `ClockRemindersPage.tsx` | Protected | Clock-in/out reminders |

---

## Playbooks (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/playbooks` | `IncidentPlaybooks.tsx` | Protected | Playbook list — templates & active |
| `/playbooks/active/:id` | `PlaybookRunner.tsx` | Protected | Run active playbook |
| `/playbooks/builder` | `PlaybookBuilder.tsx` | Protected | Create/edit playbook |
| `/playbooks/analytics` | `PlaybookAnalytics.tsx` | Protected | Playbook usage analytics |
| `/playbooks/history/:id` | `PlaybookTimeline.tsx` | Protected | Playbook execution history |

---

## Quality, Safety & Inspections (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/alerts` | `Alerts.tsx` | Protected | Alert management |
| `/corrective-actions` | `CorrectiveActions.tsx` | Protected | Corrective action tracker |
| `/corrective-actions/:actionId` | `CorrectiveActionDetail.tsx` | Protected | CA detail view |
| `/deficiencies` | `Deficiencies.tsx` | Protected | Deficiency tracker |
| `/deficiencies/:deficiencyId` | `DeficiencyDetail.tsx` | Protected | Deficiency detail |
| `/self-audit` | `SelfAudit.tsx` | Protected | Self-inspection tool (41+ CalCode items) |
| `/self-inspection` | `SelfAudit.tsx` | Protected | Alias for self-audit |
| `/mock-inspection` | `MockInspection.tsx` | Protected | Mock inspection simulator |
| `/photo-evidence` | `PhotoEvidencePage.tsx` | Protected | Photo evidence gallery |
| `/audit-trail` | `AuditTrail.tsx` | Protected | System audit trail |
| `/audit-report` | `AuditReport.tsx` | Protected | Audit report generator |
| `/inspector-view` | `InspectorView.tsx` | Protected | Inspector-facing view |
| `/quality/callbacks` | `CallbacksPage.tsx` | Protected | Quality callbacks |
| `/equipment/incidents` | `EquipmentIncidentsPage.tsx` | Protected | Equipment incident log |
| `/safety/incidents` | `IncidentReportsPage.tsx` | Protected | Safety incident reports |
| `/safety/incidents/new` | `ReportIncidentPage.tsx` | Protected | Report new incident |
| `/safety/incidents/:id` | `IncidentDetailPage.tsx` | Protected | Incident detail |

---

## Inventory, Fleet & Emergency (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/inventory` | `InventoryPage.tsx` | Protected | Inventory management |
| `/inventory/requests` | `InventoryRequestsPage.tsx` | Protected | Inventory requests |
| `/inventory/:id` | `InventoryItemPage.tsx` | Protected | Inventory item detail |
| `/fleet` | `VehiclesPage.tsx` | Protected | Fleet management |
| `/fleet/:id` | `VehicleDetailPage.tsx` | Protected | Vehicle detail |
| `/insurance` | `InsurancePage.tsx` | Protected | Insurance policies |
| `/insurance/:id` | `InsurancePolicyPage.tsx` | Protected | Insurance policy detail |
| `/emergency` | `EmergencyInfoPage.tsx` | Protected | Emergency information |

---

## Integrations & Developer (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/integrations` | `IntegrationHub.tsx` | Protected | Integration hub |
| `/developers` | `DeveloperPortal.tsx` | Protected | Developer portal |
| `/services` | `ServicesPage.tsx` | Protected | Service records |
| `/services/:recordId` | `ServiceRecordDetail.tsx` | Protected | Service record detail |
| `/import` | `ImportData.tsx` | Protected | Data import tool |

---

## Miscellaneous Protected Routes (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/documents` | `Documents.tsx` | Protected | Document management |
| `/document-checklist` | `DocumentChecklist.tsx` | Protected | Document checklist |
| `/calendar` | `Calendar.tsx` | Protected | Calendar view |
| `/org-hierarchy` | `OrgHierarchy.tsx` | Protected | Organization hierarchy |
| `/help` | `HelpSupport.tsx` | Protected | Help & support |
| `/weekly-digest` | `WeeklyDigest.tsx` | Protected | Weekly compliance digest |

---

## Admin Routes — RequireAdmin (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/admin/onboarding` | `AdminClientOnboarding.tsx` | platform_admin | Client onboarding management |
| `/admin/usage-analytics` | `UsageAnalytics.tsx` | platform_admin | Platform usage analytics |
| `/admin/billing` | `AdminBilling.tsx` | platform_admin | Admin billing management |
| `/admin/crawl-monitor` | `AdminCrawlMonitor.tsx` | platform_admin | Crawl engine monitor |
| `/admin/rfp-monitor` | `RfpIntelligence.tsx` | platform_admin | RFP intelligence monitor |
| `/admin/messages` | `SystemMessages.tsx` | platform_admin | System messages |
| `/admin/k2c` | `AdminK2C.tsx` | platform_admin | Kitchen to Community admin |
| `/admin/backup` | `DatabaseBackup.tsx` | platform_admin | Database backup |
| `/admin/maintenance` | `MaintenanceMode.tsx` | platform_admin | Maintenance mode toggle |
| `/admin/security-settings` | `SecuritySettings.tsx` | platform_admin | Security settings |
| `/admin/vault` | `DocumentVault.tsx` | platform_admin | Document vault |
| `/admin/event-log` | `EventLog.tsx` | platform_admin | Event log viewer |
| `/admin/users` | `AdminUsers.tsx` | platform_admin | User management |
| `/admin/security` | `AdminSecurity.tsx` | platform_admin | Security dashboard |
| `/admin/audit-log` | `AdminAuditLog.tsx` | platform_admin | Audit log viewer |
| `/admin/orgs` | `AdminOrgs.tsx` | platform_admin | Organization management |
| `/admin/user-provisioning` | `UserProvisioning.tsx` | platform_admin | User provisioning |
| `/admin/support` | `SupportTickets.tsx` | platform_admin | Support tickets |
| `/admin/remote-connect` | `RemoteConnect.tsx` | platform_admin | Remote connect tool |
| `/admin/staff` | `StaffRoles.tsx` | platform_admin | Staff role management |
| `/admin/intelligence` | `EvidLYIntelligence.tsx` | platform_admin | Intelligence dashboard |
| `/admin/reports` | `AdminReports.tsx` | platform_admin | Admin reports |
| `/admin/verification` | `VerificationReport.tsx` | platform_admin | Verification reports |
| `/admin/system/edge-functions` | `EdgeFunctions.tsx` | platform_admin | Edge function monitor |
| `/admin/feature-flags` | `FeatureFlags.tsx` | platform_admin | Feature flag management |
| `/admin/regulatory-changes` | `AdminRegulatoryChanges.tsx` | platform_admin | Regulatory change tracking |
| `/admin/intelligence-admin` | `IntelligenceAdmin.tsx` | platform_admin | Intelligence signal management |
| `/admin/jurisdiction-intelligence` | `JurisdictionIntelligence.tsx` | platform_admin | Jurisdiction intelligence engine |
| `/admin/configure` | `ConfigureAdmin.tsx` | platform_admin | Platform configuration |
| `/admin/emulate` | `UserEmulation.tsx` | platform_admin | User emulation tool |
| `/admin/demo/dashboard` | `DemoDashboard.tsx` | platform_admin | Demo dashboard |
| `/admin/command-center` | `CommandCenter.tsx` | platform_admin | Command center |
| `/admin/api-keys` | `InsuranceApiKeys.tsx` | platform_admin | Insurance API keys |
| `/admin/role-preview` | `RolePreview.tsx` | platform_admin | Role preview (no layout) |
| `/iot-platform` | `IoTSensorPlatform.tsx` | platform_admin | IoT platform admin |
| `/sensors` | `SensorHub.tsx` | platform_admin | Sensor hub |
| `/sensors/add` | `SensorSetupWizard.tsx` | platform_admin | Sensor setup wizard |
| `/sensors/:id` | `SensorDetail.tsx` | platform_admin | Sensor detail |

---

## Admin Routes — SalesGuard (ProtectedLayout)

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/admin/demo-generator` | `DemoGenerator.tsx` | Sales | Demo environment generator |
| `/admin/demo-launcher` | `DemoLauncher.tsx` | Sales | Demo session launcher |
| `/admin/demo-pipeline` | `DemoPipeline.tsx` | Sales | Demo pipeline tracker |
| `/admin/gtm` | `GtmDashboard.tsx` | Sales | Go-to-market dashboard |
| `/admin/kitchen-checkup` | `AssessmentLeads.tsx` | Sales | Kitchen checkup leads |
| `/admin/leads` | `AssessmentLeads.tsx` | Sales | Assessment leads (alias) |
| `/admin/scoretable` | `AdminScoreTable.tsx` | Sales | Score table admin |
| `/admin/campaigns` | `MarketingCampaigns.tsx` | Sales | Marketing campaigns |
| `/admin/sales` | `SalesPipeline.tsx` | Sales | Sales pipeline |
| `/admin/violation-outreach` | `ViolationOutreach.tsx` | Sales | Violation outreach tool |

---

## Redirect Aliases

| Path | Redirect Target | Notes |
|------|-----------------|-------|
| `/admin/onboard-client` | `/admin/onboarding` | Legacy alias |
| `/admin/emulation` | `/admin/emulate` | Legacy alias |
| `/admin/regulatory` | `/admin/regulatory-changes` | Shortcut |
| `/admin/rfp` | `/admin/rfp-monitor` | Shortcut |
| `/admin/rfp-intelligence` | `/admin/rfp-monitor` | Legacy alias |
| `/admin/jurisdiction-intel` | `/admin/jurisdiction-intelligence` | Shortcut |
| `/admin/demos` | `/admin/demo-pipeline` | Shortcut |
| `/admin/assessments` | `/admin/kitchen-checkup` | Legacy alias |
| `/admin/home` | `/admin` | Shortcut |
| `/admin/dashboard` | `/admin` | Shortcut |
| `/admin/intelligence-queue` | `/admin/intelligence-admin` | Legacy alias |
| `/checkup` | `/dashboard` | Redirect (checkup moved to /assessment) |
| `/incident-playbook` | `/playbooks` | Legacy alias |
| `/regulatory-tracking` | `/regulatory-alerts` | Legacy alias |
| `/ai-insights` | `/ai-advisor` | Legacy alias |
| `/analytics` | `/analysis` | Legacy alias |
| `/daily-operations` | `/dashboard` | Legacy alias |
| `/locations` | `/org-hierarchy` | Legacy alias |
| `/inspections` | `/self-audit` | Legacy alias |
| `/certifications` | `/training/certificates` | Legacy alias |
| `/sensor-dashboard` | `/sensors` | Legacy alias |
| `/regulatory-updates` | `/intelligence` | Legacy alias |
| `/support/survey/:token` | `SurveyPage.tsx` | Support survey (standalone) |

---

## Route Statistics

| Category | Count |
|----------|-------|
| Public routes (no auth) | ~30 |
| Auth routes | 12 |
| QR-protected routes | 2 |
| Protected no-layout routes | ~25 |
| Protected with layout (ProtectedLayout) | ~126 |
| Admin routes (RequireAdmin) | ~35 |
| Sales-guarded admin routes | 10 |
| Redirect aliases | ~22 |
| **Total route declarations** | **~176** |
