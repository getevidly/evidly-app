# DOCUMENTS-SCHEMA-AUDIT — Deliverable 1

> **Type:** TIER 1 — Schema Audit + Reconciliation Report
> **Date:** 2026-05-10
> **PROD:** irxgmhxhmxtzfwuieblc
> **Rule:** READ-ONLY. Zero DDL. Zero DML. Three trial orgs live.

---

## EXECUTIVE SUMMARY

There are **two parallel document table families** in PROD, built months apart:

| Era | Table | Migration | Applied | Rows | Status Column Values | Category Column Values |
|---|---|---|---|---|---|---|
| **Feb 2026** | `documents` | 20260205003451 | Feb 2026 | >0 (in use) | No CHECK (text) | No CHECK (text) |
| **May 2026** | `compliance_documents` | 20260807000000 ¹ | May 7–10 2026 | **0** (empty) | CHECK (requested, pending, current, expiring, expired, rejected, archived, cancelled) | CHECK (kitchen_employee, vendor_service, vendor_business) |

> ¹ Migration filename `20260807` is **future-dated for sort ordering**. File committed to git 2026-05-07 20:55 PDT (commit `1cde18f`), pushed to PROD the same week. The `202608xx` block (versions 01–09) was batch-committed May 7–8 to sequence after `20260722`. The date does NOT reflect when the migration was written or applied.

The `compliance_documents` table is **live in PROD, applied, zero rows, CHECK constraints active** (confirmed via `pg_constraint` query May 10 2026). It was designed as the replacement for the earlier `documents` table and has proper CHECK constraints, but its enum values **conflict with locked decisions on 4 points** (flagged in each section).

---

## SECTION A — `documents` Table (Feb 2026 Original)

**Migration:** `20260205003451_create_evid_ly_tables.sql` (lines 468–530)

### Columns

| Column | Type | NOT NULL | Default | Notes |
|---|---|---|---|---|
| id | uuid | YES | gen_random_uuid() | PK |
| organization_id | uuid | YES | — | FK → organizations(id) |
| location_id | uuid | NO | — | FK → locations(id) |
| title | text | YES | — | Document name |
| category | text | NO | — | No CHECK constraint |
| file_url | text | NO | — | Storage URL |
| file_size | integer | NO | — | Bytes |
| file_type | text | NO | — | MIME type |
| expiration_date | date | NO | — | Nullable ✓ |
| uploaded_by | uuid | NO | — | FK → auth.users(id) |
| status | text | NO | — | No CHECK constraint |
| tags | text[] | NO | — | Array of tags |
| created_at | timestamptz | YES | now() | — |
| updated_at | timestamptz | YES | now() | — |

**Additional columns added later:**
- `ai_document_type`, `ai_document_type_label`, `ai_issue_date`, `ai_expiration_date`, `ai_issuing_agency`, `ai_inspector_name`, `ai_score_grade`, `ai_violations` (text[]), `ai_compliance_status`, `ai_confidence`, `ai_analyzed_at`, `needs_attention`, `import_source`, `original_filename`, `imported_at` — from migration `20260304100001`
- `categorization_source`, `manual_category_override` — from migration `20260311000000`

### Confirm/Deny

| Question | Answer |
|---|---|
| category column exists? | YES — text, no CHECK, nullable |
| CHECK values on category? | **NO** — free text, no constraint |
| status column exists? | YES — text, no CHECK, nullable |
| CHECK values on status? | **NO** — free text, no constraint |
| vendor_id FK exists? | **NO** — not on this table |
| location_id FK exists? | YES → locations(id), nullable |
| RLS via ULA chain? | YES — 4 policies (SELECT/INSERT/UPDATE/DELETE) all join user_location_access |
| expiration_date exists? | YES — date, nullable ✓ |

### RLS Policies (4)

