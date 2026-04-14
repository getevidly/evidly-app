# EvidLY Unlisted Code Report

**Generated:** 2026-04-13
**Purpose:** Identify code in the codebase that is NOT listed in the EvidLY Complete Feature Guide

---

## HoodOps Contamination (REMOVE)

These files belong to HoodOps PRO, not EvidLY. Routes were removed in commit `fbb989c` but the page/component/hook files remain.

### Pages (src/pages/)

| File | Status |
|------|--------|
| fleet/FleetDashboard.tsx | REMOVE |
| fleet/VehicleDetail.tsx | REMOVE |
| fleet/Vehicles.tsx | REMOVE |
| insurance/InsuranceVehicle.tsx | REMOVE |
| EmergencyInfoPage.tsx | REMOVE |
| availability/AvailabilityPage.tsx | REMOVE |
| bonuses/BonusesPage.tsx | REMOVE |
| performance/PerformancePage.tsx | REMOVE |
| quality/QualityCallbacksPage.tsx | REMOVE |
| inventory/InventoryPage.tsx | REMOVE |
| safety/SafetyIncidentsPage.tsx | REMOVE |
| equipment/EquipmentIncidentsPage.tsx | REMOVE |
| settings/ClockRemindersPage.tsx | REMOVE |
| TimecardAlterationsPage.tsx | REMOVE |
| Employees.tsx | REMOVE |
| EmployeeDetail.tsx | REMOVE |
| Timecards.tsx | REMOVE |

### Components (src/components/)

| File/Directory | Status |
|---------------|--------|
| timecards/* | REMOVE — all timecard components |
| employees/* | REMOVE — all employee components |
| fleet/* | REMOVE — all fleet components |
| insurance/* | REMOVE — all insurance components |
| inventory/* | REMOVE — all inventory components |
| availability/* | REMOVE — all availability components |
| schedule/JobCard.tsx | REMOVE |
| schedule/JobDetail.tsx | REMOVE |
| schedule/JobList.tsx | REMOVE |
| reports/HoodOpsReportCard.tsx | REMOVE |
| reports/JobsSummaryReport.tsx | REMOVE |
| reports/TimecardSummaryReport.tsx | REMOVE |
| reports/ProfitabilityReport.tsx | REMOVE |

### Hooks (src/hooks/)

| File | Status |
|------|--------|
| useVehicles.ts | REMOVE |
| useTimecards.ts | REMOVE |
| useEmployees.ts | REMOVE |
| useBonuses.ts | REMOVE |
| useAvailability.ts | REMOVE |
| useClockReminders.ts | REMOVE |
| useInventory.ts | REMOVE |

### Edge Functions (supabase/functions/)

| Function | Status |
|----------|--------|
| hoodops-webhook/ | REVIEW — may be referenced externally |
| generate-job-report/ | REVIEW — confirm no external consumers |
| generate-service-report/ | REVIEW — confirm no external consumers |

---

## Unlisted But Legitimate (KEEP)

These pages/components exist in the codebase but are not in the Feature Guide. They are legitimate EvidLY functionality that should be added to the Feature Guide.

### Admin Pages

| File | Purpose |
|------|---------|
| AdminHome.tsx | Admin landing page |
| AdminCrawlMonitor.tsx | Crawl health monitoring |
| AdminScoreTable.tsx | ScoreTable admin management |
| AdminTestimonials.tsx | Testimonial management |
| AdminVendorConnect.jsx | Vendor connection admin |
| AdminReports.tsx | Admin reporting |
| CommandCenter.tsx | Operational command center |
| Configure.tsx | Platform configuration |
| DatabaseBackup.tsx | Database backup management |
| DemoGenerator.tsx | Demo environment generator |
| DemoDashboard.tsx | Demo session analytics |
| DemoLauncher.tsx | Demo deployment |
| DemoPipeline.tsx | Demo-to-close pipeline |
| DemoTours.jsx | Guided tour management |
| DocumentVault.tsx | Secure document storage |
| EventLog.tsx | System event log |
| FeatureFlags.tsx | Feature gate management |
| GuidedTours.tsx | Guided tour builder |
| InsuranceApiKeys.tsx | Insurance API key management |
| IntelligenceAdmin.tsx | Intelligence configuration |
| JurisdictionIntelligence.tsx | Jurisdiction monitoring |
| MaintenanceMode.tsx | Maintenance mode toggle |
| PartnerDemos.jsx | Partner demo management |
| RemoteConnect.tsx | Remote session management |
| RfpIntelligence.tsx | RFP tracking |
| SecuritySettings.tsx | Security policy management |
| StaffRoles.tsx | Role configuration |
| SupportTickets.tsx | Internal ticketing |
| SurveyPage.tsx | Survey management |
| SystemMessages.tsx | Broadcast messaging |
| TrialHealth.tsx | Trial health monitoring |
| UserEmulation.tsx | Admin impersonation |
| UserProvisioning.tsx | Bulk user creation |
| VerificationReport.tsx | Verification coverage |
| ViolationOutreach.tsx | Violation outreach automation |

### Settings Pages

| File | Purpose |
|------|---------|
| SettingsPage.tsx | Main settings hub |
| CompanyProfilePage.tsx | Organization profile |
| IntegrationsPage.tsx | Integration configuration |
| NotificationsPage.tsx | Notification preferences |
| TeamRolesPage.tsx | Team role management |

---

## Anti-Patterns by Directory

| Directory | Inline Styles | Hex Colors | Ungated Demo Data |
|-----------|--------------|------------|-------------------|
| src/pages/admin/ | ~320 | ~480 | ~35 |
| src/pages/ (non-admin) | ~180 | ~290 | ~25 |
| src/components/ | ~380 | ~510 | ~40 |
| src/pages/settings/ | ~60 | ~90 | ~5 |
| src/pages/public/ | ~68 | ~104 | ~5 |

**Total: ~1,008 inline styles, ~1,474 hex colors, ~110 ungated demo data instances**

---

## Recommended Actions

1. **Delete all REMOVE files** — HoodOps contamination with no active routes
2. **Review 3 edge functions** — Confirm no external webhook consumers before deleting
3. **Update Feature Guide** — Add the 35+ unlisted-but-legitimate admin pages
4. **Continue P3 style migration** — Convert remaining inline styles and hex colors to Tailwind tokens
