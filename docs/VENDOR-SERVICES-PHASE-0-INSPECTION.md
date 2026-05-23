# VENDOR-SERVICES Phase 0 Inspection

> **Type:** TIER 0 -- read-only audit
> **Date:** 2026-05-10
> **Scope:** Vendor & Services module -- current state, gaps, and rebuild readiness
> **Output:** Structured report for Week 2 launch tracker

---

## 1. Primary Page File & Location

| Item | Value |
|---|---|
| **Expected file** | `VendorServices.tsx` |
| **Actual file** | `src/pages/ServicesPage.tsx` |
| **LOC** | 666 |
| **Route** | `/services` (protected layout, user route) |
| **Detail route** | `/services/:recordId` -> `ServiceRecordDetail` |

**Key issue:** ServicesPage renders **demo-only data** in demo mode and a **bare empty state** for authenticated users. Zero real Supabase queries in the page itself -- all data comes from `DEMO_SERVICE_RECORDS`, `demoVendors`, `demoLocations` imports.

---

## 2. Route Map (All Vendor + Service Routes)

### Vendor Routes (14)
| Path | Component | Context |
|---|---|---|
| `/vendors` | Vendors | Protected layout -- vendor list |
| `/vendors/:vendorId` | VendorDetail | Protected layout -- vendor detail |
| `/vendor/login` | VendorLogin | Public -- vendor auth |
| `/vendor/register` | VendorRegister | Public -- vendor self-registration |
| `/vendor/upload/:token` | VendorSecureUpload | Public -- token-gated doc upload |
| `/vendor/invite/:code` | VendorInviteLanding | Public -- invite acceptance |
| `/vendor/schedule/:token` | VendorScheduleResponse | Public -- schedule confirmation |
| `/vendor/dashboard` | VendorDashboard | Protected -- vendor-role dashboard |
| `/vendor/partner-dashboard` | VendorPartnerDashboard | Protected -- partner dashboard |
| `/vendor/setup` | VendorSetup | Protected -- vendor onboarding |
| `/vendor-connect/apply` | VendorConnectApply | Public -- marketplace application |
| `/marketplace/:vendorSlug` | VendorProfile | Protected -- marketplace profile |
| `/marketplace/vendor/:vendorSlug` | VendorProfile | Protected -- duplicate route |
| `/admin/vendor-connect` | AdminVendorConnect | Admin-only |

### Service Routes (4)
| Path | Component | Context |
|---|---|---|
| `/services` | ServicesPage | Protected -- main services page |
| `/services/:recordId` | ServiceRecordDetail | Protected -- record detail |
| `/equipment/:equipmentId/service/new` | ServiceRecordEntry | Protected -- log service from equipment |
| `/settings/service-types` | ServiceTypesPage | Protected -- service type config |

---

## 3. Schema -- Existing Tables (15+ vendor/service tables)

### Core Service Tables
| Table | Migration | Purpose |
|---|---|---|
| `vendor_service_records` | 20260802000000 | PSE safeguard event tracking (hood, fire, alarm, sprinklers). Written by hoodops-webhook. |
| `service_type_definitions` | 20260801000000 | 7 service codes: KEC, FPM, GFX, RGC, FS, FA, SP with NFPA citations |
| `location_service_schedules` | (via hoodops-webhook upsert) | Per-location service schedule with next_due_date, frequency, vendor, price |
| `service_reschedule_requests` | (migration exists) | Reschedule workflow: pending -> confirmed/declined/canceled/expired |

### Vendor Entity Tables
| Table | Migration | Purpose |
|---|---|---|
| `vendors` | 20260205175243 | Vendor company info; email UNIQUE constraint |
| `vendor_users` | 20260205175243 | Maps auth.users -> vendors |
| `vendor_client_relationships` | 20260205175243 | Links vendors -> organizations |
| `vendor_upload_requests` | 20260205175243 | Document upload request tracking |

### Vendor Documents
| Table | Migration | Purpose |
|---|---|---|
| `vendor_documents` | 20260407000000 | Versioned doc tracking with review status + AI classification |
| `vendor_document_notifications` | 20260407000000 | Upload/expiration notification tracking |
| `vendor_document_reviews` | 20260407000000 | Review actions (accept/flag) |

