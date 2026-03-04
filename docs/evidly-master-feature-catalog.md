# EvidLY Master Feature Catalog

## Document Workflow — Vendor Config

**Module:** Vendor Document Management
**Status:** Audited & Fixed (2026-03-04)
**Migration:** `20260304040000_vendor_document_rls_vendor_scoping.sql`

### Feature Summary

The vendor document workflow handles uploads from external service providers (hood cleaners, pest control, fire suppression vendors, etc.) via two channels:

1. **Vendor Secure Upload** — token-based link sent to vendor email, no auth required
2. **Smart Upload Modal** — in-app AI-classified upload by internal staff

### Document Types Supported

| Pillar | Document Types |
|--------|---------------|
| Facility Safety | hood_cleaning_cert, fire_suppression_report, fire_extinguisher_tag, ansul_cert, exhaust_fan_service, building_fire_inspection |
| Food Safety | health_permit, food_handler_cert, food_manager_cert, haccp_plan, allergen_training, pest_control_report |
| Vendor | vendor_coi, vendor_licenses, service_agreements |
| Facility | business_license, certificate_occupancy, grease_trap_records, backflow_test |

### Audit Findings & Corrective Actions

| # | Finding | Severity | Corrective Action | Status |
|---|---------|----------|-------------------|--------|
| 1 | `vendor_documents` RLS was organization-scoped only — any user in the org could query ALL vendor documents. Vendor-portal users could see other vendors' documents. | HIGH | Added `linked_vendor_id` column to `user_profiles`. Replaced SELECT/INSERT/UPDATE policies with vendor-scoping: vendor-portal users see only their own docs; internal org users retain full access. | FIXED |
| 2 | `vendor_document_notifications` SELECT policy was org-scoped only — vendor users could see all vendor notifications across the org. | MEDIUM | Created `vendor_doc_notifications_vendor_scoped` policy: vendor users see only their own vendor notifications. | FIXED |
| 3 | `vendor-secure-upload` edge function sent new_upload notification to hardcoded `team@getevidly.com` only. Compliance Officer and Owner were NOT notified. | MEDIUM | Updated to query `user_profiles` for `compliance_manager` and `owner_operator` roles in the org and notify each individually. Falls back to team@getevidly.com only if no recipients found. | FIXED |
| 4 | `vendor_document_reviews` RLS is org-scoped only. | LOW (Acceptable) | No fix needed — only internal reviewers access reviews. Vendor-portal users do not review documents. | ACCEPTED |
| 5 | `vendor_documents.location_id` (nullable) has no RLS enforcement at location level. | LOW (Acceptable) | No fix needed — internal org members should see all locations. Location_id is for filtering, not access control. | ACCEPTED |

### Architecture

```
Vendor                    Supabase                        App
  │                         │                              │
  ├─── GET ?token=xxx ────→ vendor-secure-upload           │
  │                         │ validates token               │
  │                         │ returns upload form data      │
  │                         │                              │
  ├─── POST file ─────────→ vendor-secure-upload           │
  │                         │ uploads to storage            │
  │                         │ creates document record       │
  │                         │ creates vendor_documents row  │
  │                         │ version detection             │
  │                         │ marks token used              │
  │                         │                              │
  │                         ├── vendor-document-notify ───→ compliance_manager
  │                         │                         ───→ owner_operator
  │                         │                              │
  │                         │ RLS enforced:                │
  │                         │ - Internal: org-scoped       │
  │                         │ - Vendor: vendor_id-scoped   │
```

### Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260407000000_vendor_document_notifications.sql` | Creates vendor_documents, notifications, reviews tables |
| `supabase/migrations/20260304040000_vendor_document_rls_vendor_scoping.sql` | Vendor-ID scoping fix for RLS policies |
| `supabase/functions/vendor-secure-upload/index.ts` | Token-based vendor upload with role-based notifications |
| `supabase/functions/vendor-document-notify/index.ts` | Email notification edge function (10 types) |
| `src/config/vendorDocNotificationRouting.ts` | 14 doc types with role routing + expiration tiers |
| `src/types/vendorDocuments.ts` | TypeScript interfaces |
| `src/data/vendorDocumentsDemoData.ts` | Demo data (5 docs, 5 notifications, 2 reviews) |
| `src/pages/VendorDetail.tsx` | Vendor detail page with audit comment block (lines 1-49) |

### Notification Routing

The `vendorDocNotificationRouting.ts` config defines 14 document types with:
- **Primary roles:** Who must be notified (e.g., compliance_manager for COI)
- **CC roles:** Who gets copied (e.g., owner_operator)
- **Auto-acknowledge:** Some doc types (SDS) are auto-acknowledged
- **Expiration tiers:** 90/60/30/14/0/-1 days with escalating severity and channels (in_app → email → sms)