1. **SELECT:** `organization_id IN (SELECT organization_id FROM user_location_access WHERE user_id = auth.uid())`
2. **INSERT:** Same org check
3. **UPDATE:** Same org check
4. **DELETE:** Same org check

### Indexes

- `idx_documents_org` on (organization_id)
- `idx_documents_expiration` on (expiration_date)

### Assessment

This is the **legacy** documents table. It lacks CHECK constraints, has no vendor_id FK, and its status/category columns are free text. **48 files** reference this table. The newer `compliance_documents` table (Section A2 below) was designed to replace it.

---

## SECTION A2 — `compliance_documents` Table (May 2026, migration filename future-dated 20260807)

**Migration:** `20260807000000_compliance_documents_foundation.sql` (lines 32–87)
**Git committed:** 2026-05-07 20:55 PDT (commit `1cde18f`)
**PROD status:** Applied, 0 rows, CHECK constraints active

### Columns

| Column | Type | NOT NULL | Default | CHECK | Notes |
|---|---|---|---|---|---|
| id | uuid | YES | gen_random_uuid() | — | PK |
| organization_id | uuid | YES | — | — | FK → organizations(id) |
| location_id | uuid | NO | — | — | FK → locations(id) |
| category | text | YES | — | `kitchen_employee, vendor_service, vendor_business` | ⚠ FLAG |
| type | text | YES | — | — | Document type label |
| name | text | YES | — | — | Display name |
| status | text | YES | 'current' | `requested, pending, current, expiring, expired, rejected, archived, cancelled` | ⚠ FLAG |
| storage_path | text | NO | — | — | Supabase storage path |
| file_size_bytes | bigint | NO | — | — | — |
| mime_type | text | NO | — | — | — |
| issued_date | date | NO | — | — | — |
| expiry_date | date | NO | — | — | Nullable ✓ |
| vendor_id | uuid | NO | — | — | FK → vendors(id) ✓ |
| employee_id | uuid | NO | — | — | FK → user_profiles(id) |
| parent_document_id | uuid | NO | — | — | Self-FK for version chain |
| import_source | text | NO | — | `manual_upload, camera_capture, google_drive, onedrive, dropbox, box, icloud, email_forward, vendor_secure_link, api` | — |
| import_source_metadata | jsonb | NO | — | — | — |
| requested_by | uuid | NO | — | — | FK → auth.users(id) |
| requested_at | timestamptz | NO | — | — | — |
| submitted_by | uuid | NO | — | — | FK → auth.users(id) |
| submitted_at | timestamptz | NO | — | — | — |
| accepted_by | uuid | NO | — | — | FK → auth.users(id) |
| accepted_at | timestamptz | NO | — | — | — |
| rejected_by | uuid | NO | — | — | FK → auth.users(id) |
| rejected_at | timestamptz | NO | — | — | — |
| rejection_reason | text | NO | — | — | — |
| notes | text | NO | — | — | — |
| metadata | jsonb | NO | — | — | — |
| created_at | timestamptz | YES | now() | — | — |
| updated_at | timestamptz | YES | now() | — | — |

### ⚠ FLAGS vs Locked Decisions

| Item | PROD Value | Locked Decision | Impact |
|---|---|---|---|
| **category CHECK** | `kitchen_employee`, `vendor_service`, `vendor_business` | `kitchen`, `service`, `business` | Migration needed to ALTER CHECK + rename values |
| **status CHECK** | `requested, pending, current, expiring, expired, rejected, archived, cancelled` | `current, expiring, expired, pending_review, requested, overdue` | `pending` must become `pending_review`. `overdue` missing. `rejected/archived/cancelled` not in locked set. |
| **status `pending`** | Exists as `pending` | Must be `pending_review` | ALTER CHECK + UPDATE existing rows |
| **status `overdue`** | **DOES NOT EXIST** | Required for service category | ALTER CHECK to add `overdue` |
| **status `rejected`** | Exists | Not in locked 6-value enum | Decision: keep or remove? Rejected → re-requested per workflow |
| **status `archived/cancelled`** | Exist | Not in locked 6-value enum | Decision: keep as operational states or remove? |

