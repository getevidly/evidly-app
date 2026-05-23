# Vendor Service Records Routing Audit

**Date:** 2026-05-07
**SHA:** 7a6d62b (main)
**Scope:** Read-only inventory of PROD state vs. locked 11-step vendor service record routing spec
**Author:** Claude (Sprint A audit pass)

---

## Executive Summary (200 words)

The EvidLY codebase contains substantial vendor document infrastructure — secure token generation, tokenized upload pages, AI document analysis, multi-stage expiry reminders, and branded email/SMS delivery — but almost none of it is wired to `vendor_service_records`. The existing system routes around **document expiry** (COI, permits, certificates), not around **service completion**. The locked 11-step spec requires a fundamentally different trigger: "N business days after expected service date, vendor receives a secure tokenized email." Today, no edge function queries `vendor_service_records.next_service_date` to fire that trigger.

Key gaps: (1) no FK link between `vendor_secure_tokens` and `vendor_service_records`; (2) `resend-webhook` tracks opens only for `trial_email_log`, not vendor emails; (3) client-side review (Accept/Reject with re-upload) exists for documents but has no reject-reason taxonomy matching the spec; (4) reminder cadence is day 4/7/14 (auto-request-settings), not the spec's day 3/7/10/14/21/30; (5) day-30 escalation logic does not exist; (6) two pg_cron entries (`vendor-upload-reminders`, `vendor-sms-reminders`) point to edge functions that do not exist. All relevant tables have 0 rows in PROD — nothing is live yet.

---

## Part A — Schema Inventory

### A.1 Tables (all 0 rows in PROD)

| Table | Columns | Status | Notes |
|-------|---------|--------|-------|
| `vendor_service_records` | 35 | Created (Sprint Zero) | `event_id` UNIQUE, 3 CHECK constraints, 0 rows |
| `vendor_secure_tokens` | 10 | Created | FKs to vendors, organizations, vendor_upload_requests, documents |
| `auto_request_settings` | 11 | Created | CHECK on notify_via (email/sms/both), org-scoped |
| `auto_request_log` | 12 | Created | FKs to organizations, vendors, vendor_secure_tokens, vendor_upload_requests |
| `vendor_upload_requests` | 19 | Created | Includes secure_token, token_expires_at, auto_requested, reminder_count |
| `platform_audit_log` | 10 | Created (Sprint A-1) | Service-role only, no authenticated policies |
| `service_action_log` | 10 | Created (Sprint A-1) | FK to vendor_service_records + service_reschedule_requests |
| `location_service_schedules` | — | Created (Sprint Zero) | 0 rows |
| `service_reschedule_requests` | — | Created (Sprint Zero) | 0 rows |
| `client_notifications` | 16 | Created | Signal-based notification system |
| `vendor_contact_log` | 12 | Created (placeholder era) | Different schema from service_action_log; contact_type, subject, body |

### A.2 DB Functions

| Function | Security | Purpose |
|----------|----------|---------|
| `generate_secure_token` | INVOKER | Generates secure upload tokens |
| `create_vendor_upload_request` | DEFINER | Creates upload request + token atomically |
| `update_vendor_service_records_updated_at` | INVOKER | Trigger function for updated_at |

### A.3 pg_cron Jobs (vendor-related)

| Job Name | Schedule | Target | Status |
|----------|----------|--------|--------|
| `vendor-notifications-daily` | 0 16 UTC | `vendor-notification-sender` | Edge fn EXISTS |
| `vendor-upload-reminders` | 0 9 UTC | `vendor-upload-reminder` | **Edge fn MISSING** |
| `vendor-sms-reminders` | 15 9 UTC | `vendor-sms-reminder` | **Edge fn MISSING** |
| `vendor-partner-outreach-daily` | 0 17 UTC | `vendor-partner-outreach` | Edge fn EXISTS |

**Security note:** Some cron jobs embed hardcoded `service_role` JWT in command text (expiration-alerts, vendor-sms-reminders, vendor-upload-reminders, weekly-digest).

---

## Part B — Edge Functions

