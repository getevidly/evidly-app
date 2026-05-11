# DOCUMENTS-SCHEMA-AUDIT — Clarifications (Second Pass)

> **Type:** TIER 0 — Schema Audit Clarification
> **Date:** 2026-05-11
> **PROD:** irxgmhxhmxtzfwuieblc
> **Rule:** READ-ONLY. Zero DDL. Zero DML.

---

## SECTION 1 — Two Token Systems

### 1.1 Table Names

| # | Table | Migration | Git Committed | Rows in PROD |
|---|---|---|---|---|
| **T1** | `vendor_secure_tokens` | 20260206000001 (extended by 20260806000000) | Feb 2026 (extended May 7 2026) | **0** |
| **T2** | `compliance_document_requests` | 20260807000000 ¹ | May 7 2026 | **0** |

> ¹ Future-dated filename for sort ordering.

### 1.2 Full Schema — `vendor_secure_tokens` (T1)

| Column | Type | NOT NULL | Default | FK |
|---|---|---|---|---|
| id | uuid | YES | gen_random_uuid() | PK |
| token | varchar | YES | — | UNIQUE |
| vendor_id | uuid | YES | — | → vendors(id) ON DELETE CASCADE |
| organization_id | uuid | YES | — | → organizations(id) ON DELETE CASCADE |
| upload_request_id | uuid | NO | — | → vendor_upload_requests(id) ON DELETE SET NULL |
| document_type | varchar | YES | — | — |
| expires_at | timestamptz | YES | — | — |
| used_at | timestamptz | NO | — | — |
| document_id | uuid | NO | — | → documents(id) ON DELETE SET NULL |
| created_at | timestamptz | NO | now() | — |
| service_record_id | uuid | NO | — | → vendor_service_records(id) ON DELETE CASCADE |

**RLS Policies (3):**

| Policy | Cmd | Roles | Qualifier |
|---|---|---|---|
| Anyone can read valid tokens | SELECT | anon, authenticated | true (open read — token secrecy = auth) |
| Org members can view their tokens | SELECT | authenticated | org_id via user_profiles |
| Service role creates tokens | INSERT | service_role | true |

**Note:** No UPDATE policy. Tokens are marked used by service_role edge functions that bypass RLS.

**Index:** `idx_vendor_secure_tokens_service_record_id` on (service_record_id) WHERE service_record_id IS NOT NULL

### 1.3 Full Schema — `compliance_document_requests` (T2)

| Column | Type | NOT NULL | Default | FK |
|---|---|---|---|---|
| id | uuid | YES | gen_random_uuid() | PK |
| organization_id | uuid | YES | — | → organizations(id) ON DELETE CASCADE |
| document_id | uuid | YES | — | → compliance_documents(id) ON DELETE CASCADE |
| vendor_id | uuid | NO | — | → vendors(id) ON DELETE SET NULL |
| employee_id | uuid | NO | — | → user_profiles(id) ON DELETE SET NULL |
| requested_by | uuid | NO | — | → auth.users(id) ON DELETE SET NULL |
| requested_at | timestamptz | YES | now() | — |
| secure_token | text | YES | — | UNIQUE |
| secure_token_expires_at | timestamptz | NO | — | — |
| fulfilled_at | timestamptz | NO | — | — |
| cancelled_at | timestamptz | NO | — | — |
| resend_count | integer | YES | 0 | — |
| last_resent_at | timestamptz | NO | — | — |
| recipient_email | text | NO | — | — |
| recipient_name | text | NO | — | — |
| note_to_recipient | text | NO | — | — |
| created_at | timestamptz | YES | now() | — |
| updated_at | timestamptz | YES | now() | — |

**RLS Policies (5):**

| Policy | Cmd | Roles | Qualifier |
|---|---|---|---|
| select_own_org | SELECT | authenticated | org_id via user_profiles |
| insert_own_org | INSERT | authenticated | org_id via user_profiles |
| update_own_org | UPDATE | authenticated | org_id via user_profiles |
| insert_service_role | INSERT | service_role | true |
| update_service_role | UPDATE | service_role | true |

**No DELETE policy** — requests cannot be deleted, only cancelled (set cancelled_at).

**Indexes:**
- `idx_cdr_org_active` on (organization_id) WHERE fulfilled_at IS NULL AND cancelled_at IS NULL
- `idx_cdr_document` on (document_id)
- `idx_cdr_secure_token` on (secure_token)

### 1.4 File References

#### T1: `vendor_secure_tokens` — 5 files, all active