### RLS Policies

- **SELECT:** org_id match via user_profiles join (NO DELETE policy — archive-only design ✓)
- **INSERT:** org_id match
- **UPDATE:** org_id match
- **service_role:** INSERT + UPDATE only (NO DELETE even for service_role)

### Indexes

- `idx_cd_org_category_status` on (organization_id, category, status)
- `idx_cd_org_vendor_category` on (organization_id, vendor_id, category)
- `idx_cd_org_employee_category` on (organization_id, employee_id, category)
- `idx_cd_expiry_date` on (expiry_date)
- `idx_cd_org_pending` on (organization_id) WHERE status IN ('requested','pending')
- `idx_cd_parent` on (parent_document_id)
- GIN full-text search index on (name, type) — already exists ✓

### Confirm/Deny (on compliance_documents)

| Question | Answer |
|---|---|
| category column exists? | YES — with CHECK (3 values, wrong names) |
| status column exists? | YES — with CHECK (8 values, 2 wrong, 1 missing) |
| vendor_id FK exists? | YES → vendors(id) ✓ |
| location_id FK exists? | YES → locations(id), nullable |
| expiration_date exists? | YES as `expiry_date` — date, nullable ✓ |

---

## SECTION B — `vendor_documents` Table (Apr 2026)

**Migration:** `20260407000000_vendor_document_notifications.sql` (lines 11–108)

### Columns

| Column | Type | NOT NULL | Default | CHECK | Notes |
|---|---|---|---|---|---|
| id | uuid | YES | gen_random_uuid() | — | PK |
| organization_id | uuid | YES | — | — | FK → organizations(id) |
| vendor_id | uuid | YES | — | — | FK → vendors(id) |
| location_id | uuid | NO | — | — | FK → locations(id) |
| document_type | text | YES | — | — | Free text |
| title | text | YES | — | — | Display name |
| file_url | text | NO | — | — | Storage URL |
| file_size | integer | NO | — | — | Bytes |
| file_type | text | NO | — | — | MIME type |
| status | text | YES | 'pending_review' | `pending_review, accepted, flagged, expired, superseded` | **Uses pending_review ✓** |
| version | integer | YES | 1 | — | Version number |
| parent_id | uuid | NO | — | — | Self-FK for version chain |
| expiration_date | date | NO | — | — | Nullable |
| upload_method | text | NO | — | `manual, secure_link, vendor_portal, auto_request` | — |
| uploaded_by_vendor | boolean | YES | false | — | — |
| vendor_notes | text | NO | — | — | — |
| ai_classified | boolean | YES | false | — | — |
| ai_confidence | numeric | NO | — | — | 0–1 |
| ai_document_label | text | NO | — | — | — |
| reviewed_by | uuid | NO | — | — | FK → auth.users(id) |
| reviewed_at | timestamptz | NO | — | — | — |
| review_notes | text | NO | — | — | — |
| created_at | timestamptz | YES | now() | — | — |
| updated_at | timestamptz | YES | now() | — | — |

### Column Mapping to `compliance_documents`

| vendor_documents Column | Maps To | Notes |
|---|---|---|
| id | id | — |
| organization_id | organization_id | — |
| vendor_id | vendor_id | ✓ both tables have it |
| location_id | location_id | — |
| document_type | type | — |
| title | name | Rename |
| file_url | storage_path | Rename + may need URL→path conversion |
| file_size | file_size_bytes | Type change integer→bigint |
| file_type | mime_type | — |
| status | status | `pending_review`→`pending_review` ✓, `accepted`→`current`, `flagged`→needs mapping, `expired`→`expired`, `superseded`→no equivalent in locked set |
| version | — | **DEAD** — compliance_documents uses parent_document_id chain |
| parent_id | parent_document_id | — |
| expiration_date | expiry_date | — |
| upload_method | import_source | Value mapping needed |
| uploaded_by_vendor | — | Derivable from submitted_by |
| vendor_notes | notes | — |
| ai_classified | — | **DEAD** — compliance_documents doesn't track this |
| ai_confidence | — | Could go in metadata jsonb |
| ai_document_label | — | Could go in metadata jsonb |
| reviewed_by | accepted_by or rejected_by | Context-dependent |
| reviewed_at | accepted_at or rejected_at | Context-dependent |
| review_notes | notes or rejection_reason | Context-dependent |