| Function | Implemented | Reads VSR? | Reads VST? | Sends Email? | Sends SMS? | In-App Notify? |
|----------|-------------|-----------|-----------|-------------|-----------|---------------|
| `vendor-notification-sender` | FULL | YES | NO | YES | NO | YES |
| `vendor-secure-upload` | FULL | NO | YES | YES (delegates) | NO | NO |
| `auto-request-documents` | FULL | NO | NO | YES | YES | NO |
| `vendor-document-reminders` | FULL | NO | YES | YES | NO | YES |
| `vendor-document-notify` | FULL | NO | NO | YES | NO | NO |
| `vendor-contact` | FULL | NO | NO | YES | NO | NO |
| `resend-webhook` | STUB | NO | NO | NO | NO | NO |
| `hoodops-webhook` | FULL | YES (write) | NO | NO | NO | NO |
| `vendor-upload-reminder` | **MISSING** | — | — | — | — | — |
| `vendor-sms-reminder` | **MISSING** | — | — | — | — | — |

**VSR** = vendor_service_records, **VST** = vendor_secure_tokens

### Key observations:
- `vendor-notification-sender` is the ONLY function that reads `vendor_service_records` (for overdue/cert-missing alerts)
- `auto-request-documents` drives the document-expiry flow (not service-record flow)
- `vendor-secure-upload` handles the upload + AI trigger but does NOT link uploads to a `vendor_service_records.id`
- `resend-webhook` only updates `trial_email_log` — vendor email open-tracking is not wired

---

## Part C — Frontend

| Component | Path | Status |
|-----------|------|--------|
| `VendorSecureUpload.tsx` | `/vendor-upload/:token` | FULL — token validation, file upload, success/error states |
| `VendorDocumentReview.jsx` | Admin route | FULL — pending/approved/declined, AI status, re-upload request |
| `NotificationContext.tsx` | Context provider | FULL — unified in-app notification system |

---

## Part D — AI Pipeline

| Function | Purpose | Status |
|----------|---------|--------|
| `ai-document-analysis` | Post-upload document parsing + metadata extraction | EXISTS |
| `classify-document` | Document type classification | EXISTS |
| `validate-vendor-document` | Vendor document validation | EXISTS |

Pipeline is triggered by `vendor-secure-upload` on successful file upload (fire-and-forget).

---

## Part E — Audit Logs

| Table | Rows | Writer |
|-------|------|--------|
| `platform_audit_log` | 0 | `hoodops-webhook` (Sprint A-1 wiring) |
| `service_action_log` | 0 | None yet (FK to vendor_service_records ready) |

---

## Part F — Gap Analysis (11-Step Spec)

### Step 1: Service is scheduled
**Tag:** ✅ Built
**Evidence:** `location_service_schedules` and `vendor_service_records` tables exist with correct schema. `service_type_definitions` seeded with 7 codes. `hoodops-webhook` writes to `vendor_service_records`.
**Gap:** 0 rows in PROD — no services scheduled yet.

---

### Step 2: N business days after expected service date, vendor receives secure tokenized email
**Tag:** 🔴 Stub / ⚫ Missing
**Evidence:** `auto-request-documents` sends tokenized emails, but it triggers on **document expiry** (`days_before_expiration`), not on **service completion date** (`vendor_service_records.next_service_date`). No edge function queries `vendor_service_records` to compute "N business days after expected service date."
**Gap:** Need a new trigger function (or new phase in `vendor-notification-sender`) that:
  - Queries `vendor_service_records` for records past `next_service_date` by N business days
  - Generates a `vendor_secure_token` **linked to a specific `vendor_service_records.id`**
  - Sends branded email with tokenized upload link

---

### Step 3: Token validity 5 BD, tied to specific vendor_service_records.id
**Tag:** 🟡 Partial
**Evidence:** `vendor_secure_tokens` exists with `expires_at` and `document_type` fields. `generate_secure_token` function exists. Token validation works in `vendor-secure-upload`.
**Gap:**
  - No FK from `vendor_secure_tokens` to `vendor_service_records` — tokens are tied to document types, not service records
  - Token validity is currently 14 days (`vendor-document-reminders`) or `link_expires_days` from `auto_request_settings` (default 14) — not 5 business days
  - Need: `ALTER TABLE vendor_secure_tokens ADD COLUMN service_record_id uuid REFERENCES vendor_service_records(id)`