| File | Lines | R/W | Summary |
|---|---|---|---|
| `src/lib/vendorDocumentActions.ts` | 51 | WRITE | Creates 14-day upload token for vendor doc re-upload |
| `supabase/functions/vendor-secure-upload/index.ts` | 30, 123 | READ + WRITE | Validates token (GET), marks used + sets document_id (POST) |
| `supabase/functions/vendor-schedule-response/index.ts` | 42, 149, 208, 279, 318 | READ + WRITE | Validates scheduling tokens, marks used on vendor action |
| `supabase/functions/vendor-document-reminders/index.ts` | 125 | WRITE | Creates tokens at 7 expiry reminder stages |
| `supabase/functions/process-service-request/index.ts` | 241 | WRITE | Creates scheduling token when operator submits service request |

**Total: 3 READ operations, 5 WRITE operations across 5 files.**

#### T2: `compliance_document_requests` — 0 application files

| File | Lines | R/W | Summary |
|---|---|---|---|
| *(none)* | — | — | Table exists in PROD with RLS policies but **zero application code references** |

Only reference is the migration file that created it.

### 1.5 Purpose of Each

| Table | Purpose | Who Creates Tokens | Who Consumes Tokens |
|---|---|---|---|
| **T1** `vendor_secure_tokens` | No-auth secure link for vendors to upload documents OR respond to scheduling requests. Supports two contexts: (a) document upload after cron-triggered expiry reminders, (b) scheduling response after operator sends service request. | Edge functions: `vendor-document-reminders`, `process-service-request`, `vendorDocumentActions.ts` (client-side insert) | Edge functions: `vendor-secure-upload` (file upload), `vendor-schedule-response` (scheduling) |
| **T2** `compliance_document_requests` | Request record tied to a specific `compliance_documents` row. Tracks the full lifecycle: requested → resent → fulfilled/cancelled. Supports employee_id for kitchen-category requests to staff (not just vendors). Has resend_count tracking. | *(No code yet)* | *(No code yet)* |

### 1.6 Where They Overlap

**Same vendor, same action?** Not today — T2 has zero code. But by design:

- Both have a `vendor_id` FK → vendors(id)
- Both have a `secure_token` / `token` column (UNIQUE)
- Both have an expiration timestamp
- Both track whether the token was consumed (T1: `used_at`, T2: `fulfilled_at`)

If T2 were wired up, a vendor doc upload request could land in either table. The distinguishing column is T2's `document_id` FK → `compliance_documents(id)`, which ties the request to a specific document row. T1 has no such FK — it has `document_type` (text) and an optional `document_id` → legacy `documents(id)`.

### 1.7 Build Timeline

| Date | Event |
|---|---|
| Feb 6 2026 | T1 created as part of auto-request system (migration 20260206000001) |
| Feb–May 2026 | T1 wired into 5 edge functions + 1 client action |
| May 7 2026 | T2 created as part of compliance_documents foundation (migration 20260807000000) |
| May 7–11 2026 | T2 has zero code wired — it was schema-forward, no implementation yet |

**Conclusion:** Built at different times by different design threads. T1 was the working system; T2 was created as the "correct" replacement during the compliance_documents redesign but never wired.

### 1.8 Recommendation

**Consolidate into T2 (`compliance_document_requests`)**, with these steps:

| # | Action | Rationale |
|---|---|---|
| 1 | Add `service_record_id` (uuid, FK → vendor_service_records) to T2 | T1 already has this. T2 needs it for the routing workflow. |
| 2 | Add `upload_context` or `request_type` column to T2 | T1 uses `document_type` overloaded as context. T2 should distinguish: document_upload, schedule_response, employee_request. |
| 3 | Rewire 5 files from T1 → T2 | All edge functions and vendorDocumentActions.ts switch to compliance_document_requests |
| 4 | T1 document_id FK → documents(id) becomes dead | T2 already FKs to compliance_documents(id), the canonical table |
| 5 | Deprecate T1, keep for rollback window, then DROP | Zero rows, no data migration needed |