### Inbound FKs

- `vendor_document_notifications.vendor_document_id` → vendor_documents(id)
- `vendor_document_reviews.vendor_document_id` → vendor_documents(id)
- `vendor_document_submissions` (referenced by validate-vendor-document edge function)

### Edge Functions That Write

1. **vendor-secure-upload** — INSERT (new upload), UPDATE (supersede previous version)
2. **validate-vendor-document** — UPDATE (status after AI analysis)
3. **vendor-document-reminders** — READ for expiry tracking

### Migration Plan

Existing `vendor_documents` rows migrate to `compliance_documents` as:
- **WHERE vendor_id IS NOT NULL AND no FK to vendor_service_records:** → `category = 'vendor_business'` (credentials)
- **WHERE FK to vendor_service_records exists:** → `category = 'vendor_service'` (work records)
- **Note:** Current `vendor_documents` has no FK to `vendor_service_records`. The link doesn't exist yet. All existing rows are business-category credentials.

### ⚠ FLAG

`vendor_documents.status` uses `pending_review` (correct per locked decision), but `compliance_documents.status` uses `pending` (wrong). The migration must reconcile this — compliance_documents CHECK must change `pending` → `pending_review`.

---

## SECTION C — `vendor_upload_requests` + `vendor_secure_tokens`

### vendor_upload_requests

**Migration:** `20260205175243_add_vendor_tables_and_location_count.sql` (lines 83–96)

| Column | Type | NOT NULL | Notes |
|---|---|---|---|
| id | uuid | YES | PK |
| organization_id | uuid | YES | FK → organizations(id) |
| vendor_id | uuid | YES | FK → vendors(id) |
| request_type | text | NO | Free text |
| description | text | NO | — |
| status | text | NO | Free text (no CHECK) |
| requested_by | uuid | NO | — |
| completed_by | uuid | NO | — |
| completed_at | timestamptz | NO | — |
| document_id | uuid | NO | FK to documents (no constraint) |
| created_at | timestamptz | YES | — |
| updated_at | timestamptz | YES | — |

**Columns added by 20260206000001:**
- `secure_token` (varchar 64)
- `token_expires_at` (timestamptz)
- `auto_requested` (boolean)
- `reminder_count` (integer)
- `last_reminder_at` (timestamptz)
- `vendor_email` (text)
- `vendor_phone` (text)

### vendor_secure_tokens

**Migration:** `20260206000001_auto_request_system.sql` (lines 63–74)

| Column | Type | NOT NULL | Notes |
|---|---|---|---|
| id | uuid | YES | PK |
| token | varchar(64) | YES | UNIQUE |
| vendor_id | uuid | YES | FK → vendors(id) |
| organization_id | uuid | YES | FK → organizations(id) |
| upload_request_id | uuid | NO | FK → vendor_upload_requests(id) |
| document_type | text | NO | Expected document type |
| expires_at | timestamptz | YES | Token expiration |
| used_at | timestamptz | NO | When token was consumed |
| document_id | uuid | NO | FK → documents(id) — populated on upload |
| created_at | timestamptz | YES | — |

### Comparison to Expected Shape