---

### Step 4: Vendor opens email → in-app notification to client
**Tag:** 🔴 Stub
**Evidence:** `resend-webhook` exists and handles `email.opened` events, but only updates `trial_email_log`. No logic to:
  - Match opened email to a vendor service record
  - Fire in-app notification to client on open
**Gap:** Need `resend-webhook` to look up vendor email metadata, resolve to `vendor_service_records.id`, and call `createNotification()` for the org.

---

### Step 5: Vendor uploads → parse, classify, attach to exact vendor_service_records.id
**Tag:** 🟡 Partial
**Evidence:** `vendor-secure-upload` is FULLY implemented — validates token, uploads to storage, triggers `ai-document-analysis`. But:
  - Upload attaches to `documents` table (generic), not specifically to a `vendor_service_records.id`
  - No `service_record_id` column on `vendor_secure_tokens` means the upload can't be routed to the correct service record
**Gap:** After adding `service_record_id` FK to tokens (Step 3 fix), `vendor-secure-upload` needs to write the resolved `service_record_id` to the created document or directly to `vendor_service_records`.

---

### Step 6: Client reviews — Accept/Reject with reason taxonomy
**Tag:** 🟡 Partial
**Evidence:** `VendorDocumentReview.jsx` exists with pending/approved/declined states and a re-upload request flow (`requestReupload` from `vendorDocumentActions`).
**Gap:**
  - Reject-reason taxonomy (Wrong Service Report / Wrong Client / Other with free text) is NOT implemented — current flow is generic decline
  - Rejection email + fresh token for re-upload: `requestReupload` exists but unclear if it generates a new secure token and sends vendor email
  - Need to verify `requestReupload` implementation wires to token generation + branded email

---

### Step 7: Reminder cadence — day 3, 7, 10, 14, 21, 30 (business days)
**Tag:** 🔴 Stub
**Evidence:** `auto-request-documents` has reminder logic but on day 4, 7, 14 cadence (from `auto_request_settings`). `vendor-document-reminders` has 7-stage expiry reminders (60d, 30d, 14d, 7d, 0d, -1d, -7d) — different cadence entirely.
**Gap:**
  - Spec cadence (3, 7, 10, 14, 21, 30 BD) does not match any existing implementation
  - Each reminder must carry a fresh 5-BD token
  - Reminders must stop on upload
  - pg_cron jobs for `vendor-upload-reminder` and `vendor-sms-reminder` exist but their edge functions are MISSING

---

### Step 8: Day-30 escalation — in-app notification to client
**Tag:** ⚫ Missing
**Evidence:** No edge function implements a day-30 unresponsive-vendor escalation. `vendor-notification-sender` handles overdue/cert-missing but not "vendor failed to upload service report after 30 days."
**Gap:** Need escalation logic: if no upload after 30 BD from initial send, create high-priority in-app notification to client — "vendor unresponsive, manual intervention needed."

---

### Step 9: All client notifications — in-app only (no email)
**Tag:** ✅ Built (infrastructure)
**Evidence:** `createNotification()` and `createOrgNotification()` in `_shared/notify.ts` support in-app notifications. `NotificationContext.tsx` provides frontend delivery. `vendor-notification-sender` already sends in-app notifications.
**Gap:** Must ensure the new service-record flow uses `createNotification()` exclusively for client-facing alerts (no Resend calls for client notifications in this flow).

---

### Step 10: All vendor emails — EvidLY-branded (navy/gold/cream)
**Tag:** ✅ Built
**Evidence:** `_shared/email.ts` provides EvidLY-branded HTML builder with navy/gold/cream palette. `vendor-document-notify` sends branded emails with urgency banners. `auto-request-documents` uses `sendVendorEmail()` with branded templates. From address: `noreply@getevidly.com`.
**Gap:** None for branding. Existing infrastructure covers this.