**Why not keep both?** T1 FKs to the legacy `documents` table. T2 FKs to `compliance_documents`. Since `compliance_documents` is the canonical table going forward (Arthur's Decision 1), all new token work must reference T2. Running both means two token validation paths, two RLS policy sets, and inevitable divergence.

**Why T2 wins over T1:**
- FKs to the right parent table (`compliance_documents`)
- Has `resend_count` + `last_resent_at` (T1 doesn't)
- Has `fulfilled_at` + `cancelled_at` lifecycle (T1 only has `used_at`)
- Has `employee_id` for kitchen-category requests to staff
- Has `recipient_email` + `recipient_name` + `note_to_recipient` (T1 stores none of this)
- Has proper authenticated INSERT/UPDATE RLS (T1 is service_role INSERT only — no client-side create without service_role)

---

## SECTION 2 — Vendor Identity

### 2.1 `vendors` Table — Primary Key + Schema

**PK:** `vendors.id` (uuid, gen_random_uuid())
**Row count:** **0**
**Scoping:** org-scoped via `organization_id` FK → organizations(id)

| Column | Type | NOT NULL | Default | Notes |
|---|---|---|---|---|
| id | uuid | YES | gen_random_uuid() | PK |
| organization_id | uuid | YES | — | FK → organizations(id) |
| name | text | YES | — | Vendor business name |
| contact_name | text | NO | — | Primary contact |
| email | text | NO | — | — |
| phone | text | NO | — | — |
| address | text | NO | — | — |
| category | varchar | NO | — | Free text (no CHECK) |
| license_number | text | NO | — | — |
| license_expiry | date | NO | — | — |
| status | varchar | NO | 'active' | Free text |
| notes | text | NO | — | — |
| created_at | timestamptz | NO | now() | — |
| updated_at | timestamptz | NO | now() | — |

**Key characteristic:** `vendors` is **org-scoped**. Each org has its own vendor rows. A real-world company like CPP serving 3 orgs = 3 separate rows in `vendors`, one per org, each with a different `id`.

### 2.2 Other Tables Holding Vendor Identity

#### `marketplace_vendors` — 0 rows

| Column | Type | NOT NULL | Notes |
|---|---|---|---|
| id | uuid | YES | PK (its own identity) |
| vendor_id | uuid | NO | FK → vendors(id) ON DELETE SET NULL |
| slug | text | YES | URL slug |
| company_name | text | YES | — |
| description | text | NO | — |
| logo_url | text | NO | — |
| years_in_business | integer | NO | Default 0 |
| service_area | jsonb | NO | Default [] |
| languages | jsonb | NO | Default ["English"] |
| response_time_hours | integer | NO | Default 24 |
| certifications | jsonb | NO | Default [] |
| tier | varchar | NO | Default 'verified' |
| contact_name | text | NO | — |
| phone | varchar | NO | — |
| email | text | NO | — |
| website | text | NO | — |
| is_active | boolean | NO | Default true |
| status | varchar | NO | Default 'approved' |
| invited_by_user_id | uuid | NO | FK → auth.users(id) |
| invited_by_org_id | uuid | NO | FK → organizations(id) |
| rejection_reason | text | NO | — |
| approved_at | timestamptz | NO | — |
| approved_by | uuid | NO | FK → auth.users(id) |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

**Key characteristic:** `marketplace_vendors` has its **own PK** (`id`) plus an **optional FK** to `vendors.id`. This is the Vendor Network profile — the public-facing identity a vendor presents across all orgs. The nullable `vendor_id` links it to the org-scoped `vendors` row when a client has hired that vendor.

**No other vendor identity tables exist.** Searched for `vendor_master`, `vendor_profiles`, `vendor_directory` — none found. The only two identity tables are `vendors` (org-scoped) and `marketplace_vendors` (network-scoped).

### 2.3 Duplicate Row Analysis

**Both tables have 0 rows.** No sample rows to examine.

However, the **design intent** is clear from the schema:

- A real-world vendor (e.g. CPP) would have **one** `marketplace_vendors` row (its network profile, with its own `id`)
- CPP serving Org A and Org B would have **two** `vendors` rows (one per org, each with a different `id`, each with `organization_id` set)
- The `marketplace_vendors.vendor_id` column would link to **one** of those org-scoped rows (or possibly none, if the vendor has a network profile but no active client)

This is a **one-to-many** relationship: one marketplace_vendor → many org-scoped vendor rows (via separate lookup, not direct FK from vendors → marketplace_vendors).

### 2.4 Vendor ID Propagation Map

Every FK below references `vendors.id` (the org-scoped PK):

| Table | Column | FK Target | ON DELETE | Notes |
|---|---|---|---|---|
| `vendor_client_relationships` | vendor_id | vendors(id) | CASCADE | Org↔vendor relationship |
| `vendor_users` | vendor_id | vendors(id) | CASCADE | Auth user↔vendor link |
| `vendor_upload_requests` | vendor_id | vendors(id) | CASCADE | Upload request tracking |
| `vendor_secure_tokens` | vendor_id | vendors(id) | CASCADE | Secure upload/schedule tokens |
| `vendor_contact_log` | vendor_id | vendors(id) | CASCADE | Communication audit |
| `vendor_analytics` | vendor_id | vendors(id) | — | Performance metrics |
| `vendor_certification_status` | vendor_id | vendors(id) | — | Cert tracking |
| `vendor_leads` | vendor_id | vendors(id) | — | Sales pipeline |
| `vendor_subscriptions` | vendor_id | vendors(id) | — | Billing |
| `auto_request_log` | vendor_id | vendors(id) | — | Auto-request audit |
| `compliance_documents` | vendor_id | vendors(id) | — | **Canonical documents table** |
| `compliance_document_requests` | vendor_id | vendors(id) | SET NULL | Token requests |
| `marketplace_vendors` | vendor_id | vendors(id) | SET NULL | Network profile link |
| `service_completions` | vendor_id | vendors(id) | — | Service tracking |
| `service_quotes` | vendor_id | vendors(id) | — | Quote tracking |
| `entity_correlations` | vendor_id | vendors(id) | — | Intelligence linkage |

**16 tables** FK to `vendors.id`.

#### Notable ABSENCE:

| Table | Column | FK Target | Notes |
|---|---|---|---|
| `vendor_service_records` | *(no vendor_id column)* | — | Uses `vendor_name` (text) instead. **No FK to vendors.** |
| `location_service_schedules` | vendor_id | *(no FK constraint)* | Column exists but **no FOREIGN KEY constraint** in PROD |

### 2.5 The `vendor_service_records` Gap

`vendor_service_records` stores `vendor_name` as free text. It has **no** `vendor_id` FK. This was confirmed by querying `pg_constraint`:

```
SELECT ... WHERE conrelid = 'vendor_service_records'::regclass
  AND pg_get_constraintdef(oid) LIKE '%vendor%';
→ 0 rows
```

This means:
- You cannot join `vendor_service_records` → `vendors` by ID
- The only way to match is by string-comparing `vendor_name` against `vendors.name` (unreliable, not unique)
- The `compliance_documents.vendor_id` FK to `vendors(id)` is correct, but for service-category documents that need to link to the vendor who performed the service, the join path `compliance_documents.vendor_id → vendors.id` works — but `vendor_service_records` can't participate in that join

### 2.6 FK Recommendation for `compliance_documents.vendor_id`

**`compliance_documents.vendor_id` should FK to `vendors(id)`** — and it already does.

This is correct because:

1. **`vendors` is the universal org-scoped identity.** All 16 tables that reference a vendor FK to `vendors.id`. The entire system uses this as the single truth for "which vendor, for this org."

2. **`marketplace_vendors` is the wrong target.** It's the network profile (cross-org). Documents belong to a specific org's relationship with a vendor, not the vendor's public profile. The `marketplace_vendors.vendor_id` → `vendors.id` link lets you traverse from document → vendor → marketplace profile when needed.

3. **Both Vendor Network and Vendor Services surfaces resolve through `vendors.id`:**
   - Vendor Network: `vendor_client_relationships.vendor_id` → `vendors(id)`
   - Vendor Services: `location_service_schedules.vendor_id` → vendors (column exists, FK missing — needs adding)
   - Documents: `compliance_documents.vendor_id` → `vendors(id)` ✓

4. **The `vendor_service_records` gap must be fixed.** Add `vendor_id` (uuid, FK → vendors(id)) to `vendor_service_records` and backfill from `vendor_name` string match (or leave NULL where no match). This closes the join chain: `compliance_documents` → `vendor_service_records` → `vendors`.

### 2.7 Action Items for Migration Plan

| # | Action | Table | Notes |
|---|---|---|---|
| 1 | Add FK constraint on `location_service_schedules.vendor_id` → `vendors(id)` | location_service_schedules | Column exists, FK missing |
| 2 | Add `vendor_id` column (uuid, FK → vendors(id)) to `vendor_service_records` | vendor_service_records | Closes join gap. `vendor_name` stays for display/audit. |
| 3 | Keep `compliance_documents.vendor_id` → `vendors(id)` as-is | compliance_documents | Already correct ✓ |
| 4 | `marketplace_vendors` stays separate — no FK from documents | marketplace_vendors | Network profile, not document FK target |

---

*End of DOCUMENTS-SCHEMA-AUDIT-CLARIFICATIONS.md*