| Expected (handoff doc) | PROD Column | Status |
|---|---|---|
| token | token (varchar 64, UNIQUE) | ✓ EXISTS |
| vendor_service_record_id | — | **MISSING** — no FK to vendor_service_records |
| expires_at | expires_at | ✓ EXISTS |
| used_at | used_at | ✓ EXISTS |
| viewed_at | — | **MISSING** — no column for tracking email open |

### ⚠ FLAGS

1. **`vendor_service_record_id` is MISSING** — the token cannot be tied to a specific service record yet. This is the key FK the routing workflow needs.
2. **`viewed_at` is MISSING** — Resend open-tracking webhook has no column to write to.
3. There is ALSO a `compliance_document_requests` table (migration 20260807) that has its own `secure_token` column. This is a **second token system** that overlaps.

### Confirm

**YES** — `vendor_secure_tokens` IS the table the handoff doc references as "vendor_secure_tokens." It is NOT a separate table. But it needs `vendor_service_record_id` and `viewed_at` columns added.

### compliance_document_requests (Aug 2026 — parallel token system)

**Migration:** `20260807000000_compliance_documents_foundation.sql` (lines 170–189)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| organization_id | uuid | FK |
| document_id | uuid | FK → compliance_documents(id) |
| vendor_id | uuid | FK → vendors(id) |
| employee_id | uuid | FK → user_profiles(id) |
| requested_by | uuid | FK → auth.users(id) |
| requested_at | timestamptz | — |
| secure_token | text | UNIQUE |
| secure_token_expires_at | timestamptz | — |
| fulfilled_at | timestamptz | — |
| cancelled_at | timestamptz | — |
| resend_count | integer | Default 0 |
| last_resent_at | timestamptz | — |
| recipient_email | text | — |
| recipient_name | text | — |
| note_to_recipient | text | — |

### ⚠ FLAG: Two Token Systems

| System | Table | Purpose | Token Column |
|---|---|---|---|
| **Feb 2026** | vendor_secure_tokens | Auto-request for expiring vendor docs | token (varchar 64) |
| **Aug 2026** | compliance_document_requests | Generic document request tokens | secure_token (text) |

These MUST be reconciled. The locked routing workflow should use `compliance_document_requests` as the canonical token table, with `vendor_secure_tokens` deprecated or merged.

---

## SECTION D — `vendor_service_records`

**Migration:** `20260802000000_vendor_service_records.sql` (lines 14–81)

### Key Columns (relevant to documents FK)

| Column | Type | NOT NULL | Notes |
|---|---|---|---|
| id | uuid | YES | PK — **FK target for documents** |
| organization_id | uuid | YES | FK → organizations(id) |
| location_id | uuid | YES | FK → locations(id) |
| safeguard_type | text | YES | CHECK: hood_cleaning, fire_suppression, fire_alarm, sprinklers |
| service_type_code | text | NO | FK → service_type_definitions(code) |
| vendor_name | text | NO | Denormalized name (no FK to vendors) |
| service_date | date | NO | — |
| next_due_date | date | NO | — |
| interval_label | text | NO | — |
| price_charged | numeric | NO | — |
| source | text | NO | CHECK: manual, vendor_upload, hoodops, webhook |
| event_id | text | NO | UNIQUE — webhook idempotency |
| reconciliation_status | text | NO | CHECK: verified, pending_review, discrepancy, + 4 accepted variants, superseded |

### RLS

- org members: full CRUD via user_profiles.organization_id match
- service_role: full access

### ⚠ FLAG

`vendor_service_records` uses `vendor_name` (text) instead of `vendor_id` (uuid FK). The documents table needs `vendor_service_record_id` as a FK, but the service record itself doesn't FK to vendors — it stores the name as text. This means the join path from documents → vendor_service_records → vendor requires knowing vendor_name, not vendor_id.

---

## SECTION E — `location_service_schedules`

**Migration:** `20260803000000_location_schedules_and_reschedule_requests.sql` (lines 19–42)