---

### Step 11: Post-setup zero touch — fully automatic
**Tag:** ⚫ Missing (for service-record flow)
**Evidence:** The document-expiry flow IS zero-touch (cron → send → remind → escalate). But the service-record flow has no automated trigger. Nothing today watches `vendor_service_records.next_service_date` and fires the tokenized-email sequence.
**Gap:** The entire trigger → send → receive → parse → route → notify pipeline needs to be wired for service records. Infrastructure components exist (tokens, uploads, AI, notifications) but the orchestration layer connecting them to `vendor_service_records` is missing.

---

### Summary Matrix

| Step | Description | Tag | Effort |
|------|-------------|-----|--------|
| 1 | Service scheduled | ✅ Built | — |
| 2 | N BD after service → tokenized email | 🔴 Stub | New trigger function |
| 3 | Token tied to VSR, 5 BD validity | 🟡 Partial | Schema + config change |
| 4 | Email open → client notification | 🔴 Stub | Resend webhook expansion |
| 5 | Upload → parse → attach to VSR | 🟡 Partial | FK wiring in upload handler |
| 6 | Accept/Reject with reason taxonomy | 🟡 Partial | UI + backend taxonomy |
| 7 | Reminder cadence 3/7/10/14/21/30 | 🔴 Stub | New reminder engine |
| 8 | Day-30 escalation | ⚫ Missing | New escalation logic |
| 9 | Client notifications in-app only | ✅ Built | Infra ready |
| 10 | Vendor emails branded | ✅ Built | Infra ready |
| 11 | Zero-touch automation | ⚫ Missing | Orchestration layer |

**Scorecard:** 3 Built, 3 Partial, 3 Stub, 2 Missing

---

## Part G — Open Questions for Arthur

1. **Orphaned pg_cron jobs:** `vendor-upload-reminders` and `vendor-sms-reminders` cron entries exist but their edge functions are missing. Should these be deleted, or are they placeholders for the new service-record reminder engine?

2. **Hardcoded JWTs in cron commands:** Several pg_cron entries embed the `service_role` secret key directly in the SQL command text. This is visible to anyone with `cron.job` read access. Should these be migrated to `current_setting('app.settings.service_role_key')` pattern?

3. **Existing `vendor_contact_log` (12-col) vs new `service_action_log` (10-col):** Both exist in PROD with 0 rows. Is the old `vendor_contact_log` (from placeholder migration `20260206000001`) slated for removal, or does it serve a different purpose (communications log vs. service action log)?

4. **`auto_request_settings` reminder cadence (day 4/7/14) vs spec cadence (day 3/7/10/14/21/30):** Should the new service-record flow reuse `auto_request_settings` with updated defaults, or should it have its own configuration table?

5. **Token validity:** Existing tokens use 14-day calendar expiry. Spec requires 5 business-day expiry. Should `vendor_secure_tokens.expires_at` be computed as 5 BD from creation, or should we add a separate `bd_expires_at` concept?

6. **`vendor-notification-sender` scope creep:** This function already reads `vendor_service_records` for overdue/cert-missing alerts. Should the Step 2 trigger (N BD after service date → tokenized email) be added as a new phase in this function, or built as a separate edge function?

7. **Reject-reason taxonomy (Step 6):** The spec lists three reasons: Wrong Service Report, Wrong Client, Other (free text). Should these be stored as an enum column on `vendor_upload_requests` or in a separate `review_decisions` table?

8. **SMS in the service-record flow:** The spec mentions email only. Should SMS be excluded from the service-record flow entirely, or carried forward from the document-expiry flow's Twilio integration?

---

## Appendix — Storage

- **Bucket:** `documents`
- **Vendor upload path:** `vendor-uploads/{org_id}/{vendor_id}/`
- **Upload limit:** 25 MB (enforced in `vendor-secure-upload`)

---

*End of audit. No code modifications made. Waiting for Arthur's review.*