### Marketplace Tables
| Table | Migration | Purpose |
|---|---|---|
| `marketplace_vendors` | 20260211100000 | Extended vendor profiles |
| `marketplace_services` | 20260211100000 | Services offered by marketplace vendors |
| `marketplace_reviews` | 20260211100000 | Operator reviews |
| `marketplace_credentials` | 20260211100000 | Verified credentials |
| `marketplace_service_requests` | 20260211100000 | Quote/booking requests |
| `marketplace_vendor_metrics` | 20260211100000 | Cached performance metrics |

### Tables That DO NOT Exist
| Requested Table | Status | Notes |
|---|---|---|
| `vendor_services` | **NOT FOUND** | Architecture uses `vendor_service_records` + `location_service_schedules` instead |
| `vendor_service_assignments` | **NOT FOUND** | No assignment pattern in schema |
| `vendor_business_documents` | **NOT FOUND** | Superseded by `vendor_documents` (20260407) |

---

## 4. Hooks / Data Layer

### Existing Hooks
| Hook | Table(s) | Returns | Notes |
|---|---|---|---|
| `useVendorServiceRecords` | `vendor_service_records` | `Map<string, VendorServiceRecord>` keyed by safeguard_type | Filters: org_id + location_id + is_sample=false + 4 safeguard types |
| `usePSESchedules` | `location_service_schedules` | `PSESafeguard[]` | Filters: KEC + FS codes, is_active=true. Fire Alarm & Sprinklers hardcoded as 'unverified' |
| `useRescheduleRequests` | `service_reschedule_requests` + `location_service_schedules` | requests[] + mutation fns | submit/confirm/cancel reschedule workflow |
| `useCustomVendors` | (vendor tables) | Custom vendor list | Vendor CRUD |
| `useCreateVendor` | (vendor tables) | Mutation fn | Single vendor creation |
| `useVendorSubmissions` | (vendor tables) | Submission data | Vendor doc submissions |
| `useVendorContacts` | (vendor tables) | Contact list | Vendor contact management |
| `useServiceRequests` | (service tables) | Request data | Service request management |

### Missing Hooks (Referenced in code or expected)
| Hook | Purpose | Gap Impact |
|---|---|---|
| `useVendors` | Canonical vendor list for org | No single hook to fetch all vendors |
| `useVendorServices` | Services assigned to a vendor | No way to view vendor's service portfolio |
| `useVendorDocsHealth` | Document compliance status per vendor | No aggregate doc health view |
| `sortServices` | Service list sorting utility | ServicesPage has no sort logic for real data |

---

## 5. Components Inventory

### Existing Components (9)
| Component | File | Purpose |
|---|---|---|
| `VendorServiceWidgets` | `src/components/dashboard/VendorServiceWidgets.tsx` | AnnualVendorSpendWidget + ServicesDueSoonWidget. Queries `location_service_schedules`. |
| `VendorNotification` | `src/components/diagnosis/VendorNotification.tsx` | Demo-mode vendor notification UI |
| `VendorServiceSummary` | `src/components/reports/VendorServiceSummary.tsx` | Report: service history + doc compliance |
| `VendorPerformanceCard` | `src/components/superpowers/VendorPerformanceCard.jsx` | Vendor scoring card (A-F grades) |
| `VendorCombobox` | `src/components/temp-logs/VendorCombobox.tsx` | Vendor selector dropdown |
| `ServiceComplianceList` | `src/components/services/ServiceComplianceList.jsx` | Service compliance listing |
| `ServiceExpenseTracker` | `src/components/services/ServiceExpenseTracker.jsx` | Service cost tracking |
| `ServiceCostPanel` | `src/components/intelligence/ServiceCostPanel.tsx` | Service cost analysis |
| `ServiceTypeFormModal` | `src/components/settings/ServiceTypeFormModal.tsx` | Service type CRUD form |