### Key Columns (relevant to answer-line UI)

| Column | Type | NOT NULL | Notes |
|---|---|---|---|
| id | uuid | YES | PK |
| organization_id | uuid | YES | FK |
| location_id | uuid | YES | FK |
| service_type_code | text | YES | FK → service_type_definitions(code) |
| vendor_name | text | NO | Denormalized (text, not FK) |
| vendor_id | uuid | NO | FK → vendors(id) — **EXISTS ✓** |
| frequency | text | NO | e.g., "Quarterly", "Monthly" |
| frequency_interval_days | integer | NO | Numeric frequency |
| last_service_date | date | NO | — |
| next_due_date | date | NO | — ✓ |
| negotiated_price | numeric | NO | — |
| notes | text | NO | — |
| is_active | boolean | YES | Default true |

### Answer-Line UI Requirements Check

| Required Column | Exists? | Notes |
|---|---|---|
| next_due_date | ✓ YES | — |
| frequency | ✓ YES | Text label |
| vendor_id | ✓ YES | FK → vendors(id) |
| location_id | ✓ YES | FK → locations(id) |
| vendor_name | ✓ YES | Denormalized text |

All columns needed for the answer-line formula ("Hood cleaning due in 12 days · CPP scheduled") are present.

### UNIQUE Constraint

`(organization_id, location_id, service_type_code)` — one schedule per service type per location.

---

## SECTION F — Tables That DON'T Exist Yet

### Expected vs Actual

| Expected Table | Actual Table in PROD | Status |
|---|---|---|
| `document_audit_log` | `compliance_document_activity_log` | ✓ **EXISTS** (different name) |
| `document_shares` | `compliance_document_send_records` | ✓ **EXISTS** (different name) |
| `document_share_items` | `compliance_document_send_items` | ✓ **EXISTS** (different name) |
| `share_recommendation_rules` | — | **DOES NOT EXIST** |

### compliance_document_activity_log (= document_audit_log)

**Migration:** 20260807000000 (lines 247–271)
- event_type CHECK: `requested, request_resent, request_cancelled, submitted, viewed, accepted, rejected, archived, expired, expiring_warning, renewed, sent_to_third_party, send_revoked, noted`
- Append-only design (service_role INSERT only, NO UPDATE/DELETE) ✓
- Covers accept/reject/resend/share ✓

### compliance_document_send_records (= document_shares)

**Migration:** 20260808000000 (lines 30–59)
- Has: token, recipient_type, recipient_email, purpose, cover_message, expires_at, revoked_at, opened_at, download_count ✓
- recipient_type CHECK: `government, insurance, property, custom`

### ⚠ FLAG: recipient_type mismatch

| PROD CHECK Values | Locked Decision Values |
|---|---|
| government, insurance, property, custom | ehd, ahj, insurance_broker, insurance_carrier, auditor, client_legal |

The PROD values are broad categories; the locked decision has 6 specific types. Migration must ALTER CHECK.

### compliance_document_send_items (= document_share_items)

**Migration:** 20260808000000 (lines 125–138)
- Has: send_record_id → compliance_document_send_records(id), document_id → compliance_documents(id) ✓
- Has: recommendation_tier (required/recommended/optional/manual), included_in_send ✓

### share_recommendation_rules — DOES NOT EXIST

No table maps `(recipient_type, purpose) → required document types[]`. The AI recommendation logic in the preview is currently hardcoded. This table needs creating.

---

## SECTION G — Cron Infrastructure

### Existing Cron Jobs

| Cron | Schedule | Function | Migration |
|---|---|---|---|
| daily-readiness-snapshot | 0 6 * * * (6 AM UTC) | snapshot-readiness | 20260625000000 |
| violation-crawl | 0 15 * * * (3 PM UTC) | violation-crawl | 20260517100000 |
| trial-email-cron | — | trial email sender | 20260530100000 |
| predictive-alerts | — | predictive alerts | 20260603000000 |
| delete-orphaned-vendor | — | cleanup | 20260805000000 |

