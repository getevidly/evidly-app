# EvidLY Route Map

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