### Missing Components
| Component | Purpose | Gap Impact |
|---|---|---|
| `VendorDocsPanel` | Vendor document health overview | No aggregate doc compliance view |
| `ServiceCard` | Individual service record card | ServicesPage uses inline table rows, no reusable card |
| `AllServicesView` | Full services grid/list for authenticated users | ServicesPage empty state for non-demo users |

### Missing Handlers / Actions
| Handler | Purpose | Gap Impact |
|---|---|---|
| `acknowledge` | Mark service record as acknowledged | No operator confirmation flow |
| `defer` | Defer overdue service | No deferral tracking |
| `assignVendor` | Assign vendor to service type at location | No assignment workflow |
| `applyTemplate` | Apply industry template to location | Templates exist in config but no apply action |

---

## 6. Config Files

### vendorCategories.ts -- 11 Categories
| ID | Name | Required Services |
|---|---|---|
| `kitchen_exhaust` | Kitchen Exhaust Cleaning | Hood Cleaning (required) + Fan Performance, Grease Filter, Rooftop Grease (optional) |
| `fire_suppression` | Fire Suppression | Fire Suppression Inspection & Service (required) |
| `fire_extinguisher` | Fire Extinguisher Service | Fire Extinguisher Inspection & Service (required) |
| `pest_control` | Pest Control | Pest Control Service (required) |
| `grease_trap` | Grease Trap / Interceptor | Grease Trap Pumping (required) |
| `backflow` | Backflow Prevention | Backflow Prevention Testing (required) |
| `hvac` | HVAC | HVAC Service & Maintenance (optional) |
| `alarm_system` | Alarm System | Alarm System Inspection & Service (optional) |
| `equipment_repair` | Cooking Equipment Repair | Cooking Equipment Repair (optional) |
| `oil_removal` | Used Cooking Oil Removal | Used Cooking Oil Removal (optional) |
| `elevator_inspection` | Elevator Inspection | Elevator Inspection & Certification (required) + Elevator Maintenance (optional) |

**8 categories with >=1 required service. 3 categories optional-only (hvac, equipment_repair, oil_removal).**

Helpers: `getCategoryById()`, `getRequiredCategories()`, `getRequiredServices()`, `getCategoryForServiceType()`

### industryTemplates.ts -- 6 Presets
| ID | Name | Items | Vendor Services Included |
|---|---|---|---|
| `restaurant-full` | Restaurant (Full-Service) | 16 | Hood (quarterly), Fire Suppression (semi-annual), Grease Trap (quarterly) |
| `restaurant-quick` | Restaurant (Quick-Service) | 15 | Hood (quarterly), Fire Suppression (semi-annual); Grease Trap optional |
| `hotel` | Hotel | 17 | Hood (quarterly), Fire Suppression (semi-annual), Grease Trap (quarterly) |
| `healthcare` | Healthcare / Senior Living | 20 | Hood (quarterly), Fire Suppression (semi-annual), Grease Trap (quarterly) |
| `education` | Education (K-12) | 17 | Hood (quarterly), Fire Suppression (semi-annual), Grease Trap (quarterly) |
| `catering` | Catering | 14 | Hood (quarterly), Fire Suppression (semi-annual); no grease trap |

Template categories: `temperature_logs`, `checklists`, `vendor_services`, `documents`

### pseStatus.ts -- PSE Calendar-Month Logic

```
Type:     PSEStatus = 'current' | 'overdue' | 'at_risk'
Function: calculatePSEStatus(nextDue: Date, today?: Date): PSEStatus

Logic:
  - 'current'  -> today is before nextDue
  - 'overdue'  -> today is on/past nextDue, still in same calendar month
  - 'at_risk'  -> today's calendar month >=1 month past nextDue's month

Boundaries computed in UTC. Callers needing kitchen-local months
should pre-normalize via canonicalTime.ts.
```

### vendorPerformance.ts -- Vendor Scoring (A-F)

```
Scoring (100 pts max):
  Timeliness:         40 pts -- % services completed on/before due date
  Cert Quality:       30 pts -- % vendor docs not expired
  COI Current:        15 pts -- binary: has >=1 valid COI/insurance doc
  No Missed Services: 15 pts -- 15 if zero overdue; else max(0, 15 - (overdue x 5))

Grade thresholds: A >=90 | B >=80 | C >=70 | D >=60 | F <60
Trend: always 'stable' (no historical comparison implemented)
```