### Vendor Service Record Trigger Cron

**DOES NOT EXIST.** No cron job fires N business days after expected service date. This is the core of the routing workflow and must be created.

**What's needed:**
- Cron: `vendor-service-record-trigger` — daily, scans `location_service_schedules` for schedules where `next_due_date + 5 business days ≤ today` AND no pending token exists
- Edge function: creates `compliance_document_requests` row with secure_token, sends branded Resend email

### Existing Auto-Request Cron

`auto-request-documents` runs daily at 7 AM UTC. It checks **documents approaching expiration** and sends auto-requests. This is for document renewals (expiring COIs, etc.), NOT for post-service-date record requests. Different workflow.

### Resend Webhook

**`resend-webhook` edge function EXISTS** (supabase/functions/resend-webhook/index.ts)

Current behavior: **Passive listener only.** Receives Resend events (email.delivered, email.opened, email.clicked, email.bounced), validates Svix signature, logs, and returns 200. **No database writes.** No `viewed_at` update on any token table.

**What's needed:** Extend to write `viewed_at` on `compliance_document_requests` (or `vendor_secure_tokens`) when email.opened event fires, and create in-app notification for client.

---

## SECTION H — Ripple Analysis

### Files Referencing `documents` (legacy table) — 48 files

**CRITICAL EDGE FUNCTIONS (write to table):**

| File | Summary | Break Risk |
|---|---|---|
| vendor-secure-upload/index.ts:89,102,107 | Uploads to storage bucket "documents", inserts to documents table, updates vendor_documents | HIGH — writes to BOTH tables |
| ai-document-analysis/index.ts:146 | Claude AI document extraction, updates documents | HIGH |
| auto-request-documents/index.ts:70 | Checks documents expiration, fires auto-requests | MEDIUM |
| validate-vendor-document/index.ts:114 | AI validation, references documents | MEDIUM |
| generate-partner-demo/index.ts:356 | Demo INSERT — only for demos | LOW |

**HOOKS:**

| File | Summary |
|---|---|
| src/hooks/useSaveDocument.ts:29 | Document save helper — writes to documents table |
| src/hooks/useFeatureCriteriaProgress.ts:120 | Counts documents for feature unlocking |
| src/hooks/useMobileAlerts.ts:62 | Mobile alert queries |

**PAGES:**

| File | Summary |
|---|---|
| src/pages/Documents.tsx:332 | Main documents page — SELECT from documents |
| src/pages/K12Compliance.tsx:203 | K-12 compliance |
| src/pages/insights/ViolationRadar.jsx:37 | Expiration tracking |

### Files Referencing `vendor_documents` — 10 files

| File | Summary | Break Risk |
|---|---|---|
| vendor-secure-upload/index.ts:145,159,166 | Version detection, superseding, INSERT | HIGH |
| validate-vendor-document/index.ts:46,276,290 | AI validation, status UPDATE | HIGH |
| vendor-document-reminders/index.ts:228 | Expiry reminder queries | MEDIUM |
| src/hooks/useVendorSubmissions.ts:130,165 | Vendor doc queries with joins | MEDIUM |
| src/lib/vendorDocumentActions.ts:37 | Action helper functions | MEDIUM |

### Files Referencing `vendor_service_records` — 16 files

| File | Summary | Break Risk |
|---|---|---|
| hoodops-webhook/index.ts:149 | INSERT with event_id idempotency | HIGH — UNIQUE constraint |
| process-service-reminders/index.ts (6 refs) | Complex reconciliation workflow | HIGH |
| vendor-notification-sender/index.ts (4 refs) | Service record notifications | MEDIUM |
| src/components/services/LogServiceModal.jsx:66,103 | Service logging modal | MEDIUM |
| src/hooks/useVendorServiceRecords.ts:36 | Data hook | LOW |

