# EvidLY Route Map

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
| `/iot/platform` | `IoTSensorPlatform.tsx` | IoT Platform — defrost, door events, cooling logs |
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
