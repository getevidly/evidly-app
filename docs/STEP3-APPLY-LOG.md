# STEP3-APPLY-LOG — Phase 1 Schema Migrations

> **Date:** 2026-05-10
> **PROD project:** irxgmhxhmxtzfwuieblc
> **Apply method:** Supabase CLI (`npx supabase db query --linked`)
> **Operator:** Claude Code (automated, human-approved plan)

---

## Pre-Apply Checklist

```sql
SELECT (SELECT count(*) FROM compliance_documents) AS cd_rows,
       (SELECT count(*) FROM compliance_document_requests) AS cdr_rows,
       (SELECT count(*) FROM vendor_service_records) AS vsr_rows;
```

| cd_rows | cdr_rows | vsr_rows |
|---|---|---|
| 0 | 0 | 0 |

**Result: ✅ PASS — all target tables empty**

```sql
SELECT name FROM vault.decrypted_secrets
WHERE name IN ('project_url', 'service_role_key');
```

| name |
|---|
| service_role_key |

**Result: ⚠️ `project_url` missing, `service_role_key` present. Acceptable — M13 (cron) is deferred.**

---

## Migration Apply Log

### M1 — compliance_documents.category CHECK (4-value)

**File:** `20260810000001_cd_category_4value.sql`

**Verification:**
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.compliance_documents'::regclass
  AND conname = 'compliance_documents_category_check';
```

| conname | pg_get_constraintdef |
|---|---|
| compliance_documents_category_check | CHECK ((category = ANY (ARRAY['kitchen'::text, 'employee'::text, 'service'::text, 'business'::text]))) |

**Result: ✅ PASS**

---

### M2 — compliance_documents.status CHECK (6-value) + partial index

**File:** `20260810000002_cd_status_6value.sql`

**Verification (constraint):**
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.compliance_documents'::regclass
  AND conname = 'compliance_documents_status_check';
```

| conname | pg_get_constraintdef |
|---|---|
| compliance_documents_status_check | CHECK ((status = ANY (ARRAY['current'::text, 'expiring'::text, 'expired'::text, 'pending_review'::text, 'requested'::text, 'overdue'::text]))) |

**Verification (index):**
```sql
SELECT indexdef FROM pg_indexes
WHERE indexname = 'idx_compliance_documents_org_pending';
```

| indexdef |
|---|
| CREATE INDEX idx_compliance_documents_org_pending ON public.compliance_documents USING btree (organization_id, status) WHERE (status = ANY (ARRAY['pending_review'::text, 'requested'::text])) |

**Result: ✅ PASS**

---

### M3 — subject_user_id column + CHECK + index

**File:** `20260810000003_cd_subject_user_id.sql`

**Verification (column):**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'compliance_documents' AND column_name = 'subject_user_id';
```

| column_name | data_type | is_nullable |
|---|---|---|
| subject_user_id | uuid | YES |

**Verification (constraint):**
```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.compliance_documents'::regclass
  AND conname = 'cd_employee_requires_subject';
```

| conname |
|---|
| cd_employee_requires_subject |

**Result: ✅ PASS**

---

### M4 — SKIPPED (expiry_date already exists)

---

### M5 — vendor_service_record_id on compliance_document_requests

**File:** `20260810000004_cdr_vendor_service_record_id.sql`

**Verification:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'compliance_document_requests'
  AND column_name = 'vendor_service_record_id';
```

| column_name | data_type |
|---|---|
| vendor_service_record_id | uuid |

**Result: ✅ PASS**

---

### M6 — viewed_at on compliance_document_requests

**File:** `20260810000005_cdr_viewed_at.sql`

**Verification:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'compliance_document_requests'
  AND column_name = 'viewed_at';
```

| column_name | data_type |
|---|---|
| viewed_at | timestamp with time zone |

**Result: ✅ PASS**

---

### M7 — SKIPPED (resend_count already exists)

---

### M8 — FK constraint on location_service_schedules.vendor_id

**File:** `20260810000006_lss_vendor_id_fk.sql`

**Pre-check:** 0 orphaned vendor_ids confirmed.

**Verification:**
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.location_service_schedules'::regclass
  AND conname = 'lss_vendor_id_fkey';
```

| conname | pg_get_constraintdef |
|---|---|
| lss_vendor_id_fkey | FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL |

**Result: ✅ PASS**

---

### M9a — vendor_id column on vendor_service_records (nullable)

**File:** `20260810000007_vsr_vendor_id_nullable.sql`

**Verification:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vendor_service_records' AND column_name = 'vendor_id';
```

| column_name | data_type | is_nullable |
|---|---|---|
| vendor_id | uuid | YES |

**Result: ✅ PASS**

---

### M9b — Backfill vendor_id (no-op on 0 rows)

**File:** `20260810000008_vsr_vendor_id_backfill.sql`

**Verification:**
```sql
SELECT count(*) AS total_rows,
       count(vendor_id) AS has_vendor_id,
       count(*) - count(vendor_id) AS missing_vendor_id