### Files Referencing `location_service_schedules` — 13 files

| File | Summary | Break Risk |
|---|---|---|
| hoodops-webhook/index.ts:179,213,281 | Schedule updates from webhook | HIGH |
| src/pages/fireSafety/Trajectory.jsx:129,277 | Fire safety trajectory | MEDIUM |
| src/components/services/ServiceComplianceList.jsx:48 | Compliance list | MEDIUM |
| src/hooks/usePSESchedules.ts:72 | Schedule hook | LOW |

### Files Referencing `vendor_upload_requests` — 6 files

| File | Summary | Break Risk |
|---|---|---|
| vendor-secure-upload/index.ts:133 | Marks request completed | MEDIUM |
| auto-request-documents/index.ts:85,170,240 | Auto-request system | MEDIUM |
| src/pages/Vendors.tsx:896,983,1627 | Vendor page — 3 INSERT locations | MEDIUM |

---

## SECTION I — Status Enum Collision Check

The string `overdue` is used independently across three domains:

| Domain | Table/Column | Meaning | Migration |
|---|---|---|---|
| **Document status** | compliance_documents.status | Token expired without vendor upload | **NOT YET in CHECK** (needs adding) |
| **Document request stage** | Documents Preview mock: request.stage | Upload request is past expiration | UI only (no DB column) |
| **Service status** | Vendor Services Preview: service.status | Service is past due date | UI only (no DB column yet) |

### Additional `overdue` Usages

- `vendor_service_records` does NOT have a status column with `overdue` — it uses `reconciliation_status` with different values
- `location_service_schedules` does NOT have a status column

### Assessment

The `overdue` collision is **UI-layer only** currently. No schema conflict exists because:
1. Document `overdue` will live in `compliance_documents.status` CHECK
2. Service `overdue` is a derived client-side state (computed from `next_due_date < today`)
3. Request stage `overdue` lives in UI mock data only (no DB column)

**No schema change needed.** Just flag for downstream UI work: render logic must know which domain's `overdue` it's displaying.

---

## RECONCILIATION SUMMARY — All Flags

| # | Flag | Severity | Section |
|---|---|---|---|
| 1 | `compliance_documents.category` uses `kitchen_employee/vendor_service/vendor_business` but locked decision says `kitchen/service/business` | **CRITICAL** | A2 |
| 2 | `compliance_documents.status` uses `pending` but locked decision says `pending_review` | **CRITICAL** | A2 |
| 3 | `compliance_documents.status` missing `overdue` value | **HIGH** | A2 |
| 4 | `compliance_documents.status` has `rejected/archived/cancelled` not in locked 6-value enum | **MEDIUM** | A2 |
| 5 | `vendor_secure_tokens` missing `vendor_service_record_id` FK | **HIGH** | C |
| 6 | `vendor_secure_tokens` missing `viewed_at` column | **HIGH** | C |
| 7 | Two parallel token systems (`vendor_secure_tokens` + `compliance_document_requests`) | **HIGH** | C |
| 8 | `vendor_service_records.vendor_name` is text, not vendor_id FK | **MEDIUM** | D |
| 9 | `compliance_document_send_records.recipient_type` CHECK uses broad categories vs locked 6-value enum | **MEDIUM** | F |
| 10 | `share_recommendation_rules` table does not exist | **MEDIUM** | F |
| 11 | No cron job for vendor-service-record-trigger | **HIGH** | G |
| 12 | `resend-webhook` is passive (no DB writes on email.opened) | **HIGH** | G |
| 13 | Two document table families (`documents` + `compliance_documents`) need consolidation strategy | **CRITICAL** | A/A2 |

---

## HARD STOP

Report complete. Waiting for Arthur to read before migration plan.

No migrations. No schema changes. No edge function code. Read-only audit only.

---

*End of DOCUMENTS-SCHEMA-AUDIT.md*