---

## 7. Demo vs Live Data Handling

| Component | Demo Mode | Live Mode |
|---|---|---|
| **ServicesPage** | Renders DEMO_SERVICE_RECORDS + demoVendors + demoLocations. Full UI: status grid, filter bar, history table, log modal. | Bare empty state: "No Service Records Yet" -- no Supabase queries at all. |
| **VendorServiceWidgets** | Returns demo data via useApiQuery pattern | Self-fetches `location_service_schedules` from Supabase |
| **ServicesDueSoonWidget** | Demo data | Queries `location_service_schedules` with `.limit(10)` |
| **PSESafeguardsSection** | Demo data via hook | Queries `vendor_service_records` via `useVendorServiceRecords` |

**Critical gap:** ServicesPage is the only top-level page that has ZERO real data integration. All other vendor/service components (widgets, PSE section, intelligence engine) query real Supabase tables.

---

## 8. Calendar Integration

| Item | Value |
|---|---|
| **File** | `src/pages/Calendar.tsx` (1,187 LOC) |
| **Table** | `calendar_events` (exists in PROD with RLS) |
| **Views** | Day / Week / Month |
| **Service events** | Not currently writing service due dates to `calendar_events` |
| **Gap** | `location_service_schedules.next_due_date` is not synced to calendar -- services due soon are only visible in ServicesDueSoonWidget, not on the calendar |

---

## 9. Edge Functions / Webhooks

### Existing Functions That Touch Service Data
| Function | Tables Written | Trigger |
|---|---|---|
| `hoodops-webhook` | `vendor_service_records` (upsert), `location_service_schedules` (upsert) | HoodOps webhook: service.completed, service.scheduled, reschedule.confirmed |
| `ops-intelligence-generate` | Reads `vendor_service_records` | Generates PSE safeguard insights (missing, overdue, due_soon, current) |
| `process-service-reminders` | Reads `vendor_service_records` | Sends reminders at 30d/14d/7d/3d/1d cadence |
| `vendor-notification-sender` | Reads vendor data | Delivers vendor notifications |
| `api-v1-locations-compliance` | Reads `location_service_schedules` | Public API compliance export |
| `api-v1-locations-schedule` | Reads `location_service_schedules` | Public API schedule export |

### Data Flow

```
HoodOps webhook
  -> hoodops-webhook edge function
    -> upsert vendor_service_records (event log)
    -> upsert location_service_schedules (schedule state)

process-service-reminders (cron)
  -> reads vendor_service_records
  -> sends email/push reminders

ops-intelligence-generate (cron/manual)
  -> reads vendor_service_records
  -> generates intelligence insights
```

---

## 10. Files Referencing Key Tables

### vendor_service_records (8 files)
1. `supabase/functions/hoodops-webhook/index.ts` -- upsert on webhook
2. `supabase/functions/ops-intelligence-generate/index.ts` -- read for insights
3. `supabase/functions/process-service-reminders/index.ts` -- read for reminders
4. `supabase/functions/vendor-notification-sender/index.ts` -- read for notifications
5. `src/hooks/useVendorServiceRecords.ts` -- client-side hook
6. `src/lib/standingQueries.ts` -- standing/persistent queries
7. `src/lib/__tests__/opsIntelligenceEngine.test.ts` -- unit tests
8. `src/components/facility-safety/PSESafeguardsSection.tsx` -- PSE display

### location_service_schedules (6 files)
1. `supabase/functions/hoodops-webhook/index.ts` -- upsert on webhook
2. `supabase/functions/api-v1-locations-compliance/index.ts` -- API export
3. `supabase/functions/api-v1-locations-schedule/index.ts` -- API export
4. `src/hooks/useRescheduleRequests.ts` -- reschedule workflow
5. `src/hooks/usePSESchedules.ts` -- PSE safeguard status
6. `src/components/dashboard/VendorServiceWidgets.tsx` -- dashboard widgets