FROM vendor_service_records;
```

| total_rows | has_vendor_id | missing_vendor_id |
|---|---|---|
| 0 | 0 | 0 |

**NOT NULL constraint: NOT applied (commented out per plan)**

**Result: ✅ PASS**

---

### M10 — share_recommendation_rules table + 15 seed rows

**File:** `20260810000009_share_recommendation_rules.sql`

**Verification:**
```sql
SELECT recipient_type, count(*) AS rules
FROM share_recommendation_rules
GROUP BY recipient_type ORDER BY recipient_type;
```

| recipient_type | rules |
|---|---|
| ahj | 3 |
| auditor | 2 |
| client_legal | 2 |
| ehd | 3 |
| insurance_broker | 3 |
| insurance_carrier | 2 |

**Total: 15 rows ✅**

**Result: ✅ PASS**

---

### M11 — RLS policies (replace 5 → 8)

**File:** `20260810000010_cd_rls_policies.sql`

**Verification:**
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'compliance_documents'
ORDER BY policyname;
```

| policyname | cmd | roles |
|---|---|---|
| cd_delete_management | DELETE | {authenticated} |
| cd_insert_org_member | INSERT | {authenticated} |
| cd_insert_vendor_self_service | INSERT | {authenticated} |
| cd_select_org_member | SELECT | {authenticated} |
| cd_service_role_insert | INSERT | {service_role} |
| cd_service_role_update | UPDATE | {service_role} |
| cd_update_org_member | UPDATE | {authenticated} |
| cd_update_vendor_self_service | UPDATE | {authenticated} |

**Total: 8 policies ✅**

**Result: ✅ PASS**

---

### M12 — Additional indexes

**File:** `20260810000011_cd_additional_indexes.sql`

**Verification:**
```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'compliance_documents'
  AND indexname IN ('idx_cd_org_cat_status_loc_vendor', 'idx_cd_expiry_not_null', 'idx_cd_subject_user_id')
ORDER BY indexname;
```

| indexname |
|---|
| idx_cd_expiry_not_null |
| idx_cd_org_cat_status_loc_vendor |
| idx_cd_subject_user_id |

**Total: 3 indexes ✅**

**Result: ✅ PASS**

---

### M13 — DEFERRED (cron registration)

**Not applied.** Deferred until vendor-service-record-trigger edge function is deployed.
Migration file written: `20260810000012_cron_vendor_service_record_trigger.sql`

---

### M14 — Table comments

**File:** `20260810000013_table_comments.sql`

**Verification:**
```sql
SELECT obj_description('public.compliance_documents'::regclass) IS NOT NULL AS has_comment;
```

| has_comment |
|---|
| true |

**Result: ✅ PASS**

---

## Post-Apply Summary

```sql
-- CHECK constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.compliance_documents'::regclass AND contype = 'c'
ORDER BY conname;
```

| conname | pg_get_constraintdef |
|---|---|
| cd_employee_requires_subject | CHECK (((category <> 'employee'::text) OR (subject_user_id IS NOT NULL))) |
| compliance_documents_category_check | CHECK ((category = ANY (ARRAY['kitchen'::text, 'employee'::text, 'service'::text, 'business'::text]))) |
| compliance_documents_import_source_check | CHECK ((import_source = ANY (ARRAY[...]))) |
| compliance_documents_status_check | CHECK ((status = ANY (ARRAY['current'::text, 'expiring'::text, 'expired'::text, 'pending_review'::text, 'requested'::text, 'overdue'::text]))) |

**4 CHECK constraints (3 new/updated + 1 pre-existing import_source)**

| Metric | Expected | Actual | Status |
|---|---|---|---|
| CHECK constraints | 3 (+ import_source) | 4 | ✅ |
| RLS policies | 8 | 8 | ✅ |
| Index count | 11 | 11 | ✅ |
| share_recommendation_rules exists | true | true | ✅ |
| Seed rows | 15 | 15 | ✅ |
| New columns | 4 | 4 | ✅ |
| Cron registered | SKIPPED | N/A | DEFERRED |

---

## Migrations NOT Applied

| Migration | Reason |
|---|---|
| M4 | expiry_date already exists — no action needed |
| M7 | resend_count already exists — no action needed |
| M13 | Cron deferred until edge function deployed |

## Vault Note

`project_url` vault secret is missing. Must be added before M13 can be applied. `service_role_key` is present.

---

## Phase 1.5 — CHECK Constraint Updates (2026-05-10)

**File:** `20260810000014_phase15_check_updates.sql`

### Pre-Flight

