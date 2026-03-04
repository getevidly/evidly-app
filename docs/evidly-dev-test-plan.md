# EvidLY Dev Test Plan

## Document Workflow — Vendor Config: Regression Test Cases

**Module:** Vendor Document Management
**Date:** 2026-03-04
**Related Migration:** `20260304040000_vendor_document_rls_vendor_scoping.sql`

### TC-VDOC-001: Vendor-Scoped Document Visibility

**Precondition:** Two vendors (Vendor A, Vendor B) with documents in the same organization. Two vendor-portal users with `linked_vendor_id` set to A and B respectively.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Vendor A user queries `vendor_documents` | Sees only Vendor A documents |
| 2 | Vendor B user queries `vendor_documents` | Sees only Vendor B documents |
| 3 | Internal org user (compliance_manager) queries `vendor_documents` | Sees ALL vendor documents in the org |
| 4 | Internal org user (owner_operator) queries `vendor_documents` | Sees ALL vendor documents in the org |
| 5 | User from different organization queries `vendor_documents` | Sees NO documents (org isolation) |

### TC-VDOC-002: Vendor-Scoped Notification Visibility

**Precondition:** Notifications exist for Vendor A and Vendor B uploads.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Vendor A user queries `vendor_document_notifications` | Sees only Vendor A notifications |
| 2 | Internal org user queries `vendor_document_notifications` | Sees ALL notifications in the org |

### TC-VDOC-003: Vendor Document INSERT Scoping

**Precondition:** Vendor A portal user authenticated.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Vendor A user inserts document with `vendor_id = A` | INSERT succeeds |
| 2 | Vendor A user inserts document with `vendor_id = B` | INSERT denied by RLS |
| 3 | Internal org user inserts document with any vendor_id in their org | INSERT succeeds |

### TC-VDOC-004: Vendor Document UPDATE Scoping

**Precondition:** Vendor A has an existing document.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Vendor A user updates own document | UPDATE succeeds |
| 2 | Vendor A user updates Vendor B document | UPDATE denied by RLS |
| 3 | Internal org user updates any vendor document in their org | UPDATE succeeds |

### TC-VDOC-005: Secure Upload Notification Routing

**Precondition:** Organization has compliance_manager (user C) and owner_operator (user O) with email addresses.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Vendor uploads document via secure link | Upload succeeds, returns success message |
| 2 | Check notification calls | `vendor-document-notify` called for user C AND user O |
| 3 | Remove all compliance_manager/owner_operator users from org | Falls back to team@getevidly.com |

### TC-VDOC-006: Secure Upload Version Detection

**Precondition:** Vendor A has an existing v1 COI document.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Vendor A uploads new COI via secure link | New document created with version = 2 |
| 2 | Check previous document | Status changed to "superseded" |
| 3 | Check parent_id on new document | Points to v1 document ID |

### TC-VDOC-007: Service Role Bypass

**Precondition:** Edge function using service_role key.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Service role queries `vendor_documents` | Full access (bypass RLS) |
| 2 | Service role inserts `vendor_documents` | INSERT succeeds regardless of vendor_id |

### TC-VDOC-008: Demo Mode Guard

**Precondition:** App running in demo mode.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to VendorDetail page | Page renders with demo data |
| 2 | Attempt document upload action | Blocked by `useDemoGuard` / `supabaseGuard` |
| 3 | Verify demo vendor documents load | 5 demo docs shown from `vendorDocumentsDemoData.ts` |

### TC-VDOC-009: linked_vendor_id Column Safety

**Precondition:** Fresh database migration.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check `user_profiles` schema | `linked_vendor_id` column exists, nullable, FK to vendors(id) |
| 2 | Delete vendor record | `linked_vendor_id` set to NULL (ON DELETE SET NULL) |
| 3 | Internal user has `linked_vendor_id = NULL` | Full org-scoped access to vendor docs |

### TC-VDOC-010: Cross-Organization Isolation

**Precondition:** Two organizations with vendor documents.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Org A user queries vendor_documents | Sees only Org A documents |
| 2 | Org B user queries vendor_documents | Sees only Org B documents |
| 3 | Vendor user in Org A queries | Sees only their vendor docs in Org A |