---

## 11. Gap Analysis & Rebuild Scope

### CRITICAL GAPS (Block live usage)
| # | Gap | Impact | Tables Exist? |
|---|---|---|---|
| G1 | ServicesPage has zero real data integration | Auth users see empty state only, cannot view/manage services | Yes -- `vendor_service_records` + `location_service_schedules` exist |
| G2 | No "assign vendor to service" workflow | Cannot link vendors to service types at locations | No assignment table exists |
| G3 | No "apply industry template" action | Templates defined in config but no code to apply them to a location | Config exists, no handler |
| G4 | Log Service modal writes to React state only | Service logging in demo mode does not persist | Table exists but modal does not write to it |

### HIGH GAPS (Degrade experience)
| # | Gap | Impact |
|---|---|---|
| G5 | Service due dates not synced to Calendar | Users must check two places for upcoming services |
| G6 | No VendorDocsPanel -- aggregate doc health view missing | Cannot see at-a-glance which vendors have expired docs |
| G7 | computeServiceStatus() in ServicesPage uses days-based logic, not calendar-month PSE logic from pseStatus.ts | Inconsistent status calculation between page and rest of system |
| G8 | No acknowledge/defer handlers for service records | Cannot mark overdue items as acknowledged or deferred |

### LOW GAPS (Polish)
| # | Gap | Impact |
|---|---|---|
| G9 | vendorPerformance.ts trend always returns 'stable' | No historical comparison -- grade trend is meaningless |
| G10 | Duplicate marketplace route (`/marketplace/:slug` and `/marketplace/vendor/:slug`) | Minor route confusion |
| G11 | Fire Alarm & Sprinklers hardcoded as 'unverified' in usePSESchedules | No service codes mapped for these safeguard types |

### Rebuild Priority Order (Suggested)
1. **Wire ServicesPage to real data** -- replace demo imports with hooks querying `vendor_service_records` + `location_service_schedules`
2. **Build assign-vendor workflow** -- new table or extend `location_service_schedules` with vendor assignment
3. **Wire apply-template action** -- use `industryTemplates.ts` config to seed `location_service_schedules` rows
4. **Align status logic** -- replace `computeServiceStatus()` with `calculatePSEStatus()` from `pseStatus.ts`
5. **Log Service -> Supabase** -- write to `vendor_service_records` instead of local state
6. **Calendar sync** -- write `location_service_schedules.next_due_date` to `calendar_events`
7. **VendorDocsPanel** -- aggregate view of `vendor_documents` health per vendor
8. **Acknowledge/defer handlers** -- add columns to `vendor_service_records` or new tracking table

---

## File Inventory Summary

| Category | Count | Files |
|---|---|---|
| Pages | 2 | ServicesPage.tsx (666 LOC), Calendar.tsx (1,187 LOC) |
| Hooks | 8 | useVendorServiceRecords, usePSESchedules, useRescheduleRequests, useCustomVendors, useCreateVendor, useVendorSubmissions, useVendorContacts, useServiceRequests |
| Components | 9 | VendorServiceWidgets, VendorNotification, VendorServiceSummary, VendorPerformanceCard, VendorCombobox, ServiceComplianceList, ServiceExpenseTracker, ServiceCostPanel, ServiceTypeFormModal |
| Config | 4 | vendorCategories.ts, industryTemplates.ts, pseStatus.ts, vendorPerformance.ts |
| Edge Functions | 6 | hoodops-webhook, ops-intelligence-generate, process-service-reminders, vendor-notification-sender, api-v1-locations-compliance, api-v1-locations-schedule |
| Schema Tables | 17 | vendor_service_records, location_service_schedules, service_type_definitions, service_reschedule_requests, vendors, vendor_users, vendor_client_relationships, vendor_upload_requests, vendor_documents, vendor_document_notifications, vendor_document_reviews, marketplace_vendors, marketplace_services, marketplace_reviews, marketplace_credentials, marketplace_service_requests, marketplace_vendor_metrics |

---

*End of Phase 0 Inspection. No code changes made. Awaiting Phase 1 scope prompt.*