```sql
SELECT
  (SELECT count(*) FROM compliance_document_activity_log) AS activity_log_rows,
  (SELECT count(*) FROM compliance_document_send_records) AS send_records_rows;
```

| activity_log_rows | send_records_rows |
|---|---|
| 0 | 0 |

**Result: ✅ Both tables empty — safe to replace CHECKs**

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN ('public.compliance_document_activity_log'::regclass, 'public.compliance_document_send_records'::regclass)
  AND contype = 'c';
```

| conname | pg_get_constraintdef |
|---|---|
| compliance_document_activity_log_event_type_check | CHECK ((event_type = ANY (ARRAY['requested'::text, 'request_resent'::text, 'request_cancelled'::text, 'submitted'::text, 'viewed'::text, 'accepted'::text, 'rejected'::text, 'archived'::text, 'expired'::text, 'expiring_warning'::text, 'renewed'::text, 'sent_to_third_party'::text, 'send_revoked'::text, 'noted'::text]))) |
| compliance_document_send_records_recipient_type_check | CHECK ((recipient_type = ANY (ARRAY['government'::text, 'insurance'::text, 'property'::text, 'custom'::text]))) |

### Apply

Single transaction, two ALTER TABLE blocks.

**activity_log.event_type:** 14 values → 12 values (locked set: requested, viewed, accepted, rejected, resent, shared, viewed_share, downloaded_share, expired, overdue, uploaded, noted)

Values dropped (0 rows, no data loss): request_resent, request_cancelled, submitted, archived, expiring_warning, renewed, sent_to_third_party, send_revoked

Values added: resent, shared, viewed_share, downloaded_share, overdue, uploaded (6 new)

**send_records.recipient_type:** 4 generic values → 6 specific values (ehd, ahj, insurance_broker, insurance_carrier, auditor, client_legal)

### Verification

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.compliance_document_activity_log'::regclass
  AND conname = 'compliance_document_activity_log_event_type_check';
```

| conname | pg_get_constraintdef |
|---|---|
| compliance_document_activity_log_event_type_check | CHECK ((event_type = ANY (ARRAY['requested'::text, 'viewed'::text, 'accepted'::text, 'rejected'::text, 'resent'::text, 'shared'::text, 'viewed_share'::text, 'downloaded_share'::text, 'expired'::text, 'overdue'::text, 'uploaded'::text, 'noted'::text]))) |

**Result: ✅ PASS — 12 values, matches locked set exactly**

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.compliance_document_send_records'::regclass
  AND conname = 'compliance_document_send_records_recipient_type_check';
```

| conname | pg_get_constraintdef |
|---|---|
| compliance_document_send_records_recipient_type_check | CHECK ((recipient_type = ANY (ARRAY['ehd'::text, 'ahj'::text, 'insurance_broker'::text, 'insurance_carrier'::text, 'auditor'::text, 'client_legal'::text]))) |

**Result: ✅ PASS — 6 values, matches share_recommendation_rules + UI Contract exactly**

### Rollback (if needed)

```sql
BEGIN;
ALTER TABLE compliance_document_activity_log DROP CONSTRAINT compliance_document_activity_log_event_type_check;
ALTER TABLE compliance_document_activity_log ADD CONSTRAINT compliance_document_activity_log_event_type_check
  CHECK (event_type IN ('requested', 'request_resent', 'request_cancelled', 'submitted', 'viewed', 'accepted', 'rejected', 'archived', 'expired', 'expiring_warning', 'renewed', 'sent_to_third_party', 'send_revoked', 'noted'));
ALTER TABLE compliance_document_send_records DROP CONSTRAINT compliance_document_send_records_recipient_type_check;
ALTER TABLE compliance_document_send_records ADD CONSTRAINT compliance_document_send_records_recipient_type_check
  CHECK (recipient_type IN ('government', 'insurance', 'property', 'custom'));
COMMIT;
```

---

## Phase 2 — Schema Gap Closure for Answer-Line Pattern (2026-05-11)

**Source plan:** `docs/PHASE-2-SCHEMA-MIGRATION-PLAN.md`
**Gaps closed:** G1, G2, G3 (a+b), G4, G7

### Pre-Apply Calendar Context

```
Calendar.tsx (line 234) queries supabase.from('calendar_events').select('*')
Error handling: NONE — { data: customCalRes } without error capture
Fallback: (customCalRes || []) — null response → empty array → empty calendar
User sees: Calendar grid with zero events (no 404, no error, no mock data)
M19 impact: Zero change to UX (table created empty → same empty state)
```

---

### M15 — acknowledged_at on location_service_schedules (G1)

**Applied:** `ALTER TABLE location_service_schedules ADD COLUMN acknowledged_at TIMESTAMPTZ`

**Verification:**

| column_name | data_type | is_nullable |
|---|---|---|
| acknowledged_at | timestamp with time zone | YES |

**Result: ✅ PASS**

---

### M16 — deferred_until + deferred_reason on location_service_schedules (G2)

**Applied:** `ALTER TABLE location_service_schedules ADD COLUMN deferred_until DATE, ADD COLUMN deferred_reason TEXT`

**Verification:**

| column_name | data_type | is_nullable |
|---|---|---|
| deferred_reason | text | YES |
| deferred_until | date | YES |

**Result: ✅ PASS**

---

### M17 — completed_count on location_service_schedules (G3a)

**Applied:** `ALTER TABLE location_service_schedules ADD COLUMN completed_count INTEGER NOT NULL DEFAULT 0` + partial index `idx_lss_completed_count_zero`

**Verification (column):**

| column_name | data_type | is_nullable | column_default |
|---|---|---|---|
| completed_count | integer | NO | 0 |

**Verification (index):**

| indexname |
|---|
| idx_lss_completed_count_zero |

**Result: ✅ PASS**

---

### M18 — completed_count trigger (G3b)

**Applied:** `CREATE FUNCTION fn_update_lss_completed_count()` + `CREATE TRIGGER trg_vsr_completed_count ON vendor_service_records`

**Trigger uses composite key match:** `(organization_id, location_id, service_type_code)` — no `schedule_id` FK exists on vendor_service_records.

**Verification (trigger):**

| tgname | tgenabled |
|---|---|
| trg_vsr_completed_count | O |

**Verification (function):**

| proname |
|---|
| fn_update_lss_completed_count |

**Functional test:** DO block inserted test LSS row (service_type_code='KEC'), inserted test VSR row (triggered increment), deleted VSR row (triggered decrement), deleted LSS row (cleanup). Block completed without error. 0 test rows remain.

**Result: ✅ PASS**

---

### M19 — CREATE TABLE calendar_events (G4)

**Applied:** Full CREATE TABLE with 17 columns (original + lifecycle), 3 CHECK constraints, RLS policy, 3 indexes.

**CRITICAL:** Table did not previously exist in PROD. Migration `20260301000000_calendar_events.sql` was never applied. M19 supersedes it.

**Verification (columns):** 17 columns confirmed.

**Verification (CHECK constraints):**

| conname | pg_get_constraintdef |
|---|---|
| calendar_events_completed_requires_fields | CHECK (status <> 'completed' OR (completed_at IS NOT NULL AND completed_by IS NOT NULL)) |
| calendar_events_rescheduled_requires_from | CHECK (status <> 'rescheduled' OR rescheduled_from IS NOT NULL) |
| calendar_events_status_check | CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed', 'rescheduled')) |

**Verification (RLS):**

| policyname | cmd |
|---|---|
| Users can manage calendar events in their org | ALL |

**Verification (indexes):**

| indexname |
|---|
| calendar_events_pkey |
| idx_calendar_events_org_date |
| idx_calendar_events_org_status |

**Result: ✅ PASS**

---

### M20 — CREATE VIEW v_documents_enriched (G7)

**Applied:** `CREATE VIEW v_documents_enriched WITH (security_invoker = true)` — JOINs compliance_documents + vendors + user_profiles + latest compliance_document_requests (lateral subquery) + 3 derived columns (request_stage, request_token_days_remaining, days_until_expiry).

**Verification (view exists):**

| table_name | table_type |
|---|---|
| v_documents_enriched | VIEW |

**Verification (column count):** 34 columns

**Verification (security_invoker):**

| relname | reloptions |
|---|---|
| v_documents_enriched | {security_invoker=true} |

**Verification (service_role query):** `SELECT count(*) FROM v_documents_enriched` → 0 rows (correct — no documents exist)

**Result: ✅ PASS**

---

### Consolidated Phase 2 Summary

| Metric | Expected | Actual | Status |
|---|---|---|---|
| G1 acknowledged_at | 1 column | 1 | ✅ |
| G2 deferred cols | 2 columns | 2 | ✅ |
| G3a completed_count | 1 column | 1 | ✅ |
| G3b trigger | 1 trigger | 1 | ✅ |
| G4 calendar_events cols | 17 | 17 | ✅ |
| G4 calendar_events CHECKs | 3 | 3 | ✅ |
| G7 view exists | 1 | 1 | ✅ |
| G7 view cols | 34 | 34 | ✅ |

### Deferred Items

| Item | Reason |
|---|---|
| vendor_service_records.schedule_id FK | Composite trigger acceptable for now |
| compliance_document_send_records.document_id FK | Separate ticket — blocks share JOIN in view |
| G5 Quick Action context queries | Code-only — Phase 3 UI build |
| G6 Share state client-side derivation | Code-only — needs send_records FK first |
| M13 Cron registration | Still deferred until edge function deployed |

---

*End of STEP3-APPLY-LOG.md*
